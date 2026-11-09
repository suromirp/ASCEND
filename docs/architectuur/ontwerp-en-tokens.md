# Ontwerp en tokens

Verhuisd uit CLAUDE.md, woordelijk. CLAUDE.md houdt alleen de harde regels. Bediening en beweging in de praktijk: `docs/werkbriefjes/bediening-en-beweging.md` en `docs/architectuur/bediening-en-beweging.md`.


- dark premium UI
- deep navy backgrounds (`#0b1733`), with a light sky band and green
  mountains at the top of every tab (no light theme)
- mint as the one action colour, ice blue for status, a colour per tab;
  no bronze or gold accents
- muted Alpine green allowed (the mountains)
- Roman/Stoic influence should remain subtle
- adventure/mountain/topographic influences
- never make the UI look like an RPG
- never make it look like a generic bodybuilding app
- mobile-first

## Knoppen, kopjes en tikdoelen

- Knoppen staan in zinsletters ("Opslaan", "Gedaan in MacroFactor"), met
  normale letterspatiëring (geen `uppercase`, geen `tracking-wide`).
  Hoofdletters zijn alleen voor de kleine kopjes in de tabkleur (`Eyebrow`,
  die zelf hoofdletters toont); een kopje met de hand opmaken mag niet waar
  `Eyebrow` past.
- Tikdoelen zijn minstens 44 bij 44 px (`min-h-[44px]`; `PrimaryButton` en
  `SecondaryButton` doen dit zelf). Een klein pictogram krijgt een
  onzichtbare uitbreiding (zie `InfoButton` en `Toggle` in `ui.tsx`).
- Dezelfde keuze heet overal hetzelfde: "Liever niet" (een voorstel
  afwijzen), "Niet nu" (uitstellen), "Annuleren" (afbreken), "Begrepen"
  (kennisnemen), "Beter / Normaal / Slechter".
- De meldingsbalk (`ChangeNotice`) klapt na enkele seconden in tot een
  ronde knop van 44 px en verdwijnt na tien minuten; hij blijft niet over
  de inhoud hangen.

## Zee en berg (was: steen en contour)

De vaste stijl, vastgelegd in `docs/beslissingen/2026-10-22-steen-en-contour.md`
(tabbalk, letters, iconen) en voor de kleuren in
`docs/beslissingen/2026-10-24-thema-zee-en-berg.md`, dat het kleurdeel van het
eerste vervangt. De app moet aanvoelen als een goede kaart en een goed horloge,
fris en sportief op donker marine.

- Eén mint accent per scherm: de enige gevulde mint knop (`PrimaryButton`) of
  de ene kaart met de mint gloed. Gewone knoppen zijn mint omlijnd
  (`SecondaryButton`), een gekozen keuze en voortgang (ring, vinkjes, meters)
  zijn ook mint. IJsblauw (`--color-status`) is alleen status: waar je bent,
  vandaag in de week. Amber (`--color-warning`) is let op en beendagen. Al het
  andere is marine: kaarten, haarlijnen, gedempte inkt. Geen brons of goud.
- De lichte lucht (`SkyBand`, `src/components/SkyBand.tsx`) staat bovenaan
  elke tab: van `--color-sky-top` naar `--color-sky-bottom`, met twee rijen
  bergen (saliegroen achter, groenblauw voor) die overgaan in het marine. Op de
  lucht staan de kop (`AppMark` links, `SettingsGear` rechts, allebei in
  `--color-on-light`), het kopje, de titel en de eerste kaart. Alles op de lucht
  is donker op licht via de klasse `.on-light`, die de gewone tokens omzet;
  een `Card` erop wordt vanzelf de lichte kaart. `variant="low"` is de lagere
  band van Week. De lucht is een vlak, geen licht thema.
- Elke tab heeft een eigen kleur (`--color-tab-*`): Vandaag mint, Week ijs,
  Stand lila, Ascend alpengloed, Logboek lichtgroen. `App.tsx` zet `data-tab`
  op de pagina; `Eyebrow` en de tabbalk lezen `--color-page`, op de lucht de
  donkere variant. Buiten de tabs is het mint.
- Contourlijnen (`topo-texture`) zijn versiering met betekenis, in mint met
  heel lage dekking, en komen alleen op de missiekaart, één per scherm.
- Marcellus (`font-display`) is alleen voor woorden: paginatitels, namen van
  trainingen, een oordeel als "Fris". Alle getallen staan in Inter met vaste
  cijferbreedte (`font-sans tabular-nums`); een getal midden in een zin in
  Marcellus gaat in `Num` (`ui.tsx`). Eén heel groot getal (40 px of meer) mag
  in Marcellus, maar liever niet.
