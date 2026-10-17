import { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

import usePostsStore from '../../entities/post/model/postsStore';
import useAuthStore from '../../entities/user/model/authStore';
import Avatar from '../../entities/user/ui/Avatar';
import Button from '../../shared/ui/Button';
import Loader from '../../shared/ui/Loader';
import CommentList from '../../widgets/comment-list/CommentList';
import PostActions from '../../features/post/actions/PostActions';
import {
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
} from '../../shared/lib/constants';
import { formatDate } from '../../shared/lib/format';

export default function PostDetailPage() {
  const { slug } = useParams();
  const { user } = useAuthStore();
  const { currentPost, isLoading, fetchPost, clearCurrentPost } =
    usePostsStore();

  // Защита от двойного вызова fetchPost в StrictMode
  const fetchedSlugRef = useRef(null);

  useEffect(() => {
    if (fetchedSlugRef.current === slug) return;
    fetchedSlugRef.current = slug;

    fetchPost(slug);

    return () => {
      fetchedSlugRef.current = null;
      clearCurrentPost();
    };
  }, [slug, fetchPost, clearCurrentPost]);

  if (isLoading) return <Loader fullScreen />;

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

  const post = currentPost;
  const isMyPost = user && post.author?.id === user.id;
  const isAdmin = user?.role === 'admin';
  const canEdit = isMyPost || isAdmin;
  const authorUsername = post.author?.username || 'Unknown';
  const authorData = post.author || { username: 'Unknown' };

  const getCoverUrl = () => {
    if (!post.cover_image) return null;
    if (post.cover_image.startsWith('http')) return post.cover_image;
    return `http://127.0.0.1:8000${post.cover_image}`;
  };

  const coverUrl = getCoverUrl();

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Назад к постам
      </Link>

      {coverUrl && (
        <div className="aspect-video overflow-hidden rounded-xl bg-gray-100 mb-8">
          <img
            src={coverUrl}
            alt={post.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Обложка не загрузилась:', coverUrl);
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {post.category && (
          <Link
            to={`/?category=${post.category.slug}`}
            className="badge bg-primary-100 text-primary-700 hover:bg-primary-200"
          >
            {post.category.name}
          </Link>
        )}

        <span className={`badge ${POST_STATUS_COLORS[post.status]}`}>
          {POST_STATUS_LABELS[post.status]}
        </span>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        {post.title}
      </h1>

      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200 flex-wrap gap-4">
        <Link
          to={`/profile/${authorUsername}`}
          className="flex items-center gap-3 hover:opacity-80"
        >
          <Avatar user={authorData} size="md" />
          <div>
            <p className="font-semibold text-gray-900">{authorUsername}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{formatDate(post.created_at)}</span>
              <span>{post.reading_time || 1} мин</span>
            </div>
          </div>
        </Link>

        {canEdit && <PostActions post={post} variant="detail" />}
      </div>

      <div className="prose prose-lg max-w-none mb-8">
        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
          {post.content}
        </div>
      </div>

      {post.tags && post.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-8 pt-6 border-t border-gray-200">
          <span className="text-sm text-gray-500">Теги:</span>
          {post.tags.map((tag) => (
            <Link
              key={tag.id}
              to={`/?tag=${tag.slug}`}
              className="badge bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center gap-6 py-4 border-y border-gray-200 mb-8">
        <span className="text-gray-600">{post.likes_count || 0} лайков</span>
        <span className="text-gray-600">
          {post.comments_count || 0} комментариев
        </span>
        <span className="text-gray-600">{post.views_count || 0} просмотров</span>
      </div>

      <CommentList postId={post.id} postSlug={post.slug} />
    </article>
  );
}