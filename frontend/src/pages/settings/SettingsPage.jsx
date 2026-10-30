import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  EnvelopeIcon,
  PhotoIcon,
  XMarkIcon,
  LockClosedIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  KeyIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import useAuthStore from '@/entities/user/model/authStore';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import Loader from '@/shared/ui/Loader';
import PasswordStrength from '@/shared/ui/PasswordStrength';
import Avatar from '@/entities/user/ui/Avatar';
import { DJANGO_ADMIN_URL } from '@/shared/lib/constants';

const MAX_AVATAR_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

function Section({ icon: Icon, title, subtitle, children, className = '' }) {
  return (
    <section className={`card animate-fade-in-up p-6 ${className}`}>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const updateMe = useAuthStore((s) => s.updateMe);
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar);
  const changePassword = useAuthStore((s) => s.changePassword);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const logout = useAuthStore((s) => s.logout);

  const [formData, setFormData] = useState({ username: '', email: '', bio: '' });
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '', new_password2: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const previewUrlRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData({ username: user.username || '', email: user.email || '', bio: user.bio || '' });
    } else {
      fetchMe();
    }
  }, [user, fetchMe]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL?.(previewUrlRef.current);
    },
    []
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      toast.error(`Файл слишком большой. Максимум ${MAX_AVATAR_MB} МБ.`);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Разрешены: jpeg, png, webp, gif');
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL?.(previewUrlRef.current);
    if (typeof URL.createObjectURL === 'function') {
      previewUrlRef.current = URL.createObjectURL(file);
      setAvatarPreview(previewUrlRef.current);
    } else {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
    setAvatarFile(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const showErrors = (error, fallback) => {
    const message = typeof error === 'object' && error ? Object.values(error).flat().join(', ') : fallback;
    toast.error(message || fallback);
    if (typeof error === 'object' && error) setErrors((prev) => ({ ...prev, ...error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (formData.username.trim().length < 3) newErrors.username = 'Минимум 3 символа';
    if (!formData.email.trim()) newErrors.email = 'Email обязателен';

    const wantsPasswordChange = passwords.old_password || passwords.new_password || passwords.new_password2;

    if (wantsPasswordChange) {
      if (!passwords.old_password) newErrors.old_password = 'Введите старый пароль';
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
    try {
      const result = await updateMe({
        username: formData.username.trim(),
        email: formData.email.trim(),
        bio: formData.bio.trim(),
      });
      if (!result?.success) {
        showErrors(result?.error, 'Ошибка сохранения');
        return;
      }

      if (avatarFile) {
        const avatarResult = await uploadAvatar(avatarFile);
        if (!avatarResult?.success) {
          showErrors(avatarResult?.error, 'Ошибка загрузки аватара');
          return;
        }
        handleRemoveAvatar();
      }

      if (wantsPasswordChange) {
        const pwdResult = await changePassword(passwords.old_password, passwords.new_password);
        if (!pwdResult?.success) {
          showErrors(pwdResult?.error, 'Ошибка смены пароля');
          return;
        }
        setPasswords({ old_password: '', new_password: '', new_password2: '' });
      }

      toast.success('Изменения сохранены');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (!window.confirm('Выйти из аккаунта?')) return;
    logout();
    navigate('/login');
  };

  if (isLoading && !user) return <Loader fullScreen />;

  const isAdmin = user?.role === 'admin';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">Настройки профиля</h1>
      <p className="mb-8 text-gray-500">Управляйте аккаунтом, аватаром и безопасностью</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section icon={PhotoIcon} title="Аватар">
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary-500 to-primary-300 opacity-60 blur" />
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Новый аватар"
                  className="relative h-24 w-24 animate-scale-in rounded-full border-4 border-white object-cover"
                />
              ) : (
                <Avatar user={user} size="xl" className="relative border-4 border-white" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary-50 px-4 py-2 font-medium text-primary-700 transition hover:bg-primary-100">
                  <PhotoIcon className="h-5 w-5" />
                  <span>Загрузить</span>
                  <input type="file" accept={ALLOWED_TYPES.join(',')} onChange={handleAvatarChange} className="hidden" />
                </label>

                {avatarFile && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-red-600 transition hover:bg-red-50"
                  >
                    <XMarkIcon className="h-5 w-5" />
                    Отменить
                  </button>
                )}
              </div>

              <p className="mt-2 text-xs text-gray-500">JPG, PNG, WEBP, GIF · Максимум {MAX_AVATAR_MB} МБ</p>
            </div>
          </div>
        </Section>

        <Section icon={IdentificationIcon} title="Основная информация">
          <Input
            label="Имя пользователя *"
            name="username"
            value={formData.username}
            onChange={handleChange}
            icon={UserIcon}
            error={errors.username}
            autoComplete="username"
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
            autoComplete="email"
            required
          />

          <div>
            <label htmlFor="settings-bio" className="mb-1.5 block text-sm font-medium text-gray-700">
              О себе
            </label>
            <textarea
              id="settings-bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Расскажите о себе..."
              rows={4}
              maxLength={500}
              className="input resize-none"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{formData.bio.length}/500</p>
          </div>
        </Section>

        <Section icon={KeyIcon} title="Смена пароля" subtitle="Заполните только если хотите сменить пароль">
          <Input
            label="Старый пароль"
            name="old_password"
            type="password"
            value={passwords.old_password}
            onChange={handlePasswordChange}
            icon={LockClosedIcon}
            error={errors.old_password}
            autoComplete="current-password"
            placeholder="Оставьте пустым, если не меняете"
          />

          <div>
            <Input
              label="Новый пароль"
              name="new_password"
              type="password"
              value={passwords.new_password}
              onChange={handlePasswordChange}
              icon={LockClosedIcon}
              error={errors.new_password}
              autoComplete="new-password"
              placeholder="Минимум 8 символов"
            />
            <PasswordStrength password={passwords.new_password} />
          </div>

          <Input
            label="Подтверждение нового пароля"
            name="new_password2"
            type="password"
            value={passwords.new_password2}
            onChange={handlePasswordChange}
            icon={LockClosedIcon}
            error={errors.new_password2}
            autoComplete="new-password"
            placeholder="Повторите новый пароль"
          />
          <p className="text-xs text-gray-500">
            После смены пароля все остальные сеансы будут завершены.
          </p>
        </Section>

        {isAdmin && (
          <section className="card animate-fade-in-up border-red-200 bg-gradient-to-br from-red-50 to-white p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <ShieldCheckIcon className="h-6 w-6 text-red-600" />
              </div>

              <div className="flex-1">
                <h2 className="mb-1 text-lg font-semibold text-gray-900">Администрирование</h2>
                <p className="mb-4 text-sm text-gray-600">
                  Управление пользователями, постами, комментариями, категориями и тегами.
                </p>

                <a
                  href={DJANGO_ADMIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
                >
                  <ShieldCheckIcon className="h-5 w-5" />
                  Открыть Django Admin
                  <span className="ml-1 text-xs opacity-80">↗</span>
                </a>
              </div>
            </div>
          </section>
        )}

        <div className="glass sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 shadow-soft">
          <div className="flex items-center gap-3">
            <Button type="submit" loading={saving} disabled={saving}>
              Сохранить изменения
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={saving}>
              Отмена
            </Button>
          </div>

          <Button type="button" variant="danger" onClick={handleLogout} disabled={saving}>
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Выйти из аккаунта
          </Button>
        </div>
      </form>
    </div>
  );
}
