import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

describe('Footer', () => {
  it('рендерит копирайт', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
    expect(screen.getByText(/2026 Blog Platform/i)).toBeInTheDocument();
  });
});