// ASCEND: een doeldatum moet vandaag of later zijn. Een doel voor een dag die al
// voorbij is, kan niets meer plannen en zou toch als actief tellen. Pure.

export const GOAL_DATE_PAST_MESSAGE = 'Deze datum is al voorbij. Kies vandaag of een dag later.';

// De melding als de gekozen datum voor `today` ligt; anders undefined.
// `unchanged` is de datum die het doel al had: een bestaand doel waarvan de
// datum intussen voorbij is, blijft bewerkbaar zolang je die datum niet kiest.
export function goalDateProblem(date: string | undefined, today: string, unchanged?: string): string | undefined {
  if (!date || date >= today) return undefined;
  if (unchanged !== undefined && date === unchanged) return undefined;
  return GOAL_DATE_PAST_MESSAGE;
}
