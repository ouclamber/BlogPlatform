import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

import CreatePostForm from '@/features/post/create/CreatePostForm';

export default function CreatePostPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Назад
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Создать пост</h1>

      <CreatePostForm />
    </div>
  );
}