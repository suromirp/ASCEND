# ASCEND: trainingsscherm en infoscherm

Datum: 5 oktober 2026. Gecontroleerd op commit ca5d626 met `vite` op poort 5174 en Playwright (Chromium) op 390x844 en 360x740. In `src/` is niets gewijzigd.

Hoe getest: in een testbrowser is het hoofddoel (GR5, het doel met een Ascent Ladder) op actief gezet met doeldatum 2 augustus 2027. Daarmee loopt het plan in vijf fasen: Basis 17 weken, Opbouw 12, Bergcapaciteit 8, Expeditieklaar 4 en Naar de start 2. Daarna is de klok van de browser per sessie op de echte dag van die sessie gezet, zodat Vandaag precies die training toont met de cijfers van die week. Per sessie zijn de kaart op Vandaag, het infoscherm (dicht en met "Meer uitleg" open) en het trainingsscherm (bovenste scherm en volledig) vastgelegd. Daarnaast een paar extra situaties: week 3 van de heuvelintervallen, de bergtocht in week 7 en in de zwaarste Expeditieklaar-week, de wandeldag in week 3, de GARMIN- en VRIJ-stand, fietsen kiezen op een loopdag en kracht met "Kracht bijgehouden in MacroFactor" aan.

Alle schermafbeeldingen, de uitgelezen schermtekst (`*.txt`, `extra.txt`), de scripts (`capture.js`, `capture2.js`) en een klein HTML-ontwerp (`mockup.html`, `mockup.png`) staan in de scratchpad-map `train-audit/` van deze sessie:
`/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/train-audit/`

---

## Samenvatting

- Het trainingsscherm is nu vooral een invulformulier. Het heet bovenaan "SESSIE VOLTOOIEN", ook als je net op "TRAINING STARTEN" hebt getikt, en welke sport het is staat er nergens. Wat je moet doen en wat je achteraf invult lopen door elkaar, en de opslaanknop staat 1.100 tot 2.300 pixels lager.
- Voor de Bergtocht en Wandeldag 1 van 2 bestaat geen infoscherm. Er is geen infoknop, dus de Garmin-stappen, "Deze fase", "Waar kun je dit doen?" en "Te zwaar?" zijn voor juist de belangrijkste GR5-trainingen nooit te zien.
- Bij kracht spreken de twee schermen elkaar tegen. Het infoscherm zegt "De inhoud komt uit MacroFactor", het trainingsscherm toont standaard zeven oefeningen met lege kg- en reps-vakjes, zonder overzicht en zonder zwaarte.
- Er zitten concrete fouten in de cijfers: Vandaag zegt "4-5 herhalingen" en het trainingsscherm "5 keer"; in week 3 staat "±45 min" naast een grafiek van 46 minuten; "Bergop 1 min" naast "30-90 sec"; de lange duurloop zegt "max +10%" terwijl de minuten met 20% stijgen; de bergtocht krijgt de zin "rustig in de zware stukken, rustig ertussen".
- De keuze hoe je traint (ASCEND/GARMIN/VRIJ en daaronder "Primair", "Gelijkwaardig", "Cross-training", "Noodgreep") is vakjargon zonder uitleg, en een keuze verandert soms stilletjes de sport. Kies je "Fietsen, buiten" op de Rustige duurloop, dan wordt het als Fietsen opgeslagen terwijl het scherm "Rustig hardlopen" blijft zeggen.

---

## Wat er nu misgaat per sessietype

### Wat voor alle sessies geldt

Trainingsscherm (`src/components/ExerciseLogger.tsx`):

