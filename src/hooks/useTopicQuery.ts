import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { useCallback, useEffect, useRef } from "react";
import { getTopic, getTopicHistory, getTopicForgettingCurve, updateTopic, reviseTopic, deleteTopic, addTopic, getFileUploadUrls, deleteTopicFile, resetTopic, generateMindMap, regenerateQuestions } from "../service/topic_service.mjs";
import { extractRevisionBooleans } from "../utils/topics.utils";
import { getApiErrorCode } from "../utils/apiErrors";
import type { DueTopic, QuestionBankSummary } from "./useDueQueue";
export const DUE_TOPIC_KEY = "dueTopics";
export const ALL_TOPIC_KEY = "allTopics";
export const MIN_TOPIC_DETAILS = "less_details";
export const TOPIC_DETAILS_KEY = "details_Topic";
export const TOPIC_HISTORY_KEY = "history_Topic";
export const TOPIC_FORGETTING_CURVE_KEY = "forgettingCurve_Topic";

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

type Attachment = { _id?: string; processingStatus?: ProcessingStatus; errorReason?: string };
export type TopicFile = Attachment & { fileName: string; fileType: string; fileUrl: string };
export type TopicUrl = Attachment & { url: string };

/** `GET /topics/:id`: the due-list fields (KTD10) plus the topic's materials and mind map. */
export type TopicDetail = DueTopic & {
  description?: string;
  dateStudied?: string;
  files?: TopicFile[];
  // Older topics may hold bare URL strings.
  urls?: Array<TopicUrl | string>;
  mindMap?: string | null;
};

type TopicSummary = { _id: string; revisionDate?: string; lastRevised?: string | null };

interface TopicListLoader {
  data: TopicSummary[] | undefined;
  totalPages: number;
  isFetched: boolean;
}

type ListData = {
  topics: TopicSummary[];
  total: number;
  page: number;
};

type UploadUrl = { uploadUrl: string };

/** `POST /topics/:id/revised`. */
export type RevisionResponse = { nextRevisionDate: string; lastRevised: string; lastQuality?: number | null };

// While materials extract or the question bank builds, the topic page polls for the result.
const SETTLING_POLL_MS = 5_000;
// Stops polling an attachment that never settles; a window-focus refetch still updates the page.
const MAX_SETTLING_POLL_MS = 10 * 60_000;

function isSettling(topic: TopicDetail | undefined): boolean {
  if (!topic) return false;
  const attachments = [...(topic.files ?? []), ...(topic.urls ?? [])];
  const extracting = attachments.some((attachment) => typeof attachment === "object" && (attachment.processingStatus === "pending" || attachment.processingStatus === "processing"));
  const bankState = topic.questionBank?.state;
  return extracting || bankState === "queued" || bankState === "building";
}

// Topic writes return the stored topic without the server-computed fields (review availability,
// question bank, next intervals), so they refetch every view that shows those fields instead of caching the response.
function refreshTopicViews(qClient: QueryClient, id: string) {
  return Promise.all([
    qClient.invalidateQueries({ queryKey: [TOPIC_DETAILS_KEY, String(id)] }),
    // A prefix of the due queue's key, so Today's List refetches too.
    qClient.invalidateQueries({ queryKey: [DUE_TOPIC_KEY] }),
  ]);
}

// A review or a schedule change also moves the topic's history, curve, list entry and the stats.
function refreshTopicSchedule(qClient: QueryClient, id: string) {
  return Promise.all([
    refreshTopicViews(qClient, id),
    qClient.invalidateQueries({ queryKey: [ALL_TOPIC_KEY] }),
    qClient.invalidateQueries({ queryKey: [TOPIC_HISTORY_KEY, String(id)] }),
    qClient.invalidateQueries({ queryKey: [TOPIC_FORGETTING_CURVE_KEY, String(id)] }),
    qClient.invalidateQueries({ queryKey: ["stats"] }),
  ]);
}

export function useTopicsList(listKey: string, loader: (page?: number) => Promise<ListData | undefined>, page: number = 1): TopicListLoader {
  // listKey names the loader, so the loader function itself stays out of the key.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const { data, isFetched } = useQuery({
    queryKey: [listKey, page],
    queryFn: () => loader(page),
    staleTime: Infinity,
  });
  const qClient = useQueryClient();

  useEffect(() => {
    if (data?.topics) {
      for (const topic of data.topics) {
        qClient.setQueryData([MIN_TOPIC_DETAILS, String(topic._id)], topic);
      }
    }
  }, [data, qClient]);

  return { data: data?.topics, totalPages: data?.total ?? 1, isFetched };
}

export function useMinTopicDetails(id: string) {
  return useQuery({
    queryKey: [MIN_TOPIC_DETAILS, String(id)],
    queryFn: () => Promise.resolve(null),
    staleTime: Infinity,
    enabled: false,
  });
}

export function useTopicDetails(id: string) {
  const settlingSince = useRef<number | null>(null);
  return useQuery({
    queryKey: [TOPIC_DETAILS_KEY, String(id)],
    queryFn: (): Promise<TopicDetail> => getTopic(id),
    enabled: !!id,
    // The app's default staleTime is Infinity, which would otherwise skip focus refetches.
    refetchOnWindowFocus: "always",
    refetchInterval: (query) => {
      if (!isSettling(query.state.data)) {
        settlingSince.current = null;
        return false;
      }
      settlingSince.current ??= Date.now();
      return Date.now() - settlingSince.current < MAX_SETTLING_POLL_MS ? SETTLING_POLL_MS : false;
    },
  });
}
export function useTopicHistory(id: string) {
  return useQuery({
    queryKey: [TOPIC_HISTORY_KEY, String(id)],
    queryFn: () => getTopicHistory(id),
    enabled: !!id,
  });
}

