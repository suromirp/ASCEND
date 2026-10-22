# Een Android-app voor ASCEND: routes, updates, Health Connect, kosten en advies

Onderzoek van 22 oktober 2026. Doel: beoordelen of een Android-schil zin heeft voor drie dingen: een rusttimer die met het scherm uit piept of trilt terwijl er muziek of een video speelt, Health Connect lezen (gewicht uit MacroFactor, stappen, trappen) en eventueel later de Garmin-gegevens rechtstreeks. Voorwaarde van de eigenaar: niet bij elke update een nieuwe APK installeren.

Zo lees je dit rapport. Elke bewering krijgt een van drie labels. "Bevestigd" betekent dat een officiële bron (Google, Android, Capacitor, Garmin, de maker van het product) het zegt. "Gemeld" betekent dat gebruikers, forums of een commerciële partij het melden en dat het dus niet officieel is. "Eigen afleiding" betekent dat ik het uit het bovenstaande en uit de code van ASCEND heb afgeleid; dat moet je op de telefoon controleren. Wat ik niet kon vinden staat er ook bij. Alle bronnen staan onderaan met titel, datum en link.

Eerst een opmerking over de repo: de notitie "Data zonder handwerk" (idee 5) sprak over een Capacitor-schil als "groot werk, tweede product". Dat klopt nog steeds, en een deel van wat daar stond over de Garmin Personal API is intussen bevestigd (zie 1.6). Twee dingen uit de notitie heb ik hier opnieuw nagelopen en bijgesteld: Health Connect vanaf een niet-Play-app (het blijkt waarschijnlijk te werken, zie 4) en de verificatieregels van Google (die zijn voor één persoon met een eigen app minder streng dan de notitie liet denken, zie 3).

---

## 0. Het korte antwoord

De route die past: een Capacitor-schil om de bestaande code, als eigen gesigneerde APK buiten de Play Store, automatisch bijgewerkt via Obtainium en GitHub Releases. De webcode werkt vanzelf bij doordat de schil de live site laadt (of een gratis zelf bediend updatepakket). Alleen echt nieuwe native dingen (een nieuwe plugin, een nieuwe toestemming, een nieuwe Android-versie) vragen een nieuwe APK, en die komt dan via Obtainium zonder handwerk binnen.

Maar: eerst een kleine, goedkope controle of je de schil wel nodig hebt. MacroFactor, waar je kracht al in vastlegt, heeft zelf rusttimermeldingen die volgens de maker ook doorkomen bij een telefoon op stil of met muziek (zie 7.1). En in de PWA zelf is een veel betrouwbaardere timer te maken door de eindtijd vast te leggen en het scherm aan te houden (zie 7.2). Daarmee kan het sterkste argument voor de schil, de rusttimer, vervallen. Health Connect blijft dan als enige echte reden over, en die is te klein voor veel onderhoud tenzij je ook gewicht, stappen en trappen vanzelf wilt.

Wat het oplevert: een timer die met scherm uit in de meeste gevallen op tijd piept en trilt, gewicht, stappen en trappen zonder tikken, en later de Garmin Personal API zonder browserbeperkingen. Wat het niet oplevert: daling en RPE uit Health Connect (die staan er niet in), een garantie dat Samsung de timer nooit uitstelt, en iets voor iPhone.

---

## 1. De routes en wat elke route kan

### 1.1 Trusted Web Activity (Bubblewrap of PWABuilder)

Bevestigd (Chrome-documentatie over Trusted Web Activity): een TWA toont je webpagina in de browser van de gebruiker, op volledig scherm. De Android-app eromheen heeft "geen directe toegang tot webinhoud of webstatus zoals cookies en localStorage". Wissel tussen web en native gebeurt tussen schermen: elk scherm is helemaal web of helemaal native. De inhoud wordt alleen als vertrouwd getoond als app en site van dezelfde ontwikkelaar zijn, aangetoond met Digital Asset Links. Anders valt het terug op een Custom Tab met adresbalk.

Wat dat betekent voor jouw twee wensen, eigen afleiding: de webcode in een TWA kan geen exacte alarmen of Health Connect aanroepen, want die zitten in Android en niet in de browser. Je zou er een eigen native scherm naast moeten bouwen, en dan is het geen voordeel meer ten opzichte van Capacitor.

Er zijn ook praktische haken. Een Digital Asset Links-bestand moet op de hoofdmap van het domein staan (`/.well-known/assetlinks.json`; bevestigd door Google over elk gevalideerd domein). ASCEND staat op een projectpagina (`gebruiker.github.io/ascend/`). Het domein is dan `gebruiker.github.io`, en een bestand in de hoofdmap vraagt een aparte opslagplaats met precies die naam. Dat staat zo niet in de bronnen die ik las; het is eigen afleiding (de repo-notitie zegt hetzelfde). Zonder dat bestand krijg je een Custom Tab met adresbalk. Of Edge, jouw browser, het TWA-protocol netjes volgt, kon ik niet bevestigen: Google zegt alleen dat andere browsers het protocol kunnen implementeren en dat de app de standaardbrowser van de gebruiker moet gebruiken als die het kan.

Voordeel van een TWA: dezelfde opslag als de browser. Dat staat niet expliciet in de Chrome-pagina (die zegt alleen dat de app er zelf niet bij kan), dus eigen afleiding: de IndexedDB-gegevens van de PWA blijven dan staan.

Oordeel: past niet bij de wensen.

### 1.2 Capacitor met de bestaande code, ingepakt in de app

Capacitor stopt je gebouwde webapp (`dist/`) in een Android-WebView en geeft plugins voor native functies. Het is de gewone route voor wat jij wilt.

Rusttimer met het scherm uit. Bevestigd (Capacitor-documentatie, plugin Local Notifications):
- Een melding op een vast tijdstip plan je met `schedule({ at })`.
- Vanaf Android 12 is een melding alleen echt exact als `SCHEDULE_EXACT_ALARM` in het manifest staat. Zonder die toestemming wordt het een "ongeveer op tijd".
- De gebruiker kan exacte alarmen per app uitzetten. Dan herstart de app en worden alle als exact geplande meldingen gewist. De plugin heeft `checkExactNotificationSetting()` en `changeExactNotificationSetting()` om dat bij het opstarten te controleren en het instellingenscherm te openen.
- Sinds versie 8.3.0 opent `schedule()` zelf het scherm "Alarmen en herinneringen" als exact niet is toegestaan. Weigert de gebruiker, dan valt het terug op ongeveer-op-tijd met een waarschuwing, tenzij je `isExactMandatory` zet.
- Met `allowWhileIdle: true` mag een melding ook tijdens Doze afgaan, maar "hooguit eens per 9 minuten per app".
- Vanaf Android 14 bestaat `USE_EXACT_ALARM`, dat zonder vraag aan de gebruiker wordt toegekend. De Capacitor-pagina zegt dat je die alleen moet gebruiken als exacte alarmen "centraal in de app" staan.
- Geluid op Android 8 en nieuwer zit aan een meldingskanaal (channel), niet aan de losse melding; het kanaalgeluid kun je later niet meer wijzigen zonder de app te verwijderen. Een melding zonder bestaand kanaal gaat helemaal niet af.
- Op Android 13 en nieuwer moet de gebruiker meldingen toestaan.
- Op Android 15: als de app in de "Private space" staat en die vergrendeld is, komen meldingen niet binnen.

Bevestigd (Android-documentatie over alarmen, bijgewerkt 21 oktober 2026): `SCHEDULE_EXACT_ALARM` wordt niet vooraf toegekend aan nieuwe installaties die Android 13 of hoger als doel hebben; de gebruiker geeft die toestemming in "Alarmen en herinneringen" en kan hem intrekken. `USE_EXACT_ALARM` wordt automatisch toegekend, is niet intrekbaar en heeft "beperkte gebruiksgevallen" (voorbeelden: wekker, agenda). Van `setAlarmClock()` zegt Android dat het systeem de aflevertijd nooit aanpast en daarvoor zelfs lage-energiestanden verlaat, met invloed op de accu.

