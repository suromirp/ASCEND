# Tekeningen ophalen van wat in beeld is

Datum: 2026-10-29
Status: aangenomen

## Besluit

De tekeningen van de oefeningen van een geopende training en van de keuzes in het ruilblad worden opgehaald zodra ze in beeld komen, een voor een. Het kaartje zelf haalt nog steeds niets op; het luistert of de tekening klaar is en wisselt dan van spierkaartje naar tekening.

## Reden

De eigenaar zag in het ruilblad bijna alleen spierkaartjes, terwijl Dips, Dumbbell Bench Press, Push-Up en de schuine persen wel een tekening hebben. Alleen tekeningen van je eigen sjablonen werden vooraf opgehaald, en een programma uit MacroFactor of een ruilkeuze valt daarbuiten.

## Alternatieven

Alle tekeningen in de precache: ruim 5 MB extra bij elke installatie en update. Niets doen: dan blijft het ruilblad een rij spierkaartjes.

## Bron

Gesprek met de eigenaar op 2026-10-29.

## Vervangt

Het deel "het mocht geen extra netwerk kosten" voor de lijst en het ruilblad in `2026-10-28-plaatjes-bij-oefeningen-kaartje.md`. Dezelfde grenzen blijven: niet bij "Alleen spierkaart" of "Uit", niet zonder verbinding, niet bij databesparing.

## Terugdraaien

`useDrawingsFor` in `src/components/useExerciseArtPrefetch.ts` niet meer aanroepen.
