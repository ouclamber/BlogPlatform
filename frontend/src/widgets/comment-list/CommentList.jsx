import { useEffect } from 'react';
import { ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';

import useCommentsStore from '@/entities/comment/model/commentsStore';
import CommentItem from './CommentItem';
import CommentForm from '@/features/comment/create/CommentForm';
import Loader from '@/shared/ui/Loader';
import EmptyState from '@/shared/ui/EmptyState';

export default function CommentList({ postId, postSlug }) {
  const { comments, isLoading, fetchComments } = useCommentsStore();

  useEffect(() => {
    if (postId) {
      fetchComments(postSlug);
    }
  }, [postId, postSlug, fetchComments]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ChatBubbleOvalLeftIcon className="w-6 h-6 text-primary-600" />
        <h2 className="text-xl font-bold text-gray-900">
          Комментарии ({comments.length})
        </h2>
      </div>

      <CommentForm postId={postId} postSlug={postSlug} />

      {isLoading ? (
        <Loader />
      ) : comments.length === 0 ? (
        <EmptyState
          icon={ChatBubbleOvalLeftIcon}
          title="Комментариев пока нет"
          description="Будьте первым, кто оставит комментарий!"
        />
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postSlug={postSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}