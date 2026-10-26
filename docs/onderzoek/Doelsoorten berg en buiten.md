# Doelsoorten berg en buiten

Wat de engine per doelsoort nodig heeft om "Klaar voor je doel" uit gegevens te laten volgen: wat een doel minstens vraagt per soort training, hoe lang de opbouw minstens duurt, welke fasen en hoeveel afbouw erbij horen, welke drie tot vijf meters het percentage vormen, en hoe lang het herstel erna duurt. Geschreven op 26 oktober 2026 voor Scout Bergdoelen, als voorbereiding op het besluit `2026-10-26-kracht-en-berg-voor-iedereen.md` en deel 3 van `docs/visie/Kracht en berg in één plan.md`.

Dit is onderzoek en een voorstel voor engine-regels, geen besluit. Het is geen medisch advies. Bij pijn, klachten op hoogte of twijfel over je gezondheid hoort een arts, fysiotherapeut of gediplomeerde berggids erbij.

## Hoe je dit leest

Wat al onderzocht is, herhaal ik niet. Ik verwijs naar de bestaande rapporten met hun regelnummers: `Aanvullend onderzoek GR5 voorbereiding.md` (regels A1 tot A10 voor afdalen, B1 tot B8 voor de tocht, C1 tot C9 voor slaap, ziekte en gemiste trainingen, D1 tot D6 voor fietsen, F1 tot F5 voor kracht en fit), `Trainingsopbouw voor GR5 en hardlopen.md`, `Spierbelasting en beenvermoeidheid.md`, `ASCEND voor iedereen.md`, `Kracht loggen en progressie.md` (regels KR-1 tot KR-11), `Zweetverlies en water.md`, `Noodhulp via satelliet.md` en `docs/visie/Trainingswetenschap.md`. Wat hier nieuw is, heb ik opgezocht en met bron gemerkt.

Dezelfde schaal als in de eerdere rapporten. **Sterk**: meerdere RCT's of meta-analyses die hetzelfde zeggen, of een richtlijn met hoge aanbevelingsgraad. **Matig**: één goede meta-analyse of RCT, of een grote cohort. **Zwak**: klein, observationeel, indirect, of alleen via een samenvatting gelezen. **Expert**: coaches, gidsen, verenigingen en aanbieders van trainingsplannen, zonder uitkomstdata. **Afgeleid**: mijn eigen rekenwerk of redenering uit de genoemde bronnen. Elke regel heeft de vorm "regel: … reden: …" en een bewijslabel. Waar ik een getal zelf heb gekozen om iets te laten werken, staat dat er als "startwaarde" bij, en het staat nog eens op een rij in het laatste deel.

## In het kort

1. De GR5-logica is al grotendeels generiek. `gr5Readiness.ts` rekent met een lijst eisen (afstand, stijgen, dalen, rugzak, dagen), niet met de GR5 zelf. Generiek maken is vooral: de vier meters uit een gegeven lezen, de vaste grens van twee dagen op rij per doelsoort maken, en welke sporten tellen per doelsoort laten bepalen.
2. Er zijn maar drie soorten meters nodig om alle doelsoorten te bouwen: een **beste dag** (tijd, stijgen, dalen, rugzak, afstand), een **reeks** (dagen achter elkaar) en een **trend of volume** (weekuren, sets per spiergroep, krachttrend, minuten per week). Een vierde, **versheid**, is nieuw en vangt dat bescherming tegen afdaalschade na zes tot negen weken vervalt.
3. Voor een doel van één lange dag (bergtocht, alpine dag, trailrace, sportieve rit) mag de langste training niet 100% van de doeldag zijn. Startwaarde: 100% bij een dag tot 3 uur, lineair naar 60% bij 8 uur, en 50% vanaf 12 uur. Dit is de grootste aanname in dit rapport en het eerste wat met de eigenaar geijkt moet worden.
4. Een meerdaagse tocht blijft gemeten tegen 100% van een gewone dag, omdat die dag zich herhaalt. Dat houdt het plan van de bestaande GR5 gelijk.
5. De opbouwduur komt uit drie delen: een basis (nul weken met voorkennis, vier zonder), een specifieke periode per doelsoort (zes tot zestien weken minimaal, acht tot vierentwintig aanbevolen) en een rugzakladder (minstens één week per 2 kg). Onder de pees- en voetaanpassing van twaalf tot zestien weken zegt de app het eerlijk.
6. Afbouw in dagen bij label Hoofddoel: 7 voor een dag of een fietsreis, 10 voor een hutten-tocht, 14 voor tent, alpine en ultra. Bij Belangrijk: 3 of 4 dagen. Bij Meedoen: geen afbouw. Het principe staat sterk (Bosquet 2007), de dagen zijn afgeleid.
7. Voor alpinisme boven 3000 m is alleen de aerobe en beenkant trainbaar. Gevoeligheid voor hoogteziekte is dat niet, en conditie beschermt er niet tegen. ASCEND geeft daar geen advies, maar één vaste verwijzing naar een cursus of berggids.
8. Voor fietsen in de bergen is er bijna geen onderzoek naar wat een amateur nodig heeft. Ik zeg dat hardop en houd de meters klein (langste rit, stijgen, volhouden).
9. "Sterker worden" krijgt meters uit Forge die al bestaan: geschat maximum per hoofdoefening (KR-1, KR-2), harde sets per spiergroep (`engine/muscleVolume.ts`, KR-10) en volhouden. De 100% volgt uit een doel dat de gebruiker invult als gewicht maal herhalingen, nooit als "jouw max".
10. "Fit blijven" heeft als enige doelsoort een externe maat voor 100%: 150 minuten en twee keer kracht (WHO 2020, sterk).

## 1. Wat `gr5Readiness.ts` nu vastlegt, en wat generiek moet

Wat het bestand doet, in gewone woorden: het neemt de eisen van het doel (`GoalRequirement`: afstand, stijgen, dalen, rugzak, dagen achter elkaar), rekent die om naar een gewone dag (`typicalDayValue`), zoekt in de logs van de laatste 56 dagen je beste dag per onderdeel (`routeDayRows` in `standing.ts`), begrenst elk op 100%, en neemt het gemiddelde. 100% staat er alleen als alles vol is, anders blijft het 99. Een meter zonder eis telt niet mee.

Wat daarin aan de GR5 of aan een tocht vastzit en in een doelsoort moet:

1. **De vier meters zelf.** `MeterKey` is `rugzak | langsteDag | hoogte | dagen`. Voor een trailrace, een fietsrit of sterker worden zijn dat de verkeerde. De lijst meters en hun uitleg ("waarom telt deze mee") hoort per doelsoort in de gegevens.
2. **`THUIS_DAGEN_OP_RIJ = 2`.** Een vaste grens met een goede reden voor een hutten-tocht, maar een andere voor tent (3), een dagtocht (geen meter) en een fietsreis (3). Per doelsoort een getal.
3. **Welke logs tellen.** `routeDayRows` kijkt alleen naar wandelen en avontuur (`logSport(l) === 'hiking'`), en sluit kracht en herstel uit. Een fietsdoel, een trailrace of "sterker worden" heeft andere logs nodig. Per doelsoort een lijst sporten.
4. **Het venster van 56 dagen** en de dagdrempel van 90 minuten voor "lange wandeldag" zijn tochtkeuzes. Per doelsoort instelbaar, met 56 en 90 als standaard voor tocht en alpine.
5. **De eis is altijd 100% van een gewone dag.** Dat klopt voor een tocht en niet voor een doel van één dag (zie 2.2). Er hoort een veld `aandeel` bij de meter.
6. **De zin.** "Het gemiddelde van vier dingen die de GR5 vraagt" noemt de GR5 en telt tot vier (`COUNT_WORD`). Het woord komt uit de doelnaam, het aantal uit de lijst.
7. **Eisen die ontbreken in `GoalRequirement`.** Nodig zijn: hoogste punt en hoogste slaapplek (alleen alpine), hut of tent, een verwachte tijd (hardlopen en fietsen, waar de DIN-formule niet geldt), en bagage in kg op een fietsrit. Nu kent alleen een wandel- of buitenlog `backpackWeightKg`.

