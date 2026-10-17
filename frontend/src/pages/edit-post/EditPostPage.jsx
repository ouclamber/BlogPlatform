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
  const { currentPost, fetchPost, clearCurrentPost } = usePostsStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchPost(slug);
      setLoading(false);
    };
    load();
    return () => clearCurrentPost();
  }, [slug, fetchPost, clearCurrentPost]);

  if (loading) return <Loader fullScreen />;

  if (!currentPost) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Пост не найден
        </h1>
        <Button to="/">На главную</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Назад
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Редактировать пост
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Slug:{' '}
          <code className="bg-gray-100 px-2 py-0.5 rounded">
            {currentPost.slug}
          </code>
        </p>
      </div>

      <EditPostForm post={currentPost} />
    </div>
  );
}