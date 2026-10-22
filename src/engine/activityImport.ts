// ASCEND — an activity from outside becomes a draft log (docs/visie/Data
// zonder handwerk.md, idee 1 en stap 1).
//
// Pure and provider-free: an adapter (integrations/intervalsIcu.ts today, a
// FIT reader or Health Connect later) turns whatever the provider sends into
// an ExternalActivity, and everything here works from that one shape. Nothing
// in this file knows a vendor's field names.
//
// What this file does, and what it never does:
// - It proposes. A draft log and the planned session it seems to belong to
//   are a voorstel; nothing is stored until the user taps (the Today card).
// - History stays append-only. An import only ever makes a NEW log, and a
//   log that already carries the same externalId means: do nothing.
// - An activity that belongs to a training typed in by hand (same day, fitting
//   sort, about the same length) is no new proposal at all. Matching it up
//   with that log (engine/watchAlign.ts) is a separate, explicit step
//   (docs/beslissingen/2026-10-22-garmin-is-leidend.md).

import type { MetricSource, PlannedSession, SessionLog, SessionTemplate, SubjectiveFeel } from '../models/training';
import { logSport, templateSport, type Sport } from './sports';
import { formatNumberNL } from '../utils/number';
import type { RunDynamics, StreamKind } from '../models/activityDetail';

export type ExternalActivityKind = 'run' | 'hike' | 'ride' | 'strength' | 'other';

// The general shape. Distances in meters, times in seconds, heights in
// meters; every optional number is simply absent when the source didn't
// measure it.
export interface ExternalActivity {
  // The id of the activity at its source, unique per provider
  // (e.g. "intervals.icu:i123"). Becomes SessionLog.externalId.
  externalId: string;
  // Where the measurement comes from (the watch), not which service passed it on.
  source: MetricSource;
  // Local start, "2026-10-18T08:12:03" (no time zone: the day on the watch).
  start: string;
  kind: ExternalActivityKind;
  name?: string;
  durationSec: number;
  distanceM?: number;
  elevationGainM?: number;
  elevationLossM?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  // Average cadence in steps (or pedal turns) per minute.
  avgCadence?: number;
  // How hard it felt, 1 to 10, when it was filled in on the watch.
  rpe?: number;
  feel?: SubjectiveFeel;
  // On a treadmill or trainer: any climbing is an estimate, not altitude.
  treadmill: boolean;
  // The averages of the running dynamics, when the source measured them
  // (models/activityDetail.ts). Comes with the activity, no extra request.
  dynamics?: RunDynamics;
  // The series this activity has at its source (heart rate, speed, altitude,
  // the running dynamics...). Only these are ever asked for.
  streamsAvailable?: StreamKind[];
}

export const ACTIVITY_KIND_LABEL: Record<ExternalActivityKind, string> = {
  run: 'Loop',
  hike: 'Wandeling',
  ride: 'Fietstocht',
  strength: 'Krachttraining',
  other: 'Activiteit',
};

const KIND_SPORT: Partial<Record<ExternalActivityKind, Sport>> = { run: 'running', hike: 'hiking', ride: 'cycling' };

export function activityDate(activity: Pick<ExternalActivity, 'start'>): string {
  return activity.start.slice(0, 10);
}

// A yoga class or a swim has no place in the training types ASCEND plans,
// so it is never offered; the user can still log it by hand.
export function isImportable(activity: ExternalActivity): boolean {
  return activity.kind !== 'other' && activity.durationSec > 0;
}

// "Duration in the neighbourhood": within 15 minutes or 35 percent of the
// other length, whichever is more. A 40-minute run done in 52 or 27 counts; a
// planned 3-hour hike that took 4 hours does not. Used for ticking off a planned
// training (engine/autoTick.ts) and for matching a typed-in log.
export const DURATION_MARGIN_MIN = 15;
export const DURATION_MARGIN_RATIO = 0.35;

export function durationIsClose(actualMinutes: number, otherMinutes: number): boolean {
  return Math.abs(actualMinutes - otherMinutes) <= Math.max(DURATION_MARGIN_MIN, otherMinutes * DURATION_MARGIN_RATIO);
}

