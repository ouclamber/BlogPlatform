import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EditPostPage from './EditPostPage';
import usePostsStore from '@/entities/post/model/postsStore';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

// Мокаем форму
vi.mock('@/features/post/edit/EditPostForm', () => ({
  default: () => <div data-testid="edit-post-form">Form Mock</div>,
}));

describe('EditPostPage', () => {
  const mockPost = {
    id: 1,
    slug: 'test-post',
    title: 'Тестовый пост',
    content: 'Контент',
    excerpt: 'Описание',
    status: 'draft',
    category: null,
    tags: [],
    cover_image: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    usePostsStore.setState({
      currentPost: null,
      isLoading: false,
      fetchPost: vi.fn().mockResolvedValue({ success: true }),
      clearCurrentPost: vi.fn(),
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/posts/test-post/edit']}>
        <Routes>
          <Route path="/posts/:slug/edit" element={<EditPostPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('показывает сообщение, если пост не найден', async () => {
    renderPage();
    
    // Ждем, пока завершится загрузка (лоадер исчезнет)
    await waitFor(() => {
      expect(screen.queryByRole('img', { name: /spinner/i })).not.toBeInTheDocument();
    });

    expect(screen.getByText('Пост не найден')).toBeInTheDocument();
  });

  it('рендерит форму, если пост загружен', async () => {
    usePostsStore.setState({ currentPost: mockPost });
    
    renderPage();

    // Ждем, пока завершится загрузка
    await waitFor(() => {
      expect(screen.getByText('Редактировать пост')).toBeInTheDocument();
    });

    expect(screen.getByTestId('edit-post-form')).toBeInTheDocument();
  });
});