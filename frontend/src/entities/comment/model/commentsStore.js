import { create } from 'zustand';
import { commentsAPI } from '@/shared/api/endpoints';

const PAGE_SIZE = 200;
const MAX_PAGES = 20; // предохранитель от бесконечного цикла по `next`

const byDateAsc = (a, b) => new Date(a.created_at) - new Date(b.created_at);
const byDateDesc = (a, b) => -byDateAsc(a, b);

// Строит дерево из плоского списка за O(n).
export const buildTree = (flatComments) => {
  const commentMap = new Map();
  const roots = [];

  flatComments.forEach((c) => commentMap.set(c.id, { ...c, replies: [] }));

  flatComments.forEach((c) => {
    const node = commentMap.get(c.id);
    const parent = c.parent != null ? commentMap.get(c.parent) : null;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  });

  // Ответы — в хронологическом порядке, корневые — новые сверху.
  commentMap.forEach((node) => node.replies.sort(byDateAsc));
  return roots.sort(byDateDesc);
};

export const countTree = (comments) =>
  comments.reduce((total, c) => total + 1 + countTree(c.replies || []), 0);

const mapTree = (comments, fn) =>
  comments.map((c) => {
    const next = fn(c);
    return next.replies?.length ? { ...next, replies: mapTree(next.replies, fn) } : next;
  });

const removeFromTree = (comments, id) =>
  comments
    .filter((c) => c.id !== id)
    .map((c) => (c.replies?.length ? { ...c, replies: removeFromTree(c.replies, id) } : c));

let requestId = 0;

const useCommentsStore = create((set) => ({
  comments: [], // дерево, а не плоский список
  total: 0,
  isLoading: false,
  error: null,

  fetchComments: async (postSlug) => {
    const current = ++requestId;
    set({ isLoading: true, error: null });
    try {
      // Раньше читалась только первая страница (10 шт.) — остальные комментарии терялись.
      const params = { post: postSlug, page_size: PAGE_SIZE };
      let { data } = await commentsAPI.list(params);
      const flat = [...(data.results || data)];

      // Номер страницы вместо абсолютного URL из `next`: за прокси он может
      // прийти с http:// и упасть на mixed content.
      for (let page = 2; data.next && page <= MAX_PAGES; page += 1) {
        ({ data } = await commentsAPI.list({ ...params, page }));
        flat.push(...(data.results || []));
      }

      if (current !== requestId) return { success: true, stale: true };
      set({ comments: buildTree(flat), total: flat.length, isLoading: false });
      return { success: true };
    } catch (error) {
      if (current !== requestId) return { success: false, stale: true };
      set({ isLoading: false, error: error.response?.data?.detail || 'Ошибка загрузки' });
      return { success: false };
    }
  },

  createComment: async (data) => {
    try {
      const response = await commentsAPI.create(data);
      const newComment = { ...response.data, replies: [] };

      set((state) => {
        if (!newComment.parent) {
          return { comments: [newComment, ...state.comments], total: state.total + 1 };
        }
        return {
          comments: mapTree(state.comments, (c) =>
            c.id === newComment.parent ? { ...c, replies: [...(c.replies || []), newComment] } : c
          ),
          total: state.total + 1,
        };
      });

      return { success: true, data: newComment };
    } catch (error) {
      return { success: false, error: error.response?.data || { detail: 'Ошибка' } };
    }
  },

  updateComment: async (id, content) => {
    try {
      const { data } = await commentsAPI.update(id, { content });
      set((state) => ({
        comments: mapTree(state.comments, (c) =>
          c.id === id ? { ...c, content: data.content, is_edited: data.is_edited } : c
        ),
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data };
    }
  },

  deleteComment: async (id) => {
    try {
      await commentsAPI.delete(id);
      set((state) => {
        const comments = removeFromTree(state.comments, id);
        return { comments, total: countTree(comments) };
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data };
    }
  },

  clearComments: () => set({ comments: [], total: 0 }),
}));

export default useCommentsStore;
