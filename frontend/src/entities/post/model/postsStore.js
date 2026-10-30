import { create } from 'zustand';
import { postsAPI, tagsAPI, categoriesAPI } from '@/shared/api/endpoints';

const PAGE_SIZE = 10;
const DICTIONARY_TTL_MS = 5 * 60 * 1000;

const DEFAULT_FILTERS = {
  search: '',
  category: '',
  tag: '',
  author: '',
  ordering: '-created_at',
};

const errorData = (error, fallback) => error?.response?.data || { detail: fallback };

// Применяет изменение ко всем местам, где может лежать пост (лента, мои посты, открытый пост).
const patchEverywhere = (state, slug, patch) => {
  const apply = (post) => (post?.slug === slug ? { ...post, ...patch(post) } : post);
  return {
    posts: state.posts.map(apply),
    myPosts: state.myPosts.map(apply),
    currentPost: apply(state.currentPost),
  };
};

const replaceEverywhere = (state, slug, next) => ({
  posts: state.posts.map((p) => (p.slug === slug ? next : p)),
  myPosts: state.myPosts.map((p) => (p.slug === slug ? next : p)),
  currentPost: next,
});

// Счётчики запросов: ответ на устаревший запрос (пользователь уже сменил
// фильтр/страницу) не должен перезаписать свежие данные.
let postsRequestId = 0;
let myPostsRequestId = 0;
let postRequestId = 0;
const pendingLikes = new Set();

