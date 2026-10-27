# Kansen met gegevens

ASCEND haalt bij intervals.icu, MacroFactor en Open-Meteo al veel meer binnen dan het gebruikt: bij elke synchronisatie komt de hele activiteit (ruim 180 velden) en het hele wellnessrecord (ruim 40 velden) mee, waarvan de app er ongeveer twintig en vier leest. De grootste kansen voor jouw doelen zitten niet in nieuwe gezondheidsgetallen, maar in wat er al ligt: je eigen klimtempo met rugzak (voor een eerlijke schatting van GR5-etappes), je rusthartslag en HRV over een paar dagen (om ziek worden en een zware sessie op een slechte ochtend te zien), het weer met vochtigheid (hitte in je tempo), en je voeding naast je gewicht en je kracht. Wat ik afraad: CTL, ATL en TSB als stuur, de VO2max van het horloge, Body Battery en stress, en schoenkilometers. Eén ding gaat voor alles: Garmin heeft in oktober 2026 zijn voorwaarden aangescherpt, en intervals.icu verwacht Garmin-gegevens via de API te moeten blokkeren. Dan valt de belangrijkste bron van ASCEND stil, en de opgehaalde wellness staat nu niet in de back-up.

Datum: 27 oktober 2026
Door: Scout Gegevens
Status: voorstel. In `src/` is niets veranderd. Er staat geen persoonsgegeven in dit bestand.

Dit onderzoek gaat niet over kilometers, ronden en loopdynamiek binnen één loop; dat is het aparte onderzoek "Run in detail". Waar een kans daar raakt, verwijs ik ernaar.

## Hoe ik gewerkt heb en hoe zeker iets is

Ik las eerst `CLAUDE.md`, `docs/visie/Trainingswetenschap.md`, `docs/visie/Data zonder handwerk.md` en in `docs/onderzoek/` vooral *Loopgegevens en vooruitgang*, *Andere manieren om belasting te plannen*, *Horloge, server en weegschaal*, *Alcohol en herstel*, *Doelsoorten berg en buiten* en *Aanvullend onderzoek GR5 voorbereiding*. Daarna de code: `src/integrations/intervalsIcu.ts`, `types.ts`, `openMeteo.ts`, de MacroFactor-lezers in `src/engine/macrofactor*.ts`, `engine/wellnessRange.ts`, `engine/wellnessCheck.ts`, `engine/weather*.ts`, `engine/goalRoute.ts`, `engine/runTrends.ts`, `storage/wellness.ts` en `src/models/`.

Over de bronnen gebruik ik vier woorden, zoals in *Loopgegevens en vooruitgang*:

