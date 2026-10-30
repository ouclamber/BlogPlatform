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
describe('authStore — безопасность сессии', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authAPI.logout = vi.fn().mockResolvedValue({});
  });

  it('logout отзывает refresh-токен на сервере', async () => {
    localStorage.setItem('access_token', 'a');
    localStorage.setItem('refresh_token', 'r');
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });

    useAuthStore.getState().logout();
    await Promise.resolve();
    await Promise.resolve();

    expect(authAPI.logout).toHaveBeenCalledWith('r');
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('changePassword сохраняет новую пару токенов', async () => {
    authAPI.changePassword.mockResolvedValue({ data: { access: 'new-a', refresh: 'new-r' } });
    await useAuthStore.getState().changePassword('old', 'Another-Strong-9');
    expect(localStorage.getItem('access_token')).toBe('new-a');
    expect(localStorage.getItem('refresh_token')).toBe('new-r');
  });

  it('событие auth:logout от API-клиента сбрасывает сессию', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });
    window.dispatchEvent(new CustomEvent('auth:logout'));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('fetchMe не разлогинивает при сетевой ошибке', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: null, isLoading: false });
    authAPI.me.mockRejectedValue(new Error('Network Error'));
    await useAuthStore.getState().fetchMe();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('fetchMe разлогинивает при 401', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: null, isLoading: false });
    authAPI.me.mockRejectedValue({ response: { status: 401 } });
    await useAuthStore.getState().fetchMe();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('updateMe отправляет JSON без null/undefined полей', async () => {
    authAPI.updateMe.mockResolvedValue({ data: { id: 1 } });
    await useAuthStore.getState().updateMe({ username: 'u', email: null, bio: undefined });
    expect(authAPI.updateMe).toHaveBeenCalledWith({ username: 'u' });
  });
});
