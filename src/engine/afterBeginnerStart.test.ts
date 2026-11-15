import { describe, it, expect, afterEach } from 'vitest';
import { layoutWaves, PHASE_GOLF, PHASE_GOLF_START } from './programLayout';
import { recentSessionMaxima, resolveEffectiveFullDuration, setRecentSessionMaxima } from './substitutions';
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

afterEach(() => setRecentSessionMaxima({ asOf: '', minutesByTemplate: {} }));

describe('de rem na de beginnersstart', () => {
  it('het programma: vier weken start, week 5 is de eerste golf, en zonder rem springt de lange loop ver', () => {
    expect(resolveProgramWeek(program, sunday(4))?.phase.id).toBe(PHASE_GOLF_START);
    expect(resolveProgramWeek(program, sunday(5))?.phase.id).toBe(PHASE_GOLF);
    expect(resolveEffectiveFullDuration(longRun, sunday(5), program)).toBeGreaterThan(step(longs[3]));
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

  it('een eigen langere lange duurloop telt zoals altijd, met de bodem van de eerste week', () => {
    const logs = [...logged(longs, 'tpl_walk_jog_long', 7), { templateId: 'tpl_long_run', completedDate: day(3, 3), durationMinutes: 80 }];
    setRecentSessionMaxima(recentSessionMaxima(logs, asOf));
    const withOwn = resolveEffectiveFullDuration(longRun, sunday(5), program);
    setRecentSessionMaxima(recentSessionMaxima([{ templateId: 'tpl_long_run', completedDate: day(3, 3), durationMinutes: 80 }], asOf));
    expect(withOwn).toBe(resolveEffectiveFullDuration(longRun, sunday(5), program));
  });

  it('wandelen en dribbelen telt niet mee voor een andere training', () => {
    const max = recentSessionMaxima(logged(longs, 'tpl_walk_jog_long', 7), asOf);
    expect(max.fromStart).toEqual({ tpl_long_run: 45 });
    expect(max.minutesByTemplate.tpl_long_run).toBeUndefined();
    expect(recentSessionMaxima([{ templateId: 'tpl_long_run', completedDate: day(4, 7), durationMinutes: 60 }], asOf).fromStart).toBeUndefined();
  });
});
