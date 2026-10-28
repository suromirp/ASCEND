# Klaar voor je doel, logisch per doel

Onderzoek en ontwerpvoorstel van Scout Klaar-voor-je-doel, 28 oktober 2026. Aanleiding: de doelkaart van een 10 km met doeltijd 45:00 toont 77% "Klaar voor je doel", terwijl de zin eronder zegt "verwacht nu 55:40 ... 45:00 vraagt meer dan gemiddelde groei". De eigenaar wil dat het percentage voor elk doel en elke sport logisch is, en dat we breder denken dan alleen deze kaart.

Dit stuk bouwt voort op `Doelsoorten duur.md`, `Doelsoorten berg en buiten.md`, `Tussendoel hardloopwedstrijd.md`, `docs/visie/Trainingswetenschap.md` (knelpunt 1), `docs/visie/Zonder doel.md` en de besluiten `2026-10-28-klaar-voor-je-doel-snelheid.md` en `-aanvulling.md`. Gelezen code: `data/goalKinds.ts`, `engine/goalReadiness.ts`, `engine/raceReadiness.ts`, `engine/racePaces.ts`, `engine/racePrediction.ts`, `engine/gr5Readiness.ts`. Er is niets in `src/` gewijzigd. Alles hieronder is een voorstel voor engine-regels, geen besluit, en geen medisch advies.

Bewijslabels zoals in de rest van `docs/onderzoek/`: **sterk** (meta-analyses of meerdere consistente trials), **matig** (een goede trial, een grote cohort, een goede review), **zwak** (klein, observationeel, of alleen een samenvatting gelezen), **expert** (coachpraktijk zonder uitkomstdata) en **afgeleid** (mijn eigen rekenwerk of redenering).

## 1. In het kort

1. Het getal van 77% is niet fout gerekend, het meet het verkeerde. Een tijdsverhouding (45 gedeeld door 55:40 is 81%) behandelt een gat van 19% in tijd alsof het klein is, terwijl prestatie maar ongeveer een half procent per week groeit. Capaciteit (afstand, volume, rugzak) groeit ongeveer tien keer zo snel. Dezelfde breuk betekent dus heel verschillend veel werk.
2. Er is ook een tweede tegenspraak op dezelfde kaart: "Hier is nog het meeste te winnen: weekvolume", terwijl het grote gat de tijd is. De laagste meter is niet de meter waar de meeste procentpunten te winnen zijn als de meters verschillend wegen.
3. Voorstel: elke meter drukt het gat uit in **weken realistisch werk** (W). Een meter staat op 100% als er niets meer te doen is, op 50% bij ongeveer tien weken werk, op 25% bij dertig weken. Voor capaciteit is de bestaande breuk "8,6 van 10 km" daar binnen een paar punten gelijk aan, dus die blijft. Voor prestatie komt er een echte omrekening.
4. Doorgerekend: snelheid 21% in plaats van 81%, het doel 41% in plaats van 77% (snelheid 60%, langste loop 20%, weekvolume 20%). De eerste schatting van de eigenaar (rond 40%) klopt.
5. Drie soorten doelen: **volbrengen** (de tijd telt niet, alleen capaciteit), **prestatie** (een doeltijd of doelgewicht is het doel zelf en weegt het zwaarst) en **voorwaarde** (een tijdslimiet of cutoff die je moet halen om te mogen volbrengen; telt als een gewone meter).
6. De GR5 verandert niet: het is volbrengen, de vier meters zijn capaciteit, en de bevroren uitkomsten blijven gelijk.

## 2. Waarom 77% onlogisch is

De kaart rekent nu (`raceReadiness.ts#speedAt`): snelheid is doeltijd gedeeld door verwachte tijd, begrensd op 100%. Met 45:00 en 55:40 is dat 45 gedeeld door 55,67 is 0,81. Daarna het gewogen gemiddelde: 0,6 maal 0,81 plus 0,2 maal 0,86 (langste loop 8,6 van 10 km) plus 0,2 maal 0,56 (weekvolume 12,6 van 22,5 km) is 0,77.

Wat er mis is, in gewone woorden:

- **Een tijdsverhouding is te gul.** 81% klinkt als "bijna", maar 10:40 sneller op een 10 km is ongeveer 19% minder tijd, en dat is een sprong van ongeveer 10 VDOT-punten (35 naar 45, eigen berekening met de formules in `racePaces.ts`, afgeleid). Recreatieve lopers winnen in 10 weken 3,5 tot 5% op de 10 km ([Muñoz e.a. 2014](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2019.00070/full), zwak tot matig). Daniels adviseert hoogstens één VDOT-punt per vier tot zes weken (expert, zie `Trainingswetenschap.md`). Het gat is dus het werk van ruwweg 40 tot 60 weken, niet "19% te gaan".
- **Dezelfde breuk betekent per soort iets anders.** 86% van je langste loop is twee tot drie weken werk; 81% van je doeltijd is bijna een jaar. Een gemiddelde van breuken telt appels bij peren op.
- **"Het meeste te winnen" volgt de laagste breuk, niet het grootste gat.** Weekvolume (56%) is de laagste breuk, maar met de weging zit het grootste verlies aan procentpunten in snelheid. De kaart wijst dus naar de verkeerde plek.
- **De haalbaarheidsregel rekent wel in groei** (`raceDayBand`, 0,3 tot 0,8% per week). Getal en zin gebruiken dus twee verschillende maten voor hetzelfde gat. Daardoor kunnen ze elkaar tegenspreken.

Hetzelfde patroon zit verborgen in de krachtmeter van "Sterker worden" (`goalKinds.ts`, meter krachttrend): het aandeel is (nu min start) gedeeld door (doel min start). Wie begint op 95% van zijn doel en een week later op 96% staat, krijgt 20%. Ook dat meet niet "hoe ver ben je", maar "hoeveel van je eigen beginafstand heb je afgelegd".

## 3. De principes

**P1. 100% betekent: je kunt het doel vandaag zoals gevraagd.** Alle meters die meetellen zijn vol. Dat is de bestaande regel ("100% alleen als alles vol is, anders 99") en die blijft.

**P2. Elke meter meet het gat in weken realistisch werk.** W is het aantal weken dat iemand bij gemiddelde groei nodig heeft om van nu naar de eis te komen. Het percentage van een meter volgt uit W met één vaste kromme (deel 5): 100% bij W gelijk aan 0, 50% bij ongeveer tien weken, 25% bij dertig, en nooit 0 zolang er iets gemeten is. Zo betekent 50% op elke meter en bij elk doel hetzelfde: "er is nog ongeveer tien weken werk", en dat is ook ongeveer de lengte van een gangbaar blok voor een 10 km of een bergdag (`goalKinds.ts`, `buildWeeks.recommended`).

