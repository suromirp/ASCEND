# Kleding bij het weer

Datum: 22 oktober 2026
Status: onderzoek en voorstel voor engine-regels, geen besluit
Gelezen vooraf: CLAUDE.md, `docs/beslissingen/2026-10-22-weer-open-meteo.md`, `src/engine/weather.ts` (alleen de kop en de uitvoer), `docs/visie/GR5-reis en coaching.md` (paklijst) en alle titels in `docs/onderzoek/`. Over kleding bij het weer staat daar nog niets; alleen de GR5-paklijst noemt muts, handschoenen en pet als vaste spullen. Dit onderzoek bouwt voort op het weerbesluit: de app kent al gevoelstemperatuur, wind, vlagen, neerslag, neerslagkans en daglicht, en de grenzen "let op" en "slecht". Dit rapport gaat over iets anders: wat trek je aan.

Geen medisch advies. Bij klachten door kou of hitte (verkleurde vingers, rillen dat niet stopt, verwardheid, duizeligheid): stoppen en een arts of huisarts raadplegen.

## Kort overzicht

Er bestaat geen wetenschappelijk gevalideerde tabel "temperatuur naar kleding" voor recreatieve sporters. De goede bronnen (ACSM, KNMI, Canadese windchill) gaan over veiligheid bij extreme kou en hitte, niet over de keuze tussen een thermoshirt en een gewoon shirt. De kledingkeuze zelf rust op gangbare praktijk van lopers, fietsers en bergsporters, en die praktijk is verrassend eensgezind: reken met een gevoelstemperatuur die hoger is dan wat het weerbericht zegt, hoe harder je gaat hoe meer, en bescherm handen en hoofd apart, want daar helpt je eigen warmte het minst. Op die twee gedachten bouw ik de regels. De getallen in de regels zijn daarom grotendeels eigen afleiding uit gangbare praktijk, en dat staat er per regel bij.

## Wat bevestigd is

### Kou en sport (ACSM)

De ACSM-positiestand "Prevention of Cold Injuries during Exercise" (Castellani e.a., 2006, Medicine & Science in Sports & Exercise 38(11): 2012 tot 2029) zegt volgens de samenvattingen die ik kon lezen dat sporten in de meeste koude omstandigheden veilig kan, mits je het risico inschat en kleding aan de persoon aanpast in plaats van één uitrusting voor iedereen te eisen. Windchill wordt gebruikt om het risico op bevriezing in te schatten, en onder ongeveer min 27 graden windchill hoort extra toezicht. Deze stand is in 2021 vervangen door "ACSM Expert Consensus Statement: Injury Prevention and Exercise Performance during Cold-Weather Exercise" (Castellani, Eglin, Ikäheimo, Montgomery, Paal, Tipton; Current Sports Medicine Reports 20(11): 594 tot 607; doi 10.1249/JSR.0000000000000907). Samenvatting: https://researchportal.port.ac.uk/en/publications/acsm-expert-consensus-statement-injury-prevention-and-exercise-pe/ en een open manuscript: https://discovery-pp.ucl.ac.uk/10138556/1/Montgormery_ACSM_Expert_Consensus%20Accepted%20Final.pdf. Let op: ik kon de volledige tekst niet openen (de server weigerde), dus de details over lagen en nat worden heb ik niet zelf gecontroleerd. Wat ik hier van de ACSM overneem is alleen het algemene principe: kleding afstemmen op de persoon en de inspanning, geen vaste uitrusting.

