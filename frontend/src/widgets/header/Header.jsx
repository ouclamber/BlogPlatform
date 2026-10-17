import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

import useAuthStore from '../../entities/user/model/authStore';
import Avatar from '../../entities/user/ui/Avatar';
import Button from '../../shared/ui/Button';
import { DJANGO_ADMIN_URL } from '../../shared/lib/constants';

export default function Header() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');

  const isAdmin = user?.role === 'admin';
  const isAuthor = user?.role === 'author';
  
  // Показываем "Создать" и "Мои посты" только авторам и админам
  const canCreatePost = isAuthor || isAdmin; 

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/?search=${encodeURIComponent(search)}`);
    }
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/"
            className="text-2xl font-bold text-primary-600 flex-shrink-0"
          >
            Blog Platform
          </Link>

          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-md mx-8"
          >
            <div className="relative w-full">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск постов..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </form>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Кнопка "Создать" только для авторов и админов */}
                {canCreatePost && (
                  <Button to="/create" size="sm">
                    <PlusIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Создать</span>
                  </Button>
                )}

                {isAdmin && (
                  <a
                    href={DJANGO_ADMIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition text-sm font-medium"
                    title="Открыть Django Admin"
                  >
                    <ShieldCheckIcon className="w-4 h-4" />
                    <span className="hidden md:inline">Админ-панель</span>
                  </a>
                )}

                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition"
                  >
                    <Avatar user={user} size="sm" />
                    <span className="hidden md:block text-sm font-medium">
                      {user?.username}
                    </span>
                  </button>

                  {menuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenuOpen(false)}
                      />

                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">
                            {user?.username}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user?.email}
                          </p>
                        </div>

                        <Link
                          to={`/profile/${user?.username}`}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <UserCircleIcon className="w-5 h-5" />
                          Профиль
                        </Link>

                        {/* Пункт "Мои посты" ТОЛЬКО для авторов и админов */}
                        {canCreatePost && (
                          <Link
                            to="/my-posts"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <DocumentTextIcon className="w-5 h-5" />
                            Мои посты
                          </Link>
                        )}

                        <Link
                          to="/settings"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Cog6ToothIcon className="w-5 h-5" />
                          Настройки
                        </Link>

                        {isAdmin && (
                          <>
                            <hr className="my-1" />
                            <a
                              href={DJANGO_ADMIN_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                            >
                              <ShieldCheckIcon className="w-5 h-5" />
                              Django Админка
                              <span className="ml-auto text-xs">↗</span>
                            </a>
                          </>
                        )}

                        <hr className="my-1" />

                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <ArrowRightOnRectangleIcon className="w-5 h-5" />
                          Выйти
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Button to="/login" variant="ghost" size="sm">
                  Войти
                </Button>
                <Button to="/register" size="sm">
                  Регистрация
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}