import { describe, expect, it } from 'vitest';
import { backupAge, backupAgoText, backupNeedsAttention } from './settingsAttention';
import { backupSpoken, shortGoalName, statusCells, type StatusFacts } from './settingsStatus';

const TODAY = '2026-10-22';

const base: StatusFacts = {
  today: TODAY,
  position: { weekInProgram: 9, totalWeeks: 45, phaseName: 'OPBOUW' },
  goal: { name: 'GR5 / ALPENKLAAR', date: '2027-07-04' },
  lastExportedAt: '2026-10-10T09:00:00.000Z',
};

describe('backupAge', () => {
  it('nooit, oud of in orde', () => {
    expect(backupAge(undefined, TODAY)).toEqual({ days: null, level: 'never' });
    expect(backupAge('2026-10-10T09:00:00.000Z', TODAY)).toEqual({ days: 12, level: 'old' });
    expect(backupAge('2026-10-15T09:00:00.000Z', TODAY)).toEqual({ days: 7, level: 'ok' });
    expect(backupAge('2026-10-14T09:00:00.000Z', TODAY)).toEqual({ days: 8, level: 'old' });
    expect(backupAge('2026-10-22T07:00:00.000Z', TODAY)).toEqual({ days: 0, level: 'ok' });
  });

  it('een back-up uit de toekomst telt als vandaag', () => {
    expect(backupAge('2026-10-30T09:00:00.000Z', TODAY).days).toBe(0);
  });

  it('woorden voor de leeftijd, en wat aandacht vraagt', () => {
    expect(backupAgoText(backupAge(undefined, TODAY))).toBe('Nog nooit');
    expect(backupAgoText(backupAge('2026-10-22T07:00:00.000Z', TODAY))).toBe('Vandaag');
    expect(backupAgoText(backupAge('2026-10-21T07:00:00.000Z', TODAY))).toBe('Gisteren');
    expect(backupAgoText(backupAge('2026-10-10T07:00:00.000Z', TODAY))).toBe('12 dagen geleden');
    expect(backupNeedsAttention(backupAge(undefined, TODAY))).toBe(true);
    expect(backupNeedsAttention(backupAge('2026-10-10T07:00:00.000Z', TODAY))).toBe(true);
    expect(backupNeedsAttention(backupAge('2026-10-20T07:00:00.000Z', TODAY))).toBe(false);
  });
});

describe('statusCells', () => {
  it('fase, doel en een oude back-up in goud', () => {
    const [fase, doel, backup] = statusCells(base);
    expect(fase).toMatchObject({ label: 'Fase', value: 'Opbouw', detail: 'week 9 van 45', attention: false });
    expect(doel).toMatchObject({ label: 'Doel', value: 'GR5', detail: 'nog 255 dagen', attention: false });
    expect(backup).toMatchObject({ label: 'Back-up', value: '12 dagen', detail: 'Nu maken', attention: true });
  });

  it('een recente back-up krijgt geen goud', () => {
    const [, , backup] = statusCells({ ...base, lastExportedAt: '2026-10-20T09:00:00.000Z' });
    expect(backup).toMatchObject({ value: '2 dagen', attention: false });
    expect(backup.detail).not.toBe('Nu maken');
  });

  it('een nieuw toestel: geen doel, nog geen back-up', () => {
    const [fase, doel, backup] = statusCells({ ...base, position: null, goal: null, lastExportedAt: undefined });
    expect(fase).toMatchObject({ value: 'Geen', dim: true });
    expect(doel).toMatchObject({ value: 'Geen', detail: 'kies een doel', dim: true });
    expect(backup).toMatchObject({ value: 'Nooit', detail: 'Nu maken', attention: true });
  });

  it('elk vak zegt waar je het verandert', () => {
    const [fase, doel, backup] = statusCells(base);
    expect(fase.target).toEqual({ page: 'doel', row: 'programma', sheet: true });
    expect(doel.target).toEqual({ page: 'doel', row: 'doelen' });
    expect(backup.target).toEqual({ page: 'gegevens', row: 'backup', sheet: true });
  });

  it('één dag voor het doel', () => {
    expect(statusCells({ ...base, goal: { name: 'GR5', date: '2026-10-23' } })[1].detail).toBe('nog 1 dag');
  });

  it('de zin voor schermlezers', () => {
    expect(backupSpoken('2026-10-10T09:00:00.000Z', TODAY)).toBe('Back-up: 12 dagen geleden, nu maken');
    expect(backupSpoken('2026-10-21T09:00:00.000Z', TODAY)).toBe('Back-up: gisteren');
  });
});

describe('shortGoalName', () => {
  it('houdt een doelnaam kort genoeg voor een vak', () => {
    expect(shortGoalName('GR5 / ALPENKLAAR')).toBe('GR5');
    expect(shortGoalName('Marathon')).toBe('Marathon');
    expect(shortGoalName('Mont Blanc rondom')).toBe('Mont');
    expect(shortGoalName('Dolomietenhoogroute')).toBe('Dolomiete…');
  });
});
