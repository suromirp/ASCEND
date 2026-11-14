// ASCEND: past een activiteit van je horloge bij de training waar hij voor zou staan (profiel horloge,
// 14 november, punt O; besluit 2026-11-14-horloge-toetsen.md)? Drie toetsen, alle drie op wat het horloge mat:
//
// - Duur: onder de helft van gepland is kort, dezelfde grens als een korte training
//   (engine/shortTraining.ts#SHORT_TRAINING_SHARE).
// - Wandeltempo: een "loop" van 10 min per km of trager is een wandeling, behalve op een loopband, met een klim
//   van 30 m per km of meer, of bij een looptraining die geen rustige loop is (heuvel- of afdaaltraining met
//   wandelend terug): een tempo zegt dan niets over de soort (Warden, 14 november).
// - Hard: bij een rustige training (gepland hoogstens zone 2) een gemiddelde hartslag meer dan 5 slagen boven
//   zone 2, of zonder hartslag een tempo 30 s per km sneller dan de snelle kant van je rustige tempo.
//   Zonder hartslag en zonder tempo's is er geen oordeel: dan zegt de app niets over hard of rustig.
//
// Alleen oordelen en tekst. Wat de app ermee doet: niet vanzelf afvinken (engine/autoTick.ts), een regel op de
// kaart Van je horloge en de soort waaronder hij wordt opgeslagen (engine/activityImport.ts), geen "zoals gepland"
// (engine/coach.ts) en geen koppelvoorstel achteraf (engine/looseLog.ts). Een log wordt hier nooit veranderd.
//
// Puur: geen React, geen opslag.

