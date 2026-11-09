// ASCEND: the best arrangement around a holiday (docs/beslissingen/2026-11-09-planner-rond-vakantie.md).
//
// The week check (engine/weekValidator.ts#repairWeeks) moves a training that stands on a holiday
// day to the nearest day of its own week, or lets it go. That is greedy: two holidays in two
// weeks, or a holiday at the end of a week, give double days while other days are empty, two heavy
// leg days next to each other, and trainings that vanish without a word. Here the planner looks at
// the whole stretch at once: all the weeks that hold a holiday (and the empty days of the week on
// each side), all the trainings that are the system's own, and every workable day. It keeps the
// arrangement with the fewest findings of the week check, then the fewest dropped trainings, then
// the fewest double days, then the least shifting.
//
// Fixed rules, hard in the score: 48 hours between heavy leg days (the long run counts, also after
// one you logged, and also the weekend pairing of hills and long run inside this stretch), fresh legs
// for hard runs and hills, the rest day you set yourself, your own locks. A rest day the planner
// chose (Herstelwandeling) does not block a day. What drops carries one sentence on the repair.
//
// Deterministic and idempotent: the score depends on the arrangement alone (a whole number, plus a
// tie-break of a thousandth for staying close to where things stand), and the search starts from
// nothing placed and takes only strict improvements in a fixed order. So the result does not depend
// on where the trainings stood before, and a second run, or the next turn of the planning run,
// finds nothing better. Nothing here is stored: it is a step
// of the planning run (engine/planPass.ts), so it is a proposal with Akkoord when you add a
// holiday, and the Planning bijgewerkt line when the daily run does it.
//
// Pure: no React, no IndexedDB.

import type { PlannedSession, SessionTemplate } from '../models/training';
import { addDays, daysBetween, mondayOfWeek, isoWeekday } from '../utils/dates';
import { leaveDays } from './leave';
import { lockLevel, validateWeeks, type CheckInput, type Repair } from './weekValidator';
import { isLegHeavyTemplate } from './scheduler';
import { templateSport } from './sports';
import { hasRole, idIsTestOrRace } from './templateRoles';
import { LEAVE_SPACING_ROLES } from './leaveSpacing';
import { patternSlotOf } from './programLayout';

export interface LeaveAroundInput {
  // The week check's own input without the sessions.
  check: Omit<CheckInput, 'sessions'>;
  // Adding a holiday (a proposal with Akkoord): the whole stretch is arranged again, also what an earlier holiday's
  // Akkoord put somewhere. Absent (the daily run): only what stands on a holiday day gets another day or goes.
  reshuffle?: boolean;
}

export interface LeaveAroundResult {
  sessions: PlannedSession[];
  repairs: Repair[];
}

// The weights of the score, most important first. A finding of the week check outweighs everything.
const W_FINDING = 1000;
const W_HEAVY_NEXT = 1000;
const W_DROP = 100;
// The training that gives the week its shape (the long run, hills, a hard run, blocks) is let go last.
const W_DROP_KEY = 130;
const W_CROWD = 40;
// The same task (the same training, or one with the same role) two days apart or closer.
const CROWD_GAP_DAYS = 3;
const W_DOUBLE = 30;
const W_DAY = 1;
// Tie-break only, less than one in all: of equal arrangements the one closest to where things stand.
const W_STAY = 0.001;
const MAX_PASSES = 8;
// A bound on the work, counted and not timed, so the result stays the same on a slow phone: after this many
// different arrangements judged the search keeps the best it has.
const MAX_JUDGED = 2500;

const MOVE_REASON = 'Past hier het best rond je vakantie, met genoeg rust tussen zware beendagen.';
const DROP_LEG_REASON = 'Rond je vakantie is er geen dag over met 48 uur rust tot de volgende zware beendag.';
const DROP_REASON = 'Rond je vakantie is er geen dag meer waarop deze erbij past.';

