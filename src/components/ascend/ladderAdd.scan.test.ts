import { describe, expect, it } from 'vitest';

// Bewaakt het voorstel op de kaart Calisthenics algemeen (docs/beslissingen/2026-11-26-calisthenics-voorstel-benen-en-romp.md):
// alleen tokens, niets kleiner dan 12 px, de vaste woorden, Liever niet links en Akkoord rechts, één voorstel tegelijk,
// en elke opslag met een grens in tijd. Vitest leest CSS als lege tekst; `.mx-row-in` staat stil in Rustig en Uit.
const SOURCES = import.meta.glob<string>(['./LadderAddNotice.tsx', './useLadderAddProposal.ts', './GeneralStrengthCard.tsx', '../../pages/Ascend.tsx'], { query: '?raw', import: 'default', eager: true });
const read = (f: string): string => SOURCES[f] ?? '';

describe('het voorstel voor een ladder op de kaart Calisthenics algemeen', () => {
  const notice = read('./LadderAddNotice.tsx');
  const hook = read('./useLadderAddProposal.ts');
  const card = read('./GeneralStrengthCard.tsx');
  const page = read('../../pages/Ascend.tsx');

  it('leest de bestanden', () => {
    for (const src of [notice, hook, card, page]) expect(src.length).toBeGreaterThan(100);
  });

  it('alleen tokens, niets onder 12 px, geen hoofdletters als stijl, geen gedachtestreepje, geen eigen animatie', () => {
    for (const src of [notice, card]) {
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
      expect(src).not.toMatch(/text-\[(\d|1[01])px\]/);
      expect(src).not.toMatch(/\buppercase\b/);
      expect(src).not.toMatch(/[–—]/);
      expect(src).not.toMatch(/animate-|transition-/);
    }
    expect(notice).toContain('mx-row-in');
  });

  it('Liever niet links, Akkoord rechts, met de primitives; Ongedaan maken na Akkoord', () => {
    expect(notice.indexOf('>Liever niet<')).toBeGreaterThan(-1);
    expect(notice.indexOf('>Liever niet<')).toBeLessThan(notice.indexOf('>Akkoord<'));
    expect(notice).toContain('<SecondaryButton');
    expect(notice).toContain('<TextButton tone="dim"');
    expect(notice).toContain('>Ongedaan maken<');
  });

  it('de weergave rekent niets: de woorden en de beslissing komen uit de engine', () => {
    expect(notice).not.toMatch(/ladderAddProposals|updateSettings|useAppData/);
    expect(card).not.toMatch(/ladderAddProposals|updateSettings|useAppData/);
    expect(hook).toContain('ladderAddProposals(');
  });

  it('één voorstel tegelijk (één mint accent), elke opslag met een grens in tijd, Liever niet per ladder', () => {
    expect(hook).toContain('[0] ?? null');
    expect(hook.match(/saveWithLimit\(/g)?.length).toBe(2);
    expect(hook).toContain('rememberLadderAddDecline(proposal.ladderId)');
    expect(hook).toContain('.stepProposal');
  });
});
