# Meerdere doelen en prioriteit: Hoofddoel, Belangrijk, Meedoen

Onderzoek van Scout Doelen op 26 oktober 2026, bij het besluit `docs/beslissingen/2026-10-26-kracht-en-berg-voor-iedereen.md`: doelen in een lijst die je sleept, met een label Hoofddoel, Belangrijk of Meedoen (de A, B en C van coaches). Dit stuk zegt wat coaches en apps met die labels doen, wat de wetenschap zegt over afbouw en herstel als twee doelen dicht bij elkaar liggen, hoe een vaste (deterministische) planner botsingen oplost, en geeft regels voor de engine. Alles hieronder is een voorstel, geen besluit.

Wat al onderzocht is, herhaal ik niet. De afbouw per doelsoort in dagen, het herstel na een wedstrijd en de gedeelde regel "belangrijkheid is de lengte van de afbouw" staan in `Doelsoorten duur.md` (gedeelde regel 2, hoofdstuk 3.3, 3.5, 4.3, 5.3 en 6.3). De tempoloop, de testloop en de wedstrijdweek van een tussendoel staan in `Tussendoel hardloopwedstrijd.md`. De afbouwdagen voor tochten, bergtochten en mountaineering staan in `Doelsoorten berg en buiten.md` (een ander onderzoek van dezelfde dag, nog niet vastgelegd; Hoofddoel 7 tot 14 dagen, Belangrijk 3 of 4). Dit stuk bouwt daarop voort en gaat over wat nieuw is: meer dan één doel, de afstand ertussen, doelen van verschillende soort, en wat de gebruiker te zien krijgt.

Sterkte van het bewijs, zoals in de rest van `docs/onderzoek/`: sterk (meta-analyse of meerdere consistente trials), matig (één goede trial, grote cohortstudie of goede review), zwak (kleine, korte of indirecte studie, of alleen een samenvatting), expert (coachpraktijk en handleidingen van apps, zonder directe toets), afgeleid (door mij geredeneerd uit de bronnen).

## In het kort

1. Alle bekeken apps doen hetzelfde met de labels: alleen het A-doel krijgt een volle afbouw en bepaalt de opbouw, een B-doel krijgt hooguit een paar dagen afbouw en een rustdag erna, een C-doel is een trainingsdag waar de rest omheen of doorheen loopt. Dat is coachpraktijk, geen onderzocht feit (expert).
2. Het principe achter de afbouw is wel stevig onderzocht: ongeveer twee weken, volume 41 tot 60% omlaag, intensiteit en frequentie gelijk (Bosquet 2007, sterk). Een afbouw van hoogstens een week werkt ook, minder diep (Wang 2023, matig). Voor een korte afbouw bij een Belangrijk-doel is dus steun.
3. Er is geen studie naar twee pieken dicht bij elkaar. Een review uit 2009 zegt dat expliciet (Pyne, Mujika en Reilly). Alle afstandsregels tussen doelen zijn coachpraktijk en de getallen lopen uiteen: 6, 8 en 12 weken tussen twee A-doelen, alle drie van TrainerRoad zelf.
4. Het herstel na een doel hangt af van wat je lichaam deed (afstand, duur, bergaf, meerdere dagen), niet van het label. Een Meedoen-marathon die je vol loopt kost evenveel spierschade als een Hoofddoel-marathon. Het label bepaalt dus afbouw en opbouw, niet het herstel.
5. Meerdaagse inspanning en bergaf herstellen trager dan de afstand doet vermoeden: dezelfde 169 km in vier dagen gaf langer aanhoudende spierverstoring dan in één keer (Besson 2020, matig), en na een bergultra van 166 km duurde het 16 dagen tot de spierfunctie weer op het uitgangspunt was (Millet 2011, matig).
6. Voor de engine: de minimale afstand tussen twee Hoofddoelen is het venster van de twee doelen bij elkaar (afbouw van het tweede, herstel van het eerste, 21 dagen heropbouw), met een ondergrens van 42 dagen en 56 dagen als gangbare uitkomst. Dat klopt met de acht weken van TrainerRoad en de twee maanden die trailcoaches noemen (afgeleid, getoetst aan expert).
7. Botst iets, dan lost de planner het op in een vaste volgorde: eerst de afbouw van het lagere doel inkorten, dan dat doel een stap lager zetten (Hoofddoel naar Belangrijk, Belangrijk naar Meedoen), en pas dan eerlijk zeggen dat het niet past. Altijd als voorstel met Akkoord, nooit stil.
8. In de lijst bepaalt het label de planning en de volgorde alleen wie het eerst wijkt als labels gelijk zijn. Sleep je een doel over een grens tussen labels, dan verandert het label mee. Zo kan de lijst zichzelf niet tegenspreken.
9. Gebruikers klagen vooral over labels die geen zichtbaar verschil maken (Athletica: "A, B en C tapers worden nu gelijk behandeld"), over B-doelen zonder eigen behandeling (TrainerRoad) en over wisselende regels. Dus: laat bij elk voorstel zien wat het label doet.
10. Wat ik niet kon vinden: Final Surge (geen documentatie over prioriteit), echte gebruikersoordelen over het B-doel van Runna, en de eigen tekst van Joe Friel. Zie "Wat dit niet onderbouwt".

## Wat de code nu doet

Gelezen in `src/engine/raceBlock.ts`, `src/engine/programLayout.ts`, `src/models/goals.ts`, `src/engine/trekTaper.ts` en `src/state/AppDataContext.tsx`. Niets is uitgevoerd of getest, behalve waar staat dat het uit de code gelezen is.

`TrainingGoalBase.planRole` kent drie waarden: `main`, `secondary` en `track`. Het hoofddoel is "het actieve doel met mijlpalen" (`programAnchorDate`, `planEndDay`); een ander hardloopdoel met afstand of streeftijd is standaard `secondary` (`goalPlanRole`), al het andere is `track`, alleen volgen. Alleen een tussendoel krijgt een blok van `RACE_BLOCK_WEEKS = 8` weken (tempoloop, testlopen 20, 9 en 4 weken ervoor, wedstrijdweek als korte afbouw, de dag erna een korte lange loop). Wat dit stuk daarbij ziet:

