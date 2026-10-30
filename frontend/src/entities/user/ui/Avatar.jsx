import { memo, useState } from 'react';
import { resolveMediaUrl } from '@/shared/lib/media';

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-3xl',
};

function Avatar({ user, size = 'md', className = '', ring = false }) {
  const avatarUrl = resolveMediaUrl(user?.avatar);
  // При ошибке загрузки показываем инициалы (раньше картинка просто скрывалась
  // и на месте аватара оставалась пустота + console.error на каждый рендер).
  const [failedUrl, setFailedUrl] = useState(null);
  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';
  const ringClass = ring ? 'ring-4 ring-white shadow-soft' : '';

  if (avatarUrl && failedUrl !== avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={user?.username || 'Avatar'}
        loading="lazy"
        decoding="async"
        className={`${sizes[size]} flex-shrink-0 rounded-full object-cover ${ringClass} ${className}`}
        onError={() => setFailedUrl(avatarUrl)}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} flex flex-shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 font-semibold text-white ${ringClass} ${className}`}
      aria-label={user?.username || 'Пользователь'}
    >
      {initials}
    </div>
  );
}

export default memo(Avatar);
