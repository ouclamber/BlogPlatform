import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TagSelector from './TagSelector';
import usePostsStore from '@/entities/post/model/postsStore';

vi.mock('@/entities/post/model/postsStore', () => ({
  default: vi.fn(),
}));

describe('TagSelector', () => {
  const mockOnChange = vi.fn();
  const mockFetchTags = vi.fn();
  const mockCreateTag = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Настраиваем мок стора
    usePostsStore.mockReturnValue({
      tags: [
        { id: 1, name: 'python' },
        { id: 2, name: 'react' },
      ],
      fetchTags: mockFetchTags,
      createTag: mockCreateTag,
    });
  });

  it('рендерит выбранные теги', () => {
    render(
      <TagSelector selected={[{ id: 1, name: 'python' }]} onChange={mockOnChange} />
    );
    expect(screen.getByText('#python')).toBeInTheDocument();
  });

  it('показывает подсказки при вводе', async () => {
    render(<TagSelector selected={[]} onChange={mockOnChange} />);
    const input = screen.getByPlaceholderText('Введите тег и нажмите Enter...');
    
    await userEvent.type(input, 'py');
    
    // Должен появиться вариант "python"
    expect(screen.getByText('#python')).toBeInTheDocument();
  });

  it('добавляет тег при клике на подсказку', async () => {
    render(<TagSelector selected={[]} onChange={mockOnChange} />);
    const input = screen.getByPlaceholderText('Введите тег и нажмите Enter...');
    
    await userEvent.type(input, 'py');
    await userEvent.click(screen.getByText('#python'));
    
    expect(mockOnChange).toHaveBeenCalledWith([{ id: 1, name: 'python' }]);
  });

  it('удаляет тег при клике на крестик', async () => {
    render(
      <TagSelector selected={[{ id: 1, name: 'python' }]} onChange={mockOnChange} />
    );
    
    // Кнопка удаления внутри выбранного тега
    const removeButton = screen.getByRole('button');
    await userEvent.click(removeButton);
    
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });
});