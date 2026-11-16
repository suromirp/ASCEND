# Warden IJkset: uitslag

Branch `claude/ijkset-automatisch` (1142782c, ede7563d) tegen `origin/main`. Onderwerp I-65.

Uitslag: NIET AKKOORD. Eén punt moet, de rest mag.

## Moet

1. De automatische ijkset verdwijnt stil bij Lichter aan of uit.
   Plek: `src/components/forge/ForgeWorkout.tsx:352` (`replan`), met `:244` en `:245`; dezelfde familie in `src/engine/forgeInput.ts:498` (`resumeDraft`, de tak `return fresh`).
   Reden: `withAutoCalibration` loopt alleen in de beginstand van `useState`. `replan` zet daarna `planWorkout(...)` zonder de set en vervangt het verloop door alleen de spotterregels. Op een beendag met Automatisch erbij: openen (de set en de regel staan er), Lichter uit of aan, en de set, de regel boven de oefening en de regel in het verloop zijn weg zonder dat iemand hem weghaalde. Zet je Lichter terug, dan komt hij niet terug. Hetzelfde bij een concept zonder afgevinkte set waarvan de stand van Lichter verschilt van nu.
   Voorstel: kies één van twee en test hem in `src/engine/calibration.test.ts`. (a) In `replan` en in de verse tak opnieuw `withAutoCalibration` toepassen als de stand Automatisch is, er niets blokkeert en de set niet door jou is weggehaald, met dezelfde regel in het verloop. (b) Besluiten dat een verlichte training geen ijkset krijgt: dan `ease` als reden in `calibrationBlock` (of een eigen voorwaarde naast `calBlocked`), ook bij het openen, en één zin in het besluit en de uitleg. Nu staat hij er bij openen met Lichter aan wel en na een tik niet meer.

## Mag

2. Belangrijk: ijkset op een training die Forge zelf lichter maakt. `src/components/forge/ForgeWorkout.tsx:244`. Met Lichter aan (beendag, korte nacht) zet Automatisch toch een set tot bijna falen bij de hoofdoefening. Bij Vragen was dat een keuze met Akkoord, nu staat hij er vanzelf. Hangt samen met punt 1, keuze (b) lost beide op.
3. Belangrijk: twee ijksets binnen vier weken. `src/components/forge/ForgeWorkout.tsx:241`. `calibratedAt` komt pas bij Afronden, dus een tweede training die je opent terwijl de eerste nog als concept loopt krijgt ook een ijkset. Voorstel: in `calBlocked` ook kijken of een lopend concept al een rij met `:aijk` heeft, of het zo laten en het in het besluit noemen.
4. Klein: de hoofdoefening met ijkset krijgt in een heropend concept nooit het plan van nu. `src/engine/forgeInput.ts:473` (`touchedInDraft` telt `isOwnRow`). De rij `:aijk` is van Forge, niet van jou; een concept bestaat pas na een handeling, dus de schade is klein. Voorstel: `isOwnRow(r) && !isCalibrationRow(r)` daar, of een zin in het briefje.
5. Klein: `calBlocked` wordt bij elke render berekend (`leaveDays` bouwt de hele kaart). `src/components/forge/ForgeWorkout.tsx:241`. Voorstel: `useMemo`.
6. Klein: `calibratedAt` wordt niet gezet als het log er al stond (`saved` is dan nee). `src/components/forge/ForgeSheets.tsx:235`. De set staat dan de volgende keer weer klaar. Mag blijven.
7. Klein, privacy: `docs/beslissingen/2026-11-15-ijkset-automatisch.md:28` zegt dat de eigenaar die dag ziek was. Geen identificerend gegeven volgens de lijst, wel gezondheid in een openbare repo. Voorstel: de zin "Hij was die dag ziek" weglaten; de regel zelf (ziek: geen ijkset) blijft staan.
8. Klein: de melding van de bouwer klopt niet. De regel "toegevoegd" telt niet mee in het teken van het verloop: `NOTABLE` in `src/engine/forgeLog.ts:195` kent alleen bijgestuurd, doorgevoerd, onder en past-niet. Geen wijziging nodig; wil je het teken wel, dan is dat een eigen besluit.

