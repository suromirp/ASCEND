Bediening en beweging: de terugknop, scrollen en hervatten, plus de uitgebreide ontwerpregels voor logo, tabbalk, lucht, instellingen en vloeiende overgangen.

**The back button, scroll and resuming** (`utils/backLayers.ts`, decision
`docs/beslissingen/2026-10-22-terugknop-en-hervatten.md`): every sheet, dialog and
full-screen overlay goes through `useSheetClose` (or `useBackToClose` for a menu
or view that is not a sheet), which gives it one history step with the same URL
and a marker in the state. The back button closes the top layer first; closing it
yourself takes the step away again. A new overlay must use the hook, a sheet that
cannot close while busy passes `canClose`, and nothing may rewrite the address
(`navigate(..., { replace: true })`, `setSearchParams`) while a layer is open on
that page. The page scrolls in `<main id="app-scroll">`, not in the window:
`useScrollRestoration` gives every history step its own height (forward starts at
the top, back restores it), and state that must survive a visit to another page
(chosen week, search term, an open section) uses `usePageState` instead of
`useState`. The tab bar follows `AppSettings.tabBack` (`utils/tabNav.ts`) and the
app reopens where you were after `AppSettings.resumeMinutes` (`utils/launchRoute.ts`).

- Logo: "Ring en pad" (`docs/beslissingen/2026-10-25-logo-ring-en-pad.md`): een lichte
  ring, een lichte kam met drie toppen die op de ring eindigt, een groenblauwe berg die
  overloopt in marine, een S-pad en een stip in mint. Het app-icoon staat in `public/`
  (`icon.svg`, `icon-maskable.svg`, `favicon.svg` en de PNG's), het kleine teken is
  `AppMark` (alleen ring en kam, in `--color-on-light`), het openingsscherm is
  `AscendSplashLogo` en `AscendAnimatedLogo` met alleen de tokens `--color-logo-*`. Het
  openingsscherm bouwt zich op zoals het oude (gloed, ring, kam, berg, pad, vonk, woord)
  en heeft daarna een rustige omgevingsbeweging die alleen draait zolang het scherm in
  beeld is (`docs/beslissingen/2026-10-25-openingsscherm-terug.md`); in Rustig alleen kort
  tekenen, in Uit en bij beperkte beweging meteen de eindstand.

- Tabbalk: Vandaag, Week, Stand, Ascend, Logboek (`BottomNav` in
  `src/App.tsx`), volledig dekkend marine, labels in zinsletters, met de
  actieve tab en het streepje erboven in de kleur van die tab. Meer is geen
  tab maar het tandwiel rechtsboven (`SettingsGear`): alleen het pictogram,
  zonder cirkel of rand, in `--color-on-light` op de lucht van `SkyBand`, een
  tikdoel van 44 bij 44 px, op elke tab op precies dezelfde plek, schuift met
  de pagina mee. Het opent
  `/more` (instellingen, gegevens en back-up, koppelingen, gidsen en kennis);
  oude links naar `/more` blijven werken. Wat een pagina zelf rechtsboven nodig
  heeft (pijltjes van Week en Logboek, het lichaamknopje van Vandaag) gaat in
  `SkyBand` `actions`: pictogrammen zonder cirkel, direct links van het
  tandwiel, dezelfde hoogte en maat, dezelfde kleur
  (`docs/beslissingen/2026-10-24-ontwerpadvies-kop-en-weekstrook.md`). Eén
  uitzondering op de kleur, op verzoek van de eigenaar: het lichaamknopje is het
  pictogram in mint, omdat de kleur van het tandwiel bij de instellingen hoort
  (`docs/beslissingen/2026-10-24-pictogrammen-in-stijl-c.md`).

- Lange donkere pagina's krijgen hoogstens één vlak lucht halverwege (`SkyPanel`
  in `SkyBand.tsx`: verloop van de lucht, smalle bergrand, `.on-light`, volgt de
  nachtlucht), op een kaart die iets samenvat of aanwijst, nooit de eerste kaart
  (`docs/beslissingen/2026-10-24-lucht-halverwege.md`).

