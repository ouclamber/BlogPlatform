import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import MainLayout from './MainLayout';
import useAuthStore from '@/entities/user/model/authStore';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  const renderLayout = () =>
    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>
    );

  it('рендерит хедер и футер', () => {
    renderLayout();
    expect(screen.getByText('Blog Platform')).toBeInTheDocument();
    expect(screen.getByText(/2026 Blog Platform/)).toBeInTheDocument();
  });

  it('показывает кнопки входа/регистрации для анонимов', () => {
    renderLayout();
    expect(screen.getByText('Войти')).toBeInTheDocument();
    expect(screen.getByText('Регистрация')).toBeInTheDocument();
  });

  it('показывает меню профиля для авторизованного', async () => {
    useAuthStore.setState({
      user: { username: 'test', role: 'author', email: 'test@test.com' },
      isAuthenticated: true,
      logout: vi.fn(),
    });
    
    renderLayout();
    
    await userEvent.click(screen.getByText('test'));
    
    expect(screen.getByText('Профиль')).toBeInTheDocument();
    expect(screen.getByText('Мои посты')).toBeInTheDocument();
    expect(screen.getByText('Настройки')).toBeInTheDocument();
    expect(screen.getByText('Выйти')).toBeInTheDocument();
  });

  it('выполняет поиск при отправке формы', async () => {
    renderLayout();
    
    const searchInput = screen.getByPlaceholderText('Поиск постов...');
    await userEvent.type(searchInput, 'test query');
    
    await userEvent.keyboard('{Enter}');
    
    expect(mockedNavigate).toHaveBeenCalledWith('/?search=test%20query');
  });

  it('вызывает logout при клике на "Выйти"', async () => {
    const mockLogout = vi.fn();
    useAuthStore.setState({
      user: { username: 'test', role: 'author', email: 'test@test.com' },
      isAuthenticated: true,
      logout: mockLogout,
    });
    
    renderLayout();
    
    await userEvent.click(screen.getByText('test'));
    
    await userEvent.click(screen.getByText('Выйти'));
    
    expect(mockLogout).toHaveBeenCalled();
    expect(mockedNavigate).toHaveBeenCalledWith('/login');
  });
});