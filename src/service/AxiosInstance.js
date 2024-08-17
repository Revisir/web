
import axios from "axios";
import { userName, userToken } from "../constants";
import { signOut } from "aws-amplify/auth";
const baseUrl = "http://localhost:5000";

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
        signOut().then(() => {
          window.location.href = "/";
        });
      }
      return Promise.reject(error);
    }
  );
  axiosInstance.interceptors.request.use((config) => {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${sessionStorage.getItem(userToken)}`,
      CurrentDate: new Date().toISOString().slice(0, 10),
    };
    return config;
  });
  
  return axiosInstance;
};
