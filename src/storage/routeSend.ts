// ASCEND: een voorgestelde lus aanbieden aan de app van je horloge (Naar Garmin Connect). ASCEND stuurt
// zelf niets: het GPX-bestand gaat naar het venster van de telefoon en de gebruiker kiest de app.
// Met een grens in tijd op elke stap en altijd een uitkomst; gooit nooit. Het bestand is hetzelfde als
// dat van GPX downloaden (engine/gpx.ts): geen tijd, geen naam van een plek of van de gebruiker.

import { fileSender, type FileSender } from '../integrations/fileSender';
import { gpxFileName } from '../engine/gpx';
import { GPX_MIME, SEND_TITLE, type RouteSendOutcome } from '../engine/routeSend';
import { AutoBackupError, NameTakenError } from '../engine/autoBackup';
import type { RouteStyle } from '../models/route';
import { TimeoutError, withTimeout } from '../utils/withTimeout';

// In de app: het bestand klaarzetten en de keuzelijst openen; duurt dat langer, dan is het mislukt.
export const APP_LIMIT_MS = 15_000;
// In de browser blijft de belofte open zolang het deelvenster open staat; na deze grens is de knop
// weer vrij, zonder fout.
export const BROWSER_LIMIT_MS = 60_000;

const PROBE = { name: gpxFileName('adventure', '2026-01-01'), mimeType: GPX_MIME };

// De weg op dit toestel, of null: dan toont het paneel alleen GPX downloaden.
export function routeSender(): FileSender | null {
  try {
    return fileSender(PROBE);
  } catch {
    return null;
  }
}

export async function sendRouteGpx(text: string, style: RouteStyle, date: string, sender: FileSender | null = routeSender()): Promise<RouteSendOutcome> {
  if (!sender) return { kind: 'unavailable' };
  const app = sender.platform === 'app';
  // Na de grens gaat er in de app geen keuzelijst meer open (het werk erachter stopt mee).
  const stop = new AbortController();
  try {
    const result = await withTimeout(sender.send(gpxFileName(style, date), text, GPX_MIME, SEND_TITLE, stop.signal), app ? APP_LIMIT_MS : BROWSER_LIMIT_MS);
    return { kind: result };
  } catch (err) {
    if (err instanceof TimeoutError) {
      stop.abort();
      return app ? { kind: 'failed', step: 'slow' } : { kind: 'waiting' };
    }
    // Schrijven mislukt (ook halverwege): er is niets aangeboden.
    if (err instanceof AutoBackupError || err instanceof NameTakenError) return { kind: 'failed', step: 'file' };
    return { kind: 'failed', step: 'open' };
  }
}
