// ASCEND: "Weer volgt je locatie", het uitvoerende deel. De beslissing zelf
// staat in engine/weatherLocation.ts; hier staat alleen wat het toestel moet
// doen: de toestemming lezen, het uur van de laatste poging bewaren en de plek
// opvragen. Het uur van de poging staat los van de instellingen en gaat dus
// niet mee in een back-up: het hoort bij dit toestel.

import { MetaRepo } from './database';
import { followSkipReason, movedTo, myLocation, type FollowSkip, type LocationPermission } from '../engine/weatherLocation';
import type { WeatherPlace } from '../models/weather';
import { locateMe, type Position2 } from '../utils/geolocation';
import { withTimeout } from '../utils/withTimeout';

const CHECKED_KEY = 'weatherLocationCheckedAt';
const PERMISSION_TIMEOUT_MS = 2_000;
const LOCATE_LIMIT_MS = 15_000;

// Vraagt nooit zelf om toestemming: permissions.query toont geen venster.
// Een browser zonder die functie telt als 'unknown', en dan blijft de plek staan.
async function readLocationPermission(): Promise<LocationPermission> {
  try {
    const permissions = typeof navigator !== 'undefined' ? navigator.permissions : undefined;
    if (!permissions?.query) return 'unknown';
    const status = await withTimeout(permissions.query({ name: 'geolocation' }), PERMISSION_TIMEOUT_MS);
    return status.state;
  } catch {
    return 'unknown';
  }
}

export type FollowResult =
  | { status: 'updated'; place: WeatherPlace }
  | { status: 'unchanged' }
  | { status: 'skipped'; reason: FollowSkip }
  | { status: 'failed' };

export interface FollowOptions {
  enabled: boolean;
  place: WeatherPlace | undefined;
  now?: Date;
  getPermission?: () => Promise<LocationPermission>;
  locate?: () => Promise<Position2>;
}

// Werkt nooit met een uitzondering: een mislukte poging wordt 'failed' en de
// app gaat gewoon door. Het uur wordt bij de poging bewaard, niet bij het
// slagen, zodat een toestel zonder bereik niet bij elke opening opnieuw zoekt.
export async function followLocation(options: FollowOptions): Promise<FollowResult> {
  const now = options.now ?? new Date();
  try {
    const lastCheckedAt = await MetaRepo.get<string>(CHECKED_KEY);
    const permission = await (options.getPermission ?? readLocationPermission)();
    const reason = followSkipReason({ enabled: options.enabled, place: options.place, permission, lastCheckedAt, now });
    if (reason) return { status: 'skipped', reason };
    await MetaRepo.set(CHECKED_KEY, now.toISOString());
    const found = await withTimeout((options.locate ?? locateMe)(), LOCATE_LIMIT_MS);
    if (!movedTo(options.place, found)) return { status: 'unchanged' };
    return { status: 'updated', place: myLocation(found.lat, found.lon) };
  } catch {
    return { status: 'failed' };
  }
}