Voorstel voor de vorm van een doelsoort, als gegeven (geen code):

- een naam en welke kenmerken de gebruiker invult;
- per soort training een ondergrens per week, als regel op de kenmerken;
- minimale en aanbevolen weken voorbereiding;
- namen en aandelen van de fasen, en afbouwdagen per label;
- de meters: elk met een type (beste dag, reeks, volume of trend, versheid), welke logs tellen, het venster, het aandeel, en de zin die uitlegt waarom hij meetelt;
- een herstelregel.

Dit past bij de vaste lijn "één percentage, het gemiddelde van de meters, altijd met de zin waaruit het bestaat". Er komt geen tweede getal bij.

## 2. Gemeenschappelijke regels

Alle berg- en buitendoelsoorten delen onderstaande. Per doelsoort staat daarna alleen wat afwijkt.

### 2.1 Van kenmerken naar een verwachte dag

**Regel:** de verwachte tijd van een wandeldag volgt uit afstand, stijgen en dalen met de DIN 33466-formule (4 km per uur vlak, 300 m per uur omhoog, 500 m per uur omlaag; de grootste van horizontale en verticale tijd plus de helft van de kleinste). Dat zit al in `estimatedHikingMinutes`. Een rekenvoorbeeld: 16 km, 1.200 m omhoog en 1.200 m omlaag geeft horizontaal 4 uur en verticaal 4 plus 2,4 is 6,4 uur, dus 6,4 plus de helft van 4 is 8,4 uur.
**Reden:** het is de standaard van de Duitse en Zwitserse bergsportverenigingen (expert) en past bij de metingen: een analyse van 100 Alpenroutes en 82 gemeten bergwandelaars gaf gemiddeld 317 m omhoog per uur ([Burtscher 2004](https://www.bisp-surf.de/Record/PU200508001919)) (bewijs: matig, een enkele studie, vooral gezonde tourgangers). De Zwitserse SAC rekent met 400 omhoog en 800 omlaag voor getrainden, dus de DIN-waarden zijn voor een gemiddelde wandelaar eerder voorzichtig dan krap. Met een zware rugzak of ruw terrein wordt het trager.
**Kanttekening:** een gebruiker die al drie of meer gelogde tochten heeft, kan zijn eigen tempo laten leren (verhouding eigen tijd tot DIN-tijd). Dat is in lijn met de positie "ijking per gebruiker". Voorstel, niet onderzocht.

**Regel:** hoogte verandert de eis niet, wel de verwachte duur op de dag zelf. Boven ongeveer 1.500 m rekent ASCEND de verwachte dag 8% langer per 1.000 m (startwaarde) en toont dat als "verwacht op de dag", niet als eis voor de training.
**Reden:** je kunt de arbeid thuis trainen maar niet de hoogte. Het aerobe vermogen daalt lineair met de hoogte: 6,3% per 1.000 m tussen 300 en 2.800 m bij duursporters (Wehrlin en Hallén 2006, bewijs: matig, in het eerdere rapport), en Burtscher rekent met ongeveer 1% per 100 m boven 1.500 m, dus ruim 20% meer vereiste capaciteit op 3.500 m (bewijs: matig, een rekenmodel). Het tempo daalt minder dan het vermogen omdat wandelaars op ongeveer 62% van hun maximum werken. De 8% is afgeleid (bewijs: zwak). Regel B1 uit het eerdere rapport (10 tot 15% lager klimtempo boven 2.000 m) wijst dezelfde kant op.

### 2.2 Het aandeel van de doeldag in de langste training

**Regel:** bij een doel van één lange dag is 100% op de meters "langste dag", "stijgen" en "dalen" gelijk aan een aandeel van de doeldag. Startwaarde: 1,0 bij een verwachte dag tot 3 uur, lineair omlaag naar 0,6 bij 8 uur, en lineair naar 0,5 bij 12 uur of meer. Voor het rekenvoorbeeld hierboven (8,4 uur) is dat ongeveer 0,59: een langste training van 5 uur, 710 m omhoog en 710 m omlaag.
**Reden:** niemand repeteert een tocht van 12 uur vooraf in zijn geheel. Marathonlopers zijn trager als hun langste training onder 25 km blijft, maar langer dan 35 km levert niets extra's op ([Training for a (half-)marathon](https://pmc.ncbi.nlm.nih.gov/articles/PMC7496388/)) (bewijs: zwak tot matig, zoals in het eerdere rapport). Gidsaanbieders trainen voor Mont Blanc met zondagen van 3 tot 4 uur en één proefklim van 4,5 tot 5,5 uur omhoog, voor een dag van 10 tot 14 uur: ongeveer 25 tot 50% ([Alpine Ascents](https://www.alpineascents.com/climbs/mont-blanc/training/)) (bewijs: expert, aanbieder). De sessiepiek (110% van je langste van de laatste 30 dagen, Frandsen 2025, matig) maakt een sprong naar de volle dag bovendien riskant. De vorm van de curve en de getallen zijn afgeleid (bewijs: zwak).
**Voor wie:** bij een korte dag (tot 3 uur) is de doeldag zelf een gewone training, dus 100%. Wie de hele dag toch loopt, krijgt 100% (de meter is begrensd).
**Een meerdaagse tocht** werkt anders: de dagen herhalen zich zonder herstel, en wie de gewone dag niet los kan, bouwt dag na dag schade op. Daarom blijft het aandeel daar 1,0, zoals in de huidige GR5-meters (expert).

### 2.3 Wat elke berg- en buitendoelsoort per week minstens vraagt

Dit zijn de bouwstenen. Per doelsoort zeg ik welke gelden.

**Regel:** kracht staat op één tot twee keer per week; twee in de basis en de opbouw, één in de specifieke periode en de afbouw (een derde van het volume op dezelfde zwaarte houdt de kracht vast).
**Reden:** kracht, rustige duur en training met last samen geven de grootste winst bij lastdragen (1,7 SD, [Knapik 2012](https://pubmed.ncbi.nlm.nih.gov/22130400/), matig, militair), en kracht naast duur kost geen kracht of spiermassa ([Schumann 2022](https://pubmed.ncbi.nlm.nih.gov/34757594/), sterk). Eén sessie per week houdt kracht vast (Spiering 2021, matig, in `ASCEND voor iedereen.md`); de derde van het volume is regel KR-11. Bovenlichaam telt mee voor lastdragen, maar met een zwakke samenhang (Knapik).

**Regel:** rustige duur heeft een harde vloer van 150 minuten per week, en een streefwaarde voor de piekweek van 1,5 maal je langste training, hoogstens 11 uur.
**Reden:** de vloer is de beweegrichtlijn (WHO 2020, Gezondheidsraad 2017, sterk). Aanbieders van bergplannen komen op 6 uur in de basis en 8 tot 11 uur in de piek ([Alpine Ascents](https://www.alpineascents.com/climbs/mont-blanc/training/); [Uphill Athlete](https://uphillathlete.com/?p=4753)) (bewijs: expert). Mijn 1,5 maal is afgeleid: het laat ruimte voor ander werk naast de langste dag, en komt voor een dag van 8 uur op 7 tot 8 uur. De streefwaarde is geen meter.

**Regel:** een lange dag eens per week in de specifieke periode; een rugzaksessie 2 tot 4 keer per maand en nooit meer dan 4; een afdaalprikkel elke 7 tot 14 dagen en nooit meer dan 21 dagen zonder; vooruitgang in stijgen of dalen hoogstens 25% boven je 30-dagenmaximum, en rugzak hoogstens 2 kg per stap, niet in een week met een stap in stijgen of dalen.
**Reden:** dit staat al uitgewerkt in regels A1 tot A3 en in de beslisregels van `Trainingsopbouw voor GR5 en hardlopen.md` (bewijs: matig voor de afdaalklok, expert voor de rest). Ik herhaal het niet.

**Regel:** dagen achter elkaar oefen je alleen voor doelen van meer dan één dag, en dan in de laatste acht weken twee tot drie keer.
**Reden:** er is geen onderzoek naar back-to-back dagen bij recreanten (bewijs: expert, zoals in het eerdere rapport). Het voordeel is specificiteit en het uitproberen van eten, voeten en slapen. Aanbieders koppelen elke fase een lange zaterdag aan een langere zondag (Alpine Ascents, expert).

### 2.4 Opbouwduur en minimale voorbereiding

**Regel:** het minimum aantal weken is de optelling van een basis, een specifieke periode per doelsoort, en een rugzakladder.
- **Basis:** 0 weken als je in de laatste acht weken gemiddeld 150 minuten per week bewoog en minstens om de twee weken 90 minuten buiten liep. Anders 4 weken, met de beginnersregels uit `ASCEND voor iedereen.md` (hoogstens vier dagen, de eerste twee weken zonder harde dag).
- **Specifieke periode:** zie per doelsoort.
- **Rugzakladder:** minstens 1 week per stap van 2 kg, vanaf 4 kg (ongeveer 5% van het lichaamsgewicht) tot het doelgewicht; aanbevolen 2 weken per stap. Voor 14 kg zijn dat minstens 5 en bij voorkeur 10 weken.

**Reden:** pees- en botaanpassing duurt langer dan spieraanpassing, ongeveer 12 tot 16 weken ([Bohm 2015](https://link.springer.com/article/10.1186/s40798-015-0009-9), matig tot sterk, in het eerdere rapport). Uphill Athlete bouwt rugzakgewicht op in stappen van twee weken, en gidsen voegen 1 tot 2,3 kg per tocht toe (expert). Aanbieders raden 12 tot 16 weken aan voor Mont Blanc, en 4 tot 6 maanden volgens Alpine Ascents (expert, aanbieders met een eigen belang). De wekengetallen per soort zijn afgeleid en dus startwaarden (bewijs: zwak tot expert).

**Regel:** onder het aanbevolen aantal weken en boven het minimum zegt de app wat het kost; onder het minimum komt een voorstel met Akkoord: een latere datum, een kleiner doel (minder dagen, minder kilo, minder meters), of het doel op Meedoen zetten.
**Reden:** de werkafspraak "ASCEND zegt eerlijk wat niet past" en het patroon uit `ASCEND voor iedereen.md`, deel 4 (de drie lagen). De app verandert het doel nooit stil.

### 2.5 Fasen en afbouw

**Regel:** de specifieke periode is de laatste 8 weken voor het doel, inclusief de afbouw; de opbouw is de 8 weken daarvoor; de basis is de rest. Bij een korte voorbereiding schuift het proportioneel op, maar de specifieke periode is nooit korter dan 4 weken. De GR5-namen (Basis, Opbouw, Bergcapaciteit, Expeditieklaar) worden de namen van de doelsoort tocht; de andere soorten krijgen eigen namen of de neutrale Basis, Opbouw, Specifiek, Afbouw.
**Reden:** Alpine Ascents bouwt Mont Blanc in drie fasen van 24, 16 en 8 weken voor de klim, met 6, 8 en 8 tot 10 uur per week; Uphill Athlete's plannen duren 8, 12 en 16 weken (expert, aanbieders). Een gelijke opbouw voor alle bergdoelen is dus een vereenvoudiging, geen bewijs.

**Regel:** afbouw in dagen per label. Bij **Hoofddoel** de volle afbouw van de doelsoort, bij **Belangrijk** 3 of 4 dagen, bij **Meedoen** geen afbouw. Tijdens elke afbouw gaat het volume 40 tot 60% omlaag bij gelijke intensiteit en frequentie, komt er geen nieuwe prikkel bij (geen nieuwe afdaling, geen zwaardere rugzak, geen nieuwe schoenen), ligt de laatste zware beendag minstens 72 uur voor het doel, en volgt één korte bekende afdaling 7 tot 14 dagen voor het doel (regel A9). Bij Belangrijk geldt alleen de 72-uursregel en ongeveer 30% minder volume in die dagen. Bij Meedoen blijft de gewone 48-uursregel tussen zware beendagen staan.
**Reden:** een taper van ongeveer twee weken met 41 tot 60% minder volume en gelijke intensiteit geeft de grootste winst ([Bosquet 2007](https://pubmed.ncbi.nlm.nih.gov/17762369/), sterk, vooral getrainde sporters). Tapers van 7 dagen of korter werken ook ([Wang 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10171681/), matig tot sterk). Dat is bewezen voor wedstrijden, niet voor tochten; de overdracht naar wandelen is afgeleid. Voor een tocht van weken telt fris aankomen zwaarder dan piekfitheid (Trainingswetenschap, afgeleid).

### 2.6 Herstel erna

**Regel:** na een dag met veel dalen blijven de benen drie dagen uit de zwaarste training: geen kwaliteitssessie en geen zware beendag. Bij 900 m dalen of meer, zonder afdaalprikkel in de laatste zes weken, zijn het vier tot vijf dagen.
**Reden:** na bergaf lopen is de kracht van de kniestrekkers bij getrainden na ongeveer 72 uur terug en bij ongetrainden na 96 uur nog niet ([Bontemps 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7674385/), matig). Twee uur wandelen met 25 kg kostte 15 tot 16% kracht, terug na 72 uur (Blacker 2010, matig, in `Spierbelasting en beenvermoeidheid.md`). De gewenningsfactor in de beenindex (0,6 tot 1,0) regelt het verschil tussen gewend en ongewend al.

**Regel:** na een tocht van meerdere dagen is het herstel de helft van het aantal tochtdagen, hoogstens 14 dagen. De eerste twee dagen zijn alleen rustig bewegen, kracht komt terug vanaf dag 4, en in de eerste 7 dagen komt geen kwaliteitssessie.
**Reden:** er is geen studie naar herstel na een meerdaagse trektocht van recreanten (gezocht, niet gevonden). De regel is afgeleid uit de afdaalstudies (72 tot 96 uur per afdaling) en uit trailrace-onderzoek, waar de kracht na 55 km met 32 tot 40% daalde ([Easthope 2010](https://lida.sport-iat.de/ta/Record/4022283?lng=en), zwak tot matig). Een systematische review uit 2026 vond bij 15 studies wel duidelijke spierschade en krachtverlies na trailraces, maar geen herstelduur ([Muscles 2026](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12921809/), matig). Het is dus een vuistregel (bewijs: expert, afgeleid). Waarschuwing blijft: pijn die dag na dag erger wordt op één plek is een reden voor een arts of fysiotherapeut, niet voor een andere app-regel.

**Regel:** na een pauze van drie weken of meer volgt een herstart van twee weken; ziekte volgt de bestaande regels (C7, C8).
**Reden:** zie het eerdere rapport (expert).

## 3. Bergtocht of dagtocht (één lange dag)

**Kenmerken die de gebruiker invult:** afstand, stijgen, dalen, rugzak (dagrugzak met water en eten), hoogste punt. Optioneel de moeilijkheid van het pad (SAC-wandelschaal T1 tot T6, alleen als signaal: boven T3 verwijst de app naar ervaring of een gids).

**(1) Minimum per week.**
Regel: kracht 1 tot 2 (2.3); rustige duur 150 minuten als vloer; een lange dag eens per week in de specifieke periode, tot het aandeel uit 2.2; een rugzaksessie eens per twee weken als de dagrugzak 5 kg of meer is; een afdaalprikkel elke 7 tot 14 dagen in de laatste 12 weken als er 300 m dalen of meer in de doeldag zit; dagen achter elkaar niet nodig; harde intervallen niet nodig.
Reden: de doeldag is laag-intensief; de benen falen eerder dan hart en longen (bewijs: matig, zie het eerdere rapport). Bergop vraagt spieruithouding, bergaf excentrische tolerantie. Een rugzak onder 5% van het lichaamsgewicht is geen training (Uphill Athlete's eerste stap, expert).

**(2) Opbouwduur.**
Regel: specifiek minimaal 6 weken (aanbevolen 10) voor een dag tot 6 uur en 800 m omhoog; minimaal 10 (aanbevolen 14) voor 6 tot 10 uur of 800 tot 1.500 m; zwaarder dan dat valt in Mountaineering (deel 6) of wordt een kleiner doel. Met de basis en de rugzakladder uit 2.4.
Reden: afgeleid uit 2.4. De 6 weken sluiten aan op de 8 weken basis van Uphill Athlete voor wie al fit is (expert).

**(3) Fasen en afbouw.**
Regel: drie fasen bij 10 weken of meer, anders twee. Afbouw bij Hoofddoel 7 dagen, bij Belangrijk 3.
Reden: 2.5. Een dag is een enkele inspanning, dus korter dan voor een tocht van weken.

**(4) Meters voor "Klaar voor je doel" (vier of vijf).**
1. **Langste dag:** je langste wandeling van de laatste 8 weken. 100% is het aandeel (2.2) van de DIN-tijd.
2. **Stijgen en dalen:** je grootste dag omhoog en omlaag, gemiddeld van de twee. 100% is het aandeel van het stijgen en dalen in de doeldag.
3. **Rugzak:** alleen als de dagrugzak 5 kg of meer is. 100% is het ingevulde gewicht, op een wandeling.
4. **Afdalen vers:** 100% als je in de laatste 14 dagen een afdaling van minstens 100 m had, lineair omlaag naar 0% bij 63 dagen (9 weken), alleen als het doel 300 m dalen of meer heeft. Dit is het nieuwe versheidstype.
Hoe 100% volgt: alles uit wat de gebruiker over zijn doel invult (afstand, stijgen, dalen, rugzak). De DIN-tijd en het aandeel zijn rekenwerk van de app en staan met hun getallen in de zin.
Reden voor meter 4: de bescherming van een afdaling is na 3 en 6 weken er nog en na 9 weken weg ([Byrnes 1985](https://pubmed.ncbi.nlm.nih.gov/4055561/), matig); een kleine afdaling van 5 minuten (ongeveer 110 m) een week van tevoren halveert het krachtverlies ([Maeo 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5348007/), matig). De lineaire daling tussen 14 en 63 dagen is afgeleid (bewijs: zwak).

**(5) Herstel.** Regel 2.6: 3 dagen, 4 tot 5 bij ongewend en 900 m dalen of meer.

## 4. Meerdaagse trektocht met hut

Dit is de huidige GR5-logica. Wat generiek wordt, staat in deel 1; wat er verder over deze soort is vastgelegd, staat in de eerdere rapporten (regels A, B en D en de Trainingswetenschap). Hier alleen de gegevensvorm.

**Kenmerken:** aantal dagen, afstand, stijgen en dalen (totaal of per dag), rugzak (hut: vaak 6 tot 10 kg met water en eten; expert, in het eerdere rapport), hoogste punt.

**(1) Minimum per week.**
Regel: kracht 1 tot 2; wandelvolume als rustige duur; een rugzaksessie 2 tot 4 keer per maand; een afdaalprikkel elke 7 tot 14 dagen; een lange dag eens per week in de specifieke periode, op 100% van een gewone dag; twee keer een weekend met twee lange dagen in de laatste 8 weken.
Reden: 2.3 en de GR5-rapporten. Er is geen studie naar precies deze tocht (bewijs: expert en afgeleid).

**(2) Opbouwduur.**
Regel: specifiek minimaal 8 weken (aanbevolen 12) bij een tocht tot 3 dagen, minimaal 12 (16) bij 4 tot 10 dagen en minimaal 16 (20) bij meer dan 10 dagen. De GR5-opbouw van 16 weken valt in de middelste klasse tot de laatste.
Reden: de aanbevolen 12 weken volgen uit de peesaanpassing (Bohm, matig tot sterk); de rest is afgeleid.

**(3) Fasen en afbouw.**
Regel: de vier GR5-fasen; afbouw bij Hoofddoel 10 dagen, bij Belangrijk 3.
Reden: 2.5. De 10 dagen zitten tussen een dag (7) en de GR5 van weken, waar het plan nu een taperweek van 16 gebruikt.

**(4) Meters (vier, plus de versheidsmeter als de tocht 300 m dalen per dag heeft).**
1. Rugzak, 100% is het ingevulde gewicht.
2. Langste dag, 100% is een gewone dag uit de route (aandeel 1,0).
3. Stijgen en dalen, 100% is een gewone dag.
4. Dagen achter elkaar, 100% is het aantal dagen van de tocht, met een bovengrens van 2 (hut) omdat je meer dagen thuis niet oefent.
Hoe 100% volgt: uit afstand, stijgen, dalen, dagen en rugzak van de tocht. Dat is wat het bestand nu doet.

**(5) Herstel.** Regel 2.6: de helft van het aantal tochtdagen, hoogstens 14, met het 72-uursslot op een zware beendag.

## 5. Meerdaagse trektocht met tent, en kamperen met rugzak

Ik lees "bikkepakken" als bikkelen met een volle rugzak: backpacken en kamperen. Bedoel je bikepacken (fietsen met tassen), dan staat dat in deel 8.

Kamperen met rugzak voor één tot drie nachten is dezelfde doelsoort als een tentwandeling, met een korter schema. Eén doelsoort met een veld voor het aantal nachten is eenvoudiger dan twee, en past bij "doelsoorten zijn gegevens".

**Kenmerken:** nachten, afstand, stijgen en dalen per dag, rugzak met tent, slaapzak, eten voor onderweg en water, bevoorrading.

**(1) Minimum per week.**
Regel: als hut, plus een rugzaksessie die eens per twee weken de volle uitrusting draagt in de laatste 8 weken, en minstens één nacht in de tent met de volle uitrusting vóór de tocht (een taak, geen meter).
Reden: de rugzak is de grootste beperking, niet de conditie (Trainingswetenschap, knelpunt 8, expert); het slaapsysteem en het eten moeten getest zijn voordat de tocht begint, want daar wint of verliest het herstel (expert, avonturenracers laten zien dat een slaaptekort een week blijft hangen, zwak). Zwaardere rugzakken gingen op de Appalachian en Pacific Crest Trail samen met meer klachten ([Anderson 2009](https://complete.bioone.org/journals/wilderness-and-environmental-medicine/volume-20/issue-3/08-WEME-OR-196R2.1/The-Impact-of-Footwear-and-Packweight-on-Injury-and-Illness/10.1580/08-WEME-OR-196R2.1.full), zwak, enquête).

**(2) Opbouwduur.**
Regel: de waarden van de hut-tocht plus 4 weken, en kamperen van 1 tot 3 nachten minimaal 6 weken (aanbevolen 10). De rugzakladder uit 2.4 geldt volledig; bij 14 kg is dat minstens 5 weken.
Reden: een realistische tentrugzak is 12 tot 16 kg (basisuitrusting 7 tot 10 kg, eten 0,7 tot 0,9 kg per dag, water; expert). Boven 15% van het lichaamsgewicht komt een tip om het basisgewicht te verlagen, boven 20% een waarschuwing (regel B8). Een gram uitrusting minder is goedkoper dan een maand training (Trainingswetenschap).

**(3) Fasen en afbouw.**
Regel: afbouw bij Hoofddoel 14 dagen voor een tocht van een week of meer en 7 dagen voor een weekendtrip; bij Belangrijk 4 dagen.
Reden: zwaardere last en slechter herstel (geen studie; expert). Dit is een afgeleide verlenging van 2.5.

**(4) Meters (vier).** Rugzak, Langste dag, Stijgen en dalen, Dagen achter elkaar met bovengrens 3 (tent, omdat de generale repetitie van drie dagen met volle rugzak de bedoeling is; expert) of het aantal nachten plus één als dat lager is.
Hoe 100% volgt: uit de ingevulde rugzak, afstand, meters en nachten. Met een tent is de rugzak veel vaker de meter die het percentage bepaalt; de zin noemt dat.

**(5) Herstel.** 2.6.

**Veiligheid:** voor alleen op pad zonder bereik verwijst ASCEND naar `Noodhulp via satelliet.md`; water per dag naar `Zweetverlies en water.md`. Geen nieuw advies.

## 6. Mountaineering en alpinisme (3000 tot 4500 m, gletsjer, lange dag met vroege start)

Hier houdt ASCEND zich aan wat een trainingsapp kan weten. **Veiligheid in de bergen (hoogteziekte, gletsjers, spleten, lawines, weer) is vakwerk.** ASCEND geeft er geen advies over en toont bij dit doel één vaste verwijzing: volg een cursus van een bergsportvereniging (in Nederland de NKBV, in Duitsland en Oostenrijk de Alpenverein) of ga met een gediplomeerde berggids, en overleg bij een medische vraag met een arts.

**Wat trainbaar is en wat niet** (bewijs per punt):
- Trainbaar: aerobe basis, spieruithouding bergop, excentrische tolerantie bergaf, lastdragen, lange dagen en de energie- en drinkroutine. Een bergwandelaar heeft voor normale stijgsnelheden ongeveer 30 ml per kg per minuut nodig, en dat getal stijgt met 1% per 100 m boven 1.500 m ([Burtscher 2004](https://www.bisp-surf.de/Record/PU200508001919), matig). Spieruithouding verklaart bergprestaties beter dan VO2max (Ehrström 2019, matig, kleine steekproef, in het eerdere rapport).
- Niet of nauwelijks trainbaar: gevoeligheid voor hoogteziekte. Het hangt vooral af van de slaaphoogte en de stijgsnelheid, en conditie beschermt er niet tegen. Duurgetrainde mannen hadden bij een snelle passieve stijging naar 3.450 m juist vaker vroege hoogteziekte dan ongetrainde controles ([Sareban 2020](https://heibib.ub.uni-heidelberg.de/search/Record/1694272370)) (bewijs: zwak tot matig, 38 mannen). Een hypoxietent wordt niet aanbevolen voor acclimatisatie (WMS 2024, sterke aanbeveling, matig bewijs); een getrapte stijging wel (sterke aanbeveling, laag bewijs) ([beoordeling van de WMS-richtlijn 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11855094/)). Vanaf ongeveer 2.500 m loopt iemand zonder gewenning risico (Luks 2024, sterk, richtlijn, zie het eerdere rapport).
- Niet door ASCEND te leren: touw, spleten, zekeren, lawinekennis. Alleen via een cursus.

**Regel:** ASCEND plant geen acclimatisatieschema en geeft geen hoogteadvies boven 2.800 m. Het toont het hoogste punt en de hoogste slaapplek, en de verwijzing hierboven.
**Reden:** de grens van 2.800 m is de laagrisicogrens van de richtlijn; daarboven hangt het af van de route en van jouw voorgeschiedenis, en dat beoordeelt een gids of arts. Een getal voor "nachten per dag stijgen" zou schijnzekerheid geven; een commerciële samenvatting noemt 500 m per nacht en een rustdag elke 3 tot 4 dagen boven 3.000 m, maar die bron is niet geverifieerd en ik neem het niet over.

**Kenmerken:** afstand en tijd van de zware dag, stijgen en dalen op die dag, hoogste punt, hoogste slaapplek, rugzak (8 tot 12 kg is gebruikelijk voor een dag met ijzer en jas; expert), aantal dagen (hut-tochten van twee tot vier dagen), gletsjer ja of nee.

**(1) Minimum per week.**
Regel: kracht 2 in de basis en opbouw en 1 in de specifieke periode; rustige duur met een piekweek van 8 tot 11 uur voor een dag van 10 tot 14 uur; een lange dag per week met een rugzak van 10 tot 20% van het lichaamsgewicht vanaf de opbouw; twee tot drie weekenden met twee lange dagen in de laatste 8 weken; een afdaalprikkel elke 7 tot 14 dagen; één of twee vroege starts in het donker in de laatste 8 weken (een taak).
Reden: het 16-wekenplan van Uphill Athlete loopt van ruim 6 tot 11 uur per week; Alpine Ascents pakt zondagen van 3 tot 4 uur met 10 tot 20% rugzak (expert, aanbieders). Een vroege start kost prestatie: eerder wakker dan gewenst verlaagt de prestatie van de dag erna consequent ([Craven 2022](https://link.springer.com/article/10.1007/s40279-022-01706-y), sterk, regel C1). Het oefenen is voor eten, licht en kleding, niet voor de slaap.

**(2) Opbouwduur.**
Regel: specifiek minimaal 16 weken, aanbevolen 24. Daarvoor een basis van nul of vier weken.
Reden: Alpine Ascents gaat uit van 4 tot 6 maanden; Uphill Athlete verwijst wie voor Mont Blanc of Rainier gaat naar het 12- of 16-wekenplan (expert, aanbieders, met eigen belang).

**(3) Fasen en afbouw.**
Regel: Basis, Opbouw, Specifiek (drie fasen van 8 weken zoals in 2.5). Afbouw bij Hoofddoel 14 dagen, bij Belangrijk 4 dagen.
Reden: Bosquet (sterk); een lange en onzekere dag op hoogte vraagt frisheid (expert). Acclimatisatiedagen ter plaatse horen bij het reisschema, niet bij de afbouw.

**(4) Meters (vijf).**
1. Langste dag: 100% is het aandeel (0,5 bij 12 uur of meer) van de tijd van de zware dag.
2. Stijgen: je grootste dag omhoog, 100% is het aandeel van het stijgen van de zware dag. Als maatstaf: Alpine Ascents noemt een proefklim van ongeveer 1.220 m omhoog met 7 tot 9 kg.
3. Dalen: idem, voor het dalen.
4. Rugzak: 100% is het ingevulde gewicht (cap).
5. Dagen achter elkaar: 100% is het aantal dagen van de tour, met een bovengrens van 2.
Hoe 100% volgt: uit wat de gebruiker over de zware dag invult. Er is geen meter voor hoogte, gletsjer of techniek: die zijn niet uit logs te meten en niet door de app te trainen. De zin zegt dat: "Dit meet je benen en je uithouding, niet je ervaring op hoogte of op een gletsjer."

**(5) Herstel.**
Regel: na een zware alpine dag volgt een herstelweek volgens 2.6; na een tour van meerdere dagen de helft van de dagen, hoogstens 14.
Reden: 2.6. Hoogteherstel en het verlies van gewenning na terugkeer heb ik niet onderzocht. Dat valt buiten wat ASCEND adviseert.

## 7. Trailrunning in de bergen

Het onderzoek voor trail is dun. Het besluit zegt al dat trail eerst eigen onderzoek krijgt. Wat ik vond is hieronder, en alles gaat over onderlinge verhoudingen in plaats van uitkomsten bij recreanten.

**Kenmerken:** afstand, stijgen, dalen, verwachte tijd (zelf in te vullen, want de DIN-formule geldt voor wandelen).

**(1) Minimum per week.**
Regel: wat een hardloopwedstrijd vraagt (drie loopjes, een groeiende lange loop, één kwaliteitssessie, regels in `Opbouw hardlopen.md` en E-regels), plus kracht twee keer per week in de basis en opbouw, een afdaalprikkel elke 7 tot 14 dagen, en stijgen en dalen in de langste loop. De sessiepiek blijft 110% van je langste loop van de laatste 30 dagen.
Reden: zware krachttraining verbetert de loopeconomie met 2 tot 8% ([Blagrove 2018](https://pubmed.ncbi.nlm.nih.gov/29249083/), sterk). Bergaf hardlopen beschadigt per meter meer dan wandelen (factor 1,5 in de beenindex, afgeleid). Spieruithouding voorspelt bergwedstrijden beter dan VO2max (matig).

**(2) Opbouwduur.**
Regel: specifiek minimaal 12 weken (aanbevolen 16) voor een trailrace tot 25 km of 3 uur; minimaal 20 (28) voor een marathonlengte of 3 tot 6 uur; daarboven geen eigen regel, het marathonminimum plus 8 weken, met de melding dat dit een schatting is.
Reden: een eerste marathon vraagt minstens 30 km per week, en vanaf 15 tot 20 km duurt het 24 tot 32 weken (matig, regel E7 in het eerdere rapport). Vier weken extra voor het dalen is afgeleid van de afdaalstudies. Ultra's zijn buiten het bereik van wat ik kan onderbouwen (zwak).

**(3) Fasen en afbouw.**
Regel: Basis, Opbouw, Specifiek; afbouw bij Hoofddoel 7 dagen voor een race tot 3 uur, 10 dagen voor een marathonlengte en 14 voor een ultra; bij Belangrijk 3 dagen.
Reden: Bosquet (sterk), Wang 2023 (matig tot sterk); Britse topmiddelafstandslopers tapen een mediaan van 6 dagen ([Spilsbury 2015](https://vufind.lboro.ac.uk/Record/rr-article-9611357), zwak tot matig).

**(4) Meters (vier).**
1. Langste loop: 100% is het aandeel van de verwachte tijd (2.2).
2. Stijgen en dalen: je grootste dag omhoog en omlaag, tegen het aandeel van de race.
3. Weekuren: lopen plus bergwandelen, gemiddeld over de laatste 4 weken. 100% is 0,7 maal de verwachte racetijd, hoogstens 8 uur (startwaarde).
4. Afdalen vers (versheid), als de race 300 m dalen of meer heeft.
Hoe 100% volgt: uit de ingevulde afstand, meters en tijd. De startwaarde in meter 3 komt van twee punten: 30 km per week is voor een eerste marathon het minimum (ongeveer 3 uur), en finishers van een 50 km-race trainden gemiddeld ongeveer 48 mijl per week tegen 32 bij wie niet finishte (een raceonderzoek, alleen via een samenvatting gelezen, zwak). Daaruit volgt 0,7: afgeleid.

**(5) Herstel.**
Regel: 3 dagen zonder kwaliteit bij een race tot 3 uur, 7 dagen bij een marathonlengte of 2.500 m dalen of meer, 14 dagen bij een ultra.
Reden: 2.6, de kracht na een trailrace van 55 km die met 32 tot 40% daalde, en de systematische review van 2026 (geen herstelduur). Afgeleid (bewijs: expert).

## 8. Fietsen in de bergen en fietsreis met bagage

Hier is het bewijs het dunst. Ik vond geen onderzoek naar wat een amateur nodig heeft voor een col-rit, een sportieve rit of een fietsreis met tassen. Wel is bekend wat fietsen in de benen doet en niet doet (eerder rapport, D1 tot D6).

**Wat geldt:** fietsen traint de aerobe motor en kan 20 tot 50% van het rustige loopvolume vervangen (Menges 2026, matig), maar het beschermt niet tegen afdaalschade, telt niet als rugzaktraining en bouwt geen bot op (Bontemps, Knapik, Olmedillas, matig). Zware krachttraining verbetert de economie op de fiets ([Rønnestad en Mujika 2014](https://lida.sport-iat.de/ta/Record/4032491), matig tot sterk, uit de samenvatting; de volledige tekst niet gelezen). Een uur fietsen verlaagde de kniestrekkracht met 21%, een uur bergop wandelen niet (Pageaux 2017, zwak, negen deelnemers).

### 8.1 Fietsen in de bergen (sportieve rit of col)

**Kenmerken:** afstand, stijgen, hoogste col, verwachte tijd.

**(1) Minimum per week.**
Regel: kracht 1 tot 2; rustige duur met de vloer van 150 minuten; een lange rit eens per week in de specifieke periode, tot het aandeel uit 2.2; ongeveer 80% van de tijd rustig. Geen weekuren als eis.
Reden: kracht (Rønnestad en Mujika, matig tot sterk) en de 80/20-verdeling (Oliveira 2024, matig). Voor een ondergrens in weekuren heb ik geen bron gevonden, en aanbieders noemen waarden die ik niet kan controleren.

**(2) Opbouwduur.** Regel: specifiek minimaal 8 weken (aanbevolen 12) voor wie al fietst, 4 weken meer voor wie dat niet doet. Reden: afgeleid zonder bron (bewijs: zwak).

**(3) Fasen en afbouw.** Regel: afbouw 7 dagen bij Hoofddoel, 3 bij Belangrijk. Reden: Bosquet (sterk), overdracht afgeleid.

**(4) Meters (drie).** Langste rit (tijd, aandeel van de verwachte tijd), Stijgen in één rit (aandeel van het stijgen), Volhouden (de bestaande `recentAdherence`). Er is geen meter voor dalen: afdalen op de fiets is geen excentrische beenbelasting. Er is geen meter voor weekuren, omdat ik geen onderbouwd getal heb. Hoe 100% volgt: uit de ingevulde afstand, meters en tijd.

**(5) Herstel.** Regel: 1 tot 2 dagen rustig na een rit van meer dan 4 uur, en niet vlak vóór een zware beendag (een rit langer dan 2 uur telt als beenmatig, regel D5). Reden: Pageaux (zwak) en D5 (afgeleid).

### 8.2 Fietsreis met bagage

**Kenmerken:** dagen, uur op de fiets per dag, afstand per dag, stijgen per dag, bagage in kg, kamperen of hotel.

**(1) Minimum per week.**
Regel: kracht 1; een lange rit eens per week op 100% van een gewone dag; in de laatste 8 weken twee keer twee tot drie ritten achter elkaar met de bagage erop.
Reden: net als een tocht, de dagen herhalen zich (expert). Er is geen studie naar de energiekost van beladen toeren; de gevonden bronnen over etappekoersen en retailers zeggen niets over bagage ([6-daagse etappekoers: opname gelijk aan verbruik](https://lida.sport-iat.de/ta/Record/4019229), zwak voor dit doel).

**(2) Opbouwduur.** Regel: specifiek minimaal 6 weken (aanbevolen 10). Reden: afgeleid.

**(3) Fasen en afbouw.** Regel: afbouw 7 dagen bij Hoofddoel, 3 bij Belangrijk.

**(4) Meters (vier).** Langste rit (100% is een gewone dag, aandeel 1,0), Dagen achter elkaar (bovengrens 3), Bagage (100% is het ingevulde gewicht, een rit met tassen) en Stijgen in één rit als er meer dan 300 m per dag in de route zit. De bagagemeter vraagt een nieuw veld op een rit; nu bestaat `backpackWeightKg` alleen op wandelingen. Hoe 100% volgt: uit de ingevulde dagen, uren en bagage.

**(5) Herstel.** Regel: de helft van het aantal ritdagen, hoogstens 7. Reden: geen bron; wat spieren en zadel betreft is er niets onderzocht (bewijs: expert).

## 9. Combinaties

**Regel:** een combinatie is één doel met onderdelen. Elk onderdeel heeft een eigen doelsoort, eigen kenmerken, eigen eisen en eigen meters. Het doel heeft één percentage: het gemiddelde van alle meters van alle onderdelen. De zin noemt per onderdeel het zwakste punt.
**Reden:** het besluit zegt "één percentage per doel", en een doel met twee onderdelen (bijvoorbeeld vijf dagen fietsen en daarna drie dagen trekken) moet één getal houden. Het gemiddelde kan een sterk onderdeel een zwak onderdeel laten verbergen, daarom het zwakste punt per onderdeel in de zin (zelfde patroon als `weakestSentence`). Alternatief: de laagste van de onderdelen. Dat is strenger en simpeler uit te leggen, maar voelt onrechtvaardig zodra één onderdeel klein is. Aan de eigenaar.

**Regel:** voor kracht en rustige duur telt het maximum van de onderdelen, niet de som. De specifieke sessies (rugzaksessie, afdaalprikkel, lange rit, lange loop) worden per onderdeel apart gerekend.
**Reden:** kracht en aerobe basis delen dezelfde prikkel (Knapik, Schumann), maar fietsen vervangt geen rugzak, afdalen of impact (Bontemps, Pageaux, D1 en D2). Eén beenbudget zegt wat er samen past.

**Regel:** het minimum aantal weken is dat van het zwaarste onderdeel plus 2. Als de weektijd die de gebruiker opgeeft lager is dan de som van de specifieke sessies, zegt de app dat en stelt een voorstel voor met Akkoord.
**Reden:** afgeleid; de planning kent beschikbare tijd al (beschikbare dagen en tijd per dag).

**Onzeker:** een tocht gevolgd door een fietsreis (of omgekeerd) is een dubbele belasting zonder eigen onderzoek. Dagen achter elkaar over twee soorten heen zijn niet onderzocht.

## 10. Sterker worden

Kracht is het hoofddoel, duur loopt mee op onderhoud. Dit is de enige doelsoort met een meter die uit Forge komt.

**(1) Minimum per week.**
Regel: elke grote spiergroep minstens twee keer per week; per spiergroep 10 tot 20 harde sets per week; de sessies volgen uit het aantal dagen (3 dagen: volledig lichaam drie keer of boven, onder, volledig; 4 dagen: boven en onder twee keer; 5 dagen: boven, onder, duwen, trekken, benen); cardio ongeveer 150 minuten matig, op andere dagen of minstens 6 uur van de krachtsessie.
Reden: dit is regel F1 tot F3 en het ACSM-standpunt van 2026 (sterk, 137 reviews); volume drijft groei, frequentie helpt kracht, het schema is vrij ([Schoenfeld 2019](https://pubmed.ncbi.nlm.nih.gov/30558493/) en Pelland 2025, sterk tot matig; de bandbreedte van sets is expert). Interferentie is klein (Schumann 2022, sterk). Het getal van 10 tot 20 harde sets is dus een ontwerpstreefwaarde, geen eis.

**(2) Opbouwduur.**
Regel: geen minimum. Een krachtdoel krijgt een horizon van minstens 8 weken om te toetsen; voor wie nieuw is gaat het snelst in de eerste weken.
Reden: ik vond geen betrouwbare vuistregel voor de snelheid van krachtwinst bij recreanten. Een meta-analyse uit 2024 vond dat duur en intensiteit het meest uitmaken en dat trainingsstatus weinig voorspelt (Swinton e.a. 2024, via een zoekresultaat, niet in volledige tekst gelezen, zwak). Rhea 2003 liet zien dat ongetrainden bij ongeveer 60% van 1RM en drie keer per week het meest winnen, getrainden bij 80% en twee keer ([Rhea 2003](https://pubmed.ncbi.nlm.nih.gov/12618576/), matig). Een tabel met "normale winst per maand" zou schijnzekerheid geven.

**(3) Fasen en afbouw.**
Regel: golven van vier weken (drie opbouw, één flexibele lichte week met 40 tot 50% minder sets op gelijke lasten); houd het sjabloon één tot drie golven aan. Geen afbouw, behalve vóór een testweek met zware pogingen: dan een week met 40 tot 50% minder volume en geen harde cardio.
Reden: Bell 2023 (expert, Delphi), Coleman 2024 (zwak tot matig: volledig stoppen hielp niet), Moesgaard 2022 (matig, periodisering maakt weinig uit). Afbouw voor een krachttest: afgeleid van Bosquet (de principes zijn voor duur).

**(4) Meters (drie).**
1. **Krachttrend op je hoofdoefeningen:** de gebruiker kiest één tot vier oefeningen en geeft een doel op als **gewicht maal herhalingen** (bijvoorbeeld 100 kg voor 5). ASCEND rekent dat intern om naar een geschat maximum (KR-1, Epley met herhalingen plus RIR) en vergelijkt met je beste set van de laatste 4 weken (KR-2). Sets met een aangenomen RIR tellen niet mee (`SetLog.rirAssumed`). Het aandeel is (nu min start) gedeeld door (doel min start), begrensd. De uitslag wordt getoond als "nog 7 kg voor 5 herhalingen", nooit als "je max is".
2. **Harde sets per spiergroep:** het deel van je spiergroepen dat gemiddeld over de laatste 4 weken 10 harde sets per week haalt (primaire spier 1, secundaire een halve, RIR hooguit 4; `engine/muscleVolume.ts`). Een spiergroep kan van het doel worden uitgesloten.
3. **Volhouden:** dezelfde `recentAdherence` als de coach en Je stand.
Hoe 100% volgt: de eerste meter volgt uit het doel dat de gebruiker invult; de tweede uit de richtlijn (10 sets, aanpasbaar); de derde uit wat hij zelf gepland heeft. Een geschat maximum is een interne munt tussen sets van dezelfde oefening en dezelfde persoon; ASCEND rekent nooit om van de ene oefening naar de andere.
Reden voor 10: ACSM 2026 (sterk). Het getal is niet specifiek voor krachtdoel: sommige samenvattingen van Pelland zeggen dat voor kracht al weinig sets genoeg zijn en vooral frequentie telt, maar die cijfers heb ik niet in de volledige tekst bevestigd (zwak). Daarom staat de streefwaarde in de instellingen.
**Haalbaarheid zonder tabel:** de zin "met het tempo van de laatste 12 weken haal je dit rond [datum]" is een eenvoudige doortrekking van je eigen trend, met een band, en zegt dat winst vertraagt. Dat past bij de eerdere afwijzing van fitness-modellen en percentages van "kans".

**(5) Herstel.**
Regel: na een zware testweek 2 tot 3 dagen lichter; zware beenkracht ligt minstens 48 uur voor een lange loop of tocht en 72 uur voor een wedstrijd.
Reden: 24 tot 72 uur voor neuromusculaire vermoeidheid, afhankelijk van hoe dicht bij falen (Morán-Navarro 2017, Thomas 2018, matig, in `Spierbelasting en beenvermoeidheid.md`).

## 11. Fit blijven

Geen datum, geen opbouw. De enige doelsoort met een maat voor 100% die van buiten komt.

**(1) Minimum per week.**
Regel: 150 minuten matig, of 75 minuten intensief (een minuut intensief telt als twee), plus op minstens twee dagen spierversterkende training; verspreiding over de week is geen eis. Een minimumweek (één volledige krachtsessie plus wandelen) telt als geslaagde week.
Reden: Gezondheidsraad 2017, WHO 2020 en ACSM zijn het eens (sterk). Een weekendsporter die het in twee sessies haalt, scoort voor sterfte even goed (O'Donovan 2017, matig, in `ASCEND voor iedereen.md`). Minder dan de richtlijn doen heeft nog steeds nut (matig, observationeel). De minimumweek is regel F5.

**(2) Opbouwduur.** Regel: geen. Beginners starten volgens `ASCEND voor iedereen.md` (hoogstens vier dagen, twee weken zonder harde dag). Reden: expert.

**(3) Fasen en afbouw.** Regel: golven van vier weken (drie weken gelijk, één lichte week als voorstel), geen afbouw; de lichte week ook bij ziekte, reizen of drukte. Reden: expert (F3, F5).

**(4) Meters (twee, met volhouden drie).**
1. **Minuten per week:** het gemiddelde van de laatste 4 weken van minstens (minuten matig plus twee maal minuten intensief) gedeeld door 150, begrensd.
2. **Krachtdagen:** gemiddeld aantal dagen per week met spierversterkende training, gedeeld door 2, begrensd.
3. **Volhouden:** `recentAdherence`.
Hoe 100% volgt: uit de richtlijn, niet uit wat de gebruiker invult. De gebruiker mag het doel verhogen (bijvoorbeeld 200 minuten of drie krachtdagen); verlagen onder de richtlijn kan, met het label "onder de richtlijn".
Reden: de richtlijn heeft een ondergrens en geen bovengrens. Voor 300 minuten of meer is er extra winst, maar de eis stijgt niet.

**(5) Herstel.** Niet van toepassing. Ziekte en pauze volgen C7 en C8.

## 12. Het geheel

### Wat het onderzoek zegt

- De meeste ondergrenzen voor berg- en buitendoelen zijn expert of afgeleid. Het sterkste bewijs gaat over grenzen en volgorde: 150 minuten en twee keer kracht, een taper van ongeveer twee weken met 41 tot 60% minder volume, kracht die niet verloren gaat naast duur, en het verval van bescherming tegen afdaalschade na zes tot negen weken.
- Een doel van één lange dag wordt niet in zijn geheel gerepeteerd. Gidsaanbieders trainen met ongeveer 25 tot 50% van de dag in één sessie; marathonlopers komen niet voorbij 25 tot 35 km.
- Voor alpinisme boven 3000 m is conditie nodig maar beschermt niet tegen hoogteziekte. De slaaphoogte en de stijgsnelheid bepalen het risico. Dat is werk voor een gids en een arts.
- Voor trail, fietsen in de bergen en fietsreizen met bagage is er nauwelijks onderzoek naar wat een amateur nodig heeft. Wat er is, gaat over loopeconomie, kracht en de verdeling van intensiteit.
- Voor sterker worden zijn volume en frequentie sterk onderbouwd, de snelheid van winst niet. Voor fit blijven staat de richtlijn vast.

### Wat het betekent voor de app

1. **Een doelsoort is een gegeven** met kenmerken, ondergrenzen per soort training, minimale en aanbevolen weken, fasen, afbouwdagen per label, een lijst meters en een herstelregel (deel 1).
2. **Vier meterstypes** dekken alles: beste dag, reeks, volume of trend (ook voor fit blijven, met de richtlijn als eis) en versheid. `gr5Readiness` wordt `goalReadiness` met de meters, de bovengrens op dagen, de sporten, het venster en de zin uit de gegevens.
3. **Het dagaandeel** (2.2) is nodig voor elk doel van één dag. Zonder die stap zou een bergtocht van 12 uur nooit op 100% kunnen komen, of 12 uur trainen vragen.
4. **Nieuwe velden:** hoogste punt en slaapplek (alpine, alleen informatief), hut of tent, verwachte tijd (lopen en fietsen), bagage op een rit, en het doel in gewicht maal herhalingen voor sterker worden.
5. **Haalbaarheid** is een voorstel met Akkoord in drie standen (past, kort, past niet), nooit een stille wijziging.
6. **Eerlijke teksten:** bij trail, fietsen en alpine zegt de zin wat de meters niet meten.
7. **Veiligheid:** één vaste verwijzing bij alpine (cursus of berggids), geen hoogteadvies boven 2.800 m. Geen medisch advies; bij pijn of klachten een arts of fysiotherapeut.
8. **Gelijk blijven voor de bestaande gebruiker:** een tocht met 100% van een gewone dag, een bovengrens van 2 dagen, de vier meters en venster 56 dagen reproduceren de huidige GR5-meter. Dat past op de vaste toets van ronde 0.

### Wat nog onzeker is

- **Het dagaandeel** (1,0 tot 3 uur, 0,6 bij 8, 0,5 vanaf 12) en de 8% langere dag per 1.000 m boven 1.500 m zijn mijn keuzes. Ze steunen op aanbieders, een marathon-observatie en een rekenmodel, niet op onderzoek naar tochten.
- **De wekengetallen** (6 tot 28 voor de specifieke periode, de basis van 4, de rugzaklader van 1 tot 2 weken per 2 kg) zijn afgeleid. Aanbieders zijn partijen met een belang.
- **De afbouwdagen** (3 tot 14) volgen uit taperonderzoek voor wedstrijden. Voor tochten is dat niet getoetst.
- **Herstel na een tocht van meerdere dagen:** geen studie. De regel is een vuistregel uit afdaal- en trailrace-onderzoek.
- **Trail:** de factor 0,7 voor weekuren komt van twee datapunten, waarvan één alleen uit een samenvatting. Ultra's zijn niet onderzocht.
- **Fietsen:** geen bron voor weekuren, voor de opbouwduur of voor het herstel na een lange rit of fietsreis. Alleen de verhouding tot lopen en kracht is onderbouwd.
- **Alpinisme:** de WMS-aanbevelingen heb ik via een beoordeling gelezen, niet de volledige richtlijn. De gids-aanbieders zijn niet onafhankelijk. Of een gebruiker zonder ervaring in een app overweg kan met een alpine doel is geen trainingsvraag.
- **Sterker worden:** de snelheid van krachtwinst, de ideale hoeveelheid sets voor kracht (los van groei) en wat een realistisch doel is zijn niet vastgesteld. De cijfers uit Pelland 2025 over 3 gewogen sets voor kracht heb ik alleen uit samenvattingen.
- **Combinaties:** gemiddelde of laagste van de onderdelen is een ontwerpkeuze voor de eigenaar, en de dubbele belasting van twee soorten is niet onderzocht.
- **Wat ik niet nalas:** Swinton 2024, Hoffman 2014, Sareban 2020 (alleen de samenvatting), de volledige WMS-richtlijn en Rønnestad en Mujika 2014 (alleen de samenvatting). Dat moet voor ze in de app komen.

## Bronnen (nieuw in dit rapport)

Tijd, hoogte en conditie
- Burtscher 2004, Exercise capacity for mountaineering: how much is necessary? Research in Sports Medicine 12(4): 241 tot 250: https://www.bisp-surf.de/Record/PU200508001919
- Looptijdformule DIN 33466 en SAC (uitleg): https://www.bergfreunde.de/gehzeit-rechner/
- Alpine Ascents, Mont Blanc training: https://www.alpineascents.com/climbs/mont-blanc/training/
- Uphill Athlete, 8-wekenplan Mont Blanc: https://uphillathlete.com/?p=4753
- Beoordeling van de WMS-richtlijn 2024 (hoogte en kou): https://pmc.ncbi.nlm.nih.gov/articles/PMC11855094/
- Sareban 2020, duursporters en vroege hoogteziekte op 3450 m, Med Sci Sports Exerc 52(5): 1109 tot 1115: https://heibib.ub.uni-heidelberg.de/search/Record/1694272370

Trail, fietsen en herstel
- Muscle, neuromuscular and cardiac damage in trail running: a systematic review (2026): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12921809/
- Rønnestad en Mujika 2014, krachttraining voor lopen en fietsen: https://lida.sport-iat.de/ta/Record/4032491
- Energie-inname en verbruik in een 6-daagse etappekoers: https://lida.sport-iat.de/ta/Record/4019229
- Grenier 2012, extreem lange lastdracht (militair): https://pmc.ncbi.nlm.nih.gov/articles/PMC3425486

Kracht
- Rhea 2003, dosis-respons voor krachtontwikkeling: https://pubmed.ncbi.nlm.nih.gov/12618576/

De rest (Bontemps, Maeo, Byrnes, Knapik, Schumann, Bosquet, Wang, Frandsen, Craven, ACSM 2026, WHO 2020, Blagrove, Easthope, Anderson, Bohm, Oliveira, Spilsbury) staat met links in de eerdere rapporten en is hier alleen genoemd.
