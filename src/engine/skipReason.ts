// ASCEND: waarom een training overgeslagen of vervallen is, als één korte regel op het blad van die training
// (I-80). Gemeten op 16 november: een lange duurloop die een ziekmelding van de planning haalde, zei op het blad alleen
// "Overgeslagen", met Toch doen als hoofdknop. De reden stond wel in het voorstel, maar nergens op het blad.
//
// Geen tweede waarheid. De reden komt uit wat er al bewaard is en uit de ene regel:
// - het voorstel achter het slot op de rij (`PlannedSession.lock.proposalId`), met de reden van het item uit dat
//   voorstel; een ziekmelding of weer beter melden heet Vervallen (I-48);
// - jouw slot op een overgeslagen rij: je zette hem zelf op overgeslagen (Overslaan, of Niet gedaan);
// - het merk van een periode die de rij liet vallen (`PlannedSession.leave`, rol `dropped`);
// - anders de telling van de ene regel (engine/dayRules.ts via engine/sessionStatus.ts#pauseRules, stap tellen):
//   ziek, vakantie, tocht, zonder sportschool of de afbouw van een race die er al was. Dezelfde toets als Vervallen in
//   Week (`isPausedFor`), dus vandaag telt nog niet als voorbij en een training met een log is gedaan.
// Weet de app het niet (een oude rij zonder voorstel-id, een rij zonder slot), dan geen regel.
//
// En of Toch doen mag zolang je ziek bent: dezelfde stap als verplaatsen door jou in de ene regel. Koorts of buikgriep
// weigert (de knop komt niet), verkouden of opbouwen na ziekte met een zware training vraagt eerst, zoals slepen.
//
// Puur: geen React, geen opslag, geen klok.

import type { PlannedSession } from '../models/training';
import type { PlanChangeProposal } from '../models/planChange';
import type { LeavePeriod } from '../models/leave';
import type { IllnessEpisode } from '../models/illness';
import { DAY_CAUSE_TEXT, dayRules, type DayCause, type TemplateFacts } from './dayRules';
import { isDraftOpen, pauseRules, type DisplayStatus } from './sessionStatus';

export type SkipReasonKind = 'proposal' | 'ill' | 'off' | 'trek' | 'nogym' | 'race' | 'yours';

export interface SkipReason {
  kind: SkipReasonKind;
  // Het woord voorop in de feiten van het blad: Vervallen bij ziekte en bij een voorbije dag in een pauze, zoals Week.
  word: 'Vervallen' | 'Overgeslagen';
  // Eén korte regel, het droge feit eerst.
  line: string;
}

export interface SkipReasonInput {
  session: PlannedSession;
  template?: TemplateFacts;
  today: string;
  // Er is een log van deze training: dan is hij gedaan en is er geen reden.
  logged: boolean;
  proposals: readonly PlanChangeProposal[];
  leave?: LeavePeriod[];
  illness?: IllnessEpisode[];
  // De dagen van de races in de planning (engine/raceWindow.ts#raceDatesOf).
  races?: readonly string[];
  // De geplande sessie waar nog een concept van in Forge ligt (engine/sessionStatus.ts#openDraftId).
  openDraft?: string;
}

const NO_CATCH_UP = 'Inhalen hoeft niet.';
// Naast "Overgeslagen" in de feiten, zonder de stam te herhalen. Dekt Overslaan en het antwoord Niet gedaan.
export const YOURS_SKIP_LINE = 'Je koos dit zelf.';
const ILL_TRIGGERS: readonly string[] = ['illness_reported', 'illness_resolved'];

// De regel bij een oorzaak uit de telling of een periode. `past`: de dag is voorbij (verleden tijd waar dat telt).
function causeLine(cause: DayCause, past: boolean): string | undefined {
  switch (cause) {
    case 'ill':
    case 'ill_light':
      return `Je meldde ziekte. ${NO_CATCH_UP}`;
    case 'off':
      return `Je meldde een vakantie. ${NO_CATCH_UP}`;
    case 'trek':
      return `Een dag van je tocht. ${NO_CATCH_UP}`;
    case 'nogym':
      return past ? 'Sportschool nodig, en je zat zonder sportschool.' : DAY_CAUSE_TEXT.nogym.line('');
    case 'taper':
      return `Viel in de afbouw voor je race. ${NO_CATCH_UP}`;
    default:
      return undefined;
  }
}

const KIND_OF: Partial<Record<DayCause, SkipReasonKind>> = { ill: 'ill', ill_light: 'ill', off: 'off', trek: 'trek', nogym: 'nogym', taper: 'race' };

function fromCause(cause: DayCause, past: boolean, word: SkipReason['word']): SkipReason | undefined {
  const kind = KIND_OF[cause];
  const line = causeLine(cause, past);
  if (!kind || !line) return undefined;
  return { kind, word: kind === 'ill' ? 'Vervallen' : word, line };
}

const PERIOD_CAUSE: Record<LeavePeriod['kind'], DayCause | undefined> = { no_training: 'off', trek: 'trek', no_gym: 'nogym', free_days: undefined };

