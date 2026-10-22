# Uitbreidingen voor ASCEND: kracht op de Garmin, een Galaxy Watch-app, een eigen server en de weegschaal

Onderzoek van 22 oktober 2026. Gelezen vooraf: CLAUDE.md, docs/onderzoek/Android-app.md en docs/visie/Data zonder handwerk.md. Er is niets in de repo gewijzigd.

Zo lees je dit rapport. Elke bewering heeft een van drie labels. "Bevestigd" betekent dat de maker of een officiële pagina het zegt (Google, Android, Garmin, Cloudflare, het openScale-project). "Gemeld" betekent dat gebruikers, forums of derden het melden en dat het dus niet officieel is. "Eigen afleiding" betekent dat ik het zelf uit het bovenstaande heb afgeleid en dat het op jouw toestel getest moet worden. Wat ik niet kon vinden, staat er ook bij. Bij elke bron staan titel, datum en link. Prijzen in dollars zijn de prijzen op de officiële pagina van de leverancier; een euro-omrekening laat ik achterwege. Bouwrondes zijn schattingen van mij, geen bronnen. Een ronde is: een wijziging maken, bouwen, op jouw toestel zetten en testen.

De belangrijkste vondsten vooraf, omdat ze het advies sturen:

- Een krachtworkout met sets, herhalingen en oefeningnamen sturen vanuit intervals.icu naar de Forerunner 255 kan nu niet. Wat wel kan is een workout van tijdsblokken met rustblokken. Dat is gemeld als werkend, maar niet officieel.
- Web Push in Edge op Android is volgens meldingen van december 2025 tot februari 2026 stuk: de browser geeft een nepadres terug waar niets heen gestuurd kan worden. In Chrome op Android werkt dezelfde code. Een server voor een rusttimer met meldingen heeft dus een andere browser nodig dan Edge.
- Voor het gewicht is de makkelijkste route waarschijnlijk geen nieuwe Bluetooth-code: de weegschaal praat al met Fitdays, Fitdays kan naar Samsung Health, en MacroFactor leest Health Connect.

---

## Vraag 1. Krachttraining met rusttijden op de Garmin via intervals.icu

### 1.1 Wat bevestigd is

Bevestigd (Garmin, handleiding Forerunner 255, pagina Interval Workouts): bij intervaltrainingen op het horloge kun je met BACK op elk moment de huidige interval of rustperiode stoppen en doorgaan naar de volgende. Rustduur en type stel je in met "Rest". Er staat geen tekst over tonen of trillingen bij de overgang op die pagina.

Bevestigd (Garmin, handleiding Forerunner 255, geraadpleegd 22 oktober 2026; zie ook mijn eerdere rapport Android-app.md, punt 7.1): bij het activiteitstype Kracht sluit je een set af met BACK, krijg je na enkele seconden een rusttimer, en start je de volgende set met BACK. Een officiële instelling voor rustduur met signaal vond ik niet.

Bevestigd (intervals.icu, forumgids "Workout Builder Syntax Quick Guide", R2Tom, 3 maart 2026): de bouwer kent tijdsduren (`10m`, `90s`, `5'`, `30"`), doelen op vermogen, hartslag en tempo, herhalingen (`4x` als kopregel of los, geen geneste herhalingen), vrije tekst vóór de eerste duur als stapaanwijzing, en `m` betekent minuten. In de gids staat niets over krachtoefeningen, herhalingen of gewicht.

Bevestigd (intervals.icu, forumdraad "Workout Builder - Garmin - Recovery/Rest Interval step", 2022 tot 16 december 2023): sinds december 2023 kun je de stapsoort expliciet zetten met `intensity=` achter de stap, bijvoorbeeld `60m Z2 intensity=active`. Er is ook een keuzelijst in het dialoogvenster "stap toevoegen" met de FIT-waarden (active, rest, warmup, cooldown, recovery, interval, other). Voor 2023 stuurde intervals.icu rust als "interval", waardoor het horloge geen rust aankondigde.

### 1.2 Wat gebruikers melden over krachtworkouts

Gemeld (intervals.icu-forum, "Advanced Strength Workout Builder", bericht van flemes, 27 september 2026): geplande krachtworkouts komen op het horloge aan als tijdstappen, "Go 0:40, Go 1:30", zonder oefening, herhalingen of gewicht. Hij probeerde drie wegen via de API: tekstsyntaxis met herhalingen (stappen zonder duur vallen weg), `workout_doc` met oefening, herhalingen en gewicht (wordt opgeslagen maar door de Garmin-export genegeerd) en een FIT-bestand als event (wordt omgezet naar tijdstappen, oefeninfo gaat verloren). Een Garmin-FIT met duurtype REPS wordt gelogd als niet-ondersteund en de stap wordt weggelaten. Er is geen antwoord van de ontwikkelaar (David) in de draad; laatste bericht 14 oktober 2026.

Gemeld (intervals.icu-forum, "Strength workouts", Tushar_Bhangale, 27 juli 2025): een krachtworkout met oefeningnamen, sets, herhalingen en rust verschijnt op Garmin alleen als notitie. Enig antwoord: "I don't believe so."

Gemeld (intervals.icu-forum, "Advanced Strength Workout Builder" pagina 1, 11 november 2025 tot 23 juni 2026, en "Strength Training Feature Set", 30 oktober 2025 tot 21 juni 2026): beide zijn open verzoeken om een echte krachtbouwer. Geen toezegging of tijdlijn van de ontwikkelaar. Een gebruiker zegt dat intervals.icu's parser krachtworkouts "niet begrijpt".

Gemeld (intervals.icu-forum, "Bodyweight / Strength workout syntax for Garmin sync", Mirabilio, 3 januari 2026, met reacties tot 20 september 2026): er bestaat geen documentatie voor een tekstsyntaxis voor kracht die naar Garmin synchroniseert.

Gemeld, en het enige wat wel werkt (intervals.icu-forum, "How to build a weight training workout", FoHo, 14 oktober 2025): voor TRX-training bouwde hij workouts met tijdsblokken in intervals.icu. Na synchronisatie met Garmin Connect biedt het horloge "Today's Workout" aan onder Activiteit starten, Kracht, en het loopt de stappen door zoals bij fietsen. Hij zegt ook dat Garmin-Connect-workouts waarin je op Lap moet drukken om door te gaan, door intervals.icu volgens hem niet worden ondersteund. Welk horlogemodel hij heeft, staat er niet.

Gemeld (intervals.icu-forum, "Garmin Workout Steps & Notes from Intervals.icu", sylle, 11 februari 2026): notities per stap komen op het Garmin-horloge. Dezelfde draad (12 februari 2026, ohmax): bij FIT-bestanden worden werk en rust soms verkeerd herkend.

Gemeld (intervals.icu-forum, "Lap button usage", 30 januari tot 5 februari 2026, en "'Press lap': workout builder to Garmin Edge 530", 17 juni 2022 en 7 oktober 2025): een stap die pas eindigt als je op Lap drukt kan met een tekst als "Press lap" voor de duur, en er is een duur nodig. David zei in 2022 "uit het hoofd" dat de stap eindigt op de lap-druk en niet op de tijd. Op een Edge 530 verschenen de lap-stappen wel in Garmin Connect maar niet op het apparaat. Dit is dus niet betrouwbaar voor jou; ik vond geen bevestiging voor de Forerunner 255.

Gemeld (intervals.icu-forum, "Garmin planned workout sync", 16 en 17 juli 2026): intervals.icu gebruikt twee aparte Garmin-ontwikkelaarsapps, een voor activiteiten en gezondheid en een voor geplande trainingen. De ene kan werken terwijl de andere uitvalt. In dezelfde periode (forumdraad "Garmin connect updates", 31 juli 2026) meldt een gebruiker dat aanpassingen in geplande workouts wel in Garmin Connect komen maar niet altijd op het horloge; hernoemen of dupliceren helpt soms. Een eerder gemelde fout over tempodoelen is in juli 2026 verholpen (draad "Structured running workouts from intervals to Garmin Connect", 17 tot 20 juli 2026). Dat is belangrijk omdat jouw loopjes via dezelfde weg gaan: het mechanisme werkt, maar is gevoelig.

Gemeld, een uitweg buiten intervals.icu (the5krunner, "Fit File Forge: 120 classic workouts ready for Garmin", 30 september 2026, en intervals.icu-forum, "Fit File Forge", 2026): een gratis hulpmiddel van een derde maakt Garmin-workouts uit gewone tekst en stuurt ze naar Garmin Connect. Een gebruiker (FoHo, 3 augustus 2026) meldt dat een kopie van een intervals.icu-krachtworkout daar "uitstekend" liep op een Vivoactive 6. De bronnen zeggen niet hoe oefeningen, sets en rust precies worden afgebeeld. Het vraagt dat je je Garmin-account koppelt aan een dienst van een derde; dat past slecht bij de regel van ASCEND dat alles lokaal blijft (eigen afleiding).

### 1.3 Wat de Forerunner 255 doet bij rust

Gemeld (Garmin-forum, "Strength training: set an alarm for rest time", Forerunner 255-subforum, "meer dan 3 jaar geleden", exacte datum niet getoond): een gebruiker zegt dat de FR255 trilt en een bericht toont als de rust bijna om is. Een andere gebruiker stelde in een Garmin-Connect-workout een rust van 30 seconden in en voelt een trilling bij ongeveer 30 seconden. Er is geen menupad genoemd. Een derde vroeg om een echte rustwekker en kreeg alleen het metronoom als alternatief genoemd.

