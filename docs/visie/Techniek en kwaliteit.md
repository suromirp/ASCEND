# Techniek en kwaliteit van ASCEND

Datum: woensdag 21 oktober 2026. Gemeten op commit 66641e4 ("Je stand: de vier getallen met uitleg"). In de repo is niets veranderd behalve dit rapport. Alle meetscripts staan in `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/visie_techniek/` (measure.mjs, measure_year.mjs, profile.mjs, commits.mjs, update.mjs, mapsize.mjs) met hun uitvoer (run4.txt, run_year.txt, prof.txt, commits.txt).

Hoe gemeten: een productiebuild (dezelfde als op GitHub Pages) op poort 5182, Chromium via Playwright, telefoonformaat 390 x 844, processor 4x vertraagd via CDP (`Emulation.setCPUThrottlingRate`, dezelfde factor die Lighthouse gebruikt voor een middenklasse telefoon, zie https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md). Daarin een echte back-up van de gebruiker, met enkele honderden geplande trainingen, een paar weken aan logs en een gevuld wijzigingslogboek. Een echte iPhone of Android kan anders uitvallen; de verhoudingen zijn betrouwbaarder dan de absolute getallen.

---

## 1. In het kort

1. De app is op een trage telefoon redelijk snel: Vandaag staat er na 0,76 tot 0,95 seconde, een tab wisselen kost 0,1 tot 0,15 seconde. Maar na elke opening draait er nog ongeveer een seconde rekenwerk in de achtergrond met haperingen tot 0,3 seconde, en na elk Akkoord ook.
2. Gevonden fout met echte gevolgen: de weekplanning herschrijft bij elke opening dezelfde 9 trainingen, toont dan "Weekplanning bijgewerkt" en schrijft een regel in het logboek. In een echte back-up bleek het grootste deel van het wijzigingslogboek uit deze herhaalde regels te bestaan, een groot deel van het hele bestand. Dat maakt de app elke week trager en de melding betekenisloos.
3. Gegevens zijn redelijk beschermd (import is één transactie, oude back-ups blijven leesbaar), maar er is geen automatische back-up buiten het toestel en de meeste planwijzigingen worden nog in losse stappen geschreven.
4. Bijwerken: de melding verschijnt binnen een paar tienden van een seconde, maar de oude versie blijft draaien zolang je niet op BIJWERKEN tikt of de app helemaal sluit. Gisteren gingen er 21 versies live, zonder dat er één test of lintcontrole voor nodig was.
5. De grootste hefboom is een kwaliteitspoort vóór elke deploy, met een "naspeeltest" op een geanonimiseerde back-up. Die had de fout van punt 2 meteen gevonden.

---

## 2. Wat er nu is en waar het knelt

### 2.1 Architectuur: één bestand draagt bijna alles

- `src/state/AppDataContext.tsx` is 1.908 regels. Het levert 76 velden en functies aan 48 schermen en componenten, heeft 25 stukken state, 46 `useCallback`s en 37 plekken die met `await refresh()` eindigen. Daarin zitten tegelijk: de opstartvolgorde, de planningsstappen in de achtergrond (`runForecastReplan`, `runStrengthReviewCheck`, `runWeeklyPrescriptionBuild`, regels 656 tot 1079), het opslaan van logs met mijlpalen, geluid en citaten (regels 1162 tot 1257), ongedaan maken, ziekmelden, krachtblokken en het adviesmodel (regels 1747 tot 1769). CLAUDE.md zegt dat domeinlogica in `engine/` hoort; in de praktijk zit hier veel orkestratie die nergens getest wordt (er is geen enkel testbestand voor `state/`).
- Het `value`-object (regel 1771) wordt bij elke render nieuw gemaakt en niet gememoïseerd. Elke statewijziging in de provider laat dus alle 48 afnemers opnieuw renderen, ook als hun gegevens niet veranderden.
- Hetzelfde patroon "lees alles, pas wijzigingen toe, schrijf sessie voor sessie, schrijf auditregel, refresh" staat er vijf keer bijna letterlijk (regels 559, 656, 717, 855, 950). Twaalf lussen schrijven `PlannedSessionsRepo.put` één voor één, elk in een eigen transactie. Wordt de app halverwege afgesloten (iOS doet dat met apps op de achtergrond), dan blijft een half toegepast voorstel achter. Dat stond al als punt 12 in `docs/audit/4 Dataveiligheid.md` en is voor `commitPlanChange`, `applyProposal` en `undoRecentChange` nog zo.
- `src/storage/database.ts` (1.278 regels) mengt opslag (repos, regels 174 tot 460), instellingen, zaaien, resets en de volledige planningssync `syncProgramHorizon` (regels 975 tot 1108). Die sync is planningslogica, geen opslag.
- Verborgen invoer via modulevariabelen. `engine/substitutions.ts` heeft zes registers (`learnedDurations`, `durationAdjustments`, `recentMaxima`, `currentAmbition`, `fixedMinutes`, regels 20 tot 101) en `engine/scheduler.ts` twee (`freshnessContext` regel 154, `hardSameDay` regel 309). Ze worden gezet in `setPlanningRegisters` (AppDataContext regel 127) bij elke refresh. Gevolgen: een engine-functie geeft een ander antwoord afhankelijk van wanneer hij draait; `useMemo`s die duur of minuten tonen kennen die invoer niet als afhankelijkheid; en `planPreviewPass` (regel 1714) rekent met `fixedMinutes` van de opgeslagen planning, niet van de voorgestelde week. Dat laatste heb ik alleen uit de code afgeleid, niet gereproduceerd. Zeven testbestanden zetten deze registers; `src/test/setup.ts` zet ze niet terug.
- Er zijn drie versienummers voor gegevens: `SCHEMA_VERSION = 1` (database.ts regel 30), `CURRENT_SCHEMA_VERSION = 1` (migrations.ts) en `CURRENT_BACKUP_SCHEMA_VERSION = 4` (backupTypes.ts). CLAUDE.md wijst `storage/migrations.ts` aan als plek voor nieuwe migraties, maar de echte omzetting van oude back-ups zit in `backup.ts#normalizeBackupToCurrentModel` (regels 275 tot 320), en wijzigingen in de opgeslagen vorm op het toestel lopen via negen losse opstartstappen met eigen vlaggen in `meta` (`goalEngineMigrated`, `scheduleVersion`, `slotRestoreDone`, `patternRestoreDone` en meer, AppDataContext regels 86 tot 102). Dat werkt, maar er is geen genummerde lijst van migraties en geen test die "een database van versie X komt goed op versie Y" bewijst.

