import axios from "axios";

const backendUrl =
  process.env.REACT_APP_BACKEND_URL ||
  (window.location.hostname === "localhost" ? "http://localhost:8000" : window.location.origin);

const api = axios.create({
  baseURL: `${backendUrl.replace(/\/$/, "")}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nexcrm_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("nexcrm_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
