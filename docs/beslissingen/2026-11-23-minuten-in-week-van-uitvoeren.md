# Minuten in de week van uitvoeren

Datum: 2026-11-23
Status: aangenomen

## Besluit

Staat het log van een training in een andere week dan de geplande sessie, dan tellen de minuten in de week van het log (de week van uitvoeren). De geplande week blijft gelijk: de training telt daar als gedaan in "x van n", en de regel zegt erbij dat hij in een andere week gedaan is, zodat de minuten niet lijken mee te tellen.

- De geplande week: "2 van 2 gedaan, 1 in de week erna · 45 min". Een log een week eerder: "1 in de week ervoor"; verder weg (achteraf gekoppeld): "1 in een andere week".
- De week van het log: "0 gedaan · 1 uit de week ervoor · 1:30 uur". Het is geen losse training: hij hoort bij een geplande training, alleen in een andere week.
- Dezelfde woorden in de weekterugblik (`engine/weekGlance.ts#weekCountLine`), de rij Je week in Week (`engine/weekList.ts#weekSoFarRow`) en de kaart Weekterugblik op Vandaag. De woorden komen uit één functie, `weekGlance.ts#elsewhereNotes`.
- De dagrij in Week blijft zoals hij was: hij staat op de geplande dag en zegt "gedaan ma 12".
- Welke week het log hoort, volgt de dag van het log uit `engine/logDay.ts`, dezelfde dag als die van de minuten. De weekgrens is maandag 00:00 in Europe/Amsterdam (de lokale datum van het log). Een training uit MacroFactor die zondag voor middernacht begon voor de training van maandag, telt op maandag en geeft dus geen andere week.

## Reden

De eigenaar koos op 23 november het advies: "Ja advies, week van uitvoeren". De minuten zijn belasting, en belasting hoort bij de week waarin je hem deed; zo werken de bergkam, de beendag en de belasting over zeven dagen al. Gedaan hoort bij de planning: de geplande week heeft hem afgerond. Alleen de regel "2 van 2 gedaan · 45 min" deed alsof alles in die week gebeurde.

## Alternatieven

- De minuten mee naar de geplande week. Niet gekozen: dan lopen de minuten van de terugblik en de belasting per week uit elkaar, en mist de week van uitvoeren tijd die je wel liep.
- In de geplande week niets zeggen. Niet gekozen: dat was de oude stand (Warden, 15 november, I-58).

## Bron

Backlog I-58 (Warden Week, 15 november), vastgelegd in `src/engine/wardenWeekProef.test.ts`; de weekgrens in `src/engine/weekGlance.amsterdam.test.ts`. Antwoord van de eigenaar, 23 november.

## Vervangt

Niets. Vult `2026-11-15-gemist-en-opnieuw-plannen.md` aan: de rij en "x van n" blijven op de geplande dag.

## Terugdraaien

Haal `doneElsewhere` en `fromElsewhere` uit `engine/weekReview.ts` en de stukjes uit `weekCountLine`, `weekSoFarRow` en de kaart; de minuten zelf veranderen niet.