Gemeld (Garmin-forum, "How do I get notifications for each step of the workout", Forerunner 245, "meer dan 5 jaar geleden"): bij workouts klinkt vijf seconden voor de ronde een pieptoon (te zacht, zegt de schrijver) en trilt het horloge bij de ronde, als je onder Systeem, Geluid de tonen en trillingen aan hebt staan. Dat is een ander model dan de jouwe.

Gemeld (Garmin-forum, "Make Workout Alerts Louder?", Forerunner 255, "meer dan 4 jaar geleden"): de waarschuwingen tijdens HIIT-workouts zijn erg zacht als er muziek via een koptelefoon speelt. De muziek wordt zachter als er een melding komt, maar de melding blijft moeilijk te horen. Garmin Support zou gezegd hebben dat het zo bedoeld is. Er is geen oplossing in de draad; trilling is zwak genoemd, maar ook dat staat er niet als oplossing.

Gemeld (Garmin-forum, FR255 firmware 20.26, via zoekresultaat): herhaalde trillingen stoppen sinds die firmware na zes keer.

Eigen afleiding: of er muziek op het horloge zelf (alleen bij de Music-uitvoering) of op de telefoon speelt, is niet bekend. Bij muziek op de telefoon grijpt het horloge niet in; de trilling aan de pols is dan onafhankelijk van de muziek. Bij muziek op het horloge via een koptelefoon zakt de muziek bij een melding en is de piep zacht. Trilling is in beide gevallen het veiligste signaal. Test dit op jouw horloge met een proefworkout van twee stappen (werk 10 seconden, rust 10 seconden) met muziek aan.

### 1.4 Wat je dus in de bouwer kunt doen

Eigen afleiding, samengesteld uit bovenstaande voorbeelden en nog niet door mij op een horloge geprobeerd. De variant zonder oefeningnamen op het horloge, alleen met tijdsblokken, ziet er in de intervals.icu-tekst ongeveer zo uit:

    Kracht onderlichaam A

    Squat 3x
    - Squat set 45s
    - Rust 2m intensity=rest

Wat er dan op het horloge verschijnt (eigen afleiding uit de gemelde beperkingen): stappen met een duur en een stapnaam of notitie ("Squat set", "Rust"), niet de oefeningen met herhalingen en gewicht als eigen velden. De rust van twee minuten telt af en het horloge kondigt het einde aan met de standaardtoon en trilling. Eén risico dat uit de gemelde problemen volgt: cijfers in de vrije tekst voor de duur ("Squat 8 herhalingen 45s") kunnen door de parser voor een duur worden aangezien. Houd de stapnaam zonder cijfers of zet de tekst in de lijnnotitie. Een tweede risico: de werkstap heeft een vaste duur, terwijl een set van jou "tot ik klaar ben" duurt. Kies een ruime duur (bijvoorbeeld 60 seconden) en sla de stap over met BACK, dan begint de rust meteen. Of op de FR255 BACK in een workout-stap de stap overslaat, staat in de handleiding bij intervaltrainingen; voor losse stappen van een geplande workout heb ik het niet apart bevestigd gezien.

Een tweede variant is de workout als gewone cardio-workout (type Run of Ride in intervals.icu) in plaats van type kracht: dan loopt zij zeker via dezelfde route als jouw loopjes, maar je hebt dan geen krachtactiviteit in Garmin en de training telt als iets anders in Garmin Connect. De FoHo-melding hierboven zegt dat WeightTraining-events bij hem onder Activiteit Kracht verschenen, dus eerst dat proberen (eigen afleiding).

Wat het niet oplevert: oefeningnamen met herhalingen en gewicht op het horloge (niet mogelijk, zie 1.2), of een koppeling terug met ASCEND (de set-registratie blijft in MacroFactor).

### 1.5 Bekende beperkingen, samengevat

- Geen sets, herhalingen of gewicht als veld; alleen tijdstappen en tekst (gemeld, september 2026).
- Stappen zonder duur vallen weg (gemeld, september 2026).
- Lap-knop-stappen zijn onbetrouwbaar (gemeld).
- Synchronisatie van geplande workouts kan haperen aan de kant van Garmin of intervals.icu (gemeld, juli 2026).
- Elke wijziging in een bestaande workout kan het horloge later bereiken dan Garmin Connect (gemeld, juli 2026).
- De ontwikkelaar heeft op geen enkel verzoek een tijdlijn gegeven (bevestigd door het ontbreken in de draden).

### Bronnen vraag 1

- intervals.icu-forum, "Bodyweight / Strength workout syntax for Garmin sync", 3 januari tot 20 september 2026: https://forum.intervals.icu/t/bodyweight-strength-workout-syntax-for-garmin-sync/118740
- intervals.icu-forum, "Strength workouts" (Bug Reports), 27 juli 2025: https://forum.intervals.icu/t/strength-workouts/109555
- intervals.icu-forum, "Advanced Strength Workout Builder", 11 november 2025 tot 14 oktober 2026: https://forum.intervals.icu/t/advanced-strength-workout-builder/115495 en pagina 2: https://forum.intervals.icu/t/advanced-strength-workout-builder/115495?page=2
- intervals.icu-forum, "Strength Training Feature Set", 30 oktober 2025 tot 21 juni 2026: https://forum.intervals.icu/t/strength-training-feature-set/114622
- intervals.icu-forum, "How to build a weight training workout", 25 september 2023 tot 14 oktober 2025: https://forum.intervals.icu/t/how-to-build-a-weight-training-workout/50092
- intervals.icu-forum, "Workout Builder Syntax Quick Guide", 3 maart 2026: https://forum.intervals.icu/t/workout-builder-syntax-quick-guide/123701
- intervals.icu-forum, "Workout Builder - Garmin - Recovery/Rest Interval step", 13 september 2022 tot 16 december 2023: https://forum.intervals.icu/t/workout-builder-garmin-recovery-rest-interval-step/19540
- intervals.icu-forum, "Garmin Workout Steps & Notes from Intervals.icu", 10 februari tot 2 september 2026: https://forum.intervals.icu/t/garmin-workout-steps-notes-from-intervals-icu/121993
- intervals.icu-forum, "Lap button usage", 30 januari tot 5 februari 2026: https://forum.intervals.icu/t/lap-button-usage/121072
- intervals.icu-forum, "'Press lap': workout builder to Garmin Edge 530", 17 juni 2022 en 7 oktober 2025: https://forum.intervals.icu/t/press-lap-workout-builder-to-garmin-edge-530/14696
- intervals.icu-forum, "Garmin planned workout sync", 16 en 17 juli 2026: https://forum.intervals.icu/t/garmin-planned-workout-sync/130704
- intervals.icu-forum, "Structured running workouts from intervals to Garmin Connect", 17 tot 20 juli 2026: https://forum.intervals.icu/t/structured-running-workouts-from-intervals-to-garmin-connect/130705
- intervals.icu-forum, "Garmin connect updates", 30 en 31 juli 2026: https://forum.intervals.icu/t/garmin-connect-updates/130832
- the5krunner, "Fit File Forge: 120 classic workouts ready for Garmin", 30 september 2026: https://the5krunner.com/2026/09/30/fit-file-forge/
- Garmin, Forerunner 255 Series Owner's Manual, Interval Workouts: https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-6EC17A6A-ECF6-4620-AE7D-9BCD0114ED1C.html
- Garmin-forum, "Strength training: set an alarm for rest time" (Forerunner 255, ruim 3 jaar oud): https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/332854/strength-training-set-an-alarm-for-rest-time
- Garmin-forum, "How do I get notifications for each step of the workout" (Forerunner 245, ruim 5 jaar oud): https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-245-series/244978/how-do-i-get-notifications-for-each-step-of-the-workout-either-through-my-headphones-or-vibrations-on-my-watch
- Garmin-forum, "Make Workout Alerts Louder?" (Forerunner 255, ruim 4 jaar oud): https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/300792/make-workout-alerts-louder

---

## Vraag 2. Een eigen app voor de Galaxy Watch 8

### 2.1 Wat je nodig hebt

Bevestigd (Android Developers Blog, "Start building for the next generation of Samsung devices", 10 juli 2025): de Galaxy Watch8 is het eerste toestel met Wear OS 6. Bevestigd (Android Developers, "Wear OS 6 changes", geraadpleegd 22 oktober 2026): Wear OS 6 is gebaseerd op Android 16 (API 36).

Eigen afleiding op basis van het bovenstaande en gangbare praktijk: Android Studio (gratis) op een computer met Windows, Mac of Linux, Kotlin, Jetpack Compose voor Wear OS (Material 3), eventueel Horologist en de Tiles-bibliotheek. De bronnen die ik las beschrijven de bouwstenen (Ongoing Activity, Data Layer, Tiles) maar geen complete handleiding "eerste app"; die staat in Google's codelabs, die ik niet in zijn geheel heb doorgelopen.

### 2.2 Zelf op het horloge zetten zonder Play Store

