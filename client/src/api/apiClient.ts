import axios from "axios";
import { Modal } from "antd";
import { readAuth, clearAuth } from "../utils/storage";
import { useUserStore } from "../store/userStore";
const API_URL = import.meta.env.VITE_API_URL;

const apiClient = axios.create({
  baseURL: API_URL || "http://localhost:3000/",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = readAuth().accessToken;
  if (token && !config.url?.includes("auth/login")) {
    if (config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
})

let sessionHandled = false;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || "");
    const isAuthEndpoint = url.includes("auth/login") || url.includes("auth/register") || url.includes("auth/forgot-password") || url.includes("auth/logout");
    const hasToken = !!readAuth().accessToken;
    if (status === 401 && hasToken && !sessionHandled && !isAuthEndpoint) {
      sessionHandled = true;
      try {
        clearAuth();
        try {
          useUserStore.getState().setUser(null);
        } catch {}

        Modal.warning({
          title: "Sesión finalizada",
          content: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
          onOk: () => {
            window.location.replace("/login");
          },
          afterClose: () => {
            if (window.location.pathname !== "/login") {
              window.location.replace("/login");
            }
          },
        });
      } catch {
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
