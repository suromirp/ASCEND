// ASCEND: officiële feestdagen van Nager.Date (engine/publicHolidays.ts,
// docs/beslissingen/2026-11-26-feestdagen-als-voorstel.md).
//
//   GET https://date.nager.at/api/v3/PublicHolidays/{jaar}/{land}
//       een lijst met per feestdag de datum, de naam in de taal van het land (localName), of hij in
//       het hele land geldt (global) en de soort (types, bij oudere antwoorden type)
//
// Zonder sleutel en met `access-control-allow-origin: *` (gemeten op 26 november 2026), dus de
// telefoon vraagt het zelf. Alleen een jaar en een landcode gaan naar buiten, nooit een plek of iets
// over je training. Dit bestand is het enige dat de vorm van het antwoord kent; de rest van de app
// leest `PublicHoliday` met `source`.

import type { PublicHoliday } from '../models/publicHoliday';
import type { DataSourceAdapter } from './types';

export const PUBLIC_HOLIDAYS_URL = 'https://date.nager.at/api/v3/PublicHolidays';
export const PUBLIC_HOLIDAYS_SOURCE = 'nager-date';
export const PUBLIC_HOLIDAYS_TIMEOUT_MS = 10_000;

export interface FetchOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export const publicHolidaysUrl = (year: number, country: string) => `${PUBLIC_HOLIDAYS_URL}/${year}/${encodeURIComponent(country.toUpperCase())}`;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Alleen wat in het hele land geldt en een echte vrije dag is (soort Public): geen dag die maar in
// een provincie of deelstaat geldt, geen bank- of schooldag.
export function mapPublicHolidays(raw: unknown, country: string): PublicHoliday[] {
  if (!Array.isArray(raw)) throw new Error('Feestdagen: geen lijst');
  const code = country.toUpperCase();
  const out: PublicHoliday[] = [];
  for (const h of raw as Record<string, unknown>[]) {
    if (!h || typeof h !== 'object') continue;
    const date = typeof h.date === 'string' ? h.date.slice(0, 10) : '';
    const name = typeof h.localName === 'string' && h.localName.trim() ? h.localName.trim() : typeof h.name === 'string' ? h.name.trim() : '';
    if (!DATE.test(date) || !name) continue;
    if (h.global !== true) continue;
    const types = Array.isArray(h.types) ? h.types : typeof h.type === 'string' ? [h.type] : [];
    if (!types.includes('Public')) continue;
    if (out.some((o) => o.date === date)) continue;
    out.push({ date, name: name.slice(0, 60), country: code, source: PUBLIC_HOLIDAYS_SOURCE });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// Gooit bij een fout, een time-out of een kapot antwoord; de opslag maakt daar een zichtbare uitkomst van.
export async function fetchPublicHolidays(year: number, country: string, options: FetchOptions = {}): Promise<PublicHoliday[]> {
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? PUBLIC_HOLIDAYS_TIMEOUT_MS);
  try {
    const response = await doFetch(publicHolidaysUrl(year, country), { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`Feestdagen ${response.status}`);
    return mapPublicHolidays(await response.json(), country);
  } finally {
    clearTimeout(timer);
  }
}

// De bron achter de generieke vorm (integrations/types.ts). Er is niets te koppelen: hij is er altijd.
export const publicHolidaysAdapter: DataSourceAdapter = {
  id: PUBLIC_HOLIDAYS_SOURCE,
  label: 'Nager.Date',
  isConnected: () => true,
  fetchPublicHolidays: (year, country) => fetchPublicHolidays(year, country),
};
