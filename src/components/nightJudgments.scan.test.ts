import { describe, expect, it } from 'vitest';

// Een oordeel "Niet goed gemeten" wordt nooit rechtstreeks uit de instellingen gelezen om te rekenen:
// altijd via engine/shortNight.ts#judgmentsInUse, zodat het nergens meetelt als "Vragen bij een korte
// nacht" uit staat (docs/beslissingen/2026-11-20-niet-goed-gemeten-rest.md). Het woord nightJudgments
// mag alleen staan in de bestanden hieronder; een nieuw bestand komt er pas bij als het de regel volgt.
const sources = import.meta.glob(
  ['./**/*.{ts,tsx}', '../pages/**/*.{ts,tsx}', '../state/**/*.{ts,tsx}', '../engine/**/*.{ts,tsx}', '../integrations/**/*.{ts,tsx}', '!**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const ALLOWED = [
  // Schrijft het oordeel.
  './ShortNightAsk.tsx',
  // Geeft de lijst van judgmentsInUse door aan de engine, onder de naam van het invoerveld.
  './influence/useInfluenceEffects.ts',
  // De regel zelf.
  '../engine/shortNight.ts',
  // Het invoerveld van de calculator; krijgt de lijst van de aanroeper.
  '../engine/influenceEffects.ts',
];

describe('oordelen over een nacht lezen', () => {
  it('vindt de bestanden', () => {
    for (const file of [...ALLOWED, './useIllnessSign.ts', '../engine/influence.ts']) expect(Object.keys(sources), file).toContain(file);
    expect(Object.keys(sources).some((f) => f.startsWith('../integrations/'))).toBe(true);
  });

  it('nightJudgments staat alleen in de toegestane bestanden', () => {
    const found = Object.entries(sources).filter(([, text]) => /\bnightJudgments\b/.test(text)).map(([file]) => file).sort();
    expect(found).toEqual([...ALLOWED].sort());
  });

  it('geen bestand buiten het schrijvende blad en de regel zelf leest settings.nightJudgments zelf', () => {
    const direct = Object.entries(sources).filter(([file, text]) => file !== './ShortNightAsk.tsx' && file !== '../engine/shortNight.ts' && /settings\.nightJudgments/.test(text)).map(([file]) => file);
    expect(direct).toEqual([]);
  });

  it('wie een oordeel nodig heeft, vraagt het aan judgmentsInUse', () => {
    for (const file of ['./useWellness.ts', './useIllnessSign.ts', './influence/useInfluence.ts', './influence/useInfluenceEffects.ts']) {
      expect(sources[file], file).toContain('judgmentsInUse(settings)');
    }
  });
});
