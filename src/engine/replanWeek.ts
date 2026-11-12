// ASCEND: Week opnieuw plannen (docs/beslissingen/2026-11-02-week-opnieuw-plannen.md).
//
// De rest van een week, vandaag en later, gaat terug naar hoe de planner hem uit het programma maakt
// voor iemand die niets verschoof: het weekpatroon van die week (`fresh`, dezelfde rijen als
// storage/databaseHorizon.ts#patternSessions) op zijn eigen dagen. Daarna draait de gewone
// planningsronde (engine/planPass.ts) erover, met de regels die al gelden: 48 uur, de rustdag, vaste
// sporten, vakanties, tochten, het raceblok. Dit bestand doet alleen de eerste stap en is puur.
//
// Wat blijft zoals het is: alles wat gelogd of voorbij is (historie nooit), een vaste afspraak van een
// sport, een race, wat een vakantie of tocht plaatste, verschoof of liet gaan, wat je zelf oversloeg, en
// alles op een dag waarop je ziek bent of nog opbouwt. Een test die nog moet blijft in de week; of hij
// naar een betere dag gaat beslist de aanroeper (`testIds`). Wat je zelf verplaatste (lockLevel 1) gaat
// hier wel terug naar het plan, omdat je er zelf om vraagt. Een training die een voorstel liet gaan
// (overgeslagen, niet door jou) komt terug als hij in het plan van die week hoort.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { IllnessEpisode } from '../models/illness';
import { addDays, daysBetween, mondayOfWeek } from '../utils/dates';
import { idHasRole } from './templateRoles';
import { activeIllness, isHeavySession, recoveryRamp } from './illness';
import { MOVE_ORDER, previewBetween, type PreviewMove, type ProposalPreviewData } from './proposalPreview';

export interface ReplanWeekInput {
  // Het hele opgeslagen plan.
  sessions: PlannedSession[];
  // Het weekpatroon van deze week zoals de planner het maakt, alle zeven dagen.
  fresh: PlannedSession[];
  weekStart: string;
  today: string;
  logs: SessionLog[];
  templates: SessionTemplate[];
  // Een dag die blijft zoals hij is voor deze training (ziek, opbouwen na ziekte).
  held?: (date: string, templateId: string) => boolean;
  // Rijen die blijven zoals ze zijn, zoals een training die nu open staat in Forge.
  keepIds?: ReadonlySet<string>;
}

export interface ReplanWeekResult {
  // Het hele plan met deze week opnieuw uitgelegd, vóór de planningsronde.
  sessions: PlannedSession[];
  // Tests die nog moeten en in de week blijven: de aanroeper zoekt er zo nodig een betere dag voor.
  testIds: string[];
}

const inWeek = (date: string, weekStart: string) => date >= weekStart && date <= addDays(weekStart, 6);

// Een rij terug naar het plan: de dag van het patroon, zonder slot, zonder vaste lengte en zonder de
// merktekens van eerdere voorstellen. Of je met stokken loopt en de volgorde op de dag blijven.
function backToPlan(row: PlannedSession, slot: Pick<PlannedSession, 'templateId' | 'scheduledDate' | 'weekStartDate'>): PlannedSession {
  const { lock: _l, movedFromDate: _m, plannedMinutes: _p, catchUp: _c, amount: _a, afterGoal: _g, raceBlock: _r, blockQuiet: _q, ...rest } = row;
  void _l; void _m; void _p; void _c; void _a; void _g; void _r; void _q;
  return { ...rest, templateId: slot.templateId, scheduledDate: slot.scheduledDate, weekStartDate: slot.weekStartDate, status: 'planned' };
}

