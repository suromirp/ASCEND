// ASCEND: de keuzes in de instellingen. Een keuze heeft een titel, één regel erboven, het advies en per
// optie een naam, één regel eronder en soms een kortere waarde voor in de rij. Het keuzeblad (ChoiceSheet)
// en de samenvatting (engine/settingsSummary.ts) lezen allebei hier, zodat de rij en het blad nooit iets
// anders zeggen. Elke regel onder een optie is een feit over wat de keuze doet, geen uitleg.
//
// Sinds stap 3 van docs/visie/Ontwerp instellingen op een plek.md staat elke keuze bij haar groep, in
// engine/settingsDefs/<groep>.ts (<GROEP>_CHOICES), en verwijst de verklaring van de instelling ernaar
// (`choice`). CHOICES voegt ze samen, met hun oude sleutel en hun eigen typen.

import { PLANNING_CHOICES } from '../engine/settingsDefs/planning';
import { DOEL_CHOICES } from '../engine/settingsDefs/doel';
import { FORGE_CHOICES } from '../engine/settingsDefs/forge';
import { LICHAAM_CHOICES } from '../engine/settingsDefs/lichaam';
import { VANDAAG_CHOICES } from '../engine/settingsDefs/vandaag';
import { KOPPELINGEN_CHOICES } from '../engine/settingsDefs/koppelingen';
import { GEGEVENS_CHOICES } from '../engine/settingsDefs/gegevens';

export type { ChoiceDef } from '../engine/settingsDefs/types';

export const CHOICES = {
  ...PLANNING_CHOICES,
  ...DOEL_CHOICES,
  ...FORGE_CHOICES,
  ...LICHAAM_CHOICES,
  ...VANDAAG_CHOICES,
  ...KOPPELINGEN_CHOICES,
  ...GEGEVENS_CHOICES,
} as const;

export type ChoiceId = keyof typeof CHOICES;

// De korte waarde van een keuze in de rij: de `short` van de optie, anders het label.
export function choiceShort(id: ChoiceId, value: string | number): string {
  const options = CHOICES[id].options as readonly { value: string | number; label: string; short?: string }[];
  const option = options.find((o) => o.value === value);
  return option ? option.short ?? option.label : String(value);
}