- De eyebrow is "SESSIE VOLTOOIEN" en de knop onderaan "VOLTOOIEN". Je opent dit scherm om te gaan trainen, niet om af te ronden. Dat maakt het meteen verwarrend.
- De sport staat er niet. De kop is de naam ("Heuvelintervallen") met de focusregel ("Snelheid × D+, bergop intervaltraining"). Alleen op de kaart van Vandaag staat sinds kort "Hardlopen".
- De volgorde klopt niet met hoe je traint. Eerst komt het plan, dan een ingeklapte kaart "OPWARMING (voor) 8 tonen", dan de vraag waar en hoe je traint, dan de invulvelden, en pas helemaal onderaan "AFKOELING (na)". Bij de heuvelintervallen en de bergtocht staat in het plan ook al "Opwarmen 10 min" of "Rustig inlopen 10 min". Je hebt dus twee opwarmingen zonder dat duidelijk is welke eerst komt.
- Twee bijna gelijke vragen onder elkaar: "Hoe wil je trainen?" (ASCEND, GARMIN, VRIJ) en "Hoe train je vandaag?" (de modaliteiten). Wat ASCEND, GARMIN en VRIJ betekenen wordt nergens gezegd.
- De rollen naast elke optie zijn jargon: "Primair", "Gelijkwaardig", "Cross-training", "Noodgreep", "Later". Bij de Lange duurloop staan er twee keer "Primair" naast elkaar.
- De invulvelden zijn leeg, ook als het plan het antwoord al weet. Bij de bergtocht staan "Rugzak 4 kg" en "400 m stijgen en dalen" in het plan, maar de velden Rugzak en Stijging zijn leeg.
- De knop ANNULEREN is te smal; de tekst raakt de rand, op 390 en op 360 breed (zie `07_herstel_training_full.png` en `01_bovenlichaam_a_training_onderkant.png`).
- Tikdoelen: de modaliteitchips zijn ongeveer 30 pixels hoog, de ASCEND/GARMIN/VRIJ-knoppen ongeveer 34, "rust" bij een oefening is een onderstreept woordje van ongeveer 16 pixels hoog en "Sluiten" rechtsboven is losse tekst. Alleen de infoknop haalt 44 pixels.
- Wat er op 390x844 zonder scrollen te zien is, verschilt sterk. Bij de Rustige duurloop zie je het plan en de keuzes; bij de Heuvelintervallen alleen het plan (waar je traint staat onder de vouw); bij kracht alleen de eerste drie oefeningen en geen overzicht.
- De hint onder RPE zegt bij elke sessie met een rustiger in- of uitloopstuk "in de zware stukken, rustig ertussen", ook als de zwaarste stap zelf rustig is (bergtocht, wandeldag). Oorzaak: `ExerciseLogger.tsx` regel 479 kijkt alleen of er een lagere stap bestaat.

Infoscherm (`src/components/TrainingGuideSheet.tsx`):

- De ondertitel komt uit `trainingGuide.ts` en noemt de sport niet of anders: "Cardio • Aerobe basis" (Rustige duurloop), "Snelheid × D+ • Bergop intervaltraining", "Uithouding × D+ • Richting marathon en GR5", "Kracht • Belangrijkste lower-body sessie", "Herstel · rustig bewegen". Twee soorten scheidingstekens door elkaar.
- De volgorde is: stappen, Garmin-instructie, wat het belast, bouwt aan, deze fase, "Waar kun je dit doen?", en pas daarna onder "MEER UITLEG" het doel, de intensiteit en wanneer het te zwaar is. Het "waarom" en het "wanneer stoppen" zitten dus achter een klik, de Garmin-instructie niet.
- Onder "MEER UITLEG" staat als eerste een regel als "ASCEND: duur, afstand, D+, gemiddelde hartslag, via Garmin Forerunner 255 + borstband." Dat is een notitie voor de bouwer, geen uitleg.
- Er is alleen een Sluiten-knop helemaal onderaan. Met "Meer uitleg" open is het blad bij de Rustige duurloop 2.450 pixels hoog (`03_rustige_duurloop_info_meer.png`).
- De stappen zelf zijn wel 1:1 gelijk aan het trainingsscherm, omdat beide `WorkoutSteps` gebruiken. Dat is goed en moet zo blijven.
- Vaktaal in de uitleg: "%LTHR", "%Max HR", "talk test", "easy effort", "tempo-/thresholdrun", "running economy", "hypertrofie", "lower-body", "excentrisch", "Total Ascent", "RIR" zonder uitleg.
- Teksten verwijzen naar vaste dagen en oude sessies: "de heuvelintervallen van zaterdag", "benen zijn iedere woensdag nog sterk vermoeid", "zondag lange duurloop" (bij Bovenlichaam B, ook in fasen waarin het weekend uit wandeltochten bestaat), "net als bij Bergconditie" (die sessie staat niet meer in het schema), "Begin Maand 1 met ..." (het plan rekent in fasen, niet in maanden).

### Bovenlichaam A en Bovenlichaam B

Schermafbeeldingen: `01_bovenlichaam_a_vandaag.png`, `01_bovenlichaam_a_info_390.png`, `01_bovenlichaam_a_info_meer.png`, `01_bovenlichaam_a_training_390.png`, `01_bovenlichaam_a_training_full.png`, `01_bovenlichaam_a_training_onderkant.png`, en dezelfde reeks met `04_bovenlichaam_b_`.

- Infoscherm en trainingsscherm zeggen iets anders. Info: "De inhoud komt uit MacroFactor", stap "Kracht in MacroFactor, 75 min, Oefeningen, sets, gewicht en RIR volgens MacroFactor", en onder Meer uitleg "ASCEND: alleen voltooid/niet voltooid". Trainingsscherm (standaardinstelling, MacroFactor uit): zeven oefeningen met per set lege kg- en reps-vakjes. Het scherm is 2.286 pixels hoog, bijna drie schermen.
- Het trainingsscherm heeft geen kaart "WAT JE VANDAAG DOET" bij kracht (`ExerciseLogger.tsx` regel 223 toont die alleen als er conditiestappen zijn). Er staat dus nergens hoe lang, hoe zwaar of in welke volgorde.
- Er staat geen zwaarte bij. Alleen "4 × 6-8". Wat RIR is en hoeveel herhalingen je in de tank houdt, staat op geen van beide schermen.
- De oefeningnamen zijn Engels en soms vaag: "Bench press", "Lateral raises", "Triceps", "Biceps". Het gewicht van vorige keer staat er niet bij.
- Met "Kracht bijgehouden in MacroFactor" aan opent het trainingsscherm helemaal niet; Vandaag toont dan Duur plus BETER/NORMAAL/SLECHTER (`02_benen_a_vandaag_macrofactor_aan.png`). Dat werkt, maar dan is het infoscherm de enige plek met uitleg, en daar staat geen oefeningenlijst.

