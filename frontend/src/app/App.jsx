import { Routes, Route } from 'react-router-dom';
import { useEffect, lazy } from 'react';

import MainLayout from '@/widgets/layout/MainLayout';
import useAuthStore from '@/entities/user/model/authStore';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';

// Ленивая загрузка страниц
const HomePage = lazy(() => import('@/pages/home/HomePage'));
const LoginPage = lazy(() => import('@/pages/login/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/register/RegisterPage'));
const PostDetailPage = lazy(() => import('@/pages/post-detail/PostDetailPage'));
const CreatePostPage = lazy(() => import('@/pages/create-post/CreatePostPage'));
const EditPostPage = lazy(() => import('@/pages/edit-post/EditPostPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const MyPostsPage = lazy(() => import('@/pages/my-posts/MyPostsPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));

const protect = (element) => <ProtectedRoute>{element}</ProtectedRoute>;

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    if (isAuthenticated) fetchMe();
  }, [isAuthenticated, fetchMe]);

  // Раньше внутри layout-маршрута «*» был вложен второй <Routes> — роутер не видел
  // реальную структуру, а Suspense перемонтировал всё дерево. Теперь маршруты плоские,
  // Suspense и ErrorBoundary — в MainLayout вокруг <Outlet />.
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/posts/:slug" element={<PostDetailPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/create" element={protect(<CreatePostPage />)} />
        <Route path="/posts/:slug/edit" element={protect(<EditPostPage />)} />
        <Route path="/my-posts" element={protect(<MyPostsPage />)} />
        <Route path="/settings" element={protect(<SettingsPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
