// ASCEND — the fourth run in Opbouw.
//
// The week total of running may grow faster than a single run: in the
// Garmin-RUNSAFE study (Frandsen et al. 2025, 5,205 runners) a run more
// than 10% over your longest of the last 30 days raised the injury rate,
// while week-on-week growth of the total did not. Novice runners did not
// clearly do worse up to about 30% more per two weeks either (Nielsen et
// al. 2014). So in Opbouw the extra volume comes from one more short, easy
// run, not from longer runs.
//
// It is earned, not given: ASCEND puts it in a week only when the weeks
// before went well, and stops when they don't. Fixed rules, no AI:
// - the week is in Opbouw and is not a rest week (4th week of the wave);
// - no race in that week, and nothing on or after the main goal;
// - ambition is not Rustig;
// - the last finished weeks (at least two, at most four): 80% of the
//   trainings done and 75% of the long ones (same bar as "Op koers");
// - no pain after a training and at most one training that felt clearly
//   heavier than planned in the last 14 days, and not ill now.
// Only this week and next are decided, so a bad patch never sits in the
// plan weeks ahead. Once planned it stays; you can skip it like any other.
//
// The day: the free day furthest from the heavy leg days, not your rest
// day and not a day that already has a run.
//
// Pure: no React, no IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { PlanChangeProposal } from '../models/planChange';
import type { IllnessEpisode } from '../models/illness';
import type { Ambition } from './ambitionLevels';
import { addDays, isoWeekday, mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import { PHASE_OPBOUW, waveWeek } from './programLayout';
import { buildWeekReview } from './weekReview';
import { plannedRpeTop } from './coach';
import { isLegHeavyTemplate } from './scheduler';
import { templateSport } from './sports';

export const EXTRA_RUN_TEMPLATE_ID = 'tpl_strides_run';
const LOOKBACK_WEEKS = 4;
const MIN_WEEKS = 2;
const MIN_DONE_SHARE = 0.8;
const MIN_KEY_SHARE = 0.75;
const SIGNAL_DAYS = 14;

export interface ExtraRunInputs {
  today: string;
  program: Program;
  plannedSessions: PlannedSession[]; // all of them, including what this sync is about to add
  logs: SessionLog[];
  templates: SessionTemplate[];
  planChangeLog: PlanChangeProposal[];
  illnessEpisodes?: IllnessEpisode[];
  ambition?: Ambition;
  anchor?: string; // main goal date: nothing on or after it
  raceDates?: string[];
  restDay?: number; // 1 = Monday ... 7 = Sunday
  newId: () => string;
}

export interface ExtraRunVerdict {
  earned: boolean;
  reason: string;
}

// Do the last weeks earn a fourth run? One sentence why (not).
export function extraRunEarned(inputs: Omit<ExtraRunInputs, 'newId' | 'anchor' | 'raceDates' | 'restDay'>, weekStart: string): ExtraRunVerdict {
  const { today, program, plannedSessions, logs, templates, planChangeLog, illnessEpisodes, ambition } = inputs;
  if (ambition === 'rustig') return { earned: false, reason: 'Je ambitie staat op Rustig.' };
  if ((illnessEpisodes ?? []).some((e) => !e.endDate || e.endDate >= today)) return { earned: false, reason: 'Je bent ziek gemeld.' };

  const since = addDays(today, -SIGNAL_DAYS);
  const recent = logs.filter((l) => l.completedDate >= since && l.completedDate <= today);
  if (recent.some((l) => (l.painAreas ?? []).length > 0)) return { earned: false, reason: 'Je gaf de afgelopen twee weken pijn aan na een training.' };
  const byId = new Map(templates.map((t) => [t.id, t]));
  const heavy = recent.filter((l) => {
    if (l.subjectiveFeel === 'worse') return true;
    const t = byId.get(l.templateId);
    const top = t && l.rpe !== undefined ? plannedRpeTop(t, l.completedDate, program) : undefined;
    return top !== undefined && l.rpe! >= top + 2;
  });
  if (heavy.length >= 2) return { earned: false, reason: 'Een paar trainingen voelden de afgelopen twee weken zwaarder dan gepland.' };

  // The finished weeks before the week being decided (never itself).
  const firstLooked = weekStart > mondayOfWeek(today) ? mondayOfWeek(today) : weekStart;
  let done = 0, planned = 0, keyDone = 0, keyPlanned = 0, weeks = 0;
  for (let i = 1; i <= LOOKBACK_WEEKS; i++) {
    const review = buildWeekReview({ weekStart: addDays(firstLooked, -7 * i), plannedSessions, logs, templates, program, planChangeLog, asOf: today, illnessEpisodes });
    if (!review || review.planned === 0) continue;
    weeks++;
    done += review.done; planned += review.planned; keyDone += review.keyDone; keyPlanned += review.keyPlanned;
  }
  if (weeks < MIN_WEEKS) return { earned: false, reason: 'Na twee volle weken in je plan kijkt ASCEND of er een loop bij kan.' };
  if (done / planned < MIN_DONE_SHARE) return { earned: false, reason: `De laatste weken deed je ${done} van de ${planned} trainingen. Bij 80% komt er een loop bij.` };
  if (keyPlanned > 0 && keyDone / keyPlanned < MIN_KEY_SHARE) return { earned: false, reason: 'De lange training viel de laatste weken een paar keer weg. Die gaat voor.' };
  return { earned: true, reason: `De laatste ${weeks} weken deed je ${done} van de ${planned} trainingen, zonder pijn.` };
}

function isRun(t: SessionTemplate | undefined): boolean {
  return !!t && t.type !== 'strength' && t.type !== 'recovery' && templateSport(t) === 'running';
}

function isHard(t: SessionTemplate | undefined): boolean {
  if (!t) return false;
  const intensity = t.baseStressProfile?.intensity;
  return isLegHeavyTemplate(t) || intensity === 'high' || intensity === 'moderate' && isRun(t);
}

// The best day in the week for the extra run, or undefined when no day fits.
export function extraRunDay(weekStart: string, weekSessions: PlannedSession[], byId: Map<string, SessionTemplate>, opts: { today: string; anchor?: string; restDay?: number }): string | undefined {
  const active = weekSessions.filter((s) => s.status !== 'skipped');
  const on = (date: string) => active.filter((s) => s.scheduledDate === date).map((s) => byId.get(s.templateId));
  let best: { date: string; score: number } | undefined;
  for (let d = 0; d < 7; d++) {
    const date = addDays(weekStart, d);
    if (date < opts.today || (opts.anchor && date >= opts.anchor)) continue;
    if (isoWeekday(date) === (opts.restDay ?? 1)) continue;
    const here = on(date);
    if (here.some((t) => !!t && (isRun(t) || t.type === 'hiking' || isLegHeavyTemplate(t)))) continue;
    // Closer to a hard day costs more; the day before one costs most.
    let score = 0;
    if (on(addDays(date, 1)).some(isHard)) score += 2;
    if (on(addDays(date, -1)).some(isHard)) score += 1;
    if (!best || score < best.score) best = { date, score };
  }
  return best?.date;
}

// The extra runs to add now: for this week and next, where earned.
export function planExtraRuns(inputs: ExtraRunInputs): PlannedSession[] {
  const { today, program, plannedSessions, templates, anchor, raceDates, restDay, newId } = inputs;
  if (!templates.some((t) => t.id === EXTRA_RUN_TEMPLATE_ID)) return [];
  const byId = new Map(templates.map((t) => [t.id, t]));
  const out: PlannedSession[] = [];
  for (const weekStart of [mondayOfWeek(today), addDays(mondayOfWeek(today), 7)]) {
    const position = resolveProgramWeek(program, weekStart);
    if (!position || position.phase.id !== PHASE_OPBOUW || waveWeek(position) === 4) continue;
    const weekEnd = addDays(weekStart, 6);
    if ((raceDates ?? []).some((d) => d >= weekStart && d <= weekEnd)) continue;
    const week = plannedSessions.filter((s) => s.scheduledDate >= weekStart && s.scheduledDate <= weekEnd);
    if (week.some((s) => s.templateId === EXTRA_RUN_TEMPLATE_ID)) continue;
    if (!extraRunEarned(inputs, weekStart).earned) continue;
    const date = extraRunDay(weekStart, week, byId, { today, anchor, restDay });
    if (!date) continue;
    out.push({ id: newId(), templateId: EXTRA_RUN_TEMPLATE_ID, scheduledDate: date, weekStartDate: weekStart, status: 'planned', order: 9 });
  }
  return out;
}