- zeker: zo gelezen in de officiële OpenAPI-beschrijving van intervals.icu (https://intervals.icu/api/v1/docs, gelezen op 27 oktober 2026) of in de documentatie van Open-Meteo;
- goed: geschreven door de maker zelf op zijn forum of in zijn handleiding, met datum;
- waarschijnlijk: afgeleid uit het schema of uit meldingen van gebruikers;
- onzeker: niet te vinden of niet te controleren.

Ik deed geen echte API-aanroepen met een sleutel. Over de wetenschap gebruik ik de schaal van de rest van deze map: bewijs sterk, matig, zwak, expert, afgeleid.

## Eerst het grote risico: Garmin-gegevens via intervals.icu

Dit hoort vooraan, omdat het bepaalt wat de moeite waard is om te bouwen.

- Op 9 oktober 2026 schreef de maker van intervals.icu bovenaan zijn API-gids: "It is likely that we will have to block access to Garmin data via the API soon." Op 14 oktober voegde hij toe dat de nieuwe voorwaarden horen bij het heropenen van Garmins ontwikkelaarsprogramma en dat er "an easier path for individuals and apps to access data from Garmin devices" komt ([intervals.icu-forum, API access](https://forum.intervals.icu/t/api-access-to-intervals-icu/609/1)) (goed).
- Of dat ook geldt voor een persoonlijke API-sleutel zoals ASCEND die gebruikt, en of wellness (HRV, slaap, rusthartslag) eronder valt, is nog niet bekend; er is geen datum ([issue bij een ander project dat dezelfde vraag volgt](https://github.com/platypus45/domestique/issues/29); [the5krunner, 14 oktober 2026](https://the5krunner.com/2026/10/14/garmin-api-intervals-third-party-apps/)) (onzeker). Een dienst die van intervals.icu afhing, Intervals Pro, is op 12 oktober gestopt ([Gadgets & Wearables](https://gadgetsandwearables.com/2026/10/14/garmin-api-intervals-pro-shutdown/)) (goed).
- Sinds eind september 2026 haalt Garmin zijn eigen afgeleide getallen uit de FIT-bestanden die naar partners gaan: VO2max, Training Effect, hersteltijd, Stamina, Performance Condition en zweetverlies. De opname zelf (hartslag, GPS, cadans, loopdynamiek) blijft ([garmin-intervals-bridge](https://github.com/futureweb/garmin-intervals-bridge)) (waarschijnlijk: een derde partij, maar in lijn met meldingen bij DC Rainmaker en the5krunner).
- Garmins eigen Personal API (sinds 21 oktober 2026) levert volgens een lezer bij DC Rainmaker wel activiteiten, FIT, HRV, slaap, rusthartslag, Body Battery, stress, gewicht en stappen, maar geen VO2max, Training Readiness of trainingsbelasting ([DC Rainmaker](https://www.dcrainmaker.com/2026/10/garmin-connect-api-revamps-connect-developer.html)) (onzeker, één lezer). Een webapp kan er niet bij: de server weigert browserverzoeken (zelf getest op 21 oktober, zie *Data zonder handwerk*).

Wat dit voor ASCEND betekent (afgeleid):

1. De activiteiten zelf zijn veilig in de logs: een `SessionLog` met zijn compacte profiel (`detail`) staat in de back-up. Maar de opgehaalde wellness (`storage/wellness.ts`) en de nog niet gekoppelde activiteiten zijn bewust een cache die niet in de export gaat, "re-fetched from intervals.icu whenever the watch is synchronised". Valt de bron weg, dan is die cache het enige exemplaar, en bij een nieuwe telefoon is hij weg. "Wat speelde er" vergelijkt ochtenden tot 400 dagen terug; dat werk zou dan op niets meer staan.
2. Een kans die leunt op nieuwe Garmin-velden via intervals.icu (VO2max, Body Battery, stress, trainingstoestand) is op dit moment een slechte investering.
3. Een kans die leunt op wat ASCEND al lokaal heeft (logs, profielen, de cache van ochtendgetallen, MacroFactor-bestanden, Open-Meteo) blijft werken, wat er ook gebeurt.

Voorstel voor een engine-regel, geen besluit: (a) een stille bronbewaking die opmerkt wanneer er drie dagen na een gesynchroniseerd horloge geen activiteit of geen ochtend meer binnenkomt, en dat in één zin zegt; (b) de eigenaar laten beslissen of de ochtendgetallen (alleen datum, rusthartslag, HRV, slaapduur, slaapscore) voortaan wel in de back-up mogen, met een migratiestap; (c) de bestandsroute uit *Data zonder handwerk* (idee 4, "Delen met ASCEND" met een FIT-lezer) als vangnet klaarzetten. Werk: klein voor (a) en (b), middel voor (c).

## 1. Inventaris

### intervals.icu, activiteiten

**Wat ASCEND nu leest** (zeker, `mapIntervalsActivity`): id, starttijd, soort, naam, bron en toestel, bewegende en totale tijd, afstand, stijging en daling, gemiddelde en hoogste hartslag, cadans, `icu_rpe`, `feel`, loopband, verwijderd, de negen gemiddelden van de loopdynamiek en de lijst `stream_types`. Per opgeslagen loop of tocht haalt ASCEND daarna de reeksen op (tijd, afstand, hartslag, snelheid, hoogte, cadans, positie en de loopdynamiek) en maakt er een compact profiel van: 48 stukjes, klim- en dalstukken met hun tempo per derde, het weer van dat uur en een kwaliteitsmaat (`models/activityDetail.ts`). Van de positie blijft alleen het beginpunt, afgerond op een kilometer.

**Wat al binnenkomt en wordt weggegooid.** `activitiesUrl` vraagt geen `fields` mee, dus het antwoord bevat elke keer het hele `Activity`-object (zeker). Daarin staan onder meer:

- belasting en intensiteit: `icu_training_load`, `hr_load`, `pace_load`, `trimp`, `icu_intensity`, `session_rpe`, `strain_score`, en op de activiteit ook `icu_ctl` en `icu_atl`;
- tijd per zone: `icu_hr_zone_times`, `pace_zone_times`, `gap_zone_times`, met de zonegrenzen die intervals.icu gebruikte;
- efficiëntie en drift: `icu_efficiency_factor`, `decoupling`, `polarization_index`, `gap`. *Loopgegevens en vooruitgang* liet al zien dat `decoupling` en de efficiëntiefactor waarschijnlijk op vermogen leunen, dat een Forerunner 255 bij lopen niet levert; ASCEND rekent die zelf uit de reeksen;
- energie: `calories`, `carbs_used`, `carbs_ingested`;
- temperatuur van het horloge (`average_temp`, `min_temp`, `max_temp`) en, alleen voor betalende leden van intervals.icu, weer van Open-Meteo (`average_weather_temp`, `average_feels_like`, `headwind_percent` en meer);
- materiaal: `gear` (id, naam, afstand);
- `icu_resting_hr`, `athlete_max_hr`, `icu_weight` zoals intervals.icu ze op die dag kende;
- hartslagherstel na afloop (`icu_hrr`), de automatische submaximale test (`submax_fatigue_test`, met een status als GREEN of AMBER), `compliance` met de geplande workout, `interval_summary` en `icu_lap_count`, en `icu_achievements` (beste tempo's).

**Wat er nog meer is, met een eigen verzoek** (zeker voor de paden, uit de OpenAPI):

- `GET /api/v1/athlete/{id}/pace-curves` en `activity-pace-curves`: je snelste tijd over elke afstand, over een periode of per activiteit, met een model voor kritieke snelheid (`pmType=CS`). Ook `hr-curves` en `activity-hr-curves` (hoogste hartslag die je een bepaalde tijd volhield);
- `GET /api/v1/athlete/{id}/gear`: je materiaal met afstand, tijd, aantal activiteiten en herinneringen;
- `GET /api/v1/activity/{id}?intervals=true`: de ronden en intervallen met per stuk hartslag, tempo, helling en loopdynamiek (dat is het terrein van "Run in detail");
- `athlete-summary`, `fitness-model-events`, `power-hr-curve`, `weather-forecast`.

### intervals.icu, wellness

**Wat ASCEND nu leest** (zeker): `restingHR`, `hrv`, `sleepSecs`, `sleepScore`, standaard 28 dagen, bij een notitie onder "Wat speelde er" tot 400 dagen terug, in stukken van 120 dagen.

**Wat het record nog meer kan bevatten** (zeker, schema `Wellness`): `ctl`, `atl`, `rampRate`, `ctlLoad`, `atlLoad`, `sportInfo`, `weight`, `bodyFat`, `hrvSDNN`, `avgSleepingHR`, `sleepQuality`, `spO2`, `respiration`, `readiness`, `vo2max`, `steps`, `floorsClimbed`, `kcalConsumed`, `carbohydrates`, `protein`, `fatTotal`, `hydration`, `hydrationVolume`, de subjectieve schalen `soreness`, `fatigue`, `stress`, `mood`, `motivation`, `injury`, en `menstrualPhase` met een voorspelde fase.

**Wat Garmin daarvan echt vult** is niet officieel beschreven. Volgens meldingen komen slaap, rusthartslag en gewicht het vaakst door, HRV meestal, en ontbreken nachtelijke SpO2, ademhaling, slaapfasen, Body Battery, Garmin-stress, readiness en voeding ([forum, gedeeltelijke sync](https://forum.intervals.icu/t/garmin-wellness-partial-sync-sleep-works-rhr-hrv-steps-missing/130093); [garmin-intervals-bridge](https://github.com/futureweb/garmin-intervals-bridge)) (waarschijnlijk). Het veld `stress` in intervals.icu is een subjectieve schaal die je zelf invult, niet de stress van Garmin ([forum](https://forum.intervals.icu/t/connecting-garmin-health-metrics-to-intervals-icu/25303)) (goed). `ctl` en `atl` rekent intervals.icu zelf uit je activiteiten; die komen dus wel. Eén verzoek met je eigen sleutel en `fields=` maakt dit voor jouw account in een minuut duidelijk.

### intervals.icu, sportinstellingen, kalender en vorm

- Sportinstellingen (zeker): ASCEND leest uit de instelling voor hardlopen alleen `lthr` en `max_hr`. Het antwoord bevat ook `hr_zones`, `threshold_pace`, `pace_zones`, `best_effort_distances`, `gap_model` en de instelling voor de submaximale test. Bewust zo: ASCEND heeft eigen zones (`docs/beslissingen/2026-10-25-hartslag-op-het-horloge.md`).
- Kalender (zeker): ASCEND schrijft en leest alleen zijn eigen workouts (`external_id` begint met `ascend:`). Wedstrijden, notities en ziektedagen die je in intervals.icu zelf zet, worden niet gelezen. Dat is een goede grens; ASCEND is de plek voor je doelen.
- Vorm: intervals.icu toont fitness, vermoeidheid en vorm (CTL, ATL en TSB, met 42 en 7 dagen). ASCEND leest ze niet; *Andere manieren om belasting te plannen* raadde ze als stuur al af.

### Garmin via intervals.icu, samengevat

Komt door (goed tot waarschijnlijk): elke activiteit met de reeksen en de loopdynamiek, RPE en gevoel als je ze op het horloge invult, slaapduur en slaapscore, rusthartslag, meestal HRV, en gewicht als het in Garmin Connect staat.

Komt niet (meer) door: VO2max, Training Effect, hersteltijd, Stamina, Performance Condition en zweetverlies (sinds eind september 2026 eruit gefilterd), Body Battery, Garmin-stress, Training Readiness (zit volgens gebruikers ook niet op de FR255, zie *Andere manieren om belasting te plannen*), SpO2, ademhaling en slaapfasen.

Onzeker: alles hierboven, zodra intervals.icu Garmin-gegevens in de API blokkeert.

### MacroFactor-export

ASCEND leest uit de Granular Export (xlsx of csv, `engine/macrofactorFile.ts`): de Workout Log (sets, gewicht, herhalingen, RIR, duur), het trainingsprogramma, de 1RM per oefening, trendgewicht, weegschaalgewicht en vetpercentage. Het inlezen van workouts is een tijdelijke brug (`docs/beslissingen/2026-10-25-macrofactor-workouts-tijdelijk.md`); gewicht en vetpercentage blijven.

Wat er in de export staat en ASCEND laat liggen: de Food Log (per voedingsmiddel calorieën, eiwit, koolhydraten, vet en tientallen micronutriënten). ASCEND herkent hem en zegt nu "Die gebruikt ASCEND niet" (`FOOD_LOG_MESSAGE`). Volgens een derde bevat de export ook macrodoelen en de schatting van je energieverbruik ([Nutrola](https://nutrola.app/en/blog/how-to-export-data-from-macrofactor)) (onzeker; MacroFactor zelf zegt alleen dat voeding en gewicht mee kunnen, [helpcentrum](https://help.macrofactorapp.com/en/articles/356-export-your-data)). Je eigen export laat zien welke werkbladen er zijn.

### Open-Meteo

ASCEND gebruikt per uur voor zeven dagen: temperatuur, gevoelstemperatuur, neerslag en kans, wind en windstoten, weercode en uv-index, plus zonsopkomst en zonsondergang. Voor een gedane training: temperatuur, gevoelstemperatuur, vochtigheid, neerslag en wind van die uren (tot 92 dagen terug). De vochtigheid wordt opgeslagen maar door geen regel gelezen.

Wat er nog meer kan, zonder sleutel (zeker, [Open-Meteo forecast](https://open-meteo.com/en/docs) en [luchtkwaliteit](https://open-meteo.com/en/docs/air-quality-api)):

- dauwpunt (`dew_point_2m`), natteboltemperatuur, vochtigheid in de voorspelling, en straling, waarmee een hitte-index of benadering van de WBGT te maken is;
- `freezing_level_height` (vriespunthoogte), `cape` (energie voor onweer), zicht, sneeuwhoogte, windrichting en wind op 80 tot 180 m;
- de parameter `elevation`, die de voorspelling omrekent naar de hoogte die je opgeeft, bijvoorbeeld een col;
- luchtkwaliteit: `european_aqi`, fijnstof (`pm2_5`, `pm10`), ozon en stikstofdioxide, op ongeveer 11 km, vijf tot zeven dagen vooruit, en pollen (berk, gras, els, bijvoet, olijf, ambrosia) alleen in Europa in het seizoen, vier dagen vooruit.

Het gebruik is gratis voor niet-commercieel gebruik; de documentatie noemt geen harde limiet.

### Wat er nu al binnenkomt en niet gebruikt wordt

Kort, omdat dit de goedkoopste kansen zijn:

1. Van elke activiteit: belasting, TRIMP, tijd per zone volgens intervals.icu, calorieën en koolhydraten, temperatuur van het horloge, materiaal, hartslagherstel, beste tempo's en het resultaat van de submaximale test.
2. Van elke ochtend: alles behalve de vier velden hierboven, dus ook `avgSleepingHR`, `respiration`, `spO2`, `steps`, `weight`, `vo2max`, `ctl` en `atl`, voor zover Garmin of jij ze vult.
3. Van de sportinstellingen: zones, drempeltempo en de afstanden voor beste prestaties.
4. Van Open-Meteo achteraf: de luchtvochtigheid van elke training.
5. Van MacroFactor: de Food Log, die je bij een volledige export al meestuurt.
6. Van de profielen zelf: tijdstip en weekdag van elke training en de klimstukken met tempo per derde, die alleen in een trendrij op Je stand gebruikt worden (`runTrends.ts`, "klimmen").

Een kleine technische winst los van alle kansen: met `fields=` op het activiteitenverzoek blijft het antwoord klein, wat op een zwakke mobiele verbinding scheelt (afgeleid).

## 2. Kansen

Per kans: de gegevens, wat je ziet, het bewijs, waar de ruis zit en het werk. De volgorde hier is thematisch; de rangorde staat in hoofdstuk 5.

### Kans A. Je eigen klimtempo met rugzak, en een eerlijke schatting van een GR5-etappe

**Gegevens.** Wat er al is: de klim- en dalstukken in elk profiel (meters per uur, helling, hartslag, tempo per derde), het rugzakgewicht van de log of het geplande weekdoel, je lichaamsgewicht uit MacroFactor. Nieuw is alleen de rekenregel.

**Wat je ziet.** Bij een tocht of een etappe van je doel: "Met 12 kg klim je op hellingen van 10 tot 20 procent ongeveer 480 m per uur. Een dag van 20 km met 1.100 m op en af is voor jou dan ongeveer 7 uur lopen, zonder pauzes. De bordjes zeggen 6,5 uur." En op Je stand één rij die laat zien of dat klimtempo in de loop van het seizoen stijgt.

**Bewijs.** ASCEND rekent nu met de Duitse wandelnorm DIN 33466 (4 km per uur vlak, 300 m per uur omhoog, 500 m per uur omlaag; het grootste deel plus de helft van het kleinste), bewust zonder rugzak en niet persoonlijk (`engine/goalRoute.ts#estimatedHikingMinutes`; [uitleg van de norm](https://www.alpenverein-muenchen-oberland.de/mitgliederservice/alpine-beratung-dav/bergwissen/tourenplanung-einstieg/woher-kommt-die-gehzeit-auf-den-wanderschildern)) (expert: een bewegwijzeringsnorm, geen meting). Dat de energiekost van lopen ongeveer meeschaalt met de totale massa, dus lichaam plus rugzak, is redelijk onderbouwd ([Looney e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8919998)) (matig). Een persoonlijke correctie op een norm, gemeten op je eigen klimmen, is afgeleid; een studie die zo'n persoonlijke schatting voor trektochten toetst heb ik niet gevonden.

**Ruis en schijnprecisie.** In Nederland zijn echte klimmen schaars; `runTrends.ts` vraagt nu zes klimmen in dezelfde hellingklasse en zegt eerlijk dat die er vaak niet zijn. Barometrische hoogte is in heuvels goed en op de vlakte ruis (*Betrouwbaarheid beenvermoeidheid-index*). Een trappenhuis of loopband met helling geeft een ander tempo dan een bergpad (afgeleid). Daarom: alleen klimstukken van minstens 50 hoogtemeters, altijd als band ("6,5 tot 7,5 uur"), de norm als vertrekpunt en je eigen tempo pas na genoeg klimmen, en vermoeidheid op dag 5 van een tocht valt erbuiten.

**Werk.** Middel. Een pure functie in `engine/` naast `estimatedHikingMinutes`, een rij op Je stand of in het doelblad, een instelling ("Etappetijd op je eigen tempo", advies aan).

### Kans B. Vroeg zien dat je ziek wordt

**Gegevens.** Rusthartslag en HRV (al opgehaald), slaapduur, en waar Garmin ze vult de gemiddelde hartslag in de slaap (`avgSleepingHR`) en ademhaling (`respiration`). Daarnaast de bestaande ziekteroute (`engine/illness.ts`).

**Wat je ziet.** Alleen als het speelt, op de ochtendkaart: "Je rusthartslag ligt drie ochtenden achter elkaar 6 slagen boven je gewone en je HRV eronder. Voel je je goed?" Met "Voel me goed", "Word ziek" (opent de bestaande ziekmelding) en "Niet nu". Geen diagnose, geen advies om naar een arts te gaan tenzij je klachten meldt, en dan alleen de vaste verwijzing.

**Bewijs.** In een cohort met smartwatches gaf een sterke stijging van de rusthartslag tegen je eigen basis bij 63 procent van de COVID-gevallen een signaal vóór de klachten ([Mishra e.a. 2020](https://www.nature.com/articles/s41551-020-00640-6)) (zwak tot matig: 32 zieken, terugkijkend). Korte overbelasting verhoogt de rusthartslag matig, en de dagelijkse schommeling is ongeveer 10 procent ([Bosquet e.a. 2008](https://pubmed.ncbi.nlm.nih.gov/18308872/); [Buchheit 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/)) (matig). Een getoetste drempel bestaat niet.

**Ruis.** Alcohol, een warme kamer, een late training en stress geven hetzelfde patroon (*Alcohol en herstel*). Daarom: alleen bij twee signalen tegelijk en minstens twee ochtenden op rij, niet als je zelf al "Wat speelde er" voor die avond invulde, en nooit een voorstel om de planning te veranderen zonder jouw antwoord. Een vraag, geen waarschuwing.

**Werk.** Klein. De gemiddelden staan al in `wellnessCheck.ts`.

### Kans C. De ochtendregel afmaken: een zware sessie op een slechte ochtend

**Gegevens.** De check-in "Hoe voelt je lijf?", rusthartslag en HRV tegen je eigen 28 dagen, de hartslag bij rustig tempo uit `aerobicTrend.ts`, de beenindex.

**Wat je ziet.** Op de ochtend van een tempoloop, intervallen, test of zware beendag, als twee van de drie signalen slecht zijn: een voorstel met Akkoord om hem lichter te doen of een dag te schuiven, met welk signaal afwijkt. Eén signaal slecht: één zin, geen voorstel.

**Bewijs.** Bijsturen op meerdere signalen samen gaf bij recreatieve lopers vooral minder slechte uitkomsten ([Nuuttila e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/)) (matig). HRV-sturing geeft een klein voordeel ([Düking e.a. 2021](https://pubmed.ncbi.nlm.nih.gov/34489178/); [Manresa-Rocamora e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8507742/)) (matig). De nachtelijke HRV van Garmin was in één vergelijking de minst nauwkeurige van vijf wearables ([Dial e.a. 2025](https://physoc.onlinelibrary.wiley.com/doi/10.14814/phy2.70527)) (zwak, via samenvatting). Dit stond al als aanbeveling in *Andere manieren om belasting te plannen* en *Trainingswetenschap*; nieuw is dat de getallen nu vanzelf binnenkomen.

**Ruis.** Een zevendaags gemiddelde tegen de eigen band, niet één nacht (Plews, zie *Andere manieren*). "Twee van drie" is een vertaling van een figuur, geen getoetste regel.

**Werk.** Middel: een regel in `adviceEngine` met een voorstel, en een instelling.

### Kans D. Hitte in je tempo en je voorbereiding op een zomerse GR5

**Gegevens.** Uit Open-Meteo nieuw: dauwpunt of vochtigheid in de voorspelling (de vochtigheid van gedane trainingen is er al). Je eigen hartslag bij tempo in warme en koele loopjes uit de profielen. Je zweetverlies per temperatuur (`engine/sweat.ts`).

**Wat je ziet.** Op een warme dag bij een rustige loop of tempoloop: "Warm en vochtig vanavond (gevoel 27 graden). Loop op hartslag; je tempo ligt dan zo'n 10 tot 20 seconden per km lager, en dat is goed." In de laatste weken voor een zomertocht één regel in het voorbereidingsblad: "Twee weken voor vertrek: een paar trainingen in de warmte helpen je lichaam wennen."

**Bewijs.** Marathons liepen progressief trager naarmate de WBGT steeg van 5 naar 25 graden, en langzamere lopers meer dan de snelsten ([Ely e.a. 2007](https://experts.umn.edu/en/publications/impact-of-weather-on-marathon-running-performance/)) (matig, uitslagen en geen experiment; latere analyses vinden kleinere effecten, niet door mij gelezen). Hitte-acclimatisatie in 1 tot 2 weken met trainingen van 60 tot 90 minuten in de warmte is de consensus ([Racinais e.a. 2015](https://doi.org/10.1136/bjsports-2015-094915)) (sterk voor het principe). ASCEND verschuift extreem weer al (`weatherSwap.ts`, `bestMoment.ts`) en rekent warmte al mee bij hartslag en tempo (`influence.ts`).

**Ruis.** Het getal voor tempoverlies is een gemiddelde over duizenden lopers; jouw verlies leert ASCEND pas na een paar warme loopjes. Toon dus een band en zeg "loop op hartslag", niet een precies doeltempo.

**Werk.** Klein: twee extra velden in `forecastUrl`, een regel bij de training, een kennisregel bij de tochtvoorbereiding.

### Kans E. Voeding naast je gewicht en je kracht

**Gegevens.** De Food Log uit MacroFactor (per dag opgeteld: calorieën, eiwit, koolhydraten), trendgewicht en vetpercentage (al ingelezen), je kracht uit Forge (geschatte 1RM per oefening, `strengthOneRm.ts`) en de lange sessies uit je planning.

**Wat je ziet.**
- Op Je stand, alleen als je afvalt: "Je verliest de laatste vier weken ongeveer 0,9 procent per week. Je kracht in de squat staat stil. Bij langzamer afvallen blijft kracht meestal beter staan." Geen streefgewicht, geen calorieadvies.
- Eiwit als één regel als het structureel laag is: "Je eet de laatste twee weken gemiddeld 1,1 g eiwit per kg. Rond 1,6 g helpt je kracht het meest."
- Voor een lange duurloop of bergtocht van twee uur of langer, de avond ervoor: "Morgen een lange dag: 30 tot 60 g koolhydraten per uur onderweg." Dat kan ook zonder Food Log.

**Bewijs.** Elite-sporters die 0,7 procent per week afvielen werden sterker en kregen meer vetvrije massa dan wie 1,4 procent per week afviel ([Garthe e.a. 2011](https://www.sponet.de/sponet/Record/4020931)) (matig, 24 sporters). 0,5 tot 1 procent per week is de gangbare aanbeveling ([Helms e.a. 2014](https://jissn.biomedcentral.com/articles/10.1186/1550-2783-11-20)) (expert, onderbouwd met studies). Rond 1,6 g eiwit per kg per dag is genoeg voor krachtwinst ([Morton e.a. 2018](https://bjsm.bmj.com/content/52/6/376)) (sterk). 30 tot 60 g koolhydraten per uur bij lange inspanning ([Thomas e.a. 2016](https://pubmed.ncbi.nlm.nih.gov/26891166/)) (sterk). Langdurig te weinig eten bij veel training (REDs) schaadt herstel en gezondheid ([Mountjoy e.a. 2023](https://bjsm.bmj.com/content/57/17/1073)) (sterk als consensus); dat is een onderwerp voor een arts of sportdiëtist, niet voor een regel in ASCEND.

**Ruis.** Een vergeten maaltijd ziet eruit als een tekort; een dag zonder log is geen dag zonder eten. Alleen dagen tellen die MacroFactor als volledig ziet (als de export dat zegt) en alleen gemiddelden over twee tot vier weken. Kracht en gewicht naast elkaar zetten is samenhang, geen oorzaak. MacroFactor doet zelf al de voedingscoaching; ASCEND moet het niet overdoen en alleen de brug slaan naar training.

**Werk.** Middel. De Food Log is herkenbaar; een lezer voor dagtotalen, een nieuw veld voor `NutritionMetric` (dat model bestaat al) met een migratiestap, twee regels. Dit is een besluit van de eigenaar, omdat voeding nu bewust buiten ASCEND blijft.

### Kans F. Een persoonlijke tempocurve tussen twee testen in

**Gegevens.** Je snelste tijden over vaste afstanden uit al je loopjes: via `pace-curves` van intervals.icu of zelf uit de reeksen en profielen.

**Wat je ziet.** In Je stand, onder de tempo's uit de test: "Je snelste 3 km in training deze maand was 15:40. Dat past bij je testtempo's." Of: "Je trainingen wijzen op iets sneller dan je laatste test. Een nieuwe test over een paar weken zegt meer." Geen nieuw voortgangsgetal; de test blijft het kompas (`docs/beslissingen/2026-10-27-testloop-lezen.md`).

**Bewijs.** Kritieke snelheid uit gewone trainingsgegevens van recreatieve marathonlopers voorspelde hun marathontempo redelijk ([Smyth en Muniz-Pumares 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7664951)) (matig). Runalyze schat een "effectieve VO2max" uit hartslag en tempo van elk loopje en corrigeert met je beste wedstrijd ([Runalyze, berekeningen](https://runalyze.com/help/article/88)) (expert, fabrikant).

**Ruis.** Je loopt in training zelden voluit, dus een curve uit training is een ondergrens. Met drie loopjes per week en weinig harde stukken is de curve dun. Daarom alleen als controle naast de test, nooit als vervanging, en pas na een paar weken.

**Werk.** Middel. Eén verzoek extra of eigen rekenwerk; let op de grens met "Run in detail".

### Kans G. Patronen per weekdag en tijdstip

**Gegevens.** Je planning en je logs (wat er gepland stond en wat er gebeurde, met datum en tijd). Alles lokaal.

**Wat je ziet.** Na een paar maanden en alleen als het duidelijk is: "Op donderdag valt je training de laatste acht weken vijf keer weg. Wil je de vaste training van donderdag naar woensdag?" Met Akkoord, zoals elke planningswijziging.

**Bewijs.** Geen sportwetenschap; dit is praktijk (afgeleid). Wat wel onderzocht is: bijsturen op wat er echt gebeurt levert vooral minder slechte uitkomsten ([Nuuttila e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/)) (matig), en volhouden is de grootste voorspeller van vooruitgang (algemeen aanvaard, expert). Over het tijdstip: kracht en snelheid zijn 's avonds iets beter dan 's ochtends, maar het verschil is klein (zie *Volgorde van twee trainingen*, "Tijdstip van de dag").

**Ruis.** Vakanties, ziekte en tochten tellen niet mee; die staan al als verlof of ziekte. Kleine aantallen: pas vanaf ongeveer zes gelegenheden per weekdag en een duidelijk verschil (afgeleid, eigen aanname).

**Werk.** Klein. `weekShape` kan het verplaatsen nog niet later wijzigen (`CLAUDE.md`: "Changing the week shape later is not built yet"), dus eerst alleen de zin, het voorstel als dat bestaat.

### Kans H. Slaap tegenover je prestatie, voor jou

**Gegevens.** Slaapduur en slaapscore (al opgehaald), de korte-nachtvraag (`shortNight.ts`), en je eigen maat voor prestatie: hartslag bij rustig tempo, raak in Forge, gevoel.

**Wat je ziet.** In "Wat doet dit met je?" op Je stand naast je eigen notities: "Na een nacht onder 6 uur ligt je hartslag bij rustig tempo gemiddeld 4 slagen hoger (7 keer gezien)." Pas na genoeg keren, met de band die het al gebruikt.

**Bewijs.** Een nacht van 6 uur of minder verlaagt prestatie gemiddeld met ongeveer 7,6 procent, met grote verschillen tussen studies ([Craven e.a. 2022](https://lida.sport-iat.de/ta/Record/4078085)) (matig tot sterk voor de richting, zwak voor het getal). Consumentenapparaten herkennen slaap goed en wakker liggen slecht, en scoren slaapfasen wisselend; in die vergelijking deden de twee Garmin-horloges het slechter dan een onderzoeksactigraaf ([Chinoy e.a. 2021](https://doi.org/10.1093/sleep/zsaa291)) (matig, 34 jonge volwassenen, oudere modellen).

**Ruis.** Grotendeels gebouwd: een korte nacht van het horloge telt al vanzelf als feit (`docs/beslissingen/2026-10-25-feiten-tellen-vanzelf.md`). De kans is alleen de uitbreiding naar een persoonlijk effect, met dezelfde regels (minstens drie, liever vier keer, banden die elkaar niet raken). Slaapscore niet gebruiken; die is een formule van Garmin.

**Werk.** Klein.

### Kans I. Bergweer op de hoogte van je tocht

**Gegevens.** Open-Meteo met `elevation` (de hoogte van een col of je slaapplek), `freezing_level_height`, `cape`, windstoten.

**Wat je ziet.** Bij een tochtdag in de bergen (alleen bij een tocht met terrein bergen of sneeuw): "Op 2.500 m morgen rond 4 graden, windstoten tot 50 km per uur, kans op onweer in de middag." Met één vaste verwijzing naar het officiële bergweerbericht van het land.

**Bewijs.** Onweer in de middag en kou op hoogte zijn bekende risico's in de Alpen (expert). Maar *Doelsoorten berg en buiten* legde vast dat veiligheid in de bergen, ook het weer, vakwerk is en dat ASCEND daar geen advies over geeft. Deze kans is dus alleen informatie en een link, geen oordeel als "ga niet".

**Ruis.** Een model van 1 tot 11 km rekent een bergkam slecht uit; downscaling naar een hoogte helpt bij temperatuur, niet bij lokale buien (afgeleid). Op een tocht heb je vaak geen bereik; de app moet de voorspelling van de avond ervoor tonen met de tijd erbij.

**Werk.** Klein tot middel. De weerlaag bestaat; de hoogte van de etappe moet ergens vandaan komen (de tocht of de gebruiker).

### Kans J. Luchtkwaliteit en pollen bij een harde sessie

**Gegevens.** Open-Meteo luchtkwaliteit: Europese AQI, fijnstof, ozon, en pollen.

**Wat je ziet.** Alleen op een dag met slechte lucht en een tempoloop, intervallen of test: "Veel ozon vanmiddag. Liever 's ochtends, of vandaag rustig." Pollen alleen als je in de instellingen zegt dat je er last van hebt.

**Bewijs.** Inspanning in vervuilde lucht verhoogt de opname van fijnstof en ozon kan longfunctie en prestatie verlagen ([Giles en Koehle 2014](https://pubmed.ncbi.nlm.nih.gov/24174304/)) (matig). In Nederland zijn de dagen met echt slechte lucht beperkt tot een paar zomerse ozondagen per jaar (waarschijnlijk).

**Ruis.** Een raster van 11 km zegt weinig over een park naast een drukke weg. Weinig dagen, dus weinig zinnen; dat is goed.

**Werk.** Klein. Een tweede verzoek naar een andere host, alleen op dagen met een harde buitensessie.

### Kans K. Belasting en vorm van intervals.icu naast de beenindex

**Gegevens.** `icu_training_load`, `ctl`, `atl` uit de activiteiten of wellness.

**Wat je ziet.** Hoogstens een controle voor ontwikkelaars: liggen de weken die volgens ASCEND zwaar waren ook volgens intervals.icu zwaar?

**Bewijs.** De parameters van het Banister-model zijn per persoon onbetrouwbaar en 42 en 7 dagen zijn een keuze ([Hellard e.a. 2006](https://pmc.ncbi.nlm.nih.gov/articles/pmid/16608765)) (matig); TrainingPeaks noemt het zelf "a relative indicator" ([TrainingPeaks](https://www.trainingpeaks.com/learn/articles/the-science-of-the-performance-manager/)). De belasting van intervals.icu rekent kracht en bergaf niet zoals jouw benen het voelen; de beenindex doet dat wel, met drie lagen.

**Oordeel.** Niet bouwen als iets wat je ziet. Een tweede vormgetal naast de beenindex en het GR5-percentage verwart, en `CLAUDE.md` verbiedt een tweede voortgangsgetal. Hoogstens een stille test in de code.

### Kans L. Schoenen en materiaal

**Gegevens.** `gear` op elke activiteit en het `gear`-verzoek met afstand per paar.

**Bewijs.** Lopers die meer dan één paar afwisselden hadden in een cohort van 264 lopers minder blessures ([Malisoux e.a. 2015](https://pubmed.ncbi.nlm.nih.gov/24286345/)) (zwak: samenhang, geen oorzaak). Voor een vaste vervangtermijn in kilometers vond ik geen goed onderzoek.

**Oordeel.** Niet bouwen. Het besluit `docs/beslissingen/2026-10-25-bergschoenen-inlopen.md` zegt dat de kilometers van hardloopschoenen bij Garmin blijven, en dat inlopen van bergschoenen al bestaat op een datum die jij invult. Hooguit later: als je bergschoenen in Garmin als materiaal staan, kan het inlopen die kilometers lezen in plaats van alle wandelingen te tellen.

### Kans M. VO2max-trend

**Bewijs.** Horloges die VO2max uit inspanning schatten zitten gemiddeld goed, maar per persoon is de fout groot ([Molina-Garcia e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9213394/)) (matig). En Garmin filtert VO2max sinds eind september 2026 uit wat partners krijgen.

**Oordeel.** Niet bouwen. Je hartslag bij rustig tempo en je testen zeggen hetzelfde, eerlijker, en zijn er al.

### Kans N. Krachtvolume tegenover loopprestatie

**Gegevens.** Sets per spiergroep uit Forge, de hartslag bij tempo en de tests.

**Bewijs.** Zware kracht verbetert de loopeconomie met 2 tot 8 procent over weken ([Blagrove e.a. 2018](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5889786/)) (matig). Dat effect zie je bij één persoon niet terug in een grafiek: er verandert te veel tegelijk.

**Oordeel.** Wat zinnig is, bestaat al: een zware beendag telt als feit voor de loop van de dag erna (`influence.ts#derivedFactEntries`), en de beenindex rekent kracht mee. Een correlatie "meer sets, sneller" toevoegen is schijnprecisie. Wel nuttig, en klein: in het wedstrijdblok één zin dat je kracht blijft staan ("je squat ligt op het niveau van vier weken terug"), wat Forge al vergelijkt.

### Kans O. Wat er verder in wellness zit

Stappen en trappen: een paar duizend stappen meer of minder verandert je benen weinig naast een bergtocht; niet gebruiken. SpO2 en ademhaling van de pols: onbetrouwbaar en op hoogte een medisch onderwerp; niet gebruiken en zeker niet als advies op een tocht. Body Battery, Garmin-stress en readiness: niet gepubliceerde formules zonder validatie ([Doherty e.a. 2025](https://www.degruyterbrill.com/document/doi/10.1515/teb-2025-0001/html)) (matig voor het ontbreken van bewijs), en ze komen niet door. Gewicht uit Garmin: besloten dat gewicht uit MacroFactor komt. De subjectieve schalen van intervals.icu: ASCEND heeft zijn eigen check-in. Menstruatiefase: niet relevant voor de eigenaar; voor anderen (*ASCEND voor iedereen*) een apart onderzoek waard, met de waarschuwing dat de prestatie-effecten per fase klein en wisselend zijn (niet onderzocht in dit rapport).

## 3. Wat andere apps hiermee doen

**Garmin** zelf combineert slaap, HRV-status, hersteltijd en belasting tot Training Readiness, met daarnaast Training Status, acute belasting en acclimatisatie aan hitte en hoogte. Formules zijn niet openbaar ([Garmin-handleiding](https://www8.garmin.com/manuals/webhelp/GUID-31D23DBB-57C2-4DF7-A0C9-8D1A00AB4BE7/EN-US/GUID-C21BE0C8-A08E-4DA1-B6C6-2E0E2DDDB372.html)). Gewaardeerd: HRV-status als zevendaags gemiddelde tegen je eigen band. Ruis volgens gebruikers en onderzoekers: getallen die botsen met hoe je je voelt zonder uitleg waarom.

**WHOOP, Oura, Athlytic en Bevel** maken van HRV, rusthartslag en slaap een dagelijkse herstelscore en van je activiteit een "strain". Bevel doet dat met de Apple Watch en voegt voedingslogging, een energiebalans door de dag en sinds 2026 AI-gesprekken toe ([recensie](https://kiledjian.com/2026/07/07/bevel-turns-apple-watch-data.html)). Gewaardeerd: alles op één plek, een vast moment in de ochtend. De kritiek uit het onderzoek: van 14 van zulke scores bij 10 fabrikanten zijn validiteit en betekenis onduidelijk ([Doherty e.a. 2025](https://www.degruyterbrill.com/document/doi/10.1515/teb-2025-0001/html); [bespreking door co-auteur Altini](https://marcoaltini.substack.com/p/paper-readiness-recovery-and-strain)) (matig).

**TrainingPeaks** is de bron van CTL, ATL en TSB. De maker noemt ze zelf relatief en waarschuwt ze niet te letterlijk te nemen ([TrainingPeaks](https://www.trainingpeaks.com/learn/articles/the-science-of-the-performance-manager/)).

**Runalyze** schat per loopje een effectieve VO2max uit hartslag en tempo, corrigeert die met je beste wedstrijd en zet er een "marathonvorm" naast die zegt of je volume past bij de voorspelde tijd; Runalyze schrijft er zelf bij dat die marathonvorm niet wetenschappelijk is maar overmoedige voorspellingen temt ([Runalyze, marathonvorm](https://runalyze.com/glossary/marathon-shape)). Dat laatste is een goede les: een voorspelling dempen met wat je echt traint.

**intervals.icu** heeft de breedste set: vorm, tempocurves met kritieke snelheid, tijd per zone, materiaal met herinneringen, de submaximale test met een kleur, en wellness naast belasting. Gewaardeerd om openheid en controle; het nadeel is dat je het zelf moet lezen.

**Strava** heeft "Fitness & Freshness", beste prestaties en sinds 2024 Athlete Intelligence, AI-samenvattingen van je training. Kritiek: vaak oppervlakkig, soms fout of ongepast, en vooral nuttig voor beginners ([Fortune](https://fortune.com/2024/10/11/strava-app-artificial-intelligence-fitness-athletic-memes); [Android Central](https://www.androidcentral.com/wearables/strava-announces-stable-athlete-intelligence-anti-cheating-and-flyover-sharing)) (zwak, recensies).

Wat ik daaruit haal voor ASCEND (afgeleid): wat gebruikers waarderen is één ding per ochtend en een getal tegen je eigen normaal; wat ze ruis vinden is een samengestelde score zonder waarom en een tekst die iets zegt wat ze al wisten. ASCEND kiest al voor losse signalen met een zin erbij en zwijgt als er niets is. Dat moet zo blijven, ook bij elke kans hierboven.

## 4. Privacy en lokaal

**Opslag.** Alles blijft op de telefoon in IndexedDB. Wat ASCEND bewaart is klein: de logs met een compact profiel (geen reeksen, geen route, alleen een afgerond beginpunt), ochtendgetallen per dag tot 400 dagen, en wat je uit MacroFactor kiest. De reeksen van een uur lopen zijn honderden KB en worden nooit bewaard. Voeding per voedingsmiddel zou dat wel worden; bewaar daarom alleen dagtotalen (calorieën, eiwit, koolhydraten, vet), niet wat je at. Dat is ook privacyvriendelijker. `navigator.storage.persist()` vraagt ASCEND al (`storage/persistence.ts`), zodat de browser de opslag niet zomaar opruimt.

**Back-up.** De back-up bevat je eigen invoer en de logs, niet de cache van intervals.icu en niet de sleutel. Dat was een goede keuze zolang de bron altijd terug te halen is. Met het risico uit het begin van dit rapport is het een vraag voor de eigenaar of de ochtendgetallen mee moeten. Gezondheidsgegevens in een JSON-bestand dat je in een cloudmap zet zijn gevoeliger dan trainingen; als ze meegaan, dan als eigen keuze in de instellingen en met een zin dat het bestand dan ook je ochtendgetallen bevat (afgeleid).

**Ophalen in de achtergrond.** Een webapp haalt op als je hem opent; dat gebeurt nu, één taak tegelijk. Echt in de achtergrond kan alleen met Periodic Background Sync, en dat bestaat alleen in Chrome op Android voor een geïnstalleerde app, met een minimum van ongeveer twaalf uur dat Chrome zelf oprekt naar hoe vaak je de app gebruikt (`utils/morningNotice.ts`, dat dit al voor de ochtendmelding gebruikt). Op een iPhone bestaat het niet. De service worker kan bij de sleutel in IndexedDB, dus de ochtendgetallen van vannacht ophalen bij dezelfde wekbeurt als de ochtendmelding is technisch mogelijk (afgeleid). Maar een onvoorspelbaar tijdstip, een zwakke verbinding en de limiet van 5.000 verzoeken per dag (ruim genoeg) maken het een gemak, geen basis. Alles hierboven moet werken met "ophalen bij openen".

**Derden.** Elke kans in de top tien praat alleen met diensten waar ASCEND al mee praat (intervals.icu met je eigen sleutel, Open-Meteo zonder sleutel met een afgeronde plek). De luchtkwaliteit gaat naar een andere host van Open-Meteo met dezelfde afgeronde plek. Geen server van ASCEND, geen account. Voeding gaat nergens heen.

## 5. Top 10, met bouwvolgorde

Gerangschikt op waarde voor deze gebruiker, met kracht, bergtochten, een lange trektocht met rugzak en hardlopen als doelen, een Forerunner 255 met HRM-Pro, en Nederland als oefenterrein.

1. **Klimtempo met rugzak en een eigen etappeschatting** (kans A). Raakt het hoofddoel direct, gebruikt alleen wat er al is, en maakt een norm persoonlijk. Middel.
2. **Vroeg zien dat je ziek wordt** (kans B). Klein werk, groot voordeel: een week ziek in de opbouw kost meer dan een week minder trainen. Klein.
3. **De ochtendregel voor zware sessies** (kans C). Al twee keer aanbevolen, de getallen komen nu vanzelf. Middel.
4. **Hitte in je tempo en hitte-acclimatisatie voor de zomertocht** (kans D). Sterk principe, klein werk, en een GR5 in augustus is warm in de dalen. Klein.
5. **Voeding naast gewicht en kracht** (kans E). Veel waarde als je afvalt terwijl je kracht opbouwt; vraagt een besluit van de eigenaar. Middel.
6. **Patronen per weekdag** (kans G). Geen wetenschap, wel de meest praktische vraag: past het plan bij je week? Klein, het voorstel later.
7. **Slaap tegenover je prestatie** (kans H). Grotendeels gebouwd; alleen de persoonlijke uitkomst erbij. Klein.
8. **Een persoonlijke tempocurve tussen testen** (kans F). Nuttig als controle, beperkt door weinig harde loopjes. Middel.
9. **Bergweer op de hoogte van je tocht** (kans I). Alleen informatie, en pas in de zomer van waarde. Klein tot middel.
10. **Luchtkwaliteit bij een harde sessie** (kans J). Weinig dagen in Nederland, maar goedkoop. Klein.

Wat niet loont, eerlijk: CTL, ATL en TSB als iets wat je ziet (kans K), de VO2max van het horloge (kans M), schoenkilometers (kans L, ook door besluit), krachtvolume tegen looptempo als correlatie (kans N), Body Battery, Garmin-stress, readiness, SpO2, ademhaling als advies, stappen en trappen (kans O), en calorieën per tocht op de kilocalorie. Ook `decoupling` en de efficiëntiefactor van intervals.icu zelf: die leunen waarschijnlijk op vermogen; ASCEND rekent ze al zelf.

**Bouwvolgorde.**

Stap 0, nu en vóór alles: de bronbewaking en het besluit over de ochtendgetallen in de back-up (zie het begin), plus `fields=` op het activiteitenverzoek. Klein. Daarmee is wat er ligt veilig, wat er ook met Garmin gebeurt.

Stap 1, klein en los van elkaar: kans B (ziek worden), kans D (hitte, met dauwpunt in de voorspelling) en kans H (slaap per persoon). Alle drie lezen wat er al is.

Stap 2, middel: kans A (klimtempo en etappe) en kans C (ochtendregel). A eerst, omdat het voor de GR5 het meeste zegt en geen nieuwe gegevens nodig heeft.

Stap 3, na een besluit van de eigenaar: kans E (voeding). Daarna kans G (weekdag, met het voorstel zodra de weekvorm later te wijzigen is), F, I en J.

Elke kans krijgt, volgens de werkafspraken, een instelling met het advies als standaard, een plek in `settingsIndex.ts`, `settingsLayout.ts` en `settingsSummary.ts`, en alles wat de planning verandert gaat via een voorstel met Akkoord.

## Afsluiting

### Wat het onderzoek zegt

Over het lichaam: een paar signalen samen tegen je eigen normaal (rusthartslag, HRV, gevoel, hartslag bij tempo) helpen een beetje om zware sessies op slechte dagen te verzachten en om ziek worden vroeg te zien (bewijs matig). Hitte maakt je meetbaar trager en went in één tot twee weken (matig tot sterk). Een korte nacht kost gemiddeld een paar procent prestatie (matig). Langzaam afvallen spaart kracht beter dan snel, en rond 1,6 g eiwit per kg is genoeg (matig tot sterk). Samengestelde scores van fabrikanten, CTL en TSB, en een VO2max van de pols zijn per persoon onbetrouwbaar of niet gevalideerd (matig voor het ontbreken van bewijs). Over de bronnen: intervals.icu levert veel meer dan ASCEND leest, maar de toegang tot Garmin-gegevens via die weg staat sinds oktober 2026 op losse schroeven, en Garmin filtert zijn eigen afgeleide getallen al weg.

### Wat het betekent voor de app

Bouw op wat ASCEND al heeft en lokaal bewaart, niet op nieuwe Garmin-velden. Zet eerst de bron veilig (bewaking, en een besluit over de ochtendgetallen in de back-up). Daarna, als voorstellen voor engine-regels: een persoonlijke etappetijd uit je eigen klimtempo met rugzak; een vraag bij twee afwijkende ochtendsignalen meerdere dagen achter elkaar; de ochtendregel "twee van drie" voor zware sessies als voorstel met Akkoord; een hitte-regel die zegt "loop op hartslag" met een band voor het tempo; en, als de eigenaar dat wil, dagtotalen uit de Food Log naast gewicht en kracht. Geen nieuw voortgangsgetal, geen samengestelde score, en bij pijn of klachten verwijst de app naar een arts of fysiotherapeut.

### Wat nog onzeker is

- Of en wanneer intervals.icu Garmin-gegevens voor persoonlijke sleutels blokkeert, en of wellness en oude gegevens eronder vallen.
- Welke wellnessvelden Garmin voor jouw account echt vult; één verzoek met je eigen sleutel en `fields=` beantwoordt dat.
- Welke werkbladen jouw MacroFactor-export heeft (dagtotalen, energieverbruik, of alleen de Food Log per voedingsmiddel).
- Of er in Nederland genoeg klimmen zijn om je eigen klimtempo met rugzak betrouwbaar te maken voor de zomer; anders blijft de norm staan met een brede band.
- De drempels in de regels (zes slagen, twee ochtenden, zes keer per weekdag, 50 hoogtemeters) zijn eigen aannames en moeten met je eigen gegevens worden getoetst.
- Enkele bronnen las ik alleen via samenvatting: Craven 2022, Ely 2007, Dial 2025, Doherty 2025 en de meldingen over het filteren door Garmin.

## Bronnen

Bronnen over gegevens en diensten:

- intervals.icu, OpenAPI-beschrijving: https://intervals.icu/api/v1/docs
- intervals.icu-forum, API access (updates van 9 en 14 oktober 2026, limieten): https://forum.intervals.icu/t/api-access-to-intervals-icu/609/1
- Issue "intervals.icu will likely stop sharing Garmin data through its API": https://github.com/platypus45/domestique/issues/29
- the5krunner, Garmin API Terms Close Intervals Pro (14 oktober 2026): https://the5krunner.com/2026/10/14/garmin-api-intervals-third-party-apps/
- Gadgets & Wearables, Intervals Pro shuts down (14 oktober 2026): https://gadgetsandwearables.com/2026/10/14/garmin-api-intervals-pro-shutdown/
- garmin-intervals-bridge (wat Garmin uit FIT-bestanden filtert, wat de wellness-sync mist): https://github.com/futureweb/garmin-intervals-bridge
- intervals.icu-forum, gedeeltelijke wellness-sync: https://forum.intervals.icu/t/garmin-wellness-partial-sync-sleep-works-rhr-hrv-steps-missing/130093
- intervals.icu-forum, Garmin-gezondheidsgegevens koppelen: https://forum.intervals.icu/t/connecting-garmin-health-metrics-to-intervals-icu/25303
- DC Rainmaker, Garmin Connect API revamp (oktober 2026): https://www.dcrainmaker.com/2026/10/garmin-connect-api-revamps-connect-developer.html
- MacroFactor helpcentrum, Export Your Data: https://help.macrofactorapp.com/en/articles/356-export-your-data
- Nutrola, How to Export Data from MacroFactor: https://nutrola.app/en/blog/how-to-export-data-from-macrofactor
- Open-Meteo, Weather Forecast API: https://open-meteo.com/en/docs
- Open-Meteo, Air Quality API: https://open-meteo.com/en/docs/air-quality-api
- DAV München en Oberland, waar de looptijd op de bordjes vandaan komt (DIN 33466): https://www.alpenverein-muenchen-oberland.de/mitgliederservice/alpine-beratung-dav/bergwissen/tourenplanung-einstieg/woher-kommt-die-gehzeit-auf-den-wanderschildern

Onderzoek en richtlijnen:

- Mishra e.a. 2020, ziekte vroeg zien met smartwatchgegevens: https://www.nature.com/articles/s41551-020-00640-6
- Bosquet e.a. 2008, rusthartslag en overbelasting: https://pubmed.ncbi.nlm.nih.gov/18308872/
- Buchheit 2014, hartslag en HRV volgen: https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/
- Nuuttila e.a. 2022, bijsturen op welzijn, HRV en hartslag bij tempo: https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/
- Düking e.a. 2021, meta-analyse HRV-sturing: https://pubmed.ncbi.nlm.nih.gov/34489178/
- Manresa-Rocamora e.a. 2021, meta-analyse HRV-sturing: https://pmc.ncbi.nlm.nih.gov/articles/PMC8507742/
- Dial e.a. 2025, nauwkeurigheid nachtelijke HRV van wearables: https://physoc.onlinelibrary.wiley.com/doi/10.14814/phy2.70527
- Ely e.a. 2007, weer en marathonprestatie: https://experts.umn.edu/en/publications/impact-of-weather-on-marathon-running-performance/
- Racinais e.a. 2015, consensus trainen en presteren in de hitte: https://doi.org/10.1136/bjsports-2015-094915
- Craven e.a. 2022, slaapverlies en prestatie: https://lida.sport-iat.de/ta/Record/4078085
- Chinoy e.a. 2021, slaaptrackers tegen polysomnografie: https://doi.org/10.1093/sleep/zsaa291
- Garthe e.a. 2011, tempo van afvallen, lichaamssamenstelling en kracht: https://www.sponet.de/sponet/Record/4020931
- Helms e.a. 2014, aanbevelingen voor voeding bij wedstrijdvoorbereiding: https://jissn.biomedcentral.com/articles/10.1186/1550-2783-11-20
- Morton e.a. 2018, eiwit en krachttraining: https://bjsm.bmj.com/content/52/6/376
- Thomas e.a. 2016, ACSM voeding en sportprestatie: https://pubmed.ncbi.nlm.nih.gov/26891166/
- Mountjoy e.a. 2023, IOC-consensus REDs: https://bjsm.bmj.com/content/57/17/1073
- Smyth en Muniz-Pumares 2020, kritieke snelheid uit trainingsgegevens: https://pmc.ncbi.nlm.nih.gov/articles/PMC7664951
- Looney e.a. 2021, energiekost van lastdragen: https://pmc.ncbi.nlm.nih.gov/articles/PMC8919998
- Giles en Koehle 2014, inspanning in vervuilde lucht: https://pubmed.ncbi.nlm.nih.gov/24174304/
- Hellard e.a. 2006, betrouwbaarheid van het Banister-model: https://pmc.ncbi.nlm.nih.gov/articles/pmid/16608765
- Malisoux e.a. 2015, afwisselen van loopschoenen: https://pubmed.ncbi.nlm.nih.gov/24286345/
- Molina-Garcia e.a. 2022, VO2max van consumentenwearables: https://pmc.ncbi.nlm.nih.gov/articles/PMC9213394/
- Blagrove e.a. 2018, kracht en loopeconomie: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5889786/
- Doherty e.a. 2025, samengestelde scores van wearables: https://www.degruyterbrill.com/document/doi/10.1515/teb-2025-0001/html

Apps en fabrikanten:

- Garmin-handleiding, Training Readiness: https://www8.garmin.com/manuals/webhelp/GUID-31D23DBB-57C2-4DF7-A0C9-8D1A00AB4BE7/EN-US/GUID-C21BE0C8-A08E-4DA1-B6C6-2E0E2DDDB372.html
- TrainingPeaks, The Science of the Performance Manager: https://www.trainingpeaks.com/learn/articles/the-science-of-the-performance-manager/
- Runalyze, berekeningen: https://runalyze.com/help/article/88
- Runalyze, marathonvorm: https://runalyze.com/glossary/marathon-shape
- Marco Altini, bespreking van readiness- en herstelscores: https://marcoaltini.substack.com/p/paper-readiness-recovery-and-strain
- Bevel, recensie: https://kiledjian.com/2026/07/07/bevel-turns-apple-watch-data.html
- Fortune over Strava Athlete Intelligence: https://fortune.com/2024/10/11/strava-app-artificial-intelligence-fitness-athletic-memes
- Android Central over Strava Athlete Intelligence: https://www.androidcentral.com/wearables/strava-announces-stable-athlete-intelligence-anti-cheating-and-flyover-sharing

Eigen rapporten waarop dit voortbouwt: *Data zonder handwerk* (visie), *Trainingswetenschap* (visie), *Loopgegevens en vooruitgang*, *Andere manieren om belasting te plannen*, *Betrouwbaarheid beenvermoeidheid-index*, *Alcohol en herstel*, *Volgorde van twee trainingen*, *Doelsoorten berg en buiten*, *Aanvullend onderzoek GR5 voorbereiding*, *Zweetverlies en water*, *Horloge, server en weegschaal*.
