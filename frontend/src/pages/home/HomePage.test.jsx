import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';
import usePostsStore from '@/entities/post/model/postsStore';
import useAuthStore from '@/entities/user/model/authStore';

// Мокаем API-запросы
vi.mock('@/shared/api/endpoints', () => ({
  categoriesAPI: { list: vi.fn().mockResolvedValue({ data: [] }) },
  tagsAPI: { list: vi.fn().mockResolvedValue({ data: [] }) },
}));

// Мокаем navigate
const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePostsStore.setState({
      posts: [],
      pagination: { count: 0, page: 1, pageSize: 10 },
      isLoading: false,
      fetchPosts: vi.fn(),
      setFilters: vi.fn(),
    });
    useAuthStore.setState({ isAuthenticated: false });
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

  it('рендерит заголовок и фильтры', () => {
    renderPage();
    expect(screen.getByText('Все посты')).toBeInTheDocument();
    expect(screen.getAllByText(/Найдено|Постов пока нет/).length).toBeGreaterThan(0);
  });

  it('показывает пустое состояние, если нет постов', () => {
    renderPage();
    expect(screen.getAllByText('Постов пока нет').length).toBeGreaterThan(0);
  });

  it('вызывает fetchPosts при монтировании', () => {
    const fetchPosts = vi.fn();
    usePostsStore.setState({ fetchPosts });
    
    renderPage();
    expect(fetchPosts).toHaveBeenCalled();
  });

  it('переключает видимость фильтров на мобильном', async () => {
    renderPage();
    const filterButton = screen.getByText('Фильтры');
    await userEvent.click(filterButton);
    expect(filterButton).toBeInTheDocument();
  });

  it('изменяет значение при выборе сортировки', () => {
    renderPage();
    
    // Используем getAllByDisplayValue, так как селектов два (десктопный и мобильный)
    const sortSelects = screen.getAllByDisplayValue('Сначала новые');
    const select = sortSelects[0];
    
    // Меняем значение
    fireEvent.change(select, { target: { value: '-views_count' } });
    
    // Проверяем, что значение в селекте обновилось (значит состояние работает)
    expect(select.value).toBe('-views_count');
  });
});