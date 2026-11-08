# Calisthenics in apps en wetenschap

Onderzoek door Scout Calisthenics, 8 november 2026. Stap 1 van het backlogpunt "Calisthenics, los of naast krachttraining": hoe andere apps calisthenics opbouwen, wat de wetenschap zegt over vooruitgang zonder kilo's, en een ontwerpvoorstel voor stap 2. Er is geen code veranderd.

Gelezen vooraf, en hier niet herhaald: *Kracht loggen en progressie* (RIR-schaal, de nauwkeurigheid van RIR volgens Halperin 2022, Epley op herhalingen plus RIR, open databases), *Lichaamsgewicht in de last bij beenoefeningen* (`bodyweightFraction` en segmentmassa's), *Afbeeldingen bij oefeningen* (Workout Guide en Everkinetic), *Trainingswetenschap* in `docs/visie/` (interferentie, kracht voor de GR5, rugzakladder) en *Volgorde van twee trainingen*. Ook gelezen: `src/models/exercise.ts`, `src/models/training.ts` (`SetLog`), `src/models/objectives.ts` (mijlpalen) en `src/models/goals.ts` (doelsoorten).

Hoe zeker: elke bewering krijgt een van drie woorden. **Zeker**: meerdere studies of een meta-analyse die dezelfde kant op wijzen, of iets wat ik bij de bron zelf las. **Waarschijnlijk**: één goede studie, een kleine reeks studies, of een beschrijving van een app door een tweede partij. **Gok**: praktijk van coaches zonder uitkomstdata, of mijn eigen afleiding. Een gok is geen fout, maar hoort zo te heten.

Een beperking vooraf: de wiki van r/bodyweightfitness liet zich niet direct lezen. Wat ik over de Recommended Routine schrijf komt uit een openbare kopie van de wiki ([kopie](https://luke-snaw.github.io/notes/smvvuk92pf7i5f6hmviazba)) en twee andere overzichten ([Boostcamp](https://boostcamp.app/r-bodyweightfitness/r-bodyweight-recommended-routine), [Liftosaur](https://www.liftosaur.com/programs/recommended-routine)). De wiki verandert soms; de details moeten bij het bouwen nog een keer tegen de wiki zelf.

## 1. In het kort

1. Alle apps en de Recommended Routine werken met dezelfde kern: per bewegingspatroon een ladder van varianten, en vooruitgang is "welke stap" plus "hoeveel herhalingen of seconden op die stap". Kilo's komen pas bovenaan de ladder, als extra gewicht bij optrekken en dippen (zeker, voor de Recommended Routine; waarschijnlijk, voor de apps).
2. De Recommended Routine geeft een eenvoudige, toetsbare regel: begin op de zwaarste stap die je 3 keer 5 haalt, voeg herhalingen toe tot 3 keer 8, ga dan een stap omhoog en begin weer bij 3 keer 5. Voor houdingen: 10 tot 30 seconden, door naar de volgende stap bij 3 keer 30 seconden (zeker dat de routine dit zegt, waarschijnlijk dat het goed werkt).
3. Een push-up met de juiste zwaarte bouwt evenveel kracht als bankdrukken. In drie kleine studies kwam het op hetzelfde uit (waarschijnlijk). Zolang je dicht bij falen traint, maakt de zwaarte weinig uit voor spiergroei. Voor maximale kracht zijn sets van hoogstens ongeveer 15 herhalingen beter dan lichtere (zeker, meta-analyse).
4. De ladder van de push-up is gemeten: handen 60 cm hoog is ongeveer 41 procent van je gewicht, op de knieën 49, handen 30 cm hoog 55, een gewone push-up 64, voeten 30 cm hoog 70 en voeten 60 cm hoog 74 procent. De knie-push-up is dus lichter dan een push-up met de handen op een bank (waarschijnlijk, één studie).
5. Een vaardigheid zoals een handstand is vooral leren en balans, een front lever of planche vooral kracht in één hoek. Het eerste vraagt korte, frisse en frequente oefening; het tweede gewone krachtopbouw met houdingen, en geduld voor pezen en ellebogen (waarschijnlijk voor het principe, gok voor de precieze aantallen).
6. Calisthenics voor het bovenlichaam botst nauwelijks met hardlopen. Voor de berg zijn benen met een eigen gewicht alleen niet genoeg zodra je sterk bent; een rugzak, een vest of de gewone beendag blijft dan nodig (waarschijnlijk tot gok).
7. Voor ASCEND: een doelsoort "Vaardigheid" met een ladder van stappen, elk met een toets (bijvoorbeeld 3 keer 8 herhalingen, of 3 keer 20 seconden vasthouden). Forge krijgt een rij die de stap toont, seconden kan loggen, extra gewicht en een band kent. Een stap omhoog in een template is een voorstel met Akkoord.

## 2. Hoe de apps het doen

Alleen publieke informatie: eigen sites, helppagina's, winkelbeschrijvingen en enkele recensies. Hoe de apps intern rekenen, zeggen ze nergens precies.

### De Recommended Routine van r/bodyweightfitness

Wat de routine zegt, volgens de kopie van de wiki ([kopie](https://luke-snaw.github.io/notes/smvvuk92pf7i5f6hmviazba)):

- Drie keer per week het hele lichaam, met minstens een dag rust of vaardigheid ertussen (zeker).
- Na een warming-up van 5 tot 10 minuten drie paren: optrekken met squat, dippen met heupscharnier, roeien met push-up. Daarna een kerntrio (anti-strekken, anti-draaien, strekken) van 3 keer 8 tot 12 (zeker).
- Per paar 3 sets van 5 tot 8 herhalingen, 90 seconden rust tussen de twee oefeningen, dus ongeveer 3 minuten per oefening (zeker).
- Tempo 10X0: een seconde omlaag, geen pauze, explosief omhoog (zeker).
- De regel: begin op de zwaarste stap die je 3 keer 5 haalt, voeg een herhaling per set toe tot 3 keer 8 met nette vorm, ga dan een stap omhoog en begin weer bij 3 keer 5 (zeker).
- Houdingen (steunhouding aan de brug, tuck front lever in de roeiladder): 10 tot 30 seconden, door naar de volgende stap als alle drie de sets 30 seconden zijn (zeker).
- Vroege sets tot ongeveer één voor falen, niet echt tot falen (zeker).
- Gewicht: met je eigen gewicht kom je vooruit door een zwaardere variant, niet door schijven. Een losse optie met een stang voor squat en deadlift (zeker).

De ladders in eerdere versies (een pdf uit 2018 via [Scribd](https://www.scribd.com/document/435002158/rr-pdf), een samenvatting uit 2021 en [Boostcamp](https://boostcamp.app/r-bodyweightfitness/r-bodyweight-recommended-routine)) zijn bijvoorbeeld: optrekken via scapular pulls, arch hangs, negatieve pull-ups, pull-ups en pull-ups met gewicht; dippen via steunhouding, negatieve dips, dips en dips met gewicht; squat via geholpen squat, squat, split squat, Bulgarian split squat en shrimp squats; push-up via schuine push-ups, push-ups, diamond push-ups en pseudo-planche push-ups (waarschijnlijk; de ladders zijn in de loop van de jaren aangepast).

Wat ASCEND hieruit kan leren: de regel is eenvoudig genoeg om in een engine te gieten, en hij heeft twee assen (stap en herhalingen). De toets per stap is gewoon de bovenkant van het bereik: 3 keer 8.

### Freeletics

Freeletics meet vooruitgang vooral in tijd: hoe snel je een vaste workout afmaakt, met een persoonlijk record (PB) "met perfecte vorm" en een ster als je geen enkele herhaling hebt aangepast ([woordenlijst](https://freeletics.com/en/blog/posts/the-freeletics-dictionary), [Coach](https://www.freeletics.com/en/blog/posts/coach-knows-time-predictions/)). De Coach vraagt na een workout, oefening of interval naar je techniek ([Coach-feedback](https://www.freeletics.com/en/blog/posts/coach-feedback/)) (zeker dat ze dit zeggen).

Hun eigen beschrijving van zwaarder worden zonder gewicht ([progressive overload](https://www.freeletics.com/en/progressive-overload-at-home/)): meer herhalingen en sets, kortere rust, snellere doeltijden, zwaardere varianten die vrijkomen "als je laat zien dat je het beheerst", langzamer zakken, pauzes en houdingen, en in cycli met lichtere weken. Eén variabele tegelijk, eerst volume en dan intensiteit. Heb je materiaal, dan neemt de Coach dat mee (zeker dat ze dit zeggen; hoe het algoritme het weegt, staat nergens).

Les voor ASCEND: een vraag naar de vorm ("Ging het netjes?") is goedkoop en geeft een herhaling die telt een betekenis. Tijd als maat past bij circuits, niet bij een ladder.

### Calimove

Volgens een uitgebreide recensie heeft Complete Calisthenics vijf niveaus van elk 19 weken, elk in vier fases, en begint elke fase met een testweek. Een niveau vraagt een lijstje eisen: optrekken, dippen, push-ups, handstand vasthouden, skin the cat en L-sit ([recensie](https://www.calisthenics-101.co.uk/?p=809)). Een gebruiker beschrijft dat de test begint met lichaamsroeien ([Trustpilot](https://jp.trustpilot.com/review/www.calimove.com?page=7)) (waarschijnlijk; de eigen site gaf geen details).

Les voor ASCEND: een testweek per fase is hetzelfde idee als de testloop in het hardloopdeel. Een toetsmoment hoeft niet elke training; elke vier tot zes weken is genoeg en past bij de golven die ASCEND al heeft.

### Thenx

Thenx deelt workouts in in beginner, gevorderd en ver gevorderd, met losse programma's voor vaardigheden zoals de muscle-up, de handstand en de planche, en houdt herhalingen, sets en persoonlijke records bij ([App Store](https://apps.apple.com/us/app/1192413645), [recensie](https://calisthenics-101.co.uk/?p=2332)) (waarschijnlijk). Een recensent vindt de stap voor beginners te groot.

Les voor ASCEND: een vaardigheid als eigen programma met een eigen pad naast het gewone schema. Dat sluit aan bij "een vaardigheid als tussendoel".

### Madbarz

Madbarz is vooral een verzameling workouts en circuits voor thuis, met een niveau dat je kiest, een teller voor herhalingen en video bij elke oefening. Een recensent schrijft dat de app je een niveau toekent op basis van je workouts ([recensie](https://muaythaicitizen.com/calisthenics-for-muay-thai-madbarz-app-review/), [App Store](https://apps.apple.com/app/id969057083)) (gok tot waarschijnlijk: alleen tweede partijen, geen beschrijving van ladders).

Les voor ASCEND: weinig nieuws; Madbarz is het voorbeeld van calisthenics als conditie, niet als vaardigheid.

### Caliverse

Caliverse beschrijft zelf hoe de oefeningen aan elkaar hangen: elke oefening toont zijn zwaardere en lichtere varianten, je kunt tijdens een training wisselen, en de app bewaart je resultaat bij de variant die je echt deed. In je historie zie je hoe lang je al op elke stap zit. Automatisch een stap omhoog als de app denkt dat je eraan toe bent, staat als plan ([blog Caliverse](https://blog.caliverse.app/exercise-progressions-and-regressions/)) (zeker dat ze dit zeggen). Hun plannen voor vaardigheden noemen ketens zoals "press naar handstand naar handstand push-up" ([plan](https://caliverse.app/training-plans/view/guide-to-handstands-expert-263)).

Les voor ASCEND: dit is het belangrijkste punt voor het model. Log altijd op de variant die je echt deed, niet op het "idee" van de oefening. Ruilen naar een lichtere stap midden in een training moet één tik zijn.

### Wat ze samen laten zien

- Vooruitgang is twee getallen: welke stap, en hoeveel herhalingen of seconden op die stap (zeker voor de Recommended Routine, waarschijnlijk voor de rest).
- Een stap omhoog vraagt een toets: 3 keer 8, 3 keer 30 seconden, een eis per niveau of een testweek (waarschijnlijk).
- Extra gewicht is de laatste stap van optrekken en dippen, niet iets ernaast (zeker voor de Recommended Routine).
- Gewichten en calisthenics combineren de apps nauwelijks. Freeletics neemt materiaal mee, de Recommended Routine heeft een losse stang-optie. Geen van de apps beschrijft hoe een pull-up met 10 kg zich verhoudt tot een lat pulldown (gok dat ze het niet doen; ik vond het nergens).
- Nieuwere kleine apps (Calistack, Skill-Map, Level Up, een logboek dat "klaar" en "toets" scheidt) doen allemaal een boom van vaardigheden met een eis per stap die de volgende vrijgeeft ([Calistack](https://play.google.com/store/apps/details?id=com.cali.stack), [Skill-Map](https://apps.apple.com/hu/app/skill-map/id6761576511), [Level Up](https://apps.apple.com/app/id6759352254), [Calisthenics Workout Log](https://www.coddykit.com/apps/calisthenics-workout-log)) (zeker dat ze het zo beschrijven). Het onderscheid van dat logboek is nuttig: "je lijkt er klaar voor" is een voorspelling uit je sets, "toets gehaald" is één eerlijke poging.

## 3. Wat de wetenschap zegt

### Hefboom in plaats van gewicht

Bij calisthenics maak je een oefening zwaarder door je lichaam anders te leggen: de handen lager, de voeten hoger, een been of arm minder, of het lichaam verder van het steunpunt. Dat is gewoon natuurkunde (zeker). Voor de push-up is het gemeten met een krachtplaat: de piekkracht op de handen als deel van het lichaamsgewicht ([Wurm, Ebben e.a. 2010, congres ISBS](https://ojs.ub.uni-konstanz.de/cpa/article/view/4457); de getallen komen uit de tabel van het artikel zoals die in samenvattingen wordt weergegeven, het aantal deelnemers kon ik niet lezen):

- handen 60 cm hoog: ongeveer 41 procent;
- op de knieën: ongeveer 49 procent;
- handen 30 cm hoog: ongeveer 55 procent;
- gewone push-up: ongeveer 64 procent;
- voeten 30 cm hoog: ongeveer 70 procent;
- voeten 60 cm hoog: ongeveer 74 procent.

In gewone woorden: bij 80 kg duw je bij een gewone push-up ongeveer 51 kg, op je knieën ongeveer 39 kg. ASCEND heeft voor de push-up nu `bodyweightFraction` 0,65 in `src/data/exercises.ts`; dat klopt met de meting (zeker). Hoe zeker de rest: één congresstudie, met een krachtplaat gemeten en logisch (waarschijnlijk). Een tweede studie mat de gewone en de knievariant met hetzelfde beeld, de knievariant duidelijk lichter ([Suprak e.a. 2011](https://pubmed.ncbi.nlm.nih.gov/20179649)); de precieze getallen daaruit heb ik niet kunnen lezen.

Twee dingen volgen hieruit. Eén: de knie-push-up is lichter dan een push-up met de handen op een bank, dus de volgorde in een ladder is niet vanzelfsprekend; meet hem waar het kan. Twee: voor push-ups, dips, optrekken en squats kan Forge rekenen met een "systeemlast" (deel van het lichaamsgewicht plus extra gewicht), zoals het nu al doet. Voor balansvaardigheden en houdingen zoals de front lever is zo'n fractie zinloos, want het moment rond de schouder telt, niet het gewicht (gok, uit de natuurkunde).

### Doet een push-up hetzelfde als bankdrukken?

- In een studie met 30 ervaren sporters gaven bankdrukken en een push-up met een elastiek, op dezelfde spieractiviteit, na 5 weken dezelfde winst in 1RM en 6RM ([Calatayud e.a. 2015](https://producciocientifica.uv.es/documentos/5ef106d0299952068d595025)) (waarschijnlijk).
- Bij 18 ongetrainde mannen gaven push-ups en bankdrukken op ongeveer 40 procent van het maximum, beide tot falen, na 8 weken dezelfde groei van borst en triceps en dezelfde krachtwinst ([Kikuchi en Nakazato 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5812864)) (waarschijnlijk, klein).
- Bij 23 matig getrainde mannen gaf 4 weken een ladder van push-ups evenveel winst op de bank als bankdrukken zelf ([Kotarsky e.a. 2018](https://pubmed.ncbi.nlm.nih.gov/29466268/)) (waarschijnlijk, kort en klein).
- Een programma van 8 weken calisthenics bij 28 mannen verbeterde push-ups met ongeveer 16 en pull-ups met ongeveer 39 procent, maar de knijpkracht niet ([Thomas e.a. 2017](https://content.iospress.com/articles/isokinetics-and-exercise-science/ies170001)) (waarschijnlijk).

Samen: voor beginners en gemiddelde sporters doet een goed gekozen stap op de ladder ongeveer wat een gewicht doet (waarschijnlijk). Voor iemand die al zwaar traint is dat niet getoetst.

### Zwaarte en herhalingen

Als je dicht bij falen traint, groeit een spier ongeveer evenveel bij lichte en zware sets. Voor maximale kracht zijn zware (hoogstens 8 herhalingen) en middelzware (9 tot 15) sets beter dan lichte (meer dan 15) ([Lopez e.a. 2021, netwerk-meta-analyse van 28 studies](https://pubmed.ncbi.nlm.nih.gov/33433148/)) (zeker).

In gewone woorden: zit je op een stap waar je 25 herhalingen haalt, dan groei je nog wel, maar kracht bouw je beter op een zwaardere stap waar je er 5 tot 12 haalt. Dat is precies waarom de Recommended Routine bij 8 herhalingen al een stap omhoog gaat. Een tweede reden: boven ongeveer 12 herhalingen tot falen is een schatting van je maximum te onzeker (al vastgelegd in *Kracht loggen en progressie*, KR-1).

### Tempo

Herhalingen van 0,5 tot 8 seconden geven ongeveer dezelfde spiergroei; heel langzaam (meer dan 10 seconden per herhaling) lijkt slechter ([Schoenfeld e.a. 2015, 8 studies](https://pubmed.ncbi.nlm.nih.gov/25601394/)) (waarschijnlijk; weinig en kleine studies). Tempo is dus geen sterke knop om zwaarder te worden. Wel nuttig als eigen stap: een langzaam zakkende herhaling (een "negatieve") is een gangbare stap voor wie nog geen pull-up of dip haalt (gok, praktijk; de Recommended Routine doet het zo). Voor de app: tempo hoort bij het voorschrift en de uitleg, niet als getal dat Forge laat oplopen.

### Houdingen in seconden

- Isometrische training maakt sterker, het meest in de hoek die je traint; training op een lange spierlengte gaf meer groei en ging beter over op bewegen ([Oranchuk e.a. 2019, 23 studies](https://pubmed.ncbi.nlm.nih.gov/30580468/)) (waarschijnlijk; de auteurs noemen het bewijs zelf beperkt).
- Kracht is specifiek voor de taak: dynamische training gaf ongeveer twee keer zoveel winst in de geoefende beweging als in een ongeoefende houding ([meta-analyse 2025, 43 studies](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12296774/)) (zeker). Dus: wil je een L-sit, train dan de L-sit.
- Hoe lang je een houding volhoudt, hangt sterk af van hoe zwaar hij is (een machtsverband) en verschilt per gewricht; de schouder raakt het snelst moe ([Frey-Law en Avin 2010, 194 publicaties](https://pmc.ncbi.nlm.nih.gov/articles/PMC2891087)) (zeker voor het verband, waarschijnlijk voor de getallen). In gewone woorden: van 10 naar 20 seconden vasthouden is geen verdubbeling van kracht, maar een kleinere stap. Een houding die je 30 seconden haalt is relatief licht; daarom is 30 seconden een redelijke grens om een stap omhoog te gaan (gok, in lijn met de Recommended Routine).

Voor ASCEND: een houding logt Forge in seconden, met een doel per stap (bijvoorbeeld 3 keer 10 tot 30 seconden). Vooruitgang binnen een stap gaat met seconden, daarna een zwaardere houding.

### RIR bij lichaamsgewicht

Er is geen studie gevonden die RIR bij push-ups of pull-ups zonder gewicht toetst. Een studie met pull-ups met gewicht, bankdrukken en deadlift vond de schatting acceptabel ([Sinclair e.a. 2022](https://link.springer.com/10.1007/s11332-021-00837-5)) (waarschijnlijk). Een systematische review van 26 studies vond de schatting beter dicht bij falen, beter bij oefeningen voor het bovenlichaam, en slechter bij veel herhalingen en lichte lasten ([Russo e.a. 2025](https://dev.rdpc.dspace.uevora.pt/items/d6f78224-a6e5-4f67-b1b8-2c65c7e7f199)) (waarschijnlijk).

Wat het betekent: RIR werkt bij calisthenics zolang een set in 5 tot 12 herhalingen blijft; bij 20 of meer herhalingen is het een gok (gok, afgeleid). Voor een houding bestaat geen RIR. Een redelijk alternatief: stoppen een paar seconden voordat de vorm breekt, en na de set één vraag "Ging het netjes?" (gok, praktijk; Freeletics vraagt iets vergelijkbaars). Forge kan voor herhalingen de bestaande RIR-bolletjes gebruiken en voor houdingen alleen seconden plus netjes ja of nee.

### Vaardigheid tegenover kracht

Twee soorten doelen vragen een andere aanpak:

- **Balans en techniek** (vrije handstand, de overgang van een muscle-up). Hier gaat het om leren. Verspreid oefenen werkt beter dan alles in één keer: in een meta-analyse van 63 studies gaf gespreide oefening gemiddeld een duidelijk beter resultaat, bij motorische taken een groot effect ([Donovan en Radosevich 1999](https://www.gwern.net/docs/spaced-repetition/1999-donovan.pdf)) (waarschijnlijk; de studies gaan niet over handstanden). Praktijk van coaches: vaak, kort en fris, bijvoorbeeld 10 tot 15 minuten aan het begin van een training of op een rustdag, niet na een zware set (gok).
- **Kracht in één houding** (front lever, planche, L-sit). Hier gaat het om kracht in een hoek, dus houdingen en zwaardere varianten volgens de regels hierboven (waarschijnlijk). Pezen passen zich langzamer aan dan spieren: in een kleine studie veranderde de pees pas aan het eind van drie maanden training, terwijl de kracht al eerder steeg ([Kubo e.a. 2010](https://pubmed.ncbi.nlm.nih.gov/19996769/); [overzicht 2017](https://www.frontiersin.org/articles/10.3389/fphys.2017.00987)) (waarschijnlijk; het verloop verschilt per studie). Voor houdingen met gestrekte armen (planche, front lever) adviseren coaches daarom kleine stappen en geduld voor ellebogen en biceps (gok). Bij pijn: stoppen en naar een arts of fysiotherapeut.

Een eerlijke kanttekening: veel van wat over vaardigheden geschreven is, komt uit de praktijk van coaches (onder meer *Overcoming Gravity* van Steven Low en de wiki van r/bodyweightfitness), niet uit gecontroleerde studies. De ladders zelf zijn praktijk (gok); dat een ladder in het algemeen werkt, is redelijk onderbouwd (waarschijnlijk).

### Combineren met kracht en hardlopen voor de berg

- **Interferentie.** Kracht naast duurtraining kost weinig maximale kracht en spier (zie *Trainingswetenschap*, Schumann 2022). Een oudere meta-analyse vond de meeste interferentie bij hardlopen en voor de benen ([Wilson e.a. 2012](https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_miscellaneous_1027372546)) (waarschijnlijk; een latere heranalyse zag het verschil met fietsen kleiner). Calisthenics voor het bovenlichaam botst dus nauwelijks met lopen (gok, afgeleid). Benen met eigen gewicht tellen gewoon mee in de beenindex.
- **Benen.** Bij hardlopers verbetert zware krachttraining de loopeconomie met 2 tot 8 procent (Blagrove 2018, in *Trainingswetenschap*). Een pistol squat of shrimp squat is voor een getraind been geen zware last; voor sterke benen en de knie bergaf blijft last nodig: de beendag, step-downs met rugzak, of een vest (waarschijnlijk tot gok). Voor een beginner kan een ladder tot split squat en Bulgarian split squat wel volstaan (gok).
- **Rug en romp.** Bij soldaten hing relatieve kracht, ook van het bovenlichaam, samen met hoe goed ze met een rugzak marcheerden (Orr 2021, in *Trainingswetenschap*) (waarschijnlijk tot zwak). Optrekken, roeien en een hollow body hold passen daar goed bij (gok).
- **Grip.** In de studie van Thomas e.a. 2017 werd de knijpkracht na 8 weken calisthenics niet beter. Grip vraagt dus eigen werk: hangen (dead hang in seconden), hangen aan een handdoek, de farmer's carry die ASCEND al heeft (gok, afgeleid). Voor klauteren en stokken is grip zinvol; hoeveel het oplevert voor een trektocht is niet onderzocht (gok).
- **Blessures.** Krachttraining in het algemeen halveert ruwweg sportblessures (Lauersen 2018, in *Trainingswetenschap*). Of calisthenics dat even goed doet, is niet apart getoetst (gok).

## 4. Wat het betekent voor ASCEND

- Een ladder is de natuurlijke vorm, en past bij wat ASCEND al heeft: de mijlpalen van de GR5 en de rugzakladder. Elke stap is een oefening met een eigen id; vooruitgang is stap plus herhalingen of seconden.
- Log op de variant die je echt deed (Caliverse). Een id per stap, geen "push-up met niveau 3" als vrij veld; dan blijven logs append-only en klopt de historie als een ladder later wijzigt.
- De toets per stap is eenvoudig en deterministisch: 3 keer de bovenkant van het bereik met nette vorm, of 3 keer de doeltijd. De engine stelt een stap omhoog voor; omdat dat de oefening in een template verandert, is het een voorstel met Akkoord.
- Gewicht en calisthenics in één model: `weightKg` op een set is bij een oefening met eigen gewicht al het extra gewicht, en `bodyweightFraction` maakt er een systeemlast van. Een band is geen kilo; behandel hem als een eigen stap (band licht, middel, zwaar), niet als negatief gewicht, want de hulp van een band verschilt per band en per hoogte (gok, maar het voorkomt schijnprecisie).
- Vaardigheden van balans (handstand) horen als korte oefening aan het begin van een training of los, niet als derde set na een zware dag.

## 5. Ontwerpvoorstel voor stap 2

Dit is een voorstel voor Cartographer en de coördinator, geen besluit. Alles is optioneel en aanvullend; bestaande logs en templates lezen zoals ze altijd deden.

### Een vaardigheidsdoel als ladder

- Een nieuwe doelsoort `skill` naast de bestaande in `GOAL_KIND_IDS` en `data/goalKinds.ts`, met een keuze uit een vaste lijst ladders. Een vaardigheid kan een eigen doel zijn of een tussendoel bij een hoofddoel (zoals de testloop bij de 10 km).
- Een ladder is gegevens, net als de oefeningen: `data/skillLadders.ts`, met per ladder een id, een naam, het soort (`balance` of `strength`) en een lijst stappen. Een stap heeft een `exerciseId`, een volgorde, een toets en eventueel een korte tekst ("Rug tegen de muur").
- De toets per stap: `{ kind: 'reps'; sets: number; reps: number }` of `{ kind: 'hold'; sets: number; seconds: number }`, eventueel met `addedKg` voor de stappen met extra gewicht. Een stap begint op de onderkant (3 keer 5, of 3 keer 10 seconden) en is gehaald op de toets (3 keer 8, of 3 keer 30 seconden).
- In het doel: een nieuwe mijlpaalsoort `{ kind: 'skillStep'; exerciseId; test }` in `MilestoneRequirement`. Gehaald wordt hij, zoals elke mijlpaal, door een `MilestoneProgress` die naar het log verwijst (append-only).
- Op de Ascend-tab de ladder zoals de rugzakladder: welke stap je nu doet, wat de toets is, wat er nog komt.

Startladders (gok, uit de praktijk; volgorde van de push-up uit de meting van Wurm en Ebben):

- Push-up: handen hoog (60 cm), knieën, handen laag (30 cm), push-up, voeten hoog, diamond, archer, one-arm met handen hoog, one-arm. Toets 3 keer 8, bij archer en one-arm per kant.
- Optrekken: dead hang (3 keer 30 seconden), scapular pull-up, negatieve pull-up (5 seconden zakken), pull-up met band, pull-up, pull-up met extra gewicht in stappen van 2,5 kg.
- Dip: steunhouding (3 keer 30 seconden), negatieve dip, dip, dip met extra gewicht.
- Squat op één been: squat, split squat, Bulgarian split squat, shrimp squat met hulp, pistol squat met hulp, pistol squat.
- Handstand (balans): pike hold op een bank, buik naar de muur (3 keer 30 seconden, later 60), wegstappen van de muur, vrij 10 seconden, vrij 30 seconden.
- Handstand push-up: pike push-up, pike push-up met voeten hoog, negatieve tegen de muur, tegen de muur, vrij.
- L-sit: steun met voeten, tuck L-sit, één been gestrekt, L-sit; toets steeds 3 keer 10 dan 3 keer 20 seconden.
- Front lever: active hang, tuck, advanced tuck, één been of straddle, volledig; toets 3 keer 10 tot 15 seconden.
- Muscle-up: als instap ongeveer 8 tot 10 nette pull-ups en 10 dips (gok, praktijk), dan explosieve pull-up tot de borst, negatieve muscle-up, muscle-up met band of op een lage stang, muscle-up.

### Wijzigingen in het oefeningenmodel

Voorstel, allemaal optionele velden op `Exercise` in `src/models/exercise.ts`:

- `measure?: 'reps' | 'hold'`: afwezig betekent herhalingen, dus alles leest zoals nu.
- `ladder?: { id: string; step: number }`: de plek op een ladder; de ladder zelf staat in `data/skillLadders.ts`.
- `bodyweightFraction` blijft, en krijgt voor de push-upstappen de gemeten waarden (0,41; 0,49; 0,55; 0,64; 0,70; 0,74). Voor houdingen en balans geen fractie.
- `perSide?: boolean` voor archer, one-arm, shrimp en pistol: herhalingen tellen per kant.
- `assist?: 'band'`: de oefening is met hulp van een band; de sterkte van de band staat in het log, niet in het id.

Op `SetLog` in `src/models/training.ts`, ook optioneel:

- `seconds?: number` voor een houding (dan `reps` 1, zodat alles wat herhalingen telt blijft werken);
- `band?: 'licht' | 'middel' | 'zwaar'`;
- `clean?: boolean` voor "Ging het netjes?" (afwezig is onbekend).

`weightKg` blijft het extra gewicht, zoals nu bij optrekken met gewicht. Omdat de velden optioneel en aanvullend zijn, verandert een oude back-up niet; toch een stap in `storage/migrations.ts` en een hogere `schemaVersion` volgens de regel in CLAUDE.md, als de coördinator dat bij aanvullende velden zo wil.

### Wat Forge nodig heeft

- Een rij voor een progressiestap: de naam van de stap, "Stap 4 van 6", de toets eronder ("Toets: 3 x 8 netjes"), en een tik naar de lichtere of zwaardere stap (wisselen midden in de training, log op wat je deed).
- Een invoer voor seconden bij een houding, met de bestaande tijdklok van Forge als hulp (tellen tot je stopt), geen nieuwe lus in beeld.
- Extra gewicht als gewoon gewicht bij een oefening met eigen gewicht, met de systeemlast in de berekening zoals nu.
- Een keuze voor de band (licht, middel, zwaar) als het een bandstap is.
- Na een set met herhalingen de RIR-bolletjes zoals nu; na een houding alleen "Ging het netjes?".
- Het voorschrift binnen een stap: eerst een herhaling of 5 seconden per set erbij tot de toets; dan een voorstel voor de volgende stap op 3 keer 5 of 3 keer 10 seconden. Haal je de onderkant drie trainingen niet, een voorstel voor de lichtere stap.

### Engine en planning

- `engine/skillLadder.ts`, puur en deterministisch: uit de logs de huidige stap per ladder, of de toets gehaald is, en het voorstel voor de volgende of vorige stap.
- In de planner een trainingssoort calisthenics naast kracht, en per training de keuze kracht, calisthenics of samen. Benen met eigen gewicht tellen in de beenindex; bovenlichaam niet.
- Balansvaardigheden als blok van 10 tot 15 minuten aan het begin van een training, niet als losse zware training.
- Instellingen (met advies als standaard, in `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts` en een groepspagina): volgende stap voorstellen (aan, het advies, of zelf kiezen); toets (3 sets, het advies, of 1 set); de vraag "Ging het netjes?" (aan of uit).

### Stappen van hoogstens een uur

1. Modelvelden op `Exercise` en `SetLog` (optioneel), met tests dat oude logs gelijk lezen. Sherpa, sonnet.
2. `data/skillLadders.ts` met drie ladders (push-up, optrekken, dip) en de nieuwe oefeningen in `data/exercises.ts`, met een test dat elke stap een bestaande oefening is. Sherpa, sonnet.
3. `engine/skillLadder.ts`: huidige stap en toets gehaald, met tests op nagemaakte logs. Sherpa en Warden, opus.
4. Het voorstel voor een stap omhoog of omlaag in een template, via de bestaande voorstelvorm met Akkoord. Sherpa en Warden, opus.
5. Forge: de rij voor een stap en de wissel naar lichter of zwaarder. Cartographer eerst, dan Sherpa.
6. Forge: invoer in seconden voor een houding en "Ging het netjes?". Sherpa, sonnet.
7. Forge: band en extra gewicht in de rij. Sherpa, sonnet.
8. Doelsoort `skill` en mijlpaalsoort `skillStep`, met migratie. Sherpa en Warden, opus.
9. Ascend-tab: de ladder tonen zoals de rugzakladder. Cartographer, dan Sherpa.
10. De overige ladders (squat op één been, handstand, handstand push-up, L-sit, front lever, muscle-up) als gegevens, met een tekening per stap waar die bestaat (zie *Uitleg bij oefeningen en open bronnen*).
11. Instellingen in de vaste vier plekken.
12. De planner: calisthenics als trainingssoort en de keuze per training. Opus; `planGolden.test.ts` beweegt niet.

## 6. Afsluiting

**Wat het onderzoek zegt.** Calisthenics werkt met ladders: een stap zwaarder door de hefboom te veranderen, en per stap herhalingen of seconden. De Recommended Routine geeft een heldere regel (3 keer 5 tot 3 keer 8, dan een stap omhoog; houdingen tot 3 keer 30 seconden). Een goed gekozen stap bouwt ongeveer evenveel kracht als een gewicht, zolang de sets zwaar genoeg blijven (hoogstens ongeveer 15 herhalingen). De ladder van de push-up is in procenten van je gewicht gemeten. Balansvaardigheden zijn leren en vragen korte, frequente oefening; vaardigheden van kracht zijn houdingen met geduld voor de pezen.

**Wat het betekent voor de app.** Een doelsoort Vaardigheid met een ladder en een toets per stap, als eigen doel of tussendoel. Een id per stap, log op wat je echt deed. Forge krijgt een rij voor de stap, seconden voor een houding, extra gewicht, een band als eigen stap en de vraag of het netjes ging. Een stap omhoog in een template is een voorstel met Akkoord. Voor de berg blijven benen met last nodig; calisthenics vult bovenlichaam, romp en grip aan.

**Wat nog onzeker is.** De wiki van r/bodyweightfitness kon ik niet direct lezen; de details van de huidige versie moeten nog worden nagelopen. Over Calimove, Thenx en Madbarz is alleen informatie van tweede partijen. Er is geen studie naar RIR bij oefeningen zonder gewicht, en geen studie die ladders voor vaardigheden zoals de front lever of de muscle-up toetst; de toetsen per stap zijn praktijk. De volgorde van de push-upladder rust op één studie. Of calisthenics blessures even goed voorkomt als gewone krachttraining, is niet onderzocht. Dit is geen medisch advies; bij pijn in schouder, elleboog of pols hoort een arts of fysiotherapeut erbij.

## Bronnen

Apps en routines:

- Recommended Routine, kopie van de wiki: https://luke-snaw.github.io/notes/smvvuk92pf7i5f6hmviazba
- Recommended Routine bij Boostcamp: https://boostcamp.app/r-bodyweightfitness/r-bodyweight-recommended-routine
- Recommended Routine bij Liftosaur: https://www.liftosaur.com/programs/recommended-routine
- Recommended Routine, pdf 2018: https://www.scribd.com/document/435002158/rr-pdf
- Freeletics, woordenlijst: https://freeletics.com/en/blog/posts/the-freeletics-dictionary
- Freeletics, tijdvoorspelling: https://www.freeletics.com/en/blog/posts/coach-knows-time-predictions/
- Freeletics, feedback aan de Coach: https://www.freeletics.com/en/blog/posts/coach-feedback/
- Freeletics, progressive overload thuis: https://www.freeletics.com/en/progressive-overload-at-home/
- Calimove, recensie: https://www.calisthenics-101.co.uk/?p=809
- Calimove, Trustpilot: https://jp.trustpilot.com/review/www.calimove.com?page=7
- Thenx, App Store: https://apps.apple.com/us/app/1192413645
- Thenx, recensie: https://calisthenics-101.co.uk/?p=2332
- Madbarz, recensie: https://muaythaicitizen.com/calisthenics-for-muay-thai-madbarz-app-review/
- Madbarz, App Store: https://apps.apple.com/app/id969057083
- Caliverse, progressies en regressies: https://blog.caliverse.app/exercise-progressions-and-regressions/
- Caliverse, handstandplan: https://caliverse.app/training-plans/view/guide-to-handstands-expert-263
- Calistack: https://play.google.com/store/apps/details?id=com.cali.stack
- Skill-Map: https://apps.apple.com/hu/app/skill-map/id6761576511
- Level Up: https://apps.apple.com/app/id6759352254
- Calisthenics Workout Log: https://www.coddykit.com/apps/calisthenics-workout-log

Onderzoek:

- Wurm, Ebben e.a. 2010, krachten bij push-upvarianten (ISBS): https://ojs.ub.uni-konstanz.de/cpa/article/view/4457
- Suprak e.a. 2011, deel van het lichaamsgewicht bij push-ups: https://pubmed.ncbi.nlm.nih.gov/20179649
- Samenvatting van de getallen van Wurm en Ebben: https://breakingmuscle.com/kinetic-analysis-of-the-push-up-which-version-is-hardest/
- Calatayud e.a. 2015, bankdrukken en push-up: https://producciocientifica.uv.es/documentos/5ef106d0299952068d595025
- Kikuchi en Nakazato 2017, lichte bank en push-up: https://pmc.ncbi.nlm.nih.gov/articles/PMC5812864
- Kotarsky e.a. 2018, ladder van push-ups: https://pubmed.ncbi.nlm.nih.gov/29466268/
- Thomas e.a. 2017, programma calisthenics: https://content.iospress.com/articles/isokinetics-and-exercise-science/ies170001
- Lopez e.a. 2021, zwaarte en spiergroei en kracht: https://pubmed.ncbi.nlm.nih.gov/33433148/
- Schoenfeld e.a. 2015, duur van een herhaling: https://pubmed.ncbi.nlm.nih.gov/25601394/
- Oranchuk e.a. 2019, isometrische training: https://pubmed.ncbi.nlm.nih.gov/30580468/
- Specificiteit van krachttraining, meta-analyse 2025: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12296774/
- Frey-Law en Avin 2010, uithoudingstijd per gewricht: https://pmc.ncbi.nlm.nih.gov/articles/PMC2891087
- Sinclair e.a. 2022, RIR bij pull-ups met gewicht: https://link.springer.com/10.1007/s11332-021-00837-5
- Russo e.a. 2025, wat de nauwkeurigheid van RIR beïnvloedt: https://dev.rdpc.dspace.uevora.pt/items/d6f78224-a6e5-4f67-b1b8-2c65c7e7f199
- Donovan en Radosevich 1999, gespreid oefenen: https://www.gwern.net/docs/spaced-repetition/1999-donovan.pdf
- Kubo e.a. 2010, verloop van spier en pees: https://pubmed.ncbi.nlm.nih.gov/19996769/
- Spier en pees, overzicht 2017: https://www.frontiersin.org/articles/10.3389/fphys.2017.00987
- Wilson e.a. 2012, interferentie: https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_miscellaneous_1027372546

Eigen stukken waarop dit voortbouwt: *Kracht loggen en progressie*, *Lichaamsgewicht in de last bij beenoefeningen*, *Afbeeldingen bij oefeningen*, *Volgorde van twee trainingen* en `docs/visie/Trainingswetenschap.md` (Schumann 2022, Blagrove 2018, Orr 2021, Lauersen 2018).
