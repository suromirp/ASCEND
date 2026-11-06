# Forge

De krachttraining: de sessie met klok en concept, het voorschrift per oefening, bijsturen, het verloop, de spotter en de plaatjes.

## Bestanden
- `src/components/forge/ForgeWorkout.tsx#ForgeWorkout` het scherm en de bewaking van de ene sessie
- `src/engine/forgeWorkout.ts#planWorkout` het voorschrift per oefening, rijen, `estimatedRest` voor de rust
- `src/engine/forgeSession.ts#activeSeconds` klok als som (nu min start min pauzes), pauzeren en hervatten
- `src/utils/forgeSessionStore.ts#readSession` wijzer en concept in localStorage, de sessie overleeft sluiten
- `src/engine/forgeAdjust.ts#suggestLighter` "Lichter" of "Liever niet", `OPEN_ROOM` voor open doelen
- `src/engine/forgeLog.ts#cleanForgeLog` het afgeleide verloop, naar het log pas bij Afronden
- `src/engine/strengthModel.ts#learnFatigue` leert vermoeidheid per set uit eigen sets
- `src/engine/forgeReckon.ts#reckonWeight` rekent mee bij een getypt gewicht, met dezelfde regel als het voorschrift
- `src/engine/spotter.ts#spotterSlot` minstens 1 over bij een stang zonder spotter
- `src/engine/prescriptionCheck.ts#checkRow` de stille toets "raak" tegen MacroFactor
- `src/engine/forgeTimeCap.ts#resolveTimeCap` hoogstens 60 of 75 minuten, alleen de inhoud van het scherm
- `src/components/forge/parts.tsx#ForgeSheet` het blad in Forge

## Nooit
- Een bestaand log beschrijven; Afronden maakt een nieuw log. Er is hoogstens één Forge-sessie.
- Sets tellen zonder `isWorkSet`; een opwarmset wordt bewaard maar telt niet.
- De planning of een template wijzigen vanuit Forge; de tijdsgrens en Lichter raken alleen het scherm.
- Een training herkennen aan een template-id: gebruik `src/engine/scheduler.ts#isLegHeavyTemplate` en rollen.
- De tekeningen in `globPatterns` van `vite.config.ts` zetten; een gewijzigde tekening houdt `LICENSE.md` en `ATTRIBUTION.md` in `public/exercise-art/` waar.

## Valkuilen
- Een open doel (11+) of tot falen heeft geen bovenkant: `OPEN_ROOM` in `src/engine/forgeAdjust.ts` houdt een veel lichter gewicht met veel meer herhalingen eruit.
- `rirAssumed` (een set afgevinkt zonder aan de RIR te komen) telt niet mee voor kracht, vermoeidheid en stap, niet in `learnFatigue` en niet in "Forge rekent mee".
- Rust per oefening komt uit `estimatedRest` in `src/engine/forgeWorkout.ts`; geen tweede tabel in een component.
- Elk blad in Forge heeft `ref={sheetRef}` en `<SheetGrip />`, zoals `ForgeSheet` in `src/components/forge/parts.tsx`; bladen sluiten met `forge-down`, en `sheetDrag.scan.test.ts` kijkt mee.
- Een rustmelding van een vorige keer wordt bij het openen geschrapt (`src/state/boot.ts`); een lopende rust plant Forge zelf opnieuw.
- Een sessie begint pas bij de eerste echte handeling, niet bij het openen; een wijzer zonder template of met een gelogde sessie is dood en wordt opgeruimd.
- Het eigen cijferblok sluit niet bij elke tik (`tapClosesDock`); `dockKey.scan.test.ts` bewaakt de key van `InputDock`.

## Testen
- Tijdens het werk: `npx vitest run src/engine/forge src/engine/strengthModel src/engine/spotter src/engine/prescriptionCheck src/components/forge`
- Altijd mee: `src/components/sheetDrag.scan.test.ts`. Nooit laten bewegen: `src/storage/planGolden.test.ts`.
- Tekstkaart (`npm run kaart:vergelijk`) als een Forge-scherm of de rij op Je stand verandert.

## Lees verder
- `docs/architectuur/forge.md`
- `docs/beslissingen/2026-10-29-forge-als-sessie.md`, `docs/beslissingen/2026-11-02-forge-herinrichting.md`
- `docs/beslissingen/2026-10-25-bijsturen-in-forge.md`, `docs/beslissingen/2026-11-03-forge-rekent-mee.md`