### 2.2 De opstart- en refreshvolgorde

Wat er gebeurt bij openen (AppDataContext regels 1081 tot 1136):

1. Splash van 2,6 seconde alleen bij de eerste opening van de dag (`utils/updateFlag.ts`).
2. Negen opstartmigraties na elkaar, onder een Web Lock.
3. `refresh()`: eerst `syncProgramHorizonWhenChanged`, die de sleutel uitrekent (vijf stores lezen, alle geplande sessies sorteren en hashen), bij een verschil de registers vult (nog eens vijf stores), de sync draait (planPass met weekcontrole), en de sleutel opnieuw uitrekent (weer vijf stores). Daarna leest refresh zestien stores volledig en zet vijftien stukken state.
4. Daarna in de achtergrond drie stappen na elkaar, die elk opnieuw alles lezen en bij een wijziging weer `refresh()` aanroepen.

Gemeten per opening: 72 keer `getAll` op een store, waarvan 11 keer alle geplande sessies en 11 keer de doelen. Twee volledige refreshes. En 58 geschreven records, zonder dat de gebruiker iets deed.

### 2.3 De fout: de weekplanning herschrijft zichzelf bij elke opening

Bij elke opening schrijft `runWeeklyPrescriptionBuild` (AppDataContext regel 717) 39 weekvoorschriften en 9 trainingsvoorschriften opnieuw (met nieuwe id's), past dezelfde 9 geplande sessies aan en zet een nieuwe auditregel "Weekprescriptie bijgewerkt" met 9 wijzigingen van het type `replace`. Twee keer achter elkaar openen: beide keren dezelfde 9 sessie-id's, beide keren een nieuwe regel. Op het scherm verschijnt dan bij elke opening de kaart "AANGEPAST, Weekplanning bijgewerkt, De inhoud van 9 trainingen in de komende weken..." met Ongedaan maken (schermafdruk `visie_techniek/today.png`).

In een echte back-up bleek het grootste deel van de regels in `planChangeProposals` uit zulke automatische regels te bestaan, verspreid over een paar weken. Samen namen ze een groot deel van het back-upbestand in, veel meer dan alle trainingslogs bij elkaar.

Waarom het ertoe doet:
- De melding "Planning bijgewerkt" verliest zijn betekenis, terwijl de gebruiker juist "geen stille wijzigingen" wil. Na een tijdje negeert hij hem, ook als er echt iets verandert.
- Het logboek groeit met ongeveer 2.000 regels per jaar. Ik heb dat gesimuleerd (2.100 extra regels): Vandaag zichtbaar na 1,03 tot 1,32 seconde in plaats van 0,76 tot 0,95; achtergrondhaperingen samen 1,1 tot 1,5 seconde in plaats van 0,8 tot 1,0; een Akkoord duurt 1,45 seconde in plaats van 1,09. Elke refresh leest het hele logboek en het adviesmodel loopt er bij elke render doorheen (`removedByPlanIds`, regel 1764).
- De back-up wordt groter en trager om te importeren.

Waarschijnlijke oorzaak: de bouwer vergelijkt zijn uitkomst niet met wat er al ligt. Een `replace` met een nieuw voorschrift-id telt als wijziging, ook als de inhoud gelijk is. Dat heb ik uit het gedrag afgeleid; de precieze plek in `engine/weeklyPrescriptionEngine.ts` heb ik niet vastgesteld.

### 2.4 Snelheid: metingen

Bundel (`vite build`, 2,2 seconde):
- Hoofdbestand `index-*.js`: 1.063 kB, gezipt 318,6 kB. Daarin react-dom 171 kB, `src/data` 247 kB (trainingGuide 28,5 kB, defaultProgram 22,3 kB, quoteLibrary 21,4 kB, modalities 18,4 kB), `src/components` 246 kB, `src/engine` 211 kB (adviceEngine alleen al 31,6 kB), pagina's 70 kB.
- Lui geladen zijn alleen negen bijschermen (Bronnen 84 kB, Je stand 33 kB, Plekken, Gids, Garmin, Rekken, Blessures). Meer (Settings, 24 kB), Ascend (22 kB), de drie wizards (samen ruim 38 kB) en de importwizard zitten in het hoofdbestand en worden bij elke start geparsed.
- De service worker zet 31 bestanden vooraf in de cache, 1.506 KiB. Omdat react-dom in hetzelfde bestand zit als de eigen code, krijgt het hoofdbestand bij elke deploy een nieuwe naam en wordt die hele megabyte opnieuw gedownload. Bij 21 deploys op één dag is dat 21 keer.

Opstarten (4x vertraagd):
- Eerste keer, lege database: startscherm na 3,4 seconde, waarvan 2,6 seconde de bewuste splash.
- Back-up importeren: 1,0 tot 1,2 seconde, 538 schrijfacties.
- Gewone opening (service worker actief, geen splash), drie metingen: Vandaag zichtbaar na 949, 895 en 756 ms (eerste tekening 720 tot 904 ms). De tweede refresh komt pas na 1,64 tot 1,98 seconde. In die tijd zes à zeven lange taken van samen 0,79 tot 0,97 seconde, de langste 228 tot 285 ms. Wie meteen gaat scrollen of tikken, voelt dat als haperen.
- Profiel van de 8 seconden na openen: AppDataContext 495 ms (inclusief wat het aanroept), React 312 ms, `utils/dates.ts` 215 ms, scheduler 204 ms, adviceEngine 204 ms, weeklyPrescriptionEngine 190 ms.

Eén Akkoord (het advies "Testloop staat op je rustdag"):
- `refresh()` loopt één keer; daarbinnen draait de sync met de volledige weekcontrole. React commit vier keer. 35 keer `getAll`, 6 schrijfacties.
- De melding Ongedaan maken staat er na ongeveer 300 ms; de tik zelf kost 120 ms tot de volgende tekening (onder de grens van 200 ms voor een goede INP, https://web.dev/articles/inp).
- Maar daarna nog 1,1 seconde rekenwerk met vier lange taken, samen 777 ms, de langste 301 ms.
- Profiel: adviceEngine 541 ms, scheduler 487 ms, `dates.ts` 524 ms waarvan 461 ms in één functie, `parseISODate` (regel 15). Die wordt in lussen honderden keren per datum aangeroepen: `freshnessAt` (scheduler.ts regel 164) filtert bij elke kandidaatdag alle geplande sessies met `daysBetween`, en elke `daysBetween` maakt twee `Date`-objecten uit tekst. legFatigue 168 ms, planPass 125 ms.

Tabs wisselen: Week 154 ms, Je stand 147 ms, Logboek 102 ms, Meer 80 ms, Vandaag 93 ms, zonder lange taken. Dat is goed.

Dure berekeningen bij renders:
- `advice` (regel 1747) hangt af van dertien dingen, waaronder `plannedSessions`, `sessionLogs`, `planChangeLog` en het hele `goalEngineConfig`. Elke refresh zet nieuwe arrays, dus het hele adviesmodel draait na elke refresh opnieuw, ook als er niets veranderde.
- `goalOverviews` (regel 1145) leidt bij elke wijziging in de logs alle capaciteitsbewijzen opnieuw af.
- Op Je stand lopen `freshnessCurve`, `legCalendar`, `intensityMix` en meer; netjes gememoïseerd, maar op `inputs` die bij elke refresh nieuw zijn.

### 2.5 Betrouwbaarheid van de gegevens

Wat goed is (en al getest in `docs/audit/4 Dataveiligheid.md`): de import is één transactie over alle stores, er wordt vooraf een snapshot gemaakt, oude back-ups (envelop v1 tot v4 en de oude platte export) worden omgezet, een databaseupgrade verwijdert niets, kapotte records worden bij import weggefilterd, en `navigator.storage.persist()` wordt na de opstart gevraagd (`storage/persistence.ts`).

Wat knelt:
- Alles staat op één plek: de IndexedDB van de GitHub Pages-site. Safari wist scriptopslag van een site die zeven dagen niet in Safari is geopend, maar een app op het beginscherm valt daar niet onder en heeft een eigen teller (https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/). Sinds Safari 17 bestaat `persist()` ook op iOS en geldt een ruimer quotum (https://webkit.org/blog/14403/updates-to-storage-policy/). Chrome geeft persistent opslag meestal stil aan geïnstalleerde apps (https://web.dev/articles/persistent-storage). Toch blijft het risico van "telefoon kwijt, telefoon gewist, app verwijderd, Safari-geschiedenis gewist" bestaan, en daar helpt alleen een kopie buiten de app tegen. Die is nu handmatig.
- `persist()` wordt maar één keer na de opstart gevraagd en het resultaat staat niet zichtbaar in de app op een plek waar de gebruiker het ziet zonder te zoeken. In headless Chromium kwam `persisted: false` terug; op zijn eigen telefoon weet ik het niet.
- Back-up gaat op een telefoon via een download (`storage/backupFileAdapter.ts` regel 96), omdat `showSaveFilePicker` op mobiel niet bestaat. Op iOS belandt dat in Bestanden, niet automatisch in iCloud.
- Planwijzigingen niet atomair (zie 2.1).
- De opslag groeit door het auditlogboek (zie 2.3); na de import was het gebruik 3,2 MB, na een gesimuleerd jaar 4,1 MB. Ruim binnen elk quotum, dus geen opslagdruk, wel traagheid.

### 2.6 Bijwerken van de app

Hoe het nu werkt: `registerType: 'prompt'` (vite.config.ts). Een nieuwe versie wordt op de achtergrond binnengehaald en wacht. `UpdatePrompt` toont dan "Nieuwe versie van ASCEND" met BIJWERKEN. Er wordt gekeken bij terugkeren naar de app (`visibilitychange`) en elk uur.

Mijn proef met twee builds achter elkaar op dezelfde server (`update.mjs`):
- App open, nieuwe versie live, terug naar de app: de melding staat er na 333 ms. Dat werkt.
- Melding laten staan en de pagina herladen: nog steeds de oude versie, melding weer zichtbaar.
- Alle vensters sluiten en opnieuw openen: de nieuwe versie draait, zonder melding.
- Op BIJWERKEN tikken: na ongeveer 3 seconden draait de nieuwe versie.

Wat dat betekent voor gisteren: zolang de gebruiker niet op BIJWERKEN tikt en de app niet echt afsluit (op een telefoon blijft een PWA vaak dagen in het geheugen), draait de oude code. Met 21 deploys op één dag verscheen de balk steeds opnieuw; het ligt voor de hand dat hij er na een paar keer niet meer op lette of dat er een sheet overheen lag. Dat is een vermoeden; ik kan zijn telefoon niet meten.

Twee zwakke plekken in de code:
- `<UpdatePrompt />` wordt pas gerenderd als de opstart klaar is (App.tsx regel 200, na de `loading`- en `bootError`-returns). Tijdens de splash en bij een opslagfout wordt er dus helemaal niet naar een update gezocht. De foutmelding "Herlaad de pagina om de nieuwste versie te krijgen" (AppDataContext regel 229) helpt ook niet: herladen geeft de oude versie uit de cache, zoals de proef laat zien.
- `AppDataProvider` staat buiten de `ErrorBoundary` (App.tsx regel 209). Gooit het adviesmodel (`computeAdvice` in de `useMemo` van de provider) een fout op een bepaalde combinatie van gegevens, dan is het hele scherm leeg, zonder updatebalk en zonder uitleg.

GitHub Pages geeft `cache-control: max-age=600` mee aan `sw.js` en `index.html` (gemeten op `sw.js` van de live site). De browser omzeilt die cache voor de controle van de service worker, maar het CDN van GitHub kan een nieuwe versie tot tien minuten later uitleveren.

### 2.7 Testen en CI

- Er is één workflow, `.github/workflows/deploy.yml`: `npm ci`, `npm run build`, uploaden, live zetten. Er draait geen `npm test` en geen `npm run lint`. Alleen `tsc -b` in de build is een echte poort.
- De laatste 100 runs: 97 geslaagd, 3 afgebroken door een nieuwere push, mediaan 43 seconden van push tot live. Elke push naar `main` staat dus binnen een minuut op de telefoon van de gebruiker. Gisteren 21 keer, op 4 oktober 16 keer. Sinds 5 september 195 commits, rechtstreeks op `main`.
- Lokaal: 801 tests in 91 bestanden, allemaal groen, in 10,2 seconde. `tsc -b` 17,4 seconde. oxlint 1,1 seconde met drie waarschuwingen (fast refresh).
- Dekking: `engine/` heeft 85 testbestanden op 87 bronbestanden (zonder test: onder meer `planPass.ts`, `pain.ts`, `goals.ts`, `streak.ts`, `recoveryCheck.ts`, `changeLog.ts`). `components/` (86 bestanden), `pages/` (14) en `state/` (1, het belangrijkste bestand) hebben nul tests. `vitest.config.ts` draait alleen `*.test.ts` in Node, dus React-code kan niet eens getest worden.
- Geen end-to-end tests in de repo en niet in CI. Wel heel veel losse Playwright-scripts in de scratchpad van eerdere sessies (tientallen). Dat is kennis die verloren gaat.
- Geen visuele regressietests, geen test op een echte (geanonimiseerde) gebruikersdatabase, geen controle dat een tweede opening niets verandert, geen preview-omgeving.

---

## 3. Ideeën, gerangschikt op waarde voor deze gebruiker

### 3.1 Een naspeeltest met zijn eigen (geanonimiseerde) back-up, met een idempotentiecontrole

- Wat: een geanonimiseerde kopie van zijn back-up als vaste testfixture in de repo (notities, woonplaats, gewicht en hartslag vervangen of verschoven). Een vitest op fake-indexeddb die met de klok op een vaste datum de opstart naspeelt: migraties, sync, de drie achtergrondstappen. Daarna precies hetzelfde nog een keer, en dan eisen dat de tweede keer niets schrijft, dat geen enkele `SessionLog` veranderde, dat de weekcontrole geen overtreding meer vindt, en dat de komende twee weken overeenkomen met een vastgelegde momentopname. Daarnaast dezelfde fixture op tien verschillende datums (een maandag, een rustdag, de wissel naar wintertijd op 25 oktober, de week voor de wedstrijd van 20 maart).
- Waarom: de gebruiker heeft precies één echte dataset en die bepaalt of de app goed is. Deze test faalt vandaag al op de fout uit 2.3. Elke planningswijziging die zijn week onverwacht verschuift, wordt zichtbaar als verschil in de momentopname vóór het live gaat.
- Werk: klein tot middel (de boot-functies zijn al los aanroepbaar; het anonimiseren is een scriptje).
- Risico: momentopnames die te vaak "goedgekeurd" worden zonder te kijken. Houd ze klein en leesbaar (één regel per training). Let op: de repo is openbaar (gecontroleerd via de GitHub API). Zelfs geanonimiseerd verraadt een trainingshistorie iets over iemand. Alternatieven: een synthetische fixture die dezelfde vorm heeft (enkele honderden sessies, een vaste rustdag, wedstrijd 20 maart, GR5 1 augustus), of de echte back-up versleuteld als GitHub-secret die alleen in CI wordt uitgepakt.
- Past binnen lokaal, geen backend: ja, het draait alleen in CI.

### 3.2 De achtergrondplanning idempotent maken en het logboek opschonen

- Wat: de weekplanning vergelijkt zijn uitkomst met wat er ligt en schrijft niets (geen voorschriften, geen sessies, geen auditregel, geen melding) als de inhoud gelijk is. Voor de oude regels: een eenmalige opschoonstap die opeenvolgende identieke automatische regels samenvoegt, of ze laten staan en ze niet meer meelezen in refresh en advies.
- Waarom: de melding wordt weer betrouwbaar ("als ASCEND zegt dat het iets veranderde, dan klopt dat"), de app wordt per opening sneller, de back-up halveert.
- Werk: klein tot middel.
- Risico: CLAUDE.md noemt het logboek append-only. Samenvoegen van door het systeem gemaakte dubbele regels raakt geen historie van de gebruiker, maar het is een keuze (zie vragen).
- Past binnen lokaal: ja.

### 3.3 Een kwaliteitspoort vóór elke deploy

- Wat: de workflow krijgt een job `check` vóór `build`: typecheck, lint, alle vitest-tests, de naspeeltest uit 3.1 en een korte Playwright-rooktest (opstarten, back-up importeren, Vandaag zien, één training loggen, één Akkoord, opnieuw openen en controleren dat er geen "Planning bijgewerkt" verschijnt). Deploy alleen als dat groen is. De `concurrency`-groep laat al een oudere run afbreken.
- Waarom: nu zet elke push binnen 43 seconden ongeteste code op zijn telefoon. Alles samen kost dit naar schatting twee tot drie minuten extra per deploy (tests 10 s, tsc 17 s, Playwright installeren en draaien de rest).
- Werk: klein.
- Risico: bijna geen. Een tijdelijke trage test kan een spoedfix ophouden; daarvoor blijft `workflow_dispatch` bestaan.
- Past binnen lokaal: ja, het is alleen GitHub Actions.

### 3.4 Bijwerken dat vanzelf goed gaat, zonder dataverlies

- Wat, in drie delen:
  1. Het registreren van de service worker en het zoeken naar updates gebeurt bij het laden van de pagina, niet pas na de opstart, en ook op het foutscherm. Het foutscherm krijgt een knop die de wachtende versie activeert in plaats van gewoon te herladen.
  2. Een veilig moment om zelf bij te werken: bij een koude start, of als de app langer dan bijvoorbeeld 30 minuten op de achtergrond was, en er geen formulier open staat (geen loggerscherm, geen sheet, geen onverzonden invoer), activeert de app de wachtende versie direct en toont daarna "Bijgewerkt naar de nieuwste versie" (die melding bestaat al, `UpdatedNotice`). De BIJWERKEN-balk blijft voor als de app gewoon open staat.
  3. In Meer, bij Versie, de datum van de versie die draait en "je loopt X versies achter" via een klein `version.json` dat de build meeschrijft en dat altijd vers wordt opgehaald.
- Waarom: alle gegevens staan in IndexedDB en elke schrijfactie wordt afgewacht voordat de app verder gaat, dus herladen op een rustig moment verliest niets; het enige risico is half ingevulde invoer, en die sluit je uit met de voorwaarde "geen formulier open". De gebruiker wil weinig handwerk; een update is geen planwijziging, dus dit botst niet met "alles via een voorstel". Achtergrond over de levenscyclus: https://web.dev/articles/service-worker-lifecycle en https://vite-pwa-org.netlify.app/guide/prompt-for-update.
- Daarbij: minder vaak uitrollen. Ontwikkelen op een branch en één keer per dag (of bij een bewuste release) naar `main`. Dan is "nieuwe versie" weer nieuws.
- Werk: middel.
- Risico: een update tijdens een databaseupgrade terwijl een tweede venster open is. Dat is al afgevangen met `blocking`/`blocked` in database.ts (regels 148 tot 158). Testen met de twee-buildsproef uit deze meting, die kan zo in CI.
- Past binnen lokaal: ja.

### 3.5 Diagnosepakket en een eigen foutlog op het toestel

- Wat: een lokale foutlog (ringbuffer van de laatste 200 meldingen uit `window.onerror`, `unhandledrejection`, `console.error` en de ErrorBoundary, met versie en tijd). Plus in Meer een knop "Diagnose delen" die één bestand maakt met: versie en bouwtijd, browser, `storage.estimate()` en `persisted()`, aantallen per store, de foutlog, de laatste 20 planwijzigingen, de duur van de laatste opstart en de waarden van de planningsregisters. Optioneel met de geanonimiseerde back-up erbij.
- Waarom: nu zijn fouten op zijn telefoon onzichtbaar (er zijn elf `console.error`s die niemand ziet). Met één tik kan hij een bestand doorsturen en kan een ontwikkelaar of agent het exact naspelen met de aanpak van 3.1.
- Werk: klein tot middel. De foutlog kan in `localStorage` om geen databaseversie op te hogen.
- Risico: gevoelige gegevens in het pakket. Standaard zonder notities en locatie.
- Past binnen lokaal: ja, er gaat niets automatisch het toestel af.

### 3.6 Back-up buiten het toestel met één tik, en zichtbaar hoe veilig je gegevens zijn

- Wat: een wekelijkse herinnering die meetelt ("6 trainingen sinds je laatste back-up") en direct het deelscherm opent met het back-upbestand (`navigator.share({ files })`, https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), zodat hij het in één tik in iCloud Drive, Google Drive of naar zichzelf stuurt. Bovenaan Meer een regel "Gegevens beschermd op dit toestel: ja/nee, laatste back-up: 3 dagen geleden". En `persist()` ook vragen na de eerste gelogde training, niet alleen na de opstart.
- Waarom: dit is de enige bescherming tegen een kwijtgeraakte of gewiste telefoon zonder backend. Een deelscherm is één tik, past bij "weinig handwerk".
- Werk: klein tot middel. Deels genoemd in punt 17 van de dataveiligheidsaudit; daar ging het vooral om de vaste map op Chromium, die op een telefoon niet bestaat.
- Risico: bestandsdelen werkt niet in elke browser; dan blijft de download.
- Past binnen lokaal: ja, de gebruiker kiest zelf waar het bestand heen gaat.

### 3.7 Atomaire planwijzigingen

- Wat: één functie `applyPlanChange(writes)` in `storage/` die verwijderen, toevoegen, de auditregel en eventuele instellingen in één IndexedDB-transactie schrijft (het patroon van `applyBackupWrites`). Alle vijf gekopieerde blokken en de twaalf put-lussen gaan daardoorheen.
- Waarom: een Akkoord is dan echt alles of niets, ook als iOS de app midden in het schrijven stopt. Bijkomend voordeel: één transactie is sneller dan negen losse.
- Werk: middel.
- Risico: laag; de logica blijft gelijk, alleen het schrijven wordt gebundeld.
- Past binnen lokaal: ja.

### 3.8 AppDataContext opknippen en de registers expliciet maken

- Wat, stap voor stap:
  1. `value` memoïseren en de context splitsen in "gegevens" en "acties", zodat een component dat alleen een actie gebruikt niet bij elke refresh opnieuw rendert.
  2. De achtergrondstappen en `logSession` verhuizen naar een `state/planningJobs.ts` en `state/logging.ts` zonder React, testbaar met fake-indexeddb.
  3. De acht modulevariabelen vervangen door één `PlanningContext`-object dat expliciet wordt meegegeven aan de engine-functies (of als één afgeleide waarde uit de state, met `useMemo` erop). Dan zit de invoer in de afhankelijkheden en rekent de voorvertoning gegarandeerd met dezelfde invoer als het echte resultaat.
  4. `syncProgramHorizon` van `storage/` naar een `engine/`-functie die een plan in en een lijst schrijfacties uit geeft; `storage/` voert alleen uit.
- Waarom: nieuwe functies bouwen wordt sneller en veiliger als niet alles in één bestand van 1.900 regels zit en als engine-functies geen verborgen invoer hebben. Dit is ook wat CLAUDE.md al vraagt.
- Werk: groot, maar in losse, kleine pull requests te doen, elk afgedekt door de naspeeltest uit 3.1.
- Risico: middel; precies daarom eerst 3.1 en 3.3.
- Past binnen lokaal: ja.

### 3.9 Sneller op de telefoon

- Wat:
  1. In `freshnessAt` en `findHeavyConflicts` de datums één keer omrekenen naar een dagnummer (een getal) en per datum een index bijhouden, in plaats van bij elke kandidaatdag alle geplande sessies te filteren met `daysBetween` op tekst. Dat haalt het grootste deel van de 461 ms in `parseISODate` weg.
  2. Het adviesmodel alleen opnieuw laten rekenen als de invoer echt verandert (een goedkope fingerprint zoals `planFingerprint` al doet), niet bij elke nieuwe array uit refresh.
  3. React en react-dom in een eigen bestand (`manualChunks`/`codeSplitting`), zodat ze over deploys heen in de cache blijven; Meer, Ascend, de wizards, de importwizard en de grote databestanden (trainingGuide, quoteLibrary) lui laden. Schatting: het hoofdbestand van 1.063 kB naar ruwweg 600 kB, en per deploy nog maar een paar honderd kB opnieuw downloaden.
  4. Op langere termijn: de achtergrondplanning in een Web Worker, zodat het scherm nooit hapert terwijl er gerekend wordt. Dat werkt omdat de engine puur is; de worker kan zelf IndexedDB openen.
- Waarom: de eerste seconde na openen is precies het moment waarop hij wil zien wat zijn missie is en wil tikken. Haperingen van 0,3 seconde vallen dan op.
- Werk: punt 1 en 2 klein, punt 3 klein tot middel, punt 4 groot.
- Risico: laag voor 1 tot 3 (gedekt door de bestaande 801 tests); de worker vraagt zorg bij gelijktijdige schrijfacties met het hoofdvenster (de bestaande Web Lock kan dat afschermen).
- Past binnen lokaal: ja.

### 3.10 Property-based tests en fuzzing van planner en weekcontrole

- Wat: met fast-check (https://fast-check.dev/) willekeurige maar geldige weken genereren (rustdag, sporten aan en uit, tests, wedstrijden, verplaatste en vergrendelde sessies, ziekte) en eigenschappen eisen die altijd moeten gelden: de weekcontrole raakt nooit een sessie met een log of een vergrendeling van de gebruiker; na `planPass` is nooit een overtreding over die de pass zelf kon oplossen; `planPass` twee keer achter elkaar geeft hetzelfde resultaat; geen twee zware beendagen binnen 48 uur tenzij de gebruiker het zelf zo zette; niets op of na de doeldag; de voorvertoning van een voorstel is gelijk aan het resultaat na Akkoord. Fast-check verkleint een gevonden fout automatisch tot de kleinste week die hem laat zien.
- Waarom: de bugjacht van 3 oktober vond vier hoge fouten in juist deze hoek (48-uursregel, cascades). Met de hand bedachte testgevallen missen combinaties; een generator vindt ze.
- Werk: middel.
- Risico: tests die soms falen door een willekeurig zaadje; vastleggen met een vaste seed in CI en een nachtelijke run met meer gevallen.
- Past binnen lokaal: ja.

### 3.11 Visuele regressietests

- Wat: Playwright met vaste klok (https://playwright.dev/docs/clock) en de fixture uit 3.1 maakt schermafdrukken van Vandaag, Week, Je stand, Logboek en Meer op 390 x 844 en vergelijkt ze met een goedgekeurde set. Een verschil boven een kleine drempel blokkeert de deploy tot iemand het goedkeurt.
- Waarom: de gebruiker reageert sterk op hoe iets eruitziet ("niet mooi"), en ontwerpregels (geen RPG-look, tokens) worden zo bewaakt.
- Werk: middel.
- Risico: lettertype- en animatieverschillen maken zulke tests wankel; animaties uitzetten via `prefers-reduced-motion`, wat de app al respecteert.
- Past binnen lokaal: ja.

### 3.12 Een betakanaal op GitHub Pages

- Wat: dezelfde workflow bouwt twee keer: `main` naar `/ASCEND/` en een `beta`-branch naar `/ASCEND/beta/` in hetzelfde Pages-artefact. De gebruiker installeert de beta als tweede app als hij nieuwe dingen eerst wil proberen.
- Twee valkuilen die ik uit de code haal: beide paden delen dezelfde origin (het `github.io`-adres van het account) en dus dezelfde IndexedDB `ascend-db`. Een beta met een hogere `DB_VERSION` zou de database van de gewone app ophogen en die met een `VersionError` laten vastlopen. De beta moet dus een eigen databasenaam krijgen (bijvoorbeeld `ascend-db-beta`) en start met een import van een back-up. En de service worker van `/ASCEND/` heeft als scope ook `/ASCEND/beta/`; zonder `navigateFallbackDenylist` voor `/beta/` serveert de gewone app zijn eigen `index.html` op het betapad.
- Waarom: nieuwe planningslogica eerst een paar dagen laten meedraaien zonder risico voor zijn echte planning.
- Werk: middel.
- Risico: middel (de twee valkuilen hierboven); en twee apps met verschillende gegevens kunnen verwarren.
- Past binnen lokaal: ja.
- Eenvoudiger alternatief: een preview per pull request kan GitHub Pages niet (één site per repo); een "staged rollout" kan wel lokaal, zie 3.13.

### 3.13 Feature flags op het toestel

- Wat: een klein `utils/flags.ts` met vlaggen in de instellingen en een verborgen scherm "Experimenteel" (bijvoorbeeld zeven keer op het versienummer tikken). Nieuwe planningsregels komen uit achter een vlag, eerst uit, en gaan aan als de naspeeltest en een paar dagen gebruik goed zijn. Een vlag kan ook "schaduwmodus" zijn: de nieuwe logica rekent mee, schrijft niets, en legt in de diagnose vast waar hij anders zou kiezen.
- Waarom: dit is de lokale vorm van een gefaseerde uitrol, zonder server. En een slechte wijziging is met één schakelaar terug te draaien zonder nieuwe deploy.
- Werk: klein.
- Risico: vlaggen die blijven hangen; elke vlag een einddatum geven.
- Past binnen lokaal: ja.

---

## 4. Voorstel voor de eerste drie stappen

1. **De poort en de naspeeltest (3.3 en 3.1).** Een `check`-job vóór de deploy met `tsc -b`, `npm run lint`, `npm test` en een nieuwe naspeeltest op een geanonimiseerde versie van een echte back-up, met als eerste eis: twee keer opstarten, de tweede keer nul schrijfacties en geen "Planning bijgewerkt". Die test faalt vandaag, en dat is de bedoeling: hij bewijst de fout uit 2.3. Ongeveer een halve tot een hele dag werk.
2. **De herschrijffout repareren (3.2).** De weekplanning vergelijkt met wat er ligt; geen schrijfacties, geen melding en geen auditregel als er inhoudelijk niets verandert. Daarna wordt de test uit stap 1 groen, en houdt hij de fout voorgoed buiten. Opschonen van de oude regels pas na zijn keuze (vraag 3 hieronder).
3. **Bijwerken betrouwbaar maken (3.4).** De update-registratie los van de opstart, automatisch bijwerken bij een koude start of na 30 minuten achtergrond als er geen formulier open is, en in Meer "je loopt X versies achter". Tegelijk afspreken dat er niet meer twintig keer per dag naar `main` gaat.

Daarna in deze volgorde: diagnosepakket en foutlog (3.5), atomaire planwijzigingen (3.7), de twee snelle snelheidswinsten (3.9 punt 1 en 2), en dan stap voor stap het opknippen van AppDataContext (3.8), steeds onder de naspeeltest.

---

## 5. Wat de gebruiker zelf moet beslissen

1. Gebruik je ASCEND op een iPhone of op een Android-telefoon, en staat hij op je beginscherm? Dat bepaalt hoe de opslag beschermd is en hoe bijwerken zich gedraagt.
2. Mag ASCEND zichzelf bijwerken op een rustig moment (bij openen, of na een half uur op de achtergrond, nooit terwijl je iets invult), met daarna een korte melding "Bijgewerkt"? Of wil je altijd zelf op BIJWERKEN tikken?
3. In je gegevens staan veel automatische regels "Weekprescriptie bijgewerkt" die steeds hetzelfde zeggen. Mogen die worden samengevoegd tot één regel per echte wijziging, of wil je het logboek letterlijk laten zoals het is (dan lezen we ze alleen niet meer mee)?
4. Vind je het goed dat er minder vaak een nieuwe versie komt, bijvoorbeeld één keer per dag in de avond, in ruil voor een strengere controle vooraf?
5. Wil je een wekelijkse herinnering die je back-up met één tik naar iCloud of Google Drive stuurt? Zo ja, naar welke plek?
6. Je repo is openbaar. Mag een geanonimiseerde kopie van je back-up (zonder notities, woonplaats en lichaamsgegevens, datums verschoven) daar als testdata in staan, of liever een nagemaakte dataset met dezelfde vorm, of je echte back-up versleuteld als geheim dat alleen de testserver kan lezen?
7. Heb je behoefte aan een aparte beta-app om nieuwe dingen eerst te proberen, met een eigen kopie van je gegevens? Of liever schakelaars in de gewone app?
