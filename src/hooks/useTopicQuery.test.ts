import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { resetTopic } from "../service/topic_service.mjs";
import { createTestQueryClient } from "../test/renderWithProviders";
import { DUE_QUEUE_KEY } from "./useDueQueue";
import { TOPIC_DETAILS_KEY, TOPIC_HISTORY_KEY, useTopicReset } from "./useTopicQuery";

vi.mock("../service/topic_service.mjs", () => ({ resetTopic: vi.fn() }));

const resetTopicMock = vi.mocked(resetTopic);

describe("useTopicReset", () => {
  beforeEach(() => {
    resetTopicMock.mockReset();
  });

  it("refetches the due list along with the topic's details and history after a reset", async () => {
    resetTopicMock.mockResolvedValue({});
    const queryClient = createTestQueryClient();
    queryClient.setQueryData([TOPIC_DETAILS_KEY, "t1"], { _id: "t1" });
    queryClient.setQueryData([TOPIC_HISTORY_KEY, "t1"], []);
    // Stands in for the header badge and Today's List, which read the due queue.
    const fetchDueQueue = vi.fn().mockResolvedValue([]);
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(
      () => ({
        dueQueue: useQuery({ queryKey: DUE_QUEUE_KEY, queryFn: fetchDueQueue }),
        reset: useTopicReset(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.dueQueue.isSuccess).toBe(true));
    expect(fetchDueQueue).toHaveBeenCalledTimes(1);

    await act(() => result.current.reset.mutateAsync({ id: "t1" }));

    expect(resetTopicMock).toHaveBeenCalledWith("t1");
    await waitFor(() => expect(fetchDueQueue).toHaveBeenCalledTimes(2));
    expect(queryClient.getQueryState([TOPIC_DETAILS_KEY, "t1"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState([TOPIC_HISTORY_KEY, "t1"])?.isInvalidated).toBe(true);
  });
});
