// Hartslag bij wandelen (besluit docs/beslissingen/2026-11-15-wandelen-vaste-bpm.md): een wandelworkout krijgt vaste
// slagen per minuut uit je hardloopzones, nooit een zone. Alle hartslagwaarden zijn nagemaakt.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays } from '../utils/dates';
import { racePaces } from './racePaces';
import { resolveWatchModel } from './watchFields';
import { briefing, type BriefingInput } from './briefing';
import { buildWatchWorkout, watchManualFor } from './watchWorkout';
import { buildWorkoutPlan, type WorkoutPlan } from './workoutPlan';
import { resolveWalkBpm, walkBpm, walkBpmBriefing, walkBpmText, walkHrFromSettings } from './walkHeartRate';
import { watchHrPlanFromSettings } from './watchHeartRate';

const { templates, program } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id) as SessionTemplate;
const today = addDays(program.startDate, 8);
const session = (templateId: string, over: Partial<PlannedSession> = {}): PlannedSession => ({ id: `ps_${templateId}`, templateId, scheduledDate: today, weekStartDate: program.startDate, status: 'planned', order: 0, ...over });
// Nagemaakt: drempel 170, dus zone 1 tot 138, zone 2 van 138 tot 151, zone 4 van 163.
const HR = { lthr: 170 };
// Nagemaakt: alleen een maximale hartslag van 190 (zone 2 tot 133).
const MAX_ONLY = { maxHr: 190 };
// Nagemaakt: 5 km in 29:05.
const PACES = racePaces([{ date: addDays(today, -10), km: 5, minutes: 29 + 5 / 60 }])!;
const HILLS = tpl('tpl_hill_intervals');
const STAIR = { [session('tpl_hill_intervals').id]: 'stairmaster_intervals' };

const step = (kind: WorkoutPlan['timeline'][number]['kind'], intensity: 1 | 2 | 3 | 4, seconds: number, noTarget?: true) => ({ kind, label: kind, seconds, intensity, ...(noTarget ? { noTarget } : {}) });
const planOf = (timeline: WorkoutPlan['timeline']): Pick<WorkoutPlan, 'timeline'> => ({ timeline });

describe('de slagen uit je hardloopzones', () => {
  it('rustig wandelen: alleen een bovengrens, het einde van zone 2', () => {
    expect(walkBpm(planOf([step('warmup', 1, 600), step('walk', 2, 3000), step('cooldown', 1, 300)]), HR)).toEqual({ top: 151 });
  });
  it('alleen zone 1: het einde van zone 1', () => {
    expect(walkBpm(planOf([step('walk', 1, 1800)]), HR)).toEqual({ top: 138 });
  });
  it('een stevig blok van minstens twee minuten krijgt van tot; korter niet (de hartslag loopt achter)', () => {
    expect(walkBpm(planOf([step('work', 4, 180), step('recover', 2, 120)]), HR)).toEqual({ top: 151, hard: [163, 187] });
    expect(walkBpm(planOf([step('work', 4, 60), step('recover', 2, 120)]), HR)).toEqual({ top: 151, shortHard: true });
    expect(walkBpm(planOf([step('work', 3, 300)]), HR)).toEqual({ hard: [151, 163] });
  });
  it('zonder drempel met een maximale hartslag: de zones op maximale hartslag', () => {
    expect(walkBpm(planOf([step('walk', 2, 1800)]), MAX_ONLY)).toEqual({ top: 133 });
  });
  it('zonder hartslaginstelling, zonder plan of alleen stappen zonder doel: niets', () => {
    expect(walkBpm(planOf([step('walk', 2, 1800)]), undefined)).toBeUndefined();
    expect(walkBpm(planOf([step('walk', 2, 1800)]), {})).toBeUndefined();
    expect(walkBpm(undefined, HR)).toBeUndefined();
    expect(walkBpm(planOf([step('walk', 1, 1800, true)]), HR)).toBeUndefined();
    expect(walkBpm(planOf([step('warmup', 2, 600), step('cooldown', 1, 600)]), HR)).toBeUndefined();
  });
  it('de tekst: droog, zonder gedachtestreepje en zonder ASCEND', () => {
    expect(walkBpmText({ top: 151 })).toBe('Hartslag onder 151 bpm.');
    expect(walkBpmText({ top: 151, hard: [163, 187] })).toBe('Hartslag onder 151 bpm. Stevige blokken 163 tot 187 bpm.');
    expect(walkBpmText({ top: 138, shortHard: true })).toBe('Tussen de blokken onder 138 bpm.');
    expect(walkBpmText({ hard: [151, 163] })).toBe('Hartslag 151 tot 163 bpm.');
    expect(walkBpmBriefing({ top: 151 })).toBe('Hartslag onder 151 bpm, uit je hardloopzones.');
    for (const t of [walkBpmText({ top: 151, hard: [163, 187] }), walkBpmBriefing({ top: 151, hard: [163, 187] })]) expect(t).not.toMatch(/[\u2013\u2014]|ASCEND/);
  });
  it('de instelling: afwezig is aan, uit geeft geen hartslag mee', () => {
    expect(resolveWalkBpm(undefined)).toBe(true);
    expect(resolveWalkBpm(false)).toBe(false);
    expect(walkHrFromSettings({ heartRate: HR })).toEqual(HR);
    expect(walkHrFromSettings({ heartRate: HR, watchWalkBpm: false })).toBeUndefined();
  });
});

