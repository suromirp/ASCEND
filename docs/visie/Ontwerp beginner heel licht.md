# Ontwerp: de beginner begint heel licht

Status: voorstel van Cartographer, 15 november. Er is geen code gewijzigd.

Aanleiding: backlogpunt H. De profielendoorloop van 14 november (`docs/profielen/2026-11-14-beginner.md` op `claude/profiel-beginner`, bevinding 4 en 5) liet zien dat "de eerste vier weken alleen makkelijk" niet klopt: week 1 heeft 75 minuten kracht met 23 sets en een lange loop van 60 minuten, en het trainingsscherm staat vol vaktaal. De eigenaar koos op 14 november: heel licht (`docs/beslissingen/2026-11-14-keuzes-avond.md`, punt 2).

Gelezen: CLAUDE.md, `docs/werkbriefjes/planning.md`, de besluiten van 31 oktober (richting en weekbudget, beginnersstart) en 14 november, het profielverslag, `docs/visie/Zonder doel.md` (2.7, 3.4), `docs/visie/Ontwerp Info-blad.md`, en uit `docs/onderzoek/`: ASCEND voor iedereen, Doelsoorten duur, Doelsoorten berg en buiten, Trainingsopbouw voor GR5 en hardlopen, Programma, fasen en weekindeling, RIR en RPE in krachtapps, Kracht loggen en progressie, en de notitie kracht_programma. De code: `engine/beginnerStart.ts`, `engine/programLayout.ts`, `engine/waves.ts`, `engine/noGoalWaves.ts`, `engine/firstPlan.ts`, `storage/databaseHorizon.ts`, `data/defaultProgram.ts`, `data/directions.ts`.

## 1. Wat heel licht in getallen is

Het besluit geeft de randen: week 1 kracht 30 tot 40 minuten met de helft van de sets, lopen als wandelen en dribbelen, de langste training 30 minuten, elke week iets meer. Dit ontwerp vult de weken ertussen in. Het voorbeeld is Fit blijven met drie dagen, zoals het profiel.

- Week 1: kracht 35 minuten, 10 sets (5 oefeningen, 2 sets elk). Twee keer wandelen en dribbelen: 20 en 30 minuten, 1 minuut dribbelen en 2 minuten wandelen. Samen 85 minuten.
- Week 2: kracht 45 minuten, 13 sets. Wandelen en dribbelen 25 en 35 minuten, 2 om 2. Samen 105 minuten.
- Week 3: kracht 55 minuten, 17 sets (alle oefeningen van de korte versie, volle sets). Wandelen en dribbelen 30 en 40 minuten, 3 om 2. Samen 125 minuten.
- Week 4: kracht 65 minuten, 20 sets. Lopen 35 en 45 minuten, dribbelen met een wandelpauze als je wilt. Samen 145 minuten.
- Daarna het gewone plan (kracht 75 minuten en 23 sets, lopen 35 en 60), waarbij de lange loop met de bestaande grens van 10% doorgroeit.

Dagen: zoveel als je koos, hoogstens vier (bestaat al, `firstPlan.ts:120`). Geen harde training in deze vier weken (bestaat al). Bij een vierde dag is die dag een Herstelwandeling of een tweede korte kracht, nooit een derde loop.

Het weekbudget volgt deze ladder. De ring op Ascend vraagt in week 1 dus niet 150 minuten maar wat er gepland staat, anders staat de beginner vier weken op rood.

Waar de getallen op rusten, eerlijk gezegd:

