# ASCEND dataveiligheid: auditrapport

Datum: 2026-10-03. Gecontroleerde versie: commit d8e19d3 (werkboom schoon, niets gewijzigd).

Werkwijze: code gelezen (src/storage, src/state/AppDataContext.tsx, src/models, vite.config.ts, vite-plugin-pwa client), daarna gereproduceerd met een eigen vitest-suite op fake-indexeddb (`tests/data.test.ts`, uitvoer in `vitest-output.txt`) en met Playwright tegen de echte app op poort 5176 (scripts `pw-*.cjs`, uitvoer in `pw-*.out`, screenshots `shot-*.png`). Alle bestanden staan in deze map. Elk punt hieronder is gereproduceerd, tenzij er expliciet "afgeleid uit code" bij staat.

---

## 1. Volledig herstellen met een lege of onvolledige back-up wist alle geschiedenis, terwijl het voorbeeld "Geen wijzigingen" zegt

**Risico: hoog**

**Reproductie**
1. Zorg voor trainingsgeschiedenis (in de test: 25 SessionLogs).
2. Maak een bestand `{"backupSchemaVersion":3,"createdAt":"...","payload":{"version":3}}` (zie `backup-empty-payload.json`). Dit is bijvoorbeeld wat je krijgt bij een half weggeschreven of handmatig ingekort bestand.
3. Meer → Gegevens → IMPORTEER DATA → kies het bestand → Volledig herstellen.
4. Het voorbeeld toont bij elke categorie "Geen wijzigingen" (`shot-import-empty-preview-with-logs.png`). Druk op IMPORTEREN: "Import geslaagd."

Resultaat (`pw-g.out`): voor de import 25 logs, 112 geplande sessies, 10 templates, 1 doel. Daarna 0 logs, 0 geplande sessies, 0 templates, 0 doelen en 0 mijlpalen. Na herladen zet `ensureDefaultTemplates` alleen de templates terug; geschiedenis, planning en doelen blijven weg. Ook in vitest bevestigd (`vitest-output.txt`, test "an empty v3 payload wipes all logs").

**Gevolgen voor de gebruiker**: jaren aan trainingsgeschiedenis in één tik weg, na een scherm dat expliciet zegt dat er niets verandert. Het enige vangnet (de pre-import-snapshot) is niet bereikbaar, zie punt 3.

**Bestand / regel**
- `src/storage/backup.ts:323-325` (`resolveListCategory`, actie `replace` telt alleen `incoming.length` als `toReplace`, het aantal te verwijderen huidige records telt nergens mee)
- `src/storage/backup.ts:629-651` (`applyImportPlan` schrijft `clear: true` ook als `puts` leeg is)
- `src/storage/backup.ts:155-170` (ontbrekende arrays worden stil `[]`)
- `src/components/ImportWizard.tsx:289` (toont "Geen wijzigingen" bij 0/0/0)

**Voorstel**
- Een ontbrekend veld in de payload is "onbekend", niet "leeg": behandel een ontbrekende categorie als `keep_current` en meld dat in het voorbeeld ("zit niet in deze back-up, blijft ongewijzigd").
- Voeg aan `ImportDiffEntry` een `toRemove` toe (huidige records die verdwijnen) en toon dat in rood: "25 trainingen worden verwijderd".
- Weiger Volledig herstellen als de back-up 0 logs bevat terwijl er nu wel logs zijn, tenzij de gebruiker dat expliciet bevestigt.
- Maak van SessionLog bij herstellen standaard een samenvoeging (append-only), zodat "vervangen" alleen nog voor planning en instellingen geldt.

---

## 2. Volledig herstellen van een recente back-up verwijdert stil alle nieuwere trainingen

**Risico: hoog**

**Reproductie** (vitest, "full restore of a 10-day old backup"): logs `old` (20 sep) aanwezig, export gemaakt op 23 sep, daarna logs `new1` (28 sep) en `new2` (2 okt) toegevoegd. Volledig herstellen van de export van 23 sep. Voorbeeld: `toReplace: 1`, geen waarschuwing (`restoreDateWarning` is `undefined`). Na import staat alleen `old` er nog; `new1` en `new2` zijn weg.

