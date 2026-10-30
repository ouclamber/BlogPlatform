import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import EditPostForm from './EditPostForm';
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
  default: ({ onChange }) => (
    <div data-testid="cover-upload">
      CoverUpload Mock
      <button type="button" data-testid="cover-remove" onClick={() => onChange(null)}>
        x
      </button>
    </div>
  ),
}));

describe('EditPostForm', () => {
  const mockPost = {
    id: 1,
    slug: 'test-post',
    title: 'Тестовый пост',
    content: 'Содержимое поста',
    excerpt: 'Краткое описание',
    status: 'draft',
    category: { id: 1, name: 'Наука' },
    tags: [{ id: 1, name: 'python' }],
    cover_image: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    usePostsStore.setState({
      categories: [],
      isLoading: false,
      updatePost: vi.fn(),
      fetchCategories: vi.fn(),
    });
  });

  const renderForm = () =>
    render(
      <MemoryRouter>
        <EditPostForm post={mockPost} />
      </MemoryRouter>
    );

  it('заполняет форму данными поста', () => {
    renderForm();
    expect(document.querySelector('input[name="title"]').value).toBe('Тестовый пост');
    expect(document.querySelector('textarea[name="content"]').value).toBe('Содержимое поста');
    expect(screen.getByTestId('tag-selector')).toBeInTheDocument();
  });

  it('вызывает updatePost при сохранении', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ success: true, data: { slug: 'test-post' } });
    usePostsStore.setState({ updatePost: mockUpdate });

    renderForm();

    // Меняем заголовок
    await userEvent.clear(document.querySelector('input[name="title"]'));
    await userEvent.type(document.querySelector('input[name="title"]'), 'Обновленный заголовок');
    
    await userEvent.click(screen.getByRole('button', { name: /Сохранить изменения/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('test-post', expect.any(FormData));
      expect(mockedNavigate).toHaveBeenCalledWith('/posts/test-post');
    });
  });
});
describe('EditPostForm — удаление обложки', () => {
  it('крестик на существующей обложке отправляет cover_image=""', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ success: true, data: { slug: 'with-cover' } });
    usePostsStore.setState({ categories: [], isLoading: false, updatePost: mockUpdate, fetchCategories: vi.fn() });

    render(
      <MemoryRouter>
        <EditPostForm
          post={{
            id: 9, slug: 'with-cover', title: 'С обложкой', content: 'Достаточно длинный текст',
            excerpt: '', status: 'draft', category: null, tags: [], cover_image: '/media/covers/a.png',
          }}
        />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByTestId('cover-remove'));
    await userEvent.click(screen.getByRole('button', { name: /Сохранить изменения/i }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    const formData = mockUpdate.mock.calls[0][1];
    expect(formData.get('cover_image')).toBe('');
  });
});
