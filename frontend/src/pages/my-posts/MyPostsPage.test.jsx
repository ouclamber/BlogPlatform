import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import MyPostsPage from './MyPostsPage';
import usePostsStore from '@/entities/post/model/postsStore';
import useAuthStore from '@/entities/user/model/authStore';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock('@/widgets/post-list/PostList', () => ({
  default: () => <div data-testid="post-list">PostList Mock</div>,
}));

describe('MyPostsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePostsStore.setState({
      myPosts: [],
      myPagination: { count: 0, page: 1, pageSize: 10 },
      isMyPostsLoading: false,
      fetchMyPosts: vi.fn(),
      deletePost: vi.fn(),
    });
  });

  it('редиректит читателя на главную', () => {
    useAuthStore.setState({ user: { role: 'reader' } });
    render(
      <MemoryRouter>
        <MyPostsPage />
      </MemoryRouter>
    );
    expect(mockedNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('рендерит заголовок для автора', () => {
    useAuthStore.setState({ user: { role: 'author', username: 'test' } });
    render(
      <MemoryRouter>
        <MyPostsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Мои посты')).toBeInTheDocument();
  });

  it('рендерит кнопки "Создать пост" для автора', () => {
    useAuthStore.setState({ user: { role: 'author', username: 'test' } });
    render(
      <MemoryRouter>
        <MyPostsPage />
      </MemoryRouter>
    );
    const createButtons = screen.getAllByText('Создать пост');
    expect(createButtons.length).toBeGreaterThan(0);
  });

  it('показывает лоадер при загрузке', () => {
    useAuthStore.setState({ user: { role: 'author', username: 'test' } });
    usePostsStore.setState({ isMyPostsLoading: true });
    const { container } = render(
      <MemoryRouter>
        <MyPostsPage />
      </MemoryRouter>
    );
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('показывает пустое состояние, если нет постов', () => {
    useAuthStore.setState({ user: { role: 'author', username: 'test' } });
    usePostsStore.setState({ myPosts: [], isMyPostsLoading: false });
    render(
      <MemoryRouter>
        <MyPostsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('У вас пока нет постов')).toBeInTheDocument();
  });

  it('переключает активный фильтр при клике', async () => {
    useAuthStore.setState({ user: { role: 'author', username: 'test' } });
    usePostsStore.setState({
      myPosts: [
        { id: 1, title: 'Пост 1', status: 'published', slug: 'post-1', created_at: new Date().toISOString(), views_count: 0, likes_count: 0, comments_count: 0, cover_image: null },
        { id: 2, title: 'Пост 2', status: 'draft', slug: 'post-2', created_at: new Date().toISOString(), views_count: 0, likes_count: 0, comments_count: 0, cover_image: null },
      ],
      isMyPostsLoading: false,
    });

    render(
      <MemoryRouter>
        <MyPostsPage />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByText('Черновики'));
    
    expect(screen.getByText('Пост 2')).toBeInTheDocument();
    expect(screen.queryByText('Пост 1')).not.toBeInTheDocument();
  });

  it('вызывает deletePost при удалении поста', async () => {
    const mockDelete = vi.fn().mockResolvedValue({ success: true });
    usePostsStore.setState({
      myPosts: [
        { id: 1, title: 'Пост 1', status: 'published', slug: 'post-1', created_at: new Date().toISOString(), views_count: 0, likes_count: 0, comments_count: 0, cover_image: null },
      ],
      isMyPostsLoading: false,
      deletePost: mockDelete,
    });
    useAuthStore.setState({ user: { role: 'author', username: 'test' } });
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    render(
      <MemoryRouter>
        <MyPostsPage />
      </MemoryRouter>
    );

    const deleteButton = screen.getByTitle('Удалить');
    await userEvent.click(deleteButton);

    expect(mockDelete).toHaveBeenCalledWith('post-1');
  });
});