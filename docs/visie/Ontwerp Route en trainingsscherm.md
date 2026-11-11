# Ontwerp: Route en het trainingsscherm

Status: voorstel van Cartographer, 11 november. Er is geen code gewijzigd.

## Aanleiding

De eigenaar op 11 november, in vier berichten:

- Hij vindt de plek van Route voorstellen niet goed, "dat hele infomenu is niet wat ik ervan wil", en Route moet gewoon op het homescherm en meteen als je de training openklikt. "Het is iets wat je sowieso gebruikt, en makkelijk in een overzicht wil, en niet pas als je helemaal doorklikt."
- Route voorstellen staat er ook als je bij Waar train je? Loopband kiest. "Op de loopband heb je natuurlijk geen route nodig."
- "Ik vind gewoon dat het wat innovatiever moet."
- De richting die boven de rest gaat: "Het mag een hele redesign zijn: hoe het samen in elkaar zit, logischer, waar heb je nou daadwerkelijk wat aan. Als je met Garmin werkt, doe je je training met Garmin en die wordt automatisch voor je afgevinkt. Je wilt alleen informatie zien voordat je begint, zoals de routes: waar je heen moet, wat het beste is om te lopen, ook met hoogtemeters. En dat in één keer als overzicht." De focus ligt op Garmin, want die koppeling werkt nu volledig. Het blad in Week was "puur een optie" voor een plek, geen eis.

Gelezen: CLAUDE.md, `docs/architectuur/ontwerp-en-tokens.md`, de werkbriefjes bediening en koppelingen, de stemgids, `docs/visie/Ontwerp Info-blad.md`, de besluiten van 11 november over de kaart, het verfijnen, de locatie en De avond ervoor, de besluiten met "Niets op Vandaag", de tekstkaarten van Vandaag en het trainingsblad, `docs/visie/Kansen 11 november app.md`, en de code van `TodayMissionCard`, `ExerciseLogger`, `TrainingGuideSheet`, `SessionActionSheet`, `guideMenu`, `RoutePanel`, `RouteProposalLine`, `WatchActivityCard`, `engine/routeTarget.ts`, `engine/autoTick.ts`, `engine/sessionStatus.ts`, `engine/eveningBefore.ts` en `data/modalities.ts`.

Niet gelezen: `2026-11-11-route-kaart-2.md`. Dat besluit staat op de branch `origin/claude/route-kaart-2` en niet in deze werkmap. Ik ga uit van wat de backlog en de opdracht erover zeggen: Waar je nu bent wordt de standaard voor het startpunt, er komt een laadtoestand, en de tweede lus wordt beter zichtbaar.

De hoogtes in dit stuk zijn geschat uit de code, niet gemeten op een toestel, behalve waar staat dat het uit een screenshot van de eigenaar komt. Lookout meet ze na bij elk spoor.

## 1. Wat er nu is

### De ingangen naar Route voorstellen

Drie ingangen, in drie vormen, alleen voor een looptraining (`wantsRoute`: hardlopen, geen kracht).

- Vandaag, de missiekaart: een gedempte tekstknop "Route voorstellen" tussen de regel over heuvels en het kledingadvies. Hij opent een blad. De eigenaar vraagt om Route op het homescherm terwijl hij er al staat; dat zegt genoeg over hoe zichtbaar een grijze regel tussen vier grijze regels is.
- Het trainingsscherm (`ExerciseLogger`): een uitklaprij in de kaart met Eerst opwarmen en Daarna rekken. Het paneel klapt op zijn plek open.
- Het blad achter de i (`TrainingGuideSheet`): weer een gedempte tekstknop die op zijn plek openklapt. Op het trainingsscherm kom je dus op twee manieren bij hetzelfde paneel.

Geen ingang: het blad van een training in Week, en de kaart De avond ervoor, die wel zegt "vraag een lus op bij de training".

### Tikken en scrollen van Vandaag tot een lus

- Kortste weg: de tekstknop op de missiekaart, één tik. Hij staat naar schatting tussen 600 en 750 px van boven, op of net onder de vouw. In het blad staan eerst twee alinea's tekst en dan de kaart.
- Via het trainingsscherm vanaf Vandaag: Gedaan (één tik), je staat bij het formulier, terug omhoog scrollen, de rij (twee tikken), weer omlaag scrollen naar de kaart.
- Via Week: de training, Hoe je het doet, scrollen voorbij drie kaarten, de rij (drie tikken), weer scrollen.
- Via het blad achter de i vanaf Vandaag: de drie puntjes, Meer over deze training, Route voorstellen (drie tikken).

### Het trainingsscherm op 390 px

Uit de screenshot van de eigenaar (Android-app, live versie zonder Route-kaart 2):

