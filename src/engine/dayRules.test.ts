// Eén regel voor alle uitzonderingen (I-67): de tabel, de voorrang en een vergelijking met de oude toetsen. Waar het
// nieuwe antwoord afwijkt, staat het gat uit het ontwerp er met naam bij (docs/visie/Ontwerp een regel voor
// uitzonderingen.md, hoofdstuk 2). Alles nagemaakt.

import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { addDays, isoWeekday, mondayOfWeek } from '../utils/dates';
import { CAUSE_ORDER, DAY_CAUSE_TEXT, dayRules, mayOn, planKnows, YOURS_LINE, type DayQuestion, type DayState, type DayStep } from './dayRules';
import { activeIllness, isHeavySession, isIllnessDay, recoveryRamp } from './illness';
import { isAwayFor, isLeaveBlockedDay, isPauseDay, leaveDays, lightDays } from './leave';
import type { MoveContext } from './moveSuggestions';
import { needsGymOn } from './noGymGuard';
import { isTaperDay } from './raceWindow';
import { illnessHeld as replanHeld } from './replanWeek';
import { isGymStrengthTemplate } from './templateRoles';
import { strengthAllows } from './strengthTraining';

const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const T = (id: string) => byId.get(id)!;
const TODAY = '2026-11-16'; // maandag
const UPPER = T('tpl_upper_a'); // sportschool
const EASY = T('tpl_easy_run'); // licht
const HILLS = T('tpl_hill_intervals'); // zwaar
const BODY = T('tpl_bodyweight');

const period = (kind: LeavePeriod['kind'], startDate: string, endDate: string, id: string = kind): LeavePeriod => ({ id, kind, startDate, endDate });
const ill = (kind: IllnessEpisode['kind'], startDate: string, endDate?: string): IllnessEpisode => ({ id: `ill-${startDate}`, kind, startDate, ...(endDate ? { endDate } : {}) });
const ps = (id: string, templateId: string, d: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId, scheduledDate: d, weekStartDate: mondayOfWeek(d), status: 'planned', order: 0, ...over,
});

describe('de feiten', () => {
  it('staan op volgorde van voorrang, ziek boven vakantie', () => {
    const r = dayRules({ today: TODAY, illness: [ill('below_neck', TODAY)], leave: [period('no_training', TODAY, addDays(TODAY, 3))], restDay: 1 });
    expect(r.facts(TODAY).map((f) => f.cause)).toEqual(['ill', 'off', 'rest']);
    const v = r.may({ date: TODAY, step: 'move', template: EASY });
    expect(v).toMatchObject({ ok: false, cause: 'ill', outcome: 'refuse', also: ['off', 'rest'] });
  });

  it('een vakantie gaat voor zonder sportschool, zoals leaveDays', () => {
    const r = dayRules({ today: TODAY, leave: [period('no_gym', TODAY, addDays(TODAY, 5)), period('no_training', addDays(TODAY, 2), addDays(TODAY, 2))] });
    expect(r.facts(addDays(TODAY, 2)).map((f) => f.cause)).toEqual(['off']);
    expect(r.facts(addDays(TODAY, 3)).map((f) => f.cause)).toEqual(['nogym']);
  });

  it('elke oorzaak heeft een tekst', () => {
    for (const c of CAUSE_ORDER) expect(DAY_CAUSE_TEXT[c].chip.length).toBeLessThanOrEqual(28);
  });

  it('teksten zonder gedachtestreepjes', () => {
    for (const c of CAUSE_ORDER) {
      const t = DAY_CAUSE_TEXT[c];
      expect(`${t.chip} ${t.kept} ${t.line('Maandag 16 november')}`).not.toMatch(/[\u2013\u2014]/);
    }
  });
});

