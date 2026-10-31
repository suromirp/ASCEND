import { describe, expect, it } from 'vitest';
import { SIGNAL_KEYS, signalOn, signalsOnCount } from './signalSettings';
import { rowSummary } from './settingsSummary';
import { normalizeBackupToCurrentModel } from '../storage/backup';

describe('signalen uit je gegevens', () => {
  it('staan allemaal aan tot je er een uitzet', () => {
    expect(SIGNAL_KEYS).toEqual(['illnessSigns', 'morningRule', 'heatPace', 'weekdayPattern', 'airQuality']);
    expect(signalsOnCount(undefined)).toBe(5);
    expect(signalOn({ heatPace: false }, 'heatPace')).toBe(false);
    expect(signalsOnCount({ heatPace: false, airQuality: false })).toBe(3);
  });

  it('de rij van het blad telt wat aan staat', () => {
    expect(rowSummary('bundel-signalen', { settings: { airQuality: false } } as never).value).toBe('4 van 5 aan');
  });

  it('een oude back-up heeft ze niet en importeert zoals hij was, een verkeerde waarde valt weg', () => {
    const old = normalizeBackupToCurrentModel({ backupSchemaVersion: 5, createdAt: '2026-10-01T08:00:00.000Z', payload: { version: 5, settings: { askShortNight: true } } });
    for (const key of [...SIGNAL_KEYS, 'watchSilence', 'morningInBackup']) expect(old.settings).not.toHaveProperty(key);
    const bad = normalizeBackupToCurrentModel({ backupSchemaVersion: 5, createdAt: '2026-10-31T08:00:00.000Z', payload: { version: 5, settings: { heatPace: 'ja', airQuality: false, watchSilence: 1 } } });
    expect(bad.settings).not.toHaveProperty('heatPace');
    expect(bad.settings).not.toHaveProperty('watchSilence');
    expect(bad.settings.airQuality).toBe(false);
  });
});