- Onderaan de kaart Waar train je? staan Buiten (gekozen, Beste keuze), Loopband (Ook goed) en Hardlopen en wandelen afgewisseld (Als het niet anders kan), met daaronder "Continu rustig lopen. Meer".
- Daarna een kaart met Eerst opwarmen (8 oefeningen), Daarna rekken (4 oefeningen) en de uitklaprij Route voorstellen.
- Na het uitklappen: "Je training: 5,5 km. De lus begint bij je startpunt." en de kaart, die onderaan wordt afgesneden door de vaste balk met Horloge en Gedaan, invullen.

De route staat dus pas na twee kaarten en een uitklap, en ook dan valt de kaart half achter de onderbalk. De oorzaak: een bijna vierkante kaart in een pagina die scrolt onder een vaste balk past nooit schoon in beeld.

Uit de code geschat: de lucht met kop (ongeveer 170 px), de kaart met kerngetallen en zone (190 px), Zo doe je het (110 px bij één blok, rond 300 px bij intervallen), Waar train je? (260 px). De rij Route voorstellen begint rond 880 px, bijna 200 px onder de rand.

### Route en de keuze waar je traint

Route voorstellen kijkt niet naar de keuze Waar train je?. De voorwaarde is alleen de instelling en of het een looptraining is. Bij Loopband staat de rij er dus nog.

Waar de keuze nu leeft: alleen in het open trainingsscherm (`modalityKey` in `ExerciseLogger`), in het concept van dat scherm, en na het opslaan in het log (`modality` en `environment`). Bij de geplande training staat niets. Vandaag en Week weten dus niet of je buiten of op de loopband gaat. De engine kent de soorten wel: elke keuze in `data/modalities.ts` heeft `environment` (buiten, loopband, binnen, rust), en `buildSessionBrief` neemt de keuze aan als invoer. Er is geen functie die zegt "deze keuze heeft een route".

### Wat er gebeurt als je horloge de training aanlevert

Dit bestaat al en werkt (`engine/autoTick.ts`, `WatchActivityCard`, de schakelaar Vanzelf afvinken bij Garmin koppelen, standaard aan):

- Een activiteit van je horloge die onmiskenbaar bij de ene geplande training van die dag hoort, wordt vanzelf een log. De training is dan gedaan, want gedaan is "er is een log" (`engine/sessionStatus.ts`).
- Daarna vraagt een kaart op Vandaag alleen nog hoe het ging, 72 uur lang, met Klopt niet om het terug te draaien.
- Is er twijfel (twee trainingen op een dag, twee activiteiten, een andere soort), dan komt de activiteit als voorstel op Vandaag met Opslaan.
- Een testloop en een wedstrijd worden nooit vanzelf afgevinkt.

Toch is de hoofdknop van een loop op Vandaag "Gedaan" en op het trainingsscherm "Gedaan, invullen", met een formulier van een scherm lang. Voor iemand met een gekoppelde Garmin is dat de knop die hij nooit nodig heeft, op de beste plek van het scherm.

### Het blad van een training in Week

Uit de screenshot van de eigenaar ("Morgen, donderdag", Rustige duurloop): titel met een i, Waarom staat dit hier?, de regel "Verstuurd naar je horloge om 07:18", de mint knop Verplaatsen, en een lijst met Ruilen, Hoe je het doet, Je horloge (met daaronder nog eens "Verstuurd naar je horloge om 07:18"), Vandaag al doen en Overslaan. De horlogestand staat er twee keer, en er is geen route.

### Wat dubbel of overbodig is

In het blad achter de i, sinds spoor 1 en 2 van het Info-blad: weer, heuvels, route en kleding (ook op de missiekaart), Je tempo en Zo voelt elk tempo (staan bij elke stap), de rij De stappen (dezelfde stappen als het scherm eronder), drie groepskoppen voor hoogstens zes rijen, en een knop Sluiten naast het kruisje.

In de namen: "Meer over deze training" (de rij op Vandaag, het rondje met drie puntjes, de i in Week), "Uitleg bij deze training" (de i op het trainingsscherm, Forge), "Uitleg" (de knop onderaan, de onderbladen), "Hoe je het doet" (opent het trainingsscherm, niet de uitleg). En "Training bekijken" bestaat al voor iets anders: het log van een gedane training.

Op het trainingsscherm: de knop Uitleg onderaan doet hetzelfde als de i; Waar train je? neemt een derde van het scherm; wat je regelt voor vertrek staat verspreid of onderaan.

### Eerlijk over spoor 1 en 2

Spoor 1 en 2 losten één klacht op: het horloge heeft een eigen blad. Verder werd het niet beter. Mijn eerdere ontwerp behandelde het blad achter de i als het probleem en liet het scherm eronder staan. Het echte probleem zit dieper: het trainingsscherm is gebouwd als invulformulier met uitleg erboven, terwijl de eigenaar het formulier niet gebruikt en alleen de uitleg vooraf wil. Blokken verplaatsen lost dat niet op.

## 2. De locatie, twee keer kort

De plek in de app: daar gaat dit stuk over. Ik neem aan dat de eigenaar dat bedoelde.

