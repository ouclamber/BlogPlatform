import { useEffect } from 'react';
import { ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/24/outline';

import useCommentsStore, { countTree } from '@/entities/comment/model/commentsStore';
import CommentItem from './CommentItem';
import CommentForm from '@/features/comment/create/CommentForm';
import EmptyState from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';

function CommentsSkeleton() {
  return (
    <div className="space-y-4" aria-label="Загрузка комментариев">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CommentList({ postId, postSlug }) {
  const comments = useCommentsStore((s) => s.comments);
  const isLoading = useCommentsStore((s) => s.isLoading);
  const fetchComments = useCommentsStore((s) => s.fetchComments);

  useEffect(() => {
    if (postId) fetchComments(postSlug);
  }, [postId, postSlug, fetchComments]);

  // Раньше в заголовке выводилось число только корневых комментариев.
  const total = countTree(comments);

  return (
    <section className="space-y-6" aria-labelledby="comments-title">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6" />
        </span>
        <h2 id="comments-title" className="text-xl font-bold text-gray-900">
          Комментарии <span className="text-gray-400">({total})</span>
        </h2>
      </div>

      <CommentForm postId={postId} postSlug={postSlug} />

      {isLoading ? (
        <CommentsSkeleton />
      ) : comments.length === 0 ? (
        <EmptyState
          icon={ChatBubbleOvalLeftEllipsisIcon}
          title="Комментариев пока нет"
          description="Будьте первым, кто оставит комментарий!"
        />
      ) : (
        <div className="space-y-5">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} postSlug={postSlug} />
          ))}
        </div>
      )}
    </section>
  );
}
