// ASCEND: de teksten bij "Naar Garmin Connect" onder een voorgestelde lus (components/RoutePanel.tsx,
// storage/routeSend.ts). Pure: geen React, geen netwerk. ASCEND stuurt zelf niets naar Garmin: de
// gebruiker kiest de app in het venster van zijn telefoon en slaat de lus daar op als koers.
// Besluit: docs/beslissingen/2026-11-10-route-naar-garmin-connect.md.

export const GPX_MIME = 'application/gpx+xml';

export const SEND_LABEL = 'Naar Garmin Connect';
// De titel boven de keuzelijst van Android en van het deelvenster.
export const SEND_TITLE = 'Koers openen met';
// Eén regel onder de knoppen: wat er gebeurt.
export const SEND_HINT = 'Kies Garmin Connect in het venster en sla de lus op als koers.';
// Waar aanbieden niet kan: het bestand zelf openen.
export const SAVE_HINT = 'Open het bestand met Garmin Connect en sla de lus op als koers.';

export type RouteSendOutcome =
  // Het venster stond open; wat er gekozen is weet ASCEND niet.
  | { kind: 'offered' }
  | { kind: 'shared' }
  // Weggetikt: geen fout.
  | { kind: 'cancelled' }
  // Het venster bleef langer open dan de grens; de knop is weer vrij.
  | { kind: 'waiting' }
  // Er is geen weg op dit toestel (meer): de download blijft.
  | { kind: 'unavailable' }
  // 'file': het bestand klaarzetten lukte niet, er is niets aangeboden. 'slow': in de app duurde
  // klaarzetten of openen langer dan de grens; er gaat daarna geen venster meer open.
  | { kind: 'failed'; step: 'file' | 'open' | 'slow' };

export interface SendLine {
  text: string;
  warn: boolean;
}

// De zichtbare uitkomst na een tik op Naar Garmin Connect. Een weggetikt venster is geen fout.
export function sendLine(outcome: RouteSendOutcome): SendLine {
  switch (outcome.kind) {
    case 'offered':
    case 'waiting':
      return { text: 'Het venster is geopend. Geen Garmin Connect in de lijst? Kies GPX downloaden en open het bestand ermee.', warn: false };
    case 'shared':
      return { text: 'Gedeeld. Sla de lus in Garmin Connect op als koers.', warn: false };
    case 'cancelled':
      return { text: 'Niets gedeeld.', warn: false };
    case 'unavailable':
      return { text: 'Delen kan hier niet. Kies GPX downloaden.', warn: true };
    case 'failed':
      if (outcome.step === 'file') return { text: 'Het bestand klaarzetten lukte niet. Probeer het nog eens.', warn: true };
      if (outcome.step === 'slow') return { text: 'Het duurde te lang. Probeer het nog eens of kies GPX downloaden.', warn: true };
      return { text: 'Het venster openen lukte niet. Kies GPX downloaden.', warn: true };
  }
}

// Van Garmin Connect naar het horloge, in drie stappen. De namen in Garmin Connect kunnen per versie
// iets anders heten; daarom staat er wat je doet, niet elke knop.
export const WATCH_STEPS_TITLE = 'Zo komt hij op je horloge';
export const WATCH_STEPS: string[] = [
  'Sla de lus in Garmin Connect op als koers. Dat vraagt internet.',
  'Stuur de koers in Garmin Connect naar je horloge en synchroniseer.',
  'Op je horloge: kies Hardlopen, dan Navigatie, Koersen.',
];

// Wat er van een bestand terugkomt (storage/routeFile.ts): opgeslagen in een map, gedownload, of niet.
export type RouteFileLine = { ok: true; where: 'download' | 'folder'; name: string; label?: string } | { ok: false };

// De ene regel onder de twee knoppen. Voor een tik zegt hij wat je doet; na een tik staat de
// uitkomst op dezelfde plek, zodat er nooit twee regels onder elkaar staan. Na opslaan of
// downloaden komt de stap erachter, want het bestand moet nog naar Garmin Connect.
export function routeActionLine(hasSender: boolean, done?: { send: RouteSendOutcome } | { file: RouteFileLine }): SendLine {
  if (!done) return { text: hasSender ? SEND_HINT : SAVE_HINT, warn: false };
  if ('send' in done) return sendLine(done.send);
  if (!done.file.ok) return { text: 'Opslaan lukte niet. Probeer het nog eens.', warn: true };
  const saved = done.file.where === 'folder' ? `Opgeslagen als ${done.file.name} in ${done.file.label}.` : `Gedownload als ${done.file.name}.`;
  return { text: `${saved} ${SAVE_HINT}`, warn: false };
}
