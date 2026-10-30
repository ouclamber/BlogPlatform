import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // <-- ДОБАВЛЕН ИМПОРТ
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PostCard from './PostCard';
import useAuthStore from '@/entities/user/model/authStore';
import usePostsStore from '@/entities/post/model/postsStore';

// Мокаем navigate
const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

const mockPost = {
  id: 1,
  title: 'Тестовый пост',
  slug: 'test-post',
  excerpt: 'Это краткое описание тестового поста',
  cover_image: null,
  likes_count: 5,
  comments_count: 2,
  views_count: 10,
  is_liked: false,
  created_at: new Date().toISOString(),
  author: { id: 10, username: 'author1', avatar: null },
  category: { id: 1, name: 'Наука', slug: 'nauka' },
  tags: [{ id: 1, name: 'python' }],
};

describe('PostCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { id: 2, role: 'reader' }, isAuthenticated: true });
  });

  const renderCard = () =>
    render(
      <MemoryRouter>
        <PostCard post={mockPost} />
      </MemoryRouter>
    );

  it('рендерит заголовок, категорию, теги и статистику', () => {
    renderCard();
    expect(screen.getByText('Тестовый пост')).toBeInTheDocument();
    expect(screen.getByText('Наука')).toBeInTheDocument();
    expect(screen.getByText('#python')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // Лайки
    expect(screen.getByText('2')).toBeInTheDocument(); // Комментарии
  });

  it('переходит на страницу поста при клике на карточку', async () => {
    renderCard();
    await userEvent.click(screen.getByText('Тестовый пост'));
    expect(mockedNavigate).toHaveBeenCalledWith('/posts/test-post');
  });

  it('вызывает likePost при клике на сердечко', async () => {
    const mockLike = vi.fn().mockResolvedValue({ success: true });
    usePostsStore.setState({ likePost: mockLike, unlikePost: vi.fn() });

    renderCard();
    // Ищем кнопку лайка (по числу 5)
    const likeButton = screen.getByText('5').closest('button');
    
    // Используем userEvent.click с await
    await userEvent.click(likeButton);
    expect(mockLike).toHaveBeenCalledWith('test-post');
  });
});
describe('PostCard — доступность и UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { id: 2, role: 'reader' }, isAuthenticated: true });
  });

  const renderWith = (post) =>
    render(
      <MemoryRouter>
        <PostCard post={post} />
      </MemoryRouter>
    );

  it('открывается с клавиатуры по Enter', async () => {
    renderWith(mockPost);
    const card = screen.getByRole('link', { name: 'Тестовый пост' });
    card.focus();
    await userEvent.keyboard('{Enter}');
    expect(mockedNavigate).toHaveBeenCalledWith('/posts/test-post');
  });

  it('автор не может лайкнуть свой пост', () => {
    useAuthStore.setState({ user: { id: 10, role: 'author' }, isAuthenticated: true });
    renderWith(mockPost);
    expect(screen.getByRole('button', { name: 'Поставить лайк' })).toBeDisabled();
  });

  it('относительный путь обложки превращается в полный URL', () => {
    renderWith({ ...mockPost, cover_image: '/media/covers/a.png' });
    const img = screen.getByAltText('Тестовый пост');
    expect(img.getAttribute('src')).toMatch(/\/media\/covers\/a\.png$/);
    expect(img.getAttribute('src')).not.toBe('/media/covers/a.png');
  });

  it('клик по лайку не открывает пост', async () => {
    const likePost = vi.fn();
    usePostsStore.setState({ likePost });
    renderWith(mockPost);
    await userEvent.click(screen.getByRole('button', { name: 'Поставить лайк' }));
    expect(likePost).toHaveBeenCalledWith('test-post');
    expect(mockedNavigate).not.toHaveBeenCalled();
  });
});
