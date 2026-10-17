import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PostList from './PostList';

// Мокаем дочерние компоненты
vi.mock('@/entities/post/ui/PostCard', () => ({
  default: ({ post }) => <div data-testid="post-card">{post.title}</div>,
}));

describe('PostList', () => {
  const mockPosts = [
    { id: 1, title: 'Пост 1' },
    { id: 2, title: 'Пост 2' },
  ];

  it('показывает лоадер при isLoading', () => {
    const { container } = render(
      <MemoryRouter>
        <PostList posts={[]} isLoading={true} count={0} page={1} pageSize={10} />
      </MemoryRouter>
    );
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('показывает пустое состояние, если нет постов', () => {
    render(
      <MemoryRouter>
        <PostList posts={[]} isLoading={false} count={0} page={1} pageSize={10} emptyState={{ title: 'Пусто' }} />
      </MemoryRouter>
    );
    expect(screen.getByText('Пусто')).toBeInTheDocument();
  });

  it('рендерит карточки постов', () => {
    render(
      <MemoryRouter>
        <PostList posts={mockPosts} isLoading={false} count={2} page={1} pageSize={10} />
      </MemoryRouter>
    );
    expect(screen.getAllByTestId('post-card')).toHaveLength(2);
    expect(screen.getByText('Пост 1')).toBeInTheDocument();
  });
});