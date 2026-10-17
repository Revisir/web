import { AxiosInstancePrivate } from "./AxiosInstance.mjs";
import { api } from "./endPoints.mjs";

const axios = AxiosInstancePrivate();

export async function getApiKeys() {
  const response = await axios.get(api.apiKeys);
  return response?.data?.apiKeys;
}

// The response holds the plaintext key, returned only this once. Do not log it.
export async function createApiKey(data) {
  const response = await axios.post(api.apiKeys, data, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response?.data;
}

export async function revokeApiKey(id) {
  const response = await axios.delete(api.apiKey(id));
  return response?.data;
}