describe('de tabel: elke oorzaak maal elke stap', () => {
  const STEPS: DayStep[] = ['place', 'add', 'move', 'catch_up', 'add_set', 'propose', 'count', 'do'];
  const D = addDays(TODAY, 1);
  // Per oorzaak een stand waarin alleen die oorzaak op dag D geldt (count kijkt naar gisteren).
  const only: Record<string, { state: DayState; date?: string }> = {
    ill: { state: { today: TODAY, illness: [ill('stomach', TODAY)] } },
    ill_light: { state: { today: TODAY, illness: [ill('above_neck', TODAY)] } },
    off: { state: { today: TODAY, leave: [period('no_training', addDays(TODAY, -3), D)] } },
    trek: { state: { today: TODAY, leave: [period('trek', addDays(TODAY, -3), D)] } },
    nogym: { state: { today: TODAY, leave: [period('no_gym', addDays(TODAY, -3), D)] } },
    goal: { state: { today: TODAY, goalDay: D } },
    rest: { state: { today: TODAY, restDay: 2 } },
    eased: { state: { today: TODAY, eased: [{ from: TODAY, until: D }] } },
    strength_off: { state: { today: TODAY, strengthOff: true } },
  };
  const table = (cause: string, template: SessionTemplate) => Object.fromEntries(STEPS.map((step) => {
    const date = step === 'count' ? (cause === 'goal' || cause === 'rest' ? D : addDays(TODAY, -1)) : D;
    const state = cause === 'rest' && step === 'count' ? only.rest.state : only[cause].state;
    const v = mayOn({ date, step, template }, step === 'count' && cause === 'ill' ? { ...state, illness: [ill('stomach', addDays(TODAY, -2))] } : step === 'count' && cause === 'ill_light' ? { ...state, illness: [ill('above_neck', addDays(TODAY, -2))] } : state);
    return [step, v.ok ? 'ok' : v.outcome];
  }));

  it('ziek met koorts of buikgriep: alles', () => {
    expect(table('ill', EASY)).toEqual({ place: 'drop', add: 'refuse', move: 'refuse', catch_up: 'refuse', add_set: 'refuse', propose: 'refuse', count: 'drop', do: 'refuse' });
  });
  it('neus of keel: alleen wat zwaar is, voorstellen en een ijkset wachten', () => {
    expect(table('ill_light', EASY)).toEqual({ place: 'ok', add: 'refuse', move: 'ok', catch_up: 'ok', add_set: 'refuse', propose: 'refuse', count: 'drop', do: 'ok' });
    expect(table('ill_light', HILLS)).toEqual({ place: 'drop', add: 'refuse', move: 'refuse', catch_up: 'refuse', add_set: 'refuse', propose: 'refuse', count: 'drop', do: 'refuse' });
  });
  it('vakantie en tocht', () => {
    const want = { place: 'move', add: 'refuse', move: 'refuse', catch_up: 'refuse', add_set: 'refuse', propose: 'ok', count: 'drop', do: 'ok' };
    expect(table('off', EASY)).toEqual(want);
    expect(table('trek', EASY)).toEqual(want);
  });
  it('zonder sportschool: wat de sportschool nodig heeft, en er komt niets bij', () => {
    expect(table('nogym', UPPER)).toEqual({ place: 'replace', add: 'refuse', move: 'refuse', catch_up: 'refuse', add_set: 'refuse', propose: 'ok', count: 'drop', do: 'ok' });
    expect(table('nogym', EASY)).toEqual({ place: 'ok', add: 'refuse', move: 'ok', catch_up: 'ok', add_set: 'refuse', propose: 'ok', count: 'ok', do: 'ok' });
    expect(table('nogym', BODY)).toMatchObject({ move: 'ok', count: 'ok' });
  });
  it('de dag van je doel', () => {
    expect(table('goal', EASY)).toEqual({ place: 'drop', add: 'refuse', move: 'refuse', catch_up: 'refuse', add_set: 'ok', propose: 'ok', count: 'ok', do: 'ok' });
  });
  it('je rustdag', () => {
    expect(table('rest', EASY)).toEqual({ place: 'move', add: 'ok', move: 'refuse', catch_up: 'ok', add_set: 'ok', propose: 'ok', count: 'ok', do: 'ok' });
  });
  it('een rustige week: niets erbij en geen ijkset', () => {
    expect(table('eased', UPPER)).toEqual({ place: 'ok', add: 'refuse', move: 'ok', catch_up: 'ok', add_set: 'refuse', propose: 'ok', count: 'ok', do: 'ok' });
  });
  it('kracht uit: alleen kracht', () => {
    expect(table('strength_off', UPPER)).toEqual({ place: 'drop', add: 'refuse', move: 'ok', catch_up: 'refuse', add_set: 'refuse', propose: 'ok', count: 'ok', do: 'ok' });
    expect(table('strength_off', EASY)).toMatchObject({ place: 'ok', add: 'ok', catch_up: 'ok' });
  });
  it('vrije dagen beperken nooit', () => {
    const r = dayRules({ today: TODAY, leave: [period('free_days', TODAY, D)] });
    for (const step of STEPS) expect(r.ok({ date: D, step, template: HILLS })).toBe(true);
    expect(r.facts(D).map((f) => f.cause)).toEqual(['free']);
  });
  it('een vaste afspraak: niet inhalen en niet door ASCEND verplaatsen', () => {
    const fixed = ps('f', 'tpl_easy_run', D, { fixed: { sport: 'padel', day: 2, intensity: 'moderate' } });
    const r = dayRules({ today: TODAY });
    expect(r.may({ date: D, step: 'catch_up', template: EASY, session: fixed })).toMatchObject({ ok: false, cause: 'fixed' });
    expect(r.may({ date: D, step: 'move', template: EASY, session: fixed })).toMatchObject({ ok: false, cause: 'fixed' });
    expect(r.ok({ date: D, step: 'move', actor: 'you', template: EASY, session: fixed })).toBe(true);
  });
});

