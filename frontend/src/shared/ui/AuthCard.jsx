import { SparklesIcon } from '@heroicons/react/24/outline';

export default function AuthCard({ title, subtitle, children, maxWidth = 'max-w-md' }) {
  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className={`relative w-full ${maxWidth} animate-fade-in-up`}>
        {/* Свечение позади карточки */}
        <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-primary-400 via-primary-500 to-primary-300 opacity-20 blur-2xl" aria-hidden="true" />
        <div className="glass relative rounded-3xl p-8 shadow-glow sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-400 text-white shadow-glow">
              <SparklesIcon className="h-7 w-7" />
            </div>
            <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">{title}</h1>
            <p className="text-gray-500">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
