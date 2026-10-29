# De dag van een training

Datum: 2026-10-29
Status: aangenomen

## Besluit

Een log uit MacroFactor (`source === 'macrofactor'`) telt bij het weergeven op de dag van zijn geplande training als die precies de dag NA `completedDate` is (`engine/logDay.ts#logDay`): de training begon voor middernacht en was erna klaar. Anders telt `completedDate`. Een handmatige log, een horlogelog, een log met een zelf gekozen dag en een log bij een sessie van een dag eerder houden hun eigen datum. De log wordt nooit herschreven, het is alleen lezen. In het blad "Duur aanpassen" van een nieuwe MacroFactor-training kies je voortaan "Welke dag?": de dag van het bestand of, als de rij bij een geplande training op de dag erna hoort (en die dag niet na vandaag ligt), die dag (standaard). Dezelfde grens (`isNextDay`) geldt voor beide. De gekozen dag wordt de `completedDate` van de nieuwe log; `completedAt` is het echte eind (start plus duur) als dat op die dag valt, anders 00:15 op die dag.

## Reden

Een krachttraining die op woensdag 28 oktober begon en op donderdag 29 werd afgemaakt, kreeg de datum van het bestand (woensdag) maar hoort bij de geplande Bovenlichaam A van donderdag. De rij in Week stond goed op donderdag met een vinkje, maar de grafiek "Belasting per dag" zette de belasting op woensdag en zei "Woensdag was je zwaarste dag". Rij en grafiek zeiden dus iets anders.

Wat omgezet is, wordt alleen getoond: de grafiek en de zin eronder (`engine/weekProfile.ts#dayLoads`), de tijd en kilometers bovenaan Week en de Weekterugblik (`engine/weekLogs.ts` en `engine/weekReview.ts`, met `plannedById`, zodat Week en de terugblik op een weekgrens hetzelfde tellen), "gedaan vandaag" op Vandaag (een log van vandaag of een log die vandaag telt) en de bolletjes in de maandkalender van het Logboek. Een log die je met "Welke dag?" op de dag erna zette wordt ook als dezelfde workout herkend (`engine/macrofactorSame.ts`, `engine/macrofactorNames.ts`: een dag naast de dag van het bestand telt mee), zodat een hernoemde workout geen dubbele log geeft.

Wat bewust op `completedDate` blijft: de beenindex, de belasting over 7 en 28 dagen, Stand (`weeklyLoad`), readiness, de planning en alles wat de planning leest (`planGolden.test.ts` beweegt niet), de lijst van het Logboek en de datum in het detailblad van een log. Die rekenen met wanneer het lichaam het werk deed, of tonen het feit zoals het is opgeslagen. Ook de coachregel "gisteren" (`yesterdayLogs` op Vandaag) en de rij van een losse log in Week blijven op hun eigen dag: de eerste leest voor de planning, de tweede heeft geen geplande sessie.

## Alternatieven

- De `completedDate` van de bestaande log aanpassen. Mag niet: historie wordt nooit herschreven.
- Overal op de dag van de geplande training rekenen. Dan verschuift de beenindex en wat de planning leest, en dat verandert de planning stil.
- Elke log met een geplande sessie op hoogstens een dag verschil. Te breed: een handmatige log of een horlogelog bij een sessie van een dag eerder of later zou stil van dag wisselen. Alleen de MacroFactor-log over middernacht heeft hier een reden voor.
- Geen keuze in het blad, alleen de weergave. De nieuwe log zou dan toch de verkeerde datum dragen voor alles wat op `completedDate` rekent.

## Bron

Gesprek met de eigenaar, met een nagemaakt bestand als testgeval, en de review van Warden.

## Vervangt

Niets. Vult `2026-10-29-mf-training-te-lang.md` aan.

## Terugdraaien

`engine/logDay.ts` weghalen en de aanroepen in Week, Vandaag, de terugblik en de maandkalender terugzetten naar `completedDate`; de keuze "Welke dag?" uit `MacroFactorDurationSheet.tsx` en `engine/macrofactorDuration.ts` halen en de ruimere dag in `macrofactorSame.ts` en `macrofactorNames.ts` terugzetten. Gemaakte logs blijven staan zoals ze zijn.
