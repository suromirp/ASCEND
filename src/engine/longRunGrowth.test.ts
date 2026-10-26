import { describe, it, expect, afterEach } from 'vitest';
import { PHASE_BASIS, PHASE_OPBOUW, layoutPhasesForGoal, readRunBuild } from './programLayout';
import { recentSessionMaxima, resolveEffectiveFullDuration, setDurationAdjustments, setRecentSessionMaxima } from './substitutions';
import { programRunBuild } from './runGrowth';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { Program } from '../models/program';
import type { TrainingGoal } from '../models/goals';
import { addDays } from '../utils/dates';

// De groei van de lange loop naar een hardloopwedstrijd (instelling "Groei van de lange loop"):
// geleidelijk, nooit in één keer naar de piek of naar de 110%-grens. Nagemaakt programma: vier weken
// basis, zestien weken Opbouw, de wedstrijd (een halve marathon, piek 120 minuten) in week 21.
const { templates } = buildDefaultProgramData();
const longRun = templates.find((t) => t.id === 'tpl_long_run')!;
const START = '2026-10-26';
const phases = layoutPhasesForGoal(START, addDays(START, 7 * 30), { [PHASE_BASIS]: 4, [PHASE_OPBOUW]: 16 })!;
const RACE_WEEK = 21;
const OPBOUW_START = 5;
const raceGoal = (date: string): TrainingGoal => ({
  id: 'race', name: 'Wedstrijd', status: 'active', targetDate: date, createdAt: '', updatedAt: '',
  requirements: [{ id: 'r', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 21.1, unit: 'km' }, discipline: 'running' }],
}) as TrainingGoal;
const programFor = (growth: Parameters<typeof programRunBuild>[3]): Program => {
  const base: Program = { id: 'p', name: 'P', startDate: START, phases };
  const runBuild = programRunBuild([raceGoal(addDays(START, 7 * (RACE_WEEK - 1) + 5))], undefined, START, growth);
  return runBuild ? { ...base, runBuild } : base;
};
const sunday = (week: number) => addDays(START, (week - 1) * 7 + 6);
const series = (program: Program, from = 1, to = 24) => Array.from({ length: to - from + 1 }, (_, i) => resolveEffectiveFullDuration(longRun, sunday(from + i), program));
const isLight = (week: number) => week >= OPBOUW_START && (week - OPBOUW_START) % 4 === 3;

afterEach(() => {
  setRecentSessionMaxima({ asOf: '', minutesByTemplate: {} });
  setDurationAdjustments([]);
});

describe('elke week hoogstens 10% boven de vorige opbouwweek, nooit in één keer naar de piek', () => {
  const weekly = series(programFor('weekly'));
  const at = (week: number) => weekly[week - 1];

  it('Volgens het onderzoek: elke opbouwweek hoogstens 10% boven de vorige opbouwweek', () => {
    let lastBuild = 70;
    for (let week = OPBOUW_START; week < RACE_WEEK; week++) {
      if (isLight(week)) continue;
      expect(at(week), `week ${week}`).toBeLessThanOrEqual(Math.floor(lastBuild * 1.1));
      // De week na een piek is de afgeleide van 80%: die telt niet als nieuwe opbouwweek.
      if (at(week) === 96) continue;
      expect(at(week), `week ${week}`).toBeGreaterThanOrEqual(lastBuild);
      lastBuild = at(week);
    }
    // De eerste week in Opbouw springt niet naar de piek van 120.
    expect(at(OPBOUW_START)).toBeLessThanOrEqual(77);
  });

  it('de lichtere week van de golf blijft: lager dan de week ervoor en erna', () => {
    for (let week = OPBOUW_START; week < RACE_WEEK - 1; week++) {
      if (!isLight(week)) continue;
      expect(at(week), `week ${week}`).toBeLessThan(at(week - 1));
      expect(at(week + 1), `week ${week + 1}`).toBeGreaterThan(at(week));
    }
  });

  it('bereikt de piek van 120 en wisselt dan af: nooit twee weken achter elkaar op de piek', () => {
    const onPeak = weekly.map((m, i) => ({ week: i + 1, m })).filter(({ m }) => m >= 120);
    expect(onPeak.length).toBeGreaterThan(0);
    for (let week = OPBOUW_START; week < RACE_WEEK; week++) expect(at(week) >= 120 && at(week + 1) >= 120, `week ${week}`).toBe(false);
    expect(weekly.slice(0, RACE_WEEK).some((m) => m === 96)).toBe(true);
  });

  it('Stevig: dezelfde stappen, maar de piek mag elke week staan', () => {
    const firm = series(programFor('firm'));
    expect(firm.slice(0, 8)).toEqual(weekly.slice(0, 8));
    expect(firm.slice(0, RACE_WEEK).some((m, i) => m >= 120 && firm[i + 1] >= 120)).toBe(true);
  });

  it('Rustiger is langzamer dan het advies en Heel rustig is het oude gedrag', () => {
    const calm = series(programFor('biweekly'));
    const old = series(programFor('wave'));
    // Heel rustig: geen geleidelijke groei (readRunBuild negeert het) en geen afwisseling op de piek.
    expect(readRunBuild(programFor('wave').runBuild)).toMatchObject({ taperOnly: true });
    expect(programFor('wave').runBuild?.alternatePeak).toBe(false);
    for (let week = OPBOUW_START; week <= 11; week++) expect(calm[week - 1]).toBeLessThanOrEqual(at(week));
    expect(calm[OPBOUW_START - 1]).toBeLessThan(calm[OPBOUW_START + 1]);
    expect(Math.max(...old.slice(0, RACE_WEEK))).toBeLessThan(Math.max(...weekly.slice(0, RACE_WEEK)));
  });
});

