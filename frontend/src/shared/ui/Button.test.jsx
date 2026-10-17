// src/shared/ui/Button.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Button from './Button';

describe('Button', () => {
  it('рендерит текст', () => {
    render(<Button>Кнопка</Button>);
    expect(screen.getByText('Кнопка')).toBeInTheDocument();
  });

  it('вызывает onClick при клике', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Кнопка</Button>);
    
    await userEvent.click(screen.getByText('Кнопка'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('не вызывает onClick, если передан loading', async () => {
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>Кнопка</Button>);
    
    await userEvent.click(screen.getByText('Кнопка'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('рендерит ссылку, если передан to', () => {
    render(
      <MemoryRouter>
        <Button to="/test">Ссылка</Button>
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: 'Ссылка' });
    expect(link).toHaveAttribute('href', '/test');
  });
});