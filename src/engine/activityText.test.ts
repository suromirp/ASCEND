import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays } from '../utils/dates';
import type { PlannedSession, SessionLog } from '../models/training';
import { minutesText, resolveStravaTextParts, spanText, stravaCopyText, stravaGoalName, stravaText } from './activityText';
import type { GoalMilestone, TrainingGoal } from '../models/goals';
import type { Program } from '../models/program';
import { PHASE_BASIS, PHASE_GOLF, PHASE_ONDERHOUD } from './programLayout';
import { PHASE_TAPER } from '../models/program';
import { REASON_CHIPS, REASON_LABEL } from '../data/influenceReasons';

const { templates, program } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
// Een nagemaakte dag: de tweede week van het programma.
const day = addDays(program.startDate, 8);

const log = (templateId: string, over: Partial<SessionLog> = {}): SessionLog => ({
  id: `log_${templateId}`,
  templateId,
  type: tpl(templateId).type,
  completedDate: day,
  completedAt: `${day}T10:00:00.000Z`,
  variant: 'full',
  durationMinutes: 45,
  source: 'manual',
  ...over,
});
const planned = (templateId: string): PlannedSession => ({ id: `ps_${templateId}`, templateId, scheduledDate: day, weekStartDate: program.startDate, status: 'planned', order: 0 });
const text = (templateId: string, over: Partial<SessionLog> = {}) => stravaText({ log: log(templateId, over), template: tpl(templateId), planned: planned(templateId), program, goalName: 'GR5' });
const title = (templateId: string, over: Partial<SessionLog> = {}) => text(templateId, over).title;

describe('de stukjes', () => {
  it('schrijft de lengte van een herhaling kort', () => {
    expect(spanText(20)).toBe('20 s');
    expect(spanText(60)).toBe('1 min');
    expect(spanText(90)).toBe('90 s');
    expect(spanText(180)).toBe('3 min');
    expect(spanText(150)).toBe('2 min 30 s');
    expect(minutesText(52)).toBe('52 min');
    expect(minutesText(150)).toBe('2 u 30 min');
    expect(minutesText(120)).toBe('2 u');
  });
});