const usePostsStore = create((set, get) => ({
  posts: [],
  currentPost: null,
  myPosts: [],
  tags: [],
  categories: [],
  tagsLoadedAt: 0,
  categoriesLoadedAt: 0,
  pagination: { count: 0, next: null, previous: null, page: 1, pageSize: PAGE_SIZE },
  myPagination: { count: 0, next: null, previous: null, page: 1, pageSize: PAGE_SIZE },
  filters: { ...DEFAULT_FILTERS },
  isLoading: false,
  isMyPostsLoading: false,
  isTagsLoading: false,
  isCategoriesLoading: false,
  error: null,

  fetchPosts: async (page = 1) => {
    const requestId = ++postsRequestId;
    set({ isLoading: true, error: null });
    try {
      const { filters } = get();
      const params = { page };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });

      const { data } = await postsAPI.list(params);
      if (requestId !== postsRequestId) return { success: true, stale: true };

      set({
        posts: data.results || data,
        pagination: {
          count: data.count || 0,
          next: data.next,
          previous: data.previous,
          page,
          pageSize: PAGE_SIZE,
        },
        isLoading: false,
      });
      return { success: true };
    } catch (error) {
      if (requestId !== postsRequestId) return { success: false, stale: true };
      set({ isLoading: false, error: error.response?.data?.detail || 'Ошибка загрузки' });
      return { success: false, error };
    }
  },

  fetchPost: async (slug) => {
    const requestId = ++postRequestId;
    set({ isLoading: true, error: null });
    try {
      const response = await postsAPI.detail(slug);
      if (requestId !== postRequestId) return { success: true, stale: true };
      set({ currentPost: response.data, isLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      if (requestId !== postRequestId) return { success: false, stale: true };
      set({
        isLoading: false,
        currentPost: null,
        error: error.response?.data?.detail || 'Пост не найден',
      });
      return { success: false, error };
    }
  },

  fetchMyPosts: async (page = 1, { status } = {}) => {
    const requestId = ++myPostsRequestId;
    set({ isMyPostsLoading: true, error: null });
    try {
      const params = { page };
      // Фильтр по статусу теперь на сервере: раньше фильтровалась только
      // текущая страница, и черновики со 2-й страницы «пропадали».
      if (status) params.status = status;
      const { data } = await postsAPI.myPosts(params);
      if (requestId !== myPostsRequestId) return { success: true, stale: true };

      set({
        myPosts: data.results || data,
        myPagination: {
          count: data.count || 0,
          next: data.next,
          previous: data.previous,
          page,
          pageSize: PAGE_SIZE,
        },
        isMyPostsLoading: false,
      });
      return { success: true };
    } catch (error) {
      if (requestId !== myPostsRequestId) return { success: false, stale: true };
      set({ isMyPostsLoading: false, error: error.response?.data?.detail || 'Ошибка загрузки' });
      return { success: false, error };
    }
  },

  createPost: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await postsAPI.create(data);
      set((state) => ({ posts: [response.data, ...state.posts], isLoading: false }));
      return { success: true, data: response.data };
    } catch (error) {
      const err = errorData(error, 'Ошибка создания');
      set({ isLoading: false, error: err });
      return { success: false, error: err };
    }
  },

  updatePost: async (slug, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await postsAPI.update(slug, data);
      set((state) => ({ ...replaceEverywhere(state, slug, response.data), isLoading: false }));
      return { success: true, data: response.data };
    } catch (error) {
      const err = errorData(error, 'Ошибка обновления');
      set({ isLoading: false, error: err });
      return { success: false, error: err };
    }
  },

  deletePost: async (slug) => {
    try {
      await postsAPI.delete(slug);
      set((state) => ({
        posts: state.posts.filter((p) => p.slug !== slug),
        myPosts: state.myPosts.filter((p) => p.slug !== slug),
        currentPost: state.currentPost?.slug === slug ? null : state.currentPost,
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: errorData(error, 'Ошибка удаления') };
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({ filters: { ...state.filters, ...newFilters } }));
  },

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  // Оптимистичный лайк: интерфейс реагирует мгновенно, при ошибке — откат.
  toggleLike: async (slug, like) => {
    if (pendingLikes.has(slug)) return { success: false, pending: true };
    pendingLikes.add(slug);

    const delta = like ? 1 : -1;
    set((state) =>
      patchEverywhere(state, slug, (p) => ({
        is_liked: like,
        likes_count: Math.max(0, (p.likes_count || 0) + delta),
      }))
    );

    try {
      await (like ? postsAPI.like(slug) : postsAPI.unlike(slug));
      return { success: true };
    } catch (error) {
      set((state) =>
        patchEverywhere(state, slug, (p) => ({
          is_liked: !like,
          likes_count: Math.max(0, (p.likes_count || 0) - delta),
        }))
      );
      return { success: false, error };
    } finally {
      pendingLikes.delete(slug);
    }
  },

  likePost: (slug) => get().toggleLike(slug, true),
  unlikePost: (slug) => get().toggleLike(slug, false),

  publishPost: async (slug) => {
    try {
      const response = await postsAPI.publish(slug);
      set((state) => replaceEverywhere(state, slug, response.data));
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: errorData(error, 'Ошибка публикации') };
    }
  },

  archivePost: async (slug) => {
    try {
      const response = await postsAPI.archive(slug);
      set((state) => replaceEverywhere(state, slug, response.data));
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: errorData(error, 'Ошибка архивации') };
    }
  },

  // Справочники кешируются: раньше теги/категории запрашивались заново
  // на каждой странице и в каждой форме.
  fetchTags: async ({ force = false } = {}) => {
    const { tagsLoadedAt, isTagsLoading } = get();
    if (!force && (isTagsLoading || Date.now() - tagsLoadedAt < DICTIONARY_TTL_MS)) {
      return { success: true, cached: true };
    }
    set({ isTagsLoading: true });
    try {
      const response = await tagsAPI.list();
      set({
        tags: response.data.results || response.data,
        tagsLoadedAt: Date.now(),
        isTagsLoading: false,
      });
      return { success: true };
    } catch {
      set({ isTagsLoading: false });
      return { success: false };
    }
  },

  createTag: async (name) => {
    try {
      const response = await tagsAPI.create({ name });
      set((state) => ({ tags: [...state.tags, response.data] }));
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data };
    }
  },

  fetchCategories: async ({ force = false } = {}) => {
    const { categoriesLoadedAt, isCategoriesLoading } = get();
    if (!force && (isCategoriesLoading || Date.now() - categoriesLoadedAt < DICTIONARY_TTL_MS)) {
      return { success: true, cached: true };
    }
    set({ isCategoriesLoading: true });
    try {
      const response = await categoriesAPI.list();
      set({
        categories: response.data.results || response.data,
        categoriesLoadedAt: Date.now(),
        isCategoriesLoading: false,
      });
      return { success: true };
    } catch {
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
