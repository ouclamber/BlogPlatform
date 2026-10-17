import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CoverUpload from './CoverUpload';

describe('CoverUpload', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('рендерит зону загрузки, если нет значения', () => {
    render(<CoverUpload value={null} onChange={mockOnChange} />);
    expect(screen.getByText('Нажмите, чтобы загрузить обложку')).toBeInTheDocument();
  });

  it('рендерит превью, если передано значение', () => {
    render(<CoverUpload value="test.jpg" onChange={mockOnChange} />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', expect.stringContaining('test.jpg'));
  });

  it('вызывает onChange с файлом при выборе изображения', async () => {
    // Создаем фейковый файл
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    
    render(<CoverUpload value={null} onChange={mockOnChange} />);
    
    // Находим скрытый input
    const input = document.querySelector('input[type="file"]');
    
    // Имитируем загрузку файла
    await userEvent.upload(input, file);
    
    expect(mockOnChange).toHaveBeenCalledWith(file);
  });

  it('удаляет превью при клике на кнопку X', async () => {
    render(<CoverUpload value="test.jpg" onChange={mockOnChange} />);
    
    // Кнопка удаления (с иконкой X)
    const removeButton = screen.getByRole('button');
    await userEvent.click(removeButton);
    
    expect(mockOnChange).toHaveBeenCalledWith(null);
  });
});