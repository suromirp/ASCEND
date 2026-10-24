import { describe, expect, it } from 'vitest';
import { keptNumbersLine, logSource } from './logSource';
import type { SessionLog } from '../models/training';

function log(extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'l1', templateId: 't', type: 'cardio', completedDate: '2026-10-01', completedAt: '2026-10-01T10:00:00.000Z',
    variant: 'full', durationMinutes: 60, source: 'manual', ...extra,
  };
}

describe('de bron van een log', () => {
  it('zelf ingevuld is de standaard', () => {
    expect(logSource(log())).toEqual({ label: 'Zelf ingevuld', icon: 'notitie' });
  });
  it('de bron van het blok met de getallen gaat voor', () => {
    expect(logSource(log({ source: 'manual', cardioData: { durationMinutes: 60, source: 'garmin' } })).label).toBe('Garmin');
    expect(logSource(log({ source: 'garmin', outdoorData: { durationMinutes: 60, source: 'health-connect' } })).label).toBe('Health Connect');
    expect(logSource(log({ source: 'garmin', cardioData: { durationMinutes: 60, source: 'manual' } })).label).toBe('Garmin');
  });
  it('een id van intervals.icu is Garmin', () => {
    expect(logSource(log({ source: 'import', externalId: 'intervals.icu:a1' }))).toEqual({ label: 'Garmin', icon: 'horloge' });
  });
  it('MacroFactor en import hebben hun eigen naam', () => {
    expect(logSource(log({ type: 'strength', source: 'macrofactor' })).label).toBe('MacroFactor');
    expect(logSource(log({ source: 'import' })).label).toBe('Geïmporteerd');
  });
});

describe('de bewaarde eigen getallen', () => {
  const taken = log({
    source: 'garmin', externalId: 'intervals.icu:a1',
    manualMeasured: { at: '2026-10-02T08:00:00.000Z', values: { durationMinutes: 55, elevationGainM: 41, avgHeartRate: null }, block: 'cardioData' },
  });
  it('noemt alleen de velden die van jou waren', () => {
    expect(keptNumbersLine(taken)).toBe('Je eigen getallen staan bewaard: 55 min, 41 m D+');
  });
  it('is er niet bij een gewone log of bij kracht van MacroFactor', () => {
    expect(keptNumbersLine(log())).toBeUndefined();
    expect(keptNumbersLine(log({ manualMeasured: { at: 'x', values: {}, strength: { workoutId: 'w' } } }))).toBeUndefined();
  });
  it('past in het Nederlands, met komma bij afstand', () => {
    const l = log({ manualMeasured: { at: 'x', values: { distanceKm: 6.9, durationMinutes: 75 }, block: 'cardioData' } });
    expect(keptNumbersLine(l)).toBe('Je eigen getallen staan bewaard: 1 uur 15 min, 6,9 km');
  });
});
