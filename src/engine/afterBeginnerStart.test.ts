import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { layoutWaves, PHASE_GOLF, PHASE_GOLF_START, progressionTarget } from './programLayout';
import { recentSessionMaxima, resolveEffectiveFullDuration, setRecentSessionMaxima, setStartBuild, withDurationScope } from './substitutions';
import { durationScopeFor } from './durationScope';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { BEGINNER_LADDER } from '../data/beginnerLadder';
import type { Program } from '../models/program';
import { addDays, resolveProgramWeek } from '../utils/dates';

// De rem na de beginnersstart (Warden, 15 november; besluit 2026-11-15-beginner-tien-procent): de eerste
// rustige en lange duurloop na de start groeien hoogstens 10% boven het langste wandelen en dribbelen dat je
// echt deed, niet vanaf een vaste waarde en niet vanaf je laatste sessie. Nagemaakt programma: vier weken
// Rustig beginnen, dan golven, met een richting die de lopen na de start veel langer maakt (zoals Fit blijven
// met drie dagen: 150 minuten over twee lopen).
const { templates } = buildDefaultProgramData();
const longRun = templates.find((t) => t.id === 'tpl_long_run')!;
const easyRun = templates.find((t) => t.id === 'tpl_easy_run')!;
const START = '2026-10-26';
const program: Program = {
  id: 'p', name: 'P', startDate: START,
  phases: layoutWaves(START, START, 12, START, 4),
  direction: { id: 'improve', factors: [1.6, 1.6, 1.6, 1] },
};
const day = (week: number, weekday: number) => addDays(START, (week - 1) * 7 + weekday - 1);
const sunday = (week: number) => day(week, 7);
const thursday = (week: number) => day(week, 4);
const longs = BEGINNER_LADDER.map((w) => w.longMinutes.value);
const shorts = BEGINNER_LADDER.map((w) => w.shortMinutes.value);
// Zoals de app op de maandag van week 5: de logs van de laatste 30 dagen.
const asOf = day(5, 1);
const logged = (minutes: (number | null)[], templateId: string, weekday: number) =>
  minutes.flatMap((m, i) => (m === null ? [] : [{ templateId, completedDate: day(i + 1, weekday), durationMinutes: m }]));
const step = (from: number) => Math.round((from * 1.1) / 5) * 5;

// Het register zoals de app hem zet voor een start op heel licht; ongezet is het Gewoon (Warden, mag 5).
beforeEach(() => setStartBuild('licht'));
afterEach(() => {
  setRecentSessionMaxima({ asOf: '', minutesByTemplate: {} });
  setStartBuild('gewoon');
});

