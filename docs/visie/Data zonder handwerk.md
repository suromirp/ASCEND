# Data zonder handwerk

Onderzoek naar hoe trainingsdata van je Garmin en uit MacroFactor in ASCEND kan komen zonder overtypen, binnen de regel "lokaal, geen backend, geen account". Stand van 21 oktober 2026.

## 1. In het kort

- De snelste winst zonder eigen server is **intervals.icu als tussenstation**: Garmin stuurt elke activiteit daar automatisch heen, en ASCEND haalt hem bij het openen op met jouw eigen API-sleutel. Ik heb getest dat intervals.icu browserverzoeken van een andere website toestaat (CORS). Duur, afstand, D+, D−, hartslag, cadans en zelfs RPE en gevoel van je horloge komen dan vanzelf mee.
- Garmin heeft **vandaag** (21 oktober 2026) een gratis **Personal API** gelanceerd voor je eigen data. Dat is de beste bron, maar een webapp kan er nu niet rechtstreeks bij: ik testte de server en die weigert browserverzoeken van elke andere website. Daarvoor heb je een kleine Android-schil of een iPhone-opdracht nodig.
- **MacroFactor heeft geen API**, wel een export. Het Workout Log komt als CSV met datum, duur, oefening, gewicht, herhalingen en RIR. Eén keer per week dat bestand aan ASCEND geven kan alle krachttrainingen met echte duur en RIR vastleggen.
- Health Connect en Apple Health zijn voor een webapp onbereikbaar. Ook dan is een native schil nodig, en die levert minder dan intervals.icu (geen daling, geen RPE).
- Waarschijnlijk heb je Android (in Nederland ongeveer 2 op de 3 telefoons), maar dat kan ik nergens uit afleiden. Alles hieronder werkt op beide; delen naar ASCEND ("Delen met ASCEND") werkt alleen op Android.

## 2. Wat er nu is en waar het knelt

**Alles is handwerk.** In een echte back-up hebben alle trainingen `source: 'manual'`. Bij een duurloop typ je vijf tot zeven getallen over die je horloge al heeft: duur, afstand, D+, gemiddelde hartslag, soms cadans, en bij de heuvelintervallen ook herhalingen en seconden per herhaling (velden in `src/components/ExerciseLogger.tsx` regels 414 tot 513 en `src/components/WorkoutDetailsFields.tsx`).

**Wat overtypen kost, zie je terug in de data.**
- Daling (D−) staat bijna nergens in de duur- en wandellogs, terwijl de beenvermoeidheid en de GR5-voorbereiding juist op dalen letten. Je horloge meet D− altijd.
- RPE staat in een minderheid van de logs, en in geen enkele krachttraining. RIR (herhalingen over) staat in geen enkele. Dan moet de beenvermoeidheid-index RPE 8 aannemen (`src/components/StrengthDoneElsewhere.tsx` regel 21, en `docs/onderzoek/Betrouwbaarheid beenvermoeidheid-index.md`).
- De duur van een krachttraining is een schatting die je zelf "uit MacroFactor" overneemt (`StrengthDoneElsewhere.tsx` regel 31).
- Je gewicht typ je elke twee weken over uit MacroFactor (`src/components/WeightCard.tsx` regels 33 en 34).

**De koppelingen bestaan alleen op papier.** Onder Meer staan Garmin, Health Connect en MacroFactor op "Binnenkort" (`src/pages/Settings.tsx` regels 356 tot 358). De adapter-interface is er wel en is goed opgezet: `fetchActivities` levert gewone `SessionLog`s met een `source` (`src/integrations/types.ts` regel 27), en `MetricSource` kent al `'garmin'`, `'health-connect'`, `'macrofactor'` en `'import'`. Er hoeft dus niets aan de schermen of de engine te veranderen om data van buiten binnen te laten komen; alleen de adapters en een import-stap ontbreken.