- Hoogstens vier dagen en geen harde dag in het begin: `ASCEND voor iedereen.md`, deel 3 (expert).
- Waarom zo voorzichtig met lopen: beginners hebben ongeveer acht keer zoveel blessures per uur als recreatieve lopers (33 tegen 4,2 per 1000 uur, Correia 2024, matig, `Doelsoorten duur.md` regel 51).
- De stap per week bij de lange loop: een loop meer dan 10% boven je langste van de laatste 30 dagen gaf meer blessures (Frandsen 2025, `Programma, fasen en weekindeling`, regel 53). Daarom groeit de lange sessie hier met 5 minuten per week en haalt hij de 60 niet in week 4. Zie keuze 1.
- De helft van de sets: de eerste sets leveren het meest op en ongeveer 2 sets per spier per sessie is voor kracht al het nuttige punt (Pelland en Remmert, notitie `kracht_programma.md` regel 36; Schoenfeld 2017: ook 4 sets per week per spier geeft groei). Kracht houd je vast met één sessie per week (Spiering 2021, matig).
- Lichte gewichten zijn goed genoeg: ongetrainden winnen het meest rond 60% van hun maximum (Rhea 2003, matig, `Doelsoorten berg en buiten.md` regel 326).
- Wandelen en dribbelen: het besluit noemt het "de gangbare start", maar in `docs/onderzoek/` staat er geen bron voor, en ook niet voor de verhoudingen 1 om 2, 2 om 2 en 3 om 2. Die getallen zijn afgeleid. Scout moet dit aanvullen voordat het in `data/` komt (stap 0). De enige houvast in het onderzoek is de instapbasis voor 5 km: 20 minuten aan één stuk kunnen lopen.

## 2. Waar het in de planner zit

Een correctie op de opdracht: de beginnersstart zit niet in `engine/noGoalWaves.ts` of `engine/waves.ts`. `noGoalWaves.ts` regelt alleen het Akkoord op golven (`wavesHeld` regel 23, `withWavesConsent` regel 34). `waves.ts` rekent het budget per week van een golf (`waveMinutes` regel 64) en weet niets van een beginner. De echte plekken:

- `src/engine/beginnerStart.ts`: `BEGINNER_WEEKS = 4` (regel 19), `isBeginnerStart` (regel 29), de belofte "alleen makkelijk" (regel 56).
- `src/engine/programLayout.ts`: de fase Rustig beginnen (`PHASE_GOLF_START`, tekst op regel 63 tot 66), `layoutWaves` (regel 222), `directionFactor` (regel 270; regel 276 houdt een duurtraining in de start hoogstens op de gewone lengte), `flatWaveWeek` (regel 282) en `BEGINNER_SWAPS` (regel 680: alleen de heuvelloop wordt een herstelloop).
- `src/storage/databaseHorizon.ts`: regel 93 en 114 geven de beginnersstart door aan de planning.
- `src/engine/firstPlan.ts`: hoogstens vier dagen (regel 120) en de zin in het eerste voorstel (regel 245).
- `src/data/defaultProgram.ts`: Bovenlichaam A is 75 minuten (regel 54) met 23 sets (regel 64 tot 70); de lange duurloop heeft de ladder 50, 60, 70, 45 (regel 248 tot 251).

Waarom week 1 nu zo zwaar is: de start haalt alleen de heuvelloop weg. Kracht houdt in een golf altijd zijn volle lengte (`directionFactor` slaat kracht over) en Fit blijven leest voor elke week de gewone opbouwweek (`flatWaveWeek` geeft 2), dus de lange loop staat meteen op 60.

Hoe het verandert:

- De ladder komt als gegevens in een nieuw bestand `src/data/beginnerLadder.ts`, elk getal met bewijslabel en bron zoals `data/directions.ts`. Een pure functie in `beginnerStart.ts` geeft per week van de start de minuten, de sets en de verhouding wandelen en dribbelen.
- Een nieuw sjabloon Wandelen en dribbelen (rol rustige loop, type cardio). In de start neemt het de plek van de Rustige duurloop en de Lange duurloop via de bestaande wisselroute: twee regels erbij in `BEGINNER_SWAPS`. Geen nieuwe regel in de weekcontrole.
- Kracht gebruikt wat er al is: de korte versie zonder optionele oefeningen (`engine/substitutions.ts:16`) en een grens op sets langs dezelfde weg als `engine/forgeTimeCap.ts`. De planner controleert of de variant al op de geplande sessie staat; er komt geen nieuwe opgeslagen vorm bij.
- Golven van drie of zes weken maken de start zes weken lang (`beginnerWeeksFor`). De ladder duurt dan nog steeds vier weken; week 5 en 6 zijn het gewone plan zonder harde training.

