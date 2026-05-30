import { AxiosInstancePrivate } from "./AxiosInstance.mjs";

export const startChat = async (topicId) => {
  const res = await AxiosInstancePrivate().post("/chat/start", { topicId });
  return res.data;
};

export const sendMessage = async (sessionId, message) => {
  const res = await AxiosInstancePrivate().post("/chat/message", { sessionId, message });
  return res.data;
};

export const completeChat = async ({ sessionId, topicId, userQuality, llmQuality }) => {
  const res = await AxiosInstancePrivate().post("/chat/complete", { sessionId, topicId, userQuality, llmQuality });
  return res.data;
};
