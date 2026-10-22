// ASCEND — the extra training in Opbouw and Bergcapaciteit.
//
// The week total may grow faster than a single run: in the Garmin-RUNSAFE
// study (Frandsen et al. 2025, 5,205 runners) a run more than 10% over your
// longest of the last 30 days raised the injury rate, while week-on-week
// growth of the total did not. Novice runners did not clearly do worse up
// to about 30% more per two weeks either (Nielsen et al. 2014). So the
// extra volume comes from one more, short session, not from longer runs.
//
// It is earned, not given: ASCEND proposes it for a week only when the
// weeks before went well. Fixed rules, no AI:
// - the week is in Opbouw or Bergcapaciteit and not a rest week (4th week
//   of the wave); no race in that week, nothing on or after the main goal;
// - ambition is not Rustig;
// - the last finished weeks (at least two, at most four): 80% of the
//   trainings done and 75% of the long ones (same bar as "Op koers");
// - no pain after a training and at most one training that felt clearly
//   heavier than planned in the last 14 days, and not ill now.
//
// Which training: the one from the catalogue that serves your biggest gap
// (rankFocusGaps, chooseExtraSession), with that reason in one sentence.
// It is a proposal (Akkoord / Liever niet, engine/adviceEngine.ts), only
// for this week or next, so a bad patch never sits in the plan ahead.
//
// The day: the free day furthest from the heavy leg days, not your rest
// day and not a day that already has a run or a hike.
//
// Pure: no React, no IndexedDB.

