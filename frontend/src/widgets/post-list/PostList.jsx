import PostCard from '@/entities/post/ui/PostCard';
import Loader from '@/shared/ui/Loader';
import Pagination from '@/shared/ui/Pagination';
import EmptyState from '@/shared/ui/EmptyState';
import Button from '@/shared/ui/Button';

/**
 * Универсальный виджет списка постов.
 *
 * @param {Array}    posts        — массив постов
 * @param {boolean}  isLoading    — идёт ли загрузка
 * @param {number}   count        — общее количество (для пагинации)
 * @param {number}   page         — текущая страница
 * @param {number}   pageSize     — размер страницы
 * @param {Function} onPageChange — колбэк смены страницы
 * @param {Object}   emptyState   — { title, description, action } для EmptyState
 * @param {string}   gridClass    — кастомный класс сетки (по умолчанию 1/2/3 колонки)
 */
export default function PostList({
  posts = [],
  isLoading = false,
  count = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  emptyState,
  gridClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
}) {
  if (isLoading) {
    return <Loader />;
  }

  if (!posts.length) {
    return (
      <EmptyState
        title={emptyState?.title || 'Постов пока нет'}
        description={emptyState?.description}
        action={emptyState?.action}
      />
    );
  }

  return (
    <>
      <div className={gridClass}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {onPageChange && count > pageSize && (
        <Pagination
          page={page}
          count={count}
          pageSize={pageSize}
          onChange={onPageChange}
        />
      )}
    </>
  );
}