Waarom golden A en C niet bewegen: alles hangt aan de fase `PHASE_GOLF_START`. Die fase ontstaat alleen in `layoutWaves`, en `layoutPhases` (regel 241) komt daar alleen zonder doel. A en C hebben een doel en krijgen die fase nooit. Daarom ook: geen getal in `defaultProgram.ts` aanpassen. Die sjablonen deelt de beginner met A en C. Een sjabloon erbij mag, een bestaand sjabloon wijzigen niet. Scenario B (nieuw, zonder doel) kan wel bewegen; dat verschil wordt dan regel voor regel verklaard.

## 3. De vaktaal

Uitgangspunt: een gewoon woord waar dat kan, de i waar het woord moet blijven. De tekst `RPE 3-4` in de sjablonen blijft staan, want `engine/weekReview.ts:100` en `engine/coach.ts:23` lezen hem. Alleen wat je ziet verandert, via één functie in `engine/` die de inspanning in woorden geeft.

- Voorschrift (`forge/ExerciseBlock.tsx:301`, `TodayMissionCard.tsx:367`): wordt Plan. Gewoon woord, voor iedereen. De wisselknop is dan Plan of Vorige.
- Herh. (`ExerciseBlock.tsx:307`): blijft in de smalle kolom, voorgelezen als Herhalingen, uitleg achter de i. Voluit past niet op 360 px.
- RIR (`ExerciseBlock.tsx:308`): wordt Over. Het onderzoek noemt het zelf al "herhalingen over". Achter de i: "Over: hoeveel herhalingen je nog had kunnen doen. Een schatting is genoeg. Twijfel je tussen twee, kies de laagste." (`RIR en RPE in krachtapps.md`, regel 156). In de uitleg van instellingen blijft "herhalingen in reserve (RIR)" één keer staan, zodat wie de term kent hem terugvindt.
- RPE (`forge/FinishSheet.tsx:146`, `logForm/LogFormParts.tsx:132`, `StrengthDoneElsewhere.tsx:83`): wordt Zwaarte, zonder haakjes. De uitleg bestaat al (`logForm/formRules.ts:42`) en komt achter de i. "RPE 3-4" op het loopblad en in adviezen wordt "rustig, je kunt hele zinnen praten".
- Zone 2: blijft voor wie een hartslagbron heeft, want zo heet het op het horloge, met de bestaande i. Zonder hartslagbron toont Vandaag "Rustig" met "Praten kan" (`engine/sessionBrief.ts:147` heeft beide al).

Eén blad, niet vijf: in Forge komt naast de kolomkoppen de bestaande `InfoButton` (`components/ui.tsx:117`). Hij opent het blad "Zo lees je dit" met vier korte regels: Plan, Herh., Over en de W van de opwarmset. Het blad gaat door `useSheetClose`, heeft `ref={sheetRef}` en `<SheetGrip />`, en gebruikt `SheetHeader` en `Card` zoals `Zone2InfoSheet.tsx`. De teksten staan als gegevens in `src/data/`. Geen nieuw accent, geen nieuwe opmaak.

In de start staat boven de eerste krachttraining één regel: "Kies een gewicht dat licht voelt. Je moet er nog een paar over hebben." Dat lost het lege kg-veld op zonder een startgewicht te verzinnen.

Instelling (regel: alles instelbaar): Woorden in Forge, met Gewoon (advies) of Vaktaal, één zin uitleg, in `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts` en de groepspagina Forge. Zie keuze 3.

Niet in dit ontwerp: "golf", "beenindex" en de Engelse oefeningsnamen (bevinding 7 en 9). Die horen bij hetzelfde probleem maar zijn eigen backlogpunten.

## 4. Stappenplan

Elke stap is één branch, planner op Opus, review door Warden op Fable. Na elke stap de vier controles en `npm run kaart:vergelijk`.

