import { Link } from 'react-router-dom';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function Footer() {
  return (
    <footer className="relative mt-auto border-t border-gray-200/70 bg-white/70 backdrop-blur">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-300 to-transparent" />
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-gray-500 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-primary-400 text-white">
            <SparklesIcon className="h-4 w-4" />
          </span>
          <span>© 2026 Blog Platform. Все права защищены.</span>
        </div>
        <nav className="flex items-center gap-5">
          <Link to="/" className="transition-colors hover:text-primary-600">
            Главная
          </Link>
          <Link to="/register" className="transition-colors hover:text-primary-600">
            Стать автором
          </Link>
        </nav>
      </div>
    </footer>
  );
}
