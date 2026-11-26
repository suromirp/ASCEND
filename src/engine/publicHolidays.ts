// ASCEND: feestdagen als voorstel (docs/beslissingen/2026-11-26-feestdagen-als-voorstel.md).
//
// Een officiële feestdag binnen de horizon van je planning, op een dag zonder periode, wordt één
// voorstel: zet hem als vrije dag. Akkoord loopt door precies dezelfde weg als zelf een vrije dag
// toevoegen (engine/leaveProposal.ts#planLeaveChange, state/bodyAndLeave.ts#applyLeave): de planning
// verandert alleen daar, met het voorbeeld en Ongedaan maken van die weg. Liever niet onthoudt het
// voor die ene feestdag (utils/holidayDeclines.ts). Dit bestand kiest alleen welke feestdag en met
// welke woorden; het plant niets.
//
// Puur: geen React, geen IndexedDB, geen netwerk.

import type { LeavePeriod } from '../models/leave';
import type { PublicHoliday } from '../models/publicHoliday';
import { weekdayLongNL, weekdayShortNL } from '../utils/dates';

// De landen die je kunt kiezen, met de naam in het Nederlands. Nederland is het advies.
export const HOLIDAY_COUNTRIES = [
  { value: 'NL', label: 'Nederland' },
  { value: 'BE', label: 'België' },
  { value: 'DE', label: 'Duitsland' },
  { value: 'LU', label: 'Luxemburg' },
  { value: 'FR', label: 'Frankrijk' },
  { value: 'GB', label: 'Verenigd Koninkrijk' },
  { value: 'AT', label: 'Oostenrijk' },
  { value: 'CH', label: 'Zwitserland' },
  { value: 'IT', label: 'Italië' },
  { value: 'ES', label: 'Spanje' },
] as const;
export type HolidayCountry = (typeof HOLIDAY_COUNTRIES)[number]['value'];
export const HOLIDAY_COUNTRY_ADVICE: HolidayCountry = 'NL';

// Leest defensief: een back-up kan van een oudere of beschadigde versie zijn.
export function resolveHolidayCountry(raw: unknown): HolidayCountry {
  return HOLIDAY_COUNTRIES.find((c) => c.value === raw)?.value ?? HOLIDAY_COUNTRY_ADVICE;
}
export const holidayCountryLabel = (code: string): string => HOLIDAY_COUNTRIES.find((c) => c.value === code)?.label ?? code;

// Feestdagen voorstellen: aan als advies. Alleen een uitgezette schakelaar is uit.
export const resolveHolidayOffers = (raw: unknown): boolean => raw !== false;

// Wat het toestel per land en jaar bewaart (storage/publicHolidays.ts).
export interface HolidayYear {
  country: string;
  year: number;
  fetchedAt: string;
  holidays: PublicHoliday[];
}

// Eens per jaar per land; vanaf december ook het volgende jaar, zodat de feestdagen rond de
// jaarwisseling er al zijn voor je ze tegenkomt.
export function holidayYearsFor(today: string): number[] {
  const year = Number(today.slice(0, 4));
  return today.slice(5, 7) === '12' ? [year, year + 1] : [year];
}

export function holidayYearsDue(cache: readonly HolidayYear[], country: string, today: string): number[] {
  return holidayYearsFor(today).filter((year) => !cache.some((c) => c.country === country && c.year === year));
}

// De horizon van je planning: de laatste dag waar iets gepland staat. Zonder planning geen voorstel.
export function planHorizonEnd(sessions: readonly { scheduledDate: string }[]): string | undefined {
  let end: string | undefined;
  for (const s of sessions) if (!end || s.scheduledDate > end) end = s.scheduledDate;
  return end;
}

export interface HolidayOffer {
  // Eén id per feestdag (land en datum): na Liever niet komt alleen een andere feestdag terug.
  id: string;
  date: string;
  name: string;
  country: string;
}

export const holidayOfferId = (h: Pick<PublicHoliday, 'country' | 'date'>): string => `feestdag:${h.country}:${h.date}`;

const inPeriod = (date: string, periods: readonly LeavePeriod[]) => periods.some((p) => p.startDate <= date && p.endDate >= date);

export interface HolidayOfferInput {
  holidays: readonly PublicHoliday[];
  country: string;
  today: string;
  // De laatste geplande dag (planHorizonEnd).
  horizonEnd: string | undefined;
  // Alle periodes zoals bewaard: op een dag met een periode (vrije dagen, vakantie, tocht, zonder
  // sportschool) komt geen voorstel.
  periods: readonly LeavePeriod[];
  declined: readonly string[];
  enabled: boolean;
}

