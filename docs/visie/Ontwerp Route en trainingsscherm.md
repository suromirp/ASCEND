# Ontwerp: Route en het trainingsscherm

Status: voorstel van Cartographer, 11 november. Er is geen code gewijzigd.

Aanleiding, de eigenaar op 11 november, nadat de kaart live ging: hij vindt de plek van Route voorstellen niet goed, "dat hele infomenu is niet wat ik ervan wil", en Route voorstellen moet volgens hem gewoon op het homescherm staan en ook meteen als je de training openklikt. "Het is iets wat je sowieso gebruikt, en makkelijk in een overzicht wil, en niet pas als je helemaal doorklikt."

Gelezen: CLAUDE.md, `docs/architectuur/ontwerp-en-tokens.md`, `docs/werkbriefjes/bediening-en-beweging.md`, de stemgids, `docs/visie/Ontwerp Info-blad.md`, de besluiten van 11 november over de kaart, het verfijnen, de locatie en De avond ervoor, de besluiten met "Niets op Vandaag" (9 november datavelden, 11 november spoor 2), de tekstkaarten `vandaag` en `training-blad`, `docs/visie/Kansen 11 november app.md`, en de code van `TodayMissionCard`, `ExerciseLogger`, `TrainingGuideSheet`, `guideMenu`, `RoutePanel`, `RouteProposalLine`, `engine/routeTarget.ts` en `engine/eveningBefore.ts`.

Niet gelezen: `2026-11-11-route-kaart-2.md`. Dat besluit staat op de branch `origin/claude/route-kaart-2` en niet in deze werkmap. Ik ga uit van wat de backlog en de opdracht erover zeggen: de standaard voor het startpunt wordt Waar je nu bent, er komt een laadtoestand, en de tweede lus wordt beter zichtbaar.

De hoogtes in dit stuk zijn geschat uit de code, niet gemeten op een toestel, behalve waar staat dat het uit de screenshot van de eigenaar komt. Lookout meet ze na bij elk spoor.

## 1. Wat er nu is

### De ingangen naar Route voorstellen

Er zijn drie ingangen, in drie verschillende vormen, en alleen voor een looptraining (`wantsRoute`: hardlopen, geen kracht).

- Vandaag, de missiekaart: een gedempte tekstknop "Route voorstellen" tussen de regel over heuvels en het kledingadvies. Hij opent een blad. Het is een grijze regel tussen vier andere grijze regels; de eigenaar vraagt om Route op het homescherm terwijl hij er al staat, en dat zegt genoeg over hoe zichtbaar hij is.
- Het trainingsscherm (`ExerciseLogger`): een uitklaprij in de kaart met Eerst opwarmen en Daarna rekken. Het paneel klapt op zijn plek open, met de kaart erin.
- Het blad Uitleg (`TrainingGuideSheet`): weer een gedempte tekstknop, onder de weerregel, die op zijn plek openklapt. Op het trainingsscherm kun je dus twee keer bij hetzelfde paneel komen: via de rij en via de i.

Wat geen ingang is: de kaart De avond ervoor zegt "Route 5,5 km: vraag een lus op bij de training." maar je kunt er niet op tikken. In Week heeft het blad van een training geen routerij. Is de training van vandaag gedaan, of is het een rustdag, dan is er op Vandaag geen ingang.

### Tikken en scrollen van Vandaag tot een lus

- Kortste weg: op Vandaag de tekstknop op de missiekaart, één tik. De knop staat naar schatting tussen 600 en 750 px van boven (lucht, ochtendkaart, kop, titel, getallen, zonebalk, coachregel, weer, heuvels), dus op of net onder de vouw. In het blad staan eerst twee alinea's tekst en dan pas de kaart.
- De eerste keer komt daar de vraag bij (Precies of Ongeveer, twee blokken kleine tekst), en bij Precies zonder punt nog een tik op Gebruik waar ik nu ben.
- Via het trainingsscherm vanaf Vandaag: Gedaan (één tik), dan sta je bij het formulier en scrol je terug omhoog naar de rij, tik op de rij (twee), en scrol je weer omlaag naar de kaart.
- Via Week: de training (één), Hoe je het doet (twee), scrollen voorbij drie kaarten, de rij (drie), en weer scrollen.
- Via Uitleg vanaf Vandaag: de drie puntjes (één), Meer over deze training (twee), Route voorstellen (drie).

### Het trainingsscherm boven de vouw op 390 px

Gemeten uit de screenshot van de eigenaar (Android-app, 390 px, live versie zonder Route-kaart 2):

- Onderaan de kaart Waar train je? staan de keuzes Buiten (gekozen, Beste keuze), Loopband (Ook goed) en Hardlopen en wandelen afgewisseld (Als het niet anders kan), met daaronder "Continu rustig lopen. Meer".
- Daarna een tweede kaart met Eerst opwarmen (8 oefeningen), Daarna rekken (4 oefeningen) en de uitklaprij Route voorstellen ("Twee lussen voor deze training").
- Na het uitklappen: "Je training: 5,5 km. De lus begint bij je startpunt." en de kaart, die onderaan wordt afgesneden door de vaste balk met Horloge en Gedaan, invullen.

