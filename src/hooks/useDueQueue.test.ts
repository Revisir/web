import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { getTodaysList } from "../service/topic_service.mjs";
import { countTopicsLeftToday, DUE_QUEUE_KEY, msUntilNextLocalMidnight, useDueQueue, type DueTopic, type ReviewAvailability } from "./useDueQueue";

vi.mock("../service/topic_service.mjs", () => ({ getTodaysList: vi.fn() }));

const getTodaysListMock = vi.mocked(getTodaysList);
const DAY_MS = 24 * 60 * 60 * 1000;

function review(doneToday: boolean): ReviewAvailability {
  return {
    doneToday,
    normalQuiz: { available: !doneToday, reason: doneToday ? "done_today" : null, questionCount: 5 },
    aiQuiz: { available: !doneToday, reason: doneToday ? "done_today" : null },
  };
}

function dueTopic(id: string, overrides: Partial<DueTopic> = {}): DueTopic {
  return {
    _id: id,
    topicName: `Topic ${id}`,
    subjectName: "Neurology",
    revisionDate: "2026-10-17T00:00:00.000Z",
    lastRevised: null,
    eFactor: 2.5,
    interval: 1,
    repetitionNumber: 0,
    lastQuality: null,
    estimatedRecall: 0.9,
    nextIntervals: [1, 1, 1, 1, 6, 6],
    questionBank: { state: "ready", usableCount: 12, rebuilding: false },
    review: review(false),
    ...overrides,
  };
}

// Mirrors the app's client, whose staleTime of Infinity would otherwise block focus and mount refetches.
function renderDueQueue(
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  }),
) {
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
  return { ...renderHook(() => useDueQueue(), { wrapper }), queryClient };
}

describe("useDueQueue", () => {
  beforeEach(() => {
    getTodaysListMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the due list's topics under the exported key", async () => {
    const topics = [dueTopic("a"), dueTopic("b")];
    getTodaysListMock.mockResolvedValue({ topics });

    const { result, queryClient } = renderDueQueue();

    await waitFor(() => expect(result.current.data).toEqual(topics));
    expect(queryClient.getQueryData(DUE_QUEUE_KEY)).toEqual(topics);
  });

  it("refetches when the window regains focus", async () => {
    getTodaysListMock.mockResolvedValueOnce({ topics: [dueTopic("a")] });
    getTodaysListMock.mockResolvedValueOnce({ topics: [dueTopic("a", { review: review(true) })] });

    const { result } = renderDueQueue();
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(getTodaysListMock).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => expect(result.current.data?.[0].review?.doneToday).toBe(true));
    expect(getTodaysListMock).toHaveBeenCalledTimes(2);
  });

  it("refetches when Today's List mounts while the header keeps the query mounted", async () => {
    const preparing = dueTopic("a", {
      questionBank: { state: "building", usableCount: 0, rebuilding: false },
      review: { ...review(false), normalQuiz: { available: false, reason: "preparing_questions", questionCount: 0 } },
    });
    getTodaysListMock.mockResolvedValueOnce({ topics: [preparing] });
    getTodaysListMock.mockResolvedValueOnce({ topics: [dueTopic("a")] });

    const header = renderDueQueue();
    await waitFor(() => expect(header.result.current.data).toHaveLength(1));
    expect(getTodaysListMock).toHaveBeenCalledTimes(1);

    const todaysList = renderDueQueue(header.queryClient);

    await waitFor(() => expect(todaysList.result.current.data?.[0].review?.normalQuiz.available).toBe(true));
    expect(getTodaysListMock).toHaveBeenCalledTimes(2);
    expect(header.result.current.data?.[0].questionBank?.state).toBe("ready");
  });

  it("refetches at each local midnight and stops after unmount", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    vi.setSystemTime(new Date(2026, 9, 17, 23, 59, 30));
    getTodaysListMock.mockResolvedValue({ topics: [dueTopic("a")] });

    const { unmount } = renderDueQueue();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(getTodaysListMock).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(29_000));
    expect(getTodaysListMock).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(1_000));
    expect(getTodaysListMock).toHaveBeenCalledTimes(2);

    await act(() => vi.advanceTimersByTimeAsync(DAY_MS));
    expect(getTodaysListMock).toHaveBeenCalledTimes(3);

    unmount();
    await vi.advanceTimersByTimeAsync(2 * DAY_MS);
    expect(getTodaysListMock).toHaveBeenCalledTimes(3);
  });
});

describe("msUntilNextLocalMidnight", () => {
  it("measures to the start of the next local day", () => {
    const now = DateTime.fromISO("2026-10-17T23:00:00", { zone: "Asia/Kolkata" });
    expect(msUntilNextLocalMidnight(now)).toBe(60 * 60 * 1000);
  });

  it("accounts for a daylight-saving change", () => {
    // New York springs forward at 02:00 on 2026-03-08, so that day is 23 hours long.
    const now = DateTime.fromISO("2026-03-08T00:30:00", { zone: "America/New_York" });
    expect(msUntilNextLocalMidnight(now)).toBe(22.5 * 60 * 60 * 1000);
  });
});

describe("countTopicsLeftToday", () => {
  it("counts due topics not finished today, treating a missing review as not done", () => {
    const done = dueTopic("done", { review: review(true) });
    const open = dueTopic("open");
    const legacy = dueTopic("legacy", { review: undefined });

    expect(countTopicsLeftToday([done, open, legacy])).toBe(2);
    expect(countTopicsLeftToday(undefined)).toBe(0);
  });
});
