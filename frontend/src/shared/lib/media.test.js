import { describe, it, expect } from 'vitest';
import { resolveMediaUrl } from './media';
import { MEDIA_URL } from './constants';

describe('resolveMediaUrl', () => {
  it('возвращает null для пустого значения', () => {
    expect(resolveMediaUrl(null)).toBeNull();
    expect(resolveMediaUrl('')).toBeNull();
  });

  it('не трогает абсолютные, data: и blob: URL', () => {
    expect(resolveMediaUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    expect(resolveMediaUrl('data:image/png;base64,xx')).toBe('data:image/png;base64,xx');
    expect(resolveMediaUrl('blob:http://x/1')).toBe('blob:http://x/1');
  });

  it('добавляет MEDIA_URL к относительным путям (вместо захардкоженного 127.0.0.1)', () => {
    expect(resolveMediaUrl('/media/covers/a.png')).toBe(`${MEDIA_URL}/media/covers/a.png`);
    expect(resolveMediaUrl('covers/a.png')).toBe(`${MEDIA_URL}/media/covers/a.png`);
  });
});
