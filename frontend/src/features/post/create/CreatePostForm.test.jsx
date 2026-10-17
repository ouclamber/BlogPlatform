import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CreatePostForm from './CreatePostForm';
import usePostsStore from '@/entities/post/model/postsStore';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

// Мокаем дочерние компоненты
vi.mock('@/features/tag/select/TagSelector', () => ({
  default: () => <div data-testid="tag-selector">TagSelector Mock</div>,
}));
vi.mock('@/features/cover/upload/CoverUpload', () => ({
  default: () => <div data-testid="cover-upload">CoverUpload Mock</div>,
}));

describe('CreatePostForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePostsStore.setState({
      categories: [],
      isLoading: false,
      createPost: vi.fn(),
      fetchCategories: vi.fn(),
    });
  });

  const renderForm = () =>
    render(
      <MemoryRouter>
        <CreatePostForm />
      </MemoryRouter>
    );

  it('рендерит поля формы', () => {
    renderForm();
    expect(screen.getByText('Заголовок *')).toBeInTheDocument();
    expect(screen.getByText('Содержание *')).toBeInTheDocument();
    expect(screen.getByTestId('tag-selector')).toBeInTheDocument();
    expect(screen.getByTestId('cover-upload')).toBeInTheDocument();
  });

  it('показывает ошибку, если заголовок короче 3 символов', async () => {
    renderForm();

    await userEvent.type(document.querySelector('input[name="title"]'), 'ab');
    await userEvent.type(document.querySelector('textarea[name="content"]'), 'Достаточно длинный текст');
    await userEvent.click(screen.getByRole('button', { name: /Сохранить черновик/i }));

    await waitFor(() => {
      expect(screen.getByText('Заголовок должен быть минимум 3 символа')).toBeInTheDocument();
    });
  });

  it('вызывает createPost при успешной валидации', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ success: true, data: { slug: 'test-slug' } });
    usePostsStore.setState({ createPost: mockCreate });

    renderForm();

    await userEvent.type(document.querySelector('input[name="title"]'), 'Новый пост');
    await userEvent.type(document.querySelector('textarea[name="content"]'), 'Это достаточно длинный текст для поста.');
    
    await userEvent.click(screen.getByRole('button', { name: /Сохранить черновик/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
      expect(mockedNavigate).toHaveBeenCalledWith('/posts/test-slug');
    });
  });
});