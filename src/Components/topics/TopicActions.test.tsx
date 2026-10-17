import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { act, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { DateTime } from "luxon";
import TopicActions from "./TopicActions";
import TopicDetails from "./TopicDetails";
import { createTestQueryClient, renderWithProviders } from "../../test/renderWithProviders";
import { getTopic, getTopicForgettingCurve, getTopicHistory, regenerateQuestions, reviseTopic, updateTopic } from "../../service/topic_service.mjs";
import { completeChat, startChat } from "../../service/chat_service.mjs";
import type { ReviewAvailability } from "../../hooks/useDueQueue";
import { useTopicDetails, type TopicDetail } from "../../hooks/useTopicQuery";

vi.mock("../../service/topic_service.mjs", () => ({
  getTopic: vi.fn(),
  getTopicHistory: vi.fn(),
  getTopicForgettingCurve: vi.fn(),
  updateTopic: vi.fn(),
  reviseTopic: vi.fn(),
  deleteTopic: vi.fn(),
  addTopic: vi.fn(),
  getFileUploadUrls: vi.fn(),
  deleteTopicFile: vi.fn(),
  resetTopic: vi.fn(),
  generateMindMap: vi.fn(),
  regenerateQuestions: vi.fn(),
}));
vi.mock("../../service/chat_service.mjs", () => ({ startChat: vi.fn(), sendMessage: vi.fn(), completeChat: vi.fn() }));
// Heavy children of the topic page that jsdom cannot run (mind-elixir, pdfjs, echarts) or that these tests do not use.
vi.mock("mind-elixir", () => ({
  default: class FakeMindElixir {
    static SIDE = 2;
    init() {}
    changeTheme() {}
    destroy() {}
  },
}));
vi.mock("./PdfPageSelector", () => ({ default: () => null }));
vi.mock("../charts/ForgettingCurve", () => ({ default: () => null }));
vi.mock("./TopicModal", () => ({ default: () => null }));

const getTopicMock = vi.mocked(getTopic);
const reviseTopicMock = vi.mocked(reviseTopic);
const updateTopicMock = vi.mocked(updateTopic);
const regenerateQuestionsMock = vi.mocked(regenerateQuestions);
const startChatMock = vi.mocked(startChat);
const completeChatMock = vi.mocked(completeChat);

// Local noon on a fixed day keeps "today" deterministic in any time zone.
const NOW = DateTime.local(2026, 10, 17, 12);
const TODAY = NOW.toISO()!;
const NEXT_REVIEW = NOW.plus({ days: 6 }).toISO()!;
const formatDate = (iso: string) => DateTime.fromISO(iso).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);

const REVIEWABLE: ReviewAvailability = {
  doneToday: false,
  normalQuiz: { available: true, reason: null, questionCount: 5 },
  aiQuiz: { available: true, reason: null },
};

const DONE: ReviewAvailability = {
  doneToday: true,
  normalQuiz: { available: false, reason: "done_today", questionCount: 0 },
  aiQuiz: { available: false, reason: "done_today" },
};

const NOT_DUE: ReviewAvailability = {
  doneToday: false,
  normalQuiz: { available: false, reason: "not_due", questionCount: 0 },
  aiQuiz: { available: false, reason: "not_due" },
};

function makeTopic(overrides: Partial<TopicDetail> = {}): TopicDetail {
  return {
    _id: "t1",
    topicName: "Krebs cycle",
    subjectName: "Biochemistry",
    description: "Citric acid cycle",
    dateStudied: NOW.minus({ days: 10 }).toISO()!,
    revisionDate: TODAY,
    lastRevised: NOW.minus({ days: 6 }).toISO()!,
    eFactor: 2.5,
    interval: 6,
    repetitionNumber: 2,
    lastQuality: 4,
    estimatedRecall: 0.8,
    nextIntervals: [1, 1, 1, 6, 15, 16],
    questionBank: { state: "ready", usableCount: 12, rebuilding: false },
    review: REVIEWABLE,
    files: [],
    urls: [{ _id: "u1", url: "https://example.com/krebs", processingStatus: "completed" }],
    mindMap: null,
    ...overrides,
  };
}

// A topic finished today: the server moved its schedule and reports the review.
const doneTopic = (overrides: Partial<TopicDetail> = {}) => makeTopic({ revisionDate: NEXT_REVIEW, lastRevised: TODAY, review: DONE, ...overrides });