- Een `track`-doel krijgt niets in de planning, ook niet zijn wedstrijd op de dag zelf: de wedstrijd komt alleen in het plan via `applyRaceBlocks`, en dat loopt over de blokken van tussendoelen. "Meedoen als training" bestaat dus nog niet, en moet een klein eigen geval worden (de wedstrijd op zijn dag, zonder blok).
- `raceBlocks` neemt alleen doelen die vóór het anker (de datum van het hoofddoel) liggen. Een doel na het hoofddoel doet niets. `planEndDay` laat de planning ook op het hoofddoel eindigen, tenzij "Na je hoofddoel" op onderhoud staat. Een tweede hoofddoel met een eigen cyclus bestaat niet.
- Er is geen afstandscontrole tussen doelen. Twee tussendoelen binnen acht weken van elkaar geven twee overlappende blokken; `blocks.find(...)` in `qualitySlots` en `saturdayTemplate` pakt dan het eerste blok. Het gedrag van overlap is dus ongedefinieerd (uit de code gelezen, niet getest).
- Herstel na een wedstrijd is alleen de dag erna: `AFTER_RACE_SHORT` maakt de lange loop of bergtocht dan de korte versie. Dat is minder dan `Doelsoorten duur.md` hoofdstuk 3.5 voorstelt (2 tot 14 dagen).
- `programLayout.ts` telt de fasen terug vanaf het hoofddoel: afbouw 2 weken bij 8 weken of meer, 1 week bij 3 tot 7, anders 0 (instelbaar tot 3). Alle fasen sluiten op één datum.
- Tochten hebben al een eigen tweetrapsbelang, los van `planRole`: `TrekImportance = 'training' | 'goal'` in `models/leave.ts`, met 1 lichte dag bij "training" en 2, 3 of 4 lichte dagen bij "goal" (`trekLightDaysBefore`). Dat is een voorloper van Belangrijk en Meedoen en moet bij de nieuwe labels samenkomen, anders heeft een tocht twee schuiven.
- De wissel van rol loopt al via een voorstel met Akkoord (`planGoalRole`), dus het mechanisme voor "geen stille keuze" staat er.

## Deel 1. Wat coaches en apps doen

### De drie labels in de praktijk

