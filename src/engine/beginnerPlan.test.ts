import { afterEach, describe, expect, it } from 'vitest';
import { layoutWaves, progressionTarget } from './programLayout';
import { resolveEffectiveFullDuration, setFixedSessionMinutes, setStartBuild, withDurationScope } from './substitutions';
import { firstStrengthLine, startLadderSets, startWeekOn } from './beginnerPlan';
import { capWorkSets, prescribedSets } from './forgeTimeCap';
import { exercisesForVariant } from './substitutions';
import { resolveStartBuild, buildConsentPatch, beginnerWeekOneLine, type StartBuild } from './beginnerStart';
import { chooseWeekShape, isStrengthTemplateId } from './weekShape';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { BEGINNER_LADDER } from '../data/beginnerLadder';
import type { Program } from '../models/program';
import type { ExercisePrescription } from '../models/training';
import { addDays } from '../utils/dates';

// Stap 3 van docs/visie/Ontwerp beginner rest.md: de ladder wordt de planning. Nagemaakt programma, geen echte data.
const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const t = (id: string) => byId.get(id)!;
const START = '2026-10-26';
const programFor = (length: number): Program => ({
  id: 'p', name: 'P', startDate: START,
  phases: layoutWaves(START, START, 12, START, 4, { length, light: true }),
});
const day = (week: number, weekday: number) => addDays(START, (week - 1) * 7 + weekday - 1);
const minutes = (id: string, date: string, program: Program, build: StartBuild) =>
  withDurationScope({ startBuild: build }, () => resolveEffectiveFullDuration(t(id), date, program));
const ladder = BEGINNER_LADDER.map((w) => ({ strength: w.strengthMinutes.value, short: w.shortMinutes.value, long: w.longMinutes.value }));
const setsOf = (list: readonly ExercisePrescription[]) => list.reduce((n, s) => n + prescribedSets(s), 0);

afterEach(() => {
  setStartBuild('gewoon');
  setFixedSessionMinutes([]);
});

describe('resolveStartBuild: de ladder alleen met Akkoord', () => {
  it('zonder veld Gewoon, heel licht zonder Akkoord op de ladder blijft heel licht van voor de ladder', () => {
    expect(resolveStartBuild({})).toBe('gewoon');
    expect(resolveStartBuild({ beginnerBuild: 'gewoon', beginnerLadder: 'agreed' })).toBe('gewoon');
    expect(resolveStartBuild({ beginnerBuild: 'licht' })).toBe('licht');
    expect(resolveStartBuild({ beginnerBuild: 'licht', beginnerLadder: 'ja' })).toBe('licht');
    expect(resolveStartBuild({ beginnerBuild: 'licht', beginnerLadder: 'agreed' })).toBe('ladder');
  });

  it('een richting kiezen zonder eerdere keuze zet heel licht met de ladder; een eerdere keuze blijft', () => {
    expect(buildConsentPatch({})).toEqual({ beginnerBuild: 'licht', beginnerLadder: 'agreed' });
    expect(buildConsentPatch({ beginnerBuild: 'licht' })).toEqual({});
    expect(buildConsentPatch({ beginnerBuild: 'gewoon' })).toEqual({});
  });
});

describe('startWeekOn: de week van de start uit de fasen', () => {
  it.each([3, 4, 6])('golven van %i weken: de start beslaat hele golven', (length) => {
    const program = programFor(length);
    const weeks = Math.ceil(4 / length) * length;
    expect(startWeekOn(program, day(1, 1))).toEqual({ week: 1, weeks, startsOn: START });
    expect(startWeekOn(program, day(weeks, 7))?.week).toBe(weeks);
    expect(startWeekOn(program, day(weeks + 1, 1))).toBeUndefined();
    expect(startWeekOn(program, addDays(START, -1))).toBeUndefined();
    expect(startWeekOn(null, START)).toBeUndefined();
  });
});

