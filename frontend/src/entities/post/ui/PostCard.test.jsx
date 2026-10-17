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