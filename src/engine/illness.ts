// ASCEND — illness (production feedback: "als je ziek bent, dat moet je ook
// kunnen aangeven [...] het moet niet moeilijker worden om bij te houden").
// One tap to report, one tap when better; the app does the rest.
//
// Rules (docs/onderzoek, herstel_leefstijl.md; the "neck check" itself is
// expert practice, not validated):
// - above the neck (nose, throat): easy training is fine if you feel up to
//   it, nothing hard. Hard sessions today and tomorrow come off.
// - fever, below the neck, stomach flu: rest. Every session today and
//   tomorrow comes off.
// - sessions not done while ill never count as missed (consistency, the
//   "gemist" advice) and are never "caught up".
// - when better: build back over ~1-2 days per day ill. The first half of
//   that window drops the heavy sessions; the whole window says "korter en
//   rustiger". Above-the-neck colds only get a short window.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { IllnessEpisode, IllnessKind } from '../models/illness';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import { heavyAxes } from './scheduler';
import { resolveEffectiveStressProfile } from './stressProfile';
import { addDays, daysBetween, formatDateNL, weekdayShortNL } from '../utils/dates';
import { makeId } from '../utils/id';

export const ILLNESS_LABEL: Record<IllnessKind, string> = {
  above_neck: 'Verkouden, alleen boven de nek',
  below_neck: 'Koorts of klachten onder de nek',
  stomach: 'Buikgriep',
};

export const ILLNESS_HINT: Record<IllnessKind, string> = {
  above_neck: 'Neus of keel, geen koorts. Rustig bewegen mag als je je goed voelt, niets zwaars.',
  below_neck: 'Koorts, spierpijn, hoesten of benauwd. Rust, niet trainen.',
  stomach: 'Overgeven of diarree. Rust, drink genoeg, niet trainen.',
};

export const ILLNESS_GUIDANCE: Record<IllnessKind, string> = {
  above_neck: 'Voel je je goed, dan mag een rustige training, zoals wandelen of een Easy Run. Zware trainingen zijn van je planning gehaald. Krijg je koorts of klachten op je borst, meld dat dan.',
  below_neck: 'Rust. Je trainingen van vandaag en morgen zijn van je planning gehaald. Wat je mist terwijl je ziek bent, telt niet als gemist en hoef je niet in te halen.',
  stomach: 'Rust en drink genoeg. Je trainingen van vandaag en morgen zijn van je planning gehaald. Wat je mist, telt niet als gemist en hoef je niet in te halen.',
};

export function activeIllness(episodes: IllnessEpisode[] | undefined): IllnessEpisode | undefined {
  return (episodes ?? []).find((e) => !e.endDate);
}

// A session on this date was planned while ill: never counted as missed.
export function isIllnessDay(date: string, episodes: IllnessEpisode[] | undefined, asOf: string): boolean {
  return (episodes ?? []).some((e) => date >= e.startDate && date <= (e.endDate ?? asOf));
}

export function isHeavySession(template: SessionTemplate): boolean {
  const p = resolveEffectiveStressProfile(template);
  return heavyAxes(template).length > 0 || p.intensity === 'high' || p.cardioLoad === 'heavy';
}

export function rampDays(episode: IllnessEpisode, endDate: string): number {
  // The day you report better is the first good day, not an ill one.
  const daysIll = Math.max(1, daysBetween(episode.startDate, endDate));
  if (episode.kind === 'above_neck') return Math.min(2, daysIll);
  return Math.min(14, Math.max(2, Math.round(daysIll * 1.5)));
}

export interface RecoveryRamp {
  until: string; // last day of building back
  heavyFrom: string; // first day heavy sessions are back
  daysLeft: number;
}

export function recoveryRamp(episodes: IllnessEpisode[] | undefined, asOf: string): RecoveryRamp | undefined {
  const last = [...(episodes ?? [])].filter((e) => e.endDate).sort((a, b) => b.endDate!.localeCompare(a.endDate!))[0];
  if (!last || activeIllness(episodes)) return undefined;
  const days = rampDays(last, last.endDate!);
  const until = addDays(last.endDate!, days);
  if (asOf > until) return undefined;
  return { until, heavyFrom: addDays(last.endDate!, Math.ceil(days / 2) + 1), daysLeft: daysBetween(asOf, until) + 1 };
}