De plek op de kaart: de eerste proef begon niet bij de eigenaar omdat het startpunt op Ongeveer stond. Route-kaart 2 maakt Waar je nu bent de standaard. Dit ontwerp voegt toe dat de regel bij de kaart altijd zegt vanaf waar de lus begint, en dat de vraag om je plek nooit bij het starten van de app komt. Er komt nergens een echte plek in de repo of in een tekst.

## 3. Het uitgangspunt

Drie zinnen die voor elke richting gelden.

- Een loop of wandeling buiten doe je met je horloge. De app is er vooraf (wat ga ik doen, waar, wat neem ik mee) en achteraf alleen voor de vraag hoe het ging.
- Er is één plek waar alles vooraf bij elkaar staat. Vandaag, Week en De avond ervoor zijn ingangen naar die plek en herhalen hem niet.
- De route hoort bij de keuze Buiten. Geen buiten, geen route en geen kaart, op elk scherm tegelijk.

Hoe kracht erbij past: Forge is hetzelfde patroon met een andere inhoud. Op Vandaag opent de ene mint knop het scherm dat je voor die training nodig hebt: voor kracht het workoutscherm (Training starten), voor een loop of wandeling de plek met alles vooraf. In beide gevallen komt "gedaan" uit het doen zelf: Forge sluit de workout af, je horloge levert de loop aan. Forge blijft buiten deze redesign.

## 4. Drie richtingen

### Richting 1: opruimen wat er staat

Route wordt één rij, overal dezelfde, die een blad opent met de kaart bovenaan. Het trainingsscherm houdt zijn vorm (uitleg boven, formulier onder) maar krijgt een lijst Voor je gaat direct onder de kerngetallen.

Vandaag, de missiekaart:

```
| (o) VANDAAG · HARDLOPEN              (...) |
| Rustige duurloop                           |
| 50 minuten    5,5 km                       |
| zonebalk  Zone 2. Praten kan.              |
| Zon, 9 graden. Lange mouw en lange tight.  |
| (lopen) Route                            > |
|         5,5 km vanaf waar je nu bent       |
| (rekken) Eerst opwarmen                  > |
| [ v Gedaan                               ] |
```

Het trainingsscherm:

```
[ lucht: < HARDLOPEN, Rustige duurloop  (i) ]
| 50 minuten   5,5 km   zonebalk             |
VOOR JE GAAT
| Route            5,5 km vanaf je plek    > |
| Weer en kleding  9 graden, lange mouw    > |
| Waar train je?   Buiten                  > |
------------------------------- vouw ---------
| Eten onderweg ...                        > |
| (horloge) Staat op je horloge sinds 07:18  |
ZO DOE JE HET ...
HOE GING HET? (formulier)
[ Horloge ]  [ v Gedaan, invullen            ]
```

Het blad Route (hoogstens ongeveer 700 px hoog):

```
RUSTIGE DUURLOOP                           X
Route
5,5 km vanaf waar je nu bent.            (i)
+--------------------------------------------+
|   kaart, ongeveer vierkant                 |
+--------------------------------------------+
AVONTUURLIJK
5,6 km lus langs 2 hellingen
40 m stijgen, vooral onverhard
[ Naar Garmin Connect ]   GPX downloaden
------------------------------- vouw ---------
SIMPEL ...
```

Zoeken: pas als het blad opent. Vandaag en het trainingsscherm kosten niets: geen netwerk, geen batterij, geen vraag om je plek. De twee seconden: de missie blijft het eerste; de rij vervangt een regel die er al stond.

Voordelen: klein, veilig, de afgesneden kaart is weg, Route staat zichtbaar op het homescherm.
Nadelen: het is een blok verplaatsen. Gedaan en het formulier blijven de hoofdzaak van een scherm dat de eigenaar alleen vooraf gebruikt. Het overzicht "in één keer" is er niet: de route blijft een tik weg.

### Richting 2: de briefing, met de route als hart

Echt anders dan nu. Een loop of wandeling buiten krijgt een eigen scherm, de Briefing, dat alleen voor vooraf is. Geen formulier. Bovenaan kies je waar je traint, en die keuze is meteen de inhoud: Buiten is de kaart met je lus, Loopband is een kaart met wat je op de band instelt. Daaronder staan vier vakken met het antwoord al in beeld. Het bestaande scherm met het formulier blijft bestaan als terugval en heet Zelf invullen.

De Briefing op 390 px (ongeveer 780 px hoog, de onderbalk neemt 76 px):

