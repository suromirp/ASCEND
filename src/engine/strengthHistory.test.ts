import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';
import { demoStrengthLogs, demoWeights } from './fixtures/strengthLogs';
import { legFatigueOn, fatigueEvents } from './legFatigue';
import { accuracy, comparisonRows, exerciseHistories, exerciseViews, legsTiredAt } from './strengthHistory';
import { resolveStrengthSettings } from './strengthSettings';

const { templates, program } = buildDefaultProgramData();
const settings = resolveStrengthSettings(undefined);
const BODY = demoWeights[0].kg;
const TODAY = '2026-10-22';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

const logs = demoStrengthLogs();
const strengthLogs = logs.filter((l) => l.type === 'strength');
const deps = { logs, templates, program, bodyKg: BODY };

describe('legsTiredAt', () => {
  it('na een bergtocht van de dag ervoor zijn de benen moe', () => {
    const t = legsTiredAt('2026-10-15', '2026-10-15T18:30:00.000Z', deps);
    expect(t?.because).toBe('een bergtocht gisteren');
  });
  it('twee dagen later nog steeds, drie dagen later niet meer door de tocht zelf', () => {
    expect(legsTiredAt('2026-10-16', undefined, deps)?.because).toBe('een bergtocht eergisteren');
    expect(legsTiredAt('2026-10-17', undefined, deps)?.because).not.toContain('bergtocht');
  });
  it('een rustige week zonder tochten is niet moe', () => {
    expect(legsTiredAt('2026-09-17', '2026-09-17T18:30:00.000Z', deps)).toBeUndefined();
  });
  const run = (date: string, minutes: number, rpe?: number): SessionLog => ({
    id: `run-${date}`, templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', completedDate: date, completedAt: `${date}T08:00:00.000Z`,
    variant: 'full', durationMinutes: minutes, source: 'manual', ...(rpe ? { rpe } : {}),
  });
  it('een lange duurloop of een harde loop telt, een korte rustige loop niet', () => {
    const d = (l: SessionLog[]) => ({ ...deps, logs: l });
    expect(legsTiredAt('2026-09-17', undefined, d([run('2026-09-16', 90)]))?.because).toBe('een lange duurloop gisteren');
    expect(legsTiredAt('2026-09-17', undefined, d([run('2026-09-16', 30, 8)]))?.because).toBe('een harde loop gisteren');
    expect(legsTiredAt('2026-09-17', undefined, d([run('2026-09-16', 30, 4)]))).toBeUndefined();
  });
  it('op dezelfde dag telt alleen wat eerder was dan de training', () => {
    const l = [run('2026-09-17', 90)];
    expect(legsTiredAt('2026-09-17', '2026-09-17T18:30:00.000Z', { ...deps, logs: l })?.because).toBe('een lange duurloop eerder vandaag');
    expect(legsTiredAt('2026-09-17', '2026-09-17T07:00:00.000Z', { ...deps, logs: l })).toBeUndefined();
  });
});