De route staat dus pas na twee kaarten en een uitklap, en ook dan valt de kaart half achter de onderbalk.

Geschat uit de code, van boven naar beneden: de lucht met terugknop, kopje, naam, doelzin en datum (ongeveer 170 px), de kaart met kerngetallen en zone (ongeveer 190 px), Zo doe je het (110 px bij één blok, rond 300 px bij intervallen), Waar train je? (ongeveer 260 px). De onderbalk neemt ongeveer 76 px. Boven de vouw staan dus de kop, de getallen, de stappen en het begin van Waar train je?. De rij Route voorstellen begint rond 880 px, bijna 200 px onder de rand, en de kaart zelf rond 1000 px.

De oorzaak van de afgesneden kaart: de kaart is ongeveer vierkant en tot 58 procent van de schermhoogte, en staat in een pagina die scrolt onder een vaste balk. Zolang het paneel op zijn plek openklapt past de kaart nooit schoon in beeld.

### Wat dubbel of overbodig is

In het blad Uitleg, sinds spoor 1 en 2 van het Info-blad:

- Weer, heuvels, route en kleding staan er nog, en ook op de missiekaart. De route staat er dus op drie plekken.
- Je tempo en Zo voelt elk tempo staan er nog; elke stap op het trainingsscherm zegt hetzelfde.
- De rij De stappen opent een onderblad met dezelfde stappen als Zo doe je het, vanaf het scherm waar die stappen al staan.
- Drie groepskoppen (Wat je doet, Waar en waarmee, Achtergrond) voor hoogstens zes rijen.
- Een knop Sluiten onderaan, naast het kruisje, de greep en de terugknop.

In de namen:

- De rij in het menu op Vandaag heet "Meer over deze training", en het rondje met drie puntjes wordt ook zo voorgelezen. Twee dingen, één naam.
- Het i-knopje in Week heet "Meer over deze training", dat op het trainingsscherm "Uitleg bij deze training", de knop onderaan "Uitleg", de onderbladen hebben het kopje "Uitleg".
- "Hoe je het doet" in Week opent het trainingsscherm, niet de uitleg.
- De eigenaar zegt zelf "infomenu" en "infoscherm". Zijn screenshot met Horloge en Sluiten is het trainingsscherm in de leesstand. Wat hij het infoscherm noemt is dus waarschijnlijk het trainingsscherm, niet alleen het blad achter de i.

Op het trainingsscherm:

- De knop Uitleg onderaan (als er geen horlogeblad is) doet hetzelfde als de i bovenaan.
- Waar train je? neemt een derde van het scherm voor een keuze die al goed staat.
- Wat je regelt voordat je vertrekt (route, kleding, horloge, straks eten onderweg) staat verspreid of onderaan, onder wat je pas ter plekke nodig hebt.

### Eerlijk over spoor 1 en 2

Spoor 1 en 2 losten één klacht op: het horloge heeft een eigen blad en een knop. Verder werd het niet beter. Het blad Uitleg is alleen drie rijen korter, de dubbelingen staan er nog, de namen zijn nog vier verschillende, en het trainingsscherm kreeg er een knop bij zonder dat de volgorde veranderde. Mijn eerdere ontwerp behandelde het blad als het probleem. De klacht van nu laat zien dat het scherm eronder het probleem is: daar kijkt de eigenaar voor hij vertrekt, en daar staat het nuttige onderaan.

## 2. De locatie, twee keer kort

De plek in de app: dat is waar dit stuk over gaat.

De plek op de kaart (GPS): de eerste proef begon niet bij de eigenaar omdat het startpunt op Ongeveer stond. Route-kaart 2 maakt Waar je nu bent de standaard en geeft een laadtoestand. Wat dit ontwerp daaraan toevoegt: de routerij zegt al voor de tik waar de lus begint ("vanaf waar je nu bent" of "vanaf je startpunt"), zodat je een verkeerd startpunt ziet voordat je zoekt. De vraag om je plek komt pas bij de eerste tik op de rij, nooit bij het openen van de app. Er komt nergens een echte plek in de repo of in een tekst.

## 3. Route: drie richtingen

Voor alle drie geldt één verandering vooraf, omdat de afgesneden kaart anders blijft: het paneel klapt nergens meer op zijn plek open. Route is altijd het blad dat op Vandaag al bestaat (`RouteSheet`), met de kaart bovenaan. Een blad ligt over de onderbalk heen, dus er valt niets meer achter.

Het blad Route, voor alle richtingen (390 px, het blad is hoogstens ongeveer 700 px hoog):

