// ASCEND: rustiger instap na een pauze (profielendoorloop 14 november, ziek-vakantie 1;
// docs/beslissingen/2026-11-14-vakantie-en-ziek-niet-gemist.md).
//
// Na ziekte en een vakantieweek, of na twee weken met weinig training, sprong het plan meteen naar een
// volle week (bergtocht 165 minuten terwijl de laatste loop 33 minuten was). Het programma telt de weken
// op de kalender: het weet niet dat je weg was. Een coach zegt dan: de eerste week terug wat korter.
//
// Wat het doet. Op de eerste drie dagen na de pauze een voorstel: zeven dagen vanaf de dag dat je terug
// bent duren je trainingen driekwart (het advies, zoals Weer opbouwen na ziekte in engine/illness.ts) of
// de helft van de gewone duur. Welke trainingen er staan, je fase en je doeldatum blijven zoals ze zijn.
// Akkoord bewaart de week (AppSettings.reentryWeeks) en de duurregisters lezen hem
// (engine/durationScope.ts); Liever niet verandert niets en ASCEND vraagt het voor die terugkomst niet
// nog eens. Het blok een week verschuiven is de andere weg; die raakt de afbouw of de doeldatum, en het
// doel blijft het doel, dus dat doet ASCEND niet zelf.
//
// Wanneer niet: zonder programma, met de instelling uit, terwijl je ziek bent of nog opbouwt na ziekte
// (dat schema doet dit al), terwijl je nog weg bent, met een test of wedstrijd in die zeven dagen (de
// afbouw en de test hebben hun eigen regels), of in de eerste twee weken van je plan (er is dan nog
// geen gewone week om tegen te meten).
//
// Puur: geen React, geen IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import type { DurationAdjustment } from './substitutions';
import { activeIllness, recoveryRamp } from './illness';
import { awayPeriods, isAwayDay } from './leave';
import { isTestOrRace } from './templateRoles';
import { raceWeekGuard } from './adviceShared';
import type { RaceBlock } from './raceBlock';
import type { PlanChangeProposal } from '../models/planChange';
import { addDays, daysBetween, formatWeekdayDateNL, mondayOfWeek } from '../utils/dates';

export type ReentryChoice = 'three_quarters' | 'half' | 'off';
export const REENTRY_ADVICE: ReentryChoice = 'three_quarters';
const CHOICES: readonly ReentryChoice[] = ['three_quarters', 'half', 'off'];
export const REENTRY_FACTOR: Record<Exclude<ReentryChoice, 'off'>, number> = { three_quarters: 0.75, half: 0.5 };

export function resolveReentry(raw: unknown): ReentryChoice {
  return CHOICES.find((c) => c === raw) ?? REENTRY_ADVICE;
}