describe('de wandelworkout naar je horloge', () => {
  it('de StairMaster: de bpm boven de stappen, geen zone op een stap (het herstel is zone 1, dus tot 138)', () => {
    const w = buildWatchWorkout(session('tpl_hill_intervals'), HILLS, program, PACES, { places: STAIR, walkHr: HR })!;
    expect(w.type).toBe('Walk');
    expect(w.description).toContain('Traplopen, StairMaster. Op gevoel en hartslag, geen tempo. De stevige blokken: RPE 8-9. Tussen de blokken onder 138 bpm.');
    expect(w.description).not.toMatch(/\bHR\b|LTHR|Pace/);
  });
  it('elke wandeltraining en de StairMaster: nooit een zone, en met een hartslag een bpm-regel', () => {
    let walking = 0;
    for (const t of templates) {
      for (const days of [0, 14, 28]) {
        const s = session(t.id, { scheduledDate: addDays(today, days) });
        for (const places of [undefined, { [s.id]: 'stairmaster_intervals' }]) {
          const w = buildWatchWorkout(s, t, program, PACES, { places, walkHr: HR, hr: watchHrPlanFromSettings({ heartRate: HR }, { lthr: 170 }) });
          if (!w || (w.type !== 'Walk' && w.type !== 'Hike')) continue;
          walking++;
          expect(w.description, `${t.id}`).not.toMatch(/\bHR\b|LTHR/);
          expect(w.description, `${t.id}`).toMatch(/(Hartslag|Tussen de blokken) (onder )?\d+/);
        }
      }
    }
    expect(walking).toBeGreaterThan(10);
  });
  it('een wandeltraining krijgt de regel boven de stappen', () => {
    const w = buildWatchWorkout(session('tpl_ruck_walk'), tpl('tpl_ruck_walk'), program, undefined, { walkHr: HR, namePrefix: 'none' })!;
    expect(w.description.split('\n\n')[0]).toBe('Hartslag onder 151 bpm.');
  });
  it('de instelling uit of zonder hartslag: precies de workout van voorheen, dus niets stil opnieuw verstuurd', () => {
    for (const t of templates) {
      const s = session(t.id);
      for (const places of [undefined, { [s.id]: 'stairmaster_intervals' }]) {
        const before = buildWatchWorkout(s, t, program, PACES, { places });
        expect(buildWatchWorkout(s, t, program, PACES, { places, walkHr: walkHrFromSettings({ heartRate: HR, watchWalkBpm: false }) })).toEqual(before);
        expect(buildWatchWorkout(s, t, program, PACES, { places, walkHr: {} })).toEqual(before);
      }
    }
  });
  it('een hardloop- of fietsworkout verandert niet door de instelling', () => {
    for (const t of templates) {
      const s = session(t.id);
      const before = buildWatchWorkout(s, t, program, PACES);
      if (!before || before.type === 'Walk' || before.type === 'Hike') continue;
      expect(buildWatchWorkout(s, t, program, PACES, { walkHr: HR }), t.id).toEqual(before);
    }
  });
  it('het blad Je horloge zegt dezelfde bpm', () => {
    const plan = buildWorkoutPlan(HILLS, today, program);
    expect(watchManualFor(HILLS, plan, 'stairmaster_intervals', undefined, HR)?.note).toBe('Op gevoel en hartslag, geen tempo. De stevige blokken: RPE 8-9. Tussen de blokken onder 138 bpm.');
    expect(watchManualFor(HILLS, plan, 'stairmaster_intervals')?.note).toBe('Op gevoel en hartslag, geen tempo. De stevige blokken: RPE 8-9.');
    const ruck = tpl('tpl_ruck_walk');
    expect(watchManualFor(ruck, buildWorkoutPlan(ruck, today, program), undefined, undefined, HR)?.note).toBe('Hartslag onder 151 bpm.');
    expect(watchManualFor(tpl('tpl_easy_run'), buildWorkoutPlan(tpl('tpl_easy_run'), today, program), undefined, undefined, HR)?.note).toBeUndefined();
  });
});

