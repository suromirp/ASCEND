// I-163: de rustdagrij zegt niet "bewust herstel" naast een open training, en telt een losse training mee.
import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import { weekPlan } from './dayPlan';
import { restRowText } from './restRow';

const { templates } = buildDefaultProgramData();
const templateById = new Map(templates.map((t) => [t.id, t]));
const MONDAY = '2026-11-16';
const TUE = '2026-11-17';
const row = (id: string, templateId: string, scheduledDate: string, over: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate: MONDAY, status: 'planned', order: 0, ...over });
const logFor = (s: PlannedSession, completedDate: string): SessionLog => ({
  id: `log-${s.id}`, plannedSessionId: s.id, templateId: s.templateId, type: templateById.get(s.templateId)!.type, completedDate, completedAt: `${completedDate}T07:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual',
} as SessionLog);
const loose = (templateId: string, completedDate: string): SessionLog => ({ ...logFor(row('x', templateId, completedDate), completedDate), id: 'los', plannedSessionId: undefined } as SessionLog);
const dayOf = (sessions: PlannedSession[], logs: SessionLog[]) => weekPlan({ weekStart: MONDAY, sessions, logs, templateById, today: TUE }).day(TUE);

describe('restRowText', () => {
  const rest = row('rest', 'tpl_herstel', TUE);
  const easy = row('easy', 'tpl_easy_run', TUE, { order: 1 });
  const upper = row('upper', 'tpl_upper_a', TUE, { order: 2 });

  it('zonder training: bewust herstel', () => {
    expect(restRowText(dayOf([rest], []), [], templateById)).toBe('bewust herstel');
  });

  it('een open training naast de rustdag: niet bewust herstel', () => {
    expect(restRowText(dayOf([rest, easy], []), [], templateById)).toBe('Rustige duurloop staat nog open');
    expect(restRowText(dayOf([rest, easy, upper], []), [], templateById)).toBe('2 trainingen staan nog open');
  });

  it('gedaan en open samen', () => {
    const day = dayOf([rest, easy, upper], [logFor(easy, TUE)]);
    expect(restRowText(day, [], templateById)).toBe('Rustige duurloop gedaan, 1 nog open');
  });

  it('gedaan: een training op de rustdag zelf, en twee trainingen', () => {
    expect(restRowText(dayOf([rest, easy], [logFor(easy, TUE)]), [], templateById)).toBe('Rustige duurloop gedaan');
    const upperFri = row('upper', 'tpl_upper_a', '2026-11-20');
    expect(restRowText(dayOf([rest, easy, upperFri], [logFor(easy, TUE), logFor(upperFri, TUE)]), [], templateById)).toBe('2 trainingen gedaan');
  });

  it('een training van een andere dag die je op de rustdag deed: die noemt hij, en hij blijft op zijn geplande dag (I-150)', () => {
    const tempo = row('tempo', 'tpl_tempo_run', '2026-11-19');
    const plan = weekPlan({ weekStart: MONDAY, sessions: [rest, tempo], logs: [logFor(tempo, TUE)], templateById, today: TUE });
    expect(restRowText(plan.day(TUE), [], templateById)).toBe('Tempoloop gedaan');
    expect(plan.day('2026-11-19').sessions.map((s) => s.id)).toEqual(['tempo']);
  });

  it('een losse training die dag telt mee, een van een andere dag niet', () => {
    const day = dayOf([rest], []);
    const logs = [loose('tpl_easy_run', TUE)];
    expect(restRowText(day, logs, templateById)).toBe('Rustige duurloop gedaan');
    expect(restRowText(day, [loose('tpl_easy_run', '2026-11-18')], templateById)).toBe('bewust herstel');
    expect(restRowText(dayOf([rest, easy], [logFor(easy, TUE)]), logs, templateById)).toBe('2 trainingen gedaan');
  });
});
