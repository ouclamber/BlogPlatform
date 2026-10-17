import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CommentList from './CommentList';
import useCommentsStore from '@/entities/comment/model/commentsStore';

// Мокаем дочерние компоненты, чтобы не тянуть их зависимости
vi.mock('./CommentItem', () => ({
  default: ({ comment }) => <div data-testid="comment-item">{comment.content}</div>,
}));
vi.mock('@/features/comment/create/CommentForm', () => ({
  default: () => <div data-testid="comment-form">Form Mock</div>,
}));

describe('CommentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('показывает пустое состояние, если нет комментариев', () => {
    useCommentsStore.setState({ comments: [], isLoading: false, fetchComments: vi.fn() });
    render(
      <MemoryRouter>
        <CommentList postId={1} postSlug="test" />
      </MemoryRouter>
    );
    expect(screen.getByText('Комментариев пока нет')).toBeInTheDocument();
  });

  it('рендерит список комментариев', () => {
    const mockComments = [
      { id: 1, content: 'Первый коммент', replies: [] },
      { id: 2, content: 'Второй коммент', replies: [] },
    ];
    useCommentsStore.setState({ comments: mockComments, isLoading: false, fetchComments: vi.fn() });
    
    render(
      <MemoryRouter>
        <CommentList postId={1} postSlug="test" />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Первый коммент')).toBeInTheDocument();
    expect(screen.getByText('Второй коммент')).toBeInTheDocument();
    expect(screen.getByTestId('comment-form')).toBeInTheDocument();
  });
});