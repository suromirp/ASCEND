// ASCEND — wat de gebruiker zelf kiest bij het etappeplan en de solokaart.
//
// De 36 officiële etappes zijn vaste data (data/gr5Stages.ts) en veranderen
// hier nooit. Dit bestand beschrijft alleen het eigen plan erover heen en de
// afspraak met thuis. Beide leven lokaal op de telefoon (meta-sleutels
// `routePlan` en `soloPlan`) en gaan mee in de back-up.

export const SLEEP_KINDS = ['tent', 'bivak', 'camping', 'gite'] as const;
export type SleepKind = (typeof SLEEP_KINDS)[number];

export const SLEEP_LABEL: Record<SleepKind, string> = {
  tent: 'Tent',
  bivak: 'Bivak bij refuge',
  camping: 'Camping',
  gite: 'Gîte',
};

// Wat je met één etappe doet. Alles is optioneel: een etappe zonder keuze is
// gewoon een loopdag zonder gekozen slaapplek.
export interface StageChoice {
  sleep?: SleepKind;
  // Deze etappe en de volgende lopen als één dag.
  mergeWithNext?: boolean;
  // Een rustdag na deze etappe, op de plek waar je slaapt.
  restAfter?: boolean;
}

export interface RoutePlan {
  // Sleutel is het etappe-id uit data/gr5Stages.ts, bijvoorbeeld "t2e6".
  choices: Record<string, StageChoice>;
  updatedAt: string;
}

export const EMPTY_ROUTE_PLAN: RoutePlan = { choices: {}, updatedAt: '' };

export type SatelliteAnswer = 'ja' | 'nee' | 'nog-niet';

// De afspraak met thuis. Alles wat hier staat heeft de gebruiker zelf
// ingevuld; er staat niets van in de repo.
export interface SoloPlan {
  // Voor wie de brief is (bijvoorbeeld een voornaam of "mam").
  who: string;
  // "HH:MM", het uur waarop thuis elke dag een bericht verwacht.
  checkInTime: string;
  // Wat thuis doet als het bericht uitblijft.
  ifMissing: string;
  satellite: SatelliteAnswer | '';
  // Welk toestel, of hoe je thuis bereikt als je er geen hebt.
  satelliteNote: string;
  // Kleur tent, rugzak en jas, en wat je verder bij je hebt.
  gear: string;
  updatedAt: string;
}

export const EMPTY_SOLO_PLAN: SoloPlan = {
  who: '',
  checkInTime: '',
  ifMissing: '',
  satellite: '',
  satelliteNote: '',
  gear: '',
  updatedAt: '',
};
