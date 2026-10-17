export default function Loader({ fullScreen = false }) {
  const spinner = (
    <svg className="animate-spin h-8 w-8 text-primary-600" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">{spinner}</div>
    );
  }

  return <div className="flex justify-center py-8">{spinner}</div>;
}