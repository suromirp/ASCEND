// ASCEND: een training die niet doorging (docs/beslissingen/2026-11-01-niet-doorgegaan.md).
//
// Een geplande training die een paar dagen voorbij is zonder log. Drie dingen kunnen dan:
// - er is wel getraind, maar de log van het horloge of MacroFactor kwam op een andere dag of
//   zonder koppeling binnen: dan een voorstel om die log aan de training te koppelen (Akkoord);
// - Vragen (het advies): één korte vraag op Vandaag, "Niet gedaan?";
// - Zelf overslaan: ASCEND zet hem op overgeslagen en zegt het, met Ongedaan maken. Een test,
//   een wedstrijd en wat je zelf vastzette nooit vanzelf: die krijgen de vraag.
//
// Nooit een log verzinnen: overslaan is een status van de PlannedSession, geen historie. Koppelen
// zet alleen de verwijzing op een log die nog nergens aan hing, met het moment erbij
// (`SessionLog.linkedLater`), zodat Ongedaan maken precies dat weer weghaalt.
// Puur: geen React, geen IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { IllnessEpisode } from '../models/illness';
import { activeIllness, isIllnessDay } from './illness';
import { isTestOrRace } from './templateRoles';
import { lockLevel } from './weekValidator';
import { isHandLog } from './activityImport';
import { isLooseSourceLog, sameLinkKind, templateKind } from './looseLog';
import { daysBetween, formatDateNL, weekdayLongNL } from '../utils/dates';

type MissedChoice = 'ask' | 'auto' | 'off';
type MissedDays = 1 | 2 | 3;

export interface MissedSettings {
  choice: MissedChoice;
  // Na hoeveel dagen zonder log, gerekend vanaf de geplande dag.
  days: MissedDays;
  // "Log op een andere dag koppelen".
  link: boolean;
}

export const MISSED_ADVICE: MissedSettings = { choice: 'ask', days: 2, link: true };
const MISSED_CHOICES: readonly MissedChoice[] = ['ask', 'auto', 'off'];
const MISSED_DAYS: readonly MissedDays[] = [1, 2, 3];
// Ouder dan dit vraagt ASCEND niet meer: dan weet je het niet meer precies, en het blijft gewoon gemist.
const MISSED_MAX_AGE_DAYS = 14;
// Een log zo ver van de geplande dag (ervoor of erna) kan bij die training horen.
const LINK_WINDOW_DAYS = 2;

export function resolveMissedSettings(raw: { missedTraining?: unknown; missedTrainingDays?: unknown; missedLink?: unknown } | undefined): MissedSettings {
  const choice = MISSED_CHOICES.includes(raw?.missedTraining as MissedChoice) ? (raw!.missedTraining as MissedChoice) : MISSED_ADVICE.choice;
  const days = MISSED_DAYS.includes(raw?.missedTrainingDays as MissedDays) ? (raw!.missedTrainingDays as MissedDays) : MISSED_ADVICE.days;
  const link = typeof raw?.missedLink === 'boolean' ? raw.missedLink : MISSED_ADVICE.link;
  return { choice, days, link };
}

// Wat dit toestel onthoudt van je antwoorden. Geen gegeven over je planning: zonder dit geheugen
// komt hoogstens een vraag terug.
export interface MissedMemory {
  // Trainingen waarop je Niet nu zei: die vraag komt niet terug.
  notNow?: string[];
  // De dag van het laatste Niet nu: die dag komt er geen volgende vraag.
  notNowOn?: string;
  // Trainingen die ASCEND al eens vanzelf oversloeg: na Ongedaan maken niet nog eens, en ook geen vraag.
  auto?: string[];
  // Paren `<logId>|<sessionId>` waarop je Liever niet zei.
  declined?: string[];
  // De dag waarop je Liever niet zei, per paar. Het inhaaladvies telt zijn venster van drie dagen vanaf
  // die dag, zodat inhalen niet voorgoed wegvalt omdat er eerst een koppelvoorstel stond. Optioneel: een
  // oudere back-up heeft het niet, dan telt het venster vanaf de training zoals eerst.
  declinedOn?: Record<string, string>;
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export type ResolvedMissedMemory = MissedMemory & { notNow: string[]; auto: string[]; declined: string[] };

export function resolveMissedMemory(raw: unknown): ResolvedMissedMemory {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const notNowOn = typeof r.notNowOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.notNowOn) ? r.notNowOn : undefined;
  const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const on = typeof r.declinedOn === 'object' && r.declinedOn !== null && !Array.isArray(r.declinedOn)
    ? Object.fromEntries(Object.entries(r.declinedOn as Record<string, unknown>).filter((e): e is [string, string] => isDay(e[1])))
    : {};
  return { notNow: strings(r.notNow), ...(notNowOn ? { notNowOn } : {}), auto: strings(r.auto), declined: strings(r.declined), ...(Object.keys(on).length > 0 ? { declinedOn: on } : {}) };
}

