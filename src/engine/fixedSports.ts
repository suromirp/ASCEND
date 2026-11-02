// ASCEND: een vaste afspraak voor een sport die ASCEND niet plant (docs/visie/Sporten die meetellen.md, 2.3,
// 3.4 en 3.5): voetbal op dinsdag en zaterdag wordt een vaste rij in je week, waar de rest omheen wordt
// gepland. De rijen zijn van jou (een slot, lockLevel 1): de automatische planning verplaatst ze nooit. Deze
// stap staat vooraan in de planningsronde (engine/planPass.ts), zodat het raceblok, de vrije dagen en de
// weekcheck eromheen werken. Een rij die voorbij is of gelogd blijft altijd staan. Puur: geen React, geen IndexedDB.

import { COUNTED_SPORTS, anySportDefinition, type CountedSportId } from '../data/sports';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays, mondayOfWeek } from '../utils/dates';
import { parseSportHandling, type FixedSlot, type SportHandlingMap } from './sportRole';
import { sportTemplateId } from './sportTemplate';

// Hoe ver vooruit de vaste rijen staan; de dagelijkse ronde vult de volgende weken aan.
export const FIXED_WEEKS_AHEAD = 8;

export interface FixedRow {
  sport: CountedSportId;
  date: string;
  slot: FixedSlot;
}

// Een dag van een vakantie zonder training of van een tocht: daar vervalt een vaste afspraak (het advies).
export function leaveBlocks(date: string, leave: readonly LeavePeriod[] | undefined): LeavePeriod | undefined {
  return (leave ?? []).find((p) => (p.kind === 'no_training' || p.kind === 'trek') && date >= p.startDate && date <= p.endDate);
}

