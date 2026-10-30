import { HomeIcon } from '@heroicons/react/24/outline';
import Button from '@/shared/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="animate-fade-in-up text-center">
        <h1 className="text-gradient animate-float text-8xl font-black tracking-tighter sm:text-9xl">404</h1>
        <h2 className="mb-3 mt-4 text-2xl font-bold text-gray-900">Страница не найдена</h2>
        <p className="mx-auto mb-8 max-w-sm text-gray-500">
          Возможно, пост был удалён или ссылка содержит опечатку.
        </p>
        <Button to="/" size="lg">
          <HomeIcon className="h-5 w-5" />
          На главную
        </Button>
      </div>
    </div>
  );
}
