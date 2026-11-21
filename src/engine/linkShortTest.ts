// ASCEND: wat een koppeling achteraf doet met de korte test van de week (backlog I-95, Warden 20 november).
//
// Per week telt de vroegste geldige korte test van een loop die aan een geplande training hangt
// (shortTest.ts#countedShortTests, besluit 2026-11-20-korte-test-rest.md). Koppel je een losse loop met een
// teststuk aan een geplande training en liep je die eerder in de week dan de test die nu telt, dan telt na
// Akkoord die losse loop en de latere niet meer. Het koppelvoorstel op Vandaag zegt dat vooraf.
//
// Geen eigen regel: dezelfde lezing (shortTestsFound) en dezelfde telling (countedShortTests) als het
// logblad, één keer met de logs zoals ze zijn en één keer met de koppeling erbij (missedTraining.ts#linkLog).
// Alleen lezen: geen log verandert hier, en er wordt niets bewaard.
//
// Puur: geen React, geen opslag.

import type { SessionLog } from '../models/training';
import type { StreamSet } from '../models/activityDetail';
import type { ShortTestSeries } from '../models/shortTest';
import type { NoStrapChoice } from './thresholdEstimate';
import { countedShortTests, seriesPace, shortTestLogIds, shortTestsFound } from './shortTest';
import { linkLog, nearDay } from './missedTraining';
import { mondayOfWeek } from '../utils/dates';

export interface LinkShortTestInput {
  // De losse log van het voorstel en de geplande training waar hij aan komt te hangen.
  log: SessionLog;
  sessionId: string;
  logs: readonly SessionLog[];
  series: ShortTestSeries | undefined;
}

// De logs zoals ze na Akkoord zijn, alleen die van de week van de losse loop (op de dag van het log).
function weekAfterLink(input: LinkShortTestInput): { after: SessionLog[]; ids: string[] } | undefined {
  if (seriesPace(input.series) === undefined) return undefined;
  const linked = linkLog(input.log, input.sessionId, input.log.completedAt || input.log.completedDate);
  if (!linked) return undefined;
  const week = mondayOfWeek(input.log.completedDate);
  const after = input.logs.filter((l) => mondayOfWeek(l.completedDate) === week).map((l) => (l.id === linked.id ? linked : l));
  const ids = shortTestLogIds(after, input.series);
  // De losse loop zelf kan geen korte test hebben: geen rustige loop, ingekort, of van voor de reeks.
  const at = ids.indexOf(linked.id);
  if (at < 0) return undefined;
  // Zonder gekoppelde rustige loop later in de week (shortTestLogIds geeft alleen gekoppelde lopen, op dag,
  // klok en id) is er geen
  // test die kan verschuiven: dan is er niets te lezen en hoeft het voorstel nergens op te wachten.
  return at < ids.length - 1 ? { after, ids } : undefined;
}

// De logs waarvan de reeks gelezen moet worden om het te weten; leeg als er niets kan verschuiven. Alleen
// met een niet-lege lijst wacht de koppelkaart op de lezing.
export function linkShortTestLogIds(input: LinkShortTestInput): string[] {
  return weekAfterLink(input)?.ids ?? [];
}

// De test die nu telt en na de koppeling niet meer.
export interface LinkShortTestShift {
  logId: string;
  date: string;
  // Op dezelfde dag als de losse loop, later op de klok.
  sameDay: boolean;
}

// Verandert deze koppeling welke korte test van de week telt? Alleen als de losse loop na Akkoord zelf de
// test van de week wordt en er nu een andere telt. Undefined als er niets verschuift, ook als de reeksen
// ontbreken: zonder reeks is er geen teststuk te zien.
export function linkShortTestShift(input: LinkShortTestInput & { streams: ReadonlyMap<string, StreamSet>; noStrap?: NoStrapChoice; strapWorn?: readonly string[] }): LinkShortTestShift | undefined {
  const week = weekAfterLink(input);
  if (!week) return undefined;
  const found = shortTestsFound(week.after, week.ids, input.streams, { paceSecKm: seriesPace(input.series)!, noStrap: input.noStrap, strapWorn: input.strapWorn });
  // Alles hier is één week, dus hoogstens één test telt.
  const counts = (logs: readonly SessionLog[]) => countedShortTests(found, logs).find((r) => r.valid);
  const now = counts(input.logs);
  const then = counts(week.after);
  if (!now || !then || then.logId !== input.log.id || now.logId === input.log.id) return undefined;
  return { logId: now.logId, date: now.date, sameDay: now.date === input.log.completedDate };
}

// Wat de koppelkaart over de korte test weet. `busy`: de reeksen worden nog gelezen, de knoppen staan uit.
// `line`: de zin staat erbij. `none`: niets te zeggen. Na de lezing nooit meer `busy`, ook niet als hij
// mislukte of zijn grens haalde.
export type LinkShortTestState = { stand: 'busy' } | { stand: 'line'; line: string } | { stand: 'none' };

// De lezing van de reeksen: undefined zolang hij loopt; `complete` false bij een fout of de tijdgrens.
export interface LinkShortTestRead {
  streams: ReadonlyMap<string, StreamSet>;
  complete: boolean;
}

export function linkShortTestState(
  input: (LinkShortTestInput & { noStrap?: NoStrapChoice; strapWorn?: readonly string[] }) | undefined,
  read: LinkShortTestRead | undefined,
  today: string,
): LinkShortTestState {
  if (!input || linkShortTestLogIds(input).length === 0) return { stand: 'none' };
  if (!read) return { stand: 'busy' };
  // Niet alles gelezen: geen uitspraak over een teststuk dat niet te zien is.
  const line = read.complete ? linkShortTestLine(linkShortTestShift({ ...input, streams: read.streams }), today) : undefined;
  return line ? { stand: 'line', line } : { stand: 'none' };
}

// De ene zin in het koppelvoorstel. "Korte test" is het woord van het logblad en de Briefing.
export function linkShortTestLine(shift: LinkShortTestShift | undefined, today: string): string | undefined {
  if (!shift) return undefined;
  const day = shift.date === today ? 'vandaag' : nearDay(shift.date, today);
  return `Je ${shift.sameDay ? 'latere ' : ''}korte test van ${day} telt dan niet meer, die uit deze loop wel.`;
}
