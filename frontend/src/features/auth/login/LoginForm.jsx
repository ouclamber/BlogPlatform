import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import useAuthStore from '@/entities/user/model/authStore';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '', detail: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(formData.username.trim(), formData.password);

    if (result.success) {
      toast.success('Добро пожаловать!');
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } else {
      setErrors(typeof result.error === 'object' ? result.error : {});
      toast.error('Ошибка входа');
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.detail && (
          <div role="alert" className="animate-scale-in rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.detail === 'No active account found with the given credentials'
              ? 'Неверное имя пользователя или пароль'
              : errors.detail}
          </div>
        )}

        <Input
          label="Имя пользователя"
          name="username"
          value={formData.username}
          onChange={handleChange}
          icon={UserIcon}
          error={errors.username}
          autoComplete="username"
          required
          autoFocus
        />

        <div className="relative">
          <Input
            label="Пароль"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            icon={LockClosedIcon}
            error={errors.password}
            autoComplete="current-password"
            className="pr-11"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-[2.35rem] rounded-md p-1 text-gray-400 transition hover:text-primary-600"
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isLoading} disabled={isLoading}>
          Войти
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500">
        Нет аккаунта?{' '}
        <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700 hover:underline">
          Зарегистрироваться
        </Link>
      </div>
    </>
  );
}
