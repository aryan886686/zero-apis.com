import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('apigateway_token');
      if (window.location.pathname !== '/shadowphantomlogin') {
        window.location.href = '/shadowphantomlogin';
      }
    }
    return Promise.reject(error);
  }
);

// =====================
// Auth API
// =====================
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }),
};

// =====================
// Admin - APIs
// =====================
export interface ApiPayload {
  name: string;
  description?: string;
  customEndpoint: string;
  upstreamUrl: string;
  method: string;
  paramName: string;
  optionalHeaders?: Record<string, string>;
  rateLimit?: {
    requestsPerDay?: number;
    requestsPerMinute?: number;
    concurrentRequests?: number;
  };
  caching?: {
    enabled?: boolean;
    ttl?: number;
  };
}

export const apisApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/admin/apis', { params }),
  get: (id: string) => api.get(`/admin/apis/${id}`),
  create: (data: ApiPayload) => api.post('/admin/apis', data),
  update: (id: string, data: Partial<ApiPayload>) => api.put(`/admin/apis/${id}`, data),
  delete: (id: string) => api.delete(`/admin/apis/${id}`),
  clone: (id: string, name?: string) => api.post(`/admin/apis/${id}/clone`, { name }),
  updateStatus: (id: string, status: string) => api.patch(`/admin/apis/${id}/status`, { status }),
};

// =====================
// Admin - API Keys
// =====================
export interface KeyPayload {
  metadata?: { name?: string; description?: string };
  allowedApis?: string[];
  expiresAt?: string;
}

export const keysApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/admin/keys', { params }),
  get: (id: string) => api.get(`/admin/keys/${id}`),
  create: (data: KeyPayload) => api.post('/admin/keys', data),
  updateStatus: (id: string, status: string) => api.patch(`/admin/keys/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/admin/keys/${id}`),
  getUsage: (id: string) => api.get(`/admin/keys/${id}/usage`),
};

// =====================
// Stats
// =====================
export const statsApi = {
  overview: () => api.get('/admin/stats/overview'),
  trend: (days?: number) => api.get('/admin/stats/trend', { params: { days } }),
  topApis: (days?: number, limit?: number) =>
    api.get('/admin/stats/top-apis', { params: { days, limit } }),
  topKeys: (days?: number, limit?: number) =>
    api.get('/admin/stats/top-keys', { params: { days, limit } }),
  logs: (params?: Record<string, any>) => api.get('/admin/stats/logs', { params }),
  responseTimes: (days?: number) =>
    api.get('/admin/stats/response-times', { params: { days } }),
};

// =====================
// Admin - Team / Users (Super Admin only)
// =====================
export interface UserPayload {
  name?: string;
  email: string;
  password?: string;
  role?: 'super_admin' | 'moderator';
}

export const usersApi = {
  list: () => api.get('/admin/users'),
  create: (data: UserPayload) => api.post('/admin/users', data),
  update: (id: string, data: Partial<UserPayload>) => api.patch(`/admin/users/${id}`, data),
  updateStatus: (id: string, status: 'active' | 'suspended') =>
    api.patch(`/admin/users/${id}/status`, { status }),
  forceChangePassword: (id: string, newPassword: string) =>
    api.patch(`/admin/users/${id}/password`, { newPassword }),
  delete: (id: string) => api.delete(`/admin/users/${id}`),
};

// =====================
// Settings (Super Admin configurable)
// =====================
export const settingsApi = {
  get: () => api.get('/admin/settings'),
  update: (data: { loginPath?: string }) => api.put('/admin/settings', data),
  getLoginPath: () => api.get('/settings/login-path'),
};

export default api;
