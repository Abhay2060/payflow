import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const token = localStorage.getItem("token");
      if (token) {
        localStorage.removeItem("token");
        localStorage.removeItem("merchant");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login:    (data) => api.post("/auth/login", data),
};

// ── Merchant ──────────────────────────────────────────────────────────────────
export const merchantAPI = {
  getMe:     ()     => api.get("/merchants/me"),
  updateMe:  (data) => api.patch("/merchants/me", data),
  rotateKey: ()     => api.post("/merchants/me/rotate-key"),
};

// ── Stats (JWT) ───────────────────────────────────────────────────────────────
export const statsAPI = {
  get: () => api.get("/merchants/me/stats"),
};

// ── Payment Intents (JWT — dashboard only) ────────────────────────────────────
export const paymentAPI = {
  list: (params) => api.get("/merchants/me/payment-intents", { params }),
  get:  (id)     => api.get(`/merchants/me/payment-intents/${id}`),
};

// ── Transactions (JWT — dashboard only) ──────────────────────────────────────
export const transactionAPI = {
  get: (id) => api.get(`/merchants/me/transactions/${id}`),
};

// ── Webhooks (JWT — dashboard only) ──────────────────────────────────────────
export const webhookAPI = {
  list: (params) => api.get("/merchants/me/webhooks", { params }),
};