describe('de ladder in de planning', () => {
  it.each([3, 4, 6])('golven van %i weken: kracht, wandelen en dribbelen en de Herstelwandeling volgen de ladder', (length) => {
    const program = programFor(length);
    const weeks = Math.ceil(4 / length) * length;
    for (let w = 1; w <= weeks; w++) {
      const rung = ladder[Math.min(w, ladder.length) - 1];
      // Kracht: de minuten van de week; na de ladder zoals gepland.
      const plain = minutes('tpl_upper_a', day(w, 2), program, 'gewoon');
      expect(minutes('tpl_upper_a', day(w, 2), program, 'ladder'), `week ${w} kracht`).toBe(w <= ladder.length ? Math.min(plain, rung.strength) : plain);
      expect(minutes('tpl_lower_a', day(w, 3), program, 'ladder'), `week ${w} benen`).toBeLessThanOrEqual(w <= ladder.length ? rung.strength : 999);
      expect(minutes('tpl_walk_jog', day(w, 4), program, 'ladder'), `week ${w} kort`).toBe(rung.short);
      expect(minutes('tpl_walk_jog_long', day(w, 7), program, 'ladder'), `week ${w} lang`).toBe(rung.long);
      // De Herstelwandeling hoogstens zo lang als de korte sessie wandelen en dribbelen.
      expect(minutes('tpl_herstel', day(w, 1), program, 'ladder'), `week ${w} herstel`).toBeLessThanOrEqual(rung.short);
    }
  });

  it('de ladder gaat voor Hoeveel per soort: kracht Meer blijft op de trede, en de Herstelloop volgt de korte sessie', () => {
    const program = programFor(4);
    const more = (id: string, date: string) => withDurationScope({ startBuild: 'ladder', kindAmounts: { strength: 'more' } }, () => resolveEffectiveFullDuration(t(id), date, program));
    for (let w = 1; w <= ladder.length; w++) {
      expect(more('tpl_upper_a', day(w, 2)), `week ${w} kracht meer`).toBeLessThanOrEqual(ladder[w - 1].strength);
      expect(minutes('tpl_recovery_run', day(w, 1), program, 'ladder'), `week ${w} herstelloop`).toBeLessThanOrEqual(ladder[w - 1].short);
    }
    expect(minutes('tpl_recovery_run', day(5, 1), program, 'ladder')).toBe(minutes('tpl_recovery_run', day(5, 1), program, 'gewoon'));
  });

  it('bij Gewoon en bij heel licht van voor de ladder verandert er niets', () => {
    const program = programFor(4);
    for (let w = 1; w <= 4; w++) {
      expect(minutes('tpl_upper_a', day(w, 2), program, 'gewoon')).toBe(t('tpl_upper_a').durationVariants.full);
      expect(minutes('tpl_upper_a', day(w, 2), program, 'licht')).toBe(t('tpl_upper_a').durationVariants.full);
      expect(minutes('tpl_walk_jog', day(w, 4), program, 'licht')).toBe(20);
      expect(minutes('tpl_walk_jog_long', day(w, 7), program, 'licht')).toBe(30);
      expect(minutes('tpl_herstel', day(w, 1), program, 'licht')).toBe(minutes('tpl_herstel', day(w, 1), program, 'gewoon'));
    }
  });

  it('na de start raakt de ladder niets, en de rem na de start meet aan de laatste trede', () => {
    const program = programFor(4);
    expect(minutes('tpl_upper_a', day(5, 2), program, 'ladder')).toBe(t('tpl_upper_a').durationVariants.full);
    expect(minutes('tpl_herstel', day(5, 1), program, 'ladder')).toBe(minutes('tpl_herstel', day(5, 1), program, 'gewoon'));
    // 35 en 45 in week 4, dan minstens 5 minuten en hoogstens 10% erbij.
    const plan = (id: string, date: string) => progressionTarget(t(id), program, date)!.minutes;
    expect(minutes('tpl_easy_run', day(5, 4), program, 'ladder')).toBe(Math.min(plan('tpl_easy_run', day(5, 4)), 40));
    expect(minutes('tpl_long_run', day(5, 7), program, 'ladder')).toBe(Math.min(plan('tpl_long_run', day(5, 7)), 50));
    const longer: Program = { ...program, direction: { id: 'improve', factors: [1.6, 1.6, 1.6, 1] } };
    expect(minutes('tpl_easy_run', day(5, 4), longer, 'ladder')).toBe(40);
    expect(minutes('tpl_long_run', day(5, 7), longer, 'ladder')).toBe(50);
    expect(minutes('tpl_long_run', day(5, 7), longer, 'licht')).toBe(35);
  });

  it('een training met een eigen lengte houdt die', () => {
    const program = programFor(4);
    setFixedSessionMinutes([{ templateId: 'tpl_upper_a', scheduledDate: day(1, 2), plannedMinutes: 60 }]);
    expect(minutes('tpl_upper_a', day(1, 2), program, 'ladder')).toBe(60);
  });

  it('een plan zonder beginnersstart verandert niet', () => {
    const plain: Program = { ...programFor(4), phases: layoutWaves(START, START, 12, START, 0) };
    for (const id of ['tpl_upper_a', 'tpl_herstel', 'tpl_easy_run', 'tpl_long_run']) {
      expect(minutes(id, day(1, 2), plain, 'ladder'), id).toBe(minutes(id, day(1, 2), plain, 'gewoon'));
    }
  });
});

