import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowUpTrayIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import usePostsStore from '../../entities/post/model/postsStore';
import useAuthStore from '../../entities/user/model/authStore';
import Button from '../../shared/ui/Button';
import Loader from '../../shared/ui/Loader';
import EmptyState from '../../shared/ui/EmptyState';
import Pagination from '../../shared/ui/Pagination';
import {
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
} from '../../shared/lib/constants';
import { timeAgo } from '../../shared/lib/format';

const FILTERS = [
  { key: 'all', label: 'Все', status: null },
  { key: 'published', label: 'Опубликованные', status: 'published' },
  { key: 'draft', label: 'Черновики', status: 'draft' },
  { key: 'archived', label: 'Архив', status: 'archived' },
];

export default function MyPostsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const {
    myPosts,
    myPagination,
    isMyPostsLoading,
    fetchMyPosts,
    deletePost,
    publishPost,
    archivePost,
  } = usePostsStore();

  const [activeFilter, setActiveFilter] = useState('all');

  const currentPage = parseInt(searchParams.get('page') || '1');

  const canCreatePost =
    user?.role === 'author' || user?.role === 'admin';

  // Редирект обычного читателя на главную
  useEffect(() => {
    if (user && user.role === 'reader') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role !== 'reader') {
      fetchMyPosts(currentPage);
    }
  }, [currentPage, fetchMyPosts, user]);

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredPosts = myPosts.filter((post) => {
    if (activeFilter === 'all') return true;
    return post.status === activeFilter;
  });

  const handleDelete = async (slug) => {
    if (!confirm('Удалить пост? Это действие нельзя отменить.')) return;
    const result = await deletePost(slug);
    if (result.success) {
      toast.success('Пост удалён');
    } else {
      toast.error('Ошибка удаления');
    }
  };

  const handlePublish = async (slug) => {
    const result = await publishPost(slug);
    if (result.success) toast.success('Пост опубликован');
    else toast.error('Ошибка');
  };

  const handleArchive = async (slug) => {
    const result = await archivePost(slug);
    if (result.success) toast.success('Пост архивирован');
    else toast.error('Ошибка');
  };

  const getCoverUrl = (post) => {
    if (!post.cover_image) return null;
    if (post.cover_image.startsWith('http')) return post.cover_image;
    if (post.cover_image.startsWith('/media/')) {
      return `http://127.0.0.1:8000${post.cover_image}`;
    }
    return `http://127.0.0.1:8000/media/${post.cover_image}`;
  };

  if (user?.role === 'reader') {
    return null; // редирект уже отработал
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Мои посты</h1>
          <p className="text-gray-500 mt-1">
            Всего: {myPagination.count}
          </p>
        </div>

        {canCreatePost && (
          <Button to="/create">
            <DocumentTextIcon className="w-5 h-5" />
            Создать пост
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === filter.key
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isMyPostsLoading ? (
        <Loader />
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          icon={DocumentTextIcon}
          title={
            activeFilter === 'all'
              ? 'У вас пока нет постов'
              : 'Нет постов в этой категории'
          }
          description={
            activeFilter === 'all'
              ? 'Создайте свой первый пост!'
              : 'Попробуйте другую категорию'
          }
          action={
            activeFilter === 'all' &&
            canCreatePost && <Button to="/create">Создать пост</Button>
          }
        />
      ) : (
        <>
          <div className="space-y-4">
            {filteredPosts.map((post) => {
              const coverUrl = getCoverUrl(post);

              return (
                <article
                  key={post.id}
                  className="card p-4 flex gap-4 hover:shadow-md transition-shadow"
                >
                  {coverUrl ? (
                    <Link
                      to={`/posts/${post.slug}`}
                      className="w-32 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"
                    >
                      <img
                        src={coverUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </Link>
                  ) : (
                    <div className="w-32 h-24 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
                      <DocumentTextIcon className="w-8 h-8 text-primary-600" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`badge ${POST_STATUS_COLORS[post.status]}`}
                      >
                        {POST_STATUS_LABELS[post.status]}
                      </span>
                      {post.category && (
                        <span className="badge bg-gray-100 text-gray-700">
                          {post.category.name}
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/posts/${post.slug}`}
                      className="text-lg font-bold text-gray-900 hover:text-primary-600 line-clamp-1"
                    >
                      {post.title}
                    </Link>

                    {post.excerpt && (
                      <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{timeAgo(post.created_at)}</span>
                      <span className="flex items-center gap-1">
                        <EyeIcon className="w-3.5 h-3.5" />
                        {post.views_count}
                      </span>
                      <span>❤️ {post.likes_count}</span>
                      <span>💬 {post.comments_count}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Link
                      to={`/posts/${post.slug}/edit`}
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                      title="Редактировать"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </Link>

                    {post.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(post.slug)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-green-50 hover:text-green-600 transition-colors"
                        title="Опубликовать"
                      >
                        <ArrowUpTrayIcon className="w-5 h-5" />
                      </button>
                    )}

                    {post.status === 'published' && (
                      <button
                        onClick={() => handleArchive(post.slug)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Архивировать"
                      >
                        <ArchiveBoxIcon className="w-5 h-5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(post.slug)}
                      className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Удалить"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <Pagination
            page={currentPage}
            count={myPagination.count}
            pageSize={myPagination.pageSize}
            onChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}