describe('stravaText: de titel', () => {
  it('een rustige loop heet naar de zone', () => {
    expect(title('tpl_easy_run')).toBe('Zone 2 · rustige duurloop');
    expect(title('tpl_recovery_run')).toBe('Herstelloop · heel rustig');
    expect(title('tpl_herstel')).toBe('Herstelwandeling · rustig');
  });

  it('heuvelintervallen: herhalingen en de lengte van één herhaling', () => {
    expect(title('tpl_hill_intervals', { workout: { reps: 6, repSeconds: 90 } })).toBe('Heuvelintervallen · 6 × 90 s');
    expect(title('tpl_hill_intervals')).toMatch(/^Heuvelintervallen · \d+ × 1 min$/);
  });

  it('het aantal van de log gaat voor op dat van de progressie', () => {
    expect(title('tpl_hills_descent', { workout: { reps: 4 } })).toBe('Heuvelsprints en afdalen · 4 × op en af');
    expect(title('tpl_intervals', { workout: { reps: 6, repSeconds: 180 } })).toBe('Intervallen · 6 × 3 min');
    expect(title('tpl_intervals')).toMatch(/^Intervallen · \d+ × 4 min$/);
    expect(title('tpl_fartlek', { workout: { reps: 6 } })).toBe('Fartlek · 6 × 1 min');
    expect(title('tpl_strides_run', { workout: { reps: 6 } })).toBe('Duurloop met versnellingen · 6 × 20 s');
    expect(title('tpl_progression_run', { workout: { blockMinutes: 10 } })).toBe('Progressieve duurloop · laatste 10 min stevig');
  });

  it('lange duurloop: de gemeten hoogtemeters op tientallen, anders de zone', () => {
    expect(title('tpl_long_run', { cardioData: { durationMinutes: 75, distanceKm: 11.6, elevationGainM: 304, source: 'garmin' } })).toBe('Lange duurloop · 300 hoogtemeters');
    expect(title('tpl_long_run', { cardioData: { durationMinutes: 75, distanceKm: 11.6, elevationGainM: 30, source: 'garmin' } })).toBe('Lange duurloop · zone 2');
    expect(title('tpl_long_run')).toBe('Lange duurloop · zone 2');
  });

  it('een geschatte stijging (loopband) telt niet als hoogtemeters', () => {
    expect(title('tpl_bergconditie', { cardioData: { durationMinutes: 41, distanceKm: 4, elevationGainM: 200, estimatedElevation: true, source: 'manual' } })).toBe('Bergop wandelen');
    expect(title('tpl_bergconditie', { cardioData: { durationMinutes: 41, distanceKm: 4, elevationGainM: 200, source: 'garmin' } })).toBe('Bergop wandelen · 200 hoogtemeters');
  });

  it('een tocht met rugzak: hoogtemeters en het gewicht van de log, anders dat van de rugzakladder', () => {
    expect(title('tpl_ruck_walk', { outdoorData: { durationMinutes: 150, distanceKm: 12, elevationGainM: 210, backpackWeightKg: 9, source: 'garmin' } })).toBe('Rugzakwandeling · 210 hoogtemeters · rugzak 9 kg');
    expect(title('tpl_ruck_walk')).toMatch(/^Rugzakwandeling · rugzak [\d,]+ kg$/);
  });

  it('kracht, een test en een losse activiteit', () => {
    expect(title('tpl_upper_a')).toBe('Kracht · bovenlichaam A');
    expect(title('tpl_test_run')).toBe('Testloop 5 km');
    expect(stravaText({ log: log('tpl_easy_run', { templateId: 'weg' }) })).toEqual({ title: 'Hardlopen' });
  });

  it('noemt geen geplande herhalingen bij een training zonder plan', () => {
    const result = stravaText({ log: log('tpl_hills_descent'), template: tpl('tpl_hills_descent'), program });
    expect(result).toEqual({ title: 'Heuvelsprints en afdalen' });
  });

  it('noemt nooit afstand, totale tijd of tempo, en nooit een gedachtestreep', () => {
    for (const t of templates) {
      const result = text(t.id, { durationMinutes: 47, outdoorData: { durationMinutes: 47, distanceKm: 8.3, elevationGainM: 120, source: 'garmin' } });
      const all = stravaCopyText(result, 'title-line');
      expect(all).not.toMatch(/[–—]/);
      expect(all).not.toMatch(/8,3|\bkm\b(?<!Testloop 5 km)|47|\/km|min\/km/);
      expect(result.title.length).toBeLessThanOrEqual(60);
    }
  });

  // "Wat speelde er" is alleen voor jou (docs/beslissingen/2026-10-25-wat-speelde-er.md):
  // de tekst voor Strava kent geen notitie en noemt nooit een reden.
  it('noemt nooit een reden van Wat speelde er', () => {
    const words = new RegExp(`${REASON_CHIPS.map((r) => REASON_LABEL[r]).join('|')}|glazen|wiet|alcohol`, 'i');
    for (const t of templates) {
      const result = text(t.id, { outdoorData: { durationMinutes: 45, distanceKm: 5, elevationGainM: 50, source: 'garmin' } });
      expect(stravaCopyText(result, 'title-line')).not.toMatch(words);
    }
  });
});

