# Warden Import alleen nieuw (I-38)

Branch `claude/import-alleen-nieuw`, laatste `8d4f4eb`, acht eigen commits en het kostenlogboek. Getoetst aan `CLAUDE.md`, `docs/werkbriefjes/historie-en-logs.md` en `docs/werkbriefjes/koppelingen-en-data.md`.

## Oordeel

AKKOORD, met één moet-punt (M1) dat voor de squash naar main hersteld wordt. Geen blokkerend punt in de import zelf.

## Wat ik draaide

- Op de branch zelf: tsc groen, lint groen (één bestaande waarschuwing in `LegFatigueCard.tsx`), `npx vitest run` 734 bestanden en 10862 tests groen, build groen.
- Proefmerge: de negen commits met cherry-pick op `origin/main` (`09c716d`). Twee conflicten, allebei verwacht: `docs/kennisindex/` (opgelost met `npm run kennisindex`, de vergelijking zegt daarna "Geen verschil") en `.claude/kosten/logboek.md` (beide regels houden). Daarna tsc, lint en build groen. Vitest: 737 van 738 bestanden groen; de ene rode is `src/engine/leavePlanAround.test.ts` "a long plan up to the goal day stays fast" (4573 ms tegen een grens van 4000), een tijdmeting onder drukte die los draaiend groen is en niets van deze branch raakt.
- Proeftests: `herstel-proeftests.patch` zet `src/storage/wardenImport.proef.test.ts` neer (54 tests, fake-indexeddb, alle data nagemaakt). `git apply herstel-proeftests.patch`, dan `npx vitest run src/storage/wardenImport.proef.test.ts`.
- Niet gedraaid: `kaart:vergelijk` (afgesproken), Chromium, een echte browser. De transacties zijn alleen tegen fake-indexeddb bewezen, niet tegen de IndexedDB van Chromium of de WebView.

## Wat de proeftests bewijzen

- Oude back-ups blijven importeerbaar: een nagemaakt bestand per vorm (plat van voor de envelop, v1, v2, v3, v4, v5) komt op een leeg toestel volledig binnen, met logs, planning, programma, doel, mijlpaalregel, instellingen en `appliedRestDay`.
- Dubbel importeren schrijft niets nieuw: bij de tweede import van hetzelfde bestand nul puts en nul clears op `sessionLogs`, `goalMilestoneProgress`, `planChangeProposals`, `strengthProgramRecommendations`, `activityStreams` en `recoveryMetrics`, en die opslagen zijn daarna gelijk. Per oude vorm blijft het één mijlpaalregel.
- Geen log herschreven of verloren: een ingekort log op het toestel blijft byte voor byte, een eigen log dat niet in het bestand staat blijft, een log dat het toestel schrijft tussen voorbeeld en Akkoord wint van de rij in het bestand. Een afgesloten voorstel blijft afgesloten. De kopie van voor een import terugzetten laat logs van daarna en een inkorting van daarna staan.
- Een fout halverwege laat niets half staan, per pad: een kapotte rij in een gewone put na een clear, een kapotte rij in alleen-nieuw (de put gebeurt pas na het kijken), een rij zonder sleutel, een kapotte mijlpaalregel, een functie voor instellingen of meta die gooit, een meta-waarde die niet bewaard kan worden, en een volledige terugzetting met een kapotte rij per oude vorm. Telkens is de hele database daarna gelijk aan ervoor, en de volgende ronde werkt gewoon.
- `addOnce`: tien schrijvers tegelijk geven één regel. `MetaRepo.update`: een `change` die gooit schrijft niets en blokkeert niets; twintig aanroepen tegelijk over drie repos blijven allemaal staan.
- Alles wissen: `resetToDemoData` laat geen log, kopie of instelling achter; `clearAllStores` met een vlag die niet bewaard kan worden wist niets.
- Stringhash: het id van een advies (`simpleHash`, opgeslagen) en de vingerafdruk van een horlogeworkout (opgeslagen) zijn gelijk aan de oude kopieën over 305 teksten, ook met tekens tot U+FFFE en 20000 tekens lang. De quote van de dag is gelijk voor elke datum van 2020 tot 2040. `planFingerprint` geeft dezelfde bits, nu zonder teken; hij leeft alleen in het geheugen.

## Moet

