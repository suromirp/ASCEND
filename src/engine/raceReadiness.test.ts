import { describe, it, expect } from 'vitest';
import { computeRaceReadiness, resolveReadinessWeighting, raceWeightSentence, RACE_SPEED_WEIGHTS, NO_TEST_LINE, WAITING_LINE } from './raceReadiness';
import { computeGoalReadiness, readinessInputOf } from './goalReadiness';
import type { TrainingGoal } from '../models/goals';
import type { SessionLog } from '../models/training';

// Nagemaakte gegevens: 10 km in 45:00, wedstrijd op 20 maart 2027, testloop van 5 km in 26:42.
const TODAY = '2026-10-23';
const naming = { the: 'je wedstrijd', your: 'je wedstrijd' };
const goal = (details: Record<string, unknown> = { distanceKm: 10, targetMinutes: 45 }, createdAt = '2026-08-01T10:00:00Z'): TrainingGoal => ({
  id: 'race', name: 'Hardloopwedstrijd', status: 'active', targetDate: '2027-03-20', createdAt, updatedAt: createdAt,
  kind: 'run_race', details, requirements: [],
} as TrainingGoal);

let n = 0;
const run = (date: string, minutes: number, km: number, extra: Partial<SessionLog> = {}): SessionLog => ({
  id: `l${n++}`, templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full',
  durationMinutes: minutes, source: 'manual', cardioData: { modality: 'run', durationMinutes: minutes, distanceKm: km, source: 'manual' },
  ...extra,
} as SessionLog);
const test = (date: string, minutes: number, km = 5, extra: Partial<SessionLog> = {}) => run(date, minutes, km, { templateId: 'tpl_test_run', ...extra });

// Langste loop 8,6 km, 12,6 km per week over vier weken (50,4 km in totaal).
const training = [
  run('2026-10-20', 60, 8.6), run('2026-10-13', 40, 6), run('2026-10-06', 45, 7), run('2026-09-30', 60, 8.6), run('2026-09-28', 40, 6), run('2026-10-16', 70, 14.2),
];
const accepted = test('2026-10-10', 26 + 42 / 60, 5);