- Niets kleiner dan 12 px (`text-xs` is het minimum, ook voor `Eyebrow` en voor
  tekst in grafieken). Geen `text-[10px]` of `text-[11px]`.
- Iconen komen uit twee eigen sets, zonder bibliotheek. De bediening (tandwiel,
  pijltjes, info, vinkje, terug, tabbalk) is de lijnset in
  `src/components/icons.tsx` (`Icon`): lijn van 1,6 px, ronde uiteinden, de kleur
  van de omringende tekst. Sporten, rust en lichaam zijn kleine illustraties in
  stijl C in `src/components/pictograms.tsx` (`Pictogram`): drie tinten van de
  sportkleur, waarvan de volle vorm het silhouet draagt, met kleur uit de tokens
  (`docs/beslissingen/2026-10-24-pictogrammen-in-stijl-c.md`). Kracht zonder gewicht
  (Eigen gewicht, calisthenics) heeft `eigengewicht` in plaats van de halter; de keuze staat op één plek,
  `isBodyweightTemplate` en `isBodyweightLog` in `engine/sportKind.ts`
  (`docs/beslissingen/2026-11-09-icoon-zonder-gewicht.md`). Geen losse tekens
  als ✓ of ↷ voor iets wat een icoon kan zijn.
- Logo "Ring en pad" (`docs/beslissingen/2026-10-25-logo-ring-en-pad.md`): app-icoon in `public/`, `AppMark`, `AscendSplashLogo`, `AscendAnimatedLogo`, alleen de tokens `--color-logo-*`. Details in `docs/architectuur/bediening-en-beweging.md`.
- Tabbalk: Vandaag, Week, Stand, Ascend, Logboek (`BottomNav` in `src/App.tsx`), dekkend marine, labels in zinsletters, actieve tab in de tabkleur. Meer is het tandwiel rechtsboven (`SettingsGear`, 44 bij 44 px, op elke tab op dezelfde plek, opent `/more`); wat een pagina zelf rechtsboven nodig heeft gaat in `SkyBand` `actions`. Details in `docs/architectuur/bediening-en-beweging.md`.
- Lucht staat alleen bovenaan in `SkyBand`; een `SkyPanel` halverwege een pagina bestaat niet meer (zie `docs/architectuur/bediening-en-beweging.md`).
- Instellingen (`/more`, acht groepen): elke instelling is één `SettingsRow`, uitleg achter de InfoButton (`src/data/settingsHelp.ts`), waarde uit `engine/settingsSummary.ts`. Details in `docs/architectuur/bediening-en-beweging.md`.

## Stem

De teksten klinken als een trainer die je kent: je/jij, kort en direct, het droge feit eerst, één
gedachte per zin. Eén laag per keer: de uitkomst op het scherm (ongeveer 60 tekens), de reden achter
de i (hoogstens ongeveer 40 woorden). Een voorstel zegt wat er verandert, een waarschuwing staat nooit
weggestopt, en humor is licht en zeldzaam. De vaste woorden blijven overal gelijk; in legenda's is gedaan
vol en gepland gestippeld. De regels staan in `docs/beslissingen/2026-11-09-stem-van-ascend.md`
(uitgewerkt in `docs/visie/stemgids-concept.md`); dat besluit vervangt
`docs/beslissingen/2026-10-27-stem-van-ascend.md`. Per tab herschreven, Vandaag eerst.

## Beweging

Subtiel en kort: 150 tot 400 ms, ease-out, nooit stuiterend, met CSS (`mx-*` onderaan
`src/index.css`) en kleine hooks (`components/motion.ts`), zonder bibliotheek
(`docs/beslissingen/2026-10-24-beweging.md`). Een animatie speelt alleen als een element
verschijnt, nooit bij elke render, en er blijft geen lus draaien behalve de zachte adem van
de missiekaart. De instelling Beweging (Normaal, Rustig, Uit; `engine/motionSettings.ts`)
staat als `data-motion` op `<html>`; `prefers-reduced-motion: reduce` telt altijd als Uit.
Een nieuwe animatie moet in Rustig en Uit dus ook netjes op de eindstand staan.

