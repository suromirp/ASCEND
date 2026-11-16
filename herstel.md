# Warden IJkset: herkeuring

Branch `claude/ijkset-automatisch` (kop 757f4dac, herstel in 1a2ab8e2) tegen `origin/main`. Onderwerp I-65. Eerdere uitslag: `warden/ijkset-herstel` (niet akkoord, moet 1).

Uitslag: AKKOORD. Moet 1 en de punten 2, 3 en 4 zijn hersteld. Geen blokkerende punten. Drie kleine punten mogen later.

## Hersteld

1. Moet 1, de ijkset verdween stil bij Lichter aan of uit: hersteld met keuze (b) en dezelfde regel op alle drie de plekken. `calibrationBlock` geeft `eased` (`src/engine/calibration.ts:66`). `syncAutoCalibration` (`src/engine/calibration.ts:160`) loopt bij het openen (`src/components/forge/ForgeWorkout.tsx:251` tot `:261`), in `replan` (`:363` tot `:374`) en bij een concept dat opnieuw gepland wordt. Lichter aan haalt de set met zijn regel in het verloop weg, Terugzetten zet hem terug, een set die je zelf weghaalde komt niet terug (de regel weggehaald gaat mee door `replan`), een afgevinkte set blijft. Tik je Terugdraaien na het weghalen, dan verdwijnt de regel weggehaald (`useForgeRowEdits.ts`, `undoRemove`) en telt hij dus niet meer als weggehaald: klopt. Getest in `src/engine/calibration.test.ts` (zes gevallen onder `syncAutoCalibration`).
2. Punt 2, ijkset op een verlichte training: opgelost door `eased`, ook voor Vragen (`calBlocked` volgt nu `easeOn`, `ForgeWorkout.tsx:246` en `:684`). Het besluit en de uitleg zeggen het.
3. Punt 3, twee ijksets binnen vier weken: `pending` via `src/utils/forgeSessionStore.ts#otherDraftHasCalibration`. De sleutel van het scherm en die in de wijzer hebben dezelfde vorm (`draftKey` met voorvoegsel, zoals `useForgeDraft.ts:38`), dus het eigen concept telt niet als een ander. Een kapot concept of geen opslag geeft nee. Getest in `src/utils/forgeSessionStore.test.ts`.
4. Punt 4, `touchedInDraft`: de rij `:aijk` telt niet meer als de jouwe (`src/engine/forgeInput.ts:474`). Het openen geeft `mergeDraft` het plan van nu met de ijkset erin als het concept hem had op dezelfde plek; verschilt de plek, dan houdt het concept zijn rijen (het aantal rijen verschilt). Getest.
5. Punt 5 (`useMemo`), punt 7 (de zin over de gezondheid is weg uit het besluit) en punt 8 (test dat de regel toegevoegd niet meetelt in `unseenCount`): gedaan. Punt 6 bleef zoals het was, zoals toegestaan.
6. Het voorstel voor het werkbriefje staat erin (`docs/werkbriefjes/forge.md`, Valkuilen, laatste punt).

## Niets nieuws gebroken

- Historie: `syncAutoCalibration` filtert alleen het verloop in de state van het scherm (regels toegevoegd van een ijkset die er niet meer staat). Het raakt geen `SessionLog` en geen `forgeLog` van een bestaand log; het log ontstaat pas bij Afronden als nieuw log. `replan` verving het verloop al en kan alleen zolang er niets is afgevinkt. Geen vlag voor voltooid.
- Concepten: bij het openen wordt niets geschreven; het concept schrijft pas na een handeling. Een concept dat zijn rijen houdt, houdt de ijkset of dat je hem weghaalde.
- `dropDraft` en de volgorde bij Afronden: `src/components/forge/ForgeSheets.tsx` is door het herstel niet aangeraakt; `calibratedAt` nog steeds na de uitkomst van het log en voor `dropDraft`.
- De merge 757f4dac heeft dezelfde boom als 1a2ab8e2; `origin/main` is voorouder van de kop.
- Opslag: geen nieuwe vorm (de rij draagt een vaste id, geen nieuw veld), dus geen migratiestap. Planning, stack, ontwerp, privacy en tekst: in orde, geen U+2013 of U+2014 in de wijziging of de commitberichten.

## Mag (klein)

1. `src/components/forge/ForgeWorkout.tsx:253`: `replanned` herhaalt de voorwaarde van `resumeDraft` (`src/engine/forgeInput.ts:498`) in het component. Lopen die twee uit elkaar, dan krijgt een heropend concept een ijkset zonder regel of andersom. Voorstel: de voorwaarde als functie in `src/engine/forgeInput.ts` (bijvoorbeeld `draftReplans`) en beide plekken lezen die, of het hele openen als functie in de engine met een test.
2. `src/components/forge/ForgeWorkout.tsx:363` en `:689`: met Vragen zet Akkoord `calibratedAt` meteen en de set komt via `addSetLogged`, zonder `:aijk`. Lichter aan daarna (er is nog niets afgevinkt) bouwt de training opnieuw: de set is weg, de vier weken tellen al, en de kaart zegt nog toegevoegd. Bestond al voor I-65 (`replan` gooide elke toegevoegde set weg), niet van dit herstel. Voorstel: eigen Inboxpunt; de set van Vragen dezelfde id geven en `calibratedAt` ook daar pas bij Afronden.
3. Een concept met een ijkset houdt hem bij heropenen ook als de stand intussen Uit is of er nu een blok geldt. Past bij "het concept houdt wat het had"; een zin in het besluit is genoeg.

## Voorstel voor het werkbriefje Forge (Valkuilen)

"Wanneer een concept opnieuw gepland wordt, beslist `resumeDraft`; een component rekent dat niet zelf na. Een set die Forge na Akkoord toevoegt (Vragen) gaat bij `replan` verloren: geef hem een herkenbare id of zet `calibratedAt` pas bij Afronden."

## Controles (eigen worktree op 757f4dac)

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npx vitest run src/engine/calibration src/engine/forge src/utils/forgeSession`: 28 bestanden, 628 groen.
- `npx vitest run` (alles): 753 bestanden, 11249 groen. De twee rode van de vorige keer (`briefingPerManier.test.ts`) zijn op main hersteld.
- `npm run lint`: groen, alleen de bestaande waarschuwing in `src/components/LegFatigueCard.tsx:25`.
- `npm run kennisindex:vergelijk`: geen verschil. `npm run build`: groen.
- Niet gelukt: `npm run kaart:vergelijk` gaf na ruim zes minuten geen uitvoer en is gestopt; de coördinator draait hem opnieuw voor de push.
- Niet gedraaid: de doorloop in Chromium op 360 en 390 px (Lookout) en de doorloop van de dag (Pathfinder). Lichter aan en uit met de ijkset is uit de code en de tests gelezen, niet in de browser nagespeeld.

Akkoord voor main.
