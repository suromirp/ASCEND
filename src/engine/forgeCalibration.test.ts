import { describe, expect, it } from 'vitest';
import type { SessionLog, SetLog } from '../models/training';
import { addDays } from '../utils/dates';
import { biasLine, calibrate, exerciseLine, strengthLine, trendOf, MIN_SETS } from './forgeCalibration';

const TODAY = '2026-11-09';

function log(daysAgo: number, exerciseId: string, name: string, sets: SetLog[], id = `l${daysAgo}${exerciseId}`): SessionLog {
  const date = addDays(TODAY, -daysAgo);
  return { id, templateId: 't', type: 'strength', completedDate: date, completedAt: `${date}T18:00:00.000Z`, variant: 'custom', durationMinutes: 50, source: 'manual', strengthData: [{ exerciseId, exerciseName: name, sets }] };
}

// Een werkset uit Forge: Forge vroeg 10 herhalingen met 2 over op 60 kg.
const set = (o: Partial<SetLog> = {}): SetLog => ({ reps: 10, weightKg: 60, rir: 2, kind: 'work', repsAsked: 10, weightKgAsked: 60, rirAsked: 2, ...o });

describe('Voorspelling', () => {
  it('telt de sets die hooguit 1 naast de voorspelling lagen, omgerekend naar de gevraagde RIR', () => {
    // 10 met 2 over = 0 ernaast, 9 = -1, 11 met 1 over = 0, 10 met 3 over = +1: raak. 8 en 12 met 2 over zijn 2 ernaast: mis (4 van 6 is 67 procent, onder de 70).
    const sets = [set(), set({ reps: 9 }), set({ reps: 11, rir: 1 }), set({ reps: 8 }), set({ reps: 12 }), set({ reps: 10, rir: 3 })];
    const c = calibrate({ logs: [log(3, 'bench-press', 'Bankdrukken', sets)], today: TODAY });
    expect(c.prediction).toMatchObject({ sets: 6, hit: 4, verdict: 'nog_niet' });
    expect(c.lines.prediction).toBe('Voorspelling: 4 van de 6 sets raak');
  });

  it('een set met een ander gewicht dan Forge vroeg of zonder eigen RIR is geen meting', () => {
    const sets = [set(), set({ weightKg: 62.5 }), set({ rir: 2, rirAssumed: true }), set({ rir: undefined }), set(), set(), set()];
    const c = calibrate({ logs: [log(3, 'bench-press', 'Bankdrukken', sets)], today: TODAY });
    expect(c.prediction.sets).toBe(4);
  });

  it('volgt het gewicht na een bijstelling van Forge (forgeKg)', () => {
    const adjusted = set({ weightKg: 57.5, forgeKg: 57.5 });
    const c = calibrate({ logs: [log(3, 'bench-press', 'Bankdrukken', [adjusted, ...Array.from({ length: 5 }, () => set())])], today: TODAY });
    expect(c.prediction.sets).toBe(6);
    expect(c.adjust.adjusted).toBe(0);
  });

  it('Forge schrijft steeds 2 te zwaar voor: geen enkele raak, scheef, en het oordeel is nog niet', () => {
    // Je haalt steeds 12 met 2 over waar Forge 10 voorspelde: 2 meer dan voorspeld = te licht...
    // en andersom: Forge vroeg 12, je haalde 10: 2 te zwaar.
    const sets = Array.from({ length: 8 }, () => set({ repsAsked: 12 }));
    const c = calibrate({ logs: [log(3, 'bench-press', 'Bankdrukken', sets)], today: TODAY });
    expect(c.prediction).toMatchObject({ sets: 8, hit: 0, meanDeviation: -2, verdict: 'nog_niet' });
    expect(c.lines.bias).toBe('Forge schreef gemiddeld 2 herhalingen te zwaar voor.');
    expect(c.allGood).toBe(false);
  });

  it('70 procent is de grens', () => {
    const mk = (hits: number) => [...Array.from({ length: hits }, () => set()), ...Array.from({ length: 10 - hits }, () => set({ reps: 7 }))];
    expect(calibrate({ logs: [log(3, 'bench-press', 'B', mk(7))], today: TODAY }).prediction.verdict).toBe('goed');
    expect(calibrate({ logs: [log(3, 'bench-press', 'B', mk(6))], today: TODAY }).prediction.verdict).toBe('nog_niet');
  });
});