describe('Heel rustig, de stop bij de wedstrijd en de start van de opbouw', () => {
  it('Heel rustig laat de piek niet afwisselen (het oude gedrag), de andere keuzes wel', () => {
    const wave = series(programFor('wave'), 1, 40);
    for (let i = 0; i + 1 < wave.length; i++) expect(wave[i] === 96, `week ${i + 1}`).toBe(false);
    expect(series(programFor('weekly'), 1, 20).some((m) => m === 96)).toBe(true);
  });

  it('vanaf de week van de wedstrijd groeit de lange loop niet meer geleidelijk door', () => {
    const weekly = series(programFor('weekly'), 1, 26);
    const usual = series(programFor('wave'), 1, 26);
    for (let week = RACE_WEEK; week <= 26; week++) expect(weekly[week - 1], `week ${week}`).toBe(usual[week - 1]);
  });

  it('de opbouw start vanaf de hoogste niet-lichte week van de laatste vier weken', () => {
    const program = programFor('weekly');
    const before = series(program, 1, OPBOUW_START - 1);
    // De lichte week (week 4 van de basis) telt niet; de hoogste van de weken ervoor is de maat.
    const base = Math.max(...before.slice(0, 3));
    expect(series(program, OPBOUW_START, OPBOUW_START)[0]).toBeLessThanOrEqual(Math.floor(base * 1.1));
    expect(series(program, OPBOUW_START, OPBOUW_START)[0]).toBeGreaterThanOrEqual(base);
  });

  it('een doorgetrainde rustweek eerder in de opbouw telt als opbouwweek, niet als lichte week', () => {
    const program = programFor('weekly');
    const lightWeek = 8;
    const skipped: Program = { ...program, skippedRestWeeks: [addDays(START, 7 * (lightWeek - 1))] };
    expect(series(skipped, lightWeek + 1, lightWeek + 1)[0]).not.toBe(series(program, lightWeek + 1, lightWeek + 1)[0]);
  });
});