// De vaste rijen van één week: per sport met de rol Vaste dag, per gekozen dag.
export function fixedSessionsForWeek(weekStart: string, handling: SportHandlingMap | undefined, leave?: readonly LeavePeriod[]): FixedRow[] {
  const monday = mondayOfWeek(weekStart);
  const rows: FixedRow[] = [];
  const read = parseSportHandling(handling).value ?? {};
  for (const s of COUNTED_SPORTS) {
    const h = read[s.id];
    if (h?.role !== 'fixed') continue;
    for (const slot of h.fixed ?? []) {
      const date = addDays(monday, slot.day - 1);
      if (leaveBlocks(date, leave)) continue;
      rows.push({ sport: s.id, date, slot });
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

// De vaste afspraken die in een vrije periode of tocht vallen en dus vervallen, voor een noot in het voorstel.
export function fixedInLeave(from: string, until: string, handling: SportHandlingMap | undefined, leave: readonly LeavePeriod[] | undefined): { sport: CountedSportId; date: string; period: LeavePeriod }[] {
  const out: { sport: CountedSportId; date: string; period: LeavePeriod }[] = [];
  const read = parseSportHandling(handling).value ?? {};
  for (let w = mondayOfWeek(from); w <= until; w = addDays(w, 7)) {
    for (const s of COUNTED_SPORTS) {
      const h = read[s.id];
      if (h?.role !== 'fixed') continue;
      for (const slot of h.fixed ?? []) {
        const date = addDays(w, slot.day - 1);
        const period = date >= from && date <= until ? leaveBlocks(date, leave) : undefined;
        if (period) out.push({ sport: s.id, date, period });
      }
    }
  }
  return out;
}

export interface FixedReconcile {
  sessions: PlannedSession[];
  added: string[];
  removed: string[];
  changed: string[];
}

// De week waarvoor een vaste rij werd gezet. Een rij van voor dit veld leest zijn eigen week.
export function fixedWeekOf(s: PlannedSession): string {
  return s.fixed?.week ?? s.weekStartDate;
}

// Staat de rij nog zoals ASCEND hem zette: gepland, op zijn eigen dag van zijn eigen week. Alleen zo'n rij
// mag deze stap weghalen of aanpassen; wat je verplaatste, oversloeg of inhaalde blijft van jou.
export function isUntouchedFixed(s: PlannedSession): boolean {
  return !!s.fixed && s.status === 'planned' && s.scheduledDate === addDays(fixedWeekOf(s), s.fixed.day - 1);
}

// Zet de vaste rijen in de planning zoals je ze koos: wat erbij komt, wat er niet meer hoort en wat een
// andere lengte of zwaarte kreeg. Alleen open rijen (vanaf vandaag, niet gelogd) die nog op hun eigen dag
// staan veranderen. Een rij die je zelf verplaatste of oversloeg blijft onaangeroerd en telt als die van
// zijn week, zodat er geen tweede bij komt.
export function reconcileFixedSessions(
  all: readonly PlannedSession[],
  handling: SportHandlingMap | undefined,
  ctx: { today: string; until?: string; leave?: readonly LeavePeriod[]; logs: readonly SessionLog[]; newId: () => string; now?: string },
): FixedReconcile {
  const logged = new Set(ctx.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const open = (s: PlannedSession) => s.scheduledDate >= ctx.today && !logged.has(s.id);
  const last = [addDays(mondayOfWeek(ctx.today), 7 * FIXED_WEEKS_AHEAD - 1), ctx.until].filter((d): d is string => !!d).sort()[0];
  const wanted = new Map<string, FixedRow>();
  for (let w = mondayOfWeek(ctx.today); w <= last; w = addDays(w, 7)) {
    for (const row of fixedSessionsForWeek(w, handling, ctx.leave)) {
      if (row.date < ctx.today || row.date > last) continue;
      wanted.set(`${row.sport}|${mondayOfWeek(row.date)}|${row.slot.day}`, row);
    }
  }
  const keyOf = (s: PlannedSession) => (s.fixed ? `${s.fixed.sport}|${fixedWeekOf(s)}|${s.fixed.day}` : '');
  const seen = new Set<string>();
  const out: PlannedSession[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  for (const s of all) {
    if (!s.fixed) { out.push(s); continue; }
    const key = keyOf(s);
    const row = wanted.get(key);
    if (!open(s) || !isUntouchedFixed(s)) { out.push(s); seen.add(key); continue; }
    if (!row || seen.has(key)) { removed.push(s.id); continue; }
    seen.add(key);
    // Een andere lengte of zwaarte volgt je keuze.
    if (s.plannedMinutes !== row.slot.minutes || s.fixed.intensity !== row.slot.intensity) {
      out.push({ ...s, plannedMinutes: row.slot.minutes, fixed: { ...s.fixed, intensity: row.slot.intensity } });
      changed.push(s.id);
    } else out.push(s);
  }
  for (const [key, row] of wanted) {
    if (seen.has(key)) continue;
    const id = ctx.newId();
    out.push({
      id,
      templateId: sportTemplateId(row.sport),
      scheduledDate: row.date,
      weekStartDate: mondayOfWeek(row.date),
      status: 'planned',
      order: 0,
      plannedMinutes: row.slot.minutes,
      lock: { by: 'user', at: ctx.now ?? `${ctx.today}T00:00:00.000Z` },
      fixed: { sport: row.sport, day: row.slot.day, intensity: row.slot.intensity, week: mondayOfWeek(row.date) },
    });
    added.push(id);
  }
  return { sessions: out, added, removed, changed };
}

// "Voetbal op dinsdag valt in je vrije dagen en vervalt."
export function fixedLeaveNote(item: { sport: CountedSportId; date: string; period: LeavePeriod }): string {
  const day = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'][(new Date(`${item.date}T00:00:00Z`).getUTCDay() + 6) % 7];
  const where = item.period.kind === 'trek' ? 'op je tocht' : 'in je vakantie';
  return `${anySportDefinition(item.sport).label} op ${day} ${Number(item.date.slice(8, 10))} ${MONTHS[Number(item.date.slice(5, 7)) - 1]} valt ${where} en vervalt.`;
}

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