Vloeiende overgangen en uitgroei (`utils/haptics.ts`, instelling Trillen, `useSheetClose` met `sheetRef` op elk blad, `sheetDrag.scan.test.ts`, `armFlip()`/`useFlipList`, de donkere lucht `data-sky`): lees eerst `docs/architectuur/bediening-en-beweging.md`. Een blad met `animate-sheet-in` zonder `ref={sheetRef}` laat `sheetDrag.scan.test.ts` falen. Een nieuwe rij die een blad opent krijgt `data-sheet-from`. Een component gebruikt alleen de tokens en `.on-light`.

## Design tokens in code

Theme tokens are defined once in `src/index.css` under `@theme` and
consumed via Tailwind (`bg-[var(--color-card)]`) or inline `style` objects.
Never hardcode hex or rgba values in a component.

- Backgrounds (navy): `--color-bg` `--color-charcoal` `--color-surface`
  `--color-card` `--color-raised` (with `--color-card-border`), and
  `--color-control-border` for buttons, fields and switches
- Text: `--color-ink` (primary), `--color-ink-dim` (secondary)
- Action: `--color-action` (mint, line and text), `--color-action-fill` (the
  fill of the main button, mint everywhere), `--color-on-action` (dark text on
  mint), `--color-action-muted` (a switch that is on, a chosen chip)
- Status and progress: `--color-status` (ice, where you are),
  `--color-on-status`, `--color-progress` (mint), `--color-track` (the empty
  track of a ring or bar)
- Signal: `--color-success` `--color-success-text` `--color-warning` (amber,
  let op) `--color-danger` (fill) `--color-danger-text`
- Effort zones: `--color-effort-1` to `--color-effort-5`; sports:
  `--color-sport-run` `--color-sport-strength` `--color-sport-walk`
  `--color-sport-stretch` `--color-sport-mountain` (bergtocht, bergzon-geel; on
  the sky an olive ochre; also the `--color-chart-*` order). A bergtocht is told
  apart from a walk by `isMountainTrip` in `engine/sportKind.ts`
- The light sky: `--color-sky-top` `--color-sky-bottom` `--color-light-card`
  `--color-light-border` `--color-on-light` `--color-on-light-dim`
  `--color-action-on-light` `--color-status-on-light`; the mountains
  `--color-mountain-back` `--color-mountain-front`
- Tabs: `--color-tab-vandaag` `-week` `-stand` `-ascend` `-logboek`, each with a
  `-light` variant for the sky; `--color-page` is the colour of the tab you are on
- Old names (`--color-gold` `--color-bronze` `--color-bronze-dark`
  `--color-on-gold` `--color-alpine` `--color-stone` `--color-sky`
  `--color-snow`) still work and point at the new palette (gold and bronze are
  mint); new work uses the new names. Components read the new names:
  action, action-muted, on-action, status, ink, ink-dim, and `--color-sage` for
  alpine (a calm tint next to mint and ice, for "fris" and for a phase or kind;
  not a status and not an action). A rank that used to be gold against bronze now
  has its own meaning (effort scale, mint, ice, amber), see
  `docs/beslissingen/2026-10-24-stijlresten.md`
- Typography: `--font-display` (Marcellus, via `.font-display`) for
  headings/wordmarks, `--font-sans` (Inter) for everything else. Scale: 12
  (labels, eyebrows, tab bar), 14 (second line), 16 (body), 20 (card title),
  28 (page title in Marcellus); numbers in Inter semibold tabular at 20, 28,
  40 or 56 with the unit in 14 dimmed (`Stat`)
- Spacing on a 4 px grid: page edge 16, between cards 12, inside a card 16,
  cards rounded 16, buttons 12, pills round; the main button is 52 high,
  other buttons 44
- `html { color-scheme: dark }`: the app is dark-only, there is no light
  theme to preserve; the sky band is one light surface, not a theme
- Shared primitives live in `src/components/ui.tsx` (`Card`, `LightCard`,
  `PrimaryButton`, `SecondaryButton`, `StatusPill`, `Eyebrow`,
  `Stat`, `Ring`, `Meter`, `ZoneBar`, `Toggle`, `InfoButton`), `TextButton` and
  `TextLink` in `TextButton.tsx` (a small action in mint or dimmed, no underline,
  44 px; only a source link outside the app stays underlined), and the sky in
  `SkyBand.tsx`. Reuse these rather than re-implementing card/button chrome in
  a page or feature component
- Cards are `rounded-2xl` with a subtle border; the optional `topo-texture`
  class adds a very low-opacity topographic contour pattern in mint. Use it
  sparingly on specific cards, never as a global background
- Single-column, `max-w-md`, bottom tab navigation (`BottomNav` in
  `src/App.tsx`) with a safe-area-aware sticky bar.
  `@media (prefers-reduced-motion: reduce)` is respected globally

