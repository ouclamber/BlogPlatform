import { create } from 'zustand';
import { authAPI } from '@/shared/api/endpoints';

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,

  register: async (data) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.register(data);
      set({ isLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        error: error.response?.data || { detail: 'Ошибка регистрации' },
      };
    }
  },

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.login({ username, password });
      const { access, refresh, user } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

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
      return {
        success: false,
        error: error.response?.data || { detail: 'Неверный логин или пароль' },
      };
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  fetchMe: async () => {
    const { isLoading, user } = get();
    // Если уже загружаем или юзер уже есть — не грузим повторно
    if (isLoading || user) return { success: true };

    set({ isLoading: true });
    try {
      const response = await authAPI.me();
      set({ user: response.data, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      get().logout();
      return { success: false };
    }
  },

  updateMe: async (data) => {
    set({ isLoading: true });
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });

      const response = await authAPI.updateMe(formData);
      set({ user: response.data, isLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        error: error.response?.data || { detail: 'Ошибка обновления' },
      };
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
      return {
        success: false,
        error: error.response?.data || { detail: 'Ошибка загрузки' },
      };
    }
  },

  changePassword: async (oldPassword, newPassword) => {
    try {
      const response = await authAPI.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || { detail: 'Ошибка смены пароля' },
      };
    }
  },
}));

export default useAuthStore;