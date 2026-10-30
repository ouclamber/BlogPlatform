import { formatDistanceToNow, format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function formatDate(date) {
  if (!date) return '';
  return format(new Date(date), 'dd MMM yyyy', { locale: ru });
}

export function formatDateTime(date) {
  if (!date) return '';
  return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: ru });
}

export function timeAgo(date) {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: ru,
  });
}

export function truncate(text, length = 100) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

export function pluralize(count, forms) {
  const cases = [2, 0, 1, 1, 1, 2];
  return forms[
    count % 100 > 4 && count % 100 < 20
      ? 2
      : cases[count % 10 < 5 ? count % 10 : 5]
  ];
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 Б';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}