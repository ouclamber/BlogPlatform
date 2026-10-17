import { Routes, Route } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';

import MainLayout from '@/widgets/layout/MainLayout';
import useAuthStore from '@/entities/user/model/authStore';
import ProtectedRoute from '@/shared/ui/ProtectedRoute';
import Loader from '@/shared/ui/Loader';

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

function App() {
  const { isAuthenticated, fetchMe } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchMe();
    }
  }, [isAuthenticated, fetchMe]);

  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Оборачиваем всё в Suspense, чтобы показывать лоадер во время загрузки чанка */}
        <Route
          path="*"
          element={
            <Suspense fallback={<Loader fullScreen />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/posts/:slug" element={<PostDetailPage />} />
                <Route path="/profile/:username" element={<ProfilePage />} />

                <Route
                  path="/create"
                  element={
                    <ProtectedRoute>
                      <CreatePostPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/posts/:slug/edit"
                  element={
                    <ProtectedRoute>
                      <EditPostPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-posts"
                  element={
                    <ProtectedRoute>
                      <MyPostsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;