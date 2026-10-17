import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProfilePage from './ProfilePage';
import useAuthStore from '@/entities/user/model/authStore';
import apiClient from '@/shared/api/client';
import { authAPI } from '@/shared/api/endpoints';

// Мокаем authAPI
vi.mock('@/shared/api/endpoints', () => ({
  authAPI: {
    getUserProfile: vi.fn(),
    toggleSubscription: vi.fn(),
  },
}));

// Мокаем apiClient (используется для загрузки постов)
vi.mock('@/shared/api/client', () => ({
  default: { get: vi.fn() },
}));

vi.mock('@/widgets/post-list/PostList', () => ({
  default: () => <div data-testid="post-list">PostList Mock</div>,
}));

describe('ProfilePage', () => {
  const mockProfile = {
    id: 2,
    username: 'testuser',
    bio: 'Мое био',
    role: 'author',
    created_at: new Date().toISOString(),
    is_subscribed: false,
    subscribers_count: 10,
    following_count: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null });

    // Мокаем загрузку профиля через authAPI
    authAPI.getUserProfile.mockResolvedValue({ data: mockProfile });

    // Мокаем загрузку постов через apiClient
    apiClient.get.mockResolvedValue({ data: { count: 0, results: [] } });
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/profile/testuser']}>
        <Routes>
          <Route path="/profile/:username" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>
    );

  it('показывает профиль после загрузки', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });
    expect(screen.getByText('Мое био')).toBeInTheDocument();
  });

  it('показывает кнопку "Подписаться" для чужого профиля', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Подписаться')).toBeInTheDocument();
    });
  });

  it('показывает кнопку "Отписаться", если уже подписан', async () => {
    authAPI.getUserProfile.mockResolvedValue({
      data: { ...mockProfile, is_subscribed: true },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Отписаться')).toBeInTheDocument();
    });
  });

  it('отображает кнопку "Редактировать профиль", если это мой профиль', async () => {
    useAuthStore.setState({ user: { id: 2, username: 'testuser', role: 'author' } });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Редактировать профиль')).toBeInTheDocument();
    });
  });

  it('показывает ссылку на админку для админа', async () => {
    useAuthStore.setState({ user: { id: 2, username: 'testuser', role: 'admin' } });
    authAPI.getUserProfile.mockResolvedValue({
      data: { ...mockProfile, role: 'admin' },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Админка')).toBeInTheDocument();
    });
  });

  it('вызывает toggleSubscription при клике на "Подписаться"', async () => {
    useAuthStore.setState({ user: { id: 1, username: 'me', role: 'reader' }, isAuthenticated: true });
    authAPI.toggleSubscription.mockResolvedValue({ data: { status: 'subscribed' } });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Подписаться')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Подписаться'));

    expect(authAPI.toggleSubscription).toHaveBeenCalledWith(mockProfile.id);
  });
});