describe('een volledige reeks nagemaakte trainingen', () => {
  const histories = exerciseHistories(strengthLogs, templates, deps);
  const views = exerciseViews(histories, settings, BODY, TODAY);
  const view = (key: string) => views.find((v) => v.history.key === key)!;

  it('kent alle zes oefeningen bij naam uit de lijst, gesorteerd op hoe vaak', () => {
    expect(views.map((v) => v.history.key).sort()).toEqual(['assisted-pull-up', 'back-squat', 'bench-press', 'leg-press', 'romanian-deadlift', 'seated-cable-row']);
    expect(views.map((v) => v.history.sessions.length)).toEqual([...views.map((v) => v.history.sessions.length)].sort((a, b) => b - a));
    expect(view('assisted-pull-up').history.name).toBe('Optrekken met hulp');
  });
  it('de lijn is het gewicht dat je aankunt bij het bereik, en stijgt met je bankdrukken', () => {
    const line = view('bench-press').line;
    expect(line.length).toBe(6);
    expect(line[line.length - 1].value).toBeGreaterThan(line[0].value);
    // dichtbij wat er echt gedaan werd: 8 herhalingen met 2 over rond 60 tot 70 kg
    expect(line[0].value).toBeGreaterThan(55);
    expect(line[line.length - 1].value).toBeLessThan(75);
    expect(view('bench-press').now?.reps).toBe(8);
  });
  it('het voorschrift blijft redelijk: dicht bij het laatste gewicht, nooit ver eronder of erboven', () => {
    for (const v of views) {
      const last = v.history.sessions[v.history.sessions.length - 1];
      const lastWeight = Math.max(...last.sets.map((s) => Math.abs(s.weightKg ?? 0)));
      const next = v.next!;
      expect(next, v.history.key).toBeDefined();
      expect(next.sets.length).toBeGreaterThanOrEqual(1);
      const first = Math.abs(next.sets[0].weightKg);
      expect(first, v.history.key).toBeGreaterThan(lastWeight * 0.8);
      expect(first, v.history.key).toBeLessThan(lastWeight * 1.15);
      expect(next.reason.length).toBeGreaterThan(10);
      for (let i = 1; i < next.sets.length; i++) expect(Math.abs(next.sets[i].weightKg)).toBeLessThanOrEqual(Math.abs(next.sets[i - 1].weightKg) + 1e-9 + (v.history.key === 'assisted-pull-up' ? 100 : 0));
    }
  });
  it('bij optrekken met hulp gaat de hulp omlaag als je sterker wordt, en wordt als hulp getoond', () => {
    const next = view('assisted-pull-up').next!;
    expect(next.sets[0].weightKg).toBeLessThanOrEqual(0);
    expect(Math.abs(next.sets[0].weightKg)).toBeLessThanOrEqual(30);
  });
  it('de squat na de bergtocht: vermoeid benoemd, in de vergelijking en voor vandaag niet meer', () => {
    const squat = histories.find((h) => h.key === 'back-squat')!;
    const afterHike = squat.sessions.find((s) => s.date === '2026-10-15')!;
    expect(afterHike.tired?.because).toBe('een bergtocht gisteren');
    const rows = comparisonRows(histories, settings, BODY).filter((r) => r.exerciseKey === 'back-squat');
    const row = rows.find((r) => r.date === '2026-10-15')!;
    expect(row.reason).toContain('bergtocht gisteren');
    // het gewicht blijft staan: 77,5 kg zoals vorige keer
    expect(row.prescribedKg).toBe(77.5);
    expect(row.withinOneStep).toBe(true);
    expect(view('back-squat').next!.kind).not.toBe('tired');
  });
  it('de vergelijking gebruikt alleen trainingen ervoor, en elke training komt hooguit één keer per oefening voor', () => {
    const rows = comparisonRows(histories, settings, BODY);
    // 6 oefeningen: bovenlichaam 6 trainingen, onderlichaam 5; de eerste training van elke oefening heeft geen voorstel
    expect(rows.length).toBe(3 * 5 + 3 * 4);
    expect(rows.every((r) => r.date > '2026-09-14')).toBe(true);
    const seen = new Set(rows.map((r) => `${r.exerciseKey}|${r.logId}`));
    expect(seen.size).toBe(rows.length);
    // newest first
    expect([...rows].map((r) => r.date)).toEqual([...rows].map((r) => r.date).sort().reverse());
  });
  it('de eerlijke zin noemt hoeveel van de gevallen hooguit één stap verschilde', () => {
    const rows = comparisonRows(histories, settings, BODY);
    const a = accuracy(rows);
    expect(a.total).toBe(rows.length);
    expect(a.sentence).toBe(`Bij ${a.within} van de ${a.total} oefeningen zat het voorstel van ASCEND hooguit één stap van het gewicht dat je echt pakte.`);
    // de reeks is rustig en voorspelbaar: het voorstel zit er meestal dichtbij
    expect(a.within / a.total).toBeGreaterThanOrEqual(0.6);
  });
  it('zegt eerlijk dat er te weinig is bij minder dan vijf vergelijkingen', () => {
    expect(accuracy([]).sentence).toContain('nog geen training');
    const few = comparisonRows(histories, settings, BODY).slice(0, 3);
    expect(accuracy(few).sentence).toContain('Nog te weinig');
  });
  it('zonder lichaamsgewicht slaat het de oefeningen met lichaamsgewicht over', () => {
    const v = exerciseViews(exerciseHistories(strengthLogs, templates, deps), settings, undefined, TODAY);
    expect(v.find((x) => x.history.key === 'assisted-pull-up')!.next).toBeUndefined();
    expect(v.find((x) => x.history.key === 'assisted-pull-up')!.line).toHaveLength(0);
    expect(v.find((x) => x.history.key === 'bench-press')!.next).toBeDefined();
  });
  it('een oefening die de lijst niet kent houdt zijn eigen naam', () => {
    const odd: SessionLog = { ...strengthLogs[0], id: 'odd', strengthData: [{ exerciseId: 'mf_zonderling', exerciseName: 'Zonderling Toestel', sets: [{ reps: 8, weightKg: 30, rir: 2 }] }] };
    const h = exerciseHistories([odd], templates, deps);
    expect(h[0].name).toBe('Zonderling Toestel');
    expect(h[0].exercise).toBeUndefined();
  });
});