import type { SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { PaceRange } from './racePaces';
import { zoneBpm, type HeartRateSettings } from './heartRateZones';
import { buildWorkoutPlan } from './workoutPlan';
import { logSport, templateSport } from './sports';
import { SHORT_TRAINING_SHARE } from './shortTraining';
import { hasRole } from './templateRoles';

export const WALK_PACE_SEC_KM = 600;
export const HARD_HR_MARGIN = 5;
export const HARD_PACE_MARGIN_SEC = 30;
// Vanaf deze klim per km is een traag tempo klimmen, geen wandelen.
export const CLIMB_M_PER_KM = 30;
// Onder een halve kilometer zegt een tempo niets.
const MIN_PACE_KM = 0.5;

// Wat het horloge mat, los van de vorm (activiteit of log).
export interface MeasuredRun {
  minutes: number;
  km?: number;
  avgHr?: number;
  treadmill?: boolean;
  // Gestegen meters.
  gainM?: number;
}

// De keuze Soort van een loop toetsen (AppSettings.watchKindCheck): standaard aan.
export function resolveWatchKindCheck(raw: unknown): boolean {
  return raw !== false;
}

export interface FitContext {
  hr?: HeartRateSettings;
  // Je rustige tempo in seconden per km (engine/racePaces.ts), voor het oordeel zonder hartslag.
  easyPace?: PaceRange;
  // Soort van een loop toetsen: een loop in wandeltempo wordt een wandeling, een harde losse loop een tempoloop.
  kindCheck?: boolean;
}

export function paceSecKm(run: MeasuredRun): number | undefined {
  if (run.km === undefined || run.km < MIN_PACE_KM || run.minutes <= 0) return undefined;
  return (run.minutes * 60) / run.km;
}

// "13:06": minuten en seconden per km.
export function paceText(secKm: number): string {
  const total = Math.round(secKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// Alleen het tempo: 10 min per km of trager. Vanzelf afvinken weigert hierop altijd (engine/autoTick.ts).
export function isWalkPaced(run: MeasuredRun): boolean {
  const pace = paceSecKm(run);
  return pace !== undefined && pace >= WALK_PACE_SEC_KM;
}

// Het tempo van een wandeling, en niets wat dat tempo anders verklaart: geen loopband en geen klim van 30 m per
// km of meer. Toets de soort nooit alleen op tempo.
export function isWalkLike(run: MeasuredRun): boolean {
  if (!isWalkPaced(run) || run.treadmill) return false;
  return !(run.gainM !== undefined && run.km !== undefined && run.gainM / run.km >= CLIMB_M_PER_KM);
}

export interface HardJudgment {
  by: 'hr' | 'pace';
  // Hartslag in slagen per minuut of tempo in seconden per km, heel.
  value: number;
  // De grens van rustig: de bovenkant van zone 2, of de snelle kant van je rustige tempo.
  limit: number;
}

// Duidelijk harder dan rustig, of undefined (rustig, of niets om op te oordelen).
export function hardEffort(run: MeasuredRun, ctx: Pick<FitContext, 'hr' | 'easyPace'>): HardJudgment | undefined {
  const zone2 = zoneBpm(2, ctx.hr);
  if (run.avgHr !== undefined && run.avgHr > 0 && zone2) {
    const value = Math.round(run.avgHr);
    return value > zone2[1] + HARD_HR_MARGIN ? { by: 'hr', value, limit: zone2[1] } : undefined;
  }
  // Een loopband meet tempo niet betrouwbaar genoeg voor dit oordeel.
  const pace = run.treadmill ? undefined : paceSecKm(run);
  if (pace !== undefined && ctx.easyPace) {
    const limit = Math.round(ctx.easyPace.fast);
    return pace < limit - HARD_PACE_MARGIN_SEC ? { by: 'pace', value: Math.round(pace), limit } : undefined;
  }
  return undefined;
}

// "gemiddeld 172 bpm, zone 2 gaat tot 151" of "tempo 4:24 per km, rustig is vanaf 5:40".
export function hardText(j: HardJudgment): string {
  return j.by === 'hr'
    ? `gemiddeld ${j.value} bpm, zone 2 gaat tot ${j.limit}`
    : `tempo ${paceText(j.value)} per km, rustig is vanaf ${paceText(j.limit)}`;
}

// Een rustige looptraining: hardlopen, geen test of wedstrijd, en nergens boven zone 2 gepland.
export function isEasyRun(template: SessionTemplate, date: string, program: Program | null | undefined): boolean {
  if (templateSport(template) !== 'running' || hasRole(template, 'test') || hasRole(template, 'race')) return false;
  const intensity = template.baseStressProfile?.intensity;
  if (intensity === 'moderate' || intensity === 'high') return false;
  const plan = buildWorkoutPlan(template, date, program);
  const levels = plan?.timeline.filter((s) => s.kind !== 'strength' && !s.noTarget).map((s) => s.intensity) ?? [];
  return levels.length > 0 && Math.max(...levels) <= 2;
}

export function isShortFor(minutes: number, plannedMinutes: number): boolean {
  return plannedMinutes > 0 && minutes < plannedMinutes * SHORT_TRAINING_SHARE;
}

// Wat het horloge mat volgens een log van een bron.
export function measuredOfLog(log: Pick<SessionLog, 'durationMinutes' | 'cardioData' | 'outdoorData'>): MeasuredRun {
  const m = log.cardioData ?? log.outdoorData;
  return { minutes: log.durationMinutes, km: m?.distanceKm, avgHr: m?.avgHeartRate, treadmill: m?.environment === 'treadmill', gainM: m?.elevationGainM };
}

// Een log die hard was bij een rustige training: voor de zin na afronden.
export function hardLogOnEasy(
  log: SessionLog,
  template: SessionTemplate,
  program: Program | null | undefined,
  ctx: Pick<FitContext, 'hr' | 'easyPace'>,
): HardJudgment | undefined {
  if (logSport(log) !== 'running' || !isEasyRun(template, log.completedDate, program)) return undefined;
  return hardEffort(measuredOfLog(log), ctx);
}

// Kan een losse log van een bron achteraf voor deze training staan (engine/looseLog.ts#sameLinkKind)? Een
// loop of tocht van minder dan de helft van de training niet, en een log in wandeltempo niet voor een loop.
// Kracht niet: sets uit MacroFactor volgen hun eigen lengte.
// Een looptraining die geen rustige loop is (heuvels, afdalen met wandelend terug) mag traag zijn. Zonder programma
// (de koppelkaart geeft het niet mee): rustig of niet hangt aan de zones van de template, niet aan de week.
export function logSizeFits(log: SessionLog, template: SessionTemplate, plannedMinutes: number): boolean {
  if (template.type === 'strength' || log.type === 'strength') return true;
  const run = measuredOfLog(log);
  if (isShortFor(run.minutes, plannedMinutes)) return false;
  if (templateSport(template) === 'running' && isEasyRun(template, log.completedDate, null) && isWalkLike(run)) return false;
  return true;
}

// --- de regel op de kaart ------------------------------------------------------------

export type FitIssue =
  | { kind: 'short'; minutes: number; planned: number; name: string }
  | { kind: 'hard'; judgment: HardJudgment; name: string }
  | { kind: 'walk'; pace: number; as: string }
  | { kind: 'hard-loose'; judgment: HardJudgment; as: string }
  | { kind: 'other-fits'; name: string };

// Eén regel per kaart, in de volgorde van gewicht: de soort, dan de duur, dan hoe hard.
export function fitIssueText(issue: FitIssue): string {
  switch (issue.kind) {
    case 'walk':
      return `Wandeltempo, ${paceText(issue.pace)} per km: dit wordt een ${issue.as.toLowerCase()}. Was het een loop? Kies dan Andere training.`;
    case 'hard-loose':
      return `Harder dan rustig: ${hardText(issue.judgment)}. Dit wordt een ${issue.as.toLowerCase()}.`;
    case 'short':
      return `Kort voor ${issue.name.toLowerCase()}: ${issue.minutes} van ${issue.planned} min. Hoort hij er niet bij, kies dan Andere training.`;
    case 'hard':
      return `Harder dan gepland: ${hardText(issue.judgment)}.`;
    case 'other-fits':
      return `Een andere activiteit van die dag past beter bij ${issue.name.toLowerCase()}.`;
  }
}

// Afronden zoals op het scherm: hele minuten.
export function wholeMinutes(sec: number): number {
  return Math.max(1, Math.round(sec / 60));
}
