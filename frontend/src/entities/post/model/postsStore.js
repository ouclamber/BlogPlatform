import { create } from 'zustand';
import { postsAPI, tagsAPI, categoriesAPI } from '../../../shared/api/endpoints';

const usePostsStore = create((set, get) => ({
  posts: [],
  currentPost: null,
  myPosts: [],
  tags: [],
  categories: [],
  pagination: {
    count: 0,
    next: null,
    previous: null,
    page: 1,
    pageSize: 10,
  },
  myPagination: {
    count: 0,
    next: null,
    previous: null,
    page: 1,
    pageSize: 10,
  },
  filters: {
    search: '',
    category: '',
    tag: '',
    author: '',
    ordering: '-created_at',
  },
  isLoading: false,
  isMyPostsLoading: false,
  isTagsLoading: false,
  isCategoriesLoading: false,
  error: null,

  fetchPosts: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const { filters } = get();

      const params = { page };
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.tag) params.tag = filters.tag;
      if (filters.author) params.author = filters.author;
      if (filters.ordering) params.ordering = filters.ordering;

      const response = await postsAPI.list(params);
      const data = response.data;

      set({
        posts: data.results || data,
        pagination: {
          count: data.count || 0,
          next: data.next,
          previous: data.previous,
          page,
          pageSize: 10,
        },
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Ошибка загрузки',
      });
      return { success: false, error };
    }
  },

  fetchPost: async (slug) => {
    set({ isLoading: true, error: null });
    try {
      const response = await postsAPI.detail(slug);
      set({ currentPost: response.data, isLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Пост не найден',
      });
      return { success: false, error };
    }
  },

  fetchMyPosts: async (page = 1) => {
    set({ isMyPostsLoading: true, error: null });
    try {
      const response = await postsAPI.myPosts({ page });
      const data = response.data;

      set({
        myPosts: data.results || data,
        myPagination: {
          count: data.count || 0,
          next: data.next,
          previous: data.previous,
          page,
          pageSize: 10,
        },
        isMyPostsLoading: false,
      });

      return { success: true };
    } catch (error) {
      set({
        isMyPostsLoading: false,
        error: error.response?.data?.detail || 'Ошибка загрузки',
      });
      return { success: false, error };
    }
  },

  createPost: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const isFormData = data instanceof FormData;
      const config = isFormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : {};

      const response = await postsAPI.create(data, config);

      set((state) => ({
        posts: [response.data, ...state.posts],
        isLoading: false,
      }));

      return { success: true, data: response.data };
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data || { detail: 'Ошибка создания' },
      });
      return {
        success: false,
        error: error.response?.data || { detail: 'Ошибка создания' },
      };
    }
  },

  updatePost: async (slug, data) => {
    set({ isLoading: true, error: null });
    try {
      const isFormData = data instanceof FormData;
      const config = isFormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : {};

      const response = await postsAPI.update(slug, data, config);

      set((state) => ({
        posts: state.posts.map((p) =>
          p.slug === slug ? response.data : p
        ),
        myPosts: state.myPosts.map((p) =>
          p.slug === slug ? response.data : p
        ),
        currentPost: response.data,
        isLoading: false,
      }));

      return { success: true, data: response.data };
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data || { detail: 'Ошибка обновления' },
      });
      return {
        success: false,
        error: error.response?.data || { detail: 'Ошибка обновления' },
      };
    }
  },

  deletePost: async (slug) => {
    try {
      await postsAPI.delete(slug);
      set((state) => ({
        posts: state.posts.filter((p) => p.slug !== slug),
        myPosts: state.myPosts.filter((p) => p.slug !== slug),
        currentPost: null,
      }));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || { detail: 'Ошибка удаления' },
      };
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  resetFilters: () => {
    set({
      filters: {
        search: '',
        category: '',
        tag: '',
        author: '',
        ordering: '-created_at',
      },
    });
  },

  likePost: async (slug) => {
    try {
      await postsAPI.like(slug);
      set((state) => ({
        posts: state.posts.map((p) =>
          p.slug === slug
            ? { ...p, is_liked: true, likes_count: p.likes_count + 1 }
            : p
        ),
        myPosts: state.myPosts.map((p) =>
          p.slug === slug
            ? { ...p, is_liked: true, likes_count: p.likes_count + 1 }
            : p
        ),
        currentPost:
          state.currentPost?.slug === slug
            ? {
                ...state.currentPost,
                is_liked: true,
                likes_count: state.currentPost.likes_count + 1,
              }
            : state.currentPost,
      }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  unlikePost: async (slug) => {
    try {
      await postsAPI.unlike(slug);
      set((state) => ({
        posts: state.posts.map((p) =>
          p.slug === slug
            ? {
                ...p,
                is_liked: false,
                likes_count: Math.max(0, p.likes_count - 1),
              }
            : p
        ),
        myPosts: state.myPosts.map((p) =>
          p.slug === slug
            ? {
                ...p,
                is_liked: false,
                likes_count: Math.max(0, p.likes_count - 1),
              }
            : p
        ),
        currentPost:
          state.currentPost?.slug === slug
            ? {
                ...state.currentPost,
                is_liked: false,
                likes_count: Math.max(
                  0,
                  state.currentPost.likes_count - 1
                ),
              }
            : state.currentPost,
      }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  publishPost: async (slug) => {
    try {
      const response = await postsAPI.publish(slug);
      set((state) => ({
        posts: state.posts.map((p) =>
          p.slug === slug ? response.data : p
        ),
        myPosts: state.myPosts.map((p) =>
          p.slug === slug ? response.data : p
        ),
        currentPost: response.data,
      }));
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || { detail: 'Ошибка публикации' },
      };
    }
  },

  archivePost: async (slug) => {
    try {
      const response = await postsAPI.archive(slug);
      set((state) => ({
        posts: state.posts.map((p) =>
          p.slug === slug ? response.data : p
        ),
        myPosts: state.myPosts.map((p) =>
          p.slug === slug ? response.data : p
        ),
        currentPost: response.data,
      }));
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || { detail: 'Ошибка архивации' },
      };
    }
  },

  fetchTags: async () => {
    set({ isTagsLoading: true });
    try {
      const response = await tagsAPI.list();
      set({
        tags: response.data.results || response.data,
        isTagsLoading: false,
      });
      return { success: true };
    } catch (error) {
      set({ isTagsLoading: false });
      return { success: false };
    }
  },

  createTag: async (name) => {
    try {
      const response = await tagsAPI.create({ name });
      set((state) => ({
        tags: [...state.tags, response.data],
      }));
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data };
    }
  },

  fetchCategories: async () => {
    set({ isCategoriesLoading: true });
    try {
      const response = await categoriesAPI.list();
      set({
        categories: response.data.results || response.data,
        isCategoriesLoading: false,
      });
      return { success: true };
    } catch (error) {
      set({ isCategoriesLoading: false });
      return { success: false };
    }
  },

  clearCurrentPost: () => set({ currentPost: null }),

  clearAll: () =>
    set({
      posts: [],
      currentPost: null,
      myPosts: [],
      error: null,
    }),
}));

export default usePostsStore;