Bevestigd (Android Developers, "Debug Wear OS over Wi-Fi", bijgewerkt 8 september 2026): ontwikkelaarsopties aanzetten, ADB-foutopsporing en Draadloos foutopsporen aanzetten, op de computer `adb pair ip:poort` en de koppelcode invoeren, daarna `adb connect ip:poort`. Computer en horloge moeten op hetzelfde wifi-netwerk zitten; een bedrijfsnetwerk met toestelisolatie blokkeert dit (dan een hotspot gebruiken). Er is ADB-versie 30 of hoger nodig. Foutopsporing via Bluetooth wordt sinds Wear OS 3 niet meer ondersteund (Android Developers, "Debug Wear OS apps", bijgewerkt 25 augustus 2026).

Bevestigd (Samsung Developers, "Connect Galaxy Watch with Android Studio", zonder datum, copyright 2026): bij Galaxy Watch zet je ontwikkelaarsopties aan via Instellingen, Over horloge, Software en vijf keer tikken op Softwareversie. Dan ADB-foutopsporing en Draadloos foutopsporen aan, "Altijd toestaan op dit netwerk", en koppelen en verbinden zoals hierboven. Samsung noemt dat menunamen per One UI-versie kunnen verschillen; de pagina noemt de Watch8 niet.

Gemeld (anexplorer.io en andere gidsen, 2023 tot 2026, geen Watch8-specifieke): het wifi-radiootje van Wear OS gaat uit zodra het horloge via Bluetooth met de telefoon verbonden is, dus zet wifi aan op het horloge zelf voor het installeren. Zet na het installeren draadloos foutopsporen weer uit (accu en veiligheid).

Bevestigd (Android Developers, "Developer verification FAQ", bijgewerkt 30 september 2026): de nieuwe verificatieplicht geldt voor alle gecertificeerde Android-toestellen met Android 7 of hoger, maar "de handhaving geldt alleen voor mobiel en tablet" en alleen in de gekozen regio's (30 september 2026: Brazilië, Indonesië, Singapore, Thailand). Voor apps buiten Google Play wordt aanbevolen alle apps te registreren, maar niet afgedwongen. Installeren via ADB vereist geen verificatie en de 24 uur wachttijd van de "advanced flow" geldt niet voor ADB. Een gratis "limited distribution"-account (maximaal 20 toestellen, zonder identiteitsbewijs) bestaat voor hobbyisten. Wat in 2027 voor horloges geldt, staat er niet. Ik vond geen Samsung-specifieke beperking voor ADB-installaties op de Watch8; dat betekent niet dat die er niet is, alleen dat ik hem niet vond.

Eigen afleiding: voor jouw horloge heb je geen account, geen winkel en geen geld nodig. De ADB-route valt buiten de nieuwe verificatie.

### 2.3 Wat zo'n app kan

Bevestigd (Android Developers, "Ongoing Activity API", bijgewerkt 21 oktober 2026): timers zijn expliciet een goed gebruiksvoorbeeld. Je maakt een lopende melding (`setOngoing(true)`) met een `OngoingActivity` (categorie `CATEGORY_ALARM` voor timers). Dit houdt de app zichtbaar zodat het systeem niet terugvalt op de wijzerplaat. De pagina zegt niet dat het de app draaiend houdt met het scherm uit.

Bevestigd (Android Developers, "Principles of Wear OS", bijgewerkt 9 juli 2026): gebruik haptische feedback bij start, stop en auto-lap; gebruik een service die zichzelf promoveert tot lopende melding voor een training; gebruik WorkManager voor lange of periodieke taken. Alarmen worden niet behandeld op die pagina.

Eigen afleiding: een rusttimer die met het scherm uit trilt, kan met een exact alarm (AlarmManager) of met een voorgrondservice met trilpatroon. Het horloge is hiervoor veel geschikter dan een telefoon: de trilling zit aan je pols en is onafhankelijk van de muziek op je telefoon. Dit is het sterkste argument voor een horloge-app.

Gemeld (Samsung Developer Forum, "Get Health Service data on background in GW4 (wearOS)"): op een Galaxy Watch4 hielden AlarmManager, WorkManager en PowerManager sensorgegevens met scherm uit niet vast, ook niet in een voorgrondservice. Dat gaat over sensoren, niet over een korte trilling na een alarm, maar het toont dat Samsung agressiever met achtergrondwerk omgaat. Of een alarm van twee minuten op de Watch8 betrouwbaar trilt, moet je testen; ik vond er geen bron over.

Bevestigd (Android Developers, "Data Layer overview", bijgewerkt 21 oktober 2026): De Wearable Data Layer (DataClient, MessageClient) is er alleen tussen een Wear OS-horloge en een gekoppelde Android-telefoon. Pakketnaam en handtekening van de telefoon-app en de horloge-app moeten gelijk zijn. Google raadt de Data Layer aan voor communicatie "strikt tussen horloge en telefoon" en eigen servers voor opslag en synchronisatie. Gegevens lopen via Bluetooth of, als dat niet kan, via Google-servers.

Bevestigd (Android Developers, "Network access and sync on Wear OS", bijgewerkt 19 oktober 2026): als het horloge via Bluetooth met de telefoon verbonden is, loopt zijn netwerkverkeer meestal via de telefoon; anders wordt wifi of mobiel (als de hardware dat heeft) gebruikt. Een horloge-app kan met HTTP rechtstreeks met een server praten, zonder telefoon-app. De Data Layer is daarvoor uitdrukkelijk niet bedoeld. Via Bluetooth LE kan de bandbreedte laag zijn (genoemd: 4 kilobyte per seconde).

Bevestigd (Android Developers, "Standalone apps", bijgewerkt 19 oktober 2026): een horloge-app kan zelfstandig of afhankelijk van een telefoon zijn, aangegeven in het manifest. Dat geldt vooral voor Play-distributie.