// Ziek en opbouwen na ziekte blijven gelden: zolang je ziek bent vandaag en morgen (boven de nek alleen
// wat zwaar is), tijdens het opbouwen alles wat zwaar is tot de dag dat zwaar weer mag.
export function illnessHeld(episodes: IllnessEpisode[] | undefined, today: string, templates: SessionTemplate[]): (date: string, templateId: string) => boolean {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const heavy = (id: string) => { const t = byId.get(id); return !!t && isHeavySession(t); };
  const ill = activeIllness(episodes);
  const ramp = recoveryRamp(episodes, today);
  return (date, templateId) => {
    if (ill && date >= ill.startDate && date <= addDays(today, 1)) return ill.kind === 'above_neck' ? heavy(templateId) : true;
    if (ramp && date >= today && date < ramp.heavyFrom) return heavy(templateId);
    return false;
  };
}

export function replanWeek(input: ReplanWeekInput): ReplanWeekResult {
  const { weekStart, today, templates } = input;
  const held = input.held ?? (() => false);
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const weekRows = input.sessions.filter((s) => inWeek(s.scheduledDate, weekStart));
  const isTest = (id: string) => idHasRole(id, 'test', templates);
  const isRace = (id: string) => idHasRole(id, 'race', templates);

  // Wat blijft zoals het is.
  const stays = (s: PlannedSession) =>
    logged.has(s.id) || s.scheduledDate < today || !!s.fixed || !!s.leave || isRace(s.templateId) || isTest(s.templateId)
    || held(s.scheduledDate, s.templateId) || !!input.keepIds?.has(s.id)
    || (s.status === 'skipped' && s.lock?.by === 'user');
  const kept = weekRows.filter(stays);
  const free = weekRows.filter((s) => !stays(s));
  const testIds = kept.filter((s) => isTest(s.templateId) && s.status !== 'skipped' && !logged.has(s.id) && s.scheduledDate >= today).map((s) => s.id);

  // Wat blijft neemt zijn plek in het patroon in: dezelfde training, eerst op dezelfde dag, dan de
  // dichtstbijzijnde. Een test neemt, als het patroon geen test heeft, de plek van een harde loop in.
  const slots = [...input.fresh].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.order - b.order);
  const taken = new Set<PlannedSession>();
  const nearest = (date: string, match: (slot: PlannedSession) => boolean) => slots
    .filter((slot) => !taken.has(slot) && match(slot))
    .sort((a, b) => Math.abs(daysBetween(date, a.scheduledDate)) - Math.abs(daysBetween(date, b.scheduledDate)) || a.scheduledDate.localeCompare(b.scheduledDate))[0];
  const keptOrdered = [...kept].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id));
  for (const row of keptOrdered) {
    const slot = nearest(row.scheduledDate, (x) => x.templateId === row.templateId)
      ?? (isTest(row.templateId) ? nearest(row.scheduledDate, (x) => idHasRole(x.templateId, 'hard_run', templates)) : undefined);
    if (slot) taken.add(slot);
  }

  // De open plekken, vandaag en later: een vrije rij van dezelfde training schuift erheen (eerst een die
  // op de planning staat, dan een die een voorstel liet gaan), anders komt er een nieuwe rij.
  const used = new Set<string>();
  const out: PlannedSession[] = [];
  const pick = (slot: PlannedSession) => free
    .filter((r) => !used.has(r.id) && r.templateId === slot.templateId)
    .sort((a, b) => Number(a.status === 'skipped') - Number(b.status === 'skipped')
      || Math.abs(daysBetween(slot.scheduledDate, a.scheduledDate)) - Math.abs(daysBetween(slot.scheduledDate, b.scheduledDate))
      || a.id.localeCompare(b.id))[0];
  const missedTemplates = new Set<string>();
  for (const slot of slots) {
    if (taken.has(slot)) continue;
    if (slot.scheduledDate < today) { missedTemplates.add(slot.templateId); continue; }
    if (held(slot.scheduledDate, slot.templateId)) continue;
    const row = pick(slot);
    if (row) used.add(row.id);
    out.push(row ? backToPlan(row, slot) : { ...slot });
  }

  // Wat overblijft. Een training waarvan de dag in het plan al voorbij is en die je naar later verschoof,
  // kan niet terug in de tijd: hij blijft op zijn dag, maar weer van het plan, zodat de weekcontrole hem
  // mag verplaatsen. Wat een voorstel liet gaan en niet in het plan hoort, blijft overgeslagen. De rest
  // hoort niet in het plan van deze week en gaat eraf.
  for (const row of free) {
    if (used.has(row.id)) continue;
    if (row.status === 'skipped') { out.push(row); continue; }
    if (missedTemplates.has(row.templateId)) {
      missedTemplates.delete(row.templateId);
      out.push(backToPlan(row, row));
    }
  }

  const weekIds = new Set(weekRows.map((s) => s.id));
  return {
    sessions: [...input.sessions.filter((s) => !weekIds.has(s.id)), ...kept, ...out],
    testIds,
  };
}