```
[ greep ]
LANGE DUURLOOP                             X
Route
5,5 km vanaf waar je nu bent.            (i)
+--------------------------------------------+
|                                            |
|   kaart, ongeveer vierkant (358 px)        |
|   gekozen lus in mint, andere gestreept    |
|   (o) je plek          [mijn plek] [alles] |
+--------------------------------------------+
AVONTUURLIJK
6,2 km lus langs 2 hellingen
40 m stijgen, vooral onverhard
[ Naar Garmin Connect ]   GPX downloaden
------------------------------- vouw ---------
SIMPEL
5,6 km, dezelfde helling op en af
...
Zo zet je hem op je horloge              v
Kaartgegevens van OpenStreetMap ...
```

Boven de vouw: de kop, één regel met de training en het startpunt, de hele kaart en de gekozen lus met zijn knop. De lange zinnen over wat er de deur uit gaat en hoe Start hier werkt gaan achter de i naast die ene regel (de stemgids: de uitkomst op het scherm, de reden achter de i). De meldingen over te kort of te weinig hoogte blijven bij de lus op het scherm staan; een waarschuwing wordt nooit weggestopt.

Eén mint accent: de gekozen lus op de kaart en de knop van die lus. De knop blijft een `TextButton` zoals nu; er komt geen gevulde knop bij.

### Richting 1: een routerij op de missiekaart, zoeken na een tik

De gedempte tekstknop op de missiekaart wordt een echte rij, in dezelfde vorm als Eerst opwarmen (`RouteProposalLine` met `row`, die vorm bestaat al). De rij staat direct boven de knop Gedaan en zegt het feit al voor de tik.

Vandaag op 390 px:

```
[ lucht met bergen, datum, week            ]
[ ochtendkaart, ingeklapt                  ]
+--------------------------------------------+
| (o) VANDAAG · HARDLOPEN              (...) |
| Lange duurloop                             |
| 50          5,5 km                         |
| minuten                                    |
| zonebalk  Zone 2. Praten kan.              |
| | coachregel                               |
| Zon, 9 graden. Lange mouw en lange tight.  |
|--------------------------------------------|
| (lopen) Route                            > |
|         5,5 km vanaf waar je nu bent       |
| (rekken) Eerst opwarmen                  > |
|         8 oefeningen                       |
| [ v Gedaan                               ] |
| [ Verplaatsen ]  [ Niet fit? ]             |
+--------------------------------------------+
```

Boven de vouw: de missie, de getallen, de zone, en naar schatting ook de routerij. De rij is 56 px hoog en vervangt een tekstknop van 44 px, dus de knop Gedaan zakt 12 px.

De regel onder Route:

- Nog niet gezocht: "5,5 km vanaf waar je nu bent", of met hoogte "8 km, 120 hoogtemeters, vanaf je startpunt". Dat komt uit `routeTarget` en `targetText`, die al bestaan en niets ophalen.
- Na een zoektocht in deze sessie: "6,2 km lus, 40 m stijgen". Zie vraag 3 over onthouden.
- Geen plaats ingesteld: "Kies eerst een plaats" en de tik gaat naar het blad, dat die regel al heeft.

Wanneer zoekt de app: pas als het blad opent. Op Vandaag kost de rij niets: geen netwerk, geen batterij, geen vraag om je plek. In het blad kost één zoektocht hoogstens een halve minuut, één vraag aan OpenStreetMap en Open-Meteo, hoogstens drie aanroepen van de routeplanner per soort lus, de kaarttegels, en met Waar je nu bent één plaatsbepaling van hoogstens 15 seconden.

De twee seconden: de missie blijft het eerste wat je leest. De rij voegt geen getal toe dat er niet al stond; hij zegt alleen dat er een lus bij hoort en vanaf waar.

Voordelen:
- Route staat op het homescherm, zichtbaar, één tik van de kaart.
- Kost niets tot je het wilt.
- Kleinste wijziging: de rij en het blad bestaan al.

Nadelen:
- Je ziet de lus zelf pas na de tik.
- Het wijkt af van "Niets op Vandaag". Het vervangt wel een regel die er al stond, er komt niets bij.

### Richting 2: een voorvertoning van de kaart op de missiekaart, zoekt vanzelf

In de missiekaart staat een klein kaartje (ongeveer 358 bij 140 px) met de eerste lus erop en eronder "6,2 km lus vanaf je plek, 40 m". Een tik opent het blad.

```
| zonebalk  Zone 2. Praten kan.              |
| +----------------------------------------+ |
| |  kleine kaart met de lus               | |
| +----------------------------------------+ |
| 6,2 km lus vanaf je plek, 40 m stijgen   > |
| [ v Gedaan                               ] |
```

Boven de vouw: de missie en de kaart; de knop Gedaan zakt ongeveer 150 px en valt op een dag met een ochtendkaart onder de vouw.

