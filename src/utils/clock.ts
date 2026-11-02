// Eén notatie voor een tijd van de dag in de hele app: "13:05", 24 uur, dubbele punt en twee cijfers
// voor de minuten (docs/beslissingen/2026-11-02-instellingen-ronde3.md). Altijd in de tijd van het toestel.
// Een tijd die niet te lezen is geeft een lege tekst, zodat de aanroeper zelf kiest wat er dan staat.

const two = (n: number): string => String(n).padStart(2, '0');

export function formatClock(moment: Date | number | string): string {
  const d = moment instanceof Date ? moment : new Date(moment);
  if (Number.isNaN(d.getTime())) return '';
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
}
