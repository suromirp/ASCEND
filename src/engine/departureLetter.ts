// ASCEND — de vertrekbrief: een leesbare tekst voor thuis, samengesteld uit
// het etappeplan en de afspraak die de gebruiker zelf heeft ingevuld.
//
// Puur: geen React, geen opslag. De brief bevat alleen wat de gebruiker
// invulde en wat in het plan staat; er staat geen persoonsgegeven in de
// code. Hij is een afspraak en een brief, geen alarmsysteem: de app
// alarmeert niemand (docs/visie/GR5-reis en coaching.md, idee 6).

import { SLEEP_LABEL, type SoloPlan } from '../models/routePlan';
import { weekdayShortNL, formatDateNL } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { itineraryTotals, type ItineraryDay } from './routePlan';

export const EMERGENCY_NUMBER = '112';
export const SMS_FALLBACK_NUMBER = '114';

const weekday = (iso: string) => weekdayShortNL(iso).toLowerCase();
// "2 augustus" zonder jaartal, voor de dagenlijst; het jaar staat bij start en aankomst.
const short = (iso: string) => formatDateNL(iso).replace(/ \d{4}$/, '');

function dayLine(day: ItineraryDay): string {
  const when = day.date ? `${weekday(day.date)} ${short(day.date)}` : `Dag ${day.dayNumber}`;
  if (day.kind === 'rest') {
    return `${when}: rustdag in ${day.to}${day.sleep ? `, slaapplek: ${SLEEP_LABEL[day.sleep].toLowerCase()}` : ''}`;
  }
  const route = day.stages.length === 2 ? `${day.from} naar ${day.to} (via ${day.stages[0].to})` : `${day.from} naar ${day.to}`;
  const size = `${formatNumberNL(day.km, 1)} km, ${formatNumberNL(day.up, 0)} m omhoog`;
  const bed = day.sleep ? `slaapplek: ${SLEEP_LABEL[day.sleep].toLowerCase()}` : 'slaapplek nog niet gekozen';
  return `${when}: ${route} (${size}), ${bed}`;
}

// Wat er nog ontbreekt voor een complete brief, in gewone woorden.
export function letterGaps(solo: SoloPlan, days: ItineraryDay[]): string[] {
  const gaps: string[] = [];
  if (!solo.who.trim()) gaps.push('voor wie de brief is');
  if (!solo.checkInTime) gaps.push('hoe laat je elke dag een bericht stuurt');
  if (!solo.ifMissing.trim()) gaps.push('wat thuis doet als je bericht uitblijft');
  if (!solo.satellite) gaps.push('of je een satellietcommunicator meeneemt');
  if (!solo.gear.trim()) gaps.push('hoe men jou en je tent herkent');
  const walking = days.filter((d) => d.kind === 'walk');
  if (!walking[0]?.date) gaps.push('de startdatum van je tocht');
  if (walking.some((d) => !d.sleep)) gaps.push('een slaapplek bij elke dag');
  return gaps;
}

function satelliteLine(solo: SoloPlan): string {
  const note = solo.satelliteNote.trim();
  if (solo.satellite === 'ja') return `Ik heb een satellietcommunicator bij me${note ? `: ${note}` : ''}. Daarmee kan ik ook zonder mobiel bereik een bericht sturen of om hulp vragen.`;
  if (solo.satellite === 'nee') return `Ik heb geen satellietcommunicator bij me${note ? ` (${note})` : ''}. In dalen zonder bereik hoor je soms een dag niets van me. Daarom hebben we de afspraak hierboven.`;
  if (solo.satellite === 'nog-niet') return `Of ik een satellietcommunicator meeneem, is nog niet beslist${note ? ` (${note})` : ''}. Ik laat het je weten voor ik vertrek.`;
  return 'Of ik een satellietcommunicator meeneem, vul ik nog in.';
}

export function buildDepartureLetter(days: ItineraryDay[], solo: SoloPlan): string {
  const walking = days.filter((d) => d.kind === 'walk');
  const totals = itineraryTotals(days);
  const first = walking[0];
  const last = walking[walking.length - 1];
  const out: string[] = [];

  out.push(solo.who.trim() ? `Hoi ${solo.who.trim()},` : 'Hoi,');
  out.push('');
  out.push('Dit is mijn vertrekbrief voor de GR5, de Grande Traversée des Alpes, van het Meer van Genève naar Nice. Ik loop alleen en grotendeels met tent.');
  out.push('');

  out.push('ROUTE');
  if (first?.date && last?.date) {
    out.push(`Ik start op ${weekday(first.date)} ${formatDateNL(first.date)} in ${first.from} en kom aan in ${last.to} op ${weekday(last.date)} ${formatDateNL(last.date)}.`);
  } else {
    out.push(`Ik start in ${first?.from ?? 'Saint-Gingolph'} en kom aan in ${last?.to ?? 'Nice'}. De datums volgen nog.`);
  }
  out.push(`In totaal ${totals.walkDays} loopdagen en ${totals.restDays} ${totals.restDays === 1 ? 'rustdag' : 'rustdagen'}, ongeveer ${formatNumberNL(totals.km, 0)} km${totals.incomplete ? ' (een paar gegevens ontbreken bij de officiële site)' : ''}.`);
  out.push('');

  out.push('PLANNING EN SLAAPPLEKKEN');
  out.push('Dit is het plan. Onderweg kan het verschuiven door weer, conditie of volle plekken.');
  for (const day of days) out.push(`- ${dayLine(day)}`);
  out.push('');

  out.push('UITRUSTING EN HERKENNING');
  out.push(solo.gear.trim() || 'Nog in te vullen.');
  out.push('');

  out.push('ONZE AFSPRAAK');
  out.push(solo.checkInTime ? `Elke dag rond ${solo.checkInTime} stuur ik je een bericht dat het goed gaat en waar ik slaap.` : 'Het tijdstip van mijn dagelijkse bericht volgt nog.');
  out.push(solo.ifMissing.trim() ? `Komt mijn bericht niet: ${solo.ifMissing.trim()}` : 'Wat je doet als mijn bericht uitblijft, spreken we nog af.');
  out.push('');

  out.push('SATELLIET');
  out.push(satelliteLine(solo));
  out.push('');

  out.push('ALARM');
  out.push(`In Frankrijk bel je ${EMERGENCY_NUMBER} voor bergredding. Lukt bellen niet door slecht bereik, dan kan een sms naar ${SMS_FALLBACK_NUMBER} soms nog doorkomen.`);
  out.push('Geef bij een melding het etappeplan hierboven door: de laatste plek waar ik werd verwacht en de route.');
  out.push('Deze brief is een afspraak tussen ons. De app waarmee ik hem maakte alarmeert niemand.');

  return out.join('\n');
}
