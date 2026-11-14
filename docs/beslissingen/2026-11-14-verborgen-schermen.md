# Verborgen schermen opgeruimd

Datum: 2026-11-14
Status: aangenomen

## Besluit

De Kennisbank belooft geen les meer op Vandaag; de kaart "Deze week" blijft op de Kennisbank zelf. Reisplanner, Paklijst, Etappes en Alleen onderweg bestaan alleen met een doel dat een tocht is (hutten of tent, `hasTrekGoal` in `engine/journeyAccess.ts`): zonder zo'n doel staan Reisplanner en Paklijst niet in het zoekveld van Instellingen, en een direct adres toont één regel uitleg met een knop naar Ascend. Dode code is weg (AdventureCard, LessonCard, Soon), en een scherm dat offline niet laadt zegt dat in het Nederlands.

Ook de Reis-regel op Vandaag en het blad "Deze week voor de GR5" volgen dit: `useJourney` geeft zonder trekdoel geen einddatum, dus er is geen taak en niets te tonen. `programAnchorDate` is de datum van elk hoofddoel en bewijst geen tocht. De regel "een hoofddoel zonder soort telt als tocht" staat op één plek (`effectiveGoalKind`), gebruikt door doelkaart, doelblad en `hasTrekGoal`. `usesMilestoneReadiness` in `goalReadinessFor.ts` blijft apart: die vraagt alleen of de soort ontbreekt, voor de rekening van het hoofddoel, en is niet de vraag of er een tochtmodule bij hoort. Bergschoenen inlopen is een echte instelling en opent zichzelf, niet /reis.

## Reden

Pathfinder (12 november) vond een belofte die niet klopte, vier tochtschermen die zonder doel openden terwijl zonder doel geen bergtocht of rugzakladder hoort, en een Engelse technische melding voor wie de app offline voor het eerst start. Een nieuwe kaart op Vandaag zonder ontwerp is groter dan nodig; de belofte schrappen is het kleinste eerlijke. Er is ook geen instelling of plek die de les op Vandaag verwacht (besluit 2 november: de les staat in Kennis).

## Alternatieven

- De les als kaart terugzetten op Vandaag: vraagt ontwerp en een instelling, niet in deze ronde.
- Een direct adres zonder trekdoel naar de vorige pagina sturen: een sprong zonder uitleg; de ene regel uitleg is duidelijker.
- De oude `Soon`-terugval houden: alle acht groepen hebben inhoud en een onbekende groep gaat al naar het overzicht.

## Bron

`docs/onderhoud/2026-11-12-pathfinder-verborgen-schermen.md`, `docs/beslissingen/2026-11-02-gegevens-herinrichting.md`.

## Vervangt

Niets.

## Terugdraaien

`TrekOnly` uit de vier routes in `App.tsx` halen en `visibleInSearch` uit `SettingsOverview.tsx`. De les op Vandaag terugbrengen vraagt een eigen ontwerp.