describe('de sets in de start (Forge)', () => {
  const strength = templates.filter((x) => x.type === 'strength' && x.exercises?.length);

  it('Bovenlichaam A: 10, 13, 17 en 20 werksets; week 1 elke oefening van de korte versie 2 sets', () => {
    const upper = t('tpl_upper_a');
    const full = upper.exercises!;
    const per = [1, 2, 3, 4].map((w) => capWorkSets(full, startLadderSets(programFor(4), day(w, 2), 'ladder', setsOf(full))!));
    expect(per.map(setsOf)).toEqual([10, 13, 17, 20]);
    expect(per[0].map((s) => s.sets)).toEqual([2, 2, 2, 2, 2]);
    expect(per[0].every((s) => s.priority !== 'optional')).toBe(true);
    // Week 3 is de korte versie met volle sets.
    expect(per[2]).toEqual(exercisesForVariant(upper, 'short'));
  });

  it('elke krachttraining: hoogstens de sets van de ladder, de kern blijft, elke week hoogstens de week erna', () => {
    for (const tpl of strength) {
      const full = tpl.exercises!;
      let before = 0;
      for (let w = 1; w <= 4; w++) {
        const max = startLadderSets(programFor(4), day(w, 2), 'ladder', setsOf(full))!;
        const out = capWorkSets(full, max);
        expect(setsOf(out), `${tpl.id} week ${w}`).toBeLessThanOrEqual(Math.max(max, out.filter((s) => s.priority === 'core').length));
        expect(setsOf(out), `${tpl.id} week ${w} groeit`).toBeGreaterThanOrEqual(before);
        for (const core of full.filter((s) => s.priority === 'core')) expect(out.some((s) => s.id === core.id), `${tpl.id} ${core.id}`).toBe(true);
        before = setsOf(out);
      }
    }
  });

  it('buiten de ladder, bij Gewoon en bij heel licht van voor de ladder geen grens', () => {
    expect(startLadderSets(programFor(4), day(5, 2), 'ladder', 23)).toBeUndefined();
    expect(startLadderSets(programFor(6), day(5, 2), 'ladder', 23)).toBeUndefined();
    expect(startLadderSets(programFor(4), day(1, 2), 'licht', 23)).toBeUndefined();
    expect(startLadderSets(programFor(4), day(1, 2), 'gewoon', 23)).toBeUndefined();
    const full = t('tpl_upper_a').exercises!;
    expect(capWorkSets(full, 99)).toBe(full);
  });

  it('opgegeven sets per set (setTargets) gaan mee', () => {
    const target = { repsLow: 5, repsHigh: 5, rir: 2 };
    const slot: ExercisePrescription = { id: 'x', exerciseName: 'Squat', sets: 3, reps: '5', priority: 'core', setTargets: [target, target, target] };
    const out = capWorkSets([slot], 2);
    expect(out[0].sets).toBe(2);
    expect(out[0].setTargets).toHaveLength(2);
  });
});

