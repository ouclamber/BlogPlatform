import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

import CreatePostForm from '@/features/post/create/CreatePostForm';

export default function CreatePostPage() {
  const navigate = useNavigate();

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

      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">Создать пост</h1>
      <p className="mb-8 text-gray-500">Поделитесь своими мыслями с читателями</p>

      <CreatePostForm />
    </div>
  );
}