// De reden van een voorbije, niet gedane training binnen een pauze, of van een overgeslagen rij zonder ander spoor:
// de ene regel, stap tellen.
function pauseReason(input: SkipReasonInput, word: SkipReason['word']): SkipReason | undefined {
  const { session, today } = input;
  const rules = pauseRules({ leave: input.leave, illness: input.illness, races: input.races }, today);
  const v = rules.may({ date: session.scheduledDate, step: 'count', template: input.template });
  if (!v.ok) return fromCause(v.cause, session.scheduledDate < today, word);
  // Een lopende ziekmelding houdt ook vandaag en morgen vast, waar de telling nog niets zegt: de rij die erin
  // overgeslagen staat, krijgt dezelfde reden (alleen voor een overgeslagen rij, nooit voor een open training).
  if (session.status !== 'skipped') return undefined;
  const placed = rules.may({ date: session.scheduledDate, step: 'place', template: input.template });
  if (placed.ok || (placed.cause !== 'ill' && placed.cause !== 'ill_light')) return undefined;
  return fromCause(placed.cause, false, word);
}

export function skipReason(input: SkipReasonInput): SkipReason | undefined {
  const { session, today } = input;
  if (input.logged) return undefined;
  const past = session.scheduledDate < today;

  if (session.status !== 'skipped') {
    // Vervallen bestaat alleen voor een dag die voorbij is (vandaag telt nog niet), en niet zolang hij in Forge loopt.
    if (!past || isDraftOpen(session, input.openDraft, today)) return undefined;
    return pauseReason(input, 'Vervallen');
  }

  // Het voorstel achter het slot, met de reden van het item uit dat voorstel.
  const lock = session.lock;
  if (lock?.by === 'proposal' && lock.proposalId) {
    const proposal = input.proposals.find((p) => p.id === lock.proposalId);
    if (proposal) {
      const ill = ILL_TRIGGERS.includes(proposal.trigger);
      const item = [...proposal.changes].reverse().find((c) => c.plannedSessionId === session.id && c.reason?.trim());
      const line = item?.reason?.trim() ?? `Via het voorstel "${proposal.issue}".`;
      return { kind: ill ? 'ill' : 'proposal', word: ill ? 'Vervallen' : 'Overgeslagen', line };
    }
  }
  if (lock?.by === 'user') return { kind: 'yours', word: 'Overgeslagen', line: YOURS_SKIP_LINE };

  // Een periode die hem liet vallen.
  if (session.leave?.role === 'dropped') {
    const period = input.leave?.find((p) => p.id === session.leave!.periodId);
    const cause = period ? PERIOD_CAUSE[period.kind] : undefined;
    const reason = cause ? fromCause(cause, past, 'Overgeslagen') : undefined;
    if (reason) return reason;
  }

  return pauseReason(input, 'Overgeslagen');
}

// --- het woord in Week en op Vandaag -------------------------------------------------------------------------------

// Het woord van een overgeslagen rij op Vandaag: hetzelfde als het blad (een ziekmelding: Vervallen).
export function skipWord(reason: SkipReason | undefined): SkipReason['word'] {
  return reason?.word ?? 'Overgeslagen';
}

// De stand die een rij in Week toont (teken en woord): een overgeslagen rij die door ziekte verviel heet Vervallen,
// zoals het blad. Alleen weergave: de telling van gemist leest deriveSessionStatus zelf (weekList.ts#missedInWeek), en
// overgeslagen en vervallen tellen daar allebei niet als gemist.
export function shownStatus(status: DisplayStatus, reason: SkipReason | undefined): DisplayStatus {
  return status === 'skipped' && reason?.word === 'Vervallen' ? 'away' : status;
}

// --- Toch doen zolang je ziek bent --------------------------------------------------------------------------------

export type BackOnPlanCheck =
  | { kind: 'ok' }
  // Eerst de vraag, zoals bij slepen: Liever niet is de hoofdknop, Toch doen de tweede keus.
  | { kind: 'ask'; line: string }
  // De dag is dicht (koorts, buikgriep): Toch doen komt niet.
  | { kind: 'refuse'; line: string };

const ILL_CAUSES: readonly DayCause[] = ['ill', 'ill_light', 'ramp'];

// Toch doen zet een overgeslagen training terug op zijn eigen dag: voor de ene regel is dat verplaatsen door jou naar
// die dag. Alleen de oorzaken van ziekte tellen hier; wat de rest van de dag zegt, beslist de planning na Toch doen
// zoals altijd (engine/scheduler.ts#proposeBackOnPlan).
export function backOnPlanCheck(args: { session: Pick<PlannedSession, 'scheduledDate'>; template?: TemplateFacts; today: string; illness?: IllnessEpisode[] }): BackOnPlanCheck {
  const v = dayRules({ today: args.today, illness: args.illness }).may({ date: args.session.scheduledDate, step: 'move', actor: 'you', template: args.template });
  if (v.ok || !ILL_CAUSES.includes(v.cause)) return { kind: 'ok' };
  const ask = DAY_CAUSE_TEXT[v.cause].ask;
  if (v.outcome === 'warn' && ask) return { kind: 'ask', line: ask };
  return { kind: 'refuse', line: v.reason };
}

// Zolang je ziek bent is Toch doen (of Verplaatsen van een vervallen training) nooit de mint hoofdknop: alles op het
// blad is een stille rij. Ook als de reden van de rij zelf ziekte is.
// Ziek is wat de ene regel vandaag ziek noemt (een lopende melding, met of zonder koorts).
export function quietWhileIll(args: { reason?: SkipReason; check: BackOnPlanCheck; today: string; illness?: IllnessEpisode[] }): boolean {
  const illToday = dayRules({ today: args.today, illness: args.illness }).facts(args.today).some((f) => (f.cause === 'ill' || f.cause === 'ill_light') && !!f.illness?.running);
  return illToday || args.reason?.kind === 'ill' || args.check.kind !== 'ok';
}