Hetzelfde geldt voor gegevens die in de instellingen zitten: `weightEntries` en `illnessEpisodes` worden in hun geheel vervangen door de versie uit de back-up (test "merge keeps settings as-is": na volledig herstellen is de gewichtsmeting van 1 oktober verdwenen).

**Gevolgen voor de gebruiker**: wie op een nieuw toestel of na een probleem "even de back-up van vorige week" terugzet, verliest alles van die week, inclusief mijlpaal-voortgang. De enige waarschuwing komt pas bij een back-up ouder dan 30 dagen.

**Bestand / regel**
- `src/storage/backup.ts:265-275` (volledig herstellen = `replace` voor `training_history`)
- `src/storage/backup.ts:537-561` (waarschuwing pas na 30 dagen)
- `src/storage/backup.ts:500-501` (instellingen worden als één object overschreven)

**Voorstel**
- Toon in het voorbeeld altijd het aantal huidige logs dat verdwijnt en de datum van de nieuwste log die verloren gaat ("je trainingen van 24 sep tot 2 okt verdwijnen").
- Waarschuw al zodra er huidige logs nieuwer zijn dan `createdAt` van de back-up, ongeacht de leeftijd.
- Voeg historische lijsten in de instellingen (`weightEntries`, `illnessEpisodes`) samen op datum/id in plaats van ze te vervangen, of verhuis ze naar een eigen store met merge-semantiek.

---

## 3. Het automatische vangnet voor een import bestaat, maar is voor de gebruiker onbereikbaar

**Risico: hoog** (maakt punten 1 en 2 onherstelbaar)

**Reproductie**
- Na elke import staat er een `PreImportSnapshot` in de store `backupSnapshots` (in `pw-import.out` loopt het aantal op van 0 naar 1 naar 2).
- In de hele codebase wordt `BackupSnapshotsRepo` alleen geschreven (`backup.ts:587`), nergens gelezen. Er is geen scherm om een snapshot terug te zetten of te downloaden; de snapshot zit ook niet in de export.
- Snapshots worden nooit opgeruimd: na 5 imports 5 volledige kopieën (vitest: circa 219 kB op een vrijwel lege database; met jaren data groeit dit per import met de volledige databasegrootte).

**Gevolgen voor de gebruiker**: het voorbeeldscherm belooft "Er wordt automatisch een back-up van je huidige gegevens gemaakt", maar na een verkeerde import kan de gebruiker die niet gebruiken. Daarnaast vreet elke import opslag, wat op iOS de kans op een volle opslag vergroot (punt 8).

**Bestand / regel**: `src/storage/backup.ts:579-589`, `src/components/ImportWizard.tsx:301`, `src/storage/database.ts:391-395`

**Voorstel**
- Toon direct na een import (en in Meer → Gegevens) "Import ongedaan maken" en een lijst van de laatste snapshots met datum, met "Terugzetten" en "Downloaden als bestand".
- Bewaar de laatste 3 tot 5 snapshots en ruim oudere op.

---

## 4. De app vraagt geen persistente opslag aan; de browser mag alle data wissen

**Risico: hoog**

**Reproductie**: na het opstarten geeft `navigator.storage.persisted()` `false` (`pw-storage.out`, test C). In de code komt `navigator.storage.persist()` nergens voor.

**Gevolgen voor de gebruiker**: zonder persistente opslag mag de browser IndexedDB opruimen bij weinig schijfruimte. Safari wist bovendien alle scriptopslag van een website die zeven dagen niet geopend is, als de app niet op het beginscherm is gezet. Voor een app zonder server betekent dat: alle geschiedenis weg, zonder melding.

**Bestand / regel**: ontbreekt; logisch in `src/state/AppDataContext.tsx` bij het opstarten (rond regel 848) of in `src/main.tsx`.

**Voorstel**
- Roep bij het opstarten `navigator.storage.persist()` aan en toon de status in Meer → Gegevens ("Opslag beschermd: ja/nee").
- Als het niet lukt, toon een duidelijke hint: "Zet ASCEND op je beginscherm en maak regelmatig een back-up".

---

## 5. De export is niet compleet: een volledig herstel op een nieuw toestel verliest instellingen en historie

