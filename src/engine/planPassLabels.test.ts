import { describe, it, expect } from 'vitest';
import { planPass, type PlanPassContext } from './planPass';
import { raceBlocks } from './raceBlock';
import { lockLevel } from './weekValidator';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { TrainingGoal } from '../models/goals';
import type { PlannedSession } from '../models/training';
import { addDays } from '../utils/dates';

// Ronde 2b: de planningsronde blijft één pure volgorde (wedstrijdblok, dan de weekcontrole) en leest
// het label van het doel. Nagemaakte weken, dezelfde indeling als in weekValidator.test.ts.
const { templates } = buildDefaultProgramData();
const TODAY = '2026-10-19';
const DAYS = ['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_herstel', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const week = (monday: string): PlannedSession[] => DAYS.map((templateId, i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }));
const sessions = [...week('2026-10-19'), ...week('2026-10-26'), ...week('2026-11-02')];

const race = (priority: TrainingGoal['priority']): TrainingGoal => ({
  id: 'race', name: 'Wedstrijd', status: 'active', targetDate: '2026-10-24', createdAt: '', updatedAt: '', priority,
  requirements: [{ id: 'r', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'km' }, discipline: 'running' }],
}) as TrainingGoal;

let n = 0;
const ctxFor = (priority: TrainingGoal['priority']): PlanPassContext => ({
  today: TODAY, logs: [], templates, program: null, blocks: raceBlocks([race(priority)], 'gr5', '2027-08-01', TODAY), restDay: 4,
  goalDay: '2027-08-01', newId: () => `new${++n}`,
});
const byTemplate = (list: PlannedSession[], date: string) => list.filter((s) => s.scheduledDate === date).map((s) => s.templateId);

describe('de planningsronde met het label van een wedstrijd', () => {
  it('Voortop: de wedstrijd op zijn dag, en de zware beendag binnen het herstel van 4 dagen schuift of wordt korter, gemeld', () => {
    const result = planPass(sessions, ctxFor('voortop'));
    expect(byTemplate(result.sessions, '2026-10-24')).toEqual(['tpl_race']);
    const lower = result.sessions.find((s) => s.id === '2026-10-26-2')!;
    const short = templates.find((t) => t.id === 'tpl_lower_a')!.durationVariants.short;
    // Dag 4 na de wedstrijd (woensdag 28): niet vol op die dag.
    expect(lower.scheduledDate !== '2026-10-28' || lower.plannedMinutes === short).toBe(true);
    expect(result.repairs.some((r) => r.rule === 'AFTER-GOAL' && r.sessionId === lower.id)).toBe(true);
  });

  it('Voortop: een tweede ronde over het resultaat verandert niets meer', () => {
    const first = planPass(sessions, ctxFor('voortop'));
    const second = planPass(first.sessions, ctxFor('voortop'));
    expect(second.repairs).toEqual([]);
    expect(JSON.stringify(second.sessions)).toBe(JSON.stringify(first.sessions));
  });

  it('Verkenning: de wedstrijd staat op zijn dag als anker, de rest van de week blijft zoals hij was behalve het herstel erna', () => {
    const result = planPass(sessions, ctxFor('verkenning'));
    const placed = result.sessions.find((s) => s.templateId === 'tpl_race')!;
    expect(placed.scheduledDate).toBe('2026-10-24');
    expect(lockLevel(placed, new Set(), TODAY)).toBe(2);
    // Geen afbouw: de dagen voor de wedstrijd zijn niet korter gemaakt.
    for (const s of result.sessions.filter((x) => x.scheduledDate >= '2026-10-19' && x.scheduledDate < '2026-10-24')) expect(s.plannedMinutes).toBeUndefined();
    // Herstel van een 10 km (4 dagen) geldt ook voor een Verkenning.
    expect(result.repairs.some((r) => r.rule === 'AFTER-GOAL')).toBe(true);
    expect(planPass(result.sessions, ctxFor('verkenning')).repairs).toEqual([]);
  });

  it('Voortop heeft afbouw en Verkenning niet: Upper A op dinsdag voor de wedstrijd', () => {
    const voortop = planPass(sessions, ctxFor('voortop')).sessions.find((s) => s.id === '2026-10-19-1')!;
    const verkenning = planPass(sessions, ctxFor('verkenning')).sessions.find((s) => s.id === '2026-10-19-1')!;
    expect(voortop.plannedMinutes).toBe(templates.find((t) => t.id === 'tpl_upper_a')!.durationVariants.short);
    expect(verkenning.plannedMinutes).toBeUndefined();
  });
});
