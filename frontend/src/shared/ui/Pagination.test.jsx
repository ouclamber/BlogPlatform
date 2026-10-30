import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Pagination from './Pagination';

describe('Pagination', () => {
  it('не рендерится, если всего 1 страница', () => {
    const { container } = render(
      <Pagination page={1} count={5} pageSize={10} onChange={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('рендерит кнопки и вызывает onChange', async () => {
    const onChange = vi.fn();
    render(<Pagination page={2} count={30} pageSize={10} onChange={onChange} />);

    // Проверяем, что кнопки есть (страницы 1, 2, 3)
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // Клик на "3"
    await userEvent.click(screen.getByText('3'));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});