Gemeld: Ionic-forumberichten over meldingen die 10 tot 70 minuten te laat komen, ook met de exact-toestemming; een gesloten melding in de plugin-repo "Local Notification doesn't run in Doze mode when display is turned off" (nummer 1795, gesloten 26 februari 2026, reden onbekend). Zie bronnen.

Eigen afleiding: voor een rusttimer van 60 tot 180 seconden past een exact alarm bij een melding met geluid en trillen. Een foreground service is niet nodig; Android raadt alarmen aan voor tijdgestuurd werk. Een eigen foreground service met aftelmelding (zoals een echte timer-app) zou een zelfgeschreven native plugin vragen. Het geluid van een melding speelt gewoon over of tussen de muziek of video heen (Android laat een melding het geluid tijdelijk zachter maken), en de trilling hoort bij het kanaal; dat moet je wel op je telefoon horen. Het scherm hoeft niet aan. De 9-minutenregel van `allowWhileIdle` is het gevaar in een lange sessie als de telefoon echt in Doze zakt (stilliggend, scherm uit, een tijd lang); of de plugin voor een app met de exact-toestemming nog onder die regel valt, staat in geen enkele bron die ik las. Dat is dus het eerste dat je met een proefversie test (zie 7).

Health Connect. Zie 4. Plugins: `@capgo/capacitor-health` (versie 8.7.0, volgt Capacitor 8) leest volgens de gebruiksaanwijzing `weight`, `steps`, `flightsClimbed` (trappen) en `workouts`; er staat geen hoogtewinst-type (ElevationGained) in. De Capawesome-plugin bestaat ook, maar vraagt een betaald Insiders-abonnement (prijs niet vermeld in de aankondiging).

Bestaande PWA en gegevens. Bevestigd (Capacitor-opslaggids): in een Capacitor-app kan het systeem WebView-opslag opruimen bij weinig ruimte; voor IndexedDB geldt dat "op iOS", op Android kan de persisted-storage-API IndexedDB als blijvend markeren. Eigen afleiding: de app heeft een eigen WebView met een eigen opslag-origin. Dat is `https://localhost` bij bundelen of het domein van de site bij `server.url`. In beide gevallen is het een andere opslag dan die van Edge, dus de PWA-gegevens komen er niet vanzelf in. Overzetten gaat via de bestaande back-up (export in de PWA, import in de app). ASCEND heeft schema 5 en migraties, dus dat past. Let op: wie later van `androidScheme` of `hostname` verandert, of de site naar een ander domein verhuist, verliest in de app dezelfde opslag-origin. Kies die een keer en leg het vast.

Een tweede aandachtspunt, eigen afleiding en niet bevestigd: de back-up naar een map gebruikt `showDirectoryPicker` (`src/storage/backupFileAdapter.ts`). De publieke compatibiliteitsgegevens van MDN (browser-compat-data) vermelden voor "webview_android" een gespiegelde waarde van Chrome Android 132. Of een WebView-app die API echt kan gebruiken zonder dat de app zelf een bestandskiezer afhandelt, is daaruit niet af te lezen. Reken erop dat je in de app de back-up via de plugin Filesystem of Share moet laten lopen.

### 1.3 Capacitor die de live site laadt (`server.url`)

Bevestigd (Capacitor-configuratie): `server.url` laadt een externe URL in de WebView en is "bedoeld voor live-reload-servers" en "niet bedoeld voor productie". Dat geldt ook voor `server.cleartext` en `server.allowNavigation`.

Bevestigd (Capawesome-artikel "The right way to update your Capacitor app remotely", 25 september 2026): bij elke start is een netwerkverzoek nodig, dus zonder verbinding start de app niet; valt de server uit, dan is er geen gebundelde terugval; buiten HTTPS zijn er geen aparte integriteitscontroles. Ze raden live-updates aan voor productie. Hetzelfde artikel zegt dat Google-beleid JavaScript in een WebView toestaat.

Bevestigd (Google Play, beleid "Device and Network Abuse"): downloaden van uitvoerbare code (dex, JAR, .so) buiten Play is verboden, maar niet voor code in een interpreter zoals JavaScript in een WebView, zolang die niet tegen het Play-beleid ingaat. Dat gaat over Play-apps; voor een APK buiten Play is het niet van toepassing (eigen afleiding).

Of de Capacitor-brug (de plugins) werkt als de pagina van een externe URL komt: de bronnen die ik las zeggen dat niet duidelijk. Eigen afleiding: Capacitor voegt de brug aan de WebView toe, en dit is precies hoe live-reload in ontwikkeling werkt, dus plugins werken. Test dat in het eerste proefje.

Eigen afleiding over offline: de PWA heeft al een service worker (vite-plugin-pwa, workbox). Android-WebView ondersteunt service workers, dus na de eerste keer laden zou ASCEND ook zonder verbinding starten zoals de PWA nu. Dat is de reden om dit als eerste te proberen, maar het moet op de telefoon worden bevestigd. Let op `registerType: 'prompt'` in `vite.config.ts`: een update wordt dan eerst aangeboden en niet vanzelf toegepast.

Voordeel: nul extra diensten en nul kosten, elke GitHub Pages-deploy is meteen in de app. Nadeel: de officiële "niet voor productie"-waarschuwing, afhankelijkheid van GitHub Pages en de domeinnaam, en een tweede kopie van je opslag-origin.

### 1.4 Capacitor met gebundelde code en een live-updatedienst

De alternatieve manier om de webcode vanzelf te verversen: de app bevat de webcode zelf (offline altijd aanwezig) en haalt op de achtergrond nieuwe webbestanden op. Details in 2.1.

### 1.5 Volledig native (Kotlin met Compose of Flutter)

Eigen afleiding: ASCEND heeft een grote engine (planner, voorbereiding, readiness, GR5-berekeningen) en een uitgewerkte interface. Alles opnieuw bouwen in Kotlin is maanden werk met een tweede codebase die steeds moet worden gelijkgetrokken met de website, en je zou beide platforms (de PWA is ook voor jou en eventueel iPhone-gebruik) moeten onderhouden. Voor een rusttimer en een Health Connect-lezer is dat veel te zwaar. Alleen een klein stuk native code (een eigen Capacitor-plugin voor één alarm) kan nuttig zijn.

Een tussenvariant, eigen afleiding en onbewezen: een heel kleine losse native timerapp die vanuit de PWA wordt gestart. Dan blijft de PWA met zijn opslag onaangeroerd en is er geen migratie. De PWA zou de timer kunnen starten met een `intent:`-link (Chrome documenteert dat syntax en eist een tik van de gebruiker). Of Edge dat doet, weet ik niet. Gegevens terug naar de PWA (Health Connect) zou via "Delen" naar de al bestaande share target van de PWA kunnen. Dit is een lastige constructie; ik noem hem alleen voor de volledigheid.

### 1.6 Garmin rechtstreeks (voor later)

