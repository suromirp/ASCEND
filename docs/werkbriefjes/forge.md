# Forge

De krachttraining: de sessie met klok en concept, het voorschrift per oefening, bijsturen, het verloop, de spotter en de plaatjes.

## Bestanden
- `src/components/forge/ForgeWorkout.tsx#ForgeWorkout` het scherm en de bewaking van de ene sessie
- `src/engine/forgeWorkout.ts#planWorkout` het voorschrift per oefening, rijen, `estimatedRest` voor de rust
- `src/engine/forgeSession.ts#activeSeconds` klok als som (nu min start min pauzes), pauzeren en hervatten
- `src/utils/forgeSessionStore.ts#readSession` wijzer en concept in localStorage, de sessie overleeft sluiten
- `src/engine/forgeAdjust.ts#suggestLighter` "Lichter" of "Liever niet", `OPEN_ROOM` voor open doelen
- `src/engine/forgeLog.ts#cleanForgeLog` het afgeleide verloop, naar het log pas bij Afronden
- `src/engine/strengthModel.ts#learnFatigue` leert vermoeidheid per set uit eigen sets; `src/engine/assumedSets.ts#confirmedAssumed` "Afvinken telt als het doel" (bevestigd, drempels bij elkaar)
- `src/engine/forgeReckon.ts#reckonWeight` rekent mee bij een getypt gewicht, met dezelfde regel als het voorschrift
- `src/engine/spotter.ts#spotterSlot` minstens 1 over bij een stang zonder spotter; `src/engine/toestelStanden.ts#standAfterTick` de standen per toestel (inlezen, onthouden, Terugdraaien), `src/storage/machineStands.ts#rememberStand` schrijft ze alles of niets; `src/components/forge/useForgeStands.ts` (afvinken, inlezen, de regel met Terugdraaien) en `MachineWeights.tsx` (het blad met chips, Veel tegelijk, Standen wissen met Terugdraaien via `src/engine/toestelStanden.ts#withStandsRestored`); Minder en Meer: `forgeInput.ts#nextStand`, de getallen onder de toetsen `src/engine/forgeInput.ts#standHints`
- `src/engine/prescriptionCheck.ts#checkRow` de stille toets "raak" tegen MacroFactor; `src/engine/forgeWorkout.ts#swapGroups` Ruilen in twee groepen: "Doet hetzelfde" (echte vervangers met reden, de eerste aanbevolen) en "Zelfde spier, anders"; `src/data/exerciseFamilies.ts#FAMILY` de familie en nuance per oefening; `src/components/forge/ExerciseSheets.tsx#SwapList` het blad
- `src/engine/forgeTimeCap.ts#resolveTimeCap` hoogstens 60 of 75 minuten, alleen de inhoud van het scherm
- `src/components/forge/parts.tsx#ForgeSheet` het blad in Forge
- `src/components/forge/forgeDraft.ts#WorkoutDraft` het concept; `OtherSessionRunning.tsx` het blad bij een andere lopende training; het scherm is opgesplitst in `ForgeMenus.tsx#ExerciseMenuSheet`, `ForgeHeader.tsx`, `ForgeIntro.tsx`, `LegEasePanel.tsx` (alleen tonen), `useForgeClock.ts`, `useForgeDraft.ts`, `useForgePager.ts`, `useRestAlert.ts` en `forgeFinishLog.ts#forgeLogInput`

## Nooit
- Een bestaand log beschrijven; Afronden maakt een nieuw log (hoogstens één Forge-sessie). Een stand staat alleen bij het sportschoolprofiel, nooit in een log.
- Sets tellen zonder `isWorkSet`; een opwarmset wordt bewaard maar telt niet.
- De planning of een template wijzigen vanuit Forge; de tijdsgrens en Lichter raken alleen het scherm. Uitzondering: het voorstel Spieren voor de berg mag met Akkoord een oefening toevoegen; de lopende sessie verandert niet.
- Een training herkennen aan een template-id: gebruik `src/engine/scheduler.ts#isLegHeavyTemplate` en rollen.
- De tekeningen in `globPatterns` van `vite.config.ts` zetten; een gewijzigde tekening houdt `LICENSE.md` en `ATTRIBUTION.md` in `public/exercise-art/` waar.

