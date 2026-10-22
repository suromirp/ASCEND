# Loopgegevens en vooruitgang

Alles wat je na een training wilt zien is te berekenen uit de streams van intervals.icu (hartslag, snelheid, hoogte, cadans en de loopdynamica van de HRM-Pro, die sinds augustus en september 2026 als stream bestaan), maar niet uit de gemiddelden op de activiteit zelf, want `decoupling` en `icu_efficiency_factor` leunen waarschijnlijk op vermogen dat een Forerunner 255 niet levert. Ik stel voor per opgeslagen loop of tocht één extra verzoek te doen, in `engine/` een compact profiel van 48 stukjes en een paar klim- en dalstukken te maken, en alleen dat profiel als optioneel, merkloos veld op de log te bewaren, zodat de back-up op schema 5 blijft. Vergelijken doet de app alleen met je eigen eerdere trainingen van dezelfde soort, vlak, in dezelfde hartslagzone en bij een vergelijkbare temperatuur, en kan dat niet, dan zegt hij "niet te vergelijken" in plaats van te gokken. Wat als echt telt is klein: een rustige loop schommelt zelf zo'n 3 procent, een echte verbetering is ongeveer 1 tot 2 procent per maand, drift onder de 5 procent is een coachrichtlijn en geen gemeten grens, en de meeste drempels voor loopdynamiek zijn eigen aannames die ik als zodanig markeer, dus een enkele loop levert alleen bij een groot verschil een oordeel op en de rest hoort in de trend. Na de training komen hooguit twee regels, één "Beter" en één "Let op", met een blad "Waarom" erachter, en op Je stand komt een sectie "Lopen" met vier rijen waarvan de efficiëntierij dezelfde `aerobicTrend` blijft, zodat er geen tweede voortgangsgetal naast komt.

Datum: 22 oktober 2026
Door: Scout Inzicht
Status: voorstel. In `src/` is niets veranderd en er is niets gecommit. Er staat geen persoonsgegeven in dit bestand.

## Hoe ik gewerkt heb en hoe zeker iets is