Bevestigd (Garmin Developers, Personal API FAQ; DC Rainmaker 21 oktober 2026; Gadgets and Wearables 21 oktober 2026): Garmin heeft op 21 oktober 2026 een gratis Personal API voor eigen gegevens. Je maakt op de Garmin Connect-site een sleutel (30, 90, 180 dagen of een jaar geldig, een week voor het einde een mail, de sleutel wordt maar één keer getoond). Met die sleutel haal je een toegangstoken op dat 24 uur geldig is, zonder refresh-token. Alleen ophalen (pull), geen commerciële apps voor meerdere gebruikers. Activiteiten komen als JSON en FIT, plus gezondheidsgegevens. Gemeld (Tredict, DC Rainmaker): het Training-API (trainingen naar het horloge schrijven) hoort er niet bij, en Garmin haalt in via de API geleverde FIT-bestanden een deel van de gegevens weg. Niet beschreven in wat ik las: snelheidslimieten, welke velden precies (daling, hoogte) en of browserverzoeken (CORS) worden toegestaan. De repo-notitie zegt dat de server browserverzoeken van andere websites weigert; dat heb ik niet zelf gemeten. Daarom is een native schil de natuurlijke plek (geen CORS). Maar intervals.icu levert deze gegevens al zonder schil, volgens de repo (beslissing van 22 oktober 2026). Direct Garmin voegt dus weinig toe zolang intervals.icu werkt.

Gemeld: in maart 2026 stopte Garmin met nieuwe aanvragen voor de zakelijke API (the5krunner, 14 september 2026). Dat is voor de Personal-laag niet van belang, maar laat zien dat Garmin zijn regels vaak verandert.

---

## 2. Updates zonder steeds een APK

### 2.1 De webcode

Er zijn drie manieren, van eenvoudig naar zwaar.

Eén, de live site laden (`server.url`). Zie 1.3. Gratis. Officieel "niet voor productie".

Twee, gebundelde code met een zelfbediend updatepakket. Bevestigd (README van `@capgo/capacitor-updater`, MPL-2.0): de plugin kent een handmatige modus: `autoUpdate` uit, je roept `download({ version, url })` aan voor een zipbestand met `index.html` in de hoofdmap, en activeert met `set(version)` (meteen herladen) of `next(...)` (bij de volgende start). `notifyAppReady()` bij elke start; blijft die uit, dan keert de app terug naar de vorige werkende versie. Je kunt het zipbestand zelf hosten, bijvoorbeeld bij GitHub Releases of Pages. Er is ook een modus met een eigen updateserver (`updateUrl`). Eigen afleiding: een extra stap in de GitHub-workflow die de zip maakt en een versielogica in de app. Dit geeft offline zekerheid en een terugvaloptie, voor wat extra werk.

Drie, een betaalde of zelf gehoste dienst. Prijzen (gemeld, door de leveranciers zelf of door concurrenten, niet officieel neutraal):
- Capawesome Cloud: alleen live-updates vanaf 9 dollar per maand (1.000 maandelijkse gebruikers), er wordt een gratis laag genoemd; het hele platform vanaf 19 dollar per maand (Capawesome, 14 augustus 2026, prijzen gecontroleerd 18 september 2026).
- Capgo: Solo 14 dollar per maand (2.000 gebruikers); proefperiode van 14 dagen; plugin MPL-2.0, de hele backend AGPL-3.0 en zelf te hosten, maar met een gemeenschapsondersteuning die "ongeveer twee keer per jaar" een versie uitbrengt (Capawesome, 14 augustus 2026). Een andere pagina van Capgo zelf noemt "vanaf 12 dollar per maand bij jaarbetaling" (Capgo, 22 oktober 2026); de bedragen verschillen dus per bron.
- OtaKit: gratis tot 5.000 updates per maand, daarna 10 dollar per maand.
- Ionic Appflow: geen nieuwe verkoop meer; bestaande klanten tot 31 december 2027.

Eigen afleiding: voor één gebruiker is geen betaald abonnement nodig. De gratis handmatige modus of `server.url` volstaat; een dienst maakt alleen kanalen, statistiek en terugdraaien makkelijker.

### 2.2 Wat toch een nieuwe APK vraagt

Gemeld (Capgo en Capawesome, beide leveranciers): live-updates kunnen geen nieuwe native plugin toevoegen, geen toestemmingen veranderen en geen nieuwe native SDK meebrengen. Dat zijn precies de dingen waar een Health Connect-uitbreiding of een andere Android-versie op komt. Ook een nieuwe Capacitor-hoofdversie, een nieuwe Gradle of een nieuw target SDK vraagt een nieuwe APK. Eigen afleiding: bij ASCEND is dat naar schatting hooguit een paar keer per jaar nodig, mits je de native laag klein houdt (één notificatieplugin, één Health Connect-plugin).

### 2.3 De APK zelf automatisch krijgen

Google Play, intern testen. Bevestigd (Play Console Help, intern testen): tot 100 testers per app, toegevoegd met een e-maillijst; nieuwe builds zijn "binnen minuten" beschikbaar; interne tests "kunnen buiten de gewone Play-beleids- en beveiligingscontroles vallen". Testers krijgen updates via de Play Store. Dat is de rustigste automatische route.

Kosten en eisen van een Play-account. Bevestigd (Play Console Help, "Create a Play Console developer account"): eenmalig 25 dollar, minimaal 18 jaar; verificatie kan "een geldig overheids-ID en een creditcard op je wettelijke naam" vragen; nieuwe persoonlijke accounts moeten bovendien met de Play Console-app toegang tot een Android-toestel aantonen. Gemeld: de accountnaam en het adres van een persoonlijk account worden bij gepubliceerde apps getoond; daar heb ik geen officiële bron voor gelezen. Bij een app die alleen intern wordt getest, is er geen publieke winkelpagina; dat is eigen afleiding.

Het testerseis. Bevestigd (Play Console Help, app-testvereisten): voor persoonlijke accounts aangemaakt na 13 november 2023 moet een gesloten test lopen met minimaal 12 testers, 14 dagen aaneengesloten, voordat je productietoegang kunt aanvragen; aanvraag duurt "meestal zeven dagen of minder". Interne tests staan als optioneel genoemd en tellen niet mee voor dat eis. Gemeld (derden): sinds 2026 zou Google ook controleren of de testers echt de app gebruiken, en de teller zou resetten als het aantal onder 12 zakt; dat heb ik niet bij Google zelf kunnen vinden. Eigen afleiding uit de officiële tekst: het testerseis geldt voor de stap naar productie. Wie alleen intern test, hoeft dat niet. Zeker is dat niet, omdat de tekst niet uitdrukkelijk zegt dat je onbeperkt intern kunt blijven.

Gezondheidsapps. Bevestigd (Health Connect, "Publish your health app on Google Play"): het formulier "Health apps" in Play Console (App content) is nodig bij "alle publicatieverzoeken", ook bij een update met andere datatypes. Je legt per datatype uit hoe het de gebruiker helpt, en vraagt het minimum. Je privacybeleid moet identiek zijn aan wat Health Connect toont. Toegang is per pakketnaam op een toegestane lijst gezet. Bevestigd (Play-beleid Health Connect-machtigingen): geen "headless" apps, geen doorverkoop van gegevens, fitness en coaching is een toegestaan gebruik; vage uitleg is de meest voorkomende reden voor afwijzing. Of het formulier ook voor de interne testtrack verplicht is, vermeldt de documentatie niet.

Target SDK. Bevestigd (Android Developers, Target API level requirements, bijgewerkt 16 oktober 2026): sinds 31 augustus 2026 moeten nieuwe apps en updates voor telefoons Android 16 (API 36) als doel hebben; bestaande apps minimaal API 35, anders worden ze verborgen voor nieuwe gebruikers op nieuwere Android-versies. Uitstel tot 1 november 2026 aan te vragen. Capacitor 8 richt zich op API 36 en vraagt minimaal API 24, volgens Capacitor en derden ook JDK 21.

F-Droid. Eigen afleiding: F-Droid vraagt dat de broncode openbaar is (dat is ASCEND al) en bouwt de app zelf uit de bron, met zijn eigen sleutel. Aanmelding en builds kosten tijd, een Capacitor-app heeft dan ook een volledig gedocumenteerde, reproduceerbare build nodig. Voor een persoonlijke app te zwaar. Gadgetbridge (F-Droid, bijgewerkt 12 augustus 2026) laat wel zien dat een app met Health Connect-toestemmingen zo kan worden verspreid.

