import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  CalendarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import apiClient from '@/shared/api/client';
import { authAPI } from '@/shared/api/endpoints';
import useAuthStore from '@/entities/user/model/authStore';
import Avatar from '@/entities/user/ui/Avatar';
import Button from '@/shared/ui/Button';
import Loader from '@/shared/ui/Loader';
import PostList from '@/widgets/post-list/PostList';
import {
  USER_ROLE_LABELS,
  USER_ROLE_COLORS,
  DJANGO_ADMIN_URL,
} from '@/shared/lib/constants';
import { formatDate, pluralize } from '@/shared/lib/format';

export default function ProfilePage() {
  const { username } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuthStore();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    pageSize: 10,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Состояния для подписки
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubLoading, setIsSubLoading] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const isMyProfile = currentUser?.username === username;

  const canCreatePost =
    currentUser?.role === 'author' || currentUser?.role === 'admin';

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authAPI.getUserProfile(username);
        setProfile(response.data);
        setIsSubscribed(response.data.is_subscribed);
      } catch (err) {
        setError('Пользователь не найден');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, [username]);

  useEffect(() => {
    const loadPosts = async () => {
      if (!username) return;
      setIsPostsLoading(true);
      try {
        const response = await apiClient.get('/posts/', {
          params: {
            author: username,
            page: currentPage,
          },
        });
        setPosts(response.data.results || response.data);
        setPagination({
          count: response.data.count || 0,
          page: currentPage,
          pageSize: 10,
        });
      } catch (err) {
        console.error('Ошибка загрузки постов:', err);
      } finally {
        setIsPostsLoading(false);
      }
    };
    loadPosts();
  }, [username, currentPage]);

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Обработчик подписки
  const handleSubscribe = async () => {
    if (!currentUser) {
      toast.error('Войдите, чтобы подписаться');
      return;
    }
    
    setIsSubLoading(true);
    try {
      const response = await authAPI.toggleSubscription(profile.id);
      const isNowSubscribed = response.data.status === 'subscribed';
      
      setIsSubscribed(isNowSubscribed);
      // Обновляем счетчик в профиле
      setProfile(prev => ({
        ...prev,
        subscribers_count: prev.subscribers_count + (isNowSubscribed ? 1 : -1)
      }));
      
      toast.success(isNowSubscribed ? 'Вы подписались!' : 'Вы отписались');
    } catch (error) {
      toast.error('Ошибка при подписке');
    } finally {
      setIsSubLoading(false);
    }
  };

  if (isLoading) return <Loader fullScreen />;

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {error || 'Пользователь не найден'}
        </h1>
        <Button to="/">На главную</Button>
      </div>
    );
  }

  const cleanBio = (bio) => {
    if (!bio) return null;
    const trimmed = bio.trim();
    if (
      trimmed === '' ||
      trimmed.toLowerCase() === 'string' ||
      trimmed.toLowerCase() === 'bio' ||
      trimmed === 'undefined'
    ) {
      return null;
    }
    return trimmed;
  };

  const displayBio = cleanBio(profile.bio);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="card p-6 md:p-8 mb-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0">
            <Avatar user={profile} size="xl" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {profile.username}
                </h1>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span
                    className={`badge ${
                      USER_ROLE_COLORS[profile.role] ||
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {USER_ROLE_LABELS[profile.role] || profile.role}
                  </span>

                  {isMyProfile && (
                    <span className="badge bg-primary-100 text-primary-700">
                      Это вы
                    </span>
                  )}
                </div>
              </div>

              {isMyProfile ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button to="/settings" variant="outline" size="sm">
                    Редактировать профиль
                  </Button>

                  {profile.role === 'admin' && (
                    <a
                      href={DJANGO_ADMIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition"
                      title="Открыть Django Admin"
                    >
                      <ShieldCheckIcon className="w-4 h-4" />
                      Админка
                      <span className="text-xs">↗</span>
                    </a>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleSubscribe}
                  loading={isSubLoading}
                  variant={isSubscribed ? "outline" : "primary"}
                  size="sm"
                >
                  {isSubscribed ? 'Отписаться' : 'Подписаться'}
                </Button>
              )}
            </div>

            {displayBio && (
              <p className="text-gray-700 mt-4 whitespace-pre-wrap">
                {displayBio}
              </p>
            )}

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                На сайте с {formatDate(profile.created_at)}
              </span>

              <span className="flex items-center gap-1">
                <DocumentTextIcon className="w-4 h-4" />
                {pagination.count}{' '}
                {pluralize(pagination.count, ['пост', 'поста', 'постов'])}
              </span>
              
              {/* Счетчики подписок */}
              <span className="flex items-center gap-1">
                {profile.subscribers_count} подписчиков
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Посты автора
          </h2>
          <span className="text-sm text-gray-500">
            Всего: {pagination.count}
          </span>
        </div>

        <PostList
          posts={posts}
          isLoading={isPostsLoading}
          count={pagination.count}
          page={currentPage}
          pageSize={pagination.pageSize}
          onPageChange={handlePageChange}
          emptyState={{
            title: isMyProfile
              ? 'У вас пока нет постов'
              : 'У пользователя пока нет постов',
            description: isMyProfile
              ? canCreatePost
                ? 'Создайте свой первый пост!'
                : 'Ваша роль — читатель. Заявку на автора можно оставить в профиле.'
              : 'Загляните позже',
            action:
              isMyProfile && canCreatePost ? (
                <Button to="/create">Создать пост</Button>
              ) : null,
          }}
        />
      </div>
    </div>
  );
}