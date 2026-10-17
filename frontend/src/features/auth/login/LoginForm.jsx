import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import useAuthStore from '@/entities/user/model/authStore';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(formData.username, formData.password);

    if (result.success) {
      toast.success('Добро пожаловать!');
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } else {
      toast.error('Ошибка входа');
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Имя пользователя"
          name="username"
          value={formData.username}
          onChange={handleChange}
          icon={UserIcon}
          error={errors.username}
          required
          autoFocus
        />

        <Input
          label="Пароль"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          icon={LockClosedIcon}
          error={errors.password}
          required
        />

        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
          disabled={isLoading}
        >
          Войти
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500">
        Нет аккаунта?{' '}
        <Link
          to="/register"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Зарегистрироваться
        </Link>
      </div>
    </>
  );
}