describe('de randgevallen', () => {
  it('de dag zelf: vandaag telt nog niet als voorbij', () => {
    const r = dayRules({ today: TODAY });
    expect(r.ok({ date: TODAY, step: 'move', template: EASY })).toBe(true);
    expect(r.may({ date: addDays(TODAY, -1), step: 'move', template: EASY })).toMatchObject({ ok: false, cause: 'history' });
    expect(r.facts(TODAY).map((f) => f.cause)).toEqual([]);
    // Een gelogde training van vandaag is wel historie.
    expect(r.may({ date: TODAY, step: 'move', template: EASY, logged: true })).toMatchObject({ ok: false, cause: 'history' });
  });

  it('een rij van een vakantie: wat de vakantie zette mag niet nog eens', () => {
    const r = dayRules({ today: TODAY, leave: [period('no_training', TODAY, addDays(TODAY, 6))] });
    for (let i = 0; i < 7; i++) {
      const d = addDays(TODAY, i);
      expect(r.may({ date: d, step: 'move', actor: 'you', template: EASY })).toMatchObject({ ok: false, cause: 'off', outcome: 'refuse' });
      expect(r.may({ date: d, step: 'place', template: EASY })).toMatchObject({ ok: false, cause: 'off', outcome: 'move' });
    }
    expect(r.ok({ date: addDays(TODAY, 7), step: 'move', template: EASY })).toBe(true);
  });

  it('een rij van een tocht: de dagen ervoor en erna zijn licht voor wat zwaar is', () => {
    const r = dayRules({ today: TODAY, leave: [period('trek', addDays(TODAY, 3), addDays(TODAY, 5))] });
    expect(r.may({ date: addDays(TODAY, 2), step: 'move', template: HILLS })).toMatchObject({ ok: false, cause: 'light' });
    expect(r.ok({ date: addDays(TODAY, 2), step: 'move', template: EASY })).toBe(true);
    expect(r.may({ date: addDays(TODAY, 4), step: 'move', template: EASY })).toMatchObject({ ok: false, cause: 'trek' });
    expect(r.may({ date: addDays(TODAY, 6), step: 'move', template: HILLS })).toMatchObject({ ok: false, cause: 'light' });
  });

  it('ziek en zonder sportschool tegelijk: ziek gaat voor, zonder sportschool staat erbij', () => {
    const r = dayRules({ today: TODAY, illness: [ill('above_neck', TODAY)], leave: [period('no_gym', addDays(TODAY, -2), addDays(TODAY, 2))] });
    // Elke sportschooltraining is zwaar: neus of keel gaat voor, zonder sportschool staat erbij.
    expect(r.may({ date: addDays(TODAY, 1), step: 'move', actor: 'you', template: UPPER })).toMatchObject({ ok: false, cause: 'ill_light', outcome: 'warn', also: ['nogym'] });
    // Een rustige loop mag, ook in de periode.
    expect(r.ok({ date: addDays(TODAY, 1), step: 'move', actor: 'you', template: EASY })).toBe(true);
    // Met koorts: alles dicht, zonder sportschool erbij.
    const fever = dayRules({ today: TODAY, illness: [ill('below_neck', TODAY)], leave: [period('no_gym', addDays(TODAY, -2), addDays(TODAY, 2))] });
    expect(fever.may({ date: addDays(TODAY, 1), step: 'move', actor: 'you', template: EASY })).toMatchObject({ ok: false, cause: 'ill', outcome: 'refuse', also: ['nogym'] });
    expect(fever.may({ date: addDays(TODAY, 2), step: 'move', actor: 'you', template: UPPER })).toMatchObject({ ok: false, cause: 'nogym', outcome: 'warn' });
    // Telt als weg, om welke reden ook.
    expect(r.may({ date: addDays(TODAY, -1), step: 'count', template: EASY })).toMatchObject({ ok: true });
    expect(r.may({ date: addDays(TODAY, -1), step: 'count', template: UPPER })).toMatchObject({ ok: false, cause: 'nogym', outcome: 'drop' });
    expect(r.may({ date: TODAY, step: 'count', template: EASY })).toMatchObject({ ok: false, cause: 'ill_light', outcome: 'drop' });
  });

  it('wat je zelf vastzette: nooit vervalt of vervang, wel waarschuw', () => {
    const r = dayRules({ today: TODAY, leave: [period('no_gym', TODAY, addDays(TODAY, 3))], illness: [ill('stomach', TODAY)] });
    const mine = ps('m', UPPER.id, addDays(TODAY, 2), { lock: { by: 'user', at: `${TODAY}T08:00:00.000Z` } });
    expect(r.may({ date: mine.scheduledDate, step: 'place', template: UPPER, session: mine })).toMatchObject({ ok: false, outcome: 'warn', cause: 'nogym', reason: `Sportschool nodig, en je zit zonder sportschool. ${YOURS_LINE}`, yours: true });
    const sick = ps('s', EASY.id, addDays(TODAY, 1), { status: 'moved' });
    expect(r.may({ date: sick.scheduledDate, step: 'place', template: EASY, session: sick })).toMatchObject({ ok: false, outcome: 'warn', cause: 'ill', yours: true });
    // Van het systeem: gewoon vervangen.
    expect(r.may({ date: mine.scheduledDate, step: 'place', template: UPPER, session: { ...mine, lock: undefined } })).toMatchObject({ outcome: 'replace' });
  });

  it('de afbouw telt pas als de race er was', () => {
    const race = addDays(TODAY, 3);
    const before = dayRules({ today: TODAY, races: [race] });
    expect(before.ok({ date: addDays(TODAY, -1), step: 'count', template: EASY })).toBe(true);
    expect(before.may({ date: TODAY, step: 'add_set', template: UPPER })).toMatchObject({ ok: false, cause: 'taper' });
    const after = dayRules({ today: addDays(race, 1), races: [race] });
    expect(after.may({ date: addDays(race, -2), step: 'count', template: EASY })).toMatchObject({ ok: false, cause: 'taper', outcome: 'drop' });
    expect(after.ok({ date: race, step: 'count', template: EASY })).toBe(true);
  });

  it('opbouw na ziekte: zwaar pas vanaf heavyFrom, en in de hele opbouw niets erbij', () => {
    const r = dayRules({ today: TODAY, illness: [ill('below_neck', addDays(TODAY, -4), TODAY)] });
    const ramp = r.facts(TODAY).find((f) => f.cause === 'ramp')!;
    expect(ramp.heavyFrom! > TODAY).toBe(true);
    expect(r.may({ date: addDays(ramp.heavyFrom!, -1), step: 'move', actor: 'you', template: HILLS })).toMatchObject({ ok: false, cause: 'ramp', outcome: 'warn' });
    expect(r.ok({ date: ramp.heavyFrom!, step: 'move', template: HILLS })).toBe(true);
    expect(r.may({ date: ramp.until!, step: 'add', template: EASY })).toMatchObject({ ok: false, cause: 'ramp' });
    expect(r.may({ date: TODAY, step: 'propose' })).toMatchObject({ ok: false });
  });
});