```
[ lage lucht met bergen                      ]
[ <  MORGEN · HARDLOPEN                  (i) ]
[    Rustige duurloop                        ]
( Buiten )  ( Loopband )  ( Afgewisseld )
+--------------------------------------------+
|                                            |
|   kaart, 358 bij ongeveer 240 px           |
|   gekozen lus in mint, andere gestreept    |
|   (o) je plek          [mijn plek] [alles] |
+--------------------------------------------+
AVONTUURLIJK · PAST HET BEST
5,6 km · 40 m stijgen · vooral onverhard
Simpel: 5,5 km, vlak                    Kies
+---------------------+----------------------+
| WAT JE LOOPT        | HORLOGE              |
| 50 min, zone 2      | Staat erop, 07:18    |
+---------------------+----------------------+
| WEER EN KLEDING     | ETEN EN DRINKEN      |
| 9 graden, lange mouw| 0,5 liter mee        |
+---------------------+----------------------+
------------------------------- vouw ---------
VOOR EN NA
| Eerst opwarmen              8 oefeningen > |
| Daarna rekken               4 oefeningen > |
STOP OF SCHAKEL TERUG ALS
...
Je horloge vinkt deze training af.
Zelf invullen
------------------------------------------------
[ Horloge ]  [ Route naar Garmin Connect     ]
```

Boven de vouw, naar schatting: de naam, de keuze waar je traint, de kaart, de lus met afstand en hoogtemeters, en alle vier de vakken (lucht 130, keuze 52, kaart 240, lus 80, vakken 128, samen ongeveer 630 px van de 700). Op 360 bij 640 px wordt de kaart lager (ongeveer een derde van de hoogte) en kan de onderste rij vakken half onder de balk vallen; Lookout meet dat.

De delen, van boven naar beneden:

1. Lucht (`SkyBand variant="low"`), terugknop, kopje met dag en soort, de naam, de i. De doelzin verhuist naar het blad achter de i; hier telt hoogte.
2. Waar je traint: de keuzes van `ModalityChoice` als een rij `Chip`s, de gekozen in mint. Eén keuze of geen keuzes: de rij valt weg en het is Buiten.
3. Bij Buiten: de kaart (`RouteMap`, in een lagere stand) met alle lussen. Daaronder de gekozen lus: de soort, het oordeel, en één regel met afstand, hoogtemeters en ondergrond. De andere lus staat als één regel met Kies; een tik op de lus op de kaart kiest ook. Een tik op de kaart zelf zet de ring neer met Start hier, zoals nu. Een knop Groter opent het bestaande blad Route met de volle kaart en de lange tekst.
4. Bij Loopband of binnen: geen kaart, geen netwerk. Op die plek een `Card` met de uitleg van die keuze uit `data/modalities.ts` (wat je instelt) en de afstand van de training. De rest van het scherm blijft gelijk.
5. Vier vakken, elk een `Card` van minstens 56 px hoog met een `Eyebrow` en één regel. Elk vak opent een blad of een pagina:
   - Wat je loopt: duur en zone of tempo. Het blad toont de stappen, het profiel en Je tempo (de bestaande `StepList` en `IntervalProfile`).
   - Horloge: de stand van de workout. Opent het blad Je horloge. Ging het versturen mis, dan is de regel amber en staat hij er voluit.
   - Weer en kleding: de weerregel en de eerste kledingregel. Opent de weerpagina.
   - Eten en drinken: de regel over drinken uit je zweettempo (bestaat al voor De avond ervoor) en straks Eten onderweg. Geen regel, geen vak; de drie andere vullen dan de rij.
6. Onder de vouw: Voor en na (opwarmen, rekken), Stop of schakel terug als (blijft op het scherm, een waarschuwing wordt niet weggestopt), en de terugval.
7. Onderbalk: links Horloge, rechts de ene gevulde mint knop Route naar Garmin Connect voor de gekozen lus. Zonder lus (loopband, geen netwerk, route uit): rechts Sluiten.

De terugval:

- Met een gekoppeld horloge en Vanzelf afvinken aan staat onderaan één regel "Je horloge vinkt deze training af." met de tekstknop Zelf invullen. Die opent het bestaande scherm met het formulier, ongewijzigd.
- Zonder koppeling, met Vanzelf afvinken uit, bij een koppeling die al dagen stil is (`sourceSilence`), en bij een testloop of wedstrijd: de onderbalk van de Briefing heeft rechts Gedaan, invullen, zoals nu. De rest van het scherm is hetzelfde. Dat is niet mooier dan nu, wel compleet.

Wanneer zoekt de app: zodra de Briefing opent, als Buiten gekozen is, je de eerste vraag al beantwoord hebt, en de training vandaag of morgen is. Verder weg zoekt hij na een tik op Zoek een lus. Dat kan hier wel, omdat je dit scherm alleen opent om je voor te bereiden; Gedaan komt hier niet meer langs. Eén zoektocht kost hoogstens een halve minuut, één vraag aan OpenStreetMap en Open-Meteo, hoogstens drie aanroepen van de routeplanner per soort lus, de kaartcode (ruim 1,6 MB, in de Android-app al aan boord) en de tegels, en met Waar je nu bent één plaatsbepaling van hoogstens 15 seconden. De lus blijft onthouden zolang de app open is, zodat een tweede keer openen niets kost. De vier vakken wachten daar niet op: die zijn lokaal en staan er meteen.

De twee seconden: Vandaag wordt lichter, niet zwaarder. De missiekaart zegt de training en heeft één knop, Briefing.

