import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Input from './Input';

describe('Input', () => {
  it('рендерит label и placeholder', () => {
    render(<Input label="Имя" placeholder="Введите имя" />);
    // Ищем label просто по тексту
    expect(screen.getByText('Имя')).toBeInTheDocument();
    // Ищем input по плейсхолдеру
    expect(screen.getByPlaceholderText('Введите имя')).toBeInTheDocument();
  });

  it('отображает ошибку', () => {
    render(<Input label="Email" error="Неверный email" />);
    expect(screen.getByText('Неверный email')).toBeInTheDocument();
  });

  it('вызывает onChange при вводе', async () => {
    const handleChange = vi.fn();
    render(<Input label="Имя" placeholder="Введите имя" onChange={handleChange} />);
    
    // Ищем input по плейсхолдеру
    await userEvent.type(screen.getByPlaceholderText('Введите имя'), 'a');
    expect(handleChange).toHaveBeenCalled();
  });
});