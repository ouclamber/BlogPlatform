import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

function Boom() {
  throw new Error('chunk load failed');
}

describe('ErrorBoundary', () => {
  it('показывает запасной экран вместо белой страницы', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Обновить страницу' })).toBeInTheDocument();
    spy.mockRestore();
  });
});
