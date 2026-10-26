import { rowSummary, type SettingsFacts } from '../../../engine/settingsSummary';

// Staat een rij er nu (de voorwaarden staan in data/settingsLayout.ts)? Een kopje met een
// lijst eronder tekent alleen als minstens een rij er is, zodat er geen leeg kader staat.
export const rowShown = (id: string, facts: SettingsFacts): boolean => !rowSummary(id, facts).hidden;
export const anyShown = (ids: string[], facts: SettingsFacts): boolean => ids.some((id) => rowShown(id, facts));
