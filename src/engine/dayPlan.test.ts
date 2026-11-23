// Het dagbeeld (I-14, stap 5 van docs/visie/Ontwerp Eén plan.md): Vandaag, Week en de weekbalk lezen dezelfde dag uit
// `weekPlan`. Invariant 3: de missie is een open rij van Week op die dag, en de balk toont dezelfde rijen in dezelfde
// volgorde, behalve wat de dag van uitvoeren verplaatst; dat verschil staat in beide met een woord. Testdata is nagemaakt.
import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { IllnessEpisode } from '../models/illness';
import { addDays } from '../utils/dates';
import { hiddenFromDay, weekPlan } from './dayPlan';
import { dayOrder, orderDay } from './dayOrder';
import { doneOnOtherDay } from './weekRow';

const { templates } = buildDefaultProgramData();
const templateById = new Map(templates.map((t) => [t.id, t]));
const MONDAY = '2026-11-16';
const WEDNESDAY = '2026-11-18';

const row = (id: string, templateId: string, scheduledDate: string, over: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate: MONDAY, status: 'planned', order: 0, ...over });
const logFor = (s: PlannedSession, completedDate: string): SessionLog => ({
  id: `log-${s.id}`, plannedSessionId: s.id, templateId: s.templateId, type: templateById.get(s.templateId)!.type, completedDate, completedAt: `${completedDate}T07:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual',
} as SessionLog);

describe('weekPlan', () => {
  it('zet twee trainingen op een dag in de volgorde van dayOrder, ook in de balk', () => {
    const legs = row('legs', 'tpl_lower_a', WEDNESDAY, { order: 0 });
    const tempo = row('tempo', 'tpl_tempo_run', WEDNESDAY, { order: 1 });
    const day = weekPlan({ weekStart: MONDAY, sessions: [legs, tempo], logs: [], templateById, today: WEDNESDAY }).day(WEDNESDAY);
    expect(day.sessions.map((s) => s.id)).toEqual(['tempo', 'legs']);
    expect(day.strip.map((e) => e.session.id)).toEqual(['tempo', 'legs']);
    expect(day.primary?.id).toBe('tempo');
  });

  it('houdt een gedane training in Week op zijn dag en zet hem in de balk op de dag van uitvoeren, met de geplande dag erbij', () => {
    const tempo = row('tempo', 'tpl_tempo_run', '2026-11-19');
    const plan = weekPlan({ weekStart: MONDAY, sessions: [tempo], logs: [logFor(tempo, WEDNESDAY)], templateById, today: WEDNESDAY });
    expect(plan.day('2026-11-19').sessions.map((s) => s.id)).toEqual(['tempo']);
    expect(plan.day('2026-11-19').strip).toEqual([]);
    expect(plan.day(WEDNESDAY).strip.map((e) => ({ id: e.session.id, done: e.done, plannedOn: e.plannedOn }))).toEqual([{ id: 'tempo', done: true, plannedOn: 'do 19' }]);
    expect(plan.day(WEDNESDAY).primary).toBeUndefined();
  });

  it('laat een overgeslagen rustdag en wat een periode liet vallen weg, op een plek', () => {
    const rest = row('rest', 'tpl_herstel', WEDNESDAY, { status: 'skipped' });
    const dropped = row('dropped', 'tpl_upper_a', WEDNESDAY, { status: 'skipped', leave: { periodId: 'p', role: 'dropped' } } as Partial<PlannedSession>);
    const skipped = row('skipped', 'tpl_tempo_run', WEDNESDAY, { status: 'skipped' });
    expect(hiddenFromDay(rest, templateById)).toBe(true);
    expect(hiddenFromDay(dropped, templateById)).toBe(true);
    expect(hiddenFromDay(skipped, templateById)).toBe(false);
    const day = weekPlan({ weekStart: MONDAY, sessions: [rest, dropped, skipped], logs: [], templateById, today: WEDNESDAY }).day(WEDNESDAY);
    expect(day.sessions.map((s) => s.id)).toEqual(['skipped']);
    expect(day.strip).toEqual([]);
    expect(day.primary).toBeUndefined();
  });

  it('kiest bij koorts geen training als missie, en bij een verkoudheid niets zwaars', () => {
    const tempo = row('tempo', 'tpl_tempo_run', WEDNESDAY);
    const fever: IllnessEpisode = { id: 'z', kind: 'below_neck', startDate: WEDNESDAY } as IllnessEpisode;
    const day = weekPlan({ weekStart: MONDAY, sessions: [tempo], logs: [], templateById, today: WEDNESDAY, illness: [fever] }).day(WEDNESDAY);
    expect(day.primary).toBeUndefined();
    // De rij blijft in Week en in de balk staan.
    expect(day.sessions.map((s) => s.id)).toEqual(['tempo']);
    expect(day.strip.map((e) => e.session.id)).toEqual(['tempo']);
  });

  it('noemt een rustdag als er geen training open is', () => {
    const rest = row('rest', 'tpl_herstel', WEDNESDAY);
    const day = weekPlan({ weekStart: MONDAY, sessions: [rest], logs: [], templateById, today: WEDNESDAY }).day(WEDNESDAY);
    expect(day.rest?.id).toBe('rest');
    expect(day.stripRest).toBe(true);
    expect(day.strip).toEqual([]);
  });
});

// Invariant 3 over willekeurige standen: ziek, twee op een dag, gedaan op een andere dag, overgeslagen.
function rng(seed: number) {
  let x = seed;
  return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
}

function stand(seed: number) {
  const pool = ['tpl_tempo_run', 'tpl_lower_a', 'tpl_upper_a', 'tpl_long_run', 'tpl_herstel', 'tpl_easy_run'];
  const r = rng(seed);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const sessions: PlannedSession[] = [];
  const logs: SessionLog[] = [];
  for (let i = 0; i < 10; i++) {
    const date = addDays(MONDAY, Math.floor(r() * 9) - 1);
    const s = row(`s${i}`, pick(pool), date, { order: Math.floor(r() * 3), status: r() < 0.15 ? 'skipped' : 'planned' });
    sessions.push(s);
    if (s.status !== 'skipped' && r() < 0.4) logs.push(logFor(s, addDays(date, pick([0, 0, -1, 1, 2]))));
  }
  const today = addDays(MONDAY, Math.floor(r() * 7));
  const illness: IllnessEpisode[] = r() < 0.2 ? [{ id: 'z', kind: pick(['above_neck', 'below_neck', 'stomach'] as const), startDate: today }] : [];
  return { sessions, logs, plan: weekPlan({ weekStart: MONDAY, sessions, logs, templateById, today, illness }) };
}
const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

describe('invariant 3: een dag, een antwoord', () => {
  it('de standen raken elk geval: twee op een dag, verplaatst door de dag van uitvoeren, een missie', () => {
    const days = SEEDS.flatMap((seed) => stand(seed).plan.days);
    expect(days.some((d) => d.strip.some((e) => e.plannedOn))).toBe(true);
    expect(days.some((d) => d.order)).toBe(true);
    expect(days.some((d) => d.primary)).toBe(true);
  });

  for (const seed of SEEDS) {
    it(`stand ${seed}`, () => {
      const { sessions, logs, plan } = stand(seed);
      const logged = new Map(logs.map((l) => [l.plannedSessionId!, l]));
      const shown = (s: PlannedSession) => templateById.get(s.templateId)!.type !== 'recovery' && s.status !== 'skipped';

      for (const day of plan.days) {
        // De missie is een open rij van Week op die dag.
        if (day.primary) {
          expect(day.sessions).toContain(day.primary);
          expect(logged.has(day.primary.id)).toBe(false);
          expect(day.primary.status).not.toBe('skipped');
        }
        // De volgorde van Week is die van Vandaag (dayOrder).
        const open = day.sessions.filter((s) => !logged.has(s.id));
        const tomorrow = sessions.filter((s) => s.scheduledDate === addDays(day.date, 1));
        expect(day.sessions).toEqual(orderDay([...day.sessions], dayOrder(open, tomorrow, templateById)));
        // De balk: dezelfde trainingen als Week in dezelfde volgorde, behalve wat de dag van uitvoeren verplaatst.
        const stay = day.sessions.filter((s) => shown(s) && (logged.get(s.id)?.completedDate ?? day.date) === day.date);
        const own = day.strip.filter((e) => !e.plannedOn).map((e) => e.session);
        expect(own).toEqual(stay);
        // Wat de balk verplaatst, zegt het in beide met een woord: de balk de geplande dag, Week de dag van uitvoeren.
        for (const e of day.strip.filter((x) => x.plannedOn)) {
          expect(e.done).toBe(true);
          expect(doneOnOtherDay(e.session, logged.get(e.session.id))).toBeTruthy();
        }
        for (const s of day.sessions.filter((x) => shown(x) && logged.has(x.id) && logged.get(x.id)!.completedDate !== day.date)) {
          expect(doneOnOtherDay(s, logged.get(s.id))).toBeTruthy();
          expect(day.strip.some((e) => e.session.id === s.id)).toBe(false);
        }
      }
    });
  }
});
