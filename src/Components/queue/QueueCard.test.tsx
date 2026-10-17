import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { DateTime } from "luxon";
import QueueCard from "./QueueCard";
import { renderWithProviders } from "../../test/renderWithProviders";
import type { DueTopic, ReviewAvailability, ReviewReason } from "../../hooks/useDueQueue";

const NEXT_REVIEW = DateTime.local(2026, 10, 23, 12).toISO()!;

function available(questionCount = 5): ReviewAvailability {
  return {
    doneToday: false,
    normalQuiz: { available: true, reason: null, questionCount },
    aiQuiz: { available: true, reason: null },
  };
}

function unavailable(normalReason: ReviewReason | null, aiReason: ReviewReason | null): ReviewAvailability {
  return {
    doneToday: false,
    normalQuiz: normalReason ? { available: false, reason: normalReason, questionCount: 0 } : { available: true, reason: null, questionCount: 5 },
    aiQuiz: aiReason ? { available: false, reason: aiReason } : { available: true, reason: null },
  };
}

function makeTopic(overrides: Partial<DueTopic> = {}): DueTopic {
  return {
    _id: "t1",
    topicName: "Krebs cycle",
    subjectName: "Biochemistry",
    revisionDate: DateTime.local(2026, 10, 17, 12).toISO()!,
    lastRevised: null,
    eFactor: 2.36,
    interval: 6,
    repetitionNumber: 3,
    lastQuality: 4,
    estimatedRecall: 0.74,
    nextIntervals: [1, 1, 1, 6, 15, 16],
    questionBank: { state: "ready", usableCount: 12, rebuilding: false },
    review: available(),
    ...overrides,
  };
}

function LocationProbe() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

