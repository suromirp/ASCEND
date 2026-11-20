import { describe, expect, it } from 'vitest';

// Een oordeel "Niet goed gemeten" wordt nooit rechtstreeks uit de instellingen gelezen om te rekenen:
// altijd via engine/shortNight.ts#judgmentsInUse, zodat het nergens meetelt als "Vragen bij een korte
// nacht" uit staat (docs/beslissingen/2026-11-20-niet-goed-gemeten-rest.md). Alleen het blad dat het
// oordeel schrijft leest de ruwe lijst.
const sources = import.meta.glob(['./**/*.{ts,tsx}', '../pages/**/*.{ts,tsx}', '../state/**/*.{ts,tsx}', '!**/*.test.{ts,tsx}'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const WRITERS = ['./ShortNightAsk.tsx'];

describe('oordelen over een nacht lezen', () => {
  it('vindt de bestanden', () => {
    expect(Object.keys(sources)).toContain('./ShortNightAsk.tsx');
    expect(Object.keys(sources)).toContain('./useIllnessSign.ts');
  });

  it('geen component, pagina of hook leest settings.nightJudgments zelf', () => {
    const direct = Object.entries(sources).filter(([file, text]) => !WRITERS.includes(file) && /settings\.nightJudgments/.test(text)).map(([file]) => file);
    expect(direct).toEqual([]);
  });

  it('wie een oordeel nodig heeft, vraagt het aan judgmentsInUse', () => {
    for (const file of ['./useWellness.ts', './useIllnessSign.ts', './influence/useInfluence.ts', './influence/useInfluenceEffects.ts']) {
      expect(sources[file], file).toContain('judgmentsInUse(settings)');
    }
  });
});
