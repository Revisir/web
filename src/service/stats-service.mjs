import { AxiosInstancePrivate } from "./AxiosInstance.mjs";
import { api } from "./endPoints.mjs";

const axios = AxiosInstancePrivate();
export async function getMainStats() {
  const response = await axios.get(api.statistics);
  return response?.data;
}