**TrainerRoad.** De Plan Builder vraagt bij elk evenement een prioriteit ([Help Center: A, B, C-races](https://support.trainerroad.com/hc/en-us/articles/360016099031-Add-A-B-C-Priority-Races)).
- A: "ongeveer één of twee per jaar", afbouw van ongeveer twee weken, en een openingstraining de dag ervoor.
- B: geen afbouw, wel een openingstraining de dag ervoor. Het is een repetitie voor voeding en wedstrijdaanpak, je bent niet op je top.
- C: "geen afbouw", je traint erdoorheen. De geplande trainingen van die dag worden verwijderd. Plan hem het liefst na een rustige of vrije dag.
- Een medewerker bevestigt in het forum: "We plannen geen afbouw voor B of C" ([forum](https://www.trainerroad.com/forum/t/help-building-training-plan-with-multiple-races/112038)). Het bewijs voor deze verdeling is expert.

**TrainingPeaks en Joe Friel.** In het Annual Training Plan geef je elk evenement een A tot C. De gids zegt dat B en C niet vanzelf een piek veroorzaken, dat C "geen piek of aanpassing" vraagt, en dat je beperkingen zoals een vakantie als C-evenement kunt invoeren ([TrainingPeaks, Annual Training Plan](https://www.trainingpeaks.com/learn/articles/the-comprehensive-guide-to-creating-an-annual-training-plan/)). De standaardduur van de perioden volgt Friel: overgang 1 tot 6 weken, voorbereiding 3 tot 4, basis 8 tot 12, opbouw 6 tot 8, piek 1 tot 2, wedstrijd 1 tot 3. De automatische periodisering vraagt minstens één A-wedstrijd, en A-wedstrijden mogen hoogstens 32 weken uit elkaar liggen. Dat laatste is een bovengrens, geen minimum. De eigen tekst van Friel kon ik niet openen; secundaire bronnen noemen 1 tot 2 A-wedstrijden, 2 tot 4 B en "een handvol" C per seizoen ([MyProCoach](https://support.myprocoach.net/hc/en-us/articles/360002272411-Get-the-Most-from-Your-Race-Season-with-A-B-and-C-Races)). Het TrainingPeaks Help Center gaf bij mij een 403, dus de detailpagina over ATP-methoden is niet gelezen.

**Runna.** Alleen het B-doel bestaat als aparte toevoeging bij een hoofddoel ([B-race toevoegen en beheren](https://support.runna.com/en/articles/10856802-how-to-add-and-manage-your-b-race)). Het plan "taperen vooraf en herstelt erna":
- de week ervoor kan de deload-week eerder komen of het volume iets zakken;
- in de B-wedstrijdweek zijn er minder loopjes en komen er taper-intervallen;
- de week erna zijn er extra rustdagen en een lichtere eerste training;
- de impact heet "Training Disruption" en is laag, middel of hoog.

Het herstel schaalt met de zwaarte: "hoe zwaarder het B-doel, hoe gestructureerder het herstel", van één rustigere dag tot meerdere rust- of makkelijke dagen ([Runna over herstel](https://support.runna.com/en/articles/15272605-how-does-runna-build-recovery-into-your-training-plan)). Dat bevestigt mijn punt hieronder: herstel volgt de belasting, niet het label. Runna kent drie manieren om een B-doel te lopen: voor de lol, sterk en gestaag, of alles geven. De A-afbouw is 3 weken bij een halve marathon of langer of een plan van 10 weken of meer, anders 2 weken. Expert.

**Stryd.** Hier zit de duidelijkste harde regel: "slechts één Event A tegelijk actief". Afbouw voor A: 5 tot 10 km 1 week, halve marathon 1 week (4 tot 8 weken training) of 2 weken (8 weken of meer), marathon 1, 2 of 3 weken bij 4 tot 8, 8 tot 16 en 16 weken of meer. B: geen eigen blok, wel twee kleine wijzigingen: twee dagen ervoor wordt elke geplande loop een makkelijke loop, en de dag erna komt één makkelijke herstelloop erbij. C: een gewone trainingsdag. Onder 4 weken tot de wedstrijd is er helemaal geen formele afbouw ([Stryd Help Center](https://help.stryd.com/en/articles/13612408-adaptive-training-supports-event-a-races)). Expert.

**Athletica.** Het algoritme optimaliseert eerst voor A en "subtiel" voor B en C. Een medewerker erkent in 2025: "A-, B- en C-tapers worden nu gelijk behandeld (aanpassingen volgen)" ([forum](https://forum.athletica.ai/t/question-about-training-plans-and-race-prioritization/2403)). Voor een C-doel is het advies hem uit het sjabloon te halen en de sleutelsessies naar de wedstrijddag te verplaatsen.

**Garmin.** Garmin Connect gebruikt geen A, B, C maar "primair" en "ondersteunend"; voeg je meer dan één wedstrijd toe, dan moet je een primaire kiezen ([Garmin: Race Calendar and Primary Race](https://www8.garmin.com/manuals/webhelp/GUID-CF6857C0-CEF9-485F-B3B4-B8DC192FA66A/EN-US/GUID-8186A9FE-DFC1-4DC3-89B2-221883A60B6A.html)). Het is een label voor weergave (aftelling, voorspelde tijd, weer), niet voor planning. Bij Garmin Coach heb ik niets over meerdere doelen gevonden.

**Uphill Athlete.** De afbouwtekst zegt: 10 tot 14 dagen sterk verminderd volume voor een 100-milesrace met weken van 60 mijl of meer, korter voor kortere races, volume ongeveer 25% per week omlaag met behoud van wat intensiteit. B- en C-doelen: "minimaal" afbouwen, het zijn trainingsevenementen ([Uphill Athlete, afbouwen](https://www.uphillathlete.com/tapering-for-race-event-what-to-do/)). In het forum zegt een coach dat twee tot drie weken tussen races een korte opbouw mogelijk maken, dat een lager doel vóór een hoofddoel de zware sessie van die week kan zijn, en dat bij twee prioriteitsweekenden achter elkaar alleen onderhoudsweken passen: één zware sessie, een rustige aerobe dag, techniek en herstel ([forum](https://uphillathlete.com/?p=14618)). Expert.

**Final Surge.** Ik vond geen documentatie over race-prioriteit. Alleen kalenderlabels voor een periode (zoals vakantie of afbouw) en beschikbaarheid van de atleet. Dit blijft dus open.

**Overig.** TriDot gebruikt A, B en C, en laat een datum "Unavailable" zien als hij niet haalbaar is (alleen uit een zoekresultaat, de pagina gaf een 403). IntervalCoach waarschuwt als races "te dicht op elkaar zitten om voor beide te pieken" en laat herstelblokken tussen races zien in een seizoenslijn ([IntervalCoach](https://intervalcoach.featurebase.app/p/season-plan-see-your-whole-year-with-multiple-goal-races)). URUNN: één sleutelrace krijgt voorrang, de rest past erin als opbouw, bijvoorbeeld een 10 km voor een marathon ([URUNN](https://intercom.help/urunn/en/articles/16393939-training-for-multiple-races)).

### Hoeveel A-doelen per seizoen

Eén of twee is de gangbare regel (TrainerRoad, MyProCoach, Roadman). Roadman noemt drie "het absolute maximum voor de meeste amateurs" ([Roadman](https://roadmancycling.com/answers/planning-a-b-c-races)). Bij ultralopen is het strenger: hoogstens één 100-milesrace per seizoen, twee als ze minstens twee maanden uit elkaar liggen, en hoogstens drie 50-milers ([Trail Runner Magazine](https://www.trailrunnermag.com/training/how-to-plan-your-racing-season-without-overdoing-it/)). Voor B: 2 tot 4 per seizoen (MyProCoach), of 1 tot 2 per trainingscyclus (Runna). Voor C geen grens. Expert, maar de bronnen zijn het onderling eens.

### De afstand tussen twee A-doelen

De bronnen spreken elkaar tegen, ook binnen één bedrijf:
- TrainerRoad Help Center, A, B, C-pagina: minstens 12 weken ([bron](https://support.trainerroad.com/hc/en-us/articles/360016099031-Add-A-B-C-Priority-Races)).
- TrainerRoad Help Center, Plan Builder: minstens 8 weken; binnen 8 weken maak je de minder belangrijke een B ([bron](https://support.trainerroad.com/hc/en-us/articles/360037666312)).
- TrainerRoad medewerker in het forum: "we hebben besloten dat 6 weken tussen evenementen het beste is" om te pieken, maar tegelijk werd een race een dag onder de 8 weken geweigerd ([forum](https://www.trainerroad.com/forum/t/choosing-a-and-b-events-in-a-short-season/95086)).
- Trailcoaches: twee maanden tussen twee 100-milers, een training-50-miler hoogstens twee maanden voor een goal-100-miler, zes tot acht weken zonder racen voor een goal-50-miler (Meltzer), een marathon of 50 km minstens drie tot vier weken voor een goal-50-km (Sharman) ([Trail Runner Magazine](https://www.trailrunnermag.com/training/how-to-plan-your-racing-season-without-overdoing-it/)).
- Roadman: een piek duurt 7 tot 14 dagen, evenementen binnen dat venster kunnen één piek delen ([Roadman](https://roadmancycling.com/answers/planning-a-b-c-races)).
- Een gebruiker op het forum merkt op dat een race die je twee weken na een piek toevoegt nooit een A kan worden (uit een zoekresultaat over TrainerRoad-forumdraden, de draad zelf niet geopend).

Conclusie: er is geen onderzocht getal. Het bereik is 6 tot 12 weken, met 8 weken als meest genoemde standaard (expert). Voor korte races, zoals 5 en 10 km, is minder genoeg, voor een marathon of ultra meer.

### Opbouw voor een tweede doel

TrainerRoad geeft drie situaties ([blog over meerdere doelen](https://www.trainerroad.com/blog/how-to-adjust-your-training-when-you-have-more-than-one-goal-event-2/)). Bij een reeks wedstrijden kun je niet de hele reeks op je top zijn: kies A en B, houd het onderhoud op een herhaalde afbouwweek met "vaak maar 1 tot 2 dagen intensiteit per week", en plan bij een reeks langer dan 8 weken een dip. Liggen de evenementen dicht genoeg om je plan te verkorten, doe dan een "herbouw": een deel van de opbouwfase herhalen. Liggen ze ver genoeg uit elkaar om opnieuw te beginnen, kort dan elke fase in (6 weken basis in plaats van 12, de helft van de opbouw) en plan een pauze tussen de cycli: "het is onmogelijk om meer dan één keer per jaar een volledige cyclus van 28 weken te doen". Een weekje rustig of leuk fietsen na een hoofddoel, en niet langer dan een week helemaal van de fiets. Expert.

### Wat gebruikers ervan vinden

Weinig onderzocht, maar de klachten wijzen één kant op:
- De labels moeten zichtbaar iets doen. Gebruikers van Athletica zien geen verschil tussen B en C ("de afbouw is in de plan builder hetzelfde") en vragen zich af of weken zonder zwemmen of fietsen voor een B-race verstandig zijn ([forum](https://forum.athletica.ai/t/b-vs-c-race-whats-the-difference/1185)).
- Een B-doel krijgt van TrainerRoad "geen bijzondere behandeling" en kan een zware rit twee dagen ervoor bevatten, en herstelweken komen op vreemde plekken ([forum](https://www.trainerroad.com/forum/t/this-plan-builder-cannot-be-correct/98512)).
- Een gebruiker zag bij het wisselen van B naar A een andere afbouw dan verwacht (uit een zoekresultaat over TrainerRoad-forumdraden, de draad zelf niet geopend). Wie van label wisselt wil dus vooraf zien wat dat doet.
- De regel van 6, 8 of 12 weken is niet voorspelbaar. Een gebruiker kreeg een A-doel een dag onder de grens geweigerd.
- Bij intervals.icu komen B- en C-wedstrijden die als oefentraining met geplande belasting zijn ingevoerd niet in de planweergave en tellen niet in de weektotalen mee ([forum](https://forum.intervals.icu/t/quick-view-of-races-on-calendar/52320)). Een Meedoen-doel moet dus ook meetellen in de weekbelasting.
- Over het B-doel van Runna vond ik geen onafhankelijke gebruikersoordelen. Ik meld dat liever dan het te raden.

### Hoe de apps het tonen

Een lijst met een letter of kleur per evenement (TrainerRoad, Garmin, intervals.icu met een A/B/C-pictogram in een uitklaplijst), een tijdlijn per jaar met de weken ertussen zichtbaar (TrainingPeaks, IntervalCoach), een toevoegscherm dat zegt wanneer het kan (Runna: "de optimale periode voor een B-race"; TriDot: "Unavailable"), en een reden bij een weigering (Runna blokkeert een B-race in de A-afbouw, te vroeg, te lang, of die een sleuteltraining of de minimale A-afstand in de weg zit; [Runna](https://support.runna.com/en/articles/10856802-how-to-add-and-manage-your-b-race)). Slepen om volgorde of prioriteit te veranderen vond ik nergens; de enige sleepbeweging in TrainingPeaks is het schuiven van blokken in de ATP-grafiek. De sleeplijst is dus een eigen ontwerpkeuze van ASCEND (afgeleid), niet iets dat al bewezen werkt.

## Deel 2. Wat de wetenschap zegt

### Afbouw: lengte en volume

De beste samenvatting blijft [Bosquet e.a. 2007](https://pubmed.ncbi.nlm.nih.gov/17762369/): 27 studies van 182 bij zwemmers, fietsers en lopers. De beste afbouw duurt twee weken (effect 0,59), met het volume exponentieel 41 tot 60% omlaag (0,72), zonder de intensiteit (0,33) of frequentie (0,35) te veranderen. Sterk voor het principe. Een nieuwere meta-analyse bij duursporters (14 studies) bevestigt dat een afbouw van hoogstens 21 dagen werkt, ook die van 7 dagen of korter, die van 8 tot 14 en die van 15 tot 21 dagen, en dat een overbelastingsweek vóór de afbouw extra helpt ([Wang e.a. 2023](https://pubmed.ncbi.nlm.nih.gov/37163550/)). Matig. Voor de regel van de Belangrijk-doelen is vooral dit laatste belangrijk: een korte afbouw is niet nutteloos. De winst is gemiddeld ongeveer 3% (gebruikelijk 0,5 tot 6%) ([Le Meur, Hausswirth en Mujika 2012](https://www.em-consulte.com/article/709136/resume/tapering-for-competition-a-review), alleen samenvatting gelezen). Bij 158.000 recreatieve marathonlopers hing een strikte afbouw van 3 weken samen met 2,6% snellere tijden dan een losse van 1 week ([Smyth en Lawlor 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8506252), matig, observationeel).

### Meerdere pieken: er is geen onderzoek

De enige zin die hierover in de literatuur staat is een beperking. Een review uit 2009 noemt de nadruk op één wedstrijd, tegenover meervoudig pieken voor wekelijkse, meerdaagse of meerdere evenementen, een belangrijke tekortkoming van het onderzoek ([Pyne, Mujika en Reilly 2009](https://researchportalplus.anu.edu.au/en/publications/peaking-for-optimal-performance-research-limitations-and-future-d/)); in 2012 zegt dezelfde groep dat de methode voor meervoudig pieken nog ontwikkeld moet worden (Le Meur e.a., zelfde link als hierboven). Een triatlonreview noemt een optimale afbouwduur die per atleet tussen 4 en 28 dagen valt (Mujika). Gevolg voor ASCEND: elke regel over twee A-doelen dicht bij elkaar is expert of afgeleid. Dat moet in de app ook zo staan ("een richtlijn van coaches, geen studie").

### Wat je in korte tijd niet verliest

Een korte onderbreking van de opbouw kost weinig, mits de intensiteit blijft. Duurprestatie blijft tot 15 weken behouden met maar 2 trainingen per week of 33 tot 66% minder volume, zolang de intensiteit gelijk blijft ([Spiering e.a. 2021](https://pubmed.ncbi.nlm.nih.gov/33629972/), matig, narratieve review). Bij getrainde atleten daalt de VO2max al bij minder dan 4 weken onvoldoende prikkel snel, bij recreanten minder ([Mujika en Padilla 2000, deel I](https://pubmed.ncbi.nlm.nih.gov/10966148/), matig). Voor de planner betekent dit: een afbouw of hersteldagen tussen twee doelen kosten weinig conditie als de intensiteit even terugkomt. Dat steunt het idee om tussen twee doelen "onderhoud met intensiteit" te plannen in plaats van opnieuw te beginnen (de herhaalde afbouwweek van TrainerRoad).

### Herstel na een wedstrijd

- Marathon. Acht elite-lopers (2:35): de kracht van de strekspieren daalde 22% en die van de kuitspieren 17%; de sprongkracht was nog 13% lager direct erna, 18% na twee dagen en 12% na vijf dagen ([Petersen e.a. 2007](https://pubmed.ncbi.nlm.nih.gov/17661071/), zwak, acht personen). Bij 64 recreatieve finishers deed een rustig loopje van 40 minuten na 48, 96 en 144 uur de spierschade niet toenemen, en na 96 uur sprongen ze 8% hoger dan bij alleen rust ([Martínez-Navarro e.a. 2021](https://pubmed.ncbi.nlm.nih.gov/33251988/), matig). Dat past bij `Doelsoorten duur.md` hoofdstuk 3.5 ("de eerste loop pas na 48 uur") en zegt dat een rustig loopje daarna niet schaadt.
- Bergaf telt zwaarder. Bij de Comrades Marathon bleef het CK in het bloed tot 5 dagen verhoogd en de spierpijn tot 7 dagen, hoger na de afdalende dan na de klimmende editie ([Comrades up en down](https://open.uct.ac.za/handle/11427/27773), zwak, kleine groepen).
- Ultra van 161 km (72 finishers). Spierpijn en vermoeidheid waren na 5 dagen terug, maar een sprint van 400 meter was nog 26% trager op dag 3 en 12% op dag 5 ([Hoffman e.a. 2017](https://pubmed.ncbi.nlm.nih.gov/27167683/), matig).
- Bergultra van 166 km. De spierkracht daalde 35% (strekspier) en 39% (kuit). Het grootste deel kwam binnen 9 dagen terug, het uitgangspunt werd pas op dag 16 gehaald ([Millet e.a. 2011](https://pmc.ncbi.nlm.nih.gov/articles/3043077), matig voor het patroon, kleine groep). `Doelsoorten duur.md` hoofdstuk 3.5 noemt een ultraloop van 11 dagen met 28 tot 36% krachtverlies en 9 dagen herstel; ik kon dat cijfer niet terugvinden en Millet zegt 16 dagen voor volledig herstel. Eén van de twee teksten moet nagekeken worden voor de regel gebouwd wordt.
- Eén ultraloper na een Everesting (9349 hoogtemeters in 18 uur): de eerste fase daalde mee met CK en ontsteking, de tweede, langere fase (een maand) kwam door een lagere drempel, 17% lagere VO2 en 15% hogere loopkosten ([Ušaj e.a. 2023](https://pubmed.ncbi.nlm.nih.gov/37895328/), zwak, één persoon). Het geeft een eerlijke waarschuwing: blijvende vermoeidheid na een zeer zware dag zit niet in bloedwaarden.

### Meerdere dagen achter elkaar

Dit is voor een tocht van meerdere dagen het dichtst bij wat we weten. Dezelfde 169 km, in één keer of in vier dagen van 40 km, gaf bij 31 lopers een andere vermoeidheid: één keer gaf meer centrale vermoeidheid (direct erna), vier dagen gaf een langer durende verstoring van de spiercontractie zelf (gemeten tot 10 dagen erna) ([Besson e.a. 2020](https://pubmed.ncbi.nlm.nih.gov/32079919/), matig, rennen en geen wandelen). Een meerdaagse tocht met rugzak is dus niet makkelijker te herstellen dan een wedstrijd van dezelfde afstand, en de dagen zelf weerspiegelen niet het herstel. Over wandelen met bepakking over meerdere dagen vond ik geen herstelstudie; trekkingstokken verminderden de spierpijn en het krachtverlies 24 tot 72 uur na een bergtocht (uit het abstract, [RCT](https://pubmed.ncbi.nlm.nih.gov/20473229/), matig). Voor het herstel na een tocht bestaat dus geen eigen getal; de regel hieronder is afgeleid.

### Verschillende soorten doelen naast elkaar

Een fietswedstrijd naast een hardloopdoel. Fietsen heeft geen remmend deel en weinig impact, dus minder schade aan de spieren. De meta-analyse naar gelijktijdig trainen vond dat hardlopen bij kracht meer interferentie geeft dan fietsen ([Wilson e.a. 2012](https://search.pedro.org.au/search-results/record-detail/34457), de samenvatting; het verband met spierschade is een uitleg van blogs, niet van de studie). Het steunt de gedachte dat een fietsdoel de benen minder belast voor een loopdoel dan een tweede loopdoel, maar het bewijs is indirect (zwak, afgeleid). Wat een fietswedstrijd wel altijd kost is energie (glycogeen) en algemene vermoeidheid, dus de afbouw van het tweede doel telt altijd volledig mee.

Een trailrun drie weken vóór een tocht. Een trailrun heeft bergaf en dus spierschade, en een tocht heeft juist veel dagen na elkaar nodig. Rekenvoorbeeld in dagen: de tocht heeft een afbouw van 4 lichte dagen, voor een trailrun van 50 km is het herstel ongeveer 7 dagen (afgeleid van de studies hierboven), en je wilt minstens een week gewone opbouw ertussen. Dat is 18 dagen, en je hebt er 21. Het past dus, mits de trailrun rustig of Belangrijk is. Een bergultra van 100 km of meer (16 dagen tot normaal) past niet: 16 plus 4 plus 7 is 27 dagen. Dat is het soort botsing dat de planner moet zien en eerlijk melden.

## Deel 3. Botsingen oplossen in een vaste planner

### Wat een planner kan zeggen

Een deterministische planner heeft drie eerlijke uitkomsten, in deze volgorde: het past zoals het is, het past als iets korter of lichter wordt, het past niet en jij kiest. Elke andere uitkomst (stil iets laten vallen, stil de volgorde omdraaien) is wat gebruikers bij andere apps afkeuren. Dat sluit aan bij de lijn van het besluit: "ASCEND plant het zo goed mogelijk in, en zegt eerlijk wat niet past".

### Hoe andere planners het doen

- TrainerRoad: een A binnen 8 weken van een andere A wordt geweigerd, de gebruiker maakt er een B van, en een B krijgt alleen een openingstraining.
- Runna: de app blokkeert een B-race die in de A-afbouw valt, te vroeg komt, een sleuteltraining of de minimale A-afstand in de weg zit, of langer is dan de A. Gelijke afstand wordt afgeraden, "voor de lol" verlaagt de impact, en elke race krijgt een verstoringsniveau.
- Stryd: één A tegelijk, B en C alleen met kleine veranderingen rond de dag zelf, onder 4 weken geen afbouw.
- TriDot: de datum is "niet beschikbaar" als het niet haalbaar is.
- IntervalCoach: waarschuwt, laat het toe.

Wat ze niet doen en wat ASCEND wel kan: uitleggen waarom, een stap lager voorstellen en laten zien wat dat in de week verandert (`ProposalSheet` laat al zien wat een voorstel doet, en de preview draait dezelfde planningsronde, `planPass`).

## Deel 4. Regels voor de engine

Elke regel: regel, reden, bewijs. Dagen komen uit `Doelsoorten duur.md` (afbouw per soort en herstel per afstand). Een dag meer of minder is hier niet onderzocht; de getallen horen als instelling met het advies als standaard (werkafspraak "Instellingen"). Alle voorgestelde wijzigingen aan de planning gaan via een voorstel met Akkoord.

**Regel 1: het label bepaalt de afbouw, de opbouw en wat de wedstrijddag is.**
Regel: Hoofddoel krijgt de volle afbouw van de soort en de volle opbouw (fasen terugtellend vanaf de datum). Belangrijk krijgt een korte afbouw (een derde tot de helft, 3 tot 7 dagen) en het wedstrijdblok van de soort, maar geen eigen fasen; de dag ervoor een lichte openingstraining en de dag erna een rustige dag. Meedoen krijgt geen afbouw en geen blok: de wedstrijd komt op zijn dag in het plan en vervangt de zwaarste training van die dag of week.
Reden: zo doen alle bekeken apps het (TrainerRoad, Runna, Stryd, MyProCoach); het principe van afbouw is sterk onderbouwd en een korte afbouw werkt ook (Bosquet 2007; Wang 2023).
Bewijs: sterk voor het principe, expert voor de verdeling per label. Nu bestaat Meedoen (alleen volgen, `track`) nog niet als wedstrijd op zijn dag (zie "Wat de code nu doet").

**Regel 2: het herstel na een doel volgt de belasting, niet het label.**
Regel: het aantal dagen zonder harde training en zonder zware beenkracht na een doel is dat van de soort en afstand (`Doelsoorten duur.md`: 5 km 2 tot 3, 10 km 3 tot 5, halve marathon 5 tot 7, marathon 7 tot 14, triatlon 3 tot 10). Voor trailruns en bergultra's: 50 km ongeveer 7 dagen, 100 km of meer 9 dagen geen harde training en 16 dagen voor een nieuw zwaar blok. Voor meerdaagse tochten van 3 dagen of meer: minstens 5 dagen zonder harde training en zonder zware beenkracht, bij 7 dagen of meer minstens 10 tot 14 dagen. Kiest de gebruiker bij een Meedoen-doel "rustig meedoen", dan de helft van die dagen. De eerste lichte training kan na 48 uur. Is het log zwaarder dan gepland (duur of hoogtemeters), dan telt het log, want de planning verandert nooit het verleden.
Reden: spierfunctie herstelt over dagen tot weken en hangt af van afstand, bergaf en het aantal dagen, niet van wat de gebruiker het doel noemt. Een rustig loopje na 48 uur schaadt niet.
Bewijs: matig voor de aard (Petersen 2007, Martínez-Navarro 2021, Hoffman 2017, Millet 2011, Besson 2020); expert voor de dagen per afstand; afgeleid voor de dagen bij trailruns en bergultra's, voor tochten van meerdere dagen en voor de helft bij rustig meedoen (Runna's "voor de lol" verlaagt de impact; Runna's herstel schaalt met de moeilijkheid).

**Regel 3: de minimale afstand tussen twee Hoofddoelen.**
Regel: de afstand in dagen tussen twee Hoofddoelen is minstens het grootste van 42 en de som van drie delen: het herstel van het eerste (regel 2), 21 dagen heropbouw, en de afbouw van het tweede. Voor twee marathons: 14 plus 21 plus 21 is 56 dagen. Voor twee 10 km: 5 plus 21 plus 10 is 36, dus de ondergrens van 42. Voor twee 100 km-trailruns: 16 plus 21 plus 21 is 58, ongeveer de twee maanden van trailcoaches. De drie dagen waarden en de 42 zijn instelbaar, met het advies als standaard.
Reden: de bronnen noemen 6, 8 en 12 weken en twee maanden voor ultra's; de som geeft dezelfde orde van grootte per soort, en legt uit waaruit de afstand bestaat, zodat de gebruiker ziet waarom.
Bewijs: expert voor de uitkomst, afgeleid voor de berekening. Er is geen studie naar twee pieken (Pyne 2009).

**Regel 4: een Belangrijk-doel vóór een Hoofddoel heeft zijn eigen venster.**
Regel: een Belangrijk-doel mag niet in de afbouw van een Hoofddoel vallen en niet binnen 10 dagen ervoor. Verder: afstand tussen het Belangrijk-doel en het Hoofddoel is minstens het herstel van het Belangrijk-doel, plus 7 dagen gewone training, plus de afbouw van het Hoofddoel. Voor een 10 km vóór een halve marathon: 4 plus 7 plus 12 is ongeveer 23 dagen, dus 3 tot 4 weken. Voor een halve marathon vóór een marathon: 6 plus 7 plus 21 is 34 dagen. Een Belangrijk-doel mag ook niet groter zijn dan het Hoofddoel in verwachte beenbelasting (duur maal soortfactor): is hij dat wel, dan vraagt het voorstel of dat het Hoofddoel moet zijn.
Reden: Runna zegt 3 tot 6 weken vóór een halve marathon en 4 tot 8 weken vóór een marathon, en blokkeert een B in de A-afbouw of langer dan de A; trailcoaches zeggen 3 tot 4 weken (marathon vóór 50 km) en 6 tot 8 weken zonder racen voor een 50-miler. De som geeft hetzelfde bereik.
Bewijs: expert (meerdere bronnen die samenvallen), afgeleid voor de formule.

**Regel 5: doelen van verschillende soort tellen de benen naar overlap.**
Regel: het herstel van het eerste doel telt in regel 3 en 4 voor het volle aantal dagen als beide doelen lopen, bergtocht of trail zijn; voor een fietsdoel naast een loop- of berg-doel geldt de helft van het herstel (de afbouw van het tweede doel telt altijd volledig). De factor is een instelling en komt uit de kenmerken uit `ASCEND voor iedereen.md` (impact en remmen), zodat een nieuwe soort vanzelf een waarde krijgt.
Reden: bergaf en impact geven de spierschade die dagen duurt; fietsen heeft dat nauwelijks. Hardlopen geeft meer interferentie met kracht dan fietsen.
Bewijs: zwak en afgeleid.

**Regel 6: eerst inkorten, dan een stap lager, dan eerlijk melden.**
Regel: past een doel niet volgens regel 3 of 4, dan probeert de planner in deze volgorde, en stopt zodra het past:
1. de afbouw van het lagere doel inkorten, hoogstens tot de ondergrens: Belangrijk 3 dagen, Hoofddoel 7 dagen (nooit onder een week);
2. het lagere doel een stap lager zetten: Hoofddoel naar Belangrijk, Belangrijk naar Meedoen;
3. past het dan nog niet (bijvoorbeeld een Meedoen in de afbouw van een Hoofddoel), dan blijft het doel staan als een rustige deelname, houdt de planner de dagen eromheen licht, en zegt dat hij dat doet. De gebruiker kan het ook op "Alleen volgen" zetten (geen training, alleen op de kalender);
4. past het plan niet binnen de vaste grenzen (veiligheid, 48 uur tussen zware beendagen, `weekValidator`), dan zegt de planner dat en verandert hij de grenzen niet.
Welk doel een stap lager gaat: het doel met het laagste label; bij gelijk label het doel dat lager in de lijst staat; staan ze ook gelijk in de lijst, het doel dat later in de tijd ligt, omdat het plan dan toewerkt naar het eerste.
Reden: TrainerRoad zegt "maak er een B van"; Runna blokkeert; Stryd laat één A tegelijk toe; een afbouw van hoogstens een week verbetert nog steeds de prestatie.
Bewijs: expert (apps), matig voor het inkorten (Wang 2023, subgroep van 7 dagen of korter), afgeleid voor de volgorde.

**Regel 7: een B naar C maken is een voorstel, geen stille keuze.**
Regel: elke automatische verandering van een label, datum of afbouw komt als voorstel met Akkoord (zoals `planGoalRole` al doet), met de zin waarin staat wat er verandert en waarom, en wat het in de week doet ("Liever niet" laat de labels staan; de planner plant dan zo goed als kan en zegt wat niet past). Een label dat jij zelf zet verandert niet door de planner zonder vraag. Een wijziging van een label door de gebruiker toont altijd eerst wat die doet (afbouw, wedstrijdblok, herstel in dagen).
Reden: gebruikers klagen over labels zonder zichtbaar effect en over een afbouw die veranderde na een labelwissel (TrainerRoad, Athletica); het werkafspraak dat de planning van de gebruiker nooit stil verandert.
Bewijs: expert.

**Regel 8: het label bepaalt de planning, de volgorde alleen de voorrang.**
Regel: het label bepaalt afbouw, opbouw en herstel. De volgorde in de lijst beslist alleen bij gelijk label wie wijkt (regel 6) en welk Hoofddoel in beeld staat op Vandaag en Ascend (het eerstvolgende Hoofddoel op datum). Sleep je een doel over de grens van een label heen, dan neemt het het label van die groep over; de lijst is in drie groepen verdeeld, zodat een Meedoen nooit boven een Hoofddoel kan staan zonder dat het opvalt.
Reden: twee signalen die elkaar kunnen tegenspreken geven een onvoorspelbare planner; de decision `2026-10-26-kracht-en-berg-voor-iedereen.md` zegt dat slepen de volgorde bepaalt en het label de afbouw.
Bewijs: afgeleid (ontwerpkeuze, geen app die ik zag doet dit).

**Regel 9: één cyclus per Hoofddoel, met herstel ertussen.**
Regel: de planning werkt toe naar het eerstvolgende Hoofddoel (nu het anker van `programLayout`). Na zijn datum volgt een herstelblok (regel 2) en daarna een verkorte cyclus naar het volgende Hoofddoel: fasen terugtellend vanaf dat doel, met de basis en opbouw ingekort tot wat past (TrainerRoad: 6 weken basis in plaats van 12, de helft van de opbouw), met onderhoud met intensiteit als de afstand klein is. De instelling "Na je hoofddoel" geldt alleen na het laatste Hoofddoel.
Reden: een volledige cyclus van ongeveer 28 weken lukt hooguit één keer per jaar; wie twee doelen heeft, heeft een kortere tweede cyclus; conditie blijft behouden met intensiteit bij minder volume (Spiering 2021).
Bewijs: expert voor de cyclus, matig voor het onderhoud.

**Regel 10: hoeveel doelen er zijn.**
Regel: de app waarschuwt maar blokkeert niet bij meer dan 2 Hoofddoelen binnen 12 maanden, bij meer dan 4 Belangrijk-doelen in 12 maanden, en bij 2 of meer Belangrijk-doelen binnen één trainingscyclus (vier tot zes weken tussen elk is de norm). Meedoen heeft geen grens maar telt mee in het weekvolume.
Reden: TrainerRoad en MyProCoach zeggen 1 tot 2 A's, 2 tot 4 B's per seizoen; Roadman noemt 3 A's het maximum; Runna 1 tot 2 B's per cyclus; ultra's strenger.
Bewijs: expert. Instelbaar.

**Regel 11: de herstelweek past zich aan een Belangrijk-doel aan.**
Regel: de vierde week van de golf (rustweek) komt zo mogelijk in de week van of na een Belangrijk-doel, en niet er nog een bovenop; een afbouw en een rustweek hoeven niet gestapeld te worden.
Reden: Runna verplaatst de deload-week eerder en TrainerRoad-gebruikers adviseren herstelweken op de race uit te lijnen.
Bewijs: expert.

**Regel 12: een korte tijd tot het doel is eerlijk.**
Regel: een Belangrijk-doel binnen 4 weken krijgt wel afbouwdagen en een rustdag erna, geen wedstrijdblok. Een Hoofddoel binnen 3 weken krijgt het blok niet, alleen een afbouw en de eerlijke zin dat de voorbereiding te kort is om te piekken.
Reden: Stryd geeft onder 4 weken geen formele afbouw; de bestaande gedeelde regel 7 uit `Doelsoorten duur.md` (eerlijk nee).
Bewijs: expert.

**Regel 13: tochten met één schuif.**
Regel: de bestaande `TrekImportance` ('training' of 'goal') wordt het label: Hoofddoel en Belangrijk geven de lichte dagen vóór een tocht, Meedoen geeft er één. Voor een Hoofddoel-tocht komt de afbouwfase van `programLayout` erbij, een Belangrijk-tocht heeft alleen de lichte dagen (nu 2, 3 of 4 afhankelijk van het aantal dagen).
Reden: nu zijn er twee schuiven voor belangrijkheid, één voor een wedstrijd (`planRole`) en één voor een tocht (`TrekImportance`).
Bewijs: afgeleid.

## Wat de gebruiker te zien krijgt

Het kan kort en in gewone woorden. Een voorbeeld voor twee doelen die botsen, zoals het scherm kan zeggen:

"Je Hoofddoel Marathon staat op 14 maart en je Hoofddoel Trektocht op 18 april: 35 dagen ertussen. Na een marathon heb je ongeveer 14 dagen herstel nodig en voor de tocht 21 dagen opbouw en 4 lichte dagen. Dat past niet in 35 dagen, ook niet als de afbouw van de tocht tot een week wordt ingekort (14 plus 21 plus 7 is 42). Voorstel: de Trektocht wordt Belangrijk. Dan krijgt hij 4 lichte dagen in plaats van een volle afbouwfase, en je opbouw naar de marathon blijft zoals hij was." Daaronder: wat er in de planning verandert (twee weken), de keuzes Akkoord en Liever niet, en bij Liever niet de zin dat ASCEND dan plant zoals je koos en zegt wat niet past.

Daarnaast: een regel bij elk label die zegt wat het doet ("Belangrijk: 5 dagen afbouw en een rustdag erna, geen eigen opbouwfasen"), een verstoringsniveau per voorstel (laag, middel, hoog, zoals Runna), een tijdlijn met de weken tussen doelen zichtbaar (zoals TrainingPeaks en IntervalCoach), en bij het toevoegen van een datum een bericht dat zegt of hij past, voor het wordt opgeslagen (zoals Runna en TriDot). De lijst met drie groepen waar je tussen sleept: Hoofddoel, Belangrijk, Meedoen.

## Wat dit niet onderbouwt

- Een studie naar twee pieken dicht bij elkaar bestaat niet (Pyne 2009, Le Meur 2012). De afstanden tussen doelen zijn expert en afgeleid.
- Herstel na een tocht van meerdere dagen met bepakking is niet onderzocht; de regel leunt op lopen in meerdere dagen (Besson 2020) en op één bergultra (Millet 2011).
- Het verschil in herstel tussen fietsen en hardlopen komt uit een meta-analyse over interferentie met kracht, niet uit een herstelstudie.
- Final Surge: niets over prioriteit gevonden. Garmin: alleen primair en ondersteunend. Runna: geen gebruikersoordelen. TriDot en het TrainingPeaks Help Center: alleen zoekresultaten, de pagina's gaven een 403. Friel: alleen wat anderen over hem schrijven.
- De bronnen lopen uiteen over de afstand tussen A-doelen (6, 8 en 12 weken, zelfs binnen TrainerRoad), en over de C-afbouw: Active.com raadt een kleine volumedaling een paar dagen ervoor aan ([Active.com](https://www.active.com/triathlon/articles/how-triathletes-taper-for-an-a-race?page=3)), TrainerRoad, Roadman en MyProCoach niet. Ik kies "geen afbouw, de dag ervoor niet zwaar", dat is afgeleid.
- Eén lijst met open vragen voor de eigenaar: moet "alleen volgen" blijven bestaan naast Meedoen (nu `track`), of valt dat samen met Meedoen? Mag een tweede Hoofddoel bestaan dat dicht bij het eerste ligt als de gebruiker het zelf wil ("toch allebei"), met de eerlijke zin dat piek voor beide niet kan?
- Niets hiervan is getest of gebouwd. Een bouwronde moet in de bestaande test voor een vaste planning bewijzen dat het plan van een gebruiker met één hoofddoel en één tussendoel gelijk blijft.

## Bronnen

Apps en coaches: [TrainerRoad A, B, C](https://support.trainerroad.com/hc/en-us/articles/360016099031-Add-A-B-C-Priority-Races), [TrainerRoad Plan Builder](https://support.trainerroad.com/hc/en-us/articles/360037666312), [TrainerRoad meerdere doelen](https://www.trainerroad.com/blog/how-to-adjust-your-training-when-you-have-more-than-one-goal-event-2/), [TrainerRoad forum 1](https://www.trainerroad.com/forum/t/choosing-a-and-b-events-in-a-short-season/95086), [forum 2](https://www.trainerroad.com/forum/t/help-building-training-plan-with-multiple-races/112038), [forum 3](https://www.trainerroad.com/forum/t/this-plan-builder-cannot-be-correct/98512), [forum 4](https://www.trainerroad.com/forum/t/tapering-for-b-races/12859), [TrainingPeaks ATP](https://www.trainingpeaks.com/learn/articles/the-comprehensive-guide-to-creating-an-annual-training-plan/), [MyProCoach](https://support.myprocoach.net/hc/en-us/articles/360002272411-Get-the-Most-from-Your-Race-Season-with-A-B-and-C-Races), [Roadman](https://roadmancycling.com/answers/planning-a-b-c-races), [Runna B-race](https://support.runna.com/en/articles/10856802-how-to-add-and-manage-your-b-race), [Runna herstel](https://support.runna.com/en/articles/15272605-how-does-runna-build-recovery-into-your-training-plan), [Stryd](https://help.stryd.com/en/articles/13612408-adaptive-training-supports-event-a-races), [Athletica 1](https://forum.athletica.ai/t/question-about-training-plans-and-race-prioritization/2403), [Athletica 2](https://forum.athletica.ai/t/b-vs-c-race-whats-the-difference/1185), [Garmin](https://www8.garmin.com/manuals/webhelp/GUID-CF6857C0-CEF9-485F-B3B4-B8DC192FA66A/EN-US/GUID-8186A9FE-DFC1-4DC3-89B2-221883A60B6A.html), [IntervalCoach](https://intervalcoach.featurebase.app/p/season-plan-see-your-whole-year-with-multiple-goal-races), [intervals.icu forum](https://forum.intervals.icu/t/quick-view-of-races-on-calendar/52320), [URUNN](https://intercom.help/urunn/en/articles/16393939-training-for-multiple-races), [Uphill Athlete afbouwen](https://www.uphillathlete.com/tapering-for-race-event-what-to-do/), [Uphill Athlete forum](https://uphillathlete.com/?p=14618), [Trail Runner Magazine](https://www.trailrunnermag.com/training/how-to-plan-your-racing-season-without-overdoing-it/), [Active.com](https://www.active.com/triathlon/articles/how-triathletes-taper-for-an-a-race?page=3).

Onderzoek: [Bosquet 2007](https://pubmed.ncbi.nlm.nih.gov/17762369/), [Wang 2023](https://pubmed.ncbi.nlm.nih.gov/37163550/), [Le Meur 2012](https://www.em-consulte.com/article/709136/resume/tapering-for-competition-a-review), [Pyne 2009](https://researchportalplus.anu.edu.au/en/publications/peaking-for-optimal-performance-research-limitations-and-future-d/), [Smyth en Lawlor 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8506252), [Spiering 2021](https://pubmed.ncbi.nlm.nih.gov/33629972/), [Mujika en Padilla 2000](https://pubmed.ncbi.nlm.nih.gov/10966148/), [Petersen 2007](https://pubmed.ncbi.nlm.nih.gov/17661071/), [Martínez-Navarro 2021](https://pubmed.ncbi.nlm.nih.gov/33251988/), [Comrades](https://open.uct.ac.za/handle/11427/27773), [Hoffman 2017](https://pubmed.ncbi.nlm.nih.gov/27167683/), [Millet 2011](https://pmc.ncbi.nlm.nih.gov/articles/3043077), [Besson 2020](https://pubmed.ncbi.nlm.nih.gov/32079919/), [Ušaj 2023](https://pubmed.ncbi.nlm.nih.gov/37895328/), [trekkingstokken](https://pubmed.ncbi.nlm.nih.gov/20473229/), [Wilson 2012](https://search.pedro.org.au/search-results/record-detail/34457).
