import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FunnelIcon, XMarkIcon, SparklesIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

import usePostsStore from '@/entities/post/model/postsStore';
import useAuthStore from '@/entities/user/model/authStore';
import PostList from '@/widgets/post-list/PostList';
import Button from '@/shared/ui/Button';
import { pluralize } from '@/shared/lib/format';

const ORDERING_OPTIONS = [
  { value: '-created_at', label: 'Сначала новые' },
  { value: 'created_at', label: 'Сначала старые' },
  { value: '-views_count', label: 'Популярные' },
  { value: '-likes_count', label: 'Больше всего лайков' },
  { value: '-published_at', label: 'Недавно опубликованные' },
];

const chipBase =
  'inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200';

function Hero({ isAuthenticated, canWrite }) {
  return (
    <section className="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 px-6 py-12 text-white shadow-glow sm:px-12 sm:py-16">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 animate-blob rounded-full bg-white/20 blur-3xl" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 animate-blob rounded-full bg-primary-300/40 blur-3xl"
        style={{ animationDelay: '-8s' }}
        aria-hidden="true"
      />

      <div className="relative max-w-2xl animate-fade-in-up">
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
          <SparklesIcon className="h-4 w-4" />
          Blog Platform
        </span>
        <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Идеи, которыми хочется делиться
        </h1>
        <p className="mb-8 text-base text-primary-100 sm:text-lg">
          Читайте авторов, обсуждайте публикации и рассказывайте свои истории.
        </p>
        <div className="flex flex-wrap gap-3">
          {canWrite ? (
            <Button to="/create" variant="secondary" size="lg" className="!bg-white !text-primary-700 hover:!bg-primary-50">
              <PencilSquareIcon className="h-5 w-5" />
              Написать пост
            </Button>
          ) : (
            !isAuthenticated && (
              <Button to="/register" variant="secondary" size="lg" className="!bg-white !text-primary-700 hover:!bg-primary-50">
                Присоединиться
              </Button>
            )
          )}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const posts = usePostsStore((s) => s.posts);
  const pagination = usePostsStore((s) => s.pagination);
  const isLoading = usePostsStore((s) => s.isLoading);
  const fetchPosts = usePostsStore((s) => s.fetchPosts);
  const setFilters = usePostsStore((s) => s.setFilters);
  const categories = usePostsStore((s) => s.categories);
  const tags = usePostsStore((s) => s.tags);
  const fetchCategories = usePostsStore((s) => s.fetchCategories);
  const fetchTags = usePostsStore((s) => s.fetchTags);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);

  const [showFilters, setShowFilters] = useState(false);

  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const currentSearch = searchParams.get('search') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentTag = searchParams.get('tag') || '';
  const currentOrdering = searchParams.get('ordering') || '-created_at';

  // Справочники берутся из кеша стора (раньше — отдельный запрос на каждый заход на главную).
  useEffect(() => {
    fetchCategories?.();
    fetchTags?.();
  }, [fetchCategories, fetchTags]);

  useEffect(() => {
    setFilters({
      search: currentSearch,
      category: currentCategory,
      tag: currentTag,
      ordering: currentOrdering,
    });
    fetchPosts(currentPage);
  }, [currentPage, currentSearch, currentCategory, currentTag, currentOrdering, fetchPosts, setFilters]);

  const handlePageChange = useCallback(
    (page) => {
      const params = new URLSearchParams(searchParams);
      params.set('page', page);
      setSearchParams(params);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [searchParams, setSearchParams]
  );

  const handleFilterChange = useCallback(
    (key, value) => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete('page');
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  const clearFilters = useCallback(() => setSearchParams({}), [setSearchParams]);

  const hasActiveFilters = Boolean(currentSearch || currentCategory || currentTag);
  const canWrite = role === 'author' || role === 'admin';
  const popularTags = useMemo(
    () => [...(tags || [])].sort((a, b) => (b.posts_count || 0) - (a.posts_count || 0)).slice(0, 12),
    [tags]
  );

  const emptyState = useMemo(
    () => ({
      title: 'Постов пока нет',
      description: hasActiveFilters ? 'По вашим фильтрам ничего не найдено' : 'Будьте первым, кто создаст пост!',
      action: hasActiveFilters ? (
        <Button onClick={clearFilters} variant="outline">
          Очистить фильтры
        </Button>
      ) : canWrite ? (
        <Button to="/create">Создать пост</Button>
      ) : !isAuthenticated ? (
        <Button to="/register">Зарегистрироваться</Button>
      ) : null,
    }),
    [hasActiveFilters, clearFilters, isAuthenticated, canWrite]
  );

  const orderingSelect = (className, options = ORDERING_OPTIONS) => (
    <select
      value={currentOrdering}
      onChange={(e) => handleFilterChange('ordering', e.target.value)}
      className={className}
      aria-label="Сортировка"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {!hasActiveFilters && currentPage === 1 && <Hero isAuthenticated={isAuthenticated} canWrite={canWrite} />}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Все посты</h2>
          <p className="mt-1 text-gray-500">
            {pagination.count > 0
              ? `Найдено: ${pagination.count} ${pluralize(pagination.count, ['пост', 'поста', 'постов'])}`
              : 'Постов пока нет'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)} className="md:hidden">
            <FunnelIcon className="h-4 w-4" />
            Фильтры
          </Button>
          {orderingSelect('input hidden w-auto md:block')}
        </div>
      </div>

      {popularTags.length > 0 && (
        <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            type="button"
            onClick={() => handleFilterChange('tag', '')}
            className={`${chipBase} ${
              !currentTag
                ? 'border-transparent bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:border-primary-200 hover:text-primary-700'
            }`}
          >
            Все
          </button>
          {popularTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleFilterChange('tag', currentTag === tag.slug ? '' : tag.slug)}
              className={`${chipBase} ${
                currentTag === tag.slug
                  ? 'border-transparent bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-700'
              }`}
            >
              #{tag.name}
            </button>
          ))}
        </div>
      )}

      <div className={`card mb-8 p-4 ${showFilters ? 'block animate-scale-in' : 'hidden md:block'}`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="filter-category" className="mb-1.5 block text-sm font-medium text-gray-700">
              Категория
            </label>
            <select
              id="filter-category"
              value={currentCategory}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="input"
            >
              <option value="">Все категории</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-tag" className="mb-1.5 block text-sm font-medium text-gray-700">
              Тег
            </label>
            <select
              id="filter-tag"
              value={currentTag}
              onChange={(e) => handleFilterChange('tag', e.target.value)}
              className="input"
            >
              <option value="">Все теги</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.slug}>
                  #{tag.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:hidden">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Сортировка</label>
            {orderingSelect('input')}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
            <span className="text-sm text-gray-500">Активные:</span>

            {currentSearch && (
              <span className="badge animate-scale-in bg-primary-100 py-1 text-primary-700">
                Поиск: {currentSearch}
                <button
                  type="button"
                  onClick={() => handleFilterChange('search', '')}
                  className="ml-1 rounded-full hover:text-primary-900"
                  aria-label="Сбросить поиск"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {currentCategory && (
              <span className="badge animate-scale-in bg-primary-100 py-1 text-primary-700">
                {categories.find((c) => c.slug === currentCategory)?.name || currentCategory}
                <button
                  type="button"
                  onClick={() => handleFilterChange('category', '')}
                  className="ml-1 rounded-full hover:text-primary-900"
                  aria-label="Сбросить категорию"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {currentTag && (
              <span className="badge animate-scale-in bg-primary-100 py-1 text-primary-700">
                #{tags.find((t) => t.slug === currentTag)?.name || currentTag}
                <button
                  type="button"
                  onClick={() => handleFilterChange('tag', '')}
                  className="ml-1 rounded-full hover:text-primary-900"
                  aria-label="Сбросить тег"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-red-600 transition-colors hover:text-red-700"
            >
              Очистить всё
            </button>
          </div>
        )}
      </div>

      <PostList
        posts={posts}
        isLoading={isLoading}
        count={pagination.count}
        page={currentPage}
        pageSize={pagination.pageSize}
        onPageChange={handlePageChange}
        emptyState={emptyState}
      />
    </div>
  );
}