## Getoetst en in orde

- Opslag: `calibrationMode` is een nieuw optioneel veld in `settings.strengthModel`, gelezen met een standaard in `normalizeStrengthSettings` en `resolveStrengthSettings` (`src/engine/strengthSettings.ts:604`, `:688`); `calibration` blijft meegeschreven (`ForgeGroup.tsx:206`). Zo ging het ook bij `quickRirMode`, zonder migratiestap. Geen vorm die in plaats verandert, dus geen migratie nodig. `src/storage/strengthSettings.test.ts` leest een oude back-up met aan, uit, leeg en een onbekende waarde. Terugzetten naar het advies ruimt beide sleutels op (`settingsDiff.ts:258`).
- Historie: bij het openen wordt niets geschreven. De set en de regel in het verloop staan alleen in de state; het concept schrijft pas als `startedAt` er is (`useForgeDraft.ts:59`), het log pas bij Afronden als nieuw log. Geen vlag voor voltooid.
- Volgorde bij Afronden: `calibratedAt` na de uitkomst van het log en vóór `dropDraft`, niet afgewacht en met een eigen vangnet; een schrijffout van het log gooit eerder, dus het concept blijft (`ForgeSheets.tsx:232` tot `:237`).
- Planning: Automatisch raakt geen template en geen planning, alleen het scherm van de geopende training; het is een stand die je zelf kiest, Vragen blijft het advies, de set is weg te tikken en er staat één regel uitleg. Past binnen Nooit van het briefje. Besluit ligt vast.
- `calibrationBlock`: `calBlocked` geldt voor Vragen en Automatisch (`ForgeWorkout.tsx:244`, `:667`), Uit doet niets. Ziek (open melding, ziekdag, opbouw), vakantie- en tochtdag, zonder sportschool, tocht als vrije periode in de week en de drie dagen erna, plus de oude redenen: getest in `src/engine/calibration.test.ts`.
- `strengthModelKey` laat beide sleutels weg: een klik in Instellingen telt de historie niet opnieuw.
- Tekst: geen U+2013 of U+2014 in de wijziging, je en jij, zinsletters, vaste woorden Niet nu en Akkoord. Ontwerp: alleen tokens, 12 px, geen losse kleuren.
- Stack en privacy: geen backend, HashRouter onaangeroerd, geen naam, plaats of adres.

## Controles

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen, alleen een bestaande waarschuwing in `src/components/LegFatigueCard.tsx:25`.
- `npx vitest run`: 11214 groen, 2 rood in `src/engine/briefingPerManier.test.ts:160` (heuvelintervallen 40 in plaats van 25, bij rustig en minder). Dezelfde 2 zijn rood op `origin/main` in een eigen worktree, en de branch raakt dat bestand niet: niet van deze wijziging, wel een rode poort voor elke push naar main. Meld het aan de coördinator.
- `npm run kaart:vergelijk`: geen verschil, geen schendingen. `npm run kennisindex:vergelijk`: geen verschil. `npm run build`: groen.
- Niet gedraaid: de doorloop in Chromium op 360 en 390 px (Lookout) en de doorloop van de dag (Pathfinder). Punt 1 is uit de code gelezen, niet in de browser nagespeeld.

## Voorstel voor het werkbriefje Forge (Valkuilen)

"Wat Forge bij het openen zelf in de training zet (de ijkset van Automatisch erbij) staat alleen in de beginstand: `replan` (Lichter aan of uit) en de verse tak van `resumeDraft` bouwen de training opnieuw en moeten hem opnieuw zetten of bewust weglaten. Een rij van Forge is geen rij van jou: laat `touchedInDraft` hem niet als aangeraakt tellen."
