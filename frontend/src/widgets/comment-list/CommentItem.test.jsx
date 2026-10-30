import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CommentItem from './CommentItem';
import useAuthStore from '@/entities/user/model/authStore';
import useCommentsStore from '@/entities/comment/model/commentsStore';

const mockComment = {
  id: 1,
  post: 1,
  content: 'Родительский комментарий',
  created_at: new Date().toISOString(),
  is_edited: false,
  author: { id: 1, username: 'user1', role: 'reader' },
  replies: [
    {
      id: 2,
      post: 1,
      content: 'Вложенный ответ',
      created_at: new Date().toISOString(),
      is_edited: false,
      author: { id: 2, username: 'user2', role: 'reader' },
      replies: [],
    },
  ],
};

describe('CommentItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null });
    useCommentsStore.setState({
      updateComment: vi.fn(),
      deleteComment: vi.fn(),
      createComment: vi.fn(),
    });
  });

  const renderComment = (comment = mockComment, level = 0) =>
    render(
      <MemoryRouter>
        <CommentItem comment={comment} postSlug="test-post" level={level} />
      </MemoryRouter>
    );

  it('рендерит текст комментария и автора', () => {
    renderComment();
    expect(screen.getByText('Родительский комментарий')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
  });

  it('рендерит вложенные ответы', () => {
    renderComment();
    expect(screen.getByText('Вложенный ответ')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
  });

  it('применяет стили отступа для вложенного уровня', () => {
    renderComment(mockComment, 2);
    const container = screen.getByText('Родительский комментарий').closest('.border-l-2');
    expect(container).toBeInTheDocument();
  });

  it('показывает кнопки "Ответить" для авторизованных', () => {
    useAuthStore.setState({ user: { id: 3, username: 'test', role: 'reader' } });
    renderComment();
    const replyButtons = screen.getAllByText('Ответить');
    expect(replyButtons.length).toBeGreaterThan(0);
  });

  it('показывает кнопки редактирования для владельца', () => {
    useAuthStore.setState({ user: { id: 1, username: 'user1', role: 'reader' } });
    renderComment();
    expect(screen.getByText('Изменить')).toBeInTheDocument();
    expect(screen.getByText('Удалить')).toBeInTheDocument();
  });

  it('включает режим редактирования при клике', async () => {
    useAuthStore.setState({ user: { id: 1, username: 'user1', role: 'reader' } });
    renderComment();
    
    await userEvent.click(screen.getByText('Изменить'));
    expect(screen.getByDisplayValue('Родительский комментарий')).toBeInTheDocument();
  });

  it('вызывает deleteComment при подтверждении', async () => {
    useAuthStore.setState({ user: { id: 1, username: 'user1', role: 'reader' } });
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    
    const mockDelete = vi.fn().mockResolvedValue({ success: true });
    useCommentsStore.setState({ deleteComment: mockDelete });

    renderComment();
    
    await userEvent.click(screen.getByText('Удалить'));
    
    expect(mockDelete).toHaveBeenCalledWith(1);
  });

  it('отправляет ответ при вводе текста', async () => {
    useAuthStore.setState({ user: { id: 3, username: 'test', role: 'reader' } });
    const mockCreate = vi.fn().mockResolvedValue({ success: true });
    useCommentsStore.setState({ createComment: mockCreate });

    renderComment();
    
    // Открываем форму ответа
    await userEvent.click(screen.getAllByText('Ответить')[0]);
    
    // Вводим текст
    const textarea = screen.getByPlaceholderText('Написать ответ...');
    await userEvent.type(textarea, 'Мой ответ');
    
    // Отправляем
    await userEvent.click(screen.getByText('Отправить'));
    
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        post: 1,
        parent: 1,
        content: 'Мой ответ',
      });
    });
  });
});