0. Scout (Fable): bronnen voor wandelen en dribbelen bij beginners en de verhoudingen per week, in `docs/onderzoek/`. Zonder bron blijven de verhoudingen "afgeleid" en staat dat in de gegevens.
1. Gegevens en functie. `data/beginnerLadder.ts` en de pure functie in `beginnerStart.ts`. Tests: elke week hoogstens de week erna; week 1 kracht 30 tot 40 minuten en hoogstens de helft van de sets; geen training langer dan 30 minuten in week 1 behalve kracht. De planning verandert nog niet.
2. Het sjabloon en de wissel. Tests: in `PHASE_GOLF_START` staat geen Rustige of Lange duurloop meer; buiten die fase niets anders. De snapshots A en C van `storage/planGolden.test.ts` blijven byte voor byte gelijk; B verklaard.
3. De duur en de sets in de planning. Tests per richting (Fit blijven, Fitter worden, Sterker worden) en per golflengte (3, 4, 6); twee keer `planPass` achter elkaar geeft hetzelfde; drie openingen achter elkaar (`storage/openingPingpong.test.ts`); een training die je zelf vastzette blijft staan; het weekbudget volgt de ladder.
4. Akkoord en instelling (zie 5). Tests: zonder Akkoord verandert een lopende start niet; Liever niet komt niet terug; een oude back-up importeert zoals hij was.
5. De teksten: de belofte in `beginnerStart.ts:56`, de fasetekst, de regels in het eerste voorstel. Test: wat het voorstel noemt staat daarna ook in Week.
6. De vaktaal: de woorden, het blad, de regel over het gewicht, de instelling. Klein, mag naar een Sherpa op een lichter model. Test: de scan van het Info-blad en de tekstkaart.
7. De poorten: Lookout op 360, 390 en 412 px, Pathfinder voor de dag van een beginner (dezelfde doorloop als 14 november), een screenshot per veranderd scherm, en een besluit in `docs/beslissingen/`.

## 5. Wat met Akkoord moet

- Een nieuwe gebruiker: de ladder staat in het eerste voorstel, dat al Akkoord vraagt. Het voorstel noemt week 1 in getallen ("Kracht 35 minuten, twee keer wandelen en dribbelen: 20 en 30 minuten") en zegt dat het elke week iets meer wordt. De stappen van week 2, 3 en 4 horen bij dat ene Akkoord en vragen niets meer.
- Wie nu al in een beginnersstart zit: zijn geplande trainingen worden korter. Dat is een voorstel op Vandaag, één keer, met één id per start (de startmaandag van de richting, niet de dag van vragen). Liever niet laat alles staan en het komt niet terug.
- Daarvoor een instelling Opbouw van de start in het blad Zonder doel, naast Beginnersstart: Heel licht (advies) of Gewoon. Het veld is optioneel in `AppSettings`; ontbreekt het bij een bestaand plan, dan geldt Gewoon tot het Akkoord, zoals `wavesHeld` dat voor golven doet. De migratie houdt alleen een bekende waarde over. De keuze later veranderen gaat langs het pad van elke planningsinstelling: eerst wat er verandert, dan Akkoord.
- Voelt een week te zwaar, dan is er al "Deze week nog een keer". Dat blijft een voorstel.
- De woorden in Forge en de uitleg veranderen de planning niet en vragen geen Akkoord.

## 6. Drie keuzes

1. De lange sessie haalt in week 4 de 60 minuten niet. Het besluit zegt "het gewone plan in week 4", het onderzoek zegt hoogstens 10% per stap. Advies: de grens wint. De lange sessie gaat 30, 35, 40, 45 en groeit daarna door; de belofte wordt "elke week iets meer" in plaats van "na vier weken gewoon". Anders springt iemand die nooit liep in drie weken van 30 naar 60. Dit wijkt af van de letter van het besluit en is dus aan de eigenaar.
2. Een nieuw sjabloon Wandelen en dribbelen, of de bestaande Herstelloop ("je mag wandelen") gebruiken. Advies: een nieuw sjabloon. De beginner heeft de afwisseling in minuten nodig, niet een loop die wandelen toestaat.
3. De gewone woorden voor iedereen of alleen voor een beginner. Advies: voor iedereen, met de instelling Vaktaal voor wie RIR wil zien. Eén taal in de app is eenvoudiger dan twee soorten gebruikers.

## 7. Niet gecontroleerd

- Of de grens van 110% op je langste loop (`engine/substitutions.ts`) ook voor een sessie wandelen en dribbelen telt, en of hij de ladder van stap 3 nog verder afknijpt.
- Of de korte versie al op een geplande sessie staat of alleen bij het starten gekozen wordt.
- Of scenario B van de golden test een beginner is.
- De verhoudingen wandelen en dribbelen hebben geen bron in de repo.
- Er is niets gebouwd of gedraaid; regelnummers zijn van `origin/claude/nacht` op 15 november.
