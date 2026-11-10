# Datavelden voor je horloge

Onderzoek van Scout, 9 november 2026. Horloge: Garmin Forerunner 255 (ook 255S en de Music-versies). Doel: een datalijst en een adviesfunctie waar een bouwer direct mee verder kan. Het ontwerp staat in `docs/ontwerp/datavelden-horloge.md`; dit verslag levert de feiten daaronder en corrigeert twee aannames uit dat ontwerp.

Elke bewering heeft een label. **Bevestigd**: staat in de handleiding van Garmin en is daar gelezen. **Gemeld**: komt van een recensent of een forumgebruiker, niet van Garmin. **Eigen afleiding**: mijn redenering, niet gelezen. De bronnen staan met een korte naam in de tekst en voluit onderaan.

Een eerlijke kanttekening vooraf: de pagina's van Garmin zijn gelezen via een hulpmiddel dat de pagina samenvat. De veldnamen en menunamen zijn als losse termen overgenomen, maar ik heb de pagina's niet zelf letter voor letter gezien. Steekproef op het horloge blijft nodig (zie "Wat nog onzeker is" in hoofdstuk 7).

## 1. In het kort

1. De Forerunner 255 kent meer dan vier velden per scherm. Twee recensenten noemen zes als maximum. De opdracht en het ontwerp gaan uit van 1 tot 4. Dat kan zo blijven als keuze van ASCEND (grote cijfers), maar het is geen grens van het horloge.
2. Hoe de velden precies op het ronde scherm liggen, staat nergens in de handleiding. Dat bleef onbevestigd en vraagt twee minuten kijken op het horloge.
3. De lijst hieronder telt 126 velden die bij lopen, trailrun, wandelen en hiken tellen, in 14 groepen, met Engelse en Nederlandse naam en een id.
4. Instellen kan op het horloge (bevestigd) en in Garmin Connect (bevestigd dat het bestaat; het pad is gemeld; er zijn oude meldingen van haperingen op Android).
5. Vanzelf naar het horloge sturen kan niet. De gebruiker zet de velden zelf.

## 2. Indelingen

**Wat de handleiding zegt.** Bij een gegevensscherm kies je Indeling om het aantal gegevensvelden op het scherm te wijzigen, en Gegevensvelden om per veld te kiezen wat het toont. Met Voeg nieuw toe maak je een eigen gegevensscherm of kies je een vooraf gedefinieerd scherm. Bevestigd ([handleiding, Gegevensschermen aanpassen](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/NL-NL/GUID-638CD68D-11B0-4D9C-B8B7-E28D15EC4566.html)). De handleiding noemt geen maximum aantal velden, geen lijst van indelingen en geen maximum aantal schermen. Bevestigd dat het er niet staat, in de Engelse, de Nederlandse en de Aziatische versie van die pagina.

