const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

const normalizeBasePath = (value) => {
  const basePath = trimTrailingSlash(value || '/');
  if (!basePath || basePath === '/') return '/';
  return basePath.startsWith('/') ? basePath : `/${basePath}`;
};

const resolveDefaultApiOrigin = () => {
  if (import.meta.env.PROD && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:4000';
};

export const APP_BASE_PATH = normalizeBasePath(import.meta.env.VITE_APP_BASE_PATH || '/');
export const API_ORIGIN = trimTrailingSlash(import.meta.env.VITE_API_URL || resolveDefaultApiOrigin());
export const API_BASE_URL = `${API_ORIGIN}/api`;
export const IS_PRODUCTION = import.meta.env.PROD;

export const STORAGE_KEYS = {
  currentUser: 'currentUser',
  authToken: 'authToken',
};

export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEYS.currentUser);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(STORAGE_KEYS.currentUser);
    return null;
  }
};

export const getStoredAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEYS.authToken);
};

export const persistSession = (user, token) => {
  if (typeof window === 'undefined') return;
  if (user) {
    window.localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.currentUser);
  }

  if (token === undefined) return;
  if (token) {
    window.localStorage.setItem(STORAGE_KEYS.authToken, token);
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.authToken);
  }
};

export const clearSession = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEYS.currentUser);
  window.localStorage.removeItem(STORAGE_KEYS.authToken);
};
