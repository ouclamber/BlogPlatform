import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from './SettingsPage';
import useAuthStore from '@/entities/user/model/authStore';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 1, username: 'testuser', email: 'test@test.com', bio: 'Мое био', role: 'reader' },
      isLoading: false,
      fetchMe: vi.fn(),
      updateMe: vi.fn().mockResolvedValue({ success: true }),
      uploadAvatar: vi.fn().mockResolvedValue({ success: true }),
      changePassword: vi.fn().mockResolvedValue({ success: true }),
      logout: vi.fn(),
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

  it('рендерит поля с данными пользователя', () => {
    renderPage();
    expect(document.querySelector('input[name="username"]').value).toBe('testuser');
    expect(document.querySelector('input[name="email"]').value).toBe('test@test.com');
  });

  it('показывает ошибку, если новый пароль короткий', async () => {
    renderPage();
    await userEvent.type(document.querySelector('input[name="old_password"]'), 'oldpass123');
    await userEvent.type(document.querySelector('input[name="new_password"]'), 'short');
    await userEvent.type(document.querySelector('input[name="new_password2"]'), 'short');
    
    await userEvent.click(screen.getByRole('button', { name: /Сохранить изменения/i }));

    expect(screen.getByText('Минимум 8 символов')).toBeInTheDocument();
  });

  it('вызывает updateMe при сохранении', async () => {
    renderPage();
    
    await userEvent.click(screen.getByRole('button', { name: /Сохранить изменения/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().updateMe).toHaveBeenCalled();
    });
  });

  it('вызывает changePassword при вводе паролей', async () => {
    renderPage();
    
    await userEvent.type(document.querySelector('input[name="old_password"]'), 'oldpass123');
    await userEvent.type(document.querySelector('input[name="new_password"]'), 'newpass123');
    await userEvent.type(document.querySelector('input[name="new_password2"]'), 'newpass123');
    
    await userEvent.click(screen.getByRole('button', { name: /Сохранить изменения/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().changePassword).toHaveBeenCalledWith('oldpass123', 'newpass123');
    });
  });

  it('показывает кнопку загрузки аватара', () => {
    renderPage();
    expect(screen.getByText('Загрузить')).toBeInTheDocument();
  });

  it('вызывает logout при клике на "Выйти из аккаунта"', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    renderPage();
    
    await userEvent.click(screen.getByRole('button', { name: /Выйти из аккаунта/i }));
    
    expect(useAuthStore.getState().logout).toHaveBeenCalled();
  });
});