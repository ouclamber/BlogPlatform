import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Avatar from './Avatar';

describe('Avatar', () => {
  it('рендерит инициалы, если нет аватара', () => {
    render(<Avatar user={{ username: 'testuser' }} />);
    expect(screen.getByText('TE')).toBeInTheDocument();
  });

  it('рендерит заглушку, если нет пользователя', () => {
    render(<Avatar user={null} />);
    expect(screen.getByText('??')).toBeInTheDocument();
  });

  it('рендерит картинку, если есть аватар', () => {
    render(
      <Avatar user={{ username: 'testuser', avatar: 'http://example.com/avatar.jpg' }} />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'http://example.com/avatar.jpg');
  });
});