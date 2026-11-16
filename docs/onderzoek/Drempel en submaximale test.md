# Drempel en submaximale test

Zonder lab is de drempelhartslag van een recreatieve loper niet nauwkeuriger te bepalen dan ongeveer 5 slagen naar boven of beneden, en de best onderbouwde veldtest is een maximale inspanning van ongeveer 30 minuten in je eentje met de hartslag van de laatste 20 minuten; wie de 5 km in 24 tot 40 minuten loopt, doet met de testloop van ASCEND al bijna precies die test. De factor 0,98 is door geen enkele studie onderbouwd maar ook niet aantoonbaar fout: hij ligt midden in de ruimte van 0,96 tot 1,00 die de definitie van "de drempel" zelf openlaat, dus het getal mag blijven, mits het alleen geldt voor een inspanning van 24 tot 40 minuten en alleen met een borstband, want aan de pols zit een horloge er bij hard lopen 3 tot 9 procent naast, tegen ongeveer 1 procent voor een band. De echte zwakte van de fundering is dat één test op één dag bij 3 slagen verschil alle zones verzet, terwijl de ruis van één test zelf 3 tot 4 slagen is, zodat ruwweg vier tot vijf op de tien tests een voorstel geven terwijl er niets veranderd is; de drempel hoort de mediaan van je laatste drie geldige tests te volgen. Eén drempel kan bovendien de bovenkant van zone 2 niet voor iedereen goed leggen, want de eerste drempel ligt bij recreatieve lopers gemiddeld op 89 procent van de tweede maar met een spreiding van ongeveer 8 slagen tussen mensen, en daar is een eigen, simpele controle voor nodig: de praattest. Een korte vaste test van 4 minuten op een vast tempo, eens per week, meet de hartslag bij dat tempo betrouwbaar (ruis 2 tot 3 slagen), maar zegt pas iets samen met hoe zwaar het voelde, laat bij wie al maanden traint vooral vermoeidheid en afwijkingen zien en nauwelijks vooruitgang, en mag de zones nooit zelf veranderen.

Datum: 16 november 2026
Door: Scout Drempel (I-79)
Status: onderzoek en voorstel. In `src/` is niets veranderd. Er staat geen persoonsgegeven in dit bestand; elk rekenvoorbeeld is nagemaakt.

Dit is geen medisch advies. Een maximale test is zwaar. Wie pijn op de borst, duizeligheid of een hartslag heeft die zonder reden veel hoger ligt dan gewoon, stopt en gaat naar een arts.

## Hoe ik gewerkt heb en hoe zeker iets is

Gelezen in de repo: het werkbriefje en het lange verhaal bij lopen en tests, `Loopgegevens en vooruitgang.md`, `Tempo bij zone 2, stabiele stukken.md`, `Trainingsvormen en varianten.md`, `Kansen met gegevens.md`, `RPE bij een testloop.md`, `Tussendoel hardloopwedstrijd.md`, de besluiten `2026-10-25-hartslag-op-het-horloge.md` en `2026-11-02-week-en-vandaag-hulp.md`, en de code die nu rekent (`zoneUpdate.ts`, `heartRateZones.ts`, `watchHeartRate.ts`, `racePaces.ts`, `racePrediction.ts`, `testJudgment.ts`, `watchWorkout.ts`, `integrations/intervalsIcu.ts`). Wat daar al staat herhaal ik niet; ik verwijs ernaar.

Zelf nagelezen op 16 november 2026: de OpenAPI-beschrijving van intervals.icu (de hele specificatie, 257 KB), het eerste bericht van de forumdraad over de submaximale test, de officiële handleiding van de Forerunner 255 (pdf) en de tekst van Friel bij TrainingPeaks. Van zes studies raadpleegde ik de volledige tekst: Nuuttila 2025 en Esteve-Lanao 2008 las ik zelf, Heiber 2024, Lu 2025, Buchheit 2014 en Shushan 2023 via een hulpmiddel dat de tekst voor mij doorzocht. Van de rest las ik de samenvatting in PubMed; waar ik alleen een zoekresultaat zag, staat dat erbij. Ik had geen API-sleutel en heb dus geen antwoord van een echt account gezien.

Aanvulling van 16 november, laat op de avond: de eigenaar loopt elke hardloop met een Garmin HRM-Pro Plus borstband. Daarop zijn drie delen uitgebreid: de pols tegen de borstband (hoofdstuk 4), RR-intervallen en DFA alpha 1 (hoofdstuk 2) en wat de band verder meet (hoofdstuk 6). Daarvoor las ik ook de handleiding van de HRM-Pro Plus.

Bij elke bewering staat hoe sterk het bewijs is, in de woorden van de rest van `docs/onderzoek/`:

- bewijs sterk: een meta-analyse of meerdere goede studies die hetzelfde zeggen.
- bewijs matig: één goede studie, of een review van kleine studies.
- bewijs zwak: klein, observationeel, tegenstrijdig, of alleen een samenvatting gelezen.
- expert: een coach of fabrikant zegt het, zonder toets.

En voor wat ik zelf zeg:

- zeker: zelf gelezen in de code, de specificatie of de handleiding.
- afgeleid: mijn eigen redenering of rekensom op bronnen.
- gok: een getal dat ik kies omdat er geen bron voor is; het moet na een paar weken op echte lopen worden nagekeken.

## Wat er nu is

- `engine/zoneUpdate.ts#lthrFromTest`: de gemiddelde hartslag van kilometer 2 tot en met 5 van de snelste 5 km, gewogen naar tijd, keer 0,98 (`LTHR_FROM_5K`). Minstens drie kilometers met hartslag. Het voorstel komt bij 3 slagen verschil of meer (`MIN_LTHR_CHANGE`), alleen voor de laatste test die meetelt, met Akkoord (zeker).
- Wat die functie niet toetst: waar de hartslag vandaan kwam (borstband of pols), hoe lang de inspanning duurde, hoe warm het was, of de test maximaal was, of je ziek was. Elke hartslag telt (zeker). De vlag `detail.quality.chestStrapSeen` bestaat al op het log (gezet zodra de reeks met de balans van de grondcontacttijd voor minstens 10 procent gevuld is), maar deze functie leest hem niet. De uitleg bij Drempel in Instellingen raadt sinds 16 november wel een borstband aan; de code dwingt het niet af.
- `engine/heartRateZones.ts`: zone 1 is 66 tot 81 procent van de drempel, zone 2 81 tot 89, zone 3 89 tot 96, zone 4 96 tot 101. Eén getal bepaalt dus alle grenzen (zeker).
- `engine/watchHeartRate.ts` stuurt die slagen naar het horloge; `aerobicTrend.ts`, het oordeel "je rustige loopjes waren te hard", de minuten per zone en `walkHeartRate.ts` rekenen met dezelfde drempel. De zones worden pas bij het lezen toegepast, dus een nieuwe drempel herleest ook je oude lopen (zeker).
- De tempo's komen niet uit de drempelhartslag maar uit de tijd van de test (`racePaces.ts`, VDOT). Hartslagzones en tempozones zijn dus twee systemen die aan dezelfde test hangen. Dat geeft een gratis controle: aan het eind van een tempoblok hoort je hartslag vlak onder je drempel te zitten (afgeleid).

## 1. Wat de drempel is, en welke ASCEND bedoelt

Er zijn er twee, en de verwarring komt doordat beide "de drempel" heten.