export function planAroundLeave(all: PlannedSession[], input: LeaveAroundInput): LeaveAroundResult {
  const none = { sessions: all, repairs: [] };
  const periods = (input.check.leave ?? []).filter((p) => p.kind === 'no_training');
  if (periods.length === 0) return none;
  const { today, goalDay, templates, logs, restDay } = input.check;
  const days = leaveDays(input.check.leave);
  const byId = new Map(templates.map((t) => [t.id, t]));
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const raceDays = new Set(input.check.raceDays ?? []);
  const until = [goalDay ? addDays(goalDay, -1) : addDays(today, 365), input.check.until].filter((d): d is string => !!d).sort()[0];
  const off = [...days.entries()].filter(([d, v]) => v.kind === 'off' && d >= today && d <= until).map(([d]) => d).sort();
  if (off.length === 0) return none;

  // The weeks that hold a holiday day, joined when only one week lies between them.
  const weekSet = new Set(off.map(mondayOfWeek));
  const sortedWeeks = [...weekSet].sort();
  const clusters: string[][] = [];
  for (const w of sortedWeeks) {
    const last = clusters[clusters.length - 1];
    if (last && daysBetween(last[last.length - 1], w) <= 14) {
      for (let m = addDays(last[last.length - 1], 7); m <= w; m = addDays(m, 7)) last.push(m);
    } else clusters.push([w]);
  }

  let sessions = all;
  const repairs: Repair[] = [];
  for (const weeks of clusters) {
    const one = arrange(sessions, weeks);
    sessions = one.sessions;
    repairs.push(...one.repairs);
  }
  return repairs.length === 0 ? none : { sessions, repairs };

  function arrange(list: PlannedSession[], weeks: string[]): LeaveAroundResult {
    const first = weeks[0];
    const last = weeks[weeks.length - 1];
    const inCluster = (date: string) => date >= first && date <= addDays(last, 6);
    const markedByHoliday = (s: PlannedSession) =>
      !!input.reshuffle && s.lock?.by === 'proposal' && !!s.leave && s.leave.role !== 'placed' && periods.some((p) => p.id === s.leave!.periodId);
    const revivable = (s: PlannedSession) => markedByHoliday(s) && s.leave!.role === 'dropped' && s.status === 'skipped';
    // The system's own trainings in these weeks (and, adding a holiday, those an earlier holiday placed).
    const mine = (s: PlannedSession) => {
      if (!inCluster(s.scheduledDate) || s.scheduledDate < today || logged.has(s.id) || s.raceBlock) return false;
      if (s.status === 'skipped' ? !revivable(s) : false) return false;
      if (s.leave?.role === 'placed') return false;
      const t = byId.get(s.templateId);
      if (!t || t.type === 'recovery' || (t.type === 'hiking' && templateSport(t) === 'hiking') || idIsTestOrRace(s.templateId, byId)) return false;
      if (s.status === 'skipped') return true;
      // The daily run (no proposal in front of you) only finds a day for what stands on a holiday day; the rest of the
      // stretch is arranged again only in a proposal for a new holiday, which you accept.
      if (!input.reshuffle && days.get(s.scheduledDate)?.kind !== 'off') return false;
      return lockLevel(s, logged, today) === 3 || (lockLevel(s, logged, today) === 1 && markedByHoliday(s));
    };
    const keyTask = (t: SessionTemplate | undefined) => !!t && LEAVE_SPACING_ROLES.some((r) => hasRole(t, r));
    // The weekday a training has in the week (its own place), the weekday of its day when it has none.
    const slotOf = (s: PlannedSession): number => {
      const t = byId.get(s.templateId);
      return input.check.slotDays?.get(s.templateId) ?? input.check.slotDays?.get(patternSlotOf(s.templateId)) ?? t?.defaultDayOfWeek ?? isoWeekday(s.scheduledDate);
    };
    // The key tasks first, then by their place in the week: where things stood before only breaks a tie.
    const parts = list.filter(mine).sort((a, b) =>
      Number(keyTask(byId.get(b.templateId))) - Number(keyTask(byId.get(a.templateId))) || slotOf(a) - slotOf(b) || a.templateId.localeCompare(b.templateId) || a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id));
    if (parts.length === 0) return { sessions: list, repairs: [] };
    const partIds = new Set(parts.map((s) => s.id));
    const others = list.filter((s) => !partIds.has(s.id));

    const sameTask = (a: PlannedSession, b: PlannedSession) => {
      const ta = byId.get(a.templateId);
      const tb = byId.get(b.templateId);
      if (a.templateId === b.templateId) return a.scheduledDate !== b.scheduledDate;
      return !!ta && !!tb && LEAVE_SPACING_ROLES.some((r) => hasRole(ta, r) && hasRole(tb, r));
    };
    const legHeavy = (t: SessionTemplate | undefined) => !!t && (isLegHeavyTemplate(t) || hasRole(t, 'long'));
    const openOthers = others.filter((s) => s.status !== 'skipped' && byId.get(s.templateId)?.type !== 'recovery');
    // The days a training may take: the weeks of the stretch, and an empty day of the week on each side.
    const windowStart = addDays(first, -7) < today ? today : addDays(first, -7);
    const windowEnd = addDays(last, 13);
    const empty = (date: string) => !openOthers.some((s) => s.scheduledDate === date);
    const candidateDays = Array.from({ length: daysBetween(windowStart, windowEnd) + 1 }, (_, i) => addDays(windowStart, i))
      .filter((d) => d >= today && d <= until && !(goalDay && d >= goalDay) && !raceDays.has(d) && days.get(d)?.kind !== 'off' && days.get(d)?.kind !== 'trek' && !(restDay && isoWeekday(d) === restDay))
      .filter((d) => inCluster(d) || empty(d))
      .filter((d) => !others.some((s) => s.scheduledDate === d && (logged.has(s.id) || idIsTestOrRace(s.templateId, byId))));

    // The state: the day of each training of the stretch, null when it is let go.
    const placed = (s: PlannedSession, date: string): PlannedSession => ({ ...s, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'planned' });
    const build = (state: Map<string, string | null>) =>
      [...others, ...parts.filter((s) => state.get(s.id)).map((s) => placed(s, state.get(s.id)!))];

    const checkWeeks = new Set(Array.from({ length: weeks.length + 2 }, (_, i) => addDays(first, (i - 1) * 7)));
    const cache = new Map<string, number>();
    const score = (state: Map<string, string | null>): number => {
      const keyOf = parts.map((s) => `${s.id}=${state.get(s.id) ?? '-'}`).join('|');
      const hit = cache.get(keyOf);
      if (hit !== undefined) return hit;
      if (cache.size >= MAX_JUDGED) return Infinity;
      const list2 = build(state);
      let total = 0;
      total += validateWeeks({ ...input.check, sessions: list2 }, checkWeeks).length * W_FINDING;
      // Heavy leg days 48 hours apart, also across the weekend pairing and after a logged long run.
      const heavy = list2.filter((s) => s.status !== 'skipped' && legHeavy(byId.get(s.templateId)) && s.scheduledDate >= addDays(today, -3));
      for (let i = 0; i < heavy.length; i++) {
        for (let j = i + 1; j < heavy.length; j++) {
          if (!partIds.has(heavy[i].id) && !partIds.has(heavy[j].id)) continue;
          if (Math.abs(daysBetween(heavy[i].scheduledDate, heavy[j].scheduledDate)) < 2) total += W_HEAVY_NEXT;
        }
      }
      // Dropped, double days, shifting.
      const perDay = new Map<string, number>();
      for (const s of list2) {
        if (s.status === 'skipped' || byId.get(s.templateId)?.type === 'recovery' || !inCluster(s.scheduledDate)) continue;
        perDay.set(s.scheduledDate, (perDay.get(s.scheduledDate) ?? 0) + 1);
      }
      for (const n of perDay.values()) if (n > 1) total += (n - 1) * W_DOUBLE;
      for (const s of parts) {
        const d = state.get(s.id);
        if (!d) { total += keyTask(byId.get(s.templateId)) ? W_DROP_KEY : W_DROP; continue; }
        // Away from its place in the week, by weekdays around the week; a thousandth for every day away from where it stood.
        const away = Math.abs(isoWeekday(d) - slotOf(s));
        total += Math.min(away, 7 - away) * W_DAY + Math.abs(daysBetween(s.scheduledDate, d)) * W_STAY;
      }
      // The same task twice within two days of each other (not for a weekend of hills and long run: those are other tasks).
      if (input.check.leaveCrowding !== 'shift') {
        const live = list2.filter((s) => s.status !== 'skipped' && s.scheduledDate >= today);
        for (let i = 0; i < live.length; i++) {
          for (let j = i + 1; j < live.length; j++) {
            if (!partIds.has(live[i].id) && !partIds.has(live[j].id)) continue;
            if (Math.abs(daysBetween(live[i].scheduledDate, live[j].scheduledDate)) < CROWD_GAP_DAYS && sameTask(live[i], live[j])) total += W_CROWD;
          }
        }
      }
      cache.set(keyOf, total);
      return total;
    };

    // Local search: one training to another day (or let go), then two exchanging days, then (for a
    // training that is let go or stands on a double day) two moving together: one takes the day,
    // the one that stood there makes room.
    let state = new Map<string, string | null>();
    let best = 0;
    const daysOf = (st: Map<string, string | null>) => {
      const count = new Map<string, number>();
      for (const s of parts) { const d = st.get(s.id); if (d) count.set(d, (count.get(d) ?? 0) + 1); }
      return count;
    };
    const single = (): boolean => {
      let improved = false;
      for (const s of parts) {
        const here = state.get(s.id) ?? null;
        let pick: string | null | undefined;
        let pickScore = best;
        for (const d of [...candidateDays, null]) {
          if (d === here) continue;
          const trial = new Map(state);
          trial.set(s.id, d);
          const sc = score(trial);
          if (sc < pickScore) { pickScore = sc; pick = d; }
        }
        if (pick !== undefined) { state.set(s.id, pick); best = pickScore; improved = true; }
      }
      return improved;
    };
    const swaps = (): boolean => {
      let improved = false;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = state.get(parts[i].id) ?? null;
          const b = state.get(parts[j].id) ?? null;
          if (!a || !b || a === b) continue;
          const trial = new Map(state);
          trial.set(parts[i].id, b);
          trial.set(parts[j].id, a);
          const sc = score(trial);
          if (sc < best) { state = trial; best = sc; improved = true; }
        }
      }
      return improved;
    };
    const pairs = (): boolean => {
      let improved = false;
      for (const p of parts) {
        const count = daysOf(state);
        const here = state.get(p.id) ?? null;
        if (here && (count.get(here) ?? 0) < 2) continue;
        let pick: [string, string, string | null] | undefined;
        let pickScore = best;
        for (const d of candidateDays) {
          if (d === here) continue;
          for (const q of parts) {
            const qHere = state.get(q.id) ?? null;
            if (q.id === p.id || !qHere || Math.abs(daysBetween(qHere, d)) > 1) continue;
            for (const d2 of [...candidateDays, null]) {
              if (d2 === qHere) continue;
              const trial = new Map(state);
              trial.set(p.id, d);
              trial.set(q.id, d2);
              const sc = score(trial);
              if (sc < pickScore) { pickScore = sc; pick = [d, q.id, d2]; }
            }
          }
        }
        if (pick) { state.set(p.id, pick[0]); state.set(pick[1], pick[2]); best = pickScore; improved = true; }
      }
      return improved;
    };
    const search = (from: Map<string, string | null>): { state: Map<string, string | null>; score: number } => {
      state = new Map(from);
      best = score(state);
      for (let pass = 0; pass < MAX_PASSES; pass++) {
        const moved = single() || swaps();
        if (moved) continue;
        if (!pairs()) break;
      }
      return { state, score: best };
    };
    // Two starts: from what stands (a training on a workable day stays there, the rest has to find a day) and from
    // nothing placed. What stands is kept unless the fresh arrangement is better by a whole point, so a plan that is
    // already good is not shuffled again, and the result does not depend on where things stood.
    const standing = new Map<string, string | null>(parts.map((s) => [s.id, s.status !== 'skipped' && candidateDays.includes(s.scheduledDate) ? s.scheduledDate : null]));
    const asIs = { state: standing, score: score(standing) };
    const worked = search(standing);
    const fresh = search(new Map(parts.map((s) => [s.id, null])));
    let chosen = asIs;
    for (const c of [worked, fresh]) if (c.score < chosen.score - 0.5) chosen = c;
    state = chosen.state;

    // Only a change from what stands: a training on its own day with nothing else done stays untouched.
    const repairs: Repair[] = [];
    const out: PlannedSession[] = [];
    for (const s of list) {
      if (!partIds.has(s.id)) { out.push(s); continue; }
      const to = state.get(s.id) ?? null;
      if (s.status === 'skipped') {
        if (!to) { out.push(s); continue; }
        out.push(placed(s, to));
        repairs.push({ sessionId: s.id, rule: 'LEAVE-AROUND', from: s.scheduledDate, to, reason: MOVE_REASON });
        continue;
      }
      if (!to) {
        const t = byId.get(s.templateId);
        repairs.push({ sessionId: s.id, rule: 'LEAVE-AROUND', from: s.scheduledDate, to: s.scheduledDate, removed: true, reason: legHeavy(t) ? DROP_LEG_REASON : DROP_REASON });
        continue;
      }
      if (to === s.scheduledDate) { out.push(s); continue; }
      out.push(placed(s, to));
      repairs.push({ sessionId: s.id, rule: 'LEAVE-AROUND', from: s.scheduledDate, to, reason: MOVE_REASON });
    }
    return { sessions: out, repairs };
  }
}
