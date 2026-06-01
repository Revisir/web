import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useEffect } from "react";
import { getTopic, getTopicHistory, updateTopic, reviseTopic, deleteTopic, addTopic, getFileUploadUrls, deleteTopicFile, resetTopic, generateMindMap } from "../service/topic_service.mjs";
import { extractRevisionBooleans } from "../utils/topics.utils";
export const DUE_TOPIC_KEY = "dueTopics";
export const ALL_TOPIC_KEY = "allTopics";
export const MIN_TOPIC_DETAILS = "less_details";
export const TOPIC_DETAILS_KEY = "details_Topic";
export const TOPIC_HISTORY_KEY = "history_Topic";

interface TopicListLoader {
  data: Record<string, any>;
  totalPages: number;
  isFetched: boolean;
}

type ListData = {
  topics: Array<object>;
  total: number;
  page: number;
};

type RevisionResponse = { lastRevised: string; nextRevisionDate: string };

export function useTopicsList(listKey: string, loader: (page?: number) => Promise<any>, page: number = 1): TopicListLoader {
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
  }, [data]);

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
  return useQuery({
    queryKey: [TOPIC_DETAILS_KEY, String(id)],
    queryFn: () => getTopic(id),
    enabled: !!id,
  });
}
export function useTopicHistory(id: string) {
  return useQuery({
    queryKey: [TOPIC_HISTORY_KEY, String(id)],
    queryFn: () => getTopicHistory(id),
    enabled: !!id,
  });
}
export function useTopicUpdate() {
  const qClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: any }) => updateTopic(id, formData),
    onSuccess: (res, { id }) => {
      qClient.setQueryData([MIN_TOPIC_DETAILS, String(id)], (oldDetail: object) => ({
        ...oldDetail,
        lastRevised: res.lastRevised,
        revisionDate: res.nextRevisionDate,
      }));
      qClient.setQueryData([TOPIC_DETAILS_KEY, String(id)], res?.topic);
      qClient.invalidateQueries({ queryKey: [TOPIC_HISTORY_KEY, String(id)] });
    },
  });
}

export function useTopicRevise() {
  const qClient = useQueryClient();
  return useMutation({
    mutationKey: ["revise-topic"],
    mutationFn: ({ id, quality }: { id: string; quality: object }) => reviseTopic(id, quality),
    onError: (err) => {
      console.log("ERROR:", err);
    },
    onSuccess: async (res: RevisionResponse, { id }) => {
      await Promise.all([
        qClient.setQueryData([MIN_TOPIC_DETAILS, String(id)], (oldDetail: object) => {
          if (!oldDetail) return oldDetail;
          return {
            ...oldDetail,
            lastRevised: res.lastRevised,
            revisionDate: res.nextRevisionDate,
          };
        }),
        qClient.setQueryData([TOPIC_DETAILS_KEY, String(id)], (oldDetail: object) => {
          if (!oldDetail) return oldDetail;
          return {
            ...oldDetail,
            lastRevised: res.lastRevised,
            revisionDate: res.nextRevisionDate,
          };
        }),
        qClient.setQueryData([DUE_TOPIC_KEY], (oldDetail: ListData) => {
          if (!oldDetail) return oldDetail;
          return {
            ...oldDetail,
            topics: oldDetail.topics.map((ele: object) =>
              ele._id === id
                ? {
                    ...ele,
                    lastRevised: res.lastRevised,
                    revisionDate: res.nextRevisionDate,
                  }
                : ele,
            ),
          };
        }),
        qClient.setQueryData([ALL_TOPIC_KEY], (oldDetail: ListData) => {
          if (!oldDetail) return oldDetail;
          return {
            ...oldDetail,
            topics: oldDetail.topics.map((ele: object) =>
              ele._id === id
                ? {
                    ...ele,
                    lastRevised: res.lastRevised,
                    revisionDate: res.nextRevisionDate,
                  }
                : ele,
            ),
          };
        }),

        qClient.invalidateQueries({ queryKey: [TOPIC_HISTORY_KEY, String(id)] }),
      ]);
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
    },
  });
}

export function useTopicCreate() {
  const qClient = useQueryClient();
  return useMutation({
    mutationFn: ({ formData }: { formData: object }) => addTopic(formData),
    onSuccess: (res: object) => {
      if (res?.revisionDate) {
        const { today } = extractRevisionBooleans(res);
        if (today) {
          qClient.invalidateQueries({ queryKey: [DUE_TOPIC_KEY] });
        }
      }
      qClient.invalidateQueries({ queryKey: [ALL_TOPIC_KEY] });
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
      const { uploadUrls } = await getFileUploadUrls(id, fileMeta);
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
    onSuccess: (_, { id }) => {
      qClient.invalidateQueries({ queryKey: [TOPIC_DETAILS_KEY, String(id)] });
    },
  });
}

export function useTopicFileDelete() {
  const qClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, fileId }: { topicId: string; fileId: string }) => deleteTopicFile(topicId, fileId),
    onSuccess: (_, { topicId }) => {
      qClient.invalidateQueries({ queryKey: [TOPIC_DETAILS_KEY, String(topicId)] });
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
      qClient.setQueryData([TOPIC_DETAILS_KEY, String(id)], (old: any) => {
        if (!old) return old;
        console.log({ ...old, mindMap: res.mindmap });
        return { ...old, mindMap: res.mindmap };
      });
    },
  });
}
