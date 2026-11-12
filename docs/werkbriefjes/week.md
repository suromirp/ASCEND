# Week

De Week-tab en wat eraan hangt: waarschuwingen, slepen, ruilen, verplaatsen van een gemiste training, vakanties en de weekterugblik.

## Bestanden
- `src/pages/Week.tsx#moveTo` elke verplaatsing (slepen en blad) loopt hierdoor
- `src/engine/weekDrag.ts#decideMove` schoon meteen toepassen, anders Akkoord via `RescheduleDialog`
- `src/engine/weekConcerns.ts#weekConcerns` de waarschuwingen ("Let op") en de rijtekst per regel; `weekKept.ts#markKept`: na Benen fris op Vandaag zegt de beenmelding dat jij koos, het voorstel wordt een tekstknop (afgeleid, alleen vandaag, instelling `weekAfterChoice`)
- `src/engine/weekFixProposal.ts#planWeekFix` een oplossing is een voorstel met Akkoord; `src/engine/fullWeek.ts#fullWeekAdvice` een volle week na een weggevallen dag (WEEK-FULL): één voorstel welke training vervalt, eerst de extra van ASCEND, nooit test, wedstrijd, sleuteltraining of iets van jou; per week één id (`fullWeekId`), na Liever niet de gewone regel `fullWeekLine` in `WeekNotice` (`plain`); wijkt voor elk ander voorstel uit `computeAdvice` in die week; `extra` als rol zegt niet wie hem neerzette (ook raceblok en golfweek), gedaan vraag je aan `adviceShared.ts#isDone`; Begrepen slaat ook `accepted` op, dus gevolgd lees je uit `planChangeLog` (`fullWeekFollowed`) (`docs/beslissingen/2026-11-12-week-na-gemiste-dagen.md`)
- `src/engine/weekSwap.ts#checkSwap` ruilen van twee trainingen, `src/storage/weekSwap.ts#writeSwap` schrijft
- `src/engine/catchUp.ts#catchUpRows` gemiste training naar later: nieuwe rij plus overgeslagen oude
- `src/storage/catchUpApply.ts#writeCatchUp` schrijft die twee rijen
- `src/engine/replanWeek.ts#replanWeek` week opnieuw plannen, `src/storage/weekReplan.ts#planWeekReplan` voor het voorstel
- `src/engine/leaveWeek.ts#leaveWeek` de band van een periode in de weeklijst: één per periode per week, boven de eerste dag, de rijen eronder gewone rijen met een lijn links (`data-period-rail`), een lege dag "Wo 18 · vrij"; `components/LeaveWeekBand.tsx`, besluit `docs/beslissingen/2026-11-09-week-band.md`
- `src/engine/changeLog.ts#weekAdjustments` Aangepast door ASCEND: één venster (`ADJUST_WINDOW_DAYS`), de rij onder de dagen, het blad (`components/WeekAdjustments.tsx`) en het woord "aangepast" op de dagrij uit één uitkomst; jouw slot, Week opnieuw plannen, de eerste opbouw en de inhoud van de weekplanning geven geen regel; invariant op de tekstkaart (`week-aangepast`); lees Wat ASCEND aanpaste alleen uit `weekAdjustments`, `weekChanges` en `adjustedSessionReasons` zijn niet meer voor het scherm; `src/engine/weekReview.ts#buildWeekReview` de weekterugblik, zonder rij Wat ASCEND aanpaste
- `src/storage/undoPlanChange.ts#undoPlanChangeNow` Ongedaan maken uit de melding
- `src/engine/todayCards.ts#arrangeToday` de vaste rang van kaarten boven de missie op Vandaag

## Nooit
- Een probleem in de week stil oplossen: altijd een voorstel met Akkoord. Liever niet laat de kaart staan, het probleem verberg je niet.
- Slepen buiten `moveTo` en `decideMove` om, of een verplaatsing zonder slot (`movedFromDate`, Ongedaan maken).
- Historie, voorbije of gelogde rijen, overgeslagen, rust of race verplaatsen of een handvat geven. Een training die een periode neerzette of opzij schoof mag wel slepen, altijd met Akkoord en met het merkteken van de periode erop (`dragEligibility`). `askAlways` geldt ook voor Verplaatsen in het actieblad (`Week.tsx` `onMove`).
- Een test of race verplaatsen of ruilen zonder Akkoord.
- Een log herschrijven om de dag te tonen: `src/engine/logDay.ts` is alleen weergave.
- `src/storage/planGolden.test.ts` laten bewegen door iets in Week; REST-DAY met jouw slot meldt alleen onder `reportYours` (standaard uit).

## Valkuilen
- Staat een losse log in voor een open training, dan telt de belasting van de log, maar de beendag blijft die van de geplande training (`weekProfile.ts#dayLoads`).
- Een gemiste training naar later is geen verplaatste rij. Het is een inhaal: een nieuwe rij met jouw slot en `catchUp`, en de oude rij wordt overgeslagen (`engine/catchUp.ts`). Week verbergt de oude rij en de nieuwe zegt "verplaatst van"; de woorden zijn Verplaatsen en Toch verplaatsen. Twee inhalen op één dag bestaat niet: het inhalen haalt hoogstens één sleuteltraining in (`engine/adviceWeek.ts#missedAdvice`), nooit naast een andere harde loop (`engine/hardRunApart.ts`), en de 48 uur bij het inhalen kijkt over de weekgrens (`adviceShared.ts#findCatchUpDate`). Ook restDayBack en elke tekst met "lange training" lezen de focus van `engine/keySession.ts` (`docs/beslissingen/2026-11-11-sleuteltraining.md`).
- De weekterugblik telt de overgeslagen oude rij van een inhaal niet mee als gemist (`buildWeekReview`, `movedOn`); anders staat dezelfde training twee keer in de lijst.
- `useVerticalDrag` is gedeeld met de doelen op Ascend: een wijziging daar verandert beide.
- Een mislukte ruil of verplaatsing moet een zichtbare uitkomst geven (review van 2 november); een verouderd voorstel zegt dat het veranderd is.
- Een notitie bij een vakantie slaat meteen op (`saveLeaveNote`), andere dagen of soort gaan als voorstel met Akkoord.
- Kaarten boven de missie hebben een vaste volgorde in `TODAY_CARD_RANK`; een nieuwe kaart krijgt daar een plek, niet in de pagina.
- Of de grepen te zien zijn en of je mag slepen zijn twee dingen. De grepen hangen alleen aan de instelling en het jaaroverzicht (`components/weekDragShown.ts`); een open of sluitend blad zet alleen het slepen uit (`enabled`). Anders flitsen de grepen kort naar lege cirkels. Het sluitvlak van een blad (`growOpacity`, sluiten) eindigt op niets, anders staat er een lege rechthoek op de rij.
- Wat Week als jouw keuze toont, leid je af uit dezelfde uitkomst als de zin op Vandaag (`morningConsequence`), niet uit het ruwe antwoord.

## Testen
- Tijdens het werk: `npx vitest run src/engine/week src/engine/leaveWeek src/engine/catchUp src/engine/replanWeek src/storage/week src/storage/catchUp`
- Tekstkaart (`npm run kaart:vergelijk`) als een scherm verandert, met elk verschil verklaard.

## Lees verder
- `docs/architectuur/week.md`
- `docs/beslissingen/2026-10-29-gemiste-training-inhalen.md`, `docs/beslissingen/2026-11-05-inhalen-heet-verplaatsen.md`, `docs/beslissingen/2026-10-28-slepen-in-week.md`, `docs/beslissingen/2026-10-28-waarschuwingen-in-week.md`
