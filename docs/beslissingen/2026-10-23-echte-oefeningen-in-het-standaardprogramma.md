# Echte oefeningen in het standaardprogramma

Datum: 2026-10-23
Status: aangenomen

## Besluit

De krachttrainingen van het standaardprogramma noemen echte oefeningen uit de lijst van ASCEND (`src/data/exercises.ts`), in het Engels, in plaats van spiergroepen of keuzes als "Biceps", "Row" of "Squat / Leg press". Een keuze die blijft ("of Leg Press") staat in de notitie van de oefening.

## Reden

De eigenaar zag in het workoutscherm "Biceps" en "Triceps" staan: dat zijn geen oefeningen. Een naam die de lijst niet kent krijgt ook geen voorschrift, geen plaatcalculator en geen Ruilen.

## Alternatieven

De namen laten staan en alleen wijzen op het programma uit MacroFactor. Dat vult de trainingen met je eigen oefeningen, maar zonder ingelezen programma bleef het scherm vaag.

## Bron

Gesprek met de eigenaar over het nieuwe workoutscherm.

## Vervangt

Niets. De slots houden hun id (`ex1` en verder), dus wat je eerder deed blijft bij dezelfde plek in de training staan.

## Terugdraaien

De oude namen terugzetten in `src/data/defaultProgram.ts`. De vergelijking met MacroFactor (`engine/macrofactorSets.ts#legacySetShape`) kijkt niet meer naar het id van een oefening, zodat een andere naam nooit een overname voorstelt voor een training die niet veranderd is; dat kan blijven staan.
