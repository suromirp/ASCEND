import { describe, expect, it } from 'vitest';
import { cleanSettings } from './backupClean';

// De keuze "Wat erin staat" van de tekst voor Strava in een back-up (nagemaakt voorbeeld).
describe('stravaTextParts in een back-up', () => {
  it('houdt een geldige keuze', () => {
    const skipped = { n: 0 };
    expect(cleanSettings({ stravaTextParts: 'title' }, skipped)?.stravaTextParts).toBe('title');
    expect(cleanSettings({ stravaTextParts: 'title-line' }, skipped)?.stravaTextParts).toBe('title-line');
    expect(skipped.n).toBe(0);
  });

  it('laat een onbekende waarde weg en telt hem', () => {
    const skipped = { n: 0 };
    const out = cleanSettings({ stravaTextParts: 'alles', stravaText: false }, skipped);
    expect(out && 'stravaTextParts' in out).toBe(false);
    expect(out?.stravaText).toBe(false);
    expect(skipped.n).toBe(1);
  });

  it('een oude back-up zonder het veld blijft zoals hij is', () => {
    const skipped = { n: 0 };
    const out = cleanSettings({ stravaText: true }, skipped);
    expect(out && 'stravaTextParts' in out).toBe(false);
    expect(skipped.n).toBe(0);
  });
});
