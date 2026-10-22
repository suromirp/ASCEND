// ASCEND: een dubbele tik op de knop onderaan een blad mag niet doorvallen op
// de tabbalk eronder. De eerste tik past toe en sluit het blad meteen; de
// tweede tik komt dan op wat er onder het blad lag (na Toepassen bij
// verplaatsen op de tab Stand, na Opslaan in de ochtendcheck op Logboek).
// Algemene oplossing, niet per blad: zodra een blad (elke `fixed inset-0`,
// zie appBusy.ts) verdwijnt noteren we het moment, en de tabbalk negeert
// tikken in de korte tijd erna.

export const OVERLAY_TAP_GUARD_MS = 400;

let lastOverlayClosedAt = Number.NEGATIVE_INFINITY;

export function noteOverlayClosed(at: number = Date.now()): void {
  lastOverlayClosedAt = at;
}

// Zolang het blad nog open is, vangt het blad zelf de tik op (het ligt over de
// tabbalk), dus alleen de tijd na het sluiten telt.
export function tapFollowsOverlayClose(now: number = Date.now()): boolean {
  const since = now - lastOverlayClosedAt;
  return since >= 0 && since < OVERLAY_TAP_GUARD_MS;
}

export function resetOverlayGuard(): void {
  lastOverlayClosedAt = Number.NEGATIVE_INFINITY;
}
