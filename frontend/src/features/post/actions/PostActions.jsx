import { useNavigate } from 'react-router-dom';
import { PencilIcon, TrashIcon, ArrowUpTrayIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import usePostsStore from '@/entities/post/model/postsStore';
import useAuthStore from '@/entities/user/model/authStore';
import Button from '@/shared/ui/Button';

export default function PostActions({ post }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const deletePost = usePostsStore((s) => s.deletePost);
  const publishPost = usePostsStore((s) => s.publishPost);
  const archivePost = usePostsStore((s) => s.archivePost);

  const isMyPost = user && post.author?.id === user.id;
  const isAdmin = user?.role === 'admin';

  if (!isMyPost && !isAdmin) return null;

  const handleDelete = async () => {
    if (!window.confirm('Удалить пост? Это действие нельзя отменить.')) return;
    const result = await deletePost(post.slug);
    if (result?.success) {
      toast.success('Пост удалён');
      navigate('/');
    } else {
      toast.error('Ошибка удаления');
    }
  };

  // Ответ publish/archive уже содержит полный пост (стор обновляется им),
  // поэтому повторный fetchPost после действия больше не нужен.
  const handlePublish = async () => {
    const result = await publishPost(post.slug);
    if (result?.success) toast.success('Пост опубликован');
    else toast.error(result?.error?.detail || 'Ошибка публикации');
  };

  const handleArchive = async () => {
    const result = await archivePost(post.slug);
    if (result?.success) toast.success('Пост архивирован');
    else toast.error(result?.error?.detail || 'Ошибка архивации');
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isMyPost && post.status === 'draft' && (
        <Button size="sm" onClick={handlePublish}>
          <ArrowUpTrayIcon className="h-4 w-4" />
          Опубликовать
        </Button>
      )}

      {isMyPost && post.status === 'published' && (
        <Button size="sm" variant="outline" onClick={handleArchive}>
          <ArchiveBoxIcon className="h-4 w-4" />
          Архивировать
        </Button>
      )}

      <Button to={`/posts/${post.slug}/edit`} size="sm" variant="outline">
        <PencilIcon className="h-4 w-4" />
        Редактировать
      </Button>

      <Button size="sm" variant="danger" onClick={handleDelete} aria-label="Удалить пост" title="Удалить пост">
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