- Instellingen (`/more`, `docs/beslissingen/2026-10-22-instellingen-in-groepen.md`):
  een overzicht met de stand en acht groepen (`/more/:groep`: Planning, Doel en
  tochten, Forge, Lichaam, Vandaag en meldingen, Koppelingen, Gegevens en
  back-up, Gidsen en kennis). Elke instelling is één `SettingsRow`
  (`src/components/settings/SettingsList.tsx`): links de titel, rechts de waarde,
  hoogstens één regel eronder (een feit of een bron, nooit uitleg), 52 of 68 px
  hoog, de hele rij is het tikdoel. Uitleg staat achter de InfoButton
  (`src/data/settingsHelp.ts`: één zin en korte punten), een keuze opent een
  onderblad (`Sheet`, `ChoiceSheet`), aan of uit is een schakelaar in de rij, acties
  staan in het blad en nooit op de pagina. Wat ASCEND zelf bijhoudt krijgt het label
  "auto". Een schakelaar die aan staat is mint gedempt, niet gevuld mint: de
  gevulde mint knop blijft het ene accent van het scherm. De waarde en de regel van een rij komen uit
  `engine/settingsSummary.ts` (pure functies met tests), zodat de rij, het
  zoekresultaat en het overzicht hetzelfde zeggen.

Vloeiende overgangen (`docs/beslissingen/2026-10-28-vloeiende-overgangen.md`, ontwerp
`docs/visie/Vloeiende overgangen.md`): de tik van `utils/haptics.ts` (`TAP_MS`, 15 ms) heeft een
poort, de instelling Trillen (`AppSettings.haptics`, absent = aan, `engine/hapticsSettings.ts`);
alleen `tap` en `success` kijken ernaar, de signalen van timers (`alarm`, `pattern`: de rust van Forge en de rektimer) niet; slepen om te sluiten is een gebaar en krijgt geen eigen schakelaar.
Akkoord in `ProposalSheet` en `RescheduleDialog` geeft een tik. Elk blad volgt je vinger omlaag
(`useSheetClose` geeft `sheetRef`, op het paneel; gebaar in `utils/sheetDragDom.ts`, rekensom in
`components/sheetDrag.ts`): alleen als de inhoud bovenaan staat, nooit op invoer, sliders of
`data-no-sheet-drag`, sluiten via `requestClose` zodat de terugknop en `canClose` gelden. Een nieuw
blad met `animate-sheet-in` zonder `ref={sheetRef}` laat `sheetDrag.scan.test.ts` falen, tenzij het
met reden in de uitzonderingen staat. Volgen is 1 op 1 in elke stand, het terugveren staat in Uit
meteen op de eindstand.

Uit een rij groeien en naar een dag schuiven (`docs/beslissingen/2026-10-28-vloeiende-overgangen-uitgroei.md`), alleen in
Normaal: een rij of kaart met `data-sheet-from` onthoudt bij een tik waar je tikte (`utils/sheetGrowDom.ts#installSheetOrigin`),
en het blad dat opent groeit eruit via `sheetRef` van `useSheetClose` (een stil vlak, `data-grow` op het paneel, rekensom in
`components/growPlan.ts`); sluiten via `requestClose` krimpt terug, een blad dat de pagina zelf sluit na Gedaan of Verplaatsen niet.
Een verplaatste training schuift in Week naar zijn dag: `armFlip()` (`utils/flipDom.ts`, aangeroepen door `applyProposal`,
`commitPlanChange` en `undoRecentChange`) meet de rijen, `useFlipList` in `WeekPlanner` speelt het af (rekensom in
`components/flip.ts`), wachtend tot een voorstelblad weg is, vanaf de plek van de zwevende rij na slepen. Rustig laat de verplaatste
rij alleen kort verschijnen, Uit doet niets. Een nieuwe rij die een blad opent krijgt `data-sheet-from`; Vandaag schuift nog niet.

De lucht bovenaan heeft een donkere variant (`data-sky="day|night"` op `<html>`, instelling
"Lucht bovenaan", `engine/skySettings.ts`; `docs/beslissingen/2026-10-24-nachtlucht.md`).
Een component gebruikt alleen de tokens en `.on-light`; wat licht lijkt wordt 's avonds vanzelf donker.
