import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CalendarIcon, ShieldCheckIcon, UserPlusIcon, UserMinusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { authAPI, postsAPI } from '@/shared/api/endpoints';
import useAuthStore from '@/entities/user/model/authStore';
import Avatar from '@/entities/user/ui/Avatar';
import Button from '@/shared/ui/Button';
import Loader from '@/shared/ui/Loader';
import PostList from '@/widgets/post-list/PostList';
import { USER_ROLE_LABELS, USER_ROLE_COLORS, DJANGO_ADMIN_URL } from '@/shared/lib/constants';
import { formatDate, pluralize } from '@/shared/lib/format';

const PLACEHOLDER_BIOS = new Set(['', 'string', 'bio', 'undefined']);

const cleanBio = (bio) => {
  const trimmed = (bio || '').trim();
  return PLACEHOLDER_BIOS.has(trimmed.toLowerCase()) ? null : trimmed;
};

function StatBlock({ value, label }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-4 py-3 text-center transition hover:bg-primary-50">
      <p className="text-xl font-extrabold tabular-nums text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postsCount, setPostsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubLoading, setIsSubLoading] = useState(false);

  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const isMyProfile = currentUser?.username === username;
  const canCreatePost = currentUser?.role === 'author' || currentUser?.role === 'admin';

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    authAPI
      .getUserProfile(username)
      .then((response) => {
        if (!active) return;
        setProfile(response.data);
        setIsSubscribed(Boolean(response.data.is_subscribed));
      })
      .catch(() => active && setError('Пользователь не найден'))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [username]);

  useEffect(() => {
    if (!username) return undefined;
    let active = true;
    setIsPostsLoading(true);
    postsAPI
      .list({ author: username, page: currentPage })
      .then(({ data }) => {
        if (!active) return;
        setPosts(data.results || data);
        setPostsCount(data.count || 0);
      })
      .catch(() => {})
      .finally(() => active && setIsPostsLoading(false));
    return () => {
      active = false;
    };
  }, [username, currentPage]);

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubscribe = async () => {
    if (!currentUser) {
      toast.error('Войдите, чтобы подписаться');
      return;
    }

    setIsSubLoading(true);
    try {
      const response = await authAPI.toggleSubscription(profile.id);
      const nowSubscribed = response.data.status === 'subscribed';
      setIsSubscribed(nowSubscribed);
      setProfile((prev) => ({
        ...prev,
        subscribers_count: Math.max(0, (prev.subscribers_count || 0) + (nowSubscribed ? 1 : -1)),
      }));
      toast.success(nowSubscribed ? 'Вы подписались!' : 'Вы отписались');
    } catch {
      toast.error('Ошибка при подписке');
    } finally {
      setIsSubLoading(false);
    }
  };

  if (isLoading) return <Loader fullScreen />;

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">{error || 'Пользователь не найден'}</h1>
        <Button to="/">На главную</Button>
      </div>
    );
  }

  const displayBio = cleanBio(profile.bio);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <section className="card mb-10 animate-fade-in-up">
        {/* Баннер профиля */}
        <div className="relative h-32 overflow-hidden bg-gradient-to-r from-primary-700 via-primary-500 to-primary-400 sm:h-40">
          <div className="bg-grid absolute inset-0 opacity-30" aria-hidden="true" />
          <div className="absolute -right-10 -top-10 h-48 w-48 animate-blob rounded-full bg-white/20 blur-2xl" aria-hidden="true" />
        </div>

        <div className="px-6 pb-6 md:px-8 md:pb-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <Avatar user={profile} size="xl" ring />

            {isMyProfile ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button to="/settings" variant="outline" size="sm">
                  Редактировать профиль
                </Button>

                {profile.role === 'admin' && (
                  <a
                    href={DJANGO_ADMIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                    title="Открыть Django Admin"
                  >
                    <ShieldCheckIcon className="h-4 w-4" />
                    Админка
                    <span className="text-xs">↗</span>
                  </a>
                )}
              </div>
            ) : (
              <Button
                onClick={handleSubscribe}
                loading={isSubLoading}
                variant={isSubscribed ? 'outline' : 'primary'}
                size="sm"
              >
                {!isSubLoading &&
                  (isSubscribed ? <UserMinusIcon className="h-4 w-4" /> : <UserPlusIcon className="h-4 w-4" />)}
                {isSubscribed ? 'Отписаться' : 'Подписаться'}
              </Button>
            )}
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">{profile.username}</h1>
              <span className={`badge ${USER_ROLE_COLORS[profile.role] || 'bg-gray-100 text-gray-700'}`}>
                {USER_ROLE_LABELS[profile.role] || profile.role}
              </span>
              {isMyProfile && <span className="badge bg-primary-100 text-primary-700">Это вы</span>}
            </div>

            {displayBio && <p className="mt-3 max-w-2xl whitespace-pre-wrap text-gray-700">{displayBio}</p>}

            <p className="mt-3 flex items-center gap-1 text-sm text-gray-500">
              <CalendarIcon className="h-4 w-4" />
              На сайте с {formatDate(profile.created_at)}
            </p>
          </div>

          <div className="mt-6 grid max-w-md grid-cols-3 gap-3">
            <StatBlock value={postsCount} label={pluralize(postsCount, ['пост', 'поста', 'постов'])} />
            <StatBlock
              value={profile.subscribers_count || 0}
              label={pluralize(profile.subscribers_count || 0, ['подписчик', 'подписчика', 'подписчиков'])}
            />
            <StatBlock value={profile.following_count || 0} label="подписок" />
          </div>
        </div>
      </section>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 md:text-2xl">Посты автора</h2>
        <span className="text-sm text-gray-500">Всего: {postsCount}</span>
      </div>

      <PostList
        posts={posts}
        isLoading={isPostsLoading}
        count={postsCount}
        page={currentPage}
        pageSize={10}
        onPageChange={handlePageChange}
        emptyState={{
          title: isMyProfile ? 'У вас пока нет постов' : 'У пользователя пока нет постов',
          description: isMyProfile
            ? canCreatePost
              ? 'Создайте свой первый пост!'
              : 'Ваша роль — читатель. Чтобы стать автором, обратитесь к администратору.'
            : 'Загляните позже',
          action: isMyProfile && canCreatePost ? <Button to="/create">Создать пост</Button> : null,
        }}
      />
    </div>
  );
}
