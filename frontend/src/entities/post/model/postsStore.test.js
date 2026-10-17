import { describe, it, expect, beforeEach, vi } from 'vitest';
import usePostsStore from './postsStore';
import { postsAPI, tagsAPI, categoriesAPI } from '@/shared/api/endpoints';

vi.mock('@/shared/api/endpoints', () => ({
  postsAPI: {
    list: vi.fn(),
    like: vi.fn(),
    unlike: vi.fn(),
    myPosts: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    publish: vi.fn(),
    archive: vi.fn(),
  },
  tagsAPI: { list: vi.fn(), create: vi.fn() },
  categoriesAPI: { list: vi.fn() },
}));

describe('postsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePostsStore.setState({
      posts: [],
      myPosts: [],
      currentPost: null,
      tags: [],
      categories: [],
      pagination: { count: 0, page: 1, pageSize: 10 },
      myPagination: { count: 0, page: 1, pageSize: 10 },
      filters: { search: '', category: '', tag: '', ordering: '-created_at' },
      isLoading: false,
      isMyPostsLoading: false,
    });
  });

  // --- ФИЛЬТРЫ ---
  it('setFilters обновляет фильтры', () => {
    usePostsStore.getState().setFilters({ search: 'test' });
    expect(usePostsStore.getState().filters.search).toBe('test');
  });

  it('resetFilters сбрасывает фильтры', () => {
    usePostsStore.getState().setFilters({ search: 'test' });
    usePostsStore.getState().resetFilters();
    expect(usePostsStore.getState().filters.search).toBe('');
  });

  // --- ЛАЙКИ ---
  it('likePost обновляет пост в списке и в myPosts', async () => {
    usePostsStore.setState({
      posts: [{ id: 1, slug: 'test', likes_count: 5, is_liked: false }],
      myPosts: [{ id: 1, slug: 'test', likes_count: 5, is_liked: false }],
    });
    postsAPI.like.mockResolvedValue({ data: {} });

    await usePostsStore.getState().likePost('test');

    const state = usePostsStore.getState();
    expect(state.posts[0].likes_count).toBe(6);
    expect(state.posts[0].is_liked).toBe(true);
  });

  it('unlikePost обновляет пост в списке', async () => {
    usePostsStore.setState({
      posts: [{ id: 1, slug: 'test', likes_count: 5, is_liked: true }],
    });
    postsAPI.unlike.mockResolvedValue({ data: {} });

    await usePostsStore.getState().unlikePost('test');

    const state = usePostsStore.getState();
    expect(state.posts[0].likes_count).toBe(4);
    expect(state.posts[0].is_liked).toBe(false);
  });

  // --- ЗАГРУЗКА ПОСТОВ ---
  it('fetchPosts загружает посты', async () => {
    const mockData = { count: 1, results: [{ id: 1, title: 'Post' }] };
    postsAPI.list.mockResolvedValue({ data: mockData });

    await usePostsStore.getState().fetchPosts(1);

    const state = usePostsStore.getState();
    expect(state.posts).toHaveLength(1);
    expect(state.pagination.count).toBe(1);
  });

  it('fetchMyPosts загружает мои посты', async () => {
    const mockData = { count: 1, results: [{ id: 1, title: 'My Post' }] };
    postsAPI.myPosts.mockResolvedValue({ data: mockData });

    await usePostsStore.getState().fetchMyPosts(1);

    const state = usePostsStore.getState();
    expect(state.myPosts).toHaveLength(1);
  });

  // --- CRUD ---
  it('createPost добавляет пост в начало списка', async () => {
    usePostsStore.setState({ posts: [] });
    postsAPI.create.mockResolvedValue({ data: { id: 1, title: 'New' } });

    const result = await usePostsStore.getState().createPost(new FormData());

    expect(result.success).toBe(true);
    expect(usePostsStore.getState().posts).toHaveLength(1);
  });

  it('updatePost обновляет пост в списке', async () => {
    usePostsStore.setState({
      posts: [{ id: 1, slug: 'test', title: 'Old' }],
      currentPost: { id: 1, slug: 'test', title: 'Old' },
    });
    postsAPI.update.mockResolvedValue({ data: { id: 1, slug: 'test', title: 'Updated' } });

    const result = await usePostsStore.getState().updatePost('test', {});
    
    expect(result.success).toBe(true);
    expect(usePostsStore.getState().posts[0].title).toBe('Updated');
  });

  it('deletePost удаляет пост', async () => {
    usePostsStore.setState({
      posts: [{ id: 1, slug: 'test' }],
      myPosts: [{ id: 1, slug: 'test' }],
    });
    postsAPI.delete.mockResolvedValue({});

    await usePostsStore.getState().deletePost('test');

    expect(usePostsStore.getState().posts).toHaveLength(0);
    expect(usePostsStore.getState().myPosts).toHaveLength(0);
  });

  // --- ПУБЛИКАЦИЯ И АРХИВАЦИЯ ---
  it('publishPost обновляет статус', async () => {
    usePostsStore.setState({
      posts: [{ id: 1, slug: 'test', status: 'draft' }],
      myPosts: [{ id: 1, slug: 'test', status: 'draft' }],
    });
    postsAPI.publish.mockResolvedValue({ data: { id: 1, slug: 'test', status: 'published' } });

    await usePostsStore.getState().publishPost('test');

    const state = usePostsStore.getState();
    expect(state.posts[0].status).toBe('published');
  });

  it('archivePost обновляет статус', async () => {
    usePostsStore.setState({
      posts: [{ id: 1, slug: 'test', status: 'published' }],
    });
    postsAPI.archive.mockResolvedValue({ data: { id: 1, slug: 'test', status: 'archived' } });

    await usePostsStore.getState().archivePost('test');

    const state = usePostsStore.getState();
    expect(state.posts[0].status).toBe('archived');
  });

  // --- ТЕГИ И КАТЕГОРИИ ---
  it('fetchTags загружает теги', async () => {
    tagsAPI.list.mockResolvedValue({ data: [{ id: 1, name: 'python' }] });
    await usePostsStore.getState().fetchTags();
    expect(usePostsStore.getState().tags).toHaveLength(1);
  });

  it('createTag добавляет тег', async () => {
    tagsAPI.create.mockResolvedValue({ data: { id: 1, name: 'react' } });
    await usePostsStore.getState().createTag('react');
    expect(usePostsStore.getState().tags).toHaveLength(1);
  });
  
  it('fetchCategories загружает категории', async () => {
    categoriesAPI.list.mockResolvedValue({ data: [{ id: 1, name: 'Наука' }] });
    await usePostsStore.getState().fetchCategories();
    expect(usePostsStore.getState().categories).toHaveLength(1);
  });
});