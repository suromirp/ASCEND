import { describe, expect, it } from 'vitest';
import type { SessionLog } from '../models/training';
import type { RunDetail } from '../models/runDetail';
import { AUTO_DETAIL_DAYS, detailFetchMode } from './detailFetch';

// Nagemaakte loopjes van het horloge.
const today = '2026-11-02';

function run(date: string, extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id: `r-${date}`, templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', completedDate: date, completedAt: `${date}T08:00:00.000Z`, variant: 'full', durationMinutes: 40,
    cardioData: { durationMinutes: 40, distanceKm: 7, source: 'garmin' }, externalId: 'intervals.icu:i1', source: 'garmin', ...extra,
  };
}

const rd: RunDetail = {
  version: 1, wholeKm: 7, wholeMinutes: 40, builtAt: '2026-10-01T00:00:00.000Z', totalM: 7000, movingSec: 2400, pauseSec: 0,
  kms: [{ index: 1, startM: 0, endM: 1000, distanceM: 1000, sec: 340, paceSecKm: 340 }],
  line: { n: 2, distM: [0, 7000], timeSec: [0, 2400], paceSecKm: [340, 340], hr: [140, 150], altitudeM: [0, 0] },
};

describe('details van een oudere run ophalen', () => {
  it('een run van de laatste dagen haalt ze zelf op als het blad opent, zoals voor een nieuwe run', () => {
    expect(detailFetchMode(run(today), today)).toBe('auto');
    expect(detailFetchMode(run('2026-10-19'), today)).toBe('auto');
    expect(AUTO_DETAIL_DAYS).toBe(14);
  });

  it('een oudere run zonder kilometers krijgt de knop, nooit vanzelf', () => {
    expect(detailFetchMode(run('2026-10-18'), today)).toBe('button');
    expect(detailFetchMode(run('2025-06-01'), today)).toBe('button');
  });

  it('een oudere run met kilometers houdt het onderhoud bij het openen, zoals het was', () => {
    expect(detailFetchMode(run('2026-09-01', { runDetail: rd }), today)).toBe('auto');
  });

  it('niets zonder horloge, na inkorten, of voor iets wat geen loop of tocht is', () => {
    expect(detailFetchMode(run('2026-09-01', { externalId: undefined }), today)).toBe('none');
    expect(detailFetchMode(run('2026-09-01', { trim: { at: '2026-09-02T00:00:00.000Z', startSec: 0, endSec: 100, original: {} } as never }), today)).toBe('none');
    expect(detailFetchMode(run('2026-09-01', { templateId: 'tpl_upper', type: 'strength', sport: undefined, cardioData: undefined }), today)).toBe('none');
  });
});
