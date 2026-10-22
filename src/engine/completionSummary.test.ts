import { describe, it, expect } from 'vitest';
import { completionSummary, logFacts, type CompletionInputs } from './completionSummary';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { GoalMilestone, TrainingGoal } from '../models/goals';

const { templates } = buildDefaultProgramData();
const TODAY = '2026-11-04'; // a Wednesday, the week starts on 2026-11-02
const type = (id: string) => templates.find((t) => t.id === id)!.type;
const nameOf = (id: string) => templates.find((t) => t.id === id)!.name;

let n = 0;
const log = (templateId: string, extra: Partial<SessionLog> = {}): SessionLog => ({
  id: `l${n++}`, templateId, type: type(templateId), completedDate: TODAY, completedAt: `${TODAY}T10:00:00Z`, variant: 'full', durationMinutes: 41, source: 'manual', ...extra,
});
const planned = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId, scheduledDate: date, weekStartDate: '2026-11-02', status: 'planned', order: 0, ...extra,
});

const tenK: TrainingGoal = {
  id: 'g10', name: '10 km', status: 'active', targetDate: '2027-03-20', createdAt: '', updatedAt: '',
  requirements: [{ id: 'r', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'km' }, discipline: 'running' }],
};
const trek: TrainingGoal = {
  id: 'gtrek', name: 'GR5', status: 'active', targetDate: '2027-08-01', createdAt: '', updatedAt: '',
  requirements: [{ id: 'r2', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 20, unit: 'km' }, discipline: 'hiking' }],
};
const ladder: GoalMilestone[] = [
  { id: 'm1', goalId: 'gtrek', order: 1, title: 'Eerste tocht', requirement: { kind: 'manual' } },
  { id: 'm2', goalId: 'gtrek', order: 2, title: 'Dag met 300 m D+', requirement: { kind: 'manual' } },
];

const week = [
  planned('p1', 'tpl_easy_run', TODAY),
  planned('p2', 'tpl_upper_b', '2026-11-05'),
  planned('p3', 'tpl_long_run', '2026-11-07'),
];

function inputs(logs: SessionLog[], logIds: string[], over: Partial<CompletionInputs> = {}): CompletionInputs {
  const plannedSessions = over.plannedSessions ?? week;
  return {
    logs, logIds, templates, plannedSessions, goals: [tenK, trek], goalMilestones: ladder, goalMilestoneProgress: [],
    legs: { logs, plannedSessions, templates, today: TODAY }, today: TODAY, ...over,
  };
}

const watchRun = log('tpl_easy_run', { plannedSessionId: 'p1', externalId: 'x1', source: 'garmin', cardioData: { durationMinutes: 41, distanceKm: 6.2, avgHeartRate: 142, maxHeartRate: 158, elevationGainM: 30, source: 'garmin' } });

describe('de feiten', () => {
  it('een loop van het horloge: tijd, afstand, tempo, en daarna hoogte en hartslag', () => {
    const f = logFacts(watchRun);
    expect(f.main).toEqual(['41 min', '6,2 km', 'gemiddeld 6:37 per km']);
    expect(f.extra).toEqual(['30 m omhoog', 'hartslag 142 gemiddeld, 158 hoogst']);
    expect(f.fromWatch).toBe(true);
  });

  it('een tocht: hoogtemeters horen bij de hoofdzaken, daarna omlaag en rugzak', () => {
    const f = logFacts(log('tpl_mountain_hike', { durationMinutes: 195, outdoorData: { durationMinutes: 195, distanceKm: 12.4, elevationGainM: 820, elevationLossM: 790, backpackWeightKg: 10, source: 'manual' } }));
    expect(f.main).toEqual(['3 uur 15 min', '12,4 km', '820 m omhoog']);
    expect(f.extra).toEqual(['790 m omlaag', 'rugzak 10 kg']);
    expect(f.fromWatch).toBe(false);
  });

  it('kracht: oefeningen en sets, geen tempo', () => {
    const f = logFacts(log('tpl_upper_a', { durationMinutes: 55, strengthData: [
      { exerciseId: 'a', exerciseName: 'Bankdrukken', sets: [{ reps: 8, weightKg: 60 }, { reps: 8, weightKg: 60 }, { reps: 0 }] },
      { exerciseId: 'b', exerciseName: 'Roeien', sets: [{ reps: 10, weightKg: 50 }] },
    ] }));
    expect(f.main).toEqual(['55 min', '2 oefeningen', '3 sets']);
  });

  it('een geschatte hoogte op de loopband zegt dat hij geschat is', () => {
    const f = logFacts(log('tpl_bergconditie', { cardioData: { durationMinutes: 41, distanceKm: 4, elevationGainM: 200, estimatedElevation: true, environment: 'treadmill', source: 'manual' } }));
    expect(f.main.concat(f.extra)).toContain('200 m omhoog (geschat)');
  });

  it('zonder getallen blijft alleen de tijd over, niets verzonnen', () => {
    const f = logFacts(log('tpl_upper_a', { durationMinutes: 50 }));
    expect(f).toEqual({ main: ['50 min'], extra: [], fromWatch: false });
  });
});