**Risico: middel**

**Reproductie** (vitest, "lists which persisted data does NOT survive"): alle stores en meta-sleutels gevuld, geëxporteerd, database gewist, volledig hersteld. Wat goed terugkomt: programma, templates, geplande sessies, logs, doelen, mijlpalen, mijlpaal-voortgang, baseline-metingen, blessures en alle velden van AppSettings (`illnessEpisodes`, `weightEntries`, `weightReminderDays`, `homeLocation`, `enabledSports`, `sportFrequency`, `changeApplyMode`, `lastExportedAt` enzovoort). Wat niet terugkomt:
- `meta.goalEngineConfig`: beschikbaarheid, tijdsbudget per dag, strategie (bijvoorbeeld "sessies samen op één dag"), guardrails. Dit stelt de gebruiker zelf in onder Meer → Training.
- `strengthProgramStrategies`: het eigen krachtblok (frequentie, split). Op een nieuw toestel zet `migrateStrengthProgramDefault` er een standaardblok voor in de plaats.
- `strengthProgramRecommendations`
- `planChangeProposals`: het wijzigingslog ("recente wijzigingen" in ChangeLogCard) en de basis voor de 48-uurs-conflictsignalen.
- `meta.adviceResponses`: eerder geweigerd coachadvies komt na herstel terug.
- `meta.stretchCompletion` (klein).

Daarnaast bestaat de melding "recente wijziging" met "Ongedaan maken" (`recentChange`) alleen in het geheugen: na herladen of een update is ongedaan maken niet meer mogelijk.

De export-envelop bevat ook geen `appVersion`, hoewel het type dat veld wel kent.

**Gevolgen voor de gebruiker**: na een nieuw toestel of herstel lijkt alles terug, maar de planning wordt opgebouwd met een standaard krachtblok en standaard beschikbaarheid. De gebruiker merkt dat pas als de weekplanning anders uitvalt.

**Bestand / regel**: `src/storage/backup.ts:92-125` (`buildBackupEnvelope`), `src/storage/backupTypes.ts:60-72`

**Voorstel**: payload v4 met `goalEngineConfig`, `strengthProgramStrategies`, `strengthProgramRecommendations`, `planChangeProposals` en `adviceResponses`, met een normalisatiestap v3 → v4 die ze leeg laat (en dan als "niet in back-up" behandelt, zie punt 1). Vul `appVersion` met `APP_VERSION`. Voeg een round-trip-test toe die alle stores en meta-sleutels vergelijkt, zodat een nieuwe store niet meer stil uit de export valt.

---

## 6. Import controleert de inhoud niet: één kapot record laat het Vandaag-scherm blijvend crashen

**Risico: middel**

**Reproductie**
- Neem een echte export en vervang `sessionLogs` door `[{"id":"junk"}]` en `settings.weightEntries` door `"oops"` (`backup-junk.json`). Importeer met Volledig herstellen: "Import geslaagd."
- Het Vandaag-scherm toont daarna "Er ging iets mis" met `Cannot read properties of undefined (reading 'localeCompare')`, ook na herladen (`pw-junk.out`, `shot-junk-today.png`). Er is in de app geen manier om het kapotte record te verwijderen.
- Een record zonder `id` breekt de transactie wel netjes af (niets gewijzigd), maar de melding is de rauwe Engelse browsertekst "Data provided to an operation does not meet requirements." (vitest).
- Een afgekapt JSON-bestand geeft "Unterminated string in JSON at position 500 (line 16 column 150)" (`pw-import.out`, `shot-import-corrupt.png`). Duidelijk is anders.

Goed: een nieuwere back-up, onbekende payloadversie, `null`, een array en een willekeurig object geven een nette Nederlandse melding (vitest, "error messages for odd files").

**Gevolgen voor de gebruiker**: een met de hand aangepast of beschadigd bestand kan de app onbruikbaar maken; de meldingen helpen niet bij wat er mis is.

**Bestand / regel**: `src/storage/backup.ts:139-241` (geen schemavalidatie), `src/components/ImportWizard.tsx:70-83` (`JSON.parse` zonder eigen melding)

