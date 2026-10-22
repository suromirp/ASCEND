// ASCEND: de plek van het toestel opvragen, met een eigen tijdslimiet.
//
// navigator.geolocation heeft zelf een time-out, maar die telt pas als de
// toestemming er is: wacht iemand op het venster, of stokt het toestel, dan
// komt er soms nooit een antwoord. Daarom zit er een harde klok omheen, en
// beantwoordt deze functie altijd, met een plek of met een reden.
//
// De plek wordt afgerond op twee decimalen (ongeveer een kilometer): genoeg
// voor het weer en voor afstanden, geen adres.

import { roundCoordinate } from '../integrations/openMeteo';

export type LocateFailure = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export class LocateError extends Error {
  reason: LocateFailure;
  constructor(reason: LocateFailure) {
    super(reason);
    this.name = 'LocateError';
    this.reason = reason;
  }
}

export interface Position2 {
  lat: number;
  lon: number;
}

export const LOCATE_TIMEOUT_MS = 10_000;
export const LOCATE_MAX_AGE_MS = 600_000;
// Net na de eigen time-out van het toestel: de harde klok is het vangnet.
const HARD_LIMIT_EXTRA_MS = 3_000;

export interface LocateOptions {
  geolocation?: Pick<Geolocation, 'getCurrentPosition'> | undefined;
  timeoutMs?: number;
  maximumAge?: number;
}

export function locateMe(options: LocateOptions = {}): Promise<Position2> {
  const geo = 'geolocation' in options ? options.geolocation : typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
  const timeoutMs = options.timeoutMs ?? LOCATE_TIMEOUT_MS;
  return new Promise<Position2>((resolve, reject) => {
    if (!geo) {
      reject(new LocateError('unsupported'));
      return;
    }
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    timer = setTimeout(() => finish(() => reject(new LocateError('timeout'))), timeoutMs + HARD_LIMIT_EXTRA_MS);
    try {
      geo.getCurrentPosition(
        (pos) => finish(() => resolve({ lat: roundCoordinate(pos.coords.latitude), lon: roundCoordinate(pos.coords.longitude) })),
        (err) => finish(() => reject(new LocateError(err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable'))),
        { timeout: timeoutMs, maximumAge: options.maximumAge ?? LOCATE_MAX_AGE_MS },
      );
    } catch {
      finish(() => reject(new LocateError('unavailable')));
    }
  });
}

export function locateErrorMessage(err: unknown): string {
  const reason = err instanceof LocateError ? err.reason : 'unavailable';
  switch (reason) {
    case 'unsupported':
      return 'Deze browser kan je locatie niet bepalen. Zoek hieronder een plaats.';
    case 'denied':
      return 'ASCEND mag je locatie niet gebruiken. Sta het toe in de instellingen van je browser, of zoek hieronder een plaats.';
    case 'timeout':
      return 'Je locatie kwam niet op tijd. Probeer het nog eens, of zoek hieronder een plaats.';
    default:
      return 'Je locatie is nu niet beschikbaar. Probeer het nog eens, of zoek hieronder een plaats.';
  }
}
