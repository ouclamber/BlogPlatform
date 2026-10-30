export default function Loader({ fullScreen = false, label = 'Загрузка…' }) {
  const spinner = (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary-400/30 blur-xl" />
        <svg className="relative h-10 w-10 animate-spin text-primary-600" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );

  if (fullScreen) {
    return <div className="flex min-h-screen items-center justify-center">{spinner}</div>;
  }

  return <div className="flex justify-center py-10">{spinner}</div>;
}
