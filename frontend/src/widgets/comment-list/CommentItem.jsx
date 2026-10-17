import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PencilIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Avatar from '../../entities/user/ui/Avatar';
import Button from '../../shared/ui/Button';
import useAuthStore from '../../entities/user/model/authStore';
import useCommentsStore from '../../entities/comment/model/commentsStore';
import { timeAgo } from '../../shared/lib/format';

const getLevelStyle = (lvl) => {
  if (lvl === 0) return '';
  if (lvl === 1) return 'ml-4 md:ml-8 border-l-2 border-primary-100 pl-3 md:pl-4';
  if (lvl === 2) return 'ml-4 md:ml-8 border-l-2 border-primary-200 pl-3 md:pl-4';
  if (lvl === 3) return 'ml-4 md:ml-8 border-l-2 border-primary-300 pl-3 md:pl-4';
  return 'ml-4 md:ml-8 border-l-2 border-gray-300 pl-3 md:pl-4';
};

function CommentItem({ comment, postSlug, level = 0 }) {
  const { user } = useAuthStore();
  const { updateComment, deleteComment, createComment } = useCommentsStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);

  const isOwner = user && comment.author.id === user.id;
  const isAdmin = user?.role === 'admin';
  const canEdit = isOwner || isAdmin;
  const maxLevel = 3;

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    setLoading(true);
    const result = await updateComment(comment.id, editContent);
    setLoading(false);

    if (result.success) {
      toast.success('Комментарий обновлён');
      setIsEditing(false);
    } else {
      toast.error('Ошибка обновления');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить комментарий?')) return;

    setLoading(true);
    const result = await deleteComment(comment.id);
    setLoading(false);

    if (result.success) {
      toast.success('Комментарий удалён');
    } else {
      toast.error('Ошибка удаления');
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setLoading(true);

    const result = await createComment({
      post: comment.post,
      parent: comment.id,
      content: replyContent,
    });

    setLoading(false);

    if (result.success) {
      toast.success('Ответ добавлен');
      setReplyContent('');
      setIsReplying(false);
    } else {
      toast.error('Ошибка');
    }
  };

  return (
    <div className={`${level > 0 ? `${getLevelStyle(level)} mt-4` : ''}`}>
      <div className="flex gap-3">
        <Link to={`/profile/${comment.author.username}`}>
          <Avatar user={comment.author} size="sm" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Link
              to={`/profile/${comment.author.username}`}
              className="font-semibold text-sm text-gray-900 hover:text-primary-600"
            >
              {comment.author.username}
            </Link>
            {comment.author.role === 'admin' && (
              <span className="badge bg-red-100 text-red-700 text-xs">
                Admin
              </span>
            )}
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">
              {timeAgo(comment.created_at)}
            </span>
            {comment.is_edited && (
              <span className="text-xs text-gray-400 italic">(изменён)</span>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="input resize-none"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEdit} loading={loading}>
                  Сохранить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                >
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          )}

          {!isEditing && user && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              {level < maxLevel && (
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="flex items-center gap-1 text-gray-500 hover:text-primary-600"
                >
                  <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                  Ответить
                </button>
              )}

              {canEdit && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-gray-500 hover:text-primary-600"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                    Изменить
                  </button>

                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1 text-gray-500 hover:text-red-600"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    Удалить
                  </button>
                </>
              )}
            </div>
          )}

          {isReplying && (
            <div className="mt-3 space-y-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Написать ответ..."
                rows={2}
                className="input resize-none text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleReply} loading={loading}>
                  Отправить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent('');
                  }}
                >
                  Отмена
                </Button>
              </div>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-2">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postSlug={postSlug}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(CommentItem);