## Valkuilen
- Een open doel (11+) of tot falen heeft geen bovenkant: `OPEN_ROOM` in `src/engine/forgeAdjust.ts` houdt een veel lichter gewicht met veel meer herhalingen eruit.
- `rirAssumed` (afgevinkt zonder eigen RIR): `estimateSet` kijkt er niet naar, dus zo'n set telt altijd mee in `sessionStrength`, de gladgestreken kracht en `shortfall`; nooit in `learnFatigue`, `learnAfterHard` en klaar voor je doel. Met "Afvinken telt als het doel" houdt een bevestigde set de kracht vast (extra herhalingen half) en telt hij strenger voor de stap; dat leest alleen `analyseSessions` via `LoadContext.confirm`, het log verandert niet. Nieuwe logs dragen `repsAsked` en `weightKgAsked`, en `forgeKg` als Forge het gewicht tijdens de training bijstelde (na een set of Lichter; `WorkoutRow.forgeKg`); oude lezen met de onderkant van het bereik. Bevestigd telt tegen `forgeKg`, maar alleen op het gewicht van het voorschrift (`belowPrescription`) en niet in de eerste training na een pauze houdt hij de kracht vast; anders is hij een meting. Regel 5 (de stap) leest de RIR van een bevestigde set zoals regel 4 (`confirmedRir`), en `allAtTop` telt alleen werksets die bevestigd zijn of een eigen RIR van minstens het doel hebben.
- Tot falen of een open doel: na een zware set mag de volgende set één herhaling onder de onderkant (`floor` in `reckonAfterTick`), zodat het gewicht één stap zakt, maar nooit een grote stap van het blok die ruim boven het doel uitkomt (`JUMP_ROOM`); een opwarmset is minstens `WARMUP_MIN_STEP` (15%) zwaarder dan de vorige. Stelde Forge al bij, dan geen tweede vraag om Lichter.
- "Weg door je tijdsgrens" telt tegen `effSlots` (na Lichter) in `capRemovedFor`.
- Rust per oefening komt uit `estimatedRest`; geen tweede tabel in een component. Elke oefening heeft een familie in `src/data/exerciseFamilies.ts` (een scan-test in `forgeWorkout.test.ts` eist het, en dat elke familie een hoofdspier deelt); een nieuwe oefening zonder familie valt bij Ruilen terug op de oude lijst. De volgorde in `EXERCISES` beslist bij gelijke afstand, dus zet een nieuwe variant bij zijn familie. Een lege eerste groep (Dips) laat de kop weg; `swapOptions` is de twee groepen achter elkaar.
- Elk blad in Forge heeft `ref={sheetRef}` en `<SheetGrip />`, zoals `ForgeSheet` in `src/components/forge/parts.tsx`; bladen sluiten met `forge-down`, en `sheetDrag.scan.test.ts` kijkt mee.
- Een rustmelding van een vorige keer wordt bij het openen geschrapt (`src/state/boot.ts`); een lopende rust plant Forge zelf opnieuw.
- Een sessie begint pas bij de eerste echte handeling, niet bij het openen; een wijzer zonder template of met een gelogde sessie is dood en wordt opgeruimd.
- Het eigen cijferblok sluit niet bij elke tik (`tapClosesDock`); `dockKey.scan.test.ts` bewaakt de key van `InputDock`. Standen: een sleutel in `exerciseStandsKg`, ook leeg, betekent ingelezen (een weggestreepte stand komt niet terug); zonder sleutel gelden de oude lijst en het bereik als gesloten lijst. `usedBefore` krijgt de `exercise` mee, anders ziet hij de standen niet. Schrijf standen via `updateSettings` (`useStandIo`), nooit rechtstreeks naar `SettingsRepo`, anders loopt de app achter; instelling `learnStands` (Standen onthouden) uit betekent niets inlezen en niets onthouden. `withMachineSetup` blijft de oude lijst en het bereik schrijven (pondbereik); het blad schrijft via `withStandsSet`. Een stand komt alleen uit een gewicht dat je zelf intikte of bevestigde; nooit uit een voorgesteld doelgewicht via Alles afvinken (`ownWeightsTickedAll`). Elke beurt in `machineStands.ts` heeft een grens in tijd, ook het lezen. Het formulier in `MachineWeights.tsx` heeft geen `key`: komt het inlezen later binnen, dan staan de standen er vanzelf bij zonder dat wat je invulde verdwijnt; Terugdraaien na Standen wissen zet ook "geen sleutel" en een oude lijst of bereik precies terug.

## Testen
- Tijdens het werk: `npx vitest run src/engine/forge src/engine/strengthModel src/engine/spotter src/engine/prescriptionCheck src/engine/toestelStanden src/storage/machineStands src/components/forge`
- Altijd mee: `src/components/sheetDrag.scan.test.ts`. Nooit laten bewegen: `src/storage/planGolden.test.ts`. Tekstkaart (`npm run kaart:vergelijk`) als een Forge-scherm of de rij op Je stand verandert.

## Lees verder
- `docs/architectuur/forge.md`
- `docs/beslissingen/2026-10-29-forge-als-sessie.md`, `docs/beslissingen/2026-11-02-forge-herinrichting.md`, `docs/beslissingen/2026-10-25-bijsturen-in-forge.md`, `docs/beslissingen/2026-11-03-forge-rekent-mee.md`, `docs/beslissingen/2026-11-09-forge-echte-vervangers.md`, `docs/beslissingen/2026-11-09-forge-toestelstanden.md` met `docs/visie/Toestelstanden in Forge.md`, `docs/beslissingen/2026-11-08-forge-afvinken-doel.md` en `docs/beslissingen/2026-11-09-forge-review-afvinken.md`
