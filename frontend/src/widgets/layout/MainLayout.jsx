import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Header from '@/widgets/header/Header';
import Footer from '@/widgets/footer/Footer';
import BackToTop from '@/shared/ui/BackToTop';
import ErrorBoundary from '@/shared/ui/ErrorBoundary';
import Loader from '@/shared/ui/Loader';

// Раньше MainLayout содержал полную копию кода Header и Footer
// (~200 строк дублирования, правки приходилось вносить в двух местах).
export default function MainLayout() {
  const location = useLocation();

  // Новая страница открывается сверху (смена ?page= и фильтров — не в счёт).
  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-gray-50">
      {/* Декоративный фон: мягкие пятна в цветах primary */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-96 w-96 animate-blob rounded-full bg-primary-200/40 blur-3xl" />
        <div
          className="absolute -right-24 top-1/3 h-80 w-80 animate-blob rounded-full bg-primary-300/30 blur-3xl"
          style={{ animationDelay: '-6s' }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-72 w-72 animate-blob rounded-full bg-primary-100/60 blur-3xl"
          style={{ animationDelay: '-12s' }}
        />
      </div>

      <Header />

      <main className="relative z-10 flex-1">
        {/* key по пути — плавное появление при переходе между страницами */}
        <div key={location.pathname} className="animate-fade-in">
          <ErrorBoundary>
            <Suspense fallback={<Loader fullScreen />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}
