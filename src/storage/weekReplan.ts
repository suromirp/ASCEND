// ASCEND: Week opnieuw plannen, de opslagkant (engine/replanWeek.ts, besluit
// docs/beslissingen/2026-11-02-week-opnieuw-plannen.md). `planWeekReplan` rekent het voorstel uit zonder
// iets te schrijven: het patroon van de week, dan dezelfde planningsronde als de sync
// (previewProgramHorizon), zodat wat het voorstel laat zien is wat je krijgt. `writeWeekReplan` schrijft
// na Akkoord alles in één transactie, of niets als de week intussen veranderde. `undoWeekReplan` zet de
// week precies terug, alleen als hij nog is wat het opnieuw plannen schreef.

import type { PlannedSession, SessionTemplate } from '../models/training';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import { makeId } from '../utils/id';
import { addDays, mondayOfWeek, todayISO } from '../utils/dates';
import { betterTestDay, illnessHeld, replanWeek, weekDiff, type WeekDiff } from '../engine/replanWeek';
import { idHasRole } from '../engine/templateRoles';
import { getDB } from './databaseSchema';
import { PlannedSessionsRepo, ProgramsRepo, SessionLogsRepo, SessionTemplatesRepo } from './databaseRepos';
import { SettingsRepo } from './databaseSettings';
import { patternContext, patternSessions, previewProgramHorizon } from './databaseHorizon';

export const REPLAN_STALE = 'Je week is intussen veranderd. Kijk wat er nu staat en probeer het zo nodig opnieuw.';
export const REPLAN_UNDO_STALE = 'Je week is na het opnieuw plannen nog veranderd. Ongedaan maken kan niet meer. Zet trainingen zelf terug als je wilt.';

export interface WeekReplanPlan {
  weekStart: string;
  // De rijen van de week en de week erna zoals ze stonden toen het voorstel werd uitgerekend: alles wat
  // geschreven kan worden staat hierin, zodat er nooit ongecontroleerd buiten geschreven wordt.
  expected: PlannedSession[];
  // Het voorstel zoals het na Akkoord in het wijzigingslog komt.
  proposal: PlanChangeProposal;
  // Ingehaalde trainingen die teruggaan naar het plan (hun namen).
  caughtUp: string[];
  // De planningsronde verandert ook iets in de week erna.
  nextWeek: boolean;
  diff: WeekDiff;
  // Het hele plan zoals het na Akkoord is (voor het blad "Zo ziet je week eruit").
  after: PlannedSession[];
  // De wijzigingen als items, voor het blad.
  items: PlanChangeItem[];
  // Er ging iets van jezelf terug naar het plan (verplaatst of vastgezet).
  hadYours: boolean;
  // Een test die naar een betere dag gaat: van en naar.
  testMove?: { name: string; from: string; to: string };
  // Wat blijft staan, in woorden.
  notes: string[];
}

const inWeek = (date: string, weekStart: string) => date >= weekStart && date <= addDays(weekStart, 6);
// De week zelf en de week erna: wat de planningsronde over de weekgrens heen doet (48 uur tussen zware
// dagen) hoort bij het voorstel, zodat de sync daarna niets meer hoeft te herstellen.
const SPAN_DAYS = 14;
const inSpan = (date: string, weekStart: string) => date >= weekStart && date <= addDays(weekStart, SPAN_DAYS - 1);

function itemsOf(diff: WeekDiff, stored: Map<string, PlannedSession>): PlanChangeItem[] {
  const by = ['engine/replanWeek.ts'];
  const items: PlanChangeItem[] = [];
  for (const s of diff.writes) {
    const was = stored.get(s.id);
    if (!was) items.push({ action: 'add', newSessionDraft: { templateId: s.templateId, scheduledDate: s.scheduledDate, weekStartDate: s.weekStartDate }, restore: true, generatedBy: by });
    else if (was.status === 'skipped' && s.status !== 'skipped') items.push({ plannedSessionId: s.id, action: 'add', toDate: s.scheduledDate, restore: true, generatedBy: by });
    else items.push({ plannedSessionId: s.id, action: 'move', fromDate: was.scheduledDate, toDate: s.scheduledDate, restore: true, ...(was.templateId !== s.templateId ? { templateId: s.templateId } : {}), generatedBy: by });
  }
  for (const id of diff.removedIds) items.push({ plannedSessionId: id, action: 'remove', discard: true, generatedBy: by });
  return items;
}