### Benen A (zwaar)

Schermafbeeldingen: `02_benen_a_vandaag.png`, `02_benen_a_info_390.png`, `02_benen_a_info_meer.png`, `02_benen_a_training_390.png`, `02_benen_a_training_full.png`, `02_benen_a_vandaag_macrofactor_aan.png`.

- Zelfde tegenspraak als bij bovenlichaam (MacroFactor tegenover zeven oefeningen invullen).
- "Core 3 × 45s" krijgt kg- en reps-vakjes, terwijl het een tijd is.
- "Step-downs (gecontroleerd excentrisch, langzaam neer)" is als oefeningnaam te lang en vaktaal. "Calves" en "Single-leg (Bulgarian split squat)" zijn Engels.
- De ondertitel op het infoscherm is "Kracht • Belangrijkste lower-body sessie".

### Rustige duurloop

Schermafbeeldingen: `03_rustige_duurloop_vandaag.png`, `03_rustige_duurloop_info_390.png`, `03_rustige_duurloop_info_360.png`, `03_rustige_duurloop_info_meer.png`, `03_rustige_duurloop_training_390.png`, `03_rustige_duurloop_training_full.png`, `03_rustige_duurloop_training_fietsen_gekozen.png`, `03_rustige_duurloop_training_garmin_modus.png`, `03_rustige_duurloop_training_vrij_modus.png`.

- Wat goed is: duur (30 min), zone 2, RPE 3-4 en de praattest staan er, en het blok is 1:1 gelijk aan het infoscherm.
- Kies je "Fietsen, buiten", dan blijft het scherm "Rustig hardlopen" en de stap "Hardlopen" tonen, maar het log wordt als Fietsen opgeslagen (`modalitySport` in `data/modalities.ts`). Er komen velden Cadans en Vermogen bij zonder dat gezegd wordt dat je nu iets anders doet. Fietsen staat ook niet aan in Instellingen, maar de optie staat er toch.
- GARMIN-stand: Engelse typen zonder uitleg (Recovery, Base, Tempo, Threshold, VO2 Max, Sprint, Long, Bike). Het oordeel herhaalt zichzelf: "Compatibel. Compatibel als de duur voldoende is, ..." (`data/garminSuggested.ts`). Het ASCEND-plan blijft erboven staan alsof je dat nog doet. Kies je daar "Bike", dan wordt het toch als Hardlopen opgeslagen.
- De ondertitel op het infoscherm is "Cardio • Aerobe basis". Het woord Hardlopen staat er niet.
- De belangrijkste waarschuwing ("Tempo is geen doel") staat alleen achter Meer uitleg.

### Heuvelintervallen

Schermafbeeldingen: `05_heuvelintervallen_vandaag.png`, `05_heuvelintervallen_info_390.png`, `05_heuvelintervallen_info_360.png`, `05_heuvelintervallen_info_full.png`, `05_heuvelintervallen_info_meer.png`, `05_heuvelintervallen_training_390.png`, `05_heuvelintervallen_training_full.png`, `05_heuvelintervallen_week3_meer_over.png`, `11_heuvelintervallen_taper_training_390.png`.

- Aantallen spreken elkaar tegen. Vandaag zegt "Wennen, 4-5 herhalingen" (weeknotitie in `defaultProgram.ts`), het plan zegt "5 keer". Onder Meer uitleg staat "Begin Maand 1 met 4-5 herhalingen, bouw op naar 8-10", terwijl het plan nooit boven 8 komt. De modaliteitstekst zegt hetzelfde nog eens.
- Week 3: label "±45 min" maar de grafiek loopt tot 46 min, met "Opwarmen 11 min" en "Uitlopen 11 min". Oorzaak: in `engine/workoutPlan.ts` wordt de overgebleven minuut over in- en uitlopen verdeeld en per stuk naar boven afgerond.
- "Bergop 1 min" met eronder "30-90 sec". Wat moet je nu doen? Ook in de Garmin-stappen staat 1:00.
- "Terug naar beneden 2 min ... tot je hersteld bent" en in de uitleg "tot volledig herstel". Een vaste tijd en "tot je hersteld bent" botsen.
- Kies je de loopband, dan blijven de stappen "Bergop" en "Terug naar beneden" heten, terwijl de modaliteitstekst "Helling op 4-5%" zegt (nauwelijks een heuvel) en verwijst naar "Bergconditie". Kies je "StairMaster-intervallen", dan wordt het log als Hardlopen opgeslagen, want die sleutel bevat geen loop- of wandelwoord.
- De sport is nergens te zien op beide schermen. Alleen de Garmin-regel "type Hardlopen" verraadt het.
- Op 390x844 zie je zonder scrollen alleen het plan, niet waar je traint en niet de opslaanknop.

