import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from './RegisterPage';
import useAuthStore from '@/entities/user/model/authStore';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('рендерит форму регистрации', () => {
    useAuthStore.setState({ isAuthenticated: false });
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Регистрация')).toBeInTheDocument();
    expect(screen.getByText('Создайте новый аккаунт')).toBeInTheDocument();
  });

  it('редиректит, если пользователь уже авторизован', () => {
    useAuthStore.setState({ isAuthenticated: true });
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );
    expect(mockedNavigate).toHaveBeenCalledWith('/');
  });
});