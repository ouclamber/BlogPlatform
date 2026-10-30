import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CreatePostPage from './CreatePostPage';
import usePostsStore from '@/entities/post/model/postsStore';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

// Мокаем форму, чтобы не тянуть её зависимости
vi.mock('@/features/post/create/CreatePostForm', () => ({
  default: () => <div data-testid="create-post-form">Form Mock</div>,
}));

describe('CreatePostPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePostsStore.setState({
      categories: [],
      fetchCategories: vi.fn(),
    });
  });

  it('рендерит заголовок и форму', () => {
    render(
      <MemoryRouter>
        <CreatePostPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Создать пост')).toBeInTheDocument();
    expect(screen.getByTestId('create-post-form')).toBeInTheDocument();
  });
});