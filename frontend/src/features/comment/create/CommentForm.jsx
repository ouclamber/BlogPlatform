import { useState } from 'react';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@/shared/ui/Button';
import Avatar from '@/entities/user/ui/Avatar';
import useAuthStore from '@/entities/user/model/authStore';
import useCommentsStore from '@/entities/comment/model/commentsStore';

const MAX_LENGTH = 5000;

export default function CommentForm({ postId }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const createComment = useCommentsStore((s) => s.createComment);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    const result = await createComment({ post: postId, content: content.trim() });
    setLoading(false);

    if (result?.success) {
      toast.success('Комментарий добавлен');
      setContent('');
    } else {
      toast.error(result?.error?.content?.[0] || 'Ошибка');
    }
  };

  // Ctrl/Cmd + Enter — отправка.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e);
  };

  if (!isAuthenticated) {
    return (
      <div className="card flex flex-col items-center gap-4 bg-gradient-to-br from-primary-50 to-white p-6 text-center sm:flex-row sm:text-left">
        <ChatBubbleLeftRightIcon className="h-10 w-10 flex-shrink-0 text-primary-400" />
        <p className="flex-1 text-gray-600">Войдите, чтобы оставить комментарий</p>
        <Button to="/login">Войти</Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card p-4 transition-shadow duration-200 focus-within:shadow-glow-sm"
    >
      <div className="flex gap-3">
        <Avatar user={user} size="md" />

        <div className="min-w-0 flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Написать комментарий..."
            aria-label="Текст комментария"
            rows={2}
            className="w-full resize-none border-0 bg-transparent px-0 py-1 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-0"
            maxLength={MAX_LENGTH}
          />

          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
            <span className={`text-xs ${content.length > MAX_LENGTH * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
              {content.length}/{MAX_LENGTH}
            </span>
            <Button type="submit" size="sm" loading={loading} disabled={!content.trim() || loading}>
              {!loading && <PaperAirplaneIcon className="h-4 w-4" />}
              Отправить
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
