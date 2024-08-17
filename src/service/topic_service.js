import { AxiosInstancePrivate } from "./AxiosInstance";
import { api } from "./endPoints";

const axios = AxiosInstancePrivate();

export async function getTodaysList() {
  const response = await axios.get(api.todaysList);
  return response?.data;
}
export async function getAllList() {
  const response = await axios.get(api.allTopics);
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
export async function addTopic(id) {
  const response = await axios.post(api.topic(id));
  return response?.data;
}
export async function updateTopic(id) {
  const response = await axios.put(api.topic(id));
  return response?.data;
}
export async function reviseTopic(id) {
  const response = await axios.patch(api.topic(id));
  return response?.data;
}
