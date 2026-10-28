# Naamsvermelding

De tekeningen in deze map komen uit Workout Guide (https://github.com/bryllim/workout-guide) van
Bryl Lim. Workout Guide bouwt voort op de poses van Everkinetic (https://github.com/everkinetic/data,
oorspronkelijk gemaakt door Greg Priday). Beide onder de licentie CC BY-SA 4.0
(https://creativecommons.org/licenses/by-sa/4.0/).

Wat er voor ASCEND veranderd is:

- Per oefening staan de drie beelden (begin, midden, eind) samen in één bestand `<naam>.json`,
  met één viewBox die om de drie beelden past, zodat ze op dezelfde schaal en plek staan.
- Het zijn drie standen van de beweging, in de volgorde begin, midden, eind. De bron bewaart ze niet altijd
  in die volgorde; ASCEND zet ze per tekening goed (`src/data/exerciseArt.ts`, `ART_ORDER`).
- Alleen de vorm van het silhouet is bewaard; de witte vulling is weggelaten, zodat de app de kleur
  zelf bepaalt uit haar eigen tekenkleuren.
- De getallen in de paden zijn afgerond op een tiende, wat op het formaat van de tekening niet te zien is.

Welke tekening bij welke oefening hoort, staat in `src/data/exerciseArt.ts`. Bij een oefening waar de
tekening een iets andere variant laat zien, zegt het blad van de oefening wat anders is.

In de app staat de naamsvermelding onder elke tekening, met een verwijzing naar de pagina Bronnen
(Gidsen en kennis, soort Afbeeldingen).
