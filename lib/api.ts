import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

/**
 * Shared Axios instance for all backend API calls.
 * - `withCredentials: true` ensures Better Auth session cookies are sent.
 * - Interceptors attach the active business account header and handle
 *   common error shapes from the edge-backend.
 */
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor: injects the active business account header
 * from local storage if available (set after admin verification).
 */
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const accountId = localStorage.getItem("x-business-account-id");
    if (accountId) {
      config.headers["x-business-account-id"] = accountId;
    }
  }
  return config;
});

/**
 * Response interceptor: normalises backend error shapes into
 * a consistent `{ message, errorCode, status }` structure.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const data = error.response.data;
      const message = data?.message || data?.error || "Something went wrong";
      const errorCode = data?.errorCode || "UNKNOWN_ERROR";
      const status = error.response.status;

      // Redirect to login on 401 (session expired / not authenticated)
      if (status === 401 && typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        if (currentPath !== "/login") {
          window.location.href = "/login";
        }
      }

      return Promise.reject({ message, errorCode, status });
    }

    return Promise.reject({
      message: "Network error. Please check your connection.",
      errorCode: "NETWORK_ERROR",
      status: 0,
    });
  }
);
