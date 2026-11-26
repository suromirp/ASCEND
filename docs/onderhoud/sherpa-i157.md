# Sherpa Belangrijk advies: I-157 en I-155

Datum: 2026-11-26. Branch `claude/belangrijk-advies`, vanaf origin/main a9556c7. Besluit: `docs/beslissingen/2026-11-26-belangrijk-advies-als-blad.md`.

## Wat er gebouwd is

- `src/engine/adviceFirst.ts`: de klasse (REENTRY, NO-GOAL-WAVES, BEGINNER-LADDER), `firstSheetAdvice` (wanneer wel en niet), het geheugen per advies-id (`shownOn`, `snoozes`), defensief lezen en samenvoegen, `pausedToday` via `dayRules`.
- `src/engine/oneAnswerPerDay.ts`: één antwoord per dag of training op de samengestelde lijst, het andere in `waiting` met `blockedBy`; `adviceTouchedSessions` voor het voorstel na een zware sport.
- `src/engine/adviceShared.ts` (`withWaiting`, `adviceBusyIds`, `catchUpWaiting`) en `src/engine/weekFixProposal.ts#adviceSessionIds` lezen ook wat wacht.
- `src/state/adviceAndWeek.ts`: `oneAnswerPerDay` om de lijst.
- `src/state/sheetRow.ts`: de gedeelde rij; DebriefSheet, CompletionMoment, PermissionWelcome, UpdatePrompt, LiveUpdateHost, ChangeNotice en StartWelcome melden zich.
- `src/components/FirstAdviceHost.tsx` (in `App.tsx` naast DebriefSheet, `ready={mainReady}`): het blad met Akkoord, Bekijk en Niet nu.
- `src/components/useAdviceAccept.ts`: de Akkoord-paden van de kaart, gedeeld door CoachCard en het blad; `useHorizonChange` kreeg de optie `direct`.
- `src/components/CoachCard.tsx`: de regel "Een ander advies voor dezelfde dag wacht tot dit is beantwoord." onder het advies dat blijft.
- `src/components/sports/useSportRest.ts`: `taken` voor het voorstel na een zware sport (I-155 deel 1).
- `src/models/planChange.ts`, `src/engine/repairAudit.ts`, `src/storage/undoPlanChange.ts`: `alsoRevertLines` (I-155 deel 2).
- Opslag: `AppSettings.firstSheet` en `firstAdviceSheet`, `migrationsSettings.ts#migrateFirstSheet` (via `migrations.ts`), `backupClean.ts`, `backupMerge.ts`.
- Instelling Belangrijk advies als blad: `settingsDefs/vandaag.ts`, `uitleg/vandaag.ts`, `settingsSummary.ts`, `settingsDiff.ts`, `order.ts`, `VandaagGroup.tsx`. De rij staat in het blad Kaarten onder Of kies zelf, omdat de pagina Vandaag al twaalf rijen en zes onder Geavanceerd heeft (`settingsLayout.test.ts`).

## Tests

- `src/engine/adviceFirst.test.ts`: REENTRY plus inhalen geeft alleen REENTRY; niet bij een open training, concept, ander blad, zonder plan, in een pauze of met de instelling uit; een getoond id komt niet terug; drie keer Niet nu en daarna niet meer.
- `src/engine/oneAnswerPerDay.test.ts`: twee adviezen op dezelfde dag geven één plus `blockedBy`; wat wacht blijft bezet.
- `src/storage/firstSheet.test.ts`: een oude back-up zonder `firstSheet` importeert zoals eerst; export en import; samenvoegen; kapotte regels tellen.
- `src/storage/firstSheetAccept.test.ts`: een Akkoord dat halverwege faalt laat planning, instellingen en antwoorden staan.
- `src/storage/undoPlanChange.test.ts`: het terugdraairecord van de ronde noemt alleen haar regel.

## Kaart

- `instellingen-blad-kaarten`: de nieuwe rij Belangrijk advies als blad. Bedoeld.
- De standen zonder doel (`zonder-doel`, `zonder-kracht`, `zonder-kracht-geen-blok`) kregen bij het openen het blad met de golven over elk scherm, en daardoor faalde de invariant Kracht uit vier keer. Dat is echt gedrag: wie zonder doel het aanbod van de golven heeft, krijgt het blad één keer. Voor de kaart staat het blad in `scripts/app-kaart/maak-standen.mjs#zonderDoel` als al getoond (`firstSheet`), zodat die schermen zichzelf laten zien; de drie standen zijn opnieuw gemaakt.

## Eigen keuzes

Staan genummerd in het besluit: geen ziek of vrij voorbij, schemaVersion blijft 6 (met migratiestap), alleen het advies wacht in de rij, sluiten zonder antwoord is Niet nu, Bekijk telt als getoond, één blad per opening na 1,5 seconde, de bergspieren vallen buiten `taken`. Daarbij: de instelling staat in het blad Kaarten onder Of kies zelf (`place: { in: 'kaarten' }`), omdat de pagina Vandaag aan het plafond zit.

## Niet gecontroleerd

- Het blad zelf op een toestel of in een browser met een echte terugkeer: geen componenttests in de repo; de keuze en de opslag zijn getest, de weergave niet. Een screenshot en Lookout horen bij het bouwmoment.
- De terugknop van Android terwijl het voorstel van Bekijk boven het blad staat.