M1. Terugzetten wist een mijlpaalregel van het toestel die niet van dat log is. `src/storage/watchAlign.ts:79` en `src/storage/macrofactorLead.ts:76` wissen elke regel uit `manualMeasured.clearedProgressIds` op id. Met een willekeurig id was dat altijd de eigen regel van dat log. Met het vaste id (`milestoneProgressId`) is het id van de mijlpaal, niet van het log. Nagespeeld in de proeftest "vast id en Terugzetten" (staat op `it.fails`): het toestel heeft een mijlpaal met de hand behaald (regel met het vaste id), een back-up brengt een overgenomen log dat dezelfde mijlpaal haalde en dat vaste id in `clearedProgressIds` draagt; de import schrijft terecht geen tweede regel; Terugzetten op dat log wist daarna de eigen regel van het toestel. Zeldzaam (het vraagt een import van een andere stand en daarna Terugzetten), maar het is een MilestoneProgress die verdwijnt door deze wijziging. Voorstel: wis alleen als de regel van dit log is, zoals `src/state/logActions.ts:92` al doet: lees de regel en wis hem alleen bij `sourceSessionLogId === log.id`. Zet de proeftest daarna van `it.fails` op `it`.

Voorgestelde regel voor `docs/werkbriefjes/historie-en-logs.md` (Valkuilen): "Het vaste id van een mijlpaalregel is van de mijlpaal, niet van het log: wis een regel uit `clearedProgressIds` alleen als `sourceSessionLogId` het log is dat je terugzet."

## Mag

- `src/engine/factsCache.ts:16`: `hashOf` geeft niet meer dezelfde uitkomst. De oude kopie was de xor-variant (`(h * 33) ^ teken`), de nieuwe telt op. De sleutel leeft alleen in het geheugen, dus er breekt niets, maar `src/utils/stringHash.test.ts:26` zegt "de oude kopieën" en dekt deze vijfde niet. Voorstel: één zin in het commentaar dat deze bewust anders is.
- `src/storage/backupApply.ts:186`: `oneLinePerMilestone` werkt alleen bij het schrijven. Het voorbeeld telt een tweede regel voor dezelfde mijlpaal nog mee (in de proef 4 toegevoegd, 3 geschreven). Voorstel: dezelfde filter in `computeDiff`.
- `src/storage/databaseBackupWrites.ts:112`: twee rijen met hetzelfde id in één bestand lezen allebei "nog niet aanwezig" en de laatste wint. Was voor deze branch ook zo. Voorstel: in `historyWrite` per sleutel alleen de eerste doorgeven.
- Open punt 1, geen test van `loadState` in de echte provider: mag blijven. De testomgeving is kaal Node zonder DOM; `createLatestRunner` is los getest en de provider roept alleen die aan (`src/state/AppDataProvider.tsx:155`). Na de laatste controle staat nog een `await` (regel 212) met daarna alleen `setRecentChange` in functievorm; een verdrongen lezing kan daar geen oude stand neerzetten. Een scantest die bewaakt dat `loadState` door `loadRunner.current.run` gaat is genoeg als iemand dit wil vastleggen.
- Open punt 2, een back-up met routes zonder plekken: mag blijven. `src/storage/backupPreview.ts:215` filtert de routes van het bestand op de plekken uit de kopie, en `src/storage/backupApply.ts:151` voegt alleen het omgekeerde geval opnieuw samen. Maar de kopie wordt in `applyImportPlan` zelf gelezen, milliseconden voor het schrijven; de app maakt zo'n bestand nooit zelf (`src/storage/backupExport.ts:83` schrijft routes alleen bij hun plekken); en een route zonder plek valt bij elke lezing weg (`src/storage/places.ts` `readStore`). In de proef: routes r1, r2, r3 voor plekken A, B, C op een toestel met A en B geeft r1 en r2.
- `docs/beslissingen/2026-11-15-import-alleen-nieuw.md`, Reden: "las het toestel voor het voorbeeld" is ruimer dan het was; `applyImportPlan` las de kopie zelf opnieuw bij Akkoord. Het venster was dus kort, het besluit blijft juist. Geen wijziging nodig, besluiten worden niet herschreven.

## Verder getoetst, geen bevinding

Geen vormwijziging en dus terecht geen migratie; `DB_VERSION` blijft 9. "Voltooid" nergens een vlag. Niets in de planning verandert stil. Geen backend, HashRouter onaangeroerd. Geen persoonsgegevens en geen gedachtestreepjes in de wijziging of de commitberichten. Besluit vastgelegd, kennisindex bij, `Klaar: I-38` staat in de commit, werkbriefje 44 regels.
