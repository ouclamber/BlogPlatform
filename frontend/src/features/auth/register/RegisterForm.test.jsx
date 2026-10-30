import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RegisterForm from './RegisterForm';
import useAuthStore from '@/entities/user/model/authStore';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isLoading: false });
  });

  const renderForm = () =>
    render(
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    );

  it('рендерит поля и выбор роли', () => {
    renderForm();
    expect(screen.getByText('Читатель')).toBeInTheDocument();
    expect(screen.getByText('Автор')).toBeInTheDocument();
    // Ищем по name
    expect(document.querySelector('input[name="username"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="email"]')).toBeInTheDocument();
  });

  it('показывает ошибку, если пароли не совпадают', async () => {
    renderForm();

    await userEvent.type(document.querySelector('input[name="username"]'), 'user');
    await userEvent.type(document.querySelector('input[name="email"]'), 'test@test.com');
    await userEvent.type(document.querySelector('input[name="password"]'), 'pass12345');
    await userEvent.type(document.querySelector('input[name="password2"]'), 'diff12345');
    
    await userEvent.click(screen.getByRole('button', { name: /Зарегистрироваться/i }));

    expect(screen.getByText('Пароли не совпадают')).toBeInTheDocument();
  });

  it('вызывает register при успешной валидации', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ success: true });
    useAuthStore.setState({ register: mockRegister });

    renderForm();

    await userEvent.type(document.querySelector('input[name="username"]'), 'newuser');
    await userEvent.type(document.querySelector('input[name="email"]'), 'new@test.com');
    await userEvent.type(document.querySelector('input[name="password"]'), 'pass12345');
    await userEvent.type(document.querySelector('input[name="password2"]'), 'pass12345');
    
    await userEvent.click(screen.getByRole('button', { name: /Зарегистрироваться/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
      expect(mockedNavigate).toHaveBeenCalledWith('/login');
    });
  });
});