export interface WeekDiff {
  // Rijen die er nu staan en anders worden of weggaan, precies zoals ze nu zijn.
  before: PlannedSession[];
  // Rijen zoals ze worden: bestaande met een wijziging en nieuwe.
  writes: PlannedSession[];
  // Ids van rijen die eraf gaan.
  removedIds: string[];
  // Ids van rijen die nieuw zijn.
  addedIds: string[];
}

// Het verschil tussen de week zoals hij staat en zoals hij wordt, over `days` dagen vanaf maandag (de week
// zelf, of ook de week erna als de planningsronde daar iets aan deed). Een rij die de ronde van binnen naar
// buiten trok telt mee (hij stond erin); een rij die buiten bleef niet. Een nieuwe rij van dezelfde training
// als een rij die weggaat krijgt het id van die rij: dat is een verschuiving, geen nieuw plus weg.
export function weekDiff(stored: PlannedSession[], after: PlannedSession[], weekStart: string, days = 7): WeekDiff {
  const inside = (date: string) => date >= weekStart && date <= addDays(weekStart, days - 1);
  const storedWeek = stored.filter((s) => inside(s.scheduledDate));
  const storedById = new Map(stored.map((s) => [s.id, s]));
  const afterWeek = after.filter((s) => (storedById.has(s.id) ? inside(storedById.get(s.id)!.scheduledDate) : inside(s.scheduledDate)));
  const afterIds = new Set(after.map((s) => s.id));
  const gone = storedWeek.filter((s) => !afterIds.has(s.id));
  const goneTaken = new Set<string>();
  const rows = afterWeek.map((s) => {
    if (storedById.has(s.id)) return s;
    const same = gone
      .filter((g) => !goneTaken.has(g.id) && g.templateId === s.templateId)
      .sort((a, b) => Math.abs(daysBetween(s.scheduledDate, a.scheduledDate)) - Math.abs(daysBetween(s.scheduledDate, b.scheduledDate)))[0];
    if (!same) return s;
    goneTaken.add(same.id);
    return { ...s, id: same.id };
  });
  const changed = rows.filter((s) => { const was = storedById.get(s.id); return !was || JSON.stringify(was) !== JSON.stringify(s); });
  const removed = gone.filter((g) => !goneTaken.has(g.id));
  return {
    before: [...changed.map((s) => storedById.get(s.id)).filter((s): s is PlannedSession => !!s), ...removed],
    writes: changed,
    removedIds: removed.map((s) => s.id),
    addedIds: changed.filter((s) => !storedById.has(s.id)).map((s) => s.id),
  };
}

// De ene betere dag voor een test: alleen een dag met minder problemen in de week dan waar hij nu staat.
// `score` telt de problemen in de week met de test op die dag (na de planningsronde).
export function betterTestDay(current: string, candidates: string[], score: (date: string) => number): string {
  let best = current;
  let bestScore = score(current);
  for (const date of candidates) {
    if (date === current || bestScore === 0) continue;
    const s = score(date);
    if (s < bestScore) { best = date; bestScore = s; }
  }
  return best;
}