describe('opwarmsets bij werksets zonder RIR en logs van voor de RIR', () => {
  it('een log zonder rir geeft geen schatting en geen voorstel, en geen fout', () => {
    const old = deepFreeze({ ...strengthLogs[0], id: 'old', strengthData: [{ exerciseId: 'bench-press', exerciseName: 'Bench Press', sets: [{ reps: 8, weightKg: 60 }, { reps: 8, weightKg: 60 }] }] });
    const v = exerciseViews(exerciseHistories([old, { ...old, id: 'old2', completedDate: '2026-09-21', completedAt: '2026-09-21T18:00:00.000Z' }], templates, deps), settings, BODY, TODAY);
    expect(v[0].next).toBeUndefined();
    expect(v[0].line).toHaveLength(0);
  });
  it('opwarmsets tellen niet mee', () => {
    const l = strengthLogs[0];
    const withWarm: SessionLog = { ...l, strengthData: l.strengthData!.map((e) => ({ ...e, sets: [{ reps: 10, weightKg: 20, rir: 5, kind: 'warmup' as const }, ...e.sets] })) };
    const a = exerciseViews(exerciseHistories([l], templates, deps), settings, BODY, TODAY);
    const b = exerciseViews(exerciseHistories([withWarm], templates, deps), settings, BODY, TODAY);
    expect(b.map((v) => v.strengthKg)).toEqual(a.map((v) => v.strengthKg));
  });
});

describe('niets in de bestaande planning of beenindex verandert', () => {
  it('het model schrijft niets om en de beenindex is voor en na gelijk', () => {
    const frozen = deepFreeze(JSON.parse(JSON.stringify(logs)) as SessionLog[]);
    const before = JSON.stringify(logs);
    const inputs = { logs: frozen, plannedSessions: [], templates, today: '2026-10-16' };
    const indexBefore = legFatigueOn('2026-10-16', inputs, fatigueEvents(inputs));
    const h = exerciseHistories(frozen.filter((l) => l.type === 'strength'), templates, { ...deps, logs: frozen });
    const views = exerciseViews(h, settings, BODY, TODAY);
    comparisonRows(h, settings, BODY);
    expect(views.length).toBeGreaterThan(0);
    expect(JSON.stringify(logs)).toBe(before);
    const indexAfter = legFatigueOn('2026-10-16', inputs, fatigueEvents(inputs));
    expect(indexAfter).toEqual(indexBefore);
  });
});
