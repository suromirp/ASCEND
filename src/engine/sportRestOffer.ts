// ASCEND: een voorstel na een zware sport blijft tot je kiest (I-23 punt 10, docs/visie/Ontwerp Losse sport.md,
// Ontwerp 10). Het voorstel zelf ("Je speelde gisteren padel. Benen B staat er vlak na.") wordt nog steeds afgeleid
// (engine/weekConcerns.ts, engine/weekFixProposal.ts); hier staat alleen wat ervan bewaard blijft, zodat het nooit
// zonder keuze en zonder spoor verdwijnt.
//
// Opslag: `AppSettings.sportRestOffers`, alleen toevoegen. Eén regel per aanleiding met de vaste id
// `sportrest:<logId>:<sessionId>` op de dag dat je het voorstel zag, later een tweede regel met de uitkomst:
// akkoord, liever niet of vervallen. De laatste regel per id geldt; een regel wordt nooit omgeschreven. Ouder dan 30
// dagen valt bij het lezen weg. Klaar is nooit een vlag: of je koos, lees je af aan de laatste regel.
//
// Puur: geen React, geen IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { PlanChangeProposal } from '../models/planChange';
import { addDays, daysBetween, weekdayLongNL } from '../utils/dates';
import { anySportDefinition } from '../data/sports';
import { sportOfLog } from './sportOfLog';
import { isSportLogSession, sportLogIdOf } from './sportDays';
import type { Advice } from './adviceEngine';
import type { WeekConcern } from './weekConcerns';

export type SportRestState = 'shown' | 'accepted' | 'declined' | 'lapsed';
const STATES: readonly SportRestState[] = ['shown', 'accepted', 'declined', 'lapsed'];

export interface SportRestOffer {
  id: string;
  state: SportRestState;
  // De dag van deze regel: bij 'shown' de dag dat je het voorstel voor het eerst zag.
  date: string;
  // Het moment van schrijven.
  at: string;
  // Alleen op de eerste regel: wat de zin nodig heeft als de melding er niet meer is.
  sport?: string;
  sessionDate?: string;
}

export const SPORT_REST_MAX_AGE_DAYS = 30;
const PREFIX = 'sportrest:';
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const sportRestOfferId = (logId: string, sessionId: string): string => `${PREFIX}${logId}:${sessionId}`;
// Het log en de training uit de id; een id van een training heeft geen dubbele punt, een log-id mogelijk wel.
function partsOf(id: string): { logId: string; sessionId: string } {
  const rest = id.slice(PREFIX.length);
  const cut = rest.lastIndexOf(':');
  return cut <= 0 ? { logId: '', sessionId: '' } : { logId: rest.slice(0, cut), sessionId: rest.slice(cut + 1) };
}

// "Voorstel na een zware sport": Blijft tot je kiest (het advies) of Vervalt vanzelf (zoals eerst).
export type SportRestKeep = 'blijft' | 'vanzelf';
export const SPORT_REST_KEEP_ADVICE: SportRestKeep = 'blijft';
export function resolveSportRestKeep(raw: unknown): SportRestKeep {
  return raw === 'vanzelf' ? 'vanzelf' : SPORT_REST_KEEP_ADVICE;
}

