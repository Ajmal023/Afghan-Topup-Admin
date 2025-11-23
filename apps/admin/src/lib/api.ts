
import axios from "axios";
import type { AxiosRequestConfig, AxiosResponse } from "axios";

const base = "https://afghan-topup.com/admin/public/api";
// const base = "http://3.67.144.22/backendtop/api/";
// const base = import.meta.env.VITE_API_BASE ?? "/backend";

export const api = axios.create({
  baseURL: base,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  console.log("🔐 Adding token to request:", token ? "YES" : "NO");
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

export const apiClient = {
  get: (url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse> =>
    api.get(url, config),

  post: (
    url: string,
    data: any,
    config: AxiosRequestConfig = {}
  ): Promise<AxiosResponse> => {
    const headers = data instanceof FormData
      ? { "Content-Type": "multipart/form-data" }
      : { "Content-Type": "application/json" };

    return api.post(url, data, {
      ...config,
      headers: {
        ...headers,
        ...(config.headers || {}),
      },
    });
  },

  put: (
    url: string,
    data: any,
    config: AxiosRequestConfig = {}
  ): Promise<AxiosResponse> => {
    const headers = data instanceof FormData
      ? { "Content-Type": "multipart/form-data" }
      : { "Content-Type": "application/json" };

    return api.put(url, data, {
      ...config,
      headers: {
        ...headers,
        ...(config.headers || {}),
      },
    });
  },

  delete: (url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse> =>
    api.delete(url, config),

  patch: (
    url: string,
    data: any,
    config: AxiosRequestConfig = {}
  ): Promise<AxiosResponse> => api.patch(url, data, config),
};
