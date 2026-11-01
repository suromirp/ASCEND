# Ochtendkaart na je antwoord

Datum: 2026-11-01
Status: aangenomen

## Besluit

Na een antwoord krijgt de ochtendkaart zijn eigen korte hoogte in plaats van die van de vraag. De hoogte loopt in 250 ms (Rustig 150 ms, ease-out) van de vraag naar het gevolg en later naar de ingeklapte rij, zodat de missiekaart eronder soepel meeschuift (`useHeightMorph` in `components/motion.ts`, `.mx-height` in `src/index.css`). Bij Beweging Uit en bij beperkte beweging staat de kaart meteen op de eindstand. "Ongedaan maken" staat direct onder de zin.

`morningConsequence` noemt de belangrijkste training van vandaag: een test of race (via de rol, `isTestOrRace`) eerst, anders de volgorde van de dag. Bij twee trainingen noemt hij beide ("Testloop 5 km en Bovenlichaam B blijven staan."), bij meer dan twee de eerste twee en het aantal dat erbij komt.

## Reden

Na "Fris genoteerd." stond er een groot leeg vlak met alleen onderaan "Ongedaan maken", en het gevolg noemde alleen Bovenlichaam B terwijl vandaag eerst de testloop staat.

## Bron

`docs/beslissingen/2026-10-31-ochtendkaart-vernieuwd.md`.

## Terugdraaien

Zet `MorningCard.tsx`, `morningCard.ts` en de regels `.mx-height` terug op de vorige versie.
