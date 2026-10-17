import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { Link, Route, Routes } from "react-router-dom";
import { DateTime } from "luxon";
import NormalQuiz from "./NormalQuiz";
import { createTestQueryClient, renderWithProviders } from "../../test/renderWithProviders";
import { completeQuiz, flagQuizQuestion, startQuiz, submitQuizAnswer, type QuizCompletion, type QuizSession } from "../../service/quiz_service";
import { ALL_TOPIC_KEY, DUE_TOPIC_KEY, TOPIC_DETAILS_KEY, TOPIC_FORGETTING_CURVE_KEY, TOPIC_HISTORY_KEY } from "../../hooks/useTopicQuery";

vi.mock("../../service/quiz_service", () => ({
  startQuiz: vi.fn(),
  submitQuizAnswer: vi.fn(),
  flagQuizQuestion: vi.fn(),
  completeQuiz: vi.fn(),
}));

const startQuizMock = vi.mocked(startQuiz);
const submitQuizAnswerMock = vi.mocked(submitQuizAnswer);
const flagQuizQuestionMock = vi.mocked(flagQuizQuestion);
const completeQuizMock = vi.mocked(completeQuiz);

const SESSION: QuizSession = {
  sessionId: "s1",
  topicId: "t1",
  topicName: "Photosynthesis",
  questions: [
    { id: "q1", type: "mcq", prompt: "Which organelle carries out photosynthesis?", options: ["Mitochondrion", "Chloroplast", "Ribosome", "Nucleus"] },
    { id: "q2", type: "fill_blank", prompt: "Plants take in ____ from the air." },
    { id: "q3", type: "mcq", prompt: "Which gas do plants release?", options: ["Nitrogen", "Oxygen", "Methane", "Helium"] },
    { id: "q4", type: "fill_blank", prompt: "The green pigment in leaves is ____." },
    { id: "q5", type: "mcq", prompt: "Where do the light reactions happen?", options: ["Stroma", "Thylakoid membrane", "Cell wall", "Vacuole"] },
  ],
};

const ANSWER_KEY: Record<string, string> = {
  q1: "Chloroplast",
  q2: "carbon dioxide",
  q3: "Oxygen",
  q4: "chlorophyll",
  q5: "Thylakoid membrane",
};

function apiError(code: string, message: string) {
  return Object.assign(new Error(message), { response: { data: { error: { code, message } } } });
}

function completion(overrides: Partial<QuizCompletion> = {}): QuizCompletion {
  return {
    rating: 3,
    scored: 4,
    correct: 3,
    nextRevisionDate: "2026-10-23T00:00:00.000Z",
    results: [
      { questionId: "q1", correct: true, flagged: false, correctAnswer: "Chloroplast" },
      { questionId: "q2", correct: true, flagged: false, correctAnswer: "carbon dioxide" },
      { questionId: "q3", correct: true, flagged: false, correctAnswer: "Oxygen" },
      { questionId: "q4", correct: false, flagged: true, correctAnswer: "chlorophyll" },
      { questionId: "q5", correct: false, flagged: false, correctAnswer: "Thylakoid membrane" },
    ],
    ...overrides,
  };
}

const QUIZ_ROUTES = (
  <Routes>
    <Route path="/" element={<p>today page</p>} />
    <Route path="/topics" element={<Link to="/topic/t1/quiz" state={{ from: "/topics" }}>Start quiz</Link>} />
    <Route path="/topic/:id/quiz" element={<NormalQuiz />} />
  </Routes>
);

// Full walkthroughs click through five questions, so they get more than the default 5s.
const WALKTHROUGH_TIMEOUT = 15_000;

function setupUser() {
  return userEvent.setup({ delay: null });
}

async function renderQuiz(options: Parameters<typeof renderWithProviders>[1] = {}) {
  const user = setupUser();
  const view = renderWithProviders(QUIZ_ROUTES, { route: "/topic/t1/quiz", ...options });
  await screen.findByText("Question 1 of 5");
  return { user, ...view };
}

// Picks an option or types into the blank, then submits and waits for the reveal.
async function answer(user: UserEvent, response: string) {
  const blank = screen.queryByLabelText("Your answer");
  if (blank) await user.type(blank, response);
  else await user.click(screen.getByRole("radio", { name: response }));
  await user.click(screen.getByRole("button", { name: "Submit answer" }));
  await screen.findByText(/^(Correct|Incorrect)$/);
}

