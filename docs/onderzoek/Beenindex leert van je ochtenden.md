# Beenindex leert van je ochtenden

Toets van het voorstel voor Rooster ronde 6: de beenindex krijgt een persoonlijke factor uit de ochtendantwoorden over je benen. Dit bouwt voort op *Betrouwbaarheid beenvermoeidheid-index* (de index is ruis tussen ongeveer 7 en 11), *Spierbelasting en beenvermoeidheid* (de lagen en halfwaardetijden), *Trainingswetenschap* (idee 4) en *Kansen 11 november training* (kans 4). Die onderzoeken herhaal ik niet.

Bewijskracht staat tussen haakjes: sterk, matig, zwak, of afgeleid (eigen redenering of berekening). "Eigen keuze" betekent: verdedigbaar, maar door geen studie vastgelegd.

## Kort antwoord

- Het voorstel klopt in de kern: één factor k op de som van de sessiebijdragen, pijn en spierpijnvloer erbuiten, beslissingen met max(1, k), alles via Akkoord.
- Vijf dingen verander ik. De schatting wordt een mediaan over intervallen in plaats van een mediaan over afgekapte middens. Alleen punten die echt iets zeggen tellen voor de 20. Een bevestiging van de voorinvulling en "Gaat goed" tellen voor de helft, niet nul. Er komt een eigen lijst van ochtendantwoorden, omdat de app er maar 60 bewaart. En in plaats van 0,05 per week: hoogstens één voorstel per 28 dagen, met een stap van hoogstens 0,15.
- Nieuw: een regel voor "de index past slecht bij je ochtenden", en uitsluiting van dagen met beenpijn, ziekte en tochten.

## A. Wat leer je: een factor, een halfwaardetijd of drempels?

