import { describe, it, expect, beforeEach, vi } from 'vitest';
import useCommentsStore from './commentsStore';
import { commentsAPI } from '@/shared/api/endpoints';

vi.mock('@/shared/api/endpoints', () => ({
  commentsAPI: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('commentsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCommentsStore.setState({
      comments: [],
      isLoading: false,
      error: null,
    });
  });

  it('fetchComments строит дерево из плоского списка', async () => {
    const flatData = [
      { id: 1, content: 'Root', parent: null },
      { id: 2, content: 'Child', parent: 1 },
    ];
    
    commentsAPI.list.mockResolvedValue({ data: flatData });

    await useCommentsStore.getState().fetchComments('slug');

    const comments = useCommentsStore.getState().comments;
    expect(comments).toHaveLength(1);
    expect(comments[0].replies).toHaveLength(1);
  });

  it('createComment добавляет корневой комментарий', async () => {
    useCommentsStore.setState({ comments: [] });
    commentsAPI.create.mockResolvedValue({ data: { id: 1, content: 'New', parent: null } });

    await useCommentsStore.getState().createComment({ content: 'New' });

    expect(useCommentsStore.getState().comments).toHaveLength(1);
  });

  it('createComment добавляет ответ в дерево', async () => {
    useCommentsStore.setState({
      comments: [{ id: 1, content: 'Root', replies: [] }],
    });
    commentsAPI.create.mockResolvedValue({ data: { id: 2, content: 'Reply', parent: 1 } });

    await useCommentsStore.getState().createComment({ parent: 1, content: 'Reply' });

    const comments = useCommentsStore.getState().comments;
    expect(comments[0].replies).toHaveLength(1);
  });

  it('updateComment обновляет комментарий в дереве', async () => {
    useCommentsStore.setState({
      comments: [{ id: 1, content: 'Old', replies: [] }],
    });
    commentsAPI.update.mockResolvedValue({ data: { id: 1, content: 'Updated', is_edited: true } });

    await useCommentsStore.getState().updateComment(1, 'Updated');

    const comments = useCommentsStore.getState().comments;
    expect(comments[0].content).toBe('Updated');
    expect(comments[0].is_edited).toBe(true);
  });

  it('deleteComment удаляет комментарий из дерева', async () => {
    useCommentsStore.setState({
      comments: [
        { id: 1, content: 'Root', replies: [] },
        { id: 2, content: 'Child', parent: 1, replies: [] },
      ],
    });
    commentsAPI.delete.mockResolvedValue({});

    await useCommentsStore.getState().deleteComment(1);

    const comments = useCommentsStore.getState().comments;
    expect(comments).toHaveLength(1);
    expect(comments[0].id).toBe(2);
  });
});