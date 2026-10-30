import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import useAuthStore from '@/entities/user/model/authStore';
import RegisterForm from '@/features/auth/register/RegisterForm';
import AuthCard from '@/shared/ui/AuthCard';

export default function RegisterPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  return (
    <AuthCard title="Регистрация" subtitle="Создайте новый аккаунт" maxWidth="max-w-lg">
      <RegisterForm />
    </AuthCard>
  );
}
