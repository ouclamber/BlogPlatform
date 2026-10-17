import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  UserGroupIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import useAuthStore from '@/entities/user/model/authStore';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';

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
  const { register, isLoading } = useAuthStore();

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
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleRoleChange = (role) => {
    setFormData({ ...formData, role });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.password2) {
      setErrors({ password2: 'Пароли не совпадают' });
      return;
    }

    const result = await register(formData);

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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Кто вы? *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REGISTER_ROLES.map((roleOption) => {
              const Icon = roleOption.icon;
              const isSelected = formData.role === roleOption.value;

              return (
                <button
                  key={roleOption.value}
                  type="button"
                  onClick={() => handleRoleChange(roleOption.value)}
                  className={`p-4 rounded-lg border-2 text-left transition ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 mb-2 ${
                      isSelected ? 'text-primary-600' : 'text-gray-400'
                    }`}
                  />
                  <p
                    className={`font-semibold ${
                      isSelected ? 'text-primary-700' : 'text-gray-900'
                    }`}
                  >
                    {roleOption.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {roleOption.description}
                  </p>
                </button>
              );
            })}
          </div>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role}</p>
          )}
        </div>

        <Input
          label="Имя пользователя *"
          name="username"
          value={formData.username}
          onChange={handleChange}
          icon={UserIcon}
          error={errors.username}
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
          required
        />

        <Input
          label="Пароль *"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          icon={LockClosedIcon}
          error={errors.password}
          required
        />

        <Input
          label="Подтверждение пароля *"
          name="password2"
          type="password"
          value={formData.password2}
          onChange={handleChange}
          icon={LockClosedIcon}
          error={errors.password2}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            О себе (необязательно)
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Расскажите о себе..."
            rows={3}
            maxLength={500}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
          disabled={isLoading}
        >
          Зарегистрироваться как{' '}
          {REGISTER_ROLES.find((r) => r.value === formData.role)?.label}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500">
        Уже есть аккаунт?{' '}
        <Link
          to="/login"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Войти
        </Link>
      </div>
    </>
  );
}