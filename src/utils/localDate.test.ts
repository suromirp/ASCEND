import { describe, expect, it } from 'vitest';
import { localDateOf, localTimeOf } from './dates';
import { backupAge } from '../engine/settingsAttention';

// Werkt in elke tijdzone, omdat het moment lokaal wordt opgebouwd: een back-up om 00:13
// is in UTC nog de dag ervoor.
describe('lokale datum van een opgeslagen moment', () => {
  it('geeft de lokale dag, niet de UTC-dag', () => {
    const moment = new Date(2026, 9, 27, 0, 13).toISOString();
    expect(localDateOf(moment)).toBe('2026-10-27');
    expect(localTimeOf(moment)).toBe('00:13');
  });
  it('laat een gewone datum staan', () => {
    expect(localDateOf('2026-10-27')).toBe('2026-10-27');
  });
  it('een back-up net na middernacht telt als vandaag', () => {
    const moment = new Date(2026, 9, 27, 0, 13).toISOString();
    expect(backupAge(moment, '2026-10-27').days).toBe(0);
  });
});
