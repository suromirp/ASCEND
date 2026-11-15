// De drie keuzes voor slapen onderweg, op één plek: de start, Doel aanpassen en Instellingen lezen
// ze hier (engine/trekShelter.ts, data/settingsChoices.ts, engine/settingsDefs/doel.ts). Alleen
// gegevens, zodat de instellingen er niet de hele tochtlogica voor binnenhalen. "Advies" staat niet in
// de tekst: de keuzelijsten tonen het als badge, net als bij elke andere keuze.

import type { TrekShelter } from '../models/goals';

export const SHELTER_OPTIONS: { id: TrekShelter; label: string; note: string }[] = [
  { id: 'tent', label: 'Met tent', note: 'Tent, slaapzak en kookspullen gaan mee.' },
  { id: 'hut', label: 'In hutten', note: 'Van hut naar hut, zonder tent en kookspullen.' },
  { id: 'both', label: 'Hutten en tent', note: 'Soms een hut, soms de tent. De tent gaat altijd mee.' },
];

// Als keuze voor een instellingenblad.
export const SHELTER_CHOICE_OPTIONS = SHELTER_OPTIONS.map((o) => ({ value: o.id, label: o.label, note: o.note }));
