# Week

De Week-tab en wat eraan hangt: waarschuwingen, slepen, ruilen, verplaatsen van een gemiste training, vakanties en de weekterugblik.

## Bestanden
- `src/pages/Week.tsx#moveTo` elke verplaatsing (slepen en blad) loopt hierdoor
- `src/engine/weekDrag.ts#decideMove` schoon meteen toepassen, anders Akkoord via `RescheduleDialog`
- `src/engine/weekConcerns.ts#weekConcerns` de waarschuwingen ("Let op") en de rijtekst per regel
- `src/engine/weekFixProposal.ts#planWeekFix` een oplossing is een voorstel met Akkoord
- `src/engine/weekSwap.ts#checkSwap` ruilen van twee trainingen, `src/storage/weekSwap.ts#writeSwap` schrijft
- `src/engine/catchUp.ts#catchUpRows` gemiste training naar later: nieuwe rij plus overgeslagen oude
- `src/storage/catchUpApply.ts#writeCatchUp` schrijft die twee rijen
- `src/engine/replanWeek.ts#replanWeek` week opnieuw plannen, `src/storage/weekReplan.ts#planWeekReplan` voor het voorstel
- `src/engine/weekReview.ts#buildWeekReview` de weekterugblik
- `src/storage/undoPlanChange.ts#undoPlanChangeNow` Ongedaan maken uit de melding
- `src/engine/todayCards.ts#arrangeToday` de vaste rang van kaarten boven de missie op Vandaag

## Nooit
- Een probleem in de week stil oplossen: altijd een voorstel met Akkoord. Liever niet laat de kaart staan, het probleem verberg je niet.
- Slepen buiten `moveTo` en `decideMove` om, of een verplaatsing zonder slot (`movedFromDate`, Ongedaan maken).
- Historie, voorbije of gelogde rijen, overgeslagen, rust, race of vakantie verplaatsen of een handvat geven.
- Een test of race verplaatsen of ruilen zonder Akkoord.
- Een log herschrijven om de dag te tonen: `src/engine/logDay.ts` is alleen weergave.
- `src/storage/planGolden.test.ts` laten bewegen door iets in Week; REST-DAY met jouw slot meldt alleen onder `reportYours` (standaard uit).

## Valkuilen
- Een gemiste training naar later is geen verplaatste rij. Het is een inhaal: een nieuwe rij met jouw slot en `catchUp`, en de oude rij wordt overgeslagen (`engine/catchUp.ts`). Week verbergt de oude rij en de nieuwe zegt "verplaatst van"; de woorden zijn Verplaatsen en Toch verplaatsen.
- De weekterugblik telt de overgeslagen oude rij van een inhaal niet mee als gemist (`buildWeekReview`, `movedOn`); anders staat dezelfde training twee keer in de lijst.
- `useVerticalDrag` is gedeeld met de doelen op Ascend: een wijziging daar verandert beide.
- Een mislukte ruil of verplaatsing moet een zichtbare uitkomst geven (review van 2 november); een verouderd voorstel zegt dat het veranderd is.
- Een notitie bij een vakantie slaat meteen op (`saveLeaveNote`), andere dagen of soort gaan als voorstel met Akkoord.
- "Weekplanning bijgewerkt" of "Planning bijgewerkt" bij elke opening is bijna altijd een pingpong tussen het weekvoorschrift en de planningsronde, geen echte verandering. Het voorschrift houdt alleen wat de ronde laat staan (`src/storage/weeklyPrescriptionStep.ts#keptByPlanningRound`, 9 november); toets met drie openingen achter elkaar (`src/storage/openingPingpong.test.ts`).
- Kaarten boven de missie hebben een vaste volgorde in `TODAY_CARD_RANK`; een nieuwe kaart krijgt daar een plek, niet in de pagina.

## Testen
- Tijdens het werk: `npx vitest run src/engine/week src/engine/catchUp src/engine/replanWeek src/storage/week src/storage/catchUp`
- Nooit laten bewegen: `src/storage/planGolden.test.ts`.
- Tekstkaart (`npm run kaart:vergelijk`) als een scherm verandert, met elk verschil verklaard.

## Lees verder
- `docs/architectuur/week.md`
- `docs/beslissingen/2026-10-29-gemiste-training-inhalen.md`, `docs/beslissingen/2026-11-05-inhalen-heet-verplaatsen.md`
- `docs/beslissingen/2026-10-28-slepen-in-week.md`, `docs/beslissingen/2026-10-28-waarschuwingen-in-week.md`
