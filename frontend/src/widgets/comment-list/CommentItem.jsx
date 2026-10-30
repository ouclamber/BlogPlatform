import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PencilIcon, TrashIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Avatar from '@/entities/user/ui/Avatar';
import Button from '@/shared/ui/Button';
import useAuthStore from '@/entities/user/model/authStore';
import useCommentsStore from '@/entities/comment/model/commentsStore';
import { timeAgo, formatDateTime } from '@/shared/lib/format';

const MAX_LEVEL = 3;
const MAX_LENGTH = 5000;

const levelBorder = ['', 'border-primary-100', 'border-primary-200', 'border-primary-300'];
const getLevelStyle = (lvl) =>
  lvl === 0 ? '' : `ml-3 md:ml-8 border-l-2 pl-3 md:pl-5 ${levelBorder[lvl] || 'border-gray-200'}`;

const actionBtn =
  'inline-flex items-center gap-1 rounded-full px-2 py-1 text-gray-500 transition-colors';

function CommentItem({ comment, postSlug, level = 0 }) {
  const user = useAuthStore((s) => s.user);
  const updateComment = useCommentsStore((s) => s.updateComment);
  const deleteComment = useCommentsStore((s) => s.deleteComment);
  const createComment = useCommentsStore((s) => s.createComment);

  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);

  const author = comment.author || { username: 'Unknown' };
  const isOwner = user && author.id === user.id;
  const canEdit = isOwner || user?.role === 'admin';

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    setLoading(true);
    const result = await updateComment(comment.id, editContent.trim());
    setLoading(false);

    if (result?.success) {
      toast.success('Комментарий обновлён');
      setIsEditing(false);
    } else {
      toast.error('Ошибка обновления');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить комментарий?')) return;

    setLoading(true);
    const result = await deleteComment(comment.id);
    setLoading(false);

    if (result?.success) toast.success('Комментарий удалён');
    else toast.error('Ошибка удаления');
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setLoading(true);

    const result = await createComment({
      post: comment.post,
      parent: comment.id,
      content: replyContent.trim(),
    });

    setLoading(false);

    if (result?.success) {
      toast.success('Ответ добавлен');
      setReplyContent('');
      setIsReplying(false);
    } else {
      toast.error('Ошибка');
    }
  };

  return (
    <div className={level > 0 ? `${getLevelStyle(level)} mt-4` : ''}>
      <div className="group flex gap-3 animate-fade-in-up">
        <Link to={`/profile/${author.username}`} className="flex-shrink-0">
          <Avatar user={author} size="sm" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-3 shadow-sm transition-shadow duration-200 group-hover:shadow-soft">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Link
                to={`/profile/${author.username}`}
                className="text-sm font-semibold text-gray-900 hover:text-primary-600"
              >
                {author.username}
              </Link>
              {author.role === 'admin' && (
                <span className="badge bg-red-100 text-xs text-red-700">Admin</span>
              )}
              <span className="text-xs text-gray-300">•</span>
              <time className="text-xs text-gray-500" dateTime={comment.created_at} title={formatDateTime(comment.created_at)}>
                {timeAgo(comment.created_at)}
              </time>
              {comment.is_edited && <span className="text-xs italic text-gray-400">(изменён)</span>}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  maxLength={MAX_LENGTH}
                  className="input resize-none"
                  aria-label="Текст комментария"
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
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">
                {comment.content}
              </p>
            )}
          </div>

          {!isEditing && user && (
            <div className="mt-1.5 flex items-center gap-1 pl-2 text-xs">
              {level < MAX_LEVEL && (
                <button
                  type="button"
                  onClick={() => setIsReplying((v) => !v)}
                  className={`${actionBtn} hover:bg-primary-50 hover:text-primary-600`}
                >
                  <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                  Ответить
                </button>
              )}

              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className={`${actionBtn} hover:bg-primary-50 hover:text-primary-600`}
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                    Изменить
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className={`${actionBtn} hover:bg-red-50 hover:text-red-600`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    Удалить
                  </button>
                </>
              )}
            </div>
          )}

          {isReplying && (
            <div className="mt-3 animate-scale-in space-y-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Написать ответ..."
                rows={2}
                maxLength={MAX_LENGTH}
                className="input resize-none text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleReply} loading={loading} disabled={!replyContent.trim()}>
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

          {comment.replies?.length > 0 && (
            <div className="mt-2 space-y-2">
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} postSlug={postSlug} level={level + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const MemoCommentItem = memo(CommentItem);
export default MemoCommentItem;