**P3. Het getal hangt af van hoe je er nu voor staat, niet van de kalender.** De weken die tot de doeldag resten staan in de haalbaarheidsregel, niet in het getal. Zo verandert het getal alleen als jij verandert (een test, een langere loop), niet doordat de datum dichterbij komt.

**P4. Getal, meters en zinnen komen uit één bron.** De meter, de haalbaarheidsregel en "Hier is nog het meeste te winnen" lezen dezelfde W. Daardoor kan het niet meer dat het getal "bijna" zegt terwijl de zin "ver weg" zegt. Concreet: een prestatiemeter van 50% of meer kan alleen als het gat bij gemiddelde groei hoogstens tien weken is, en een meter van 100% staat nooit naast "nog X te gaan".

**P5. Drie soorten doelen, drie manieren van wegen.**

- **Volbrengen**: je wilt de afstand, de tocht of de dag uitlopen. Tijd telt niet. Alleen capaciteitsmeters (afstand, duur, hoogte, rugzak, dagen achter elkaar, volume), even zwaar. Een tijd die je invult als verwachting (`expectedMinutes`) is geen doel maar een maat om de eis te schatten (bijvoorbeeld het dagaandeel), en levert geen prestatiemeter op.
- **Prestatie**: de tijd, de snelheid of het gewicht ís het doel (een doeltijd op de 10 km, 100 kg voor 5 op de squat). De prestatiemeter weegt het zwaarst (nu 60%, `RACE_SPEED_WEIGHTS`), de capaciteitsmeters samen de rest, omdat ze de voorwaarde zijn om die prestatie over de hele afstand vol te houden.
- **Voorwaarde**: een tijdslimiet, een cutoff of een laatste lift naar beneden. Je wilt volbrengen, maar alleen binnen die tijd mag dat. De tempometer telt als een gewone meter, even zwaar als de andere, en is pas niet vol als je verwachte tijd boven de limiet (met marge) uitkomt.

**P6. "Hier is nog het meeste te winnen" is de meter met het grootste gewogen gat.** Dat is gewicht maal (1 min vulling): de meter die het meeste procentpunten aan het getal kost. Bij gelijke gewichten is dat precies de laagste meter, dus voor de GR5 en elk doel zonder weging verandert er niets.

**P7. Een prestatiemeter die niet te meten is, wordt genoemd en niet geraden.** Geen testloop, een test die op Akkoord wacht, een marathon (Riegel voorspelt die niet), een fietsdoel zonder vermogensmeter: dan staat er één eerlijke regel. Een ontbrekende meter weglaten maakt het getal mooier dan het is (`Doelsoorten duur.md`, gedeelde regel 8 noemde dat al); bij een prestatiedoel valt dan het belangrijkste deel weg. Zie de open keuzes.

**P8. Het doel blijft het doel.** Het getal wordt altijd tegen jouw doel gerekend, nooit tegen een "realistisch" doel dat de app zelf bedenkt. De app zegt droog of het past bij gemiddelde groei; een ander doel komt alleen via een voorstel met Akkoord (TARGET-TIME), en Liever niet blijft gelden zoals besloten.

## 4. Hoe snel prestatie realistisch groeit

Dit is de kern van de omrekening. Voor elk getal staat erbij hoe zeker het is en voor wie het geldt. Bijna alle studies gaan over gezonde volwassenen van 18 tot 50 jaar, vaak mannen, en over blokken van 4 tot 24 weken. Over ouderen en mensen met overgewicht zeggen ze weinig.

### Hardlopen (5 km tot halve marathon)

