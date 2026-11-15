import { describe, it, expect } from 'vitest';
import { createLatestGate } from './latestGate';

describe('createLatestGate', () => {
  it('laat alleen de laatst gestarte lezing zijn uitkomst neerzetten, ook als die eerder klaar is', async () => {
    const gate = createLatestGate();
    const shown: string[] = [];
    const read = async (value: string, ms: number) => {
      const ticket = gate.start();
      await new Promise((r) => setTimeout(r, ms));
      if (gate.isLatest(ticket)) shown.push(value);
    };
    // The older read is slower: it finishes last and must not overwrite the newer one.
    await Promise.all([read('oud', 20), read('nieuw', 1)]);
    expect(shown).toEqual(['nieuw']);
  });

  it('een lezing alleen telt gewoon', async () => {
    const gate = createLatestGate();
    const t = gate.start();
    expect(gate.isLatest(t)).toBe(true);
    expect(gate.isLatest(gate.start() - 1)).toBe(false);
  });
});