**Voorstel**
- Valideer elk record per type (verplichte velden, typen, datumformaat) voordat het voorbeeld getoond wordt; toon "12 records overgeslagen omdat ze onvolledig zijn" in plaats van ze op te slaan.
- Vang `SyntaxError` af met "Dit bestand is beschadigd of onvolledig (geen geldige JSON)".
- Vertaal fouten uit de transactie naar een Nederlandse melding die zegt dat er niets is gewijzigd.

---

## 7. Als IndexedDB niet beschikbaar is, blijft de app eeuwig op het opstartscherm hangen

**Risico: middel**

**Reproductie**: Playwright met `IDBFactory.prototype.open` die een fout geeft, zoals bij geblokkeerde opslag of een strikte privémodus. Na 10 seconden staat er nog steeds "De klim wordt voorbereid…" zonder navigatie; in de console alleen een niet-afgevangen fout (`pw-multitab.out`, test H; `shot-idb-unavailable.png`).

**Gevolgen voor de gebruiker**: een leeg laadscherm zonder uitleg. De gebruiker weet niet dat het aan de browserinstelling of privémodus ligt en denkt mogelijk dat zijn data weg is.

Afgeleid uit code, niet gereproduceerd: hetzelfde gebeurt als een gebruiker ooit terugvalt naar een oudere build met een lagere `DB_VERSION` (VersionError bij openen).

**Bestand / regel**: `src/state/AppDataContext.tsx:848-879` (geen try/catch rond `runBootMigrationsOnce` en `refresh`), `src/storage/database.ts:87-144`

**Voorstel**: vang de fout bij opstarten af en toon een foutscherm: "ASCEND kan hier geen gegevens opslaan. Privémodus of geblokkeerde opslag? Open de app in een normaal venster." Met de technische fout eronder om te kopiëren.

---

## 8. Opslag vol of schrijffout tijdens het opslaan van een training: knop blijft hangen, geen melding

**Risico: middel**

**Reproductie**: training ingevuld via "+ losse training loggen", daarna laat `IDBObjectStore.put` een `QuotaExceededError` geven en druk op VOLTOOIEN. De knop blijft op "OPSLAAN..." staan, er verschijnt geen melding, er is 0 logs opgeslagen; alleen een niet-afgevangen fout in de console (`pw-storage.out` test B, `shot-quota-save.png`).

Hetzelfde patroon (await zonder try/catch, geen melding) zit in vrijwel alle schrijfacties in `AppDataContext.tsx`: verplaatsen, overslaan, blessure toevoegen, instellingen, ziekmelding, export.

**Gevolgen voor de gebruiker**: een volledig ingevulde training lijkt te worden opgeslagen maar is weg zodra het scherm sluit. Op iOS, waar de opslaglimiet lager is, en met de groeiende snapshots uit punt 3 is dit realistisch.

**Bestand / regel**: `src/components/ExerciseLogger.tsx:130-182` (`handleSave`), `src/state/AppDataContext.tsx:905-966` (`logSession`)

**Voorstel**: centrale foutafhandeling voor schrijfacties: bij een fout de invoer laten staan, een melding tonen ("Opslaan lukt niet: de opslag op dit toestel is vol. Maak een back-up en ruim ruimte op.") en `QuotaExceededError` apart herkennen. Overweeg het ingevulde formulier als concept in `localStorage` te bewaren tot het opslaan gelukt is.

---

## 9. Twee tabbladen tegelijk: wijzigingen worden overschreven door verouderde gegevens

**Risico: middel**

**Reproductie** (`pw-multitab.out`, test I): open de app in tab A en tab B. In tab A de sessie van vandaag via "andere dag kiezen" verplaatsen naar 8 oktober: in de database `date: 2026-10-08, status: moved`. In tab B (niet herladen) dezelfde sessie overslaan. Resultaat in de database: `date: 2026-10-03, status: skipped`. De verplaatsing uit tab A is stil teruggedraaid, omdat tab B het hele object uit zijn verouderde React-state terugschrijft.

Daarnaast toont tab B de in tab A gelogde training pas na herladen (test F). Er is geen synchronisatie tussen tabbladen (geen `BroadcastChannel` of `storage`-event).

