import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import useAuthStore from '@/entities/user/model/authStore';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('рендерит форму входа', () => {
    useAuthStore.setState({ isAuthenticated: false });
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Вход')).toBeInTheDocument();
    expect(screen.getByText('Войдите в свой аккаунт')).toBeInTheDocument();
  });

  it('редиректит, если пользователь уже авторизован', () => {
    useAuthStore.setState({ isAuthenticated: true });
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(mockedNavigate).toHaveBeenCalledWith('/', { replace: true });
  });
});