// --- does this activity fit this template? ---------------------------------

function fitsTemplate(kind: ExternalActivityKind, template: SessionTemplate): boolean {
  switch (kind) {
    case 'run':
      return templateSport(template) === 'running';
    case 'ride':
      return templateSport(template) === 'cycling';
    case 'hike':
      // A walk on a rest day is logged on the Herstel session, as the app does by hand.
      return templateSport(template) === 'hiking' || template.type === 'recovery';
    case 'strength':
      return template.type === 'strength';
    default:
      return false;
  }
}

export function templatesForKind(kind: ExternalActivityKind, templates: SessionTemplate[]): SessionTemplate[] {
  return templates.filter((t) => fitsTemplate(kind, t));
}

// --- which planned session does it belong to? -------------------------------

export interface PlannedMatch {
  session: PlannedSession;
  template: SessionTemplate;
}

export function plannedMinutes(match: PlannedMatch): number {
  return match.session.plannedMinutes ?? match.template.durationVariants.full;
}

// Planned sessions this activity could be ticked off against: no log yet,
// not skipped, a template of the right kind. Same day first (that is the
// proposal), then the other days of the same week, nearest first, for the
// "Andere training" choice (`notAfter`: nothing planned in the future).
// `sameDayOnly` gives just the proposal pool.
export function candidatePlanned(
  activity: ExternalActivity,
  planned: PlannedSession[],
  templates: SessionTemplate[],
  logs: SessionLog[],
  options: { sameDayOnly?: boolean; anyKind?: boolean; notAfter?: string } = {},
): PlannedMatch[] {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  const day = activityDate(activity);
  const dayMs = Date.parse(`${day}T00:00:00Z`);
  const minutes = activity.durationSec / 60;

  const matches: (PlannedMatch & { distance: number })[] = [];
  for (const session of planned) {
    if (logged.has(session.id) || session.status === 'skipped') continue;
    if (options.notAfter && session.scheduledDate > options.notAfter) continue;
    const template = templateById.get(session.templateId);
    if (!template) continue;
    if (!options.anyKind && !fitsTemplate(activity.kind, template)) continue;
    const distance = Math.abs(Date.parse(`${session.scheduledDate}T00:00:00Z`) - dayMs) / 86_400_000;
    if (options.sameDayOnly ? distance !== 0 : distance > 6) continue;
    matches.push({ session, template, distance });
  }

  const fits = (m: PlannedMatch) => fitsTemplate(activity.kind, m.template);
  return matches
    .sort((a, b) => {
      // The right kind before anything else, a real session before a rest-day
      // walk, then the day, then the planned length closest to what happened.
      if (fits(a) !== fits(b)) return fits(a) ? -1 : 1;
      const restA = a.template.type === 'recovery' ? 1 : 0;
      const restB = b.template.type === 'recovery' ? 1 : 0;
      if (restA !== restB) return restA - restB;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return Math.abs(plannedMinutes(a) - minutes) - Math.abs(plannedMinutes(b) - minutes) || a.session.order - b.session.order;
    })
    .map(({ session, template }) => ({ session, template }));
}

// The one proposal: same day, fitting kind, no log yet. Undefined when
// nothing on that day fits.
export function proposeMatch(
  activity: ExternalActivity,
  planned: PlannedSession[],
  templates: SessionTemplate[],
  logs: SessionLog[],
): PlannedMatch | undefined {
  return candidatePlanned(activity, planned, templates, logs, { sameDayOnly: true })[0];
}