function notesOf(expected: PlannedSession[], logged: Set<string | undefined>, today: string, templates: SessionTemplate[]): string[] {
  const notes: string[] = [];
  if (expected.some((s) => s.scheduledDate < today || logged.has(s.id))) notes.push('Wat je deze week al deed of wat al voorbij is.');
  if (expected.some((s) => s.fixed && s.scheduledDate >= today)) notes.push('Je vaste afspraken van andere sporten.');
  if (expected.some((s) => idHasRole(s.templateId, 'race', templates) && s.scheduledDate >= today)) notes.push('Je wedstrijd.');
  if (expected.some((s) => s.leave && s.scheduledDate >= today)) notes.push('Wat je vakantie, vrije dagen of tocht in de week regelen.');
  if (expected.some((s) => s.status === 'skipped' && s.lock?.by === 'user' && s.scheduledDate >= today && !logged.has(s.id))) notes.push('Wat je zelf oversloeg.');
  return notes;
}

// Het voorstel voor de getoonde week, of null zonder programma of voor een week die al voorbij is.
export async function planWeekReplan(weekStartIn: string, opts: { keepIds?: ReadonlySet<string> } = {}): Promise<WeekReplanPlan | null> {
  const weekStart = mondayOfWeek(weekStartIn);
  const today = todayISO();
  if (addDays(weekStart, 6) < today) return null;
  const [programs, stored, logs, templates, settings] = await Promise.all([
    ProgramsRepo.getAll(), PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll(), SessionTemplatesRepo.getAll(), SettingsRepo.get(),
  ]);
  const program = programs[0];
  if (!program) return null;
  const ctx = await patternContext(templates, undefined, undefined, program);
  const end = addDays(weekStart, 7);
  const fresh = patternSessions(program, templates, ctx.pattern, ctx.swaps, {
    from: weekStart,
    until: ctx.anchor && ctx.anchor < end ? ctx.anchor : end,
    skipWeek: (w) => w !== weekStart,
  });
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const held = illnessHeld(settings.illnessEpisodes, today, templates);
  const laid = replanWeek({ sessions: stored, fresh, weekStart, today, logs, templates, held, keepIds: opts.keepIds });

  // Dezelfde planningsronde als de sync, zonder iets te schrijven.
  const settle = async (sessions: PlannedSession[]) => {
    const run = await previewProgramHorizon({ sessions, releaseAnchors: false });
    const problems = (run.remaining ?? []).filter((f) => inSpan(f.date, weekStart)).length;
    return { after: run.after, problems };
  };
  let plan = laid.sessions;
  let settled = await settle(plan);
  let testMove: WeekReplanPlan['testMove'];
  const byId = new Map(templates.map((t) => [t.id, t]));
  // Een test die nog moet blijft in de week, en gaat alleen naar een dag waar de week minder problemen heeft.
  for (const testId of laid.testIds) {
    const test = plan.find((s) => s.id === testId);
    if (!test || settled.problems === 0) continue;
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).filter((d) => d >= today && !held(d, test.templateId) && (!ctx.anchor || d < ctx.anchor));
    const scores = new Map<string, { after: PlannedSession[]; problems: number; plan: PlannedSession[] }>();
    scores.set(test.scheduledDate, { ...settled, plan });
    for (const d of days) {
      if (d === test.scheduledDate) continue;
      const moved = plan.map((s) => (s.id === testId ? { ...s, scheduledDate: d } : s));
      scores.set(d, { ...(await settle(moved)), plan: moved });
    }
    const best = betterTestDay(test.scheduledDate, days, (d) => scores.get(d)?.problems ?? Number.POSITIVE_INFINITY);
    if (best !== test.scheduledDate) {
      testMove = { name: byId.get(test.templateId)?.name ?? 'Testloop', from: test.scheduledDate, to: best };
      const chosen = scores.get(best)!;
      plan = chosen.plan;
      settled = { after: chosen.after, problems: chosen.problems };
    }
  }

  const diff = weekDiff(stored, settled.after, weekStart, SPAN_DAYS);
  const storedById = new Map(stored.map((s) => [s.id, s]));
  const expected = stored.filter((s) => inSpan(s.scheduledDate, weekStart));
  // Alleen deze week en de week erna veranderen: de andere weken blijven zoals ze staan.
  const written = new Map(diff.writes.map((s) => [s.id, s]));
  const removed = new Set(diff.removedIds);
  const after = [...stored.filter((s) => !removed.has(s.id)).map((s) => written.get(s.id) ?? s), ...diff.writes.filter((s) => !storedById.has(s.id))];
  const hadYours = diff.before.some((s) => !!s.lock || s.status === 'moved');
  const nextStart = addDays(weekStart, 7);
  const nextWeek = [...diff.before, ...diff.writes].some((s) => s.scheduledDate >= nextStart);
  const caughtUp = diff.before.filter((s) => s.catchUp).map((s) => byId.get(s.templateId)?.name ?? 'Training');
  const items = itemsOf(diff, storedById);
  const now = new Date().toISOString();
  const proposal: PlanChangeProposal = {
    id: makeId('replan'), trigger: 'session_moved', issue: 'Week opnieuw gepland', changes: items, alternatives: [],
    consequences: '', explanation: 'Op jouw verzoek gaat de rest van de week terug naar hoe het plan hem maakt.', createdAt: now,
  };
  return { weekStart, expected, proposal, caughtUp, nextWeek, diff, after, items, hadYours, testMove, notes: notesOf(expected.filter((s) => inWeek(s.scheduledDate, weekStart)), logged, today, templates) };
}

