import axios from "axios";

const base = "https://afghan-topup.com/backend1/api/api/";

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


// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     if (error.response?.status === 401) {
//       localStorage.removeItem('access_token');
//       localStorage.removeItem('refresh_token');
//       window.location.href = "/afghan-t/frontend/cms/login";
//     }
//     return Promise.reject(error);
//   }
// );