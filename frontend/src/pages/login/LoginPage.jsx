import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import useAuthStore from '@/entities/user/model/authStore';
import LoginForm from '@/features/auth/login/LoginForm';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Вход</h1>
            <p className="text-gray-500">Войдите в свой аккаунт</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}