// When nothing is planned for it: the template an unplanned activity is
// saved under, by kind. A short walk is a Herstel walk; a real mountain day
// (300 m up or more) is a Bergtocht.
export function fallbackTemplate(activity: ExternalActivity, templates: SessionTemplate[]): SessionTemplate | undefined {
  const pool = templatesForKind(activity.kind, templates);
  const byId = (id: string) => pool.find((t) => t.id === id);
  switch (activity.kind) {
    case 'run':
      return byId('tpl_easy_run') ?? pool[0];
    case 'ride':
      return byId('tpl_bike') ?? pool[0];
    case 'strength':
      return pool[0];
    case 'hike':
      return ((activity.elevationGainM ?? 0) >= 300 ? byId('tpl_mountain_hike') : byId('tpl_herstel')) ?? pool.find((t) => t.type === 'hiking') ?? pool[0];
    default:
      return undefined;
  }
}

// --- the draft log ------------------------------------------------------------

// A SessionLog without its id: the app gives that out when it stores it.
export type SessionLogDraft = Omit<SessionLog, 'id'>;

const round = (n: number, decimals = 0) => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

function clean<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export function activityToDraft(activity: ExternalActivity, template: SessionTemplate, planned?: PlannedSession): SessionLogDraft {
  const durationMinutes = Math.max(1, Math.round(activity.durationSec / 60));
  const startMs = new Date(activity.start).getTime();
  const completedAt = new Date(startMs + activity.durationSec * 1000).toISOString();
  const gain = activity.elevationGainM !== undefined ? round(activity.elevationGainM) : undefined;

  const metric = clean({
    durationMinutes,
    distanceKm: activity.distanceM !== undefined ? round(activity.distanceM / 1000, 2) : undefined,
    elevationGainM: gain,
    elevationLossM: activity.elevationLossM !== undefined ? round(activity.elevationLossM) : undefined,
    // A treadmill doesn't change altitude: its "climb" is flagged, like the
    // incline-treadmill estimate (models/training.ts#OutdoorMetric).
    estimatedElevation: activity.treadmill && gain !== undefined ? true : undefined,
    environment: activity.kind === 'strength' ? undefined : activity.treadmill ? ('treadmill' as const) : ('outdoor' as const),
    // The rest-day walk is logged the way the app logs it by hand.
    modality: template.type === 'recovery' && activity.kind === 'hike' ? 'recovery_walk' : undefined,
    avgHeartRate: activity.avgHeartRate,
    maxHeartRate: activity.maxHeartRate,
    cadence: activity.avgCadence !== undefined ? Math.round(activity.avgCadence) : undefined,
    dynamics: activity.kind === 'run' || activity.kind === 'hike' ? activity.dynamics : undefined,
    source: activity.source,
  });

  const draft: SessionLogDraft = {
    plannedSessionId: planned?.id,
    templateId: template.id,
    type: template.type,
    sport: KIND_SPORT[activity.kind],
    completedDate: activity.start.slice(0, 10),
    completedAt,
    variant: 'custom',
    durationMinutes,
    rpe: activity.rpe !== undefined ? Math.min(10, Math.max(1, Math.round(activity.rpe))) : undefined,
    subjectiveFeel: activity.feel,
    cardioData: template.type === 'cardio' || template.type === 'recovery' ? metric : undefined,
    outdoorData: template.type === 'hiking' ? metric : undefined,
    externalId: activity.externalId,
    source: activity.source,
  };
  return clean(draft);
}

// --- a training typed in by hand ----------------------------------------------

// A log made by hand: not tied to a watch activity. Only these are ever
// matched with an activity.
export function isHandLog(log: Pick<SessionLog, 'source' | 'externalId'>): boolean {
  return !log.externalId && (log.source ?? 'manual') === 'manual';
}

function logFitsKind(log: SessionLog, kind: ExternalActivityKind): boolean {
  if (kind === 'strength') return log.type === 'strength';
  // A walk on a rest day is logged as a Herstel session.
  if (kind === 'hike' && log.type === 'recovery') return true;
  const sport = KIND_SPORT[kind];
  return sport !== undefined && logSport(log) === sport;
}

export interface ManualPair {
  activity: ExternalActivity;
  log: SessionLog;
}