**Hoeveel velden per scherm.** Tot zes eigen velden per gegevensscherm. Gemeld ([DC Rainmaker, recensie Forerunner 255](https://www.dcrainmaker.com/2022/06/garmin-forerunner-multisport.html); [Cycling Weekly via Yahoo, 30 mei 2023](https://www.yahoo.com/lifestyle/garmin-forerunner-255-review-no-110238955.html): "maximaal zes per scherm"). Een forumgebruiker heeft er vijf in gebruik en zegt dat de 245 er maar vier kon ([Garmin-forum, 255s data fields count](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/296065/255s-data-fields-count), ruim 4 jaar oud). Gemeld. Dit is hoe zeker: twee onafhankelijke recensenten en een gebruiker zeggen hetzelfde, Garmin zelf zegt niets. Ik reken erop dat 1 tot en met 6 klopt.

**Hoeveel indelingen.** Een forumgebruiker die de 255 naast de 165 legde, zegt dat de 255 acht indelingen heeft en de 165 vijf, en dat de 255 drie varianten kent voor drie velden, waaronder een "T-vorm". Gemeld ([Garmin-forum, lack of data field layout options](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-165-series/369316/lack-of-data-field-layout-options), ruim 2 jaar oud). Een andere gebruiker noemt zijn indeling met drie velden "in de hoogte gestapeld" ([Garmin-forum, FW 14.13](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/322223/fw-14-13---reduced-font-size-in-2--and-3-field-data-screens)). Gemeld.

Eigen afleiding: acht indelingen past precies bij een indeling voor 1, 2, 4, 5 en 6 velden en drie voor 3 velden (1 + 1 + 3 + 1 + 1 + 1 = 8). De drie varianten bij drie velden zijn dan waarschijnlijk: drie rijen onder elkaar, één boven met twee onder (de T-vorm), en twee boven met één onder. Dat is een gok op basis van één forumbericht.

**Hoe de velden liggen.** Onbevestigd. Geen bron beschrijft de ligging bij 2, 4, 5 of 6 velden. Van oudere Forerunners is bekend dat 4 velden liggen als één boven, twee in het midden, één onder, en 2 velden als twee helften boven elkaar. Eigen afleiding uit eerdere modellen, niet gelezen voor de 255. Het ontwerp gebruikt precies die ligging; dat is redelijk, maar niet bewezen.

**Lettergrootte.** Na firmware 14.08 tot 14.13 waren de cijfers in sommige indelingen met 2 en 3 velden kleiner dan in die met 4; Garmin meldde daarna een herstel in een nieuwe versie. Gemeld ([Garmin-forum, FW 14.13](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/322223/fw-14-13---reduced-font-size-in-2--and-3-field-data-screens), ruim 3 jaar oud). Wat het betekent: "minder velden is groter" klopt in principe, maar hoeveel groter hangt van de firmware af. De tekening in de app is een schets, geen kopie van het scherm.

**Hoeveel eigen schermen.** Geen praktische grens. Gemeld ([DC Rainmaker](https://www.dcrainmaker.com/2022/06/garmin-forerunner-multisport.html)). De handleiding noemt geen getal. Het ontwerp houdt 5 pagina's per versie aan; dat is een keuze van ASCEND en botst nergens mee.

**Vooraf gedefinieerde schermen.** Naast eigen schermen bestaan er kant-en-klare schermen, zoals meters voor hartslag en vermogen (gemeld, DC Rainmaker) en de kaart (bevestigd: de handleiding heeft een pagina [Een kaart toevoegen aan een activiteit](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-A877CC78-A0E1-4836-84E2-6A7366C8F705_2.html); de inhoud van die pagina heb ik niet gelezen). De volledige lijst van kant-en-klare schermen is onbevestigd.

**Per activiteit apart.** Elke activiteit (Hardlopen, Trailrun, Wandelen, Hiken) heeft zijn eigen gegevensschermen; je stelt ze per activiteit in. Bevestigd ([handleiding, Instellingen van activiteiten en apps](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/NL-NL/GUID-BB0CF463-4070-4FA9-8612-82751F82E316.html)). Je kunt ook een eigen activiteit maken als kopie van een bestaande ([handleiding, Customizing Activities and Apps](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-25FA2988-33F2-4FC9-92FA-E457CBDB9E72.html)). Bevestigd. Dat is handig voor de app: "Heuvels" kan een kopie van Hardlopen zijn met eigen schermen, zodat je niet steeds wisselt.

## 3. De velden

Bron voor alle namen: de pagina Data Fields in de handleiding, Engels ([EN](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-73BCE454-042E-420D-96A4-9DBA46626CD4.html)) en Nederlands ([NL](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/NL-NL/GUID-73BCE454-042E-420D-96A4-9DBA46626CD4.html)). Bevestigd dat de velden in de handleiding staan. De handleiding zegt er zelf bij: niet elk veld bestaat bij elke activiteit, en sommige velden vragen een accessoire. Bevestigd. Welke velden bij welke activiteit ontbreken staat er niet; dat is onbevestigd.

Vorm per regel: `id`: Engelse naam, Nederlandse naam. Daarna wat het is en wat het vraagt. De Nederlandse namen komen uit de Nederlandse handleiding; het menu op het horloge kan een naam afkorten.

De groepen volgen Garmin. Eén afwijking: de Nederlandse handleiding noemt de groep met hoogte en stijging per ongeluk ook "Afstandsvelden" (de kop staat er twee keer). Ik noem die groep Hoogte. Eigen vertaling van de kop.

### Timer (Timervelden)

- `timer`: Timer, Timer. De tijd van de activiteit, zonder pauzes.
- `elapsedTime`: Elapsed Time, Verstreken tijd. Alle tijd sinds de start, pauzes meegeteld.
- `movingTime`: Moving Time, Tijd bewogen. Alleen de tijd dat je bewoog.
- `stoppedTime`: Stopped Time, Tijd gestopt. Alleen de tijd dat je stilstond.
- `lapTime`: Lap Time, Rondetijd. De tijd van de ronde waar je in zit.
- `lastLapTime`: Last Lap Time, Laatste rondetijd.
- `averageLapTime`: Average Lap Time, Gemiddelde rondetijd.
- `intervalTime`: Interval Time, Intervaltijd. De tijd van het lopende interval. Alleen zinvol in een intervaltraining.
- `estimatedFinishTime`: Estimated Finish Time, Geschatte finishtijd. Vraagt een doel of route (eigen afleiding).
- `overallAheadBehind`: Overall Ahead/Behind, Totaal voor/achter. Voor of achter op een doeltempo. Vraagt een doeltempo (eigen afleiding).

### Afstand (Afstandsvelden)

- `distance`: Distance, Afstand.
- `lapDistance`: Lap Distance, Rondeafstand.
- `lastLapDistance`: Last Lap Distance, Laatste rondeafstand.
- `intervalDistance`: Interval Distance, Intervalafstand. Alleen zinvol in een intervaltraining.

### Tempo (Tempovelden)

- `pace`: Pace, Tempo. Het tempo van dit moment.
- `averagePace`: Average Pace, Gemiddeld tempo.
- `lapPace`: Lap Pace, Rondetempo. Het gemiddelde van de ronde waar je in zit.
- `lastLapPace`: Last Lap Pace, Laatste rondetempo.
- `intervalPace`: Interval Pace, Intervaltempo.
- `gradeAdjustedPace`: Grade Adjusted Pace, Voor helling gecorrigeerd tempo. Tempo omgerekend naar vlak.

### Snelheid (Snelheidsvelden)

- `speed`: Speed, Snelheid.
- `averageSpeed`: Average Speed, Gemiddelde snelheid.
- `averageMovingSpeed`: Average Moving Speed, Gemiddelde bewogen snelheid. Zonder de pauzes.
- `averageOverallSpeed`: Average Overall Speed, Gemiddelde totale snelheid. Met de pauzes.
- `lapSpeed`: Lap Speed, Rondesnelheid.
- `lastLapSpeed`: Last Lap Speed, Laatste rondesnelheid.
- `maxSpeed`: Maximum Speed, Maximumsnelheid.
- `verticalSpeed`: Vertical Speed, Verticale snelheid. Hoe snel je stijgt of daalt.

### Hartslag (Hartslagvelden)

Alles in deze groep werkt met de sensor aan de pols; een borstband mag, hoeft niet. Bevestigd (handleiding, Data Fields).

- `heartRate`: Heart Rate, Hartslag. Slagen per minuut.
- `hrZone`: Heart Rate Zone, Hartslagzone. Zone 1 tot 5.
- `averageHeartRate`: Average Heart Rate, Gemiddelde hartslag.
- `hrPercentMax`: Heart Rate %Max., Hartslag %max.
- `hrPercentReserve`: % Heart Rate Reserve, % hartslagreserve.
- `averageHrPercentMax`: Average Heart Rate %Max., Gemiddelde hartslag %max.
- `averageHrPercentReserve`: Average % Heart Rate Reserve, Gemiddeld % hartslagreserve.
- `lapHeartRate`: Lap Heart Rate, Ronde hartslag.
- `lapHrPercentMax`: Lap Heart Rate %Max., Ronde hartslag %max.
- `lapHrPercentReserve`: Lap % Heart Rate Reserve, Ronde % hartslagreserve.
- `lastLapHeartRate`: Last Lap Heart Rate, Laatste ronde hartslag.
- `lastLapHrPercentMax`: Last Lap Heart Rate %Max., Laatste ronde hartslag %max.
- `lastLapHrPercentReserve`: Last Lap %HRR, %HSR laatste ronde.
- `timeInZone`: Time in Zone, Tijd in zone. Tijd per hartslagzone.
- `aerobicTrainingEffect`: Aerobic Training Effect, Aeroob trainingseffect.
- `anaerobicTrainingEffect`: Anaerobic Training Effect, Anaeroob trainingseffect.

### Cadans (Cadansvelden)

Bij lopen: stappen per minuut, beide voeten samen, gemeten aan de pols. Bevestigd.

- `cadence`: Cadence, Cadans.
- `averageCadence`: Average Cadence, Gemiddelde cadans.
- `lapCadence`: Lap Cadence, Rondecadans.
- `lastLapCadence`: Last Lap Cadence, Cadans laatste ronde.

### Hoogte (in de Nederlandse handleiding: tweede blok Afstandsvelden)

De 255 heeft een barometrische hoogtemeter, dus hoogte komt niet alleen uit GPS. Gemeld ([DC Rainmaker](https://www.dcrainmaker.com/2022/06/garmin-forerunner-multisport.html)).

- `elevation`: Elevation, Hoogte. Hoogte boven zeeniveau.
- `gpsElevation`: GPS Elevation, GPS-hoogte.
- `totalAscent`: Total Ascent, Totale stijging.
- `totalDescent`: Total Descent, Totale daling.
- `lapAscent`: Lap Ascent, Stijging ronde.
- `lapDescent`: Lap Descent, Daling ronde.
- `lastLapAscent`: Last Lap Ascent, Stijging laatste ronde.
- `lastLapDescent`: Last Lap Descent, Daling laatste ronde.
- `grade`: Grade, Gradiënt. Helling in procenten.
- `averageAscent`: Average Ascent, Gemiddelde stijging.
- `averageDescent`: Average Descent, Gemiddelde daling.
- `maxAscent`: Maximum Ascent, Maximum stijging. Hoogste stijgsnelheid.
- `maxDescent`: Maximum Descent, Maximum daling.
- `maxElevation`: Maximum Elevation, Maximale hoogte.
- `minElevation`: Minimum Elevation, Minimale hoogte.

### Vermogen (Vermogensvelden)

Loopvermogen komt sinds december 2022 uit de pols, zonder extra sensor. Gemeld ([DC Rainmaker](https://www.dcrainmaker.com/2022/06/garmin-forerunner-multisport.html)). De activiteitinstelling Running Power bestaat. Bevestigd ([handleiding, Activities and App Settings](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-BB0CF463-4070-4FA9-8612-82751F82E316.html)). Of deze velden ook bij Wandelen en Hiken bestaan: onbevestigd, vermoedelijk niet.

- `power`: Power, Vermogen. Watt, nu.
- `averagePower`: Average Power, Gemiddeld vermogen.
- `lapPower`: Lap Power, Vermogen ronde.
- `lastLapPower`: Last Lap Power, Vermogen laatste ronde.
- `maxPower`: Maximum Power, Maximum vermogen.
- `powerZone`: Power Zone, Vermogenszone.

### Loopdynamiek (Hardloopdynamiek)

Cadans, staplengte, verticale oscillatie, verticale ratio en grondcontacttijd meet het horloge zelf aan de pols. Alleen de balans van de grondcontacttijd vraagt een accessoire dat de romp meet (HRM-Pro, HRM 600, HRM-Fit of een losse loopdynamiek-pod). Grondcontact wordt bij wandelen niet berekend. Bevestigd ([handleiding, Running Dynamics](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-62A09512-518A-424A-8491-FE2B80CD2091.html)). Een gebruiker meldde dat een deel van deze waarden bij hem leeg bleef ([Garmin-forum, running dynamics](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/340842/running-dynamics)); niet gelezen, alleen via zoekresultaat. Gemeld.

- `groundContactTime`: Ground Contact Time, Grondcontacttijd.
- `averageGroundContactTime`: Average Ground Contact Time, Gemiddelde grondcontacttijd.
- `lapGroundContactTime`: Lap Ground Contact Time, Ronde-grondcontacttijd.
- `strideLength`: Stride Length, Staplengte.
- `averageStrideLength`: Average Stride Length, Gemiddelde staplengte.
- `lapStrideLength`: Lap Stride Length, Ronde staplengte.
- `verticalOscillation`: Vertical Oscillation, Verticale oscillatie.
- `averageVerticalOscillation`: Average Vertical Oscillation, Gemiddelde verticale oscillatie.
- `lapVerticalOscillation`: Lap Vertical Oscillation, Ronde verticale oscillatie.
- `verticalRatio`: Vertical Ratio, Verticale ratio.
- `averageVerticalRatio`: Average Vertical Ratio, Gemiddelde verticale ratio.
- `lapVerticalRatio`: Lap Vertical Ratio, Ronde verticale ratio.
- `gctBalance`: GCT Balance, Balans grondcontacttijd. Vraagt HRM-Pro of pod.
- `averageGctBalance`: Average GCT Balance, Gem. balans grondcontacttijd. Vraagt HRM-Pro of pod.
- `lapGctBalance`: Lap GCT Balance, Ronde balans grondcontacttijd. Vraagt HRM-Pro of pod.

### Workout (Workout-velden)

Alleen zinvol als je een gestuurde workout volgt.

- `stepDuration`: Step Duration, Stapduur. Wat er nog rest van deze stap, in tijd of afstand.
- `stepTime`: Step Time, Staptijd. Hoe lang je in deze stap zit.
- `stepPace`: Step Pace, Staptempo.
- `stepSpeed`: Step Speed, Stapsnelheid.
- `repsToGo`: Reps to Go, Herhalingen te gaan.

### Kompas (Kompasvelden)

- `heading`: Heading, Richting.
- `compassHeading`: Compass Heading, Kompaskoers.
- `gpsHeading`: GPS Heading, GPS-koers.

### Temperatuur (Temperatuurvelden)

De sensor in het horloge wordt warmer door je pols; een losse tempe-sensor meet beter maar is niet verplicht. Bevestigd (handleiding, Data Fields).

- `temperature`: Temperature, Temperatuur.
- `temp24hMax`: 24-Hour Maximum, 24-uur maximum.
- `temp24hMin`: 24-Hour Minimum, 24-uur minimum.

### Overig (Overige velden)

- `timeOfDay`: Time of Day, Tijd. De klok.
- `timeOfDaySeconds`: Time of Day (Seconds), Tijdstip (seconden).
- `sunrise`: Sunrise, Zon op. Uit je GPS-positie.
- `sunset`: Sunset, Zon onder. Uit je GPS-positie.
- `batteryLevel`: Battery Level, Batterijniveau.
- `gps`: GPS, GPS. Sterkte van het signaal.
- `laps`: Laps, Ronden. Aantal ronden.
- `steps`: Steps, Stappen.
- `activeCalories`: Active Calories, Actieve calorieën.
- `totalCalories`: Total Calories, Totaal calorieën.
- `performanceCondition`: Performance Condition, Prestatieconditie.
- `respirationRate`: Respiration Rate, Ademhalingsritme. Of dit tijdens lopen zonder borstband werkt: onbevestigd.
- `stress`: Stress, Stress.
- `load`: Load, Last. Trainingsbelasting van deze activiteit.
- `barometricPressure`: Barometric Pressure, Barometerdruk.
- `ambientPressure`: Ambient Pressure, Omgevingsluchtdruk.

### Meters en grafieken (Grafisch en Grafieken)

Dit zijn velden met een balk, boog of lijn in plaats van een getal. In welke plek van welke indeling ze passen is onbevestigd; reken erop dat ze meer ruimte vragen dan een getal (eigen afleiding).

- `heartRateGauge`: Heart Rate Gauge, Hartslagmeter. Kleur per zone.
- `cadenceGauge`: Cadence Gauge, Cadansmeter (eigen vertaling; de Nederlandse handleiding heeft hier zichtbaar een foute naam staan). Alleen hardlopen.
- `totalAscentDescentGauge`: Total Ascent/Descent Gauge, Meter voor totale stijging/daling.
- `trainingEffectGauge`: Training Effect Gauge, Trainingseffectmeter.
- `powerGauge`: Power Gauge, Vermogensmeter.
- `groundContactTimeGauge`: Ground Contact Time Gauge, Grondcontacttijd-meter.
- `verticalOscillationGauge`: Vertical Oscillation Gauge, Meter voor verticale oscillatie.
- `verticalRatioGauge`: Vertical Ratio Gauge, Verticale ratio-meter.
- `gctBalanceGauge`: GCT Balance Gauge, Balans GCT-meter. Vraagt HRM-Pro of pod.
- `heartRateChart`: Heart Rate Chart, Hartslaggrafiek.
- `paceChart`: Pace Chart, Tempografiek.
- `elevationChart`: Elevation Chart, Hoogtegrafiek.
- `barometerChart`: Barometer Chart, Barometergrafiek.
- `powerChart`: Power Chart, Vermogensgrafiek.
- `speedChart`: Speed Chart, Snelheidsgrafiek.

### Wat ik wegliet

Uit dezelfde pagina, bewust niet in de lijst: fietsvelden (fietscadans, eBike, 3s en 30s vermogen, arbeid), zwemmen (banen, slagen, Swolf, rustvelden, zwemintervallen met hartslag), roeien (tempo per 500 m), varen (nautische afstand en snelheid), klimmen en yoga (oefening, houding, "Laatste oefen" en dergelijke), kracht (herhalingen, set timer, ronden van springtouw), skiën (runs, glijhoek), multisport, verdiepingen (trappen), en de zes PacePro-velden (split afstand, split tempo, doeltempo). PacePro is wel een loopfunctie, maar vraagt een vooraf gemaakt wedstrijdplan; voeg de zes toe als ASCEND ooit een wedstrijdpagina adviseert.

RPE is geen dataveld. De kaart `GARMIN_DATA_SCREENS` in `src/data/garminGuide.ts` noemt "RPE" in het rijtje velden voor bergop wandelen buiten; dat klopt niet. Garmin kent wel de activiteitinstelling Self Evaluation, die na afloop naar je inspanning vraagt. Bevestigd ([handleiding, Activities and App Settings](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-BB0CF463-4070-4FA9-8612-82751F82E316.html)).

## 4. Zo stel je het in

**Op het horloge.** Bevestigd, met de Nederlandse menunamen ([handleiding, Gegevensschermen aanpassen](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/NL-NL/GUID-638CD68D-11B0-4D9C-B8B7-E28D15EC4566.html)):

1. Houd UP ingedrukt.
2. Kies Activiteiten en apps.
3. Kies de activiteit, bijvoorbeeld Hardlopen.
4. Kies de activiteitinstellingen.
5. Kies Gegevensschermen.
6. Kies het scherm dat je wilt aanpassen.
7. Kies Indeling (aantal velden), Gegevensvelden (wat een veld toont), Sorteer (plek in de rij) of Verwijder.
8. Kies Voeg nieuw toe voor een extra scherm.

**In Garmin Connect.** Het kan. De handleiding zegt bij de veldenlijst dat je de gegevensvelden ook kunt aanpassen via de instellingen van het horloge in de Garmin Connect-app. Bevestigd ([handleiding, Data Fields](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/NL-NL/GUID-73BCE454-042E-420D-96A4-9DBA46626CD4.html)). DC Rainmaker noemt het volledige instellen vanaf de telefoon nieuw bij dit model; alleen externe sensoren koppel je op het horloge. Gemeld ([DC Rainmaker](https://www.dcrainmaker.com/2022/06/garmin-forerunner-multisport.html)).

Het pad dat de eigenaar noemt (Garmin Connect, Toestel, Activiteiten en apps, Hardlopen, Gegevensschermen) komt overeen met wat een forumgebruiker in het Engels beschrijft: tik op je toestel, Activities and Apps, de activiteit, Data Screens. Gemeld (via zoekresultaat bij het Garmin-forum; de precieze draad heb ik niet kunnen aanwijzen). De Nederlandse woorden in de app zelf heb ik nergens gelezen: het pad van de eigenaar is de beste bron en geldt als gemeld, niet bevestigd.

**Haperingen.** Op Android zijn meldingen dat sommige velden niet te kiezen waren, dat eigen schermen wel te maken maar niet te bewerken waren, en dat een wijziging niet werd bewaard. Gemeld, 2 tot 3 jaar oud, zonder antwoord van Garmin ([draad 337631](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/337631/cannot-edit-data-field-in-activities-data-screen-on-android), [draad 379308](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/379308/garmin-forerunner-255---connect-app-won-t-let-me-customize-activity-data-screen-layouts), [draad 321639](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/321639/partial-solution---data-screens-configuration-via-android-app)). Of dit in 2026 nog speelt is onbekend. Voorstel voor de tekst in de app: het horloge als eerste pad, Connect als tweede, met één regel "Bewaart Connect het niet, doe het dan op het horloge."

## 5. Welk veld groot, per soort

Wat hier "groot" heet: het veld waar je op stuurt. In de data is dat het veld met `main`. De bouwer zet het op de grootste plek van de indeling; welke plek dat op het echte horloge is, is onbevestigd (hoofdstuk 2).

Alle voorstellen blijven bij hoogstens 4 velden per pagina. Het horloge kan er 6, maar tijdens het lopen lees je er 3 of 4. Praktijkadvies, geen onderzoek: DC Rainmaker gebruikt zelf pagina's met 4, 2 en 1 veld ([How I configure my watches](https://www.dcrainmaker.com/2016/03/configure-watches-datafields.html)).

Twee regels die overal terugkomen:

- **Rondetempo boven momenteel tempo.** Het tempo van dit moment springt door GPS-ruis; het rondetempo is afstand gedeeld door tijd en is rustiger. Nadeel: de eerste 100 tot 200 meter van een ronde zegt het nog weinig. Praktijkadvies, geen onderzoek ([DC Rainmaker, The art of pacing](https://dcrainmaker.com/2011/03/art-of-pacing-with-garmin.html); forumervaringen). In gewone woorden: kijk naar het gemiddelde van het stuk waar je in zit, niet naar het getal dat elke seconde verspringt.
- **Hartslag als getal van nu, niet als gemiddelde.** Praktijkadvies (DC Rainmaker, zelfde stuk). Bij korte blokken loopt de hartslag achter en is tijd of tempo het betere stuur; dat staat al in `docs/visie/Trainingswetenschap.md` (knelpunt 2, bewijs: expert en matig).

### a. Zone 2, rustige duurloop

Sturen op hartslag. De reden staat al in eigen onderzoek: rustige loopjes gaan snel te hard (`docs/visie/Trainingswetenschap.md`, "Je rustige loopjes waren te hard") en tempo zegt bij zone 2 minder dan hartslag (`docs/onderzoek/Tempo bij zone 2, stabiele stukken.md`). Welke velden daarbij op het scherm horen is praktijkadvies, geen onderzoek.

- Pagina 1, 3 velden: `heartRate` (groot), `hrZone`, `timer`. "Hartslag groot, want daar stuur je op."
- Pagina 2, 3 velden: `distance` (groot), `lapPace`, `averagePace`. "Tempo staat hier, zodat het je op pagina 1 niet opjaagt."
- Pagina 3, 2 velden: `cadence` (groot), `timeOfDay`. "Cadans apart, voor als je op je pas wilt letten."

### b. Heuvels (heuvelherhalingen, bergop)

Tempo zegt bergop weinig. Verticale snelheid (meters stijgen per uur) is alleen een goed stuur op een gelijkmatige helling; verandert de helling, dan verandert het getal mee. Gemeld, praktijkadvies van coaches en gebruikers ([Uphill Athlete, forum](https://uphillathlete.com/?p=39070); [Suunto, hill training](https://us.suunto.com/blogs/blog/boost-your-hill-training-with-suuntoplus-climb)). Bij herhalingen druk je per klim op de rondeknop; dan krijg je per klim tijd en hoogtemeters. Praktijkadvies, geen onderzoek.

- Pagina 1, 3 velden: `heartRate` (groot), `lapTime`, `lapAscent`. "Hartslag groot, want tempo zegt bergop weinig."
- Pagina 2, 3 velden: `totalAscent` (groot), `verticalSpeed`, `grade`. "Totale stijging groot, want die telt hier, niet de kilometers."
- Pagina 3, 3 velden: `laps` (groot), `lastLapTime`, `timer`. "Ronden groot, zodat je weet hoeveel klimmen je hebt gehad."

### c. Intervallen

Sturen op de tijd en het tempo van het blok; hartslag alleen ter controle, want die loopt achter (`docs/visie/Trainingswetenschap.md`, knelpunt 2). De indeling van pagina 1 is die van DC Rainmaker voor intervallen: rondetijd, rondeafstand, rondetempo, hartslag ([How I configure my watches](https://www.dcrainmaker.com/2016/03/configure-watches-datafields.html)). Praktijkadvies, geen onderzoek.

- Pagina 1, 4 velden: `lapTime` (groot), `lapPace`, `lapDistance`, `heartRate`. "Rondetijd groot, want een blok duurt een vaste tijd."
- Pagina 2, 3 velden: `lastLapPace` (groot), `lastLapTime`, `laps`. "Je laatste blok, om in de rust te lezen wat je liep."
- Pagina 3, 3 velden: `timer` (groot), `distance`, `averageHeartRate`. "Het geheel, voor het uitlopen."

Let op: dit werkt als je zelf op de rondeknop drukt per blok. Volg je een gestuurde workout van Garmin, dan zet het horloge er een eigen workoutscherm voor; welke velden daarop staan en of je ze kunt wijzigen is onbevestigd (er is een draad over, [Data fields on workout screen](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/360955/data-fields-on-workout-screen), niet gelezen).

### d. Lange duurloop

Hartslag blijft het stuur, met rondetempo erbij om een te snelle start te zien. Hartslagdrift (de hartslag die oploopt bij gelijk tempo) is de maat die ASCEND na afloop al gebruikt (`docs/onderzoek/Loopgegevens en vooruitgang.md`, lange dagen). Tijdens het lopen is een oplopende hartslag bij gelijk rondetempo hetzelfde signaal in het klein. Eigen afleiding uit dat rapport. De tweede pagina met totalen volgt DC Rainmaker. Praktijkadvies.

- Pagina 1, 3 velden: `heartRate` (groot), `lapPace`, `distance`. "Hartslag groot, want die loopt op als je te hard begint."
- Pagina 2, 3 velden: `timer` (groot), `averagePace`, `averageHeartRate`. "Tijd groot, want de lange loop telt in minuten."
- Pagina 3, 2 velden: `timeOfDay` (groot), `totalAscent`. "De klok, zodat je weet wanneer je moet eten en keren."

Zet Auto Lap op 1 km, dan is het rondetempo steeds het tempo van de lopende kilometer. Auto Lap bestaat als instelling (Laps). Bevestigd ([handleiding, Activities and App Settings](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-BB0CF463-4070-4FA9-8612-82751F82E316.html)).

### e. Tocht met rugzak (wandelen, hiken, meerdaags)

Gebruik de activiteit Hiken of Wandelen, niet Hardlopen. Beide bestaan op de 255. Gemeld ([DC Rainmaker](https://www.dcrainmaker.com/2022/06/garmin-forerunner-multisport.html)). Of Hiken andere velden aanbiedt dan Hardlopen is onbevestigd; de handleiding zegt alleen dat niet elk veld bij elke activiteit bestaat. Wat ik verwacht (eigen afleiding): loopdynamiek, loopvermogen en de cadansmeter ontbreken of blijven leeg, want grondcontact wordt bij wandelen niet berekend (bevestigd, hoofdstuk 3). De velden voor hoogte, klok, zon en batterij zijn algemeen en zullen er zijn.

Op een tocht bepalen hoogtemeters en daglicht je dag meer dan kilometers. Dat hoogtemeters apart tellen is een oude praktijkregel uit de bergsport (de regel van Naismith: reken extra tijd per 600 meter stijgen); niet opnieuw nagelezen voor dit verslag. Praktijkadvies, geen onderzoek. Dat de rugzak de hartslag bergop opdrijft volgt uit de energiekost die met de totale massa meegroeit (`docs/visie/Trainingswetenschap.md`, knelpunt 6).

- Pagina 1, 4 velden: `totalAscent` (groot), `distance`, `timer`, `timeOfDay`. "Totale stijging groot, want hoogtemeters bepalen je dag."
- Pagina 2, 4 velden: `heartRate` (groot), `verticalSpeed`, `elevation`, `totalDescent`. "Hartslag groot, want met een rugzak bergop loopt hij snel op."
- Pagina 3, 3 velden: `sunset` (groot), `timeOfDay`, `batteryLevel`. "Zon onder groot, want daarvoor wil je er zijn."

Bij een meerdaagse tocht telt de batterij: Garmin geeft tot 30 uur met alleen GPS op de 255 en 26 uur op de 255S. Gemeld ([DC Rainmaker](https://www.dcrainmaker.com/2022/06/garmin-forerunner-multisport.html)). In gewone woorden: drie lange dagen opnemen zonder laden haalt hij niet.

De bestaande notitie over de loopband (Garmin weet de helling niet, dus Totale stijging klopt binnen niet) blijft gelden en hoort bij heuvels en tocht.

## 6. Wat niet kan

**Vanzelf naar het horloge sturen.** Niet gevonden en niet te verwachten. Bij Garmin zet de gebruiker de inhoud van de pagina's zelf; een Connect IQ-dataveld is een eigen appje dat de gebruiker als één veld op een pagina zet en dat alleen binnen zijn eigen vak tekent. Bevestigd voor dat principe ([Garmin, richtlijnen voor datavelden](https://developer.garmin.com/connect-iq/user-experience-guidelines/data-fields)). Een functie waarmee een andere app de ingebouwde gegevensschermen instelt, kwam ik nergens tegen. Eigen afleiding: het ontbreken van zo'n functie is niet te bewijzen, alleen niet gevonden. Gebruikers melden daarbij een grens van twee Connect IQ-velden per activiteit. Gemeld. Gevolg: ASCEND toont wat je instelt en jij zet het erop. Zonder backend en zonder Connect IQ-app is er geen andere weg.

**Verschillen tussen de modellen.**

- 255 en 255S: het scherm van de 255 is 1,3 inch met 260 bij 260 punten, dat van de 255S 1,1 inch met 218 bij 218. Gemeld ([GPS Central, vergelijking](https://www.gpscentral.ca/compare-gps-garmin-forerunner/)). Er is één handleiding voor de hele serie en die maakt bij velden en indelingen geen onderscheid. Bevestigd dat het één handleiding is; dat de 255S dezelfde zes velden kan is daarmee waarschijnlijk maar niet gelezen (de forumvraag daarover kreeg geen sluitend antwoord). Eigen afleiding. Praktisch: op de 255S zijn 5 en 6 velden nog kleiner; het advies van hoogstens 4 past bij beide.
- Music en niet-Music: Music heeft muziek en opslag erbij. Gemeld (DC Rainmaker). Voor datavelden vond ik één verschil in de handleiding dat niets met lopen te maken heeft (een waarschuwing bij meditatie, alleen op Music). Bevestigd. Of Music een extra scherm voor muziekbediening in de rij heeft is onbevestigd.
- Batterij: 30 uur tegen 26 uur met alleen GPS. Gemeld (DC Rainmaker).

## 7. Tot slot

### Wat het onderzoek zegt

- De handleiding bevestigt het pad op het horloge, de Nederlandse menunamen, de volledige veldenlijst in twee talen, en dat instellen ook via Garmin Connect kan.
- De handleiding zwijgt over het aantal velden per scherm, de ligging en het aantal schermen. Recensenten melden tot 6 velden en geen praktische grens aan schermen. Een gebruiker meldt 8 indelingen, waarvan 3 voor drie velden.
- Loopdynamiek en loopvermogen komen uit de pols. Alleen de balans van de grondcontacttijd vraagt een HRM-Pro of pod. Hartslag werkt aan de pols; een borstband mag.
- Welk veld groot hoort is bijna overal praktijkadvies, geen onderzoek. De twee stevigste punten komen uit eigen eerder werk: stuur rustig werk op hartslag, en vertrouw bij korte blokken niet op hartslag.

### Wat het betekent voor de app

Voorstellen voor de bouwer, geen besluiten.

De indelingen (voorstel voor `src/data/watchLayouts.ts`):

- Het horloge kan 1 tot en met 6 velden (gemeld). ASCEND biedt 1 tot en met 4 aan, als eigen keuze. Zet in de uitleg niet dat het horloge er maar 4 kan.
- Ligging, alle vier aannames tot ze op het horloge zijn nagekeken: 1 veld vol; 2 velden boven en onder; 3 velden drie rijen; 4 velden één boven, twee midden, één onder.
- Plekken tellen van boven naar beneden en van links naar rechts. Het veld met `main` krijgt de grootste plek van de indeling.
- Hoogstens 5 pagina's per versie mag blijven; het horloge begrenst dat niet (gemeld).

De velden (voorstel voor een datalijst): de 126 id's uit hoofdstuk 3, elk met `id`, `group`, `nameEn`, `nameNl`, een korte uitleg en twee optionele kenmerken: `needs` (`'runningDynamicsAccessory'` bij de vier balansvelden, anders leeg) en `only` (`'run'` bij loopdynamiek, vermogen en `cadenceGauge`; `'workout'` bij de vijf workout-velden en de drie intervalvelden). De groepen: Timer, Afstand, Tempo, Snelheid, Hartslag, Cadans, Hoogte, Vermogen, Loopdynamiek, Workout, Kompas, Temperatuur, Overig, plus Meters en grafieken. Het ontwerp noemt de groep Loopvorm; Garmin zegt Hardloopdynamiek. Kies er één; het menu op het horloge zegt Hardloopdynamiek.

"Vraagt een borstband" uit het ontwerp klopt maar voor vier velden (de balans). Alle andere loopdynamiek werkt aan de pols.

Het advies per soort, om over te nemen. Per pagina: aantal velden, de velden in volgorde van plek, het grote veld eerst genoemd, en de zin.

- `zone2`
  - 3: `heartRate`, `hrZone`, `timer`. "Hartslag groot, want daar stuur je op."
  - 3: `distance`, `lapPace`, `averagePace`. "Tempo staat hier, zodat het je op pagina 1 niet opjaagt."
  - 2: `cadence`, `timeOfDay`. "Cadans apart, voor als je op je pas wilt letten."
- `hills`
  - 3: `heartRate`, `lapTime`, `lapAscent`. "Hartslag groot, want tempo zegt bergop weinig."
  - 3: `totalAscent`, `verticalSpeed`, `grade`. "Totale stijging groot, want die telt hier, niet de kilometers."
  - 3: `laps`, `lastLapTime`, `timer`. "Ronden groot, zodat je weet hoeveel klimmen je hebt gehad."
- `intervals`
  - 4: `lapTime`, `lapPace`, `lapDistance`, `heartRate`. "Rondetijd groot, want een blok duurt een vaste tijd."
  - 3: `lastLapPace`, `lastLapTime`, `laps`. "Je laatste blok, om in de rust te lezen wat je liep."
  - 3: `timer`, `distance`, `averageHeartRate`. "Het geheel, voor het uitlopen."
- `longRun`
  - 3: `heartRate`, `lapPace`, `distance`. "Hartslag groot, want die loopt op als je te hard begint."
  - 3: `timer`, `averagePace`, `averageHeartRate`. "Tijd groot, want de lange loop telt in minuten."
  - 2: `timeOfDay`, `totalAscent`. "De klok, zodat je weet wanneer je moet eten en keren."
- `packHike` (activiteit Hiken of Wandelen)
  - 4: `totalAscent`, `distance`, `timer`, `timeOfDay`. "Totale stijging groot, want hoogtemeters bepalen je dag."
  - 4: `heartRate`, `verticalSpeed`, `elevation`, `totalDescent`. "Hartslag groot, want met een rugzak bergop loopt hij snel op."
  - 3: `sunset`, `timeOfDay`, `batteryLevel`. "Zon onder groot, want daarvoor wil je er zijn."

De stappen in de app: eerst het pad op het horloge uit hoofdstuk 4 (bevestigd, Nederlandse namen), daarna Connect als tweede weg met de regel over terugvallen op het horloge. Bij `hills` en `intervals` één extra regel: "Druk per klim of blok op de rondeknop." Bij `longRun`: "Zet Auto Lap op 1 km." Bij `packHike`: "Kies de activiteit Hiken of Wandelen."

Twee kleine dingen buiten de pagina: haal "RPE" uit het veldenrijtje in `GARMIN_DATA_SCREENS` als dat blok blijft bestaan, en noem de hele functie in de app een advies. Er verandert niets aan de planning.

### Wat nog onzeker is

- De ligging van de velden bij elke indeling, en welke plek het grootst is. Niet gevonden. Twee minuten op het horloge lost het op: Gegevensschermen, een scherm, Indeling, en alle keuzes langslopen.
- Of het er echt 8 indelingen zijn en of 6 het maximum is. Gemeld, niet door Garmin bevestigd.
- Welke velden bij Hiken en Wandelen ontbreken. De handleiding geeft geen lijst per activiteit.
- De Nederlandse menunamen in de Garmin Connect-app, en of de haperingen op Android in 2026 nog bestaan.
- De veldnamen zoals het horloge ze in het menu toont. De handleiding en het menu kunnen verschillen in afkorting. De namen zijn bovendien via een samenvattend hulpmiddel gelezen; een steekproef van vijf velden op het horloge is verstandig.
- Wat het workoutscherm van een gestuurde workout toont en of het aan te passen is.
- Of `respirationRate`, `estimatedFinishTime` en `overallAheadBehind` zonder extra's iets tonen.
- Het advies zelf rust op praktijk van één bekende recensent en op eigen eerder onderzoek, niet op studies naar wat je het best op een horloge leest. Behandel het als een goed begin dat de gebruiker mag wisselen.

## Bronnen

- Garmin, Forerunner 255 serie Gebruikershandleiding, Gegevensschermen aanpassen: https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/NL-NL/GUID-638CD68D-11B0-4D9C-B8B7-E28D15EC4566.html (Engels: zelfde adres met EN-US)
- Garmin, idem, Gegevensvelden: https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/NL-NL/GUID-73BCE454-042E-420D-96A4-9DBA46626CD4.html (Engels: zelfde adres met EN-US)
- Garmin, idem, Instellingen van activiteiten en apps: https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/NL-NL/GUID-BB0CF463-4070-4FA9-8612-82751F82E316.html
- Garmin, idem, Customizing Activities and Apps: https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-25FA2988-33F2-4FC9-92FA-E457CBDB9E72.html
- Garmin, idem, Running Dynamics: https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-62A09512-518A-424A-8491-FE2B80CD2091.html
- Garmin, idem, Aziatische uitgave, Customizing the Data Screens: https://www8.garmin.com/manuals-apac/webhelp/forerunner255series/EN-SG/GUID-B3D80B84-CA40-4BE9-8C7B-F4F15DC52A7B-3881.html
- Garmin, de handleiding als PDF (niet gelezen, wel het adres): https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/Forerunner_255_OM_EN-US.pdf
- Garmin, Connect IQ, richtlijnen voor datavelden: https://developer.garmin.com/connect-iq/user-experience-guidelines/data-fields
- DC Rainmaker, Garmin Forerunner 255 In-Depth Review (2022, bijgewerkt): https://www.dcrainmaker.com/2022/06/garmin-forerunner-multisport.html (alleen het eerste derde van de pagina gelezen)
- DC Rainmaker, How I configure my watches (2016): https://www.dcrainmaker.com/2016/03/configure-watches-datafields.html
- DC Rainmaker, The art of pacing with Garmin (2011, via zoekresultaat): https://dcrainmaker.com/2011/03/art-of-pacing-with-garmin.html
- Cycling Weekly via Yahoo, Garmin Forerunner 255 review (30 mei 2023): https://www.yahoo.com/lifestyle/garmin-forerunner-255-review-no-110238955.html
- Garmin-forum, 255s data fields count: https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/296065/255s-data-fields-count
- Garmin-forum, lack of data field layout options (Forerunner 165): https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-165-series/369316/lack-of-data-field-layout-options
- Garmin-forum, FW 14.13, reduced font size: https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/322223/fw-14-13---reduced-font-size-in-2--and-3-field-data-screens
- Garmin-forum, cannot edit data field on Android: https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/337631/cannot-edit-data-field-in-activities-data-screen-on-android
- Garmin-forum, Connect app won't let me customize layouts: https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/379308/garmin-forerunner-255---connect-app-won-t-let-me-customize-activity-data-screen-layouts
- Garmin-forum, partial solution, data screens via Android app: https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/321639/partial-solution---data-screens-configuration-via-android-app
- Uphill Athlete, forum, Ascent meters per hour as pace (via zoekresultaat): https://uphillathlete.com/?p=39070
- Suunto, Boost your hill training (via zoekresultaat): https://us.suunto.com/blogs/blog/boost-your-hill-training-with-suuntoplus-climb
- GPS Central, vergelijking Forerunner-modellen (via zoekresultaat): https://www.gpscentral.ca/compare-gps-garmin-forerunner/
- Eigen eerder werk: `docs/visie/Trainingswetenschap.md`, `docs/onderzoek/Loopgegevens en vooruitgang.md`, `docs/onderzoek/Tempo bij zone 2, stabiele stukken.md`, `docs/ontwerp/datavelden-horloge.md`.
