import axios from 'axios';
import toast from 'react-hot-toast';

import { AUTH_LOGOUT_EVENT, tokenStorage } from '@/shared/lib/tokenStorage';

export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh: если одновременно упало N запросов с 401, обновляем
// токен ОДИН раз. Раньше каждый запрос делал свой refresh — при включённой
// ротации второй запрос получал уже отозванный токен и пользователя выкидывало.
let refreshPromise = null;

export function refreshAccessToken() {
  if (!refreshPromise) {
    const refresh = tokenStorage.getRefresh();
    if (!refresh) return Promise.reject(new Error('Нет refresh-токена'));

    refreshPromise = axios
      .post(`${API_URL}/users/refresh/`, { refresh })
      .then(({ data }) => {
        // Бэкенд ротирует refresh-токен — новый обязательно сохраняем.
        tokenStorage.set({ access: data.access, refresh: data.refresh ?? refresh });
        return data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function forceLogout() {
  tokenStorage.clear();
  // Сообщаем стору, а не делаем window.location.href (полная перезагрузка SPA).
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
}

// 400 обрабатывают сами формы (показывают ошибки у полей), 404 — страницы.
const SILENT_STATUSES = new Set([400, 401, 404]);

function errorMessage(error) {
  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? 'Сервер не отвечает. Попробуйте ещё раз.'
      : 'Нет соединения с сервером';
  }
  if (error.response.status === 429) return 'Слишком много запросов. Подождите немного.';
  if (error.response.status >= 500) return 'Ошибка сервера. Мы уже разбираемся.';
  return error.response.data?.detail || 'Произошла ошибка';
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry && tokenStorage.getRefresh()) {
      originalRequest._retry = true;
      try {
        const access = await refreshAccessToken();
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${access}` };
        return apiClient(originalRequest);
      } catch (refreshError) {
        forceLogout();
        return Promise.reject(refreshError);
      }
    }

    if (axios.isCancel(error)) return Promise.reject(error);

    if (!originalRequest.skipErrorToast && !SILENT_STATUSES.has(status)) {
      // id — чтобы одинаковые ошибки нескольких запросов не плодили тосты.
      const message = errorMessage(error);
      toast.error(message, { id: message });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
