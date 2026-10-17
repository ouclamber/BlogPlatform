import { MEDIA_URL } from '@/shared/lib/constants';

export default function Avatar({ user, size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';

  const getAvatarUrl = () => {
    const avatar = user?.avatar;
    if (!avatar) return null;

    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }

    if (avatar.startsWith('/media/')) {
      return `${MEDIA_URL}${avatar}`;
    }

    return `${MEDIA_URL}/media/${avatar}`;
  };

  const avatarUrl = getAvatarUrl();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={user?.username || 'Avatar'}
        loading="lazy"
        className={`${sizes[size]} rounded-full object-cover ${className}`}
        onError={(e) => {
          console.error('Аватар не загрузился:', avatarUrl);
          e.target.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold ${className}`}
    >
      {initials}
    </div>
  );
}