// Gaat er halverwege iets mis, dan wordt de hele transactie afgebroken: er blijft niets half staan.
async function allOrNothing(tx: { abort: () => void; done: Promise<void> }, work: () => Promise<void>): Promise<void> {
  try {
    await work();
    await tx.done;
  } catch (err) {
    try { tx.abort(); } catch { /* al afgebroken */ }
    await tx.done.catch(() => undefined);
    throw err;
  }
}

const same = (a: PlannedSession | undefined, b: PlannedSession) => !!a && JSON.stringify(a) === JSON.stringify(b);

// Na Akkoord: alles of niets, in één transactie. Staat de week niet meer zoals toen het voorstel werd
// uitgerekend (een rij anders, weg of erbij, of intussen gelogd), dan schrijft hij niets.
export async function writeWeekReplan(plan: WeekReplanPlan): Promise<{ before: PlannedSession[]; written: PlannedSession[]; addedIds: string[]; removedIds: string[] }> {
  const db = await getDB();
  const tx = db.transaction(['plannedSessions', 'sessionLogs', 'planChangeProposals'], 'readwrite');
  const store = tx.objectStore('plannedSessions');
  const [all, logs] = await Promise.all([store.getAll(), tx.objectStore('sessionLogs').getAll()]);
  const logged = new Set(logs.map((l) => l.plannedSessionId));
  const nowWeek = all.filter((s) => inSpan(s.scheduledDate, plan.weekStart));
  const expectedById = new Map(plan.expected.map((s) => [s.id, s]));
  const touched = [...plan.diff.writes.map((s) => s.id), ...plan.diff.removedIds];
  // Alles wat geschreven of weggehaald wordt, stond bij het uitrekenen in de gecontroleerde dagen, of is nieuw.
  const outside = touched.filter((id) => !expectedById.has(id) && !plan.diff.addedIds.includes(id));
  const stale = outside.length > 0
    || nowWeek.length !== plan.expected.length
    || nowWeek.some((s) => !same(expectedById.get(s.id), s))
    || touched.some((id) => logged.has(id));
  if (stale) {
    tx.abort();
    await tx.done.catch(() => undefined);
    throw new Error(REPLAN_STALE);
  }
  await allOrNothing(tx, async () => {
    for (const s of plan.diff.writes) await store.put(s);
    for (const id of plan.diff.removedIds) await store.delete(id);
    // Het Akkoord in het wijzigingslog, in dezelfde transactie.
    const at = new Date().toISOString();
    await tx.objectStore('planChangeProposals').put({ ...plan.proposal, resolution: 'accepted', resolvedAt: at });
  });
  return { before: plan.diff.before, written: plan.diff.writes, addedIds: plan.diff.addedIds, removedIds: plan.diff.removedIds };
}

// Ongedaan maken: alleen als elke rij nog precies is wat het opnieuw plannen schreef, wat eraf ging nog
// weg is en niets ervan intussen gelogd werd. Dan alles terug in één transactie; anders niets.
export async function undoWeekReplan(change: { before: PlannedSession[]; written: PlannedSession[]; addedIds: string[]; removedIds: string[] }): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['plannedSessions', 'sessionLogs'], 'readwrite');
  const store = tx.objectStore('plannedSessions');
  const [rows, gone, logs] = await Promise.all([
    Promise.all(change.written.map((s) => store.get(s.id))),
    Promise.all(change.removedIds.map((id) => store.get(id))),
    tx.objectStore('sessionLogs').getAll(),
  ]);
  const logged = new Set(logs.map((l) => l.plannedSessionId));
  const stale = change.written.some((s, i) => !same(rows[i], s) || logged.has(s.id)) || gone.some((g) => !!g);
  if (stale) {
    tx.abort();
    await tx.done.catch(() => undefined);
    throw new Error(REPLAN_UNDO_STALE);
  }
  await allOrNothing(tx, async () => {
    for (const s of change.before) await store.put(s);
    for (const id of change.addedIds) await store.delete(id);
  });
}