Wanneer zoekt de app: bij het openen van Vandaag. De eigenaar opent de app meerdere keren per dag (ochtendvraag, gewicht, afvinken). Elke keer betekent dat de kaartcode laden (ruim 1,6 MB, in de PWA niet vooraf opgeslagen), tegels ophalen, een plaatsbepaling met GPS, en tot zes aanroepen van een gratis routeplanner. De vraag om je plek komt dan bij het starten van de app. Het kan alleen fatsoenlijk als de lus bewaard wordt, en dat mag nu niet ("een route wordt niet bewaard").

De twee seconden: de kaart is het zwaarste element op het scherm en trekt het oog voor de missie. Op een trage telefoon staat er eerst een leeg vlak dat later vult.

Voordelen:
- Je ziet de lus zonder één tik.
- Het ziet er goed uit.

Nadelen:
- Netwerk, batterij en de vraag om je plek bij elke start.
- De knop Gedaan zakt weg.
- Een tweede kaart naast die in het blad: twee keer onderhoud, twee keer de terugval zonder WebGL.
- Bij een mislukte zoektocht staat er een foutregel in je missie.

### Richting 3: een eigen blok Route bovenaan het trainingsscherm

Vandaag blijft zoals het is. Op het trainingsscherm komt Route in een lijst direct onder de kerngetallen, boven Zo doe je het, niet meer onder opwarmen en rekken.

```
[ lucht: < HARDLOPEN, Lange duurloop    (i) ]
+--------------------------------------------+
| 50          5,5                            |
| minuten     km                             |
| zonebalk  Zone 2. Praten kan.              |
+--------------------------------------------+
+--------------------------------------------+
| (lopen) Route                            > |
|         5,5 km vanaf waar je nu bent       |
+--------------------------------------------+
ZO DOE JE HET
...
```

Boven de vouw op 390 px en ook op 360 bij 640 px: de kop, de getallen en de routerij (de rij begint rond 390 px).

Wanneer zoekt de app: na de tik, zoals richting 1. Een variant zoekt meteen bij het openen van het trainingsscherm; dat is verdedigbaarder dan bij Vandaag, omdat je dit scherm alleen opent voor de training, maar Gedaan opent hetzelfde scherm om in te vullen, en dan zoek je een lus voor een training die al gelopen is.

De twee seconden: Vandaag verandert niet.

Voordelen:
- Staat waar je de training bekijkt, ook de avond ervoor vanuit Week.
- Raakt Vandaag niet.

Nadelen:
- Niet op het homescherm, en dat was de vraag.
- Vanaf Vandaag opent Gedaan het formulier; je moet nog steeds terug omhoog.

### Wandelen en rugzaktraining

Nu krijgt alleen een looptraining een route. De rij en het blad zijn zo gemaakt dat een wandeling of rugzaktraining er zonder nieuwe opbouw in past zodra de planner dat kan (Kansen 11 november, voorstel 2):

- De rij zegt wat die training vraagt: "12 km, 300 hoogtemeters, vanaf je startpunt". Het rugzakgewicht staat al in de kerngetallen en hoort niet in de routerij.
- Het blad heet Route, niet Lus: een lange tocht kan ook van A naar B gaan of ergens anders beginnen. Start hier op de kaart is daar al de weg voor.
- De tijd bij een wandellus komt uit het klimtempo, niet uit het looptempo; dat is werk voor de engine, niet voor het scherm.
- Tot die planner er is krijgt een wandeling of rugzaktraining geen rij. Geen dode rij en geen "binnenkort".
- Een tochtdag uit Vrij en vakantie en een GR5-etappe krijgen geen lus: daar hoort later de etappe als koers bij, een ander onderwerp.

### Advies voor Route

Richting 1 en 3 samen, niet 2. Eén rij Route, overal dezelfde, die altijd hetzelfde blad opent: op de missiekaart van Vandaag, bovenaan het trainingsscherm, en als rij in het blad van een training in Week. De eigenaar heeft gelijk dat Route geen uitleg is maar iets wat je bij elke loop gebruikt; het hoort bij de missie. De kaart zelf hoort niet op Vandaag: die kost bij elke start netwerk, batterij en een vraag, en duwt Gedaan weg. De rij geeft het overzicht (afstand, hoogte, vanaf waar), het blad geeft de kaart, en na de eerste zoektocht zegt de rij wat de lus is.

## 4. Het infoscherm: drie richtingen

Ik neem "het infoscherm" breed: het trainingsscherm en het blad achter de i samen. Meegeteld: Eten onderweg komt op het trainingsscherm, De avond ervoor staat op Vandaag, Je horloge heeft een eigen blad.

### Richting A: afmaken wat er lag

Spoor 3 van het eerdere ontwerp: het blad Uitleg houdt alleen Waarom, Wat het vraagt van je lichaam en vier rijen. De namen worden gelijk. Het trainingsscherm verandert alleen waar iets uit het blad ernaartoe verhuist.