Obtainium met GitHub Releases. Bevestigd (Obtainium-repo, GPL-3.0): installeert en werkt apps bij vanaf hun releasepagina (GitHub, GitLab, Forgejo, F-Droid, IzzyOnDroid en andere), en meldt nieuwe releases. Gemeld (F-Droid wekelijkse berichten): Android 12 en nieuwer maakt automatische updates zonder tikken mogelijk, en Obtainium 1.20.0-alpha1 heeft strakkere integratie voor Android 14 en hoger. Bevestigd (Android, update ownership): ook een app met installatierechten moet op de status "wacht op gebruikersactie" kunnen reageren als de app van een andere installateur komt. Eigen afleiding: of Obtainium op jouw Samsung echt zonder tik bijwerkt, moet je proberen; verwacht minimaal een melding.

Samsung Auto Blocker. Gemeld (AdGuard-hulppagina, Croma, Smartworld; 2024 en later): Auto Blocker, op nieuwere Galaxy-telefoons standaard aan, blokkeert installatie van apps buiten de Play Store en Galaxy Store ("Unknown app blocked"). Uitzetten kan onder Instellingen, Beveiliging en privacy, Auto Blocker. De menu-indeling van One UI 7 en 8 heb ik niet bevestigd gekregen. Dit is dus een echt ding voor een Samsung: zonder die schakelaar ook geen Obtainium.

---

## 3. De nieuwe ontwikkelaarsverificatie van Google

Bevestigd (Android Developers Blog, "Android developer verification", juni 2026; Android Developers, Developer verification FAQ, bijgewerkt 30 september 2026; 9to5Google, 18 augustus 2026):

- Doel: apps op gecertificeerde Android-toestellen (Android 7 of hoger) moeten door een geverifieerde ontwikkelaar zijn geregistreerd.
- Tijdlijn: juni 2026 begint een systeemservice zich uit te rollen; juli 2026 de Developer ID Status API; augustus 2026 beperkte-distributieaccounts, de Console API en de "advanced flow" (de geavanceerde installatieroute); 30 september 2026 begint de verificatie in vier landen: Brazilië, Indonesië, Singapore en Thailand; daarna "wereldwijd in 2027 en later".
- Wie het raakt op 30 september 2026: alleen installaties via zeven deelnemende winkels (Google Play, HONOR App Market, OPPO App Market, Samsung Galaxy Store, Palm Store van Transsion, V-Appstore van vivo, GetApps van Xiaomi) in die vier landen. De FAQ zegt letterlijk: "Als je app via andere winkels wordt verspreid, of gebruikers je app direct sideloaden, dan zijn deze nieuwe verificatievereisten nog niet van toepassing op je app." (bijgewerkt 15 juli 2026). Nederland staat niet in de eerste vier landen; de FAQ noemt alleen "2027" voor de wereldwijde uitrol, zonder een dag of landenlijst.
- Voor hobbyisten: een "limited distribution account" (beperkte distributie): gratis, zonder overheids-ID, maximaal 20 toestellen, voor testen en persoonlijk gebruik. De gewone "full distribution"-account kost 25 dollar. Een beperkt account kan later naar volledig, niet andersom.
- Advanced flow, bevestigd: ontwikkelaarsmodus aan, controle dat niemand je aanstuurt, herstart en opnieuw inloggen, één keer een dag wachten, dan biometrie of pincode, en je kiest 7 dagen of onbepaald. Daarna zie je bij een niet-geverifieerde app een waarschuwing en tik je "Toch installeren". De ontwikkelaarsmodus hoeft daarna niet aan te blijven. Samsung rolde hem volgens 9to5Google geleidelijk uit.
- ADB, bevestigd: installaties met `adb` hoeven niet te worden geverifieerd en de wachttijd geldt niet.
- Bevestigd: "Niet-geregistreerde apps kunnen alleen worden geïnstalleerd of bijgewerkt als de advanced flow aan staat of met ADB; als de advanced flow uitstaat, mislukken updates van niet-geregistreerde apps." Dit gaat over de situatie waarin de verificatie op jouw toestel geldt.
- Sleutel, bevestigd: wie zijn signeersleutel kwijtraakt, kan zijn pakketten niet meer registreren. De console laat meerdere sleutels per pakket toe.

Hoe zeker is dit? De richting en de data van de eerste fase zijn zeker (het staat bij Google en de eerste fase is al gestart). Voor een Nederlandse eigenaar met een app die hij zelf installeert, geldt het nog niet. Wat in 2027 precies gebeurt voor directe sideloads, is niet vastgelegd; de FAQ zegt alleen "nog niet". Eerdere berichtgeving (2025) zei dat ook sideloads onder de regel zouden vallen, en de FAQ is daarna aangepast (bijgewerkt 15 juli 2026). De FAQ zelf is inconsistent: de voettekst zegt "bijgewerkt 2026-09-30" maar spreekt de datum 30 september nog in de toekomende tijd uit. Gemeld (F-Droid en de campagne Keep Android Open): kritiek dat de "advanced flow" de openheid van sideloaden toch aantast; dat zijn meningen, geen vaststaande regels.

Wat het voor één persoon betekent, eigen afleiding:
1. Nu: niets. Je kunt een zelfgesigneerde APK installeren (Auto Blocker uit).
2. Wanneer verificatie ook voor jou gaat gelden: registreer het pakket (pakketnaam plus hash van je signeersleutel) in een gratis beperkt account. Dan is je app geregistreerd, zonder ID. Hoe de "20 specifieke toestellen" daar precies in werken (moet je je toestel-ID opgeven?) staat niet in wat ik las.
3. Terugvalroute: `adb install` (werkt op een pc of via draadloos foutopsporen), of de advanced flow eenmalig doorlopen; wie dan "onbepaald" kiest, kan Obtainium blijven laten bijwerken.
4. Bewaar je signeersleutel op twee plekken. Een nieuwe sleutel betekent een nieuw pakket en weer opnieuw installeren.

---

## 4. Health Connect bij een app buiten de Play Store

Bevestigd (Android Developers, "Get started with Health Connect"): op Android 14 en nieuwer zit Health Connect in het systeem; op Android 13 en lager is het een app uit de Play Store. Je moet in het manifest elke leespermissie per datatype declareren, een privacybeleid-scherm aanbieden (een activiteit voor `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` voor Android 13 en lager, en voor Android 14 en nieuwer een `activity-alias` met `android.intent.action.VIEW_PERMISSION_USAGE`, categorie `HEALTH_PERMISSIONS`, beveiligd met `START_VIEW_PERMISSION_USAGE`). Gegevens ouder dan 30 dagen voor de eerste toestemming kun je alleen lezen met de extra toestemming `READ_HEALTH_DATA_HISTORY`. Je moet de toestemmingen elke keer opnieuw controleren omdat de gebruiker ze kan intrekken. Achtergrondlezen vraagt een aparte functiecontrole (`FEATURE_READ_HEALTH_DATA_IN_BACKGROUND`).

De lijst voor jouw doel is: gewicht (`WeightRecord`), stappen (`StepsRecord`), beklommen trappen (`FloorsClimbedRecord`), eventueel hoogtewinst (`ElevationGainedRecord`) en trainingssessies (`ExerciseSessionRecord`). De exacte permissienamen volgen het patroon `android.permission.health.READ_...`, dat staat bevestigd voor hartslag en stappen; voor de andere heb ik de naam niet zelf opgezocht.

