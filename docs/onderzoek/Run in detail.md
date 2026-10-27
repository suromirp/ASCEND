# Run in detail

Een run is meer dan zijn totaal en zijn gemiddelde. Wat er per kilometer, per ronde en daartussen gebeurde is grotendeels uit de reeksen van het horloge te halen, en ASCEND haalt die reeksen al op, maar gooit ze na het maken van een profiel van 48 stukjes weg. Mijn advies: bewaar voortaan de volledige reeksen op het toestel, op de resolutie waarop het horloge ze schreef (meestal elke seconde), compact als binaire getallen in een eigen opslag naast de logs, met de rondes en intervallen van intervals.icu erbij. Dat kost ongeveer 120 KB per uur lopen en ruwweg 40 MB per jaar, ver binnen wat een telefoon toestaat. Op die reeksen rekent ASCEND kilometertijden, rondetijden, de verdeling van het tempo, hartslag, cadans, staplengte en loopvorm per kilometer, gecorrigeerd tempo op hellingen en de tegenwind per kilometer. Het oordeel blijft zuinig: een kilometer schommelt door de GPS alleen al zo'n 3 procent, dus pas een verschil van 4 tot 5 procent tussen kilometers is een patroon. Voor een testloop is één advies het meest waard: hoe je de volgende keer moet beginnen ("begin op 5:35 per km, dat is 20 seconden rustiger dan je eerste km vandaag"), samen met een eerlijk lijstje van wat de test heeft beïnvloed (wind, benen, opwarmen, route). De loopvorm (verticale oscillatie, grondcontacttijd, balans) en het vermogen horen als feiten in het diepe overzicht, niet als oordeel: het bewijs dat ze voor een recreant iets betekenen buiten vermoeidheid binnen dezelfde loop is zwak.

Datum: 27 oktober 2026
Door: Scout Run in detail
Status: voorstel. In `src/` is niets veranderd en er is niets gecommit. Er staat geen persoonsgegeven in dit bestand; de getallen in de voorbeelden zijn nagemaakt, behalve waar staat dat het de testloop van de eigenaar is (alleen trainingsgetallen).

## Hoe ik gewerkt heb en hoe zeker iets is

Ik las eerst CLAUDE.md, `docs/visie/Trainingswetenschap.md`, `docs/onderzoek/Loopgegevens en vooruitgang.md` (hierna: het loopinzicht), `docs/onderzoek/Tussendoel hardloopwedstrijd.md`, `docs/onderzoek/Spierbelasting en beenvermoeidheid.md`, de besluiten `2026-10-22-loopinzicht.md`, `2026-10-27-testloop-lezen.md` en de aanvulling daarop, en de code in `engine/runMetrics.ts`, `runInsight.ts`, `runComparison.ts`, `runTrends.ts`, `bestEffort.ts`, `models/activityDetail.ts`, `integrations/intervalsIcu.ts` en `engine/watchWorkout.ts`. Wat daar al staat herhaal ik niet; ik verwijs ernaar en bouw erop voort.

