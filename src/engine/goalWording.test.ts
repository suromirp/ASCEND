import { describe, expect, it } from 'vitest';
import { goalRef } from './goalWording';

const g = (id: string, name: string, status: 'active' | 'archived' | 'completed' = 'active') => ({ id, name, status });
const ladder = (...ids: string[]) => new Set(ids);

describe('goalRef', () => {
  it('zegt "je doel" zonder doel', () => {
    expect(goalRef([], ladder())).toBe('je doel');
  });
  it('zegt "je doel" als alleen een gearchiveerd doel bestaat', () => {
    expect(goalRef([g('a', 'Marathon', 'archived')], ladder('a'))).toBe('je doel');
  });
  it('noemt het ene doel bij naam', () => {
    expect(goalRef([g('a', 'Marathon')], ladder('a'))).toBe('Marathon');
  });
  it('kiest bij twee actieve doelen het doel waar de planning op draait', () => {
    const goals = [g('a', 'Marathon'), g('b', 'Vanoise')];
    expect(goalRef(goals, ladder('b', 'a'))).toBe('Marathon');
    expect(goalRef(goals, ladder('b'))).toBe('Vanoise');
  });
  it('houdt een lange doelnaam kort genoeg voor 360 px', () => {
    const ref = goalRef([g('a', 'Meerdaagse alpentocht door de Vanoise en verder')], ladder('a'));
    expect(ref.length).toBeLessThanOrEqual(10);
  });
});
