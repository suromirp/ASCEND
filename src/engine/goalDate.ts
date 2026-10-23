// ASCEND: een doeldatum moet vandaag of later zijn. Een doel voor een dag die al
// voorbij is, kan niets meer plannen en zou toch als actief tellen. Ook geen
// datum die geen datum is, en geen datum zo ver vooruit dat het bijna zeker een
// typfout in het jaartal is: een tussenstand tijdens het typen ("0002") mocht
// vroeger de hele planning wegvagen (Warden Logica punt 1). Pure.

export const GOAL_DATE_PAST_MESSAGE = 'Deze datum is al voorbij. Kies vandaag of een dag later.';
export const GOAL_DATE_INVALID_MESSAGE = 'Dit is geen geldige datum. Kies een dag in de kalender.';
export const GOAL_DATE_FAR_MESSAGE = 'Die datum ligt meer dan vijf jaar vooruit. Kijk het jaartal nog even na.';

const MAX_YEARS_AHEAD = 5;

function isRealDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

// De melding als de gekozen datum niet kan; anders undefined.
// `unchanged` is de datum die het doel al had: een bestaand doel waarvan de
// datum intussen voorbij is, blijft bewerkbaar zolang je die datum niet kiest.
export function goalDateProblem(date: string | undefined, today: string, unchanged?: string): string | undefined {
  if (!date) return undefined;
  if (unchanged !== undefined && date === unchanged) return undefined;
  if (!isRealDate(date)) return GOAL_DATE_INVALID_MESSAGE;
  if (date < today) return GOAL_DATE_PAST_MESSAGE;
  const limit = `${Number(today.slice(0, 4)) + MAX_YEARS_AHEAD}${today.slice(4)}`;
  if (date > limit) return GOAL_DATE_FAR_MESSAGE;
  return undefined;
}
