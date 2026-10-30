import { create } from 'zustand';
import { authAPI } from '@/shared/api/endpoints';
import { AUTH_LOGOUT_EVENT, tokenStorage } from '@/shared/lib/tokenStorage';

const errorData = (error, fallback) => error?.response?.data || { detail: fallback };

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: tokenStorage.getAccess(),
  refreshToken: tokenStorage.getRefresh(),
  isAuthenticated: !!tokenStorage.getAccess(),
  isLoading: false,

  register: async (data) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.register(data);
      set({ isLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: errorData(error, 'Ошибка регистрации') };
    }
  },

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.login({ username, password });
      const { access, refresh, user } = response.data;

      tokenStorage.set({ access, refresh });

      set({
        user,
        accessToken: access,
        refreshToken: refresh,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: errorData(error, 'Неверный логин или пароль') };
    }
  },

  // Локальная очистка (без запроса) — используется и при принудительном выходе.
  clearSession: () => {
    tokenStorage.clear();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  logout: () => {
    // Раньше выход только чистил localStorage — украденный refresh-токен
    // продолжал работать. Теперь отзываем его на сервере (fire-and-forget).
    const refresh = tokenStorage.getRefresh();
    if (refresh && typeof authAPI.logout === 'function') {
      Promise.resolve()
        .then(() => authAPI.logout(refresh))
        .catch(() => {});
    }
    get().clearSession();
  },

  fetchMe: async ({ force = false } = {}) => {
    const { isLoading, user } = get();
    // Если уже загружаем или юзер уже есть — не грузим повторно
    if (!force && (isLoading || user)) return { success: true };

    set({ isLoading: true });
    try {
      const response = await authAPI.me();
      set({ user: response.data, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      // Разлогиниваем только если сервер явно отверг токен, а не при сетевой ошибке.
      if (error?.response?.status === 401) get().clearSession();
      return { success: false };
    }
  },

  updateMe: async (data) => {
    set({ isLoading: true });
    try {
      const payload = {};
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) payload[key] = value;
      });

      const response = await authAPI.updateMe(payload);
      set({ user: response.data, isLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: errorData(error, 'Ошибка обновления') };
    }
  },

  uploadAvatar: async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await authAPI.uploadAvatar(formData);
      set({ user: response.data });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: errorData(error, 'Ошибка загрузки') };
    }
  },

  changePassword: async (oldPassword, newPassword) => {
    try {
      const response = await authAPI.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      // Сервер отзывает все старые refresh-токены и выдаёт новую пару.
      const { access, refresh } = response.data || {};
      if (access && refresh) {
        tokenStorage.set({ access, refresh });
        set({ accessToken: access, refreshToken: refresh });
      }
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: errorData(error, 'Ошибка смены пароля') };
    }
  },
}));

// Клиент API сигнализирует, что refresh не удался — сбрасываем сессию без перезагрузки.
if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_LOGOUT_EVENT, () => useAuthStore.getState().clearSession());
}

export default useAuthStore;
