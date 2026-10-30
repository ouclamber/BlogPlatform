import { memo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HeartIcon, ChatBubbleOvalLeftIcon, EyeIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

import Avatar from '@/entities/user/ui/Avatar';
import useAuthStore from '@/entities/user/model/authStore';
import usePostsStore from '@/entities/post/model/postsStore';
import { POST_STATUS_LABELS, POST_STATUS_COLORS } from '@/shared/lib/constants';
import { timeAgo, truncate } from '@/shared/lib/format';
import { resolveMediaUrl } from '@/shared/lib/media';

function PostCard({ post, index = 0 }) {
  const navigate = useNavigate();
  // Селекторы вместо useStore() целиком: раньше ЛЮБОЕ изменение стора
  // (загрузка, фильтры, теги) перерисовывало все карточки, и memo не помогал.
  const userId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const likePost = usePostsStore((s) => s.likePost);
  const unlikePost = usePostsStore((s) => s.unlikePost);
  const [popKey, setPopKey] = useState(0);
  const [coverFailed, setCoverFailed] = useState(false);

  if (!post) return null;

  const isMyPost = userId != null && post.author?.id === userId;
  const authorUsername = post.author?.username || 'Unknown';
  const coverUrl = !coverFailed ? resolveMediaUrl(post.cover_image) : null;
  const canLike = isAuthenticated && !isMyPost;

  const handleCardClick = () => navigate(`/posts/${post.slug}`);

  const handleKeyDown = (e) => {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleCardClick();
    }
  };

  const handleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canLike) return;
    if (!post.is_liked) setPopKey((k) => k + 1);
    if (post.is_liked) unlikePost(post.slug);
    else likePost(post.slug);
  };

  return (
    <article
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="link"
      aria-label={post.title}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className="card card-hover group flex animate-fade-in-up cursor-pointer flex-col"
    >
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary-100 via-primary-50 to-white">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={post.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="bg-grid flex h-full w-full items-center justify-center">
            <PhotoIcon className="h-10 w-10 text-primary-300 transition-transform duration-500 group-hover:scale-110" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-900/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {post.category && (
          <Link
            to={`/?category=${post.category.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="glass absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-primary-700 transition hover:bg-white"
          >
            {post.category.name}
          </Link>
        )}

        {isMyPost && (
          <span className={`badge absolute right-3 top-3 shadow-sm ${POST_STATUS_COLORS[post.status]}`}>
            {POST_STATUS_LABELS[post.status]}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {!post.category && <span className="mb-2 text-xs text-gray-400">Без категории</span>}

        <h2 className="mb-2 line-clamp-2 text-lg font-bold leading-snug text-gray-900 transition-colors group-hover:text-primary-700">
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="mb-4 line-clamp-2 text-sm text-gray-600">{truncate(post.excerpt, 150)}</p>
        )}

        {post.tags?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="badge bg-gray-100 text-gray-600 transition-colors group-hover:bg-primary-50 group-hover:text-primary-700"
              >
                #{tag.name}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="badge bg-gray-100 text-gray-500">+{post.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4">
          <Link
            to={`/profile/${authorUsername}`}
            onClick={(e) => e.stopPropagation()}
            className="flex min-w-0 items-center gap-2 rounded-lg transition hover:opacity-80"
          >
            <Avatar user={post.author} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-gray-900">{authorUsername}</p>
              <p className="text-xs text-gray-500">{timeAgo(post.published_at || post.created_at)}</p>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <button
              type="button"
              onClick={handleLike}
              disabled={!canLike}
              aria-pressed={!!post.is_liked}
              aria-label={post.is_liked ? 'Убрать лайк' : 'Поставить лайк'}
              className={`flex items-center gap-1 rounded-full px-2 py-1 transition-colors ${
                post.is_liked ? 'bg-red-50 text-red-500' : 'hover:bg-red-50 hover:text-red-500'
              } disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500`}
            >
              {post.is_liked ? (
                <HeartSolidIcon key={popKey} className="h-4 w-4 animate-heart-pop" />
              ) : (
                <HeartIcon className="h-4 w-4" />
              )}
              <span className="tabular-nums">{post.likes_count}</span>
            </button>

            <span className="flex items-center gap-1" title="Комментарии">
              <ChatBubbleOvalLeftIcon className="h-4 w-4" />
              <span className="tabular-nums">{post.comments_count}</span>
            </span>

            <span className="flex items-center gap-1" title="Просмотры">
              <EyeIcon className="h-4 w-4" />
              <span className="tabular-nums">{post.views_count}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(PostCard);
