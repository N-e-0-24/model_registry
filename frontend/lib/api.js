import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token automatically for browser requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;

export const endpoints = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
  },
  models: {
    list: "/api/models",
    upload: "/api/models/upload",
    get: (id) => `/api/models/${id}`,
    logs: (id) => `/api/models/${id}/logs`,
    download: (id) => `/api/models/download/${id}`,
    rollback: (id) => `/api/models/${id}/rollback`,
    newVersion: (id) => `/api/models/${id}/new-version`,
  },
};