De specificatie van intervals.icu (https://intervals.icu/api/v1/docs) heb ik vandaag opnieuw gelezen, nu voor de intervallen. Ik heb geen echte API-aanroep met een sleutel gedaan.

Woorden voor zekerheid over intervals.icu en Garmin, zoals in het loopinzicht: zeker (zo in de specificatie of de handleiding gelezen), goed (een ontwikkelaar op het forum), waarschijnlijk (afgeleid of van derden), onzeker (niet gevonden).

Woorden voor de wetenschap: bewijs sterk, matig, zwak, expertopinie, afgeleid (mijn rekensom op andermans getallen) en eigen aanname (een drempel die ik voorstel zonder bron, te ijken op de eigen gegevens van de eigenaar).

## 1. Wat er al is en wat ontbreekt

Wat er is:

- Per gekoppelde loop of tocht haalt ASCEND de reeksen op (`fetchIntervalsStreams`) en maakt er een profiel van 48 stukjes van gelijke tijd plus klim- en dalstukken van (`SessionLog.detail`). Bij een test van 36 minuten is één stukje 45 seconden. De reeks zelf wordt niet bewaard.
- Uit dezelfde reeks rekent `bestEffort.ts` de snelste aaneengesloten 5 km van een testloop, met een gat van hoogstens 20 seconden.
- `runInsight.ts` geeft na een rustige of lange loop hoogstens twee regels (Beter en Let op) en na een tocht klim- en daalfeiten. Voor tempo, intervallen, test en wedstrijd geeft het bewust niets (regel 1 in dat bestand).
- `runTrends.ts` toont op Je stand vier rijen met een woord.
- Gevraagd worden nu tijd, afstand, hartslag, snelheid, hoogte, cadans, de eerste plaats en vijf reeksen loopdynamica. Vermogen wordt bewust niet gevraagd, omdat het besluit ervan uitging dat een Forerunner geen loopvermogen geeft.

Wat ontbreekt voor de vraag van de eigenaar:

- Kilometertijden en rondetijden. Uit 48 stukjes van gelijke tijd zijn kilometergrenzen alleen benaderd te halen (op 45 seconden per stukje is dat ongeveer 130 meter onzekerheid per grens).
- De rondes en intervallen van het horloge en van intervals.icu: die worden niet opgehaald.
- Enige analyse van een test, tempoloop of intervaltraining.
- Wind per stuk van de route. Nu is er alleen één windgetal voor de hele loop.
- Een correctie op het eerdere uitgangspunt over vermogen: een Forerunner 255 schrijft wel loopvermogen als er een HRM-Pro of Running Dynamics Pod aan hangt (waarschijnlijk; Garmins productteksten en meerdere reviews zeggen dit, zie [Wareable](https://www.wareable.com/garmin/garmin-forerunner-255-review-8851) en [T3](https://www.t3.com/features/garmin-forerunner-255s-HRM-Pro); de handleiding zelf heb ik niet gevonden). De eigenaar draagt de HRM-Pro bij elke loop, dus de reeks `watts` staat waarschijnlijk in `stream_types`. Dat betekent ook dat `decoupling` op intervals.icu bij hem misschien wel gevuld is, op basis van vermogen.

## 2. Wat er tussen de kilometers zit: de analyses die ertoe doen

Per maat: wat het zegt, hoe groot de ruis is, en wat ASCEND ermee kan. De volgorde is die van waarde voor een recreant.

### 2.1 Tempo per kilometer en per ronde

Wat het zegt. De verdeling van het tempo is het eerste wat een coach na een test of wedstrijd bekijkt. Een review van pacingstrategieën onderscheidt een negatieve, positieve, gelijkmatige, parabolische (U-vorm) en wisselende verdeling, en concludeert dat bij inspanningen langer dan een paar minuten een vrij gelijkmatig tempo het beste werkt ([Abbiss en Laursen 2008](https://ro.ecu.edu.au/ecuworks/877)) (bewijs: matig, overzicht van vooral getrainde sporters). Bij wereldrecords op de 5.000 en 10.000 meter was de eerste en de laatste kilometer sneller dan het midden, een licht U-vormig maar in wezen gelijkmatig tempo met een eindsprint ([Tucker e.a. 2006, IJSPP](https://lida.sport-iat.de/dlv/Record/4017815?lng=en)) (bewijs: matig voor elite; niet zomaar over te zetten op recreanten). In marathons lopen bijna alle recreanten een positieve split, en hoe trager de groep hoe groter de schommeling ([studie New York City Marathon](https://abacus.universidadeuropea.com/entities/publication/cca9c361-104f-47ab-8275-d26a0b972973)) (bewijs: matig, observationeel, marathon en geen 5 km).

Hoe groot de ruis is. Een horloge meet afstand met GPS. In een vergelijking van acht horloges was de gemiddelde absolute fout op afstanden van 0,4 tot 4,3 km 3,2 tot 6,1 procent, meestal te kort, en groter tussen gebouwen en in het bos ([Gilgen-Ammann e.a. 2020, JMIR mHealth](https://mhealth.jmir.org/2020/6/e17118)) (bewijs: matig). Een deel van die fout is steeds dezelfde kant op en valt weg als je kilometers van dezelfde loop met elkaar vergelijkt; een deel is willekeurig. Mijn inschatting (afgeleid): een verschil tussen twee kilometers van één loop onder 3 procent, op 5:30 per km zo'n 10 seconden, is niet van ruis te onderscheiden. Bij een bocht, brug of tunnel kan één kilometer ook meer afwijken.

Wat ASCEND ermee kan:

- Kilometertijden uit de afstandsreeks, net zoals `bestEffort.ts` het snelste stuk vindt: de tijd waarop de cumulatieve afstand elke volle kilometer passeert, met interpolatie tussen twee metingen. Op een reeks van één meting per seconde is de grens op een seconde nauwkeurig.
- Rondetijden uit de rondes van het horloge of de intervallen van intervals.icu (zie hoofdstuk 7), opnieuw uitgerekend uit de reeks zodat er één waarheid is.
- Drie getallen voor de verdeling, steeds over het stuk dat telt (bij een test de beste 5 km): het tempo van de eerste kilometer tegen het gemiddelde, de tweede helft tegen de eerste helft, en de spreiding van de kilometertijden.

### 2.2 Hartslag per kilometer, drift en ontkoppeling

Wat het zegt. Bij een rustige of lange loop is hartslag bij gelijk tempo de beste maat voor hoe zwaar het voor je hart was; drift en ontkoppeling (Pa:HR, tempo per hartslag in de tweede helft tegen de eerste) staan al uitgewerkt in het loopinzicht, met de waarschuwing dat de grens van 5 procent een coachrichtlijn is en geen gemeten grens ([TrainingPeaks](https://www.trainingpeaks.com/coach-blog/aerobic-endurance-and-decoupling/)) (expertopinie). Nieuw sinds dat onderzoek: in een analyse van 82.303 recreatieve marathonlopers begon de ontkoppeling gemiddeld rond 25 km, en lopers met weinig ontkoppeling waren sneller en begonnen later te ontkoppelen (rond 33 km tegen rond 19 km) ([Smyth e.a. 2022, Sports Medicine](https://uhra.herts.ac.uk/id/eprint/9660/)) (bewijs: matig; groot, observationeel, marathon, met een geschatte kritieke snelheid). Dat steunt het idee dat ontkoppeling iets zegt over uithoudingsvermogen, maar het is een samenhang en geen bewijs dat één lange loop het meet.

Waar het niet geldt. Hartslag loopt bij een tempowissel achter: na het begin van een harde herhaling duurt het ongeveer een tot twee minuten voordat hij stabiel is (expertopinie, algemeen bekend uit de inspanningsfysiologie). Daarom zegt de gemiddelde hartslag van een herhaling van een minuut weinig, en is drift in een test of een intervaltraining geen maat. In een test van 5 km stijgt de hartslag per kilometer vrijwel altijd; dat is gewoon zwaar werk, geen slecht teken.

Hoe groot de ruis is. Met een borstband is hartslag nauwkeurig op een slag of twee (afgeleid uit de validatie van borstbanden in het algemeen; de eigenaar draagt de HRM-Pro). Hartslag bij vast submaximaal tempo varieert van dag tot dag zo'n 3 procent ([Buchheit 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/)) (bewijs: matig). Warmte en uitdroging verhogen de drift ([Heaps, González-Alonso en Coyle 1994, IJSM](https://www.thieme-connect.com/products/ejournals/pdf/10.1055/s-2007-1021023.pdf)) (bewijs: matig).

Wat ASCEND ermee kan: gemiddelde en hoogste hartslag per kilometer en per ronde tonen, altijd. Een oordeel alleen bij rustig en lang, zoals nu. Bij intervallen de hartslag van de laatste helft van elke herhaling en het herstel in de pauze als feit, nooit als oordeel.

### 2.3 Cadans en staplengte tegen tempo

Wat het zegt. Je loopt sneller door langere passen en, minder, door een hogere cadans. Buiten, bij 21 ervaren recreanten, was de zelfgekozen cadans 165 stappen per minuut en de zuinigste 171; beide stegen maar 3 stappen per minuut bij 15 procent hogere snelheid ([de Ruiter e.a. 2020, via BISp](https://www.bisp-surf.de/Record/PU202004002347)) (bewijs: matig, kleine groep). Gevolg: als je tempo in een test 5 procent zakt, verandert je cadans maar ongeveer 1 stap per minuut en vrijwel al het verlies zit in je staplengte. In een meta-analyse hing een hogere cadans samen met een iets zuiniger loop (r = 0,20), staplengte niet ([Van Hooren e.a. 2024, Sports Medicine](https://pmc.ncbi.nlm.nih.gov/articles/PMC11127892/)) (bewijs: matig, GRADE matig; het gaat om verschillen tussen lopers, niet om wat er gebeurt als jij je cadans verandert).

Hoe groot de ruis is. Cadans en pasafstand variëren van dag tot dag ongeveer 0,6 tot 1,0 procent op de loopband ([Miqueleiz e.a. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12127928/)) (bewijs: matig). Cadans is van alle loopdynamica de best gevalideerde maat; ook in studies met oudere Garmin-sensoren was cadans goed en waren contacttijd en oscillatie minder zeker ([studie Universiteit van Jaén](https://crea.ujaen.es/items/7e6e93ad-b956-4d42-9d45-b5683f6e4a6a)) (bewijs: zwak tot matig).

Wat ASCEND ermee kan: per kilometer cadans en staplengte naast het tempo tonen, en bij een tragere kilometer zeggen waar het in zat ("je pas werd 6 cm korter, je cadans bleef gelijk"). Een persoonlijke lijn van cadans tegen snelheid over je rustige loopjes (zie hoofdstuk 5) maakt het mogelijk om cadans bij hetzelfde tempo te vergelijken. Nooit een vaste streefwaarde als 180: daar is geen bewijs voor bij recreanten (de cijfers hierboven liggen rond 165 tot 171).

### 2.4 Verticale oscillatie, verticale ratio, grondcontacttijd en balans

Wat bekend is over betrouwbaarheid:

- De HRM-Pro kwam bij 50 recreanten op de loopband goed overeen met drie andere systemen, alleen de verticale oscillatie las ongeveer 4,6 mm hoger dan video ([Cabrera-Linares e.a. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12431186/)) (bewijs: matig; loopband, twee snelheden).
- De Running Dynamics Pod van Garmin week bij lopen op de plaats tegen een krachtplaat ver af in contacttijd ([Drobnič e.a. 2023, Sensors](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10459607/)) (bewijs: zwak voor gewoon lopen, want op de plaats).
- Voor verticale oscillatie van een borstband en voor de balans vond ik geen cijfer voor de spreiding van dag tot dag. Dat was in het loopinzicht ook al zo.

Wat bekend is over nut:

- Tussen lopers hangt een grotere verticale oscillatie matig samen met een duurdere loop (r = 0,35), contacttijd helemaal niet (r = -0,02), en alle loopmaten samen verklaren maar 4 tot 12 procent van de verschillen in loopeconomie ([Van Hooren e.a. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11127892/)) (bewijs: matig). Dat zegt niet dat jij zuiniger loopt als je minder op en neer gaat.
- Bij vermoeidheid wordt de contacttijd bij gelijk tempo langer, maar de reacties verschillen sterk per persoon ([Zandbergen e.a. 2023](https://research.utwente.nl/en/publications/effects-of-level-running-induced-fatigue-on-running-kinematics-a-/)) (bewijs: matig). Ik vond geen studie die de loopdynamica door een 5 of 10 km-tijdrit van recreanten volgt.
- Verticale ratio is oscillatie gedeeld door staplengte. Garmin zegt dat lager meestal beter is, zonder getalsgrenzen en zonder studie (Garmin-handleiding, zie het loopinzicht). De kleurvakken op het horloge zijn een indeling van Garmin zelf.
- Balans: een blijvende verdeling buiten ongeveer 52 tegen 48 is volgens intervals.icu het bekijken waard; COROS hanteert 55 procent (expertopinie van leveranciers, zie het loopinzicht).

Wat ASCEND ermee kan: alle vijf per kilometer en per ronde tonen, met een lijntje over de run, en binnen één loop het laatste derde tegen het eerste derde bij gelijk tempo (dat bestaat al als `formOf`). Omdat contacttijd, oscillatie en staplengte sterk van het tempo afhangen, alleen vergelijken bij een tempo binnen 6 procent. In een test, waar het tempo verschuift, alleen als feit. Verticale oscillatie en balans nooit als oordeel na één run; balans pas als trend over drie runs, zoals het loopinzicht al voorstelt.

### 2.5 Vermogen

Een Forerunner 255 met HRM-Pro schrijft Garmins loopvermogen, waarschijnlijk (zie hoofdstuk 1). Garmin rekent het uit loopdynamica, gewicht, versnelling en weergegevens; de instelling "Account for Wind" gebruikt wind uit het weerbericht dat de telefoon voor de start had, geen meting ([Garmin-handleiding Running Power](https://www8.garmin.com/manuals/webhelp/GUID-F41EAFB3-6CC9-42DE-9C6C-9E358DBB0671/EN-US/GUID-D74FC870-3A94-4376-81D5-C9484545EAD9.html); de weerbron volgens [the5krunner](https://the5krunner.com/2017/12/10/garmin-running-power-wind)) (zeker voor wat de handleiding zegt, waarschijnlijk voor de weerbron). In een vergelijking van vijf systemen bij 12 getrainde lopers was Stryd het meest herhaalbaar (variatiecoëfficiënt hoogstens 4,3 procent) ([Cerezuela-Espejo e.a. 2021, EJSS](https://portalinvestigacion.um.es/documentos/60e6a5984edb8e25f92d23e4)) (bewijs: matig); de cijfers voor Garmin heb ik niet kunnen lezen (onzeker). Loopvermogen van verschillende merken is niet uitwisselbaar ([Stryd tegen RunScribe](https://www.iat.uni-leipzig.de/datenbanken/iks/dvmf/Record/4073816)) (bewijs: matig).

Wat ASCEND ermee kan: vermogen opvragen en bewaren, per kilometer tonen, en het voorlopig nergens in een oordeel gebruiken. Het kan later één ding goed doen: bij wind of heuvels is vermogen de enige maat die de inspanning los van het tempo laat zien. Dat vraagt eerst een paar weken eigen gegevens om te zien of Garmins windterm iets toevoegt.

### 2.6 Hoogte en gecorrigeerd tempo (GAP)

Wat bekend is: de energiekosten van lopen op een helling zijn goed gemeten ([Minetti e.a. 2002](https://iris.unibs.it/retrieve/ddc633e4-3c03-4e2e-e053-3705fe0a4c80/Minetti%20JAP%202002.pdf)) (bewijs: sterk). Strava baseerde zijn huidige GAP in 2017 op hartslag uit een grote verzameling activiteiten in plaats van alleen op zuurstofmetingen in het lab ([Drew Robb 2017, Medium](https://medium.com/@drewrobb); patent [US11623121](https://patents.google.com/patent/US11623121)) (waarschijnlijk; de blog zelf heb ik niet kunnen lezen). COROS heeft een persoonlijke variant, Effort Pace, op basis van je eigen hartslag op hellingen ([COROS](https://coros.com/stories/coros-metrics/c/effort-pace)) (leveranciersuitspraak). intervals.icu levert `gap` op de activiteit en op elk interval (zeker).

De beperking in Nederland: barometrische hoogte is onder ongeveer 5 meter per kilometer ruis (`docs/onderzoek/Betrouwbaarheid beenvermoeidheid-index.md`). Op een vlakke route maakt GAP de kilometertijden dus eerder onrustiger dan eerlijker.

Wat ASCEND ermee kan: GAP per kilometer tonen alleen waar die kilometer minstens 10 meter stijging of daling heeft (eigen aanname), met de curve van Minetti voor lopen. Op een vlakke kilometer het gewone tempo.

### 2.7 Wind en temperatuur

Wat bekend is over wind. De zuurstofkosten van luchtweerstand stijgen met het kwadraat van de luchtsnelheid langs je lichaam; op middellangeafstandssnelheid (ongeveer 6 meter per seconde) gaat zo'n 7,5 procent van de energie naar luchtweerstand, en achter een andere loper valt bijna alles weg ([Pugh 1971, Journal of Physiology](https://pmc.ncbi.nlm.nih.gov/articles/PMC1331759/)) (bewijs: sterk voor het principe, klein aantal proefpersonen). Wind mee geeft maar ongeveer de helft terug van wat wind tegen kost (Davies 1980, Journal of Applied Physiology, alleen via secundaire bronnen gezien, bijvoorbeeld [RunnersConnect](https://runnersconnect.net/running-training-articles/running-in-windy-conditions/)) (bewijs: zwak, want niet zelf gelezen).

Een rekensom voor de eigenaar (afgeleid, ruw): op 5:30 per km (3 meter per seconde) kost luchtweerstand bij windstilte maar zo'n 2 procent (7,5 procent maal (3/6) in het kwadraat). Harde wind van 40 km/u op 10 meter hoogte is op borsthoogte ruwweg 25 km/u, 7 meter per seconde (een gangbare benadering met het logaritmische windprofiel boven open terrein; afgeleid). Tegen de wind in is de luchtsnelheid dan 10 meter per seconde; in het kwadraat is dat elf keer zoveel als bij windstilte, en de luchtweerstand kost dan zo'n 20 procent extra energie. Bij gelijke inspanning ben je op zo'n stuk ruwweg 5 tot 10 procent trager, 15 tot 35 seconden per km. Op een heen-en-terugroute komt maar ongeveer de helft daarvan terug. Dat is groot genoeg om een test te kleuren, en groter dan de 3,5 procent spreiding van een 5 km-tijdrit bij recreanten.

Temperatuur staat al in het loopinzicht: ongeveer een slag per graad bij gelijk tempo, uit één kleine studie (bewijs: zwak).

Wat ASCEND ermee kan: bij het ophalen van de reeks per kilometer de looprichting uit de positie halen, met de wind van dat uur (Open-Meteo `windspeed_10m` en `winddirection_10m`) de tegenwindcomponent per kilometer uitrekenen, en daarna de positie weggooien. Zo blijft het spoor van huis weg (zoals besloten in het loopinzicht) en weet ASCEND toch welke kilometers tegen de wind in waren. intervals.icu heeft `headwind_percent` en `average_wind_speed` per interval, maar alleen voor supporters (zeker in de specificatie, goed op het forum), dus daar niet op bouwen.

## 3. Per soort run: wat er telt

Rustige loop. Hartslag per kilometer en de tijd in de geplande zone zijn het belangrijkst; efficiëntie en vorm bestaan al. De kilometertijden zijn hier alleen informatie: een rustige loop hoort op hartslag te gaan, dus een schommelend tempo is geen fout. Zwijgen bij een normale loop.

Lange loop. Drift (bestaat), hartslag per kilometer, en in het laatste derde staplengte en contacttijd bij gelijk tempo (bestaat als `formOf`). Nieuw: een regel als het tempo in het laatste kwart meer dan 5 procent zakte terwijl de hartslag gelijk bleef of daalde, want dat past bij moe wordende benen of te weinig eten (eigen aanname, steunt op de redenering in het loopinzicht bij dalen).

Tempoloop. Per blok: tempo, hartslag in de tweede helft van het blok, en of het laatste blok even snel was als het eerste. Het sjabloon zegt het zelf: "Gelijkmatig: het laatste blok even snel als het eerste" (`data/defaultProgram.ts`). Ruisgrens: blokken van 7 minuten zijn ruim een kilometer, dus 3 procent is ook hier de grens van de GPS. Een blok dat meer dan 4 procent trager is dan het eerste en een hartslag die in hetzelfde blok hoger ligt is een feit: "het laatste blok was 12 seconden per km trager bij een hogere hartslag".

Intervallen. Per herhaling: tempo (op de afstand of de tijd van het blok), de hartslag in de laatste helft, en de hoogste hartslag; per pauze de daling van de hartslag in de eerste minuut. Het nuttige oordeel is het verval: de laatste herhaling tegen het gemiddelde van de eerste twee. Hartslag loopt achter, dus een herhaling van een minuut wordt op tempo gelezen en niet op hartslag. Bij herhalingen korter dan 400 meter is de GPS te grof voor een tempo per herhaling (afgeleid uit de fout van 3 tot 6 procent over korte afstanden); dan alleen de tijd en de hartslag.

Heuvel. GAP per herhaling bergop, klimsnelheid en hartslag (de klimmen bestaan al voor tochten), en bergaf alleen feiten, zoals besloten.

Test en wedstrijd. Zie hoofdstuk 4. Hier draait alles om de verdeling, de omstandigheden en één advies voor de volgende keer.

## 4. Een goede testloop van 5 km

### Hoe hoort het tempo verdeeld te zijn

Wat het bewijs zegt: bij een 5 km is een vrijwel gelijkmatig tempo met hoogstens een iets snellere eerste kilometer en een eindsprint het patroon van de besten (Tucker e.a. 2006, bewijs matig voor elite). In één kleine studie liepen elf matig getrainde vrouwen op de loopband een 5 km waarbij de eerste 1,63 km gelijk, 3 procent of 6 procent sneller dan hun gemiddelde was; de eindtijden verschilden niet significant (21:11, 20:52 en 20:39), al liep de meerderheid haar beste tijd na de snellere start ([Gosztyla en Kenefick 2006, JSCR](https://pubmed.ncbi.nlm.nih.gov/17149992/), samenvatting via [Sports Performance Bulletin](https://sportsperformancebulletin.com/endurance-training/training-structure-and-planning/pace-pb-fast-start-best-option)) (bewijs: zwak; klein, loopband, verschil niet significant). Een start die 10 procent te snel is kost tijd volgens dezelfde bron (bewijs: zwak, de oorspronkelijke studie niet gevonden). Recreanten zijn slechter in het kiezen en vasthouden van een goed tempo dan getrainde lopers (marathondata, zie hoofdstuk 2.1).

Voorstel voor ASCEND (afgeleid): een goede test is gelijkmatig. Een eerste kilometer tot 3 procent sneller dan het gemiddelde is prima. Daarboven, en zeker met een tweede helft die trager is, is het een te snelle start. Dit is ook wat de watchtekst van de test al zegt ("zo snel als je gelijkmatig kunt volhouden").

### Welke opwarming

Wat het bewijs zegt: een review van opwarmen raadt een actieve opwarming van minder dan 15 minuten rustig aan, gevolgd door 4 tot 5 korte versnellingen of stukjes op wedstrijdtempo ([McGowan e.a. 2015, Sports Medicine](https://researchprofiles.canberra.edu.au/en/publications/warm-up-strategies-for-sport-and-exercise-mechanisms-and-applicat/)) (bewijs: matig voor opwarmen in het algemeen). Specifiek voor een 5 km vonden de kleine studies geen verschil tussen opwarmvormen, ook niet tegen geen opwarming: bij acht recreanten gaven geen opwarming, rustig inlopen en inlopen met vier sprintjes van 15 seconden dezelfde tijd ([Marsh en Kilcourse, Salford](https://salford-repository.worktribe.com/output/1415786/does-a-high-intensity-warm-up-benefit-5-km-running-performance), alleen de samenvatting via zoekresultaten gelezen) (bewijs: zwak). Bij fietsers maakte de duur van de opwarming voor een tijdrit van 5 km niets uit ([Bunn e.a. 2017](https://coachsci.sdsu.edu/csa/vol212/bunn.htm)) (bewijs: zwak voor lopen).

Voor de eigenaar: een kwartier fietsen vooraf is een prima algemene opwarming. Wat ontbrak zijn een paar versnellingen van 15 tot 20 seconden op testtempo; die helpen vooral om het juiste tempo te voelen, en dat is precies waar de eerste kilometer misging (afgeleid). ASCEND hoeft de opwarming niet te beoordelen. Het kan uit de reeks zien of er minstens 8 minuten gelopen is voor het stuk van de test, en dat als feit noemen. Een rit vooraf ziet ASCEND alleen als die ook gelogd is.

### Hoe je een test leest

Altijd in deze volgorde, op het stuk dat telt (de beste 5 km als die er is):

1. De vijf kilometertijden met hartslag, cadans en staplengte per kilometer.
2. De verdeling in één woord: gelijkmatig, te snelle start, ingezakt, of sterker geëindigd. Grenzen (eigen aanname, op de GPS-ruis van 3 procent met een marge):
   - gelijkmatig: tweede helft binnen 2 procent van de eerste en geen kilometer meer dan 4 procent van het gemiddelde;
   - te snelle start: eerste kilometer minstens 4 procent sneller dan het gemiddelde en de tweede helft minstens 2 procent trager dan de eerste;
   - ingezakt: een kilometer vanaf de derde minstens 5 procent trager dan het gemiddelde, zonder dat de tegenwind of een helling dat verklaart;
   - sterker geëindigd: tweede helft minstens 2 procent sneller.
3. Wat meespeelde, als losse feiten, alleen wat ASCEND echt weet: wind (gemiddeld 25 km/u of meer, of vlagen boven 40, de grens uit `runComparison.ts`) met de kilometers die tegen de wind in waren; de beenindex van die ochtend; spierpijn die de eigenaar meldde; gevoelstemperatuur boven 20 graden; geen inlopen gezien; hoogte boven 10 meter per kilometer; een pauze in het stuk.
4. Eén advies voor de volgende keer, alleen als de verdeling geen "gelijkmatig" was.

Waarom wind de verdeling kan verklaren: op een rondje of heen-en-terug liggen de tegenwindkilometers vaak in de tweede helft of juist in het midden. Als de trage kilometers samenvallen met een tegenwind op borsthoogte van 15 km/u of meer (eigen aanname), zegt ASCEND "de tegenwind op km 3 en 4 kan dit verklaren" en noemt het geen inzakken.

Spierpijn en een test: bij lopen boven 75 procent van VO2max was de loopeconomie 24 en 48 uur na zware beentraining matig slechter (SMD 0,74 en 0,62) ([Burt, Doma en Connor 2023](https://researchonline.jcu.edu.au/77226/), al in `Spierbelasting en beenvermoeidheid.md`) (bewijs: matig). Een test met spierpijn onderschat je dus waarschijnlijk.

### Het advies voor de volgende keer

De regel (voorstel, eigen aanname):

- Bij een te snelle start: "Begin de volgende test op [doeltempo], dat is [X] seconden per km rustiger dan je eerste km vandaag." Het doeltempo is het gemiddelde tempo van de beste 5 km van deze test, naar boven afgerond op 5 seconden. Alleen als X minstens 10 seconden is (onder de GPS-ruis zwijgt het).
- Bij inzakken zonder te snelle start en zonder wind: "Je zakte vanaf km [k] in. Begin de volgende keer 5 seconden per km rustiger." Voorzichtiger, want inzakken kan ook vermoeidheid van die dag zijn.
- Bij sterker geëindigd: "Je had nog over. Je mag de volgende keer 5 seconden per km sneller beginnen." Alleen als de laatste kilometer minstens 4 procent sneller was dan het gemiddelde.
- Bij gelijkmatig: geen advies, één zin "Gelijkmatig gelopen."

Wat het nooit zegt: "dan loop je sneller", "dan haal je je doel" of een voorspelde tijd. Het bewijs zegt alleen dat gelijkmatig meestal het snelst is, niet hoeveel sneller jij wordt. Formulering: "Gelijkmatig lopen is meestal het snelst."

### Wanneer een test niet bruikbaar is

Er is al een goed mechanisme: een test die duidelijk trager is dan de vorige wacht op "Telt mee" of "Telt niet mee" (`2026-10-27-testloop-lezen.md`). Dit onderzoek voegt toe wat in de vraag hoort te staan. Mijn voorstel:

- Niet te gebruiken, en dat zegt de app: geen stuk van 5 km zonder pauze in de reeks (dat bestaat al als "hele run"), een loopband, of een reeks met minder dan 80 procent hartslag of afstand.
- Twijfelachtig, en de vraag noemt waarom: twee of meer van wind, benen niet fris, spierpijn gemeld, warmte, te snelle start met inzakken, heuvelachtig. Dan zegt het blad: "Deze test was trager dan je vorige. Er speelde mee: harde wind op km 3 en 4, spierpijn en een te snelle start. Telt hij mee voor je tempo's?"
- Bruikbaar maar voorzichtig: een test met een slechte verdeling onderschat je meestal; dat geeft tragere tempo's, wat de veilige kant op is. Dat mag de app zeggen: "Met een gelijkmatige start was dit waarschijnlijk iets sneller geweest. Je tempo's blijven daardoor aan de rustige kant."

### Een nagemaakt voorbeeld

Een loper loopt 6,0 km in 35:20, waarvan de eerste 1,0 km inlopen op 6:35. De beste 5 km duurt 28:45, gemiddeld 5:45 per km. De kilometers: 5:22, 5:38, 5:58, 6:02, 5:45. De wind komt met 30 km/u (op 10 meter) uit het westen; km 3 en 4 gaan naar het westen.

Wat ASCEND zegt: de eerste kilometer was 23 seconden (6,7 procent) sneller dan het gemiddelde, de tweede helft 4 procent trager dan de eerste. Dat is een te snelle start. Km 3 en 4 hadden ongeveer 18 km/u tegenwind op borsthoogte, dus het inzakken daar is deels wind. De hartslag steeg van 168 naar 182; de cadans bleef rond 172, de staplengte zakte van 1,08 naar 0,97 meter in km 3 en 4. Advies: "Begin de volgende test op 5:45 per km, dat is 23 seconden rustiger dan je eerste km vandaag. Gelijkmatig lopen is meestal het snelst."

## 5. Patronen en trends over meerdere runs

Wat zinnig is, en hoe robuust:

- Efficiëntie bij gelijke hartslag. Bestaat (`aerobicTrend`, efficiëntierij). Het loopinzicht stelde al voor de drempel op 7 seconden per km te zetten en minstens 3 loopjes aan elke kant. Geen nieuwe maat.
- Drift bij lange runs. Bestaat. De mediaan van de laatste drie tegen de drie daarvoor, pas bij 3 procentpunten.
- Cadans en contacttijd bij hetzelfde tempo. Nieuw voorstel: per rustige of lange loop een punt (gemiddelde over het vaste blok), dan een rechte lijn van cadans tegen snelheid over de laatste 6 weken, en die lijn aflezen op één vast referentietempo (het mediane tempo van je rustige loopjes). Dat haalt het tempo-effect weg dat het loopinzicht nu met "tempo binnen 6 procent" uitsluit. Minimaal 6 loopjes die samen minstens 10 procent in snelheid verschillen; een verandering vanaf 3 stappen per minuut of 4 procent contacttijd tussen twee periodes van 6 weken (eigen aanname, op de spreiding uit Miqueleiz 2025 met marge).
- Verval van vorm binnen lange runs. Per lange loop de verandering van contacttijd van eerste naar laatste derde; als trend de mediaan van de laatste drie. Dit is het eerlijkste vormsignaal, omdat verschillen tussen dagen wegvallen (Zandbergen 2023).
- Een tempoverdeling die terugkomt. Over tests, wedstrijden en tempoloopjes: als 3 van de laatste 5 een te snelle start hadden, wordt het een patroon op Je stand en in het blad van de volgende test: "Je begint vaak te snel: 3 van je laatste 5 harde loopjes." Minimaal 3 runs met een verdeling (eigen aanname).
- Testtijden. De spreiding van een 5 km-tijdrit bij recreanten is 3,4 procent (`Tussendoel hardloopwedstrijd.md`). Twee tests zijn pas verschillend boven 3,5 procent, zoals al gebouwd.

Wat niet zinnig is: een trend in verticale ratio of oscillatie zonder spreidingscijfer, een trend in vermogen voordat duidelijk is hoe Garmins vermogen met wind omgaat, en een trend over loopjes met wisselende hartslagbron.

Hoeveel gegevens minimaal: binnen één loop 20 minuten (bestaat als `FORM_MIN_SEC`); tegen eerdere loopjes 3 vergelijkbare in 6 weken (bestaat); voor een lijn tegen snelheid 6 loopjes; voor een terugkerende verdeling 3 harde runs.

## 6. Wat andere apps doen

- Garmin Connect. Splits per ronde (meestal automatische ronde per km) met tempo, hartslag, cadans, staplengte en loopdynamica, en grafieken over de run waarin je kunt schuiven. De kleurvakken voor loopdynamica zijn Garmins eigen indeling. Performance Condition geeft na 6 tot 20 minuten een getal van -20 tot +20 uit tempo, hartslag en HRV ten opzichte van je gemiddelde fitheid ([Garmin-handleiding](https://www8.garmin.com/manuals/webhelp/forerunner935/EN-US/GUID-901ACCFC-FB0D-414E-B80C-54970AF4E357.html)) (zeker voor wat het is; niet onafhankelijk gevalideerd voor zover ik vond). Wat werkt: de rondes. Wat ruis is: losse kleuren zonder vergelijking met jezelf.
- Strava. Kilometertijden met GAP en hoogte als staafjes, best efforts (snelste 1 km, 5 km enzovoort) uit elke run, en analyses van tempo en hartslag voor abonnees. De best efforts en de splits met GAP zijn wat gebruikers het meest noemen (expertopinie, eigen waarneming van reviews, niet systematisch gemeten).
- Runalyze. Effectieve VO2max per run uit hartslag en snelheid, met een correctiefactor op je beste wedstrijd, en de mogelijkheid om losse runs uit te sluiten omdat pauzes, heuvels en ondergrond de schatting verstoren ([Runalyze help](https://runalyze.com/help/article/difference-between-vo2max-and-effective-vo2max)) (zeker voor wat het doet). Ook ontkoppeling. Het eerlijke deel: ze zeggen zelf dat losse runs fout kunnen zijn.
- intervals.icu. Intervallen met per interval alle gemiddelden (zie hoofdstuk 7), Pa:HR-ontkoppeling, efficiëntiefactor, tempo- en hartslagcurves en best efforts. Ontkoppeling op tempo voor hardlopen was een lang gekoesterde wens op het forum ([Decoupling for running](https://forum.intervals.icu/t/decoupling-for-running/24856)) (goed).
- Stryd. Vermogen als hoofdmaat, met form power en leg spring stiffness. Stryd is het meest herhaalbaar van de vermogensmeters (Cerezuela-Espejo 2021), maar de afgeleide vormmaten zijn eigen algoritmen zonder onafhankelijke toets van hun nut ([Imbach e.a. 2020](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7404478/)) (bewijs: zwak voor nut).
- COROS. Effort Pace, een persoonlijke GAP op je eigen hartslag op hellingen, zonder weer of hoogte ([COROS support](https://support.coros.com/hc/en-us/articles/4416357686164)) (leveranciersuitspraak); een algoritme dat niet openbaar is.
- Polar. Running Index: een geschatte VO2max per run uit hartslag en snelheid na 12 minuten, met filters voor drift en heuvels; Polar noemt het zelf vooral een maat voor de trend ([Polar support](https://support.polar.com/en/running-index)) (zeker voor wat het doet).

De les (afgeleid): wat gebruikers waarderen is concreet en per stuk (kilometers, rondes, best efforts, GAP), en een vergelijking met zichzelf. Wat ruis is: een getal per run dat beweegt zonder dat je weet waarom (Performance Condition, VO2max per run, kleurvakken). Runalyze en Polar zijn eerlijk dat een losse run fout kan zijn; ASCEND doet dat al met "Niet te vergelijken".

## 7. Ronden en intervallen bij intervals.icu

Wat de specificatie zegt (zeker, gelezen op 27 oktober 2026):

- `GET /api/v1/activity/{id}/intervals` geeft `IntervalsDTO`: `id`, `analyzed` (datum en tijd), `icu_intervals` (lijst van `Interval`) en `icu_groups` (lijst van `IntervalGroup`).
- Hetzelfde komt mee met `GET /api/v1/activity/{id}?intervals=true` en met `GET /api/v1/athlete/{athleteId}/activities/{ids}?intervals=true`.
- Een `Interval` heeft onder meer: `id`, `type` (WORK of RECOVERY), `label`, `group_id`, `start_index`, `end_index`, `start_time`, `end_time`, `distance`, `moving_time`, `elapsed_time`, `average_speed`, `min_speed`, `max_speed`, `gap`, `average_heartrate`, `min_heartrate`, `max_heartrate`, `average_cadence`, `min_cadence`, `max_cadence`, `average_stride`, `total_elevation_gain`, `min_altitude`, `max_altitude`, `average_gradient`, `decoupling`, `zone`, `intensity`, `average_watts` en verwanten, `average_respiration`, `average_temp`, de negen loopdynamicagemiddelden, en de weervelden `average_weather_temp`, `average_feels_like`, `average_wind_speed`, `average_wind_gust`, `prevailing_wind_deg`, `headwind_percent`, `tailwind_percent`.
- Een `IntervalGroup` is een groep gelijke intervallen met dezelfde gemiddelden en een `count`.
- `GET /api/v1/activity/{id}/interval-stats?start_index=&end_index=` geeft de gemiddelden van een willekeurig stuk als `Interval`.
- `GET /api/v1/activity/{id}/best-efforts?stream=&distance=` (of `duration`) geeft de beste stukken van een reeks; standaard 8.
- Op `Activity` staan `icu_lap_count`, `interval_summary` (lijst van tekst), `icu_intervals_edited` en `lock_intervals`.

Wat het forum zegt:

- intervals.icu rekent intervallen opnieuw uit de meetpunten; het gebruikt van de rondes uit het FIT-bestand alleen de tijdstippen, niet de samenvatting van het horloge ([forum, augustus 2026](https://forum.intervals.icu/t/disable-interval-detection-use-laps-instead-of-detecting-intervals-not-respecting-device-laps/130913)) (goed, gebruikers met uitleg, geen ontwikkelaar in die draad). De getallen per ronde kunnen daarom een paar seconden van Garmin Connect afwijken, vooral met zuinige GPS-opname.
- Er is een instelling "Use laps for intervals" per sport en "Keep all laps"; zonder die instelling kiest intervals.icu zelf intervallen en laat rondes die niet op een interval lijken vallen ([Laps and interval detection updates](https://forum.intervals.icu/t/laps-and-interval-detection-updates/10779), ontwikkelaar april 2022) (goed).
- Bij gestructureerde trainingen van een Garmin worden de intervallen gelabeld met de stap van de training (zelfde draad, voor vermogen) (goed voor vermogen, waarschijnlijk ook voor lopen).
- Of automatische detectie zonder vermogen op tempo werkt, spreken de antwoorden op het forum elkaar tegen (onzeker). Bij de eigenaar is er waarschijnlijk vermogen (hoofdstuk 1), dus de detectie werkt waarschijnlijk wel.

Wat ik niet vond: een eindpunt dat de ruwe rondes van het horloge teruggeeft los van de intervallen (onzeker; waarschijnlijk niet). Of automatische rondes per kilometer als interval binnenkomen hangt van de instellingen hierboven af.

Advies:

- Kilometertijden rekent ASCEND zelf uit de afstandsreeks. Dat hangt van niets af en klopt altijd met de rest.
- De intervallen haalt ASCEND op met het aparte eindpunt, één verzoek per run, en bewaart de grenzen (`start_time`, `end_time`, `type`, `label`, `group_id`) plus wat intervals.icu ervan vond. Getoond worden de rondes met ASCEND's eigen getallen uit de reeks, zodat er één waarheid is. Het label laat zien of een ronde een stap van de training was ("Warming-up", "Test", "Cooling-down", die ASCEND zelf naar het horloge stuurt, `engine/watchWorkout.ts`).
- Bij een test zoekt ASCEND eerst de ronde met het label van de teststap; is die er en is hij 5 km (binnen 10 procent), dan is dat het teststuk. Anders de beste 5 km zoals nu. Dat haalt het verschil weg tussen "het stuk dat jij als test liep" en "het snelste stuk".

## 8. Wat ASCEND per run bewaart, en met welke resolutie

De eigenaar heeft gezegd dat opslag geen bezwaar is en dat alles wat nuttig is opgehaald mag worden. Dit hoofdstuk is daarom concreet genoeg om te bouwen.

### Welke resolutie

Advies: de volledige reeks, op de tijdstippen waarop het horloge ze schreef. Niet elke 5 seconden en niet elke 10 meter.

Waarom:

- Kilometergrenzen, rondegrenzen en de beste 5 km vragen een nauwkeurigheid van een seconde. Elke 5 seconden geeft op een kilometer van 5:30 tot 1,5 procent fout per grens, de helft van de hele GPS-ruis (afgeleid).
- Hartslag bij intervallen en het herstel in een pauze verandert binnen tien seconden; elke 5 seconden mist de piek.
- Elke 10 meter (op afstand) maakt pauzes, stilstand en alles wat op tijd gaat (hartslag, herstel) scheef, en bergop wordt een punt elke 10 meter een punt per 10 tot 20 seconden.
- De besparing is klein: de hele reeks is al maar een paar honderd KB per uur, zie hieronder.

Een Garmin schrijft meestal elke seconde, of met "slimme" opname onregelmatig, ongeveer elke 1 tot 7 seconden (waarschijnlijk; of een Forerunner 255 de keuze nog heeft is onzeker). Bewaar de tijdreeks zoals hij is; alle rekenwerk werkt al met echte tijdstippen (`timeSec`).

### Welke reeksen

Vraag alles wat in `Activity.stream_types` staat en dat ASCEND kent, en zet er nu bij:

- `watts` (vermogen), nu bewust weggelaten; bij deze eigenaar waarschijnlijk aanwezig;
- `respiration` (ademhaling, waarschijnlijk de naam; `average_respiration` staat zeker op het interval);
- `temp` (temperatuur van het horloge; niet als weer gebruiken, wel als gegeven bewaren; de naam is waarschijnlijk);
- de verticale snelheid (`vertical_speed`, goed volgens het forum);
- `grade_smooth` en `moving` niet: ASCEND rekent helling en stilstand zelf.

Onbekende namen in `stream_types` worden genegeerd, maar de namen (niet de waarden) worden in de opslag genoteerd, zodat later te zien is wat er nog meer is.

De positie (`latlng`): niet bewaren, zoals besloten in het loopinzicht. Gebruik hem alleen tijdens het verwerken voor de eerste plaats (weer) en voor de looprichting per kilometer (tegenwind), en gooi hem daarna weg. Een spoor laat zien waar iemand woont; dat is geen opslagvraag maar een privacyvraag. Als de eigenaar toch een kaart wil, is dat een aparte schakelaar "Route op dit toestel bewaren", standaard uit, en dan nooit in een back-up (open vraag 1).

### Hoe het in IndexedDB staat

Een nieuwe objectstore `activityStreams`, met `logId` als sleutel, los van `sessionLogs`. Zo blijft het laden van alle logs (wat de app bij elke start doet) even snel als nu, en kan een reeks verdwijnen zonder dat een log iets verliest. Het profiel `detail` blijft op de log staan zoals nu: daarop rekenen de vergelijkingen, en het reist mee in de back-up.

Een voorstel voor de vorm (merkloos, zoals `StreamSet`):

```ts
export interface StoredSeries {
  // How the numbers are packed: the value is raw * scale, and `missing` marks a gap.
  type: 'u8' | 'u16' | 'i16' | 'u32' | 'f32';
  scale: number;
  missing: number;
  data: ArrayBuffer;
}

export interface ActivityStreams {
  logId: string;
  externalId: string;
  version: 1;
  fetchedAt: string;
  // The totals of the log the series were read for, so a correction at the source makes them stale (like bestEffort).
  wholeKm: number;
  wholeMinutes: number;
  sampleCount: number;
  series: Partial<Record<StreamKindStored, StoredSeries>>;
  // Per kilometre, derived once while the position was still there; the position itself is not kept.
  headwindKmh?: number[];
  laps?: StoredLap[];
  unknownKinds?: string[];
}

export interface StoredLap {
  startSec: number;
  endSec: number;
  kind?: 'work' | 'recovery';
  label?: string;
  groupId?: string;
  // What the source computed, kept for comparison; ASCEND shows its own numbers from the series.
  source?: { distanceM?: number; avgHeartRate?: number; avgSpeedMs?: number; avgWatts?: number };
}
```

De verpakking per reeks (eigen keuze, op wat de getallen nodig hebben):

- tijd: `u32`, seconden;
- afstand: `f32`, meters;
- hartslag: `u8`, slagen per minuut, 255 is een gat;
- snelheid: `u16`, millimeters per seconde;
- hoogte: `f32`, meters (een `i16` in decimeters past niet boven 3.276 meter, en de Alpen gaan hoger);
- cadans: `u8`, stappen per minuut (al verdubbeld waar nodig, zoals nu);
- vermogen: `u16`, watt;
- grondcontacttijd: `u16`, milliseconden;
- balans: `u16`, honderdsten van een procent;
- verticale oscillatie: `u16`, tienden van een millimeter;
- verticale ratio: `u16`, honderdsten van een procent;
- staplengte: `u16`, millimeters;
- ademhaling: `u16`, tienden van een ademhaling per minuut;
- temperatuur: `i16`, tienden van een graad;
- verticale snelheid: `i16`, millimeters per seconde.

IndexedDB bewaart een `ArrayBuffer` gewoon als binaire gegevens (structured clone, zeker volgens de webstandaard). Een gewone lijst van JavaScript-getallen zou per getal grofweg 2 tot 9 bytes kosten in plaats van 1 tot 4 (waarschijnlijk, afgeleid uit hoe browsers waarden serialiseren), dus de verpakking scheelt een factor 2 tot 4.

### Wat het kost

Per meting zijn de vijftien reeksen samen ongeveer 34 bytes (afgeleid uit de lijst hierboven). Bij één meting per seconde:

- een test van 36 minuten: ongeveer 75 KB;
- een uur lopen: ongeveer 120 KB;
- een lange loop van 2 uur: ongeveer 245 KB;
- een tochtdag van 7 uur: ongeveer 860 KB;
- de rondes en de tegenwind per kilometer: een paar KB.

Een jaar met ongeveer 200 loopjes van gemiddeld 50 minuten en 30 tochtdagen van 6 uur is ruwweg 20 plus 22 is 42 MB. De GR5 zelf (ongeveer 30 dagen) is nog eens rond de 25 MB. Een `CompressionStream('gzip')` (in Chrome en recente Safari) zou dit waarschijnlijk nog halveren, maar is niet nodig.

Wat een telefoon toestaat: Chrome geeft een site tot 60 procent van de totale schijfruimte, Safari vanaf iOS 17 ongeveer 60 procent voor de browser en voor web-apps op het beginscherm, en IndexedDB deelt die ruimte met de cache van de app ([MDN, Storage quotas and eviction criteria](https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)) (zeker voor wat MDN zegt). Op een telefoon van 64 GB is 42 MB per jaar dus verwaarloosbaar. Het risico is niet de ruimte maar het wissen: zonder blijvende opslag mag de browser bij ruimtegebrek alles van een site weggooien, en Safari wist gegevens van een site die zeven dagen niet is aangeraakt (met trackingbescherming aan). ASCEND vraagt al `navigator.storage.persist()` (`storage/persistence.ts`); dat blijft de bescherming.

### Back-up, verwijderen en ophalen

- De reeksen gaan niet in de JSON-back-up en niet in de automatische `backupSnapshots`. Ze zijn bij intervals.icu terug te halen, ze zouden een back-up tientallen MB maken (in base64 nog een derde groter), en `detail` en `bestEffort` reizen al mee. Een schakelaar "Reeksen meenemen in de back-up", standaard uit, kan later.
- Een log verwijderen verwijdert zijn reeks; "Alles verwijderen" leegt de store.
- In Gegevens en back-up een rij "Reeksen op dit toestel" met de omvang (`navigator.storage.estimate`, plus de som van de store), en in het blad de actie "Reeksen verwijderen".
- Ophalen: zoals nu bij het koppelen, één run tegelijk, nu met twee verzoeken (streams en intervallen). Oudere logs met een `externalId` alleen na een tik, hoogstens 10 per opstart (`2026-10-22-lege-velden-aanvullen.md`).
- Correctie bij de bron (`sourceSync.updated`): zijn `wholeKm` of `wholeMinutes` anders dan de log, dan is de reeks verouderd en wordt hij opnieuw gehaald, net als `bestEffort`.
- Instelling: de bestaande schakelaar "Details van loopjes en tochten" dekt het ophalen. Een tweede, "Volledige reeks bewaren" (standaard aan), voor wie liever alleen het profiel houdt. Beide in `settingsIndex.ts`, `settingsLayout.ts` en `settingsSummary.ts`.

Wat dit de rest van de app geeft: alles in dit document kan opnieuw berekend worden als een drempel verandert, zonder opnieuw op te halen. Dat is de echte winst, want de meeste drempels hier zijn eigen aannames die na een paar weken geijkt moeten worden.

## 9. Advies aan ASCEND: wat de gebruiker te zien krijgt

### Na een run: kort, zoals nu

De regel van `runInsight.ts` blijft: hoogstens twee regels, één Beter en één Let op, met ruisdrempels en het weer als verklaring. Voorstel voor één toevoeging: een test, wedstrijd, tempoloop of intervaltraining krijgt nu niets; geef die hoogstens één regel over de verdeling, de enige die na zo'n training echt bruikbaar is:

- test of wedstrijd: het advies voor de volgende keer (hoofdstuk 4), of "Gelijkmatig gelopen.";
- tempoloop en intervallen: "Het laatste blok was 12 seconden per km trager dan het eerste." alleen boven 4 procent, anders niets.

Die regel neemt de plaats in van "Let op" (de training heeft geen efficiëntie- of vormregel), dus het blijft bij hoogstens twee.

### Het diepe overzicht: een eigen blad met een andere grens

Ja, voor een apart diep overzicht mag de grens anders zijn, omdat de eigenaar het zelf opent en dus vraagt om meer. Maar het verschil zit in feiten, niet in oordelen. Voorstel:

1. Bovenaan één zin die de run samenvat in gewone woorden: "Je begon 23 seconden per km sneller dan je gemiddelde en zakte op km 3 en 4 in, met tegenwind."
2. De kilometers als rijen: tijd, hartslag, cadans, staplengte, en GAP waar het heuvelig was; tegenwindkilometers met een klein teken.
3. De rondes van het horloge, als die er zijn, op dezelfde manier.
4. Een grafiek over de run met één reeks tegelijk (tempo, hartslag, cadans, staplengte, contacttijd, oscillatie, verticale ratio, balans, vermogen, hoogte), te kiezen met een keuzerij; tempo en hartslag samen als standaard.
5. Vorm: het eerste derde tegen het laatste derde, als feiten.
6. Wat meespeelde: weer, wind, benen, spierpijn, opwarmen, route.
7. Hoogstens één advies voor de volgende keer.

Grenzen in het overzicht: feiten mogen allemaal, oordeelwoorden hoogstens drie (bijvoorbeeld "te snelle start", "ingezakt", "gelijkmatig"), en elk oordeel heeft een ruisdrempel uit dit document. Een advies hoogstens één.

### Wanneer ASCEND zwijgt

- Een verschil onder de ruisdrempel krijgt geen woord, alleen het getal.
- Een maat zonder spreidingscijfer (oscillatie, verticale ratio, balans, vermogen) krijgt na één run geen oordeel.
- Hartslag in herhalingen korter dan twee minuten krijgt geen oordeel.
- Bij een loopband, of minder dan 80 procent hartslag of afstand, staan er alleen de totalen.
- Als de eigenaar pijn meldt of "Slechter" kiest, valt het advies weg (zoals regel 10 nu voor Let op). Bij pijn: een arts of fysiotherapeut, niet de app.

### Nooit iets beloven dat niet klopt

- Nooit "dan loop je sneller", "dan haal je je doeltijd" of "je wordt fitter" na één run.
- Bij elk oordeel in het blad de sterkte in gewone woorden, zoals nu: "Eén kilometer schommelt door de GPS zo'n 3 procent. Dit verschil is 7 procent."
- Elke drempel die een eigen aanname is, staat in het blad als "te ijken op jouw gegevens".
- Wat ASCEND niet weet (een rit vooraf die niet gelogd is) noemt het niet als feit.

## 10. Voorstellen voor engine-regels

Alles voorstel, geen besluit. Namen zijn voorstellen.

- RD-1 Kilometertijden. `kmSplits(streams)`: per volle kilometer de tijd (geïnterpoleerd op de afstandsreeks), hartslag gemiddeld en hoogst, cadans, staplengte, contacttijd, oscillatie, verticale ratio, balans, vermogen, stijging en daling, GAP alleen bij minstens 10 m per km, en de tegenwind uit `headwindKmh`. Een pauze van meer dan 20 seconden telt niet mee (de grens van `bestEffort`).
- RD-2 Rondes. `lapSplits(streams, laps)`: dezelfde getallen per ronde, uit de reeks.
- RD-3 Teststuk. Eerst de ronde met de teststap van ongeveer 5 km, anders `bestEffortFromStream`, anders de hele run (zoals nu, met de zin welke).
- RD-4 Verdeling. `pacingOf(splits)`: gelijkmatig, te snelle start, ingezakt of sterker geëindigd, met de grenzen uit hoofdstuk 4 (4 procent eerste kilometer, 2 procent tussen de helften, 5 procent voor inzakken, 2 procent sterker), en "wind verklaart" bij tegenwind op borsthoogte vanaf 15 km/u op de trage kilometers.
- RD-5 Advies. `nextTimeAdvice(pacing, splits)`: het tempo van deze test naar boven op 5 seconden, alleen als het verschil met de eerste kilometer minstens 10 seconden is; vaste zinnen zoals in hoofdstuk 4; nooit een tijd of een belofte.
- RD-6 Wat meespeelde. `testConditions(log, context)`: lijst van feiten (wind, benen, spierpijn, warmte vanaf 20 graden gevoelstemperatuur, geen 8 minuten inlopen in de reeks, meer dan 10 m per km stijging, pauze). Gebruikt in het blad en in de vraag "Telt mee".
- RD-7 Blokken en herhalingen. `repsOf(streams, laps, template)`: per werkblok tempo en hartslag in de tweede helft; verval van het laatste blok tegen de eerste twee, een feit vanaf 4 procent.
- RD-8 Tegenwind per kilometer. Bij het ophalen: looprichting per kilometer uit de positie, wind van dat uur, component op borsthoogte (0,65 maal de wind op 10 meter, afgeleid), daarna de positie weg.
- RD-9 Cadans tegen snelheid. Over de rustige loopjes van 6 weken een rechte lijn; afgelezen op het mediane rustige tempo; minimaal 6 loopjes met 10 procent snelheidsverschil.
- RD-10 Terugkerende verdeling. Drie van de laatste vijf harde runs met een te snelle start wordt een patroon.
- RD-11 Opslag. De store `activityStreams` uit hoofdstuk 8, met de verpakking per reeks, buiten de back-up, met verouderen op `wholeKm` en `wholeMinutes`.

Tests met nagemaakte reeksen: een gelijkmatige test, een te snelle start, inzakken met en zonder tegenwind, een test met een pauze, een reeks met slimme opname (onregelmatige tijden), een tocht van 7 uur voor de omvang, en een controle dat de uitkomst niet verandert als de ruis binnen 3 procent schommelt.

## 11. Open vragen voor de eigenaar

1. Wil je een kaart van je route in ASCEND? Dan moet de positie bewaard worden, alleen op dit toestel en nooit in een back-up. Mijn advies: niet, de tegenwind per kilometer kan ook zonder.
2. Staat bij intervals.icu "Use laps for intervals" aan voor hardlopen? Zo niet, dan komen je eigen rondes misschien niet als interval binnen.
3. Is de test voortaan als training van ASCEND op je horloge gezet (warming-up, test, cooling-down)? Dan vindt ASCEND het teststuk precies.
4. Wil je het diepe overzicht ook bij rustige loopjes, of alleen bij tests, tempo en intervallen?

## Wat het onderzoek zegt

- Een gelijkmatig tempo is bij een 5 km het beste patroon; een eerste kilometer tot 3 tot 6 procent sneller schaadt in één kleine studie niet, meer wel (bewijs zwak tot matig). Recreanten verdelen hun tempo slechter dan getrainde lopers.
- Kilometertijden zijn door de GPS zelf zo'n 3 procent onzeker; pas daarboven is een verschil tussen kilometers een patroon (afgeleid uit Gilgen-Ammann 2020).
- Harde tegenwind kost een recreant op een windstuk grofweg 5 tot 10 procent tempo, en wind mee geeft maar ongeveer de helft terug (Pugh 1971 sterk voor het principe, de rekensom afgeleid).
- Cadans is de betrouwbaarste loopmaat en verandert weinig met tempo; tempoverlies zit vooral in staplengte. Contacttijd hangt niet samen met zuinigheid, verticale oscillatie matig en alleen tussen lopers; binnen één loop zegt een langere contacttijd iets over vermoeidheid, maar per persoon verschillend (bewijs matig).
- Opwarmen: rustig inlopen plus een paar versnellingen is het advies van een review; voor een 5 km zelf vonden kleine studies geen verschil (bewijs zwak).
- intervals.icu geeft per activiteit intervallen met type, label, grenzen en alle gemiddelden via een apart eindpunt, en rekent die uit de meetpunten; ruwe rondes los daarvan vond ik niet.

## Wat het betekent voor de app

- Bewaar de volledige reeksen op het toestel in een eigen store, binair verpakt, ongeveer 120 KB per uur, buiten de back-up; vraag ook vermogen, ademhaling en temperatuur op, en de intervallen.
- Reken kilometertijden en rondes zelf uit de reeks, met tegenwind per kilometer zonder het spoor te bewaren.
- Geef een test, wedstrijd, tempoloop of intervaltraining voortaan één regel over de verdeling, met een concreet beginadvies en nooit een belofte.
- Bouw een diep overzicht met alle feiten per kilometer en per ronde, hoogstens drie oordeelwoorden en één advies.
- Zet in de vraag "Telt mee" wat de test beïnvloedde.

## Wat nog onzeker is

- Of de Forerunner 255 van de eigenaar echt vermogen, ademhaling en verticale snelheid schrijft, en onder welke namen intervals.icu die reeksen geeft; één blik op `stream_types` van zijn test beantwoordt het.
- Of zijn rondes als intervallen binnenkomen, en of de stappen van de test als label meekomen bij lopen zonder instelling.
- De herhaalbaarheid van verticale oscillatie, balans en Garmins vermogen; ik vond er geen cijfer voor.
- De windcorrectie: de omrekening naar borsthoogte en de 5 tot 10 procent zijn ruwe rekensommen, en het halve teruggeven bij wind mee heb ik alleen secundair gezien.
- De oorspronkelijke studie achter "10 procent te snel kost tijd" en de volledige tekst van Gosztyla 2006 (PubMed was niet bereikbaar).
- Alle drempels die als eigen aanname staan: ze moeten na een paar tests en tempoloopjes met de echte gegevens worden bekeken, en dat kan zodra de reeksen bewaard worden.

## Samenvatting: wat ASCEND zou moeten tonen en berekenen, in volgorde van waarde

1. De volledige reeksen bewaren, zodat alles hierna te berekenen en later te herijken is.
2. Kilometertijden met hartslag, cadans en staplengte per kilometer, op elk run-blad.
3. Bij een test de verdeling in één woord en één concreet beginadvies voor de volgende keer.
4. Wat de test beïnvloedde (wind per kilometer, benen, spierpijn, opwarmen, route), ook in de vraag "Telt mee".
5. Rondes en werkblokken uit intervals.icu, met het verval van het laatste blok.
6. Tegenwind per kilometer, zonder het spoor te bewaren.
7. GAP alleen op heuvelige kilometers.
8. Loopdynamica en vermogen per kilometer als feiten, en het eerste tegen het laatste derde.
9. Een terugkerende verdeling en cadans bij hetzelfde tempo als trend op Je stand.

## Bronnen

intervals.icu, Garmin en apps:

- Specificatie intervals.icu: https://intervals.icu/api/v1/docs
- Laps and interval detection updates: https://forum.intervals.icu/t/laps-and-interval-detection-updates/10779
- Use laps instead of detecting intervals: https://forum.intervals.icu/t/disable-interval-detection-use-laps-instead-of-detecting-intervals-not-respecting-device-laps/130913
- Decoupling for running: https://forum.intervals.icu/t/decoupling-for-running/24856
- Garmin Running Power: https://www8.garmin.com/manuals/webhelp/GUID-F41EAFB3-6CC9-42DE-9C6C-9E358DBB0671/EN-US/GUID-D74FC870-3A94-4376-81D5-C9484545EAD9.html
- Garmin-wind in loopvermogen: https://the5krunner.com/2017/12/10/garmin-running-power-wind
- Forerunner 255 en loopvermogen: https://www.wareable.com/garmin/garmin-forerunner-255-review-8851 en https://www.t3.com/features/garmin-forerunner-255s-HRM-Pro
- Garmin Performance Condition: https://www8.garmin.com/manuals/webhelp/forerunner935/EN-US/GUID-901ACCFC-FB0D-414E-B80C-54970AF4E357.html
- Runalyze: https://runalyze.com/help/article/difference-between-vo2max-and-effective-vo2max
- COROS Effort Pace en Adjusted Pace: https://coros.com/stories/coros-metrics/c/effort-pace en https://support.coros.com/hc/en-us/articles/4416357686164
- Polar Running Index: https://support.polar.com/en/running-index
- Strava GAP: https://medium.com/@drewrobb en https://patents.google.com/patent/US11623121
- MDN, opslaglimieten: https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

Wetenschap:

- Abbiss en Laursen 2008, pacingstrategieën: https://ro.ecu.edu.au/ecuworks/877
- Tucker e.a. 2006, pacing bij wereldrecords: https://lida.sport-iat.de/dlv/Record/4017815?lng=en
- Gosztyla en Kenefick 2006, snelle start op de 5 km: https://pubmed.ncbi.nlm.nih.gov/17149992/ (samenvatting: https://sportsperformancebulletin.com/endurance-training/training-structure-and-planning/pace-pb-fast-start-best-option)
- New York City Marathon, pacing van recreanten: https://abacus.universidadeuropea.com/entities/publication/cca9c361-104f-47ab-8275-d26a0b972973
- Smyth e.a. 2022, ontkoppeling bij 82.303 marathonlopers: https://uhra.herts.ac.uk/id/eprint/9660/
- Heaps, González-Alonso en Coyle 1994, drift en vochtbalans: https://www.thieme-connect.com/products/ejournals/pdf/10.1055/s-2007-1021023.pdf
- Buchheit 2014, hartslag monitoren: https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/
- Gilgen-Ammann e.a. 2020, afstand van sporthorloges: https://mhealth.jmir.org/2020/6/e17118
- de Ruiter e.a. 2020, cadans buiten: https://www.bisp-surf.de/Record/PU202004002347
- Van Hooren e.a. 2024, loopbiomechanica en loopeconomie: https://pmc.ncbi.nlm.nih.gov/articles/PMC11127892/
- Miqueleiz e.a. 2025, herhaalbaarheid van contacttijd en pas: https://pmc.ncbi.nlm.nih.gov/articles/PMC12127928/
- Cabrera-Linares e.a. 2025, validatie HRM-Pro: https://pmc.ncbi.nlm.nih.gov/articles/PMC12431186/
- Drobnič e.a. 2023, Running Dynamics Pod: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10459607/
- Studie Universiteit van Jaén, HRM-Run: https://crea.ujaen.es/items/7e6e93ad-b956-4d42-9d45-b5683f6e4a6a
- Zandbergen e.a. 2023, vermoeidheid en loopkinematica: https://research.utwente.nl/en/publications/effects-of-level-running-induced-fatigue-on-running-kinematics-a-/
- Cerezuela-Espejo e.a. 2021, loopvermogen van vijf systemen: https://portalinvestigacion.um.es/documentos/60e6a5984edb8e25f92d23e4
- Stryd tegen RunScribe: https://www.iat.uni-leipzig.de/datenbanken/iks/dvmf/Record/4073816
- Imbach e.a. 2020, validiteit Stryd: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7404478/
- Minetti e.a. 2002, kosten op hellingen: https://iris.unibs.it/retrieve/ddc633e4-3c03-4e2e-e053-3705fe0a4c80/Minetti%20JAP%202002.pdf
- Pugh 1971, windweerstand: https://pmc.ncbi.nlm.nih.gov/articles/PMC1331759/
- Davies 1980, wind mee en tegen (secundair): https://runnersconnect.net/running-training-articles/running-in-windy-conditions/
- McGowan e.a. 2015, opwarmen: https://researchprofiles.canberra.edu.au/en/publications/warm-up-strategies-for-sport-and-exercise-mechanisms-and-applicat/
- Marsh en Kilcourse, opwarmen voor 5 km: https://salford-repository.worktribe.com/output/1415786/does-a-high-intensity-warm-up-benefit-5-km-running-performance
- Bunn e.a. 2017, opwarmduur bij fietsers: https://coachsci.sdsu.edu/csa/vol212/bunn.htm
- Burt, Doma en Connor 2023, loopeconomie na krachttraining: https://researchonline.jcu.edu.au/77226/
