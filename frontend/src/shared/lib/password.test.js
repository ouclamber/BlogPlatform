import { describe, it, expect } from 'vitest';
import { passwordStrength } from './password';

describe('passwordStrength', () => {
  it('пустой пароль — без оценки', () => {
    expect(passwordStrength('').score).toBe(0);
  });

  it('только цифры — слабый, даже если длинный', () => {
    expect(passwordStrength('123456789012').score).toBeLessThanOrEqual(1);
  });

  it('длинный смешанный пароль — надёжный', () => {
    expect(passwordStrength('Sup3r-Secret-Pass!').score).toBe(4);
  });
});
