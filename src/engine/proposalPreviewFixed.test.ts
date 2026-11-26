// I-156: in een voorstel (Intervallen rustiger) stonden vaste afspraken voorbij het venster van het voorbeeld
// doorgestreept als "vervalt", terwijl ze na Akkoord bleven staan. Het voorbeeld rekent de ronde met `until` (de
// weken dichtbij, state/bodyAndLeave.ts#planPreviewPass); de opening rekent zonder. De vaste rijen en Hoeveel per soort
// volgen nu in beide de doeldag of hun eigen weken vooruit, zodat het voorstel alleen echte wijzigingen toont.
import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { addDays } from '../utils/dates';
import { planPass, type PlanPassContext } from './planPass';
import { previewProposal } from './proposalPreview';
import { withCountingSports } from './sportTemplate';
import type { SportHandlingMap } from './sportRole';

const { templates: base } = buildDefaultProgramData();
const TODAY = '2026-11-02';
const football: SportHandlingMap = { football: { role: 'fixed', fixed: [{ day: 2, minutes: 60, intensity: 'moderate' }] } };
const templates = withCountingSports(base, { sportHandling: football });
const DAYS: [number, string][] = [[3, 'tpl_upper_a'], [4, 'tpl_easy_run'], [5, 'tpl_hill_intervals'], [7, 'tpl_long_run']];
const week = (monday: string): PlannedSession[] => DAYS.map(([d, templateId], i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, d - 1), weekStartDate: monday, status: 'planned', order: i }));
const plan = Array.from({ length: 8 }, (_, i) => week(addDays(TODAY, 7 * i))).flat();

let n = 0;
const ctx = (over: Partial<PlanPassContext> = {}): PlanPassContext => ({ today: TODAY, logs: [], templates, program: null, blocks: [], restDay: 1, newId: () => `new${++n}`, fixedSports: football, ...over });

describe('voorbeeld van een voorstel met vaste afspraken voorbij het venster (I-156)', () => {
  // Zoals de opening het plan wegschrijft: zonder `until`, de vaste rijen acht weken vooruit.
  const stored = planPass(plan, ctx()).sessions;
  const fixedRows = stored.filter((s) => s.fixed);

  it('de opening zet de vaste rijen verder dan het venster van het voorbeeld', () => {
    expect(fixedRows.some((s) => s.scheduledDate > addDays(TODAY, 28))).toBe(true);
  });

  it('een voorstel dat een training korter maakt, toont alleen die training', () => {
    const target = stored.find((s) => s.templateId === 'tpl_hill_intervals' && s.scheduledDate >= TODAY)!;
    const items = [{ plannedSessionId: target.id, action: 'move' as const, fromDate: target.scheduledDate, toDate: target.scheduledDate, plannedMinutes: 30 }];
    // Zoals het blad het voorbeeld rekent: de weken dichtbij (planPreviewPass, vandaag plus 28 dagen).
    const pass = (sessions: PlannedSession[]) => planPass(sessions, ctx({ until: addDays(TODAY, 28) })).sessions;
    const data = previewProposal(items, stored, templates, pass);
    expect(data.moves.filter((m) => m.action === 'remove')).toEqual([]);
    expect(data.moves.map((m) => m.sessionId)).toEqual([target.id]);
    // En na Akkoord blijft dat zo: de ronde van de opening haalt geen vaste rij weg.
    const afterAccept = planPass(stored.map((s) => (s.id === target.id ? { ...s, plannedMinutes: 30 } : s)), ctx()).sessions;
    expect(afterAccept.filter((s) => s.fixed).map((s) => s.id).sort()).toEqual(fixedRows.map((s) => s.id).sort());
  });
});
