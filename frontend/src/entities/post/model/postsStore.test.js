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
describe('postsStore — оптимизации и надёжность', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePostsStore.setState({
      posts: [],
      myPosts: [],
      currentPost: null,
      tags: [],
      categories: [],
      tagsLoadedAt: 0,
      categoriesLoadedAt: 0,
      filters: { search: '', category: '', tag: '', author: '', ordering: '-created_at' },
    });
  });

  it('лайк оптимистичный: UI обновляется до ответа сервера', async () => {
    usePostsStore.setState({ posts: [{ id: 1, slug: 's', likes_count: 1, is_liked: false }] });
    let resolve;
    postsAPI.like.mockReturnValue(new Promise((r) => (resolve = r)));

    const promise = usePostsStore.getState().likePost('s');
    expect(usePostsStore.getState().posts[0]).toMatchObject({ is_liked: true, likes_count: 2 });

    resolve({ data: {} });
    await promise;
  });

  it('лайк откатывается при ошибке сервера', async () => {
    usePostsStore.setState({
      posts: [{ id: 1, slug: 's', likes_count: 1, is_liked: false }],
      currentPost: { id: 1, slug: 's', likes_count: 1, is_liked: false },
    });
    postsAPI.like.mockRejectedValue(new Error('500'));

    const result = await usePostsStore.getState().likePost('s');

    expect(result.success).toBe(false);
    expect(usePostsStore.getState().posts[0]).toMatchObject({ is_liked: false, likes_count: 1 });
    expect(usePostsStore.getState().currentPost).toMatchObject({ is_liked: false, likes_count: 1 });
  });

  it('повторный клик во время запроса не отправляет второй лайк', async () => {
    usePostsStore.setState({ posts: [{ id: 1, slug: 's', likes_count: 0, is_liked: false }] });
    let resolve;
    postsAPI.like.mockReturnValue(new Promise((r) => (resolve = r)));

    const first = usePostsStore.getState().likePost('s');
    const second = await usePostsStore.getState().likePost('s');
    resolve({ data: {} });
    await first;

    expect(second.pending).toBe(true);
    expect(postsAPI.like).toHaveBeenCalledTimes(1);
  });

  it('ответ на устаревший запрос ленты игнорируется', async () => {
    let resolveOld;
    postsAPI.list
      .mockReturnValueOnce(new Promise((r) => (resolveOld = r)))
      .mockResolvedValueOnce({ data: { count: 1, results: [{ id: 2, title: 'Новый' }] } });

    const oldRequest = usePostsStore.getState().fetchPosts(1);
    await usePostsStore.getState().fetchPosts(2);
    resolveOld({ data: { count: 1, results: [{ id: 1, title: 'Старый' }] } });
    await oldRequest;

    expect(usePostsStore.getState().posts[0].title).toBe('Новый');
    expect(usePostsStore.getState().pagination.page).toBe(2);
  });

  it('fetchPosts передаёт только непустые фильтры', async () => {
    postsAPI.list.mockResolvedValue({ data: { count: 0, results: [] } });
    usePostsStore.getState().setFilters({ search: 'django', tag: '' });
    await usePostsStore.getState().fetchPosts(3);
    expect(postsAPI.list).toHaveBeenCalledWith({ page: 3, search: 'django', ordering: '-created_at' });
  });

  it('fetchMyPosts фильтрует по статусу на сервере', async () => {
    postsAPI.myPosts.mockResolvedValue({ data: { count: 0, results: [] } });
    await usePostsStore.getState().fetchMyPosts(2, { status: 'draft' });
    expect(postsAPI.myPosts).toHaveBeenCalledWith({ page: 2, status: 'draft' });
  });

  it('теги кешируются и не запрашиваются повторно', async () => {
    tagsAPI.list.mockResolvedValue({ data: [{ id: 1, name: 'python' }] });
    await usePostsStore.getState().fetchTags();
    await usePostsStore.getState().fetchTags();
    expect(tagsAPI.list).toHaveBeenCalledTimes(1);

    await usePostsStore.getState().fetchTags({ force: true });
    expect(tagsAPI.list).toHaveBeenCalledTimes(2);
  });

  it('updatePost заменяет пост везде полным ответом сервера', async () => {
    usePostsStore.setState({
      posts: [{ id: 1, slug: 's', title: 'Old' }],
      myPosts: [{ id: 1, slug: 's', title: 'Old' }],
    });
    postsAPI.update.mockResolvedValue({ data: { id: 1, slug: 's', title: 'New', author: { id: 1 } } });
    await usePostsStore.getState().updatePost('s', {});
    expect(usePostsStore.getState().myPosts[0].author).toEqual({ id: 1 });
  });
});
