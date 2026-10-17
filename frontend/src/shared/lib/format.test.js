// src/shared/lib/format.test.js
import { describe, it, expect } from 'vitest';
import { truncate, pluralize } from './format';

describe('format utils', () => {
  it('truncate обрезает строку', () => {
    expect(truncate('Привет мир', 5)).toBe('Приве...');
    expect(truncate('Коротко', 10)).toBe('Коротко');
    expect(truncate(null)).toBe('');
  });

  it('pluralize возвращает правильную форму', () => {
    expect(pluralize(1, ['пост', 'поста', 'постов'])).toBe('пост');
    expect(pluralize(2, ['пост', 'поста', 'постов'])).toBe('поста');
    expect(pluralize(5, ['пост', 'поста', 'постов'])).toBe('постов');
    expect(pluralize(21, ['пост', 'поста', 'постов'])).toBe('пост');
  });
});