Voordelen:
- Dit is wat de eigenaar vroeg: alles vooraf in één overzicht, met de route bovenaan.
- De plek kiezen en de lus kiezen zijn één stap; bij Loopband verdwijnt de kaart vanzelf.
- De knop die je nooit gebruikt is weg; de mint knop doet iets wat je wel wilt (de lus naar je horloge).
- Het formulier wordt niet verbouwd. De Briefing is een nieuw scherm ernaast; het loggen blijft zoals het is.
- Wandelen en rugzak passen er zonder nieuwe opbouw in.

Wat het kost:
- Een nieuw scherm en een nieuwe functie in de engine die zegt wat erop staat. Dat is het grootste stuk werk van dit voorstel, verdeeld over vier sporen.
- De keuze waar je traint moet bij de geplande training onthouden worden. Dat is een nieuwe bewaarde plek op het toestel.
- Zoeken zonder tik: netwerk en plaatsbepaling bij het openen van de Briefing. Begrensd tot vandaag en morgen, en instelbaar.
- Twee schermen voor één training zolang de terugval bestaat. De namen moeten dat helder houden.
- De vakken zijn smal (ongeveer 171 px). Een regel moet kort zijn, anders breekt hij. De engine levert daarom een korte vorm, de lange staat in het blad erachter.
- "Past het best" vraagt een regel die de twee lussen vergelijkt; die bestaat nog niet als oordeel.

### Richting 3: de missiekaart is de briefing

Nog een stap verder: er is geen apart scherm. Op Vandaag wordt de missiekaart van een buitentraining zelf de briefing, met een kleine kaart en de vier vakken erin.

```
| (o) VANDAAG · HARDLOPEN              (...) |
| Rustige duurloop    50 min · zone 2        |
| +----------------------------------------+ |
| |  kleine kaart met de lus (140 px)      | |
| +----------------------------------------+ |
| 5,6 km lus · 40 m stijgen                > |
| Horloge: staat erop  ·  9 graden, lange mouw |
| 0,5 liter mee                              |
| [ Route naar Garmin Connect              ] |
```

Zoeken: bij het openen van de app. De eigenaar opent de app meerdere keren per dag (ochtendvraag, gewicht). Elke keer de kaartcode, tegels, een plaatsbepaling en tot zes aanroepen van een gratis routeplanner, en de vraag om je plek bij het starten. Dat kan alleen fatsoenlijk als de lus bewaard wordt.

De twee seconden: de kaart is het zwaarste element en trekt het oog voor de naam van de training. Op een trage telefoon vult hij later dan de rest.

Voordelen: nul tikken; het homescherm is het overzicht.
Nadelen: netwerk, batterij en je plek bij elke start; een tweede kaart om te onderhouden; de missiekaart wordt 200 px hoger en duwt alles eronder weg; de avond ervoor (morgen) en Week hebben alsnog een eigen scherm nodig, dus er zijn dan twee plekken en niet één.

### Wandelen en rugzaktraining

Nu krijgt alleen een looptraining een route. In richting 2 past een wandeling of rugzaktraining zonder nieuwe opbouw:

- De Briefing geldt voor elke training buiten te voet. Tot de planner wandelroutes kan (Kansen 11 november, voorstel 2) staat op de plek van de kaart de regel over plekken in de buurt met de rij Waar kun je dit doen?; de vier vakken werken al.
- Het vak Wat je loopt zegt bij een rugzaktraining ook het gewicht ("90 min, rugzak 10 kg"). Eten en drinken is daar vaker gevuld.
- De lus heet Route en niet Lus: een lange tocht kan ergens anders beginnen. Start hier op de kaart is daar de weg voor.
- De tijd bij een wandelroute komt uit het klimtempo; dat is werk voor de engine.
- Een tochtdag uit Vrij en vakantie en een GR5-etappe krijgen geen lus. Daar hoort later de etappe als koers bij.

## 5. Advies

Richting 2, en richting 1 als de eerste twee sporen ervan. Richting 1 alleen is netjes maar beantwoordt de vraag niet: de eigenaar wil geen beter geplaatst blok, hij wil een scherm dat gemaakt is voor hoe hij traint. Richting 3 zet te veel op Vandaag en kost bij elke start netwerk en je plek. Richting 2 geeft het overzicht in één keer, maakt de route het hart van een buitentraining, laat het loggen met rust, en houdt Vandaag licht.

### Hoe de schermen samenhangen

Eén plek, vier ingangen.

