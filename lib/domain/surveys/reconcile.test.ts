import { describe, it, expect } from 'vitest';
import { reconcileOptions } from './reconcile';
import { DomainError } from '../shared/errors';

const stored = [
  { id: 'a', position: 0, label: 'TS' },
  { id: 'b', position: 1, label: 'Rust' },
];

describe('reconcileOptions', () => {
  it('draft: plans insert, update, delete', () => {
    const plan = reconcileOptions(stored, [{ id: 'a', label: 'TypeScript' }, { label: 'Go' }], 'draft');
    expect(plan.updates).toEqual([{ id: 'a', label: 'TypeScript', position: 0 }]);
    expect(plan.inserts).toEqual([{ label: 'Go', position: 1 }]);
    expect(plan.deletes).toEqual(['b']);
  });
  it('published: label rename allowed', () => {
    const plan = reconcileOptions(stored, [{ id: 'a', label: 'TypeScript!' }, { id: 'b', label: 'Rust' }], 'published');
    expect(plan.updates.find(u => u.id === 'a')!.label).toBe('TypeScript!');
    expect(plan.inserts).toHaveLength(0);
    expect(plan.deletes).toHaveLength(0);
  });
  it('published: insert refused', () => {
    expect(() => reconcileOptions(stored, [...stored.map(({ id, label }) => ({ id, label })), { label: 'Go' }], 'published'))
      .toThrowError(DomainError);
  });
  it('published: delete refused', () => {
    expect(() => reconcileOptions(stored, [{ id: 'a', label: 'TS' }], 'published')).toThrowError(DomainError);
  });
  it('unknown incoming id is INVALID_ANSWER-free but refused', () => {
    expect(() => reconcileOptions(stored, [{ id: 'zzz', label: 'X' }], 'draft')).toThrow();
  });
});