**Gevolgen voor de gebruiker**: SessionLogs zelf gaan hierdoor niet verloren (nieuwe id's), maar planning, ziekmeldingen en mijlpaal-koppelingen kunnen inconsistent worden, bijvoorbeeld `undoLog` dat met een verouderde `goalMilestoneProgress` werkt.

**Bestand / regel**: `src/state/AppDataContext.tsx:1028-1070` (`applyProposal` gebruikt `plannedSessions` uit state), idem `applyNoTimeToday` (1344-1365), `resolveInjury` (1293-1301), `undoLog` (972-981)

**Voorstel**: lees in elke mutatie het actuele record uit IndexedDB in plaats van uit state (zoals `commitPlanChange` al doet), en stuur na elke schrijfactie een bericht via `BroadcastChannel('ascend')` zodat andere tabbladen `refresh()` doen.

---

## 10. Een toekomstige ophoging van DB_VERSION blijft hangen zolang er nog een oud tabblad openstaat

**Risico: middel**

**Reproductie** (`pw-storage.out`, test D): twee tabbladen met de app open (versie 8). In tab B `indexedDB.open('ascend-db', 9)`, wat een nieuwe build met `DB_VERSION = 9` doet. Het `blocked`-event vuurt en na 5 seconden is de database nog niet geopend. Tab A sluit zijn verbinding nooit, omdat `openDB` geen `blocking`-handler heeft.

Na een update met een nieuwe DB-versie blijft het bijgewerkte tabblad dus op het opstartscherm hangen tot de gebruiker alle andere ASCEND-tabbladen of PWA-vensters sluit, zonder dat de app dat zegt.

**Bestand / regel**: `src/storage/database.ts:89-141`

**Voorstel**: geef `openDB` een `blocking`-callback die de verbinding sluit en het tabblad laat herladen (of een balk "ASCEND is in een ander venster bijgewerkt, herlaad"), en een `blocked`-callback die op het opstartscherm toont "Sluit andere ASCEND-vensters om de update af te ronden".

---

## 11. Boot-migratie restorePatternSessionsRemovedByPrescription draait een eigen keuze van de gebruiker bij elke start terug

**Risico: middel**

**Reproductie** (vitest, "undoes a later manual skip"): een lange duurloop die ooit door de weekplanning is overgeslagen, met het bijbehorende `PlanChangeProposal`. Eerste start: hersteld (verwacht). Daarna slaat de gebruiker die duurloop zelf over (`status: skipped`). Volgende start: de functie zet hem opnieuw op `planned`. Dit herhaalt zich bij elke start, zolang het oude voorstel in de audit-trail staat, wat altijd zo is.

De functie raakt nooit SessionLogs, verleden dagen of gelogde sessies; dat deel is veilig. Maar hij is alleen idempotent zolang de gebruiker niets doet. De tweede lus verwijdert bovendien een niet-gelogde sessie die toevallig op dezelfde dag en met hetzelfde template staat als het oude "add"-item, ook als de gebruiker die zelf heeft ingepland (afgeleid uit code).

**Gevolgen voor de gebruiker**: een bewust overgeslagen training staat na het openen van de app weer in de planning; dat oogt als een bug en ondermijnt vertrouwen in de planning.

**Bestand / regel**: `src/storage/database.ts:947-985`, aangeroepen in `src/state/AppDataContext.tsx:86`

**Voorstel**: maak dit een eenmalige reparatie met een eigen meta-vlag (`patternRestoreDone`), net als `goalEngineMigrated`, of sla per gerepareerd voorstel een marker op zodat het niet nog eens wordt toegepast.

---

## 12. Schrijfacties zijn niet atomair: een onderbreking laat een lege planning of een dubbel doel achter

**Risico: laag** (geschiedenis blijft intact, planning en doelen niet)

**Reproductie** (vitest)
- `rebuildPlanningFromWeekOne` ("Schone start vanaf week 1") verwijdert eerst de toekomstige sessies in losse transacties en schrijft daarna de nieuwe. Een fout of afgesloten app tussen die stappen: 107 toekomstige sessies voor, 0 na. Logs bleven intact (1 van 1). `resetScheduleToDefault` heeft dezelfde opbouw. In tegenstelling tot `syncTemplateAndScheduleDefinitions` (die de versievlag pas aan het eind zet en zichzelf dus herstelt) is hier geen herstel bij de volgende start.
- `migrateToGoalEngine` onderbroken vóór de vlag `goalEngineMigrated`: bij de volgende start ontstaat een tweede Marathon-doel, omdat `buildMarathonGoal` steeds een nieuw id maakt (2 Marathon-doelen in de test).
- `seedIfEmpty` op een nieuwe installatie in twee tabbladen tegelijk: 224 geplande sessies in plaats van 112 (Playwright test E en vitest). De gedeelde `bootMigrations`-promise beschermt alleen binnen één tabblad.
- `logSession` schrijft de log en de mijlpaal-voortgang in losse transacties; `commitPlanChange`, `undoRecentChange` en de weekplanning schrijven sessies één voor één.

Goed geregeld: de import zelf (`applyBackupWrites`) gebruikt één transactie over alle stores; een fout halverwege laat niets half achter (bevestigd met een record zonder id).

**Bestand / regel**: `src/storage/database.ts:732-817`, `src/storage/database.ts:506-520`, `src/storage/goalMigration.ts:31-58`, `src/state/AppDataContext.tsx:352-381`

**Voorstel**: bundel verwijderen en toevoegen per actie in één `readwrite`-transactie over de betrokken stores (het patroon van `applyBackupWrites`); geef het Marathon-doel een vast id of controleer op een bestaand doel; laat `seedIfEmpty` de `seeded`-vlag in dezelfde transactie als het zaaien controleren en zetten.

---

## 13. "Alles verwijderen" wist minder dan het belooft, inclusief een volledige kopie van de oude geschiedenis

**Risico: laag** (privacy, geen verlies)

**Reproductie** (vitest, "Alles verwijderen keeps personal settings"): na `resetToDemoData` staan nog `homeLocation` (woonplaats met coördinaten), `weightEntries`, `illnessEpisodes`, `goalEngineConfig` en `adviceResponses`. Ook alle `backupSnapshots` blijven staan, met daarin de complete oude geschiedenis inclusief notities ("privé notitie" teruggevonden).

De tekst in de app zegt: "Wist al je geschiedenis, doelen, blessures en instellingen".

**Bestand / regel**: `src/storage/database.ts:674-710`, `src/pages/Settings.tsx:517-540`

**Voorstel**: laat "Alles verwijderen" ook `backupSnapshots` en alle meta-sleutels behalve technische vlaggen wissen, of pas de tekst aan. Bied vlak voor het wissen "Eerst een back-up exporteren" aan.

---

## 14. Export via download meldt altijd "Export geslaagd", ook als er niets is opgeslagen

**Risico: laag**

**Reproductie** (`pw-dl.out`): browser zonder File System Access API (zoals Firefox en iOS Safari), download geblokkeerd. De app toont "Export geslaagd." en zet `lastExportedAt`, waardoor de wekelijkse back-upherinnering een week verdwijnt.

**Bestand / regel**: `src/storage/backupFileAdapter.ts:92-102` (`saveViaDownload` geeft altijd `success: true`), `src/state/AppDataContext.tsx:1427-1433`

**Voorstel**: bij de download-route niet "geslaagd" maar "Back-up gedownload, controleer of het bestand in Downloads staat" tonen. Overweeg op iOS `navigator.share` met het bestand, zodat de gebruiker het bewust in Bestanden of iCloud zet.

---

## 15. Ziekmelding ongedaan maken werkt niet tussen middernacht en 02:00

**Risico: laag**

**Reproductie** (`tz.mjs`, `tz.out`): ziek gemeld op 4 oktober 00:30 Amsterdamse tijd. `startDate` is de lokale datum `2026-10-04`, `recentChange.createdAt` is UTC en begint met `2026-10-03`. Het filter in `undoRecentChange` vergelijkt die twee, dus de ziekteperiode blijft staan terwijl de planningswijziging wel wordt teruggedraaid.

**Bestand / regel**: `src/state/AppDataContext.tsx:394-400`

**Voorstel**: bewaar het id van de aangemaakte ziekteperiode in `recentChange` en verwijder op id, niet op datum.

---

## 16. "Ongedaan maken" van een gelogde training verwijdert de SessionLog definitief

**Risico: laag** (opmerking)

`undoLog` doet een harde delete op `sessionLogs` en de gekoppelde mijlpaal-voortgang. Er zit een bevestigingsstap voor (`SessionActionSheet.tsx:86`), dus het is een bewuste keuze van de gebruiker. Het wijkt wel af van de append-only-regel in CLAUDE.md en is niet terug te draaien.

**Bestand / regel**: `src/state/AppDataContext.tsx:972-981`

**Voorstel**: markeer de log als ingetrokken (`retractedAt`) en filter die in de engine, of bied na het ongedaan maken een korte "Herstellen" aan.

---

## 17. Aanbeveling: automatische back-up ontbreekt

**Risico: middel** (aanbeveling, geen bug)

Wat er is: een herinnering op Vandaag als er 7 dagen geen export of wegklik is geweest (`Today.tsx:79-80`), "NIET NU" stelt een week uit, en op Chromium een vaste back-upmap. Wat ontbreekt:
- Een automatische back-up. Op Chromium kan dat met de al gekozen map (`backupDirectoryHandle`): bij het openen van de app één keer per dag of week stil een bestand wegschrijven als de schrijfrechten nog gelden.
- De datum van de laatste back-up op Meer → Gegevens ("Laatste back-up: 12 dagen geleden").
- Een herinnering die strenger wordt naarmate er meer onbeveiligde trainingen zijn ("14 trainingen sinds je laatste back-up").
- Een snapshot-herstel in de app zelf (zie punt 3).

---

## Wat goed geregeld is

- **Import is één transactie.** `applyBackupWrites` schrijft alle stores in één IndexedDB-transactie; een fout halverwege laat de database onveranderd (bevestigd).
- **Bij samenvoegen worden logs nooit overschreven.** Een SessionLog of mijlpaal-voortgang met hetzelfde id maar andere inhoud wordt als conflict getoond en niet overschreven (`allowReplaceOverwrite: false`).
- **Oude bestanden blijven leesbaar.** Envelop v1, v2 en v3 en de oude platte export (`schemaVersion: 1`) worden genormaliseerd; oude doelen worden met dezelfde transformatie als op het toestel omgezet. Een back-up van een nieuwere versie wordt met een duidelijke Nederlandse melding geweigerd.
- **Een database-upgrade laat oude data staan.** Elke `createObjectStore` in `upgrade` is beschermd met `objectStoreNames.contains`; er worden geen stores verwijderd en oude stores blijven bestaan voor oude back-ups.
- **"Programma opnieuw beginnen" en "Schema opnieuw laden" laten de geschiedenis staan.** `resetScheduleToDefault`, `rebuildPlanningFromWeekOne` en `restartProgramAtWeekOne` raken alleen programma, templates en niet-gelogde toekomstige sessies (bestaande tests en mijn eigen onderbrekingstest: logs bleven intact). Sporten uit- of aanzetten loopt via `commitPlanChange` en schrijft alleen geplande sessies. Voltooid-zijn wordt afgeleid uit het bestaan van een SessionLog, niet uit een vlag.
- **Boot-migraties zijn grotendeels idempotent en beschermd met vlaggen.** `seedIfEmpty`, `migrateToGoalEngine`, `migrateStrengthProgramDefault` en `syncTemplateAndScheduleDefinitions` (die de versie pas aan het eind zet en zichzelf dus herstelt na een onderbreking). Geen van de boot-migraties wijzigt of verwijdert SessionLogs.
- **Service-worker-updates zijn veilig voor de data.** Modus `prompt`: er wordt pas herladen na BIJWERKEN. Getest met een echte productiebuild en twee tabbladen: na de update in tab A bleef het half ingevulde trainingsformulier in tab B gewoon staan en bleef de database ongewijzigd. De service worker cachet alleen app-bestanden, geen gegevens.
- **Er is een herinnering om een back-up te maken** en op Chromium een vaste back-upmap, zodat exporteren één tik is.
- **Opslaan van een import begint pas na bevestiging**, met een voorbeeld per categorie en een standaard samenvoegmodus die de huidige planning en instellingen laat staan.