### Lange duurloop

Schermafbeeldingen: `06_lange_duurloop_vandaag.png`, `06_lange_duurloop_info_390.png`, `06_lange_duurloop_info_full.png`, `06_lange_duurloop_info_meer.png`, `06_lange_duurloop_training_390.png`, `06_lange_duurloop_training_360.png`, `06_lange_duurloop_training_full.png`.

- Dit is waarschijnlijk de sessie waar de sportverwarring vandaan komt. De kaart zegt Hardlopen, maar de keuzelijst zet "Hardlopen, buiten" en "Wandelen met D+, buiten" allebei op "Primair". Kies je wandelen, dan wordt het een wandeling in het logboek, terwijl titel, stap en Garmin-type "Lange duurloop" en "Hardlopen" blijven.
- Drie verschillende opbouwregels: de modaliteit zegt "max +10%", het infoscherm en de weeknotitie zeggen "+10-15%", en de minuten zelf gaan van 50 naar 60 naar 70 (+20% en +17%).
- "D+ waar mogelijk" zonder getal, terwijl het sjabloon een doel van 300 m heeft (`outdoorTarget.targetElevationM`).
- Dubbel woord in de stap: "Rustig · RPE 3-4 · zone 2 · volledige zinnen kunnen praten. Rustig, D+ waar mogelijk".

### Herstel

Schermafbeeldingen: `07_herstel_vandaag.png`, `07_herstel_info_390.png`, `07_herstel_info_meer.png`, `07_herstel_training_390.png`, `07_herstel_training_full.png`.

- Drie verschillende boodschappen. Het plan zegt "Rustig wandelen, 45 min, zone 1, RPE 1-2". De vooraf gekozen optie is "Volledige rust" (Primair). Het infoscherm zegt "geen tempo- of hartslagdoel nodig" en "30-60 min rustige wandeling".
- Kies je volledige rust, dan staat Duur toch op 45 min, wordt RPE gevraagd, staat "AFKOELING (na) 5 tonen" eronder en heet de knop VOLTOOIEN. Je logt dan 45 minuten training die er niet was.

### Bergtocht

Schermafbeeldingen: `08_bergtocht_vandaag.png`, `08_bergtocht_training_390.png`, `08_bergtocht_training_360.png`, `08_bergtocht_training_full.png`, `08_bergtocht_week7_training_390.png`, `10_bergtocht_expeditie_week3_training_390.png`. Er is geen infoschermafbeelding, omdat er geen infoknop is.

- Geen infoscherm. `TRAINING_GUIDES` in `data/trainingGuide.ts` heeft geen `tpl_mountain_hike` (en ook geen `tpl_hike_day_one` en `tpl_bike`), en zowel `TodayMissionCard` als `SessionActionSheet` tonen de knop alleen als er een gids is. Daarmee verdwijnen ook de Garmin-stappen, "Deze fase" (de ladder van 8 weken met D+ en rugzak), "Waar kun je dit doen?" en elke "te zwaar"-regel.
- Wat goed is: "±120 min", "400 m stijgen en dalen", "Rugzak 4 kg" staan bovenaan, en de stappen geven eten per uur en "omhoog in kleine passen, omlaag beheerst".
- Het label "D+ en D− met rugzak" herhaalt de twee labels ervoor.
- "1000 m stijgen en dalen" in de zwaarste Expeditieklaar-week, zonder punt (Nederlands: 1.000 m). "Stijgen en dalen" laat open of het 400 m omhoog en 400 m omlaag is.
- Drinken, weer en route checken en wat je bij je hebt (materiaal) ontbreken, terwijl dit de langste training van de week is (tot 5 uur).
- Rugzak- en stijgingsveld zijn leeg, het RPE-hintje zegt "rustig (RPE 3-4) in de zware stukken, rustig ertussen".
- Twee opwarmingen: de 8 dynamische oefeningen en de stap "Rustig inlopen 10 min".
- Geen ASCEND/GARMIN/VRIJ-keuze (wel bij de andere duursessies). Dat is prima, maar het maakt het scherm per sessie anders opgebouwd.

### Wandeldag 1 van 2

Schermafbeeldingen: `09_wandeldag_1_van_2_vandaag.png`, `09_wandeldag_1_van_2_training_390.png`, `09_wandeldag_1_van_2_training_full.png`, `09_wandeldag_week3_training_390.png`.

