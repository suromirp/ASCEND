# Tempo bij zone 2: grafiek en uitleg achter de i

Datum: 2026-11-09
Status: aangenomen

## Besluit

De kaart Tempo bij zone 2 in Je stand krijgt een i. Daarachter staat een blad met een grafiek en een korte uitleg in gewone woorden (stap 6 en 7 van het bouwvoorstel in `docs/onderzoek/Tempo bij zone 2, stabiele stukken.md`, in een eerste, eenvoudige vorm). Het is een aanvulling op `2026-11-09-tempo-stabiele-stukken.md`.

Wat er gebouwd is:

- `engine/zone2Chart.ts#zone2Chart` maakt de punten voor de grafiek uit de uitkomst van `aerobicTrend`: geen tweede berekening, dus grafiek, kaart en tekst lezen dezelfde uitspraak (`zone2Statement`). Het venster is dat van de uitspraak: de laatste 8 weken tot vandaag.
- Elke loop is één stip, niet elk stuk: stukken uit dezelfde loop delen dag, slaap en weer, en zijn samen één meting (hoofdstuk 6). Een warme loop staat als open stip en telt niet mee.
- De lijn van de uitspraak staat er alleen als de uitspraak iets zegt (sneller, langzamer, gelijk of nog geen duidelijke verandering). Bij een eerste schatting en bij te veel verschil alleen de stippen, zodat de grafiek niet sterker spreekt dan de tekst.
- Om de lijn een lichte waaier: de lijn met de helling van de twee randen van de band van 80 procent, door het zwaartepunt van de lopen. Zo ziet een lezer hoe schuin de lijn waarschijnlijk loopt.
- De as staat in tempo per km, sneller boven, op een ronde stap (5, 10, 15, 30 of 60 seconden).
- `engine/zone2Chart.ts#zone2Explanation` geeft de tekst in alinea's: wat het getal is, wat sneller of trager betekent, hoeveel lopen en stukken de uitspraak draagt, en wanneer ASCEND zwijgt (geen loop, te weinig lopen, te veel verschil). Elke drempel in de tekst komt uit `zone2Rules.ts`.
- `components/Zone2InfoSheet.tsx` (blad via `useSheetClose`, `sheetRef`, `SheetGrip`) en `components/stand/Zone2PaceChart.tsx` tekenen alleen. De grafiek beweegt niet: hij staat meteen op zijn eindstand, ook in Rustig en Uit.
- Geen nieuwe instelling. De bestaande "Tempo uit stabiele stukken" werkt door: staat hij uit, dan zegt de tekst dat elke loop met de hele loop telt, en noemt hij geen stukken.

## Eigen keuzes

- Een stip per loop in plaats van per stuk, met het aantal stukken in de tekst en in een SVG-titel bij de stip.
- Het venster van 8 weken in plaats van de 12 weken van de weekpunten op de kaart: dan is elke volle stip er een die de uitspraak draagt.
- De waaier draait om het zwaartepunt en laat de onzekerheid van het niveau zelf weg. Daarom heet hij in de tekst "hoe schuin de lijn kan lopen", niet de marge van het tempo.
- Stippen zijn niet tikbaar (te klein voor 44 px). Tempo en aantal stukken per stip staan alleen in een SVG-titel; de grafiek als geheel heeft een omschrijving voor schermlezers.

## Reden

De backlog (eigenaar, 7 november): de uitspraak moest eerlijker en uitlegbaar. Het besluit van de stabiele stukken liet de grafiek en de tekst achter de i open.

## Alternatieven

- De bestaande `TrendLineChart` met weekpunten: die laat de lopen zelf en de band niet zien.
- Een band om het tempo in plaats van een waaier: dat vraagt een tweede berekening naast `zone2Statement`.

## Wat nog niet gebouwd is

- De bronnen achter de i (`data/researchSources.ts`).
- Hoogste en laagste week benoemen in de grafiek.
- Een tik op een stip die de loop opent.

## Bron

`docs/onderzoek/Tempo bij zone 2, stabiele stukken.md`, `docs/beslissingen/2026-11-09-tempo-stabiele-stukken.md`, `docs/backlog.md`.

## Vervangt

Niets.

## Terugdraaien

De `InfoButton` en `Zone2InfoSheet` uit `components/AerobicTrendCard.tsx` halen; `zone2Chart.ts` en de twee componenten kunnen dan weg. Er wordt niets bewaard.
