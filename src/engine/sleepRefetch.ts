// ASCEND: slaap die later binnenkomt. Garmin Connect geeft de nacht aan intervals.icu soms
// later door dan de rusthartslag; haalt ASCEND te vroeg op, dan staat er alleen de
// rusthartslag. Komt de app in de ochtend weer in beeld en heeft het record van vandaag nog
// geen slaap, dan wordt er opnieuw opgehaald, met dezelfde grens van 15 minuten als de
// gewone ophaalronde (storage/externalActivities.ts#isFetchDue).
//
// Puur: geen React, geen IndexedDB.

import { isFetchDue } from '../storage/externalActivities';
import { MORNING_CARD_UNTIL_HOUR } from './morningCard';

export function shouldRefetchSleep(p: {
  now: Date;
  linked: boolean;
  sleepOn: boolean;
  hasSleepToday: boolean;
  fetchedAt: string | undefined;
  busy: boolean;
}): boolean {
  if (!p.linked || !p.sleepOn || p.hasSleepToday || p.busy) return false;
  if (p.now.getHours() >= MORNING_CARD_UNTIL_HOUR) return false;
  return isFetchDue(p.fetchedAt, p.now);
}
