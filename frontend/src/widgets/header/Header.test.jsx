import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import useAuthStore from '@/entities/user/model/authStore';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  const renderHeader = () =>
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

  it('показывает кнопки Войти/Регистрация для анонимов', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: /Войти/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Регистрация/i })).toBeInTheDocument();
  });

  it('показывает имя пользователя и меню при клике (автор)', async () => {
    useAuthStore.setState({
      user: { id: 1, username: 'author1', role: 'author', email: 'a@a.com' },
      isAuthenticated: true,
    });

    renderHeader();

    // Кнопка "Создать" должна быть видна
    expect(screen.getByText('Создать')).toBeInTheDocument();

    // Открываем меню
    await userEvent.click(screen.getByText('author1'));
    
    // Пункт "Мои посты" должен быть
    expect(screen.getByText('Мои посты')).toBeInTheDocument();
    expect(screen.getByText('Профиль')).toBeInTheDocument();
  });

  it('НЕ показывает "Мои посты" для читателя', async () => {
    useAuthStore.setState({
      user: { id: 2, username: 'reader1', role: 'reader', email: 'r@r.com' },
      isAuthenticated: true,
    });

    renderHeader();

    // Кнопки "Создать" быть не должно
    expect(screen.queryByText('Создать')).not.toBeInTheDocument();

    // Открываем меню
    await userEvent.click(screen.getByText('reader1'));
    
    // Пункта "Мои посты" быть не должно
    expect(screen.queryByText('Мои посты')).not.toBeInTheDocument();
  });

  it('показывает админ-панель для админа', () => {
    useAuthStore.setState({
      user: { id: 3, username: 'admin', role: 'admin', email: 'adm@adm.com' },
      isAuthenticated: true,
    });

    renderHeader();
    expect(screen.getByText('Админ-панель')).toBeInTheDocument();
  });

  it('вызывает logout при клике на "Выйти"', async () => {
    const mockLogout = vi.fn();
    useAuthStore.setState({
      user: { id: 1, username: 'test', role: 'author', email: 't@t.com' },
      isAuthenticated: true,
      logout: mockLogout,
    });

    renderHeader();
    
    // Открываем меню
    await userEvent.click(screen.getByText('test'));
    
    // Кликаем "Выйти"
    await userEvent.click(screen.getByText('Выйти'));
    
    expect(mockLogout).toHaveBeenCalled();
    expect(mockedNavigate).toHaveBeenCalledWith('/login');
  });
});