- Ook geen infoscherm.
- "Rustiger dan morgen", maar de intensiteit is precies dezelfde als bij de bergtocht (zone 2, RPE 3-4). Het sjabloon zegt zelf "RPE 3: bewust rustig" (`cardioTarget.zone`), dat getal komt niet op het scherm.
- Wat morgen komt (de bergtocht met bijvoorbeeld 1.000 m en 12 kg) staat er niet. Juist dat is het punt van deze dag.
- Verder dezelfde punten als de bergtocht: lege velden, verkeerd RPE-hintje, dubbele opwarming.

---

## Sport duidelijk maken

De gebruiker zei: "het moet duidelijk zijn welke sport het is, dat begreep ik niet". De kaarten op Vandaag, Week en Logboek tonen nu de sport. Op de twee schermen die je opent om te trainen staat hij nog steeds niet, en de keuze daarbinnen kan hem ongemerkt veranderen. Voorstel:

1. Bovenaan beide schermen dezelfde sportregel als een rustig bronzen label, vóór de titel: `HARDLOPEN · BERGOP`. Het eerste woord is de sport uit `sessionKindLabel` (Hardlopen, Wandelen, Fietsen, Kracht, Herstel). Het tweede woord is de vorm van de training, zodat je in één blik weet wat je gaat doen:
   - Rustige duurloop: `HARDLOPEN · RUSTIG`
   - Heuvelintervallen: `HARDLOPEN · BERGOP`
   - Lange duurloop: `HARDLOPEN · LANG`
   - Bergtocht: `WANDELEN · MET RUGZAK`
   - Wandeldag 1 van 2: `WANDELEN · DAG 1 VAN 2`
   - Bovenlichaam A en B: `KRACHT · BOVENLICHAAM`
   - Benen A: `KRACHT · BENEN`
   - Herstel: `HERSTEL · RUST OF WANDELEN`
2. De sportregel volgt de gekozen manier van trainen. Kies je fietsen op een loopdag, dan wordt het `FIETSEN · RUSTIG` en verschijnt onder de keuze één regel: "Dit telt als fietsen, niet als hardlopen." Kies je bij de lange duurloop wandelen: "Dit telt als wandelen. Zelfde tijd, rustig tempo."
3. De opties zelf noemen de sport en de plek in gewone woorden. Niet "Heuvelherhalingen, buiten Primair" maar "Hardlopen, buiten op een heuvel" met daarnaast "Beste keuze".
4. De infoschermondertitels uit `trainingGuide.ts` vervallen. Hun plek wordt ingenomen door dezelfde sportregel, zodat beide schermen hetzelfde zeggen.
5. Elke modaliteit krijgt een vaste `sport` in de data, in plaats van dat `modalitySport` het uit de sleutelnaam raadt. Dan kan StairMaster bij de heuvelintervallen niet meer als hardlopen opgeslagen worden.
6. De lange duurloop houdt één aanrader. Voorstel: "Hardlopen, buiten" als beste keuze, "Wandelen met hoogtemeters" als "Ook goed, telt als wandelen". Zo is het verschil tussen de lange duurloop en de bergtocht ook helder.

---

## Voorstel trainingsscherm

Uitgangspunt: dit scherm beantwoordt één vraag, "wat doe ik nu precies?", en pas daarna "hoe ging het?". Twee delen op één scherm, met een vaste knopbalk onderaan. Zie het linker scherm in `mockup.png`.

Deel 1, Doen (alles wat je vóór en tijdens de training nodig hebt):

1. Bovenbalk: links "‹ Vandaag" (minstens 44 pixels hoog), rechts klein de dag en week: `ZA 10 OKT · WEEK 1, WENNEN`. De eyebrow "SESSIE VOLTOOIEN" verdwijnt.
2. Sportregel (zie hierboven), titel in Marcellus, en één regel waarom in gewone taal. Bijvoorbeeld "Snelheid en hoogtemeters in één training" in plaats van "Snelheid × D+, bergop intervaltraining".
3. Drie kerncijfers als kleine tegels, uit de engine en dus op beide schermen gelijk:
   - Rustige duurloop: `30 min` totaal, `Zone 2` hartslag, `Praten kan` hele zinnen
   - Heuvelintervallen: `35 min` totaal, `5 × 1 min` hard bergop, `RPE 8-9` op de heuvel
   - Lange duurloop: `50 min` totaal, `Zone 2` rustig, `300 m` omhoog als het kan
   - Bergtocht: `2 uur` totaal, `400 m` omhoog en omlaag, `4 kg` rugzak
   - Wandeldag 1 van 2: `2,5 uur` totaal, `400 m` omhoog en omlaag, `8 kg` rugzak
   - Kracht: `75 min` totaal, `7` oefeningen, `RIR 1-3` of "zoals MacroFactor zegt" (zie onder)
   - Herstel: `Rust` of `30-60 min` wandelen, `Geen doel` voor tempo of hartslag