describe('de Briefing zegt welke bpm', () => {
  const NOW = new Date(2026, 10, 11, 8, 0);
  const input = (template: SessionTemplate, over: Partial<BriefingInput> = {}): BriefingInput => ({
    template,
    session: { ...session(template.id), scheduledDate: '2026-11-11' },
    date: '2026-11-11',
    now: NOW,
    program: null,
    logs: [],
    routeOn: true,
    watchLink: { linked: true, autoTick: false, activities: true },
    watch: { showStatus: true, fieldsShown: true, model: resolveWatchModel(undefined), store: undefined, hasZonesNote: false },
    weatherOn: true,
    clothingOn: true,
    fuelOn: true,
    ...over,
  });
  const row = (template: SessionTemplate, over: Partial<BriefingInput> = {}) => briefing(input(template, over))!.rows.find((r) => r.id === 'watch')!;

  it('de StairMaster gekozen: de regel van het horloge met de bpm erachter', () => {
    expect(row(HILLS, { storedPlace: 'stairmaster_intervals', walkHr: HR, watchStatus: { kind: 'sent', wants: 'Walk', wrote: 'Walk' } }).line).toBe('Er staat een wandelworkout op. Start hem bij Wandelen. Tussen de blokken onder 138 bpm, uit je hardloopzones.');
  });
  it('een wandeltraining: ook de bpm', () => {
    expect(row(tpl('tpl_ruck_walk'), { walkHr: HR, watchStatus: { kind: 'pending' } }).line).toContain('Hartslag onder 151 bpm, uit je hardloopzones.');
  });
  it('buiten hardlopen, de instelling uit, of de eigen workout uit: geen bpm', () => {
    expect(row(HILLS, { walkHr: HR, watchStatus: { kind: 'pending' } }).line).not.toContain('bpm');
    expect(row(HILLS, { storedPlace: 'stairmaster_intervals', watchStatus: { kind: 'sent', wants: 'Walk', wrote: 'Walk' } }).line).toBe('Er staat een wandelworkout op. Start hem bij Wandelen.');
    expect(row(HILLS, { storedPlace: 'stairmaster_intervals', walkHr: HR, placeWorkout: false, watchStatus: { kind: 'pending' } }).line).not.toContain('bpm');
  });
});
