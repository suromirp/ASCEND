# Een periode in de weeklijst is een eigen paneel (variant A)

Datum: 2026-11-09
Status: aangenomen

## Besluit

Een periode (vakantie, zonder sportschool, tocht, vrije dagen) staat in de weeklijst als een eigen afgerond paneel met een lichte ijsblauwe tint (`--color-period-tint`, rand `--color-period-edge`). Bovenin één kop: het pictogram van de soort, de naam, en rechts de dagen van de hele periode ("14 t/m 18 nov", `periodSpan` in `engine/leaveWeek.ts`), met je notitie klein eronder. De dagen van deze week staan in het paneel, iets ingesprongen, als gewone rijen. Waar het paneel stopt, stopt de periode; loopt hij door naar de vorige of volgende week, dan blijft die kant open. De uitleg wat de periode betekent staat in het blad dat een tik op de kop opent. Dit vult `2026-11-09-week-band.md` aan: de band en de dunne lijn links zijn vervangen door het paneel.

## Reden

De eigenaar vond de band "nog steeds niet echt mooi": een rij zoals de andere, vier regels tekst, een bijna onzichtbare lijn en geen zichtbaar eind. Uit drie varianten (A paneel, B lucht, C lijn; afdrukken op de branch `claude/week-band-varianten`) koos hij A, ook het advies van de ontwerper en de coördinator: alleen het paneel zegt in één oogopslag waar de periode begint en stopt.

## Alternatieven

- B, lucht en bergen als kop: het meest alpine, maar lucht midden in de lijst botst met de regel dat lucht alleen bovenaan staat.
- C, een dikke lijn met een kleine kop: het rustigst, maar de kop valt weg tussen de rijen en het eind blijft subtiel.

## Vervangt

Het deel van `2026-11-09-week-band.md` over de vorm van de band en de lijn links.

## Terugdraaien

`LeaveWeekPanel` in `components/LeaveWeekBand.tsx` terug naar de band boven de eerste dag (git-geschiedenis van 9 november).