De eerste drempel (LT1, VT1, aerobe drempel) is het punt waar lactaat voor het eerst boven je rustwaarde uitkomt en je ademhaling voor het eerst versnelt. Eronder is inspanning "matig": je kunt het uren volhouden. Bij 165 recreatieve lopers lag hij gemiddeld op 80,7 procent van de maximale hartslag (standaardafwijking 4,9), bij 1,7 mmol lactaat en een zwaarte van 12 tot 13 op de schaal van 6 tot 20 ([Nuuttila e.a. 2025](https://pubmed.ncbi.nlm.nih.gov/40088270/)) (bewijs: matig tot sterk voor deze groep; één lab, stappen van 3 minuten).

De tweede drempel (LT2, VT2, anaerobe drempel, het hoogste lactaatevenwicht of MLSS, en vlak daarboven de kritieke snelheid) is de hoogste inspanning waarbij aanmaak en afbraak van lactaat nog in evenwicht blijven. Erboven loopt alles op tot je moet stoppen. In dezelfde studie lag hij op 90,6 procent van de maximale hartslag (standaardafwijking 2,5), bij 3,2 mmol en zwaarte 15 tot 16. Er bestaan minstens 25 manieren om hem uit een lactaatcurve te lezen, en hoe ver elk daarvan per persoon van het echte evenwicht af ligt is zelden gerapporteerd ([Faude e.a. 2009](https://pubmed.ncbi.nlm.nih.gov/19453206/)) (bewijs: sterk dat de methodes verschillen). Volgens een deel van de fysiologen is de kritieke snelheid de echte grens en ligt het lactaatevenwicht daar iets onder ([Jones e.a. 2019](https://pubmed.ncbi.nlm.nih.gov/31124324/); [Galán-Rioja e.a. 2020](https://pubmed.ncbi.nlm.nih.gov/32613479/)) (bewijs: matig; een lopend debat). "Het lab" is dus zelf geen enkel getal. Dat is de eerste ongemakkelijke waarheid: wie een veldtest tegen het lab legt, legt hem tegen een keuze.

De drempelhartslag (LTHR) is het praktijkwoord van coaches en horloges voor de hartslag die bij de tweede drempel hoort. Garmin zegt het zo in de handleiding van de Forerunner 255: de inspanning waarbij lactaat zich begint op te hopen, bij ervaren lopers rond 90 procent van de maximale hartslag en tussen het tempo van een 10 km en een halve marathon, bij gemiddelde lopers "vaak ruim onder 90 procent" ([handleiding](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/Forerunner_255_OM_EN-US.pdf)) (zeker, gelezen). Die 90 procent is de tweede drempel van Nuuttila. De zones van ASCEND (Garmin, procent van de drempel) hangen dus aan de tweede drempel (afgeleid, maar stevig). De uitleg in de app, "de hartslag die je ongeveer een uur vol kunt houden", past daarbij: het tempo van het lactaatevenwicht is 45 minuten tot ruim een uur vol te houden (Vobejda 2013 en Dittrich 2014, hoofdstuk 2).

Twee dingen maken het lastiger dan het lijkt.

- De hartslag bij de tweede drempel is geen vast getal. Op de snelheid van het lactaatevenwicht blijft lactaat gelijk, maar de hartslag loopt door: 8,4 slagen (standaardafwijking 2,6) tussen minuut 10 en minuut 30, bij 18 lopers ([Vobejda e.a. 2013](https://pubmed.ncbi.nlm.nih.gov/24247182/)) (bewijs: matig). Een stappentest met korte stappen geeft daarom een lagere "drempelhartslag" dan een half uur op drempeltempo. Het verschil is een paar slagen, en het is geen meetfout maar een verschil in definitie.
- De percentages van Garmin hebben vrijwel dezelfde knikken als de loopzones van Friel (bij Friel 89, 94 en 99 procent; op het horloge van de eigenaar 89, 96 en 101) ([Friel, zones instellen](https://www.trainingpeaks.com/learn/articles/joe-friel-s-quick-guide-to-setting-zones/)) (zeker voor de getallen; afgeleid dat het ene van het andere komt). Friel hangt zijn zones aan de hartslag van een half uur voluit, dus aan de hogere van de twee lezingen.

Welke is de juiste voor ASCEND? De tweede drempel, gelezen zoals een veldtest hem kan geven. Of je daarbij de lezing van Friel neemt (een half uur voluit) of die van een stappentest (een paar slagen lager) is een keuze van 2 tot 4 procent, en die keuze is niet groter dan de ruis van één test (zie hoofdstuk 2). Voor de bovenkant van zone 2 is de tweede drempel alleen niet genoeg; daar gaat de volgende alinea over.

### De bovenkant van zone 2 hangt aan de eerste drempel, en die meet een drempeltest niet

Bij de lopers van Nuuttila is de verhouding tussen de twee drempels gemiddeld 80,7 gedeeld door 90,6, dat is 0,89 (mannen 0,88, vrouwen 0,91) (afgeleid uit hun tabel). De bovenkant van zone 2 in ASCEND ligt op 89 procent van de drempel. Gemiddeld klopt dat dus precies: zone 2 eindigt waar de eerste drempel ligt.

Per persoon klopt het vaak niet. De eerste drempel spreidt twee keer zo breed als de tweede (4,9 tegen 2,5 procent van de maximale hartslag). Wie alleen de maximale hartslag kent, zit er voor de eerste drempel gemiddeld 6,6 slagen naast en voor de tweede 3,4, met grenzen van 16 en 9 slagen naar beide kanten (Nuuttila 2025) (bewijs: matig tot sterk). In een andere groep van 100 mensen lag de eerste drempel tussen 60 en 90 procent van de maximale hartslag en het lactaatevenwicht tussen 75 en 97 procent ([Iannetta e.a. 2020](https://pubmed.ncbi.nlm.nih.gov/31479001/)) (bewijs: matig tot sterk). Een kritische review zegt het algemener: een vast percentage van een maximum legt de grenzen per persoon slecht ([Jamnick e.a. 2020](https://pubmed.ncbi.nlm.nih.gov/32729096/)) (bewijs: matig tot sterk). Mijn rekensom: de afstand tussen jouw eerste en tweede drempel wijkt per persoon ongeveer 8 slagen af van het gemiddelde (afgeleid; ik ken de samenhang tussen beide drempels niet, dus de 8 is een schatting).

Gevolg: ook een perfecte drempelhartslag legt de grens van "rustig" voor ongeveer de helft van de lopers te hoog (afgeleid). Dat past bij wat `Trainingsvormen en varianten.md` al vermoedde en bij het signaal "je rustige loopjes waren te hard". De tweede ongemakkelijke waarheid is dus: de nauwkeurigheid van de drempeltest is niet het grootste probleem van zone 2.

## 2. Veldtests voor de drempel

### De test van 30 minuten van Friel

Het protocol, in de woorden van Friel: loop 30 minuten alleen, zonder trainingsmaatjes en niet in een wedstrijd, alsof het een wedstrijd is; druk na 10 minuten op de rondeknop; je gemiddelde hartslag over de laatste 20 minuten is een benadering van je drempelhartslag, en je gemiddelde tempo over de hele 30 minuten is je drempeltempo. Hij schrijft erbij dat de uitkomst beter wordt naarmate je de test vaker doet, omdat je beter leert indelen ([Friel](https://www.trainingpeaks.com/learn/articles/joe-friel-s-quick-guide-to-setting-zones/)) (expert, zeker gelezen). Waarom een half uur alleen gelijk zou staan aan een uur in een wedstrijd legt hij daar niet uit; dat is zijn ervaring, geen meting.

Wat er aan toetsing is:

- Bij 27 wedstrijdlopers en triatleten week een test van 30 minuten op de loopband gemiddeld niet af van de labdrempel (hier: 4,0 mmol), voor snelheid (standaardfout 0,21 m/s) en voor hartslag (standaardfout 8,0 slagen). Van de vier geteste methodes (ook VDOT, een tijdrit van 3200 m en Conconi) noemt de samenvatting voor de hartslag alleen het halfuur als niet verschillend van het lab ([McGehee e.a. 2005](https://pubmed.ncbi.nlm.nih.gov/16095403/)) (bewijs: matig; één studie, getrainde lopers). Let op twee dingen. De hartslag was daar het gemiddelde van de hele 30 minuten, elke 5 minuten afgelezen, niet de laatste 20 ([beschrijving van het protocol](https://www.unm.edu/~lkravitz/Article%20folder/LTassessUNM.html)) (zwak, uit een samenvatting). En 8 slagen standaardfout betekent: gemiddeld goed, per persoon ruim.
- De hoogste snelheid die je 45 minuten volhoudt is bij 18 lopers vrijwel gelijk aan de snelheid van het lactaatevenwicht (3,44 tegen 3,45 m/s, samenhang 0,96), met dezelfde hartslag en hetzelfde lactaat ([Vobejda e.a. 2013](https://pubmed.ncbi.nlm.nih.gov/24247182/)) (bewijs: matig). Goed getrainde lopers hielden die snelheid gemiddeld 68 minuten vol (standaardafwijking 11) ([Dittrich e.a. 2014](https://pubmed.ncbi.nlm.nih.gov/24235775/)) (bewijs: zwak tot matig, 10 lopers). Een half uur voluit ligt dus een fractie boven de tweede drempel, niet erop.
- Bij fietsers gaven een tijdrit van 20 minuten (maal 0,95), een van 60 minuten en de labdrempel gemiddeld hetzelfde vermogen en dezelfde hartslag, maar per persoon liepen ze ver uiteen ([Borszcz e.a. 2018](https://pubmed.ncbi.nlm.nih.gov/29801189/)) (bewijs: matig; fietsen). Zelfde les: goed voor het gemiddelde, ruim voor de enkeling.

Oordeel: de beste veldtest die er is, en de enige met een toets bij lopers. Nauwkeurigheid per persoon tegen het lab: ongeveer 8 slagen standaardfout, waarvan een deel in het lab zelf zit.

### Een 5 km of een 10 km met een factor

Ik vond geen enkele studie die een factor voor de hartslag van een 5 km of 10 km toetst. Niet 0,98, niet 0,95, niets. Wat op fora rondgaat (0,94 of 0,95 maal je gemiddelde over een 5 km) is ervaring van snelle lopers. Dat moet hardop gezegd: de factor van ASCEND is en blijft een aanname.

Wat er wel is:

- In wedstrijden over 5 en 10 km zat de hartslag bij 211 lopers 80 tot 85 procent van de tijd boven de hartslag van de tweede ventilatoire drempel uit hun labtest, en het verloop was bij snelle en langzame lopers gelijk; een loper van 43 minuten op de 10 km had hetzelfde hartslagverloop als een van 32 minuten ([Esteve-Lanao e.a. 2008](https://pubmed.ncbi.nlm.nih.gov/18698405/)) (bewijs: matig; de getallen per afstand staan alleen in de figuren). De hartslag in een voluit gelopen halfuur ligt dus boven de drempel van een stappentest. Dat is de hartslagdrift uit hoofdstuk 1.
- Het tempo van een ouder begrip, de "maximal steady state", viel bij 7 ervaren lopers samen met hun tempo in een wedstrijd van 16 km en hing het sterkst samen met dat van 8 km ([LaFontaine e.a. 1981](https://pubmed.ncbi.nlm.nih.gov/7253872/)) (bewijs: zwak). Garmin legt de drempel tussen het tempo van een 10 km en een halve marathon (expert).

Waar het om draait is niet de afstand maar de duur. Een 5 km in 20 minuten is een heel andere inspanning dan een 5 km in 30 minuten. De eigenaar loopt de testloop in ongeveer 25 tot 36 minuten (zie `RPE bij een testloop.md`); voor hem is de 5 km dus vrijwel de test van Friel. Dat is de belangrijkste vondst van dit hoofdstuk, en hij is afgeleid, niet gemeten.

### Is 0,98 te verdedigen?

Mijn rekensom, met een nagemaakt voorbeeld. Stel: een 5 km in 28:40, hartslag over de laatste 20 minuten gemiddeld 178.

- Lees je de drempel zoals Friel, dan is het 178. Factor 1,00.
- Lees je hem zoals McGehee toetste (het gemiddelde van het hele halfuur, dat door de oplopende eerste minuten ongeveer 1 procent lager uitkomt), dan is het ongeveer 176. Factor 0,99 (afgeleid; de 1 procent is mijn schatting).
- Lees je hem zoals een stappentest hem geeft (de hartslag rond minuut 10 op drempeltempo, voor de drift), dan trek je de helft van de drift van Vobejda af, ongeveer 4 slagen, plus 1 à 2 slagen omdat een halfuur voluit iets sneller is dan drempeltempo. Dan is het 172 tot 174. Factor 0,97 tot 0,98 (afgeleid).

De drift verschilt per persoon (8,4 slagen met een standaardafwijking van 2,6), dus de ruimte loopt van ongeveer 0,96 tot 1,00, en 0,98 ligt er middenin. De spreiding door de keuze van definitie is 2 procent naar boven of beneden, dat is 3 tot 4 slagen. De ruis van één test is even groot (zie verderop). Wie beweert dat 0,97 of 0,99 beter is, beweert meer dan de gegevens dragen.

Wat niet te verdedigen is: dezelfde 0,98 voor elke 5 km.

- Onder ongeveer 24 minuten is de inspanning korter en harder; de hartslag loopt dan dichter naar het maximum en de schatting komt waarschijnlijk 1 tot 2 procent te hoog uit (afgeleid; de grootte is een gok, er is geen studie).
- Boven ongeveer 40 minuten weet ik het niet: het tempo is lager maar de drift duurt langer. Geen bron.
- Kilometer 2 tot en met 5 is bij een test van 29 minuten ongeveer de laatste 23 minuten, bijna hetzelfde als de laatste 20. Bij een test van 22 minuten is het de laatste 17,5. Het venster hoort in minuten te zijn, niet in kilometers (afgeleid).

En de richting van de fout telt. Een te hoge drempel schuift de grens van "rustig" omhoog, en te hard rustig lopen is de bekende fout van recreatieve lopers. Een te lage drempel maakt rustige lopen iets trager dan nodig en een tempoloop iets lichter; dat kost weinig. Bij twijfel is iets te laag de veilige kant (afgeleid). Dat pleit voor 0,98 boven 1,00.

Het oordeel staat nog een keer apart in hoofdstuk 7.

### Een oplopende stappentest zonder lactaat

Met lactaat is dit de labtest. Zonder lactaat blijft alleen de knik in de hartslag over (de Conconi-test), en die is niet betrouwbaar: bij 15 goed getrainde lopers die de test twee keer deden was de knik bij 6 beide keren te zien, bij 5 één keer en bij 4 nooit ([Jones en Doust 1995](https://pubmed.ncbi.nlm.nih.gov/8776209/)) (bewijs: matig). Een review noemt de geldigheid onzeker en de knik afhankelijk van het protocol ([Bodner en Rhodes 2000](https://pubmed.ncbi.nlm.nih.gov/10907756/)); een overzicht van 88 studies uit 2026 zegt hetzelfde: de knik is niet bij iedereen te vinden ([Maffulli e.a. 2026](https://pubmed.ncbi.nlm.nih.gov/42872971/)) (bewijs: matig). In de studie van McGehee hoort Conconi niet bij de methodes die met het lab overeenkwamen. Oordeel: niet bouwen.

Eén variant is wel bruikbaar, maar dan voor iets anders: bij stappen op gevoel (zwaarte 10, 13 en 17, elk 3 minuten) hing de snelheid per stap bij 40 getrainde lopers samen met hun labwaarden, en bij 11 van hen was de test herhaalbaar (fout 2,5 tot 5,6 procent), het best bij zwaarte 17 ([Sangan e.a. 2021](https://pubmed.ncbi.nlm.nih.gov/34140417/)) (bewijs: matig). Dat is een volgtest, geen drempeltest; zie hoofdstuk 3.

### De praattest

Kun je tijdens het lopen nog comfortabel hardop praten, dan zit je onder de drempel; lukt dat niet meer, dan zit je erboven. Een review noemt de test geldig en herhaalbaar bij gezonde volwassenen, hartpatiënten en wedstrijdsporters, en bruikbaar bij wandelen, lopen en fietsen, maar niet bij intervallen ([Reed en Pipe 2014](https://pubmed.ncbi.nlm.nih.gov/25010379/)) (bewijs: matig). In een studie met 15 mensen lag "praten gaat comfortabel" op 82 procent van de maximale hartslag en "weet ik niet zeker" op 90 procent ([Quinn en Coons 2011](https://pubmed.ncbi.nlm.nih.gov/21774751/)) (bewijs: zwak tot matig, klein). Leg dat naast Nuuttila (80,7 en 90,6 procent): het laatste comfortabele niveau is ongeveer de eerste drempel, de twijfel is ongeveer de tweede (afgeleid).

Oordeel: geen manier om een drempelhartslag in slagen te vinden, wel de goedkoopste eerlijke controle op de bovenkant van zone 2, precies het gat uit hoofdstuk 1.

### De schatting van Garmin

Wat het horloge doet (zeker, handleiding Forerunner 255): het schat de drempel "uit hartslag en tempo", heeft daarvoor een borstband nodig ("Lactate threshold requires a chest heart rate monitor"), en doet het vanzelf tijdens een loop (Auto Detection, standaard aan). Je kunt de waarde ook zelf invullen, en de zones als procent van die drempel laten rekenen. Andere Garmin-horloges hebben daarnaast een geleide test in stappen, die een borstband en een schatting van je VO2max vraagt; in de handleiding van de 255 zelf vond ik die niet beschreven. De rekenwijze is van Firstbeat en niet openbaar. Dat de schatting ook de hartslagvariabiliteit gebruikt, zoals vaak wordt gezegd, kon ik niet bevestigen; de handleiding noemt hartslagvariabiliteit alleen bij Performance Condition. Sinds een update in 2024 zou de automatische schatting ook de polshartslag accepteren ([the5krunner](https://the5krunner.com/2024/10/26/garmin-changes-lactate-threshold-measurement-deep-dive/)) (expert, één blog).

Wat onafhankelijke toetsen vonden:

- Fenix 7 met borstband, 26 mensen, tegen een veldtest met bloedlactaat: de hartslag bij de drempel was gemiddeld 3,0 slagen lager (standaardafwijking van het verschil 8,3, niet significant), het tempo 12 procent te laag. De spreiding van de horlogewaarden was half zo groot als die van de echte waarden (4,6 tegen 10,0 slagen): het horloge trekt iedereen naar het midden ([Heiber e.a. 2024](https://pubmed.ncbi.nlm.nih.gov/38742188/)) (bewijs: matig).
- Forerunner 265 met borstband, 23 mensen: bij 15 van de 23 kwam er een schatting; de hartslag week gemiddeld ongeveer 6 slagen af, met grenzen van 16 slagen de ene kant op tot 29 de andere; het tempo zat er een kwart naast ([Lu e.a. 2025](https://pubmed.ncbi.nlm.nih.gov/40740423/)) (bewijs: zwak tot matig; de samenvatting en de tabel van het artikel spreken elkaar tegen en er is een correctie verschenen).
- Fenix 6, 6 mensen: gemiddeld geen verschil in hartslag, maar per persoon geen samenhang ([Carrier e.a. 2021](https://digitalscholarship.unlv.edu/kns_fac_articles/415)) (bewijs: zwak; een congressamenvatting, en ik zag alleen het zoekresultaat). Een review van 13 studies telt drie die de drempelschatting geldig noemen ([Železnik Mežan 2025](https://pubmed.ncbi.nlm.nih.gov/41477023/)) (bewijs: zwak tot matig).

Oordeel: voor de hartslag gemiddeld redelijk, per persoon een marge van 15 tot 20 slagen; voor het tempo slecht. Bruikbaar als tweede mening naast je eigen test, niet als waarheid. Het horloge is hier niet beter dan een halfuur voluit, eerder slechter.

### DFA alpha 1 uit RR-intervallen

Het idee: het patroon van slag tot slag verandert met de inspanning. Een maat daarvoor (DFA alpha 1) zakt van ongeveer 1 in rust naar 0,5 bij zware inspanning; 0,75 zou de eerste drempel zijn en 0,5 de tweede.

- Bij 15 mensen op de loopband viel 0,75 samen met de eerste ventilatoire drempel (hartslag 154 tegen 152) en 0,5 met de tweede (171 tegen 174, samenhang 0,78) ([Rogers e.a. 2021, eerste drempel](https://pubmed.ncbi.nlm.nih.gov/33519504/); [Rogers e.a. 2021, tweede drempel](https://pubmed.ncbi.nlm.nih.gov/33925974/)) (bewijs: zwak tot matig; kleine groepen, dezelfde onderzoekers).
- Een systematische review van 27 studies (461 deelnemers): gemiddeld klopt het, per persoon niet. Voor de eerste drempel liggen de grenzen op 11 slagen eronder tot 13 erboven tegen de ademdrempel en 20 eronder tot 26 erboven tegen de lactaatdrempel; voor de tweede 18 eronder tot 10 erboven, en 12 eronder tot 17 erboven ([Kaufmann e.a. 2023](https://pubmed.ncbi.nlm.nih.gov/37462761/)) (bewijs: matig tot sterk dat de individuele spreiding groot is).
- Bij 14 lopers met een gewone borstband klopte het in een frisse eerste test (gemiddeld 0,9 slag verschil, grenzen 12 eronder tot 11 erboven), maar in een tweede test op vermoeide benen zat het 12 slagen te laag ([Van Hooren e.a. 2025](https://pubmed.ncbi.nlm.nih.gov/37916488/)) (bewijs: matig). Het werkt dus alleen fris.
- De band zelf telt mee: een borstband gaf gemiddeld 4 slagen verschil met een ECG, en bij 6 procent gemiste slagen loopt de maat tot 19 procent scheef ([Rogers e.a. 2021, Sensors](https://pubmed.ncbi.nlm.nih.gov/33530473/)) (bewijs: matig).
- Later werk is verdeeld. Bij 38 elite wielrenners week 0,75 gemiddeld niet af van de eerste lactaatdrempel, maar 0,5 wel van de tweede, en de samenhang in hartslag was matig (0,66 en 0,71) ([Mateo-March e.a. 2023](https://pubmed.ncbi.nlm.nih.gov/35238695/)) (bewijs: matig). Bij 21 getrainde mannen in een stappentest op de fiets kwam 0,75 slecht overeen met de eerste drempel (de auteurs: onvoldoende betrouwbaar) en 0,5 redelijk met de tweede, met brede grenzen ([Anton e.a. 2026](https://pubmed.ncbi.nlm.nih.gov/41699863/)) (bewijs: matig). Bij 16 ongetrainde volwassenen die dezelfde fietstest twee keer deden waren de drempels herhaalbaar, het best uitgedrukt in vermogen ([Sempere-Ruiz e.a. 2024](https://pubmed.ncbi.nlm.nih.gov/38375458/)) (bewijs: matig). Hoe steil de test oploopt maakt weinig uit ([Fleitas-Paniagua e.a. 2023](https://pubmed.ncbi.nlm.nih.gov/37549966/), 17 mensen, verschillen van 2 slagen) (bewijs: matig; fietsen).
- Zelfs de beste consumentenband meet de maat bij zware inspanning slecht. Met een Polar H10 tegen een ECG waren hartslag en RR-tijden vrijwel gelijk, maar alpha 1 liep bij hoge intensiteit tot 58 procent te hoog of 41 procent te laag ([Schaffarczyk e.a. 2022](https://pubmed.ncbi.nlm.nih.gov/36081005/), 25 mensen) (bewijs: matig). Juist rond 0,5, waar de tweede drempel zou liggen, is de maat dus het minst te vertrouwen.

Komen de RR-intervallen bij ASCEND? De keten heeft vier schakels. Drie zijn in orde; de tweede staat waarschijnlijk standaard uit.

1. Van de band naar het horloge: ja, mits over ANT+. De HRM-Pro Plus stuurt de tijd tussen de slagen mee over ANT+ en Bluetooth (vergelijkingstabel van Garmin, gelezen bij een winkel) (expert), maar over Bluetooth gedraagt de band zich soms als een gewone hartslagmeter zonder RR-tijden (de maker van AlphaHRV, [forum van intervals.icu](https://forum.intervals.icu/t/alphahrv-update/27239/376), januari 2026; een gebruiker bij [Garmin](https://forums.garmin.com/sports-fitness/running-multisport/f/accessories-sensors/388470/hrm-pro-plus-no-hrv-via-bluetooth)) (zwak). De loopdynamiek gaat alleen over ANT+. Koppel de band dus over ANT+ aan het horloge. Aan de pols bestaat dit niet: zelfs in rust wijkt de slag-tot-slag-variatie van de polssensor die ook in de 255 zit per persoon tientallen procenten af van een ECG ([Casanova-Lizón e.a. 2026](https://pubmed.ncbi.nlm.nih.gov/42944412/), 23 mensen, Forerunner 955) (bewijs: matig).
2. Van het horloge naar het bestand: waarschijnlijk wel, maar niet vanzelf. De officiële handleiding van de 255 noemt er geen instelling voor: onder System staat bij Data Recording alleen Smart of Every Second (zeker; ik las de Engelse handleiding, op een Nederlands horloge heten ze anders). Drie eigenaren van een 255 noemen de instelling op het forum van Garmin wel: "Log HRV" of "record HRV", bij System en Data Recording, standaard uit ([forum](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-245-series/321470/does-forerunner-245-track-hrv); [forum](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/318216/bug-broadcast-hrv-r-r-intervals); [forum](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/301731/only-had-the-new-255-for-a-week-but-last-night-it-failed-to-record-any-sleep-data-or-hrv), 2022 en 2023) (zwak: gebruikers, niet zelf gezien, en firmware verandert). Andere Garmin-horloges hebben dezelfde instelling ([Runalyze](https://runalyze.com/help/article/enable-hrv-recording-garmin)) (expert). Op een Forerunner 265 stonden de RR-tijden in het bestand bij een loop met borstband, en niet bij een loop op de pols ([forum](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-265-series/336062/details-around-the-hrv-feature)) (zwak). Staat de instelling uit, dan zit er in de lopen tot nu toe geen RR-reeks. De 255 mist wel de HRV-stresstest van duurdere modellen ([Garmin-forum](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/321280/hrv-stress-test-on-forerunner-255)) (zwak). Of het bij de eigenaar werkt, laat één verzoek zien (hoofdstuk 6).
3. Van het bestand naar intervals.icu: ja, als ze in het bestand staan. `hrv` is een gedocumenteerd streamtype, de ongefilterde RR-tijden, en intervals.icu doet er zelf niets mee. `dfa_a1` bestaat alleen als een dataveld op het horloge (AlphaHRV, via Connect IQ) de maat zelf uitrekent en wegschrijft ([datamodel van intervals.icu](https://forum.intervals.icu/t/server-side-data-model-for-scripts/25781); [forum](https://forum.intervals.icu/t/all-fields-from-garmin-activity/28097), 2022 tot 2026) (expert: de ontwikkelaar en vaste leden).
4. Van intervals.icu naar ASCEND: waarschijnlijk met hetzelfde verzoek als de andere reeksen (`types=hrv` of `types=dfa_a1`); niet geprobeerd. In ASCEND is het één soort reeks erbij in `STREAM_NAMES`. Met de ruwe RR-tijden moet de app zelf rekenen: een filter voor gemiste slagen en de maat over vensters van twee minuten. Dat is een pure functie van een paar tientallen regels, geen pakket (afgeleid).

De omweg als schakel 2 dicht zit is AlphaHRV op het horloge: het leest de band zelf uit en schrijft alpha 1 in het bestand. Gebruikers melden dat het op een 255 werkt, en ook dat het daar geregeld vastloopt (forum, 2024 en 2025) (zwak). Het oorspronkelijke bestand zelf ophalen (`GET /api/v1/activity/{id}/file`, zeker uit de specificatie) helpt alleen als de RR-tijden erin staan, en vraagt een eigen FIT-lezer.

Hoe betrouwbaar is het voor een recreant?

- Voor de tweede drempel: gemiddeld redelijk, per persoon grenzen van 12 tot 18 slagen (Kaufmann), de maat zelf is daar het minst te vertrouwen (Schaffarczyk), en het bewijs komt vooral van fietsers en getrainde mannen. Dat is niet beter dan een halfuur voluit, eerder slechter.
- Voor de eerste drempel: gemiddeld goed, per persoon grenzen van 11 tot 13 slagen tegen de ademdrempel (Kaufmann; Van Hooren bij lopers), maar de nieuwste studies spreken elkaar tegen (Mateo-March goed, Anton slecht). Ter vergelijking: een vast percentage van de maximale hartslag heeft voor de eerste drempel grenzen van 16 slagen naar beide kanten (Nuuttila). Op papier is alpha 1 dus iets beter dan een vast percentage, en dat is het enige punt waar het iets kan toevoegen.
- Het vraagt een eigen test: fris, oplopend van rustig naar zwaar in 15 tot 25 minuten, en zonder storing in de band. Een gewone loop of de testloop levert het niet (afgeleid uit de protocollen van de studies).

Oordeel: niet bouwen als fundering. De vraag is nu wel concreet. Staat `hrv` in de `stream_types` van een loop met de band, dan kan een proef zonder bouwen (één oplopende loop, achteraf doorgerekend) laten zien of de eerste drempel van de eigenaar er geloofwaardig uitkomt naast de praattest. Staat hij er niet in, dan eerst Log HRV aanzetten en de band over ANT+ koppelen, één loop lopen en opnieuw kijken. Pas als dat niets geeft blijft AlphaHRV over, en dat is de moeite pas waard als de praattest onbevredigend blijkt.

### Wat dit samen zegt over de nauwkeurigheid

De ruis van één hartslagmeting bij een vaste, stevige inspanning is van dag tot dag 1,1 tot 1,4 procent, dat is 2 tot 3 slagen ([Lamberts e.a. 2004](https://pubmed.ncbi.nlm.nih.gov/15320683/), 44 mensen, vijf dagen op rij) (bewijs: matig tot sterk), en in een meta-analyse 1,6 procentpunt van de maximale hartslag, ongeveer 3 slagen ([Shushan e.a. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10039193/)) (bewijs: sterk, teamsporters). Dat zijn metingen onder gelijke omstandigheden. Een maximale test buiten hangt ook af van je indeling, je zin en het weer; ik reken daarom met 3 tot 4 slagen voor één test (gok, aan de voorzichtige kant).

Alles bij elkaar, voor één test met een borstband, fris, bij koel weer:

- de definitie: 3 tot 4 slagen naar boven of beneden (hoofdstuk 1);
- de dag: 3 tot 4 slagen;
- tegen het lab per persoon: 8 slagen standaardfout (McGehee), waar de twee hierboven al in zitten.

Eerlijk gezegd is "ongeveer 5 slagen naar boven of beneden" het beste wat een veldtest kan beloven (afgeleid). Meer cijfers achter de komma zijn schijn. Winst zit niet in een betere factor, maar in drie dingen: slechte tests weren, meerdere tests samen nemen, en de uitkomst toetsen aan hoe het loopt (praattest, hartslag in een tempoblok).

## 3. Korte submaximale tests om vorm en vermoeidheid te volgen

### De submaximale test van intervals.icu

Wat het is, gelezen in het eerste bericht van de ontwikkelaar (bijgewerkt eind oktober 2026) en in de specificatie ([forum](https://forum.intervals.icu/t/automatic-submaximal-fatigue-testing/132525); [specificatie](https://intervals.icu/api/v1/docs)) (zeker):

- Na je gewone warming-up 3 minuten gelijkmatig op een vast testtempo, standaard 105 procent van je drempeltempo (fietsen: 110 procent van je FTP). Daarna een minuut zo stil mogelijk staan, voor het hartslagherstel. In de eerste 20 tot 40 minuten van een frisse training. Ongeveer eens per week.
- Het testtempo zet je aan het begin van het seizoen vast en verander je niet als je beter wordt. Alleen tests binnen 5 procent van hetzelfde tempo worden vergeleken.
- Gemeten: de gemiddelde hartslag van de laatste minuut (als tempo per hartslag), hoe snel de hartslag opkomt, je zwaarte van 1 tot 10, en hoeveel de hartslag zakt in de minuut erna. Zonder ingevulde zwaarte geen uitslag. De eerste uitslag komt pas na drie eerdere tests binnen 90 dagen.
- De uitslag is Groen, Binnen de ruis, Oranje, Rood of Te weinig gegevens. Een verandering heet duidelijk bij ongeveer twee keer je eigen spreiding van test tot test.
- Het advies erbij: een borstband en geen pols, zelfde tijdstip, zelfde koffie, zelfde plek in je week.
- Wat de makers er zelf bij zeggen: "The cut-offs have not been validated", "It does not replace a maximal test for setting training zones", en bij Groen: bevestig met een maximale test voordat je je zones verandert.
- Het is een betaalde functie. De velden staan op de activiteit (`submax_fatigue_test`: `final_bpm`, `hrrc`, `hr_rise`, `hr_response_secs`, `efficiency_factor`, `cv`, `average_mps`, `rpe`, `status`) en in de sportinstellingen (`sft_type`, `sft_duration`, `sft_threshold_pace`, `sft_target_percent`, `sft_tolerance_percent`, `sft_max_cv_percent`, `sft_max_start_secs`). De eerdere zin in `Loopgegevens en vooruitgang.md` klopte.

ASCEND heeft die functie niet nodig: alles wat de test meet staat in de reeksen die de app al ophaalt (tijd, afstand, snelheid, hartslag). De opzet is een vereenvoudiging van de test van Lamberts hieronder.

### De test van Lamberts en de loopvarianten

Een test met de naam "Lamberts Submaximal Running Test" vond ik niet. Wat bestaat:

- De fietstest (LSCT): 6 minuten op 60 procent van de maximale hartslag, 6 minuten op 80, 3 minuten op 90, dan 1 minuut herstel. Je houdt de hartslag vast en meet het vermogen, de zwaarte en het herstel. Bij 17 goed getrainde renners was dat herhaalbaar (fout 1,3 tot 4,4 procent) en voorspelde het vermogen in de laatste stap de prestatie (samenhang 0,91 tot 0,94), het herstel minder (0,55 tot 0,68) ([Lamberts e.a. 2011](https://pubmed.ncbi.nlm.nih.gov/19622525/)) (bewijs: matig).
- De loopvoorganger (HIMS, een pendeltest in stappen): de hartslag schommelt van dag tot dag het minst bij een stevige inspanning. Aan het eind van een stap op 85 tot 90 procent van de maximale hartslag was dat 3 slagen (standaardafwijking 1) ([Lamberts en Lambert 2009](https://pubmed.ncbi.nlm.nih.gov/19387374/), 38 mensen) (bewijs: matig). Het hartslagherstel is het best te volgen na 86 tot 93 procent van de maximale hartslag; dan zakt de meetfout van 6 à 7 naar 3 slagen ([Lamberts e.a. 2011, herstel](https://pubmed.ncbi.nlm.nih.gov/21618159/)) (bewijs: matig).
- Een looptest bij getrainde duursporters: 6 minuten op 70 procent, 6 op 80 en 3 op 90 procent van de maximale hartslag, daarna 2 minuten herstel. Bij 35 getrainde mannen en vrouwen over 18 weken, elke vier weken getest, was de loopsnelheid in de laatste stap de gevoeligste maat voor vooruitgang; hartslagherstel, hartslagvariabiliteit en sprongkracht hingen niet samen met de verandering in prestatie. De auteurs noemen de test wekelijks te doen zonder de gewone training te storen ([Vesterinen e.a. 2017](https://pubmed.ncbi.nlm.nih.gov/27100319/)) (bewijs: matig).

### Hartslag bij een vast tempo

- De hartslag in de laatste minuut van een stuk van 4 tot 5 minuten heeft een fout van ongeveer 3 procent en een kleinste zinvolle verandering van ongeveer 1 procent; er zijn 3 tot 4 minuten nodig voor de hartslag bij is; vier tests samen halveren de ruis; eens per week is genoeg ([Buchheit 2014](https://pubmed.ncbi.nlm.nih.gov/24578692/)) (bewijs: matig, review). De hartslag volgt een tempowissel met een tijdconstante van ongeveer een minuut (zie `Tempo bij zone 2, stabiele stukken.md`).
- Meta-analyse: fout 1,6 procentpunt van de maximale hartslag; een verandering tussen twee losse tests is pas met 80 procent zekerheid echt vanaf 2,9 procentpunt en met 95 procent vanaf 4,4. Bij een maximale hartslag van 188 is dat 5,5 en 8,3 slagen. Duur en zwaarte van de test maakten voor de herhaalbaarheid weinig uit; 3 tot 4 minuten is genoeg ([Shushan e.a. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10039193/)) (bewijs: sterk voor de herhaalbaarheid; of je er één persoon over maanden mee kunt volgen, noemen de auteurs zelf nog niet onderzocht).
- In loopsporten hing een lagere hartslag bij een vast tempo in de meeste studies samen met betere conditie (samenhang 0,51 tot 0,88), in drie studies niet; een test op 90 procent van de maximale hartslag deed het beter dan een op 70 procent ([Schimpchen e.a. 2023](https://pubmed.ncbi.nlm.nih.gov/36332619/), 14 studies, 515 sporters) (bewijs: matig).
- Bij 14 matig getrainde lopers zakte de hartslag bij een vast tempo geleidelijk over 8 weken training ([Buchheit e.a. 2010](https://pubmed.ncbi.nlm.nih.gov/20033207/)) (bewijs: zwak tot matig).
- Maar de maat raakt verzadigd. Bij 18 beginners zakte de hartslag bij een vast tempo in een jaar met 11 slagen; 93 procent daarvan zat in de eerste drie maanden en op de baan veranderde er na week 9 niets meer, terwijl de VO2max bleef stijgen ([Scharhag-Rosenberger e.a. 2009](https://pubmed.ncbi.nlm.nih.gov/19346973/)) (bewijs: matig). Derde ongemakkelijke waarheid: wie al maanden loopt, ziet aan deze test weinig vooruitgang meer.

### Hartslagherstel

Hoeveel de hartslag zakt in de eerste minuut na de inspanning is ruw: een fout van 15 tot 32 procent in de ene studie, ongeveer 20 procent in een andere ([Al Haddad e.a. 2011](https://pubmed.ncbi.nlm.nih.gov/21574126/); [Bosquet e.a. 2008](https://pubmed.ncbi.nlm.nih.gov/17614018/)) (bewijs: matig), al noemt een review de eerste minuut meestal bruikbaar ([Fecchio e.a. 2019](https://pubmed.ncbi.nlm.nih.gov/31493664/)). En het wijst twee kanten op: sneller herstel hoort bij fitter worden, maar ook bij overbelasting. Overbelaste triatleten herstelden na een stuk lopen op 11 km per uur 16 slagen sneller dan voorheen, tegen 3 in de controlegroep, terwijl ze slechter presteerden ([Le Meur e.a. 2017](https://pubmed.ncbi.nlm.nih.gov/27617566/); [Aubry e.a. 2015](https://pubmed.ncbi.nlm.nih.gov/26488766/); meta-analyse [Manresa-Rocamora e.a. 2021](https://pubmed.ncbi.nlm.nih.gov/33533045/)) (bewijs: matig tot sterk). In loopsporten zijn de uitkomsten voor conditie onduidelijk (Schimpchen 2023). Oordeel: meten mag, het kost een minuut, maar het is achtergrond en nooit een uitslag op zichzelf.

### Fitter of moe: de hartslag alleen zegt het niet

Dit is het belangrijkste punt van het hele hoofdstuk. Een lagere hartslag bij hetzelfde tempo betekent meestal fitter, maar ook acute overbelasting geeft een lagere hartslag: het hart komt trager en minder ver op.

- Na zes zware dagen reden 23 renners bij dezelfde hartslag meer vermogen, maar het voelde ook duidelijk zwaarder, en hun hartslag herstelde sneller; de auteurs zeggen dat je meerdere maten samen moet lezen ([Hammes e.a. 2016](https://pubmed.ncbi.nlm.nih.gov/26263163/)) (bewijs: matig), en een review van 12 studies over vaste fietstests zegt hetzelfde ([Capostagno e.a. 2016](https://pubmed.ncbi.nlm.nih.gov/27701968/)) (bewijs: matig). Bij zes profrensters hetzelfde, en soms haalden ze de 90 procent niet eens; na drie dagen rust was alles terug ([Decroix e.a. 2018](https://pubmed.ncbi.nlm.nih.gov/28422523/)) (bewijs: zwak, klein).
- Een review van 12 studies vat het samen: bij overbelasting zie je in een vaste test een lagere hartslag bij hetzelfde werk, een hogere zwaarte en een sneller herstel; in een tijdrit een lager tempo en een lagere hartslag ([Roete e.a. 2021](https://pubmed.ncbi.nlm.nih.gov/34108275/)) (bewijs: matig).
- Een hogere hartslag is geen duidelijk teken van vermoeidheid of verlies (Buchheit 2014). Eerst denken aan warmte, vocht, slaap of een beginnende verkoudheid.

Daaruit volgt de leesregel (afgeleid, in lijn met wat intervals.icu doet):

- hartslag lager, voelde even zwaar of lichter: waarschijnlijk fitter;
- hartslag lager, voelde zwaarder: waarschijnlijk moe, niet fitter;
- hartslag hoger: eerst omstandigheden, dan pas conditie;
- alles binnen je eigen spreiding: niets aan de hand.

Wat die review over de tijdrit zegt, geldt ook voor de drempeltest: een testloop in een zware week geeft een lagere hartslag en dus een te lage drempel.

### Hoe vaak, en wat een echte verandering is

- Hoe vaak: eens per week is wat de studies en de praktijk doen (Buchheit 2014; Vesterinen noemt wekelijks haalbaar; intervals.icu). Minder vaak dan eens per twee weken geeft te weinig punten om de ruis weg te middelen (afgeleid).
- Ruis: 2 tot 3 slagen onder gelijke omstandigheden; buiten reken ik met 3 (gok).
- Eén test tegen het midden van je vorige vier: een verschil is pas waarschijnlijk echt vanaf ongeveer 4 slagen en duidelijk vanaf ongeveer 6 (afgeleid: de spreiding van zo'n verschil is 3 slagen maal de wortel van 1 plus een kwart, dus 3,4; maal 1,28 geeft 4,3 voor 80 procent zekerheid; duidelijk noem ik het bij twee keer je eigen ruis, 6 slagen, zoals intervals.icu doet).
- Wat je mag verwachten: bij een beginner 10 slagen in de eerste twee tot drie maanden, daarna weinig (Scharhag-Rosenberger). Bij wie al traint een paar slagen per blok, dus even groot als de ruis. Alleen een reeks zegt iets, nooit één test.

### Relatie met Tempo bij zone 2 en met de testloop

`aerobicTrend.ts` meet hetzelfde idee (tempo bij een vaste hartslag) op elke rustige loop, gratis, maar bij een lage inspanning, waar de hartslag van dag tot dag het meest schommelt (Lamberts 2004 en 2009) en waar de samenhang met conditie zwakker is (Schimpchen: 0,24 tot 0,52 tegen 0,52 tot 0,79). De korte test meet één keer per week bij een stevige inspanning, met minder ruis en met de zwaarte erbij. Ze vullen elkaar aan: Tempo bij zone 2 is de brede basis, de korte test is het scherpe punt en de enige van de twee die moe van fit kan scheiden. De testloop blijft de enige die tempo's en zones mag veranderen.

## 4. Wat de meting verstoort en hoe de app dat opvangt

De grootste storing eerst en apart, omdat de eigenaar ernaar vroeg: de pols tegen de borstband. Daarna de rest.

### De pols tegen de borstband: hoe groot de fout is

- Een borstband is vrijwel gelijk aan een ECG: een overeenstemming van 0,98 tot 0,996 ([Pasadyn e.a. 2019](https://pubmed.ncbi.nlm.nih.gov/31555543/); [Gillinov e.a. 2017](https://pubmed.ncbi.nlm.nih.gov/28709155/)) (bewijs: sterk). Dat is een fout van ongeveer 1 procent, 1 tot 2 slagen.
- Een Garmin aan de pols bij hardlopen doet het duidelijk minder. Op de loopband tot 14,5 km per uur een overeenstemming van 0,89 (Vivosmart HR, 50 sporters, Pasadyn 2019). Een fout van 2,9 tot 9,2 procent, afhankelijk van het tempo (Fenix 5, 25 mensen, [Düking e.a. 2020](https://pubmed.ncbi.nlm.nih.gov/32374274/)). In intervallen op de loopband gemiddeld goed, maar met een spreiding van 9,4 procent (vívosmart HR+, 20 mensen, [Reddy e.a. 2018](https://pubmed.ncbi.nlm.nih.gov/30530451/)). Buiten op een heuvelpad 13 procent ernaast tegen 2 procent voor de band (Fenix 5, [Navalta e.a. 2020](https://pubmed.ncbi.nlm.nih.gov/32866216/)), en een overeenstemming die zakt bij hoger tempo ([Støve e.a. 2019](https://pubmed.ncbi.nlm.nih.gov/30326780/)) (bewijs: matig tot sterk dat de pols bij hard lopen slechter is; de modellen zijn ouder dan de 255).
- De huidige sensor (dezelfde generatie als in de 255) is beter, maar heeft dezelfde zwakte. In een studie met vier optische sensoren, waaronder een Venu 2S aan de pols, was de gemiddelde fout over een hele dag 2 tot 5 procent, maar de Garmin telde 16 procent te weinig tijd in zware inspanning, en sensoren op de bovenarm deden het steeds beter dan de pols, vooral bij veel armbeweging en hoge intensiteit ([Neudorfer e.a. 2024](https://pubmed.ncbi.nlm.nih.gov/39508366/), 32 mensen; ook [Moghaddam e.a. 2025](https://pubmed.ncbi.nlm.nih.gov/41516615/)) (bewijs: matig). Voor de Forerunner 255 zelf vond ik geen studie.
- Gemiddeld over veel mensen is er geen afwijking: een halve slag op de loopband ([Zhang e.a. 2020](https://pubmed.ncbi.nlm.nih.gov/32552580/), 44 studies) (bewijs: sterk). De pols zit dus niet steeds te hoog of te laag; je weet alleen per loop niet of hij klopte.
- Waarom: bewegingsruis, een sensor die het ritme van je stappen aanziet voor je hartslag, en achterlopen bij elke wisseling, te laag als de hartslag stijgt en te hoog als hij daalt ([Bent e.a. 2020](https://pubmed.ncbi.nlm.nih.gov/32047863/); [Horton e.a. 2017](https://pubmed.ncbi.nlm.nih.gov/29135785/)) (bewijs: matig). Garmin raadt in de handleiding van de 255 zelf aan om voor een goede polsmeting 5 tot 10 minuten op te warmen, en in de kou binnen (zeker).

In slagen: bij een hartslag van 175 is 1 procent 2 slagen, en 3 tot 9 procent 5 tot 16 slagen. De hele nauwkeurigheid van een drempeltest is ongeveer 5 slagen (hoofdstuk 2). De pols verbruikt die marge in zijn eentje (afgeleid). Voor de korte test geldt het dubbel: de minuut herstel na het teststuk is precies de snelle wisseling waar de pols achterloopt. Garmin vraagt voor zijn eigen drempelmeting ook een borstband, en de eigenaar noemt de polsmeting van zijn Forerunner 255 zelf onbetrouwbaar (uit de opdracht).

### Kan de app zien welke sensor een loop had?

- Niet rechtstreeks. intervals.icu geeft per activiteit de naam van het horloge (`device_name`) en of er hartslag is (`has_heartrate`), maar geen veld voor de hartslagsensor (zeker, specificatie).
- Wel indirect, en dat doet ASCEND al. De balans van de grondcontacttijd komt alleen van een accessoire op de romp: de handleiding van de 255 zegt dat de balans alleen beschikbaar is met een loopdynamiek-accessoire, en dat het horloge de hartslag van de borstband gebruikt zodra die er is (zeker). Staat de reeks `stance_time_balance` in een loop, dan was de band om en kwam de hartslag van de band (afgeleid). `activityDetail.ts` zet daarom `chestStrapSeen` zodra die reeks voor minstens 10 procent gevuld is (zeker).
- Dat teken heeft vijf gaten. Een band van een ander merk geeft wel hartslag maar geen balans: de app ziet hem niet. Een HRM-Pro Plus die over Bluetooth aan het horloge hangt in plaats van over ANT+ geeft ook geen balans (de loopdynamiek gaat alleen over ANT+, handleiding van de band): de app ziet hem dan evenmin. Een losse loopdynamiek-pod geeft balans zonder hartslag (zeldzaam). Bij wandelen bestaat de balans niet. En 10 procent over de hele loop zegt niet dat de band er tijdens het teststuk was: valt de verbinding weg, dan gaat het horloge stil verder op de pols.
- Zeker weten kan alleen uit het oorspronkelijke bestand van het horloge. Daarin staat per gekoppelde sensor een regel met soort, merk en type. Het bestand is op te halen, maar ASCEND heeft geen FIT-lezer (afgeleid uit de bestandsindeling; niet geprobeerd, ook niet of dat verzoek vanuit een webapp mag).
- Een RR-reeks, als die er is, bewijst ook een band: de pols levert geen bruikbare slag-tot-slag-tijden (hoofdstuk 2).

### Wat ASCEND ermee doet

- De regel: een test zet je drempel alleen als de band er tijdens het teststuk aantoonbaar was. De balansreeks dekt minstens 90 procent van het teststuk (gok voor het getal). Voor wie een band of armband van een ander merk draagt, geldt de bestaande instelling "Hartslag van de borstband" als ja.
- Slim met de historie: draagt bijna elke loop van de laatste weken het teken van de band en deze test niet, dan vertrouwt de app de instelling niet blind maar vraagt hij het: "Bij deze test zag ASCEND je borstband niet. Had je hem om?" (afgeleid; de grens, bijvoorbeeld zes van de laatste tien lopen, is een gok).
- Zeggen op vier plekken. Vooraf, in de Briefing en op Vandaag op een testdag: "Borstband om. Zonder band telt je test voor je tempo's, niet voor je drempel." In het voorstel: "Gemeten met je borstband, over de laatste 20 minuten." Achteraf zonder band: "Bij deze test zag ASCEND geen borstband. Je tempo's tellen. Je drempel blijft 176." met de tekstknop "Ik had hem wel om". En in de uitleg bij Drempel, die er sinds 16 november al om vraagt, de reden in één zin: "Aan de pols zit een horloge er bij hard lopen 5 tot 15 slagen naast, een borstband 1 tot 2."
- Dezelfde regel voor de korte test: zonder band wel de feiten, geen oordeel en geen plek in je eigen midden.
- Ook een band kan storen: droge elektroden in de eerste minuten, een losse band, en statische lading van een synthetisch shirt (handleiding van de band, zie hoofdstuk 6). De toets op gaten en sprongen in de reeks geldt daarom ook met band.

### Zonder borstband: wat doet de app dan?

Mijn advies, in volgorde.

1. Standaard telt een test zonder band niet voor de drempel. Zo iemand houdt wat wel klopt: tempo's uit de tijd van de test (die hangen niet aan de hartslag), zones uit de maximale hartslag of uit een drempel die hij zelf invult, de praattest voor de grens van rustig, en zwaarte als stuur. De app zegt dat erbij, zonder verwijt.
2. Een armband met een optische sensor is een goed alternatief voor wie geen borstband wil. Bij trailrunnen bleef een Polar Verity Sense op de bovenarm binnen 5 procent van een borstband, met een overeenstemming boven 0,9 ([Navalta e.a. 2023](https://pubmed.ncbi.nlm.nih.gov/37474743/)); in een eerdere proef van dezelfde groep zat een horloge aan de pols er 13 procent naast. Bij wandelen en fietsen tot hoge intensiteit week een Polar OH1 gemiddeld 0,3 slag af van een ECG, met grenzen van ongeveer 5 slagen ([Hettiarachchi e.a. 2019](https://pubmed.ncbi.nlm.nih.gov/31120968/), 24 mensen), en de bovenarm deed het steeds beter dan de pols (Neudorfer 2024) (bewijs: matig). De app kan zo'n band niet zien; de gebruiker zet de instelling aan. Die kan dan beter "Hartslag van een borstband of armband" heten.
3. Wie toch op de pols wil testen, kan dat als bewuste keuze aanzetten: "Telt met ruime marge". Dan gelden drie remmen: de reeks moet de toets op gaten, sprongen en gelijk lopen met de cadans doorstaan; een voorstel komt pas als twee tests binnen 5 slagen van elkaar liggen; en het voorstel toont een marge van 10 slagen in plaats van 5 (alle drie een gok). Nooit één test, nooit stil.

Niet testen is geen goed antwoord: de test is ook zonder hartslag waardevol, voor de tempo's. Het antwoord is: wel testen, de hartslag niet geloven.

### De andere storingen

Per storing: wat het doet, hoe sterk het bewijs is, en wat ASCEND ermee hoort te doen. De getallen voor de poorten zijn een gok tenzij er iets anders staat.

- Hartslagdrift. 8 slagen tussen minuut 10 en 30 op drempeltempo (Vobejda 2013) (bewijs: matig). Voor de drempeltest: altijd hetzelfde venster, de laatste 20 minuten. Voor de korte test: altijd op hetzelfde moment in de loop beginnen, na 10 minuten inlopen, want een test na 40 minuten geeft door drift een hogere hartslag.
- Warmte. Onder ongeveer 20 graden gevoelstemperatuur weinig, daarboven snel meer: ongeveer 0,7 slag per graad tussen 15 en 25 graden en 1,5 daarboven (zwak, zie `Tempo bij zone 2, stabiele stukken.md`). Ook in een voluit gereden tijdrit: bij 35 graden lag de hartslag de hele rit ongeveer 8 slagen hoger dan bij 20 graden, bij 13 procent minder vermogen ([Périard e.a. 2011](https://pubmed.ncbi.nlm.nih.gov/20851861/), 8 fietsers, een uur), en een halfuur voluit bij 32 graden kostte 6,5 procent vermogen tegen 23 graden ([Tatterson e.a. 2000](https://pubmed.ncbi.nlm.nih.gov/11104310/), 11 fietsers) (bewijs: matig; fietsen). Warmte maakt een test dus trager en duwt de drempelschatting omhoog. Voor de app: dezelfde grenzen als `zone2Rules.ts`. Boven 25 graden gevoelstemperatuur telt een test niet voor de drempel en de korte test krijgt geen oordeel; tussen 20 en 25 telt hij met de zin dat het warm was.
- Vocht. Ongeveer 3 slagen erbij per procent lichaamsgewicht dat je verliest, in de warmte ([Adams e.a. 2014](https://pubmed.ncbi.nlm.nih.gov/24736771/), 20 studies) (bewijs: matig). De app meet het niet; het valt onder de warmtepoort.
- Hoogte. In dunne lucht (15 procent zuurstof, een nagebootste hoogte van ruim 2.500 m) was de snelheid bij de drempel 13 procent lager en de hartslag bij de drempel 5 slagen lager; wie op hoogte op zijn hartslag van thuis loopt, loopt relatief zwaarder ([Friedmann e.a. 2004](https://pubmed.ncbi.nlm.nih.gov/15595295/), 11 lopers) (bewijs: matig). Voor de app: geen test boven ongeveer 1.500 m laten tellen (gok voor de grens). En een punt voor later, buiten deze vraag: op tochtdagen op hoogte horen de hartslaggrenzen een paar slagen lager te liggen.
- Ziekte. Een gewone neusverkoudheid veranderde bij 45 jongvolwassenen de reactie op rustige en maximale inspanning niet ([Weidner e.a. 1997](https://pubmed.ncbi.nlm.nih.gov/9140895/)) (bewijs: matig), en een review vindt bij milde infecties weinig effect op het uithoudingsvermogen maar bij ernstiger infecties wel, en het trainingsvermogen kan er weken onder lijden ([Kaulback e.a. 2023](https://pubmed.ncbi.nlm.nih.gov/35695464/)) (bewijs: matig). Klachten duren gemiddeld 7 dagen ([Snyders e.a. 2022](https://pubmed.ncbi.nlm.nih.gov/34789459/)). Hoe lang je na ziekte moet wachten met een maximale test heeft niemand gemeten; de adviezen zijn consensus ([Schwellnus e.a. 2022](https://pubmed.ncbi.nlm.nih.gov/35863871/)) (expert). Voor de app: sluit aan op wat er al is (`illness.ts`). Geen test die telt voor de drempel zolang je ziek gemeld bent of in de opbouw erna zit, en daarbovenop minstens 3 dagen klachtenvrij na neus of keel en minstens 7 dagen na koorts of buikgriep (gok, bewust voorzichtig). De korte test mag dan wel gelopen worden, maar krijgt geen oordeel en telt niet mee in je eigen midden.
- Slaap. Na een nacht zonder slaap liepen 11 mannen in 30 minuten 3 procent minder ver, met een hartslag die 4 slagen lager lag (170 tegen 174, niet significant) en dezelfde zwaarte ([Oliver e.a. 2009](https://pubmed.ncbi.nlm.nih.gov/19543909/)) (bewijs: matig; dit is precies de test van 30 minuten). Recreatieve lopers hielden het na een nacht zonder slaap 13 procent korter vol op de tweede drempel ([Seynaeve e.a. 2026](https://pubmed.ncbi.nlm.nih.gov/42421206/)) (bewijs: matig). Een slechte nacht maakt de test dus trager en de drempel eerder te laag. Voor de app: de bestaande vraag naar een korte nacht (`shortNight.ts`) meenemen als zin bij het voorstel; een test na een nacht die je zelf als kort hebt gemeld telt niet voor de drempel.
- Cafeïne. Geen effect op de hartslag bij vaste inspanning (26 studies), wel voelt het lichter (0,8 punt op de schaal van 6 tot 20) ([Glaister en Gissane 2018](https://pubmed.ncbi.nlm.nih.gov/28872376/)) (bewijs: sterk), en een tijdrit gaat een paar procent beter ([Southward e.a. 2018](https://pubmed.ncbi.nlm.nih.gov/29876876/)) (bewijs: sterk). Voor de app: niets rekenen. Eén zin in de uitleg van de korte test: doe het elke keer hetzelfde, want je zwaarte telt mee.
- Tijdstip. 's Middags en 's avonds ligt de hartslag bij dezelfde inspanning iets hoger dan 's ochtends en gaat een duurprestatie beter ([Kang e.a. 2023](https://pubmed.ncbi.nlm.nih.gov/37026733/), 31 studies) (bewijs: matig tot sterk, klein effect). Voor de app: de korte test vergelijkt alleen tests in hetzelfde dagdeel (voor of na 12 uur).
- Heuvels en wind. Ze veranderen het tempo, niet wat een maximale inspanning met je hartslag doet. Voor de drempeltest volstaan de regels die er al zijn (stilstaan, hoogtegrens voor een oordeel). Voor de korte test zijn ze beslissend, want daar is het tempo de vaste kant: alleen een vlak stuk (dezelfde vlakgrens als `zone2Rules.ts`), en geen oordeel bij wind tegen boven de grens die Run in detail al gebruikt.
- Vermoeidheid. Zie hoofdstuk 3: een test in een zware week geeft een lagere hartslag. De regel van 72 uur rust voor een test dekt het grootste deel. Voor de korte test: geen zware loop- of beendag in de 48 uur ervoor, anders wel tonen, niet meetellen.
- Indeling en inzet. Een test die je een 7 of lager gaf was waarschijnlijk niet maximaal (`testEffortRemark` zegt dat al); de hartslag is dan te laag voor een drempel. En een hartslag die in de laatste 10 minuten zakt terwijl het tempo ook zakt, is een loper die brak: niet tellen.
- Niet onderzocht: medicijnen die de hartslag remmen of versnellen, en de cyclus. Wie zoiets gebruikt, kan beter op gevoel en tempo sturen dan op een drempel uit een test.

## 5. Hoe vaak hertesten, en hoe een nieuwe drempel de oude vervangt

De drempelhartslag verandert veel minder dan je denkt. Het tempo bij de drempel schuift met je conditie; de hartslag bij de drempel nauwelijks.

- Bij 13 schaatsers steeg het vermogen bij de eerste drempel tussen voorjaar en najaar van 127 naar 162 watt en bij de tweede van 216 naar 230, terwijl de hartslag gelijk bleef (129 tegen 130 en 162 tegen 164). De auteurs: één goede meting kan lang mee ([Foster e.a. 1999](https://pubmed.ncbi.nlm.nih.gov/10211855/)) (bewijs: matig).
- Bij 13 profwielrenners, drie keer gemeten in een seizoen, hetzelfde: de hartslag bij de drempels bleef staan terwijl het vermogen steeg ([Lucía e.a. 2000](https://pubmed.ncbi.nlm.nih.gov/11039652/)) (bewijs: matig). Friel zegt hetzelfde uit ervaring.

Dat zijn getrainde sporters. Bij een beginner die in drie maanden veel fitter wordt, weet ik het niet zeker (geen bron gevonden). Maar de richting is duidelijk en heeft een groot gevolg: een nieuwe test die 3 of 4 slagen afwijkt van je drempel is veel vaker ruis dan verandering.

Hoe vaak ruis? Een rekensom (afgeleid, met 3,5 slagen ruis per test). Vergelijk je een nieuwe test met een drempel die zelf ook uit één test komt, dan is de spreiding van het verschil 5 slagen. De kans dat het verschil 3 slagen of meer is terwijl er niets veranderde, is dan 55 procent. Is de oude drempel precies goed, dan nog 39 procent. Met de huidige grens van 3 slagen geven dus vier tot vijf op de tien tests een voorstel om alles te verzetten, zonder reden. Elke keer stuurt de app daarna alle workouts opnieuw naar het horloge en leest hij je oude lopen in andere zones.

Neem je het midden van de laatste drie tests, dan verandert dat midden bij een nieuwe test met een spreiding van ongeveer 1,7 slag, en is de kans op een loos voorstel bij dezelfde grens van 3 slagen nog ongeveer 7 procent (afgeleid). Dat is het hele argument voor samen nemen.

Voorstel voor de regel:

- De drempel volgt de mediaan van je laatste drie geldige tests van de afgelopen 12 maanden (bij twee het gemiddelde, bij één die ene). De mediaan en niet het gemiddelde, zodat één rare dag niet doorweegt. Twaalf maanden omdat de maximale hartslag met de jaren zakt, ongeveer 0,7 slag per jaar (de formule van Tanaka: 208 min 0,7 maal je leeftijd), en een oude test dus langzaam te hoog wordt (afgeleid; de termijn is een gok).
- Een voorstel komt als die mediaan 3 slagen of meer afwijkt van de drempel die er staat. Bij één enkele test pas bij 5 slagen of meer (gok, uit de rekensom).
- Een test telt niet voor de drempel als een van de poorten uit hoofdstuk 4 dichtgaat: geen borstband, korter dan 24 of langer dan 40 minuten, zwaarte 7 of lager, warmer dan 25 graden gevoel, ziek of in de opbouw erna, een korte nacht die je zelf meldde, boven 1.500 m, stilstaan in het teststuk, een hartslag die instort, of gaten in de reeks. Voor je tempo's kan zo'n test gewoon tellen; dat zijn twee aparte vragen.
- Het voorstel zegt altijd op welke tests het rust en hoe breed de onzekerheid is: "176, waarschijnlijk tussen 171 en 181".
- Hertesten voor de hartslag hoeft zelden. Twee tot vier maximale tests per jaar is genoeg, en die staan er al voor de tempo's (de testlopen in het wedstrijdblok). Extra aanleiding: een half jaar geen geldige test, meer dan vier weken niet gelopen, of de korte test die drie keer op rij dezelfde kant op wijst.

## 6. Wat de eigenaar zelf kan aanleveren

### intervals.icu (zeker, uit de specificatie van 16 november 2026, tenzij anders gezegd)

- De reeksen per activiteit, die ASCEND al ophaalt: tijd, afstand, snelheid, hartslag, hoogte, cadans. Genoeg voor de drempel (laatste 20 minuten) en voor de hele korte test.
- Sportinstellingen voor hardlopen: `lthr`, `max_hr`, `hr_zones`, `threshold_pace`, `pace_zones`, en de instelling van de submaximale test (de `sft_`-velden). ASCEND leest nu alleen `lthr` en `max_hr`.
- Per activiteit: `icu_hrr` (hartslagherstel aan het eind van de activiteit: begin, eind, daling), `submax_fatigue_test` (alleen gevuld voor betalende gebruikers), `lthr` en `athlete_max_hr` zoals ze bij intervals.icu stonden.
- Per ochtend: `restingHR`, `hrv`, `sleepSecs`, `sleepScore` (leest ASCEND al), en ook `avgSleepingHR` en `respiration`.
- Het oorspronkelijke bestand van het horloge: `GET /api/v1/activity/{id}/file`.
- RR-intervallen: `hrv` is een gedocumenteerd streamtype (de ongefilterde RR-tijden, als het horloge ze opsloeg) en `dfa_a1` ook (als AlphaHRV het schreef). Of ze met `types=` via de API meekomen heb ik niet kunnen proberen (waarschijnlijk).

### De Forerunner 255 (zeker, uit de handleiding, tenzij anders gezegd)

- Hartslag van de pols of van een borstband; met beide gebruikt het horloge de band ("your watch uses the chest heart rate data"). Valt de band weg, dan gaat het horloge verder op de pols.
- Een eigen drempelschatting, volgens de handleiding alleen met borstband, automatisch tijdens een loop; de waarde staat op het horloge en in Garmin Connect en komt niet via intervals.icu mee (waarschijnlijk; sinds september 2026 filtert Garmin zijn afgeleide getallen uit wat partners krijgen, zie `Kansen met gegevens.md`).
- Data Recording staat op Smart (standaard) of Every Second. Voor een test van 4 minuten en een herstel van precies 60 seconden is Every Second nodig.
- De handleiding noemt geen instelling om RR-intervallen tijdens een activiteit te bewaren, maar eigenaren van een 255 melden hem wel: Log HRV, bij System en Data Recording, standaard uit (zwak, zie hoofdstuk 2). Geen HRV-stresstest. Loopdynamiek aan de pols (cadans, verticale beweging, grondcontacttijd, staplengte, verticale ratio); de balans alleen met een accessoire.
- Workouts met stappen op tempo werken al (`watchWorkout.ts` schrijft een tempobereik als doel, en dat komt op het horloge aan).

### De HRM-Pro Plus (zeker, uit de handleiding van Garmin, tenzij anders gezegd)

- Hartslag uit elektroden op de borst, over ANT+ en Bluetooth. Dit is het onderdeel dat telt voor elke test.
- De tijd tussen de slagen, voor hartslagvariabiliteit (expert: vergelijkingstabel van Garmin, gelezen bij een winkel). Over Bluetooth komt die niet altijd mee (zwak, zie hoofdstuk 2); over ANT+ wel.
- Zes loopmaten uit een versnellingsmeter op de romp: cadans, verticale beweging, grondcontacttijd, de balans van de grondcontacttijd tussen links en rechts, staplengte en verticale ratio. Alleen over ANT+, niet over Bluetooth, en grondcontacttijd en balans niet bij wandelen.
- Tempo en afstand zonder GPS, voor de loopband.
- Opslag van de hartslag in de band zelf, voor als het horloge even buiten bereik is.
- Tips van Garmin bij een grillige hartslag: elektroden nat maken, de band strakker, 5 tot 10 minuten opwarmen, en een katoenen shirt, omdat synthetische stof statische storing kan geven.

Wat voegt de loopdynamiek toe aan de test?

- Aan de drempel zelf niets: die is een hartslag.
- Het bewijs dat de band om was: de balans (hoofdstuk 4). Dat is nu de nuttigste bijdrage.
- Uitleg bij een test die instort: langer grondcontact en een lagere cadans in het laatste derde bij hetzelfde tempo passen bij vermoeide benen (zie `Loopgegevens en vooruitgang.md`); Run in detail heeft die getallen al.
- Een extra feit bij de korte test. Op een vast tempo zijn grondcontacttijd en cadans van dag tot dag stabiel (1 tot 2 procent, zie `Loopgegevens en vooruitgang.md`), en na een nacht zonder slaap liepen recreatieve lopers op vaste tempo's met langer grondcontact en een lagere cadans (Seynaeve 2026) (bewijs: matig voor het verschijnsel; dat je er bij één persoon vermoeidheid mee ziet is afgeleid). Voorstel: grondcontacttijd en cadans van het teststuk meeschrijven als feit, zonder oordeel, en na acht tot tien tests kijken of ze iets zeggen.
- Het tempo van de band op de loopband maakt een korte test binnen mogelijk, maar dat blijft een eigen reeks.

### Wat hij kan doen, in volgorde van nut

1. Bij elke test de borstband om, over ANT+ aan het horloge gekoppeld (bij de sensor op het horloge staat welke verbinding hij gebruikt), en op het horloge bij de systeeminstellingen de opslag van gegevens op elke seconde zetten (in het Engels: System, Data Recording, Every Second). Staat daar ook Log HRV, zet die dan aan: het kost niets en bewaart de RR-tijden voor later.
2. Eén keer de drempel noteren die het horloge zelf schat (op het horloge bij de hartslagzones, of in Garmin Connect). Als tweede mening, niet om over te nemen.
3. Eén verzoek met zijn eigen sleutel, vijf minuten werk, dat drie onzekerheden wegneemt: `/api/v1/athlete/{id}/activities?oldest=2026-10-20&newest=2026-11-16&fields=id,name,type,stream_types,icu_hrr,lthr,athlete_max_hr,submax_fatigue_test`. Staat `hrv` of `dfa_a1` in `stream_types`? Is `icu_hrr` gevuld? Welke drempel hangt er aan zijn activiteiten? Voor `hrv` telt alleen een loop van na het aanzetten van Log HRV.
4. De eerstvolgende rustige loop de praattest doen: in het laatste kwartier een paar volle zinnen hardop, en onthouden bij welke hartslag dat nog net comfortabel ging.

## 7. De factor 0,98: het oordeel

Het getal hoeft niet te veranderen. Wat eromheen staat wel.

- Niet veranderen, omdat er geen bewijs is dat een ander getal beter is. De ruimte die de definitie openlaat loopt van 0,96 tot 1,00; 0,98 is het midden; het verschil met de randen is 3 tot 4 slagen en dat is de ruis van één test. Een wijziging naar 1,00 (Friel) of 0,97 zou de zones van de eigenaar verschuiven zonder dat iemand kan zeggen dat ze er beter van worden. En de voorzichtige kant is de goede kant: te hoog is schadelijker dan te laag.
- Wel veranderen: het venster wordt de laatste 20 minuten van de inspanning in plaats van kilometer 2 tot en met 5 (voor een test van 29 minuten is dat vrijwel hetzelfde; het verschil zit bij snellere lopers). De factor geldt alleen voor een inspanning van 24 tot 40 minuten; daarbuiten doet de app geen drempelvoorstel en zegt hij waarom. En de uitleg zegt eerlijk wat het is: een keuze tussen twee lezingen, geen meting.
- Als instelling: "Drempel uit je test", met Voorzichtig (98 procent, het advies) en Zoals Friel (100 procent). Wie zijn zones naast TrainingPeaks of een boek van Friel legt, kan dan dezelfde getallen krijgen.
- Belangrijker dan de factor zijn de poorten (borstband, duur, warmte, inzet) en het samen nemen van drie tests. Daar zit de winst.

## 8. Voorstel voor ASCEND in stappen

Volgorde naar waarde voor de fundering. Elke stap is los te bouwen. Alle namen zijn voorstellen. Wat voor elke stap geldt: alles leest `countedTests` en nooit een eigen "laatste test"; afgeleide velden zijn append-only; een andere drempel verandert de vingerafdruk van elke workout op het horloge, dus oud en nieuw vergelijken over alle trainingen; `planGolden.test.ts` beweegt niet; elke instelling komt ook in `settingsDefs` en `settingsSummary.ts`; tekstkaart en kennisindex vergelijken.

### Stap 1. De schatting eerlijk maken

- Wat je ziet en doet: op een testdag staat in de Briefing en op Vandaag één regel: "Borstband om. Zonder band telt je test voor je tempo's, niet voor je drempel." Na de testloop hetzelfde voorstel als nu, met drie dingen erbij. De marge ("176, waarschijnlijk tussen 171 en 181"), de basis ("Gemeten met je borstband, over de laatste 20 minuten.") en, als de test niet telt voor je drempel, één zin waarom ("Je test duurde 22 minuten. Goed voor je tempo's, te kort voor je drempel." of "Bij deze test zag ASCEND geen borstband. Je tempo's tellen. Je drempel blijft 176." met de tekstknop "Ik had hem wel om"). Verder doe je niets anders dan nu: Akkoord of Liever niet.
- Engine: `engine/thresholdEstimate.ts#lthrFromEffort(log, streams)` geeft `{ lthr, low, high, basis, minutes }` of `{ unavailable: reden }`. Met de reeks: de laatste 20 minuten van het teststuk. Zonder reeks: kilometer 2 tot en met 5, zoals nu, met de basis erbij gezegd. `#thresholdGate(log, context)` voor de poorten uit hoofdstuk 4 en 5. `engine/hrTrust.ts#hrTrust(streams, detail)` voor gaten, sprongen en gelijk lopen met de cadans; `#strapDuring(streams, van, tot)` zegt of de balansreeks het teststuk dekt, en `#strapExpected(logs)` of bijna elke recente loop het teken van de band draagt (hoofdstuk 4). Het antwoord "Ik had hem wel om" staat per log naast de logs, zoals `testJudgments`. De drempels bij elkaar in één bestand, zoals `zone2Rules.ts`. `zoneOffer` leest dit.
- Instelling: "Drempel uit je test" (Voorzichtig, 98 procent; advies) met één zin: "Je hartslag loopt in een halfuur voluit hoger op dan in een stappentest; ASCEND trekt er 2 procent af." En "Test zonder borstband" met Telt niet voor je drempel (advies) en Telt met ruime marge, "Aan de pols zit een horloge er bij hard lopen 5 tot 15 slagen naast." De bestaande instelling "Hartslag van de borstband" blijft het ja voor wie een band of armband van een ander merk draagt.
- Via Akkoord: elke nieuwe drempel, zoals nu. Een andere stand van de instelling verandert niets stil; hij geeft hoogstens een nieuw voorstel.
- Randgevallen die een test nodig hebben: 23:59 tegen 24:00 minuten en 40:00 tegen 40:01; reeks ontbreekt (terugval op kilometers); instelling uit en geen teken van een band; de band valt halverwege het teststuk weg (balans dekt 60 procent); een band van een ander merk met de instelling aan; "Ik had hem wel om" op een test zonder teken; de keuze Telt met ruime marge met één en met twee tests; een gat van twee minuten in de hartslag; hartslag gelijk aan cadans over tien minuten; hartslag en tempo die samen zakken in de laatste tien minuten; zwaarte 7; 26 graden gevoel; ziek gemeld en de dagen erna; ingekort log; verouderde `runDetail`; een loopbandtest; een test met stilstaan.
- Niet zeker: de grenzen 24 en 40 minuten, de marge van 5 slagen, de 90 procent dekking en de toets op cadans zijn een gok. Of de balansreeks bij de eigenaar in elke loop met de band zit, is in zijn eigen logs na te tellen (`chestStrapSeen`); dat hoort Sherpa eerst te doen.

### Stap 2. Drie tests samen in plaats van één

- Wat je ziet en doet: in het voorstel staan de tests waar het op rust ("Je laatste drie tests: 174, 177 en 176. Het midden is 176."). Een test die weinig afwijkt geeft geen voorstel meer. Verder niets.
- Engine: `thresholdEstimate.ts#combinedLthr(schattingen, vandaag)` (mediaan van de laatste drie geldige binnen 12 maanden) en de twee grenzen (3 slagen samen, 5 bij één test). Niets nieuws bewaren: de schattingen zijn opnieuw uit de logs te rekenen; `zoneAnswers` blijft het antwoord per test.
- Instelling: "Drempel volgt" met Je laatste drie tests (advies) en Alleen je laatste test, "Eén test schommelt 3 tot 4 slagen; drie samen zijn rustiger."
- Via Akkoord: elke nieuwe drempel. Liever niet blijft per test gelden.
- Randgevallen: één uitschieter tussen twee gelijke tests; een test van 13 maanden oud die wegvalt; een test die je "Telt niet mee" gaf; Liever niet op de nieuwste en daarna een volgende test; Ongedaan maken; een drempel die je zelf invulde tegen een eerste test; de volgorde van inlezen mag de uitkomst niet veranderen.
- Niet zeker: of de drempelhartslag bij een snel verbeterende beginner echt zo stil staat als bij getrainde sporters. Als hij wel schuift, loopt de mediaan één test achter; dat is de prijs van rust.
- Klein en erbij: een stille regel als de hartslag aan het eind van je tempoblokken drie trainingen op rij meer dan 5 slagen boven je drempel uitkomt ("Je tempolopen liggen boven je drempel. Tijd voor een testloop."). Alleen tekst. De grens is een gok.

### Stap 3. De korte test

- Wat je ziet en doet: eens per week, aan het begin van een rustige loop op een vaste dag. 10 minuten rustig inlopen, 4 minuten op je vaste testtempo, 1 minuut rechtop stilstaan, daarna je gewone loop. Het horloge geeft de stappen aan. Achteraf vraagt de app één ding: hoe zwaar voelde het teststuk, van 1 tot 10. Je ziet de feiten (hartslag in de laatste minuut, het tempo dat je liep, hoeveel je hartslag zakte) en vanaf de vijfde test één woord met een zin: Normaal, Beter of Let op. "Je hartslag lag 5 slagen onder je gewone en het voelde even zwaar. Twee tests op rij: dat past bij fitter worden." Of: "Je hartslag lag lager, maar het voelde zwaarder dan gewoon. Dat past bij vermoeidheid, niet bij fitter worden."
- Waarom 4 minuten op drempeltempo en niet 3 minuten op 105 procent zoals intervals.icu: de hartslag heeft 3 tot 4 minuten nodig (Buchheit, Shushan), de ruis is het kleinst bij 85 tot 90 procent van de maximale hartslag (Lamberts), en op drempeltempo komt de hartslag in de vierde minuut bijna tot rust, terwijl hij op 105 procent blijft klimmen. De tweede vorm blijft een keuze, zodat de test ook door intervals.icu herkend wordt als de eigenaar daar ooit voor betaalt.
- Engine: `engine/shortTest.ts#shortTestOf(streams, spec)` vindt het teststuk en geeft hartslag (laatste 60 seconden), tempo, gelijkmatigheid, daling in 60 seconden, opkomsttijd, en of het stuk geldig is met de reden. `#shortTestBaseline(tests)` is het midden van je laatste vier tot zes geldige tests in dezelfde reeks. `#shortTestVerdict(test, baseline, zwaarte, context)` past de leesregel uit hoofdstuk 3 toe. `engine/shortTestRules.ts` houdt alle drempels bij elkaar. Grondcontacttijd en cadans van het teststuk gaan mee als feit, zonder oordeel (hoofdstuk 6). Het resultaat komt als afgeleid, append-only veld op het log (`shortTest`, met versie en vingerafdruk zoals `bestEffort`), toegevoegd in `storage/activityDetail.ts`, met een migratiestap.
- Geldig is een test als: het tempo binnen 2 procent van het testtempo lag, het stuk vlak was, zonder stilstaan, met borstband, begonnen tussen minuut 8 en 15, bij hoogstens 25 graden gevoel, zonder harde wind tegen, in hetzelfde dagdeel, en zonder zware loop- of beendag in de 48 uur ervoor. Anders zie je de feiten met de reden, zonder oordeel.
- Instellingen: "Korte test" (Vragen; daarna Elke week of Elke twee weken; advies elke week, "Een losse test zegt weinig; een reeks wel."), "Vorm van de korte test" (4 minuten op je drempeltempo; advies, "Op dat tempo komt je hartslag in vier minuten bijna tot rust."), "Stilstaan na de test" (aan; advies, "Zo zie je ook hoe snel je hartslag zakt."), "Oordeel bij de korte test" (aan; advies, "Uit: je ziet alleen de feiten.").
- Via Akkoord: de korte test aan een vaste training hangen (dat verandert je planning); het testtempo van een reeks vastleggen ("Je testtempo wordt 6:10 per km en blijft gelijk tot je een nieuwe reeks begint", een nagemaakt getal); een nieuwe reeks beginnen met een ander tempo. Het oordeel zelf is alleen tekst en plant niets. Na drie keer Beter op rij mag er een voorstel komen om een testloop te plannen, met Akkoord. De zones veranderen nooit door de korte test.
- Randgevallen: tempo 3 procent te snel; een brug in het teststuk; niet stilgestaan (dan geen daling, wel de rest); zwaarte niet ingevuld (feiten, geen oordeel); de vierde en de vijfde test; een nieuwe reeks na een ander testtempo; loopband als eigen reeks; een test op een ziekdag; twee tests op één dag; een gat in de hartslag in de laatste minuut; opslag op Smart, met om de paar seconden een punt; hartslag lager en zwaarte hoger; hartslag hoger bij 24 graden.
- Niet zeker: alle grenzen (4 en 6 slagen, 2 procent tempo, vier tests) zijn een gok en horen na zes tot acht tests te worden bijgesteld op de eigen spreiding. Of een stap op tempo in een training met hartslagdoelen kan, is een valkuil: `watchWorkout.ts` stuurt nu per sessie hartslag of tempo, nooit gemengd. De eerste versie kan de rest van die loop zonder doel sturen; Sherpa moet dat eerst proeven op het horloge. En de eerlijke verwachting: bij wie al maanden loopt, laat deze test vooral zien wanneer het niet goed gaat.
- Waar het komt te staan is een vraag voor Pathfinder. Mijn voorstel: de feiten op het logblad van die loop, het woord als één rij bij Lopen op Je stand, naast Tempo bij zone 2. Geen tweede voortgangsgetal.

### Stap 4. De bovenkant van rustig persoonlijk maken

- Wat je ziet en doet: na een rustige loop, hoogstens eens per paar weken, één vraag: "Kon je het laatste kwartier hele zinnen praten?" met Makkelijk, Net en Nee. Na een paar antwoorden een voorstel: "Praten ging steeds makkelijk tot 148 slagen en niet meer boven 153. Wil je 150 als bovenkant van je rustige lopen? Nu is dat 157." (nagemaakte getallen). Met Akkoord en Liever niet.
- Engine: `engine/easyCeiling.ts#easyCeiling(hartslag, antwoorden)` en `#talkTestOffer`. De grens geldt alleen voor het hartslagdoel van rustige en lange lopen op het horloge en voor het oordeel "te hard"; de zones zelf blijven die van het horloge.
- Instelling: "Rustige grens" met Praattest beslist (advies) en Bovenkant van zone 2, "De grens van rustig ligt bij iedereen ergens anders; praten is de eenvoudigste toets."
- Via Akkoord: de grens zelf, want hij verandert wat je horloge je laat lopen.
- Randgevallen: tegenstrijdige antwoorden; antwoorden bij warmte; een grens boven de bovenkant van zone 2 (nooit hoger dan die); te weinig antwoorden; een nieuwe drempel terwijl er een eigen grens staat (de grens schuift niet stil mee, er komt een vraag).
- Niet zeker: de praattest is op groepen getoetst, niet als hulpmiddel om één persoon op 3 slagen nauwkeurig te plaatsen. Door hartslagdrift is "het laatste kwartier" van een lange loop een andere meting dan dat van een korte. Dit is de stap met het minste bewijs en het meeste gezond verstand.

### Stap 5. De test van 30 minuten als keuze

- Wat je ziet en doet: bij Testloop een keuze "5 km" of "30 minuten". Bij 30 minuten: inlopen, een halfuur voluit en gelijkmatig, uitlopen. De app leest de afstand in dat halfuur voor je tempo's en de laatste 20 minuten voor je drempel.
- Voor wie: lopers die de 5 km onder 24 of boven 40 minuten lopen, voor wie de 5 km geen goede drempeltest is. Voor de eigenaar nu niet nodig: zijn 5 km is zijn halfuur.
- Engine: een sjabloon met de rol `test`, zodat alle rustregels blijven gelden; `bestEffort.ts` krijgt een beste stuk op tijd naast het beste stuk op afstand; `countedTests` leest de afstand in 30 minuten (VDOT en Riegel rekenen al met elke afstand).
- Instelling: "Testvorm" met 5 km (advies bij 24 tot 40 minuten) en 30 minuten. Een andere vorm gaat via een voorstel, want hij verandert de geplande training.
- Randgevallen: twee tests van verschillende vorm vergelijken (op tempo over 5 km, zoals nu bij verschillende basis); een halfuur met een stop; 29 minuten gelopen; de voorspelling voor een wedstrijd uit een afstand die geen rond getal is.
- Niet zeker: of een halfuur op tijd voor recreatieve lopers net zo herhaalbaar is als 5 km op afstand. Voor 5 km is dat gemeten (1 tot 3,5 procent), voor 30 minuten vond ik bij recreanten niets.

### Niet bouwen, of later

- DFA alpha 1: niet als fundering (hoofdstuk 2). Hoogstens later een proef voor de eerste drempel, als de RR-intervallen na het aanzetten van Log HRV binnenkomen.
- De drempel van Garmin automatisch overnemen: komt niet via intervals.icu mee, en is per persoon te ruim.
- Een stappentest of Conconi: niet betrouwbaar zonder lactaat.
- Hartslagherstel als eigen uitslag: te ruw en tweeduidig; alleen als achtergrond in stap 3.
- Later, los van deze vraag: lagere hartslaggrenzen op tochtdagen op hoogte.

## 9. Open vragen voor de eigenaar

Bij elke vraag mijn advies voorop. Zonder antwoord kunnen stap 1 en 2 gebouwd worden met het advies; stap 3 tot 5 wachten op een antwoord.

1. Welke drempel bedoelen we: voorzichtig (98 procent van je halfuur) of die van Friel (100 procent)? Advies: voorzichtig houden, als instelling, met Friel als tweede keuze. Er is geen bewijs dat een van beide beter is en te laag is de veilige kant.
2. Mag je drempel het midden van je laatste drie tests volgen in plaats van alleen de laatste? Advies: ja. Het kost dat een echte verschuiving één test later zichtbaar wordt; het levert op dat de app niet bij elke test alles verzet.
3. De korte test: 4 minuten op je drempeltempo (advies) of precies zoals intervals.icu (3 minuten, 5 procent sneller)? En wil je hem elke week op je eerste rustige loop na een rustdag? Advies: 4 minuten, wekelijks, en het eerste oordeel pas na vier tests.
4. Wil je na de korte test een minuut stilstaan voor het hartslagherstel? Advies: ja, het is een minuut en het helpt moe van fit te scheiden, maar het wordt nooit een eigen uitslag.
5. Wil je de praattest als voorstel voor je rustige grens (stap 4)? Advies: ja, maar pas na stap 1 tot 3. Tot dan geldt het advies uit `Trainingsvormen en varianten.md`: rustige lopen in de onderste helft van zone 2.
6. De test van 30 minuten als eigen training: nu of later? Advies: later. Je 5 km duurt ongeveer een halfuur; de aparte test wordt pas nuttig als je 5 km onder 24 minuten komt.
7. Bouwen we iets met DFA alpha 1? Advies: nee. Wel Log HRV aanzetten op je horloge als die keuze er staat, en na een loop het ene verzoek uit hoofdstuk 6 doen: staat `hrv` dan in je reeksen, dan is een proef met één oplopende loop mogelijk zonder iets te bouwen.
8. Voor gebruikers zonder borstband: telt een test dan nooit voor de drempel, of mag het als bewuste keuze met ruime marge? Advies: standaard niet, met de keuze erbij, en een armband telt als band.
9. Mag de app het vragen als hij je borstband bij een test niet ziet ("Had je hem om?")? Advies: ja, één vraag per test, alleen als je band er anders altijd is.

## Bronnen

intervals.icu, Garmin en Friel:

- Specificatie van intervals.icu: https://intervals.icu/api/v1/docs
- Forum, Automatic Submaximal Fatigue Testing: https://forum.intervals.icu/t/automatic-submaximal-fatigue-testing/132525
- Forum, DFA a1 alleen uit het dataveld: https://forum.intervals.icu/t/average-dfa-a1-and-wbal-added-to-interval-fields/7528
- Forum, RR-intervallen worden binnengehaald maar niet verwerkt: https://forum.intervals.icu/t/garmin-hrv/111453 en https://forum.intervals.icu/t/activity-hrv-not-wellness/73153
- Forum, AlphaHRV: https://forum.intervals.icu/t/alphahrv-update/27239 en https://forum.intervals.icu/t/new-alphahrv-version/20966
- Garmin, handleiding Forerunner 255 (pdf): https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/Forerunner_255_OM_EN-US.pdf
- Garmin, systeeminstellingen Forerunner 255: https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-1500E73F-F386-49AF-A542-25D4B1655A08.html
- Garmin, handleiding HRM-Pro Plus (loopdynamiek, tempo en afstand, tips): https://www8.garmin.com/manuals/webhelp/GUID-57B75051-8E96-44B8-A89E-470B3E3BCD32/EN-US/suitehelp_topic_list.html
- Garmin-forum, geen HRV-stresstest op de Forerunner 255: https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/321280/hrv-stress-test-on-forerunner-255
- Runalyze, HRV opslaan op Garmin-horloges: https://runalyze.com/help/article/enable-hrv-recording-garmin
- Garmin-forum, de instelling voor HRV-opslag op een 255 (drie gebruikers): https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-245-series/321470/does-forerunner-245-track-hrv , https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/318216/bug-broadcast-hrv-r-r-intervals en https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/301731/only-had-the-new-255-for-a-week-but-last-night-it-failed-to-record-any-sleep-data-or-hrv
- Garmin-forum, RR-tijden in het bestand met borstband en niet met de pols (Forerunner 265): https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-265-series/336062/details-around-the-hrv-feature
- Garmin-forum, HRM-Pro Plus over Bluetooth zonder HRV in de activiteit: https://forums.garmin.com/sports-fitness/running-multisport/f/accessories-sensors/388470/hrm-pro-plus-no-hrv-via-bluetooth
- Forum van intervals.icu, de maker van AlphaHRV over ANT+ en Bluetooth bij de HRM-Pro Plus: https://forum.intervals.icu/t/alphahrv-update/27239/376
- intervals.icu, datamodel met de streamtypes (onder meer `hrv` en `dfa_a1`): https://forum.intervals.icu/t/server-side-data-model-for-scripts/25781
- Forum, het HRV-record uit het bestand als ongefilterde RR-reeks: https://forum.intervals.icu/t/all-fields-from-garmin-activity/28097
- the5krunner over de wijziging in de drempelmeting van Garmin: https://the5krunner.com/2024/10/26/garmin-changes-lactate-threshold-measurement-deep-dive/
- Friel, zones instellen: https://www.trainingpeaks.com/learn/articles/joe-friel-s-quick-guide-to-setting-zones/
- Beschrijving van het protocol van McGehee (Dalleck en Kravitz): https://www.unm.edu/~lkravitz/Article%20folder/LTassessUNM.html

De drempel en de zones:

- Nuuttila e.a. 2025, vaste ankers voor de lactaatdrempels bij recreatieve lopers: https://pubmed.ncbi.nlm.nih.gov/40088270/
- Iannetta e.a. 2020, vaste percentages tegen de echte domeinen: https://pubmed.ncbi.nlm.nih.gov/31479001/
- Jamnick e.a. 2020, kritiek op methodes voor intensiteit: https://pubmed.ncbi.nlm.nih.gov/32729096/
- Faude e.a. 2009, lactaatdrempels: https://pubmed.ncbi.nlm.nih.gov/19453206/
- Jones e.a. 2019, het hoogste evenwicht opnieuw gedefinieerd: https://pubmed.ncbi.nlm.nih.gov/31124324/
- Galán-Rioja e.a. 2020, kritiek vermogen tegen de drempels: https://pubmed.ncbi.nlm.nih.gov/32613479/
- Foster e.a. 1999, hartslag bij de drempels blijft gelijk: https://pubmed.ncbi.nlm.nih.gov/10211855/
- Lucía e.a. 2000, hartslag bij de drempels over een seizoen: https://pubmed.ncbi.nlm.nih.gov/11039652/

Veldtests:

- McGehee e.a. 2005, vier veldtests tegen de labdrempel: https://pubmed.ncbi.nlm.nih.gov/16095403/
- Vobejda e.a. 2013, 45 minuten voluit is het lactaatevenwicht: https://pubmed.ncbi.nlm.nih.gov/24247182/
- Dittrich e.a. 2014, hoe lang je het evenwicht volhoudt: https://pubmed.ncbi.nlm.nih.gov/24235775/
- LaFontaine e.a. 1981, evenwicht tegen wedstrijdtempo's: https://pubmed.ncbi.nlm.nih.gov/7253872/
- Esteve-Lanao e.a. 2008, hartslag in wedstrijden van 5 tot 100 km: https://pubmed.ncbi.nlm.nih.gov/18698405/
- Borszcz e.a. 2018, tijdrit van 20 en 60 minuten bij fietsers: https://pubmed.ncbi.nlm.nih.gov/29801189/
- Jones en Doust 1995, Conconi niet herhaalbaar: https://pubmed.ncbi.nlm.nih.gov/8776209/
- Bodner en Rhodes 2000, de knik in de hartslag: https://pubmed.ncbi.nlm.nih.gov/10907756/
- Maffulli e.a. 2026, niet-invasieve drempelschatting: https://pubmed.ncbi.nlm.nih.gov/42872971/
- Reed en Pipe 2014, de praattest: https://pubmed.ncbi.nlm.nih.gov/25010379/
- Quinn en Coons 2011, praattest tegen de drempels: https://pubmed.ncbi.nlm.nih.gov/21774751/
- Heiber e.a. 2024, Garmin Fenix 7: https://pubmed.ncbi.nlm.nih.gov/38742188/
- Lu e.a. 2025, horloges tegen een stappentest: https://pubmed.ncbi.nlm.nih.gov/40740423/
- Carrier e.a. 2021, Garmin Fenix 6: https://digitalscholarship.unlv.edu/kns_fac_articles/415
- Železnik Mežan 2025, review wearables: https://pubmed.ncbi.nlm.nih.gov/41477023/
- Rogers e.a. 2021, alpha 1 en de eerste drempel: https://pubmed.ncbi.nlm.nih.gov/33519504/
- Rogers e.a. 2021, alpha 1 en de tweede drempel: https://pubmed.ncbi.nlm.nih.gov/33925974/
- Rogers e.a. 2021, gemiste slagen en soort band: https://pubmed.ncbi.nlm.nih.gov/33530473/
- Kaufmann e.a. 2023, review drempels uit hartslagvariabiliteit: https://pubmed.ncbi.nlm.nih.gov/37462761/
- Van Hooren e.a. 2025, alpha 1 bij lopers, fris en vermoeid: https://pubmed.ncbi.nlm.nih.gov/37916488/
- Mateo-March e.a. 2023, alpha 1 bij elite wielrenners: https://pubmed.ncbi.nlm.nih.gov/35238695/
- Anton e.a. 2026, alpha 1 in een stappentest op de fiets: https://pubmed.ncbi.nlm.nih.gov/41699863/
- Sempere-Ruiz e.a. 2024, herhaalbaarheid van alpha 1: https://pubmed.ncbi.nlm.nih.gov/38375458/
- Fleitas-Paniagua e.a. 2023, alpha 1 en de helling van de test: https://pubmed.ncbi.nlm.nih.gov/37549966/
- Schaffarczyk e.a. 2022, Polar H10 tegen een ECG: https://pubmed.ncbi.nlm.nih.gov/36081005/

Submaximale tests:

- Lamberts e.a. 2011, de fietstest: https://pubmed.ncbi.nlm.nih.gov/19622525/
- Lamberts e.a. 2004, schommeling van de hartslag van dag tot dag: https://pubmed.ncbi.nlm.nih.gov/15320683/
- Lamberts en Lambert 2009, schommeling per zwaarte: https://pubmed.ncbi.nlm.nih.gov/19387374/
- Lamberts e.a. 2011, hartslagherstel en de juiste zwaarte: https://pubmed.ncbi.nlm.nih.gov/21618159/
- Vesterinen e.a. 2017, looptest bij getrainde duursporters: https://pubmed.ncbi.nlm.nih.gov/27100319/
- Sangan e.a. 2021, looptest op gevoel: https://pubmed.ncbi.nlm.nih.gov/34140417/
- Buchheit 2014, hartslagmaten om training te volgen: https://pubmed.ncbi.nlm.nih.gov/24578692/
- Buchheit e.a. 2010, hartslagmaten en looptraining: https://pubmed.ncbi.nlm.nih.gov/20033207/
- Shushan e.a. 2023, meta-analyse hartslag in een vaste test: https://pmc.ncbi.nlm.nih.gov/articles/PMC10039193/
- Schimpchen e.a. 2023, review loopsporten: https://pubmed.ncbi.nlm.nih.gov/36332619/
- Scharhag-Rosenberger e.a. 2009, een jaar training bij beginners: https://pubmed.ncbi.nlm.nih.gov/19346973/
- Capostagno e.a. 2016, review vaste fietstests: https://pubmed.ncbi.nlm.nih.gov/27701968/
- Hammes e.a. 2016, de fietstest in een zwaar kamp: https://pubmed.ncbi.nlm.nih.gov/26263163/
- Decroix e.a. 2018, de fietstest bij profrensters: https://pubmed.ncbi.nlm.nih.gov/28422523/
- Roete e.a. 2021, tekens van overbelasting: https://pubmed.ncbi.nlm.nih.gov/34108275/
- Le Meur e.a. 2017, hartslagherstel bij overbelasting: https://pubmed.ncbi.nlm.nih.gov/27617566/
- Aubry e.a. 2015, sneller herstel bij overbelasting: https://pubmed.ncbi.nlm.nih.gov/26488766/
- Manresa-Rocamora e.a. 2021, meta-analyse hartslagmaten bij overbelasting: https://pubmed.ncbi.nlm.nih.gov/33533045/
- Bosquet e.a. 2008, herhaalbaarheid van hartslagherstel: https://pubmed.ncbi.nlm.nih.gov/17614018/
- Al Haddad e.a. 2011, herhaalbaarheid van hartslagmaten: https://pubmed.ncbi.nlm.nih.gov/21574126/
- Fecchio e.a. 2019, review hartslagherstel: https://pubmed.ncbi.nlm.nih.gov/31493664/

Pols, borstband en armband:

- Zhang e.a. 2020, meta-analyse polssensoren: https://pubmed.ncbi.nlm.nih.gov/32552580/
- Gillinov e.a. 2017, pols tegen borstband tegen ECG: https://pubmed.ncbi.nlm.nih.gov/28709155/
- Navalta e.a. 2020, polssensoren bij buiten lopen: https://pubmed.ncbi.nlm.nih.gov/32866216/
- Støve e.a. 2019, Garmin Forerunner 235: https://pubmed.ncbi.nlm.nih.gov/30326780/
- Moghaddam e.a. 2025, plek van de sensor: https://pubmed.ncbi.nlm.nih.gov/41516615/
- Pasadyn e.a. 2019, hartslagmeters bij sporters op de loopband: https://pubmed.ncbi.nlm.nih.gov/31555543/
- Düking e.a. 2020, vier horloges van zitten tot hard lopen: https://pubmed.ncbi.nlm.nih.gov/32374274/
- Reddy e.a. 2018, polshorloges bij intervallen: https://pubmed.ncbi.nlm.nih.gov/30530451/
- Neudorfer e.a. 2024, vier optische sensoren over een dag: https://pubmed.ncbi.nlm.nih.gov/39508366/
- Bent e.a. 2020, bronnen van fouten in optische sensoren: https://pubmed.ncbi.nlm.nih.gov/32047863/
- Horton e.a. 2017, optische hartslag bij wisselingen: https://pubmed.ncbi.nlm.nih.gov/29135785/
- Navalta e.a. 2023, armbanden bij trailrunnen: https://pubmed.ncbi.nlm.nih.gov/37474743/
- Hettiarachchi e.a. 2019, Polar OH1 op de arm: https://pubmed.ncbi.nlm.nih.gov/31120968/
- Casanova-Lizón e.a. 2026, hartslagvariabiliteit van de pols in rust: https://pubmed.ncbi.nlm.nih.gov/42944412/

Andere storingen:

- Périard e.a. 2011, een tijdrit in de hitte: https://pubmed.ncbi.nlm.nih.gov/20851861/
- Tatterson e.a. 2000, een halfuur voluit in de hitte: https://pubmed.ncbi.nlm.nih.gov/11104310/
- Adams e.a. 2014, vochtverlies en hartslag: https://pubmed.ncbi.nlm.nih.gov/24736771/
- Friedmann e.a. 2004, de drempel in dunne lucht: https://pubmed.ncbi.nlm.nih.gov/15595295/
- Weidner e.a. 1997, verkoudheid en inspanning: https://pubmed.ncbi.nlm.nih.gov/9140895/
- Kaulback e.a. 2023, luchtweginfecties en prestatie: https://pubmed.ncbi.nlm.nih.gov/35695464/
- Snyders e.a. 2022, terugkeer na een luchtweginfectie: https://pubmed.ncbi.nlm.nih.gov/34789459/
- Schwellnus e.a. 2022, consensus luchtweginfecties: https://pubmed.ncbi.nlm.nih.gov/35863871/
- Oliver e.a. 2009, een nacht zonder slaap en 30 minuten lopen: https://pubmed.ncbi.nlm.nih.gov/19543909/
- Seynaeve e.a. 2026, een nacht zonder slaap bij recreatieve lopers: https://pubmed.ncbi.nlm.nih.gov/42421206/
- Glaister en Gissane 2018, cafeïne en vaste inspanning: https://pubmed.ncbi.nlm.nih.gov/28872376/
- Southward e.a. 2018, cafeïne en tijdritten: https://pubmed.ncbi.nlm.nih.gov/29876876/
- Kang e.a. 2023, tijdstip van de dag: https://pubmed.ncbi.nlm.nih.gov/37026733/