// De sleutel in de meta-opslag; gaat mee in de back-up zoals de antwoorden op adviezen.
export const MISSED_MEMORY_KEY = 'missedTraining';

export const declinedKey = (logId: string, sessionId: string) => `${logId}|${sessionId}`;

// De laatste dag waarop je Liever niet zei op een koppeling met deze training, of niets.
export function lastDeclinedOn(sessionId: string, declinedOn: Readonly<Record<string, string>> | undefined): string | undefined {
  return Object.entries(declinedOn ?? {}).filter(([key]) => key.endsWith(`|${sessionId}`)).map(([, day]) => day).sort().at(-1);
}

export interface MissedInput {
  plannedSessions: readonly PlannedSession[];
  logs: readonly SessionLog[];
  templates: readonly SessionTemplate[];
  today: string;
  settings: MissedSettings;
  memory: MissedMemory;
  // Trainingen die al in een ander voorstel op Vandaag staan (een advies over gemiste trainingen):
  // die krijgen geen tweede kaart.
  busy?: ReadonlySet<string>;
  // Wat gepland stond terwijl je ziek was, telt nooit als gemist.
  illnessEpisodes?: IllnessEpisode[];
}

export interface MissedSession {
  session: PlannedSession;
  template: SessionTemplate;
}

type MissedItem = (MissedSession & { kind: 'ask' }) | (MissedSession & { kind: 'link'; log: SessionLog });

export interface MissedPlan {
  // De ene kaart op Vandaag, of niets.
  item?: MissedItem;
  // Met Zelf overslaan: wat ASCEND nu op overgeslagen zet (met een melding en Ongedaan maken).
  autoSkip: MissedSession[];
}

// Een log van het horloge of MacroFactor (niet met de hand ingevuld) die nog nergens aan hangt.
const looseSourceLog = (l: SessionLog) => isLooseSourceLog(l);

// Vanzelf overslaan mag alleen wat de automatische planning ook zelf mag aanraken: geen test of
// wedstrijd, niets wat jij of een voorstel vastzette en niets van een vakantie of tocht. Gelezen zoals op
// de dag zelf (`lockLevel`).
function freeToSkip(m: MissedSession): boolean {
  return lockLevel(m.session, new Set(), m.session.scheduledDate) === 3 && !isTestOrRace(m.template) && !m.session.leave;
}

export interface LinkInput {
  plannedSessions: readonly PlannedSession[];
  logs: readonly SessionLog[];
  templates: readonly SessionTemplate[];
  today: string;
  // Paren `<logId>|<sessionId>` waarop je Liever niet zei.
  declined?: readonly string[];
}

