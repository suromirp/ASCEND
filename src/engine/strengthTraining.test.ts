import { describe, expect, it } from 'vitest';
import type { StrengthProgramStrategy } from '../models/strengthProgram';
import { strengthBlockRowLine } from './strengthTraining';

const blok = (status: StrengthProgramStrategy['status']): StrengthProgramStrategy => ({
  id: 'b', source: 'manual', startDate: '2026-10-01', sessionsPerWeek: 2, splitType: 'upper_lower', sessionTemplateIds: [], status, createdAt: '2026-10-01T08:00:00.000Z', updatedAt: '2026-10-01T08:00:00.000Z',
});

describe('strengthBlockRowLine', () => {
  it('met kracht aan staat de rij er altijd', () => {
    expect(strengthBlockRowLine({}, [], false)).toBe('Hoe kracht in je week past');
    expect(strengthBlockRowLine({ strengthTraining: true }, [blok('active')], true)).toBe('Hoe kracht in je week past');
  });
  it('met kracht uit, zonder blok en zonder extern schema staat de rij er niet', () => {
    expect(strengthBlockRowLine({ strengthTraining: false }, [], false)).toBeUndefined();
    expect(strengthBlockRowLine({ strengthTraining: false }, [blok('completed'), blok('archived')], false)).toBeUndefined();
  });
  it('met kracht uit en een lopend blok of een extern schema blijft de rij, met de regel dat kracht uit staat', () => {
    expect(strengthBlockRowLine({ strengthTraining: false }, [blok('active')], false)).toBe('Kracht staat uit in je planning');
    expect(strengthBlockRowLine({ strengthTraining: false }, [blok('ending')], false)).toBe('Kracht staat uit in je planning');
    expect(strengthBlockRowLine({ strengthTraining: false }, [], true)).toBe('Kracht staat uit in je planning');
  });
});