Werkt het toestemmingsscherm zonder Play Store? De officiële documentatie zegt hier niets over: de pagina's die ik las zijn helemaal geschreven rond publiceren in Google Play, en over sideloads, de toegestane lijst per pakketnaam of testen vóór goedkeuring staat niets. Er is een tekst die zegt dat een gepubliceerde app die nooit toegang aanvroeg, een scherm krijgt "deze app heeft geen toegang tot Health Connect". Dat gaat over Play-apps.

Aanwijzingen dat het buiten Play wel werkt (gemeld, niet officieel): Gadgetbridge wordt via F-Droid en IzzyOnDroid verspreid (de F-Droid-pagina toont versie 0.93.0, 12 augustus 2026) en schrijft sinds versie 0.89.0 naar Health Connect, met gedeclareerde `android.permission.health.*` toestemmingen voor onder meer stappen, slaap en gewicht. Er staan open meldingen over synchronisatiefouten (mei 2026, een validatiefout op hartslagvariatie), maar niet dat de installatieroute de oorzaak zou zijn. Ik vond geen bron die zegt dat Health Connect een niet-Play-app weigert. Eigen afleiding: waarschijnlijk werkt het; een proef van een uur met een debug-APK op jouw telefoon geeft zekerheid.

Bekende problemen (gemeld door gebruikers):
- Issue 253 in `react-native-health-connect` (28 mei 2026): op een Galaxy S26 Ultra met Android 16 (en later bevestigd op een Galaxy A16 met Android 15) geeft `requestPermission()` direct een lege lijst terug zonder scherm en zonder fout, en de app verschijnt niet in de lijst van Health Connect. Vermoedelijke oorzaak, door de melder voorgesteld op 16 juni en niet bewezen in het gesprek: het ontbreken van de Android 14-activiteitsalias voor het privacybeleid. Gesloten op 1 augustus 2026 via een andere wijziging (bundelen van de Expo-module), zonder dat melders op hun toestel bevestigden dat het opgelost was. Samenvatting: zorg dat de rationale-activiteit en de alias echt in het uiteindelijke manifest staan, en test op de eigen Samsung.
- Terra (leverancier van health-SDK's): het toestemmingsvenster verschijnt per toestemming maar één keer; opnieuw proberen vraagt dat je de toestemmingen in Health Connect intrekt of de app opnieuw installeert. Een andere hulppagina meldt dat Health Connect zijn toestemmingsscherm niet opent op een telefoon zonder schermvergrendeling.
- Samsung Health naar Health Connect (ontwikkelaarsforum van Samsung, 2023 tot maart 2025): schrijven gaat niet altijd betrouwbaar als niet alle lees- en schrijfrechten zijn toegestaan; sommige gegevens (afstand) komen niet aan. Dit raakt Samsung Health als bron, niet je Garmin of MacroFactor. Ik vond geen melding specifiek voor Android 16 en Samsung die in 2026 is gepubliceerd.
- Eigen herinnering, onbevestigd: na twee weigeringen van dezelfde toestemming toont Android het venster niet meer en moet je via de instellingen van Health Connect. Ik vond dit niet in de gelezen pagina's. Bouw dus een knop die Health Connect-instellingen opent.

Welke bronnen vullen Health Connect met jouw gegevens? De repo-notitie noemt (Android Police, Tom's Guide) dat Garmin Connect sinds 2025 naar Health Connect schrijft: stappen, trappen, hartslag, hoogtewinst bij trainingen; geen daling, geen RPE, geen Body Battery. MacroFactor kan gewicht naar Health Connect schrijven (MacroFactor-hulpcentrum). Dat heb ik hier niet opnieuw gecontroleerd.

Het privacybeleid zelf: eigen afleiding: ook voor een eigen APK is een kort beleid nodig, want het toestemmingsscherm van Health Connect heeft een link "Privacybeleid" en de plugin leest een bestand (`privacypolicy.html` in de app) of een URL uit `strings.xml`. Eén pagina op GitHub Pages zonder persoonsgegevens volstaat.

---

## 5. Kosten in geld en in werk

Geld, bevestigd of afgeleid:
- Capacitor, Android Studio, Gradle en GitHub Actions voor een openbare repo: gratis. Eigen afleiding.
- Signeersleutel: gratis (een keystore met `keytool`). Bewaren op twee plekken; kwijtraken betekent opnieuw installeren (zonder je gegevens te verliezen als je eerst een back-up maakt) en een nieuw pakket registreren.
- Obtainium: gratis. Auto Blocker op de telefoon uitzetten: gratis.
- Beperkt ontwikkelaarsaccount bij Google: gratis (bevestigd).
- Play-route: 25 dollar eenmalig, plus ID en creditcard, plus formulieren (Health apps, privacybeleid, Data safety).
- Betaalde live-updatedienst: 9 tot 14 dollar per maand (gemeld), maar niet nodig.
- Totaal voor de aanbevolen route: 0 euro.

Werk. Dit is mijn schatting, geen bron. Een "bouwronde" is: een wijziging maken, bouwen, op jouw telefoon installeren en testen.
- Proefschil met Capacitor, `server.url` of gebundeld, een lege melding op een vast tijdstip, installeren met `adb` of Obtainium: 2 tot 3 rondes. Hier beslis je of de route werkt (service worker in WebView, bestandsback-up, opslag-origin, timer met scherm uit en muziek op jouw Samsung).
- Rusttimer netjes in ASCEND: kanaal met geluid en trilling, toestemming voor meldingen en exacte alarmen, controle bij opstarten, uitleg over batterij-instellingen, de bestaande `CountdownTimer` laten schakelen tussen web en native: 2 tot 3 rondes.
- Health Connect: plugin, manifest met rationale en alias, privacypagina, toestemmingsstroom, de gegevens via de bestaande adapter (`src/integrations/types.ts`) in ASCEND krijgen (de notitie beschrijft `engine/activityImport.ts`): 3 tot 4 rondes, mogelijk meer door Samsung-eigenaardigheden.
- Release: GitHub-workflow die een gesigneerde APK op een release zet, Obtainium instellen, overstappen met back-up: 2 tot 3 rondes.
- Samen ongeveer 9 tot 13 rondes voor een eerste bruikbare versie, waarvan de eerste twee tot drie het risico wegnemen. Als de proefschil de timer niet betrouwbaar maakt, stop je daar met weinig verloren.

Onderhoud daarna, eigen afleiding met bronnen waar mogelijk:
- Elk jaar een Android-versie. Capacitor, de Gradle-plugin en JDK volgen elkaar op (bevestigd voor Capacitor 8: API 36, minimaal API 24, JDK 21 volgens derden). Reken op een of twee updates van een paar rondes per jaar. Plugins volgen de Capacitor-hoofdversie; Capgo meldt dat plugin v7 alleen op verzoek wordt onderhouden en v6 of ouder niet meer.
- Target SDK-eisen van Google gelden alleen voor Play. Buiten Play dwingt Google dat niet af; Android weigert wel het installeren van heel oude apps (mijn kennis; niet gecontroleerd). Wie niet via Play gaat, kan een jaar overslaan, maar met Samsung's beleid voor apps die Android 14 als doel hebben (zie 6) is bijwerken verstandig.
- De Garmin Personal API: de sleutel verloopt na maximaal een jaar; je moet een nieuwe maken. Eenmaal per jaar een melding in de app.
- De signeersleutel nooit kwijtraken (bevestigd voor registratie: zonder sleutel kun je je pakketten niet registreren).
- Sinds 31 augustus 2026 is het Play-doel API 36. Volgend jaar waarschijnlijk API 37 (gemeld door een blogpost, Google's pagina noemt 2027 niet).

---

## 6. Gevaren en kanttekeningen

Dubbele producten en gegevens op twee plekken. Bevestigd (CLAUDE.md van de repo): logs zijn append-only en alle gegevens zijn lokaal. Eigen afleiding: PWA in Edge en de app hebben elk hun eigen IndexedDB. Log je op beide, dan zijn er twee verschillende logboeken die je niet meer mooi samenvoegt. Overstappen is dus eenmalig: back-up exporteren, importeren in de app, daarna de PWA niet meer gebruiken (liefst van het beginscherm halen). Houd de oude PWA tijdelijk als noodoptie, niet als tweede logboek.

Dezelfde code, twee schillen. Met `server.url` draait de app altijd dezelfde code als de site. Dat is een voordeel. Het nadeel: een kapotte deploy raakt meteen ook de app.

Privacy. Alles blijft op je toestel; er komt geen server bij. Health Connect-gegevens gaan niet de deur uit. De Garmin-sleutel moet je in de lokale instellingen bewaren (net als de intervals.icu-sleutel nu). De repo is openbaar: geen sleutel, geen keystore, geen identificerende gegevens in de repo. Voor de CI-signing kunnen de keystore en wachtwoorden als GitHub-geheimen staan; dat is gebruikelijk maar vraagt zorg met workflows van forks (eigen afleiding).

Samsung en de accu. Gemeld (dontkillmyapp.com, Samsung): Samsung gaat het agressiefst met achtergrondwerk om. Genoemd: "Put unused apps to sleep" (standaard na 3 dagen niet geopend, alarmen stoppen), de lijsten Sleeping en Deep sleeping, Adaptive battery en Auto-disable unused apps. Een update van juli 2024 citeert een toezegging van Samsung om niet-standaard optimalisaties te laten vallen vanaf One UI 6.0 voor apps die Android 14 als doel hebben; de schrijver vroeg om meldingen om dat te bevestigen. Een weigerende Samsung zorgt dus vooral voor rusttimers die uitblijven als de app drie dagen niet is geopend, wat voor een trainingsapp niet vaak gebeurt. Eigen afleiding: zet de app in "Geen beperkingen" voor batterijgebruik en neem een korte uitleg in de app op. Voeg een zelftest toe ("Test de rusttimer: pieptoon na 10 seconden met scherm uit") zodat je vooraf weet of het werkt.

Betrouwbaarheid van de timer. Bevestigd: exacte alarmen zijn de officiële weg. Gemeld: er zijn vertragingen van minuten. Eigen afleiding: een gemiste timer in de sportschool is vervelend maar niet gevaarlijk. Houd de timer in de PWA dus altijd als terugval (de interface moet in elk geval op het scherm laten zien hoeveel tijd er over is, op basis van een eindtijd).

Als het project stopt. Eigen afleiding: bij gebundelde code blijft de app gewoon werken zolang Android hem draait; alles is lokaal, er is geen server nodig. Bij `server.url` hangt de app aan GitHub Pages en jouw repo; verdwijnt die, dan start de app niet meer, behalve met de gecachte service worker. De back-up in JSON blijft leesbaar. Een app die jaren niet is bijgewerkt, kan door een toekomstige Android-versie of de verificatie in 2027 lastig te installeren worden (zie 3), maar is dan niet verdwenen. Als Google de verificatie later tot directe sideloads uitbreidt, zijn je opties: een geregistreerd beperkt account, de advanced flow of ADB.

Contradictie in de eigen notities. De repo-notitie "Data zonder handwerk" zei dat de Garmin Personal API net die dag was gelanceerd en dat Garmin browserverzoeken weigerde. De lancering is bevestigd (zie 1.6). Het weigeren van browserverzoeken heb ik niet kunnen nalopen en de Garmin-pagina noemt CORS niet; een korte test met een echte sleutel in de browser lost dat op.

---

## 7. Advies en tussenoplossingen in de PWA

### 7.1 Vooraf: heb je de rusttimer van ASCEND nodig?

Bevestigd (MacroFactor, maandbericht februari 2026, versies 1.1.1 tot 1.1.3): "Je krijgt nu rusttimermeldingen, ook als je telefoon op stil staat of muziek speelt, zodat je de volgende set niet mist." Live Activities voor het vergrendelscherm zijn alleen voor iOS en nog niet uit. Het bericht zegt niets over Android en niet of de melding komt met het scherm uit en de app gesloten. Je legt kracht in MacroFactor vast (zie de beslissing "MacroFactor is leidend voor kracht"). Als je ook de sets daar uitvoert, kun je de timer daar proberen. Test: 90 seconden rust, scherm uit, YouTube of muziek aan. Als dat werkt, is de rusttimer in ASCEND niet nodig.

Bevestigd (Garmin Forerunner 255, handleiding, strength-training): bij het activiteitstype Kracht sluit je een set af met BACK, krijg je na enkele seconden een rusttimer, en start je de volgende set met BACK. Een gemelde ervaring in het Garmin-forum (bericht van ruim drie jaar geleden, geen precieze datum) zegt dat de FR255 trilt en een boodschap laat zien wanneer de rust bijna om is. Een officiële instelling voor rustduur of een signaal heb ik niet gevonden. Het HIIT-timerscherm van de FR255 (AMRAP, EMOM, Tabata, Aangepast met zelf in te stellen beweegtijd, rusttijd, aantal bewegingen en rondes) bestaat volgens de handleiding; of het signaleert, staat er niet. Een trilling aan de pols is onafhankelijk van muziek en van je telefoon, en je draagt het horloge toch al. Betrouwbaarheid: hoog voor trillen aan de pols, als je dit instelt en één keer test; geen koppeling met ASCEND.

### 7.2 Wat de PWA zelf kan, met eerlijke betrouwbaarheid

Ik heb dit niet kunnen testen. Wat ik las en wat ik afleid:

Notification Triggers (meldingen op een tijdstip, `showTrigger`): bevestigd dood. De pagina van Chrome opent met: "De ontwikkeling van de Notification Triggers API ... is beëindigd" omdat het niet duidelijk was dat ze op alle platformen consistente en betrouwbare ervaringen konden bieden. Niet gebruiken.

Web Push met een service worker: past niet. Dat vraagt een server die de push op het goede moment verstuurt. ASCEND heeft geen backend (CLAUDE.md), en een timer die een server nodig heeft is geen oplossing.

Een stil geluidsspoor met Media Session: tijdelijk uitstel van het bevriezen van de pagina. Bevestigd (Chrome Developers, "Media notifications", 2015): Chrome toont een mediamelding voor audio- of videomedia, alleen langer dan vijf seconden en niet voor Web Audio zonder audio-element. Gemeld (Chromium-ontwikkelaar, blink-dev; npm-pakket silent-audio): pagina's die geluid afspelen worden niet door timerbegrenzing getroffen, en stil geluid wordt als achtergrondtruc gebruikt. Dat dat op Chrome voor Android met het scherm uit werkt, vond ik niet bevestigd. Een gebruikersbericht meldt dat Android JavaScript in browsers pauzeert als het scherm uitgaat. Eigen afleiding en gevaarlijk: een eigen mediasessie met een stil spoor kan de muziek of video die je afspeelt onderbreken of de bediening van het vergrendelscherm overnemen, omdat Android maar één app tegelijk de geluidsfocus geeft. Voor jouw situatie (muziek of video aan) is dit juist de verkeerde truc. Ik raad het af. Betrouwbaarheid: laag tot onbekend.

Wake Lock (scherm aan houden): bevestigd (MDN, Screen Wake Lock API, aangepast 11 september 2026, Baseline sinds maart 2025): houdt het scherm aan (en ook niet dimmen of vergrendelen); wordt automatisch losgelaten als het document niet zichtbaar is, en moet dan opnieuw worden gevraagd; het systeem kan het loslaten bij een lage accu of spaarstand. Eigen afleiding: dit is de betrouwbaarste truc binnen de PWA. De pagina blijft zichtbaar, dus de timer blijft lopen, het geluid en het trillen werken, en de muziek loopt gewoon door. Nadelen: accu, het scherm brandt in je zak of op de bank (aanraakfouten), en het helpt niet als je ASCEND verlaat. Voor een training van een uur is dat te doen; zet het alleen aan terwijl de rusttimer of de krachtlogger open staat.

Een tijdsgebonden timer: de huidige `CountdownTimer` (`src/components/CountdownTimer.tsx`) telt per `setInterval` van 1 seconde af (`remaining - 1`). Als de browser de timer vertraagt of bevriest, loopt hij achter en gaat het alarm te laat af. Eigen afleiding: een eindtijd (`Date.now() + seconden`) opslaan, bij elke tik de rest uitrekenen en bij `visibilitychange` meteen controleren of de tijd om is, maakt hem juist. Dat is een kleine wijziging en een echte verbetering, ook zonder app.

Systeemtimer via een intent-link: Android heeft `ACTION_SET_TIMER` met `EXTRA_LENGTH` en `EXTRA_SKIP_UI` (bevestigd, Android-documentatie) en een app die dit aanroept heeft de toestemming `SET_ALARM` nodig. Een browser heeft die toestemming niet. Eigen afleiding: een `intent:`-link vanuit Edge zal waarschijnlijk niet werken; ik vond geen voorbeeld waarin dat werkt en heb het niet getest. De handmatige variant, de tijd zelf in de Samsung Klok-timer zetten, is wel altijd betrouwbaar.

Eerlijk eindoordeel voor de PWA: met Wake Lock en een eindtijd-gebaseerde timer is een rusttimer "goed genoeg" zolang het scherm aan blijft, dus waarschijnlijk 95 procent van wat je wilt, zonder schil. Wat je niet krijgt in de PWA is een piep met het scherm uit en de app op de achtergrond. Dat laatste kan alleen een native alarm.

### 7.3 Aanbevolen stappen

Stap 0, vandaag, geen code. Test MacroFactors rusttimer met het scherm uit en muziek aan op je Samsung. Controleer op de FR255 of de rust-trilling bij Kracht aan staat. Bij een goed resultaat is de rusttimer opgelost.

Stap 1, klein en in de PWA. Maak `CountdownTimer` eindtijd-gebaseerd, voeg een optie "Scherm aan houden tijdens rust" toe met Wake Lock, en laat de timer bij `visibilitychange` bijwerken. Kosten: 1 tot 2 rondes. Dit helpt ook als je later de schil toch bouwt, omdat het de terugval wordt.

Stap 2, alleen als stap 0 en 1 niet genoeg zijn of als je Health Connect echt wilt. Bouw een proefschil met Capacitor (2 tot 3 rondes) met één knop "Meldingstest" en één knop "Health Connect-toestemming". Controle: komt de melding op tijd met scherm uit, terwijl muziek speelt, ook na tien minuten stilliggen? Verschijnt het Health Connect-toestemmingsscherm met een handmatig geïnstalleerde APK op jouw Android 15 of 16? Zo niet, stop.

Stap 3, installatieroute. Bouw een GitHub Actions-workflow die op een tag een gesigneerde APK bouwt en op een GitHub Release zet. Installeer Obtainium, zet Auto Blocker uit, voeg de repo toe. Kies voor de webcode eerst `server.url`; als de service worker in de WebView niet naar behoren offline werkt, schakel over op gebundelde code met `@capgo/capacitor-updater` in handmatige modus.

Stap 4, overstap. Exporteer een back-up uit de PWA, importeer in de app, controleer de aantallen, haal de PWA van het beginscherm. Houd de back-up op twee plekken.

Stap 5, later. Registreer het pakket in een gratis beperkt ontwikkelaarsaccount zodra verificatie voor jou nadert. Overweeg de Garmin Personal API alleen als intervals.icu tegenvalt.

Wat het oplevert: een rusttimer die ook met het scherm uit meestal op tijd afgaat, gewicht, stappen en trappen zonder handwerk, automatische updates van de web- en (via Obtainium) de native laag. Wat het niet oplevert: daling, RPE en Body Battery uit Health Connect (staan niet in de Garmin-export naar Health Connect volgens de repo-notitie), een garantie tegen Samsungs accu-beleid, of een Play Store-vermelding. Het kost naar schatting 9 tot 13 bouwrondes en daarna een paar rondes per jaar onderhoud.

---

## 8. Wat onzeker blijft

- Of Health Connect een handmatig geïnstalleerde APK overal een toestemmingsscherm laat tonen op Samsung met Android 15 en 16. Aanwijzing ja (Gadgetbridge), geen officiële bevestiging, en gemelde fouten (issue 253) door een ontbrekende alias.
- Of de Capacitor-plugin Local Notifications met `SCHEDULE_EXACT_ALARM` of `USE_EXACT_ALARM` op jouw Samsung met scherm uit en muziek aan op tijd afgaat, en of de 9-minutenregel van `allowWhileIdle` meespeelt.
- Of plugins werken als de WebView een externe URL laadt (`server.url`), en of de service worker daar offline blijft werken.
- Of `showDirectoryPicker` in de WebView werkt.
- Hoe de verificatie in 2027 voor directe sideloads in Nederland uitpakt, en hoe de 20-toestelregel van het beperkte account in de praktijk werkt.
- Of de interne testtrack van Play het formulier "Health apps" en het testerseis overslaat.
- Of Obtainium op Android 14 en 16 echt zonder tik bijwerkt.
- Of de Garmin Personal API browserverzoeken toestaat, welke velden hij geeft (hoogte, daling) en welke limieten gelden.
- Of de MacroFactor-rusttimermelding op Android en met het scherm uit werkt.
- Een Garmin-forumbericht over rust-trilling is anoniem en oud; een officiële instelling voor de FR255 vond ik niet.

---

## Bronnen

Elk met titel, datum (waar bekend) en link. De label tussen haakjes: officieel, gemeld, of afgeleid uit de documentatie.

Ontwikkelaarsverificatie
- Android Developers, "Developer verification: frequently asked questions", bijgewerkt 30 september 2026 (officieel). https://developer.android.com/developer-verification/guides/faq
- Android Developers Blog, "Android developer verification", juni 2026 (officieel). https://android-developers.googleblog.com/2026/06/android-developer-verification.html
- 9to5Google, "Google gradually rolling out Android's advanced sideloading ahead of developer verification", 18 augustus 2026 (pers). https://9to5google.com/2026/08/18/google-gradually-rolling-out-androids-advanced-sideloading-ahead-of-developer-verification/
- Wikipedia, "Keep Android Open", 2026 (derde partij, over kritiek). https://en.wikipedia.org/wiki/Keep_Android_Open
- F-Droid forum, "Google will require developer verification to install Android apps, including sideloading" (gebruikers, meningen). https://forum.f-droid.org/t/google-will-require-developer-verification-to-install-android-apps-including-sideloading/33123

Alarmen, meldingen en Capacitor
- Android Developers, "Schedule alarms: exact alarm permissions", bijgewerkt 21 oktober 2026 (officieel). https://developer.android.com/develop/background-work/services/alarms/schedule
- Capacitor, "Local Notifications API" (officieel, huidige versie). https://capacitorjs.com/docs/apis/local-notifications
- Capacitor, "Configuration" (server.url, cleartext, androidScheme, hostname) (officieel). https://capacitorjs.com/docs/config
- Capacitor, "Storage" gids (officieel). https://capacitorjs.com/docs/guides/storage
- Capacitor, "Setting Android target SDK" en "Updating plugins to 8.0" (officieel). https://capacitorjs.com/docs/updating/plugins/8-0
- Ionic Forum, "(Android) Ionic local notifications are not delivered on time" en "Delay in receiving local notifications" (gemeld). https://forum.ionicframework.com/t/android-ionic-local-notifications-are-not-delivered-on-time/238986
- ionic-team/capacitor-plugins, issue 1795, "The Local Notification doesn't runs in Doze mode, when display is turned off", gesloten 26 februari 2026 (gemeld). https://github.com/ionic-team/capacitor-plugins/issues
- Chrome Developers, "Trusted Web Activities, overview" (officieel). https://developer.chrome.com/docs/android/trusted-web-activity/overview
- Android Developers, "Common intents: create a timer" (ACTION_SET_TIMER) (officieel). https://developer.android.com/guide/components/intents-common
- MDN browser-compat-data, `Window.showDirectoryPicker` (derde partij, gegevensbestand). https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Window.json

Live-updates
- Capawesome, "The right way to update your Capacitor app remotely", 25 september 2026 (leverancier). https://capawesome.io/blog/the-right-way-to-update-your-capacitor-app-remotely
- Capawesome, "Best OTA update tools for Capacitor", 14 augustus 2026, prijzen gecontroleerd 18 september 2026 (leverancier). https://capawesome.io/blog/best-ota-update-tools-for-capacitor/
- Capgo, "Best live update tools for Capacitor apps", 22 oktober 2026 (leverancier). https://capgo.app/blog/best-live-update-tools-for-capacitor-apps/
- Cap-go/capacitor-updater, README (MPL-2.0) (leverancier). https://github.com/Cap-go/capacitor-updater
- Google Play Help, "Device and Network Abuse" (officieel). https://support.google.com/googleplay/android-developer/answer/9888379

Health Connect
- Android Developers, "Get started with Health Connect" (officieel). https://developer.android.com/health-and-fitness/health-connect/get-started
- Android Developers, "Publish your health app on Google Play" / Health apps declaration (officieel). https://developer.android.com/health-and-fitness/health-connect/publish
- Google Play Help, "Health Connect permissions" (officieel). https://support.google.com/googleplay/android-developer/answer/12991134
- GitHub, matinzd/react-native-health-connect, issue 253, 28 mei 2026 tot 1 augustus 2026 (gemeld). https://github.com/matinzd/react-native-health-connect/issues/253
- Terra docs, "Health Connect permission dialog once" (leverancier). https://docs.tryterra.co/faq/help-topics/connecting/apple-health-health-connect-and-mobile-sdk/health-connect-permission-dialog-once
- Samsung Developer Forum, "Syncing data is unreliable between Samsung Health and Health Connect" (gemeld). https://forum.developer.samsung.com/t/syncing-data-is-unreliable-between-samsung-health-and-health-connect/24850
- Gadgetbridge, "Release 0.89.0" en F-Droid-pagina (versie 0.93.0, 12 augustus 2026) (open-sourceproject). https://gadgetbridge.org/blog/release-0_89_00/ en https://f-droid.org/packages/nodomain.freeyourgadget.gadgetbridge/
- Capgo, `@capgo/capacitor-health` README, versie 8.7.0 (leverancier). https://cdn.jsdelivr.net/npm/@capgo/capacitor-health@8.7.0/README.md
- Capawesome, "Announcing the Capacitor Health plugin", 19 oktober 2026 (op de pagina staat ook 26 augustus 2026; datum onzeker) (leverancier). https://capawesome.io/blog/announcing-the-capacitor-health-plugin/
- MacroFactor-hulpcentrum, "Connect Health Connect, Apple Health or Fitbit" (leverancier; via de repo-notitie, niet opnieuw gelezen). https://help.macrofactorapp.com/en/articles/65-connect-health-connect-apple-health-or-fitbit

Distributie en Google Play
- Google Play Help, "Create a Play Console developer account" (officieel). https://support.google.com/googleplay/android-developer/answer/6112435
- Google Play Help, "App testing requirements for new personal developer accounts" (officieel). https://support.google.com/googleplay/android-developer/answer/14151465
- Google Play Help, "Set up an open, closed, or internal test" (officieel). https://support.google.com/googleplay/android-developer/answer/9845334
- Android Developers, "Target API level requirements for Google Play apps", bijgewerkt 16 oktober 2026 (officieel). https://developer.android.com/google/play/requirements/target-sdk
- Obtainium, GitHub-repo (GPL-3.0) (open-sourceproject). https://github.com/ImranR98/Obtainium
- F-Droid, "This Week in F-Droid" (over onbewaakte updates en Obtainium 1.20.0-alpha1), 2024 (open-sourceproject). https://f-droid.org/2024/04/18/twif.html
- Android Open Source Project, "Configure and handle update ownership for apps" (officieel). https://source.android.com/docs/setup/create/app-ownership
- AdGuard Knowledge Base, "How to disable the Samsung Auto Blocker feature" (leverancier, 2024 en later). https://adguard.com/kb/adguard-for-android/solving-problems/auto-blocker/

Samsung en timers in de browser
- dontkillmyapp.com, "Samsung" (gemeld; update juli 2024). https://dontkillmyapp.com/samsung
- Chrome Developers, "Notification Triggers API", 24 oktober 2019 (officieel; ontwikkeling beëindigd). https://developer.chrome.com/docs/web-platform/notification-triggers
- Chrome Developers, "Media notifications for Chrome on Android", 20 juli 2015 (officieel). https://developer.chrome.com/blog/media-notifications
- Chromium blink-dev, "Intent to Ship: Expensive Background Timer Throttling" (gemeld door ontwikkelaar). https://groups.google.com/a/chromium.org/d/msg/blink-dev/XRqy8mIOWps/Btb4o__1AQAJ
- MDN, "Screen Wake Lock API", aangepast 11 september 2026 (officieel). https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
- MacroFactor, "Rest Timer Updates, Expanded Cardio Support, And Workout Nutrition Insights", februari 2026 (leverancier). https://macrofactor.com/mm-feb-2026/

Garmin
- Garmin Developers, "Garmin Connect Personal API FAQ" (officieel). https://developer.garmin.com/gc-developer-program/personal/personal-faq/
- Garmin Developers, "Garmin Connect Developer Program overview" (officieel). https://developer.garmin.com/gc-developer-program/overview
- DC Rainmaker, "Garmin Revamps and Opens Up Connect Developer API Program: All the Details", 21 oktober 2026 (pers). https://www.dcrainmaker.com/2026/10/garmin-connect-api-revamps-connect-developer.html
- Gadgets and Wearables, "Garmin gives users their own Connect API access", 21 oktober 2026 (pers). https://gadgetsandwearables.com/2026/10/21/garmin-connect-personal-api-health-data-access/
- the5krunner, "Garmin Freezes Developer API Months After Strava Lawsuit", 14 september 2026 (pers). https://the5krunner.com/2026/09/14/garmin-developer-api-access-paused/
- Tredict, "Garmin Personal API reads your current activities but does not send workouts from ChatGPT to your watch" (leverancier). https://www.tredict.com/blog/garmin_personal_api_chatgpt_and_claude/
- Garmin, "Forerunner 255 Series Owner's Manual: Recording a Strength Training Activity" en "HIIT Timers" (officieel). https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-CF2D7922-A1AC-4510-9480-E7CE8119EAF2.html
- Garmin Forums, "Strength training: set an alarm for rest time", Forerunner 255 Series (gemeld, zonder exacte datum, ruim drie jaar oud). https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/332854/strength-training-set-an-alarm-for-rest-time

In de repo gelezen (alleen lezen, niets gewijzigd)
- `CLAUDE.md`, `docs/visie/Data zonder handwerk.md` (idee 5), `docs/beslissingen/2026-10-22-trainingen-naar-horloge.md`, `docs/beslissingen/2026-10-22-macrofactor-leidend-voor-kracht.md`, `src/components/CountdownTimer.tsx`, `src/utils/haptics.ts`, `vite.config.ts`.
