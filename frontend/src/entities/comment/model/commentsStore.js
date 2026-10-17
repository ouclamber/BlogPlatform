import { create } from 'zustand';
import { commentsAPI } from '@/shared/api/endpoints';

// Вспомогательная функция для построения дерева
const buildTree = (flatComments) => {
  const commentMap = {};
  const roots = [];

  // Клонируем объекты, чтобы не мутировать оригинал
  flatComments.forEach((c) => {
    commentMap[c.id] = { ...c, replies: [] };
  });

  flatComments.forEach((c) => {
    if (c.parent && commentMap[c.parent]) {
      commentMap[c.parent].replies.push(commentMap[c.id]);
    } else {
      roots.push(commentMap[c.id]);
    }
  });

  // Сортируем корневые (новые сверху)
  return roots.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

const useCommentsStore = create((set, get) => ({
  comments: [], // Здесь теперь хранится ДЕРЕВО, а не плоский список
  isLoading: false,
  error: null,

  fetchComments: async (postSlug) => {
    set({ isLoading: true, error: null });
    try {
      const response = await commentsAPI.list({ post: postSlug });
      const data = response.data;
      const flatComments = data.results || data;
      
      // Строим дерево при загрузке
      set({
        comments: buildTree(flatComments),
        isLoading: false,
      });
      return { success: true };
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Ошибка загрузки',
      });
      return { success: false };
    }
  },

  createComment: async (data) => {
    try {
      const response = await commentsAPI.create(data);
      const newComment = { ...response.data, replies: [] };
      
      set((state) => {
        // Если это корневой комментарий, добавляем в начало
        if (!newComment.parent) {
          return { comments: [newComment, ...state.comments] };
        }
        
        // Если это ответ, нужно добавить его в replies родителя
        const addReply = (comments) => {
          return comments.map((c) => {
            if (c.id === newComment.parent) {
              return { ...c, replies: [...c.replies, newComment] };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: addReply(c.replies) };
            }
            return c;
          });
        };

        return { comments: addReply(state.comments) };
      });
      
      return { success: true, data: newComment };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || { detail: 'Ошибка' },
      };
    }
  },

  updateComment: async (id, content) => {
    try {
      const response = await commentsAPI.update(id, { content });
      const updatedComment = response.data;

      set((state) => {
        // Рекурсивная функция для обновления комментария на любом уровне
        const updateInTree = (comments) => {
          return comments.map((c) => {
            if (c.id === id) {
              return { 
                ...c, 
                content: updatedComment.content,
                is_edited: updatedComment.is_edited 
              };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateInTree(c.replies) };
            }
            return c;
          });
        };

        return { comments: updateInTree(state.comments) };
      });
      
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  deleteComment: async (id) => {
    try {
      await commentsAPI.delete(id);
      
      set((state) => {
        // Рекурсивная функция для удаления комментария на любом уровне
        const deleteFromTree = (comments) => {
          return comments
            .filter((c) => c.id !== id)
            .map((c) => {
              if (c.replies && c.replies.length > 0) {
                return { ...c, replies: deleteFromTree(c.replies) };
              }
              return c;
            });
        };

        return { comments: deleteFromTree(state.comments) };
      });
      
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  clearComments: () => set({ comments: [] }),
}));

export default useCommentsStore;