// De eerstvolgende feestdag om voor te stellen, vandaag meegeteld; anders niets. Steeds één tegelijk.
export function holidayOffer(input: HolidayOfferInput): HolidayOffer | undefined {
  if (!input.enabled || !input.horizonEnd) return undefined;
  const declined = new Set(input.declined);
  const next = [...input.holidays]
    .filter((h) => h.country === input.country && h.date >= input.today && h.date <= input.horizonEnd!)
    .filter((h) => !inPeriod(h.date, input.periods) && !declined.has(holidayOfferId(h)))
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return next ? { id: holidayOfferId(next), date: next.date, name: next.name, country: next.country } : undefined;
}

// De vrije dag die Akkoord bewaart: precies wat je zelf zou toevoegen, met de naam als notitie.
export function holidayPeriod(offer: HolidayOffer, id: string): LeavePeriod {
  return { id, kind: 'free_days', startDate: offer.date, endDate: offer.date, note: offer.name };
}

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const SHORT_MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const yearOf = (date: string, today: string) => (date.slice(0, 4) === today.slice(0, 4) ? '' : ` ${date.slice(0, 4)}`);

// "Maandag 6 april is Tweede Paasdag. Zet hem als vrije dag?"
export function holidayOfferTitle(offer: Pick<HolidayOffer, 'date' | 'name'>, today: string): string {
  const day = `${capital(weekdayLongNL(offer.date))} ${Number(offer.date.slice(8, 10))} ${MONTHS[Number(offer.date.slice(5, 7)) - 1]}${yearOf(offer.date, today)}`;
  return `${day} is ${offer.name}. Zet hem als vrije dag?`;
}

// Wat er dan gebeurt, klein onder de vraag.
export const HOLIDAY_OFFER_LINE = 'Een vrije dag haalt geen training weg. Past het in je week, dan kan er een lange wandeling komen. Hieronder zie je wat er verandert.';
export const HOLIDAY_OFFER_EMPTY = 'Je planning hoeft niet te veranderen. Met Akkoord staat de feestdag als vrije dag bij je periodes en houden voorstellen er rekening mee.';

// De rij in Week onder de dagen: "Tweede Paasdag · ma 6 apr".
export function holidayRow(offer: Pick<HolidayOffer, 'date' | 'name'>, today: string): { title: string; sub: string } {
  const day = `${weekdayShortNL(offer.date).toLowerCase()} ${Number(offer.date.slice(8, 10))} ${SHORT_MONTHS[Number(offer.date.slice(5, 7)) - 1]}${yearOf(offer.date, today)}`;
  return { title: `${offer.name} · ${day}`, sub: 'Als vrije dag zetten?' };
}

// Stil in Week: de naam van een feestdag op een dag zonder periode (wat een vrije dag werd, staat al
// als periode op zijn dag). Uit staat, dan niets.
export function quietHolidays(input: { holidays: readonly PublicHoliday[]; country: string; periods: readonly LeavePeriod[]; enabled: boolean }): Map<string, string> {
  const out = new Map<string, string>();
  if (!input.enabled) return out;
  for (const h of input.holidays) if (h.country === input.country && !inPeriod(h.date, input.periods)) out.set(h.date, h.name);
  return out;
}

// De uitkomst van het ophalen in één regel, voor Instellingen en het blad Vrije dagen en vakanties. Een mislukte
// poging is nooit stil; uit staat geeft geen regel.
export interface HolidayOutcome {
  status: 'off' | 'ready' | 'fetched' | 'failed';
  failure?: 'offline' | 'timeout' | 'failed';
  holidays: readonly unknown[];
}

export function holidayStatusLine(r: HolidayOutcome, country: string, busy = false): string | undefined {
  if (r.status === 'off') return undefined;
  const land = holidayCountryLabel(country);
  if (r.status === 'failed') {
    const why = r.failure === 'offline' ? 'lukte niet zonder verbinding' : r.failure === 'timeout' ? 'duurde te lang' : 'lukte niet';
    return `Feestdagen ophalen ${why}. Bij de volgende keer openen probeert ASCEND het opnieuw.`;
  }
  if (busy && r.holidays.length === 0) return `Feestdagen van ${land} ophalen.`;
  return r.holidays.length > 0 ? `De feestdagen van ${land} staan op dit toestel.` : `Nog geen feestdagen van ${land} op dit toestel.`;
}

// Alleen in het blad Vrije dagen en vakanties: daar zegt de regel alleen iets als het misging.
export const holidayFailureLine = (r: HolidayOutcome, country: string): string | undefined => (r.status === 'failed' ? holidayStatusLine(r, country) : undefined);
