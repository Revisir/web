import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateTime } from "luxon";
import DueQueue from "./DueQueue";
import { renderWithProviders } from "../../test/renderWithProviders";
import { deleteTopic, getTodaysList } from "../../service/topic_service.mjs";
import { DUE_QUEUE_KEY, type DueTopic, type ReviewAvailability } from "../../hooks/useDueQueue";
import { TOPIC_DETAILS_KEY } from "../../hooks/useTopicQuery";

vi.mock("../../service/topic_service.mjs", () => ({ getTodaysList: vi.fn(), deleteTopic: vi.fn() }));
vi.mock("../topics/RevisionChat", () => ({
  default: ({ topicId, onClose }: { topicId: string; onClose: (userQuality: number | null) => void }) => (
    <div role="dialog" aria-label="Revision chat">
      <p>Chat for {topicId}</p>
      <button onClick={() => onClose(4)}>Finish chat</button>
      <button onClick={() => onClose(null)}>Close chat</button>
    </div>
  ),
}));
vi.mock("../topics/TopicModal", () => ({
  default: ({ topic, setShowModal }: { topic: { _id: string; topicName: string }; setShowModal: (show: boolean) => void }) => (
    <div role="dialog" aria-label="Edit topic">
      <p>
        Editing {topic._id}: {topic.topicName}
      </p>
      <button onClick={() => setShowModal(false)}>Close editor</button>
    </div>
  ),
}));

const getTodaysListMock = vi.mocked(getTodaysList);
const deleteTopicMock = vi.mocked(deleteTopic);

// Local noon on a fixed day keeps "today" and "overdue" deterministic in any time zone.
const NOW = DateTime.local(2026, 10, 17, 12);
const daysFromToday = (days: number) => NOW.plus({ days }).toISO()!;

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

function dueTopic(id: string, overrides: Partial<DueTopic> = {}): DueTopic {
  return {
    _id: id,
    topicName: `Topic ${id}`,
    subjectName: "Biochemistry",
    revisionDate: daysFromToday(0),
    lastRevised: null,
    eFactor: 2.5,
    interval: 1,
    repetitionNumber: 1,
    lastQuality: 4,
    estimatedRecall: 0.9,
    nextIntervals: [1, 1, 1, 6, 6, 6],
    questionBank: { state: "ready", usableCount: 12, rebuilding: false },
    review: REVIEWABLE,
    ...overrides,
  };
}

const card = (name: string) => screen.getByRole("article", { name });
const cardNames = () => screen.queryAllByRole("article").map((article) => within(article).getByRole("heading").textContent);
const filter = (name: RegExp) => screen.getByRole("radio", { name });

async function renderQueue(topics: DueTopic[]) {
  getTodaysListMock.mockResolvedValue({ topics });
  const result = renderWithProviders(<DueQueue />);
  if (topics.length) await screen.findAllByRole("article");
  return result;
}