describe('de drie regels', () => {
  it('een loop: doel, week en benen, in die volgorde', () => {
    const s = completionSummary(inputs([watchRun], [watchRun.id]));
    expect(s.title).toBe(nameOf('tpl_easy_run'));
    expect(s.lines.map((l) => l.id)).toEqual(['goal', 'week', 'legs']);
    expect(s.count).toBe(1);
  });

  it('doel: de training bouwt aan het doel dat hij oefent, met de weken erbij', () => {
    const goal = completionSummary(inputs([watchRun], [watchRun.id])).lines[0];
    expect(goal.text).toBe('Dit bouwt aan 10 km.');
    expect(goal.note).toBe('Nog 20 weken tot 10 km.');
  });

  it('doel: een bergtocht bouwt aan de GR5 en noemt het volgende kamp', () => {
    const hike = log('tpl_mountain_hike', { outdoorData: { durationMinutes: 180, distanceKm: 12, source: 'manual' } });
    const goal = completionSummary(inputs([hike], [hike.id])).lines[0];
    expect(goal.text).toBe('Dit bouwt aan GR5.');
    expect(goal.note).toContain('Volgend kamp: Eerste tocht.');
  });

  it('doel: raakt de training geen doel, dan is er geen doelregel', () => {
    const walk = log('tpl_herstel', { durationMinutes: 30 });
    expect(completionSummary(inputs([walk], [walk.id])).lines.map((l) => l.id)).toEqual(['week', 'legs']);
  });

  it('week: hoeveel gedaan en wat er volgt', () => {
    const line = completionSummary(inputs([watchRun], [watchRun.id])).lines.find((l) => l.id === 'week')!;
    expect(line.text).toBe('1 van 3 trainingen deze week gedaan.');
    expect(line.note).toBe(`Daarna ${nameOf('tpl_upper_b')}, morgen.`);
  });

  it('week: alles gedaan is een rond woord', () => {
    const a = log('tpl_easy_run', { plannedSessionId: 'p1' });
    const b = log('tpl_upper_b', { plannedSessionId: 'p2' });
    const c = log('tpl_long_run', { plannedSessionId: 'p3' });
    const line = completionSummary(inputs([a, b, c], [c.id])).lines.find((l) => l.id === 'week')!;
    expect(line.text).toBe('Je week is rond: alle 3 trainingen gedaan.');
  });

  it('week: een overgeslagen training telt niet mee, een extra training zegt dat', () => {
    const extra = log('tpl_easy_run');
    const ps = [planned('p1', 'tpl_easy_run', TODAY), planned('p2', 'tpl_upper_b', '2026-11-05', { status: 'skipped' })];
    const line = completionSummary(inputs([extra], [extra.id], { plannedSessions: ps })).lines.find((l) => l.id === 'week')!;
    expect(line.text).toBe('0 van 1 training deze week gedaan.');
    expect(line.note).toBe('Deze training stond niet in je planning.');
  });

  it('benen: morgen met de naam van wat er staat en de beenindex met uitleg', () => {
    const legs = completionSummary(inputs([watchRun], [watchRun.id])).lines.find((l) => l.id === 'legs')!;
    expect(legs.text).toMatch(new RegExp(`^Morgen ${nameOf('tpl_upper_b')}\\. Je benen zijn dan (fris|wat vermoeid|vermoeid)\\.$`));
    expect(legs.note).toMatch(/^Beenindex \d+(,\d)?: tot 8 is fris, boven 12 vermoeid\.$/);
  });

  it('benen: na een zware beendag zijn ze morgen niet meer fris', () => {
    const heavy = log('tpl_lower_a', { durationMinutes: 70, rpe: 9, plannedSessionId: 'p1' });
    const legs = completionSummary(inputs([heavy], [heavy.id])).lines.find((l) => l.id === 'legs')!;
    expect(legs.text).not.toContain('dan fris');
  });

  it('benen: een lege dag morgen zegt dat er niets gepland staat', () => {
    const ps = [planned('p1', 'tpl_easy_run', TODAY)];
    const legs = completionSummary(inputs([watchRun], [watchRun.id], { plannedSessions: ps })).lines.find((l) => l.id === 'legs')!;
    expect(legs.text.startsWith('Morgen staat er niets gepland.')).toBe(true);
  });
});