// Which activity is the same training as which log made by hand. Same day,
// a fitting sort, and either a length in the neighbourhood or the only one of
// that sort on that day on both sides. One log never takes two activities and
// one activity never two logs: with two runs on a day the closest lengths pair
// up, and what is left over stays what it is (a new training, or a log with no
// watch activity).
export function pairWithManualLogs(activities: ExternalActivity[], logs: SessionLog[]): ManualPair[] {
  const hand = logs.filter(isHandLog);
  if (hand.length === 0) return [];
  const pairs: ManualPair[] = [];
  const groups = new Map<string, { activities: ExternalActivity[]; kind: ExternalActivityKind; day: string }>();
  for (const activity of activities) {
    if (!isImportable(activity)) continue;
    const key = `${activityDate(activity)}|${activity.kind}`;
    const group = groups.get(key) ?? { activities: [], kind: activity.kind, day: activityDate(activity) };
    group.activities.push(activity);
    groups.set(key, group);
  }
  for (const { activities: acts, kind, day } of groups.values()) {
    const candidates = hand.filter((l) => l.completedDate === day && logFitsKind(l, kind));
    if (candidates.length === 0) continue;
    const sole = acts.length === 1 && candidates.length === 1;
    const options: { activity: ExternalActivity; log: SessionLog; gap: number }[] = [];
    for (const activity of acts) {
      for (const log of candidates) {
        const minutes = activity.durationSec / 60;
        if (sole || durationIsClose(minutes, log.durationMinutes)) options.push({ activity, log, gap: Math.abs(minutes - log.durationMinutes) });
      }
    }
    options.sort((a, b) => a.gap - b.gap || a.activity.start.localeCompare(b.activity.start) || a.log.id.localeCompare(b.log.id));
    const usedActivities = new Set<string>();
    const usedLogs = new Set<string>();
    for (const option of options) {
      if (usedActivities.has(option.activity.externalId) || usedLogs.has(option.log.id)) continue;
      usedActivities.add(option.activity.externalId);
      usedLogs.add(option.log.id);
      pairs.push({ activity: option.activity, log: option.log });
    }
  }
  return pairs;
}

// --- the whole proposal --------------------------------------------------------

export interface ImportProposal {
  activity: ExternalActivity;
  // The planned session it seems to belong to, when there is one.
  match?: PlannedMatch;
  // What it is saved under: the matched template, else the fallback by kind.
  template?: SessionTemplate;
  // A log from the same day that looks like the same training, made by hand
  // and already paired with another activity. Only a hint on the card; saving
  // stays the user's call.
  similarLog?: SessionLog;
}

// A log made by hand that day, of the same sport and about as long: probably
// the same training typed in earlier. proposeImport no longer offers such an
// activity at all; this stays for the loose hint on a card whose log was
// already paired with another activity.
export function findSimilarLog(activity: ExternalActivity, logs: SessionLog[]): SessionLog | undefined {
  const day = activityDate(activity);
  const minutes = activity.durationSec / 60;
  return logs.find((l) => {
    if (l.externalId || l.completedDate !== day) return false;
    if (activity.kind === 'strength') {
      if (l.type !== 'strength') return false;
    } else if (logSport(l) !== KIND_SPORT[activity.kind]) return false;
    return Math.abs(l.durationMinutes - minutes) <= Math.max(10, minutes * 0.25);
  });
}

// Nothing (undefined) when the activity is not for us or already stored:
// a log with the same externalId exists, or the kind has no place in ASCEND.
//
// An activity that is the same training as one typed in by hand is not a
// proposal either: `matchedIds` holds those (from pairWithManualLogs over all
// the activities, so two runs on one day are paired together); left out, only
// this activity is looked at.
export function proposeImport(
  activity: ExternalActivity,
  planned: PlannedSession[],
  templates: SessionTemplate[],
  logs: SessionLog[],
  matchedIds?: Set<string>,
): ImportProposal | undefined {
  if (!isImportable(activity)) return undefined;
  if (logs.some((l) => l.externalId === activity.externalId)) return undefined;
  const matched = matchedIds ?? new Set(pairWithManualLogs([activity], logs).map((p) => p.activity.externalId));
  if (matched.has(activity.externalId)) return undefined;
  const match = proposeMatch(activity, planned, templates, logs);
  return {
    activity,
    match,
    template: match?.template ?? fallbackTemplate(activity, templates),
    similarLog: findSimilarLog(activity, logs),
  };
}

