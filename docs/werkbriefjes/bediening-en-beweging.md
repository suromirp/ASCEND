# Bediening en beweging

Hoe de app bedient wordt en beweegt: terugknop en bladen, scrollen en hervatten, tabbalk en lucht, instellingen, haptiek, vloeiende overgangen en de Android-schil.

## Bestanden
- `src/utils/useSheetClose.ts#useSheetClose` elk blad, dialoog en overlay gaat hierdoor; geeft `sheetRef` en `requestClose`
- `src/utils/backLayers.ts#openBackLayer` de lagen van de terugknop, één geschiedenisstap per laag
- `src/utils/useBackToClose.ts#useBackToClose` voor een menu of weergave die geen blad is
- `src/components/ui.tsx#SheetGrip` het greepje bovenaan elk blad
- `src/components/usePageState.ts#usePageState` toestand die een bezoek aan een andere pagina overleeft
- `src/components/useScrollRestoration.ts#useScrollRestoration` scrollhoogte per geschiedenisstap van de meegegeven scroller (de pagina is `#app-scroll`)
- `src/utils/sheetGrowDom.ts#installSheetOrigin` een blad groeit uit een rij met `data-sheet-from`; het blad Je horloge: `src/engine/watchSheet.ts#watchSheet` zegt wat het toont, `src/components/useWatchSheet.ts#useWatchSheet` leest stand en instellingen, `src/components/WatchSheet.tsx#WatchSheet` tekent
- `src/utils/flipDom.ts#armFlip` een verplaatste training schuift naar zijn dag
- `src/utils/haptics.ts#haptics` de tik, achter de instelling Trillen
- `src/components/SkyBand.tsx#SkyBand` de lucht bovenaan elke tab, `actions` voor wat rechtsboven moet
- `src/engine/settingsSummary.ts#rowSummary` waarde en regel van een instellingenrij
- `src/integrations/deviceShell.ts` wat de Android-app anders doet dan de browser, nergens anders

## Nooit
- Een blad, dialoog of overlay zonder `useSheetClose`; het adres omschrijven (`navigate(..., { replace: true })`, `setSearchParams`) terwijl een laag open is.
- Hex- of rgba-kleuren in een component: alleen de tokens uit `src/index.css` en `.on-light`.
- Een instelling zonder rij in `src/data/settingsIndex.ts`, `src/data/settingsLayout.ts` en `src/engine/settingsSummary.ts`.
- Bewegen als lus, buiten de adem van de missiekaart; een animatie die bij elke render speelt.
- Kleiner dan 12 px of een tikdoel onder 44 bij 44 px; een tab erbij of Meer als tab.
- `env(safe-area-inset-bottom)` los gebruiken: alles onderaan rekent op `--rand-onder`.

## Valkuilen
- Elk blad met `animate-sheet-in` of `forge-down` heeft `ref={sheetRef}` en `<SheetGrip />`; `src/components/sheetDrag.scan.test.ts` faalt anders, behalve met reden in de uitzonderingen.
- Een nieuwe rij die een blad opent krijgt `data-sheet-from`; Vandaag schuift nog niet. Een rij met Pagina in een blad boven het trainingsscherm sluit eerst het blad en het scherm via `closeSheet` (niet `requestClose`, dat gooit het concept weg) en navigeert daarna.
- Een nieuwe animatie moet in Rustig en Uit en bij `prefers-reduced-motion` op de eindstand staan (`data-motion` op `<html>`).
- Een blad dat niet mag sluiten terwijl het bezig is geeft `canClose` door aan `useSheetClose`.
- Een mislukte actie heeft een zichtbare uitkomst en een grens in tijd; een terugval die liegt ging rood bij een review (2 november).
- Elke instellingenbron laadt apart met eigen grens (`src/components/settings/settingsFactsParts.ts`); een trage bron mag een andere rij niet tegenhouden, en een wijziging van een bron leest alleen die bron.
- Een tijd schrijf je met `formatClock` (`src/utils/clock.ts`), niet met de hand.

## Testen
- Tijdens het werk: `npx vitest run src/components/sheetDrag src/components/randOnder src/components/silentCatch src/utils src/engine/settingsSummary`
- Altijd mee: `src/components/sheetDrag.scan.test.ts`. Nooit laten bewegen: `src/storage/planGolden.test.ts`.
- Tekstkaart (`npm run kaart:vergelijk`) als een scherm verandert; Lookout bekijkt 360 en 390 px.

## Lees verder
- `docs/architectuur/bediening-en-beweging.md`
- `docs/beslissingen/2026-10-22-terugknop-en-hervatten.md`, `docs/beslissingen/2026-10-28-vloeiende-overgangen.md`
- `docs/beslissingen/2026-10-22-instellingen-in-groepen.md`, `docs/beslissingen/2026-11-02-rand-onderaan.md`