async function flag(user: UserEvent) {
  await user.click(screen.getByRole("button", { name: "Flag question" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Flag this question?" });
  await user.click(within(dialog).getByRole("button", { name: "Flag question" }));
  await screen.findByText("Flagged");
}

async function next(user: UserEvent) {
  await user.click(screen.getByRole("button", { name: "Next" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  startQuizMock.mockResolvedValue(SESSION);
  submitQuizAnswerMock.mockImplementation(async (_sessionId, questionId, response) => ({
    questionId,
    correct: response.toLowerCase() === ANSWER_KEY[questionId].toLowerCase(),
    correctAnswer: ANSWER_KEY[questionId],
  }));
  flagQuizQuestionMock.mockImplementation(async (_sessionId, questionId) => ({ questionId, flagged: true }));
  completeQuizMock.mockResolvedValue(completion());
});

describe("NormalQuiz", () => {
  it("starts a session and shows the topic, Question 1 of 5 and the first question", async () => {
    await renderQuiz();

    expect(startQuizMock).toHaveBeenCalledOnce();
    expect(startQuizMock).toHaveBeenCalledWith("t1");
    expect(screen.getByRole("heading", { level: 1, name: "Photosynthesis" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Which organelle carries out photosynthesis?" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("progressbar", { name: "Quiz progress" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exit quiz" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit answer" })).toBeDisabled();
  });

  it("marks a multiple-choice answer and shows the correct option before Next", async () => {
    const { user } = await renderQuiz();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();

    await answer(user, "Mitochondrion");

    expect(submitQuizAnswerMock).toHaveBeenCalledWith("s1", "q1", "Mitochondrion");
    const reveal = screen.getByRole("status");
    expect(reveal).toHaveTextContent("Incorrect");
    expect(reveal).toHaveTextContent("Correct answer: Chloroplast");
    expect(screen.getByRole("radio", { name: "Chloroplast (correct answer)" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Mitochondrion (your answer)" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();

    await next(user);
    expect(screen.getByText("Question 2 of 5")).toBeInTheDocument();
  });

  it("answers a multiple-choice question from the keyboard", async () => {
    const { user } = await renderQuiz();
    expect(screen.getByRole("heading", { name: "Which organelle carries out photosynthesis?" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("radio", { name: "Mitochondrion" })).toHaveFocus();
    // Radix moves focus on a timer and checks the item only while the arrow is still down.
    await user.keyboard("{ArrowDown>}");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Chloroplast" })).toBeChecked());
    await user.keyboard("{/ArrowDown}{Enter}");

    expect(await screen.findByText("Correct")).toBeInTheDocument();
    expect(submitQuizAnswerMock).toHaveBeenCalledWith("s1", "q1", "Chloroplast");
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
  });

  it("submits a fill-in-the-blank answer with Enter and shows the result", async () => {
    const { user } = await renderQuiz();
    await answer(user, "Chloroplast");
    await next(user);

    expect(screen.getByRole("heading", { name: "Plants take in ____ from the air." })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Your answer"), "Carbon Dioxide{Enter}");

    expect(submitQuizAnswerMock).toHaveBeenLastCalledWith("s1", "q2", "Carbon Dioxide");
    const reveal = await screen.findByRole("status");
    await waitFor(() => expect(reveal).toHaveTextContent("Correct"));
    expect(reveal).toHaveTextContent("Your answer: Carbon Dioxide");
    expect(reveal).toHaveTextContent("Correct answer: carbon dioxide");
  });

  it("asks before flagging, then marks the question flagged and calls the flag endpoint once", async () => {
    const { user } = await renderQuiz();
    expect(screen.queryByRole("button", { name: "Flag question" })).not.toBeInTheDocument();
    await answer(user, "Ribosome");

    await user.click(screen.getByRole("button", { name: "Flag question" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Flag this question?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(flagQuizQuestionMock).not.toHaveBeenCalled();

    await flag(user);

    expect(flagQuizQuestionMock).toHaveBeenCalledOnce();
    expect(flagQuizQuestionMock).toHaveBeenCalledWith("s1", "q1");
    expect(screen.queryByRole("button", { name: "Flag question" })).not.toBeInTheDocument();
  });

  it("finishes three right of four scored with 75% and a rating of 3 (AE1)", { timeout: WALKTHROUGH_TIMEOUT }, async () => {
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { user } = await renderQuiz({ queryClient });

    await answer(user, "Chloroplast");
    await next(user);
    await answer(user, "carbon dioxide");
    await next(user);
    await answer(user, "Oxygen");
    await next(user);
    await answer(user, "carotene");
    await flag(user);
    await next(user);
    await answer(user, "Stroma");
    expect(completeQuizMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Finish quiz" }));

    await screen.findByText("75%");
    expect(completeQuizMock).toHaveBeenCalledOnce();
    expect(completeQuizMock).toHaveBeenCalledWith("s1");
    expect(screen.getByText("3 of 4 correct")).toBeInTheDocument();
    const rating = screen.getByText("Rating").closest("div");
    expect(rating).toHaveTextContent(/3\s*Hesitant/);
    expect(screen.getByText(DateTime.fromISO("2026-10-23T00:00:00.000Z").toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY))).toBeInTheDocument();

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent("Correct");
    expect(items[3]).toHaveTextContent("Flagged, not scored");
    expect(items[3]).toHaveTextContent("Correct answer: chlorophyll");
    expect(items[4]).toHaveTextContent("Wrong");
    expect(screen.getByRole("link", { name: "Back to Today's List" })).toHaveAttribute("href", "/");

    for (const queryKey of [[DUE_TOPIC_KEY], [ALL_TOPIC_KEY], [TOPIC_DETAILS_KEY, "t1"], [TOPIC_HISTORY_KEY, "t1"], [TOPIC_FORGETTING_CURVE_KEY, "t1"], ["stats"]]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey });
    }
  });

  it("says no rating was recorded and the topic is still due when completion has no rating (AE4)", { timeout: WALKTHROUGH_TIMEOUT }, async () => {
    completeQuizMock.mockResolvedValue(
      completion({
        rating: null,
        scored: 0,
        correct: 0,
        nextRevisionDate: null,
        results: SESSION.questions.map((question) => ({ questionId: question.id, correct: false, flagged: true, correctAnswer: ANSWER_KEY[question.id] })),
      }),
    );
    const { user } = await renderQuiz();

    for (const [position, response] of ["Nucleus", "water", "Helium", "carotene", "Vacuole"].entries()) {
      await answer(user, response);
      await flag(user);
      if (position < 4) await next(user);
    }
    await user.click(screen.getByRole("button", { name: "Finish quiz" }));

    expect(await screen.findByText("No rating recorded")).toBeInTheDocument();
    expect(screen.getByText(/The topic is still due\./)).toBeInTheDocument();
    expect(flagQuizQuestionMock).toHaveBeenCalledTimes(5);
    expect(within(screen.getByRole("list")).getAllByText("Flagged, not scored")).toHaveLength(5);
  });

  it("asks before exiting after a flag and never completes the quiz (AE5)", async () => {
    const { user } = await renderQuiz();
    await answer(user, "Chloroplast");
    await next(user);
    await answer(user, "sunlight");
    await flag(user);
    await next(user);
    expect(screen.getByText("Question 3 of 5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Exit quiz" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Leave this quiz?" });
    expect(dialog).toHaveTextContent("No rating is recorded and the topic stays due.");
    expect(screen.queryByText("today page")).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Leave quiz" }));

    expect(await screen.findByText("today page")).toBeInTheDocument();
    expect(flagQuizQuestionMock).toHaveBeenCalledOnce();
    expect(completeQuizMock).not.toHaveBeenCalled();
  });

  it("goes back to where the quiz was started", async () => {
    const user = setupUser();
    renderWithProviders(QUIZ_ROUTES, { route: "/topics" });
    await user.click(screen.getByRole("link", { name: "Start quiz" }));
    await screen.findByText("Question 1 of 5");

    await user.click(screen.getByRole("button", { name: "Exit quiz" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Leave quiz" }));

    expect(await screen.findByRole("link", { name: "Start quiz" })).toBeInTheDocument();
  });

  it("shows a message and a link back when the topic was already reviewed today", async () => {
    startQuizMock.mockRejectedValue(apiError("ALREADY_REVIEWED_TODAY", "Topic already reviewed today"));
    const user = setupUser();
    renderWithProviders(QUIZ_ROUTES, { route: "/topic/t1/quiz" });

    expect(await screen.findByRole("heading", { name: "You already reviewed this topic today" })).toBeInTheDocument();
    expect(screen.queryByText(/Question \d of/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    const back = screen.getByRole("link", { name: "Back to Today's List" });
    expect(back).toHaveAttribute("href", "/");

    await user.click(back);
    expect(await screen.findByText("today page")).toBeInTheDocument();
  });

  it("offers a retry after a failed submit that resends the same answer", async () => {
    submitQuizAnswerMock.mockRejectedValueOnce(new Error("Network Error"));
    const { user } = await renderQuiz();

    await user.click(screen.getByRole("radio", { name: "Chloroplast" }));
    await user.click(screen.getByRole("button", { name: "Submit answer" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your answer didn't go through.");
    expect(screen.queryByRole("button", { name: "Submit answer" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Nucleus" })).toBeDisabled();

    await user.click(within(alert).getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Correct")).toBeInTheDocument();
    expect(submitQuizAnswerMock).toHaveBeenCalledTimes(2);
    expect(submitQuizAnswerMock).toHaveBeenNthCalledWith(1, "s1", "q1", "Chloroplast");
    expect(submitQuizAnswerMock).toHaveBeenNthCalledWith(2, "s1", "q1", "Chloroplast");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables Submit while an answer is pending so it is sent once", async () => {
    let resolveAnswer: (value: Awaited<ReturnType<typeof submitQuizAnswer>>) => void = () => {};
    submitQuizAnswerMock.mockImplementationOnce(() => new Promise((resolve) => (resolveAnswer = resolve)));
    const { user } = await renderQuiz();

    await user.click(screen.getByRole("radio", { name: "Chloroplast" }));
    await user.click(screen.getByRole("button", { name: "Submit answer" }));
    const pending = screen.getByRole("button", { name: "Checking…" });
    expect(pending).toBeDisabled();
    await user.click(pending);
    await user.keyboard("{Enter}");

    resolveAnswer({ questionId: "q1", correct: true, correctAnswer: "Chloroplast" });
    expect(await screen.findByText("Correct")).toBeInTheDocument();
    expect(submitQuizAnswerMock).toHaveBeenCalledOnce();
  });
});