**Mensen verschillen veel.** Na precies dezelfde excentrische belasting verschilt het krachtverlies sterk van persoon tot persoon. Paulsen e.a. delen mensen in drie groepen in: een lage groep die binnen ongeveer twee dagen hersteld is, een middengroep binnen ongeveer een week, en een hoge groep die langer nodig heeft ([Paulsen e.a. 2012](https://pubmed.ncbi.nlm.nih.gov/22876722/)) (matig, overzichtsartikel). Hubal e.a. vonden na een gestandaardiseerde oefening voor de armbuigers 21 sterke reageerders, 22 zwakke en 3 die nauwelijks reageerden. Het verschil zat vooral in de spier zelf, niet in het zenuwstelsel ([Hubal, Rubinstein en Clarkson 2007](https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_miscellaneous_70455484)) (matig). In een groep van 157 mensen hing een deel van dat verschil samen met erfelijke aanleg ([Clarkson e.a. 2005](https://hsrc.himmelfarb.gwu.edu/smhs_peds_facpubs/4266)) (matig, en later niet overal herhaald). Gefitte hersteltijden in prestatiemodellen verschillen ook sterk tussen mensen ([Hellard e.a. 2006](https://pmc.ncbi.nlm.nih.gov/articles/pmid/16608765)) (matig).

In gewone woorden: tussen mensen scheelt de hersteltijd al snel een factor twee tot vier. Die getallen komen vooral uit proeven met de armspieren van ongetrainde mensen, waar de spreiding het grootst is. Bij getrainde benen en gewone training is hij waarschijnlijk kleiner, en het model rekent gewenning al mee (afgeleid). Een grens van 0,7 tot 1,4 is dus smaller dan de echte spreiding. Dat is bewust: liever een kleine, betrouwbare correctie dan een grote op ruis.

**Waarom een factor en geen halfwaardetijd.** Een ochtendantwoord heeft maar vier standen. Om een halfwaardetijd te schatten moet je hetzelfde soort sessie op dag 1, 2, 3 en 4 erna terugzien, en dan nog lopen schaal en tempo door elkaar: een trage hersteller en iemand die gewoon zwaarder reageert geven op dag 2 hetzelfde antwoord. Met een paar antwoorden per week is dat niet uit elkaar te halen. Bij modellen met veel meer en betere metingen waren de tijdconstanten al erg onzeker ([Hellard e.a. 2006](https://pmc.ncbi.nlm.nih.gov/articles/pmid/16608765); [Busso en Chalencon 2023](https://pubmed.ncbi.nlm.nih.gov/36791017/)) (matig). Eén getal is wat deze gegevens kunnen dragen (afgeleid).

**Factor of drempels is bijna hetzelfde.** k keer de som tegen een drempel van 8 is wiskundig gelijk aan de som tegen een drempel van 8 gedeeld door k, zolang pijn en spierpijnvloer erbuiten blijven. De keuze is dus vooral een kwestie van uitleg. Een factor is beter: één getal, één zin, en grafiek, kaart en planner schuiven op dezelfde manier mee (afgeleid).

**Op het totaal, niet alleen op de schadelaag.** 's Ochtends is de intensiteitslaag al grotendeels weg (na een dag nog een kwart). Wat je voelt komt vooral uit de kracht- en schadelaag, dus het maakt weinig uit. Eén factor op het totaal is eenvoudiger en raakt niets aan de verhouding tussen de lagen (afgeleid).

Advies: houd punt 1 van het voorstel zoals het is.

## B. Klopt de vertaling van de antwoorden?

De app vertaalt de index al naar de ochtendwoorden (`morningCard.ts#suggestLegs`): tot en met 8 is Fris, boven 8 tot en met 12 Wat stijf, boven 12 Spierpijn. Flink stelt de app nooit voor. De ijking moet dezelfde vertaling gebruiken, anders leert de app een andere taal dan hij zelf spreekt (afgeleid).

- **Fris**: k keer m hoogstens 8.
- **Wat stijf**: tussen 8 en 12.
- **Spierpijn en Flinke spierpijn samen**: boven 12. Flink zegt wel dat het erger is, maar er is geen getal om een bovengrens tussen spierpijn en flink op te baseren. Spierpijn hangt maar zwak samen met krachtverlies ([Nosaka, Newton en Sacco 2002](https://ro.ecu.edu.au/ecuworks/4145)) (matig), dus een vierde grens zou schijnprecisie zijn.

Een kanttekening. De spierpijnvloer zet Spierpijn op minstens 8,5, niet op 12. Spierpijn betekent daar dus "minstens twijfel", en in de vertaling hierboven "boven 12". Die twee hoeven niet gelijk te zijn: de vloer is een voorzichtige ondergrens voor één ochtend, de vertaling is wat de app zelf voorstelt. Voor de ijking geldt de vertaling, omdat het antwoord daartegen wordt gegeven. Wel onzeker (zie onderaan).

Of "wat stijf" echt "wat vermoeid" is, is niet onderzocht. Enkelvoudige welzijnsvragen zijn zelden gevalideerd ([Duignan e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7534939)) (matig), al volgen subjectieve maten belasting gevoeliger dan objectieve ([Saw, Main en Gastin 2016](https://bjsm.bmj.com/content/50/5/281)) (matig tot sterk).

**De spierpijnvloer zit er nooit in.** De modelindex m voor een ijkpunt is alleen de som van de sessiebijdragen, met k = 1: geen pijnpunten, geen vloer van vandaag en geen vloer van flinke spierpijn gisteren. Anders meet het antwoord zichzelf.

## C. De getallen

**Ondergrens m: 4 (eigen keuze, houden).** Onder 4 zegt Fris niets en is Wat stijf meestal iets anders dan training: slaap, zitten, de dag zelf.

**Alleen informatieve punten tellen (afwijking).** Een punt telt alleen mee als zijn interval een deel van 0,7 tot 1,4 uitsluit. Fris bij m = 4 zegt "k hoogstens 2": dat sluit niets uit, dus het telt niet. Informatief zijn vooral ochtenden met m tussen ongeveer 6 en 17. Zonder deze regel haal je 20 punten met rustige ochtenden die niets zeggen (afgeleid).

**Minimum: 20 informatieve punten, gewogen (eigen keuze, onderbouwd).** Zie elk punt als een stem "hoger" of "lager". Bij 20 stemmen is 14 tegen 6 de kleinste verdeling die je bij toeval maar in ongeveer 6 van de 100 gevallen ziet (binomiale kans, afgeleid). Minder punten kan een patroon niet van toeval onderscheiden. Opeenvolgende ochtenden na dezelfde sessie lijken op elkaar, dus 20 is in werkelijkheid wat minder; daarom ook de krimp.

**Venster: 90 dagen (eigen keuze, houden), met een eigen lijst.** De app bewaart nu hoogstens 60 ochtendchecks (`MorningCard.tsx`, `MorningCheckInSheet.tsx` en `MorningCheckInCard.tsx`, `slice(-60)`). Binnen 60 dagen haal je 20 informatieve punten waarschijnlijk niet. Advies: een eigen append-only lijst van benenantwoorden die 180 dagen blijft staan, met per ochtend de datum, het antwoord, of het alleen het bovenlichaam was, en of het een bevestiging was. De modelindex sla je niet op: die reken je elke keer opnieuw uit de logs, die toch blijven. Dan blijft alles deterministisch en kloppen oude punten ook na een verbetering van het model. Dit is een nieuw veld, dus een migratiestap. Waarom 90 dagen: lang genoeg voor genoeg punten, kort genoeg om een nieuwe fase te volgen. Gewenning zit al in het model.

**Krimp naar 1: gewicht n/(n+20) (eigen keuze, houden).** Bij precies 20 punten gaat de helft van de afwijking door, bij 60 driekwart. Een eerste uitkomst van 1,30 wordt zo 1,14. Dat vangt toeval en samenhangende ochtenden op.

**Grenzen: 0,7 tot 1,4 (eigen keuze, houden).** Smaller dan de spreiding uit de literatuur, zie A.

**Leersnelheid: anders (eigen keuze).** 0,05 per week past slecht bij Akkoord: dat wordt elke week een vraag. Voorstel: hoogstens één voorstel per 28 dagen, alleen als het verschil met de geldende factor minstens 0,10 is, met een stap van hoogstens 0,15, afgerond op 0,05. Dat is ongeveer even snel als 0,05 per week, maar in stappen die je kunt lezen ("110 procent", "115 procent").

**Mediaan over intervallen in plaats van afgekapte middens (afwijking).** Een midden met afgekapte open kanten trekt de uitkomst naar 0,5 of 2, getallen die je zelf kiest. Beter: kies de k waarbij de gewogen afstand tot alle intervallen het kleinst is. In gewone woorden: de k waarbij ongeveer evenveel ochtenden "hoger" als "lager" zeggen. Dat is de mediaan voor gegevens die je alleen als interval kent ([Turnbull 1976](https://doi.org/10.1111/j.2517-6161.1976.tb01597.x)) (sterk voor de methode). Hij is ongevoelig voor uitschieters en heeft geen afkapping nodig.

## D. Valkuilen

**Vaker antwoorden na een zware dag.** Is geen vertekening, zolang de keuze om te antwoorden van de index afhangt en niet van het antwoord. De schatting kijkt naar het antwoord bij een gegeven m (afgeleid).

**Wel vertekening: "Gaat goed".** Wie zich fris voelt en "Gaat goed" tikt, levert geen benenantwoord. Laat je die weg, dan blijven vooral de stijve ochtenden over en gaat k omhoog. Daarom: "Gaat goed" telt als Fris met half gewicht (eigen keuze).

**Zelfbevestiging door de voorinvulling.** Een vooraf ingevuld antwoord trekt mensen naar dat antwoord: het standaardeffect ([Johnson en Goldstein 2003](https://doi.org/10.1126/science.1091721)) en verankering ([Tversky en Kahneman 1974](https://doi.org/10.1126/science.185.4157.1124)) (sterk voor het effect in het algemeen, niet getoetst voor deze vraag). Een bevestiging zegt "het model klopt" en trekt k naar de factor waarmee de voorinvulling is gemaakt.

Bevestigingen weglaten is fout: dan tel je alleen de ochtenden waarop je het oneens was, en duwt de ijking k altijd weg van 1. Advies: bewaar bij elk antwoord `legsSuggested` (de coördinator kan dat), en laat een bevestiging voor de helft tellen. Bevestiging is zowel "Klopt: ..." op de kaart als het blad opslaan met de voorinvulling ongewijzigd. Een antwoord zonder voorinvulling (geen bijdrage, of de ochtend na een test of wedstrijd, die open vraagt) telt vol. Antwoorden van voor dat veld bestond: geen vlag, dus tel ze als bevestiging als het antwoord gelijk is aan wat `suggestLegs` die ochtend met k = 1 zou voorstellen (voorzichtig, afgeleid).

**Spierpijnvloer op dezelfde ochtend.** Opgelost doordat m zonder vloer en zonder pijnpunten wordt gerekend (zie B).

**Pijn is geen vermoeidheid.** Een ochtend met beenpijn in de 72 uur ervoor telt niet. Dan zegt het antwoord iets over een plek, niet over de index (afgeleid). Bij pijn of klachten hoort een arts of fysiotherapeut, geen factor.

**Ziekte en tochten.** Niet meetellen: een ochtend tijdens een ziekte en de drie dagen na "weer beter" (bij koorts of spierpijn in het hele lijf voelen je benen zwaar zonder training), en een ochtend tijdens een tocht en de twee dagen erna. De index is niet gebouwd voor meerdaagse tochten (*Spierbelasting en beenvermoeidheid*). Verlof zonder training mag wel meetellen: dan is m vanzelf laag.

**Meetfouten in de logs.** Een verkeerde duur of RPE geeft een verkeerde m (*Betrouwbaarheid*: tot 5 tot 12 punten bij beenkracht). De mediaan over intervallen laat één rare ochtend maar één stem uitbrengen, hoe ver hij ook afwijkt.

**Rondzingen.** m is altijd met k = 1 gerekend, nooit met de geldende factor. Anders leert de factor van zichzelf.

**Twee getallen.** Met k onder 1 ziet de kaart bijvoorbeeld "Fris, 7", terwijl de planner met 9 rekent en een test nog weigert. Dat is de bedoeling, maar zonder uitleg voelt het als een fout. Eén zin bij een weigering is nodig, bijvoorbeeld "De planner rekent voorzichtig met de standaardindex." Taak voor de ontwerper, niet voor deze regel.

## E. Wanneer zegt de app "past slecht"?

Bereken bij de gevonden k welk deel van de gewogen punten het daarmee oneens is, met wat speling: het interval aan beide kanten 10 procent ruimer. Is dat meer dan 40 procent, dan spreken de ochtenden elkaar tegen. Dan stelt de app geen factor voor, maar zegt hij één zin: "Je ochtenden en de beenindex lopen vaak uiteen, in beide richtingen. Een factor lost dat niet op." Bij vier antwoordstanden en een index die zelf 2 punten kan schelen, is 20 tot 30 procent onenigheid normaal (afgeleid); 40 procent is een eigen keuze.

Komt de gevonden k (voor de krimp) op of voorbij 0,7 of 1,4, dan zegt de app erbij dat je benen verder afwijken dan hij wil bijstellen. Het voorstel blijft dan de grens.

Voor later, niet nu: de afwijking uitzetten tegen het aantal dagen sinds de grootste bijdrage. Groeit die met de dagen, dan zit het in het tempo van herstel en niet in de schaal.

## F. Wat nooit soepeler mag

De bouwer test elk punt apart, telkens met een factor van 0,7 tegen een factor van 1.

1. Test- en wedstrijdvrijheid in de planner (`scheduler.ts#freshnessAt`, `adviceTestRun.ts`) rekent met max(1, k).
2. Ruimte voor een test en de testweek (`weekValidator.ts`) rekenen met max(1, k).
3. Afstand tussen zware dagen en de drempel voor hard (12) met max(1, k) (`legDayEase.ts`, `adviceCompute.ts`, `adviceShared.ts`).
4. Zware week, lichter-voorstel en de lijfcheck (`bodyCheck.ts`, `strengthHistory.ts`, `standing.ts`) met max(1, k).
5. De 48 uur tussen zware benen en kwaliteit blijft exact.
6. Pijnpunten blijven +3 en pijn maakt nooit "fris", ook niet in de voorinvulling.
7. De spierpijnvloer (8,5 en 12, en 8,5 de dag na flink) blijft exact en wordt nooit met k vermenigvuldigd.
8. De drempels in `FATIGUE_THRESHOLDS` veranderen niet.
9. De voorinvulling stelt nooit Flinke spierpijn voor en nooit Fris bij recente beenpijn.
10. De ochtend na een test of wedstrijd blijft een open vraag.
11. De ijkpunten gebruiken nooit de spierpijnvloer, de pijnpunten of de geldende factor.
12. De factor geldt pas na Akkoord; zonder Akkoord blijft k = 1. Uit en terug naar de standaard werken altijd en zetten k direct op 1.
13. Logs en ochtendantwoorden worden nooit herschreven; de factor en elke wijziging ervan staan met datum in een eigen append-only lijst.

## Wat Sherpa bouwt

Opslag (migratiestap): een lijst van benenantwoorden (datum, antwoord, bovenlichaam ja of nee, `legsSuggested`), 180 dagen bewaard, aangevuld bij elk opgeslagen ochtendantwoord en bij de migratie gevuld uit de bestaande ochtendchecks. Een lijst van factorbesluiten (datum, k, bron: Akkoord, Uit of Standaard). Een instelling "Beenindex leert van je ochtenden", standaard aan (hij stelt alleen voor).

De berekening, elke keer opnieuw uit de historie:

1. Neem elke datum d van vandaag tot 90 dagen terug met een benenantwoord. Bovenlichaam telt niet. "Gaat goed" telt als Fris.
2. Sla d over als: een ziekte liep op d of eindigde hoogstens 3 dagen voor d; d valt in een tochtperiode of hoogstens 2 dagen erna; er een log met beenpijn is in de 72 uur voor d (dezelfde regel als `painRecent`).
3. m = de som van `points` van de `contributions` uit `legFatigueOn(d, { logs: logs met completedDate voor d, plannedSessions: [], templates, today: d, bodyKg })`. Dus zonder pijnpunten, zonder spierpijn en met k = 1. Is m kleiner dan 4, sla d over.
4. Interval voor k. Fris: ondergrens 0, bovengrens 8/m. Wat stijf: 8/m tot 12/m. Spierpijn of Flinke spierpijn: 12/m tot oneindig.
5. Sla het punt over als het interval 0,7 tot 1,4 helemaal bevat (ondergrens hoogstens 0,7 en bovengrens minstens 1,4).
6. Gewicht w = 0,5 als het antwoord een bevestiging was (`legsSuggested`, of bij oude antwoorden: gelijk aan `suggestLegs` met k = 1) of "Gaat goed"; anders 1.
7. n = de som van de gewichten. Is n kleiner dan 20: geen uitkomst, de app zegt alleen hoeveel er nog nodig zijn.
8. Voor elke k van 0,50 tot en met 2,00 in stappen van 0,01: verlies(k) = de som van w keer de afstand van ln k tot het interval in ln (0 als k erin ligt). Kies de k met het kleinste verlies. Bij gelijk verlies de k die het dichtst bij 1 ligt; is dat ook gelijk, de grootste. Dat is k_fit.
9. Past slecht: tel het gewicht van de punten waarbij k_fit buiten het interval valt, met de ondergrens keer 0,9 en de bovengrens keer 1,1. Is dat meer dan 0,4 keer n, dan geen voorstel en de zin uit E.
10. Krimp: k_s = exp( n/(n+20) keer ln k_fit ).
11. Begrens en rond af: k_t = k_s begrensd tussen 0,7 en 1,4, afgerond op 0,05.
12. Voorstel als het verschil tussen k_t en de geldende factor minstens 0,10 is en er in de 28 dagen ervoor geen voorstel was (getoond of afgewezen). Voorgestelde factor = de geldende factor plus het verschil, begrensd tussen min 0,15 en plus 0,15, afgerond op 0,05. Tekst omhoog: "Je benen voelen vaker zwaarder dan de index zegt. Reken met 115 procent?" Tekst omlaag: "Je benen voelen vaker frisser dan de index zegt. Toon de index met 90 procent? De planning blijft voorzichtig rekenen."
13. Gebruik. k is de geldende factor na Akkoord, anders 1. Voor alles wat beslist: index = max(m_vandaag keer max(1, k) plus pijnpunten, spierpijnvloer). Voor woorden, voorinvulling, kaart en grafiek: index = max(m_vandaag keer k plus pijnpunten, spierpijnvloer). m_vandaag is de gewone som van de bijdragen, met geplande sessies erbij zoals nu.

Tests: elke regel uit F apart; een historie met 25 informatieve ochtenden die allemaal "hoger" zeggen geeft een eerste voorstel van hoogstens 1,15; alleen bevestigingen geven k = 1; "Gaat goed" weglaten zou k verhogen (de test laat zien dat half gewicht dat dempt); een tegenstrijdige historie geeft "past slecht" en geen voorstel; dezelfde historie geeft altijd dezelfde uitkomst.

## Wat het onderzoek zegt

Mensen verschillen sterk in herstel na excentrische belasting, al snel een factor twee tot vier, vooral gemeten aan armspieren van ongetrainde mensen (matig). Een ochtendantwoord met vier standen kan maar één getal dragen. Een vooringevuld antwoord trekt mensen naar dat antwoord (sterk in het algemeen). Voor gegevens die je alleen als interval kent is een mediaan over intervallen de gewone, robuuste schatter (sterk voor de methode).

## Wat het betekent voor de app

Eén factor, voorzichtig geschat, alleen strenger voor de planning en alleen na Akkoord. De ijking maakt de woorden beter waar de index nu het zwakst is, rond 8 tot 12, zonder één veiligheidsregel te raken. Er is een eigen lijst van ochtendantwoorden nodig en een vlag voor bevestigingen, dus een migratiestap.

## Wat nog onzeker is

- Of "Wat stijf" echt overeenkomt met een index van 8 tot 12 en Spierpijn met boven 12. Dat is de vertaling van de app zelf, niet gemeten. De spierpijnvloer gebruikt voor Spierpijn 8,5; als blijkt dat Spierpijn vaak bij een index van 9 tot 11 valt, ligt de grens voor Spierpijn beter op 10.
- Hoe sterk de voorinvulling jouw antwoord stuurt. Half gewicht is een eigen keuze. Na een paar maanden met `legsSuggested`: vergelijk hoe vaak je het oneens bent met en zonder voorinvulling.
- Hoe vaak "Gaat goed" voorkomt; is dat vaak, dan bepaalt het halve gewicht veel.
- Alle getallen in C en E (20, 90, 180, n0 20, 0,7 tot 1,4, 0,10, 0,15, 28 dagen, 40 procent) zijn eigen keuzes. Alleen de 14 tegen 6 bij 20 is berekend.
- Of de afwijking in de schaal zit of in het tempo van herstel; zie de diagnose voor later in E.
- Opeenvolgende ochtenden na één sessie zijn geen losse metingen; de krimp vangt dat deels op.
- Dit is geen medisch advies. Bij pijn of klachten: een arts of fysiotherapeut.

## Bronnen

- [Paulsen e.a. 2012, Leucocytes, cytokines and satellite cells after eccentric exercise](https://pubmed.ncbi.nlm.nih.gov/22876722/)
- [Hubal, Rubinstein en Clarkson 2007, Mechanisms of variability in strength loss after muscle-lengthening actions](https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_miscellaneous_70455484)
- [Clarkson e.a. 2005, ACTN3 and MLCK genotype associations with exertional muscle damage](https://hsrc.himmelfarb.gwu.edu/smhs_peds_facpubs/4266)
- [Hellard e.a. 2006, limitations of the Banister model](https://pmc.ncbi.nlm.nih.gov/articles/pmid/16608765)
- [Busso en Chalencon 2023, validity of impulse-response models](https://pubmed.ncbi.nlm.nih.gov/36791017/)
- [Nosaka, Newton en Sacco 2002, soreness and muscle damage](https://ro.ecu.edu.au/ecuworks/4145)
- [Saw, Main en Gastin 2016, subjective versus objective measures](https://bjsm.bmj.com/content/50/5/281)
- [Duignan e.a. 2020, single-item wellbeing measures](https://pmc.ncbi.nlm.nih.gov/articles/PMC7534939)
- [Turnbull 1976, empirical distribution with interval censored data](https://doi.org/10.1111/j.2517-6161.1976.tb01597.x)
- [Johnson en Goldstein 2003, Do defaults save lives?](https://doi.org/10.1126/science.1091721)
- [Tversky en Kahneman 1974, Judgment under uncertainty](https://doi.org/10.1126/science.185.4157.1124)