**Kleine dingen die meespelen.**
- `SessionLog` heeft geen veld voor de id van de bron (bijvoorbeeld de Garmin-activiteit). Zonder zo'n veld kan een import niet zien dat een loop al binnen is, en krijg je dubbele logs. Een optioneel veld erbij is een wijziging van een opgeslagen vorm, dus volgens `CLAUDE.md` met een migratiestap in `storage/migrations.ts`.
- `RecoveryMetric` heeft een veld `bodyBattery`, een Garmin-merknaam (`src/models/metrics.ts` regel 18). Dat is al eerder opgemerkt in `docs/onderzoek/Andere manieren om belasting te plannen.md`.
- De back-up naar een map werkt via de File System Access API (`src/storage/backupFileAdapter.ts`). Dat klopt ook op Android: Chrome voor Android ondersteunt `showDirectoryPicker` sinds versie 132 ([MDN browser-compat-data 8.1.6](https://github.com/mdn/browser-compat-data)). Op iPhone bestaat die API niet en valt het terug op een download.

**Eerder werk.** De audit (`docs/audit/2 Verbeteringen.md`, ontbrekende functies A en C) stelde al een FIT/GPX-import en een MacroFactor-import voor. Dit rapport gaat daarop door en voegt toe wat sindsdien kan, vooral intervals.icu en de Garmin Personal API van vandaag.

**Android of iPhone?** Uit de code, de back-up en de git-geschiedenis valt het niet af te leiden: er wordt geen apparaatinformatie opgeslagen, en de iOS-opmerkingen in de audits zijn algemene voorzorg. In Nederland had Android in september 2026 68% van de mobiele markt en iOS 32% ([StatCounter](https://gs.statcounter.com/os-market-share/mobile/netherlands)). Android is dus waarschijnlijker, maar ik behandel beide.

## 3. Ideeën, gerangschikt op waarde voor jou

Bij elk idee: wat het is, waarom, hoeveel handwerk het weghaalt, hoe betrouwbaar en privé het is, of het past binnen "lokaal, geen backend", en hoe groot het werk is.

### Idee 0. Zet "Zelfevaluatie" aan op je horloge (geen code)

**Wat.** Op de meeste Garmin-horloges kun je per activiteit instellen dat het horloge na het opslaan vraagt hoe zwaar het was (RPE) en hoe je je voelde. Het pad is meestal: activiteit kiezen, Instellingen, Zelfevaluatie, Altijd ([Garmin-handleiding](https://www8.garmin.com/manuals/webhelp/GUID-2CF5620C-E585-4E0A-9CC3-9565533EEE4D/EN-US/GUID-0CAB64D5-DB13-470D-B60C-0AB03A2B75AB.html)).

**Waarom.** Die twee antwoorden komen in het FIT-bestand terecht, in het sessiebericht als `workoutRpe` (RPE maal 10) en `workoutFeel` (0 tot 100). Dat heb ik nagekeken in de officiële FIT SDK van Garmin (`@garmin/fitsdk` 21.218) en met een proefbestand heen en terug gelezen. Diensten die het FIT-bestand krijgen, zoals intervals.icu, nemen ze over, maar alleen als je ze **op het horloge** invult; achteraf in de Garmin Connect-app invullen komt niet mee ([intervals.icu-forum](https://forum.intervals.icu/t/perceived-effort-metric-not-syncing-from-garmin/114809)).

**Handwerk.** Twee tikken op je pols direct na de training, in plaats van later in ASCEND. **Werk:** geen. **Past:** ja. Dit is de voorwaarde voor RPE zonder ASCEND te openen bij idee 1, 2 en 3.

### Idee 1. Garmin via intervals.icu, opgehaald bij het openen van ASCEND

**Wat.** Je maakt een gratis account bij intervals.icu en koppelt daar één keer je Garmin. Vanaf dan staat elke activiteit binnen een paar minuten na het synchroniseren op intervals.icu. In ASCEND plak je één keer je persoonlijke API-sleutel (intervals.icu, Instellingen, Developer). Bij elke keer openen haalt ASCEND de activiteiten van de laatste dagen op en toont op Vandaag een kaart:

"Van je horloge: zondag, 8 km in 70 min, D+ 30 m, D− 30 m, RPE 3. Hoort bij Lange duurloop. OPSLAAN"

Eén tik, en de log is er, met `source: 'garmin'` en het id van de activiteit zodat hij nooit dubbel binnenkomt. Wat ASCEND zelf vraagt (pijn, benen bij de warming-up) blijft optioneel op dezelfde kaart.

**Waarom dit het meeste oplevert.**
- Het werkt **zonder eigen server en op Android en iPhone**. Ik heb de API van intervals.icu getest met een verzoek vanaf een andere website: het antwoord staat het toe (`access-control-allow-origin` met jouw domein, `authorization` als toegestane header). De sleutel gaat als gewone Basic-authenticatie mee, gebruikersnaam `API_KEY` ([intervals.icu-forum, API-gids](https://forum.intervals.icu/t/api-access-to-intervals-icu/609)).
- De activiteit heeft precies wat ASCEND nodig heeft. In de officiële OpenAPI-beschrijving van intervals.icu (`/api/v1/docs`) staan onder meer `start_date_local`, `type`, `moving_time`, `distance`, `total_elevation_gain`, **`total_elevation_loss`**, `average_heartrate`, `max_heartrate`, `average_cadence`, `icu_hr_zone_times` (tijd per hartslagzone), **`icu_rpe`** en **`feel`**. Een loopband-activiteit heeft een eigen type, zodat ASCEND D+ daar als schatting kan markeren.
- Er is ook een wellness-endpoint met onder meer `restingHR`, `hrv`, `sleepScore`, `weight` en `floorsClimbed`. Daarmee kan ASCEND later rusthartslag en HRV ophalen voor de ochtendsignalen uit `docs/onderzoek/Andere manieren om belasting te plannen.md` (aanbeveling 2), en misschien het aantal trappen dat je per dag loopt. Of Garmin al die wellness-velden aan intervals.icu doorgeeft, heb ik niet kunnen controleren; er is een community-project dat juist ontbrekende wellness-data aanvult ([garmin-intervals-bridge](https://github.com/patriklindegardh-ops/garmin-intervals-bridge)).
- De limiet is ruim: 5.000 verzoeken per dag met een API-sleutel (forum, zelfde bron).

**Handwerk weg.** Bij duurlopen, heuvels en wandelingen bijna alles: van vijf tot zeven getallen naar één tik. Met idee 0 erbij ook de RPE.

**Betrouwbaarheid.** Goed, maar met twee afhankelijkheden: Garmin moet aan intervals.icu blijven leveren (intervals.icu is een goedgekeurde Garmin-partner), en intervals.icu moet browserverzoeken blijven toestaan. Garmin haalt sinds kort enkele eigen velden uit bestanden die naar derden gaan, zoals VO2max en hersteltijd ([Gadgets & Wearables](https://gadgetsandwearables.com/2026/10/21/garmin-connect-personal-api-health-data-access/)); die gebruikt ASCEND niet. Als de verbinding wegvalt, werkt ASCEND gewoon met handmatig loggen zoals nu.

**Privacy.** Je Garmin-data komt bij een extra partij te staan (intervals.icu is een klein bedrijf). De API-sleutel moet alleen in IndexedDB op je telefoon staan en **niet** in de JSON-export, anders staat hij in elke back-up. ASCEND stuurt zelf niets naar intervals.icu, het leest alleen.

**Past binnen "lokaal, geen backend".** Ja, met een kanttekening. ASCEND krijgt geen eigen server, geen account en geen externe opslag; alles blijft op je telefoon. Wel leest de app van een dienst van derden met jouw sleutel. `CLAUDE.md` verbiedt een eigen backend, account of externe datastore, niet het lezen van een dienst die je zelf kiest. Dat is een keuze die jij moet maken (zie vragen).

**Werk.** Middel. Een adapter `src/integrations/intervalsIcu.ts` die `fetchActivities` en later `fetchRecoveryMetrics` invult, een pure koppelfunctie in `engine/` (zie stappen), een instellingenscherm voor de sleutel, en een kaart op Vandaag. Geen nieuwe bibliotheek nodig: het is JSON.

**Risico.** De schaal van `feel` bij intervals.icu loopt van 1 tot 5 en volgens het forum leek de richting eerst omgekeerd; dat moet met jouw eigen data gecontroleerd worden voordat het `subjectiveFeel` vult.

### Idee 2. MacroFactor Workout Log als CSV, één keer per week

**Wat.** MacroFactor heeft geen openbare API (niets gevonden, ook niet in de helpcentra). Wel een export: Meer, Data Export, Granular Export, Workout Log, periode kiezen, Export Workout Log ([workout-data-sync README](https://github.com/matanabudy/workout-data-sync); [MacroFactor helpcentrum, Export Your Data](https://help.macrofactorapp.com/en/articles/356-export-your-data)). Volgens een voorbeeldbestand in dat open-sourceproject heeft de CSV de kolommen `Date`, `Workout Duration` (seconden), `Workout`, `Exercise`, `Set Type`, `Weight (kg)`, `Reps` en `RIR`. Dat voorbeeld komt van een derde partij; jouw eigen export moet het bevestigen.

ASCEND leest dat bestand en toont: "4 krachttrainingen gevonden. Upper A, maandag, 50 min. Lower A, woensdag, 60 min, zwaarste beenset 1 herhaling over. KOPPELEN". Per training wordt de geplande sessie van die dag gezocht via de naam (een vaste vertaling van "Lower A" naar `tpl_lower_a`, die je één keer bevestigt) en de datum.

**Waarom.**
- De echte duur vervangt de schatting.
- De laagste RIR in de beensets vult `strengthRir` vanzelf, zodat de beenvermoeidheid-index niet meer op een aanname draait. Dat is nu het grootste gat: geen enkele krachttraining heeft RPE of RIR.
- Sets, gewichten en herhalingen komen in `strengthData`, zodat het Logboek ook kracht laat zien zonder dat je iets dubbel bijhoudt.
- Eén sessie-RPE voor de hele training levert MacroFactor niet. Die blijft één tik op dezelfde kaart, of ASCEND kan hem voorstellen uit de RIR (dat is een benadering, geen meting; zie Zourdos e.a. 2016 zoals al aangehaald in `StrengthDoneElsewhere.tsx`).

**Hoe het bestand binnenkomt.** Op Android kan ASCEND zich aanmelden als deeldoel: in MacroFactor deel je de export en kies je ASCEND (Web Share Target, zie idee 4). Op iPhone sla je het op in Bestanden en kies je het in ASCEND. Of MacroFactor de export via het deelmenu aanbiedt of per mail stuurt, moet je zelf even kijken; bronnen spreken elkaar daarin tegen.

**Gewicht.** De Quick Export bevat volgens een derde partij ook trendgewicht, maar als xlsx-bestand. Een xlsx-lezer is een flinke extra bibliotheek. Je gewicht één keer per twee weken intypen kost nu ongeveer tien seconden; dat laat ik liever zo, tenzij jouw Granular Export ook een CSV met gewicht geeft. MacroFactor kan gewicht ook naar Health Connect of Apple Health schrijven ([MacroFactor helpcentrum](https://help.macrofactorapp.com/en/articles/65-connect-health-connect-apple-health-or-fitbit)), maar daar kan een webapp niet bij.

**Handwerk weg.** Bij kracht: de duur, de RIR en het afvinken per training, voor een hele week in één keer. **Betrouwbaarheid:** goed zolang MacroFactor de kolomnamen niet verandert; de lezer moet op kolomnaam werken, niet op positie, en een onbekend bestand netjes weigeren. **Privacy:** uitstekend, het bestand gaat nergens heen. **Past:** volledig. **Werk:** klein tot middel (CSV-lezer zonder bibliotheek, naamkoppeling, voorstelkaart). **Risico:** een week te laat koppelen betekent dat de beenvermoeidheid een paar dagen op de oude aanname draait; daarom blijft de huidige knop "GEDAAN IN MACROFACTOR" gewoon bestaan voor dezelfde dag.

### Idee 3. Garmin Personal API (nieuw, vandaag gelanceerd)

**Wat.** Garmin heeft zijn ontwikkelaarsprogramma vandaag heropend met een gratis laag **Personal**: één persoon haalt zijn eigen activiteiten (JSON en het originele FIT-bestand) en gezondheidsdata op, alleen ophalen, met een sleutel die je in een paar seconden maakt via Garmin Connect, Instellingen, Personal API Token ([Garmin Developers](https://developer.garmin.com/gc-developer-program/overview); [DC Rainmaker](https://www.dcrainmaker.com/2026/10/garmin-connect-api-revamps-connect-developer.html)). Garmin publiceerde er ook een officiële Python-client bij ([garmin-connect-personal-api-python op PyPI](https://pypi.org/project/garmin-connect-personal-api-python/)). Daaruit blijkt: de server is `personal.connectapi.garmin.com`, de sleutel wordt met `Authorization: ApiKey ...` omgeruild voor een tijdelijk token, en er zijn endpoints voor de activiteitenlijst, één activiteit, het originele bestand (`/download-service/files/activity/{id}`), dagelijkse samenvattingen, rusthartslag, HRV, slaap en gewicht.

**Waarom interessant.** Het is de bron zelf, zonder tussenpartij, en gratis. Het originele bestand bevat ook RPE en gevoel van het horloge.

**Waarom niet als eerste.** Ik heb de server getest met browserverzoeken vanaf een andere website. Het voorafgaande CORS-verzoek wordt voor elke herkomst die ik probeerde geweigerd (403), zelfs voor `connect.garmin.com`. Een PWA op GitHub Pages kan deze API dus **nu niet rechtstreeks** gebruiken. Wat wel kan:
- **Android:** een kleine native schil (idee 5) doet de verzoeken buiten de browser, en daar geldt CORS niet.
- **iPhone:** een Opdracht (Shortcuts) met "Haal inhoud van URL op" kan de API aanroepen (ook daar geen CORS) en het resultaat naar het klembord kopiëren. Daarna open je ASCEND en tik je "Plak van horloge". Een link openen vanuit de Opdracht werkt niet: op iPhone opent een link Safari en niet de app op je beginscherm, en die twee hebben elk hun eigen opslag ([firt.dev, iOS PWA-compatibiliteit](https://firt.dev/notes/pwa-ios/); [WebKit bug 181849](https://bugs.webkit.org/show_bug.cgi?id=181849)).

**Handwerk weg.** Evenveel als idee 1, zodra de technische weg er is. **Betrouwbaarheid:** onbekend; dit is één dag oud. Tokenduur, limieten en voorwaarden voor de Personal-laag zijn nog niet gepubliceerd. **Privacy:** beter dan idee 1, geen extra partij. **Past:** ja voor de Opdracht-route; de Android-schil is een tweede app naast de PWA. **Werk:** klein voor de plakroute in ASCEND (dezelfde koppelfunctie als idee 1), groot voor de Android-schil. **Advies:** bouw idee 1 zo dat de bron achter de adapter verwisselbaar is, en kijk over een paar maanden of Garmin browserverzoeken toestaat. Dan wordt dit idee 1.

### Idee 4. "Delen met ASCEND" en een FIT-lezer in de browser (vangnet zonder derden)

**Wat.** ASCEND meldt zich in het manifest aan als deeldoel voor `.fit`, `.zip`, `.gpx` en `.csv`. Je deelt een bestand vanuit de Bestanden-app, Downloads of MacroFactor, kiest ASCEND, en dezelfde voorstelkaart verschijnt. Op iPhone kies je het bestand via een knop.

**Waarom.** Het werkt zonder intervals.icu en zonder Garmin-API, dus ook als een dienst wegvalt. Het is ook de lezer die je later nodig hebt voor het originele bestand uit idee 3.

**Wat er technisch klopt.**
- Web Share Target met bestanden werkt in Chrome voor Android sinds versie 76 en in Samsung Internet; **niet** in Safari op iPhone en niet in Firefox ([MDN, share_target](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target); browser-compat-data). Bestanden komen binnen als POST met `multipart/form-data`, en die moet de service worker afvangen. ASCEND gebruikt nu `generateSW` van vite-plugin-pwa (`vite.config.ts`); daarvoor is een klein eigen stuk service worker nodig (via `importScripts` of overstappen op `injectManifest`).
- De File Handling API (bestanden openen met de app) werkt alleen op desktop, niet op Android of iPhone (browser-compat-data). Niet bruikbaar.
- FIT lezen in de browser kan met de officiële `@garmin/fitsdk`. Gebundeld en geminificeerd is de decoder 429 KB, gecomprimeerd 63 KB; `fit-file-parser` (MIT) is 296 KB en ook 62 KB gecomprimeerd (mijn eigen meting met esbuild). Laad hem alleen bij een import (dynamische import), dan merkt de app er bij het opstarten niets van. Een proefbestand met D+, D−, hartslag, RPE en gevoel las ik in 2 ms terug. Let op: de licentie van de FIT SDK is Garmins eigen FIT-licentie, geen MIT.
- "Export Original" in Garmin Connect levert een ZIP met daarin het FIT-bestand ([GNeta](https://www.gneta.app/blog/export-garmin-data-guide)). Uitpakken kan met een kleine bibliotheek als fflate.

**Het eerlijke probleem: hoe krijg je het bestand op je telefoon?** De Garmin Connect-app heeft geen export per activiteit volgens meerdere bronnen ([FitMesh](https://www.fitmesh.fit/en/blog/export-garmin-data); [GNeta](https://www.gneta.app/blog/export-garmin-data-guide)); één gids zegt van wel, dus kijk even in je eigen app bij de drie puntjes van een activiteit. Wat wel zou moeten werken: connect.garmin.com openen in de mobiele browser, "desktopsite" aanzetten, de activiteit openen, tandwiel, Export Original. Dat heb ik niet zelf op een telefoon kunnen proberen. Het kost per activiteit ongeveer zes tikken, minder werk dan zeven getallen typen, maar niet "zonder handwerk".

**Handwerk weg.** Gedeeltelijk. **Betrouwbaarheid:** hoog voor het lezen, matig voor het verkrijgen. **Privacy:** uitstekend. **Past:** volledig. **Werk:** middel. **Advies:** bouw de deel-ontvanger eerst voor de MacroFactor-CSV (idee 2), dan krijgt de FIT-route dezelfde ingang erbij voor bijna niets.

### Idee 5. Een kleine Android-schil (Capacitor) voor Health Connect en de Garmin Personal API

**Wat.** Dezelfde ASCEND-code, verpakt als Android-app met Capacitor. Native verzoeken hebben geen CORS, dus de Garmin Personal API werkt dan direct. Met een plugin als `@capgo/capacitor-health` (MPL-2.0, ondersteunt Health Connect en HealthKit met `queryWorkouts`) kan de app ook Health Connect lezen ([Capgo-documentatie](https://capgo.app/docs/plugins/health/)).

**Wat Health Connect van Garmin krijgt.** Sinds 2025 schrijft Garmin Connect eenrichtingsverkeer naar Health Connect, vanaf Android 14: bij een training calorieën, afstand, **stijging** (elevation gained), hartslag, snelheid en stappen; overdag onder meer hartslag, slaap, stappen, beklommen trappen en gewicht. Body Battery, trainingsbelasting en HRV-status niet ([Android Police](https://www.androidpolice.com/garmin-data-sharing-google-health-connect-details/); [Tom's Guide](https://www.tomsguide.com/wellness/fitness-trackers/garmin-clarifies-what-data-its-sharing-with-google-health-connect-heres-the-full-list)). Daling en RPE staan niet in die lijst. Voor activiteiten is Health Connect dus **slechter** dan intervals.icu of de Personal API; hij is vooral nuttig voor traplopen door de dag en voor MacroFactor-gewicht.

**Wat het betekent voor deploy en de regels.**
- De PWA blijft gewoon op GitHub Pages. GitHub Actions kan ernaast een APK bouwen en als Release publiceren. Je installeert die APK zelf.
- **De Android-app heeft eigen opslag**, los van de PWA in Chrome. Je moet één keer overstappen met een back-up export en import, en daarna alleen de app gebruiken. Twee naast elkaar geeft twee verschillende logboeken.
- Een Trusted Web Activity zou de opslag van Chrome delen, maar de webpagina zelf kan daarin geen native functies aanroepen, en voor een volledig scherm moet het domein een `/.well-known/assetlinks.json` op de hoofdmap hebben, wat bij een projectpagina op `github.io/ascend/` niet vanzelf kan. Capacitor is de eenvoudigere weg.
- Google voert verificatie van ontwikkelaars in voor apps buiten de Play Store: verplicht in vier landen sinds 30 september 2026, wereldwijd in 2027. Er komt een gratis account voor hobbyisten (tot 20 toestellen, geen ID), en installeren via `adb` of de "geavanceerde route" met 24 uur wachttijd blijft mogelijk ([Android Developers Blog](https://android-developers.googleblog.com/2026/06/android-developer-verification.html); [9to5Google](https://9to5google.com/2026/08/18/google-gradually-rolling-out-androids-advanced-sideloading-ahead-of-developer-verification/)).
- Of Health Connect zonder Play Store-vermelding altijd soepel toestemming geeft, is niet goed gedocumenteerd; er zijn meldingen dat het toestemmingsscherm op Android 16 niet verschijnt ([react-native-health-connect issue 253](https://github.com/matinzd/react-native-health-connect/issues/253)).
- Op een native app kan het ophalen ook op de achtergrond, zodat de training al klaarstaat voordat je de app opent.

**Handwerk weg.** Het meest van alle opties, ook zonder openen. **Betrouwbaarheid:** goed voor de Personal API, wisselend voor Health Connect. **Privacy:** goed, geen tussenpartij. **Past:** geen backend, geen account, wel een tweede product (een APK) naast de PWA, en native code die onderhouden moet worden. **Werk:** groot. **Advies:** pas doen als idee 1 tegenvalt of als je ook achtergrond-ophalen wilt.

**iPhone.** Een HealthKit-app zelf installeren mag volgens Apple ook met een gratis ontwikkelaarsaccount (HealthKit staat aangevinkt in de kolom "Apple Developer", [Apple, Supported capabilities](https://developer.apple.com/help/account/reference/supported-capabilities-ios); veel blogs beweren ten onrechte dat het betaald moet). Maar je hebt een Mac met Xcode nodig en een gratis ondertekening verloopt na zeven dagen; zonder dat kost het 99 dollar per jaar. Bovendien stuurt Garmin naar Apple Health wel trainingen maar geen route en volgens de bronnen geen hoogtemeters ([the5krunner](https://the5krunner.com/2025/06/20/garmin-to-add-health-connect-support-to-apple/)). Voor een iPhone raad ik dit af.

### Idee 6. Strava met je eigen API-app

**Wat.** Je maakt een eigen Strava API-app, ASCEND doet de OAuth-stap en haalt activiteiten op. Strava staat browserverzoeken toe (getest: `access-control-allow-origin: *`, ook op het token-endpoint). PKCE bestaat niet bij Strava; het geheim van de app is nodig ([Strava, Authentication](https://developers.strava.com/docs/authentication/)). Omdat het jouw eigen app is en het geheim alleen op jouw telefoon staat, is dat hier geen echt lek.

**Waarom niet.** Sinds 1 juni 2026 is een betaald Strava-abonnement nodig om de API als ontwikkelaar te gebruiken ([Strava Community Hub](https://communityhub.strava.com/insider-journal-9/an-update-to-our-developer-program-13428)). Strava geeft geen totale daling, en RPE van je Garmin gaat niet aantoonbaar mee. Het is dus duurder en levert minder dan intervals.icu. **Past:** ja. **Werk:** middel. **Advies:** niet doen, tenzij je Strava al betaalt.

### Idee 7. Back-up zonder eraan te denken

Dit hoort bij "geen handwerk", omdat al je data alleen op je telefoon staat.
- **Android:** ASCEND kan al naar een gekozen map schrijven. Laat het bij het openen vanzelf een weekback-up wegschrijven zolang de toestemming geldig is, en alleen vragen als die verlopen is. Klein werk.
- **iPhone:** geen map-API. Het beste is de deelknop met het bestand (`navigator.share`, werkt sinds iOS 15 met bestanden), zodat je het in Bestanden of iCloud Drive zet. Eén tik per week. Klein werk.
- **Google Drive, beide platformen:** kan zonder eigen server met Google Identity Services in de browser. Alleen een openbare client-id is nodig, geen geheim. De scope `drive.file` is "non-sensitive", dus geen zware controle door Google ([Google Drive API, scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)). Nadeel: een toegangstoken is kort geldig en moet steeds met een tik worden aangevraagd ([Google, token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)), en je data staat dan ook bij Google. Middel werk. Ik zou eerst de twee eenvoudige routes doen.
- Background Sync en Periodic Background Sync werken alleen in Chromium, niet op iPhone (browser-compat-data). Niet nodig: je opent de app dagelijks, dus "bij openen" is genoeg.
- Vraag `navigator.storage.persist()` aan; dat staat al als voorstel in `docs/audit/5 Tekst offline toegankelijkheid.md`.

### Wat niet kan (eerlijk)

- **Health Connect of Apple Health vanuit een webapp.** Bestaat niet, op geen enkel platform.
- **Garmin Health/Activity API (zakelijk).** Alleen voor bedrijven, levert data door te pushen naar jouw server ([Garmin Developers](https://developer.garmin.com/gc-developer-program/overview)). Vereist dus een backend.
- **Connect IQ (eigen dataveld of widget).** Een dataveld kan alleen naar een HTTPS-server sturen, en ASCEND heeft er geen. Je horloge meet bovendien al alles; het probleem is het transport, niet het meten.
- **Delen naar ASCEND op iPhone** (Web Share Target) en bestanden openen met ASCEND (File Handling) op welke telefoon dan ook.
- **Een link uit een iPhone-Opdracht die data in de app op je beginscherm zet.** Komt in Safari terecht, met andere opslag.
- **Sessie-RPE uit MacroFactor.** MacroFactor slaat RIR per set op, geen RPE voor de hele training.
- **Runalyze.** Heeft een persoonlijke API, maar volgens Runalyze zelf ontbreken nog endpoints voor activiteiten ([Runalyze help](https://runalyze.com/help/article/personal-api)). Geen voordeel boven intervals.icu.
- **Onofficiële Garmin-bibliotheken** die met je wachtwoord inloggen (zoals `garminconnect`). Werken niet vanuit een browser, breken regelmatig en zijn met de Personal API overbodig geworden.

### Rangorde samengevat

1. Zelfevaluatie op het horloge (geen code, maakt RPE automatisch).
2. intervals.icu-koppeling (meeste handwerk weg, beide platformen, middel werk; jij moet de derde partij accepteren).
3. MacroFactor-CSV per week (kracht compleet, volledig lokaal, klein tot middel werk).
4. Delen met ASCEND en FIT-lezer (vangnet zonder derden, Android het fijnst, middel werk).
5. Garmin Personal API (beste bron, nu alleen via iPhone-Opdracht of Android-schil; in de gaten houden).
6. Android-schil met Capacitor (meest automatisch, groot werk, tweede product).
7. Strava (betaald, minder data).

## 4. Voorstel voor de eerste drie stappen

**Stap 1. Een pure importfunctie in `engine/` en een bron-id op de log.**
Een functie `engine/activityImport.ts` die een algemene "externe activiteit" (start, soort, duur, afstand, D+, D−, gemiddelde en hoogste hartslag, cadans, RPE, gevoel, loopband ja of nee, bron-id) omzet naar een concept-`SessionLog` en voorstelt bij welke `PlannedSession` die hoort: zelfde dag, passende soort, nog geen log. Bestaat er al een log met hetzelfde bron-id, dan niets. Voeg een optioneel veld `externalId` toe aan `SessionLog` met een pass-through migratiestap in `storage/migrations.ts`. Geen React, volledig te testen, en daarna bruikbaar voor intervals.icu, FIT, de Personal API en Health Connect. De log zelf blijft append-only; de import maakt alleen nieuwe logs, en alleen na jouw tik.

**Stap 2. De intervals.icu-adapter en een kaart op Vandaag.**
`src/integrations/intervalsIcu.ts` met `fetchActivities` over de laatste zeven dagen, aangeroepen bij het openen (na de andere opstarttaken, één voor één zoals `CLAUDE.md` vraagt). Onder Meer komt in plaats van "Garmin, Binnenkort" een scherm "Garmin koppelen via intervals.icu" met drie korte stappen en het sleutelveld; de sleutel gaat niet mee in de export. Op Vandaag de kaart "Van je horloge" met OPSLAAN. `source` wordt `'garmin'` (waar de meting vandaan komt); welke adapter het ophaalde kan in de adapter-id blijven. Met de opties ernaast ("Niet koppelen", "Andere training") blijft het een voorstel, geen stille wijziging.

**Stap 3. MacroFactor-CSV inlezen, op Android ook via delen.**
Een CSV-lezer op kolomnaam, de naamkoppeling van MacroFactor-workouts naar ASCEND-sjablonen (één keer bevestigen), en een voorstelkaart "4 krachttrainingen gevonden". Op Android een `share_target` in het manifest met een klein stuk service worker, zodat "Delen, ASCEND" werkt; op iPhone een knop "Kies bestand". Daarmee ligt ook de ingang voor FIT-bestanden klaar (idee 4) als intervals.icu ooit wegvalt.

Voor stap 2 en 3 is een echt bestand van jou nodig om tegen te testen: één intervals.icu-activiteit als JSON en één MacroFactor Workout Log-export.

## 5. Wat jij moet beslissen

1. **Heb je een Android-telefoon of een iPhone?** En welk Garmin-model? Dat bepaalt of "Delen met ASCEND" werkt en of je horloge Zelfevaluatie heeft.
2. **Vind je het goed dat je Garmin-data ook bij intervals.icu staat?** Het is gratis en ASCEND leest er alleen uit, maar het is een extra partij. Zonder intervals.icu blijft alleen de bestandsroute over tot Garmin zijn Personal API voor browsers opent.
3. **Wil je Zelfevaluatie op je horloge aanzetten** en RPE en gevoel daar invullen, zodat ASCEND er niet meer om hoeft te vragen? Of wil je RPE liever in ASCEND blijven geven?
4. **Wil je een aparte Android-app** (APK naast de webapp, eenmalig overstappen met een back-up) om alles op de achtergrond binnen te krijgen, of blijft ASCEND een pure webapp?
5. **Kun je één MacroFactor-export maken** (Granular Export, Workout Log, afgelopen week) en kijken of hij via het deelmenu of per mail komt? Vul je RIR per set in MacroFactor in?
6. **Gewicht:** blijf je dat elke twee weken intypen (tien seconden), of wil je het uit een MacroFactor-export laten halen als dat een CSV blijkt te zijn?
7. **Back-up:** is één tik per week naar Bestanden of een map goed genoeg, of wil je Google Drive (dan staat je back-up ook bij Google)?

## Bronnen

Eigen tests (21 oktober 2026): CORS-verzoeken naar intervals.icu (toegestaan, herkomst wordt teruggegeven), Strava (toegestaan, `*`), `personal.connectapi.garmin.com` en `apis.garmin.com` (geweigerd); bundelgrootte van `@garmin/fitsdk` 21.218.0 en `fit-file-parser` 6.2.3 met esbuild; FIT-proefbestand heen en terug met `workoutRpe` en `workoutFeel`; analyse van een echte back-up; OpenAPI van intervals.icu (`https://intervals.icu/api/v1/docs`); browser-compat-data van MDN versie 8.1.6 (15 oktober 2026).

- Garmin Developers, Connect Developer Program overzicht: https://developer.garmin.com/gc-developer-program/overview
- DC Rainmaker, Garmin Revamps and Opens Up Connect Developer API Program (21 oktober 2026): https://www.dcrainmaker.com/2026/10/garmin-connect-api-revamps-connect-developer.html
- Gadgets & Wearables, Garmin finally gives users their own Connect API access (21 oktober 2026): https://gadgetsandwearables.com/2026/10/21/garmin-connect-personal-api-health-data-access/
- Garmin, garmin-connect-personal-api-python 1.0.0: https://pypi.org/project/garmin-connect-personal-api-python/
- Terra, Garmin Connect Developer Program pause (7 september 2026): https://tryterra.co/blog/garmin-connect-developer-program-pause
- Garmin-handleiding, Zelfevaluatie inschakelen: https://www8.garmin.com/manuals/webhelp/GUID-2CF5620C-E585-4E0A-9CC3-9565533EEE4D/EN-US/GUID-0CAB64D5-DB13-470D-B60C-0AB03A2B75AB.html
- Garmin-forum, ruwe data per activiteit exporteren: https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-web/421060/exporting-individual-activity-raw-data
- GNeta, How to Export Garmin Data: https://www.gneta.app/blog/export-garmin-data-guide
- FitMesh, How to Export Garmin Data: https://www.fitmesh.fit/en/blog/export-garmin-data
- intervals.icu-forum, API access: https://forum.intervals.icu/t/api-access-to-intervals-icu/609
- intervals.icu-forum, Perceived Effort not syncing from Garmin: https://forum.intervals.icu/t/perceived-effort-metric-not-syncing-from-garmin/114809
- garmin-intervals-bridge: https://github.com/patriklindegardh-ops/garmin-intervals-bridge
- Strava, Authentication: https://developers.strava.com/docs/authentication/
- Strava Community Hub, An update to our developer program: https://communityhub.strava.com/insider-journal-9/an-update-to-our-developer-program-13428
- Apps for Strava, Strava API changes 2026: https://appsforstrava.com/blog/strava-developer-program-changes-2026
- Android Police, wat Garmin deelt met Health Connect: https://www.androidpolice.com/garmin-data-sharing-google-health-connect-details/
- Tom's Guide, Garmin en Health Connect: https://www.tomsguide.com/wellness/fitness-trackers/garmin-clarifies-what-data-its-sharing-with-google-health-connect-heres-the-full-list
- the5krunner, Garmin, Health Connect en Apple: https://the5krunner.com/2025/06/20/garmin-to-add-health-connect-support-to-apple/
- MacroFactor helpcentrum, Export Your Data (Workouts): https://help.macrofactorapp.com/en/articles/356-export-your-data
- MacroFactor helpcentrum, Integrations (Workouts): https://help.macrofactorapp.com/en/articles/354-integrations-workouts
- MacroFactor helpcentrum, Health Connect of Apple Health koppelen: https://help.macrofactorapp.com/en/articles/65-connect-health-connect-apple-health-or-fitbit
- workout-data-sync (MacroFactor-export, voorbeeld-CSV): https://github.com/matanabudy/workout-data-sync
- MDN, share_target: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target
- MDN browser-compat-data: https://github.com/mdn/browser-compat-data
- firt.dev, iOS PWA-compatibiliteit: https://firt.dev/notes/pwa-ios/
- WebKit bug 181849, opslag beginscherm-apps gescheiden van Safari: https://bugs.webkit.org/show_bug.cgi?id=181849
- Capgo, Capacitor Health-plugin: https://capgo.app/docs/plugins/health/
- react-native-health-connect issue 253: https://github.com/matinzd/react-native-health-connect/issues/253
- Apple, Supported capabilities (iOS): https://developer.apple.com/help/account/reference/supported-capabilities-ios
- Android Developers Blog, developer verification: https://android-developers.googleblog.com/2026/06/android-developer-verification.html
- 9to5Google, advanced sideloading flow: https://9to5google.com/2026/08/18/google-gradually-rolling-out-androids-advanced-sideloading-ahead-of-developer-verification/
- Google, Drive API scopes: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Google Identity Services, token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Runalyze, Personal API: https://runalyze.com/help/article/personal-api
- StatCounter, mobiele besturingssystemen Nederland: https://gs.statcounter.com/os-market-share/mobile/netherlands
