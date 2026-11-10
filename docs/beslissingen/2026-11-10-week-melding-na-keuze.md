# Week zegt dat jij koos om een beendag te laten staan

Datum: 2026-11-10
Status: aangenomen

## Besluit

Koos je op Vandaag "Benen fris" en blijft een zware beendag van vandaag staan, dan blijft de melding "te dicht op elkaar" in Week staan, maar ze zegt: "Benen fris, je liet Benen A (zwaar) staan." Het voorstel is dan een gewone tekstknop in plaats van de hoofdknop. De instelling "Melding na jouw keuze" heeft twee standen: Met jouw keuze (advies) en Gewone melding (het oude gedrag).

## Reden

Vandaag zei "Benen fris. Benen A (zwaar) blijft staan." terwijl Week dezelfde training als dringend probleem meldde, met "Bekijk voorstel" als mintknop. Twee schermen die elkaar tegenspreken. De melding verbergen kan niet (Liever niet laat het probleem staan), dus Week erkent jouw keuze en wordt rustiger.

## Keuzes

- Afgeleid uit het bestaande ochtendantwoord (`morningCheckIns`, legs = fris, niet alleen bovenlichaam, niet "Gaat goed"). Er wordt niets nieuws opgeslagen, dus geen migratie. Ongedaan maken op Vandaag haalt het antwoord weg en zet daarmee de gewone melding terug.
- Alleen voor vandaag en alleen voor het paar waar een training van vandaag in zit (`engine/weekKept.ts`). Een antwoord van gisteren telt niet; dezelfde training volgende week waarschuwt gewoon.
- Alleen de regel te dicht op elkaar (LEG-SPACING). De andere waarschuwingen en de planning bewegen niet.
- Staat er in dezelfde week nog een ander paar open, dan blijft de hoofdknop (alleen als elke open melding gekozen is, wordt het een tekstknop). Het oude feit blijft als tweede regel staan, zodat niets weggepoetst wordt.
- De instelling staat in een nieuw blad "Meldingen in Week" naast "Voorstel bij een probleem in de week", omdat de pagina Planning al op het plafond van twaalf rijen zat. De schakelaar voor het weekvoorstel is dus verhuisd, niet veranderd.
- Het veld `weekAfterChoice` is optioneel; ontbreekt het (oude back-up), dan geldt het advies. Een kapotte waarde wordt bij het importeren weggelaten.

## Alternatieven

De melding helemaal verbergen na Benen fris: tegen de regel dat een probleem niet stil verdwijnt. De hoofdknop laten staan: houdt de tegenspraak in stand.

## Bron

Melding van de eigenaar op 10 november. Stem: `docs/beslissingen/2026-11-09-stem-van-ascend.md`.

## Vervangt

Niets.

## Terugdraaien

Zet de instelling op Gewone melding, of haal `engine/weekKept.ts` en de aanroep in `state/adviceAndWeek.ts` weg.
