import { describe, expect, it } from 'vitest';
import type { InjuryNote } from '../models/injury';
import type { SessionLog } from '../models/training';
import { recurringSpots, recurrenceRange } from './bodyRecurrence';

// 2026-10-26 is een maandag; de acht weken lopen van 2026-09-07 tot en met de week van 2026-10-26.
const TODAY = '2026-10-28';
const note = (over: Partial<InjuryNote>): InjuryNote => ({ id: `n-${Math.random()}`, date: '2026-10-20', bodyPart: 'Knie rechts', severity: 'licht', ...over });

describe('wat terugkomt', () => {
  it('laat een plek met één week weg en toont er twee of meer', () => {
    expect(recurringSpots({ notes: [note({ kind: 'spierpijn', bodyPart: 'Quadriceps' })], logs: [], today: TODAY })).toEqual([]);
    const out = recurringSpots({
      notes: [note({ kind: 'spierpijn', bodyPart: 'Quadriceps', date: '2026-10-21' }), note({ kind: 'stijf', bodyPart: 'Quadriceps', date: '2026-10-06' })],
      logs: [],
      today: TODAY,
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ label: 'Bovenbenen', weeks: 2, open: false, worst: 1 });
    expect(out[0].cells).toEqual([0, 0, 0, 0, 1, 0, 1, 0]);
  });

  it('telt een week een keer, hoe vaak je het ook meldde', () => {
    const out = recurringSpots({
      notes: [
        note({ kind: 'spierpijn', bodyPart: 'Kuit', date: '2026-10-20' }), note({ kind: 'stijf', bodyPart: 'Kuit', date: '2026-10-21' }), note({ kind: 'spierpijn', bodyPart: 'Kuit', date: '2026-10-22' }),
        note({ kind: 'spierpijn', bodyPart: 'Kuit', date: '2026-10-08' }),
      ],
      logs: [],
      today: TODAY,
    });
    expect(out[0].weeks).toBe(2);
  });

  it('laat pijn zwaarder tellen dan spierpijn en loopt door zolang hij open is', () => {
    const out = recurringSpots({ notes: [note({ date: '2026-10-08' })], logs: [], today: TODAY });
    expect(out[0]).toMatchObject({ label: 'Knie rechts', open: true, worst: 2, weeks: 4 });
    expect(out[0].cells).toEqual([0, 0, 0, 0, 2, 2, 2, 2]);
    const closed = recurringSpots({ notes: [note({ date: '2026-10-08', resolvedDate: '2026-10-14' })], logs: [], today: TODAY });
    expect(closed[0]).toMatchObject({ open: false, weeks: 2 });
  });

  it('telt de pijn die trainingen gaven en de oude weekantwoorden mee', () => {
    const painLog = (date: string): SessionLog => ({ id: date, templateId: 't', type: 'cardio', completedDate: date, completedAt: date, variant: 'full', durationMinutes: 40, source: 'manual', painReports: [{ area: 'Scheen', score: 4 }] }) as SessionLog;
    const out = recurringSpots({ notes: [], logs: [painLog('2026-10-21')], checks: [{ weekStart: '2026-10-05', trouble: 'minder', area: 'Scheen' }], today: TODAY });
    expect(out[0]).toMatchObject({ label: 'Scheenbenen', weeks: 2, worst: 2 });
  });

  it('zet een open klacht bovenaan en daarna wat het vaakst terugkomt', () => {
    const out = recurringSpots({
      notes: [
        note({ kind: 'spierpijn', bodyPart: 'Schouder', date: '2026-10-21' }), note({ kind: 'spierpijn', bodyPart: 'Schouder', date: '2026-10-14' }), note({ kind: 'spierpijn', bodyPart: 'Schouder', date: '2026-10-07' }),
        note({ date: '2026-10-14' }),
      ],
      logs: [],
      today: TODAY,
    });
    expect(out.map((o) => o.label)).toEqual(['Knie rechts', 'Schouders']);
  });

  it('negeert wat buiten de acht weken ligt, en geeft het bereik voor de regel', () => {
    expect(recurringSpots({ notes: [note({ kind: 'spierpijn', bodyPart: 'Kuit', date: '2026-01-05' }), note({ kind: 'spierpijn', bodyPart: 'Kuit', date: '2026-01-12' })], logs: [], today: TODAY })).toEqual([]);
    expect(recurrenceRange(TODAY)).toEqual({ from: '2026-09-07', to: TODAY });
  });

  it('zet dezelfde knie niet twee keer neer als de melding een kant heeft en het weekantwoord niet', () => {
    const out = recurringSpots({
      notes: [note({ bodyPart: 'Knie rechts', date: '2026-10-20' }), note({ bodyPart: 'Knie rechts', date: '2026-10-13', resolvedDate: '2026-10-14' })],
      logs: [],
      checks: [
        { weekStart: '2026-10-19', trouble: 'wel_gewoon', area: 'Knie', severity: 'mild' },
        { weekStart: '2026-10-12', trouble: 'wel_gewoon', area: 'Knie', severity: 'mild' },
      ],
      today: TODAY,
    });
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('Knie|rechts');
    expect(out[0].weeks).toBe(3);
  });
});
