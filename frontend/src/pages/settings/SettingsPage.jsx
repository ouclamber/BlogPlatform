import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  EnvelopeIcon,
  PhotoIcon,
  XMarkIcon,
  LockClosedIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import useAuthStore from '../../entities/user/model/authStore';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import Loader from '../../shared/ui/Loader';
import Avatar from '../../entities/user/ui/Avatar';
import { MEDIA_URL } from '../../shared/lib/constants';

const DJANGO_ADMIN_URL =
  import.meta.env.VITE_DJANGO_ADMIN_URL || 'http://127.0.0.1:8000/admin/';

export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    user,
    isLoading,
    updateMe,
    uploadAvatar,
    changePassword,
    fetchMe,
    logout,
  } = useAuthStore();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bio: '',
  });

  const [passwords, setPasswords] = useState({
    old_password: '',
    new_password: '',
    new_password2: '',
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
      });
    } else {
      fetchMe();
    }
  }, [user, fetchMe]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимум 5 МБ.');
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Разрешены: jpeg, png, webp, gif');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
    setAvatarFile(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!formData.username.trim() || formData.username.length < 3) {
      newErrors.username = 'Минимум 3 символа';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email обязателен';
    }

    const wantsPasswordChange =
      passwords.old_password ||
      passwords.new_password ||
      passwords.new_password2;

    if (wantsPasswordChange) {
      if (!passwords.old_password) {
        newErrors.old_password = 'Введите старый пароль';
      }
      if (!passwords.new_password || passwords.new_password.length < 8) {
        newErrors.new_password = 'Минимум 8 символов';
      }
      if (passwords.new_password !== passwords.new_password2) {
        newErrors.new_password2 = 'Пароли не совпадают';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Проверьте форму');
      return;
    }

    setSaving(true);

    const result = await updateMe({
      username: formData.username.trim(),
      email: formData.email.trim(),
      bio: formData.bio.trim(),
    });

    if (!result.success) {
      setSaving(false);
      const errorMsg =
        typeof result.error === 'object'
          ? Object.values(result.error).flat().join(', ')
          : 'Ошибка сохранения';
      toast.error(errorMsg);
      if (typeof result.error === 'object') setErrors(result.error);
      return;
    }

    if (avatarFile) {
      const avatarResult = await uploadAvatar(avatarFile);
      if (!avatarResult.success) {
        toast.error('Ошибка загрузки аватара');
        setSaving(false);
        return;
      }
      setAvatarFile(null);
      setAvatarPreview(null);
    }

    if (wantsPasswordChange) {
      const pwdResult = await changePassword(
        passwords.old_password,
        passwords.new_password,
      );

      if (!pwdResult.success) {
        const errorMsg =
          typeof pwdResult.error === 'object'
            ? Object.values(pwdResult.error).flat().join(', ')
            : 'Ошибка смены пароля';
        toast.error(errorMsg);
        if (typeof pwdResult.error === 'object') setErrors(pwdResult.error);
        setSaving(false);
        return;
      }

      setPasswords({
        old_password: '',
        new_password: '',
        new_password2: '',
      });
    }

    setSaving(false);
    toast.success('Изменения сохранены');
    fetchMe();
  };

  const handleLogout = () => {
    if (!confirm('Выйти из аккаунта?')) return;
    logout();
    navigate('/login');
  };

  if (isLoading && !user) return <Loader fullScreen />;

  const currentAvatar = user?.avatar
    ? user.avatar.startsWith('http')
      ? user.avatar
      : `${MEDIA_URL}${user.avatar}`
    : null;

  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Настройки профиля
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Аватар
          </h2>

          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              {avatarPreview || currentAvatar ? (
                <img
                  src={avatarPreview || currentAvatar}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                />
              ) : (
                <Avatar user={user} size="xl" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition">
                  <PhotoIcon className="w-5 h-5" />
                  <span>Загрузить</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>

                {(avatarFile || avatarPreview) && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-2 px-4 py-2 text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    <XMarkIcon className="w-5 h-5" />
                    Отменить
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG, WEBP, GIF · Максимум 5 МБ
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Основная информация
          </h2>

          <Input
            label="Имя пользователя *"
            name="username"
            value={formData.username}
            onChange={handleChange}
            icon={UserIcon}
            error={errors.username}
            required
            maxLength={150}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              О себе
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Расскажите о себе..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none bg-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              {formData.bio.length}/500
            </p>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Смена пароля
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Заполните только если хотите сменить пароль
            </p>
          </div>

          <Input
            label="Старый пароль"
            name="old_password"
            type="password"
            value={passwords.old_password}
            onChange={handlePasswordChange}
            icon={LockClosedIcon}
            error={errors.old_password}
            placeholder="Оставьте пустым, если не меняете"
          />

          <Input
            label="Новый пароль"
            name="new_password"
            type="password"
            value={passwords.new_password}
            onChange={handlePasswordChange}
            icon={LockClosedIcon}
            error={errors.new_password}
            placeholder="Минимум 8 символов"
          />

          <Input
            label="Подтверждение нового пароля"
            name="new_password2"
            type="password"
            value={passwords.new_password2}
            onChange={handlePasswordChange}
            icon={LockClosedIcon}
            error={errors.new_password2}
            placeholder="Повторите новый пароль"
          />
        </div>

        {isAdmin && (
          <div className="card p-6 border-red-200 bg-red-50">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <ShieldCheckIcon className="w-6 h-6 text-red-600" />
              </div>

              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Администрирование
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Управление пользователями, постами, комментариями,
                  категориями и тегами.
                </p>

                <a
                  href={DJANGO_ADMIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  <ShieldCheckIcon className="w-5 h-5" />
                  Открыть Django Admin
                  <span className="ml-1 text-xs opacity-80">↗</span>
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button type="submit" loading={saving} disabled={saving}>
              Сохранить изменения
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={saving}
            >
              Отмена
            </Button>
          </div>

          <Button
            type="button"
            variant="danger"
            onClick={handleLogout}
            disabled={saving}
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Выйти из аккаунта
          </Button>
        </div>
      </form>
    </div>
  );
}