import { hasSignificantPain } from './pain';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { PlanChangeProposal } from '../models/planChange';
import type { IllnessEpisode } from '../models/illness';
import type { Ambition } from './ambitionLevels';
import { addDays, isoWeekday, mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import type { CapabilityDimension, Criticality, GapStatus } from '../models/capability';
import type { GoalOverview } from './goalOverview';
import { PHASE_BERG, PHASE_OPBOUW, waveWeek } from './programLayout';
import { buildWeekReview } from './weekReview';
import { plannedRpeTop } from './coach';
import { isLegHeavyTemplate, respectsHeavySpacing } from './scheduler';
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
  newId?: () => string;
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
  if (recent.some(hasSignificantPain)) return { earned: false, reason: 'Je gaf de afgelopen twee weken pijn aan na een training.' };
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
export function extraRunDay(weekStart: string, weekSessions: PlannedSession[], byId: Map<string, SessionTemplate>, opts: { today: string; anchor?: string; restDay?: number; template?: SessionTemplate }): string | undefined {
  const active = weekSessions.filter((s) => s.status !== 'skipped');
  const on = (date: string) => active.filter((s) => s.scheduledDate === date).map((s) => byId.get(s.templateId));
  let best: { date: string; score: number } | undefined;
  for (let d = 0; d < 7; d++) {
    const date = addDays(weekStart, d);
    if (date < opts.today || (opts.anchor && date >= opts.anchor)) continue;
    if (isoWeekday(date) === (opts.restDay ?? 1)) continue;
    const here = on(date);
    if (here.some((t) => !!t && (isRun(t) || t.type === 'hiking' || isLegHeavyTemplate(t)))) continue;
    // A hard extra (fartlek, progressive run) not within 48 hours after heavy legs.
    if (opts.template && !respectsHeavySpacing(date, opts.template, active, byId)) continue;
    // Closer to a hard day costs more; the day before one costs most.
    let score = 0;
    if (on(addDays(date, 1)).some(isHard)) score += 2;
    if (on(addDays(date, -1)).some(isHard)) score += 1;
    if (!best || score < best.score) best = { date, score };
  }
  return best?.date;
}

// --- which training: the one that contributes most -------------------------

// The catalogue the extra training is chosen from.
export const EXTRA_CATALOGUE = ['tpl_strides_run', 'tpl_fartlek', 'tpl_progression_run', 'tpl_recovery_run', 'tpl_bergconditie', 'tpl_ruck_walk'];

const DIMENSION_LABEL: Record<CapabilityDimension, string> = {
  aerobic_engine: 'je conditie',
  sustainable_output: 'je tempo',
  endurance_duration: 'lang onderweg zijn',
  mechanical_tolerance: 'hoeveel je benen aankunnen',
  ascent_capacity: 'klimmen',
  descent_tolerance: 'dalen',
  load_carriage: 'een rugzak dragen',
  multi_day_durability: 'meerdere dagen achter elkaar',
  fatigue_resistance: 'volhouden als je moe bent',
  strength: 'kracht',
};

export interface FocusGap {
  dimension: CapabilityDimension;
  discipline?: string;
  goalName: string;
  score: number;
}

const SEVERITY: Partial<Record<GapStatus, number>> = { major_gap: 3, gap: 2, near: 1, unknown: 1 };
const CRITICALITY: Partial<Record<Criticality, number>> = { critical: 3, important: 2, supporting: 1 };

// Every open gap of every active goal, biggest first: how far off (a major
// gap counts three times a near one), how much the goal needs it, and how
// much weight the goal has right now (Goal Focus). Strength is left out:
// that is MacroFactor's job.
export function rankFocusGaps(overviews: GoalOverview[]): FocusGap[] {
  const out: FocusGap[] = [];
  for (const o of overviews) {
    for (const g of o.gaps) {
      if (g.key.dimension === 'strength') continue;
      const score = (o.focus.normalizedPct / 100) * (SEVERITY[g.status] ?? 0) * (CRITICALITY[g.criticality] ?? 0);
      if (score > 0) out.push({ dimension: g.key.dimension, discipline: g.key.discipline, goalName: o.goal.name, score });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

export interface ExtraChoice {
  templateId: string;
  reason: string;
}

// Fixed rules, per phase. Opbouw is for running, so a running gap gets a
// run; climbing gets the uphill walk. In Bergcapaciteit the weekend already
// has hills and a mountain hike, so the extra is low-impact hiking work.
export function chooseExtraSession(ctx: { phaseId: string; wave: number; inRaceBlock: boolean; afterRace: boolean; gaps: FocusGap[] }): ExtraChoice {
  if (ctx.afterRace) return { templateId: 'tpl_recovery_run', reason: 'Je wedstrijd is net achter de rug. Een heel rustige loop houdt het ritme erin. Sneller herstellen doe je er niet van, rust mag ook.' };
  if (ctx.inRaceBlock && ctx.phaseId === PHASE_OPBOUW) {
    return { templateId: 'tpl_strides_run', reason: 'Je wedstrijd komt eraan en de tempoloop staat er al. De extra loop blijft daarom rustig, met een paar versnellingen.' };
  }
  const top = ctx.gaps[0];
  const what = top ? `${DIMENSION_LABEL[top.dimension]} voor ${top.goalName}` : undefined;
  const lead = what ? `Je grootste tekort is nu ${what}. ` : '';
  const d = top?.dimension;
  if (ctx.phaseId === PHASE_OPBOUW) {
    if (d === 'sustainable_output') {
      return ctx.wave === 3
        ? { templateId: 'tpl_progression_run', reason: `${lead}Een loop met een steviger slot oefent tempo houden als je al even onderweg bent.` }
        : { templateId: 'tpl_fartlek', reason: `${lead}Korte stevige stukken in een rustige loop schuiven je tempo op, zonder zware training.` };
    }
    if (d === 'ascent_capacity' || d === 'descent_tolerance') {
      return { templateId: 'tpl_bergconditie', reason: `${lead}Bergop wandelen op een helling of trap bouwt dat op, zonder de klap van hardlopen.` };
    }
    return { templateId: 'tpl_strides_run', reason: `${lead}Een extra rustige loop maakt je week langer zonder dat één loop te veel groeit. Dat bouwt het veiligst op.` };
  }
  if (d === 'ascent_capacity' || d === 'descent_tolerance') {
    return { templateId: 'tpl_bergconditie', reason: `${lead}Bergop en bergaf wandelen op een helling of trap bouwt dat op, naast je bergtocht.` };
  }
  return { templateId: 'tpl_ruck_walk', reason: `${lead}Wandelen met een rugzak bouwt uren onderweg en draagkracht op, met weinig belasting voor je benen.` };
}

export const EXTRA_PHASES = [PHASE_OPBOUW, PHASE_BERG];

export interface ExtraAdviceInputs extends Omit<ExtraRunInputs, 'newId'> {
  gaps: FocusGap[];
  races?: { blockStart: string; raceDate: string }[];
  respondedIds: Set<string>;
}

export interface ExtraProposal {
  id: string; // per week, so a "liever niet" sticks for that week
  weekStart: string;
  date: string;
  choice: ExtraChoice;
  earnedReason: string;
}

// The extra training to propose: this week, else next week. Never planned
// without your Akkoord.
export function proposeExtraSession(inputs: ExtraAdviceInputs): ExtraProposal | undefined {
  const { today, program, plannedSessions, templates, anchor, restDay, races = [], respondedIds, gaps } = inputs;
  const byId = new Map(templates.map((t) => [t.id, t]));
  for (const weekStart of [mondayOfWeek(today), addDays(mondayOfWeek(today), 7)]) {
    const id = `extra:${weekStart}`;
    if (respondedIds.has(id)) continue;
    const position = resolveProgramWeek(program, weekStart);
    if (!position || !EXTRA_PHASES.includes(position.phase.id)) continue;
    const wave = waveWeek(position);
    if (wave === 4) continue;
    const weekEnd = addDays(weekStart, 6);
    if (races.some((r) => r.raceDate >= weekStart && r.raceDate <= weekEnd)) continue;
    const week = plannedSessions.filter((s) => s.scheduledDate >= weekStart && s.scheduledDate <= weekEnd);
    // (A quiet Saturday run of the race block is a run in place of the Saturday session, not the extra one.)
    if (week.some((s) => EXTRA_CATALOGUE.includes(s.templateId) && !s.blockQuiet)) continue;
    const verdict = extraRunEarned(inputs, weekStart);
    if (!verdict.earned) continue;
    const choice = chooseExtraSession({
      phaseId: position.phase.id,
      wave,
      inRaceBlock: races.some((r) => weekStart >= mondayOfWeek(r.blockStart) && weekStart < mondayOfWeek(r.raceDate)),
      afterRace: races.some((r) => mondayOfWeek(r.raceDate) === addDays(weekStart, -7)),
      gaps,
    });
    const template = byId.get(choice.templateId);
    if (!template) continue;
    const date = extraRunDay(weekStart, week, byId, { today, anchor, restDay, template });
    if (!date) continue;
    return { id, weekStart, date, choice, earnedReason: verdict.reason };
  }
  return undefined;
}