// Defensief lezen, ook voor een import: een kapotte regel valt weg en telt mee in `skipped`. Met `today` valt ook
// alles weg wat ouder is dan 30 dagen. De volgorde blijft die van de lijst, want de laatste regel per id geldt.
export function parseSportRestOffers(raw: unknown, today?: string): { list: SportRestOffer[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  const list: SportRestOffer[] = [];
  let skipped = 0;
  for (const item of raw) {
    const r = typeof item === 'object' && item !== null && !Array.isArray(item) ? (item as Record<string, unknown>) : undefined;
    if (
      !r ||
      typeof r.id !== 'string' || !r.id.startsWith(PREFIX) || r.id.length > 200 ||
      !STATES.includes(r.state as SportRestState) ||
      typeof r.date !== 'string' || !ISO_DAY.test(r.date) ||
      typeof r.at !== 'string' || r.at.length === 0
    ) {
      skipped++;
      continue;
    }
    if (today && daysBetween(r.date, today) > SPORT_REST_MAX_AGE_DAYS) continue;
    const row: SportRestOffer = { id: r.id, state: r.state as SportRestState, date: r.date, at: r.at };
    if (typeof r.sport === 'string' && r.sport.length > 0 && r.sport.length <= 40) row.sport = r.sport;
    if (typeof r.sessionDate === 'string' && ISO_DAY.test(r.sessionDate)) row.sessionDate = r.sessionDate;
    list.push(row);
  }
  return { list, skipped };
}

// Een regel die er al staat (dezelfde id en dezelfde stand) komt er niet nog eens bij: twee tabbladen die
// tegelijk hetzelfde zien, schrijven één regel.
export function appendRows(list: readonly SportRestOffer[] | undefined, rows: readonly SportRestOffer[]): SportRestOffer[] {
  const out = [...(list ?? [])];
  for (const row of rows) if (!out.some((r) => r.id === row.id && r.state === row.state)) out.push(row);
  return out;
}

// De laatste regel per id: die geldt. De eerste regel heeft de sport en de beendag.
export function lastRows(list: readonly SportRestOffer[]): Map<string, SportRestOffer> {
  const out = new Map<string, SportRestOffer>();
  for (const r of list) out.set(r.id, r);
  return out;
}
function firstRows(list: readonly SportRestOffer[]): Map<string, SportRestOffer> {
  const out = new Map<string, SportRestOffer>();
  for (const r of list) if (!out.has(r.id)) out.set(r.id, r);
  return out;
}

// Een melding van Week over een sport die je deed en een zware beendag erna.
export interface LiveSportRest {
  id: string;
  logId: string;
  sessionId: string;
  sport: string;
  sessionDate: string;
  concern: WeekConcern;
}

export function liveSportRests(concerns: readonly WeekConcern[], sessions: readonly PlannedSession[], logs: readonly SessionLog[]): LiveSportRest[] {
  const out: LiveSportRest[] = [];
  for (const c of concerns) {
    if (c.plain || c.rule !== 'LEG-SPACING' || !c.finding.fromSport) continue;
    const ids = c.finding.sessionIds;
    const sportId = ids.find(isSportLogSession);
    const sessionId = ids.find((id) => !isSportLogSession(id));
    const logId = sportId && sportLogIdOf(sportId);
    const log = logId ? logs.find((l) => l.id === logId) : undefined;
    const session = sessionId ? sessions.find((s) => s.id === sessionId) : undefined;
    const sport = log ? sportOfLog(log).countedSport : undefined;
    if (!logId || !session || !sport) continue;
    out.push({ id: sportRestOfferId(logId, session.id), logId, sessionId: session.id, sport: anySportDefinition(sport).label.toLowerCase(), sessionDate: session.scheduledDate, concern: c });
  }
  return out;
}

// Week zag het voorstel: de eerste regel, alleen voor een aanleiding zonder regel.
export function shownRows(list: readonly SportRestOffer[], live: readonly LiveSportRest[], today: string, now: string): SportRestOffer[] {
  const known = new Set(list.map((r) => r.id));
  return live.filter((l) => !known.has(l.id)).map((l) => ({ id: l.id, state: 'shown' as const, date: today, at: now, sport: l.sport, sessionDate: l.sessionDate }));
}

// Koos je in Week (Akkoord of Liever niet op het voorstel daar), dan telt dat ook hier. Het id van een weekvoorstel
// noemt de trainingen van de melding (engine/weekFixProposal.ts#weekFixId): `weekfix:LEG-SPACING:<ids>:<dagen>`.
export type AnswerMap = Readonly<Record<string, { response: string; at: string }>>;
export function weekAnswerOf(offerId: string, answers: AnswerMap): { response: 'accepted' | 'declined'; at: string } | undefined {
  const { logId, sessionId } = partsOf(offerId);
  if (!logId || !sessionId) return undefined;
  let found: { response: 'accepted' | 'declined'; at: string } | undefined;
  for (const [key, answer] of Object.entries(answers)) {
    if (!key.startsWith('weekfix:LEG-SPACING:')) continue;
    const rest = key.slice('weekfix:LEG-SPACING:'.length);
    const ids = rest.slice(0, rest.lastIndexOf(':')).split(',');
    if (!ids.includes(`sportlog:${logId}`) || !ids.includes(sessionId)) continue;
    if (answer.response !== 'accepted' && answer.response !== 'declined') continue;
    if (!found || answer.at > found.at) found = { response: answer.response, at: answer.at };
  }
  return found;
}

// Een voorstel dat nog open staat (de laatste regel is 'shown').
function open(list: readonly SportRestOffer[]): SportRestOffer[] {
  const first = firstRows(list);
  return [...lastRows(list).values()].filter((r) => r.state === 'shown').map((r) => first.get(r.id) ?? r);
}

// Wat Week je al liet kiezen, als regel in de lijst (zodat het spoor compleet is).
// `at` is het moment van schrijven, niet dat van je antwoord in Week: koos je in Week voordat de eerste regel er
// stond, dan zou de keuze bij terugzetten (gesorteerd op `at`) voor die regel komen en het voorstel weer openen.
export function weekAnswerRows(list: readonly SportRestOffer[], answers: AnswerMap, today: string, now: string): SportRestOffer[] {
  const out: SportRestOffer[] = [];
  for (const r of open(list)) {
    const answer = weekAnswerOf(r.id, answers);
    if (answer) out.push({ id: r.id, state: answer.response, date: today, at: now > r.at ? now : r.at });
  }
  return out;
}

// De keuze die je op Vandaag maakt: een nieuwe regel, nooit een oude omgeschreven.
export function answerRow(id: string, state: 'accepted' | 'declined' | 'lapsed', today: string, now: string): SportRestOffer {
  return { id, state, date: today, at: now };
}

export interface LapsedSportRest {
  id: string;
  line: string;
}

const dayWord = (date: string, today: string): string => {
  const ago = daysBetween(date, today);
  return ago === 1 ? 'gisteren' : ago === 2 ? 'eergisteren' : `op ${weekdayLongNL(date)}`;
};

// "Je voorstel na padel is vervallen. Benen B was gisteren."
export function lapsedLine(sport: string, name: string, sessionDate: string, today: string): string {
  return `Je voorstel na ${sport} is vervallen. ${name} was ${dayWord(sessionDate, today)}.`;
}

// Een voorstel dat open stond terwijl de beendag voorbij ging, zonder dat je koos. Niet als je de training zelf
// verplaatste of oversloeg (dat is een keuze), en niet als je in Week of in de ochtend (Lichter) al koos.
export function lapsedSportRests(input: {
  list: readonly SportRestOffer[];
  sessions: readonly PlannedSession[];
  // Klaar is geen vlag: een gedane training staat nog op zijn dag met status planned; alleen een log zegt het.
  logs: readonly SessionLog[];
  templates: readonly SessionTemplate[];
  today: string;
  answers?: AnswerMap;
  // Je koos die ochtend al (Lichter of Liever niet bij vermoeide benen, engine/legDayEase.ts).
  choseOn?: (date: string, sessionId: string) => boolean;
}): LapsedSportRest[] {
  const out: LapsedSportRest[] = [];
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  for (const r of open(input.list)) {
    const { sessionId } = partsOf(r.id);
    const session = input.sessions.find((s) => s.id === sessionId);
    if (!session || !r.sessionDate || !r.sport) continue;
    if (logged.has(session.id)) continue;
    if (session.scheduledDate !== r.sessionDate || session.status === 'skipped') continue;
    if (r.sessionDate >= input.today) continue;
    if (input.answers && weekAnswerOf(r.id, input.answers)) continue;
    if (input.choseOn?.(r.sessionDate, session.id)) continue;
    const name = input.templates.find((t) => t.id === session.templateId)?.name ?? 'De training';
    out.push({ id: r.id, line: lapsedLine(r.sport, name, r.sessionDate, input.today) });
  }
  return out;
}

// Het voorstel op Vandaag, op de beendag zelf.
export interface TodaySportRest {
  id: string;
  line: string;
  advice: Advice;
  proposal: PlanChangeProposal;
}

const gapWords = (gap: number): string => (gap === 1 ? 'een dag na' : gap === 2 ? 'twee dagen na' : gap === 3 ? 'drie dagen na' : 'vlak na');

// "Benen B vandaag, een dag na je voetbal. Een dag later?" Gaat het voorstel naar een andere dag dan morgen, dan
// noemt de vraag die dag: de zin belooft nooit iets anders dan Akkoord doet.
export function todayOfferLine(name: string, sport: string, gap: number, today: string, to: string): string {
  const ask = to === addDays(today, 1) ? 'Een dag later?' : `Naar ${weekdayLongNL(to)}?`;
  return `${name} vandaag, ${gapWords(gap)} je ${sport}. ${ask}`;
}

// Alleen als de training vandaag staat, niet gedaan is en het voorstel van Week hem naar een latere dag zet.
// Liever niet, Akkoord of vervallen: niet opnieuw. Koos je in Week of in de ochtend al, dan ook niet.
export function todaySportRest(input: {
  live: readonly LiveSportRest[];
  list: readonly SportRestOffer[];
  sessions: readonly PlannedSession[];
  logs: readonly SessionLog[];
  templates: readonly SessionTemplate[];
  today: string;
  fixFor: (live: LiveSportRest) => Advice | null;
  answers?: AnswerMap;
  choseOn?: (date: string, sessionId: string) => boolean;
  // Een voorstel op Vandaag dat deze training al raakt (Lichter, inhalen): dan wacht dit.
  taken?: ReadonlySet<string>;
}): TodaySportRest | undefined {
  const last = lastRows(input.list);
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  for (const l of input.live) {
    if (l.sessionDate !== input.today || logged.has(l.sessionId)) continue;
    const row = last.get(l.id);
    if (row && row.state !== 'shown') continue;
    if (input.answers && weekAnswerOf(l.id, input.answers)) continue;
    if (input.choseOn?.(input.today, l.sessionId) || input.taken?.has(l.sessionId)) continue;
    const fix = input.fixFor(l);
    const options = fix ? [...(fix.options ?? []), ...(fix.proposal ? [{ proposal: fix.proposal, effect: fix.effect }] : [])] : [];
    const pick = options
      .map((o) => ({ o, move: o.proposal.changes.find((c) => c.action === 'move' && c.plannedSessionId === l.sessionId && !!c.toDate && c.toDate > input.today) }))
      .filter((x) => x.move && x.o.proposal.changes.every((c) => c.action !== 'remove'))
      .sort((a, b) => a.move!.toDate!.localeCompare(b.move!.toDate!))[0];
    if (!fix || !pick) continue;
    const session = input.sessions.find((s) => s.id === l.sessionId);
    const log = input.logs.find((x) => x.id === l.logId);
    const name = input.templates.find((t) => t.id === session?.templateId)?.name ?? 'Je training';
    const gap = log ? daysBetween(log.completedDate, input.today) : 0;
    const { options: _o, ...rest } = fix;
    void _o;
    return {
      id: l.id,
      line: todayOfferLine(name, l.sport, gap, input.today, pick.move!.toDate!),
      advice: { ...rest, proposal: pick.o.proposal, effect: pick.o.effect },
      proposal: pick.o.proposal,
    };
  }
  return undefined;
}

// Rijen ouder dan 30 dagen vallen weg; de rest blijft in volgorde.
export function pruneOld(list: readonly SportRestOffer[], today: string): SportRestOffer[] {
  return list.filter((r) => daysBetween(r.date, today) <= SPORT_REST_MAX_AGE_DAYS);
}

// Samenvoegen bij het terugzetten van een back-up: alleen nieuwe regels komen erbij (`onlyNew`), wat op het toestel
// staat blijft zoals het is. Gesorteerd op moment, zodat de laatste regel per id de nieuwste is.
export function mergeSportRestOffers(current: readonly SportRestOffer[] | undefined, incoming: readonly SportRestOffer[] | undefined): SportRestOffer[] {
  // Bij hetzelfde moment gaat de eerste regel (shown) voor een keuze: een keuze opent het voorstel nooit opnieuw.
  const first = (r: SportRestOffer) => (r.state === 'shown' ? 0 : 1);
  return appendRows(current, incoming ?? []).map((r, i) => ({ r, i })).sort((a, b) => a.r.at.localeCompare(b.r.at) || first(a.r) - first(b.r) || a.i - b.i).map((x) => x.r);
}
