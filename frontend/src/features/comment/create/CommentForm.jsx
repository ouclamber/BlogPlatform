import { useState } from 'react';
import toast from 'react-hot-toast';

import Button from '../../../shared/ui/Button';
import useAuthStore from '../../../entities/user/model/authStore';
import useCommentsStore from '../../../entities/comment/model/commentsStore';

export default function CommentForm({ postId, postSlug }) {
  const { user, isAuthenticated } = useAuthStore();
  const { createComment } = useCommentsStore();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    const result = await createComment({ post: postId, content: content.trim() });
    setLoading(false);

    if (result.success) {
      toast.success('Комментарий добавлен');
      setContent('');
    } else {
      toast.error('Ошибка');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-600 mb-4">Войдите, чтобы оставить комментарий</p>
        <Button to="/login">Войти</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold">
            {user?.username?.slice(0, 2).toUpperCase() || '??'}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Написать комментарий..."
            rows={2}
            className="w-full px-0 py-1 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-gray-700 placeholder-gray-400"
            maxLength={5000}
          />

          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">{content.length}/5000</span>
            <Button
              type="submit"
              size="sm"
              loading={loading}
              disabled={!content.trim() || loading}
            >
              Отправить
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}