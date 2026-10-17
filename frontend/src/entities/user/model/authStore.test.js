import { describe, it, expect, beforeEach, vi } from 'vitest';
import useAuthStore from './authStore';
import { authAPI } from '@/shared/api/endpoints';

vi.mock('@/shared/api/endpoints', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    updateMe: vi.fn(),
    uploadAvatar: vi.fn(),
    changePassword: vi.fn(),
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('начальное состояние: не авторизован', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('login сохраняет токены и пользователя', async () => {
    authAPI.login.mockResolvedValue({
      data: {
        access: 'access-token',
        refresh: 'refresh-token',
        user: { id: 1, username: 'test' },
      },
    });

    const result = await useAuthStore.getState().login('test', 'password');

    expect(result.success).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(localStorage.getItem('access_token')).toBe('access-token');
  });

  it('logout очищает данные', () => {
    useAuthStore.setState({
      user: { username: 'test' },
      accessToken: 'token',
      isAuthenticated: true,
    });
    localStorage.setItem('access_token', 'token');

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('fetchMe загружает пользователя и не дублирует запросы', async () => {
    authAPI.me.mockResolvedValue({ data: { id: 1, username: 'user' } });

    const result = await useAuthStore.getState().fetchMe();
    expect(result.success).toBe(true);
    expect(useAuthStore.getState().user.username).toBe('user');

    await useAuthStore.getState().fetchMe();
    expect(authAPI.me).toHaveBeenCalledTimes(1);
  });

  it('updateMe обновляет профиль', async () => {
    authAPI.updateMe.mockResolvedValue({ data: { id: 1, username: 'updated' } });

    const result = await useAuthStore.getState().updateMe({ username: 'updated' });
    expect(result.success).toBe(true);
    expect(useAuthStore.getState().user.username).toBe('updated');
  });

  it('register сохраняет данные при успехе', async () => {
    authAPI.register.mockResolvedValue({ data: { id: 1 } });
    
    const result = await useAuthStore.getState().register({ username: 'test' });
    
    expect(result.success).toBe(true);
  });

  it('register возвращает ошибку при неудаче', async () => {
    authAPI.register.mockRejectedValue({
      response: { data: { username: ['Уже существует'] } },
    });
    
    const result = await useAuthStore.getState().register({ username: 'test' });
    
    expect(result.success).toBe(false);
    expect(result.error.username).toBeDefined();
  });

  it('uploadAvatar обновляет пользователя', async () => {
    authAPI.uploadAvatar.mockResolvedValue({ data: { id: 1, avatar: 'new.jpg' } });
    
    const result = await useAuthStore.getState().uploadAvatar(new File([], 'test.jpg'));
    
    expect(result.success).toBe(true);
    expect(useAuthStore.getState().user.avatar).toBe('new.jpg');
  });

  it('changePassword возвращает успех', async () => {
    authAPI.changePassword.mockResolvedValue({ data: { detail: 'OK' } });
    
    const result = await useAuthStore.getState().changePassword('old', 'new');
    
    expect(result.success).toBe(true);
  });
});