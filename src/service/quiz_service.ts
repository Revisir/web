import { AxiosInstancePrivate } from "./AxiosInstance.mjs";
import { api } from "./endPoints.mjs";

const axios = AxiosInstancePrivate();

// Shapes from the normal quiz API (`/api/quiz`). Questions never carry their answers (KTD7).
export type QuizQuestionType = "mcq" | "fill_blank";

export type QuizQuestion = {
  id: string;
  type: QuizQuestionType;
  // A fill-in-the-blank prompt marks the blank with "____".
  prompt: string;
  // Multiple choice only, already shuffled by the server.
  options?: string[];
};

export type QuizSession = {
  sessionId: string;
  topicId: string;
  topicName: string;
  questions: QuizQuestion[];
};

export type QuizAnswerResult = {
  questionId: string;
  correct: boolean;
  correctAnswer: string;
};

export type QuizFlagResult = {
  questionId: string;
  flagged: true;
};

export type QuizQuestionResult = {
  questionId: string;
  correct: boolean;
  flagged: boolean;
  correctAnswer: string;
};

export type QuizCompletion = {
  // Null when fewer than three questions were scored (R30, R37).
  rating: number | null;
  scored: number;
  correct: number;
  nextRevisionDate: string | null;
  results: QuizQuestionResult[];
};

export async function startQuiz(topicId: string): Promise<QuizSession> {
  const response = await axios.post(api.quizStart, { topicId });
  return response?.data;
}

// `response` is the chosen option's text for multiple choice, or the typed text for a blank.
export async function submitQuizAnswer(sessionId: string, questionId: string, response: string): Promise<QuizAnswerResult> {
  const res = await axios.post(`${api.quizSession(sessionId)}/answer`, { questionId, response });
  return res?.data;
}

export async function flagQuizQuestion(sessionId: string, questionId: string): Promise<QuizFlagResult> {
  const response = await axios.post(`${api.quizSession(sessionId)}/flag`, { questionId });
  return response?.data;
}

export async function completeQuiz(sessionId: string): Promise<QuizCompletion> {
  const response = await axios.post(`${api.quizSession(sessionId)}/complete`);
  return response?.data;
}
