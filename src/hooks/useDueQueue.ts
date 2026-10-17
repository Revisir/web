import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { getTodaysList } from "../service/topic_service.mjs";
import { DUE_TOPIC_KEY } from "./useTopicQuery";

export type ReviewReason =
  | "done_today"
  | "not_due"
  | "no_materials"
  | "not_enough_questions"
  | "ai_not_configured"
  | "materials_processing"
  | "preparing_questions"
  | "extraction_failed"
  | "no_questions";

export type QuestionBankSummary = {
  state: "none" | "queued" | "building" | "ready" | "empty" | "failed";
  usableCount: number;
  rebuilding: boolean;
};

export type ReviewAvailability = {
  doneToday: boolean;
  normalQuiz: { available: boolean; reason: ReviewReason | null; questionCount: number };
  aiQuiz: { available: boolean; reason: ReviewReason | null };
};

export type DueTopic = {
  _id: string;
  topicName: string;
  subjectName: string;
  revisionDate: string;
  lastRevised: string | null;
  eFactor: number;
  interval: number;
  repetitionNumber: number;
  // Computed by the server (KTD10). Backends from before the due queue leave them out.
  lastQuality?: number | null;
  estimatedRecall?: number;
  nextIntervals?: number[];
  questionBank?: QuestionBankSummary;
  review?: ReviewAvailability;
};

// Its own query (KTD15), kept under the due-list prefix so mutations that
// invalidate [DUE_TOPIC_KEY] refresh it too.
export const DUE_QUEUE_KEY = [DUE_TOPIC_KEY, "queue"] as const;

async function fetchDueQueue(): Promise<DueTopic[]> {
  // The request interceptor sends X-Local-TimeZone, which sets the server's "today".
  const response = await getTodaysList();
  return response?.topics ?? [];
}

export function msUntilNextLocalMidnight(now: DateTime = DateTime.local()): number {
  return now.plus({ days: 1 }).startOf("day").diff(now).toMillis();
}

// Topics without `review` come from an older backend and count as not done.
export function countTopicsLeftToday(topics: DueTopic[] | undefined): number {
  return topics?.filter((topic) => topic.review?.doneToday !== true).length ?? 0;
}

export function useDueQueue() {
  const query = useQuery({
    queryKey: DUE_QUEUE_KEY,
    queryFn: fetchDueQueue,
    // The app's default staleTime is Infinity, which would otherwise skip focus refetches.
    refetchOnWindowFocus: "always",
  });
  const { refetch } = query;

  // A new local day changes what is due, so refetch at each local midnight.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleMidnightRefetch = () => {
      timer = setTimeout(() => {
        // Every mounted caller has a timer; joining an in-flight fetch keeps it to one request.
        refetch({ cancelRefetch: false });
        scheduleMidnightRefetch();
      }, msUntilNextLocalMidnight());
    };
    scheduleMidnightRefetch();
    return () => clearTimeout(timer);
  }, [refetch]);

  return query;
}