function renderCard(topic: DueTopic, overdueDays = 0) {
  const handlers = { onStartAiQuiz: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  renderWithProviders(
    <>
      <QueueCard topic={topic} overdueDays={overdueDays} {...handlers} />
      <LocationProbe />
    </>,
  );
  return handlers;
}

const startQuiz = () => screen.getByRole("button", { name: /^Start quiz/ });
const startAiQuiz = () => screen.getByRole("button", { name: "Start AI quiz" });
const doneLink = () => screen.queryByRole("link", { name: /Mark as done on the topic page/ });

describe("QueueCard", () => {
  it("shows the subject, name, due badge and SM-2 metrics", () => {
    renderCard(makeTopic());

    const card = screen.getByRole("article", { name: "Krebs cycle" });
    expect(within(card).getByText("Biochemistry")).toBeInTheDocument();
    expect(within(card).getByText("Due today")).toBeInTheDocument();
    const metrics = within(card).getAllByRole("term").map((term) => `${term.textContent}: ${term.nextElementSibling?.textContent}`);
    expect(metrics).toEqual(["Interval: 6 days", "Repetitions: 3", "Ease factor: 2.36", "Recall: 74%"]);
  });

  it.each([
    [1, "Overdue 1 day"],
    [2, "Overdue 2 days"],
  ])("marks a topic %i day(s) overdue", (days, label) => {
    renderCard(makeTopic(), days);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("opens the topic page from the topic name", () => {
    renderCard(makeTopic());
    expect(screen.getByRole("link", { name: "Krebs cycle" })).toHaveAttribute("href", "/topic/t1");
  });

  it("labels Start quiz with its question count and opens the quiz route", async () => {
    const user = userEvent.setup();
    renderCard(makeTopic({ review: available(4) }));

    const button = screen.getByRole("button", { name: "Start quiz (4 questions)" });
    expect(button).toBeEnabled();
    await user.click(button);

    expect(screen.getByTestId("location")).toHaveTextContent("/topic/t1/quiz");
  });

  it("starts the AI quiz for the topic", async () => {
    const user = userEvent.setup();
    const topic = makeTopic();
    const { onStartAiQuiz } = renderCard(topic);

    await user.click(startAiQuiz());

    expect(onStartAiQuiz).toHaveBeenCalledWith(topic);
  });

  it("disables both quizzes while materials are still processing (AE7)", () => {
    renderCard(makeTopic({ review: unavailable("materials_processing", "materials_processing") }));

    expect(startQuiz()).toBeDisabled();
    expect(startQuiz()).toHaveAccessibleName("Start quiz");
    expect(startQuiz()).toHaveAccessibleDescription("Materials are still processing");
    expect(startAiQuiz()).toBeDisabled();
    expect(startAiQuiz()).toHaveAccessibleDescription("Materials are still processing");
  });

  it("links to Done on the topic page when AI is not set up and no quiz can run (AE12)", () => {
    renderCard(makeTopic({ review: unavailable("ai_not_configured", "ai_not_configured") }));

    expect(startQuiz()).toBeDisabled();
    expect(startAiQuiz()).toBeDisabled();
    expect(startQuiz()).toHaveAccessibleDescription("AI is not set up");
    expect(startAiQuiz()).toHaveAccessibleDescription("AI is not set up");
    expect(doneLink()).toHaveAttribute("href", "/topic/t1");
  });

  it("points to Regenerate on the topic page when no questions are left (AE3)", () => {
    renderCard(makeTopic({ review: unavailable("no_questions", null) }));

    expect(startQuiz()).toBeDisabled();
    expect(startQuiz()).toHaveAccessibleDescription("Quiz: No questions left — regenerate them on the topic page");
    expect(screen.getByRole("link", { name: "regenerate them on the topic page" })).toHaveAttribute("href", "/topic/t1");
    expect(startAiQuiz()).toBeEnabled();
    expect(doneLink()).not.toBeInTheDocument();
  });

  it("says a topic has no materials and links to its topic page (AE6)", () => {
    renderCard(makeTopic({ review: unavailable("no_materials", "no_materials"), questionBank: { state: "none", usableCount: 0, rebuilding: false } }));

    expect(screen.getByText("No materials")).toBeInTheDocument();
    expect(startQuiz()).toBeDisabled();
    expect(startAiQuiz()).toBeDisabled();
    expect(doneLink()).toHaveAttribute("href", "/topic/t1");
  });

  it("names each quiz's own reason when they differ", () => {
    renderCard(makeTopic({ review: unavailable("preparing_questions", "ai_not_configured") }));

    expect(startQuiz()).toHaveAccessibleDescription("Quiz: Questions are being prepared");
    expect(startAiQuiz()).toHaveAccessibleDescription("AI quiz: AI is not set up");
    expect(doneLink()).toHaveAttribute("href", "/topic/t1");
  });

  it("shows a topic finished today as done, with its rating and next review date", () => {
    renderCard(
      makeTopic({
        revisionDate: NEXT_REVIEW,
        lastQuality: 4,
        review: { doneToday: true, normalQuiz: { available: false, reason: "done_today", questionCount: 0 }, aiQuiz: { available: false, reason: "done_today" } },
      }),
      -6,
    );

    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("4 · Good")).toBeInTheDocument();
    expect(screen.getByText(DateTime.fromISO(NEXT_REVIEW).toLocaleString(DateTime.DATE_MED))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Start/ })).not.toBeInTheDocument();
  });

  it("renders a topic from a backend without availability, linking to its topic page", () => {
    const legacy = makeTopic();
    delete legacy.review;
    delete legacy.estimatedRecall;
    delete legacy.lastQuality;
    delete legacy.questionBank;
    delete legacy.nextIntervals;
    renderCard(legacy);

    expect(screen.queryByRole("button", { name: /Start/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open topic" })).toHaveAttribute("href", "/topic/t1");
    expect(screen.queryByText("Recall")).not.toBeInTheDocument();
    expect(screen.getByText("Interval")).toBeInTheDocument();
  });

  it("offers edit and delete in the topic actions menu", async () => {
    const user = userEvent.setup();
    const topic = makeTopic();
    const { onEdit, onDelete } = renderCard(topic);

    await user.click(screen.getByRole("button", { name: "Topic actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledWith(topic);

    await user.click(screen.getByRole("button", { name: "Topic actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith(topic);
  });
});