```
[ greep ]
ZO 1 NOVEMBER                              X
Lange duurloop
WAAROM
Twee zinnen uit het plan.
WAT HET VRAAGT VAN JE LICHAAM
Hart en longen   ===--  gemiddeld
| Te zwaar? Zo pas je het aan              > |
| Waar train je het best?                  > |
| Deze fase, week voor week                > |
| Achtergrond en bronnen                   > |
```

Voordelen: klein, veilig, haalt de dubbelingen weg.
Nadelen: het trainingsscherm blijft zoals het is, en dat is het scherm waar de klacht over gaat. De eigenaar merkt hier weinig van.

### Richting B: het trainingsscherm in de volgorde van vertrekken

Het trainingsscherm krijgt een vaste volgorde die de vragen volgt die je hebt voordat je de deur uit gaat: wat doe ik, wat regel ik voor ik ga, hoe doe ik het, wat doe ik ervoor en erna, wanneer stop ik. Alles wat je regelt staat in één lijst met rijen, elke rij met het feit eronder en een blad erachter. Geen uitklappen meer op dit scherm.

Trainingsscherm op 390 px:

```
[ lucht: < HARDLOPEN                        ]
[        Lange duurloop                 (i) ]
[        doelzin                            ]
[        Zo 1 november · week 3 van 8       ]
+--------------------------------------------+
| 50          5,5                            |
| minuten     km                             |
| zonebalk  Zone 2. Praten kan.              |
+--------------------------------------------+
VOOR JE GAAT
+--------------------------------------------+
| Route                                    > |
| 5,5 km vanaf waar je nu bent               |
| Weer en kleding                          > |
| Zon, 9 graden. Lange mouw en lange tight.  |
| Waar train je?                           > |
| Buiten                                     |
------------------------------- vouw ---------
| Eten onderweg                            > |
| Iets voor elk uur na het eerste            |
| (horloge) Staat op je horloge sinds 07:12  |
+--------------------------------------------+
ZO DOE JE HET
| stappen, met Je tempo eronder              |
VOOR EN NA
| Eerst opwarmen              8 oefeningen > |
| Daarna rekken               4 oefeningen > |
STOP OF SCHAKEL TERUG ALS
...
HOE GING HET?
...
------------------------------------------------
[ Horloge ]  [ v Gedaan, invullen            ]
```

Boven de vouw: wat je doet, en de eerste drie dingen die je regelt, met het antwoord al in de regel. De rijen:

- Route: zie hoofdstuk 3.
- Weer en kleding: de weerregel en de eerste kledingregel als feit; de tik opent de weerpagina zoals op Vandaag. Komt uit het blad Uitleg. De heuvelregel staat in het blad Route.
- Waar train je?: de gekozen plek als feit ("Buiten"). De tik opent een blad met de keuzes die er nu staan (`ModalityChoice`), en daaronder de rij Waar kun je dit doen? naar Plekken. Dat haalt ongeveer 200 px van het scherm.
- Eten onderweg: de plek voor wat nu in aanbouw is. Alleen bij een training waar die regel geldt.
- De horlogestand: blijft een regel, geen rij, zoals nu. Ging er iets mis, dan zie je het zonder tik. De knop Horloge onderaan blijft; die is net gebouwd op verzoek en verhuist niet weer.

De i naast de naam opent het blad van richting A, dat dan Waarom deze training heet.

Voordelen:
- Het scherm volgt het moment: eerst wat je regelt, met het antwoord in beeld.
- Route, kleding, plek, eten en horloge staan bij elkaar. Eten onderweg heeft meteen een plek.
- Niets klapt meer uit; elke rij is een blad of een pagina.
- Het blad achter de i wordt klein en zegt één ding.

Nadelen:
- Zo doe je het zakt onder de lijst. Bij een loop staan de stappen op je horloge en zijn ze kort; bij intervallen moet je één keer scrollen.
- De keuze Waar train je? is één tik verder weg. Hij staat standaard goed.
- Meer sporen dan A.

### Richting C: lezen en invullen uit elkaar

Het trainingsscherm wordt twee schermen. Training bekijken is de briefing van richting B zonder formulier. Gedaan op Vandaag opent een kort eigen scherm Hoe ging het? met alleen het formulier. Het blad achter de i vervalt: Waarom en de vier rijen staan onderaan de briefing.

```
Training bekijken              Hoe ging het?
[ lucht, naam            ]     [ lucht, naam          ]
| getallen               |     | Duur                 |
VOOR JE GAAT ...               | Zwaarte              |
ZO DOE JE HET ...              | Benen, gevoel        |
VOOR EN NA ...                 | Afstand, hartslag    |
WAAROM ...                     | Notities             |
[ Horloge ] [ Sluiten ]        [ Annuleren ] [ Opslaan ]
```

