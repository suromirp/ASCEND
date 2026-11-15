import { describe, it, expect } from 'vitest';
import { createLatestRunner } from './latestGate';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('createLatestRunner', () => {
  // Zoals loadState: lezen, en alleen neerzetten als dit nog de laatste lezing is.
  function reader(shown: string[]) {
    const runner = createLatestRunner();
    return (value: string, ms: number) => runner.run(async (stillLatest) => {
      await wait(ms);
      if (!stillLatest()) return;
      shown.push(value);
    });
  }

  it('laat alleen de laatst gestarte lezing haar uitkomst neerzetten, ook als die eerder klaar is', async () => {
    const shown: string[] = [];
    const read = reader(shown);
    await Promise.all([read('oud', 20), read('nieuw', 1)]);
    expect(shown).toEqual(['nieuw']);
  });

  it('een verdrongen lezing keert pas terug als de nieuwste neergezet is', async () => {
    const shown: string[] = [];
    const read = reader(shown);
    const older = read('oud', 1);
    const newer = read('nieuw', 30);
    await older;
    // The caller of the older read (the start, a refresh) goes on only once there is a result.
    expect(shown).toEqual(['nieuw']);
    await newer;
  });

  it('een verdrongen lezing geeft de fout van de nieuwste door', async () => {
    const runner = createLatestRunner();
    const older = runner.run(async (stillLatest) => {
      await wait(1);
      if (!stillLatest()) return;
    });
    const newer = runner.run(async () => {
      await wait(10);
      throw new Error('kon niet lezen');
    });
    await expect(older).rejects.toThrow('kon niet lezen');
    await expect(newer).rejects.toThrow('kon niet lezen');
  });

  it('een lezing alleen zet gewoon neer', async () => {
    const shown: string[] = [];
    await reader(shown)('enig', 1);
    expect(shown).toEqual(['enig']);
  });
});
