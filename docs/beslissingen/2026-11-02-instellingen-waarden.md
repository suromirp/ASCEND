# Instellingen zeggen wat er staat

Datum: 2026-11-02
Status: aangenomen

## Besluit

De waarden in de rijen van Instellingen zeggen wat er staat. Vandaag en meldingen toont de naam van het profiel (Alles, Het belangrijkste, Alleen je training, Eigen keuze). Zonder doel heet het eerste vak op het overzicht Richting, met de golf waarin je zit. Een mislukte lezing van de koppeling toont "Niet te lezen" en nooit "Koppelen". De rijen Weging bij een doeltijd, Groei bij het rekenen en Marge bij een tijdslimiet staan er alleen met een doel. "Leeg" en "Geen" zijn "Niet ingevuld" en "Niet gekoppeld", en de back-up zegt overal "Nog nooit".

## Reden

"9 aan" zei niet waarvan, "Leeg" en "Geen" klonken als een fout, het vak Fase klopte niet zonder doel, en een mislukte lezing leek op nooit gekoppeld. De rijen voor een doeltijd hadden niets te rekenen zonder doel. Zo komt de rij overeen met wat de app weet (Ontwerprapport instellingen, onderdeel 1).

## Alternatieven

Het aantal schakelaars laten staan: het zegt niets over wat je ziet. De rijen van Klaar voor je doel zonder doel tonen: ze doen dan niets.

## Bron

`docs/visie/Ontwerprapport instellingen.md`. De bijbehorende uitleg achter de InfoButton volgt de code, niet het rapport, waar die verschillen.

## Vervangt

Niets.

## Terugdraaien

De teksten staan in `src/engine/settingsSummary.ts` en `src/engine/settingsStatus.ts`, de voorwaarde in `SHOW_WHEN` van `src/data/settingsLayout.ts`. Er is geen opgeslagen vorm veranderd.