describe('Klaar voor je doel bij een wedstrijd met een doeltijd', () => {
  it('rekent snelheid als doeltijd gedeeld door verwachte tijd, begrensd op 100%', () => {
    const r = computeRaceReadiness(goal(), [accepted, ...training], TODAY, { naming })!;
    const speed = r.meters.find((m) => m.key === 'verwachteTijd')!;
    expect(speed.label).toBe('Snelheid');
    expect(speed.share).toBeCloseTo(45 / (26.7 * Math.pow(2, 1.06)), 3);
    expect(speed.text).toBe('55:40, doel 45:00');
    const fast = computeRaceReadiness(goal({ distanceKm: 10, targetMinutes: 70 }), [accepted, ...training], TODAY, { naming })!;
    expect(fast.meters.find((m) => m.key === 'verwachteTijd')!.share).toBe(1);
  });

  it('weegt snelheid 60% en de twee andere meters 20%', () => {
    expect(RACE_SPEED_WEIGHTS).toEqual({ verwachteTijd: 0.6, langsteLoop: 0.2, weekvolume: 0.2, volhouden: 0 });
    const r = computeRaceReadiness(goal(), [accepted, ...training], TODAY, { naming })!;
    const by = Object.fromEntries(r.meters.map((m) => [m.key, m.share]));
    const expected = Math.round((0.6 * by.verwachteTijd + 0.2 * by.langsteLoop + 0.2 * by.weekvolume) * 100);
    expect(r.percent).toBe(expected);
    expect(r.sentence).toContain('Snelheid telt voor 60% mee');
  });

  it('laat snelheid op 60% staan ook met vier gemeten meters (Volhouden weegt 0)', () => {
    const four = computeGoalReadiness(readinessInputOf(goal())!, [accepted, ...training], TODAY, {
      naming,
      external: (id) => (id === 'verwachteTijd' ? { share: 0.5, text: 'x' } : id === 'volhouden' ? { share: 0.1, text: 'y' } : undefined),
      weights: RACE_SPEED_WEIGHTS,
    });
    expect(four.meters.map((m) => m.key)).toEqual(expect.arrayContaining(['verwachteTijd', 'langsteLoop', 'weekvolume', 'volhouden']));
    const by = Object.fromEntries(four.meters.map((m) => [m.key, m.share]));
    expect(four.percent).toBe(Math.round((0.6 * by.verwachteTijd + 0.2 * by.langsteLoop + 0.2 * by.weekvolume) * 100));
    expect(raceWeightSentence()).toBe('Snelheid telt voor 60% mee, je langste loop en je weekvolume voor 20% elk. Elke meter stopt bij 100%.');
  });

  it('noemt Volhouden niet als het ontbreekt', () => {
    const r = computeRaceReadiness(goal(), [accepted, ...training], TODAY, { naming })!;
    expect(r.missingSentence).toBeUndefined();
  });

  it('zegt de afstand tot het doel in hele seconden, nooit 0:60', () => {
    // Verwacht ruim boven het doel met een verschil dat per km net op een hele minuut afrondt.
    for (const target of [44.99, 45, 45.01, 30, 30.008]) {
      const r = computeRaceReadiness(goal({ distanceKm: 10, targetMinutes: target }), [accepted, ...training], TODAY, { naming })!;
      expect(r.race?.nowLine).not.toMatch(/:60/);
    }
  });

  it('zegt dat je er al onder zit', () => {
    const r = computeRaceReadiness(goal({ distanceKm: 10, targetMinutes: 70 }), [accepted, ...training], TODAY, { naming })!;
    expect(r.race?.nowLine).toBe('Verwacht nu 55:40. Doel 1:10:00: je zit er nu al onder.');
  });

  it('weegt alles gelijk als je dat kiest', () => {
    const r = computeRaceReadiness(goal(), [accepted, ...training], TODAY, { naming, weighting: 'equal' })!;
    const mean = r.meters.reduce((s, m) => s + m.share, 0) / r.meters.length;
    expect(r.percent).toBe(Math.round(mean * 100));
  });

  it('noemt de laagste meter bij "Hier is het meeste te winnen"', () => {
    const r = computeRaceReadiness(goal(), [accepted, ...training], TODAY, { naming })!;
    const lowest = [...r.meters].sort((a, b) => a.share - b.share)[0];
    expect(r.weakest?.key).toBe(lowest.key);
    expect(r.weakestSentence).toContain(lowest.label.toLowerCase());
  });

  it('toont de afstand tot het doel als werk en de band als feit, zonder oordeel', () => {
    const r = computeRaceReadiness(goal(), [accepted, ...training], TODAY, { naming })!;
    expect(r.race?.status).toBe('counted');
    expect(r.race?.nowLine).toBe('Verwacht nu 55:40. Doel 45:00: nog 10:40, ongeveer 1:04 per km.');
    expect(r.race?.bandLine).toMatch(/^Bij gemiddelde groei rond 20 maart: \d+ tot \d+ minuten, dus 45:00 vraagt meer dan gemiddelde groei\.$/);
    expect(r.race?.basisLine).toContain('hele run van 5 km');
    const all = `${r.race?.nowLine} ${r.race?.bandLine} ${r.sentence}`.toLowerCase();
    for (const word of ['ambitieus', 'onrealistisch', 'haalbaar', 'realistisch']) expect(all).not.toContain(word);
    expect(all).not.toMatch(/[–—]/);
  });

  it('zegt de haalbaarheid als droog feit: binnen en boven de band', () => {
    const inside = computeRaceReadiness(goal({ distanceKm: 10, targetMinutes: 50 }), [accepted, ...training], TODAY, { naming })!;
    expect(inside.race?.bandLine).toMatch(/minuten, je doel valt erbinnen\.$/);
    const above = computeRaceReadiness(goal({ distanceKm: 10, targetMinutes: 70 }), [accepted, ...training], TODAY, { naming })!;
    expect(above.race?.bandLine).toMatch(/minuten, je doel ligt erboven\.$/);
  });

  it('zegt bij de laagste meter niet het getal erbij', () => {
    const r = computeRaceReadiness(goal(), [accepted, ...training], TODAY, { naming })!;
    expect(r.weakestSentence).toMatch(/^Hier is nog het meeste te winnen: [a-z ]+\.$/);
  });

  it('zegt de basis als de snelste 5 km meetelt', () => {
    const effort = test('2026-10-10', 36, 6, { bestEffort: { km: 5, minutes: 26 + 42 / 60, wholeKm: 6, wholeMinutes: 36, accepted: true } } as Partial<SessionLog>);
    const r = computeRaceReadiness(goal(), [effort, ...training], TODAY, { naming })!;
    expect(r.race?.basisLine).toBe('Uit je snelste 5 km van 10 okt (26:42).');
  });

  it('zegt dat de testloop wacht op Akkoord in plaats van "nog niets gemeten"', () => {
    const waiting = test('2026-10-10', 36, 6, { bestEffort: { km: 5, minutes: 26 + 42 / 60, wholeKm: 6, wholeMinutes: 36 } } as Partial<SessionLog>);
    const r = computeRaceReadiness(goal(), [waiting, ...training], TODAY, { naming })!;
    expect(r.race?.status).toBe('waiting');
    expect(r.race?.statusLine).toBe(WAITING_LINE);
    expect(r.meters.some((m) => m.key === 'verwachteTijd')).toBe(false);
    expect(r.missingSentence ?? '').not.toContain('snelheid');
  });

  it('zegt het ook zonder testloop, en telt snelheid dan niet mee', () => {
    const r = computeRaceReadiness(goal(), training, TODAY, { naming })!;
    expect(r.race?.status).toBe('none');
    expect(r.race?.statusLine).toBe(NO_TEST_LINE);
    const plain = computeGoalReadiness(readinessInputOf(goal())!, training, TODAY, { naming });
    expect(r.percent).toBe(plain.percent);
  });

  it('zonder doeltijd blijft alles zoals het was', () => {
    const g = goal({ distanceKm: 10 });
    const r = computeRaceReadiness(g, [accepted, ...training], TODAY, { naming })!;
    const plain = computeGoalReadiness(readinessInputOf(g)!, [accepted, ...training], TODAY, { naming: { the: 'je wedstrijd', your: 'je wedstrijd' }, since: '2026-08-01' });
    expect(r.percent).toBe(plain.percent);
    expect(r.race).toBeUndefined();
  });

  it('toont de verandering pas als er vier weken terug al een waarde was', () => {
    // Doel net gemaakt: niets om mee te vergelijken.
    const fresh = computeRaceReadiness(goal(undefined, '2026-10-20T10:00:00Z'), [accepted, ...training], TODAY, { naming })!;
    expect(fresh.change).toBeUndefined();
    // Doel van maanden terug, maar vier weken terug nog niets gelopen: geen sprong van 0.
    const empty = computeRaceReadiness(goal(), [run('2026-10-20', 60, 8.6)], TODAY, { naming })!;
    expect(empty.change).toBeUndefined();
    // Een testloop tussen toen en nu: toen zonder snelheid, nu met. Dat is schijn, dus geen verandering.
    const old = [run('2026-09-10', 60, 8.6), run('2026-09-12', 40, 6), ...training];
    const between = computeRaceReadiness(goal(), [accepted, ...old], TODAY, { naming })!;
    expect(between.change).toBeUndefined();
    // Een testloop van voor het beginpunt: dezelfde meters, dus wel een verschil.
    const before = test('2026-09-08', 27, 5);
    const same = computeRaceReadiness(goal(), [before, ...old, accepted], TODAY, { naming })!;
    expect(same.change).toBeTypeOf('number');
  });

  it('lost de instelling op: afwezig of onbekend is snelheid', () => {
    expect(resolveReadinessWeighting(undefined)).toBe('speed');
    expect(resolveReadinessWeighting('zomaar')).toBe('speed');
    expect(resolveReadinessWeighting('equal')).toBe('equal');
  });
});
