# Een training telt op de dag van uitvoeren

Datum: 2026-11-23
Status: aangenomen

## Besluit

Een gedane training telt op de dag dat hij echt gedaan is, niet op de geplande dag: in de minuten, in "x van n gedaan", in de weekbalk, in de belasting, in de beenindex en in Stand. De dag is de dag van het log (`engine/weekLogs.ts#countDayOf`, met `engine/logDay.ts` dezelfde dag als die van de minuten). Alleen de telling verandert: geen log en geen geplande training wordt herschreven, en de dagrij in Week blijft op de geplande dag staan met "gedaan ma 12" (`engine/weekRow.ts#doneOnOtherDay`).

Drie gevallen, met hoe het was en wat er nu geldt:

1. Een Forge-training die openstond en later is afgesloten. Afronden stelde al de dag van de laatste echte set voor (`engine/forgeSession.ts#finishDayDefault`, `2026-11-15-dag-van-afronden.md` en `-opnieuw-afvinken.md`), en die dag wordt de `completedDate` van het log. Minuten, belasting, beenindex en Stand volgden die dag al. Wat afweek: lag die dag in een andere week dan de geplande, dan telde "x van n" en de weekbalk nog in de geplande week. Dat is nu gelijk aan geval 3. Een set om 23:50 zondag in Amsterdam en Afronden op maandag telt op zondag; een set om 00:10 maandag telt op maandag.
2. Een verplaatste of ingehaalde training. Verplaatsen zet de rij zelf op de nieuwe dag (`scheduledDate`, met `movedFromDate`), een inhaal is een nieuwe rij met `catchUp` en de oude rij wordt overgeslagen en telt niet (`engine/catchUp.ts`). Gedaan op de nieuwe dag klopte dus al. Wat afweek: gedaan op een andere dag dan de nieuwe (bijvoorbeeld al op zondag gedaan terwijl hij naar dinsdag van de week erna verplaatst stond) telde in "x van n" en de weekbalk op de geplande dag. Nu op de dag van uitvoeren.
3. Een log in een andere week dan gepland (I-58). De minuten telden al in de week van het log, maar "x van n" en de weekbalk in de geplande week, en de week van het log noemde hem een losse training. Nu telt hij helemaal in de week van uitvoeren.

Wat je ziet:

- De geplande week zegt waar hij heen ging: "1 van 1 gedaan, 1 in de week erna · 45 min"; stond er verder niets: "1 gedaan in de week erna". Een log een week eerder: "in de week ervoor"; verder weg (achteraf gekoppeld): "in een andere week".
- De week van uitvoeren zegt waar hij vandaan kwam: "1 van 2 gedaan, 1 uit de week ervoor · 1:30 uur". Hij telt daar in gedaan en in "van n", en is geen losse training.
- Dezelfde woorden en getallen in de weekterugblik (`engine/weekGlance.ts#weekCountLine`), de rij Je week in Week (`engine/weekList.ts#weekSoFarRow` met `weekGlance.ts#shiftedProgress`), de kaart Weekterugblik op Vandaag en het jaaroverzicht (`engine/seasonPlan.ts`). De woorden komen uit `weekGlance.ts#elsewhereNotes`, de verschuiving uit `engine/weekLogs.ts#weekExecutionShift`.
- De weekbalk op Vandaag en in de terugblik zet een gedane training op de dag van uitvoeren, ook uit een andere week (`engine/weekLogs.ts#stripSessionsByDay`).
- De weekgrens is maandag 00:00 in Europe/Amsterdam, op de lokale datum van het log. Een training uit MacroFactor die zondag voor middernacht begon voor de training van maandag, telt op maandag (`2026-10-29-dag-van-een-training.md`) en geeft dus geen andere week.

Wat bij de geplande week blijft: gemist, de sleuteltraining van de week (`keyDone`, de coachregel "sleuteltraining 3 van 4") en het advies "Alles gedaan wat gepland stond". Die gaan over wat er gepland stond; een gedane training is daar nooit gemist. Een training die openstaat in Forge en nog niet is afgesloten telt nog nergens mee: er is nog geen log, Week zegt "loopt nog".

Een oordeel over de geplande week leest de telling van de geplande week, nooit de verschuiving (Warden, 23 november). `buildWeekReview` geeft daarvoor `plannedWeek: { done, planned }`: elke training van die week met een log, waar en wanneer ook. Zo lezen Herhaal de week (`engine/repeatWeek.ts`), de koers over de laatste weken (`engine/onCourse.ts#recentAdherence`, ook de sleuteltraining en het ritme in Stand, `engine/standRhythm.ts`) en de toets voor een extra loop (`engine/extraRun.ts`). Anders slaat een voorstel om door alleen de dag van een log: 5 gepland, 3 gedaan waarvan de lange duurloop van zondag op maandag, is 3 van 5 en geen herhaling; op de verschoven telling werd het 2 van 4 en wel. Elke aanroeper geeft `plannedById` mee, zodat een training uit MacroFactor die zondag om 23:30 begon voor maandag ook daar op maandag telt. De weekmelding op zondag is een telling, geen oordeel: dezelfde getallen en woorden als de terugblik waar hij naartoe leidt ("3 van 4 trainingen gedaan, 1 in de week ervoor, 1 uit de week erna").