Voordelen:
- Elk scherm doet één ding; Gedaan is meteen het formulier zonder terugscrollen.
- Eén blad minder.

Nadelen:
- `ExerciseLogger` is groot, met een concept dat bewaard blijft en drie standen (invullen, leesstand, afvinken). Splitsen is een verbouwing met risico voor het loggen, en logs zijn het hart van de app.
- Forge heeft een eigen workoutscherm en heeft het blad achter de i nog steeds nodig. Dan vervalt het blad niet echt.
- De keuze Waar train je? bepaalt welke velden het formulier toont; die twee moeten dan over twee schermen samenwerken.

### Wat weg kan, wat samengaat

Weg uit het blad achter de i: de regels voor weer, heuvels, route en kleding; Je tempo; Zo voelt elk tempo; de rij en het onderblad De stappen; de rij Waar kun je dit doen?; de drie groepskoppen; de knop Sluiten onderaan.

Weg van het trainingsscherm: de knop Uitleg onderaan (de i doet hetzelfde; zonder horlogeblad staat daar Annuleren, in de leesstand niets); de kaart Waar train je? als open blok; het uitklappen van Route.

Samen: weer en kleding in één rij; Waar train je? en Waar kun je dit doen? in één blad; route op één plek per scherm.

Blijft: het blad Je horloge, de onderbladen Te zwaar, Waar train je het best, Deze fase en Achtergrond en bronnen, de kaart De avond ervoor.

### De namen

Twee namen, overal dezelfde.

- Training bekijken: opent het trainingsscherm om te lezen. Vervangt "Hoe je het doet" in Week en komt als rij in het menu op Vandaag.
- Waarom deze training: het blad achter de i. Vervangt "Info", "Uitleg", "Uitleg bij deze training" en "Meer over deze training". De onderbladen krijgen het kopje "Waarom".

Het rondje met drie puntjes op de missiekaart wordt voorgelezen als "Meer keuzes". "Zo doe je het" blijft de kop boven de stappen. "Uitleg" blijft het woord voor de i bij een getal of instelling, elders in de app.

### Advies voor het infoscherm

Richting B, met het blad van richting A erin. A alleen is te weinig: het ruimt een blad op dat de eigenaar nauwelijks nog opent. C is netter op papier maar verbouwt het loggen, en dat is het risico niet waard zolang B de klacht oplost. B kan in kleine stappen, en de eerste stap is de routerij uit hoofdstuk 3.

## 5. Uitgewerkt per scherm

### De routerij (`RouteProposalLine`, vorm `row`)

Eén onderdeel, drie plekken. Opbouw: pictogram in het ronde vlak, titel "Route", één regel eronder, pijltje. Minstens 56 px hoog. De rij heeft `data-sheet-from` en opent altijd `RouteSheet`.

- Leeg: staat Route voorstellen uit, of is het geen looptraining, dan bestaat de rij niet.
- Laden: de regel komt uit lokale gegevens en staat er meteen. Loopt er in het blad een zoektocht en sluit je het, dan stopt die (zoals nu) en houdt de rij zijn regel.
- Fout: de rij zelf kan niet mislukken. Zonder plaats: "Kies eerst een plaats".

### Het blad Route (`RouteSheet` met `RoutePanel`)

Van boven naar beneden: greep, kop met de naam van de training en "Route", één regel met de training en het startpunt met een `InfoButton`, de kaart, de gekozen lus, de andere lus, Zo zet je hem op je horloge, de bronregel met de licentie.

- Eerste keer: de vraag Precies of Ongeveer blijft zoals hij is, of zoals Route-kaart 2 hem maakt. Dit ontwerp verandert de vraag en de toestemming niet.
- Laden: de kaart staat er meteen op het effen vlak met je plek, met de regel "Zoeken naar een lus. Dat duurt hoogstens een halve minuut." erboven. De blokken van de lussen hebben vaste hoogte, zodat de kaart niet verspringt als ze vullen.
- Leeg: geen lus gevonden zegt per soort de bestaande zin uit de engine, met Opnieuw zoeken.
- Fout: zonder netwerk en bij een te late routeplanner de bestaande regels. Kan de telefoon de kaart niet tekenen, dan de bestaande regel en de lussen eronder.
- Beweging: het blad komt met `animate-sheet-in`; in Rustig en Uit staat het meteen. De kaart heeft `data-no-sheet-drag`, zoals nu.
- Terug: sluit het blad en laat het scherm eronder staan, ook het concept van het formulier.

### Vandaag, de missiekaart (`TodayMissionCard`)

- De tekstknop Route voorstellen tussen de weerregels verdwijnt. De routerij komt direct boven Eerst opwarmen, boven de knop Gedaan.
- In het menu: "Meer over deze training" wordt "Waarom deze training", en er komt "Training bekijken" bij als eerste rij.
- Verder verandert de kaart niet: titel, getallen, zone, coachregel, weer, knoppen en hoogtelijnen blijven. De mint knop blijft Gedaan of Training starten.
- Rustdag, of de training is gedaan: geen routerij. De kaart De avond ervoor houdt zijn regel; de tekst wordt "Route 5,5 km: zoek je lus morgen bij de training." De kaart krijgt geen knop (besluit 11 november).

