// ASCEND: staat een instelling er nu op de pagina? Wat bij een andere instelling hoort
// bestaat niet zolang die uit staat (Garmin niet gekoppeld, Kracht meerekenen uit, geen
// doel). De voorwaarden staan op één plek, in `SHOW_WHEN` (data/settingsLayout.ts); dit
// bestand geeft er de reden bij voor het zoekveld en zegt welke instelling het oplost,
// zodat een tik daarheen gaat. Puur.

import { SHOW_WHEN, blockerOf, placementOf, type SettingsPageId } from '../data/settingsLayout';
import { rowContext, type SettingsFacts } from './settingsSummary';
import { adviceDifferences } from './settingsDiff';
import type { AppSettings } from '../storage/database';

export type Availability = { available: true } | { available: false; reason: string; parent: string };

export function rowAvailability(rowId: string, facts: SettingsFacts): Availability {
  const blocker = blockerOf(rowId, facts.settings, rowContext(facts));
  return blocker ? { available: false, reason: blocker.reason, parent: blocker.parent } : { available: true };
}

// Voor een instelling uit de index: eerst de eigen voorwaarden, dan die van de rij of het blad
// waar hij in zit (de rij Rusttimer is er ook niet als je sets in MacroFactor bijhoudt).
export function settingAvailabilityOnPage(settingId: string, facts: SettingsFacts): Availability {
  const own = rowAvailability(settingId, facts);
  if (!own.available) return own;
  const placement = placementOf(settingId);
  return placement && placement.row !== settingId ? rowAvailability(placement.row, facts) : own;
}

// Waar een verschil in "Anders dan het advies" heen springt: de rij zelf, of, als die nu
// verborgen is, de rij die het oplost, met de reden erbij (zoals het zoekveld doet).
export interface AdviceTarget { page: SettingsPageId; row: string; sheet?: boolean; reason?: string }
export function adviceTarget(settingId: string, facts: SettingsFacts): AdviceTarget | undefined {
  const own = placementOf(settingId);
  if (!own) return undefined;
  const availability = settingAvailabilityOnPage(settingId, facts);
  if (availability.available) return { page: own.page, row: own.row, ...(own.sheet ? { sheet: true } : {}) };
  const parent = placementOf(availability.parent) ?? own;
  return { page: parent.page, row: parent.row, ...(parent.sheet ? { sheet: true } : {}), reason: availability.reason };
}

export const CONDITIONAL_ROWS = Object.keys(SHOW_WHEN);

// Op welke rijen staat iets anders dan het advies? Een instelling in het blad van een rij telt
// voor die rij, zodat de rij het kleine label "aangepast" krijgt (per groep te lezen met `page`).
export function adjustedRows(settings: AppSettings, page?: SettingsPageId): Set<string> {
  const rows = new Set<string>();
  for (const d of adviceDifferences(settings)) {
    const placement = placementOf(d.id);
    if (placement && (page === undefined || placement.page === page)) rows.add(placement.row);
  }
  return rows;
}