- De Briefing: de enige plek met alles vooraf.
- Vandaag: zegt de missie. Bij een buitentraining met een gekoppeld horloge is de mint knop Briefing. Onder de knop één gedempte regel: "Je horloge vinkt hem af na je loop." Zelf afvinken staat in het menu achter de drie puntjes. De tekstknop Route voorstellen en de heuvelregel gaan van de kaart af; ze staan in de Briefing. Zonder koppeling blijft de knop Gedaan en krijgt de kaart de routerij van richting 1, die de Briefing opent.
- Week, het blad van een training: de eerste rij van de lijst heet Briefing, met eronder "Route, horloge, weer en eten". Hij vervangt Hoe je het doet. Verplaatsen blijft de mint knop: in Week plan je. De horlogestand staat er één keer, als regel boven de knop; de rij Je horloge houdt altijd "Workout en datavelden" als regel eronder.
- De avond ervoor: de regel wordt "Route 5,5 km: je lus staat in de briefing." De kaart krijgt geen knop (besluit 11 november); de rij Morgen in Je dag opent het blad van die training, en daar staat Briefing bovenaan.
- Na de loop: de bestaande kaart op Vandaag vraagt hoe het ging. Daar verandert niets.

Vandaag met een gekoppeld horloge:

```
| (o) VANDAAG · HARDLOPEN              (...) |
| Rustige duurloop                           |
| 50 minuten    5,5 km                       |
| zonebalk  Zone 2. Praten kan.              |
| | coachregel                               |
| Zon, 9 graden. Lange mouw en lange tight.  |
| (horloge) Staat op je horloge sinds 07:18  |
| [ Briefing                               ] |
| Je horloge vinkt hem af na je loop.        |
| [ Verplaatsen ]  [ Niet fit? ]             |
```

Week:

```
MORGEN, DONDERDAG                          X
Rustige duurloop                         (i)
Hardlopen · 50 min
Waarom staat dit hier?                     v
(horloge) Verstuurd naar je horloge om 07:18
[ Verplaatsen                              ]
ANDERE KEUZES
| Briefing                                 > |
| Route, horloge, weer en eten               |
| Ruilen                                   > |
| Je horloge                               > |
| Workout en datavelden                      |
| Vandaag al doen                          > |
| Overslaan                                > |
```

### Het infoscherm: wat weg gaat, wat samengaat, hoe het heet

Drie namen, overal dezelfde.

- Briefing: het scherm vooraf. Vervangt "Hoe je het doet" en het trainingsscherm in de leesstand.
- Waarom deze training: het blad achter de i. Vervangt "Info", "Uitleg", "Uitleg bij deze training" en "Meer over deze training". De onderbladen krijgen het kopje "Waarom".
- Zelf invullen: het bestaande scherm met het formulier, de terugval.

Het rondje met drie puntjes wordt voorgelezen als "Meer keuzes". "Training bekijken" blijft wat het is: het log van een gedane training.

Het blad Waarom deze training wordt klein:

```
ZO 1 NOVEMBER                              X
Rustige duurloop
doelzin
WAAROM
Twee zinnen uit het plan.
WAT HET VRAAGT VAN JE LICHAAM
Hart en longen   ===--  gemiddeld
| Te zwaar? Zo pas je het aan              > |
| Waar train je het best?                  > |
| Deze fase, week voor week                > |
| Achtergrond en bronnen                   > |
```

Weg uit dat blad: weer, heuvels, route en kleding; Je tempo; Zo voelt elk tempo; de rij en het onderblad De stappen; de rij Waar kun je dit doen? (gaat naar de Briefing, onder de kaart of de loopbandkaart); de drie groepskoppen; de knop Sluiten onderaan.

Weg van het scherm met het formulier: de uitklaprij Route en de knop Uitleg onderaan. Het scherm houdt zijn kop, getallen en stappen, zodat het ook zonder Briefing klopt.

Samen: de keuze waar je traint en de route; weer en kleding; de workout en de datavelden (al samen in Je horloge).

Blijft zoals het is: het blad Je horloge, de vier onderbladen, De avond ervoor, de vraag na een loop, Forge.

## 6. Uitgewerkt: standen per scherm

### De Briefing

- Laden: de kop, de keuze en de vier vakken staan er meteen. De kaart begint op het effen vlak met je plek en de regel "Zoeken naar een lus. Dat duurt hoogstens een halve minuut." De regels van de lus hebben een vaste hoogte, zodat de vakken niet verspringen als de lus er is.
- Eerste keer: op de plek van de kaart staat de eerste vraag (Precies of Ongeveer, of zoals Route-kaart 2 hem maakt), ongewijzigd. Bij Liever niet staat er één rij Zoek een lus en schuiven de vakken omhoog.
- Leeg: Route voorstellen uit, of nog geen routes voor deze sport: geen kaart, wel de vakken. Geen plaats ingesteld: de bestaande regel "Kies eerst een plaats".
- Fout: zonder netwerk en bij een routeplanner die te laat is de bestaande regels, met Opnieuw zoeken. Kan de telefoon de kaart niet tekenen, dan de bestaande regel en de lussen als tekst. Een lus die te kort is of de hoogtemeters niet haalt zegt dat in zijn eigen regel, in amber als het een melding is.
- Wisselen van plek: de kaart verschijnt of verdwijnt meteen, zonder beweging van de rest; in Vol een overgang van 200 ms, in Rustig en Uit direct. Een lopende zoektocht stopt als je van Buiten weg gaat.
- Eén mint accent: de gekozen lus op de kaart en de knop in de onderbalk. De gekozen plek is een gekozen keuze en mag mint zijn.
- Terug: sluit eerst een blad, dan de Briefing. De Briefing gaat door `useSheetClose`, zoals het trainingsscherm nu.