// Zeven dagen vanaf de dag dat je terug bent, met de factor die je met Akkoord koos.
export interface ReentryWeek {
  from: string;
  until: string;
  factor: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function isReentryWeek(v: unknown): v is ReentryWeek {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return typeof r.from === 'string' && DATE_RE.test(r.from) && typeof r.until === 'string' && DATE_RE.test(r.until) && r.until >= r.from
    && typeof r.factor === 'number' && Number.isFinite(r.factor) && r.factor >= 0.25 && r.factor <= 1;
}

// Voor de duurregisters: alleen wat heel is (een beschadigde back-up plant niets anders).
export function reentryAdjustments(weeks: unknown): DurationAdjustment[] {
  return Array.isArray(weeks) ? weeks.filter(isReentryWeek).map((w) => ({ from: w.from, until: w.until, factor: w.factor })) : [];
}

// Twee weken terugkijken; daaronder telt het als weinig training.
export const REENTRY_LOOKBACK_DAYS = 14;
const REENTRY_SHARE = 0.4;
// Gevraagd op de dag dat je terug bent en de drie dagen erna: wie op reis is opent de app niet altijd meteen
// (Pathfinder, 14 november). Het venster voor de kortere duur blijft zeven dagen vanaf de dag terug.
const OFFER_DAYS = 3;
const WINDOW_DAYS = 7;

export interface ReentryInputs {
  program: Program | null | undefined;
  plannedSessions: readonly PlannedSession[];
  logs: readonly SessionLog[];
  templates: readonly SessionTemplate[];
  today: string;
  illnessEpisodes?: IllnessEpisode[];
  leavePeriods?: LeavePeriod[];
  choice: ReentryChoice;
  // Wat al met Akkoord bewaard is.
  weeks?: unknown;
  respondedIds: ReadonlySet<string>;
  // Tussendoelen met een wedstrijddag (engine/raceBlock.ts): dezelfde bescherming als het inhalen.
  raceGoals?: RaceBlock[];
}

export type ReentryCause = 'ill' | 'away' | 'ill_away' | 'quiet';

export interface ReentryProposal {
  id: string;
  week: ReentryWeek;
  cause: ReentryCause;
  done: number; // trainingen gelogd in de twee weken ervoor
  usual: number; // trainingen in de zeven dagen vanaf terugkomst
}

export const reentryId = (from: string) => `reentry:${from}`;

// De dag dat je terug bent: de dag van "weer beter" of de dag na een vakantie of tocht. Eén terugkomst, één id:
// lag er in de laatste twee weken een terugkomst, dan geldt die, ook als hij al voorbij de drie dagen is; dan valt
// het voorstel niet terug op de maandag met een ander id (Warden, 14 november). Zonder pauze: de maandag van
// deze week, hoogstens één keer per drie weken.
const QUIET_EVERY_DAYS = 21;
function returnDay(today: string, illness: IllnessEpisode[] | undefined, leave: LeavePeriod[] | undefined): { day: string; paused: boolean } | undefined {
  const pauses = [
    ...(illness ?? []).filter((e) => e.endDate).map((e) => e.endDate!),
    ...awayPeriods(leave).map((p) => addDays(p.endDate, 1)),
  ].filter((d) => d <= today && daysBetween(d, today) <= REENTRY_LOOKBACK_DAYS).sort();
  if (pauses.length > 0) return { day: pauses.at(-1)!, paused: true };
  return { day: mondayOfWeek(today), paused: false };
}

// Een eerder voorstel (beantwoord of bewaard) in de laatste drie weken.
function askedRecently(today: string, respondedIds: ReadonlySet<string>, weeks: unknown): boolean {
  const recent = (d: string) => d <= today && daysBetween(d, today) < QUIET_EVERY_DAYS;
  return [...respondedIds].some((id) => id.startsWith('reentry:') && recent(id.slice('reentry:'.length)))
    || reentryAdjustments(weeks).some((w) => recent(w.from));
}

export function proposeReentry(inputs: ReentryInputs): ReentryProposal | undefined {
  const { program, today, illnessEpisodes: illness, leavePeriods: leave } = inputs;
  if (!program || inputs.choice === 'off') return undefined;
  if (activeIllness(illness) || recoveryRamp(illness, today) || isAwayDay(today, leave)) return undefined;
  const back = returnDay(today, illness, leave);
  if (!back || daysBetween(back.day, today) > OFFER_DAYS) return undefined;
  const from = back.day;
  const until = addDays(from, WINDOW_DAYS - 1);
  const id = reentryId(from);
  if (inputs.respondedIds.has(id)) return undefined;
  const lookFrom = addDays(from, -REENTRY_LOOKBACK_DAYS);
  // Nog geen twee weken plan: niets om tegen te meten.
  if (program.startDate > lookFrom) return undefined;
  // Al een rustiger instap die deze dagen raakt.
  if (reentryAdjustments(inputs.weeks).some((w) => w.from <= until && w.until >= from)) return undefined;

  const byId = new Map(inputs.templates.map((t) => [t.id, t]));
  const ahead = inputs.plannedSessions.filter((s) => s.status !== 'skipped' && s.scheduledDate >= from && s.scheduledDate <= until);
  // Een test of wedstrijd in die dagen: de afbouw en de test gaan voor, en die mogen niet korter.
  if (ahead.some((s) => { const t = byId.get(s.templateId); return !!t && isTestOrRace(t); })) return undefined;
  // Dezelfde bescherming als het inhalen: een wedstrijd of tussendoel binnen zeven dagen vanaf de dag terug.
  if (raceWeekGuard({ asOf: from, plannedSessions: [...inputs.plannedSessions], templates: [...inputs.templates], raceGoals: inputs.raceGoals })) return undefined;
  const usual = ahead.filter((s) => byId.get(s.templateId)?.type !== 'recovery').length;
  if (usual === 0) return undefined;
  const done = inputs.logs.filter((l) => l.completedDate >= lookFrom && l.completedDate < from && byId.get(l.templateId)?.type !== 'recovery').length;
  if (done >= REENTRY_SHARE * 2 * usual) return undefined;

  // Ziekte vlak voor die twee weken hoort bij het verhaal (ziek, een week niets, dan vakantie): een week extra terug.
  const ill = (illness ?? []).some((e) => e.startDate < from && (e.endDate ?? today) >= addDays(lookFrom, -7));
  const away = awayPeriods(leave).some((p) => p.startDate < from && p.endDate >= lookFrom);
  const cause: ReentryCause = ill && away ? 'ill_away' : ill ? 'ill' : away ? 'away' : 'quiet';
  // De grens van drie weken geldt voor het voorstel, niet voor één oorzaak: zonder terugkomst in de laatste twee
  // weken (de maandag) nooit binnen drie weken na een eerder voorstel, ook als er nog een pauze in het verhaal zit.
  if (!back.paused && askedRecently(today, inputs.respondedIds, inputs.weeks)) return undefined;
  if (cause === 'quiet' && back.paused) return undefined;
  const factor = REENTRY_FACTOR[inputs.choice];
  return { id, week: { from, until, factor }, cause, done, usual };
}

// --- woorden ---------------------------------------------------------------------------

const CAUSE_TEXT: Record<ReentryCause, string> = {
  ill: ', met ziekte ertussen',
  away: ', met een vakantie ertussen',
  ill_away: ', met ziekte en een vakantie ertussen',
  quiet: '',
};

const count = (n: number) => `${n} ${n === 1 ? 'training' : 'trainingen'}`;
const share = (factor: number) => (factor <= 0.5 ? 'de helft' : 'driekwart');

export const REENTRY_TITLE = 'Rustiger instap de eerste week terug?';

export function reentryEffect(p: ReentryProposal): string {
  return `De afgelopen twee weken deed je ${count(p.done)}${CAUSE_TEXT[p.cause]}. Een gewone week heeft er ${p.usual}. Voorstel: tot en met ${formatWeekdayDateNL(p.week.until)} duren je trainingen ${share(p.week.factor)} van de gewone tijd. Welke trainingen er staan, je fase en je doeldatum blijven zoals ze zijn. Met Liever niet blijft alles staan.`;
}

export const REENTRY_WHY = 'Na een pauze zakt je conditie wat terug. Meteen een volle week oppakken geeft de grootste kans op een blessure; de eerste week op de helft tot driekwart geeft je lijf tijd om weer te wennen, net als Weer opbouwen na ziekte. ASCEND kort alleen de duur, en alleen deze zeven dagen. Het blok een week verschuiven raakt de afbouw of je doeldatum, en het doel blijft het doel, dus dat doet ASCEND niet zelf. Driekwart of de helft kies je in Instellingen, Lichaam.';

// De regel in het voorstel van de planningsronde.
export function reentryNote(week: ReentryWeek): string {
  return `Van ${formatWeekdayDateNL(week.from)} tot en met ${formatWeekdayDateNL(week.until)} duren je trainingen ${share(week.factor)} van de gewone tijd. Daarna gaat je schema gewoon verder.`;
}

// Een instap terugzetten (Aangepast door ASCEND in Week) is zelf een wijziging: een eigen regel in het logboek van
// wijzigingen, zodat Ongedaan maken in de melding daarnaar verwijst (revertsProposalId) en het logboek beide toont.
export const REENTRY_UNDONE_TITLE = 'Rustiger instap teruggezet';
export const REENTRY_UNDONE_LINE = 'Je trainingen hebben weer hun gewone duur.';

export function reentryUndoneRecord(id: string, week: ReentryWeek, at: string): PlanChangeProposal {
  return {
    id,
    trigger: 'reentry_planned',
    issue: REENTRY_UNDONE_TITLE,
    changes: [],
    alternatives: [],
    consequences: `${REENTRY_UNDONE_LINE} De instap van ${formatWeekdayDateNL(week.from)} tot en met ${formatWeekdayDateNL(week.until)} is weg.`,
    explanation: 'Door jou teruggezet in Aangepast door ASCEND.',
    createdAt: at,
    resolvedAt: at,
    resolution: 'accepted',
  };
}

// De instap die vandaag loopt, als je er Akkoord op gaf: de kaart Weer opbouwen op Vandaag zegt het dan.
export function activeReentry(weeks: unknown, today: string): ReentryWeek | undefined {
  return reentryAdjustments(weeks).find((w) => w.from <= today && w.until >= today);
}

// "Rustiger instap tot en met zo 13 december: je trainingen duren driekwart van de gewone tijd."
export function reentryTodayLine(week: ReentryWeek): string {
  return `Rustiger instap tot en met ${formatWeekdayDateNL(week.until)}: je trainingen duren ${share(week.factor)} van de gewone tijd. Daarna gaat je schema gewoon verder.`;
}
