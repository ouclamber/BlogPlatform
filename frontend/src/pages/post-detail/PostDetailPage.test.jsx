import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PostDetailPage from './PostDetailPage';
import usePostsStore from '@/entities/post/model/postsStore';
import useAuthStore from '@/entities/user/model/authStore';

// Мокаем API (комментарии) и дочерние компоненты, чтобы не тянуть лишнее
vi.mock('@/widgets/comment-list/CommentList', () => ({
  default: () => <div data-testid="comment-list">CommentList Mock</div>,
}));

vi.mock('@/features/post/actions/PostActions', () => ({
  default: () => <div data-testid="post-actions">PostActions Mock</div>,
}));

describe('PostDetailPage', () => {
  const mockPost = {
    id: 1,
    title: 'Тестовый пост',
    slug: 'test-post',
    content: 'Содержимое поста',
    status: 'published',
    cover_image: null,
    likes_count: 10,
    comments_count: 5,
    views_count: 100,
    reading_time: 3,
    created_at: new Date().toISOString(),
    author: { id: 1, username: 'author1', avatar: null },
    category: { id: 1, name: 'Наука', slug: 'nauka' },
    tags: [{ id: 1, name: 'python', slug: 'python' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null });
    usePostsStore.setState({
      currentPost: null,
      isLoading: false,
      fetchPost: vi.fn(),
      clearCurrentPost: vi.fn(),
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/posts/test-post']}>
        <Routes>
          <Route path="/posts/:slug" element={<PostDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('показывает лоадер, пока идет загрузка', () => {
    usePostsStore.setState({ isLoading: true, currentPost: null });
    const { container } = renderPage();
    // Loader рендерит svg (в нашем случае это спиннер)
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('показывает сообщение, если пост не найден', async () => {
    usePostsStore.setState({ isLoading: false, currentPost: null });
    renderPage();
    // Сообщение появляется только после завершения запроса (без «мигания»)
    expect(await screen.findByText('Пост не найден')).toBeInTheDocument();
  });

  it('рендерит пост, если он загружен', () => {
    usePostsStore.setState({ isLoading: false, currentPost: mockPost });
    renderPage();

    expect(screen.getByText('Тестовый пост')).toBeInTheDocument();
    expect(screen.getByText('Содержимое поста')).toBeInTheDocument();
    expect(screen.getByText('author1')).toBeInTheDocument();
    expect(screen.getByText('#python')).toBeInTheDocument();
    expect(screen.getByTestId('comment-list')).toBeInTheDocument();
  });
});
describe('PostDetailPage — лайк и обложка', () => {
  const post = {
    id: 1, title: 'Пост', slug: 'test-post', content: 'Текст', status: 'published',
    cover_image: '/media/covers/x.png', likes_count: 3, comments_count: 0, views_count: 1,
    is_liked: false, created_at: new Date().toISOString(),
    author: { id: 5, username: 'writer' }, category: null, tags: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    usePostsStore.setState({
      currentPost: post, isLoading: false, fetchPost: vi.fn(), clearCurrentPost: vi.fn(),
      likePost: vi.fn(), unlikePost: vi.fn(),
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/posts/test-post']}>
        <Routes>
          <Route path="/posts/:slug" element={<PostDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('на странице поста можно поставить лайк', async () => {
    useAuthStore.setState({ user: { id: 1, role: 'reader' }, isAuthenticated: true });
    renderPage();
    await userEvent.click(screen.getByRole('button', { pressed: false, name: /3/ }));
    expect(usePostsStore.getState().likePost).toHaveBeenCalledWith('test-post');
  });

  it('аноним не может лайкнуть', () => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    renderPage();
    expect(screen.getByRole('button', { pressed: false, name: /3/ })).toBeDisabled();
  });

  it('обложка без захардкоженного 127.0.0.1', () => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    renderPage();
    const src = screen.getByAltText('Пост').getAttribute('src');
    expect(src).toMatch(/\/media\/covers\/x\.png$/);
  });
});
