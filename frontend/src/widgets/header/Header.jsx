import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ChevronDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import useAuthStore from '@/entities/user/model/authStore';
import Avatar from '@/entities/user/ui/Avatar';
import Button from '@/shared/ui/Button';
import { DJANGO_ADMIN_URL } from '@/shared/lib/constants';

const menuItemClass =
  'flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-primary-50 hover:text-primary-700';

function SearchForm({ className = '', autoFocus = false, onDone }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Синхронизация с URL (например, после «Очистить фильтры»).
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = search.trim();
    navigate(value ? `/?search=${encodeURIComponent(value)}` : '/');
    onDone?.();
  };

  return (
    <form onSubmit={handleSubmit} className={className} role="search">
      <div className="group relative w-full">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary-500" />
        <input
          type="search"
          placeholder="Поиск постов..."
          aria-label="Поиск постов"
          value={search}
          autoFocus={autoFocus}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-full border border-gray-200 bg-gray-50/80 py-2 pl-11 pr-4 text-sm outline-none transition-all duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-primary-300 focus:bg-white focus:ring-4 focus:ring-primary-100"
        />
      </div>
    </form>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  const isAdmin = user?.role === 'admin';
  const canCreatePost = user?.role === 'author' || isAdmin;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Закрываем меню при смене страницы и по Escape.
  useEffect(() => {
    setMenuOpen(false);
    setMobileSearch(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `hidden lg:inline-flex rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:text-primary-700'
    }`;

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled
          ? 'border-gray-200/70 bg-white/75 shadow-soft backdrop-blur-xl backdrop-saturate-150'
          : 'border-transparent bg-white/40 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="group flex flex-shrink-0 items-center gap-2" aria-label="На главную">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 text-white shadow-glow-sm transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
              <SparklesIcon className="h-5 w-5" />
            </span>
            <span className="text-gradient animate-gradient-x text-xl font-extrabold tracking-tight max-[420px]:sr-only sm:text-2xl">
              Blog Platform
            </span>
          </Link>

          <SearchForm className="mx-4 hidden max-w-md flex-1 md:flex" />

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileSearch((v) => !v)}
              className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100 md:hidden"
              aria-label={mobileSearch ? 'Закрыть поиск' : 'Открыть поиск'}
            >
              {mobileSearch ? <XMarkIcon className="h-5 w-5" /> : <MagnifyingGlassIcon className="h-5 w-5" />}
            </button>

            {isAuthenticated ? (
              <>
                {canCreatePost && (
                  <>
                    <NavLink to="/my-posts" className={navLinkClass}>
                      Мои публикации
                    </NavLink>
                    <Button to="/create" size="sm">
                      <PlusIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Создать</span>
                    </Button>
                  </>
                )}

                {isAdmin && (
                  <a
                    href={DJANGO_ADMIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 sm:inline-flex"
                    title="Открыть Django Admin"
                  >
                    <ShieldCheckIcon className="h-4 w-4" />
                    <span className="hidden md:inline">Админ-панель</span>
                  </a>
                )}

                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className={`flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-gray-100 ${
                      menuOpen ? 'bg-gray-100' : ''
                    }`}
                  >
                    <Avatar user={user} size="sm" />
                    <span className="hidden text-sm font-medium md:block">{user?.username}</span>
                    <ChevronDownIcon
                      className={`hidden h-4 w-4 text-gray-400 transition-transform duration-200 md:block ${
                        menuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />

                      <div
                        role="menu"
                        className="absolute right-0 z-50 mt-2 w-60 origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-gray-100 bg-white/95 py-1 shadow-glow backdrop-blur-xl"
                      >
                        <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white px-4 py-3">
                          <Avatar user={user} size="md" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{user?.username}</p>
                            <p className="truncate text-xs text-gray-500">{user?.email}</p>
                          </div>
                        </div>

                        <Link to={`/profile/${user?.username}`} onClick={() => setMenuOpen(false)} className={menuItemClass} role="menuitem">
                          <UserCircleIcon className="h-5 w-5" />
                          Профиль
                        </Link>

                        {canCreatePost && (
                          <Link to="/my-posts" onClick={() => setMenuOpen(false)} className={menuItemClass} role="menuitem">
                            <DocumentTextIcon className="h-5 w-5" />
                            Мои посты
                          </Link>
                        )}

                        <Link to="/settings" onClick={() => setMenuOpen(false)} className={menuItemClass} role="menuitem">
                          <Cog6ToothIcon className="h-5 w-5" />
                          Настройки
                        </Link>

                        {isAdmin && (
                          <>
                            <hr className="my-1 border-gray-100" />
                            <a
                              href={DJANGO_ADMIN_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                              role="menuitem"
                            >
                              <ShieldCheckIcon className="h-5 w-5" />
                              Django Админка
                              <span className="ml-auto text-xs">↗</span>
                            </a>
                          </>
                        )}

                        <hr className="my-1 border-gray-100" />

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                          role="menuitem"
                        >
                          <ArrowRightOnRectangleIcon className="h-5 w-5" />
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

        {mobileSearch && (
          <div className="animate-scale-in pb-3 md:hidden">
            <SearchForm autoFocus onDone={() => setMobileSearch(false)} />
          </div>
        )}
      </div>
    </header>
  );
}
