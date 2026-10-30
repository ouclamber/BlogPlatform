import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  UserGroupIcon,
  PencilSquareIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import useAuthStore from '@/entities/user/model/authStore';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import PasswordStrength from '@/shared/ui/PasswordStrength';

const REGISTER_ROLES = [
  {
    value: 'reader',
    label: 'Читатель',
    description: 'Читать посты, оставлять комментарии и лайки',
    icon: UserGroupIcon,
  },
  {
    value: 'author',
    label: 'Автор',
    description: 'Создавать и публиковать свои посты',
    icon: PencilSquareIcon,
  },
];

export default function RegisterForm() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    bio: '',
    role: 'reader',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.password2) {
      setErrors({ password2: 'Пароли не совпадают' });
      return;
    }

    const result = await register({ ...formData, username: formData.username.trim(), email: formData.email.trim() });

    if (result.success) {
      toast.success('Регистрация успешна! Теперь войдите.');
      navigate('/login');
    } else {
      if (typeof result.error === 'object') setErrors(result.error);
      toast.error('Ошибка регистрации');
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-gray-700">Кто вы? *</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {REGISTER_ROLES.map((roleOption) => {
              const Icon = roleOption.icon;
              const isSelected = formData.role === roleOption.value;

              return (
                <button
                  key={roleOption.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setFormData((prev) => ({ ...prev, role: roleOption.value }))}
                  className={`relative rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-glow-sm'
                      : 'border-gray-200 bg-white hover:-translate-y-0.5 hover:border-primary-200'
                  }`}
                >
                  {isSelected && (
                    <CheckCircleIcon className="absolute right-3 top-3 h-5 w-5 animate-scale-in text-primary-600" />
                  )}
                  <Icon className={`mb-2 h-6 w-6 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`} />
                  <p className={`font-semibold ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                    {roleOption.label}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{roleOption.description}</p>
                </button>
              );
            })}
          </div>
          {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
        </fieldset>

        <Input
          label="Имя пользователя *"
          name="username"
          value={formData.username}
          onChange={handleChange}
          icon={UserIcon}
          error={errors.username}
          autoComplete="username"
          maxLength={150}
          required
          autoFocus
        />

        <Input
          label="Email *"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          icon={EnvelopeIcon}
          error={errors.email}
          autoComplete="email"
          required
        />

        <div>
          <Input
            label="Пароль *"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            icon={LockClosedIcon}
            error={errors.password}
            autoComplete="new-password"
            required
          />
          <PasswordStrength password={formData.password} />
        </div>

        <Input
          label="Подтверждение пароля *"
          name="password2"
          type="password"
          value={formData.password2}
          onChange={handleChange}
          icon={LockClosedIcon}
          error={errors.password2}
          autoComplete="new-password"
          required
        />

        <div>
          <label htmlFor="register-bio" className="mb-1.5 block text-sm font-medium text-gray-700">
            О себе (необязательно)
          </label>
          <textarea
            id="register-bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Расскажите о себе..."
            rows={3}
            maxLength={500}
            className="input resize-none"
          />
        </div>

        {errors.detail && <p className="text-sm text-red-600">{errors.detail}</p>}

        <Button type="submit" className="w-full" size="lg" loading={isLoading} disabled={isLoading}>
          Зарегистрироваться как {REGISTER_ROLES.find((r) => r.value === formData.role)?.label}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700 hover:underline">
          Войти
        </Link>
      </div>
    </>
  );
}