### Week, het blad van een training (`SessionActionSheet`)

- "Hoe je het doet" wordt "Training bekijken".
- Nieuw onder Je horloge: de routerij, alleen voor een training die nog moet komen. Het blad Route opent erboven, zoals Je horloge dat al doet.
- Het i-knopje heet "Waarom deze training".

### Het trainingsscherm (`ExerciseLogger`)

De opbouw van richting B. Staten: de lijst Voor je gaat toont alleen rijen die iets te zeggen hebben; is er geen enkele, dan valt de kop weg. De weerregel zonder voorspelling valt weg en de rij toont alleen de kleding, of bestaat niet. De leesstand en het afvinken van kracht in MacroFactor blijven zoals ze zijn.

### Het blad Waarom deze training (`TrainingGuideSheet`)

De opbouw van richting A. Een training zonder plan toont de kop en wat er van de rijen is. Is er helemaal niets, dan bestaat de i niet. Alles is lokaal: geen laden, geen fout.

### Wat dit bewust niet doet

- Geen kaart op Vandaag en geen zoektocht zonder tik.
- Geen nieuwe kleur, letter of token; geen eigen kaart- of knopopmaak. De ronde knoppen op de kaart blijven de bestaande uitzondering.
- Geen tab erbij en geen eigen pagina voor routes: een route hoort bij een training, en een losse pagina zou een vierde ingang zijn.
- Geen verandering aan hoe de planner zoekt, wat er de deur uit gaat, of de toestemming.
- Het formulier en het loggen blijven zoals ze zijn.
- De planning verandert nergens. Een route plant niets.

## 6. Volgorde om te bouwen

Kleine sporen, elk met een eigen einde. Alle sporen zijn schermwerk: Opus. Geen enkel spoor raakt de planning, dus Fable is nergens nodig. Voor elk spoor geldt: `src/storage/planGolden.test.ts` beweegt niet, `src/components/sheetDrag.scan.test.ts` blijft groen, `npm run kaart:vergelijk` met elk verschil verklaard, en Lookout op 360 en 390 px.

Spoor 1 wacht op Route-kaart 2, want die raakt dezelfde bestanden.

1. Het blad Route met de kaart bovenaan, en nergens meer uitklappen.
   - Bestanden: `src/components/RoutePanel.tsx` (volgorde, de lange zinnen achter de i), `src/components/RouteProposalLine.tsx` (de rij opent het blad, de stand `inline` vervalt), `src/components/ExerciseLogger.tsx` (alleen de aanroep).
   - Niet bewegen: `engine/routePlanner.ts`, `storage/routeProposal.ts`, `storage/routeStart.ts`, `RouteMap.tsx` en `routeMapView.ts`, de toestemmingsvraag, de teksten van de meldingen bij een lus.
   - Instellingen: geen nieuwe. De bestaande vier (Route voorstellen, Welke lus eerst, Startpunt van je lus, Ondergrond van de kaart) blijven.
   - Einde: op 360 en 390 px staan kaart, gekozen lus en knop boven de vouw van het blad, en er valt niets achter de onderbalk.

2. De routerij op Vandaag en bovenaan het trainingsscherm.
   - Bestanden: `src/engine/routeTarget.ts` (een pure functie voor de regel onder de rij, met test), `src/components/RouteProposalLine.tsx`, `src/components/TodayMissionCard.tsx`, `src/components/ExerciseLogger.tsx`.
   - Niet bewegen: de rest van de missiekaart, de volgorde van de kaarten op Vandaag, het ene mint accent.
   - Instellingen: `src/data/settingsHelp.ts` en `src/data/settingsIndex.ts` bij Route voorstellen: waar je de rij vindt. De schakelaar haalt de rij op alle plekken weg.
   - Tekstkaart: er is nog geen kaart van Vandaag met een looptraining; die komt erbij, met de invariant "Route heeft op elk scherm hoogstens één ingang".
   - Einde: van Vandaag naar de kaart is één tik, en de knop Gedaan staat op 360 bij 640 px nog waar hij stond, op 12 px na.

3. De namen gelijk.
   - Bestanden: `TodayMissionCard.tsx`, `SessionActionSheet.tsx`, `ExerciseLogger.tsx`, `TrainingGuideSheet.tsx`, `src/components/forge/ForgeSheets.tsx`. Alleen tekst en labels, en de rij Training bekijken op Vandaag.
   - Niet bewegen: wat de knoppen doen.
   - Einde: een scan in de tests vindt "Meer over deze training", "Uitleg bij deze training" en "Hoe je het doet" nergens meer.