export function useTopicForgettingCurve(id: string) {
  return useQuery({
    queryKey: [TOPIC_FORGETTING_CURVE_KEY, String(id)],
    queryFn: () => getTopicForgettingCurve(id),
    enabled: !!id,
  });
}

/** Refetches a topic's views after a review recorded outside these hooks, such as the AI chat's. */
export function useRefreshTopicAfterReview() {
  const qClient = useQueryClient();
  return useCallback((id: string) => refreshTopicSchedule(qClient, id), [qClient]);
}

export function useTopicUpdate() {
  const qClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: Record<string, unknown> }) => updateTopic(id, formData),
    // A changed study date resets the schedule and history (KTD20), so refresh those as well.
    onSuccess: (_, { id }) => {
      refreshTopicSchedule(qClient, id);
    },
  });
}

export function useTopicRevise() {
  const qClient = useQueryClient();
  return useMutation({
    mutationKey: ["revise-topic"],
    mutationFn: ({ id, quality }: { id: string; quality: { userQuality: number } }): Promise<RevisionResponse> => reviseTopic(id, quality),
    onSuccess: (_, { id }) => {
      refreshTopicSchedule(qClient, id);
    },
    onError: (error, { id }) => {
      // Another tab or the AI chat already reviewed the topic today (KTD8): show that review.
      if (getApiErrorCode(error) === "ALREADY_REVIEWED_TODAY") refreshTopicSchedule(qClient, id);
    },
  });
}

/** Replaces the topic's question bank (R18); the 202 response carries the bank's new state. */
export function useTopicQuestionsRegenerate() {
  const qClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }): Promise<{ questionBank?: QuestionBankSummary }> => regenerateQuestions(id),
    onSuccess: (res, { id }) => {
      const questionBank = res?.questionBank;
      if (questionBank) {
        qClient.setQueryData<TopicDetail>([TOPIC_DETAILS_KEY, String(id)], (old) => (old ? { ...old, questionBank } : old));
      }
      // Review availability follows the bank, so refetch the computed fields too.
      refreshTopicViews(qClient, id);
    },
  });
}

export function useTopicDelete() {
  const qClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteTopic(id),
    onSuccess: (_, { id }) => {
      qClient.invalidateQueries({ queryKey: [DUE_TOPIC_KEY] });
      qClient.invalidateQueries({ queryKey: [ALL_TOPIC_KEY] });
      qClient.invalidateQueries({ queryKey: [TOPIC_DETAILS_KEY, String(id)] });
      qClient.invalidateQueries({ queryKey: [TOPIC_HISTORY_KEY, String(id)] });
      qClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useTopicCreate() {
  const qClient = useQueryClient();
  return useMutation({
    mutationFn: ({ formData }: { formData: object }) => addTopic(formData),
    onSuccess: (res: TopicSummary | undefined) => {
      if (res?.revisionDate) {
        const { today } = extractRevisionBooleans({ lastRevised: res.lastRevised ?? "", revisionDate: res.revisionDate });
        if (today) {
          qClient.invalidateQueries({ queryKey: [DUE_TOPIC_KEY] });
        }
      }
      qClient.invalidateQueries({ queryKey: [ALL_TOPIC_KEY] });
      qClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useTopicFileUpload() {
  const qClient = useQueryClient();
  return useMutation({
    mutationKey: ["upload-topic-files"],
    mutationFn: async ({ id, files }: { id: string; files: File[] }) => {
      const fileMeta = files.map((f) => ({
        fileName: f.name,
        size: f.size,
        contentType: f.type,
      }));
      const { uploadUrls }: { uploadUrls: UploadUrl[] } = await getFileUploadUrls(id, fileMeta);
      await Promise.all(
        uploadUrls.map(({ uploadUrl }, idx) =>
          fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": files[idx].type },
            body: files[idx],
          }),
        ),
      );
    },
    // The new files show as pending, and the topic page polls until they settle.
    onSuccess: (_, { id }) => {
      refreshTopicViews(qClient, id);
    },
  });
}

export function useTopicFileDelete() {
  const qClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, fileId }: { topicId: string; fileId: string }) => deleteTopicFile(topicId, fileId),
    onSuccess: (_, { topicId }) => {
      refreshTopicViews(qClient, topicId);
    },
  });
}

export function useTopicReset() {
  const qClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => resetTopic(id),
    onSuccess: (_, { id }) => {
      qClient.invalidateQueries({ queryKey: [TOPIC_DETAILS_KEY, String(id)] });
      qClient.invalidateQueries({ queryKey: [TOPIC_HISTORY_KEY, String(id)] });
    },
  });
}

export function useTopicMindMapGenerate() {
  const qClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => generateMindMap(id),
    onSuccess: (res, { id }) => {
      qClient.setQueryData<TopicDetail>([TOPIC_DETAILS_KEY, String(id)], (old) => {
        if (!old) return old;
        return { ...old, mindMap: res.mindmap };
      });
    },
  });
}
