import { MEDIA_URL } from './constants';

/**
 * Превращает путь медиафайла из API в абсолютный URL.
 * Раньше в нескольких компонентах был захардкожен http://127.0.0.1:8000 —
 * в production обложки и аватары просто не загружались.
 */
export function resolveMediaUrl(path) {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const base = MEDIA_URL.replace(/\/+$/, '');
  if (path.startsWith('/media/')) return `${base}${path}`;
  return `${base}/media/${path.replace(/^\/+/, '')}`;
}