// De woorden van het voorstel (components/WeekReplanRow.tsx).
export const REPLAN_TITLE = 'Week opnieuw plannen';
export const REPLAN_NO_CHANGE = 'Je week staat al zoals het plan hem maakt.';
const REPLAN_YOURS = 'Ook wat je zelf verplaatste gaat terug naar het plan.';

export function replanSummary(opts: { changes: number; testMove?: { name: string; toLabel: string }; caughtUp?: string[]; nextWeek?: boolean }): string | undefined {
  if (opts.changes === 0) return undefined;
  const parts = [`De rest van deze week gaat terug naar hoe het plan hem maakt, vanaf vandaag. ${REPLAN_YOURS}`];
  const caught = opts.caughtUp ?? [];
  if (caught.length > 0) parts.push(`Dat geldt ook voor wat je inhaalde: ${caught.length === 1 ? caught[0] : `${caught.slice(0, -1).join(', ')} en ${caught.at(-1)}`}.`);
  if (opts.testMove) parts.push(`${opts.testMove.name} blijft in de week en gaat naar ${opts.testMove.toLabel}: daar past hij beter.`);
  if (opts.nextWeek) parts.push('Zodat de week erna er goed op aansluit, verandert daar ook iets; dat staat hieronder.');
  return parts.join(' ');
}

// "Zo ziet je week eruit" voor Week opnieuw plannen, uit dezelfde bron als de wijzigingen zelf (`diff`): elke
// rij die geschreven of weggehaald wordt is precies één regel, ook een die alleen weer van het plan wordt
// (zelfde dag, zonder slot of vaste lengte). De dagen eronder komen uit het plan nu en zoals het wordt.
export function replanPreview(stored: PlannedSession[], after: PlannedSession[], diff: WeekDiff, templates: SessionTemplate[]): ProposalPreviewData {
  const name = (id: string) => templates.find((t) => t.id === id)?.name ?? 'Training';
  const was = new Map(diff.before.map((s) => [s.id, s]));
  const moves: PreviewMove[] = [];
  for (const s of diff.writes) {
    const old = was.get(s.id);
    if (!old || (old.status === 'skipped' && s.status !== 'skipped')) moves.push({ name: name(s.templateId), action: 'add', to: s.scheduledDate, sessionId: s.id, ...(old ? {} : { isNew: true as const }) });
    else if (old.status !== 'skipped' && s.status === 'skipped') moves.push({ name: name(old.templateId), action: 'remove', from: old.scheduledDate, sessionId: s.id });
    else if (old.scheduledDate !== s.scheduledDate) moves.push({ name: name(s.templateId), action: 'move', from: old.scheduledDate, to: s.scheduledDate, sessionId: s.id });
    else if (old.templateId !== s.templateId) moves.push({ name: name(old.templateId), action: 'change', to: s.scheduledDate, newName: name(s.templateId), sessionId: s.id });
    else moves.push({ name: name(s.templateId), action: 'reset', to: s.scheduledDate, sessionId: s.id });
  }
  for (const id of diff.removedIds) {
    const old = was.get(id);
    if (old) moves.push({ name: name(old.templateId), action: 'remove', from: old.scheduledDate, sessionId: id });
  }
  moves.sort((a, b) => MOVE_ORDER[a.action] - MOVE_ORDER[b.action] || (a.from ?? a.to ?? '').localeCompare(b.from ?? b.to ?? ''));
  const weeks = [...diff.before, ...diff.writes].map((s) => mondayOfWeek(s.scheduledDate));
  // Elke rij van de diff heeft een regel: dat is de lijst die sheetAnswer controleert.
  const changedIds = [...diff.writes.map((s) => s.id), ...diff.removedIds];
  return { moves, changedIds, weeks: previewBetween(stored, after, templates, undefined, weeks).weeks };
}
