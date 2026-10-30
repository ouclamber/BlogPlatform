import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowUpTrayIcon,
  ArchiveBoxIcon,
  HeartIcon,
  ChatBubbleOvalLeftIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import usePostsStore from '@/entities/post/model/postsStore';
import useAuthStore from '@/entities/user/model/authStore';
import Button from '@/shared/ui/Button';
import EmptyState from '@/shared/ui/EmptyState';
import Pagination from '@/shared/ui/Pagination';
import { RowSkeleton } from '@/shared/ui/Skeleton';
import { POST_STATUS_LABELS, POST_STATUS_COLORS } from '@/shared/lib/constants';
import { timeAgo } from '@/shared/lib/format';
import { resolveMediaUrl } from '@/shared/lib/media';

const FILTERS = [
  { key: 'all', label: 'Все', status: null },
  { key: 'published', label: 'Опубликованные', status: 'published' },
  { key: 'draft', label: 'Черновики', status: 'draft' },
  { key: 'archived', label: 'Архив', status: 'archived' },
];

const iconBtn = 'rounded-xl p-2 text-gray-500 transition-all duration-200 hover:scale-110';

function MyPostRow({ post, index, onPublish, onArchive, onDelete }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const coverUrl = !coverFailed ? resolveMediaUrl(post.cover_image) : null;

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
      className="card card-hover group flex animate-fade-in-up gap-4 p-4"
    >
      <Link to={`/posts/${post.slug}`} className="h-24 w-32 flex-shrink-0 overflow-hidden rounded-xl">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="bg-grid flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-50">
            <DocumentTextIcon className="h-8 w-8 text-primary-500" />
          </div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`badge ${POST_STATUS_COLORS[post.status]}`}>{POST_STATUS_LABELS[post.status]}</span>
          {post.category && <span className="badge bg-gray-100 text-gray-700">{post.category.name}</span>}
        </div>

        <Link
          to={`/posts/${post.slug}`}
          className="line-clamp-1 text-lg font-bold text-gray-900 transition-colors hover:text-primary-600"
        >
          {post.title}
        </Link>

        {post.excerpt && <p className="mt-1 line-clamp-1 text-sm text-gray-600">{post.excerpt}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span>{timeAgo(post.created_at)}</span>
          <span className="flex items-center gap-1">
            <EyeIcon className="h-3.5 w-3.5" />
            {post.views_count}
          </span>
          <span className="flex items-center gap-1">
            <HeartIcon className="h-3.5 w-3.5" />
            {post.likes_count}
          </span>
          <span className="flex items-center gap-1">
            <ChatBubbleOvalLeftIcon className="h-3.5 w-3.5" />
            {post.comments_count}
          </span>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
        <Link
          to={`/posts/${post.slug}/edit`}
          className={`${iconBtn} hover:bg-primary-50 hover:text-primary-600`}
          title="Редактировать"
          aria-label="Редактировать"
        >
          <PencilIcon className="h-5 w-5" />
        </Link>

        {post.status === 'draft' && (
          <button
            type="button"
            onClick={() => onPublish(post.slug)}
            className={`${iconBtn} hover:bg-green-50 hover:text-green-600`}
            title="Опубликовать"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
          </button>
        )}

        {post.status === 'published' && (
          <button
            type="button"
            onClick={() => onArchive(post.slug)}
            className={`${iconBtn} hover:bg-gray-100 hover:text-gray-700`}
            title="Архивировать"
          >
            <ArchiveBoxIcon className="h-5 w-5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete(post.slug)}
          className={`${iconBtn} hover:bg-red-50 hover:text-red-600`}
          title="Удалить"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
    </article>
  );
}

export default function MyPostsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const myPosts = usePostsStore((s) => s.myPosts);
  const myPagination = usePostsStore((s) => s.myPagination);
  const isMyPostsLoading = usePostsStore((s) => s.isMyPostsLoading);
  const fetchMyPosts = usePostsStore((s) => s.fetchMyPosts);
  const deletePost = usePostsStore((s) => s.deletePost);
  const publishPost = usePostsStore((s) => s.publishPost);
  const archivePost = usePostsStore((s) => s.archivePost);

  const activeFilter = searchParams.get('status') || 'all';
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const activeStatus = FILTERS.find((f) => f.key === activeFilter)?.status || null;
  const canCreatePost = user?.role === 'author' || user?.role === 'admin';

  useEffect(() => {
    if (user && user.role === 'reader') navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role !== 'reader') {
      fetchMyPosts(currentPage, { status: activeStatus });
    }
  }, [currentPage, activeStatus, fetchMyPosts, user]);

  const setFilter = (key) => {
    const params = new URLSearchParams(searchParams);
    if (key === 'all') params.delete('status');
    else params.set('status', key);
    params.delete('page');
    setSearchParams(params);
  };

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Сервер уже фильтрует по статусу; клиентский фильтр — чтобы список
  // не «мигал» старыми данными, пока идёт запрос, и после publish/archive.
  const visiblePosts = activeStatus ? myPosts.filter((p) => p.status === activeStatus) : myPosts;

  const handleDelete = async (slug) => {
    if (!window.confirm('Удалить пост? Это действие нельзя отменить.')) return;
    const result = await deletePost(slug);
    if (result?.success) toast.success('Пост удалён');
    else toast.error('Ошибка удаления');
  };

  const handlePublish = async (slug) => {
    const result = await publishPost(slug);
    if (result?.success) toast.success('Пост опубликован');
    else toast.error(result?.error?.detail || 'Ошибка');
  };

  const handleArchive = async (slug) => {
    const result = await archivePost(slug);
    if (result?.success) toast.success('Пост архивирован');
    else toast.error(result?.error?.detail || 'Ошибка');
  };

  if (user?.role === 'reader') return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Мои посты</h1>
          <p className="mt-1 text-gray-500">Всего: {myPagination.count}</p>
        </div>

        {canCreatePost && (
          <Button to="/create">
            <PlusIcon className="h-5 w-5" />
            Создать пост
          </Button>
        )}
      </div>

      <div className="scrollbar-none mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1 shadow-sm">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setFilter(filter.key)}
            aria-pressed={activeFilter === filter.key}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeFilter === filter.key
                ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isMyPostsLoading ? (
        <div className="space-y-4" role="status" aria-label="Загрузка">
          {[0, 1, 2].map((i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : visiblePosts.length === 0 ? (
        <EmptyState
          icon={DocumentTextIcon}
          title={activeFilter === 'all' ? 'У вас пока нет постов' : 'Нет постов в этой категории'}
          description={activeFilter === 'all' ? 'Создайте свой первый пост!' : 'Попробуйте другую категорию'}
          action={activeFilter === 'all' && canCreatePost && <Button to="/create">Создать пост</Button>}
        />
      ) : (
        <>
          <div className="space-y-4">
            {visiblePosts.map((post, index) => (
              <MyPostRow
                key={post.id}
                post={post}
                index={index}
                onPublish={handlePublish}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
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
