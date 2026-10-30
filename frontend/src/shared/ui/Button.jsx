import { Link } from 'react-router-dom';

const variants = {
  primary:
    'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow-sm hover:shadow-glow hover:from-primary-700 hover:to-primary-600',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  outline:
    'border border-gray-200 bg-white text-gray-700 shadow-sm hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
};

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  loading,
  className = '',
  type = 'button',
  ...props
}) {
  const baseClass = [
    'relative inline-flex items-center justify-center gap-2 rounded-xl font-medium',
    'transition-all duration-200 ease-out active:scale-[0.97]',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    className,
  ].join(' ');

  if (to && !loading) {
    return (
      <Link to={to} className={baseClass} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={baseClass}
      aria-busy={loading || undefined}
      {...props}
      disabled={loading || props.disabled}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