function apiError(status: number, code: string, message = code) {
  return Object.assign(new Error(message), { response: { status, data: { error: { code, message } } } });
}

function LocationProbe() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "none";
  return <p data-testid="location">{`${location.pathname} from ${from}`}</p>;
}

function renderActions(topic: TopicDetail) {
  const onStartAiQuiz = vi.fn();
  renderWithProviders(
    <>
      <TopicActions topic={topic} onStartAiQuiz={onStartAiQuiz} />
      <LocationProbe />
    </>,
    { route: `/topic/${topic._id}` },
  );
  return { onStartAiQuiz };
}

const startQuiz = () => screen.getByRole("button", { name: /^Start quiz/ });
const startAiQuiz = () => screen.getByRole("button", { name: "Start AI quiz" });
const doneButton = () => screen.queryByRole("button", { name: "Done" });
const reviewButtons = () => [screen.queryByRole("button", { name: /^Start quiz/ }), screen.queryByRole("button", { name: "Start AI quiz" }), doneButton()];

async function rateWithDone(user: ReturnType<typeof userEvent.setup>, rating: RegExp) {
  await user.click(doneButton()!);
  const dialog = await screen.findByRole("dialog", { name: "Rate your recall" });
  await user.click(within(dialog).getByRole("radio", { name: rating }));
  await user.click(within(dialog).getByRole("button", { name: "Record rating" }));
  return dialog;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW.toJSDate());
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TopicActions", () => {
  it("offers both quizzes and Done on a due topic, with the quiz labeled by its question count", () => {
    renderActions(makeTopic());

    expect(screen.getByText("Due today")).toBeInTheDocument();
    expect(startQuiz()).toHaveAccessibleName("Start quiz (5 questions)");
    expect(startQuiz()).toBeEnabled();
    expect(startAiQuiz()).toBeEnabled();
    expect(doneButton()).toBeEnabled();
  });

  it("opens the quiz page with a way back to this topic", async () => {
    const user = userEvent.setup();
    renderActions(makeTopic());

    await user.click(startQuiz());

    expect(screen.getByTestId("location")).toHaveTextContent("/topic/t1/quiz from /topic/t1");
  });

  it("starts the AI quiz through the page", async () => {
    const user = userEvent.setup();
    const { onStartAiQuiz } = renderActions(makeTopic());

    await user.click(startAiQuiz());

    expect(onStartAiQuiz).toHaveBeenCalledTimes(1);
  });

  // AE6, topic-page half.
  it("lets a due topic without materials be finished with Done, recording the picked rating", async () => {
    const user = userEvent.setup();
    reviseTopicMock.mockResolvedValue({ success: true, nextRevisionDate: NEXT_REVIEW, lastRevised: TODAY, lastQuality: 4 });
    renderActions(
      makeTopic({
        urls: [],
        questionBank: { state: "none", usableCount: 0, rebuilding: false },
        review: { doneToday: false, normalQuiz: { available: false, reason: "no_materials", questionCount: 0 }, aiQuiz: { available: false, reason: "no_materials" } },
      }),
    );

    expect(startQuiz()).toBeDisabled();
    expect(startQuiz()).toHaveAccessibleDescription("No materials");
    expect(startAiQuiz()).toBeDisabled();
    expect(startAiQuiz()).toHaveAccessibleDescription("No materials");
    expect(doneButton()).toBeEnabled();
    // Nothing to build questions from, so no bank status or Regenerate.
    expect(screen.queryByRole("button", { name: "Regenerate questions" })).not.toBeInTheDocument();

    await user.click(doneButton()!);
    const dialog = await screen.findByRole("dialog", { name: "Rate your recall" });
    // Each option previews the interval that rating would give (R32).
    expect(within(dialog).getByRole("radio", { name: "4 Good, in 15 days" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Record rating" })).toBeDisabled();

    await user.click(within(dialog).getByRole("radio", { name: "4 Good, in 15 days" }));
    await user.click(within(dialog).getByRole("button", { name: "Record rating" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(reviseTopicMock).toHaveBeenCalledTimes(1);
    expect(reviseTopicMock).toHaveBeenCalledWith("t1", { userQuality: 4 });
    expect(screen.getByText("Done today")).toBeInTheDocument();
    expect(screen.getByText("4 · Good")).toBeInTheDocument();
    expect(screen.getByText(formatDate(NEXT_REVIEW))).toBeInTheDocument();
    expect(reviewButtons()).toEqual([null, null, null]);
  });

  it("records a rating of 0 like any other", async () => {
    const user = userEvent.setup();
    reviseTopicMock.mockResolvedValue({ success: true, nextRevisionDate: NOW.plus({ days: 1 }).toISO(), lastRevised: TODAY, lastQuality: 0 });
    renderActions(makeTopic());

    await rateWithDone(user, /^0 Blackout/);

    await waitFor(() => expect(reviseTopicMock).toHaveBeenCalledWith("t1", { userQuality: 0 }));
    expect(await screen.findByText("0 · Blackout")).toBeInTheDocument();
  });

  it("shows a topic finished today with its rating and next review date, and no review actions", () => {
    renderActions(doneTopic({ lastQuality: 3.5 }));

    expect(screen.getByText("Done today")).toBeInTheDocument();
    expect(screen.getByText("3.5 · Good")).toBeInTheDocument();
    expect(screen.getByText(formatDate(NEXT_REVIEW))).toBeInTheDocument();
    expect(reviewButtons()).toEqual([null, null, null]);
  });

  it("shows a topic not yet due with its next review date and no review actions", () => {
    renderActions(makeTopic({ revisionDate: NEXT_REVIEW, review: NOT_DUE }));

    expect(screen.getByText("Not due yet")).toBeInTheDocument();
    expect(screen.getByText("Next review")).toBeInTheDocument();
    expect(screen.getByText(formatDate(NEXT_REVIEW))).toBeInTheDocument();
    expect(reviewButtons()).toEqual([null, null, null]);
  });

  it("shows a topic as done when Done finds it already reviewed today", async () => {
    const user = userEvent.setup();
    reviseTopicMock.mockRejectedValue(apiError(409, "ALREADY_REVIEWED_TODAY", "This topic was already reviewed today"));
    renderActions(makeTopic());

    await rateWithDone(user, /^3 Hesitant/);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Done today")).toBeInTheDocument();
    expect(screen.getByText(/already reviewed today/)).toBeInTheDocument();
    expect(reviewButtons()).toEqual([null, null, null]);
  });

  it("shows the review actions again when the topic comes due after a Done recorded here", async () => {
    const user = userEvent.setup();
    reviseTopicMock.mockResolvedValue({ success: true, nextRevisionDate: NEXT_REVIEW, lastRevised: TODAY, lastQuality: 4 });
    // The page keys TopicActions by topic id, so its refetches rerender this instance rather than remount it.
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/topic/t1"]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
    const { rerender } = render(<TopicActions topic={makeTopic()} onStartAiQuiz={vi.fn()} />, { wrapper });

    await rateWithDone(user, /^4 Good/);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Done today")).toBeInTheDocument();

    // The refetch reports the review.
    rerender(<TopicActions topic={doneTopic({ lastQuality: 4 })} onStartAiQuiz={vi.fn()} />);
    expect(screen.getByText("Done today")).toBeInTheDocument();
    expect(screen.getByText("4 · Good")).toBeInTheDocument();

    // Reset Progress or a new study date makes the topic due again.
    rerender(<TopicActions topic={makeTopic()} onStartAiQuiz={vi.fn()} />);
    expect(screen.queryByText("Done today")).not.toBeInTheDocument();
    expect(screen.getByText("Due today")).toBeInTheDocument();
    expect(startQuiz()).toBeEnabled();
    expect(doneButton()).toBeEnabled();
  });

  it("keeps the picker open with the error when recording fails for another reason", async () => {
    const user = userEvent.setup();
    reviseTopicMock.mockRejectedValue(apiError(500, "INTERNAL", "Database unavailable"));
    renderActions(makeTopic());

    const dialog = await rateWithDone(user, /^5 Perfect/);

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Database unavailable");
    expect(within(dialog).getByRole("radio", { name: /^5 Perfect/ })).toBeChecked();
  });

  it("reads as updating while a rebuild runs over a usable bank, and keeps Start quiz enabled", () => {
    renderActions(makeTopic({ questionBank: { state: "building", usableCount: 12, rebuilding: true } }));

    expect(screen.getByRole("status")).toHaveTextContent("Updating questions");
    expect(startQuiz()).toBeEnabled();
    expect(startQuiz()).toHaveAccessibleName("Start quiz (5 questions)");
    // The running build already uses the current materials.
    expect(screen.getByRole("button", { name: "Regenerate questions" })).toBeDisabled();
  });

  it.each([
    [{ state: "queued", usableCount: 0, rebuilding: false }, "Preparing questions"],
    [{ state: "ready", usableCount: 1, rebuilding: false }, "1 question ready"],
    [{ state: "ready", usableCount: 14, rebuilding: false }, "14 questions ready"],
    [{ state: "failed", usableCount: 0, rebuilding: false }, "Couldn't generate questions"],
    [{ state: "empty", usableCount: 0, rebuilding: false }, "Couldn't generate questions"],
  ] as const)("describes the question bank %o as %s", (questionBank, text) => {
    renderActions(makeTopic({ questionBank }));

    expect(screen.getByRole("status")).toHaveTextContent(text);
  });

  it("offers Done and the AI quiz, without the normal quiz, on a backend that sends no availability", async () => {
    const user = userEvent.setup();
    renderActions(makeTopic({ review: undefined, questionBank: undefined, nextIntervals: undefined }));

    expect(screen.queryByRole("button", { name: /^Start quiz/ })).not.toBeInTheDocument();
    expect(startAiQuiz()).toBeEnabled();
    expect(doneButton()).toBeEnabled();

    await user.click(doneButton()!);
    const dialog = await screen.findByRole("dialog", { name: "Rate your recall" });
    expect(within(dialog).getByRole("radio", { name: "4 Good" })).toBeInTheDocument();
  });
});

describe("TopicDetails review area", () => {
  beforeEach(() => {
    vi.mocked(getTopicHistory).mockResolvedValue({ history: [] });
    vi.mocked(getTopicForgettingCurve).mockResolvedValue({});
  });

  function renderPage() {
    return renderWithProviders(
      <Routes>
        <Route path="/topic/:id" element={<TopicDetails />} />
      </Routes>,
      { route: "/topic/t1" },
    );
  }

  it("asks before regenerating questions, calls the endpoint once and shows the bank as preparing", async () => {
    const user = userEvent.setup();
    const failedBank = { state: "failed", usableCount: 0, rebuilding: false } as const;
    const queuedBank = { state: "queued", usableCount: 0, rebuilding: false } as const;
    const noQuestions: ReviewAvailability = { doneToday: false, normalQuiz: { available: false, reason: "no_questions", questionCount: 0 }, aiQuiz: { available: true, reason: null } };
    getTopicMock.mockResolvedValueOnce(makeTopic({ questionBank: failedBank, review: noQuestions }));
    getTopicMock.mockResolvedValue(makeTopic({ questionBank: queuedBank, review: { ...noQuestions, normalQuiz: { available: false, reason: "preparing_questions", questionCount: 0 } } }));
    regenerateQuestionsMock.mockResolvedValue({ questionBank: queuedBank });
    renderPage();

    const regenerate = await screen.findByRole("button", { name: "Regenerate questions" });
    expect(screen.getByRole("status")).toHaveTextContent("Couldn't generate questions");

    await user.click(regenerate);
    const confirm = await screen.findByRole("alertdialog", { name: "Regenerate questions?" });
    expect(regenerateQuestionsMock).not.toHaveBeenCalled();

    await user.click(within(confirm).getByRole("button", { name: "Regenerate" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Preparing questions"));
    expect(regenerateQuestionsMock).toHaveBeenCalledTimes(1);
    expect(regenerateQuestionsMock).toHaveBeenCalledWith("t1");
    expect(screen.getByRole("button", { name: "Regenerate questions" })).toBeDisabled();
  });

  // AE13, UI half: the chat records the review itself.
  it("sends no /revised request after the AI chat completes, and shows the topic as done", async () => {
    const user = userEvent.setup();
    getTopicMock.mockResolvedValueOnce(makeTopic());
    getTopicMock.mockResolvedValue(doneTopic({ lastQuality: 4 }));
    startChatMock.mockResolvedValue({ sessionId: "s1", initialMessage: "What does the Krebs cycle produce?" });
    completeChatMock.mockResolvedValue({ success: true });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Start AI quiz" }));
    const chat = await screen.findByRole("dialog", { name: "Revision chat" });
    expect(await within(chat).findByText("What does the Krebs cycle produce?")).toBeInTheDocument();

    await user.click(within(chat).getByRole("button", { name: "Finish revision" }));
    // The closing rating shows no interval previews (R36).
    expect(within(chat).getByRole("radio", { name: "4 Good" })).toBeInTheDocument();
    expect(within(chat).queryByText(/^in \d+ days?$/)).not.toBeInTheDocument();

    await user.click(within(chat).getByRole("radio", { name: "4 Good" }));
    await user.click(within(chat).getByRole("button", { name: "Record rating" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(completeChatMock).toHaveBeenCalledWith({ sessionId: "s1", topicId: "t1", userQuality: 4, llmQuality: 4 });
    expect(await screen.findByText("Done today")).toBeInTheDocument();
    expect(reviseTopicMock).not.toHaveBeenCalled();
  });

  it("closes the chat as finished when the topic was already reviewed today", async () => {
    const user = userEvent.setup();
    getTopicMock.mockResolvedValueOnce(makeTopic());
    getTopicMock.mockResolvedValue(doneTopic());
    startChatMock.mockResolvedValue({ sessionId: "s1", initialMessage: "Name the first step." });
    completeChatMock.mockRejectedValue(apiError(409, "ALREADY_REVIEWED_TODAY"));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Start AI quiz" }));
    const chat = await screen.findByRole("dialog", { name: "Revision chat" });
    await within(chat).findByText("Name the first step.");
    await user.click(within(chat).getByRole("button", { name: "Finish revision" }));
    await user.click(within(chat).getByRole("radio", { name: "2 Hard" }));
    await user.click(within(chat).getByRole("button", { name: "Record rating" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(await screen.findByText("Done today")).toBeInTheDocument();
    expect(reviseTopicMock).not.toHaveBeenCalled();
  });

  it("keeps the review actions after saving the URL list, because the page refetches the topic", async () => {
    const user = userEvent.setup();
    const topic = makeTopic();
    getTopicMock.mockResolvedValue(topic);
    // The update response is the stored topic, without the computed review fields.
    const stored: Partial<TopicDetail> = { ...topic };
    delete stored.review;
    delete stored.questionBank;
    delete stored.nextIntervals;
    updateTopicMock.mockResolvedValue({ success: true, topic: stored });
    renderPage();

    expect(await screen.findByRole("button", { name: "Start quiz (5 questions)" })).toBeEnabled();

    // The sections start collapsed, and a collapsed section renders nothing.
    await user.click(screen.getByRole("button", { name: "Materials" }));
    await user.click(screen.getByRole("button", { name: "Save URLs" }));

    await waitFor(() => expect(updateTopicMock).toHaveBeenCalledWith("t1", { urls: ["https://example.com/krebs"] }));
    await waitFor(() => expect(getTopicMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Start quiz (5 questions)" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Start AI quiz" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("12 questions ready");
  });
});

describe("useTopicDetails refetch policy", () => {
  function renderDetailsHook() {
    // The app's own defaults: data never goes stale on its own.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return renderHook(() => useTopicDetails("t1"), { wrapper });
  }

  const processingFile = { _id: "f1", fileName: "notes.pdf", fileType: "pdf", fileUrl: "https://files.example/notes.pdf", processingStatus: "processing" } as const;

  afterEach(() => {
    focusManager.setFocused(undefined);
  });

  it("refetches the topic when the window regains focus", async () => {
    getTopicMock.mockResolvedValue(makeTopic());
    const { result } = renderDetailsHook();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() => expect(getTopicMock).toHaveBeenCalledTimes(2));
  });

  it.each([
    ["an attachment is processing", makeTopic({ files: [processingFile] })],
    ["a URL is pending", makeTopic({ urls: [{ _id: "u1", url: "https://example.com/krebs", processingStatus: "pending" }] })],
    ["the question bank is building", makeTopic({ questionBank: { state: "building", usableCount: 0, rebuilding: false } })],
  ])("polls every 5 seconds while %s, and stops once the topic settles", async (_, settling) => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
    vi.setSystemTime(NOW.toJSDate());
    getTopicMock.mockResolvedValueOnce(settling);
    getTopicMock.mockResolvedValue(makeTopic({ files: [{ ...processingFile, processingStatus: "completed" }] }));
    renderDetailsHook();

    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(getTopicMock).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(getTopicMock).toHaveBeenCalledTimes(2);

    await act(() => vi.advanceTimersByTimeAsync(20_000));
    expect(getTopicMock).toHaveBeenCalledTimes(2);
  });

  it("does not poll a settled topic", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
    vi.setSystemTime(NOW.toJSDate());
    getTopicMock.mockResolvedValue(makeTopic());
    renderDetailsHook();

    await act(() => vi.advanceTimersByTimeAsync(20_000));

    expect(getTopicMock).toHaveBeenCalledTimes(1);
  });
});
