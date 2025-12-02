import axios from "axios";
import axiosRetry from "axios-retry";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  withCredentials: true,
});

// Attach token automatically if stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add retry logic
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  shouldResetTimeout: true,
  retryCondition: (error) => {
    if (axiosRetry.isNetworkOrIdempotentRequestError(error)) {
      return true;
    }
    if (error.response && error.response.status >= 500) {
      return true;
    }
    return false;
  },
});

export default api;