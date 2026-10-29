# De dag van een training

Datum: 2026-10-29
Status: aangenomen

## Besluit

Een log telt bij het weergeven op de dag van zijn geplande training als die hoogstens een dag van `completedDate` afligt (`engine/logDay.ts#logDay`); anders op `completedDate`. De log wordt nooit herschreven, het is alleen lezen. In het blad "Duur aanpassen" van een nieuwe MacroFactor-training kies je voortaan "Welke dag?": de dag van het bestand of, als de rij bij een geplande training op een andere dag hoort, die dag (standaard). De gekozen dag wordt de `completedDate` van de nieuwe log.

## Reden

Een krachttraining die op woensdag 28 oktober begon en op donderdag 29 werd afgemaakt, kreeg de datum van het bestand (woensdag) maar hoort bij de geplande Bovenlichaam A van donderdag. De rij in Week stond goed op donderdag met een vinkje, maar de grafiek "Belasting per dag" zette de belasting op woensdag en zei "Woensdag was je zwaarste dag". Rij en grafiek zeiden dus iets anders.

Wat omgezet is, wordt alleen getoond: de grafiek en de zin eronder (`engine/weekProfile.ts#dayLoads`), de tijd en kilometers bovenaan Week (`engine/weekLogs.ts`, met `plannedById`), "gedaan vandaag" op Vandaag (`pages/Today.tsx`) en de bolletjes in de maandkalender van het Logboek (`components/MonthCalendar.tsx`).

Wat bewust op `completedDate` blijft: de beenindex, de belasting over 7 en 28 dagen, readiness, de planning en alles wat de planning leest (`planGolden.test.ts` beweegt niet), de weekterugblik (`engine/weekReview.ts`), de lijst van het Logboek en de datum in het detailblad van een log. Die rekenen met wanneer het lichaam het werk deed, of tonen het feit zoals het is opgeslagen. Een deel van die training lag op de ene dag, het lichaam heeft dat niet verschoven.

## Alternatieven

- De `completedDate` van de bestaande log aanpassen. Mag niet: historie wordt nooit herschreven.
- Overal op de dag van de geplande training rekenen. Dan verschuift de beenindex en wat de planning leest, en dat verandert de planning stil.
- Meer dan een dag verschil ook meenemen. Een training die weken later is ingehaald of verschoven heeft een eigen datum die klopt; de grens van een dag dekt het werkelijke geval (begonnen op de ene dag, klaar op de volgende).
- Geen keuze in het blad, alleen de weergave. De nieuwe log zou dan toch de verkeerde datum dragen voor alles wat op `completedDate` rekent.

## Bron

Gesprek met de eigenaar, met een nagemaakt bestand als testgeval.

## Vervangt

Niets. Vult `2026-10-29-mf-training-te-lang.md` aan.

## Terugdraaien

`engine/logDay.ts` weghalen en de aanroepen in Week, Vandaag en de maandkalender terugzetten naar `completedDate`; de keuze "Welke dag?" uit `MacroFactorDurationSheet.tsx` en `engine/macrofactorDuration.ts` halen. Gemaakte logs blijven staan zoals ze zijn.