De OpenAPI-specificatie van intervals.icu was bereikbaar (https://intervals.icu/api/v1/docs geeft de specificatie zelf als JSON terug, 184 velden op `Activity`) en ik heb die vandaag helemaal gelezen. Ik had geen API-sleutel, dus ik heb geen echt antwoord van jouw account gezien. Daarom gebruik ik vier woorden:

- zeker: zo in de specificatie gelezen op 22 oktober 2026, of zelf getest met een verzoek (de CORS-controle en de Open-Meteo-verzoeken hieronder).
- goed: door een ontwikkelaar van intervals.icu zelf geschreven op hun forum, met datum.
- waarschijnlijk: afgeleid uit het schema, uit lijsten van derden of uit het gedrag van andere velden.
- onzeker: ik kon het niet vinden of niet controleren.

Bij de wetenschap gebruik ik de schaal van de rest van `docs/onderzoek/`: bewijs sterk, matig, zwak, expertopinie, afgeleid, en "eigen aanname" voor wat ik zelf als drempel voorstel zonder bron.

## Wat er al is

Ik las eerst CLAUDE.md, `docs/onderzoek/` en `docs/visie/`. Wat telt voor dit voorstel:

- `engine/aerobicTrend.ts` doet al idee 1 in het klein: rustige en lange duurlopen (gepland hoogstens RPE 4, hoogstens 15 m stijging per km, hartslag in zone 2 of tot 15 slagen eronder), tempo omgerekend naar één referentiehartslag met een eenvoudige verhouding, per week gemiddeld op afstand, en een vergelijking van de laatste twee weken met de twee weken een maand eerder. De kaart "Tempo bij zone 2" staat op Ascend (`AerobicTrendCard`). De drempel `MEANINGFUL_CHANGE_SEC` is 5 seconden per km. Dit werkt op gemiddelden van de hele loop, dus op het warme begin en de moe wordende slotkilometers samen.
- `ExternalActivity` (`engine/activityImport.ts`) en `mapIntervalsActivity` lezen nu duur, afstand, stijging, daling, gemiddelde en hoogste hartslag, cadans, `icu_rpe`, `feel` en `trainer`. `CardioMetric` heeft al `hrZones`, `paceMinPerKm` en `power`, maar de koppeling vult ze niet.
- `docs/onderzoek/notities/Trainingsopbouw voor GR5 en hardlopen/signalen_autoregulatie.md` en `Andere manieren om belasting te plannen.md` zeggen allebei dat drift en decoupling "pas na een FIT-import" kunnen, omdat ASCEND alleen gemiddelden logt. Dat blijkt niet nodig: de streams-eindpoint van intervals.icu geeft dezelfde reeksen als JSON, zonder FIT-lezer van 63 KB.
- `docs/visie/Trainingswetenschap.md` (tempo en doeltijd, de hartslag-tempo-index van Vesterinen) en `docs/onderzoek/Betrouwbaarheid beenvermoeidheid-index.md` (barometrische hoogte is in heuvels goed, in vlak terrein ruis) staan al klaar. De regel uit Bontemps 2020 in de notities (na bergaf hardlopen is zuurstofverbruik bij gelijke snelheid 4 tot 7 procent hoger tot drie dagen later) is voor dit voorstel belangrijk: moe-van-dalen benen maken je efficiëntiecijfer slechter zonder dat je minder fit bent.
- De na-training-kaart is `CompletionMoment` met `engine/completionSummary.ts`: drie regels (doel, week, benen) en één groene knop. De uitleggebladen zijn gemodelleerd in `Gr5ReadinessSheet`. Je stand heeft de secties Benen, Belasting, Doel.
- Beslissingen waar dit tegenaan ligt: `2026-10-22-garmin-is-leidend.md`, `2026-10-22-lege-velden-aanvullen.md` (aanvullen mag, alleen na een tik), `2026-10-22-wat-ascend-van-je-horloge-gebruikt.md` (elke soort horlogegegevens heeft een schakelaar), `2026-10-22-back-up-v5.md`, `2026-10-22-steen-en-contour.md`, `2026-10-22-gr5-voortgang-een-percentage.md` (geen tweede voortgangsgetal) en `2026-10-22-heuveltocht-is-bergtocht.md`.

## 1. Wat intervals.icu teruggeeft

### De twee verzoeken

`GET /api/v1/athlete/{id}/activities?oldest=&newest=` geeft een lijst van `Activity`-objecten (zeker). Het kent ook `limit`, `route_id` en `fields` (zeker): met `fields` kies je een kommalijst van veldnamen en nullen vallen weg. Een activiteit van Strava komt als lege stub terug (zeker, staat zo bij het eindpunt).

`GET /api/v1/activity/{id}` geeft één activiteit. Met `?intervals=true` komt `icu_intervals` en `icu_groups` erbij (zeker). Het antwoord is `Activity`, `ActivityWithIntervals` of een verborgen stub (zeker).

Zelf getest op 22 oktober 2026: de CORS-voorcontrole (`OPTIONS`) voor zowel `/api/v1/athlete/{id}/activities` als `/api/v1/activity/{id}/streams.json` geeft 200 met `access-control-allow-origin` voor de opgegeven herkomst en `authorization` als toegestane header. De streams-eindpoint werkt dus net als de huidige verzoeken vanuit een webapp op GitHub Pages (zeker voor de voorcontrole; het echte verzoek met sleutel heb ik niet kunnen doen).

Limieten voor een eigen API-sleutel (goed, forumgids "API access to Intervals.icu"): 5.000 verzoeken per dag, 2.500 per 15 minuten, 10 per seconde per IP. Eén extra verzoek per opgeslagen training is daar ver onder.

### Velden die ASCEND al leest

`id`, `start_date_local`, `type`, `name`, `source`, `device_name`, `moving_time`, `elapsed_time`, `distance`, `total_elevation_gain`, `total_elevation_loss`, `average_heartrate`, `max_heartrate`, `average_cadence`, `icu_rpe`, `feel`, `trainer`, `deleted`. Allemaal zeker.

### Idee 1, hetzelfde hart sneller

- `icu_efficiency_factor` (getal), `pace` (getal), `average_speed`, `max_speed`, `gap` en `gap_model` (gradient adjusted pace). Namen zeker. Wat ze precies betekenen is onzeker: de specificatie heeft geen omschrijvingen. Op het forum (draad "Running efficiency and Decoupling") schrijft de ontwikkelaar dat hij voor hardlopen een eigen veld "GAP/HR" maakte, en een gebruiker meldt dat de ingebouwde variant op hartslagzones leunt. De eenheid van `pace` staat nergens. Mijn advies: niet op deze velden bouwen, maar zelf rekenen uit de streams.
- `icu_hr_zone_times` (lijst van seconden per zone) en `icu_hr_zones` (de bovengrenzen van de zones van de atleet in intervals.icu), `lthr`, `athlete_max_hr`, `icu_resting_hr`. Zeker. Let op: dit zijn de zones zoals ze in intervals.icu staan, niet per se die van `AppSettings.heartRate`. Zelf rekenen uit de hartslagstream met de zones van ASCEND voorkomt twee waarheden.
- `average_temp`, `min_temp`, `max_temp` (zeker): temperatuur van het horloge. Op de pols of borst warmer dan de lucht en daarom niet geschikt als weer.
- `trimp`, `hr_load`, `hr_load_type`, `icu_training_load`, `session_rpe`, `perceived_exertion`, `polarization_index`. Zeker aanwezig, niet nodig hiervoor.

### Idee 2, hartslagdrift op lange dagen

- `decoupling` (getal) staat op `Activity` en op elk `Interval` (zeker). Op het forum (draad "Decoupling for running") meldt een gebruiker dat decoupling alleen beschikbaar is met vermogensgegevens, en iemand stelt voor het snelheidsgebaseerd te maken (één min de EF van de tweede helft gedeeld door die van de eerste helft). De ontwikkelaar bevestigt dat in dat draadje niet. Een Forerunner 255 geeft geen eigen hardloopvermogen (onzeker voor jouw opstelling; de stream `watts` in `stream_types` zou het laten zien). Beoordeling: waarschijnlijk leeg bij jou, en als hij gevuld is weet je niet op welke grondslag. Zelf rekenen.
- `icu_hrr` (object met `start_bpm`, `end_bpm`, `hrr`): hartslagherstel na afloop. Zeker aanwezig. Buchheit (zie hieronder) geeft hartslagherstel een variatie van ongeveer 25 procent, dus als maat te ruw.
- `submax_fatigue_test` (zeker, object met `type` POWER, PACE of NONE, `final_bpm`, `hrrc`, `efficiency_factor`, `cv`, `average_mps`). Dit is de automatische submaximale test van intervals.icu: een vast tempo van 3 minuten gevolgd door een rustige minuut. Het is een supporterfunctie (goed, forum "Automatic Submaximal Fatigue Testing") en werkt alleen als je daar een doeltempo instelt. Interessant voor later (zie bij de open vragen), niet voor dit voorstel.
- `interval_summary`, `icu_lap_count`, `icu_intervals` via `?intervals=true`. Bij elk interval staan onder meer `average_heartrate`, `average_speed`, `gap`, `total_elevation_gain`, `average_cadence` en de negen loopdynamicagemiddelden (zeker, uit het schema). Of de rondes van de Garmin (automatische ronde per km, als je die aan hebt) als intervallen binnenkomen is onzeker. Daarom is dit geen basis.

### Idee 3, bergop en bergaf

- `total_elevation_gain`, `total_elevation_loss`, `average_altitude`, `min_altitude`, `max_altitude`, `use_elevation_correction` (zeker). Met hoogtecorrectie kan intervals.icu een ander totaal geven dan de Garmin. De log neemt nu `total_elevation_gain` over. Het profiel moet daarom zijn eigen hoogtewinst uit de reeks tellen en de twee vergelijken (kwaliteitscontrole, zie 5).
- `average_vertical_speed` (zeker, nieuw in 2026) en de stream `vertical_speed` (goed): "rate of climb, read straight from devices that report it (m/s)". Of een Forerunner 255 dit schrijft weet ik niet (onzeker). Niet op rekenen.
- `gap`, `gap_model`, `gap_zone_times` (zeker): tempo gecorrigeerd voor helling. Handig voor lichte heuvels, niet voor echte bergen.
- Streams `altitude`, `distance`, `velocity_smooth`, `heartrate`, `cadence`, `time` (waarschijnlijk: twee onafhankelijke lijsten van derden noemen ze, de specificatie somt de namen niet op) en `grade_smooth` en `moving` (waarschijnlijk, alleen in lijsten van derden). Ik stel voor `grade_smooth` niet te gebruiken en de helling zelf uit `altitude` en `distance` te halen, dan hangt er niets van af.

### Idee 4, pas, cadans en loopdynamica van de HRM-Pro

Dit is nieuw en goed gedocumenteerd, maar jong. De ontwikkelaars schreven op 16 juli 2026 dat ze de loopdynamica uit FIT-bestanden gingen aanbieden, op 3 augustus 2026 dat de eerste streams er waren, en op 31 augustus 2026 dat het er twaalf zijn (goed, forum "Working on advanced running metrics" en "New Running Metrics").

Activiteitsvelden met gemiddelden (zeker uit de specificatie, zelfde namen in het forumbericht): `average_stance_time` (ms, grondcontacttijd), `average_stance_time_percent` (% van een volledige pas, twee stappen), `average_stance_time_balance` (% van de contacttijd op de linkervoet; 50 is gelijk), `average_vertical_oscillation` (mm), `average_vertical_ratio` (%), `average_step_length` (mm), `average_vertical_speed`, `average_leg_spring_stiffness` en `average_impact_loading_rate` (die twee komen van een Stryd-pod en zullen bij jou leeg zijn). Ze staan ook op elk interval. De eenheden in deze lijst komen uit het forum, niet uit de specificatie (goed, niet zeker).

Daarnaast bestaan `average_stride` (al langer; volgens het forum eigenlijk de pasafstand van één stap, de eenheid is niet gedocumenteerd) en `avg_lr_balance` (links en rechts van vermogen, niet de grondcontactbalans; negeren).

Streams (goed, ontwikkelaar op 3 augustus 2026): `stride_length`, `stance_time`, `stance_time_percent`, `stance_time_balance`, `vertical_oscillation`, `vertical_ratio`, `vertical_speed`, `step_length`, `leg_spring_stiffness`, `impact_loading_rate`. De aankondiging van 31 augustus noemt er twee bij die intervals.icu zelf uitrekent, "flight time" en "flight ratio"; de exacte stream-id's daarvan staan niet in wat ik las (onzeker, vermoedelijk `flight_time` en `flight_ratio`). Alle streams zijn per meting, dus ook via de API.

Wat dit voor jouw horloge betekent:

- De HRM-Pro meet via een versnellingsmeter op de borst zes grootheden: cadans, verticale oscillatie, grondcontacttijd, balans, pasafstand en verticale ratio (zeker, Garmins eigen pagina). De Forerunner 255 is niet met naam genoemd in wat intervals.icu bevestigde; zij noemen een FR945 met HRM-Pro en "die familie" (goed). Dat een FR255 met HRM-Pro ze schrijft is waarschijnlijk, niet bevestigd.
- De grondcontactbalans komt alleen van de borstband of een pod, niet van de pols (Garmins pagina voor de FR265). Dat geeft een mooie herkenning: staat `stance_time_balance` in de `stream_types` van een loop, dan was de band om. Dat is afgeleid, niet gedocumenteerd.
- Alles komt uit FIT-bestanden. Activiteiten die ouder zijn dan ongeveer een week voor de uitrol hebben de nieuwe velden alleen na "reprocess" (de ontwikkelaar op 1 september 2026: "ja, als ze ouder zijn dan ongeveer een week"). ASCEND kan dat niet via de API afdwingen. Je loopdynamica-historie begint dus bij de eerste loop na het aanzetten, tenzij je oude loopjes in intervals.icu zelf opnieuw laat verwerken.
- `Activity.stream_types` (zeker) is de lijst van streams die een activiteit echt heeft. Dat is de poort: alleen vragen wat er is, en zonder `stance_time` in die lijst valt de pas-en-vorm-regel weg in plaats van iets te verzinnen.

### De streams-eindpoint

`GET /api/v1/activity/{id}/streams.json?types=heartrate,velocity_smooth,...` (zeker voor het pad en de parameter `types`; het forum bevestigt dat het enkelvoud `activity` is en dat een andere uitgang dan `.csv` JSON geeft). Het antwoord is een lijst van `{ type, name, data, data2, valueTypeIsArray, anomalies, custom, allNull }` (zeker uit het schema). `data` is de reeks; bij `latlng` staat de tweede coördinaat in `data2` (waarschijnlijk). Zonder `types` krijg je alles, dus altijd `types` meegeven.

Omvang: een rustig uur met negen streams is grofweg 30.000 getallen, dus enkele honderden KB JSON; een tocht van zes uur een paar MB. Eén keer per opgeslagen training is dat te dragen, en alleen op wifi hoeft niet. De reeks zelf bewaart ASCEND niet (zie 5).

### Weer

intervals.icu heeft per activiteit `has_weather`, `average_weather_temp`, `average_feels_like`, `average_wind_speed`, `average_wind_gust`, `headwind_percent`, `tailwind_percent`, `max_rain` en meer (zeker in de specificatie). Het forum zegt dat dit voor supporters is en uit Open-Meteo komt (goed, draad "Weather on activities and map"). Daar mag ASCEND niet op rekenen. Wat ASCEND zelf heeft: Open-Meteo met `past_days` (tot 92 dagen terug) op hetzelfde `forecast`-eindpunt als het weerscherm. Ik riep het op 22 oktober 2026 aan met `hourly=temperature_2m,apparent_temperature,windspeed_10m,relative_humidity_2m&past_days=3` en kreeg uurwaarden terug (zeker). De aparte archiefhost `archive-api.open-meteo.com` was vanuit mijn omgeving niet bereikbaar; dat zegt niets over jouw telefoon (onzeker).

### Wat ik niet kon nagaan, en hoe je dat in vijf minuten doet

Eén verzoek met je eigen sleutel zegt alles. Met de `fields`-parameter blijft het klein:

`/api/v1/athlete/{id}/activities?oldest=2026-10-01&newest=2026-10-22&fields=id,name,type,stream_types,decoupling,icu_efficiency_factor,pace,gap,average_stride,average_stance_time,average_stance_time_balance,average_vertical_oscillation,average_vertical_ratio,average_step_length,average_vertical_speed,has_weather`

Lookout of de eigenaar bekijkt dan: staat `stance_time` en `stance_time_balance` in `stream_types`; zijn de negen gemiddelden gevuld; is `decoupling` leeg; staat `watts` in `stream_types`; in welke eenheden komen `pace` en `average_stride` terug. Daarna zijn alle "onzeker" hierboven weg, behalve de Garmin-specifieke vraag of `vertical_speed` bestaat.

## 2. Hoe je eerlijk vergelijkbare trainingen kiest

De kern: een verschil is pas een verschil als de twee trainingen alleen verschilden in wat je wilt weten. Hartslag bij vast tempo is de betrouwbaarste hartslagmaat, met een dag-tot-dagvariatie van ongeveer 3 procent (Buchheit 2014, bewijs: matig), maar alleen onder gelijke omstandigheden. Een eerlijke vergelijking is dus vooral een lijst uitsluitingen.

### De poort voor elke vergelijking

Een training telt alleen mee als aan allemaal voldaan is. Elk punt heeft een reden, en elk punt dat faalt komt, in gewone woorden, in de zin "niet te vergelijken".

1. Zelfde soort sessie. Zelfde sjabloon of in elk geval dezelfde bedoeling: een rustige duurloop met rustige duurlopen, een lange loop met lange lopen, een tocht met tochten. Een tempoloop of interval telt niet voor efficiëntie of drift (hartslag loopt achter bij korte inspanningen, `docs/visie/Trainingswetenschap.md`). Dat past bij de bestaande drempel: gepland hoogstens RPE 4.
2. Buiten, geen loopband. Een loopband heeft geen GPS-tempo, een eigen kalibratie en meestal een andere hartslag door warmte (`ExternalActivity.treadmill` bestaat al). Loopband en buiten zijn twee aparte reeksen en nooit met elkaar te vergelijken. Voor een loopbandloop kan alleen de eigen reeks gebruikt worden, en alleen als de band op dezelfde stand en snelheid staat.
3. Vlak, en steady. Het stuk waarmee gerekend wordt (het "vaste blok") is minstens 15 minuten aaneengesloten, begint pas na de eerste 10 minuten, en heeft in elk stukje een helling binnen plus of min 2 procent en een tempo dat niet meer dan 8 procent schommelt. Nuuttila 2022 mat zijn hartslag-tempo-index op minuut 5 tot 10 van een vlakke warming-up, juist om drift en vermoeidheid buiten de maat te houden (matig). De bestaande drempel van 15 m stijging per km blijft voor de hele loop als eerste zeef. Eigen aanname: de grenzen 15 minuten en 8 procent.
4. Zelfde hartslagzone. Het vaste blok zit in zone 2 van jouw eigen zones, of tot 15 slagen eronder (zoals `aerobicTrend` nu doet). Ruim daarboven is geen rustige loop meer en daarmee een ander fysiologisch punt (`docs/onderzoek/Trainingsvormen en varianten.md`).
5. Temperatuur. Zie hieronder; dit is de lastigste.
6. Benen uitgerust. Geen zware dal-dag, lange loop (boven 60 minuten) of beenkracht in de 48 uur ervoor, en `legFatigueOn` niet "niet fris". Zonder dit meet je je benen en niet je hart. Reden: Bontemps 2020, tot drie dagen na bergaf hardlopen 4 tot 7 procent hoger zuurstofverbruik bij gelijke snelheid (bewijs: matig). `engine/legFatigue.ts` heeft de index al.
7. Zelfde hartslagbron. Een borstband en een optische polssensor geven bij dezelfde inspanning verschillende cijfers. Garmin zelf raadt de band aan voor sturing (`data/garminGuide.ts`). Vergelijk niet over een wissel heen. ASCEND weet niet welke bron er was. Oplossing: een instelling "Mijn hartslag komt van de borstband" (standaard aan voor deze eigenaar), en de herkenning `stance_time_balance` aanwezig als aanwijzing dat de band om was (afgeleid).
8. Genoeg vergelijkingsmateriaal. Minstens 3 en liefst 5 eerdere lopen die aan 1 tot 7 voldoen, in de laatste 6 weken. Minder dan 3 geeft "nog te weinig vergelijkbare loopjes". Het referentiepunt is de mediaan, niet het gemiddelde, zodat een rare dag niet doorweegt.

### Temperatuur, wind en vocht

Hitte verhoogt hartslag bij gelijk tempo. De beste getalschatting die ik vond is één kleine laboratoriumstudie met 12 getrainde lopers op 70 procent van de piekloopsnelheid: eindhartslag 154 bij 15 graden, 161 bij 25 graden en 176 bij 35 graden, zonder drift bij 15 graden maar met drift bij 25 en 35 (ECSS-samenvatting van een Zuid-Afrikaans proefschrift, via de bibliotheek van het IAT Leipzig; bewijs: zwak, één studie, en de hellingschatting van ongeveer 1 slag per graad is mijn eigen rekensom op die gemiddelden). Als 4 graden verschil 4 slagen is, is dat net zo groot als het signaal dat Nuuttila als "normaal" nam (3 tot 4 slagen). Temperatuur hoort dus in de poort.

Regel, eigen aanname, te ijken op je eigen data na een paar weken:

- Verschil in gevoelstemperatuur van minder dan 4 graden: gewoon vergelijken.
- 4 tot 8 graden: vergelijken mag, maar als het weer de richting van het verschil kan verklaren (warmer en je hartslag is hoger, kouder en je hartslag is lager) zegt de app dat en geeft hij dan geen "Beter" of "Let op". Het weer kan een verbetering ook verklaren: een koele dag maakt je efficiënter.
- Meer dan 8 graden: "niet te vergelijken op temperatuur", geen oordeel.
- Wind: gemiddeld 25 km/u of meer, of vlagen boven 40 km/u, geeft een melding "veel wind" en geen oordeel over tempo (eigen aanname; ik vond geen studie die een grens geeft). Een heen-en-terug-route middelt wind voor een deel weg, een rondje met één lange tegenwindzijde niet.
- Luchtvochtigheid: opnemen om het in "waarom" te kunnen noemen, niet als harde grens.

Waar het weer vandaan komt: de afgeronde plaats van het begin van de activiteit (de eerste `latlng` van de stream, op twee decimalen afgerond, zoals `roundCoordinate` in `integrations/openMeteo.ts` al doet) of anders je thuisplaats, met uurwaarden over de duur van de training via `past_days`. Het spoor zelf wordt nooit bewaard.

### Wanneer "niet te vergelijken"

De app zegt het en doet dan niets anders, in deze gevallen:

- Minder dan 3 eerdere lopen in de poort.
- De training zelf haalt de poort niet (te heuvelachtig, geen vast blok, geen hartslag, geen stream).
- Meer dan 8 graden verschil, of regen en harde wind die het tempo bepaalden.
- De benen waren niet uitgerust.
- De borstband ontbrak of de hartslagbron wisselde.
- Een klim of daling zonder een eerder stuk in dezelfde hellingklasse en met hetzelfde rugzakgewicht.

De zin is altijd concreet en nooit een verwijt: "Niet te vergelijken met je laatste loopjes: het was 11 graden warmer."

## 3. Wat in de sportwetenschap een betekenisvolle verandering is

Ik zet er steeds bij wat ik wel en niet vond. Wat ontbreekt noem ik, ook als het onhandig is.

### Hetzelfde hart, sneller (efficiëntie)

- Dag-tot-dagruis. Hartslag bij vast submaximaal tempo heeft een variatiecoëfficiënt van ongeveer 3 procent en een kleinste zinvolle verandering van ongeveer 1 procent ([Buchheit 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/)) (bewijs: matig). Het staat al in `Trainingsopbouw voor GR5 en hardlopen.md`.
- Drempel in een gecontroleerde studie. In de studie met recreatieve lopers telde een daling van de hartslag-snelheidsindex met 0,50 ten opzichte van het gemiddelde van de vorige twee weken, ongeveer 3 tot 4 slagen hogere hartslag bij hetzelfde tempo, als buiten het normale ([Nuuttila e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/)) (bewijs: matig). De index werd gemeten over minuut 5 tot 10 van elke loop, op vlak terrein, en de vergelijking was met een tweewekelijks gemiddelde, niet met één loop.
- Past bij fitheid. De verandering van de hartslag-loopsnelheidsindex over 28 weken liep bij 45 recreatieve lopers mee met de verandering van piekloopsnelheid (r = 0,43 tot 0,61) en van VO2max (r = 0,49) ([Vesterinen e.a. 2014](https://lida.sport-iat.de/ta/Record/4031002)) (bewijs: matig; correlaties van veranderingen, geen voorspelling per loop).
- Realistische verbetering. Recreatieve lopers die al trainen verbeterden hun 10 km in 10 tot 15 weken met 3 tot 6 procent ([Muñoz e.a. 2014](https://pubmed.ncbi.nlm.nih.gov/23752040/); Nuuttila e.a. 2022) (bewijs: matig). Dat is 1 tot 2 procent per maand. Snelheid bij gelijke hartslag beweegt ongeveer mee (afgeleid). Op een rustig tempo van 6:00 per km is 1 procent 3,6 seconden, 2 procent 7,2 en 5 procent 18 seconden. Beginners gaan sneller, en je zit nog vroeg in je loopcarrière.

Wat dit betekent voor de drempels (afgeleid, mijn rekensom):

- Eén loop tegen het midden van je laatste drie tot vijf vergelijkbare loopjes verschilt gemiddeld met ongeveer 3 procent maal de wortel van 1 plus 1/n, dus 3,3 tot 3,5 procent. Pas bij ongeveer 1,5 maal dat, dus rond de 5 procent (18 seconden per km op 6:00), is een enkele loop meer dan toeval. Dat is groter dan een realistische verbetering van een maand. Gevolg: na één loop zeg je alleen "Beter" bij een groot verschil (een vlak rustig loopje dat duidelijk sneller was bij gelijke hartslag), en de gewone voortgang van 1 tot 2 procent per maand hoort in de trend, niet in een oordeel na elke loop.
- Voor de trend (de laatste twee weken tegen de twee weken een maand eerder, elk met meestal 3 tot 4 loopjes) is het verschilgemiddelde ongeveer 2 procent. De huidige drempel `MEANINGFUL_CHANGE_SEC` van 5 seconden per km is op 6:00 maar 1,4 procent, dus kleiner dan wat ruis kan geven. Voorstel: 7 seconden per km (ongeveer 2 procent) en minstens 3 loopjes aan elke kant. Dit is een aparte beslissing voor `aerobicTrend` zelf, niet iets wat ik hier doe.
- De omrekening in `aerobicTrend` (tempo maal hartslag gedeeld door referentiehartslag) laat hartslag evenredig met snelheid zijn. Hartslag loopt echter vanaf een rustwaarde. Met de hartslagreserve (hartslag min rusthartslag), zoals de index van Vesterinen met rust- en maximale hartslag, wordt 4 slagen verschil bij een tempo van 6:00 ongeveer 15 seconden in plaats van 10 (voorbeeld: rusthartslag 55, referentie 150, loop op 146: evenredig 350 seconden, via de reserve 345). Afgeleid, niet getoetst; de rusthartslag staat al in `HeartRateSettings.restingHr`. Een aparte verbetering, hier alleen genoemd.

### Lange dagen: hartslagdrift

- Wat het is: het stijgen van de hartslag, of dalen van snelheid per slag, binnen één inspanning bij gelijk gehouden werk. Aerobe ontkoppeling is de relatieve daling van de efficiëntiefactor (snelheid gedeeld door hartslag) tussen eerste en tweede helft.
- De 5 procent. Onder 5 procent is goed, 5 tot 10 procent een matige beperking of vermoeidheid, boven 10 procent boven de aerobe drempel of onvoldoende uithoudingsvermogen. Dat is een coachrichtlijn van Joe Friel en geen gevalideerde grens ([TrainingPeaks over decoupling](https://www.trainingpeaks.com/coach-blog/aerobic-endurance-and-decoupling/)) (bewijs: expertopinie). Ik vond geen studie die de percentages tegen een fysiologische grens legt of die de herhaalbaarheid van de maat bij lopers meet. Wie "onder 5 procent" als bewezen presenteert, overdrijft.
- Waar het voor geldt. Voor lange, gelijkmatige, rustige inspanningen. Een gebruikersdraad bij intervals.icu noemt hoogstens sessies van meer dan 40 minuten; in heuvels, bij ongelijk tempo, hitte, uitdroging of te weinig brandstof loopt de maat uit de hand (forum, expert).
- Hoe groot de ruis is. Bij 35 mensen die 10 weken lichte of zware training deden en daarna drie uur fietsten, steeg de hartslag tussen minuut 30 en 180 met gemiddeld 15 slagen; de spreiding tussen personen was 7 tot 9 slagen; na zware training (HIT) daalde de drift met 4,9 slagen, na lichte training niet significant ([Matomäki e.a. 2023](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1128111/full)) (bewijs: matig tot zwak voor jouw geval; fietsen, niet-getrainde deelnemers, niet lopers). Les: drift reageert langzaam op training en verschilt sterk per persoon, dus per persoon vergelijken met eigen eerdere lange dagen, niet met een tabel.
- Waarom het voor jou telt. Het begrip "durability" is hoe sterk je fysiologie slechter wordt tijdens lange inspanning, met hartslagdrift als meest gebruikte maat ([Maunder e.a. 2021](https://lida.sport-iat.de/ta/Record/4069575)) (bewijs: matig voor het begrip). Een GR5-dag is precies zo'n inspanning. Er zijn geen studies die lopers met een bepaald driftpercentage een GR5-prestatie voorspellen; dat is afgeleid.

Voorstel (eigen aanname, te ijken):

- Voor lange loopjes: tweede helft van het vaste blok (minstens 45 minuten na het warme begin, helling plus of min 3 procent) tegen de eerste helft. Percentage = (EF eerste helft min EF tweede helft) gedeeld door EF eerste helft.
- Oordeel naast de 5 procent: "Beter" als de drift minstens 3 procentpunten lager is dan het midden van de laatste drie vergelijkbare lange dagen; "Let op" als hij boven 8 procent ligt én minstens 3 procentpunten boven dat midden. Alles ertussen is gewoon een feit zonder oordeel.
- Voor tochten met klimmen: de maat is niet geldig (snelheid hangt van de helling af). Vervanger: hartslag bij gelijke klimsnelheid in het eerste derde en het laatste derde van de tocht, in dezelfde hellingklasse (zie hieronder). Minder precies, daarom altijd als "feit" getoond en nooit als "Let op" op zichzelf.

### Bergop en bergaf

Bergop:

- Klimsnelheid in meters stijging per uur is eenvoudig te berekenen en bruikbaar om jezelf met jezelf te vergelijken. Ik vond geen referentiewaarden voor recreatieve wandelaars met rugzak en geen studie naar de dag-tot-dagspreiding ervan. De waarde hangt sterk van de helling af: de energiekosten per verticale meter zijn het laagst rond 20 tot 30 procent helling ([Minetti e.a. 2002](https://iris.unibs.it/retrieve/ddc633e4-3c03-4e2e-e053-3705fe0a4c80/Minetti%20JAP%202002.pdf)) (bewijs: sterk, klassiek). Dus altijd in een hellingklasse vergelijken (bijvoorbeeld 4 procent breed) en met hetzelfde rugzakgewicht (plus of min 2 kg).
- De noodzakelijke vervolgstap is hartslag erbij: klimsnelheid zonder hartslag zegt alleen dat je harder ging. Vergelijk daarom op "zelfde hartslag, hogere klimsnelheid" of "zelfde snelheid, lagere hartslag". Eigen aanname: 8 procent verschil in snelheid met een hartslag die niet meer dan 4 slagen hoger is, of 5 slagen lagere hartslag bij een snelheid binnen 5 procent. Zonder bron; ijken na de eerste zes klimmen.
- Nederland: stukken van 150 meter stijging aaneen zijn zeldzaam. Ik stel twee klassen voor: "heuvel" (minstens 50 m stijging, 4 minuten, 4 procent helling gemiddeld) en "klim" (minstens 150 m, 8 minuten). De heuvelklasse past bij `2026-10-22-heuveltocht-is-bergtocht.md`, maar is gevoeliger voor ruis in barometrische hoogte (zie `Betrouwbaarheid beenvermoeidheid-index.md`: onder ongeveer 5 m per km is ruis). Een klim op de loopband telt niet (geschatte hoogte).

Bergaf:

- Dalen is wat je benen op een GR5-dag het meest kost en alle hartslagmaten missen het (`Andere manieren om belasting te plannen.md`; [Vernillo e.a. 2017](https://www.iat.uni-leipzig.de/datenbanken/iks/mint/Record/4043194), [Bontemps e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7674385/)) (bewijs: matig). De oorzaak is de excentrische arbeid van de dijspieren, niet je hart.
- Wat ik niet vond: een gevalideerde maat voor "beheerst dalen" uit tempo, hartslag of cadans. Ook niet voor cadans bergaf. Alles wat ik voorstel is dus een eigen aanname.
- Daarom: bij dalen eerst alleen feiten tonen (meters omlaag, tijd, gemiddeld tempo en verticale snelheid, hartslag, cadans), en pas een woord als er een duidelijk eigen signaal is. Het eerlijkste signaal is binnen dezelfde daling: de verticale daalsnelheid en de cadans in het laatste derde tegen het eerste derde. Zakt de snelheid met 15 procent of meer terwijl de hartslag niet stijgt, dan past dat bij vermoeide benen in plaats van een moe hart (uit de notities: bij lokale spiervermoeidheid daalt de hartslag zelfs, expertopinie). Een daling waarbij je hartslag boven je rustige-loop-hartslag uitkomt is geen beheerste daling, maar ook dat is afgeleid.

### Pas, cadans en loopdynamica

Hoe betrouwbaar zijn de cijfers zelf:

- De HRM-Pro gaf in een vergelijking met drie meetsystemen bij 50 recreatieve lopers op een loopband (9 en 12 km/u) een goede overeenstemming; alleen de verticale oscillatie lag hoger dan bij videoanalyse (ongeveer 4,6 mm bij 12 km/u) ([Cabrera-Linares e.a. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12431186/)) (bewijs: matig; loopband, twee snelheden, en het artikel heeft interne tegenstrijdigheden tussen tabel en tekst bij een paar ICC-waarden). Er is geen krachtplaatvergelijking van de HRM-Pro die ik vond. Garmin zegt zelf dat hij torsobeweging meet en daar zes grootheden uit rekent.
- Dag-tot-dagspreiding. Met een heupsensor op de loopband en 7 tot 10 dagen tussen twee metingen lag de variatiecoëfficiënt van de contacttijd tussen 0,9 en 2,2 procent (kleinste zinvolle verandering 4 tot 12 ms), van de pasafstand 0,6 tot 1,0 procent (0,04 tot 0,06 m) en van de pasfrequentie 0,6 tot 1,0 procent, bij 9, 15 en 21 km/u ([Miqueleiz e.a. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12127928/)) (bewijs: matig; een ander apparaat dan de HRM-Pro, loopband). Buiten, met wisselend tempo, is de spreiding groter (eigen inschatting). Voor verticale oscillatie vond ik geen spreidingscijfer; behandel hem als ruwer dan contacttijd.
- De cijfers hangen sterk af van het tempo. Een hogere snelheid geeft kortere contacttijd en langere passen. Vergelijk dus alleen op een tempo binnen 6 procent, of vergelijk binnen één loop.

Wat vermoeidheid doet:

- Bij hetzelfde tempo wordt de grondcontacttijd langer als je moe wordt (een meta-analyse van 16 overgrondse studies: gestandaardiseerd verschil 0,52, betrouwbaarheidsinterval 0,22 tot 0,82, sterk bewijs volgens de auteurs; bij wisselend tempo werd de pas korter). Ik kon de auteurs en de titel niet bevestigen via de bibliotheekrecord ([IAT-record 4088323](https://lida.sport-iat.de/ta/Record/4088323)), dus noem dit zwak tot matig.
- In een marathon met sensoren op drie plekken bij 23 recreatieve mannen nam de contacttijd toe en daalde de snelheid na ongeveer 35 km ([Zhang e.a. 2025, Sports Medicine Open](https://sportsmedicine-open.springeropen.com/articles/10.1186/s40798-025-00915-9)) (bewijs: zwak; één groep, ik zag alleen de samenvatting).
- De bredere review van 33 studies zegt iets wat voor ontwerp telt: de reacties verschillen sterk per persoon, en de auteurs raden analyse per persoon aan; de verticale verplaatsing nam toe bij beginnende en niet bij ervaren lopers ([Zandbergen e.a. 2023](https://research.utwente.nl/en/publications/effects-of-level-running-induced-fatigue-on-running-kinematics-a-/)) (bewijs: matig).
- Les: vergelijk jezelf met jezelf, en liefst binnen dezelfde loop (het eerste derde tegen het laatste derde), zodat dag-tot-dagruis en verschillen tussen personen wegvallen.

Normale waarden en grenzen: Garmin geeft geen getalsgrenzen ("een lagere verticale ratio wijst meestal op betere loopvorm"). Intervals.icu noemt als vuistregel dat een blijvende links-rechtsverdeling buiten ongeveer 52 tegen 48 een blik waard is en dat COROS 55 procent als blessuregrens hanteert (goed als bron, maar het is een leveranciersuitspraak en geen studie; bewijs: expertopinie). Verticale ratio zou volgens de ontwikkelaar niet met lengte samenhangen (goed, geen studie genoemd).

Voorstel voor "alleen tonen als er iets opvalt" (alles eigen aanname, gebaseerd op de spreidingscijfers hierboven met een veiligheidsmarge):

- Binnen één loop, bij een tempo dat in het laatste derde niet meer dan 6 procent afwijkt van het eerste derde: grondcontacttijd 5 procent of meer langer (ongeveer 12 ms bij 250 ms), of pasafstand 4 procent of meer korter, of cadans 3 stappen per minuut of meer lager. Twee van de drie tegelijk geeft een regel; één alleen geeft hem pas als het groter is dan het dubbele van de drempel.
- Tegen eerdere lopen (mediaan van minstens 3 vergelijkbare, tempo binnen 6 procent): grondcontacttijd 4 procent of 10 ms verschil, pasafstand 3 procent, en dat bij minstens twee lopen op rij voordat het "Let op" wordt.
- Verticale oscillatie: alleen in de lange tekst, nooit als regel, tot er een spreidingscijfer is.
- Balans: pas melden als de afwijking van 50 minstens 2 punten groter is dan je eigen midden over 3 lopen én boven 52 tegen 48 uitkomt, drie lopen achter elkaar. En dan zonder medische toon: "Je rechtervoet staat langer op de grond dan je linker. Let er de komende weken op." Het is geen diagnose.

### Weer en alles wat ik niet kan meten

Slaap, cafeïne, vochtbalans en stress beïnvloeden hartslag bij gelijk tempo en staan niet in de gegevens. ASCEND heeft slaapscore en HRV via de wellness (`useWellness`) als hint; zet ze in "waarom" als mogelijke verklaring ("je sliep 5 uur 40"), niet in de berekening.

## 4. Ontwerp voor de engine

### Principes

Alles wat rekent staat in `engine/` als pure functie, zonder React en zonder IndexedDB. Alles wat vendor-specifiek is staat in `integrations/intervalsIcu.ts`. De engine kent geen veldnaam van intervals.icu en geen merk. De uitkomst van een vergelijking is altijd een voorstel voor een regel, nooit een schrijfactie op de planning.

### Nieuwe gegevensvormen (merkloos)

Een nieuw bestand `src/models/activityDetail.ts`:

```ts
export interface RunDynamics {          // averages, whatever source measured them
  stanceTimeMs?: number;
  stanceTimePercent?: number;
  stanceBalanceLeftPct?: number;         // 50 is even
  verticalOscillationMm?: number;
  verticalRatioPct?: number;
  stepLengthM?: number;
}

export interface DetailSlice {           // one piece of the activity, in order
  sec: number;                           // moving seconds in this piece
  distanceM: number;
  gainM: number;
  lossM: number;
  heartRate?: number;
  cadence?: number;                      // steps per minute
  dynamics?: RunDynamics;
}

export interface TerrainStretch {        // a continuous climb or descent
  kind: 'climb' | 'descent';
  startSec: number;
  sec: number;
  distanceM: number;
  metres: number;                        // gained or lost
  gradientPct: number;
  heartRate?: number;
  cadence?: number;
}

export interface ActivityDetail {
  version: 1;
  source: MetricSource;                  // 'garmin' | 'import', as on the log
  sliceCount: number;                    // 48
  slices: DetailSlice[];
  stretches: TerrainStretch[];
  conditions?: { tempC?: number; feelsC?: number; windKmh?: number; humidityPct?: number; source: 'open-meteo' | 'manual' | 'import' };
  quality: { heartRateCoveragePct: number; gainAgreementPct?: number };
}
```

`ExternalActivity` krijgt twee optionele velden: `dynamics?: RunDynamics` (de gemiddelden uit de lijst, gratis, zonder extra verzoek) en `streamsAvailable?: string[]` (de generieke namen van wat er is). `SessionLog` krijgt `detail?: ActivityDetail`. `activityToDraft` neemt `detail` mee; `CardioMetric` en `OutdoorMetric` krijgen `dynamics?: RunDynamics` voor de gemiddelden. Nergens staat een merk- of leveranciersnaam; `source` blijft de bestaande `MetricSource`.

Waarom 48 stukjes en niet de ruwe reeks: een uur is dan stukjes van 75 seconden, een tocht van zes uur van 7,5 minuten; dat is genoeg voor een vast blok van 15 minuten (12 stukjes), voor helften en derden, en klein genoeg om per training ongeveer 3 KB te blijven. De ruwe reeks van een uur is honderden KB en bevat een gps-spoor, dat ASCEND niet wil bewaren (geen server, wel privacy). Dal- en klimstukken worden bij het bouwen uit de volle reeks gehaald, zodat 48 stukjes ze niet vervagen.

### De functies

`integrations/intervalsIcu.ts` (het enige bestand dat de namen kent):

- `streamsUrl(activityId, types)` en `fetchIntervalsStreams(connection, activityId, options)`: één GET met dezelfde foutafhandeling als `getJson`.
- `mapIntervalsStreams(raw): StreamSet` zet `heartrate`, `velocity_smooth`, `altitude`, `distance`, `cadence`, `time`, `latlng`, `stance_time`, `stance_time_balance`, `vertical_oscillation`, `vertical_ratio` en `step_length` om naar een generieke `StreamSet` (seconden, meters, slagen, millimeters). Alleen opvragen wat in `Activity.stream_types` staat.
- `mapIntervalsActivity` leest de negen gemiddelden en `stream_types` mee (nieuwe optionele velden op `IntervalsActivity`).

`engine/activityDetail.ts`:

- `buildActivityDetail(streams: StreamSet, opts): ActivityDetail | undefined`. Pauzes eruit (tijdsprong boven 10 seconden of stilstand), gaten in de hartslag opvullen tot 5 seconden en anders markeren, de hoogte gladstrijken met 5 meter marge, de stukjes tellen, klim- en dalstukken zoeken (aaneengesloten stijging van minstens 50 meter en 4 minuten, onderbroken door niet meer dan 10 meter tegenbeweging), de eigen hoogtewinst tegen `total_elevation_gain` leggen en het verschil in `quality.gainAgreementPct` zetten.

`engine/runMetrics.ts` (per training, uit `detail`, zonder vergelijking):

- `steadyBlock(detail, opts): { from: number; to: number } | undefined`
- `efficiencyOf(detail, referenceHr, hr): { paceAtRefSec: number; blockMinutes: number } | { unavailable: Reason }`
- `driftOf(detail): { percent: number; blockMinutes: number } | { unavailable: Reason }`
- `climbsOf(detail)` en `descentsOf(detail)` met verticale snelheid in meters per uur, hellingklasse, hartslag, en bij dalen het verloop eerste derde tegen laatste derde.
- `formOf(detail): { first: RunDynamics; last: RunDynamics; paceChangePct: number } | { unavailable: Reason }`

`engine/runComparison.ts`:

- `comparableLogs(subject, history, topic, ctx): { logs: SessionLog[]; reasons: NotComparable[] }` implementeert de poort uit hoofdstuk 2. Hergebruikt `logSport`, `plannedRpeTop`/`EASY_RPE_TOP`, `zoneBpm`, `legFatigueOn` en `fatigueWord`.
- `conditionVerdict(subject, baseline): 'same' | 'explains-worse' | 'explains-better' | 'too-different'` voor de temperatuurregel.
- `baselineOf(values, min = 3, max = 5): { median: number; n: number } | undefined`.

`engine/runInsight.ts` (de keuze):

```ts
export type InsightTopic = 'efficiency' | 'drift' | 'climb' | 'descent' | 'form';

export interface InsightLine {
  topic: InsightTopic;
  tone: 'better' | 'watch' | 'fact';
  text: string;                  // one Dutch sentence, no dashes
  change: number;                // signed, in `unit`
  unit: 'sPerKm' | 'pctPoints' | 'pct' | 'bpm' | 'ms';
  strength: number;              // change divided by the noise for this metric
  basis: { logIds: string[]; criteria: string[]; notes: string[] };
}

export interface RunInsight {
  better?: InsightLine;          // at most one
  watch?: InsightLine;           // at most one
  note?: string;                 // 'Gelijk aan je laatste loopjes' or 'Niet te vergelijken: ...'
}

export function runInsight(input: RunInsightInput): RunInsight;
```

`RunInsightInput` heeft de log, alle logs, templates, programma, hartslaginstellingen, de invoer voor `legFatigueOn`, de instellingen, de laatste getoonde regels (voor de rem) en `today`.

`engine/runTrends.ts`: `runTrends(logs, templates, program, hr, today): RunTrends` met per onderwerp een lijst `TrendPoint[]` (het type uit `engine/readiness.ts`, dus `TrendLineChart` werkt direct) en een kort oordeel.

### De regels voor "één ding dat beter ging en hoogstens één om op te letten"

1. Welke onderwerpen komen in aanmerking hangt van de soort training af. Rustige loop onder 60 minuten: efficiëntie, vorm. Lange loop vanaf 60 minuten: drift, efficiëntie (op de eerste 40 minuten als die vlak waren), vorm. Tocht of heuveltocht met minstens één klim- of dalstuk: klimmen, dalen. Tempo, interval, test, wedstrijd, kracht, loopband: niets (een lege uitkomst is goed).
2. Elk onderwerp rekent zijn verschil uit tegen het vergelijkingsmateriaal uit de poort. Valt er iets af, dan komt er geen regel voor dat onderwerp en wordt de reden bewaard.
3. Het verschil wordt gedeeld door de ruis van die maat: efficiëntie 3,5 procent per enkele loop, drift 3 procentpunten, klimmen 8 procent, dalen 15 procent, vorm de drempels uit hoofdstuk 3. Alleen een sterkte van 1,5 of meer telt voor een regel. Voor "Let op" bij vorm geldt de extra eis dat twee van de drie tekens kloppen.
4. Het weer kan het verschil verklaren (hoofdstuk 2): dan geen "Beter" en geen "Let op" voor dat onderwerp, wel de zin dat het weer meespeelde.
5. "Beter" is het onderwerp met de grootste positieve sterkte. "Let op" is het onderwerp met de grootste negatieve sterkte. Gelijke sterkte: de volgorde drift, efficiëntie, klimmen, dalen, vorm.
6. Hoogstens twee regels, nooit twee over hetzelfde onderwerp. Bij geen enkele regel: een enkele zin "Gelijk aan je laatste loopjes", of, als niets te vergelijken was, "Niet te vergelijken met je laatste loopjes" met de reden. Geen leeg scherm met een uitleg erboven.
7. Een rem tegen herhaling, zoals `progressMoment`: hetzelfde onderwerp met dezelfde toon pas weer na 14 dagen en als het minstens een halve ruiseenheid verder is.
8. "Beter" zegt nooit "je wordt fitter". Dat woord is voor de trend over weken. Na één loop: "Beter dan je laatste vier rustige loopjes."
9. "Let op" wijst op één kleine handeling en nooit op een diagnose. Bij drift: eerder drinken en eten of rustiger beginnen. Bij vorm: een rustiger tempo in het laatste derde of een kort rustiger stuk. Het planningsstelsel verandert hier niet; elke planningswijziging blijft een voorstel met Akkoord.
10. Een pijnmelding of "Slechter" bij het gevoel op dezelfde training maakt de "Let op" stiller (een extra regel bovenop wat de ander al zegt is overbodig).

### Hoe de trend op Je stand komt

`runTrends` rekent dezelfde functies over de laatste 12 weken:

- Efficiëntie: `aerobicTrend` zelf, geen tweede berekening. Alleen als de log een `detail` met vast blok heeft, gebruikt hij daarvan het blokgemiddelde in plaats van het gemiddelde van de hele loop (een kleine, aparte verbetering). Zo blijft er één voortgangstaal naast de GR5-percentage (zie `2026-10-22-gr5-voortgang-een-percentage.md`).
- Lange dagen: per geschikte lange loop een punt (driftpercentage), oordeel uit het midden van de laatste drie tegen de drie daarvoor, pas bij 3 procentpunten verschil.
- Bergop en bergaf: per hellingklasse een lijn van klimsnelheid bij eigen hartslag; dalen alleen als aantallen en verloop (geen oordeel). Veel weken "te weinig gegevens" is hier normaal in Nederland.
- Pas en vorm: contacttijd, pasafstand en cadans bij een vast tempo (tempo binnen 6 procent), alleen getoond als er drie eerdere lopen zijn.

Een rij toont een woord, geen score: "Beter", "Normaal", "Slechter", "Te weinig gegevens".

### Opslag, migratie en back-up

- Nieuwe optionele velden, allemaal additief: `SessionLog.detail`, `CardioMetric.dynamics` en `OutdoorMetric.dynamics`, `ExternalActivity.dynamics` en `ExternalActivity.streamsAvailable`. Geen veldnaam met een merk of een leverancier; alleen `source`.
- Migratie volgens het voorbeeld van `migrateManualMeasured` en `migrateLogManualMeasured` in `storage/migrations.ts`: een nieuwe `migrateActivityDetail(raw)` die een geldige `detail` behoudt en een beschadigde laat vallen, en `migrateLogDetail(log)` op dezelfde plek in de importketen. Een log zonder het veld blijft zoals hij was.
- Back-upschema: blijft 5. Een log reist hele mee, net als bij `manualMeasured` (`2026-10-22-garmin-is-leidend.md`), en `detail` is afgeleid en op te halen uit het horloge, dus een oudere app die het veld niet kent verliest niets wat niet terug te halen is. Dat is een bewuste afwijking van de gedachte achter back-upschema 5 ("een oudere app moet zeggen werk de app bij") en hoort in het besluit. Alternatief: schema 6. Mijn advies is niet op te hogen.
- Bij "Garmin is leidend": een log dat de cijfers van het horloge overneemt krijgt zijn `detail` alleen als hij er nog geen had, en `manualMeasured` hoeft dat veld niet te kennen (er was geen handwaarde). Terugzetten laat `detail` staan; het hoort bij de trainingstijd en het horloge.
- Aanvullen van bestaande logs met `detail` gaat volgens `2026-10-22-lege-velden-aanvullen.md` alleen na een tik: een kaart "N loopjes hebben meer details bij je horloge. Ophalen?" met Akkoord en Liever niet, achtergrondverwerking één voor één (CLAUDE.md: achtergrondtaken na elkaar), hoogstens 10 per opstart.
- Het weer wordt bij het ophalen van het `detail` meegenomen en in `detail.conditions` gezet, zodat het niet later hoeft te worden opgezocht (`past_days` reikt tot 92 dagen).

### Instellingen (CLAUDE.md: alles instelbaar, met advies als standaard en één zin)

Elk ook in `src/data/settingsIndex.ts`:

1. Inzicht na een training: aan. "Na een loop of tocht zie je hoogstens twee regels over wat beter ging en waar je op moet letten."
2. Welke onderwerpen: Efficiëntie, Lange dagen, Bergop en bergaf, Pas en vorm; alle aan. "Pas en vorm toont alleen iets als er echt wat verandert."
3. Details van loopjes en tochten ophalen: een nieuwe schakelaar `details` in `WatchUse` (de kaart "Wat ASCEND van je horloge gebruikt"), aan. "ASCEND vraagt per training de reeks van hartslag, tempo en hoogte op en bewaart er alleen een korte samenvatting van." Uit betekent: niet ophalen, niet tonen, niet meetellen.
4. Weer erbij zoeken: aan. "Voor eerlijk vergelijken zoekt ASCEND het weer van die dag op bij Open-Meteo, op een afgeronde plaats."
5. Mijn hartslag komt van de borstband: aan. "Zonder borstband vergelijkt ASCEND geen loopjes waarbij de hartslag gewisseld kan zijn."

### Tests (nagemaakte data, geen echte gegevens)

Voor elke pure functie een vitest-bestand naast de code, met synthetische streams uit een kleine generator: een vlakke rustige loop met 3 procent drift, dezelfde met 12 graden verschil, een loop met pauze midden erin, een tocht met twee klimmen, een reeks zonder hartslag. Controleer ook: de uitkomst verandert niet als je de ruis laat schommelen binnen de spreiding (geen vals oordeel), en de uitkomst is leeg bij te weinig vergelijkingsmateriaal.

## 5. De korte weergave en het blad met het waarom

### Twee regels na de training

Plaats: onder de bestaande kaart van `CompletionMoment` (doel, week, benen), als tweede kaart met hoogstens twee rijen. Niet als vierde en vijfde regel in dezelfde kaart; dat maakt de eerste kaart te druk en haalt de rust weg die de kaart nu heeft. De knop "Verder" blijft de enige gouden knop (steen en contour: één goud per scherm). Een rij heeft:

- Een klein bronzen kopje in `Eyebrow`: "Beter" of "Let op". Geen icoon, geen kleurvlak, geen pijltje; alleen woorden. Het hoort niet op een spel te lijken.
- Eén zin in gewone woorden, getallen in Inter met vaste cijferbreedte (`Num` midden in een zin).
- Rechts een tikdoel van 44 bij 44 px met `InfoButton`, "Waarom", dat het blad opent.

Voorbeelden van de tekst (zonder gedachtestreepjes):

- Beter: "Bij dezelfde hartslag liep je 18 seconden per km sneller dan je laatste vier rustige loopjes."
- Let op: "Je hartslag liep in de tweede helft 9 procent op bij hetzelfde tempo. Dat gebeurt vaker op een warme dag; eet en drink bij een lange loop eerder."
- Berg: "Je klom 11 procent sneller, 640 meter per uur tegen 575, bij dezelfde hartslag."
- Dalen (feit): "Bergaf ging je laatste derde 17 procent trager zonder dat je hartslag steeg. Dat past bij moe worden in de benen."
- Vorm: "Aan het eind stond je 14 ms langer op de grond bij gelijk tempo."
- Weer: "Niet te vergelijken met je laatste loopjes: het was 11 graden warmer."
- Niets: "Gelijk aan je laatste loopjes."

Als er niets te zeggen valt komt er geen kaart, behalve de ene zin "Niet te vergelijken" als dat de reden is (dan krijgt de eigenaar een reden, geen stilte).

### Het blad "Waarom"

Gebouwd zoals `Gr5ReadinessSheet` (`useSheetClose`, `Portal`, kaart met afgeronde bovenhoeken). Opbouw, van boven naar beneden:

1. `Eyebrow` met het onderwerp ("Efficiëntie", "Lange dagen", "Bergop", "Bergaf", "Pas en vorm"), daaronder in Marcellus één woord (het oordeel: "Beter"). Een woord dus, geen getal in Marcellus.
2. De drie getallen naast elkaar, in Inter met vaste cijferbreedte: vandaag, je laatste vier (het midden) en het verschil. Een lijntje met de vergelijkingsloopjes als stippen met de datum, de huidige gemarkeerd. De bestaande `TrendLineChart` kan dit.
3. "Waarmee vergeleken": één zin met wat gelijk was ("4 rustige loopjes in de laatste 5 weken, vlak, hartslag 138 tot 152, tussen 12 en 16 graden"), en wat verschilde.
4. "Hoe sterk is dit?": één zin met de ruis in gewone woorden. "Eén loopje schommelt zelf zo'n 3 procent. Dit verschil is ruim anderhalf keer zo groot, dus de moeite waard, maar de trend op Je stand zegt meer."
5. "Wat het kan betekenen": twee zinnen en een nuchtere handeling.
6. "Achtergrond", inklapbaar met `InfoButton`: drie korte alinea's met de bronnen uit hoofdstuk 3 ("Waarom hartslag bij vast tempo", "Wat drift is en wat die 5 procent wel en niet is", "Waarom je benen in de weg zitten"), in de stijl van `docs/visie`, met de bewijsgraad erbij. De bronnen komen in `data/researchSources.ts`, zodat `engine/sourceLibrary.ts` ze op Meer, Kennis toont.
7. Onderaan een kleine regel in `text-xs` met wat er niet kon worden vergeleken, indien van toepassing.

Niets kleiner dan 12 px, geen `uppercase` op knoppen, woorden "Begrepen" voor sluiten volgens de vaste benaming.

### Je stand

Een nieuwe sectie "Lopen" met een knop in de navigatie tussen Belasting en Doel. In de sectie een kaart met vier rijen, elk met dezelfde opbouw: `Eyebrow` (EFFICIËNTIE, LANGE DAGEN, BERGOP EN BERGAF, PAS EN VORM) en een lijntje van de laatste 12 weken in brons, aan de rechterkant het oordeel in een woord ("Beter", "Normaal", "Slechter", "Te weinig gegevens"). Een tik op een rij opent hetzelfde blad als na de training, met de trend in plaats van één loop. Het lijntje is de bestaande `TrendLineChart`. Geen eigen gouden accent in de sectie; goud is voor het ene accent van het scherm. Contourlijnen horen daar niet, die zijn voor de missiekaart.

De kaart "Tempo bij zone 2" op Ascend kan blijven; de efficiëntierij op Je stand leest dezelfde `aerobicTrend`. Of de kaart op Ascend verdwijnt is aan de eigenaar (open vraag).

## 6. Voorstel voor de bouwvolgorde

1. Alleen de negen gemiddelden en `stream_types` meelezen in `mapIntervalsActivity` en op `ExternalActivity` zetten. Geen extra verzoek. Toon op de horlogekaart bij een loop één regel (bijvoorbeeld grondcontacttijd, pasafstand) als feit. Dit lost ook de eerste "onzeker" op: je ziet wat er echt binnenkomt.
2. Controle van de eigenaar met het ene verzoek uit hoofdstuk 1 en de uitkomst vastleggen in een besluit.
3. `ActivityDetail`, `buildActivityDetail`, de streams-eindpoint, de schakelaar `details`, de migratie en de back-uptest.
4. `runMetrics` en `runComparison` met tests.
5. `runInsight` en de tweede kaart in `CompletionMoment`, met het blad.
6. De sectie "Lopen" op Je stand.
7. Een aparte, kleine beslissing over de drempel en de omrekening in `aerobicTrend` (7 seconden per km, hartslagreserve).
8. Het voorstel om bestaande logs aan te vullen met `detail`.

Een besluit `docs/beslissingen/JJJJ-MM-DD-loopinzicht.md` hoort erbij zodra de eigenaar akkoord is. Ik heb er geen geschreven.

## 7. Open vragen voor de eigenaar

1. Beter, Normaal, Slechter als woorden (gelijk aan de woorden bij het gevoel), of zachtere woorden?
2. Mag ASCEND per training de reeks bij intervals.icu opvragen, aan als standaard? Het kost een paar honderd KB per loop en een paar MB per tocht.
3. Draag je de HRM-Pro bij elke loop? Zo niet, dan moet de instelling "borstband" uit en wordt het vergelijken losser.
4. Wil je een oordeel over dalen, of alleen de feiten? Mijn advies: alleen feiten tot er na een paar tochten een eigen gemiddelde is.
5. Wil je dat de kaart "Tempo bij zone 2" op Ascend blijft, of verhuist alles naar Je stand?
6. De ingebouwde submaximale test van intervals.icu (een vast tempo van 3 minuten met een rustminuut, supporterfunctie) is een nette, gecontroleerde manier om efficiëntie te meten. ASCEND schrijft al trainingen naar je horloge; een kleine "tempotest" als aparte optionele training kan later. Alleen als je daar een supporter voor bent.

## 8. Wat onzeker bleef

- Hoe `icu_efficiency_factor` en `decoupling` voor hardlopen zonder vermogen worden berekend, of ze bij jou gevuld zijn en op welke grondslag. Het ene verzoek hierboven beantwoordt het.
- Of een Forerunner 255 met HRM-Pro alle zes de grootheden schrijft, en of `vertical_speed` bij jou bestaat.
- De exacte stream-id's van `flight_time` en `flight_ratio`, de eenheid van `pace` en `average_stride`, en of `grade_smooth` een echte stream is.
- Of intervals.icu de rondes van je horloge als intervallen toont.
- Of het echte streamsverzoek met je sleutel zich gedraagt zoals het voorcontroleverzoek (de CORS-voorcontrole gaf 200).
- De auteurs en uitkomst van de meta-analyse over contacttijd bij vermoeidheid (alleen de bibliotheekrecord en een samenvatting gezien) en de volledige tekst van de marathonstudie van 2025. De hellingschatting van ongeveer 1 slag per graad voor hitte steunt op één kleine studie via een samenvatting; ik kon de recordpagina niet openen (503).
- Een dag-tot-dagspreidingscijfer voor verticale oscillatie van een borstband, voor klimsnelheid van wandelaars en voor drift bij hardlopers. Die drempels zijn eigen aannames en moeten na een paar weken met jouw data worden gekeken.
- De Open-Meteo-archiefhost (niet bereikbaar vanuit mijn omgeving). `past_days` werkt.

## Bronnen

intervals.icu en Garmin:

- Specificatie: https://intervals.icu/api/v1/docs
- API-gids op het forum: https://forum.intervals.icu/t/api-access-to-intervals-icu/609
- Streams via de API: https://forum.intervals.icu/t/access-activities-streams-via-api/101065
- Nieuwe loopmaten, aankondiging van 31 augustus 2026: https://forum.intervals.icu/t/new-running-metrics/132173
- Voorbereiding van de loopmaten, onder meer de lijst met stream-id's van 3 augustus 2026: https://forum.intervals.icu/t/working-on-advanced-running-metrics-gct-vertical-oscillation-vertical-ratio-step-length-help-us-cover-more-devices-before-we-ship-it/130701
- Nieuws van 23 september 2026: https://forum.intervals.icu/t/intervals-icu-news-2026-09-23/132557
- Decoupling voor hardlopen: https://forum.intervals.icu/t/decoupling-for-running/24856
- Efficiëntie en decoupling bij hardlopen: https://forum.intervals.icu/t/running-efficiency-and-decoupling/5770
- Weer bij activiteiten (supporters): https://forum.intervals.icu/t/weather-on-activities-and-map/79308
- Automatische submaximale test: https://forum.intervals.icu/t/automatic-submaximal-fatigue-testing/132525
- Garmin HRM-Pro, loopdynamica: https://www8.garmin.com/manuals/webhelp/GUID-8918512F-8099-433F-86CC-3E8249295E07/EN-US/GUID-62A09512-518A-424A-8491-FE2B80CD2091.html
- Garmin Forerunner 265, loopdynamica en accessoire voor de balans: https://www8.garmin.com/manuals-apac/webhelp/forerunner265series/EN-SG/GUID-5391D309-A65C-49C8-8555-7F43A3D57416-4935.html
- Open-Meteo, documentatie: https://open-meteo.com/en/docs

Wetenschap:

- Buchheit 2014, monitoren van vermoeidheid en hartslag: https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/
- Nuuttila e.a. 2022, sturen op welzijn, HRV en hartslag-tempo: https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/
- Vesterinen e.a. 2014, hartslag-loopsnelheidsindex: https://lida.sport-iat.de/ta/Record/4031002
- Muñoz e.a. 2014, trainingsopbouw voor 10 km: https://pubmed.ncbi.nlm.nih.gov/23752040/
- TrainingPeaks, aerobe uithouding en decoupling: https://www.trainingpeaks.com/coach-blog/aerobic-endurance-and-decoupling/
- Matomäki e.a. 2023, durability en training: https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1128111/full
- Maunder e.a. 2021, durability: https://lida.sport-iat.de/ta/Record/4069575
- Bontemps e.a. 2020, bergaf hardlopen: https://pmc.ncbi.nlm.nih.gov/articles/PMC7674385/
- Vernillo e.a. 2017, bergaf: https://www.iat.uni-leipzig.de/datenbanken/iks/mint/Record/4043194
- Minetti e.a. 2002, kosten van lopen en wandelen op hellingen: https://iris.unibs.it/retrieve/ddc633e4-3c03-4e2e-e053-3705fe0a4c80/Minetti%20JAP%202002.pdf
- Cabrera-Linares e.a. 2025, validatie HRM-Pro: https://pmc.ncbi.nlm.nih.gov/articles/PMC12431186/
- Miqueleiz e.a. 2025, herhaalbaarheid van contacttijd en pas: https://pmc.ncbi.nlm.nih.gov/articles/PMC12127928/
- Zandbergen e.a. 2023, vermoeidheid en loopkinematica: https://research.utwente.nl/en/publications/effects-of-level-running-induced-fatigue-on-running-kinematics-a-/
- Zhang e.a. 2025, marathon met sensoren: https://sportsmedicine-open.springeropen.com/articles/10.1186/s40798-025-00915-9
- Meta-analyse over contacttijd en vermoeidheid (record): https://lida.sport-iat.de/ta/Record/4088323
- Hitte en hartslag bij vast loopsnelheid, proefschrift Universiteit van Kaapstad: https://open.uct.ac.za/handle/11427/26782
