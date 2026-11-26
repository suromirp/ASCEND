# Sherpa Klein en fouten deel 2 (Forge en Calisthenics), rooster ronde 4

Branch `claude/rooster-klein-forge`, vanaf origin/main 96899a354. Het backlogpunt is niet bijgewerkt (dat doet de coördinator).

## Gebouwd

- Calisthenics, het maximum van 20 trainingen: Akkoord op het stapvoorstel meldde gelukt terwijl `normalizeStepSwaps` de stap bij het lezen stil weggooide (boven 20 trainingen of 6 plekken per training). Nu `withStepAcceptedIfRoom` in `src/engine/skillStepProposal.ts` (null als een plek niet landt of een andere stap wegvalt, zoals `withStyleAccepted`), met `stepSwapsLanded` en de geëxporteerde grenzen `MAX_STEP_TEMPLATES` en `MAX_STEP_SLOTS` in `src/engine/stepSwaps.ts`. De kaart `src/components/forge/StepProposalNotice.tsx` slaat bij null niets op, zet Akkoord uit en zegt: "Je plan is niet veranderd. ASCEND houdt stappen bij in hoogstens 20 trainingen en 6 plekken per training, en die zijn vol. Zet eerst ergens een stap terug naar je plan." Liever niet blijft. `withStepAccepted` zelf is ongewijzigd.
- Toevoegingen van Spieren voor de berg in het concept: Forge las de toevoegingen live, dus een Akkoord tijdens een sessie (of in de weekterugblik) zette na herladen via `mergeDraft` een nieuwe oefening midden in de sessie. Nu bevriest Forge ze bij het openen zoals de ladderstappen: `WorkoutDraft.added` en `sessionAddedExercises` in `src/components/forge/forgeDraft.ts`, de state `sessionAdded` in `ForgeWorkout.tsx`, geschreven door `useForgeDraft.ts`. Uit deze training halen haalt hem ook uit `sessionAdded`, anders kwam hij na herladen terug. Het concept staat in localStorage, geen back-up: geen migratie; een concept zonder het veld neemt de toevoegingen van nu.
- Tests: `src/engine/skillStepProposal.test.ts` (20 trainingen, 6 plekken, met ruimte gelijk aan `withStepAccepted`), `src/components/forge/stepProposal.scan.test.ts` (kaart slaat bij null niets op), nieuw `src/components/forge/addedSession.test.ts` (herladen na Akkoord, Uit deze training halen, oud concept, rommel, plus een scan op het scherm).
- Werkbriefje `docs/werkbriefjes/forge.md`: twee valkuilen bijgewerkt (toevoegingen gaan nu mee in het concept; het stapvoorstel schrijft via `withStepAcceptedIfRoom`).

## Per bullet

1. Spieren voor de berg zonder eigen schakelaar in Forge: blijft, een nieuwe instelling op een vol blok van 6 rijen is een ontwerpkeuze.
2. Toestelstanden (pond als vrije invoer, plaatjesnummers, optrekhulp, het strookje op 390 px, Rustig): blijft, vrije invoer in pond en plaatjesnummers zijn een ontwerpkeuze en de schermcontroles vragen Lookout.
3. Reverse Lunge met eigen gewicht: blijft, een catalogusuitbreiding met een eigen tekening en een `guide`.
4. Terugknop na Lichter of Zwaarder sluit het blad: blijft, zo besloten in `docs/beslissingen/2026-11-09-uitleg-bij-oefeningen.md` (regel 53: "kan later als dat in gebruik hinderlijk blijkt"); veranderen is een keuze van de eigenaar. Technisch klein: een extra laag per stap op het spoor via `openBackLayer` in `ExerciseArtSheet.tsx`.
5. Calisthenics: het maximum van 20 trainingen gebouwd (zie boven). De rest blijft: de toets van de straddle front lever is een inhoudelijke keuze; een onbekende ladder uit een nieuwere back-up vraagt een besluit over opslag; Liever niet in de back-up vraagt een nieuw opgeslagen veld; de stopwatch bij een houding is een nieuwe functie; Ongedaan maken na Akkoord op een andere training en de 17 tekeningen zijn niet uit de code vast te stellen.
6. IJkset: op main al goed. De rij van de ijkset (`:aijk`, ook na Akkoord bij Vragen sinds `2026-11-22-ijkset-dag-bij-afronden.md`) heet "ijkset"; een gewone extra set heet "eigen set", precies zoals `2026-10-29-snelknoppen-in-forge.md` zegt. De oorspronkelijke melding (squash 5e35fc911) ging over de ijkrij. Niet nu geldt per keer openen (`calLater` in `useState`), zoals `2026-11-09-ijkset.md` zegt. Niets veranderd.
7. Toevoegingen in het concept gebouwd (zie boven). Ruilen op een toegevoegde bergspieroefening na Uit deze training halen: op main al opgelost (`sessionPrescription` en `canSwap` in `src/engine/addedExercises.ts`, getest in `addedExercises.test.ts`): met een afgevinkte set staat Ruilen niet in het blad, zonder krijgt hij het voorschrift van de sessie.
8. Tempo (stippen niet tikbaar, blad 8 weken en kaart 12): blijft, tikbare stippen zijn een ontwerpkeuze en het hoort bij lopen (`src/components/stand/Zone2PaceChart.tsx`), niet bij Forge.

## Schermen die veranderen

- Forge, de kaart Volgende stap of Lichtere stap: alleen bij het maximum de nieuwe regel en Akkoord uit.
- Forge, een heropende sessie: geen nieuwe bergspieroefening na een Akkoord tijdens de sessie. Verder geen zichtbaar verschil.

## Controles

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen (alleen de bestaande waarschuwing in `LegFatigueCard.tsx`).
- `npx vitest run`: groen, 844 bestanden, 12763 tests.
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: Geen verschil met docs/kennisindex/.
- `npm run kaart:vergelijk`: niet gedraaid, op verzoek (de coördinator doet dat).

## Niet gecontroleerd

- De regel bij het maximum op een toestel of in een screenshot (390 px, Rustig); alleen een scan en de engine zijn getest.
- Herladen midden in een echte sessie in de browser na Akkoord op Spieren voor de berg; alleen de pure functies en een scan op het scherm.
