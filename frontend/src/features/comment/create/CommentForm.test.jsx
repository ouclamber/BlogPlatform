import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CommentForm from './CommentForm';
import useAuthStore from '@/entities/user/model/authStore';
import useCommentsStore from '@/entities/comment/model/commentsStore';

describe('CommentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, isAuthenticated: false });
    useCommentsStore.setState({ createComment: vi.fn() });
  });

  const renderForm = () =>
    render(
      <MemoryRouter>
        <CommentForm postId={1} postSlug="test" />
      </MemoryRouter>
    );

  it('показывает кнопку "Войти" для неавторизованных', () => {
    renderForm();
    expect(screen.getByText('Войдите, чтобы оставить комментарий')).toBeInTheDocument();
    expect(screen.getByText('Войти')).toBeInTheDocument();
  });

  it('рендерит textarea для авторизованных', () => {
    useAuthStore.setState({
      user: { username: 'test', role: 'reader' },
      isAuthenticated: true,
    });
    renderForm();
    expect(screen.getByPlaceholderText('Написать комментарий...')).toBeInTheDocument();
  });

  it('вызывает createComment при отправке', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ success: true });
    useCommentsStore.setState({ createComment: mockCreate });
    useAuthStore.setState({
      user: { username: 'test', role: 'reader' },
      isAuthenticated: true,
    });

    renderForm();

    await userEvent.type(screen.getByPlaceholderText('Написать комментарий...'), 'Тестовый комментарий');
    await userEvent.click(screen.getByRole('button', { name: /Отправить/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        post: 1,
        content: 'Тестовый комментарий',
      });
    });
  });
});