describe("DueQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW.toJSDate());
    getTodaysListMock.mockReset();
    deleteTopicMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a chip per subject with its count and filters the cards by subject", async () => {
    const user = userEvent.setup();
    await renderQueue([dueTopic("a"), dueTopic("b", { subjectName: "Anatomy" }), dueTopic("c")]);

    expect(within(filter(/^All/)).getByText("3")).toBeInTheDocument();
    expect(within(filter(/^Anatomy/)).getByText("1")).toBeInTheDocument();
    expect(within(filter(/^Biochemistry/)).getByText("2")).toBeInTheDocument();
    expect(filter(/^All/)).toBeChecked();

    await user.click(filter(/^Biochemistry/));

    expect(filter(/^Biochemistry/)).toBeChecked();
    expect(cardNames()).toEqual(["Topic a", "Topic c"]);
  });

  it("keeps overdue topics and topics last rated below 3 under Overdue or failed recently", async () => {
    const user = userEvent.setup();
    await renderQueue([
      dueTopic("overdue", { revisionDate: daysFromToday(-2), lastQuality: 4 }),
      dueTopic("failed", { lastQuality: 2 }),
      dueTopic("passed", { lastQuality: 3 }),
      dueTopic("new", { lastQuality: null }),
    ]);

    const attention = filter(/^Overdue or failed recently/);
    expect(within(attention).getByText("2")).toBeInTheDocument();
    expect(within(card("Topic overdue")).getByText("Overdue 2 days")).toBeInTheDocument();

    await user.click(attention);

    expect(cardNames()).toEqual(["Topic overdue", "Topic failed"]);
  });

  it("shows a no-match message with a way back to All when a filter matches nothing", async () => {
    const user = userEvent.setup();
    await renderQueue([dueTopic("a"), dueTopic("b")]);

    await user.click(filter(/^Overdue or failed recently/));

    expect(screen.getByRole("heading", { name: "No topics match this filter" })).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Show all" }));

    expect(filter(/^All/)).toBeChecked();
    expect(cardNames()).toEqual(["Topic a", "Topic b"]);
  });

  it("shows the nothing-due state with a link to the full topic list", async () => {
    await renderQueue([]);

    expect(await screen.findByRole("heading", { name: "Nothing due today" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all topics" })).toHaveAttribute("href", "/topics");
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("shows skeleton cards while the list loads", () => {
    getTodaysListMock.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<DueQueue />);

    expect(screen.getByText("Loading today's list")).toBeInTheDocument();
  });

  it("explains a failed load with the server's message", async () => {
    getTodaysListMock.mockRejectedValue({ response: { data: { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch due topics" } } } });
    renderWithProviders(<DueQueue />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load today's list. Failed to fetch due topics");
  });

  it("keeps showing the last list when a refetch fails", async () => {
    const { queryClient } = await renderQueue([dueTopic("a")]);
    getTodaysListMock.mockRejectedValue(new Error("Network Error"));

    await act(async () => {
      await queryClient.refetchQueries({ queryKey: DUE_QUEUE_KEY });
      // Let the query's batched notification reach the component.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(queryClient.getQueryState(DUE_QUEUE_KEY)?.status).toBe("error");
    expect(card("Topic a")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("opens the AI chat for the chosen topic and refetches the queue when it closes", async () => {
    const user = userEvent.setup();
    const { queryClient } = await renderQueue([dueTopic("a"), dueTopic("b")]);
    queryClient.setQueryData([TOPIC_DETAILS_KEY, "b"], { _id: "b" });
    expect(getTodaysListMock).toHaveBeenCalledTimes(1);

    await user.click(within(card("Topic b")).getByRole("button", { name: "Start AI quiz" }));

    const chat = screen.getByRole("dialog", { name: "Revision chat" });
    expect(chat).toHaveTextContent("Chat for b");

    await user.click(within(chat).getByRole("button", { name: "Close chat" }));

    expect(screen.queryByRole("dialog", { name: "Revision chat" })).not.toBeInTheDocument();
    await waitFor(() => expect(getTodaysListMock).toHaveBeenCalledTimes(2));
    // Closed without a rating, so nothing else about the topic changed.
    expect(queryClient.getQueryState([TOPIC_DETAILS_KEY, "b"])?.isInvalidated).toBe(false);
  });

  it("shows a topic finished today as done, with its rating and next date, after the refetch (AE9)", async () => {
    const user = userEvent.setup();
    const nextReview = daysFromToday(6);
    getTodaysListMock.mockResolvedValueOnce({ topics: [dueTopic("a", { lastQuality: null })] });
    getTodaysListMock.mockResolvedValueOnce({ topics: [dueTopic("a", { lastQuality: 4, revisionDate: nextReview, lastRevised: NOW.toISO(), review: DONE })] });
    const { queryClient } = renderWithProviders(<DueQueue />);
    queryClient.setQueryData([TOPIC_DETAILS_KEY, "a"], { _id: "a" });

    await user.click(await screen.findByRole("button", { name: "Start AI quiz" }));
    await user.click(screen.getByRole("button", { name: "Finish chat" }));
    expect(queryClient.getQueryState([TOPIC_DETAILS_KEY, "a"])?.isInvalidated).toBe(true);

    const finished = card("Topic a");
    expect(await within(finished).findByText("Done")).toBeInTheDocument();
    expect(within(finished).getByText("4 · Good")).toBeInTheDocument();
    expect(within(finished).getByText(DateTime.fromISO(nextReview).toLocaleString(DateTime.DATE_MED))).toBeInTheDocument();
    expect(within(finished).queryByRole("button", { name: /Start/ })).not.toBeInTheDocument();
  });

  it("opens the topic form for the chosen topic from Edit", async () => {
    const user = userEvent.setup();
    await renderQueue([dueTopic("a"), dueTopic("b")]);

    await user.click(within(card("Topic b")).getByRole("button", { name: "Topic actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Edit" }));

    const editor = screen.getByRole("dialog", { name: "Edit topic" });
    expect(editor).toHaveTextContent("Editing b: Topic b");

    await user.click(within(editor).getByRole("button", { name: "Close editor" }));

    expect(screen.queryByRole("dialog", { name: "Edit topic" })).not.toBeInTheDocument();
    await waitFor(() => expect(getTodaysListMock).toHaveBeenCalledTimes(2));
  });

  it("asks for confirmation before deleting a topic", async () => {
    const user = userEvent.setup();
    deleteTopicMock.mockResolvedValue({});
    await renderQueue([dueTopic("a"), dueTopic("b")]);

    await user.click(within(card("Topic b")).getByRole("button", { name: "Topic actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));

    const confirm = await screen.findByRole("alertdialog", { name: "Delete topic?" });
    expect(confirm).toHaveTextContent('"Topic b"');
    expect(deleteTopicMock).not.toHaveBeenCalled();

    await user.click(within(confirm).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(deleteTopicMock).not.toHaveBeenCalled();

    await user.click(within(card("Topic b")).getByRole("button", { name: "Topic actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteTopicMock).toHaveBeenCalledWith("b"));
    expect(deleteTopicMock).toHaveBeenCalledOnce();
  });
});