Wat een horloge-app dus kan zonder telefoon-app (eigen afleiding op basis van deze pagina's): zelfstandig een rusttimer met trilling, een eigen lijst met oefeningen die je op het horloge afvinkt, en met wifi of mobiel gegevens ophalen en terugsturen naar een server.

Wat niet kan zonder telefoon-app of server: ASCEND houdt zijn gegevens lokaal in IndexedDB in de browser van de telefoon (CLAUDE.md). Een horloge-app kan daar niet bij. De training van vandaag op het horloge tonen vraagt dus ofwel een telefoon-app die de gegevens doorgeeft via de Data Layer, ofwel een server waar ASCEND het schema neerzet en het horloge het ophaalt. Het afvinken van sets terug naar ASCEND vraagt hetzelfde.

### 2.4 Kan een PWA met het horloge praten?

Bevestigd: de Data Layer is een API van Google Play-diensten voor Android-apps (zie hierboven). Een PWA in Edge heeft er geen toegang toe.

Gemeld (9to5Google, "Wear OS internet browser Samsung", 16 december 2022; XDA, 2021; Android Authority): Wear OS heeft geen Chrome; Samsung Internet draait op Galaxy Watch 4 en later en is wisselvallig beschikbaar; er zijn kleine browsers van derden. Ik vond niets over PWA-ondersteuning op Wear OS. Eigen afleiding: reken er niet op.

Eigen afleiding: Web Bluetooth tussen een PWA en een Wear OS-horloge is geen weg; het horloge biedt de pagina niets aan dat je kunt lezen.

Antwoord: nee, een PWA kan niet met het horloge praten. Voor de Data Layer heb je een Android-app op de telefoon nodig. De Android-schil uit het eerdere onderzoek (Capacitor) kan dat worden, maar dan met een zelfgeschreven stukje Kotlin (een eigen Capacitor-plugin) dat de Data Layer aanroept; ik zocht niet naar een kant-en-klare plugin. Wil je de schil niet, dan is een kleine server (vraag 3) de andere route.

### 2.5 Werk, kosten en onderhoud (eigen schatting)

Eerste versie, alleen de rusttimer, zelfstandig op het horloge (kies tijd 60, 90, 120 of 180 seconden, trilt, een knop "Volgende set"): ongeveer 4 tot 6 bouwrondes. Ronde 1: lege Wear OS-app op het horloge zetten via ADB over wifi. Ronde 2: scherm met de timer. Ronde 3: voorgrondservice en lopende melding. Ronde 4: trilling met scherm uit testen en bijstellen. Eventueel ronde 5 en 6 voor Tile (snelkoppeling), accu en uitleg over batterij-instellingen.

Tweede versie, de training van vandaag tonen en sets afvinken: er moet gegevens van ASCEND naar het horloge. Via een telefoon-app (Capacitor-schil met eigen plugin voor de Data Layer): bovenop de schil zelf (9 tot 13 rondes in mijn eerdere rapport, grotendeels te delen met Health Connect en rusttimer) nog 6 tot 10 rondes. Via een server: 4 tot 6 rondes voor het horloge en 4 tot 8 voor de server en de koppeling met ASCEND.

Kosten: 0 euro voor ADB-installatie op eigen toestel. Een Play-account (25 dollar eenmalig, uit mijn eerdere rapport) is alleen nodig als je de app via de winkel wilt.

Onderhoud (eigen afleiding): elk jaar een nieuwe Wear OS-versie en nieuwe doel-SDK; reken op een of twee kleine rondes per jaar. Een via ADB geïnstalleerde app blijft staan; bij een horloge-reset moet je opnieuw installeren. De signeersleutel bewaar je op twee plekken (zelfde reden als in het eerdere rapport).

### Bronnen vraag 2

- Android Developers Blog, "Start building for the next generation of Samsung devices", 10 juli 2025: https://android-developers.googleblog.com/2025/07/start-building-next-generation-samsung-devices.html
- Android Developers, "Wear OS 6 changes": https://developer.android.com/training/wearables/versions/6/changes
- Android Developers, "Debug Wear OS over Wi-Fi", bijgewerkt 8 september 2026: https://developer.android.com/training/wearables/get-started/debug-wifi
- Android Developers, "Debug Wear OS apps", bijgewerkt 25 augustus 2026: https://developer.android.com/training/wearables/get-started/debugging
- Samsung Developers, "Connect Galaxy Watch with Android Studio", zonder datum, 2026: https://developer.samsung.com/health/sensor/guide/connect-watch.html
- Android Developers, "Developer verification FAQ", bijgewerkt 30 september 2026: https://developer.android.com/developer-verification/guides/faq
- Android Developers, "Ongoing Activity API", bijgewerkt 21 oktober 2026: https://developer.android.com/training/wearables/ongoing-activity
- Android Developers, "Principles of Wear OS", bijgewerkt 9 juli 2026: https://developer.android.com/training/wearables/principles
- Android Developers, "Data Layer overview", bijgewerkt 21 oktober 2026: https://developer.android.com/training/wearables/data/overview
- Android Developers, "Network access and sync on Wear OS", bijgewerkt 19 oktober 2026: https://developer.android.com/training/wearables/data/network-access
- Android Developers, "Standalone apps", bijgewerkt 19 oktober 2026: https://developer.android.com/training/wearables/apps/standalone-apps
- Samsung Developer Forum, "Get Health Service data on background in GW4 (wearOS)" (datum niet getoond): https://forum.developer.samsung.com/t/get-health-service-data-on-background-in-gw4-wearos/20969
- 9to5Google, "Wear OS internet browser Samsung", 16 december 2022: https://9to5google.com/2022/12/16/wear-os-internet-browser-samsung/
- anexplorer.io, "Install APK on Wear OS Watch" (zonder datum): https://anexplorer.io/install/apk-on-wear-os

---

## Vraag 3. Een eigen kleine server alleen voor de eigenaar

Let op: dit botst met de regel in CLAUDE.md "Do not add a backend". Dat is een bewuste keuze van de eigenaar die met een nieuw besluit in docs/beslissingen/ vervangen moet worden voordat iets gebouwd wordt (eigen afleiding).

### 3.1 Opties en prijzen

Alle prijzen komen van de officiële pagina van de leverancier op de genoemde datum, tenzij anders vermeld.

Cloudflare Workers met Durable Objects, Queues, R2 en D1:
- Bevestigd (Cloudflare, "Workers pricing", bijgewerkt 2 oktober 2026): gratis laag 100.000 verzoeken per dag, 10 ms CPU per verzoek; betaald 5 dollar per maand per account, 10 miljoen verzoeken inbegrepen.
- Bevestigd (Cloudflare, "Durable Objects pricing", bijgewerkt 18 oktober 2026): ook gratis beschikbaar, maar alleen met SQLite-opslag; 100.000 verzoeken per dag, 5 GB opslag. Een alarm telt als verzoek en elke `setAlarm()` als één geschreven rij.
- Bevestigd (Cloudflare, "Durable Objects alarms", bijgewerkt 21 april 2026): een alarm wordt minstens één keer uitgevoerd en bij een fout automatisch herhaald (tot 6 keer, vanaf 2 seconden). Per object één alarm tegelijk. De pagina zegt niets over hoe precies het tijdstip is.
- Bevestigd (Cloudflare, "Queues pricing", bijgewerkt 21 april 2026): gratis laag 10.000 bewerkingen per dag, bewaartijd 24 uur; betaald 1 miljoen per maand inbegrepen, daarna 0,40 dollar per miljoen.
- Bevestigd (Cloudflare, "R2 pricing", bijgewerkt 1 oktober 2026): gratis 10 GB opslag, 1 miljoen schrijfacties en 10 miljoen leesacties per maand, uitgaand verkeer gratis.
- Bevestigd (Cloudflare, "D1 pricing", bijgewerkt 21 april 2026): gratis 5 GB, 5 miljoen rijen lezen en 100.000 schrijven per dag.
- Eigen afleiding: voor één gebruiker blijf je in de gratis laag. Een Worker, één Durable Object voor de timer en de abonnementen, en één R2-emmer voor versleutelde back-ups kosten dan 0 euro per maand. Bij de gratis laag stopt de dienst bij overschrijding in plaats van door te factureren (gemeld in secundaire bronnen: "Error 1027"; niet officieel gelezen). Bij de betaalde laag van 5 dollar loopt het wel op als je iets verkeerd instelt; zet meldingen op uitgaven.

Supabase (Postgres, functies, opslag):
- Bevestigd (Supabase, "Pricing", geraadpleegd 22 oktober 2026): gratis 500 MB database en 500.000 functie-aanroepen, "gratis projecten worden gepauzeerd na 1 week inactiviteit", geen automatische back-ups. Pro vanaf 25 dollar per maand, 8 GB, dagelijkse back-ups 7 dagen. Het plannen van functies gaat via pg_cron en pg_net; de documentatie zegt niet of dat op de gratis laag mag (Supabase Docs, "Scheduling Edge Functions").
- Eigen afleiding: de weekpauze maakt de gratis laag ongeschikt als je het een week niet gebruikt (bijvoorbeeld op vakantie); wil je dat niet, dan 25 dollar per maand.

Firebase:
- Bevestigd (Firebase, "Pricing", geraadpleegd 22 oktober 2026): Cloud Functions zijn niet beschikbaar op het gratis plan Spark; je hebt Blaze (betalen naar gebruik, met kaart) nodig. Firestore Spark: 1 GiB, 20.000 schrijfacties per dag. Cloud Messaging is gratis zonder genoemde limiet.
- Eigen afleiding: voor timers op een vast tijdstip heb je functies nodig, dus Blaze met een betaalmiddel en een risico op doorlopende kosten. Voor één gebruiker meestal enkele cent per maand, maar het is geen vast bedrag.

Hetzner Cloud (kleine VPS):
- Bevestigd (Hetzner, "Cloud", geraadpleegd 22 oktober 2026): "Cost-Optimized" vanaf 5,99 euro per maand (op die pagina met de opmerking "Currently not available" bij de gedeelde-resourcesrij), "Regular Performance" vanaf 6,49 euro per maand, exclusief btw. De pagina noemt geen datum.
- Gemeld (agentdeals.dev en privatedevops.com, 2026): Hetzner verhoogde de prijzen op 1 april 2026 (tot 37 procent, kleine ARM-server ongeveer 4,49 euro) en op 15 juni 2026 opnieuw, ongelijk per lijn. De bronnen spreken elkaar tegen over de exacte bedragen. Controleer de prijs in de bestelpagina.
- Eigen afleiding: ongeveer 5 tot 7 euro per maand voor een eigen server met eigen onderhoud: updates, firewall, back-ups, certificaten.

Fly.io:
- Bevestigd (Fly.io, "Pricing", geen datum): een shared-cpu-1x met 256 MB kost ongeveer 2,19 dollar per maand als hij continu draait; volume 0,15 dollar per GB per maand; geen gratis laag voor nieuwe organisaties (alleen een proefperiode van 2 uur of 7 dagen); dedicated IPv4 2 dollar per maand, gedeeld IPv4 gratis.

### 3.2 Wat een server ASCEND oplevert

Rusttimer als Web Push op een exact tijdstip (met scherm uit, muziek aan):

- Bevestigd (Chrome Developers, "Web push interoperability wins", bijgewerkt 27 juli 2016): bij Chrome is het push-adres bij FCM; je herkent dat aan de herkomst `fcm.googleapis.com`. Met VAPID heb je geen Firebase-project nodig.
- Bevestigd (IETF, RFC 8030 sectie 5.3, Urgency en TTL): het bericht kan met de Urgency-kop "high" worden verstuurd; zonder kop geldt "normal". De TTL is verplicht.
- Bevestigd (Firebase, "Android message priority", bijgewerkt 22 oktober 2026): bij Doze kan afleveren van "normal"-berichten worden vertraagd; een bericht met hoge prioriteit mag een slapend toestel wakker maken, maar als zulke berichten geen zichtbare melding opleveren, kan FCM ze voor die app naar normaal verlagen. Een timermelding is zichtbaar en past dus. Dat de Urgency-kop in Web Push op hoge FCM-prioriteit uitkomt, staat niet in de pagina's die ik las (eigen afleiding).
- Gemeld, en dit is het knelpunt (Microsoft Q&A, "Edge on Android and push subscription", 30 december 2025 tot 19 februari 2026): in Edge voor Android (143, Android 15) geeft `pushManager.subscribe()` een gelukt-melding terug, met permissie "granted", maar het adres is altijd `https://permanently-removed.invalid/...`. Een moderator van Microsoft (extern) antwoordt dat dit aan Edge op Android ligt, niet aan de code; hij noemt het een eigen afleiding. Dezelfde code werkt in Chrome op Android en Edge op Windows. Edge, Edge Beta en Edge Canary hebben het probleem, ook als geïnstalleerde PWA. Geen officiële erkenning of oplossing in de draad. Oudere melding: Edge voor Android leverde in 2020 pushberichten zonder inhoud (Microsoft Tech Community, "Web Push notification bug (Edge for Android)", 13 oktober 2020 tot 26 januari 2021, geen oplossing).
- Gemeld (Microsoft Tech Community, "Edge Android does not truly install PWA", 6 april 2024, met reacties van 30 januari en 21 maart 2025): Edge voor Android maakt bij "Toevoegen aan beginscherm" alleen een snelkoppeling, geen echt geïnstalleerde app; hij staat niet in de app-lijst. Dat stemt overeen met de zorg uit mijn eerdere rapport over Edge. Een ontwikkelaar die de PWA met pushmeldingen wil gebruiken, zou Chrome of Samsung Internet moeten kiezen.
- Eigen afleiding: werkt Web Push in Chrome (of Samsung Internet) met scherm uit en muziek aan? Ik vond geen bron die dit meet voor Web Push. Aannemelijk: de melding komt als gewone Android-melding, met het geluid en de trilling van het kanaal van de browser; de muziek zakt even. Of de `vibrate`-optie werkt, is niet zeker: MDN markeert `vibrate` als experimenteel en niet-Baseline, en trillingen worden mede door Android-meldingskanalen en de instellingen van het toestel bepaald. Test met een proefmelding.
- Eigen afleiding: voor een timer van twee minuten is een server het zwakke deel. Er is netwerk nodig (kelder van een sportschool), de melding gaat via twee tussenstations (jouw server, Google), en Samsung-instellingen voor apps die niet gebruikt worden kunnen meldingen van een browser vertragen. Een lokale timer in de PWA met Wake Lock (mijn eerdere rapport) of een alarm in een horloge-app (vraag 2) is betrouwbaarder. Gebruik Web Push voor een rusttimer alleen als je geen horloge-app wilt.
- Bibliotheken (gemeld, README's op GitHub en npm): de gewone `web-push` voor Node werkt niet op Cloudflare Workers (foutmelding `crypto.createECDH is not a function`, volgens PushForge). Alternatieven die Web Crypto gebruiken zijn web-push-neo, @pushforge/builder en web-push-browser. Het patroon "Durable Object-alarm op het juiste moment, dan push versturen" wordt beschreven in de documentatie van Cloudflare Agents (Push Notifications, versie 0.20.1).

Gegevens op de achtergrond ophalen terwijl de app dicht is:

- Bevestigd (Garmin Developers, "Garmin Connect Personal API FAQ", geen datum, 2026): de Personal API is voor individuen, "niet voor commerciële apps met meerdere gebruikers". Je maakt een sleutel op Garmin Connect (30, 90, 180 dagen of een jaar), de sleutel wordt één keer getoond, een week vóór het einde krijg je een mail, en daarmee haal je een toegangstoken van 24 uur zonder refresh-token. Alleen lezen. De pagina noemt geen snelheidslimieten, geen CORS en niets over draaien op een eigen server.
- Gemeld (the5krunner, "Garmin Personal API Key 2026", 22 oktober 2026): activiteiten als JSON en FIT, gezondheidsgegevens als JSON, niets terugsturen (Courses en Training zijn zakelijk). Garmin haalt volgens Runalyze berekende velden (VO2max, hersteltijd) uit via de API geleverde bestanden. Niet vermeld: CORS, serverbruik, gewicht, krachtdata.
- Eigen afleiding: een server heeft geen CORS-probleem. Een Worker op een schema kan intervals.icu of Garmin periodiek ophalen en de resultaten bewaren, zodat ASCEND bij openen alleen nog de uitkomst leest. Zo vervalt de waarschuwing uit het eerdere onderzoek dat de browser Garmin niet mag aanroepen. Maar: dit vraagt dat je sleutels op de server bewaart.

Synchroniseren tussen telefoon, horloge en computer:

- Eigen afleiding: ASCEND heeft IndexedDB per browser en per apparaat. Een server met één JSON-bestand of een kleine tabel (de bestaande back-up in schema 5) kan de eenvoudigste synchronisatie zijn: "laatste schrijver wint" per sessielog (logs zijn toch append-only, dus conflicten zijn zeldzaam). De Data Layer is voor horloge-telefoon; Google adviseert voor opslag en synchronisatie eigen infrastructuur (Data Layer overview). Een computer krijgt ASCEND gewoon in de browser, met dezelfde server.

Back-up in de cloud:

- Eigen afleiding: het kleinste, veiligste eerste stuk. De app versleutelt de back-up in de browser (Web Crypto, AES-GCM, sleutel uit een wachtwoord) en stuurt alleen een versleutelde blob naar R2. De server ziet nooit gezondheidsgegevens en bewaart geen geheimen behalve een toegangstoken. Kost 0 euro in de gratis laag. Je verliest alleen iets als je het wachtwoord kwijtraakt; bewaar het op twee plekken.

### 3.3 Gevaren

- Privacy van gezondheidsgegevens (eigen afleiding): trainings-, gewichts- en hartslagdata zijn bijzondere persoonsgegevens, ook als jij de enige gebruiker bent. Alles wat leesbaar op een server staat, kan door de leverancier, bij een lek of via een gestolen token worden gelezen. Versleuteling in de browser vóór uploaden neemt dat grotendeels weg. Een Web Push-bericht is wel versleuteld tussen server en browser, maar de pushdienst (Google) ziet dat er iets verstuurd wordt (metadata); houd de inhoud van meldingen kaal ("Rust voorbij").
- Geheimen op de server: de intervals.icu-sleutel en de Garmin-sleutel geven leestoegang tot al je data. Ze horen als Worker-secrets te staan, nooit in de openbare repo (CLAUDE.md zegt dat de repo openbaar is). Garmin-sleutels verlopen binnen een jaar. De intervals.icu-sleutel kan volgens het bestaande besluit ook schrijven naar je agenda; maak voor de server een aparte sleutel waar mogelijk (of overweeg alleen lezen).
- Beveiliging (eigen afleiding): een open eindpunt wordt gevonden. Gebruik een lang willekeurig token in een kop (niet in de URL), beperk de toegestane herkomst (CORS) tot jouw ASCEND-adres, beperk het aantal verzoeken, en zet Cloudflare Access of een tweede factor ervoor als je het groter maakt. Houd het aantal eindpunten klein: opslaan, ophalen, abonnement registreren, timer plannen.
- Onderhoud: een Worker is bijna onderhoudsvrij; een VPS vraagt updates, firewall en back-ups, en dat is meer werk dan de hele ASCEND-app vandaag. Een dienst kan zijn prijzen, gratis laag of regels wijzigen: Hetzner verhoogde in 2026 twee keer de prijs (gemeld), Garmin wijzigde in 2026 zijn API-regels (the5krunner, 14 september 2026, via mijn eerdere rapport).
- Kosten die oplopen: op de gratis lagen van Cloudflare niet; bij Supabase wordt de gratis laag gepauzeerd; Firebase Blaze en Fly.io factureren naar gebruik zonder vast plafond (de Fly.io-pagina noemt geen maximum). Stel een uitgavenmelding in.
- Verwacht gedrag van de regels in de repo: "Planning van de gebruiker: alles wat zijn planning inhoudelijk verandert gaat in de app via een voorstel met Akkoord". Een server die zelf planning wijzigt, mag dat niet. Houd de server tot opslag, ophalen en meldingen beperkt.

### 3.4 Minimaal en veilig opzetten (eigen ontwerp)

1. Eén Cloudflare Worker, één R2-emmer, één secret (toegangstoken), alleen jouw herkomst toegestaan.
2. Back-up eind-tot-eind versleuteld vanuit de browser; de Worker bewaart blobs.
3. Later, apart besluit: Durable Object met alarm voor timers en een Web Push-abonnement dat je controleert op het nepadres van Edge.
4. Als laatste en alleen met een apart besluit: sleutels voor intervals.icu en Garmin als Worker-secrets, ophalen op schema, uitkomsten versleuteld opgeslagen. Dit is het deel met het grootste risico.

### 3.5 Advies: wat is eerst zinvol

Eerst niets bouwen wat een server nodig heeft. Test met bestaande middelen: de MacroFactor-rusttimer (mijn eerdere rapport 7.1) en een proefworkout van tijdsblokken op de FR255 (vraag 1). Als je dan een server wilt, is de versleutelde cloud-back-up het eerste dat zinvol is (laag risico, nul kosten, lost "telefoon kwijt" op). Daarna pas meldingen, en alleen na een test in Chrome of Samsung Internet; in Edge werkt het volgens de meldingen nu niet. Gegevens ophalen met sleutels op de server komt als laatste.

### Bronnen vraag 3

- Cloudflare, "Workers pricing", bijgewerkt 2 oktober 2026: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare, "Durable Objects pricing", bijgewerkt 18 oktober 2026: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Cloudflare, "Durable Objects alarms", bijgewerkt 21 april 2026: https://developers.cloudflare.com/durable-objects/api/alarms/
- Cloudflare, "Queues pricing", bijgewerkt 21 april 2026: https://developers.cloudflare.com/queues/platform/pricing/
- Cloudflare, "R2 pricing", bijgewerkt 1 oktober 2026: https://developers.cloudflare.com/r2/pricing/
- Cloudflare, "D1 pricing", bijgewerkt 21 april 2026: https://developers.cloudflare.com/d1/platform/pricing/
- Supabase, "Pricing", 22 oktober 2026: https://supabase.com/pricing
- Supabase Docs, "Scheduling Edge Functions": https://supabase.com/docs/guides/functions/schedule-functions
- Firebase, "Pricing", 22 oktober 2026: https://firebase.google.com/pricing
- Hetzner, "Cloud", 22 oktober 2026: https://www.hetzner.com/cloud/
- agentdeals.dev, "Hetzner pricing 2026" (effectief 1 april 2026): https://agentdeals.dev/hetzner-pricing-2026
- privatedevops.com, "Hetzner repriced its cloud today" (15 juni 2026): https://privatedevops.com/news/hetzner-june-2026-cloud-price-increase-what-to-do
- Fly.io, "Pricing", geen datum: https://docs.fly.io/about/pricing
- IETF, RFC 8030, "Generic Event Delivery Using HTTP Push", sectie 5: https://www.rfc-editor.org/rfc/rfc8030
- Firebase, "Set and manage Android message priority", bijgewerkt 22 oktober 2026: https://firebase.google.com/docs/cloud-messaging/android-message-priority
- Chrome Developers, "Web push interoperability wins", bijgewerkt 27 juli 2016: https://developer.chrome.com/blog/web-push-interop-wins
- MDN, "Push API", bijgewerkt 28 mei 2025: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- MDN, "Notification: vibrate", geraadpleegd 22 oktober 2026: https://developer.mozilla.org/en-US/docs/Web/API/Notification/vibrate
- Microsoft Q&A, "Edge on Android and push subscription", 30 december 2025 tot 19 februari 2026: https://learn.microsoft.com/en-us/answers/questions/5686199/edge-on-android-and-push-subscription
- Microsoft Tech Community, "Web Push notification bug (Edge for Android)", 13 oktober 2020 tot 26 januari 2021: https://techcommunity.microsoft.com/discussions/edgeinsiderdiscussions/web-push-notification-bug-edge-for-android/1774677
- Microsoft Tech Community, "Edge Android does not truly install PWA", 6 april 2024: https://techcommunity.microsoft.com/discussions/edgeinsiderdiscussions/edge-android-does-not-truly-install-pwa/4108248
- Garmin Developers, "Garmin Connect Personal API FAQ", 2026: https://developer.garmin.com/gc-developer-program/personal/personal-faq/
- the5krunner, "Garmin Personal API Key 2026", 22 oktober 2026: https://the5krunner.com/2026/10/22/garmin-personal-api/
- Cloudflare Agents, "Push Notifications" (agents 0.20.1): https://unpkg.com/agents@0.20.1/docs/push-notifications.md
- PushForge (Web Push voor Workers): https://github.com/draphy/pushforge

---

## Vraag 4. openScale en het gewicht van de weegschaal

### 4.1 Wat openScale is

Bevestigd (GitHub, oliexdev/openScale, geraadpleegd 22 oktober 2026): open-source app om gewicht en lichaamsgegevens te volgen, met ondersteuning voor Bluetooth-weegschalen. Auteur "olie.xdev" (GitHub-account oliexdev). Licentie GPL-3.0. Geen account, "stuurt geen gegevens naar een cloud" en vraagt geen internetrechten. Te downloaden via F-Droid (com.health.openscale), Google Play (open beta, pakket com.health.openscale.oss) en GitHub-releases (een ontwikkelversie wordt als mogelijk met fouten omschreven).

Bevestigd (F-Droid, "openScale", versie 3.1.3, toegevoegd 9 september 2026): vereist Android 12 of nieuwer; rechten voor locatie (alleen tijdens gebruik, om de weegschaal te vinden), Bluetooth, voorgrondservices en meldingen, starten bij opstarten, trillen en toestel wakker houden. De lijst noemt geen anti-features.

Bevestigd (GitHub-releases, openScale): 3.0 (30 november) is een herschrijving in Kotlin en Jetpack Compose met een vernieuwde Bluetooth-laag; 3.0.1 en 3.0.2 (3 en 7 januari) verbeteren stabiliteit; 3.1.1 (30 mei) herstelt verbindingen met onder meer QN/Renpho en Mi Scale 2 en voegt "broadcast"-ondersteuning voor QN-weegschalen toe; 3.1.2 (9 augustus) en 3.1.3 (6 september) voegen weegschalen toe en 3.1.3 vraagt openScale-sync 0.6.3 of nieuwer voor een nieuwe sync-API. De releasepagina toont geen jaartal; op grond van de F-Droid-datum 9 september 2026 is dat 2026 en de 3.0-release dus eind 2025 (eigen afleiding). Het project is dus onderhouden.

Bevestigd (F-Droid en GitHub): gemeten waarden zijn onder andere gewicht, BMI, vetpercentage, water, spier; 3.1.3 voegt per ledemaat en romp vet en spier toe en een metabole leeftijd.

### 4.2 Welke weegschalen, en hoort jouw Fitdays-weegschaal erbij

Bevestigd (openScale-wiki, "Supported scales in openScale", 101 weegschalen uit 66 handlers, geraadpleegd 22 oktober 2026): ondersteunde merken zijn onder meer 1byone, Beurer, Eufy, Etekcity, Huawei/Honor, Medisana, Omron, Picooc, Renpho, Sanitas, Soehnle, Trisa, Xiaomi, Yunmai en "SWAN / Icomon". Voor jouw geval:

- Fitdays FG2202WB gebruikt de Runstar R6-handler (Bluetooth GATT). Opmerking in de wiki: lichaamssamenstelling vraagt dat je de handgreep vasthoudt; met alleen de voeten meet de weegschaal geen impedantie.
- SWAN / Icomon (MGB) is ondersteund via de MGB-handler (GATT), zonder opmerking.
- De Icomon/Fitdays "AAA"-borden (AAA002, AAA07A) zenden alleen uit ("broadcast"): geen koppeling nodig, alleen gewicht, het impedantieframe wordt niet gedecodeerd.
- Chipsea komt alleen voor als firmware van de ProfiCare PC-PW 3008 BT en de Hoffen BBS-8107.
- Runstar R5 staat als "de weegschaal kan het, maar nog uit te zoeken".

Hoe je dat voor jouw model controleert (eigen afleiding aangevuld met de wiki): zoek de modelnaam en het typenummer van je weegschaal (onderkant of in Fitdays onder het apparaat) op in de wiki-pagina. Zet Bluetooth aan en kijk met een scanner-app (bijvoorbeeld nRF Connect) onder welke naam de weegschaal zich meldt; de wiki zegt dat nieuwere uitzendende borden aan hun advertentie herkend worden, niet alleen aan hun naam. Of een model zonder vermelding toch werkt, kun je alleen met openScale zelf proberen (de wiki waarschuwt dat sommige goedkope weegschalen slecht geïmplementeerd zijn en dat protocollen kunnen veranderen). Ik weet niet welk model jij hebt.

### 4.3 Hoe je de gegevens eruit krijgt

- Bevestigd (openScale, GitHub): CSV-import en -export.
- Bevestigd (GitHub, oliexdev/openScale-sync): de aparte app openScale-sync kan naar Health Connect, wger, Endurain, InfluxDB, een algemene webhook en MQTT (3.1 en 5.0, met Home Assistant). Per dienst kies je richting: alleen exporteren, alleen importeren of beide. Synchroniseren gebeurt bij het toevoegen, wijzigen of verwijderen van een meting, met optioneel een achtergrondsynchronisatie om de paar uur. Gewicht gaat in kilogram, vet, spier en water in procent. Beschikbaar via Google Play en F-Droid. Licentie GPL-3.0.
- Gemeld (Google Play en GitHub-releases, via zoekresultaat): openScale-sync 0.6 voegde tweerichtingsverkeer toe, waarbij ook metingen uit Health Connect, wger en MQTT kunnen worden gelezen; 0.6.3 is de laatste die ik vond (6 september).
- Niet gevonden: de exacte kolomindeling van de openScale-CSV. Die moet je voor een importer in ASCEND zelf bekijken.

Kan ASCEND het inlezen? Eigen afleiding op basis van bovenstaande en mijn eerdere rapport:
- Via CSV: ja, zonder schil. Een bestandskiezer in de PWA kan een CSV lezen (zoals de MacroFactor-CSV in "Data zonder handwerk", idee 2). Dat is een weekritueel, geen automatisering.
- Via Health Connect: ja, in de Android-schil met de plugin die `weight` leest (@capgo/capacitor-health, volgens mijn eerdere rapport). Een PWA kan Health Connect niet lezen.

### 4.4 Kan een PWA de weegschaal zelf lezen met Web Bluetooth?

Bevestigd (MDN, "Web Bluetooth API", bijgewerkt 27 mei 2025): de API is alleen in een veilige context (https) en niet in Web Workers beschikbaar. De toestemmingsvraag verschijnt bij `requestDevice()`, en die vraagt een gebruikershandeling (tik, "transient activation"). Eerder toegestane apparaten kun je met `getDevices()` opvragen.

Bevestigd (Chrome Developers, "Communicating with Bluetooth devices over JavaScript", pagina bijgewerkt 2015): apparaten kiezen moet op een tik of klik gebeuren. Scannen met `requestLEScan()` staat daar als nog niet af.

Bevestigd (GitHub, WebBluetoothCG, "implementation-status", zonder datum): de GATT-communicatie staat op Android (Chrome, vanaf Android 6) zonder vlag aan; Edge ondersteunt het vanaf versie 79 en Samsung Internet vanaf 6.4 (platform niet nader gespecificeerd). `getDevices()` en `watchAdvertisements()` staan op Android achter de vlag `chrome://flags/#enable-experimental-web-platform-features`, de scan-API is "gedeeltelijke ontwikkeling" achter dezelfde vlag, en blijvende apparaattoestemmingen staan achter `#enable-web-bluetooth-new-permissions-backend`. Ik kon niet bevestigen of dat in Chrome 2026 nog zo is; de bron is niet gedateerd. Can I Use (geraadpleegd 22 oktober 2026) toont Web Bluetooth als ondersteund in Chrome voor Android 156 en Samsung Internet 30, zonder vlagnotities; voor Edge voor Android staat daar geen aparte regel.

Gemeld (W3C-mailinglijst Web Bluetooth, maart 2026): de specificatie voor scannen en uitgebreide advertenties wordt nog besproken. Dit zegt niets over wat Chrome nu levert.

Antwoord op de vragen van de eigenaar over route (a):
- Alleen met de app open en na een tik? Ja, volgens bovenstaande. Het apparaat kiezen kan alleen na een tik (bevestigd). Als blijvende toestemming niet aan staat, komt de keuzelijst bij elke sessie terug (eigen afleiding; de implementation-status koppelt blijvende toestemming aan een vlag).
- Kan Edge of Chrome op Android scannen naar advertenties van de weegschaal? Alleen via `watchAdvertisements()` na een eerdere keuze, en dat zit achter een vlag (implementation-status). Een vrije scan zonder keuze is er niet.
- Werkt het met de app op de achtergrond? Nee. Een pagina die niet zichtbaar is, wordt door de browser gepauzeerd; de API is niet in een service worker beschikbaar (MDN). Er is geen bron die het tegendeel zegt (eigen afleiding).
- Betrouwbaarheid: laag voor "stap op de weegschaal en het staat erin". Verder moet het weegschaalprotocol zelf in JavaScript worden nagebouwd. Dat kan op basis van de openScale-handlers, maar die zijn GPL-3.0 en een overname dwingt je licentie (eigen afleiding; vraag de eigenaar). Veel weegschalen zijn verbonden met slechts één app tegelijk en wegen alleen bij een tik op de vloer; dat is een bekend patroon, maar ik vond er geen bron over.
- Werk (schatting): 3 tot 5 rondes voor een proef met een weegschaalprotocol, mits het model door openScale wordt ondersteund en het protocol eenvoudig is; veel meer bij een nieuw protocol.

### 4.5 Vier routes voor "op de weegschaal staan en het staat in ASCEND"

(a) PWA met Web Bluetooth. Zie 4.4. Werkt met de app dicht: nee. Werk: 3 tot 5 rondes, plus kans dat vlaggen nodig zijn. Betrouwbaarheid: laag. Handig alleen als proef.

(b) Een native Android-app of de Capacitor-schil met een Bluetooth-LE-scan op de achtergrond.
- Bevestigd (Android Developers, "Communicate in the background", bijgewerkt 26 februari 2026): er is geen beperking op `BluetoothLeScanner` of `CompanionDeviceManager` terwijl de app niet zichtbaar is, maar beide vragen dat het app-proces leeft. Draait het proces niet, dan kun je `startScan()` met een `PendingIntent` gebruiken: je krijgt een melding zodra een apparaat gevonden wordt dat bij je filter past (het apparaat moet dan uitzenden). De documentatie raadt periodiek scannen af. Met `CompanionDeviceManager` houd je je app wakker zolang een eerder gekoppeld apparaat in bereik is, maar de documentatie noemt beperkte filters en geen ondersteuning voor willekeurige MAC-adressen. Er is geen beperking op verbinden vanuit de achtergrond, maar de verbinding sluit als het proces wordt gestopt, en voorgrondservices starten vanuit de achtergrond is vanaf Android 12 beperkt.
- Bevestigd (Android Developers, "Companion device pairing", bijgewerkt 16 oktober 2026): zonder locatierechten te koppelen vanaf Android 8; de rechten `REQUEST_COMPANION_RUN_IN_BACKGROUND` en `REQUEST_COMPANION_START_FOREGROUND_SERVICES_FROM_BACKGROUND` laten de app vanuit de achtergrond starten; vanaf Android 16 is `startObservingDevicePresence(String)` vervangen door een versie met `ObservingDevicePresenceRequest`, waarbij de service gebonden wordt als het apparaat binnen BLE-bereik komt en weer losgelaten als het weggaat. Zonder koppeling geen continu scannen: "Companion device pairing doesn't create connections on its own nor enable continuous scanning."
- Gemeld (Nordic DevZone, "Android: problem with BLE scanning stopped while screen is off on newer phones", "meer dan een jaar geleden", exacte datum niet getoond): sinds een Android 14-update zou bij een Xiaomi 12T en nieuwere OnePlus-toestellen met Android 15 het scannen stoppen met scherm uit. Resultaten komen dan gebundeld op een strakke vijf minuten (reportDelay), of direct als het scherm aan gaat. Samsung wordt niet genoemd en er is geen bevestiging van Nordic of Google. Het is een waarschuwing, geen vaststaand feit voor jouw S25 Ultra.
- Gemeld (dontkillmyapp.com, uit mijn eerdere rapport): Samsung is het strengst voor achtergrondwerk (apps die slapen gelegd worden, alarmen stoppen). Zet de app dan op "Geen beperkingen".
- Eigen afleiding: een broadcast-weegschaal (zoals de Icomon/Fitdays AAA-borden) zendt alleen uit als je erop staat; een scan met filter op de naam of het adres met `PendingIntent` kan de app dan wakker maken en de uitzending lezen, zonder verbinding. Een GATT-weegschaal (zoals jouw FG2202WB als dat jouw model is) moet in de korte tijd dat hij wakker is verbonden worden; dat kan met `CompanionDeviceManager` en een voorgrondservice. Accu: een scan met lage prioriteit en filter is zuinig; een permanente voorgrondservice met melding is zwaarder en moet je alleen gebruiken bij een verbinding. Het is een eigen afleiding; ik vond geen meting op een S25.
- Werkt met de app dicht: waarschijnlijk wel (broadcast: ja met PendingIntent; GATT: ja met CompanionDeviceManager). Dat is bevestigd voor het mechanisme, niet voor jouw weegschaal en Samsung.
- Werk (schatting): bovenop de schil een eigen Kotlin-plugin met scan, protocoldecoder en opslag, en de gegevens opslaan in iets dat de WebView later kan lezen (de WebView draait niet als de app dicht is): 6 tot 10 rondes na een werkende schil, mogelijk meer als de decoder uit nul moet. Dit past alleen als je de Android-schil toch al bouwt.

(c) openScale schrijft het gewicht naar Health Connect en ASCEND leest dat in de Android-schil.
- Mechanisme bevestigd: openScale met openScale-sync kan naar Health Connect schrijven (zie 4.3); de schil leest `weight` uit Health Connect.
- Werkt met de app dicht? Voor het ophalen in ASCEND: ja, want Health Connect is een opslag en ASCEND leest het bij openen. Voor het meten zelf: waarschijnlijk niet. De hoofdontwikkelaar schreef in 2019 in issue 518 ("Reconnect to scale / provide Android Intent to trigger connect via an external app") dat je "in nieuwere Android-versies geen achtergrondtaken meer kunt draaien" en liet de aanvraag zonder voortgang in december 2025 sluiten. Dat is gemeld voor oudere versies; of de herschreven 3.x-versie dit anders doet, vond ik niet (de manifestrechten voor voorgrondservice en opstarten kunnen ook bij sync horen). Reken erop dat openScale open moet zijn en dat je erop moet tikken om te meten.
- Eigen afleiding: openScale moet dus eerst starten (dat is handwerk) en een tweede app naast Fitdays. Je dubbelt de weegschaal-app voor weinig winst.
- Werk (schatting): installatie en instellingen van openScale en sync zijn geen ontwikkeling; de Health Connect-lezer in de schil is werk dat je voor stappen en trappen toch al doet (3 tot 4 rondes uit mijn eerdere rapport).

(c-bis) Een kortere ketting zonder openScale, en volgens mij het makkelijkst: weegschaal naar Fitdays, Fitdays naar Samsung Health, Samsung Health naar Health Connect, en daarna MacroFactor of de schil.
- Bevestigd (Fitdays, "App Features: Data, Charts & Sync", geraadpleegd 22 oktober 2026): Fitdays kan synchroniseren met Samsung Health (Instellingen, Samsung Health, schakelaar aan, inloggen), met Google Fit en Fitbit; op de pagina staat geen Health Connect. Fitdays kan ook een CSV exporteren (menu, Exporteren, alles of per maand). Beschikbaarheid hangt volgens Fitdays af van het model en de appversie.
- Bevestigd (Samsung Developers, "Accessing Samsung Health Data through Health Connect"): Samsung Health synchroniseert gewicht en lichaamssamenstelling naar Health Connect sinds versie 6.22.5 (oktober 2022). Of dat ook geldt voor metingen die Samsung Health van een andere app (Fitdays) kreeg, is niet gezegd; gemeld (Samsung-community, Withings-voorbeeld): zulke gegevens lopen niet altijd door. Dat moet je op jouw toestel proberen.
- Bevestigd (MacroFactor, release notes 2.9.3 en help "Connect Health Connect, Apple Health, or Fitbit"): MacroFactor kan gewicht uit Health Connect halen en erheen schrijven; de prioriteit is handmatig, dan voedsellog, dan Health Connect; bij verbinden worden maximaal 30 dagen terug opgehaald. Het hulpcentrum noemt het slimme-weegschaal-werkwijze met Health Connect. Dit sluit aan bij het bestaande besluit "gewicht uit MacroFactor".
- Werkt met de app dicht: de Fitdays-app moet de meting binnenhalen. Volgens de handleiding verbindt Fitdays automatisch en synchroniseert in realtime als je meet (Fitdays-handleiding, "Connect the Fitdays App", via zoekresultaat). Of dat werkt met Fitdays gesloten, is niet gezegd; veel weegschaal-apps vragen dat je ze eenmaal opent (eigen afleiding). Test: op de weegschaal stappen terwijl Fitdays niet draait en kijken of de meting binnenkomt.
- Werk: geen ontwikkeling; alleen instellingen. Dit is het makkelijkste.

(d) Een kleine server. Een server kan niets met Bluetooth: zij ziet de weegschaal niet. Hij helpt alleen als een stuk op de telefoon (Fitdays-cloud, Health Connect-lezer, native app) de meting naar de server stuurt. De Fitdays-cloud heeft een account, maar ik vond geen publieke API. Dus niet nuttig, behalve als opslag van wat route (b) of (c) levert.

### 4.6 Samenvatting per route

- (a) PWA met Web Bluetooth: werkt met de app dicht niet. 3 tot 5 rondes. Eerst alleen als proef zinvol.
- (b) Native scan op de achtergrond: werkt waarschijnlijk ook dicht (PendingIntent of Companion Device Manager), maar is onbewezen op jouw weegschaal en Samsung. 6 tot 10 rondes bovenop een schil.
- (c) openScale naar Health Connect naar schil: aflezen werkt met ASCEND dicht, meten niet automatisch. Weinig werk, weinig winst.
- (c-bis) Fitdays naar Samsung Health naar Health Connect naar MacroFactor of schil: geen code. Makkelijkste. Onzeker op twee plekken (Samsung Health naar Health Connect bij bronnen van derden, en of Fitdays de meting binnenhaalt met de app dicht).
- (d) Server: helpt niet zelf.

### Bronnen vraag 4

- GitHub, oliexdev/openScale (README), 22 oktober 2026: https://github.com/oliexdev/openScale
- GitHub, openScale Releases (3.0 tot 3.1.3): https://github.com/oliexdev/openScale/releases
- F-Droid, openScale 3.1.3, 9 september 2026: https://f-droid.org/en/packages/com.health.openscale/
- Google Play, openScale (open beta): https://play.google.com/store/apps/details?id=com.health.openscale.oss
- GitHub-wiki, "Supported scales in openScale": https://github.com/oliexdev/openscale/wiki/supported-scales-in-openscale
- GitHub-wiki, "Frequently Asked Questions (FAQ)", geen datum: https://github.com/oliexdev/openScale/wiki/Frequently-Asked-Questions-(FAQ)
- GitHub, oliexdev/openScale-sync (README), 22 oktober 2026: https://github.com/oliexdev/openScale-sync
- GitHub, openScale issue 518, "Reconnect to scale / provide Android Intent to trigger connect via an external app", 24 november 2019 tot 8 december 2025: https://github.com/oliexdev/openScale/issues/518
- Fitdays, "App Features: Data, Charts & Sync", geen datum: https://fitdays.org/docs/user-manual/app-features
- Fitdays, "Download & Connect the Fitdays App": https://fitdays.org/docs/user-manual/connect-the-fitdays-app
- Samsung Developers, "Accessing Samsung Health Data through Health Connect": https://developer.samsung.com/health/blog/accessing-samsung-health-data-through-health-connect
- MacroFactor, help "Connect Health Connect, Apple Health, or Fitbit": https://help.macrofactorapp.com/en/articles/65-connect-health-connect-apple-health-or-fitbit
- MacroFactor, "Version 2.9.3 Release Notes": https://macrofactor.com/version-2-9-3/
- MDN, "Web Bluetooth API", bijgewerkt 27 mei 2025: https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API
- Chrome Developers, "Communicating with Bluetooth devices over JavaScript", 2015: https://developer.chrome.com/docs/capabilities/bluetooth
- WebBluetoothCG, "implementation-status", zonder datum: https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md
- Can I use, "Web Bluetooth", september 2026: https://caniuse.com/web-bluetooth
- Android Developers, "Communicate in the background" (BLE), bijgewerkt 26 februari 2026: https://developer.android.com/develop/connectivity/bluetooth/ble/background
- Android Developers, "Find BLE devices", bijgewerkt 26 februari 2026: https://developer.android.com/develop/connectivity/bluetooth/ble/find-ble-devices
- Android Developers, "Companion device pairing", bijgewerkt 16 oktober 2026: https://developer.android.com/develop/connectivity/bluetooth/companion-device-pairing
- Nordic DevZone, "Android: Problem with BLE scanning stopped while screen is off on newer phones", ruim een jaar oud: https://devzone.nordicsemi.com/f/nordic-q-a/117280/android-problem-with-ble-scanning-stopped-while-screen-is-off-on-newer-phones/515157

---

## Samenvatting per vraag (hooguit 8 regels)

### Vraag 1. Kracht met rusttijden op de Garmin
1. Kosten: 0 euro; het gebruikt dezelfde route als je loopjes.
2. Werk: 1 tot 2 rondes in ASCEND om een krachtworkout van tijdsblokken (werk, `Rust 2m intensity=rest`) als tekst mee te sturen; plus een proef op het horloge.
3. Kan niet: oefeningnamen, herhalingen en gewicht als echte velden (gemeld, 27 september 2026, geen reactie van de ontwikkelaar). Stappen zonder duur vallen weg.
4. Onzeker: of de FR255 een WeightTraining-event aanbiedt, of rust trilt (alleen oude forumberichten), wat muziek doet (alleen over koptelefoon bekend), en of sync in juli 2026 weer stabiel is.
5. Advies: eerst 10 minuten testen met een proefworkout van twee stappen op het horloge met muziek aan. Werkt het, dan kan ASCEND het sturen; zo niet, laat het bij MacroFactor en het horloge zelf.

### Vraag 2. Galaxy Watch 8-app
1. Kosten: 0 euro (ADB over wifi, geen Play-account); onderhoud 1 tot 2 kleine rondes per jaar.
2. Werk: rusttimer die trilt, 4 tot 6 rondes; training van vandaag en sets afvinken erbij 10 tot 16 rondes (telefoon-app met eigen Data Layer-plugin of server).
3. Kan: trilling aan de pols met scherm uit, zelfstandig met wifi of mobiel naar een server; kan niet: bij ASCEND-gegevens komen zonder telefoon-app of server.
4. Een PWA kan niet met het horloge praten; de schil of een server is daarvoor nodig. De Google-verificatie raakt een ADB-installatie niet.
5. Onzeker: of een alarm van twee minuten op de Watch8 met scherm uit altijd trilt (Samsung is streng); alleen testen.
6. Advies: bouw eerst alleen de zelfstandige rusttimer; de rest pas als de schil of server er toch komt.

### Vraag 3. Eigen server
1. Kosten: Cloudflare 0 euro in de gratis laag (5 dollar betaald); Supabase 0 tot 25 dollar; Firebase naar gebruik; Hetzner ongeveer 5 tot 7 euro; Fly.io ongeveer 2 dollar plus volume.
2. Werk: versleutelde back-up 3 tot 5 rondes; meldingen en timers erbij 4 tot 6; gegevens ophalen met sleutels op de server 5 tot 8 en het meeste risico.
3. Belangrijk: Web Push in Edge op Android geeft volgens meldingen (december 2025 tot februari 2026) een nepadres; Chrome werkt. Een timer per melding is daarbij zwakker dan een lokaal alarm.
4. Onzeker: push met scherm uit en muziek aan (geen meting gevonden), hoe precies een Durable Object-alarm is, Garmin-regels voor draaien op een server.
5. Advies: eerst geen server; als dat toch moet, begin met de end-to-end versleutelde back-up in R2 en pas later meldingen.

### Vraag 4. openScale en het gewicht
1. Wat het is: GPL-3.0, maker olie.xdev, versie 3.1.3 (6 september 2026), via F-Droid, Play (bèta) en GitHub; jouw Fitdays FG2202WB staat in de lijst (Runstar R6, handgreep nodig voor vet); export via CSV, Health Connect (openScale-sync) en MQTT.
2. Kosten: 0 euro. Werk: Fitdays naar Samsung Health naar Health Connect naar MacroFactor is alleen instellen; native scan op de achtergrond 6 tot 10 rondes; PWA met Web Bluetooth 3 tot 5 rondes.
3. Met de app dicht: PWA nee; native scan waarschijnlijk wel (PendingIntent of Companion Device Manager); openScale zelf waarschijnlijk niet (open app nodig, gemeld); een server helpt niet.
4. Onzeker: of jouw weegschaal al in Fitdays naar Samsung Health loopt, of Samsung Health bronnen van derden doorgeeft aan Health Connect, en of Samsung de achtergrondscan op de S25 laat leven.
5. Advies: probeer eerst de keten via Fitdays en Samsung Health; ga pas aan een scan op de achtergrond zodra je de Android-schil toch bouwt.