4. "WAAR TRAIN JE?" (alleen als er meer dan één optie is). Een verticale lijst van knoppen van minstens 48 pixels hoog, met de sport erin en een gewoon label rechts: "Beste keuze", "Ook goed", "Andere sport", "Als het niet anders kan", "Later in je plan". De uitleg per optie (waarom, minder geschikt bij) gaat naar het infoscherm. Kiezen past direct de sportregel, de stapnamen en de invulvelden aan.
5. "ZO DOE JE HET": de grafiek en stappen uit `WorkoutSteps`, met daarin:
   - bovenaan een inklapregel "Eerst: 8 opwarmoefeningen" (de huidige StretchList voor de warming-up),
   - de stappen met per stap één intensiteitsregel in vaste volgorde: tempo-woord, zone, RPE, praattest. Bijvoorbeeld "Hard · zone 4-5 · RPE 8-9 · alleen losse woorden",
   - onderaan "Daarna: 4 rekoefeningen".
   Bij herhalingen: de echte tijd van deze week ("1 min"), niet een bandbreedte erachter.
6. "STOP OF SCHAKEL TERUG ALS": twee of drie korte regels uit de gids, alleen de signalen die tijdens de training tellen. Voor de heuvelintervallen: "je techniek rommelig wordt", "je na 2 minuten nog niet hersteld bent". Voor de rustige duurloop: "je geen hele zinnen meer kunt praten". Voor de bergtocht: "je knieën bij het dalen gaan zeuren: kleinere passen, stokken gebruiken".
7. Vaste knopbalk onderaan (safe area): links "INFO" (opent het infoscherm), rechts de hoofdknop "KLAAR, INVULLEN". Die schuift naar deel 2.

Deel 2, Invullen (pas na de training belangrijk, mag onder de vouw):

1. Kop "HOE GING HET?".
2. Velden vooraf ingevuld met het plan, zodat je alleen afwijkingen aanpast: Duur (plan), Rugzak (plan), Stijging met het plan als grijze voorbeeldwaarde. Velden die bij de gekozen manier horen, zoals nu.
3. RPE als tien knoppen (1 tot 10) met het plan gemarkeerd, en het hintje dat klopt: "Het plan: rustig, RPE 3-4." Voor intervallen: "Het plan: hard op de heuvel (RPE 8-9), rustig ertussen."
4. "Iets anders gedaan?" als inklapregel met twee keuzes: "Het voorstel van je Garmin gevolgd" en "Een eigen training". Dit vervangt de knoppen ASCEND/GARMIN/VRIJ bovenaan. Garmin-typen in het Nederlands: Herstel, Basis, Tempo, Drempel, VO2max, Sprint, Lang, Fietsen, Anders. Het oordeel zonder dubbel woord: "Past bij vandaag. Lagere prikkel dan gepland, prima als je moe bent."
5. "Gedaan op" (zoals nu, alleen bij te laat afvinken of een losse training).
6. Notities.
7. De knopbalk wordt nu "ANNULEREN" en "OPSLAAN" (ANNULEREN minstens 96 pixels breed, of als tekstknop met 44 pixels hoogte).

Bij herstel: kies je "Volledige rust", dan verdwijnen Duur, RPE, opwarmen en rekken, en heet de knop "RUSTDAG AFVINKEN". Bij "Herstelwandeling" staat Duur op 30 en is de intensiteitsregel "Heel rustig · geen hartslagdoel".

Bij kracht:

- Met MacroFactor aan: dit scherm wordt niet geopend (zoals nu). Prima.
- Met MacroFactor uit: "ZO DOE JE HET" toont de oefeningen als korte lijst (naam, sets × herhalingen, en het gewicht van vorige keer als dat bekend is). Per oefening een knop "Sets invullen" die de huidige set-invoer openklapt, zodat het scherm geen 2.300 pixels meer is. Core en andere tijdsoefeningen krijgen een tijdveld in plaats van kg en reps.
- De zwaarte staat erbij in gewone taal: "Laatste set: nog 1 tot 3 herhalingen over". Welk getal hier hoort, is een inhoudelijke keuze die eerst met de gebruiker moet worden afgestemd; MacroFactor stuurt dit nu.

## Voorstel infoscherm

Uitgangspunt: het infoscherm beantwoordt "waarom deze training en hoe weet ik of het goed gaat". Wat je doet staat al op het trainingsscherm; het infoscherm toont exact hetzelfde kopblok en dezelfde stappen (inklapbaar), zodat het 1:1 blijft. Zie het rechter scherm in `mockup.png`.

