import { describe, it, expect } from 'vitest';
import { randomSlug } from './slug';

describe('randomSlug', () => {
  it('defaults to length 8', () => {
    expect(randomSlug()).toHaveLength(8);
  });

  it('respects a given length', () => {
    expect(randomSlug(12)).toHaveLength(12);
  });

  it('only uses lowercase letters and digits', () => {
    const slug = randomSlug(64);
    expect(slug).toMatch(/^[a-z0-9]+$/);
  });

  it('is not deterministic across calls', () => {
    const a = randomSlug(16);
    const b = randomSlug(16);
    expect(a).not.toBe(b);
  });
});
