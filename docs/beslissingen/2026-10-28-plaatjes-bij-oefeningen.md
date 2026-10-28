# Plaatjes bij oefeningen

Datum: 2026-10-28
Status: aangenomen

## Besluit

Elke oefening in Forge krijgt een kaartje van 44 bij 44 px met de spieren die werken, en een blad met de beweging in drie stappen (tekeningen van Workout Guide, CC BY-SA 4.0), het spierkaartje, Doen, Let op en Vaak fout, en de naamsvermelding. Waar er geen tekening is, is het spierkaartje het hoofdbeeld. Het ontwerp is v2 van Cartographer, goedgekeurd door de eigenaar.

## Reden

Een oefening die je niet kent, wil je zien: hoe de beweging gaat en welke spieren je voelt. De spierkaart werkt voor elke oefening en kost niets; de tekeningen laten de beweging zien. Workout Guide is de enige bron die gratis is, offline mag, in een openbare repo mag en in één nette stijl is (`docs/onderzoek/Afbeeldingen bij oefeningen.md`).

## Wat er gebouwd is

- De koppeling in `data/exerciseArt.ts`: 85 oefeningen met een tekening van dezelfde oefening, 28 met een variant (met een regel "Op de tekening: ..." eronder), 7 zonder (Spanish squat, tibialis raise, weighted tibialis raise, machine torso rotation, Kelso shrug, dumbbell pullover, reverse Nordic curl). Samen 92 tekeningen, want sommige oefeningen delen er een.
- Per tekening één bestand `public/exercise-art/<slug>.json`: een viewBox om de drie beelden samen en drie paden, de getallen afgerond op een tiende (afronden op hele getallen vervormt zichtbaar), zonder kleur. De app tekent ze in `currentColor`. De map heeft `LICENSE.md` en `ATTRIBUTION.md`.
- De spierkaart: `data/muscleRegions.ts` (19 spiergroepen als zachte bogen op het figuur van Lichaam, met voor en achter), `engine/muscleMap.ts` (welke vlakken, welke kant, de snede), getest.
- Het blad `ExerciseArtSheet` (uitgroei uit het kaartje, `useSheetClose`, `SheetGrip`), het kaartje `ExerciseArtButton` in de kop van een oefening in de training en in de rijen van de lijst op Forge.
- Beweging: bij openen één keer 1, 2, 3 in 900 ms ease-out en stil op 3, daarna lichten de spieren op; Rustig half zo lang; Uit en beperkte beweging meteen de eindstand; geen lus. `haptics.tap` alleen bij een stap die je zelf zet, met 140 ms rem.
- Laden: de tekeningen staan niet in de precache (ze zijn samen ruim 5 MB, ongeveer 1,6 MB ingepakt). Ze laden als een blad opent, staan in een eigen cache "exercise-art" in de service worker (eerst uit de cache) en die van je eigen trainingen worden vier seconden na het openen een voor een op de achtergrond opgehaald, niet bij "Alleen spierkaart" of "Uit", niet zonder verbinding en niet bij databesparing. Elke aanvraag stopt na 8 seconden; zonder tekening blijft de spierkaart.
- Instelling "Plaatjes bij oefeningen": Spierkaart en tekening (advies), Alleen spierkaart, Uit. In Forge onder Weergave op Forge, in de zoekindex, de samenvatting, de uitleg, de lijst "wijkt af van het advies" en de back-up (een onbekende waarde valt terug op het advies).
- Bronnen: een nieuwe soort "Afbeeldingen" met Workout Guide en Everkinetic; de naamsvermelding in het blad wijst ernaar (`/bronnen?soort=afbeeldingen`).

## Alternatieven

Alles in de precache: de installatie en elke update worden dan ruim 5 MB groter, voor tekeningen die je grotendeels niet opent. Eigen pictogrammen per oefening: 120 tekeningen die op klein formaat te onderscheiden moeten zijn, dat lukt niet. Een lus-animatie: past niet bij de regel dat er geen lus draait.

## Bron

`docs/onderzoek/Afbeeldingen bij oefeningen.md`, het ontwerp v2 van Cartographer en de goedkeuring van de eigenaar.

## Vervangt

Niets.

## Terugdraaien

Zet de instelling op Uit, of haal `ExerciseArtButton` uit `ForgeWorkout.tsx` en `ExerciseRow.tsx`. De map `public/exercise-art/` en `data/exerciseArt.ts` kunnen dan weg; er is niets opgeslagen in de gegevens van de gebruiker behalve de instelling.