1. Greep bovenaan en een vaste bovenregel met de sportregel links en een sluitknop "×" rechts (44 bij 44 pixels). De losse "Sluiten" onderaan mag blijven als tweede uitweg.
2. Titel en daaronder "Zaterdag · week 1 van 4, wennen".
3. Dezelfde drie kerncijfers als op het trainingsscherm (zelfde component).
4. "WAAROM": twee zinnen uit `builds`, geen labels-in-pillen meer. Bijvoorbeeld: "Een echte snelheidsprikkel met minder schokken dan sprinten op de vlakte. Elke herhaling telt ook als klimtraining voor de GR5."
5. "ZO VOELT ELK TEMPO": alleen de niveaus die deze training gebruikt, elk op één regel: "Rustig · zone 2 · RPE 3-4 · hele zinnen praten". Dit is de plek waar zone, RPE en praattest één keer goed worden uitgelegd.
6. "WAT HET VRAAGT VAN JE LICHAAM": de huidige balken (Benen, Bovenlichaam, Conditie). Rijen met "geen" weglaten.
7. Inklapregels, elk minstens 48 pixels hoog, in deze volgorde:
   - "De stappen, zoals op je trainingsscherm" (`WorkoutSteps`)
   - "Stappen voor je Garmin" (de huidige "IN JE GARMIN")
   - "Deze fase, week voor week" (het huidige weekraster; bij de bergtocht met D+ en rugzak per week)
   - "Te zwaar? Zo pas je het aan" (de huidige secties "WANNEER TE HARD/ZWAAR" met hun notitie)
   - "Waar train je het best?" (de uitleg per modaliteit die nu in de picker zit: waarom, minder geschikt bij)
   - "Waar kun je dit doen?" (link naar Plekken, zoals nu)
   - "Achtergrond en bronnen" (doel, materiaal, de lange uitleg en de bronnen)
8. Weg: de ondertitel uit de gids, de regel "ASCEND: duur, afstand, ...", verwijzingen naar vaste weekdagen, "Maand 1" en "Bergconditie".

Nieuwe gidsen nodig voor Bergtocht en Wandeldag 1 van 2 (en meteen Fietstocht). Minimale inhoud: waarom (GR5: tijd op de benen, dalen, rugzak), "te zwaar?" (knieën bij het dalen, niet meer kunnen praten bergop, honger of dorst), materiaal (rugzak met het gewicht van deze week, water, eten voor elk uur, regenjas, stokken als je die op de GR5 gebruikt), veiligheid in één regel (route en weer checken, iemand laten weten waar je loopt) en bronnen (de NKBV- en PubMed-bronnen die al in `modalities.ts` staan). Voor de wandeldag ook: "Morgen: bergtocht van X uur, Y m omhoog, Z kg", berekend uit de ladder.

### Teksten die je letterlijk kunt overnemen

- Eyebrow trainingsscherm: datum en week, bijvoorbeeld `ZA 10 OKT · WEEK 1, WENNEN`
- Sectiekoppen trainingsscherm: `WAAR TRAIN JE?`, `ZO DOE JE HET`, `STOP OF SCHAKEL TERUG ALS`, `HOE GING HET?`
- Inklapregels: `Eerst: 8 opwarmoefeningen`, `Daarna: 4 rekoefeningen`, `Iets anders gedaan?`
- Knoppen: `KLAAR, INVULLEN`, `OPSLAAN`, `INFO`, `RUSTDAG AFVINKEN`, `Sets invullen`
- Rollen: `Beste keuze`, `Ook goed`, `Andere sport`, `Als het niet anders kan`, `Later in je plan`
- Sportwissel: `Dit telt als fietsen, niet als hardlopen.` en `Dit telt als wandelen.`
- Iets anders gedaan: `Het voorstel van je Garmin gevolgd`, `Een eigen training`, en bij de eigen training `Vul in wat je echt deed.`
- Sectiekoppen infoscherm: `WAAROM`, `ZO VOELT ELK TEMPO`, `WAT HET VRAAGT VAN JE LICHAAM`
- Inklapregels infoscherm: `De stappen, zoals op je trainingsscherm`, `Stappen voor je Garmin`, `Deze fase, week voor week`, `Te zwaar? Zo pas je het aan`, `Waar train je het best?`, `Waar kun je dit doen?`, `Achtergrond en bronnen`
- Herstel zonder doel: `Heel rustig · geen hartslagdoel`
- Hoogtemeters: `400 m omhoog en 400 m omlaag` in plaats van `400 m stijgen en dalen`, getallen met punt (`1.000 m`)

### Bestanden en datavelden

