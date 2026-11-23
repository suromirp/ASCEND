import { describe, it, expect } from 'vitest';
import { bootFailureDetails, bootFailureLine, noteBootOutcomes, type BootFailureRecord } from './bootFailures';

const AT = '2026-11-23T07:00:00.000Z';

describe('bootFailures: een herstelstap die elke start faalt, geteld', () => {
  it('een eerste fout telt één, een volgende start telt door', () => {
    const one = noteBootOutcomes(undefined, { failed: ['tidyOldProposals'], succeeded: [] }, AT);
    expect(one).toEqual({ tidyOldProposals: { count: 1, firstAt: AT, lastAt: AT } });
    const two = noteBootOutcomes(one, { failed: ['tidyOldProposals'], succeeded: [] }, '2026-11-24T07:00:00.000Z');
    expect(two?.tidyOldProposals).toEqual({ count: 2, firstAt: AT, lastAt: '2026-11-24T07:00:00.000Z' });
  });

  it('lukt de stap weer, dan verdwijnt hij uit de teller; een lege teller is undefined', () => {
    const rec: BootFailureRecord = { tidyOldProposals: { count: 3, firstAt: AT, lastAt: AT } };
    expect(noteBootOutcomes(rec, { failed: [], succeeded: ['tidyOldProposals'] }, AT)).toBeUndefined();
  });

  it('niets veranderd: dezelfde waarde terug, zodat er niets geschreven hoeft te worden', () => {
    const rec: BootFailureRecord = { a: { count: 1, firstAt: AT, lastAt: AT } };
    expect(noteBootOutcomes(rec, { failed: [], succeeded: ['b'] }, AT)).toBe(rec);
    expect(noteBootOutcomes(undefined, { failed: [], succeeded: ['b'] }, AT)).toBeUndefined();
  });

  it('een kapotte waarde uit de opslag telt als leeg', () => {
    expect(noteBootOutcomes('rommel' as unknown as BootFailureRecord, { failed: ['a'], succeeded: [] }, AT)).toEqual({ a: { count: 1, firstAt: AT, lastAt: AT } });
    expect(noteBootOutcomes({ a: { count: 'x' } } as unknown as BootFailureRecord, { failed: ['a'], succeeded: [] }, AT)?.a.count).toBe(1);
  });

  it('de zin: niets bij geen fout, de stap met de meeste fouten op rij voorop', () => {
    expect(bootFailureLine(undefined)).toBeUndefined();
    expect(bootFailureLine({})).toBeUndefined();
    expect(bootFailureLine({ tidyOldProposals: { count: 1, firstAt: AT, lastAt: AT } })).toBe('Een herstelstap bij het openen mislukte de laatste start. Je gegevens blijven staan; de volgende start probeert het opnieuw.');
    expect(bootFailureLine({ a: { count: 2, firstAt: AT, lastAt: AT }, b: { count: 5, firstAt: AT, lastAt: AT } })).toBe('2 herstelstappen bij het openen mislukten de laatste 5 starts op rij. Je gegevens blijven staan; de volgende start probeert het opnieuw.');
  });

  it('de zin noemt geen stapnaam; die staat achter Details', () => {
    const rec = { 'seedIfEmpty@1': { count: 3, firstAt: AT, lastAt: AT }, tidyOldProposals: { count: 1, firstAt: AT, lastAt: AT } };
    expect(bootFailureLine(rec)).not.toMatch(/seedIfEmpty|tidyOldProposals|@/);
    expect(bootFailureDetails(rec)).toEqual(['seedIfEmpty@1: de laatste 3 starts op rij', 'tidyOldProposals: de laatste start']);
    expect(bootFailureDetails(undefined)).toEqual([]);
  });
});
