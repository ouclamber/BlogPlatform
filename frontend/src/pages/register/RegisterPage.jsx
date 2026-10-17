import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import useAuthStore from '@/entities/user/model/authStore';
import RegisterForm from '@/features/auth/register/RegisterForm';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Регистрация
            </h1>
            <p className="text-gray-500">Создайте новый аккаунт</p>
          </div>

          <RegisterForm />
        </div>
      </div>
    </div>
  );
}