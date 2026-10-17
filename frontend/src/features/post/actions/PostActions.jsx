import { useNavigate } from 'react-router-dom';
import {
  PencilIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import usePostsStore from '@/entities/post/model/postsStore';
import useAuthStore from '@/entities/user/model/authStore';
import Button from '@/shared/ui/Button';

export default function PostActions({ post, variant = 'detail' }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { deletePost, publishPost, archivePost, fetchPost } = usePostsStore();

  const isMyPost = user && post.author?.id === user.id;
  const isAdmin = user?.role === 'admin';
  const canEdit = isMyPost || isAdmin;

  if (!canEdit) return null;

  const handleDelete = async () => {
    if (!confirm('Удалить пост? Это действие нельзя отменить.')) return;
    const result = await deletePost(post.slug);
    if (result.success) {
      toast.success('Пост удалён');
      navigate('/');
    } else {
      toast.error('Ошибка удаления');
    }
  };

  const handlePublish = async () => {
    const result = await publishPost(post.slug);
    if (result.success) {
      toast.success('Пост опубликован');
      if (variant === 'detail') fetchPost(post.slug);
    }
  };

  const handleArchive = async () => {
    const result = await archivePost(post.slug);
    if (result.success) {
      toast.success('Пост архивирован');
      if (variant === 'detail') fetchPost(post.slug);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isMyPost && post.status === 'draft' && (
        <Button size="sm" onClick={handlePublish}>
          <ArrowUpTrayIcon className="w-4 h-4" />
          Опубликовать
        </Button>
      )}

      {isMyPost && post.status === 'published' && (
        <Button size="sm" variant="outline" onClick={handleArchive}>
          <ArchiveBoxIcon className="w-4 h-4" />
          Архивировать
        </Button>
      )}

      <Button to={`/posts/${post.slug}/edit`} size="sm" variant="outline">
        <PencilIcon className="w-4 h-4" />
        Редактировать
      </Button>

      <Button size="sm" variant="danger" onClick={handleDelete}>
        <TrashIcon className="w-4 h-4" />
      </Button>
    </div>
  );
}