describe('de rem na de beginnersstart', () => {
  it('het programma: vier weken start, week 5 is de eerste golf, en het plan zelf vraagt daar veel meer', () => {
    expect(resolveProgramWeek(program, sunday(4))?.phase.id).toBe(PHASE_GOLF_START);
    expect(resolveProgramWeek(program, sunday(5))?.phase.id).toBe(PHASE_GOLF);
    expect(progressionTarget(longRun, program, sunday(5))!.minutes).toBeGreaterThan(step(longs[3]));
  });

  // Warden, 15 november, moet 3: wie de start niet logde of oversloeg, springt niet naar het volle plan.
  it('zonder logs: het plan van de laatste startweek is de maat, en daarna elke week een stap', () => {
    // Heel licht: de start plant nu 20 en 30 minuten (data/beginnerLadder.ts#START_PLANNED_MINUTES).
    const sundays = [5, 6, 7, 8].map((w) => resolveEffectiveFullDuration(longRun, sunday(w), program));
    expect(sundays).toEqual([35, 40, 45, 50]);
    expect([5, 6, 7].map((w) => resolveEffectiveFullDuration(easyRun, thursday(w), program))).toEqual([25, 30, 35]);
    // Nooit meer dan het plan zelf, en op den duur het plan.
    for (let w = 5; w <= 16; w++) expect(resolveEffectiveFullDuration(longRun, sunday(w), program)).toBeLessThanOrEqual(progressionTarget(longRun, program, sunday(w))!.minutes);
    expect(resolveEffectiveFullDuration(longRun, sunday(16), program)).toBe(progressionTarget(longRun, program, sunday(16))!.minutes);
    // In de start zelf en ervoor raakt het niets.
    expect(resolveEffectiveFullDuration(longRun, sunday(4), program)).toBe(progressionTarget(longRun, program, sunday(4))!.minutes);
  });

  it('zonder logs bij Gewoon: de eigen lange duurloop van de laatste startweek is de maat', () => {
    const last = progressionTarget(longRun, program, sunday(4))!.minutes;
    expect(withDurationScope({ startBuild: 'gewoon' }, () => resolveEffectiveFullDuration(longRun, sunday(5), program))).toBe(step(last));
  });

  it('een plan zonder beginnersstart raakt de maat zonder logs niet', () => {
    const plain: Program = { ...program, phases: layoutWaves(START, START, 12, START, 0) };
    expect(resolveEffectiveFullDuration(longRun, sunday(5), plain)).toBe(progressionTarget(longRun, plain, sunday(5))!.minutes);
  });

  it('wie in week 4 op 45 minuten zat, loopt in week 5 hoogstens 50', () => {
    setRecentSessionMaxima(recentSessionMaxima(logged(longs, 'tpl_walk_jog_long', 7), asOf));
    expect(resolveEffectiveFullDuration(longRun, sunday(5), program)).toBe(step(45));
    expect(step(45)).toBe(50);
  });

  it('een week overgeslagen: groeien vanaf wat je echt deed', () => {
    setRecentSessionMaxima(recentSessionMaxima(logged([30, 35, 40, null], 'tpl_walk_jog_long', 7), asOf));
    expect(resolveEffectiveFullDuration(longRun, sunday(5), program)).toBe(step(40));
  });

  it('een kortere laatste week: de langste telt, niet de laatste', () => {
    setRecentSessionMaxima(recentSessionMaxima(logged([30, 35, 40, 30], 'tpl_walk_jog_long', 7), asOf));
    expect(resolveEffectiveFullDuration(longRun, sunday(5), program)).toBe(step(40));
  });

  it('de rustige loop meet aan het korte wandelen en dribbelen', () => {
    setRecentSessionMaxima(recentSessionMaxima(logged(shorts, 'tpl_walk_jog', 4), asOf));
    expect(resolveEffectiveFullDuration(easyRun, thursday(5), program)).toBe(step(shorts[3]));
  });

  it('een eigen langere lange duurloop is de maat, ook naast de start', () => {
    const logs = [...logged(longs, 'tpl_walk_jog_long', 7), { templateId: 'tpl_long_run', completedDate: day(3, 3), durationMinutes: 80 }];
    setRecentSessionMaxima(recentSessionMaxima(logs, asOf));
    expect(resolveEffectiveFullDuration(longRun, sunday(5), program)).toBe(step(80));
  });

  // Warden, 15 november, moet 4: een geval waar de bodem van Wennen het verschil maakt.
  // Warden ronde 3, moet 3: een start van 30 naast een eigen loop van 35. Met de bodem zou het 50 zijn.
  it('naast de start telt de bodem van Wennen niet: een eigen loop van 35 wordt hoogstens 40, niet 50', () => {
    const floor = progressionTarget(longRun, program, sunday(5))!.phaseSteps.find((s) => s.weekInPhase === 1)!.targetMinutes;
    expect(floor).toBe(50);
    setRecentSessionMaxima(recentSessionMaxima([...logged([30, 30, 30, 30], 'tpl_walk_jog_long', 7), { templateId: 'tpl_long_run', completedDate: day(4, 3), durationMinutes: 35 }], asOf));
    expect(resolveEffectiveFullDuration(longRun, sunday(5), program)).toBe(40);
    // Een plan zonder start: dezelfde eigen loop van 35 houdt de bodem op zijn eerste stap.
    const plain: Program = { ...program, phases: layoutWaves(START, START, 12, START, 0) };
    setRecentSessionMaxima(recentSessionMaxima([{ templateId: 'tpl_long_run', completedDate: day(4, 3), durationMinutes: 35 }], asOf));
    expect(resolveEffectiveFullDuration(longRun, sunday(5), plain)).toBe(floor);
  });

  // Warden ronde 3, blokkerend 1: de start niet gelogd (of als wandeling), week 5 gedaan zoals gevraagd.
  it('start zonder logs, eerste eigen loop in week 5: de week erna één stap, niet de bodem', () => {
    const week5 = [{ templateId: 'tpl_long_run', completedDate: sunday(5), durationMinutes: 35 }, { templateId: 'tpl_easy_run', completedDate: thursday(5), durationMinutes: 25 }];
    setRecentSessionMaxima(recentSessionMaxima(week5, day(6, 1)));
    expect(resolveEffectiveFullDuration(longRun, sunday(6), program)).toBe(40);
    expect(resolveEffectiveFullDuration(easyRun, thursday(6), program)).toBe(30);
    // En de week daarna, met de loop van week 6 erbij: weer één stap.
    setRecentSessionMaxima(recentSessionMaxima([...week5, { templateId: 'tpl_long_run', completedDate: sunday(6), durationMinutes: 40 }], day(7, 1)));
    expect(resolveEffectiveFullDuration(longRun, sunday(7), program)).toBe(45);
  });

  // Warden ronde 3, mag 4: de instelling komt in het register.
  it('de opbouw komt uit de instelling: zonder veld Gewoon, Heel licht alleen als hij gekozen is', () => {
    expect(durationScopeFor({}, [], [], program, START).startBuild).toBe('gewoon');
    expect(durationScopeFor({ beginnerBuild: 'licht' }, [], [], program, START).startBuild).toBe('licht');
    expect(durationScopeFor({ beginnerBuild: 'zwaar' }, [], [], program, START).startBuild).toBe('gewoon');
  });

  // Warden ronde 3, mag 7.
  it('de maat van het plan geldt alleen voor de twee lopen, ook bij Gewoon', () => {
    // De heuvelloop vraagt in week 5 meer dan een stap boven zijn eigen lengte in de laatste startweek: een maat zou hem raken.
    const hills = templates.find((t) => t.id === 'tpl_hill_intervals')!;
    expect(progressionTarget(hills, program, day(5, 6))!.minutes).toBeGreaterThan(step(progressionTarget(hills, program, day(4, 6))!.minutes));
    for (const build of ['licht', 'gewoon'] as const) {
      expect(withDurationScope({ startBuild: build }, () => resolveEffectiveFullDuration(hills, day(5, 6), program))).toBe(progressionTarget(hills, program, day(5, 6))!.minutes);
    }
  });

  it('een voorstel zet de opbouw daarna terug', () => {
    setStartBuild('licht');
    withDurationScope({ startBuild: 'gewoon' }, () => undefined);
    expect(resolveEffectiveFullDuration(longRun, sunday(5), program)).toBe(35);
  });

  // Warden, mag 6: de 5 minuten erbij gelden alleen na de start, en het venster van 30 dagen telt op de dag.
  it('buiten de start blijft de rem 110%, ook bij een korte loop', () => {
    const low = { ...easyRun, id: 'tpl_kort_test', weeklyProgression: [1, 2, 3, 4].map((w) => ({ weekInPhase: w, targetMinutes: 10 * w + 30 })) };
    low.weeklyProgression[0] = { weekInPhase: 1, targetMinutes: 10 };
    setRecentSessionMaxima(recentSessionMaxima([{ templateId: low.id, completedDate: day(4, 3), durationMinutes: 15 }], asOf));
    expect(resolveEffectiveFullDuration(low, thursday(5), { ...program, phases: layoutWaves(START, START, 12, START, 0) })).toBe(15);
  });

  it('wandelen en dribbelen telt 30 dagen mee, niet een dag langer', () => {
    expect(recentSessionMaxima([{ templateId: 'tpl_walk_jog_long', completedDate: addDays(asOf, -30), durationMinutes: 45 }], asOf).fromStart).toEqual({ tpl_long_run: 45 });
    expect(recentSessionMaxima([{ templateId: 'tpl_walk_jog_long', completedDate: addDays(asOf, -31), durationMinutes: 45 }], asOf).fromStart).toBeUndefined();
  });

  it('na de start groeit een korte sessie altijd, ook van 20 minuten (110% van 20 is afgerond weer 20)', () => {
    setRecentSessionMaxima(recentSessionMaxima(logged([20, 20, 20, 20], 'tpl_walk_jog', 4), asOf));
    expect(resolveEffectiveFullDuration(easyRun, thursday(5), program)).toBe(25);
    // Vanaf 25 minuten is dat dezelfde stap als 110% op 5 minuten.
    for (const m of [25, 30, 35, 40, 45]) expect(Math.max(step(m), m + 5), `${m}`).toBe(step(m));
  });

  it('de week erna: groeien vanaf je eerste eigen loop, niet terug naar de bodem van Wennen', () => {
    const logs = [...logged(longs, 'tpl_walk_jog_long', 7), { templateId: 'tpl_long_run', completedDate: sunday(5), durationMinutes: 50 }];
    setRecentSessionMaxima(recentSessionMaxima(logs, day(6, 1)));
    expect(resolveEffectiveFullDuration(longRun, sunday(6), program)).toBe(step(50));
    // Zo ook met een korte start: van 35 naar 40, niet naar 50.
    setRecentSessionMaxima(recentSessionMaxima([...logged([30, 30, 30, 30], 'tpl_walk_jog_long', 7), { templateId: 'tpl_long_run', completedDate: sunday(5), durationMinutes: 35 }], day(6, 1)));
    expect(resolveEffectiveFullDuration(longRun, sunday(6), program)).toBe(40);
  });

  it('wandelen en dribbelen telt niet mee voor een andere training', () => {
    const max = recentSessionMaxima(logged(longs, 'tpl_walk_jog_long', 7), asOf);
    expect(max.fromStart).toEqual({ tpl_long_run: 45 });
    expect(max.minutesByTemplate.tpl_long_run).toBeUndefined();
    expect(recentSessionMaxima([{ templateId: 'tpl_long_run', completedDate: day(4, 7), durationMinutes: 60 }], asOf).fromStart).toBeUndefined();
  });
});
