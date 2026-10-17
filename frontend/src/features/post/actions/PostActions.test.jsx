import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PostActions from './PostActions';
import useAuthStore from '@/entities/user/model/authStore';
import usePostsStore from '@/entities/post/model/postsStore';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('PostActions', () => {
  const mockPost = {
    id: 1,
    slug: 'test-post',
    status: 'draft',
    author: { id: 1, username: 'author' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    useAuthStore.setState({ user: { id: 1, role: 'author' } });
    usePostsStore.setState({
      deletePost: vi.fn().mockResolvedValue({ success: true }),
      publishPost: vi.fn().mockResolvedValue({ success: true }),
      archivePost: vi.fn().mockResolvedValue({ success: true }),
      fetchPost: vi.fn(),
    });
  });

  const renderActions = () =>
    render(
      <MemoryRouter>
        <PostActions post={mockPost} />
      </MemoryRouter>
    );

  it('рендерит кнопки для автора (черновик)', () => {
    renderActions();
    expect(screen.getByText('Опубликовать')).toBeInTheDocument();
    expect(screen.getByText('Редактировать')).toBeInTheDocument();
  });

  it('вызывает publishPost при клике', async () => {
    renderActions();
    await userEvent.click(screen.getByText('Опубликовать'));
    expect(usePostsStore.getState().publishPost).toHaveBeenCalledWith('test-post');
  });

  it('вызывает deletePost при удалении', async () => {
    renderActions();
    await userEvent.click(screen.getByRole('button', { name: '' })); // Кнопка с иконкой удаления
    expect(usePostsStore.getState().deletePost).toHaveBeenCalledWith('test-post');
  });
});