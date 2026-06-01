import axios from "axios";
import { userName, userToken } from "../constants.mjs";
import { DateTime } from "luxon";
import { signOutRedirect } from "../utils.mjs";
import { getConfig } from "../config.mjs";
const baseUrl = getConfig("BACKEND_URL");

export const AxiosInstancePrivate = () => {
  const axiosInstance = new axios.create({
    baseURL: baseUrl,
  });
  axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response && error.response.status === 401) {
        sessionStorage.removeItem(userToken);
        sessionStorage.removeItem(userName);
        signOutRedirect();
      }
      return Promise.reject(error);
    },
  );
  axiosInstance.interceptors.request.use((config) => {
    const zone = DateTime.now().zoneName;
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${sessionStorage.getItem(userToken)}`,
      "X-Local-TimeZone": zone,
    };
    return config;
  });
  return axiosInstance;
};