describe('een kamp en een samenvatting van meer trainingen', () => {
  it('een behaald kamp met een training: de training blijft de titel, het kamp staat in de doelregel', () => {
    const hike = log('tpl_mountain_hike', { outdoorData: { durationMinutes: 180, distanceKm: 12, source: 'manual' } });
    const s = completionSummary(inputs([hike], [hike.id], { milestoneTitle: 'Dag met 300 m D+' }));
    expect(s.title).toBe(nameOf('tpl_mountain_hike'));
    expect(s.lines[0].text).toBe('Kamp 2 behaald: Dag met 300 m D+.');
  });

  it('een kamp dat je zelf markeerde: alleen de doelregel, geen week en benen', () => {
    const s = completionSummary(inputs([], [], { milestoneTitle: 'Eerste tocht' }));
    expect(s.count).toBe(0);
    expect(s.title).toBe('Eerste tocht');
    expect(s.lines.map((l) => l.id)).toEqual(['goal']);
    expect(s.lines[0].text).toBe('Kamp 1 behaald: Eerste tocht.');
  });

  it('Alles opslaan: één samenvatting met alle namen en de totale tijd', () => {
    const a = log('tpl_upper_a', { durationMinutes: 50, plannedSessionId: 'p1' });
    const b = log('tpl_lower_a', { durationMinutes: 60 });
    const s = completionSummary(inputs([a, b], [a.id, b.id]));
    expect(s.title).toBe('2 krachttrainingen opgeslagen');
    expect(s.count).toBe(2);
    expect(s.facts.main[0]).toMatch(/ en /);
    expect(s.facts.extra).toEqual(['samen 1 uur 50 min']);
    expect(s.items).toHaveLength(2);
    expect(s.lines.filter((l) => l.id === 'legs')).toHaveLength(1);
  });

  it('53 trainingen: een korte samenvatting met aantallen, de lijst apart', () => {
    const logs: SessionLog[] = [];
    for (let i = 0; i < 53; i++) {
      const id = ['tpl_upper_a', 'tpl_lower_a', 'tpl_upper_b', 'tpl_lower_b', 'tpl_easy_run'][i % 5];
      const day = String(1 + (i % 28)).padStart(2, '0');
      logs.push(log(id, { completedDate: `2026-10-${day}`, completedAt: `2026-10-${day}T10:00:00Z`, durationMinutes: 50 }));
    }
    const s = completionSummary(inputs(logs, logs.map((l) => l.id)));
    expect(s.count).toBe(53);
    expect(s.facts.main).toHaveLength(1);
    expect(s.facts.main[0].length).toBeLessThan(120);
    expect(s.facts.main[0]).toMatch(/keer/);
    expect(s.facts.main[0]).toMatch(/en nog 2 andere soorten/);
    expect(s.facts.extra.join(' ')).toMatch(/van 1 oktober/);
    expect(s.items).toHaveLength(53);
    expect(s.items![0]).toMatch(/^1 oktober, /);
  });
});