Voor hitte: "Exertional Heat Illness during Training and Competition" (Armstrong e.a., 2007, Medicine & Science in Sports & Exercise 39(3): 556 tot 572; samenvatting op https://experts.umn.edu/en/publications/exertional-heat-illness-during-training-and-competition/). Secundaire samenvattingen noemen dat kleding hitte-stress kan verhogen, dat donkere kleur zonnestraling opneemt en dat lichte, luchtige kleding beter is. Ook hier heb ik de originele tekst niet kunnen lezen. Zeker: dit is een stand over het voorkomen van hitteziekte, niet over kledingkeuze. Een nieuwere ACSM-stand over hitte vond ik niet.

### Gevoelstemperatuur en windchill (KNMI, Canada)

De KNMI gebruikt sinds 2009 de Canadese JAG/TI-methode voor gevoelstemperatuur bij kou. Invoer is alleen luchttemperatuur en gemiddelde wind (op 10 meter hoogte). Zon en vochtigheid doen niet mee. De waarden gelden voor een gezonde volwassene die loopt. Code geel begint bij een gevoelstemperatuur van min 15 of lager, code oranje bij min 20 of lager gedurende minstens een uur, met kans op bevriezing van onbeschermde huid. Bron: KNMI, "Gevoelstemperatuur en windchill", https://www.knmi.nl/kennis-en-datacentrum/uitleg/gevoelstemperatuur-windchill/ (geraadpleegd oktober 2026). Technische achtergrond: KNMI TR-309 (Groen), https://cdn.knmi.nl/system/data_center_publications/files/000/068/402/original/TR309.pdf (niet zelf gelezen).

Canadese richtlijnen (Environment Canada, via de Rode Kruis-samenvatting en nieuwsberichten, dus tweedehands): vanaf ongeveer min 28 windchill kan blootgestelde huid in minder dan 30 minuten bevriezen, vanaf min 40 in minder dan 10 minuten. Dit is in lijn met de ACSM-grens van min 27. Amerikaanse NWS-brochure: https://www.weather.gov/media/owlie/wind-chill-brochure.pdf (niet zelf gelezen).

Betekenis voor ASCEND: het bestaande besluit noemt "koud" bij voelt als min 5 en "slecht" bij min 15. Dat sluit mooi aan op de KNMI-code geel (min 15). In Nederland komt min 15 gevoelstemperatuur ongeveer eens per tien jaar voor. In de praktijk komen de regels hieronder dus bijna altijd uit tussen ongeveer min 5 en plus 30.

Belangrijke nuance: Open-Meteo geeft `apparent_temperature`. Volgens de beschrijvingen die ik vond (tweedehands, wrappers van de API; de officiële pagina bevestigt de variabele zelf wel) combineert die wind, luchtvochtigheid en zonnestraling. Dat is dus een andere maat dan de KNMI-gevoelstemperatuur. In zon en droge lucht ligt de waarde hoger dan de KNMI-maat zou zijn. Voor kleding is dat prima, want zon verwarmt echt, maar het betekent dat de grenzen van de KNMI niet één op één over te nemen zijn. Hoe groot het verschil is, heb ik niet uitgezocht.

### Zon en uv

De WHO (Global Solar UV Index, "Radiation: The ultraviolet (UV) index", https://www.who.int/news-room/q-a-detail/radiation-the-ultraviolet-(uv)-index) geeft drie banden: uv-index 0 tot 2 geen bescherming nodig, 3 tot 7 schaduw zoeken rond het middaguur plus shirt, zonnebrand en hoed, en 8 en hoger shirt, zonnebrand en hoed zijn een must. Een overzichtsartikel noemt de grens bij 3 pragmatisch en niet sterk met bewijs onderbouwd (Are current guidelines for sun protection optimal for health? Exploring the evidence, Photochemical & Photobiological Sciences, 2018, https://pubs.rsc.org/doi/c7pp00374a). Zeker: de grens 3 is de internationale afspraak. Niet gecontroleerd: een aparte KNMI-drempel.

Open-Meteo heeft een uurlijkse `uv_index` en een `is_day`. De uv-index is in Nederland van oktober tot en met maart bijna altijd onder 3, behalve boven sneeuw in de bergen (sneeuw weerkaatst veel uv; dat is gangbare kennis, hier niet bij een bron gecontroleerd).

### Wettelijk voor fietsen in het donker

Rijksoverheid, "Wat zijn de regels voor fietsverlichting en reflectie op een fiets?", https://www.rijksoverheid.nl/vraag-en-antwoord/fiets/wat-zijn-de-regels-voor-fietsverlichting-en-reflectie-op-een-fiets: wit of geel licht voor, rood achter, niet knipperend, een losse lamp mag, ook op kleding of tas maar niet op hoofd, armen of benen; rode reflector achter. ANWB noemt een boete van 60 euro bij ontbrekende verlichting (https://www.anwb.nl/fiets/veiligheid/fietsverlichting-regels). Voor een loper of wandelaar is er geen lampplicht; daar is het veiligheidsadvies.

## Gangbare praktijk, niet wetenschappelijk bevestigd

### De regel "kleed je alsof het warmer is"

Runner's World, in de editie Runner's World Guide to Road Racing (via een herdruk op de site van een Amerikaanse loopclub, https://saltlakerunning.com/?p=239, doorverwijzing naar https://slrc.com/; ik kon de oorspronkelijke tekst niet zelf openen), adviseert te kleden alsof het ongeveer 20 graden Fahrenheit (ongeveer 11 graden Celsius) warmer is dan de thermometer. Een forum noemt een versie van "10 graden". Dit zijn verschillende uitspraken: 20 graden Fahrenheit is ongeveer 11 graden Celsius, 10 graden Fahrenheit ongeveer 5,5 graden Celsius. De regel in de Nederlandse volksvorm ("10 graden warmer") zit daar tussenin. Het is een vuistregel van loopcoaches, niet het resultaat van een studie. Ik vond geen primair onderzoek dat de exacte waarde vastlegt.

Wat wel klopt qua fysiologie: tijdens hardlopen maakt je lichaam veel meer warmte dan in rust (ruwweg een factor tien bij stevig lopen; gangbare kennis, hier niet bij een bron gecontroleerd), en de benodigde isolatie daalt dus sterk met de inspanning. Een Amerikaanse kleding-primer (USGS, "A primer on clothing systems for cold-weather field work", https://www.usgs.gov/publications/a-primer-clothing-systems-cold-weather-field-work) bevestigt dat meerdere dunne lagen het beste werken om bij te sturen, en dat het lichaam zelf niet genoeg is bij kou.

Hoe de regel verschilt per inspanning in de populaire hulpmiddelen:
- Wyndo (https://wyndo.app/what-to-wear-running/0-degrees) gebruikt ongeveer +10 graden Fahrenheit voor een rustige loop, +15 voor een training met tempo en +20 voor wedstrijdtempo, en noemt dit zelf "coaching convention" en geen laboratoriumfysiologie.
- RunDida (https://rundida.com/tools/what-to-wear/) begint bij 15 tot 20 graden Fahrenheit opwarming en schuift naar lichtere kleding bij intervallen en wedstrijd.
- Run Hive Gear Picker (https://runhive.com/tools/gear-picker) corrigeert voor wind (kouder), snelle trainingen (warmer), duur (korte, middellange en lange runs) en geslacht, plus uitzonderingen voor sneeuw en regen. Het doel is: de eerste 10 minuten mag je het koel hebben. De getallen publiceert het niet.
- Dress My Run kon ik niet vinden, dus geen vergelijking daarmee. Garmin of Strava hebben (voor zover ik vond) geen openbare kledingregels.

Al deze bronnen zijn commercieel of blogs, geen richtlijnen. De overeenkomst tussen hen is het bewijs: ze komen alle op de volgende lijn uit, en het is de lijn die ik gebruik.

### Drempels van bestaande adviseurs (kort)

Nederlandse fietsbronnen (id.nl "Wielerkleding: wat draag je bij welke temperatuur", https://id.nl/mobiliteit/fiets/fietsen-wielrennen/wielerkleding-wat-draag-je-bij-welke-temperatuur; 12GoBiking "Welke fietskleding bij welke temperatuur?", https://www.12gobiking.nl/blog/fietskleding-temperatuur): vanaf 20 graden kort; van 15 tot 20 armstukken en ondershirt; van 10 tot 15 beenstukken, lange mouw plus thermoshirt, windjack bij harde wind; van 0 tot 10 lange broek, dichte handschoenen, dunne muts onder de helm, bodywarmer; onder nul liever niet buiten. Ze zeggen zelf dat het om gevoelstemperatuur gaat, dat romp eerst warm moet blijven (anders helpen handschoenen en sokken niet) en dat winddichte overschoenen al veel doen.

Loopbronnen (Brooks, Runner's World-herdruk, Northlab, Drexel winter-tips): rond 30 graden Fahrenheit (min 1 Celsius) een lange mouw, een lichte laag, tights, lichte handschoenen en een muts of oorband. Northlab merkt op dat lopers vaak te veel jassen aantrekken en dat het slimmer is om handen en hoofd goed te bedekken dan de romp te zwaar te maken. (Brooks-pagina gaf een 403; alleen via zoekresultaat gezien.)

Bergsport: ik vond geen openbare tekst van de NKBV over lagen en geen vaste tekst van het Alpenverein; wel Bergwelten (het Oostenrijkse bergmagazine, https://www.bergwelten.com/a/das-zwiebelschalen-prinzip), Bergzeit en Decathlon. Overal hetzelfde drielagenprincipe: basislaag die vocht afvoert (merino of kunstvezel, geen katoen), isolatielaag die je uit en aan doet, buitenlaag die wind en regen tegenhoudt. Bergwelten voegt toe dat "minder vaak meer is", dus liever twee goede lagen dan drie. Dit is de gangbare praktijk, geen norm. Temperatuurgrenzen noemen deze bronnen niet.

## Eigen afleiding: waarom de regels zo zijn opgezet

Ik reken met één getal, de gevoelde temperatuur in beweging, en laat de sport en intensiteit daar een opslag bij tellen. Daarna zijn er aparte regels voor handen, hoofd, wind, regen, zon en donker. Dat past bij de bestaande invoer van `weather.ts` en is te testen.

De opslag in graden Celsius, bovenop de gevoelstemperatuur van Open-Meteo, afgerond uit de 10, 15 en 20 graden Fahrenheit van hierboven en daarna naar beneden bijgesteld omdat de eigenaar niet te voorzichtig en niet te overdreven wil kleden (en omdat de gevoelstemperatuur van Open-Meteo wind en zon al meeneemt, en je dus niet dubbel hoeft te corrigeren):

- Rustige duurloop, rustige wandeling op een rustdag: gewoon rustig tempo. Loop: plus 6. Rustdagwandeling: plus 2, want je loopt langzaam en maakt weinig warmte.
- Lange duurloop: plus 5 (rustig, lang, en je wordt moe en dus trager).
- Tempo en test: plus 8.
- Intervallen en wedstrijd: plus 9. Bij intervallen zit er rust tussen, dus dit is een wat lagere schatting dan de wedstrijd-opslag van de bronnen.
- Wandelen met rugzak: plus 4. Rugzak en klimmen maken warm, maar je loopt langzamer dan een loper.
- Bergtocht: plus 4, en altijd een extra laag in de rugzak, want pauzes, afdalingen en wind op een top koelen je veel sneller af dan in het vlakke land.
- Fietsen: plus 2. Je maakt minder warmte dan met lopen en de rijwind staat niet in de gevoelstemperatuur, want die gaat over wind in de lucht, niet over je eigen snelheid.

Dit zijn eigen waarden. Ze liggen een paar graden onder de bronnen op en zijn bedoeld als startpunt dat de eigenaar zelf kan bijstellen. Zeker is alleen de richting (harder is warmer), niet het getal.

Handen, oren en voeten: de helft van de opslag. Dit volgt uit de gangbare praktijk (Northlab, fietsbronnen) dat je ledematen minder profiteren van je eigen warmte, omdat het lichaam bij kou de bloedtoevoer naar vingers en tenen beperkt (algemene fysiologie, zie het USGS-primer). Ook dit is een eigen vereenvoudiging.

## Voorstel voor engine-regels

Dit is een voorstel, geen besluit. Alle temperaturen zijn graden Celsius. In de regels staat "T" voor de effectieve temperatuur: gevoelstemperatuur (`feelsC`) plus de opslag van de sport hierboven. "Th" is de effectieve temperatuur voor handen, oren en voeten: gevoelstemperatuur plus de helft van de opslag.

De invoer is: sport en soort training, intensiteit, verwachte duur in minuten, gevoelstemperatuur, wind en vlagen in km/u, neerslagkans en hoeveelheid in mm in de uren van de training, uv-index, en of het donker is (de bestaande daglichtberekening: einde na zonsondergang of begin voor zonsopkomst).

De uitvoer is hooguit vier korte regels, in deze volgorde: romp en benen, handen en hoofd, buitenlaag (wind of regen), en zon of donker. Daarbij mag er één zin komen over de start ("de eerste tien minuten voel je het koel") en bij een tocht één zin over de rugzak. Zijn er meer dan vier regels, dan vervallen de laagste prioriteiten: eerst zon, dan hoofd, nooit romp. Is het gewoon aangenaam (T van 14 tot 22 en droog), dan komt er een enkele regel: "Shirt en korte broek, meer is niet nodig."

### Romp

1. T van 22 of hoger: luchtig shirt of singlet in lichte kleur.
2. T van 15 tot 22: korte mouwen.
3. T van 10 tot 15: dun shirt met lange mouwen, of korte mouwen met armstukken die je opbergt.
4. T van 5 tot 10: thermoshirt met lange mouwen.
5. T van 0 tot 5: thermoshirt plus een dunne tweede laag (fleece of vest).
6. T onder 0: thermoshirt, warme tweede laag en winddichte buitenlaag.

Herkomst: de banden zijn een vertaling van de fietsbronnen (id.nl, 12GoBiking) en de loopbronnen (Brooks, Runner's World-herdruk) naar effectieve temperatuur. Zekerheid: laag tot gemiddeld. De richting is eensgezind, de exacte grens zit per bron een paar graden anders. Bijstellen met eigen ervaring is de bedoeling.

### Benen

1. T van 12 of hoger: korte broek.
2. T onder 12: lange tight of lange broek (hardlopen en fietsen), wandelbroek (wandelen en berg).
3. T onder 0: gevoerde tight of een tweede laag onder de broek.

Herkomst: loop- en fietsbronnen geven rond 10 tot 15 graden het omslagpunt van kort naar lang; 12 is de middenwaarde. Zekerheid: laag tot gemiddeld.

### Handen

1. Th onder 8: dunne handschoenen.
2. Th onder 2: warmere handschoenen of wanten.
3. Voor fietsen: Th is gevoelstemperatuur min 2, omdat de handen aan de stuurwind zitten. Dat geeft ongeveer "onder 10 graden gevoel: handschoenen", wat overeenkomt met de fietsbronnen.
4. Bij intervallen blijven de handschoenen aan, want handen warmen niet mee op.

Herkomst: fietsbronnen (handschoenen onder 10), loopbronnen (lichte handschoenen rond 0 tot 5 graden Celsius, Th op ongeveer 5 tot 8 uitgekomen), algemene fysiologie. Zekerheid: gemiddeld.

### Hoofd en oren

1. Th onder 6: oorband of dunne muts.
2. Th onder 0: muts die de oren bedekt.
3. Bij zon en T van 22 of hoger, of uv-index 3 of hoger bij een training van 45 minuten of langer: pet met klep (zie zon).

Het hoofd geeft veel warmte af. Draag het daarom zo licht dat je de muts op de helft van de loop in je zak kunt stoppen: een band of buff is dan beter dan een dikke muts. Dat is gangbare praktijk (geen bron die het kwantificeert). Zekerheid: laag tot gemiddeld.

### Voeten en sokken

1. Fietsen met gevoelstemperatuur onder 4: overschoenen of winddichte sokken (bron: fietsbronnen, "lichte winddichte overschoenen houden al veel vast").
2. Sneeuw of natte ondergrond bij wandelen en bergtocht: waterdichte schoenen, gamaschen bij sneeuw dieper dan de enkel, en een droog paar sokken mee in de rugzak. Zekerheid: gangbare praktijk. Gamaschen zijn een standaardadvies van bergsportwinkels; een norm of studie vond ik niet. Sneeuwhoogte zit alleen in de app als de bron die levert. Bij alleen sneeuw als weertype volstaat "sneeuw: waterdichte schoenen en een droog paar sokken mee".

### Wind

1. Wind van 25 km/u of vlagen van 40 of meer, en T onder 16: dun windjack, tenzij het een interval of wedstrijd is met T boven 8.
2. Voor wandelen en berg: windjack altijd in de rugzak als de wind 25 of meer is of de vlagen 40 of meer.
3. De bestaande grens "harde wind" (38 gemiddeld, 65 vlagen) blijft het waarschuwingssignaal. De kledingregel begint eerder, omdat een dun windjack weinig kost.

Herkomst: de windgrens van 25 is eigen afleiding (ruwweg windkracht 4); de gevoelstemperatuur van Open-Meteo neemt wind al mee, dus de reden voor het jack is vooral dat het het zweet en de kou op de romp tegenhoudt, niet het getal zelf. De lagen die de bronnen noemen (Bergwelten, Decathlon, fietsbronnen) onderschrijven het windjack in het algemeen. Zekerheid: laag tot gemiddeld.

### Regen

1. Regen verwacht (minstens 1 mm in de uren van de training, de bestaande grens, of een kans van 60 procent of meer): hardlopen met T van 16 of hoger: geen jack, pet met klep; met T onder 16: dun waterafstotend jack of windjack. Wandelen en fietsen: regenjas aan. Fietsen: ook een regenbroek of overschoenen bij langer dan 45 minuten.
2. Alleen kans op een bui (kans 30 tot 60 procent, weinig mm): wandelen en bergtocht regenjas in de rugzak; fietsen en hardlopen geen extra regel behalve een jack in de rugzak of om de heupen bij lang weg.
3. Regen plus gevoelstemperatuur onder 8 plus een duur van meer dan 60 minuten: noem het expliciet. Natte kleding isoleert veel slechter, en dat is de situatie waarin sporters afkoelen als ze stilstaan of langzamer worden. Zeg dan: "Neem iets droogs mee voor na afloop."

Herkomst: de 1 mm is de bestaande grens uit het weerbesluit. De rest is gangbare praktijk (Run Hive heeft overrides voor regen; Alpenverein en andere bronnen noemen een regenjas als vaste buitenlaag). Dat natte kleding slechter isoleert is algemeen aanvaard, en de ACSM-kou-stand besteedt er volgens secundaire bronnen aandacht aan, maar dat heb ik in de volledige tekst niet gecontroleerd. Zekerheid: gemiddeld.

### Zon en uv

1. Uv-index 3 of hoger en een training van 45 minuten of langer: zonnebrand op blote huid. Bij 6 of hoger of bij een bergtocht: ook zonnebril en pet.
2. Een bergtocht met sneeuw: zonnebril altijd, ook bij bewolking boven 3 (sneeuw weerkaatst veel uv; gangbare kennis, niet hier bij een bron gecontroleerd).
3. T van 22 of hoger, of gevoelstemperatuur 25 of hoger: pet of lichte kleding en "neem water mee". Boven 27 geldt de bestaande waarschuwing "let op" van het weerbesluit.

Herkomst: WHO-banden; de keuze van 45 minuten en de combinatie met sneeuw zijn eigen afleiding. De uv-index in Nederland komt van oktober tot en met maart zelden boven 3, dus deze regel doet in de winter vrijwel niets in het vlakke land. Zekerheid: grens 3 hoog (WHO), 45 minuten laag.

### Donker

1. Training eindigt na zonsondergang of begint voor zonsopkomst, hardlopen en wandelen: hoofdlamp of lampje, en iets reflecterends of fel op de romp, vooral als het langs wegen gaat.
2. Fietsen in het donker: licht voor en achter, verplicht (Rijksoverheid, boete 60 euro volgens ANWB). Het bestaande "neem een lampje mee" wordt dan "licht voor en achter aan, het is verplicht".
3. Bergtocht die in het donker eindigt: hoofdlamp met reservebatterij (gangbare praktijk).

Zekerheid: fietsen hoog (wet), de rest gangbare praktijk.

### De start en de eerste tien minuten

Bij hardlopen, tempo, intervallen, lange duurloop en wandelen met rugzak, en alleen als T meer dan 5 graden boven de gevoelstemperatuur zit: voeg toe "De eerste tien minuten voel je het koel, dat hoort zo." Bij intervallen en wedstrijden: "Warm op met een jack aan en trek dat uit voor de eerste serie."

Herkomst: Run Hive en de Runner's World-regel richten zich op "koel in de eerste 10 minuten, daarna goed". Dat is een kernprincipe van alle loopbronnen en de enige manier waarop de opslag klopt. Zekerheid: gangbare praktijk, hoog onder lopers.

### Rugzakzin bij een tocht

Voor wandelen met rugzak van meer dan 90 minuten en voor elke bergtocht, samengesteld uit de regels hierboven, hooguit één zin:

1. Gevoelstemperatuur onder 14: warme laag (fleece of dun donsjack).
2. Onder 10: droog shirt om te verwisselen na een lange klim of pauze.
3. Onder 6: muts en handschoenen.
4. Bergtocht: de gevoelstemperatuur van het weerpunt is niet die van de top. Ruwweg 6 tot 7 graden kouder per 1000 meter hoogteverschil (standaardatmosfeer, gangbare kennis) en meer wind. Is het hoogteverschil bekend, trek het dan af, anders volstaat "boven is het kouder en waait het harder, neem de warme laag altijd mee". Daarbij regenjas, windjack en zonnebril altijd bij een bergtocht.
5. Sneeuw: droge sokken en gamaschen.

Voorbeeld: "In de rugzak: warme laag, muts, handschoenen en een droog shirt."

Herkomst: de lagenprincipes uit Bergwelten, Decathlon en de GR5-paklijst van ASCEND; de drempels zijn eigen afleiding. Zekerheid: laag voor de getallen, hoog voor het principe.

### Wat de regels bewust niet doen

- Ze geven geen merken en geen stofnamen (merino of niet).
- Ze corrigeren niet voor de eigenaar zelf (kouder of warmer type). De opslagwaarden zijn de plek voor een latere instelling "ik heb het snel koud" of "ik heb het snel warm" (bijvoorbeeld plus of min 2 graden), maar dat is een aparte beslissing.
- Ze geven geen advies bij gevaarlijk weer. Dat doet het bestaande oordeel "slecht" al. Onder gevoelstemperatuur min 5 voegen we één zin toe: "Bedek blote huid, ook je gezicht en oren." Dat volgt de bestaande grens van "koud" en de KNMI-waarschuwingen. Bij klachten (gevoelloze vingers die niet terugkomen) naar een arts of fysiotherapeut.

## Voorbeelden om de regels mee te toetsen

Dit zijn testgevallen voor een latere unit-test; de uitkomst is wat de regels hierboven geven, niet een waarheid.

1. Rustige duurloop, gevoelstemperatuur 3, droog, 40 minuten, daglicht: T is 9, dus thermoshirt, lange tight, Th is 6, dus dunne handschoenen en op de grens een oorband. Regel: "Lange tight en een dun thermoshirt, dunne handschoenen. De eerste tien minuten voel je het koel." Dat is het voorbeeld van de eigenaar.
2. Intervallen, gevoelstemperatuur 8, droog, 60 minuten: T is 17, dus korte mouwen; benen T onder 12 is niet het geval, dus korte broek; Th is 12,5, dus geen handschoenen. Regel: "Korte mouwen en korte broek, warm op met een jack aan." Controle: kan dit te weinig zijn? Voor een deel van de lopers wel. Het is een bewust nuchtere uitkomst, bij te stellen.
3. Fietsen, gevoelstemperatuur 6, droog, 60 minuten: T is 8, dus thermoshirt, lange broek, Th 4 dus dunne handschoenen, en geen overschoenen (die beginnen onder 4 gevoelstemperatuur). Regel: "Thermoshirt, lange broek, dunne handschoenen."
4. Bergtocht, gevoelstemperatuur 2, sneeuw, wind 30 km/u, 6 uur: T is 6; thermoshirt plus tweede laag niet nodig maar wind: windjack; Th is 4, dus oorband en handschoenen; sneeuw: gamaschen en droge sokken. Regel plus rugzakzin: "In de rugzak: warme laag, muts, handschoenen, droog shirt, regenjas, zonnebril."
5. Rustdagwandeling, gevoelstemperatuur 12, kans op een bui van 40 procent, 45 minuten: T is 14, dus dun lange mouw; benen T onder 12 niet, dus broek gewoon; regenkans: jack mee. Regel: "Dun shirt met lange mouwen, een regenjack mee."
6. Hardlopen na zonsondergang, gevoelstemperatuur 14, droog: T is 20, dus korte mouwen; lampje. Regel: "Korte mouwen en korte broek, een lampje of reflectie."
7. Hardlopen, gevoelstemperatuur 24, uv-index 6, 60 minuten: "Luchtig licht shirt, zonnebrand, pet en water mee."

## Wat nog onzeker is

- De opslagwaarden (6, 5, 8, 9, 4, 2) zijn eigen afleiding uit gangbare lopersregels. Ik vond geen studie die ze vastlegt en geen studie die zegt dat ze fout zijn. Ze voelen anders per persoon, en zijn dus het beste te toetsen met een feedbackknop ("te warm", "te koud") achteraf, die de opslag verschuift. Dat is een voorstel voor later.
- Open-Meteo `apparent_temperature` neemt zon en vochtigheid mee en is niet de KNMI-maat. Hoeveel dat scheelt in een Nederlandse winter, uitgedrukt in graden, heb ik niet gemeten. Het kan de romp-grenzen een paar graden verschuiven.
- De volledige teksten van de ACSM-standen van 2006, 2007 en 2021 kon ik niet openen. Wat ik daaruit gebruik is het algemene principe. Wie de details wil (bijvoorbeeld wat de ACSM over nat worden en over handen zegt), moet het open manuscript van 2021 lezen.
- De originele Runner's World-tekst en de Brooks-pagina kon ik niet openen. De 20 graden Fahrenheit komt uit een herdruk en zoekresultaten.
- Een NKBV-richtlijn over lagen en een officiële KNMI-uv-drempel vond ik niet.
- Of de app het hoogteverschil van een bergtocht kent, is een vraag aan de engine. Zo niet, dan blijft het bij de algemene zin.
- Hoe de regels voelen bij een lange wedstrijd of bij een tocht van meer dan 6 uur is niet onderzocht. Daar spelen voeding, vermoeidheid en veranderend weer mee.
- Hitte is bewust licht behandeld. Wie in juli of augustus een hittegewenning-training doet (GR5-onderzoek, regel B2), kleedt juist extra aan; dat botst met deze regels en zou een uitzondering moeten krijgen.

## Wat het onderzoek zegt

Voor veiligheid bij extreme kou en hitte zijn er goede richtlijnen (ACSM, KNMI, Canada), maar die gaan niet over kledingkeuze. Voor kledingkeuze is er één breed gedeelde praktijk: reken met een hogere gevoelstemperatuur naarmate je harder gaat, kleed in lagen, bescherm handen en hoofd apart, houd je droog en neem bij lange tochten een extra laag mee.

## Wat het betekent voor de app

Een kledingregel van hooguit vier korte zinnen is te bouwen uit invoer die ASCEND al heeft, plus de uurlijkse uv-index. Het is een nieuwe pure functie in `engine/` naast `weather.ts`, met testgevallen zoals hierboven. De getallen horen als benoemde constanten bovenaan (zoals `weather.ts` al doet), zodat de eigenaar ze kan bijstellen. Het is een advies, geen planning, dus er is geen voorstel met Akkoord nodig.

## Wat nog onzeker is

Zie de lijst hierboven: vooral de opslagwaarden en de verschillen tussen Open-Meteo en de KNMI-maat.