describe('het voorstel en Week zeggen hetzelfde (stap 5)', () => {
  const goals = ['fit', 'improve', 'stronger', 'easy'] as const;
  it.each(goals.flatMap((goal) => [2, 3, 4, 5].flatMap((days) => [3, 4, 6].map((length) => [goal, days, length] as const))))(
    'richting %s, %i dagen, golven van %i: de zin noemt wat de geplande week 1 heeft',
    (goal, days, length) => {
      const strength = days > 2 || goal === 'stronger';
      const kept = chooseWeekShape(templates, { goal, daysPerWeek: days, allowedDays: [1, 2, 3, 4, 5, 6, 7], strength }).kept;
      const line = beginnerWeekOneLine(kept);
      const program = programFor(length);
      const swap: Record<string, string> = { tpl_easy_run: 'tpl_walk_jog', tpl_long_run: 'tpl_walk_jog_long' };
      const walks = kept.filter((id) => swap[id]).map((id) => minutes(swap[id], day(1, 3), program, 'ladder')).sort((x, y) => x - y);
      const hasStrength = kept.some(isStrengthTemplateId);
      if (!hasStrength && walks.length === 0) return expect(line).toBeUndefined();
      expect(line).toMatch(/Elke week wordt het iets meer/);
      expect(line).not.toMatch(/[\u2013\u2014]/);
      expect(line?.includes('kracht tot 35 minuten')).toBe(hasStrength);
      if (walks.length === 0) expect(line).not.toMatch(/wandelen/);
      else expect(line).toContain(walks.length === 1 ? `één keer wandelen en dribbelen: ${walks[0]} minuten` : `${walks.length === 2 ? 'twee' : walks.length} keer wandelen en dribbelen: ${walks.slice(0, -1).join(', ')} en ${walks[walks.length - 1]} minuten`);
    },
  );

  it('twee dagen is één keer wandelen en dribbelen, en week 2 is langer', () => {
    const line = beginnerWeekOneLine(['tpl_upper_a', 'tpl_long_run']);
    expect(line).toBe('Week 1: kracht tot 35 minuten, één keer wandelen en dribbelen: 30 minuten. Elke week wordt het iets meer.');
    expect(minutes('tpl_walk_jog_long', day(2, 6), programFor(4), 'ladder')).toBeGreaterThan(30);
    expect(beginnerWeekOneLine(['tpl_easy_run', 'tpl_long_run'])).toMatch(/^Week 1: twee keer wandelen en dribbelen: 20 en 30 minuten/);
  });
});

describe('de regel over het gewicht boven de eerste krachttraining van de start', () => {
  it('alleen kracht, alleen in de start, en alleen zolang je nog geen kracht logde', () => {
    const program = programFor(4);
    const line = 'Kies een gewicht dat licht voelt. Je moet er nog een paar over hebben.';
    expect(firstStrengthLine(t('tpl_upper_a'), day(1, 1), program, [])).toBe(line);
    expect(firstStrengthLine(t('tpl_walk_jog'), day(1, 1), program, [])).toBeUndefined();
    expect(firstStrengthLine(t('tpl_upper_a'), day(5, 1), program, [])).toBeUndefined();
    expect(firstStrengthLine(t('tpl_upper_a'), day(2, 1), program, [{ type: 'strength' }])).toBeUndefined();
    expect(firstStrengthLine(t('tpl_upper_a'), day(1, 1), null, [])).toBeUndefined();
  });
});