// Welke log van het horloge of MacroFactor bij welke voorbije training zonder log kan horen: per log de
// dichtstbijzijnde training van dezelfde soort, bij gelijke afstand de eerdere. Sleutel: id van de training.
// De kaart op Vandaag en het inhaaladvies lezen allebei dit, zodat er eerst gekoppeld wordt en pas daarna
// ingehaald.
export function linkCandidates(input: LinkInput): Map<string, SessionLog> {
  const { today } = input;
  const declined = input.declined ?? [];
  const templateById = new Map(input.templates.map((t) => [t.id, t]));
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  const age = (s: PlannedSession) => daysBetween(s.scheduledDate, today);
  const unlogged = input.plannedSessions
    .filter((s) => s.status !== 'skipped' && !logged.has(s.id))
    .map((s) => ({ session: s, template: templateById.get(s.templateId) }))
    .filter((m): m is MissedSession => !!m.template && templateKind(m.template) !== undefined);
  const links = new Map<string, SessionLog>();
  const loose = input.logs.filter((l) => looseSourceLog(l) && l.completedDate <= today && daysBetween(l.completedDate, today) <= MISSED_MAX_AGE_DAYS + LINK_WINDOW_DAYS);
  for (const log of [...loose].sort((a, b) => a.completedAt.localeCompare(b.completedAt))) {
    const logTemplate = templateById.get(log.templateId);
    const near = unlogged
      .filter((m) => sameLinkKind(log, logTemplate, m.template))
      .map((m) => ({ m, d: Math.abs(daysBetween(log.completedDate, m.session.scheduledDate)) }))
      .filter((x) => x.d <= LINK_WINDOW_DAYS && !links.has(x.m.session.id))
      .sort((a, b) => a.d - b.d || a.m.session.scheduledDate.localeCompare(b.m.session.scheduledDate));
    const best = near[0]?.m;
    // Hoort de log het dichtst bij de training van vandaag of later, dan is er niets te vragen.
    if (!best || age(best.session) < 1) continue;
    if (declined.includes(declinedKey(log.id, best.session.id))) continue;
    links.set(best.session.id, log);
  }
  return links;
}

export function planMissed(input: MissedInput): MissedPlan {
  const { today, settings, illnessEpisodes } = input;
  // Ziek gemeld: de vragen wachten tot je beter bent, ook over een training van voor de ziekte. Daarna
  // komen ze terug, binnen dezelfde twee weken gerekend vanaf de training.
  if (activeIllness(illnessEpisodes)) return { autoSkip: [] };
  const memory = resolveMissedMemory(input.memory);
  const templateById = new Map(input.templates.map((t) => [t.id, t]));
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  const age = (s: PlannedSession) => daysBetween(s.scheduledDate, today);

  // Nog zonder log en niet overgeslagen, met een soort; dat kan bij een log horen.
  const unlogged = input.plannedSessions
    .filter((s) => s.status !== 'skipped' && !logged.has(s.id))
    .map((s) => ({ session: s, template: templateById.get(s.templateId) }))
    .filter((m): m is MissedSession => !!m.template && templateKind(m.template) !== undefined);

  // Voorbij (vandaag telt nog niet: die training kan nog komen), niet ouder dan twee weken, niet op een ziektedag en niet al in een ander voorstel.
  const open = unlogged
    .filter((m) => age(m.session) >= 1 && age(m.session) <= MISSED_MAX_AGE_DAYS)
    .filter((m) => !isIllnessDay(m.session.scheduledDate, illnessEpisodes, today) && !input.busy?.has(m.session.id))
    .sort((a, b) => a.session.scheduledDate.localeCompare(b.session.scheduledDate) || a.session.order - b.session.order || a.session.id.localeCompare(b.session.id));

  // Koppelen: eerst koppelen, dan vragen (en dan pas inhalen, engine/adviceEngine.ts#MISSED-CATCH-UP).
  const links = settings.link ? linkCandidates({ plannedSessions: input.plannedSessions, logs: input.logs, templates: input.templates, today, declined: memory.declined }) : new Map<string, SessionLog>();

  // Met een log die erbij kan horen komt geen vraag en niets vanzelf: eerst het koppelvoorstel.
  // Wat een vakantie of tocht neerzette, verplaatste of liet gaan (`leave`) gaat via zijn eigen weg: geen vraag en niets vanzelf.
  const due = open.filter((m) => !links.has(m.session.id) && age(m.session) >= settings.days && !memory.auto.includes(m.session.id) && !m.session.leave);
  const autoSkip = settings.choice === 'auto' ? due.filter(freeToSkip) : [];
  const autoIds = new Set(autoSkip.map((m) => m.session.id));
  const asks = settings.choice === 'off' ? [] : due.filter((m) => !autoIds.has(m.session.id) && !memory.notNow.includes(m.session.id));

  // Eén kaart tegelijk, de oudste training eerst. Na Niet nu vandaag niets meer.
  let item: MissedItem | undefined;
  if (memory.notNowOn !== today) {
    for (const m of open) {
      const log = links.get(m.session.id);
      if (log) { item = { kind: 'link', ...m, log }; break; }
      if (asks.includes(m)) { item = { kind: 'ask', ...m }; break; }
    }
  }
  return { item, autoSkip };
}