describe('Bijgestuurd', () => {
  it('telt een ander gewicht, en bij een afgevinkte set zonder eigen RIR ook andere herhalingen', () => {
    const sets = [
      set(),
      set({ weightKg: 62.5 }), // zelf zwaarder
      set({ rir: 2, rirAssumed: true, reps: 10 }), // afgevinkt zoals gevraagd
      set({ rir: 2, rirAssumed: true, reps: 8 }), // afgevinkt met andere herhalingen
      set({ reps: 8 }), // andere herhalingen met eigen RIR: dat is de uitkomst, geen bijsturing
      set(),
    ];
    const c = calibrate({ logs: [log(3, 'bench-press', 'Bankdrukken', sets)], today: TODAY });
    expect(c.adjust).toMatchObject({ sets: 6, adjusted: 2, verdict: 'nog_niet' });
    expect(c.lines.adjust).toBe('Bijgestuurd: 2 op de 6 sets');
  });

  it('minder dan 1 op de 10 is goed, en zonder bijsturing staat er geen getal 0', () => {
    const none = calibrate({ logs: [log(3, 'bench-press', 'Bankdrukken', Array.from({ length: 12 }, () => set()))], today: TODAY });
    expect(none.adjust.verdict).toBe('goed');
    expect(none.lines.adjust).toBe('Bijgestuurd: geen van de 12 sets');
    const one = calibrate({ logs: [log(3, 'bench-press', 'Bankdrukken', [set({ weightKg: 65 }), ...Array.from({ length: 11 }, () => set())])], today: TODAY });
    expect(one.adjust).toMatchObject({ adjusted: 1, sets: 12, verdict: 'goed' });
    expect(one.lines.adjust).toBe('Bijgestuurd: 1 op de 12 sets');
    const edge = calibrate({ logs: [log(3, 'bench-press', 'Bankdrukken', [set({ weightKg: 65 }), ...Array.from({ length: 9 }, () => set())])], today: TODAY });
    expect(edge.adjust.verdict).toBe('nog_niet');
  });
});

describe('Genoeg data', () => {
  it('te weinig sets: nog te weinig data in plaats van een getal', () => {
    const c = calibrate({ logs: [log(3, 'bench-press', 'Bankdrukken', Array.from({ length: MIN_SETS - 1 }, () => set()))], today: TODAY });
    expect(c.prediction.verdict).toBe('te_weinig');
    expect(c.adjust.verdict).toBe('te_weinig');
    expect(c.lines.prediction).toBe('Voorspelling: nog te weinig data');
    expect(c.lines.adjust).toBe('Bijgestuurd: nog te weinig data');
    expect(c.lines.bias).toBeUndefined();
    expect(c.allGood).toBe(false);
    expect(c.perExercise[0].enough).toBe(false);
    expect(exerciseLine(c.perExercise[0])).toBe('Nog te weinig data (5 van 6 sets)');
  });

  it('een oefening met te weinig sets telt niet mee in het geheel', () => {
    const rich = Array.from({ length: 6 }, () => set());
    const poor = Array.from({ length: 3 }, () => set({ reps: 5 }));
    const c = calibrate({ logs: [log(3, 'bench-press', 'Bankdrukken', rich), log(2, 'squat', 'Squat', poor)], today: TODAY });
    expect(c.prediction).toMatchObject({ sets: 6, hit: 6 });
    expect(c.perExercise.map((e) => e.enough)).toEqual([true, false]);
  });

  it('oude logs zonder wat Forge vroeg (ook afgevinkte sets van voor rirAsked), logs buiten het venster en MacroFactor-logs tellen niet', () => {
    const oldSets: SetLog[] = Array.from({ length: 8 }, () => ({ reps: 10, weightKg: 60, rir: 2, kind: 'work', rirAssumed: true, repsAsked: 10, weightKgAsked: 60 }));
    const outside = log(40, 'bench-press', 'Bankdrukken', Array.from({ length: 8 }, () => set()));
    const mf = { ...log(3, 'bench-press', 'Bankdrukken', Array.from({ length: 8 }, () => set())), source: 'macrofactor' as const };
    const c = calibrate({ logs: [log(3, 'bench-press', 'Bankdrukken', oldSets), outside, mf], today: TODAY });
    expect(c.perExercise).toEqual([]);
    expect(c.prediction.verdict).toBe('te_weinig');
  });

  it('een opwarmset, een houding en een set met band tellen niet', () => {
    const sets = [set({ kind: 'warmup' }), set({ seconds: 30 }), set({ band: 'licht' }), set(), set(), set()];
    expect(calibrate({ logs: [log(3, 'bench-press', 'Bankdrukken', sets)], today: TODAY }).perExercise[0].sets).toBe(3);
  });
});

