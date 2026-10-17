import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loader from './Loader';

describe('Loader', () => {
  it('рендерит спиннер без fullScreen', () => {
    const { container } = render(<Loader />);
    // Проверяем наличие SVG
    expect(container.querySelector('svg')).toBeInTheDocument();
    // Проверяем, что нет класса min-h-screen
    expect(container.querySelector('.min-h-screen')).not.toBeInTheDocument();
  });

  it('рендерит fullScreen при передаче пропса', () => {
    const { container } = render(<Loader fullScreen />);
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
  });
});