// The proposals the Today card works through: the newest first, none for an
// activity that is stored or that the user said no to.
export function pendingProposals(
  activities: ExternalActivity[],
  dismissedIds: string[],
  planned: PlannedSession[],
  templates: SessionTemplate[],
  logs: SessionLog[],
): ImportProposal[] {
  const dismissed = new Set(dismissedIds);
  const matchedIds = new Set(pairWithManualLogs(activities, logs).map((p) => p.activity.externalId));
  return [...activities]
    .filter((a) => !dismissed.has(a.externalId))
    .sort((a, b) => b.start.localeCompare(a.start))
    .map((a) => proposeImport(a, planned, templates, logs, matchedIds))
    .filter((p): p is ImportProposal => !!p);
}

// --- words ------------------------------------------------------------------------

export function durationLabel(sec: number): string {
  const minutes = Math.max(1, Math.round(sec / 60));
  const h = Math.floor(minutes / 60);
  if (h === 0) return `${minutes} min`;
  return minutes % 60 === 0 ? `${h} uur` : `${h} uur ${minutes % 60} min`;
}

// One line: "Loop, 6,9 km, 55 min, +40 m".
export function describeActivity(activity: ExternalActivity): string {
  const parts: string[] = [ACTIVITY_KIND_LABEL[activity.kind]];
  if (activity.distanceM !== undefined && activity.distanceM > 0) parts.push(`${formatNumberNL(activity.distanceM / 1000, 1)} km`);
  parts.push(durationLabel(activity.durationSec));
  if (activity.elevationGainM !== undefined && activity.elevationGainM >= 1) {
    parts.push(`+${formatNumberNL(activity.elevationGainM, 0)} m${activity.treadmill ? ' (geschat)' : ''}`);
  }
  return parts.join(', ');
}

const FEEL_LABEL: Record<SubjectiveFeel, string> = { better: 'beter dan normaal', normal: 'zoals normaal', worse: 'zwaarder dan normaal' };

// What else came along, each number with a few words of explanation.
export function describeActivityDetails(activity: ExternalActivity): string[] {
  const lines: string[] = [];
  if (activity.elevationLossM !== undefined && activity.elevationLossM >= 1) {
    lines.push(`Gedaald: ${formatNumberNL(activity.elevationLossM, 0)} m`);
  }
  if (activity.avgHeartRate !== undefined) {
    lines.push(`Hartslag gemiddeld ${activity.avgHeartRate}${activity.maxHeartRate !== undefined ? `, hoogst ${activity.maxHeartRate}` : ''} slagen per minuut`);
  }
  if (activity.rpe !== undefined) lines.push(`Inspanning ${activity.rpe} van 10 (zoals je op je horloge invulde)`);
  if (activity.feel) lines.push(`Gevoel: ${FEEL_LABEL[activity.feel]}`);
  const form = describeRunForm(activity);
  if (form) lines.push(form);
  return lines;
}

// One fact about how a run was run, as it came from the watch: the contact time
// and the step length. A fact, no judgement: one run says little about form
// (docs/onderzoek/Loopgegevens en vooruitgang.md, hoofdstuk 3).
export function describeRunForm(activity: Pick<ExternalActivity, 'kind' | 'dynamics'>): string | undefined {
  const d = activity.dynamics;
  if (activity.kind !== 'run' || !d) return undefined;
  const parts: string[] = [];
  if (d.stanceTimeMs !== undefined) parts.push(`grondcontact ${formatNumberNL(d.stanceTimeMs, 0)} ms`);
  if (d.stepLengthM !== undefined) parts.push(`pas ${formatNumberNL(d.stepLengthM, 2)} m`);
  if (parts.length === 0) return undefined;
  const line = parts.join(', ');
  return `Loopvorm: ${line}`;
}