### Het blad Route (de volle kaart, achter Groter)

Het bestaande `RouteSheet`, met de kaart bovenaan en de lange zinnen achter een i. Standen zoals nu in `RoutePanel`.

### Vandaag en Week

Geen eigen laadstand: de knop en de rij zijn lokaal. Of de knop Briefing of Gedaan heet volgt uit één functie in de engine; weet die het nog niet (de koppeling wordt gelezen), dan staat er Gedaan, de veilige kant.

### Wat dit bewust niet doet

- Geen kaart op Vandaag en geen zoektocht bij het starten van de app.
- Het formulier, het concept en het opslaan van een log veranderen niet. De regels van Vanzelf afvinken ook niet.
- Geen nieuwe kleur, letter of token. De vakken zijn `Card`s, de keuze is `Chip`, de knoppen zijn de bestaande.
- Geen tab en geen losse pagina voor routes.
- Geen verandering aan hoe de planner zoekt, wat er de deur uit gaat, of de toestemming.
- Forge en kracht in MacroFactor blijven zoals ze zijn.
- De planning verandert nergens. Waar je traint, een route en de Briefing plannen niets.

## 7. Volgorde om te bouwen

Kleine sporen, elk met een eigen einde. Alles is schermwerk of tekst voor een scherm: Opus. Geen spoor raakt de planning, dus Fable is nergens nodig. Voor elk spoor: `src/storage/planGolden.test.ts` beweegt niet, `src/components/sheetDrag.scan.test.ts` blijft groen, `npm run kaart:vergelijk` met elk verschil verklaard, Lookout op 360 en 390 px.

1. Meteen, klein: geen route bij Loopband of binnen.
   - Bestanden: `src/engine/routeTarget.ts` (een functie die bij een training en een keuze zegt of er een route hoort, met test), `src/components/ExerciseLogger.tsx` (de voorwaarde van de rij).
   - Einde: kies Loopband, de rij is weg; kies Buiten, hij is terug.

2. Het blad Route met de kaart bovenaan, en nergens meer uitklappen. Wacht op Route-kaart 2 (dezelfde bestanden).
   - Bestanden: `src/components/RoutePanel.tsx`, `src/components/RouteProposalLine.tsx`, de aanroep in `ExerciseLogger.tsx`.
   - Niet bewegen: `engine/routePlanner.ts`, `storage/routeProposal.ts`, `storage/routeStart.ts`, `routeMapView.ts`, de eerste vraag, de meldingen bij een lus.
   - Einde: kaart, gekozen lus en knop staan boven de vouw van het blad; niets valt achter de onderbalk.

3. Waar je traint onthouden bij de geplande training.
   - Bestanden: `src/engine/trainingPlace.ts` (nieuw: de keuzes, de standaard, of er een route bij hoort), `src/storage/trainingPlace.ts` (nieuw: de keuze per geplande training, op het toestel), `ExerciseLogger.tsx` leest hem als beginwaarde.
   - Niet bewegen: `data/modalities.ts`, wat er in het log komt, de velden van het formulier per keuze.
   - Let op: een nieuwe bewaarde plek. Op het toestel en niet in de export is geen migratie nodig; moet hij in de back-up, dan wel een stap in `src/storage/migrations.ts`.
   - Einde: kies Loopband in Week, open Vandaag: geen route, en het formulier staat op Loopband.

4. Wat er op de Briefing staat, zonder scherm.
   - Bestanden: `src/engine/briefing.ts` (nieuw, puur): de stand (horloge vinkt af, of zelf invullen), de vier vakken met hun korte regel, wat er op de plek van de kaart staat, de knop in de onderbalk. Leest `watchSheet`, `routeTarget`, de weer- en kledingregels, de drinkregel van `eveningBefore`, de schakelaar Vanzelf afvinken, `sourceSilence`, en de uitzondering voor testloop en wedstrijd uit `autoTick`.
   - Einde: tests voor een loop met horloge, zonder horloge, loopband, testloop, een stille koppeling, geen weer, geen drinkregel.

5. Het scherm Briefing, eerst alleen vanuit Week.
   - Bestanden: `src/components/TrainingBriefing.tsx` (nieuw), `RouteMap.tsx` (een lagere stand en Groter), `SessionActionSheet.tsx` en `src/engine/sessionActions.ts` (de rij heet Briefing en opent het nieuwe scherm voor een training buiten te voet; al het andere houdt het oude scherm).
   - Niet bewegen: `ExerciseLogger.tsx`, het loggen, het blad Je horloge.
   - Instellingen: nieuw "Lus zoeken" (Bij het openen van de briefing, advies; Na een tik), in het blad Weer en kleding, met `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts` en `settingsHelp.ts`. De vier bestaande routeinstellingen blijven.
   - Einde: op 390 px staan kaart, lus en vier vakken boven de vouw; wisselen naar Loopband haalt de kaart weg; terug sluit laag voor laag.