- Nieuw `src/engine/sessionBrief.ts` (puur, testbaar): `buildSessionBrief(template, dateIso, program, modalityKey?)` geeft `{ sport, sportLabel, styleLabel, purpose, weekLabel, facts: { value, label }[], plan, levelsUsed, stopSignals }`. Beide schermen renderen hieruit, zodat ze niet meer uit elkaar kunnen lopen.
- Nieuw `src/components/SessionHeader.tsx`: sportregel, titel, waarom-regel en kerncijfers. Gebruikt door `ExerciseLogger.tsx` en `TrainingGuideSheet.tsx`.
- `src/components/ExerciseLogger.tsx`: herindelen in Doen en Invullen, vaste knopbalk, velden voorinvullen, ASCEND/GARMIN/VRIJ naar "Iets anders gedaan?", RPE-hint repareren, kracht inklapbaar.
- `src/components/ModalityPicker.tsx`: verticale lijst met grote knoppen, nieuwe rollabels, sportwisselregel; de uitleg per optie verhuist naar het infoscherm.
- `src/components/TrainingGuideSheet.tsx`: nieuwe volgorde, vaste sluitknop, inklapregels, nieuw onderdeel voor "Zo voelt elk tempo"; `WorkoutSteps` blijft gedeeld.
- `src/data/modalities.ts`: veld `sport` per modaliteit; optioneel `stepLabels` (loopband: "Snel op helling" en "Helling en tempo omlaag"); `ROLE_LABEL` herschrijven; "Maand 1", "Bergconditie" en "+10%" rechtzetten.
- `src/data/workoutStructure.ts`: per training `styleLabel`, `purpose` (één zin), `stopSignals` (twee of drie regels); herstel zonder zone en RPE-doel; de heuvelstap zonder "30-90 sec".
- `src/engine/workoutPlan.ts`: afronding in- en uitlopen zo dat het totaal klopt; D+-doel van de lange duurloop uit `outdoorTarget`; getallen via `formatNumberNL`; label "D+ en D− met rugzak" weg als de doelen al getoond worden.
- `src/data/trainingGuide.ts`: gidsen voor `tpl_mountain_hike`, `tpl_hike_day_one`, `tpl_bike`; `subtitle` en `registration` niet meer tonen (later verwijderen); vaste weekdagen en vaktaal herschrijven.
- `src/data/defaultProgram.ts`: weeknotities zonder eigen herhalingsaantal (of afgeleid van `repeatsByWeek`), opbouwregel lange duurloop gelijk trekken met de minuten, oefeningnamen in het Nederlands waar dat natuurlijk is, Core als tijd.
- `src/data/garminSuggested.ts`: Nederlandse typen en het oordeel zonder dubbel woord.
- `src/engine/sports.ts`: `sessionStyleLabel(template)` en sport bepalen via het nieuwe `sport`-veld van de modaliteit.

Geen opgeslagen vorm verandert, zolang de sleutels van de modaliteiten gelijk blijven. Er is dus geen migratiestap in `storage/migrations.ts` nodig. Oude logs met StairMaster als hardlopen blijven zoals ze zijn (logs zijn alleen-toevoegen).

---

## Volgorde van uitvoeren

1. Kleine fouten eerst, los van het ontwerp: het RPE-hintje (`ExerciseLogger.tsx` regel 479), de afronding naar 46 min (`engine/workoutPlan.ts`), "4-5 herhalingen" tegenover "5 keer" (`data/defaultProgram.ts`), "1000" zonder punt (`engine/workoutPlan.ts`), "Compatibel. Compatibel" (`data/garminSuggested.ts`), de te smalle ANNULEREN-knop (`ExerciseLogger.tsx`).
2. Inhoud rechtzetten: herstel zonder hartslagdoel, één opbouwregel voor de lange duurloop, "Bergop" zonder "30-90 sec", "Maand 1" en "Bergconditie" weg (`data/workoutStructure.ts`, `data/modalities.ts`, `data/trainingGuide.ts`).
3. Sport per modaliteit vastleggen en StairMaster en fietsen goed laten tellen (`data/modalities.ts`, `engine/sports.ts`), met een test per modaliteit.
4. Gidsen voor Bergtocht, Wandeldag 1 van 2 en Fietstocht toevoegen, zodat de infoknop verschijnt (`data/trainingGuide.ts`).
5. `engine/sessionBrief.ts` met tests bouwen (kerncijfers, sportregel, stopsignalen per sessie en per week).
6. `components/SessionHeader.tsx` maken en bovenaan beide schermen zetten.
7. `components/ModalityPicker.tsx` ombouwen naar de lijst met nieuwe labels en de sportwisselregel.
8. `components/ExerciseLogger.tsx` herindelen in Doen en Invullen, met vaste knopbalk en voorinvulling; ASCEND/GARMIN/VRIJ naar "Iets anders gedaan?".
9. `components/TrainingGuideSheet.tsx` in de nieuwe volgorde zetten, met sluitknop, tempo-uitleg en inklapregels.
10. Krachtpad: inklapbare oefeningen, tijdveld voor Core, zwaarte-regel (na afstemming met de gebruiker).
11. Taalronde over alle teksten in de gidsen en modaliteiten (jargonlijst hierboven).
12. Controleren: `npm run lint`, `npm run build`, en dezelfde schermafbeeldingen opnieuw op 390x844 en 360x740 voor alle negen sessies.
