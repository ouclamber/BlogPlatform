import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import toast from 'react-hot-toast';

import apiClient from './client';
import { AUTH_LOGOUT_EVENT, tokenStorage } from '@/shared/lib/tokenStorage';

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

// Подменяем транспорт axios: ответ определяется функцией handler(config).
let handler;
const originalAdapter = apiClient.defaults.adapter;

const respond = (config, status, data = {}) => {
  const response = { data, status, statusText: String(status), headers: {}, config };
  if (status >= 200 && status < 300) return Promise.resolve(response);
  const error = new Error(`HTTP ${status}`);
  error.config = config;
  error.response = response;
  error.isAxiosError = true;
  return Promise.reject(error);
};

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiClient.defaults.adapter = (config) => handler(config);
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('подставляет Bearer-токен', async () => {
    tokenStorage.set({ access: 'abc' });
    handler = (config) => respond(config, 200, { auth: config.headers.Authorization });
    const { data } = await apiClient.get('/x/');
    expect(data.auth).toBe('Bearer abc');
  });

  it('при параллельных 401 обновляет токен ОДИН раз и сохраняет новый refresh', async () => {
    tokenStorage.set({ access: 'old', refresh: 'refresh-1' });
    const refreshSpy = vi
      .spyOn(axios, 'post')
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { access: 'new', refresh: 'refresh-2' } }), 10))
      );
    handler = (config) =>
      config.headers.Authorization === 'Bearer new' ? respond(config, 200, { ok: true }) : respond(config, 401);

    const results = await Promise.all([apiClient.get('/a/'), apiClient.get('/b/'), apiClient.get('/c/')]);

    expect(results.every((r) => r.data.ok)).toBe(true);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(tokenStorage.getAccess()).toBe('new');
    // Ротированный refresh-токен должен сохраниться (раньше терялся)
    expect(tokenStorage.getRefresh()).toBe('refresh-2');
  });

  it('при неудачном refresh очищает токены и шлёт событие logout без перезагрузки страницы', async () => {
    tokenStorage.set({ access: 'old', refresh: 'bad' });
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('401'));
    handler = (config) => respond(config, 401);
    const listener = vi.fn();
    window.addEventListener(AUTH_LOGOUT_EVENT, listener);

    await expect(apiClient.get('/x/')).rejects.toBeTruthy();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(tokenStorage.getAccess()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();
    window.removeEventListener(AUTH_LOGOUT_EVENT, listener);
  });

  it('не показывает тост для 400 (ошибки показывает форма)', async () => {
    handler = (config) => respond(config, 400, { title: ['Ошибка'] });
    await expect(apiClient.post('/posts/', {})).rejects.toBeTruthy();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('показывает понятный тост для 500 и 429', async () => {
    handler = (config) => respond(config, 500);
    await expect(apiClient.get('/x/')).rejects.toBeTruthy();
    expect(toast.error).toHaveBeenCalledWith('Ошибка сервера. Мы уже разбираемся.', expect.any(Object));

    handler = (config) => respond(config, 429);
    await expect(apiClient.get('/x/')).rejects.toBeTruthy();
    expect(toast.error).toHaveBeenCalledWith('Слишком много запросов. Подождите немного.', expect.any(Object));
  });

  it('skipErrorToast отключает тост', async () => {
    handler = (config) => respond(config, 500);
    await expect(apiClient.get('/x/', { skipErrorToast: true })).rejects.toBeTruthy();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
