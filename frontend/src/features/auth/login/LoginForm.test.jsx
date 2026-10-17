import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginForm from './LoginForm';
import useAuthStore from '@/entities/user/model/authStore';

// Мокаем navigate и location
const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
    useLocation: () => ({ state: { from: { pathname: '/profile' } } }),
  };
});

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isLoading: false });
  });

  const renderForm = () =>
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    );

  it('рендерит поля ввода и кнопку', () => {
    renderForm();
    // Ищем по атрибуту name, так как placeholder может отсутствовать
    expect(document.querySelector('input[name="username"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="password"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Войти/i })).toBeInTheDocument();
  });

  it('вызывает login и делает редирект при успехе', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: true });
    useAuthStore.setState({ login: mockLogin });

    renderForm();

    await userEvent.type(document.querySelector('input[name="username"]'), 'testuser');
    await userEvent.type(document.querySelector('input[name="password"]'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /Войти/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
      expect(mockedNavigate).toHaveBeenCalledWith('/profile', { replace: true });
    });
  });
});