describe('stravaText: de regel waarom', () => {
  const at = (phaseId: string, _week: number, over: Partial<Program> = {}, wave?: { length: number; light: boolean }): Program => ({
    id: 'p', name: 'P', startDate: program.startDate,
    phases: [{ id: phaseId, name: 'EIGEN FASE', order: 1, weekCount: 12, ...(wave ? { wave } : {}) }],
    ...over,
  });
  const lineIn = (prog: Program, week: number, goalName?: string) => {
    const date = addDays(prog.startDate, (week - 1) * 7 + 1);
    const ps: PlannedSession = { ...planned('tpl_easy_run'), scheduledDate: date, weekStartDate: addDays(prog.startDate, (week - 1) * 7) };
    return stravaText({ log: log('tpl_easy_run', { completedDate: date }), template: tpl('tpl_easy_run'), planned: ps, program: prog, goalName }).line;
  };

  it('de week van de fase en waar je heen werkt', () => {
    expect(lineIn(at(PHASE_BASIS, 3), 3, 'GR5')).toBe('Week 3 van de basis, richting GR5');
    expect(lineIn(at(PHASE_BASIS, 3), 3)).toBe('Week 3 van de basis');
  });

  it('de rustweek heet rustweek, tenzij je hem doortraint', () => {
    const prog = at(PHASE_BASIS, 4);
    expect(lineIn(prog, 4, 'GR5')).toBe('Rustweek van de basis, richting GR5');
    expect(lineIn({ ...prog, skippedRestWeeks: [addDays(prog.startDate, 21)] }, 4, 'GR5')).toBe('Week 4 van de basis, richting GR5');
  });

  it('de laatste weken, een golf zonder doel en onderhoud', () => {
    expect(lineIn(at(PHASE_TAPER, 2), 2, 'GR5')).toBe('Week 2 naar de start, richting GR5');
    expect(lineIn(at(PHASE_GOLF, 6), 6)).toBe('Week 2 van de golf');
    expect(lineIn(at(PHASE_GOLF, 8), 8)).toBe('Rustweek van de golf');
    expect(lineIn(at(PHASE_ONDERHOUD, 5), 5)).toBe('Onderhoud');
    expect(lineIn(at('phase_eigen', 2), 2)).toBe('Week 2 van eigen fase');
  });

  it('geen regel bij een losse training of een dag buiten het programma', () => {
    expect(stravaText({ log: log('tpl_easy_run'), template: tpl('tpl_easy_run'), program, goalName: 'GR5' }).line).toBeUndefined();
    expect(lineIn(at(PHASE_BASIS, 1), 14, 'GR5')).toBeUndefined();
    expect(stravaText({ log: log('tpl_easy_run'), template: tpl('tpl_easy_run'), planned: planned('tpl_easy_run'), program: null }).line).toBeUndefined();
  });

  it('de regel is één regel van hoogstens 60 tekens bij een gewone doelnaam', () => {
    const line = lineIn(at(PHASE_BASIS, 3), 3, 'Marathon in de zomer')!;
    expect(line).not.toMatch(/\n|[–—]/);
    expect(line.length).toBeLessThanOrEqual(60);
  });
});

describe('stravaGoalName', () => {
  const goal = (over: Partial<TrainingGoal>) => ({ id: 'g1', name: 'GR5 / ALPENKLAAR', status: 'active', targetDate: '2027-06-01', ...over }) as TrainingGoal;
  const ladder = [{ goalId: 'g1' }] as GoalMilestone[];

  it('neemt het deel voor de schuine streep van je actieve hoofddoel', () => {
    expect(stravaGoalName([goal({})], ladder)).toBe('GR5');
    expect(stravaGoalName([goal({ name: 'Marathon in de zomer' })], ladder)).toBe('Marathon in de zomer');
  });

  it('geen naam zonder actief hoofddoel', () => {
    expect(stravaGoalName([], ladder)).toBeUndefined();
    expect(stravaGoalName([goal({ status: 'paused' })], ladder)).toBeUndefined();
    expect(stravaGoalName([goal({})], [])).toBeUndefined();
  });
});

describe('de instelling en wat er op het klembord komt', () => {
  const both = { title: 'Heuvelintervallen · 6 × 90 s', line: 'Week 3 van de basis, richting GR5' };

  it('standaard titel en regel; een onbekende waarde is de standaard', () => {
    expect(resolveStravaTextParts(undefined)).toBe('title-line');
    expect(resolveStravaTextParts('title')).toBe('title');
    expect(resolveStravaTextParts('alles')).toBe('title-line');
  });

  it('alleen de titel is precies de titel', () => {
    expect(stravaCopyText(both, 'title')).toBe('Heuvelintervallen · 6 × 90 s');
  });

  it('titel en regel eindigen op een lege regel voor je eigen tekst', () => {
    expect(stravaCopyText(both, 'title-line')).toBe('Heuvelintervallen · 6 × 90 s\nWeek 3 van de basis, richting GR5\n');
    expect(stravaCopyText({ title: 'Hardlopen' }, 'title-line')).toBe('Hardlopen\n');
  });
});