4. Het blad Waarom deze training opschonen, met Route eruit, en de routerij in Week.
   - Bestanden: `src/engine/guideMenu.ts` en zijn test, `TrainingGuideSheet.tsx`, `src/components/GuideRow.tsx`, `src/components/trainingGuideSheet.scan.test.ts` (het aantal onderbladen gaat bewust omlaag), `SessionActionSheet.tsx`, `src/engine/eveningBefore.ts` (één zin, met zijn test).
   - Niet bewegen: `src/data/trainingGuide.ts`, `buildWorkoutPlan`, `buildSessionBrief`, het blad Je horloge.
   - Einde: het blad past op 390 px zonder scrollen, en Route staat niet meer in het blad.

5. De lijst Voor je gaat op het trainingsscherm.
   - Bestanden: `ExerciseLogger.tsx` (volgorde, de rij Weer en kleding, Je tempo onder de stappen, de plek voor Eten onderweg, de knop Uitleg onderaan weg).
   - Niet bewegen: het formulier, het concept, de leesstand, de horlogestand en de knop Horloge.
   - Afstemmen met de bouwer van Eten onderweg: die levert een rij voor deze lijst, geen eigen kaart.
   - Einde: op 360 bij 640 px staan Route en Weer en kleding boven de vouw.

6. Waar train je? als rij met een blad.
   - Bestanden: `ExerciseLogger.tsx`, `src/components/ModalityPicker.tsx`, een nieuw blad op `src/components/settings/Sheet.tsx`.
   - Niet bewegen: welke keuze standaard staat, welke velden het formulier bij een keuze toont, `showSpots`.
   - Einde: de keuze werkt zoals nu, getest met loopband en buiten, en het scherm is ongeveer 200 px korter.

7. Alleen na ja op vraag 2 en 3: de laatste lus van vandaag onthouden, en de keuze wanneer er gezocht wordt.
   - Bestanden: `src/storage/routeProposal.ts`, `src/engine/routeTarget.ts`, de rij; een nieuwe instelling "Lus zoeken" (Na een tik, advies; Bij het openen van de training) met `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts` en het blad Weer en kleding.
   - Let op: dit vervangt "een route wordt niet bewaard" en vraagt een eigen besluit. Bewaren op het toestel, tot middernacht, niet in de back-up.
   - Einde: na een zoektocht zegt de rij op Vandaag de lus, ook na het sluiten van de app.

8. Later, na de verfijning van de planner: routes voor wandelen en rugzaktraining (Kansen, voorstel 2). Het scherm is er dan al; het werk zit in de engine.

Richting C (lezen en invullen uit elkaar) staat niet in de volgorde. Die komt pas ter sprake als B staat en het formulier nog in de weg zit.

## Samenvatting

Route voorstellen heeft nu drie ingangen in drie vormen en klapt op twee plekken op zijn plek open, waardoor de kaart op het trainingsscherm half achter de onderbalk valt. Het voorstel maakt er één rij van, Route, met het feit eronder (afstand, hoogte, vanaf waar), op de missiekaart van Vandaag, bovenaan het trainingsscherm en in Week. De rij opent altijd hetzelfde blad met de kaart bovenaan. Zoeken gebeurt na de tik, niet bij het openen van de app. Het trainingsscherm krijgt de volgorde van vertrekken: wat je doet, wat je regelt voor je gaat, hoe je het doet, ervoor en erna. Het blad achter de i wordt klein en heet Waarom deze training. Er komt geen kleur, token of tab bij, en de planning verandert nergens.

## Vragen voor de eigenaar

1. Bedoelde je met "de locatie niet goed vinden" de plek van Route in de app, of dat de kaart niet begint waar jij staat? Advies: ik ga uit van de plek in de app; het startpunt lost Route-kaart 2 op met Waar je nu bent als standaard.
2. Wanneer moet de app een lus zoeken: pas als je op Route tikt, of vanzelf zodra je de training opent? Advies: na de tik. Vanzelf zoeken kost bij elke keer openen netwerk, batterij en je plek, ook als je alleen komt afvinken. Het kan later als instelling.
3. Mag de app de lus die je vandaag vond onthouden op je telefoon, tot middernacht? Dan zegt de rij op Vandaag "6,2 km lus, 40 m stijgen" in plaats van alleen de afstand van je training. Advies: ja. Nu wordt een route bewust nooit bewaard.
4. Wat noem jij het infoscherm: het scherm met Horloge en Sluiten onderaan, of het blad achter de i? Advies: ik pak allebei aan, het scherm eerst, want daar kijk je voor je vertrekt.
5. Zijn de namen goed: "Training bekijken" voor het scherm en "Waarom deze training" voor het blad achter de i, in plaats van Info, Uitleg, Meer over deze training en Hoe je het doet? Advies: ja, twee namen die zeggen wat je krijgt.