- Recreatieve lopers die al trainden, 10 weken: 3,5% (drempelprogramma) en 5,0% (gepolariseerd) sneller op de 10 km; wie het gepolariseerde plan streng volgde 7% ([Muñoz e.a. 2014](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2019.00070/full), [ResearchGate](https://www.researchgate.net/publication/237096628_Does_Polarized_Training_Improve_Performance_in_Recreational_Runners), zwak tot matig, 30 lopers). Dat is 0,35 tot 0,5% per week.
- Vier weken intervallen plus een taper: 3,3% en na tien dagen taper 4,5% op de 10 km ([Universiteit van Kaapstad](https://open.uct.ac.za/bitstreams/e3679b56-b02f-410d-96d5-e155ea022c31/download), zwak, een scriptie, alleen de samenvatting gelezen). Een deel van zo'n snelle winst is frisheid, niet fitheid.
- Groot en echt: in de parkrun-database verbeterden deelnemers die eerst geen lopers waren hun 5 km met 15,8%, de anderen met 10,2% ([Stevinson en Hickson 2014](https://academic.oup.com/jpubhealth/article/36/2/268/1548895), matig voor het verschil tussen beginners en lopers, zwak voor de snelheid, want de periode staat niet in de samenvatting die ik las).
- Bijsturen of vast plan maakt bij recreanten weinig uit voor het gemiddelde ([Nuuttila e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/), matig).
- Daniels: één VDOT-punt per vier tot zes weken (expert). Rond VDOT 35 tot 45 is één punt ongeveer 2 tot 2,5% tijd op de 10 km (afgeleid uit de formules in `racePaces.ts`), dus 0,35 tot 0,6% per week.

Conclusie: de bestaande band in `racePaces.ts` (0,3% per week langzaam, 0,8% snel, hoogstens 15% tot de wedstrijd) past bij het onderzoek. Het midden, **0,55% per week**, is het beste ene getal voor "gemiddelde groei" (afgeleid). Wie net begint, zit eerder bij 0,8%; wie al jaren loopt, eerder bij 0,3% of lager (de richting is sterk, de getallen zijn afgeleid).

### Fietsen

- Amateur-wegrenners, 8 weken: drempelvermogen (FTP) 2,7 tot 2,8% hoger, onafhankelijk van de verdeling van intensiteit ([GADE 2025 via SPONET](https://www.sponet.de/sponet/Record/4097155?lng=en), zwak, 20 renners, alleen de samenvatting). Dat is ongeveer 0,35% per week.
- Ongetrainde volwassenen in de HERITAGE-studie, 20 weken fietstraining: VO2max gemiddeld ongeveer 17% hoger, met een enorme spreiding van bijna niets tot meer dan 40% ([Bouchard e.a. 2001](https://www.Gwern.net/doc/genetics/heritable/2001-bouchard.pdf); het gemiddelde van 17% alleen uit een [secundaire bron](https://www.greaterwrong.com/posts/ka8eveZpT7hXLhRTM/procedural-knowledge-gaps/comment/9Tyimpg9WhCKMGjCB), zwak voor het getal, sterk voor de spreiding). VO2max is niet hetzelfde als vermogen op de drempel, maar het geeft de bovenkant voor beginners: ongeveer 0,8% per week.
- Bij getrainde fietsers verschillen intervalvormen onderling ongeveer 1,6% op een tijdrit ([SIT tegen HIIT, meta-analyse](https://lida.sport-iat.de/ta/Record/4050847), zwak, zeven studies van lage kwaliteit).

Conclusie: **0,5% vermogen per week** als gemiddelde, 0,3% voor wie al jaren fietst, 0,8% voor beginners (afgeleid, zwak).

Belangrijk voor fietsen: tijd is niet evenredig met vermogen. Op het vlakke gaat bijna al het vermogen naar luchtweerstand, en die groeit ongeveer met de derde macht van de snelheid; bergop gaat het naar het optillen van jezelf en je fiets, en daar groeit het vermogen ongeveer evenredig met de snelheid (natuurkunde; het bekende model van Martin e.a. 1998 voor wegfietsvermogen, matig, uit het geheugen en niet opnieuw nagelezen). Een tocht van 3:30 naar 3:15 op het vlakke (8% sneller) vraagt dus ongeveer 25% meer vermogen, bergop maar 8%.

### Zwemmen

- Zeven recreatieve triatleten, 8 weken zwaarder trainen: 2,9% sneller op 400 m ([recreatieve triatleten](https://real.mtak.hu/153000/1/2677-0164-article-p427.pdf), zwak, observationeel). Ongeveer 0,35% per week.
- Voor beginners bepaalt techniek het meeste, en daar is geen bruikbaar groeigetal voor gevonden.

Conclusie: zwemmen is nog geen sport in ASCEND; een getal is nu niet nodig. Als het komt: 0,35% per week voor wie al zwemt (zwak), voor beginners geen getal.

### Kracht

- Ongetrainde volwassenen, 8 tot 24 weken (gemiddeld ongeveer 10 weken): krachtwinst van ongeveer 7 tot 52% per oefening in de losse studies van een meta-analyse ([Ralston e.a. 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6081873/), matig voor het bereik; de meta-analyse zelf rapporteert effectgroottes, geen gepoolde procenten). Dat is ruwweg 1 tot 3% per week in de eerste maanden, vooral door het zenuwstelsel.
- Krachtsporters in wedstrijden (1.897 powerlifters, 15 jaar): de grootste winst in het eerste jaar, ongeveer 7,5 tot 12,5%, en tot ongeveer 20% na tien jaar ([Latella e.a. 2020](https://acuresearchbank.acu.edu.au/item/88470/long-term-strength-adaptation-a-15-year-analysis-of-powerlifting-athletes), matig; de procenten uit een samenvatting). Dat is ongeveer 0,2% per week in het eerste wedstrijdjaar en daarna 0,05% of minder.
- Lichtere lasten werken het best bij ongetrainden, zwaardere bij getrainden ([Rhea 2003](https://pubmed.ncbi.nlm.nih.gov/12618576/), matig). De oude ACSM-positie noemt een aflopende reeks van ongeveer 40% bij ongetrainden tot 2% bij de top, over vier weken tot twee jaar; die zin heb ik niet kunnen nalezen (uit het geheugen, zwak).

Conclusie per niveau, geschat maximum (e1RM) per week: **beginner** (minder dan een half jaar regelmatig op deze oefening) 1%, **gevorderd** (een half jaar tot twee jaar) 0,25%, **ervaren** (meer dan twee jaar) 0,1% (afgeleid uit de bronnen hierboven; de richting is sterk, de getallen zwak). Beter dan een niveau is je eigen trend over de laatste 12 weken, zoals `Doelsoorten berg en buiten.md` deel 10 al voorstelde.

### Wandelen en bergop

Voor het tempo van recreatieve wandelaars (eigen tijd tegen de DIN-tijd) heb ik geen trainingsstudie gevonden. Bergop hangt vooral af van aerobe capaciteit en spieruithouding (zie `Doelsoorten berg en buiten.md`, deel 6). Voorstel: dezelfde **0,5% per week** als fietsen (afgeleid, zwak), en alleen gebruiken voor een tempometer bij een tijdslimiet.

### Capaciteit

Capaciteit groeit veel sneller dan prestatie. De langste loop mag per stap 10% langer (`Opbouw hardlopen.md`, Frandsen e.a. 2025, matig), het weekvolume groeit verstandig met ongeveer 10% per week (meer dan 30% per twee weken ging bij beginners samen met meer blessures, Nielsen e.a. 2014, matig, zie `Doelsoorten duur.md`), de rugzak met 1 tot 2 kg per één tot twee weken (expert). Met hersteldagen en lichte weken erbij is dat effectief ongeveer **7% per week** voor afstand, duur en volume (afgeleid).

## 5. De vulling per soort meter

### De kromme

Voor elke meter: vulling = 10 / (10 + W), met W in weken. In woorden: 100% bij nul weken, 91% bij één week, 77% bij drie, 50% bij tien, 33% bij twintig, 25% bij dertig, 20% bij veertig. De kromme raakt nooit nul, zodat elke vooruitgang zichtbaar blijft, en hij is in het begin steil, zodat de laatste weken werk goed te zien zijn. De tien weken heet `HALF_WEEKS` (afgeleid; het is de lengte van een gangbaar blok, en het is ook het punt waar de lineaire capaciteitsmeters hun 50% hebben, zie hieronder).

### Capaciteit: de breuk blijft

Is de breuk best gedeeld door nodig eerlijk? Rekenen we capaciteit ook in weken werk (7% per week), dan:

- 8,6 van 10 km: W is ln(10/8,6) gedeeld door ln(1,07), ongeveer 2,2 weken, vulling 82%. De breuk zegt 86%.
- 5 van 10 km: ongeveer 10 weken, vulling 49%. De breuk zegt 50%.
- 3 van 10 km: ongeveer 18 weken, vulling 36%. De breuk zegt 30%.
- 12,6 van 22,5 km per week: ongeveer 8,6 weken, vulling 54%. De breuk zegt 56%.
- 9 van 14 kg rugzak: met ongeveer 0,7 kg per week ruim 7 weken, vulling ongeveer 58%. De breuk zegt 64%.

Tussen ongeveer 30% en 100% liggen breuk en werk binnen zes punten van elkaar. Het verschil tussen 3 en 8,6 van 10 km is in werk groot (18 tegen 2 weken), en de breuk laat dat al zien (30 tegen 86). Onder 30% is de breuk strenger dan het werk, en dat is verdedigbaar: zo'n grote sprong kost niet alleen tijd maar draagt ook meer blessurerisico (gedeelde regel 7 in `Doelsoorten duur.md`).

Advies: **voor capaciteit blijft de breuk**. Het grootste voordeel is dat de meter dan letterlijk zegt wat de balk toont: "8,6 van 10 km" is 86%. Een kromme zou daar een nieuwe tegenspraak maken ("8,6 van 10 km" bij een balk van 82%). Dit houdt ook de GR5 gelijk (deel 9).

### Prestatie: het gat in weken

Voor een meter waar lager beter is (een tijd):

W = ln(verwacht / doel) / -ln(1 - g)

Voor een meter waar hoger beter is (vermogen, geschat maximum):

W = ln(doel / nu) / ln(1 + g)

Is verwacht gelijk aan of sneller dan het doel (of nu gelijk aan of boven het doel), dan is W nul en de meter vol. De vulling is 10 / (10 + W). De constanten g, met bewijs:

- Hardlopen 5 km tot halve marathon: g is 0,0055 per week, de band 0,003 tot 0,008 blijft voor de haalbaarheidsregel (afgeleid uit Muñoz 2014, Nuuttila 2022, Daniels en parkrun; zwak tot matig).
- Marathon: geen meter, Riegel voorspelt die afstand niet ([Vickers en Vertosick 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5000509/), matig tot sterk).
- Fietsvermogen: 0,005 per week, band 0,003 tot 0,008 (zwak). Een doeltijd wordt eerst vermogen: op het vlakke de tijdverhouding tot de derde macht, in de bergen tot de eerste macht, gemengd tot de anderhalfde macht (afgeleid uit de natuurkunde, matig).
- Zwemmen: 0,0035 per week (zwak), pas als zwemmen een sport is.
- Kracht (geschat maximum met Epley, zoals KR-1): 0,01 beginner, 0,0025 gevorderd, 0,001 ervaren, of je eigen trend over 12 weken begrensd tussen 0,0005 en 0,015 (afgeleid, zwak).
- Wandeltempo bij een tijdslimiet: 0,005 per week (afgeleid, zwak).

Eén keuze over de meetruis: een 5 km-test varieert bij recreanten ongeveer 3,4% van keer tot keer (`Tussendoel hardloopwedstrijd.md`), en de voorspelling heeft een spreiding van 2,5% (`PREDICTION_SPREAD`). Advies: geen dode zone in het getal (100% blijft streng: verwacht gelijk aan of sneller dan het doel), wel de zin "binnen de meetruis van je test" als het gat kleiner is dan 2,5%. Een doel 2% sneller dan je verwachting geeft dan 73% met die zin erbij.

### Voorwaarde: de tempometer

Bij een tijdslimiet of cutoff: verwacht is je eigen tempo doorgetrokken naar het doel, de grens is de limiet maal (1 min marge). Is verwacht binnen de grens, dan 100%. Anders W en de kromme zoals bij prestatie, met de g van die sport. De marge is 10% voor een ultra of een bergdag (eten, posten, een slechte dag; afgeleid, expert) en 0% voor een wegwedstrijd met een sluitingstijd. De meter weegt zo zwaar als de andere meters van het doel.

## 6. Het voorbeeld doorgerekend

Een 10 km met doeltijd 45:00. Verwacht nu 55:40 (55,67 minuten) uit de testloop. Langste loop 8,6 van 10 km, weekvolume 12,6 van 22,5 km, 21 weken tot de wedstrijd.

**Snelheid.** Verwacht gedeeld door doel is 1,237, de natuurlijke logaritme daarvan is 0,2127. Bij 0,55% per week (een logaritme van 0,00552 per week) is W gelijk aan 38,6 weken. Vulling 10 / 48,6 is 0,21, dus **21%**. In gewone woorden: bij gemiddelde groei is 45:00 ongeveer 39 weken werk, en dat is bijna vier keer een gewoon blok.

**Langste loop.** 8,6 van 10 km, **86%** (de breuk blijft).

**Weekvolume.** 12,6 van 22,5 km, **56%**.

**Het getal.** 0,6 maal 0,21 plus 0,2 maal 0,86 plus 0,2 maal 0,56 is 0,124 plus 0,172 plus 0,112 is 0,408: **41%**. Met "Gelijk" in de instelling (alle drie even zwaar) is het **54%**.

**Hoe gevoelig is dat?** Met de snelle kant van de band (0,8% per week, iemand vroeg in zijn loopcarrière) is W 26,5 weken, snelheid 27% en het getal **45%**. Met de langzame kant (0,3%) is W 71 weken, snelheid 12% en het getal **36%**. Rekenen we ook de capaciteit in weken (deel 5), dan wordt het 40%. Het antwoord ligt dus tussen 36 en 45%, met 41% in het midden. De schatting van rond 40% klopt; ik zou hem niet bijstellen.

**Het meeste te winnen.** Gewogen gaten: snelheid 0,6 maal 0,79 is 0,48; weekvolume 0,2 maal 0,44 is 0,09; langste loop 0,2 maal 0,14 is 0,03. Dus: "Hier is nog het meeste te winnen: snelheid." Nu zegt de kaart "weekvolume".

**De haalbaarheid.** Bij gemiddelde groei word je in 21 weken ongeveer 11% sneller, van 55:40 naar ongeveer 49:35. De band van `raceDayBand` blijft 47 tot 54 minuten. 45:00 ligt eronder: er is nog ongeveer 39 weken werk en er zijn er 21. De kaart zou dan zeggen:

- vet: "Verwacht nu 55:40. Doel 45:00: nog 10:40, ongeveer 1:04 per km."
- gedimd: "Bij gemiddelde groei rond 20 maart: 47 tot 54 minuten. 45:00 vraagt ongeveer 39 weken; tot 20 maart zijn het er 21."
- het getal 41%, de meters Snelheid 21% ("55:40, doel 45:00, ongeveer 39 weken werk"), Langste loop 86%, Weekvolume 56%, en "Hier is nog het meeste te winnen: snelheid."

Getal, meter en zinnen zeggen nu hetzelfde: een groot gat in tijd, bijna klaar met de afstand, half met het volume.

**Op de wedstrijddag**, als de groei gemiddeld is: snelheid nog 17,6 weken werk, dus 36%. Volume en langste loop zijn dan vermoedelijk vol, en het getal komt rond 62%. Dat is een eerlijk beeld van iemand die zich goed voorbereidde maar een doel koos dat meer vraagt dan één voorbereiding.

## 7. Per doelsoort

Steeds: welke meters (met de ids uit `goalKinds.ts`), welke weging, en wat er verandert met of zonder tijd, gewicht of cutoff.

### Meerdaagse tocht met hutten (`trek_hut`), de GR5

Volbrengen. Meters `rugzak`, `langsteDag`, `hoogte`, `dagen`, even zwaar, als breuk. Geen tijd. Ongewijzigd (deel 9). Met een tijdslimiet per dag (bijvoorbeeld een etappeplan dat binnen 8 uur moet, of een sluitingstijd van een hut): een extra meter `tempo` (voorwaarde, zie de dagtocht), alleen als de gebruiker een limiet invult.

### Meerdaagse tocht met tent (`trek_tent`)

Zoals de huttentocht, met de bestaande grens van drie dagen achter elkaar. De rugzak is hier vaker de laagste meter; dat zegt de zin al. Geen prestatie.

### Bergtocht of dagtocht (`day_hike`)

Volbrengen. Meters `langsteDag`, `hoogte`, `rugzak` (vanaf 5 kg), `afdalenVers`, even zwaar, met het dagaandeel. `expectedMinutes` blijft een verwachting om de eis te schatten, geen doel.

Met een tijdslimiet (laatste lift, laatste bus, "voor het onweer van de middag terug"): nieuw veld `timeLimitMinutes` en meter `tempo` (voorwaarde). Verwacht is de DIN-tijd van de dag maal jouw eigen factor (de mediaan van jouw tijd gedeeld door de DIN-tijd op wandelingen van minstens anderhalf uur in de laatste acht weken, minstens drie wandelingen; dit "eigen tempo leren" stelde `Doelsoorten berg en buiten.md` 2.1 al voor). Grens: de limiet min 10%. Rekenvoorbeeld: een dag van 6 uur DIN-tijd, jouw factor 1,15, dus verwacht 6:54; limiet 7:00, grens 6:18; W is ln(6,9 / 6,3) gedeeld door 0,005, ongeveer 18 weken; tempo 36%. Zonder drie wandelingen: geen tempometer, wel de regel "Na drie lange wandelingen kan ASCEND je tempo schatten."

### Hoge bergtocht (`mountaineering`)

Volbrengen, met de bestaande vijf meters en de vaste verwijzing naar cursus of berggids. Een keertijd (het moment waarop je hoe dan ook omdraait) is een voorwaarde in de vorm van de tempometer, maar ik raad af om hem te bouwen: op hoogte en op een gletsjer bepalen weer, route en acclimatisatie het tempo, en dat is werk van een gids (`Doelsoorten berg en buiten.md` deel 6). Er komt geen tempometer; de zin "Dit meet je benen en je uithouding, niet je ervaring op hoogte" blijft.

### Hardloopwedstrijd zonder doeltijd (`run_race`)

Volbrengen. Meters `langsteLoop` en `weekvolume`, even zwaar, als breuk. `volhouden` telt op de Ascend-tab niet mee zolang hij daar niet gevuld wordt (zoals nu). Voor het voorbeeld zonder doeltijd: (86 plus 56) gedeeld door 2 is **71%**. Dat is logisch: je kunt de afstand bijna lopen en je volume is half.

### Hardloopwedstrijd met doeltijd, 5 km, 10 km en halve marathon

Prestatie. Meters `verwachteTijd` (Snelheid, de nieuwe vulling uit deel 5), `langsteLoop`, `weekvolume`, gewogen 60/20/20. Bron van de verwachte tijd blijft `countedTests` en `racePaces` (Riegel uit de test). Per afstand verandert alleen de streefwaarde van de capaciteitsmeters (al in `goalKinds.ts`) en W (een gat van 5% is op elke afstand ongeveer 9 weken).

Een open vraag is of de weging per afstand moet schuiven (bij 5 km beslist snelheid nog meer, bij een halve marathon telt uithouding zwaarder). Advies: één constante houden tot er reden is om te schuiven; de verdeling tussen afstanden is niet onderzocht.

### Hardloopwedstrijd met doeltijd, marathon

Riegel onderschat de marathon bij recreanten sterk (Vickers en Vertosick 2016, matig tot sterk). Geen snelheidsmeter, wel de regel "Voor de marathon voorspelt ASCEND geen tijd." De meters `langsteLoop` (30 km) en `weekvolume` (30 km per week) blijven. Later mogelijk: het model van Vickers en Vertosick met twee wedstrijden of met het weekvolume, maar niet nu.

### Trailrun kort (`trail`, variant kort)

Zonder doeltijd: volbrengen, de bestaande meters `langsteInspanning`, `weekuren`, `stijgen`, `dalen` (vers), even zwaar.

Met een doeltijd: prestatie, een snelheidsmeter op inspanningskilometers. Inspanningskilometers zijn kilometers plus het stijgen gedeeld door 100 (de vuistregel van ITRA, expert, niet nagelezen). Jouw tempo per inspanningskilometer komt uit je beste loop of bergwandeling van minstens anderhalf uur in de laatste acht weken, doorgetrokken naar de wedstrijd met een Riegel-exponent van 1,06 tot drie uur (Vickers, matig) en 1,15 daarboven (afgeleid, zwak). Wegen 60/40 zoals op de weg. Bewijs: zwak; de zin zegt dat ("Een schatting uit je eigen lange lopen, minder zeker dan een testloop.").

### Trailrun ultra, met en zonder cutoff

Zonder cutoff: volbrengen, de bestaande meters `langsteInspanning`, `weekuren`, `stijgen`, `dalen`, `dagenOpRij`.

Met cutoff: voorwaarde, een meter `tempo` erbij met dezelfde schatting als de korte trail en een marge van 10%. Nieuw veld `cutoffMinutes`. Rekenvoorbeeld: 50 km met 2.500 m omhoog is 75 inspanningskilometers; je langste loop was 25 km met 1.000 m (35 inspanningskilometers) in 4:30, dus 7,7 minuten per inspanningskilometer; doorgetrokken met 1,15 wordt dat ongeveer 10:49. Cutoff 11:00, grens met marge 9:54; W is ongeveer 16 weken, tempo 39%. Zonder marge zou de meter vol zijn; de marge is dus een echte keuze (zie open keuzes).

### Fietsen (`bike`)

- **Tocht en cols** zonder tijd: volbrengen, `langsteRit`, `weekvolume`, `klimmen` (cols), even zwaar.
- **Reis**: volbrengen, `langsteRit`, `dagenOpRij`, `bagage`.
- **Wedstrijd of tocht met een doeltijd of doelsnelheid**: prestatie, maar alleen met vermogensgegevens. Nu staat er geen drempelvermogen in ASCEND (alleen vermogensreeksen in `activityStreams`). Bron zou het drempelvermogen uit de sportinstellingen van intervals.icu zijn, waar ASCEND de drempelhartslag al leest. De verwachte tijd vraagt dan een fietsmodel met gewicht, luchtweerstand en profiel; dat is te veel schijnprecisie voor deze ronde. Advies: geen snelheidsmeter bouwen, wel de regel "Voor een fietstijd heeft ASCEND je vermogen nodig; dat volgt later." Komt hij later: W op vermogen met de omrekening uit deel 4 (vlak tot de derde macht). Rekenvoorbeeld voor later: 100 km vlak van 3:30 naar 3:15 is 25% meer vermogen, W ongeveer 45 weken, snelheid 18%.

### Triathlon (`triathlon`)

Zonder doeltijd: volbrengen met de bestaande meters (zwemmen nog niet meetbaar). Met doeltijd: geen snelheidsmeter. Een totaaltijd vraagt drie voorspellingen (zwemmen uit een test, fietsen uit vermogen, lopen na het fietsen), en twee daarvan heeft ASCEND niet. De regel: "Voor een triatlon voorspelt ASCEND nog geen tijd." Pas als zwemmen een sport is en fietsvermogen gelezen wordt, kan een meter per onderdeel komen, met W per onderdeel en de onderdelen gewogen naar hun aandeel in de verwachte totaaltijd (afgeleid).

### Sterker worden (`stronger`)

Prestatie. De meter `krachttrend` wordt het gat in weken per hoofdoefening: W is ln(doel e1RM gedeeld door nu e1RM) gedeeld door ln(1 plus g), met g per niveau of je eigen trend, en de vulling van de meter is het gemiddelde van de oefeningen (zoals de delen van een meter nu al middelen). Nu e1RM is je beste set van de laatste vier weken (KR-2), sets met een aangenomen RIR tellen niet (`SetLog.rirAssumed`). Het beginpunt valt weg.

Weging: krachttrend 60%, `hardeSets` 40%, `volhouden` alleen als hij gevuld wordt (zie open keuzes). Rekenvoorbeeld: squat-doel 100 kg voor 5 (e1RM ongeveer 117), nu 90 kg voor 5 (e1RM 105). Beginner (1% per week): ongeveer 11 weken, 49%. Gevorderd (0,25%): ongeveer 42 weken, 19%. Ervaren (0,1%): ongeveer 105 weken, 9%. De zin blijft "nog 10 kg voor 5 herhalingen" en nooit "je max is".

Een doel in herhalingen met eigen lichaamsgewicht (10 optrekken): zolang het lichaamsgewicht niet in de som zit, een breuk van herhalingen als capaciteit (afgeleid). Geen omrekening tussen oefeningen.

### Fit blijven (`fit`)

Volbrengen tegen de richtlijn. `minutenPerWeek` en `krachtdagen` als breuk, geen prestatie. Ongewijzigd. Dit is de enige doelsoort waar 100% van buiten komt (WHO 2020, sterk).

### Combinaties

Ongewijzigd: het laagste onderdeel, met de naam erbij (`computeComboReadiness`). Binnen elk onderdeel gelden de regels hierboven.

## 8. De haalbaarheidsregel en "het doel blijft het doel"

De regel staat onder het getal, als droog feit, en leest dezelfde W als de meter. Drie standen, steeds met het getal van weken:

- Het doel valt binnen gemiddelde groei (W bij 0,55% is hoogstens het aantal weken tot de doeldag), voorbeeld doeltijd 54:00: "Bij gemiddelde groei rond 20 maart: 47 tot 54 minuten, je doel valt erbinnen." Ligt het doel boven de band, dan blijft "je doel ligt erboven".
- Het doel vraagt meer dan gemiddelde groei maar valt binnen snelle groei, voorbeeld doeltijd 47:45: "Bij gemiddelde groei rond 20 maart: 47 tot 54 minuten. 47:45 vraagt ongeveer 28 weken; tot 20 maart zijn het er 21."
- Het doel ligt ook buiten snelle groei of boven de 15% die in één voorbereiding gebruikelijk is: dezelfde zin, met de weken. De app gebruikt geen woorden als ambitieus, onhaalbaar of realistisch.

Per prestatiesoort:

- **Hardlopen tot en met de halve marathon**: ja, met `raceDayBand` en W, zoals hierboven.
- **Marathon**: nee, want er is geen voorspelling.
- **Trail met doeltijd of cutoff**: alleen het feit van nu ("Je lange lopen passen bij ongeveer 10:49; de cutoff is 11:00."), geen groei tot de doeldag. De groei op een ultra is niet onderzocht en de schatting is al zwak; er nog een groeiband op zetten is schijnzekerheid.
- **Tijdslimiet bij een tocht of dagtocht**: idem, alleen het feit van nu.
- **Fietsen en triathlon**: nee, zolang er geen snelheidsmeter is.
- **Kracht**: een doel zonder datum. De regel noemt weken: "Bij je eigen tempo van de laatste 12 weken: ongeveer 11 weken." Met een datum ook de vergelijking met de weken die resten. Krachtwinst vertraagt; de zin zegt "ongeveer" en de band is breed (afgeleid).
- **Volbrengen** (capaciteit): niet nodig op de kaart. De opbouw van de planning brengt je erheen, en `feasibility.ts` zegt het al als iets niet past.

**Het doel blijft het doel.** Niets in deze berekening past het doel aan, schaalt het naar een "haalbaar" doel of verbergt het. Het getal is laag als het gat groot is, en dat is het hele punt. Een ander doel komt alleen uit een voorstel met Akkoord (TARGET-TIME, met de regels van `2026-10-28-klaar-voor-je-doel-snelheid.md` en de aanvulling), en Liever niet laat het zo.

## 9. De GR5

**Niet veranderen:** de vier meters (`rugzak`, `langsteDag`, `hoogte`, `dagen`), de breuk, de grens van twee dagen achter elkaar, het venster van 56 dagen, de zin, het gemiddelde zonder weging, en de bevroren uitkomsten in `goalReadiness.test.ts`. De GR5 is volbrengen: er is geen tijd, en de vier meters zijn capaciteit, waar de breuk binnen een paar punten van het werk ligt (deel 5). De nieuwe regel voor "het meeste te winnen" (P6) geeft bij gelijke gewichten precies de laagste meter, dus ook die verandert niet.

**Wel overwegen, later:** een tempometer als de eigenaar per dag een tijd wil halen (een etappeplan met bivakplekken die je voor het donker moet bereiken). Alleen als voorwaarde, alleen met een ingevulde limiet, en buiten de vier bestaande meters, zodat het getal van wie geen limiet invult gelijk blijft. Mijn advies is om dat pas te doen als de eigenaar er zelf om vraagt; op de GR5 bepaalt de rugzak en het aantal dagen achter elkaar het meest (`Trainingswetenschap.md`, knelpunt 8).

## 10. Bouwplan

1. **Gegevens.** `data/goalGrowth.ts`: de groeisnelheden per sport en niveau, `HALF_WEEKS` (10), de marge voor een voorwaarde (10%), elk met bewijslabel en bron, zoals `goalKinds.ts`. Geen gedrag.
2. **Pure functies.** `engine/goalGap.ts`: `weeksOfWork({ now, need, lowerIsBetter, weeklyGain })`, `fillFromWeeks(weeks)`, `weightedGapWeakest(meters, weights)`. Tests:
   - 55:40 tegen 45:00 bij 0,0055: W 38,6, vulling 0,21.
   - doel 2% sneller: W 3,7, vulling 0,73. Doel 5% sneller: W 9,3, vulling 0,52.
   - verwacht 64:17 tegen 45:00 (30% trager): W 64,7, vulling 0,13.
   - doel gelijk of trager dan verwacht: W 0, vulling 1.
   - kracht 105 naar 117 e1RM: beginner W 10,6 en vulling 0,49; gevorderd W 42 en 0,19.
   - weightedGapWeakest bij gelijke gewichten geeft altijd de laagste meter (eigenschapstest over willekeurige meters).
3. **Hardloopwedstrijd.** In `raceReadiness.ts#speedAt` de vulling uit `goalGap` in plaats van doel gedeeld door verwacht; de metertekst "55:40, doel 45:00, ongeveer 39 weken werk"; de haalbaarheidsregel met W; "het meeste te winnen" uit het gewogen gat. Tests:
   - het voorbeeld: snelheid 21%, getal 41%, het meeste te winnen "snelheid", regel met "ongeveer 39 weken; tot 20 maart zijn het er 21".
   - hetzelfde met "Gelijk": 54%.
   - doeltijd 54:00: snelheid 64%, getal 67%, "je doel valt erbinnen".
   - doeltijd 56:00: snelheid 100%, getal 88%, het meeste te winnen "weekvolume".
   - geen doeltijd: 71%, geen snelheidsmeter.
   - geen test of een test die wacht: de bestaande regels, en de keuze uit de open vragen.
   - marathon met doeltijd: geen snelheidsmeter, de regel over de marathon.
   - `planGolden.test.ts` en de GR5-uitkomsten veranderen niet.
4. **De algemene regel voor het meeste te winnen** in `goalReadiness.ts#compute` (gewogen gat). De bevroren GR5-test is de poort.
5. **Sterker worden.** `krachttrend` als gat in weken per oefening, niveau uit de krachtgeschiedenis per oefening of je eigen trend. Tests met de drie niveaus en met een eigen trend.
6. **Voorwaarden.** Velden `timeLimitMinutes` en `cutoffMinutes` op `GoalDetails` (optioneel, defensief gelezen, een migratiestap in `storage/migrations.ts` en de back-upvalidatie), de meter `tempo` voor dagtocht, tochten en trail, en het eigen DIN-tempo. Tests: het dagtochtvoorbeeld (tempo 36%), het ultravoorbeeld (39%, en 100% zonder marge), minder dan drie wandelingen geeft de regel in plaats van een meter.
7. **Instellingen** (volgens "alles instelbaar"): "Groei bij het rekenen" (Gemiddeld als advies, Voorzichtig met de langzame kant, Mijn eigen tempo zodra er twee tests van minstens zes weken uit elkaar zijn), en "Marge bij een tijdslimiet" (10% als advies). Elk in `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts`, `settingsHelp.ts`. De bestaande "Klaar voor je doel bij een doeltijd" blijft.
8. **Een besluit** in `docs/beslissingen/` (niet door Scout) dat het besluit van 28 oktober aanvult: snelheid als gat in weken in plaats van een tijdsverhouding.

Fietsen en triathlon met een doeltijd komen pas als ASCEND vermogen leest en zwemmen kent.

## 11. Wat het onderzoek zegt

- Prestatie groeit traag: recreatieve lopers winnen ongeveer 0,35 tot 0,5% per week op 5 en 10 km (zwak tot matig), beginners meer (parkrun, matig voor het verschil). Fietsvermogen groeit ongeveer even traag bij wie al fietst (zwak). Kracht groeit in de eerste maanden snel (1 tot 3% per week, matig), daarna veel langzamer (0,2% per week of minder bij krachtsporters, matig).
- Capaciteit groeit ongeveer tien keer zo snel: 10% per stap voor de langste loop is de onderbouwde grens (Frandsen, matig), en met herstel ongeveer 7% per week (afgeleid).
- Daarom betekent dezelfde breuk bij prestatie veel meer werk dan bij capaciteit. Een tijdsverhouding als meter is te gul; een breuk als capaciteitsmeter is redelijk eerlijk.
- Hoe snel iemand groeit, verschilt enorm tussen mensen (HERITAGE: van bijna niets tot meer dan 40% in 20 weken, sterk voor de spreiding). Elk groeigetal is dus een gemiddelde met een brede band, geen voorspelling voor jou.
- Riegel werkt tot en met de halve marathon en niet voor de marathon (matig tot sterk). Voor trail, ultra, fietsen, zwemmen en wandeltempo is er geen gevalideerde voorspeller van de tijd uit trainingsgegevens.

## 12. Wat het betekent voor de app

- Eén getal per doel blijft, maar elke meter rekent in dezelfde munt: weken werk. 50% betekent overal ongeveer tien weken werk.
- Bij een 10 km met doeltijd 45:00 en de huidige stand toont de kaart 41% met "het meeste te winnen: snelheid", en de haalbaarheidsregel noemt de 39 weken naast de 21 die er zijn. Geen tegenspraak meer.
- Capaciteitsmeters, de GR5, fit blijven en de tochten blijven zoals ze zijn.
- De krachtmeter van Sterker worden verliest zijn beginpunt en meet het gat.
- Nieuwe velden alleen voor voorwaarden (tijdslimiet, cutoff), met een migratiestap.
- Fietsen en triathlon met een doeltijd krijgen een eerlijke regel in plaats van een meter.
- Het doel verandert nooit stil. Bij pijn of klachten hoort een arts of fysiotherapeut, niet een ander getal.

## 13. Wat nog onzeker is

- **De tien weken van de kromme** zijn een keuze (afgeleid). Ze sluiten aan op de lengte van een gangbaar blok en op waar de capaciteitsbreuk 50% is, maar ze zijn niet getoetst op hoe mensen het getal lezen.
- **De groeisnelheden** komen uit kleine studies, samenvattingen en coachpraktijk. Het midden van 0,55% per week voor hardlopen is redelijk onderbouwd; fietsen, zwemmen, wandeltempo en kracht na het eerste jaar zijn zwak. De periode van de parkrunwinst heb ik niet gevonden. Het ACSM-getal over krachtwinst per niveau kon ik niet nalezen.
- **Groei is niet constant**: hij vertraagt naarmate je dichter bij je eigen plafond komt. Een vast getal per week overschat de winst over lange perioden een beetje en onderschat hem voor wie net begint. Je eigen tempo uit twee of meer tests is beter zodra het er is.
- **De capaciteitsgroei van 7% per week** is afgeleid uit de 10%-regel met herstel; de 10% per week voor volume is een vuistregel, geen meting.
- **Trail en ultra**: de inspanningskilometers (ITRA) en een Riegel-exponent van 1,15 boven drie uur zijn vuistregels; de marge van 10% bij een cutoff is een keuze.
- **De weging 60/20/20** blijft afgeleid; per afstand is ze niet onderzocht.
- **Wat ik niet nalas**: de volledige teksten van Muñoz 2014, de Kaapstadse scriptie, Stevinson en Hickson 2014, Latella 2020, de fietsstudie van 2025, de HERITAGE-cijfers (alleen secundair), Milanović 2015 en Martin 1998.

## Open keuzes voor de eigenaar

1. **De kromme**: 50% bij tien weken werk (advies), of strenger (bijvoorbeeld zes weken, dan zakt het voorbeeld naar ongeveer 34%) of milder.
2. **Gemiddelde groei**: één vast midden van 0,55% per week (advies), de langzame kant (voorzichtiger, het voorbeeld wordt 36%), of je eigen tempo zodra er twee tests zijn.
3. **Zonder testloop bij een doeltijd**: zoals nu (het getal uit langste loop en volume, met de regel "Nog geen testloop"), of geen getal tot de eerste test, omdat dan 60% van de betekenis ontbreekt. Ik neig naar het tweede, maar het is een keuze over hoe de kaart voelt.
4. **Capaciteit**: de breuk houden (advies) of ook in weken rekenen. Het verschil is een paar punten; de breuk laat de balk en "8,6 van 10 km" hetzelfde zeggen.
5. **Marge bij een cutoff of tijdslimiet**: 10% (advies) of geen.
6. **Volhouden bij Sterker worden en Fit blijven**: laten meetellen als hij gevuld is, of overal op 0 zetten zoals bij de wedstrijd.
7. **Een tempometer voor de GR5** bij een tijdslimiet per dag: alleen op jouw verzoek.

## Bronnen

Nieuw in dit stuk:

- Muñoz e.a. 2014, gepolariseerd en drempel bij recreatieve 10 km-lopers: https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2019.00070/full en https://www.researchgate.net/publication/237096628_Does_Polarized_Training_Improve_Performance_in_Recreational_Runners
- Intervallen en taper op de 10 km, Universiteit van Kaapstad: https://open.uct.ac.za/bitstreams/e3679b56-b02f-410d-96d5-e155ea022c31/download
- Stevinson en Hickson 2014, parkrun en 5 km-prestatie: https://academic.oup.com/jpubhealth/article/36/2/268/1548895
- Ralston e.a. 2018, trainingsfrequentie en krachtwinst: https://pmc.ncbi.nlm.nih.gov/articles/PMC6081873/
- Latella e.a. 2020, krachtwinst bij powerlifters over 15 jaar: https://acuresearchbank.acu.edu.au/item/88470/long-term-strength-adaptation-a-15-year-analysis-of-powerlifting-athletes
- Rhea 2003, dosis en respons voor kracht: https://pubmed.ncbi.nlm.nih.gov/12618576/
- Amateur-wegrenners, FTP na 8 weken (2025): https://www.sponet.de/sponet/Record/4097155?lng=en
- Bouchard e.a. 2001, HERITAGE en trainbaarheid: https://www.Gwern.net/doc/genetics/heritable/2001-bouchard.pdf, het gemiddelde via https://www.greaterwrong.com/posts/ka8eveZpT7hXLhRTM/procedural-knowledge-gaps/comment/9Tyimpg9WhCKMGjCB
- SIT tegen HIIT voor tijdritprestatie, meta-analyse: https://lida.sport-iat.de/ta/Record/4050847
- Recreatieve triatleten, 400 m zwemmen na 8 weken: https://real.mtak.hu/153000/1/2677-0164-article-p427.pdf

Al in eerdere rapporten, hier opnieuw gebruikt: Vickers en Vertosick 2016 (https://pmc.ncbi.nlm.nih.gov/articles/PMC5000509/), Nuuttila e.a. 2022 (https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/), Daniels via https://www.coachray.nz/2023/05/03/jack-daniels-running-intensity/, Frandsen e.a. 2025 en Nielsen e.a. 2014 (zie `Opbouw hardlopen.md` en `Doelsoorten duur.md`).
