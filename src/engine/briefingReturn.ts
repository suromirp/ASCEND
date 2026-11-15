// ASCEND: Terug vanaf een pagina die je uit de Briefing opende brengt je weer in de Briefing (I-37).
//
// De Briefing is een laag over Vandaag of Week. Een rij die een pagina opent (Weer, Waar kun je dit
// doen?) sluit eerst alle lagen en gaat dan naar de pagina; Terug kwam daarna uit op de pagina eronder,
// zonder Briefing. Nu laat de Briefing bij het weggaan een merkteken achter. Komt Terug (een stap terug
// in de geschiedenis, geen tik op de tabbalk) binnen een half uur uit op dezelfde pagina, dan opent die
// pagina de Briefing weer. Puur: het merkteken bewaren staat in utils/briefingReturn.ts.

// Welke laag de Briefing opende: de missiekaart op Vandaag, of het blad van een training (Vandaag of Week).
export type BriefingOrigin = 'mission' | 'sheet';

export interface BriefingReturn {
  origin: BriefingOrigin;
  templateId: string;
  date: string;
  // De geplande training; het blad van een training opent alleen met een geplande training.
  sessionId?: string;
  // De pagina onder de Briefing (het pad van de router) en zijn stap in de geschiedenis: alleen een stap
  // terug naar precies die stap opent de Briefing, niet een later bezoek aan dezelfde pagina.
  path: string;
  entry?: string;
  // Wanneer de Briefing wegging, in milliseconden.
  at: number;
}

// Langer weg dan dit: dan was het geen even kijken, en opent Terug gewoon de pagina.
export const BRIEFING_RETURN_MS = 30 * 60_000;

export interface ReturnHere {
  path: string;
  entry?: string;
  // Kwam je hier met een stap terug (de router zegt POP), en niet met een tik op de tabbalk of een link.
  back: boolean;
  now: number;
  origin: BriefingOrigin;
  // Hoort het merkteken bij deze laag (dezelfde training en dag)? Nee: het blijft liggen voor een andere.
  accepts?: (mark: BriefingReturn) => boolean;
}

// Of deze pagina de Briefing weer opent. `keep`: het merkteken blijft liggen voor een andere vrager
// (dezelfde pagina, een andere laag); anders is het op en gaat het weg, ook als het niet opent.
export function briefingReturnFor(mark: BriefingReturn | undefined, here: ReturnHere): { open: BriefingReturn | undefined; keep: boolean } {
  if (!mark) return { open: undefined, keep: false };
  if (!here.back || mark.path !== here.path || mark.entry !== here.entry) return { open: undefined, keep: false };
  if (here.now - mark.at > BRIEFING_RETURN_MS || here.now < mark.at) return { open: undefined, keep: false };
  if (mark.origin !== here.origin || (here.accepts && !here.accepts(mark))) return { open: undefined, keep: true };
  if (mark.origin === 'sheet' && !mark.sessionId) return { open: undefined, keep: false };
  return { open: mark, keep: false };
}