// --- woorden ---------------------------------------------------------------------------

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const fullDay = (iso: string) => `${weekdayLongNL(iso)} ${formatDateNL(iso)}`;
// Deze week alleen de dag ("dinsdag"), verder terug met de datum.
const nearDay = (iso: string, today: string) => (daysBetween(iso, today) < 7 ? weekdayLongNL(iso) : fullDay(iso));

// "Rustige duurloop van maandag 26 oktober".
export function askLine(session: PlannedSession, template: SessionTemplate): string {
  return `${template.name} van ${fullDay(session.scheduledDate)}`;
}

const fromMacroFactor = (log: SessionLog) => log.source === 'macrofactor' || !!log.externalId?.startsWith('macrofactor:');
const sourcePlace = (log: SessionLog) => (fromMacroFactor(log) ? 'in MacroFactor' : 'in je horloge');

// Het kopje van de koppelkaart: waar de log vandaan komt.
export function linkEyebrow(log: SessionLog): string {
  return fromMacroFactor(log) ? 'Van MacroFactor' : 'Van je horloge';
}

// "Je rustige duurloop van dinsdag staat op woensdag in je horloge. Hoort die bij elkaar?"
export function linkLine(session: PlannedSession, template: SessionTemplate, log: SessionLog, today: string): string {
  const where = log.completedDate === session.scheduledDate ? 'staat ook' : `staat op ${nearDay(log.completedDate, today)}`;
  return `Je ${lowerFirst(template.name)} van ${nearDay(session.scheduledDate, today)} ${where} ${sourcePlace(log)}. Hoort die bij elkaar?`;
}

// De melding na Zelf overslaan.
export function autoSkipNotice(skipped: readonly MissedSession[], days: number): { title: string; lines: string[]; why: string } {
  const title = skipped.length === 1 ? `${skipped[0].template.name} overgeslagen` : `${skipped.length} trainingen overgeslagen`;
  const lines = skipped.map((m) => `${askLine(m.session, m.template)} overgeslagen`);
  const why = `Je koos bij Training die niet doorging voor Zelf overslaan. Na ${days === 1 ? '1 dag' : `${days} dagen`} was er nog niets gelogd, dus zette ASCEND ${skipped.length === 1 ? 'hem' : 'ze'} op overgeslagen. Er is geen training verzonnen en je historie blijft zoals hij was. Met Ongedaan maken ${skipped.length === 1 ? 'staat hij' : 'staan ze'} weer open.`;
  return { title, lines, why };
}

// --- koppelen --------------------------------------------------------------------------

export interface LinkedLater {
  // Wanneer je Akkoord gaf op het koppelen.
  at: string;
}

export function validLinkedLater(v: unknown): v is LinkedLater {
  return typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>).at === 'string' && (v as { at: string }).at.length > 0;
}

// Alleen een log van het horloge of MacroFactor die nog nergens aan hing krijgt de verwijzing; verder
// blijft alles zoals het was. Een log die je zelf invulde koppel je zelf, dus nooit hier.
export function linkLog(log: SessionLog, sessionId: string, at: string): SessionLog | undefined {
  if (log.plannedSessionId || isHandLog(log)) return undefined;
  return { ...log, plannedSessionId: sessionId, linkedLater: { at } };
}

// Ongedaan maken: alleen wat het koppelen toevoegde gaat weg. Een log die vanaf het begin
// gekoppeld was, blijft zoals hij is.
export function unlinkLog(log: SessionLog): SessionLog {
  if (!log.linkedLater) return log;
  const { plannedSessionId: _id, linkedLater: _at, ...rest } = log;
  void _id;
  void _at;
  return rest as SessionLog;
}
