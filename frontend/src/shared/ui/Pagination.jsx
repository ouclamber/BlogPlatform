import { memo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const baseBtn =
  'min-w-[2.5rem] h-10 px-3 rounded-xl border text-sm font-medium transition-all duration-200';
const idleBtn = 'border-gray-200 bg-white text-gray-700 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700';

function Pagination({ page, count, pageSize = 10, onChange }) {
  const totalPages = Math.ceil(count / pageSize);

  if (totalPages <= 1) return null;

  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Пагинация">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Предыдущая страница"
        className={`${baseBtn} ${idleBtn} disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronLeftIcon className="mx-auto h-4 w-4" />
      </button>

      {start > 1 && (
        <>
          <button onClick={() => onChange(1)} className={`${baseBtn} ${idleBtn}`}>
            1
          </button>
          {start > 2 && <span className="px-1 text-gray-400">…</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`${baseBtn} ${
            p === page
              ? 'border-transparent bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow-sm'
              : idleBtn
          }`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-gray-400">…</span>}
          <button onClick={() => onChange(totalPages)} className={`${baseBtn} ${idleBtn}`}>
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Следующая страница"
        className={`${baseBtn} ${idleBtn} disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronRightIcon className="mx-auto h-4 w-4" />
      </button>
    </nav>
  );
}

export default memo(Pagination);
