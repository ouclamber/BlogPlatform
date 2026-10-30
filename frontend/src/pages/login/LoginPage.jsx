import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import useAuthStore from '@/entities/user/model/authStore';
import LoginForm from '@/features/auth/login/LoginForm';
import AuthCard from '@/shared/ui/AuthCard';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  return (
    <AuthCard title="Вход" subtitle="Войдите в свой аккаунт">
      <LoginForm />
    </AuthCard>
  );
}
