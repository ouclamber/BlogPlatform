import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HeartIcon,
  ChatBubbleOvalLeftIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

import Avatar from '@/entities/user/ui/Avatar';
import useAuthStore from '@/entities/user/model/authStore';
import usePostsStore from '@/entities/post/model/postsStore';
import {
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
} from '@/shared/lib/constants';
import { timeAgo, truncate } from '@/shared/lib/format';

function PostCard({ post }) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { likePost, unlikePost } = usePostsStore();
  const [liking, setLiking] = useState(false);

  if (!post) return null;

  const isMyPost = user && post.author?.id === user.id;
  const authorUsername = post.author?.username || 'Unknown';

  const handleCardClick = () => {
    navigate(`/posts/${post.slug}`);
  };

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || liking) return;
    if (post.author?.id === user?.id) return;

    setLiking(true);
    if (post.is_liked) {
      await unlikePost(post.slug);
    } else {
      await likePost(post.slug);
    }
    setLiking(false);
  };

  return (
    <article
      onClick={handleCardClick}
      className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer"
    >
      {post.cover_image && (
        <div className="aspect-video overflow-hidden bg-gray-100">
          <img
            src={post.cover_image}
            alt={post.title}
            loading="lazy"
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          {post.category ? (
            <Link
              to={`/?category=${post.category.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              {post.category.name}
            </Link>
          ) : (
            <span className="text-xs text-gray-400">Без категории</span>
          )}

          {isMyPost && (
            <span className={`badge ${POST_STATUS_COLORS[post.status]}`}>
              {POST_STATUS_LABELS[post.status]}
            </span>
          )}
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 hover:text-primary-600 transition-colors">
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {truncate(post.excerpt, 150)}
          </p>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="badge bg-gray-100 text-gray-700 text-xs"
              >
                #{tag.name}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="badge bg-gray-100 text-gray-500 text-xs">
                +{post.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <Link
            to={`/profile/${authorUsername}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 hover:opacity-80"
          >
            <Avatar user={post.author} size="sm" />
            <div>
              <p className="text-xs font-medium text-gray-900">
                {authorUsername}
              </p>
              <p className="text-xs text-gray-500">
                {timeAgo(post.created_at)}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <button
              onClick={handleLike}
              disabled={
                !isAuthenticated || post.author?.id === user?.id || liking
              }
              className={`flex items-center gap-1 transition-colors ${
                post.is_liked ? 'text-red-500' : 'hover:text-red-500'
              } disabled:cursor-not-allowed`}
            >
              {post.is_liked ? (
                <HeartSolidIcon className="w-4 h-4" />
              ) : (
                <HeartIcon className="w-4 h-4" />
              )}
              {post.likes_count}
            </button>

            <span className="flex items-center gap-1">
              <ChatBubbleOvalLeftIcon className="w-4 h-4" />
              {post.comments_count}
            </span>

            <span className="flex items-center gap-1">
              <EyeIcon className="w-4 h-4" />
              {post.views_count}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default React.memo(PostCard);