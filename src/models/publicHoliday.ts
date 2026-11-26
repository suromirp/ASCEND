// ASCEND: een officiële feestdag (Tweede Paasdag, Koningsdag). Komt van een bron via een adapter
// (integrations/publicHolidays.ts) en draagt die bron in `source`, nooit in de naam van een veld.
// Alleen een gegeven over de kalender, geen historie: hij staat op dit toestel, kan altijd opnieuw
// worden opgehaald en komt niet in de back-up (storage/publicHolidays.ts,
// docs/beslissingen/2026-11-26-feestdagen-als-voorstel.md).
export interface PublicHoliday {
  date: string; // ISO-datum
  name: string; // de naam in de taal van het land, zoals "Tweede Paasdag"
  country: string; // ISO 3166-1 alpha-2, zoals "NL"
  source: string; // de adapter die hem leverde, zoals "nager-date"
}
