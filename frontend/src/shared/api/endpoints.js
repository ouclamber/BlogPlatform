import apiClient from './client';

export const authAPI = {
  register: (data) => apiClient.post('/users/register/', data),
  login: (data) => apiClient.post('/users/login/', data),
  me: () => apiClient.get('/users/me/'),
  updateMe: (data) => apiClient.patch('/users/me/', data),
  uploadAvatar: (formData) => apiClient.patch('/users/me/avatar/', formData),
  changePassword: (data) => apiClient.patch('/users/me/change-password/', data),
  toggleSubscription: (userId) => apiClient.post(`/users/subscriptions/${userId}/toggle/`),
  getUserProfile: (username) => apiClient.get(`/users/users/${username}/`),
};

export const postsAPI = {
  list: (params) => apiClient.get('/posts/', { params }),
  detail: (slug) => apiClient.get(`/posts/${slug}/`),
  create: (data) => apiClient.post('/posts/', data),
  update: (slug, data) => apiClient.patch(`/posts/${slug}/`, data),
  delete: (slug) => apiClient.delete(`/posts/${slug}/`),
  like: (slug) => apiClient.post(`/posts/${slug}/like/`),
  unlike: (slug) => apiClient.post(`/posts/${slug}/unlike/`),
  myPosts: (params) => apiClient.get('/posts/my_posts/', { params }),
  publish: (slug) => apiClient.post(`/posts/${slug}/publish/`),
  archive: (slug) => apiClient.post(`/posts/${slug}/archive/`),
};

export const commentsAPI = {
  list: (params) => apiClient.get('/comments/', { params }),
  create: (data) => apiClient.post('/comments/', data),
  update: (id, data) => apiClient.patch(`/comments/${id}/`, data),
  delete: (id) => apiClient.delete(`/comments/${id}/`),
};

export const tagsAPI = {
  list: () => apiClient.get('/tags/'),
  create: (data) => apiClient.post('/tags/', data),
  detail: (slug) => apiClient.get(`/tags/${slug}/`),
};

export const categoriesAPI = {
  list: () => apiClient.get('/categories/'),
  detail: (slug) => apiClient.get(`/categories/${slug}/`),
};