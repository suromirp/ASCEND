// ASCEND: Je locatie aanzetten, het uitvoerende deel (docs/beslissingen/2026-11-02-locatie.md).
// Pas als je de instelling aanzet vraagt het toestel om toestemming, en daarna wordt één keer je
// plek bepaald om te zien dat het werkt. Die plek wordt hier niet bewaard. Alles heeft een grens
// van tien seconden en eindigt altijd met een plek of een reden; er gaat nooit een uitzondering
// naar de aanroeper.

import { requestAppLocationPermission } from '../integrations/geolocation';
import { autoLocateAllowed } from '../engine/locationSetting';
import { readLocationPermission } from './weatherLocation';
import type { LocationPermission } from '../engine/weatherLocation';
import { LocateError, locateMe, type LocateFailure, type Position2 } from '../utils/geolocation';
import { TimeoutError, withTimeout } from '../utils/withTimeout';

export const SWITCH_LIMIT_MS = 10_000;
// De eigen klok van de browser tikt eerder af dan de harde grens hierboven.
const LOCATE_TIMEOUT_MS = 6_000;

// 'found': je plek is bepaald. Hij wordt door de aanroeper gebruikt en hier nooit bewaard.
export type SwitchResult = { status: 'found'; position: Position2 } | { status: 'failed'; reason: LocateFailure };

export interface SwitchOptions {
  requestPermission?: () => Promise<LocationPermission | undefined>;
  locate?: () => Promise<Position2>;
  limitMs?: number;
}

export async function askForLocation(options: SwitchOptions = {}): Promise<SwitchResult> {
  const requestPermission = options.requestPermission ?? requestAppLocationPermission;
  const locate = options.locate ?? (() => locateMe({ timeoutMs: LOCATE_TIMEOUT_MS, maximumAge: 0 }));
  try {
    const work = (async (): Promise<SwitchResult> => {
      const permission = await requestPermission();
      if (permission === 'denied') return { status: 'failed', reason: 'denied' };
      return { status: 'found', position: await locate() };
    })();
    return await withTimeout(work, options.limitMs ?? SWITCH_LIMIT_MS);
  } catch (err) {
    if (err instanceof LocateError) return { status: 'failed', reason: err.reason };
    if (err instanceof TimeoutError) return { status: 'failed', reason: 'timeout' };
    return { status: 'failed', reason: 'unavailable' };
  }
}

// Je plek van nu voor "waar ben je op je etappe": zonder afronden (genoeg voor kilometers), alleen in
// het geheugen van de aanroeper, met dezelfde grens van tien seconden en altijd een uitkomst.
export function locateOnce(options: { locate?: () => Promise<Position2>; limitMs?: number } = {}): Promise<SwitchResult> {
  return askForLocation({
    requestPermission: () => Promise.resolve(undefined),
    locate: options.locate ?? (() => locateMe({ timeoutMs: LOCATE_TIMEOUT_MS, maximumAge: 60_000, precise: true })),
    limitMs: options.limitMs,
  });
}

// Zonder dat de gebruiker erom vraagt wordt je plek alleen bepaald als de toestemming er al is: een
// toestel dat nog moet vragen krijgt nooit een venster uit zichzelf. 'skipped' zegt dat de knop
// "Opnieuw bepalen" het werk moet doen.
export async function locateIfGranted(options: { getPermission?: () => Promise<LocationPermission>; locate?: () => Promise<Position2>; limitMs?: number } = {}): Promise<SwitchResult | { status: 'skipped' }> {
  let permission: LocationPermission;
  try {
    permission = await (options.getPermission ?? readLocationPermission)();
  } catch {
    permission = 'unknown';
  }
  if (!autoLocateAllowed(permission)) return { status: 'skipped' };
  return locateOnce(options);
}
