import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { completeQuiz, flagQuizQuestion, startQuiz, submitQuizAnswer, type QuizAnswerResult } from "../service/quiz_service";
import { useRefreshTopicAfterReview, useRefreshTopicViews } from "./useTopicQuery";

/** A graded answer together with what the learner sent. */
export type RevealedAnswer = QuizAnswerResult & { response: string };

type AnswerVariables = { sessionId: string; questionId: string; response: string };
type FlagVariables = { sessionId: string; questionId: string };

/**
 * One normal-quiz session (KTD7): starts on mount, then answers, flags and completes one
 * question at a time. Nothing is recorded until `finish`; leaving earlier records no rating (R28).
 */
export function useQuiz(topicId: string) {
  const refreshTopicViews = useRefreshTopicViews();
  const refreshAfterReview = useRefreshTopicAfterReview();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, RevealedAnswer>>({});
  const [flagged, setFlagged] = useState<Record<string, true>>({});

  const startMutation = useMutation({ mutationFn: (id: string) => startQuiz(id) });
  const { mutate: start } = startMutation;
  useEffect(() => {
    start(topicId);
  }, [start, topicId]);

  const answerMutation = useMutation({
    mutationFn: ({ sessionId, questionId, response }: AnswerVariables) => submitQuizAnswer(sessionId, questionId, response),
    onSuccess: (result, { questionId, response }) => {
      setAnswers((previous) => ({ ...previous, [questionId]: { ...result, questionId, response } }));
    },
  });

  const flagMutation = useMutation({
    mutationFn: ({ sessionId, questionId }: FlagVariables) => flagQuizQuestion(sessionId, questionId),
    onSuccess: (_, { questionId }) => {
      setFlagged((previous) => ({ ...previous, [questionId]: true }));
      // A flag retires the question at once, so the topic's question count changes even if the quiz is left.
      refreshTopicViews(topicId);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (sessionId: string) => completeQuiz(sessionId),
    onSuccess: () => {
      // Also refetches the due list, whose key prefixes the queue's.
      refreshAfterReview(topicId);
    },
  });

  const session = startMutation.data;
  const sessionId = session?.sessionId;
  const questions = session?.questions ?? [];
  const question = questions[index];
  const answer = question ? answers[question.id] : undefined;
  const isLast = index === questions.length - 1;

  function submitAnswer(response: string) {
    if (!sessionId || !question || answer || answerMutation.isPending) return;
    answerMutation.mutate({ sessionId, questionId: question.id, response });
  }

  // Resends exactly what failed, so a lost response cannot turn into a different answer.
  function retryAnswer() {
    const variables = answerMutation.variables;
    if (!variables || !answerMutation.isError) return;
    answerMutation.mutate(variables);
  }

  function flagQuestion() {
    if (!sessionId || !question || !answer || flagged[question.id] || flagMutation.isPending) return;
    flagMutation.mutate({ sessionId, questionId: question.id });
  }

  function finish() {
    if (!sessionId || completeMutation.isPending) return;
    completeMutation.mutate(sessionId);
  }

  // Moves past a revealed question, completing the session after the last one.
  function next() {
    if (!answer || flagMutation.isPending) return;
    if (isLast) {
      finish();
      return;
    }
    answerMutation.reset();
    flagMutation.reset();
    setIndex((current) => current + 1);
  }

  return {
    starting: startMutation.isIdle || startMutation.isPending,
    startError: startMutation.error,
    retryStart: () => start(topicId),
    session,
    questions,
    question,
    index,
    isLast,
    answeredCount: Object.keys(answers).length,
    answer,
    isFlagged: question ? flagged[question.id] === true : false,
    submitAnswer,
    retryAnswer,
    submitting: answerMutation.isPending,
    submitError: answerMutation.error,
    flagQuestion,
    flagging: flagMutation.isPending,
    flagError: flagMutation.error,
    next,
    finishing: completeMutation.isPending,
    finishError: completeMutation.error,
    completion: completeMutation.data,
  };
}
