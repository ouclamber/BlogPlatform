import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Footer from './Footer';

describe('Footer', () => {
  it('рендерит копирайт', () => {
    render(<Footer />);
    expect(screen.getByText(/2026 Blog Platform/i)).toBeInTheDocument();
  });
});