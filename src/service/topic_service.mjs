import { AxiosInstancePrivate } from "./AxiosInstance.mjs";
import { api } from "./endPoints.mjs";

const axios = AxiosInstancePrivate();

export async function getTodaysList(page = 1) {
  const response = await axios.get(api.todaysList, { params: { page } });
  return response?.data;
}
export async function getAllList(page = 1) {
  const response = await axios.get(api.allTopics, { params: { page } });
  return response?.data;
}
export async function getTopic(id) {
  const response = await axios.get(api.topic(id));
  return response?.data;
}
export async function deleteTopic(id) {
  const response = await axios.delete(api.topic(id));
  return response?.data;
}
export async function addTopic(data) {
  const response = await axios.post(api.topic(null), data, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response?.data;
}
export async function updateTopic(id, data) {
  const response = await axios.patch(api.topic(id), data, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response?.data;
}
export async function reviseTopic(id, data) {
  const response = await axios.post(`${api.topic(id)}/revised`, data, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response?.data;
}
export async function getTopicHistory(id) {
  const response = await axios.get(`${api.topic(id)}/history`);
  return response?.data;
}

export async function getFileUploadUrls(id, files) {
  const response = await axios.post(`${api.topic(id)}/files`, { files });
  return response?.data;
}

export async function deleteTopicFile(topicId, fileId) {
  const response = await axios.delete(`${api.topic(topicId)}/files/${fileId}`);
  return response?.data;
}

export async function resetTopic(id) {
  const response = await axios.post(`${api.topic(id)}/reset`);
  return response?.data;
}