// Building back after illness: the first sessions at about three quarters
// of the usual volume (docs/onderzoek: return at 70-80%). Covers the whole
// ramp window; past episodes only, an active one has no window yet.
export const RETURN_VOLUME_FACTOR = 0.75;
export function recoveryDurationAdjustments(episodes: IllnessEpisode[] | undefined): { from: string; until: string; factor: number }[] {
  return (episodes ?? [])
    .filter((e) => e.endDate)
    .map((e) => ({ from: e.endDate!, until: addDays(e.endDate!, rampDays(e, e.endDate!)), factor: RETURN_VOLUME_FACTOR }));
}

function shortDate(iso: string): string {
  return `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;
}

function proposal(trigger: PlanChangeProposal['trigger'], issue: string, changes: PlanChangeItem[], consequences: string, explanation: string): PlanChangeProposal {
  return { id: makeId('planchange'), trigger, issue, changes, alternatives: [], consequences, explanation, createdAt: new Date().toISOString() };
}

const SOURCE = ['engine/illness.ts'];

// Reported ill today: clear today and tomorrow (all sessions, or only the
// heavy ones for a cold above the neck).
export function planIllnessStart(
  kind: IllnessKind,
  plannedSessions: PlannedSession[],
  templates: SessionTemplate[],
  logs: SessionLog[],
  asOf: string,
): PlanChangeProposal {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const tomorrow = addDays(asOf, 1);
  const changes: PlanChangeItem[] = plannedSessions
    .filter((s) => s.status !== 'skipped' && !logged.has(s.id) && s.scheduledDate >= asOf && s.scheduledDate <= tomorrow)
    .filter((s) => {
      const t = templateById.get(s.templateId);
      return !!t && (kind !== 'above_neck' || isHeavySession(t));
    })
    .map((s) => ({
      plannedSessionId: s.id,
      action: 'remove' as const,
      reason: kind === 'above_neck'
        ? `Verkouden: niets zwaars op ${shortDate(s.scheduledDate)}.`
        : `Ziek: rust op ${shortDate(s.scheduledDate)}.`,
      generatedBy: SOURCE,
    }));
  return proposal(
    'illness_reported',
    `Ziek gemeld: ${ILLNESS_LABEL[kind].toLowerCase()}`,
    changes,
    ILLNESS_GUIDANCE[kind],
    'Vuistregel: alleen klachten boven de nek is licht bewegen, koorts of klachten onder de nek is rust. Gemiste trainingen tijdens ziekte worden niet ingehaald.',
  );
}

// Better again: past sessions missed while ill come off the calendar (so
// they don't stay open as "gemist"), and the heavy sessions in the first
// half of the build-back window come off too.
export function planIllnessEnd(
  episode: IllnessEpisode,
  endDate: string,
  plannedSessions: PlannedSession[],
  templates: SessionTemplate[],
  logs: SessionLog[],
): { proposal: PlanChangeProposal; ramp: RecoveryRamp } {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const days = rampDays(episode, endDate);
  const ramp: RecoveryRamp = { until: addDays(endDate, days), heavyFrom: addDays(endDate, Math.ceil(days / 2) + 1), daysLeft: days + 1 };
  const open = plannedSessions.filter((s) => s.status !== 'skipped' && !logged.has(s.id));

  const missedWhileIll = open
    .filter((s) => s.scheduledDate >= episode.startDate && s.scheduledDate < endDate)
    .map((s): PlanChangeItem => ({ plannedSessionId: s.id, action: 'remove', reason: `Niet gedaan tijdens ziekte (${shortDate(s.scheduledDate)}), niet inhalen.`, generatedBy: SOURCE }));
  const heavyInRamp = open
    .filter((s) => s.scheduledDate >= endDate && s.scheduledDate < ramp.heavyFrom)
    .filter((s) => { const t = templateById.get(s.templateId); return !!t && isHeavySession(t); })
    .map((s): PlanChangeItem => ({ plannedSessionId: s.id, action: 'remove', reason: `Rustig opbouwen na ziekte: nog niets zwaars op ${shortDate(s.scheduledDate)}.`, generatedBy: SOURCE }));

  return {
    ramp,
    proposal: proposal(
      'illness_resolved',
      'Weer beter: rustig opbouwen',
      [...missedWhileIll, ...heavyInRamp],
      `Tot en met ${shortDate(ramp.until)} bouw je rustig op: je trainingen zijn ongeveer een kwart korter en rustiger, zware trainingen pas weer vanaf ${shortDate(ramp.heavyFrom)}. Daarna gaat je schema gewoon verder.`,
      'Na ziekte bouw je in ongeveer 1 tot 2 dagen per zieke dag weer op. Gemiste trainingen worden niet ingehaald.',
    ),
  };
}
