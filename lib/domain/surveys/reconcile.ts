import { DomainError } from '../shared/errors';
import type { OptionInput, StoredOption, SurveyStatus } from './types';

export interface OptionPlan {
  inserts: { label: string; position: number }[];
  updates: { id: string; label: string; position: number }[];
  deletes: string[];
}

export function reconcileOptions(
  stored: StoredOption[],
  incoming: OptionInput[],
  status: SurveyStatus,
): OptionPlan {
  const storedById = new Map(stored.map((o) => [o.id, o]));

  const inserts: OptionPlan['inserts'] = [];
  const updates: OptionPlan['updates'] = [];
  const keptIds = new Set<string>();

  incoming.forEach((option, position) => {
    if (option.id === undefined) {
      inserts.push({ label: option.label, position });
      return;
    }
    const existing = storedById.get(option.id);
    if (!existing) {
      throw new DomainError('QUESTIONS_FROZEN', 'unknown option id');
    }
    keptIds.add(option.id);
    updates.push({ id: option.id, label: option.label, position });
  });

  const deletes = stored.filter((o) => !keptIds.has(o.id)).map((o) => o.id);

  if (status !== 'draft') {
    if (inserts.length > 0 || deletes.length > 0) {
      throw new DomainError('QUESTIONS_FROZEN', 'options cannot be added or removed once published');
    }
    const repositioned = updates.some((u) => storedById.get(u.id)!.position !== u.position);
    if (repositioned) {
      throw new DomainError('QUESTIONS_FROZEN', 'options cannot be reordered once published');
    }
  }

  return { inserts, updates, deletes };
}