Een week waarvan de enige training in een andere week gedaan is, verdwijnt niet: de kaart Weekterugblik, Bekijk je week in het Logboek en de rij Je week staan er met "1 gedaan in de week erna" (`engine/weekGlance.ts#hasWeekTally`, `onlyElsewhereText`). De kaart op Vandaag noemt beide kanten, net als Week (`weekCardCount`).

## Gemist en Week opnieuw plannen (I-59)

- Week opnieuw plannen zet een aangenomen inhaal van deze week terug naar het plan; het voorstel zegt dat al ("Dat geldt ook voor wat je inhaalde"). Dat blijft zo: het is het kleinste juiste, opnieuw plannen is "terug naar het plan" en de inhaal is na een nieuwe week opnieuw voor te stellen. De terugblik zegt het nu ook. Bij een gemiste sleuteltraining staat er na de belofte van een inhaal: "Week opnieuw plannen zet de rest van je week terug naar het plan, ook een inhaal." (`engine/weekGlance.ts#MISSED_KEY_REPLAN_HINT`).
- Valt Gemist buiten de twee regels van Let op, dan staat hij onder de telling met dezelfde verwijzing naar Week opnieuw plannen als de week die rij heeft (`weekRestLines`), nog steeds zonder advies.
- Een dagrij met een dag aan het eind ("gedaan di 27") leest voor de schermlezer als één zin; de twee zichtbare delen zijn er alleen voor het afkappen (`components/WeekPlanner.tsx`).

## Let op en de voorstellen op Vandaag (I-72)

- "Hier staat al een voorstel voor op Vandaag" (`engine/weekFixProposal.ts#TAKEN_LINE`) staat er alleen als een voorstel op Vandaag een training van de melding zelf raakt. Raakte het eigen voorstel van Week toevallig een andere training waar Vandaag een voorstel voor heeft, dan zei Week dat ook; nu vallen die keuzes van het weekvoorstel weg (twee voorstellen trekken nooit aan dezelfde training) en zegt Week niet dat Vandaag er al een heeft. De snelle helft (`weekNoticeConcerns`) en de volledige (`weekNotice`) zeggen hetzelfde over gedekt.
- Op je rustdag in een periode zonder sportschool geeft één training één punt in Let op (`engine/weekConcerns.ts#dedupeRestNoGym`, al gebouwd op 22 november); er is nu ook een toets over de hele week.



De eigenaar koos op 23 november eerst het advies "week van uitvoeren" voor de minuten, en verbreedde het dezelfde dag: "als een forge workout niet is afgesloten, of workouts die verplaatst worden, moeten gelden op de dag dat ze worden afgenomen". De belasting, de beenindex en Stand rekenden al zo; "x van n" en de weekbalk niet, waardoor dezelfde training in de ene telling in de ene week en in de andere telling in de andere week stond. Over de weken samen telt een training nog steeds één keer.

## Alternatieven

- De minuten mee naar de geplande week. Niet gekozen: dan lopen de minuten en de belasting per week uit elkaar.
- Alleen de minuten in de week van uitvoeren, gedaan in de geplande week (de eerste versie van dit besluit). Ingehaald door de verbreding van de eigenaar.
- De rij in Week naar de dag van het log verplaatsen. Niet gekozen: dat herschrijft de planning om een log te tonen (werkbriefje Week, Nooit).
- Ook de sleuteltraining en gemist naar de week van uitvoeren. Niet gekozen: een gedane training is nooit gemist, en de sleuteltraining is die van de geplande week; omzetten zou Herhaal de week en de coachregel laten springen zonder dat er iets aan de planning veranderd is.

## Bron

Backlog I-58 (Warden Week, 15 november) en I-59 (Pathfinder, 15 november). Toetsen per geval in `src/engine/wardenWeekProef.test.ts` (log in een andere week, verplaatst, inhaal, weekbalk) en `src/engine/weekGlance.amsterdam.test.ts` (de weekgrens om 00:00, de dag zelf, MacroFactor over middernacht, Forge afgesloten op maandag); het jaaroverzicht in `src/engine/seasonPlan.test.ts`; Herhaal de week op de geplande telling in `src/engine/repeatWeek.ts` en `src/engine/repeatWeek.test.ts`. Antwoorden van de eigenaar, 23 november.

## Vervangt

Deels `2026-11-15-gemist-en-opnieuw-plannen.md`: daar bleef "x van n" op de geplande dag; nu telt het op de dag van uitvoeren. De rij in Week blijft op de geplande dag. Vult `2026-11-15-dag-van-afronden.md` en `2026-10-29-dag-van-een-training.md` aan.

## Terugdraaien

Laat `weekExecutionShift` in `engine/weekReview.ts` en `engine/seasonPlan.ts` weg, de weekbalk weer op `scheduledDate` filteren, en haal de stukjes uit `weekCountLine`, `weekSoFarRow` en de kaart. Er verandert geen opgeslagen vorm; de minuten zelf veranderen niet.
