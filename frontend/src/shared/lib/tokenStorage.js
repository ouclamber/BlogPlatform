// Единая точка работы с токенами: раньше ключи localStorage были разбросаны
// по клиенту и стору, а обновлённый refresh-токен после ротации не сохранялся.
const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key, value) => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* приватный режим / заблокированное хранилище */
  }
};

export const tokenStorage = {
  getAccess: () => safeGet(ACCESS_KEY),
  getRefresh: () => safeGet(REFRESH_KEY),
  set({ access, refresh }) {
    if (access !== undefined) safeSet(ACCESS_KEY, access);
    if (refresh !== undefined) safeSet(REFRESH_KEY, refresh);
  },
  clear() {
    safeSet(ACCESS_KEY, null);
    safeSet(REFRESH_KEY, null);
  },
};

export const AUTH_LOGOUT_EVENT = 'auth:logout';