// --- dezelfde antwoorden als de oude toetsen, behalve op de gaten --------------------------------------------------

// isPausedFor zoals hij was voor I-67 (engine/sessionStatus.ts), bevroren als maat.
function oldIsPausedFor(date: string, template: SessionTemplate, leave: LeavePeriod[], illness: IllnessEpisode[], races: readonly string[], today: string): boolean {
  return (!!leave.length && isAwayFor(date, template, leave)) || isIllnessDay(date, illness, today) || isTaperDay(date, races, today);
}

// illnessHeld zoals hij was voor I-67 (engine/replanWeek.ts), bevroren als maat.
function illnessHeld(episodes: IllnessEpisode[] | undefined, today: string, list: SessionTemplate[]): (date: string, templateId: string) => boolean {
  const ids = new Map(list.map((t) => [t.id, t]));
  const heavy = (id: string) => { const t = ids.get(id); return !!t && isHeavySession(t); };
  const sick = activeIllness(episodes);
  const ramp = recoveryRamp(episodes, today);
  return (date, templateId) => {
    if (sick && date >= sick.startDate && date <= addDays(today, 1)) return sick.kind === 'above_neck' ? heavy(templateId) : true;
    if (ramp && date >= today && date < ramp.heavyFrom) return heavy(templateId);
    return false;
  };
}