describe('afbouw voor de wedstrijd (afgeleide regel)', () => {
  const tenK = (): Program => {
    const base: Program = { id: 'p', name: 'P', startDate: START, phases };
    const race = addDays(START, 7 * (RACE_WEEK - 1) + 5);
    const runBuild = programRunBuild([{ ...raceGoal(race), requirements: [{ id: 'r', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'km' }, discipline: 'running' }], details: { variant: '10k' } } as unknown as TrainingGoal], undefined, START, 'weekly');
    return { ...base, runBuild };
  };
  const race = addDays(START, 7 * (RACE_WEEK - 1) + 5);
  it('de laatste 14 dagen hoogstens de wedstrijdpiek, de laatste 7 dagen hoogstens 70% daarvan', () => {
    const p = tenK();
    expect(p.runBuild?.peakMinutes).toBe(75);
    for (let back = 1; back <= 14; back++) {
      const d = addDays(race, -back);
      const m = resolveEffectiveFullDuration(longRun, d, p);
      expect(m, d).toBeLessThanOrEqual(back <= 7 ? Math.round(75 * 0.7) : 75);
    }
  });
  it('daarbuiten blijft de gewone groei, en een programma zonder wedstrijdpiek wordt niet begrensd', () => {
    const p = tenK();
    expect(resolveEffectiveFullDuration(longRun, addDays(race, -21), p)).toBeGreaterThan(75);
    const none: Program = { ...p, runBuild: { ...p.runBuild!, peakMinutes: 0 } };
    expect(resolveEffectiveFullDuration(longRun, addDays(race, -6), none)).toBeGreaterThan(Math.round(75 * 0.7));
  });
});

describe('de rem rekent met wat je echt liep', () => {
  // Elke week een zondag: de lange loop wordt gelopen zoals gepland, of overgeslagen.
  function walk(program: Program, skip: number[], from = 5, to = 16) {
    const done: { templateId: string; completedDate: string; durationMinutes: number }[] = [];
    const planned: number[] = [];
    for (let week = from; week <= to; week++) {
      // Zoals de app vlak voor de week: de langste loop van de laatste 30 dagen.
      setRecentSessionMaxima(recentSessionMaxima(done, addDays(START, (week - 1) * 7)));
      const minutes = resolveEffectiveFullDuration(longRun, sunday(week), program);
      planned.push(minutes);
      if (!skip.includes(week)) done.push({ templateId: 'tpl_long_run', completedDate: sunday(week), durationMinutes: minutes });
    }
    return { planned, done };
  }
  const program = programFor('weekly');
  // De rem rondt op 5 minuten af: hoogstens 10% boven wat je echt liep, plus die afronding.
  const limit = (done: { durationMinutes: number; completedDate: string }[], week: number) => {
    const asOf = addDays(START, (week - 1) * 7);
    const longest = Math.max(0, ...done.filter((d) => d.completedDate >= addDays(asOf, -30) && d.completedDate <= asOf).map((d) => d.durationMinutes));
    return longest ? Math.round((longest * 1.1) / 5) * 5 : Infinity;
  };

  it('een reeks van twaalf weken zonder overslaan volgt het plan binnen de rem', () => {
    const { planned, done } = walk(program, []);
    expect(planned).toHaveLength(12);
    planned.forEach((m, i) => expect(m, `week ${5 + i}`).toBeLessThanOrEqual(Math.max(limit(done, 5 + i), 77)));
    // Geleidelijk: elke stap omhoog is klein.
    for (let i = 1; i < planned.length; i++) if (planned[i] > planned[i - 1]) expect(planned[i] / planned[i - 1]).toBeLessThan(1.8);
  });

  it('twee overgeslagen lange lopen: de volgende groeit vanaf wat je echt deed, niet vanaf het plan', () => {
    const plan = walk(program, []).planned;
    const { planned, done } = walk(program, [8, 9, 10], 5, 16);
    // Weken 5 tot en met 7 zijn gelopen; daarna niets tot week 11: de rem zit op wat je liep.
    planned.forEach((m, i) => {
      const week = 5 + i;
      expect(m, `week ${week}`).toBeLessThanOrEqual(Math.max(limit(done.filter((d) => d.completedDate < sunday(week)), week), 77));
    });
    expect(planned[6]).toBeLessThanOrEqual(plan[6]);
    expect(planned[planned.length - 1]).toBeLessThanOrEqual(plan[plan.length - 1]);
    expect(planned.slice(3).every((m) => m <= Math.round((Math.max(...done.map((d) => d.durationMinutes)) * 1.1) / 5) * 5)).toBe(true);
  });

  it('na een pauze geldt de bestaande herstart en zakken de stappen mee', () => {
    const base = series(program, 9, 16);
    setDurationAdjustments([{ from: sunday(9), until: sunday(16), factor: 0.7 }]);
    const lowered = series(program, 9, 16);
    setDurationAdjustments([]);
    lowered.forEach((m, i) => expect(m).toBeLessThan(base[i]));
    lowered.forEach((m, i) => expect(Math.abs(m - Math.max(15, Math.round((base[i] * 0.7) / 5) * 5))).toBeLessThanOrEqual(5));
  });
});

