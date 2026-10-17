export const MEDIA_URL =
  import.meta.env.VITE_MEDIA_URL || 'http://127.0.0.1:8000';

export const DJANGO_ADMIN_URL =
  import.meta.env.VITE_DJANGO_ADMIN_URL || 'http://127.0.0.1:8000/admin/';

export const POST_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export const POST_STATUS_LABELS = {
  draft: 'Черновик',
  published: 'Опубликован',
  archived: 'В архиве',
};

export const POST_STATUS_COLORS = {
  draft: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
};

export const USER_ROLES = {
  READER: 'reader',
  AUTHOR: 'author',
  ADMIN: 'admin',
};

export const USER_ROLE_LABELS = {
  reader: 'Читатель',
  author: 'Автор',
  admin: 'Администратор',
};

export const USER_ROLE_COLORS = {
  reader: 'bg-blue-100 text-blue-800',
  author: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
};