// keptDayReason zoals hij was voor I-67 (engine/moveSuggestions.ts, 16 november), bevroren als maat.
function oldKeptDayReason(context: MoveContext, template: SessionTemplate, date: string, asOf: string): string | undefined {
  const offDays = leaveDays(context.leave);
  const leave = offDays.get(date)?.kind;
  if (leave === 'off') return 'off';
  if (leave === 'trek') return 'trek';
  if (isHeavySession(template) && lightDays(context.leave, offDays).has(date)) return 'light';
  if (context.restDay && isoWeekday(date) === context.restDay) return 'rest';
  if (context.goalDay && date >= context.goalDay) return 'goal';
  if (activeIllness(context.illness) && date <= addDays(asOf, 1)) return 'ill';
  if (needsGymOn(date, template, context.leave, offDays)) return 'nogym';
  return undefined;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

function randomState(r: () => number): DayState {
  const pick = <X,>(xs: X[]) => xs[Math.floor(r() * xs.length)];
  const leave: LeavePeriod[] = [];
  for (let i = 0; i < Math.floor(r() * 3); i++) {
    const start = addDays(TODAY, Math.floor(r() * 16) - 8);
    leave.push(period(pick(['no_training', 'trek', 'no_gym', 'free_days'] as const), start, addDays(start, Math.floor(r() * 5)), `p${i}`));
  }
  const illness: IllnessEpisode[] = [];
  const mode = Math.floor(r() * 3);
  if (mode === 1) illness.push(ill(pick(['above_neck', 'below_neck', 'stomach'] as const), addDays(TODAY, -Math.floor(r() * 4))));
  if (mode === 2) { const s = addDays(TODAY, -Math.floor(r() * 8) - 2); const e = addDays(s, Math.floor(r() * 3) + 1); illness.push(ill(pick(['above_neck', 'below_neck', 'stomach'] as const), s, e > TODAY ? TODAY : e)); }
  const races = r() < 0.3 ? [addDays(TODAY, Math.floor(r() * 12) - 6)] : [];
  return { today: TODAY, leave, illness, races, ...(r() < 0.3 ? { restDay: 1 + Math.floor(r() * 7) } : {}), ...(r() < 0.2 ? { goalDay: addDays(TODAY, 4 + Math.floor(r() * 6)) } : {}) };
}

const SAMPLE = [UPPER, EASY, HILLS, BODY, T('tpl_long_run'), T('tpl_lower_a')];

describe('vergelijking met de oude toetsen over willekeurige standen', () => {
  it('tellen: gelijk aan isPausedFor', () => {
    const r = rng(7);
    for (let n = 0; n < 300; n++) {
      const state = randomState(r);
      const rules = dayRules(state);
      // Ook vandaag en later: Week telt een training van morgen nog mee, ook als je ziek bent (tekstkaart, stand
      // ziek-eerder).
      for (let i = -8; i < 4; i++) {
        const date = addDays(TODAY, i);
        for (const t of SAMPLE) {
          const old = oldIsPausedFor(date, t, [...state.leave!], [...state.illness!], state.races ?? [], TODAY);
          const neu = !rules.ok({ date, step: 'count', template: t });
          expect(neu, `${date} ${t.id} ${JSON.stringify(state)}`).toBe(old);
        }
      }
    }
  });

  it('vakantie en tocht: gelijk aan isPauseDay, isLeaveBlockedDay en isAwayFor', () => {
    const r = rng(11);
    for (let n = 0; n < 200; n++) {
      const state = { ...randomState(r), illness: [], races: [], restDay: undefined, goalDay: undefined };
      const rules = dayRules(state);
      for (let i = 0; i < 10; i++) {
        const date = addDays(TODAY, i);
        expect(rules.may({ date, step: 'catch_up', template: EASY }).ok, date).toBe(!isPauseDay(date, [...state.leave!]));
        const blocked = isLeaveBlockedDay([...state.leave!], date);
        const v = rules.may({ date, step: 'place', template: EASY });
        expect(!v.ok && (v.cause === 'off' || v.cause === 'trek')).toBe(blocked);
        for (const t of SAMPLE) {
          const away = isAwayFor(date, t, [...state.leave!]);
          const c = rules.may({ date: addDays(TODAY, -1 - i), step: 'count', template: t });
          expect(!c.ok).toBe(isAwayFor(addDays(TODAY, -1 - i), t, [...state.leave!]));
          void away;
        }
      }
    }
  });

  it('verplaatsen: gelijk aan keptDayReason, behalve gat 5 en gat 6 (ziek in vier versies, opbouw na ziekte)', () => {
    const r = rng(23);
    let gap5 = 0;
    let gap6 = 0;
    for (let n = 0; n < 300; n++) {
      const state = randomState(r);
      const rules = dayRules(state);
      for (let i = 0; i < 9; i++) {
        const date = addDays(TODAY, i);
        for (const t of SAMPLE) {
          const old = oldKeptDayReason({ leave: [...state.leave!], restDay: state.restDay, goalDay: state.goalDay, illness: [...state.illness!] }, t, date, TODAY);
          const v = rules.may({ date, step: 'move', actor: 'ascend', template: t });
          // De afbouw voor een race zegt niets over verplaatsen; races in de stand doen hier niet mee.
          if (old === 'ill' && (v.ok || (v.cause !== 'ill' && v.cause !== 'ill_light'))) { gap5++; continue; }
          if (!old && !v.ok && v.cause === 'ramp') { gap6++; continue; }
          if (!old && !v.ok && v.cause === 'ill_light') { gap5++; continue; }
          expect(!v.ok, `${date} ${t.id} ${old} ${JSON.stringify(v)} ${JSON.stringify(state)}`).toBe(!!old);
        }
      }
    }
    // De gaten komen echt voor in de standen.
    expect(gap5).toBeGreaterThan(0);
    expect(gap6).toBeGreaterThan(0);
  });

  it('ziek bij opnieuw plannen: gelijk aan illnessHeld, en de nieuwe illnessHeld ook', () => {
    const r = rng(31);
    for (let n = 0; n < 300; n++) {
      const state = randomState(r);
      // Alleen ziek en de opbouw: de rest van de stand zegt hier niets over.
      const rules = dayRules({ today: TODAY, illness: state.illness });
      const held = illnessHeld([...state.illness!], TODAY, templates);
      const newHeld = replanHeld([...state.illness!], TODAY, templates);
      for (let i = 0; i < 9; i++) {
        const date = addDays(TODAY, i);
        for (const t of SAMPLE) {
          const neu = !rules.ok({ date, step: 'move', actor: 'ascend', template: t });
          expect(newHeld(date, t.id)).toBe(neu);
          expect(neu, `${date} ${t.id} ${JSON.stringify(state)}`).toBe(held(date, t.id));
        }
      }
    }
  });

  it('zonder sportschool: alleen wat de sportschool nodig heeft', () => {
    for (const t of SAMPLE) {
      const v = mayOn({ date: addDays(TODAY, 1), step: 'move', actor: 'you', template: t }, { today: TODAY, leave: [period('no_gym', TODAY, addDays(TODAY, 3))] });
      expect(v.ok).toBe(!isGymStrengthTemplate(t));
      if (!v.ok) expect(v.outcome).toBe('warn');
    }
  });

  it('zwaar is dezelfde toets als ziek melden', () => {
    const q = (t: SessionTemplate): DayQuestion => ({ date: TODAY, step: 'do', template: t });
    const rules = dayRules({ today: TODAY, illness: [ill('above_neck', TODAY)] });
    for (const t of templates) expect(rules.ok(q(t))).toBe(!isHeavySession(t));
  });
});

// I-74 en I-82: de vragen voor de ronde en de dagkeuze binnen een voorstel geven precies wat de oude toetsen gaven.
describe('holds, ill, taperDone, noGymPeriod en planKnows: gelijk aan de oude toetsen', () => {
  it('over willekeurige standen, ook met twee races', () => {
    const r = rng(41);
    for (let n = 0; n < 300; n++) {
      const base = randomState(r);
      const state = n % 3 === 0 ? { ...base, races: [addDays(TODAY, Math.floor(r() * 8) - 6), addDays(TODAY, Math.floor(r() * 8) - 2)] } : base;
      const rules = dayRules(state);
      const leave = [...state.leave!];
      const days = leaveDays(leave);
      const light = lightDays(leave, days);
      for (let i = -9; i < 10; i++) {
        const date = addDays(TODAY, i);
        const why = `${date} ${JSON.stringify(state)}`;
        expect(rules.ill(date), why).toBe(isIllnessDay(date, [...state.illness!], TODAY));
        expect(rules.taperDone(date), why).toBe(isTaperDay(date, state.races, TODAY));
        expect(rules.holds(date, 'off'), why).toBe(days.get(date)?.kind === 'off');
        expect(rules.holds(date, 'off', 'trek'), why).toBe(days.get(date)?.kind === 'off' || days.get(date)?.kind === 'trek');
        expect(rules.holds(date, 'light'), why).toBe(light.has(date));
        expect(rules.holds(date, 'ill', 'ill_light'), why).toBe(isIllnessDay(date, [...state.illness!], TODAY));
        const gym = days.get(date)?.kind === 'nogym' ? days.get(date)!.period : undefined;
        expect(rules.noGymPeriod(date), why).toBe(gym);
        for (const t of SAMPLE) expect(!!rules.noGymPeriod(date) && isGymStrengthTemplate(t)).toBe(needsGymOn(date, t, leave));
      }
    }
  });

  it('planKnows: met kracht uit geen kracht, ook geen eigen gewicht; met kracht aan alles', () => {
    for (const t of templates) {
      expect(planKnows(t, false)).toBe(true);
      expect(planKnows(t, true)).toBe(strengthAllows(t, { strengthTraining: false }));
    }
    expect(planKnows(BODY, true)).toBe(false);
    expect(planKnows(EASY, true)).toBe(true);
  });
});
