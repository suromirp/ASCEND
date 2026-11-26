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
import { isDraftOpen } from './sessionStatus';

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

  it('de kaart op Vandaag telt op de dag van uitvoeren: een training van donderdag op woensdag gedaan', () => {
    // Woensdag: niets gepland, de tempoloop van donderdag gedaan. De kaart zegt gedaan (Vandaag zit erop), zoals de balk.
    // Donderdag: de geplande dag. Daar is niets meer, dus een vrije dag, niet "Vandaag zit erop" zonder naam.
    const tempo = row('tempo', 'tpl_tempo_run', '2026-11-19');
    const logs = [logFor(tempo, WEDNESDAY)];
    const wednesday = weekPlan({ weekStart: MONDAY, sessions: [tempo], logs, templateById, today: WEDNESDAY }).day(WEDNESDAY);
    expect({ allDone: wednesday.allDone, anyDone: wednesday.anyDone, primary: wednesday.primary }).toEqual({ allDone: true, anyDone: true, primary: undefined });
    const thursday = weekPlan({ weekStart: MONDAY, sessions: [tempo], logs, templateById, today: '2026-11-19' }).day('2026-11-19');
    expect({ allDone: thursday.allDone, anyDone: thursday.anyDone, primary: thursday.primary, rest: thursday.rest }).toEqual({ allDone: false, anyDone: false, primary: undefined, rest: undefined });
    expect(thursday.strip).toEqual([]);
  });

  it('de kaart op Vandaag: gedaan op de eigen dag, en een open training ernaast', () => {
    const tempo = row('tempo', 'tpl_tempo_run', WEDNESDAY, { order: 0 });
    const upper = row('upper', 'tpl_upper_a', WEDNESDAY, { order: 1 });
    const one = weekPlan({ weekStart: MONDAY, sessions: [tempo], logs: [logFor(tempo, WEDNESDAY)], templateById, today: WEDNESDAY }).day(WEDNESDAY);
    expect([one.allDone, one.anyDone]).toEqual([true, true]);
    const two = weekPlan({ weekStart: MONDAY, sessions: [tempo, upper], logs: [logFor(tempo, WEDNESDAY)], templateById, today: WEDNESDAY }).day(WEDNESDAY);
    expect([two.allDone, two.anyDone, two.primary?.id]).toEqual([false, true, 'upper']);
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

  it('geeft alleen vandaag de ziekteregel; een andere dag rekent zonder de ziekte van vandaag (I-151)', () => {
    const tempo = row('tempo', 'tpl_tempo_run', WEDNESDAY);
    // Morgen valt nog in de lopende melding (dayRules ziet ziek tot en met morgen); toch rekent morgen zonder.
    const later = row('later', 'tpl_tempo_run', addDays(WEDNESDAY, 1));
    const earlier = row('earlier', 'tpl_tempo_run', MONDAY);
    const fever: IllnessEpisode = { id: 'z', kind: 'below_neck', startDate: WEDNESDAY } as IllnessEpisode;
    const plan = weekPlan({ weekStart: MONDAY, sessions: [earlier, tempo, later], logs: [], templateById, today: WEDNESDAY, illness: [fever] });
    expect(plan.day(WEDNESDAY).primary).toBeUndefined();
    expect(plan.day(addDays(WEDNESDAY, 1)).primary?.id).toBe('later');
    expect(plan.day(MONDAY).primary?.id).toBe('earlier');
    expect(plan.day(addDays(WEDNESDAY, 1)).rest).toBeUndefined();
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
  // Concept open: een training van voor vandaag met een concept in Forge, zonder log (engine/sessionStatus.ts#isDraftOpen).
  const draftable = sessions.filter((s) => s.scheduledDate < today && s.status !== 'skipped' && !logs.some((l) => l.plannedSessionId === s.id));
  const openDraft = draftable.length > 0 && r() < 0.5 ? pick(draftable).id : undefined;
  const illness: IllnessEpisode[] = r() < 0.2 ? [{ id: 'z', kind: pick(['above_neck', 'below_neck', 'stomach'] as const), startDate: today }] : [];
  return { sessions, logs, today, openDraft, plan: weekPlan({ weekStart: MONDAY, sessions, logs, templateById, today, illness }) };
}
const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

describe('invariant 3: een dag, een antwoord', () => {
  it('de standen raken elk geval: twee op een dag, verplaatst door de dag van uitvoeren, een missie', () => {
    const days = SEEDS.flatMap((seed) => stand(seed).plan.days);
    expect(days.some((d) => d.strip.some((e) => e.plannedOn))).toBe(true);
    expect(days.some((d) => d.order)).toBe(true);
    expect(days.some((d) => d.primary)).toBe(true);
    expect(SEEDS.some((seed) => stand(seed).openDraft)).toBe(true);
  });

  for (const seed of SEEDS) {
    it(`stand ${seed}`, () => {
      const { sessions, logs, plan, today, openDraft } = stand(seed);
      const logged = new Map(logs.map((l) => [l.plannedSessionId!, l]));
      const shown = (s: PlannedSession) => templateById.get(s.templateId)!.type !== 'recovery' && s.status !== 'skipped';

      // Concept open: de rij blijft in Week op zijn dag, in de balk als hij training is, en is nooit de missie van vandaag.
      const draft = sessions.find((s) => s.id === openDraft);
      if (draft && isDraftOpen(draft, openDraft, today) && draft.scheduledDate >= MONDAY) {
        expect(plan.day(draft.scheduledDate).sessions).toContain(draft);
        if (shown(draft)) expect(plan.day(draft.scheduledDate).strip.map((e) => e.session)).toContain(draft);
        expect(plan.day(today).primary?.id).not.toBe(draft.id);
      }
      for (const day of plan.days) {
        // De missie is een open rij van Week op die dag.
        if (day.primary) {
          expect(day.sessions).toContain(day.primary);
          expect(logged.has(day.primary.id)).toBe(false);
          expect(day.primary.status).not.toBe('skipped');
        }
        // De kaart op Vandaag telt wat de balk gedaan toont (dag van uitvoeren).
        if (day.strip.some((e) => e.done)) expect(day.anyDone).toBe(true);
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