describe('Sterker', () => {
  // Een bankdruksessie waarvan de kracht (Epley) met `kg` meegroeit: telkens 5 herhalingen met 0 over.
  const bench = (daysAgo: number, kg: number) => log(daysAgo, 'bench-press', 'Bankdrukken', [{ reps: 5, weightKg: kg, rir: 0, kind: 'work' }]);

  it('stijgt, blijft gelijk of daalt over 6 tot 8 weken', () => {
    const up = calibrate({ logs: [bench(55, 80), bench(35, 85), bench(14, 90), bench(2, 95)], today: TODAY });
    expect(up.strength.readings[0]).toMatchObject({ trend: 'stijgt' });
    expect(up.strength.verdict).toBe('goed');
    const flat = calibrate({ logs: [bench(55, 80), bench(35, 80), bench(14, 80), bench(2, 80)], today: TODAY });
    expect(flat.strength.readings[0].trend).toBe('gelijk');
    expect(flat.strength.verdict).toBe('goed');
    const down = calibrate({ logs: [bench(55, 95), bench(35, 90), bench(14, 85), bench(2, 80)], today: TODAY });
    expect(down.strength.readings[0].trend).toBe('daalt');
    expect(down.strength.verdict).toBe('nog_niet');
  });

  it('te weinig trainingen of te kort: nog te weinig data', () => {
    expect(calibrate({ logs: [bench(55, 80), bench(2, 95)], today: TODAY }).strength.verdict).toBe('te_weinig');
    expect(calibrate({ logs: [bench(20, 80), bench(10, 85), bench(2, 95)], today: TODAY }).strength.verdict).toBe('te_weinig');
    expect(calibrate({ logs: [bench(20, 80), bench(10, 85), bench(2, 95)], today: TODAY }).lines.strength).toBe('Sterker: nog te weinig data');
  });

  it('geen hoofdoefening: een isolatie-oefening telt niet', () => {
    const curl = (d: number) => log(d, 'biceps-curl', 'Biceps Curl', [{ reps: 10, weightKg: 15, rir: 1, kind: 'work' }]);
    expect(calibrate({ logs: [curl(55), curl(35), curl(14), curl(2)], today: TODAY }).strength.readings).toEqual([]);
  });

  it('de regel noemt de namen met hun richting', () => {
    expect(strengthLine([{ key: 'a', name: 'Bankdrukken', trend: 'stijgt', change: 0.1, sessions: 4 }, { key: 'b', name: 'Squat', trend: 'stijgt', change: 0.1, sessions: 4 }])).toBe('Sterker: Bankdrukken en Squat stijgen');
    expect(strengthLine([{ key: 'a', name: 'Bankdrukken', trend: 'stijgt', change: 0.1, sessions: 4 }, { key: 'b', name: 'Squat', trend: 'gelijk', change: 0, sessions: 4 }, { key: 'c', name: 'Roeien', trend: 'daalt', change: -0.1, sessions: 4 }])).toBe('Sterker: Bankdrukken stijgt, Squat blijft gelijk, Roeien daalt');
    expect(trendOf(0.019)).toBe('gelijk');
    expect(trendOf(-0.03)).toBe('daalt');
  });
});

describe('alles goed', () => {
  it('is waar als de drie maten goed zijn', () => {
    const sets = Array.from({ length: 10 }, () => set());
    const bench = (d: number, kg: number) => log(d, 'bench-press', 'Bankdrukken', [...sets, { reps: 5, weightKg: kg, rir: 0, kind: 'work' }]);
    const c = calibrate({ logs: [bench(50, 80), bench(30, 82.5), bench(14, 85), bench(2, 87.5)], today: TODAY });
    // Alleen de laatste 4 weken tellen voor voorspelling en bijsturen: 20 sets uit twee trainingen.
    expect(c.prediction.verdict).toBe('goed');
    expect(c.adjust.verdict).toBe('goed');
    expect(c.strength.verdict).toBe('goed');
    expect(c.allGood).toBe(true);
  });

  it('biasLine zwijgt bij een kleine scheefheid', () => {
    expect(biasLine(0.3)).toBeUndefined();
    expect(biasLine(-1.5)).toBe('Forge schreef gemiddeld 1,5 herhalingen te zwaar voor.');
    expect(biasLine(1)).toBe('Forge schreef gemiddeld 1 herhaling te licht voor.');
  });
});
