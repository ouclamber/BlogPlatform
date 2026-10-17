import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

import usePostsStore from '@/entities/post/model/postsStore';
import useAuthStore from '@/entities/user/model/authStore';
import PostList from '@/widgets/post-list/PostList';
import Button from '@/shared/ui/Button';
import { categoriesAPI, tagsAPI } from '@/shared/api/endpoints';

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { posts, pagination, isLoading, fetchPosts, setFilters } = usePostsStore();
  const { isAuthenticated } = useAuthStore();

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentSearch = searchParams.get('search') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentTag = searchParams.get('tag') || '';
  const currentOrdering = searchParams.get('ordering') || '-created_at';

  // Загрузка фильтров один раз при монтировании
  useEffect(() => {
    let isMounted = true;
    const loadFilters = async () => {
      try {
        const [catRes, tagRes] = await Promise.all([
          categoriesAPI.list(),
          tagsAPI.list(),
        ]);
        if (isMounted) {
          setCategories(catRes.data.results || catRes.data);
          setTags(tagRes.data.results || tagRes.data);
        }
      } catch (error) {
        console.error('Ошибка загрузки фильтров:', error);
      }
    };
    loadFilters();
    return () => { isMounted = false; };
  }, []);

  // Загрузка постов при изменении параметров URL
  useEffect(() => {
    setFilters({
      search: currentSearch,
      category: currentCategory,
      tag: currentTag,
      ordering: currentOrdering,
    });
    fetchPosts(currentPage);
  }, [currentPage, currentSearch, currentCategory, currentTag, currentOrdering, fetchPosts, setFilters]);

  // Мемоизируем коллбэк смены страницы
  const handlePageChange = useCallback((page) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, setSearchParams]);

  // Мемоизируем коллбэк смены фильтра
  const handleFilterChange = useCallback((key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const hasActiveFilters = currentSearch || currentCategory || currentTag;

  // Мемоизируем объект emptyState, чтобы PostList не перерендеривался зря
  const emptyState = useMemo(() => ({
    title: 'Постов пока нет',
    description: hasActiveFilters
      ? 'По вашим фильтрам ничего не найдено'
      : 'Будьте первым, кто создаст пост!',
    action: hasActiveFilters ? (
      <Button onClick={clearFilters} variant="outline">
        Очистить фильтры
      </Button>
    ) : isAuthenticated ? (
      <Button to="/create">Создать пост</Button>
    ) : (
      <Button to="/register">Зарегистрироваться</Button>
    ),
  }), [hasActiveFilters, clearFilters, isAuthenticated]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Все посты</h1>
          <p className="text-gray-500 mt-1">
            {pagination.count > 0 ? `Найдено: ${pagination.count}` : 'Постов пока нет'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden"
          >
            <FunnelIcon className="w-4 h-4" />
            Фильтры
          </Button>

          <select
            value={currentOrdering}
            onChange={(e) => handleFilterChange('ordering', e.target.value)}
            className="input hidden md:block w-auto"
          >
            <option value="-created_at">Сначала новые</option>
            <option value="created_at">Сначала старые</option>
            <option value="-views_count">Популярные</option>
            <option value="-published_at">Недавно опубликованные</option>
          </select>
        </div>
      </div>

      <div className={`mb-6 p-4 bg-white rounded-xl border border-gray-100 ${showFilters ? 'block' : 'hidden md:block'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
            <select
              value={currentCategory}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="input"
            >
              <option value="">Все категории</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тег</label>
            <select
              value={currentTag}
              onChange={(e) => handleFilterChange('tag', e.target.value)}
              className="input"
            >
              <option value="">Все теги</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.slug}>#{tag.name}</option>
              ))}
            </select>
          </div>

          <div className="md:hidden">
            <label className="block text-sm font-medium text-gray-700 mb-1">Сортировка</label>
            <select
              value={currentOrdering}
              onChange={(e) => handleFilterChange('ordering', e.target.value)}
              className="input"
            >
              <option value="-created_at">Сначала новые</option>
              <option value="created_at">Сначала старые</option>
              <option value="-views_count">Популярные</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Активные:</span>

            {currentSearch && (
              <span className="badge bg-primary-100 text-primary-700">
                Поиск: {currentSearch}
                <button onClick={() => handleFilterChange('search', '')} className="ml-1 hover:text-primary-900">
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}

            {currentCategory && (
              <span className="badge bg-primary-100 text-primary-700">
                {categories.find((c) => c.slug === currentCategory)?.name}
                <button onClick={() => handleFilterChange('category', '')} className="ml-1">
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}

            {currentTag && (
              <span className="badge bg-primary-100 text-primary-700">
                #{tags.find((t) => t.slug === currentTag)?.name}
                <button onClick={() => handleFilterChange('tag', '')} className="ml-1">
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}

            <button onClick={clearFilters} className="text-xs text-red-600 hover:text-red-700 font-medium">
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