6. Vandaag: de knop Briefing.
   - Bestanden: `TodayMissionCard.tsx`, `src/pages/Today.tsx` (de aanroep), een tekstkaart van Vandaag met een looptraining (die is er nog niet).
   - Niet bewegen: de titel, de getallen, de zone, de hoogtelijnen, de volgorde van de kaarten op Vandaag, de kaart die na de loop vraagt hoe het ging.
   - Einde: met koppeling één mint knop Briefing en Zelf afvinken in het menu; zonder koppeling Gedaan en de routerij.

7. Namen gelijk, het blad Waarom deze training opschonen, het dubbele in Week weg, de zin van De avond ervoor.
   - Bestanden: `src/engine/guideMenu.ts` en test, `TrainingGuideSheet.tsx`, `GuideRow.tsx`, `trainingGuideSheet.scan.test.ts` (het aantal onderbladen gaat bewust omlaag), `SessionActionSheet.tsx`, `TodayMissionCard.tsx`, `forge/ForgeSheets.tsx` (alleen de naam), `src/engine/eveningBefore.ts` en test.
   - Einde: een scan vindt "Meer over deze training", "Uitleg bij deze training" en "Hoe je het doet" nergens meer; het blad past zonder scrollen; de horlogestand staat één keer in het blad van Week.

8. Past het best.
   - Bestanden: `src/engine/routePlanner.ts` of een nieuw `src/engine/routeFit.ts`: een oordeel over de twee lussen uit wat er al is (afstand tegen de training, hoogtemeters tegen de training), met één regel waarom. De instelling Welke lus eerst krijgt de waarde "Wat het best past" als advies, in de drie instellingenbestanden.
   - Niet bewegen: hoe de lussen gezocht worden.
   - Einde: de gekozen lus zegt waarom, en dezelfde invoer geeft twee keer hetzelfde oordeel.

9. Alleen na ja op vraag 2: de lus van vandaag onthouden tot middernacht, op het toestel, niet in de back-up. Dit vervangt "een route wordt niet bewaard" en vraagt een eigen besluit.

10. Een hoogteprofiel onder de kaart: één smalle strook in de tokens met de stijging over de afstand. De bouwer gaat eerst na of elk punt van een lus een hoogte heeft.

11. Later, na de verfijning van de planner: routes voor wandelen en rugzaktraining (Kansen, voorstel 2). Het scherm staat er dan al.

Na spoor 2 is de klacht van vanochtend weg. Na spoor 6 werkt de app zoals de eigenaar traint. Spoor 8 tot 11 maken het beter, niet anders.

## Samenvatting

Het trainingsscherm is gebouwd als invulformulier met uitleg erboven, terwijl een loop met een gekoppelde Garmin vanzelf wordt afgevinkt en de eigenaar alleen vooraf iets wil zien. Het voorstel is een eigen scherm vooraf, de Briefing, voor elke training buiten te voet. Bovenaan kies je waar je traint; Buiten is de kaart met je lus en de hoogtemeters, Loopband heeft geen kaart. Daaronder vier vakken met het antwoord in beeld: wat je loopt, je horloge, weer en kleding, eten en drinken. De mint knop stuurt de lus naar Garmin Connect. Vandaag, Week en De avond ervoor zijn ingangen. Het formulier blijft als terugval onder de naam Zelf invullen en wordt niet verbouwd. Het blad achter de i wordt klein en heet Waarom deze training. Er komt geen kleur, token of tab bij, en de planning verandert nergens.

## Vragen voor de eigenaar

1. Mag de mint knop op Vandaag bij een loop of wandeling buiten Briefing heten in plaats van Gedaan, als je horloge gekoppeld is? Zelf afvinken staat dan in het menu achter de drie puntjes. Advies: ja, want je horloge vinkt hem af.
2. Mag de Briefing vanzelf een lus zoeken zodra je hem opent, voor vandaag en morgen, en mag de app die lus tot middernacht onthouden op je telefoon? Advies: ja op allebei. Het kost netwerk en je plek bij het openen, maar alleen op dit scherm en nooit bij het starten van de app. Nu wordt een route bewust nooit bewaard.
3. Zijn de namen goed: Briefing voor het scherm vooraf, Waarom deze training voor het blad achter de i, en Zelf invullen voor het formulier? Advies: ja.
4. Als je bij een training Loopband kiest, geldt dat alleen voor die training, of moet de app het de volgende keer weer voorstellen? Advies: alleen die training; de standaard blijft de beste keuze, meestal Buiten.
5. Begin je een lange wandeling of rugzaktraining meestal bij huis, of reis je naar een startpunt? Advies: eerst bij huis bouwen, met Start hier op de kaart voor als je elders begint.
