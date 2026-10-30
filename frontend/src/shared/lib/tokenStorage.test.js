import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tokenStorage } from './tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => localStorage.clear());

  it('сохраняет и очищает токены', () => {
    tokenStorage.set({ access: 'a', refresh: 'r' });
    expect(tokenStorage.getAccess()).toBe('a');
    expect(tokenStorage.getRefresh()).toBe('r');
    tokenStorage.clear();
    expect(tokenStorage.getAccess()).toBeNull();
  });

  it('не падает, если localStorage недоступен (приватный режим)', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(tokenStorage.getAccess()).toBeNull();
    spy.mockRestore();
  });
});
