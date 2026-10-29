// ASCEND: snelknoppen onder de naam van een oefening in Forge
// (docs/beslissingen/2026-10-29-snelknoppen-in-forge.md).
//
// Vier handelingen uit het menu van de oefening die je tijdens een training het vaakst nodig hebt, als
// rij chips. Het menu blijft alles houden; de rij is een snelle hand, geen nieuwe regel. Uitleg (het
// plaatjesblad) en Vorige keer hebben al een eigen plek (het kaartje in de kop, de kolomkop), die komen
// hier dus niet nog een keer in. Dezelfde voorwaarden als het menu, zodat een knop nooit iets kan wat het
// menu niet mag.

// "Set toevoegen" staat al onder de sets van elke oefening, dus die komt hier niet nog een keer.
export type QuickAction = 'ruilen' | 'opwarmset' | 'set' | 'notitie';

// De volgorde is ook de volgorde op het scherm: eerst wat je het meest voor de eerste set doet.
export const QUICK_ACTION_ORDER: QuickAction[] = ['ruilen', 'opwarmset', 'notitie'];

export const QUICK_LABEL: Record<QuickAction, string> = {
  ruilen: 'Ruilen',
  opwarmset: 'Opwarmset',
  set: 'Set toevoegen',
  notitie: 'Notitie',
};

export interface QuickContext {
  readOnly: boolean;
  // Een dag die nog komt: lezen, geen notitie schrijven (zoals in het menu).
  preview: boolean;
  // Een oefening op tijd heeft geen losse sets om bij te zetten.
  timed: boolean;
}

export function quickActionsFor(c: QuickContext): QuickAction[] {
  if (c.readOnly) return [];
  return QUICK_ACTION_ORDER.filter((a) => {
    if (a === 'opwarmset' || a === 'set') return !c.timed;
    if (a === 'notitie') return !c.preview;
    return true;
  });
}

// De instelling "Snelknoppen tonen" (AppSettings.forgeQuickButtons). Afwezig is aan; alleen een echte
// false zet de rij uit. Optioneel en zonder migratie.
export function quickButtonsOn(s: { forgeQuickButtons?: unknown } | undefined | null): boolean {
  return s?.forgeQuickButtons !== false;
}
