import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ChatBubbleOvalLeftIcon,
  ClockIcon,
  EyeIcon,
  HeartIcon,
  LinkIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

import usePostsStore from '@/entities/post/model/postsStore';
import useAuthStore from '@/entities/user/model/authStore';
import Avatar from '@/entities/user/ui/Avatar';
import Button from '@/shared/ui/Button';
import Loader from '@/shared/ui/Loader';
import ReadingProgress from '@/shared/ui/ReadingProgress';
import CommentList from '@/widgets/comment-list/CommentList';
import PostActions from '@/features/post/actions/PostActions';
import { POST_STATUS_LABELS, POST_STATUS_COLORS } from '@/shared/lib/constants';
import { formatDate, pluralize } from '@/shared/lib/format';
import { resolveMediaUrl } from '@/shared/lib/media';

function Stat({ icon: Icon, value, label }) {
  return (
    <span className="flex items-center gap-1.5 text-gray-600" title={label}>
      <Icon className="h-5 w-5 text-gray-400" />
      <span className="font-semibold tabular-nums text-gray-900">{value || 0}</span>
      <span className="hidden text-sm sm:inline">{label}</span>
    </span>
  );
}

export default function PostDetailPage() {
  const { slug } = useParams();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentPost = usePostsStore((s) => s.currentPost);
  const isLoading = usePostsStore((s) => s.isLoading);
  const fetchPost = usePostsStore((s) => s.fetchPost);
  const clearCurrentPost = usePostsStore((s) => s.clearCurrentPost);
  const likePost = usePostsStore((s) => s.likePost);
  const unlikePost = usePostsStore((s) => s.unlikePost);
  const [coverFailed, setCoverFailed] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    setCoverFailed(false);
    window.scrollTo({ top: 0 });
    Promise.resolve(fetchPost(slug)).finally(() => active && setReady(true));
    return () => {
      active = false;
      clearCurrentPost();
    };
  }, [slug, fetchPost, clearCurrentPost]);

  // Пока запрос не завершён — лоадер. Раньше на долю секунды мигало «Пост не найден».
  if (!currentPost && (!ready || isLoading)) return <Loader fullScreen />;

  if (!currentPost) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Пост не найден</h1>
        <Button to="/">На главную</Button>
      </div>
    );
  }

  const post = currentPost;
  const isMyPost = user && post.author?.id === user.id;
  const canEdit = isMyPost || user?.role === 'admin';
  const canLike = isAuthenticated && !isMyPost && post.status === 'published';
  const authorUsername = post.author?.username || 'Unknown';
  const coverUrl = !coverFailed ? resolveMediaUrl(post.cover_image) : null;

  const handleLike = () => {
    if (!canLike) return;
    if (!post.is_liked) setPopKey((k) => k + 1);
    if (post.is_liked) unlikePost(post.slug);
    else likePost(post.slug);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Ссылка скопирована');
    } catch {
      toast.error('Не удалось скопировать ссылку');
    }
  };

  return (
    <>
      <ReadingProgress />
      <article className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/"
          className="group mb-6 inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-primary-600"
        >
          <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Назад к постам
        </Link>

        <header className="animate-fade-in-up">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {post.category && (
              <Link
                to={`/?category=${post.category.slug}`}
                className="badge bg-primary-100 py-1 text-primary-700 transition hover:bg-primary-200"
              >
                {post.category.name}
              </Link>
            )}
            {post.status !== 'published' && (
              <span className={`badge py-1 ${POST_STATUS_COLORS[post.status]}`}>
                {POST_STATUS_LABELS[post.status]}
              </span>
            )}
          </div>

          <h1 className="mb-6 text-3xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-5xl">
            {post.title}
          </h1>

          {post.excerpt && <p className="mb-6 text-lg text-gray-500 md:text-xl">{post.excerpt}</p>}

          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-6">
            <Link to={`/profile/${authorUsername}`} className="group flex items-center gap-3">
              <Avatar user={post.author || { username: 'Unknown' }} size="md" ring />
              <div>
                <p className="font-semibold text-gray-900 transition-colors group-hover:text-primary-700">
                  {authorUsername}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <CalendarDaysIcon className="h-3.5 w-3.5" />
                    {formatDate(post.published_at || post.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {post.reading_time || 1} мин
                  </span>
                </div>
              </div>
            </Link>

            {canEdit && <PostActions post={post} variant="detail" />}
          </div>
        </header>

        {coverUrl && (
          <div className="mb-10 animate-fade-in overflow-hidden rounded-3xl bg-gray-100 shadow-glow">
            <img
              src={coverUrl}
              alt={post.title}
              decoding="async"
              className="aspect-video w-full object-cover"
              onError={() => setCoverFailed(true)}
            />
          </div>
        )}

        <div className="prose-content mb-10 animate-fade-in">{post.content}</div>

        {post.tags?.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-2">
            {post.tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/?tag=${tag.slug}`}
                className="badge bg-gray-100 py-1 text-gray-700 transition hover:-translate-y-0.5 hover:bg-primary-100 hover:text-primary-700"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}

        <div className="card mb-12 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={handleLike}
              disabled={!canLike}
              aria-pressed={!!post.is_liked}
              title={!isAuthenticated ? 'Войдите, чтобы ставить лайки' : undefined}
              className={`group flex items-center gap-2 rounded-full px-4 py-2 font-semibold transition-all duration-200 disabled:cursor-not-allowed ${
                post.is_liked
                  ? 'bg-red-50 text-red-500'
                  : 'bg-gray-50 text-gray-600 enabled:hover:bg-red-50 enabled:hover:text-red-500'
              }`}
            >
              {post.is_liked ? (
                <HeartSolidIcon key={popKey} className="h-5 w-5 animate-heart-pop" />
              ) : (
                <HeartIcon className="h-5 w-5 transition-transform group-enabled:group-hover:scale-110" />
              )}
              <span className="tabular-nums">{post.likes_count || 0}</span>
              <span className="hidden text-sm font-normal sm:inline">
                {pluralize(post.likes_count || 0, ['лайк', 'лайка', 'лайков'])}
              </span>
            </button>
            <Stat icon={ChatBubbleOvalLeftIcon} value={post.comments_count} label="комментариев" />
            <Stat icon={EyeIcon} value={post.views_count} label="просмотров" />
          </div>

          <Button variant="ghost" size="sm" onClick={handleCopyLink}>
            <LinkIcon className="h-4 w-4" />
            Поделиться
          </Button>
        </div>

        <CommentList postId={post.id} postSlug={post.slug} />
      </article>
    </>
  );
}
