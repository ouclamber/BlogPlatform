import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

import usePostsStore from '@/entities/post/model/postsStore';
import Button from '@/shared/ui/Button';
import Loader from '@/shared/ui/Loader';
import EditPostForm from '@/features/post/edit/EditPostForm';

export default function EditPostPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const currentPost = usePostsStore((s) => s.currentPost);
  const fetchPost = usePostsStore((s) => s.fetchPost);
  const clearCurrentPost = usePostsStore((s) => s.clearCurrentPost);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.resolve(fetchPost(slug)).finally(() => active && setLoading(false));
    return () => {
      active = false;
      clearCurrentPost();
    };
  }, [slug, fetchPost, clearCurrentPost]);

  if (loading) return <Loader fullScreen />;

  if (!currentPost) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Пост не найден</h1>
        <Button to="/">На главную</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="group mb-6 inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-primary-600"
      >
        <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Назад
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">Редактировать пост</h1>
        <p className="mt-2 text-sm text-gray-500">
          Slug: <code className="rounded-md bg-primary-50 px-2 py-0.5 text-primary-700">{currentPost.slug}</code>
        </p>
      </div>

      {/* key: при переходе к другому посту форма пересоздаётся с новыми данными */}
      <EditPostForm key={currentPost.id} post={currentPost} />
    </div>
  );
}
