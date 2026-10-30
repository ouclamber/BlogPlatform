import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('рендерит заголовок и описание', () => {
    render(
      <EmptyState
        title="Ничего нет"
        description="Попробуйте позже"
      />
    );
    expect(screen.getByText('Ничего нет')).toBeInTheDocument();
    expect(screen.getByText('Попробуйте позже')).toBeInTheDocument();
  });

  it('рендерит action, если передан', () => {
    render(
      <EmptyState
        title="Пусто"
        action={<button>Кнопка</button>}
      />
    );
    expect(screen.getByText('Кнопка')).toBeInTheDocument();
  });
});