describe('Sneller dan het onderzoek', () => {
  it('groeit wekelijks harder, maar de lichtere week blijft en de rem is 120% van wat je echt liep', () => {
    const fast = programFor('fast');
    const weekly = programFor('weekly');
    expect(fast.runBuild).toMatchObject({ stepPercent: 20, spikeLimit: 1.2, alternatePeak: false });
    const f = series(fast);
    const w = series(weekly);
    expect(f[OPBOUW_START - 1]).toBeGreaterThan(w[OPBOUW_START - 1]);
    for (let week = OPBOUW_START; week <= RACE_WEEK; week++) expect(f[week - 1]).toBeGreaterThanOrEqual(w[week - 1]);
    for (let week = OPBOUW_START; week < RACE_WEEK; week++) if (isLight(week)) expect(f[week - 1]).toBeLessThan(f[week - 2]);
    // De rem: 60 minuten gelopen, dan 70 (120%, op 5 afgerond) in plaats van 65 (110%).
    setRecentSessionMaxima(recentSessionMaxima([{ templateId: 'tpl_long_run', completedDate: addDays(sunday(9), -3), durationMinutes: 60 }], addDays(sunday(9), -3)));
    expect(resolveEffectiveFullDuration(longRun, sunday(9), fast)).toBeLessThanOrEqual(70);
    expect(resolveEffectiveFullDuration(longRun, sunday(9), fast)).toBeGreaterThan(resolveEffectiveFullDuration(longRun, sunday(9), weekly));
  });

  it('de rem van 110% verandert alleen via deze keuze', () => {
    for (const growth of ['weekly', 'firm', 'biweekly', 'wave'] as const) {
      setRecentSessionMaxima(recentSessionMaxima([{ templateId: 'tpl_long_run', completedDate: addDays(sunday(9), -3), durationMinutes: 60 }], addDays(sunday(9), -3)));
      expect(resolveEffectiveFullDuration(longRun, sunday(9), programFor(growth)), growth).toBeLessThanOrEqual(65);
    }
  });
});

describe('afbouw: grensgevallen en Heel rustig', () => {
  const race = addDays(START, 7 * (RACE_WEEK - 1) + 5);
  const withPeak = (growth: Parameters<typeof programRunBuild>[3]): Program => {
    const base: Program = { id: 'p', name: 'P', startDate: START, phases };
    const goal = { ...raceGoal(race), requirements: [{ id: 'r', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'km' }, discipline: 'running' }], details: { variant: '10k' } } as unknown as TrainingGoal;
    return { ...base, runBuild: programRunBuild([goal], undefined, START, growth) };
  };
  const at = (p: Program, daysBefore: number) => resolveEffectiveFullDuration(longRun, addDays(race, -daysBefore), p);

  it('dag 15 is niet begrensd, dag 14 en dag 8 staan op de piek, dag 7 op 70%', () => {
    const p = withPeak('weekly');
    expect(at(p, 15)).toBeGreaterThan(75);
    expect(at(p, 14)).toBeLessThanOrEqual(75);
    expect(at(p, 8)).toBeLessThanOrEqual(75);
    expect(at(p, 8)).toBeGreaterThan(Math.round(75 * 0.7));
    expect(at(p, 7)).toBeLessThanOrEqual(Math.round(75 * 0.7));
  });

  it('Heel rustig krijgt de afbouw ook, en houdt de oude groei', () => {
    const p = withPeak('wave');
    const old: Program = { ...p, runBuild: undefined };
    for (let back = 1; back <= 14; back++) expect(at(p, back), `dag ${back}`).toBeLessThanOrEqual(back <= 7 ? Math.round(75 * 0.7) : 75);
    for (let back = 15; back <= 60; back++) expect(at(p, back), `dag ${back}`).toBe(at(old, back));
  });
});
