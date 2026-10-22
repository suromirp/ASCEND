# Kracht loggen en progressie: wat MacroFactor Workouts doet, wat de wetenschap zegt en wat ASCEND ermee kan

Onderzoeksrapport, 22 oktober 2026. Aanleiding: de eigenaar overweegt zijn krachttrainingen op termijn in ASCEND zelf te loggen, eerst als test naast MacroFactor Workouts. Hij vindt het systeem van MacroFactor goed: een inspanning per set, voorgestelde gewichten, herhalingen en RIR, opwarmsets die oplopen naar het werkgewicht, en een volgend gewicht dat zich aanpast als je minder haalde. Dit rapport probeert te begrijpen hoe dat werkt en wat de wetenschap erachter zegt. Er is niets van MacroFactor overgenomen: geen teksten, geen afbeeldingen, geen database. Er is geen code geschreven.

Dit bouwt voort op wat er al ligt, en herhaalt dat niet uitgebreid:

- *Warming up voor krachttraining* (de opwarmsets op ongeveer 50% en 80% van het werkgewicht);
- *Betrouwbaarheid beenvermoeidheid-index* en *Andere manieren om belasting te plannen* (RIR-schatting, autoregulatie);
- *Aanvullend onderzoek GR5 voorbereiding* met de notitie `notities/Aanvullend onderzoek GR5 voorbereiding/kracht_programma.md` (volume, frequentie, deloads, Pelland, de regels F1 tot F5);
- `docs/visie/Trainingswetenschap.md` (idee 8, kracht zonder MacroFactor over te doen) en `docs/visie/Data zonder handwerk.md` (de MacroFactor-export als CSV);
- het besluit `docs/beslissingen/2026-10-22-macrofactor-leidend-voor-kracht.md`.

Hoe sterk iets is, staat er steeds bij. Voor de wetenschap: **sterk** (meerdere meta-analyses of consistente gecontroleerde studies), **matig** (één goede meta-analyse of enkele consistente kleine studies), **zwak** (kleine of enkele studies, of alleen via een samenvatting gelezen), **expert** (richtlijnen en coachpraktijk zonder uitkomstdata) en **afgeleid** (mijn eigen redenering of berekening). Voor MacroFactor: **officieel** (hun helpcentrum of eigen site zegt het), **gemeld** (reviews of gebruikers zeggen het) en **afgeleid** (ik leid het af uit wat officieel is).

## 1. In het kort

1. MacroFactor Workouts rekent met **herhalingen tot falen**: wat je deed plus wat je nog over had (RIR, schaal 0 tot 6+). Een voorschrift als "7 tot 9 herhalingen met 2 over" betekent voor hen dat je met dat gewicht ongeveer 10 herhalingen tot falen zou halen. Doe je meer, dan gaat het voorschrift omhoog; doe je minder, dan gaat het licht omlaag (officieel).
2. Achter de schermen bestaat een **krachtschatting** en een **vermoeidheidslogica**; ze werken in 2026 aan een nieuwe versie om "onregelmatige gewichten en herhalingen glad te strijken" (officieel). De formule is niet openbaar. Een voorbeeld op hun eigen site komt lager uit dan de bekende Epley-formule, dus hun schatting lijkt voorzichtig (afgeleid).
3. **Gekleurde bolletjes per set** zijn in geen enkele openbare bron beschreven. Wel bevestigd: de RIR staat als getal in een rondje naast de herhalingen, en het toverstafje voor de progressie kleurt blauw, geel of rood. Wat de kleuren van de bolletjes betekenen, moeten de screenshots van de eigenaar laten zien.
4. De wetenschap steunt de aanpak redelijk: sturen op RIR werkt minstens zo goed als vaste percentages (matig), mensen schatten hun RIR gemiddeld één herhaling te laag en beter dichter bij falen (matig), gewicht of herhalingen ophogen werkt ongeveer even goed (zwak tot matig). Een geschat maximum uit één set is onnauwkeurig, maar als **trendmaat binnen dezelfde oefening** bruikbaar (afgeleid, gesteund door matig bewijs over de spreiding).
5. Voor een openbare repo is **wger** de schoonste open database (932 oefeningen, licentie per oefening, meestal CC-BY-SA), maar met maar 49 Nederlandse namen. **free-exercise-db** heeft de handigste structuur en heet publiek domein, maar de herkomst van de inhoud en de foto's is niet gedocumenteerd. Mijn advies: een eigen kleine lijst van 40 tot 80 oefeningen met eigen Nederlandse namen en eigen spierindeling, zonder foto's.
6. Een eenvoudig rekenmodel past in `engine/`: een geschat maximum per oefening uit gewicht, herhalingen en RIR, gladgestreken over sessies, een voorschrift dat eerst het gewicht kiest en anders een herhaling toevoegt, afronding op wat je echt hebt, de opwarmsets uit het bestaande rapport, en een rustige reactie op gemiste herhalingen.
7. Waar ASCEND meer kan dan MacroFactor: het weet wanneer je benen moe zijn van een bergtocht of lange loop, en kan een slechte beendag dan uitleggen in plaats van het gewicht te verlagen. Het kent de GR5-fases en kan op tijd van opbouwen naar behouden schakelen.

## 2. Hoe MacroFactor Workouts werkt

MacroFactor Workouts is in januari 2026 uitgekomen, van hetzelfde bedrijf als Stronger By Science ([MacroFactor nieuwsbrief januari 2026](https://macrofactor.com/mm-jan-2026/); [App Store](https://apps.apple.com/app/id6737156524)). De makers noemen de progressie uitdrukkelijk "op regels gebaseerd, geen generatieve AI" ([productpagina, 2026](https://macrofactor.com/workouts/)) (officieel). Een openbare beschrijving van de wiskunde bestaat niet. Wat volgt is opgebouwd uit het helpcentrum, hun blog en twee reviews. Reddit was vanaf deze omgeving niet bereikbaar en een podcastaflevering over de app heb ik niet gevonden; gebruikerservaringen komen daarom alleen uit reviews en zijn dun.

### De inspanningsmaat: RIR van 0 tot 6+

Officieel: je logt per set de RIR, het aantal herhalingen dat je nog had kunnen doen, op een schaal van 0 tot 6+. Alles wat makkelijker is dan zes over, is gewoon 6+. Loggen is optioneel maar "sterk aanbevolen", en het hoeft niet precies te zijn ([help 385](https://help.macrofactorapp.com/en/articles/385-what-is-rir-and-how-should-i-use-it-during-training)). Je kunt de RIR na de set nog aanpassen ([help 314](https://help.macrofactorapp.com/en/articles/314-changing-rir-during-an-active-workout)). Naast de herhalingen van elke set staat een getal in een rondje: dat is de RIR ([help 293](https://help.macrofactorapp.com/en/articles/293-setting-rir-for-exercises-in-a-program); [FeastGood-review, oktober 2026](https://feastgood.com/marofactor-workouts-review/)). Hun blog over RIR gebruikt een omrekening van RPE naar RIR die ze aanpassen van Zourdos 2016, met RPE 10 als niets meer over en RPE 8 als twee over ([MacroFactor, Reps in reserve, april 2026](https://macrofactor.com/reps-in-reserve/)) (officieel). Het is dus RIR, met RPE als vertaling op de achtergrond.

De kleuren. Officieel beschreven zijn alleen de kleuren van het toverstafje van de progressie: blauw is uitleg, geel is "kijk even, dit is een grotere stap dan je misschien verwacht", rood is "dit gewicht of toestel zit niet in je sportschoolprofiel" ([help 391](https://help.macrofactorapp.com/en/articles/391-what-does-the-smart-progression-wand-mean)). Sets zelf hebben letters: W voor opwarmen, D voor dropset, M voor myo-reps, F voor een set tot falen ([help 317](https://help.macrofactorapp.com/en/articles/317-logging-different-types-of-sets)). Over gekleurde bolletjes per set voor de inspanning vond ik niets, ook niet in reviews. Mijn vermoeden is dat het rondje met de RIR van kleur verandert met de zwaarte (afgeleid, niet bevestigd).

### De verwachte prestatie: herhalingen tot falen

Dit is de kern, en het is officieel ([help 372](https://help.macrofactorapp.com/en/articles/372-what-does-progressive-overload-mean-in-macrofactor-workouts)):

- **Sets niet tot falen.** Je krijgt een bereik en een RIR, bijvoorbeeld 7 tot 9 herhalingen met 2 over. De verwachting is het midden plus de RIR: 8 + 2 = 10 herhalingen tot falen. Haal je 9 met 2 over (samen 11), dan is dat vooruitgang. Wijk je af van de RIR, dan telt het nog steeds: 8 met 3 over, 10 met 1 over of 11 met 0 over is allemaal "meer dan verwacht".
- **Sets tot falen.** Vooruitgang is meer herhalingen dan de vorige keer bij hetzelfde gewicht.

In gewone woorden: MacroFactor telt de herhalingen die je deed op bij de herhalingen die je nog had, en vergelijkt die som met wat het verwachtte. Een set van 8 met 2 over en een set van 10 met 0 over zijn voor de app ongeveer even zwaar. Dat is precies hoe de RIR-gebaseerde RPE-schaal van Zourdos en Helms bedoeld is (zie hoofdstuk 3).

De invoer van de aanbevelingen is ook officieel: het gewicht en de herhalingen die je logt, het RIR-doel, hoe je prestatie zich verhoudt tot de verwachting, en je hele geschiedenis met die oefening ([help 373](https://help.macrofactorapp.com/en/articles/373-why-does-the-app-sometimes-recommend-lowering-weight-or-reps)). Zonder geschiedenis geeft de app geen gewicht; je kiest het eerste zelf ([help 377](https://help.macrofactorapp.com/en/articles/377-how-do-i-know-what-weight-to-start-with); [help 305](https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions)).

### Een geschat maximum: er is er een, de formule is geheim

Het woord e1RM gebruiken ze nergens. Toch is er officieel een krachtschatting: het overzicht na een training toont "estimated strength" ([quick start](https://macrofactor.com/welcome-to-macrofactor-workouts/)), en in april 2026 meldden ze dat ze werken aan "grote updates van de krachtschatting en de vermoeidheidslogica" om onregelmatige gewichten en herhalingen glad te strijken ([nieuwsbrief april 2026](https://macrofactor.com/mm-april-2026/)). In mei kondigden ze opnieuw aan dat de progressielogica wordt bijgewerkt ([nieuwsbrief mei 2026](https://macrofactor.com/mm-may-2026/)).

Hun RIR-blog geeft één rekenvoorbeeld: 275 lb voor 5 herhalingen met 2 over zou wijzen op een kracht "ergens rond 305 tot 325 lb" ([Reps in reserve, 2026](https://macrofactor.com/reps-in-reserve/)) (officieel). Ter vergelijking, met 7 herhalingen tot falen geeft Epley 339 lb en Brzycki 330 lb (afgeleid, eigen berekening). Hun band ligt dus 4 tot 10% lager dan de gangbare formules. Dat kan betekenen dat ze bewust voorzichtig rekenen, dat ze per oefening een eigen omrekening gebruiken, of dat het voorbeeld alleen ter illustratie is (afgeleid, onzeker).

### Gewicht of herhalingen omhoog

Officieel zijn er drie knoppen die dit sturen ([help 305](https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions); [nieuwsbrief april 2026](https://macrofactor.com/mm-april-2026/)):

- **Bereik verbreden** (Expand Rep Range): als een gewichtsstap te groot is, mag de app buiten het bereik gaan. Voorbeeld van hen: na 100 lb maal 8 is 105 lb te zwaar, dus 100 lb maal 9.
- **Gewicht vasthouden** (Weight Match): de app houdt liever het gewicht van de vorige set als dat nog een goed doel geeft.
- **Eerst herhalingen, dan gewicht**: een instelling uit april 2026.

Dat de eigenaar "op gewicht staat", is waarschijnlijk die laatste instelling uit, of het verbreden van het bereik uit (afgeleid; de screenshots kunnen dat bevestigen).

Bij lichte gewichten stelt de app soms veel herhalingen voor, omdat een vaste stap daar een groot percentage is: van 10 naar 15 lb is 50% zwaarder, van 100 naar 105 lb maar 5% ([help 392](https://help.macrofactorapp.com/en/articles/392-why-am-i-being-recommended-very-high-reps)) (officieel). Lukt progressie niet binnen het bereik (je deed 15 herhalingen bij een bereik van 8 tot 10), dan meldt de app dat en kan hij nieuwe doelen berekenen uit je recente prestaties ([help 305](https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions)).

### Minder of meer herhalingen dan gepland

Officieel: minder herhalingen dan gepland (6 in plaats van 8), of minder over dan bedoeld (1 in plaats van 2), kan leiden tot "iets minder gewicht" de volgende keer. De aanpassingen zijn "nooit straffend" ([help 373](https://help.macrofactorapp.com/en/articles/373-why-does-the-app-sometimes-recommend-lowering-weight-or-reps)). Haal je het minimum niet of zit je eerder aan falen, dan is het advies het gewicht in de training zelf te verlagen en door te gaan; een gemiste training wordt niet bestraft ([quick start](https://macrofactor.com/welcome-to-macrofactor-workouts/)). Hoeveel lager, en na hoeveel slechte sets, is niet openbaar.

Gemeld: een review beschrijft grote sprongen van ongeveer 20% in de tweede week (squat van 195 naar 236 lb, bankdrukken van 105 naar 125,5 lb), een voorstel van 11 of meer optrekken terwijl de schrijver er 5 haalde, en na een wissel van toestel een val van 236 lb maal 5 naar 145 lb maal 21. De schrijver noemt de logica degelijk maar "soms onlogisch" ([FeastGood, oktober 2026](https://feastgood.com/marofactor-workouts-review/)). Eén review, één persoon; het zegt vooral dat de eerste weken, met weinig geschiedenis, grillig kunnen zijn.

### Afronding op gewichten en toestellen

Officieel: je maakt een of meer sportschoolprofielen, met de schijven, dumbbells en toestellen die er zijn. Aanbevelingen komen alleen uit wat je hebt aangevinkt; zonder kleine schijven springt de app naar de dichtstbijzijnde stap die je wel hebt ([help 390](https://help.macrofactorapp.com/en/articles/390-how-to-change-equipment-settings-to-simplify-weight-recommendations)). Voor gewichtstapels zijn bereiken in te stellen ([help 403](https://help.macrofactorapp.com/en/articles/403-how-to-configure-weight-stack-ranges-for-pin-loaded-machines)), er is een schijvencalculator ([help 313](https://help.macrofactorapp.com/en/articles/313-using-the-plate-calculator)), en de Smith-machine rekent sinds januari als een stang ([nieuwsbrief januari 2026](https://macrofactor.com/mm-jan-2026/)). Opvallend: voor sommige oefeningen telt de app de beginweerstand van het toestel en een deel van je lichaamsgewicht mee, waardoor er getallen op ,5 of ,75 kunnen uitkomen ([help 390](https://help.macrofactorapp.com/en/articles/390-how-to-change-equipment-settings-to-simplify-weight-recommendations)). Ze rekenen dus intern met de totale last en ronden pas aan het eind af.

### Opwarmsets

Officieel: slimme opwarmsets staan standaard aan voor elke oefening en worden geschaald op het werkgewicht. Ze komen uit een schema van percentages, herhalingen en een referentieset; je kunt per oefening een eigen schema maken ([help 304](https://help.macrofactorapp.com/en/articles/304-configuring-warm-ups); [help 311](https://help.macrofactorapp.com/en/articles/311-remove-or-add-smart-warm-ups)). Het voorbeeld in het helpcentrum is 40%, 60% en 80% van de werkset, met 3 herhalingen op 80%. Hun blog over opwarmen geeft als algemeen model 40% maal 5, 60% maal 5 en 80% maal 3, drie sets bij samengestelde oefeningen, minder bij isolatie, en de app rekent "met dezelfde logica" ([MacroFactor, warm-up, 2026](https://macrofactor.com/warm-up-resistance-training/)). Ze steunen daarbij op Viveiros 2024, dezelfde studie als ons eigen rapport.

Gemeld: in de eerste week had de reviewer geen opwarmsets, vanaf week twee wel, en de training duurde daardoor ruim een uur ([FeastGood](https://feastgood.com/marofactor-workouts-review/)). Of opwarmsets meetellen voor het volume, staat nergens; in de export zijn ze als "Warm-up" gemarkeerd en ASCEND laat ze bij het inlezen al weg (`src/engine/macrofactorImport.ts`).

### De eerste set zwaar: een ijkset

Officieel: gegenereerde programma's beginnen een oefening bewust met een zwaardere set, soms dicht bij falen, en daarna sets met meer over. Het doel is dat je leert hoe falen voelt, zodat je latere RIR-schattingen beter worden ([help 397](https://help.macrofactorapp.com/en/articles/397-is-it-normal-to-see-failure-sets-or-rir-decreasing-across-sets)). Dat is slim: de set die het dichtst bij falen zit, is ook de set waarvan de RIR het betrouwbaarst is (zie hoofdstuk 3). Ik vermoed dat die set het zwaarst meeweegt in de krachtschatting (afgeleid).

### Deload, periodisering en plateaus

Officieel: per programma kies je geen deload, een lichte eerste cyclus of een lichte laatste cyclus per blok ([help 297](https://help.macrofactorapp.com/en/articles/297-deload-first-cycle-or-last-cycle)). Met periodisering zet je per week sets, herhalingen en RIR per oefening ([help 389](https://help.macrofactorapp.com/en/articles/389-how-can-i-customize-periodization-rir-reps-and-sets-for-the-exercises-in-my-program)). Wat een deload precies verlaagt, en of de app een plateau herkent, staat nergens. Het dichtstbij is de knop voor nieuwe doelen uit recente prestaties.

### Volume per spiergroep

Officieel: het scherm Levels toont per spiergroep het aantal sets over de tijd op een lichaamskaart, en sinds april 2026 welke oefeningen bijdragen aan het gemiddelde aantal sets per week. De programma-editor toont sets per spiergroep per dag en per week ([help 280](https://help.macrofactorapp.com/en/articles/280-muscle-groups); [help 343](https://help.macrofactorapp.com/en/articles/343-viewing-sets-and-volume-over-time); [nieuwsbrief april 2026](https://macrofactor.com/mm-april-2026/)). Of ze fractioneel tellen (een halve set voor de triceps bij bankdrukken), staat nergens. Een concurrent beweert dat ze geen wetenschappelijke volumegrenzen gebruiken; dat is reclame en ik laat het liggen. Dat de makers van Stronger By Science het fractionele tellen kennen en verdedigen ligt voor de hand, maar is niet bevestigd voor de app (afgeleid). Een screenshot van Levels na een bankdruktraining zou het beantwoorden.

### Oefeningendatabase en programmamaker

Officieel: "900+" oefeningen en "600+" video's (de cijfers op de site lopen uiteen), eigen oefeningen toevoegen, vervangen zonder dat de progressie breekt ([productpagina](https://macrofactor.com/workouts/); [quick start](https://macrofactor.com/welcome-to-macrofactor-workouts/)). Volgens een andere vermelding komen de techniekvideo's van Jeff Nippard (gemeld). De database is niet open en mag niet gebruikt worden.

De programmamaker vraagt officieel je doel (kracht of spiergroei), ervaring, dagen per week en duur per training, toestellen, uitgesloten oefeningen, en keuzes voor split en nadruk; hij levert oefeningen, sets, herhalingen en RIR ([help 370](https://help.macrofactorapp.com/en/articles/370-what-information-does-macrofactor-workouts-use-to-generate-my-program)). Push, pull, legs was in mei 2026 nog in de maak ([nieuwsbrief mei 2026](https://macrofactor.com/mm-may-2026/)). Gemeld: een paar basisvragen (optrekken, dips, opdrukken, bankdrukken), geen vragen over blessures of sport, één duur voor alle dagen, en geen cardio ([FeastGood](https://feastgood.com/marofactor-workouts-review/)). Dat laatste is precies het gat waar ASCEND staat.

### Wat niet openbaar is

De formule van de krachtschatting, hoe zwaar elke set en elke sessie meetelt, hoeveel het gewicht omhoog of omlaag gaat, wat een deload doet, of er plateauherkenning is, hoe de vermoeidheidslogica werkt, of volume fractioneel telt, en wat de kleuren van de bolletjes betekenen.

## 3. De wetenschap erachter

### De RIR-schaal

Zourdos en collega's verbonden in 2016 de bekende RPE-schaal van 1 tot 10 met herhalingen over: RPE 10 is niets meer over, RPE 9 één, RPE 8 twee. Bij squats hing die beoordeling sterk samen met de snelheid van de stang (r tussen ongeveer -0,77 en -0,88), bij ervaren lifters iets sterker dan bij beginners ([Zourdos e.a. 2016](https://pubmed.ncbi.nlm.nih.gov/26049792/)) (matig; al besproken in *Betrouwbaarheid beenvermoeidheid-index*). Helms en collega's werkten de praktijk uit: kies een gewicht dat bij een doel-RIR past, verlaag het als je de herhalingen niet haalt, verhoog het als je ruim meer over hebt, en laat beginners hun RIR eerst een tijd loggen zonder er het gewicht op te baseren. Hun omrekentabel van percentage naar herhalingen en RIR is volgens henzelf "geen absolute omrekening"; bij 8 herhalingen op 70% van het maximum was de spreiding tussen mensen zo groot dat 1 tot 5 over allemaal kon ([Helms e.a. 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4961270/)) (expert, onderbouwd met een paar studies). MacroFactor bouwt hier direct op voort.

### Hoe goed schatten mensen hun RIR?

De beste samenvatting is een meta-analyse van 12 studies met 414 deelnemers: mensen schatten gemiddeld 0,95 herhaling te weinig over, met een spreiding tussen mensen van ongeveer 1,5 herhaling. Dichter bij falen en bij sets van 12 herhalingen of minder ging het beter. Ervaring, boven- of onderlichaam en het aantal sets maakten geen duidelijk verschil ([Halperin e.a. 2022](https://pubmed.ncbi.nlm.nih.gov/34542869/); cijfers via [Stronger By Science](https://www.strongerbyscience.com/reps-in-reserve)) (matig). Latere kleine studies laten hetzelfde zien: bij 5 over zat men er gemiddeld 1,2 naast, bij 1 over ongeveer een halve herhaling; een studie bij bankdrukken vond een gemiddelde afwijking van 0,65 herhaling, zonder verschil naar geslacht of ervaring (dezelfde bron, zwak tot matig).

De vraag of het beter wordt met meer ervaring, is genuanceerd. Jaren training maken in de meta-analyse weinig uit. Oefenen met dezelfde oefening wel: in een klein onderzoek met negen getrainde mannen die zes weken drie keer per week bankdrukten, was de schatting in week 5 en 6 duidelijk beter dan in week 1 tot 4 ([Florida Atlantic University, 2022](https://fau.isle.flvc.org/node/37482)) (zwak, kleine scriptiestudie). In gewone woorden: je wordt niet vanzelf beter in RIR schatten door jaren te trainen, maar wel door het bij een oefening een paar weken bewust te doen, en door af en toe te voelen waar falen echt ligt. Dat is precies waarom MacroFactor met een zware eerste set werkt.

Wat dit betekent: een RIR van 0 tot 2 is redelijk betrouwbaar (op een halve tot één herhaling), een RIR van 4 of meer is een grove gok, en 6+ zegt alleen "makkelijk" (afgeleid uit het bovenstaande). Voor een rekenmodel zijn de zware sets dus de bruikbare.

### Een geschat maximum: formules en hun fout

Een geschat maximum (e1RM, het gewicht dat je één keer zou kunnen tillen) rekent een zware set om naar één herhaling. De twee bekendste formules, met `h` het aantal herhalingen tot falen:

- Epley: `e1RM = gewicht × (1 + h / 30)`
- Brzycki: `e1RM = gewicht × 36 / (37 - h)`

Met RIR wordt `h` gewoon herhalingen plus RIR. Een voorbeeld in gewone woorden: 70 kg voor 6 herhalingen met 2 over betekent ongeveer 8 tot falen. Epley geeft 70 × (1 + 8/30) = 88,7 kg, Brzycki 70 × 36/29 = 86,9 kg. Onder de 10 herhalingen liggen ze binnen een paar procent van elkaar; daarboven lopen ze uiteen (afgeleid, eigen berekening). Een handige vuistregel uit Epley: **één herhaling is ongeveer 3% van je geschatte maximum**. Bij 60 kg werkgewicht (geschat maximum rond 78 kg) is één herhaling dus ongeveer 2,5 kg, precies één stap met twee schijfjes van 1,25 kg.

Hoe groot is de fout? De grootste analyse tot nu toe bundelde 952 tests tot falen bij 7.289 mensen uit 269 studies. Het aantal herhalingen bij een bepaald percentage verschilt sterk per oefening (beenpers veel meer dan bankdrukken) en tussen mensen, en die spreiding wordt groter naarmate het gewicht lichter is. Geslacht, leeftijd en trainingsstatus maakten weinig uit ([Nuzzo e.a. 2024](https://pure.solent.ac.uk/en/publications/maximal-number-of-repetitions-at-percentages-of-the-one-repetitio/)) (sterk voor het patroon). Op 70% van het maximum haalde men gemiddeld ongeveer 15 herhalingen in plaats van de 12 uit de oude tabellen, bij de beenpers zelfs ongeveer 19 ([Zourdos over Nuzzo, Stronger By Science](https://www.strongerbyscience.com/?p=59930)) (matig, secundair gelezen). Een preprint uit 2026 op ruim 300.000 bijna-falen-sets uit een fitnessapp vond dat de omrekening ook afhangt van het gewicht zelf en dat dat de inconsistentie met 17 tot 22% verminderde ([Marzagao 2026](https://arxiv.org/abs/2603.17495)) (zwak: niet beoordeeld, geen echte maxima gemeten).

De les voor ASCEND (afgeleid): een geschat maximum is geen echt maximum. Het is een **interne munt** waarmee je sets van verschillende zwaarte binnen dezelfde oefening en dezelfde persoon kunt vergelijken. Omdat ASCEND het getal alleen gebruikt om voor dezelfde oefening een gewicht in hetzelfde herhalingenbereik voor te stellen, valt de fout van de formule grotendeels tegen zichzelf weg. Die fout wordt pas groot bij veel herhalingen, bij lichte oefeningen en tussen oefeningen. Daarom: alleen sets met hooguit ongeveer 12 herhalingen tot falen gebruiken, nooit een geschat maximum als "je max" tonen, en nooit van de ene oefening naar de andere omrekenen.

### Gewicht of herhalingen ophogen

Bij getrainde mensen gaf acht weken lang het gewicht ophogen (herhalingen gelijk) ongeveer hetzelfde resultaat als de herhalingen ophogen (gewicht gelijk), met een klein en onzeker voordeel van ongeveer 2 kg in maximale kracht voor gewicht ophogen ([Plotkin e.a. 2022](https://peerj.com/articles/14142)) (zwak tot matig, één gecontroleerde studie). De oude richtlijn van de ACSM zegt: verhoog het gewicht met 2 tot 10% als je een of twee herhalingen meer haalt dan het doel ([ACSM 2009](https://www.sportgeneeskunde.com/wp-content/uploads/ACSM-Position-Stand-Progression-Models-in-Resistance-Training-for-Healthy-Adults.pdf)) (expert; inmiddels vervangen door de positie van 2026, die vooral zegt dat consistentie en inspanning tellen). Dat de eigenaar liever het gewicht ziet stijgen, is dus een goede keuze voor kracht, maar geen noodzaak; op dumbbells en kleine toestellen moet de app toch vaak eerst herhalingen ophogen, omdat de stap te groot is.

### Sturen op gevoel of op vaste percentages

Een meta-analyse vond dat sturen op RPE, RIR of stangsnelheid ongeveer dezelfde krachtwinst geeft als vaste percentages, met een kleine, net niet significante voorsprong voor sturen op RPE of RIR (gemiddeld ongeveer 3 kg meer op het maximum) ([Hickmott e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8762534/)) (matig; 8 studies naar gewichtssturing, waarvan 6 in de meta-analyse, kleine groepen). Kleine kanttekening bij een eerder rapport: *Andere manieren om belasting te plannen* noemt deze bron als "Sports Medicine Open 2021, 15 studies"; het is Hickmott 2022, en het aantal van 15 omvat vermoedelijk ook de studies naar volumesturing. Twee losse studies wijzen dezelfde kant op: RPE-sturing gaf bij 21 getrainde mannen een klein voordeel dat niet significant was ([Helms e.a. 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC5877330/)), en RIR-sturing van de squat gaf in twaalf weken meer krachtwinst dan vaste lasten ([Graham en Cleather 2021, online 2019](https://research.stmarys.ac.uk/3067)) (zwak tot matig). Samengevat: sturen op RIR is minstens zo goed als vaste percentages, en het grote praktische voordeel is dat het vanzelf meebeweegt met slechte en goede dagen.

### Hoe dicht bij falen

Voor kracht maakt het weinig uit of je 0 of 3 herhalingen over houdt; voor spiergroei helpt dichter bij falen een beetje ([Robinson e.a. 2023, preprint](https://sportrxiv.org/index.php/server/preprint/view/295); [Refalo e.a. 2024](https://www.tandfonline.com/doi/full/10.1080/02640414.2024.2321021)) (matig; al in de notitie over het krachtprogramma). Voor iemand die ook loopt en bergtochten maakt, is 1 tot 3 over op de beenoefeningen een verstandig doel: bijna alle winst, minder vermoeidheid voor de volgende loop (afgeleid).

### Opwarmen

Het eigen rapport *Warming up voor krachttraining* blijft staan: twee opwarmsets van de eerste oefening, ongeveer 50% voor 6 tot 8 herhalingen en ongeveer 80% voor 3 tot 5, is wat het onderzoek steunt ([Viveiros e.a. 2024](https://pubmed.ncbi.nlm.nih.gov/39593476/); [Ribeiro e.a. 2020](https://pubmed.ncbi.nlm.nih.gov/32971729/)) (matig). Het schema van MacroFactor (40, 60, 80%) past daarbinnen; het verschil is één extra lichte set. Bij zware gewichten is een derde, lichte set redelijk; bij lichte gewichten en isolatieoefeningen is het overbodig (afgeleid).

### Volume per spiergroep en fractioneel tellen

De grootste analyse tot nu toe (67 studies, 2.058 deelnemers) telde een directe set als 1 en een indirecte set (de triceps bij bankdrukken) als een halve. Die fractionele telling voorspelde de uitkomsten het best. Meer volume geeft meer spiergroei en meer kracht, maar met afnemende meeropbrengst, voor kracht veel steiler dan voor spiergroei; vaker trainen helpt vooral de kracht ([Pelland e.a. 2025](https://sponet.de/sponet/Record/4097139?lng=en); [preprint](https://sportrxiv.org/index.php/server/preprint/view/460)) (matig tot sterk). De drempels uit de preprint, ongeveer 2 directe sets per spier per training voor kracht en ongeveer 11 fractionele voor spiergroei, heb ik niet in de definitieve tekst kunnen nalezen (zwak). Praktisch: ongeveer 10 harde sets per spiergroep per week, verdeeld over twee trainingen, is een goede richtwaarde voor een recreant (al vastgelegd als regel F1 in *Aanvullend onderzoek GR5 voorbereiding*).

### Behouden in plaats van opbouwen

In de zomer, met veel bergtochten en daarna de GR5 zelf, is kracht behouden het doel. Jonge volwassenen hielden na 16 weken training hun kracht en spiermassa 32 weken lang vast met een derde en zelfs een negende van het oorspronkelijke volume, zolang de zwaarte bleef ([Bickel e.a. 2011](https://pubmed.ncbi.nlm.nih.gov/21131862/)) (matig, één gecontroleerde studie, 39 jonge deelnemers, matige methodologische score). Dat sluit aan bij de deloadconsensus: volume omlaag, zwaarte mag blijven ([Bell e.a. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/)) (expert).

### Wat sterk en wat zwak onderbouwd is

Sterk: dat het aantal herhalingen bij een gegeven percentage per oefening en per persoon flink verschilt, en dat volume met afnemende meeropbrengst werkt. Matig: dat RIR gemiddeld een herhaling te laag wordt geschat en beter wordt dichter bij falen; dat sturen op RIR minstens zo goed werkt als vaste percentages; dat fractioneel tellen het best past. Zwak: dat gewicht ophogen iets beter is dan herhalingen ophogen; dat RIR-schatten beter wordt met oefening; de precieze drempels per training. Geen bewijs: voor een specifieke formule voor het gladstrijken van een geschat maximum, voor een plateaudrempel, of voor de beste grootte van een gewichtsstap. Die getallen in hoofdstuk 5 zijn dus keuzes, geen uitkomsten.

## 4. Open oefeningendatabases

Wat ASCEND nodig heeft: een naam (liefst Nederlands), primaire en secundaire spieren, het toestel (voor de afronding), en een bewegingspatroon (voor de beenindex en de opwarmsets). Afbeeldingen zijn mooi maar niet nodig, en ze zijn juridisch het lastigste deel.

**free-exercise-db** ([yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db)). Meer dan 800 oefeningen als losse JSON-bestanden met een schema, met per oefening `primaryMuscles`, `secondaryMuscles`, `equipment`, `level`, `mechanic` (samengesteld of isolatie), `force` (duwen, trekken, statisch), `category`, instructies en foto's (jpg). Er zijn 17 spiergroepen (onder andere quadriceps, hamstrings, glutes, calves, lower back, abductors, adductors) en 12 soorten toestel ([schema](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/schema.json)). Licentie: Unlicense, dus publiek domein; gebruik, aanpassen en verkopen mag zonder naamsvermelding. Alleen Engels. De data is een herwerking van [wrkout/exercises.json](https://github.com/wrkout/exercises.json), ook Unlicense. Kanttekening: geen van beide repo's zegt waar de teksten en foto's oorspronkelijk vandaan komen, en een Unlicense kan alleen rechten weggeven die de maker zelf heeft. De indeling (niveau "beginner, intermediate, expert", hoofd- en andere spieren, "force") lijkt sterk op die van een grote commerciële oefeningensite van vroeger (afgeleid, niet bevestigd). Voor een openbare hobbyrepo is het risico klein; bij verkoop zou ik de foto's en de instructieteksten niet gebruiken en alleen de feitelijke indeling (welke spier, welk toestel) als inspiratie nemen. Feiten zelf zijn doorgaans niet auteursrechtelijk beschermd, maar dat is geen juridisch advies.

**wger** ([wger-project/wger](https://github.com/wger-project/wger); [API](https://wger.de/api/v2/exercise/)). De open trainingsapp met een open API. Op 22 oktober 2026 telde de API 932 oefeningen en 383 afbeeldingen. Per oefening primaire en secundaire spieren, toestel en een "variatiegroep". De spierlijst is kort (15) maar anatomisch, met de soleus en de gastrocnemius apart, wat voor kuitwerk richting de GR5 precies goed is ([spieren](https://wger.de/api/v2/muscle/)). Nederlands: maar 49 vertalingen ([vertalingen in het Nederlands](https://wger.de/api/v2/exercise-translation/?language=6&limit=5)). Licentie: de code is AGPL-3.0 (niet relevant als je alleen de data gebruikt); de data heeft per oefening en per afbeelding een eigen licentie met auteur. Het voorbeeld dat ik opvroeg stond op CC-BY-SA 4.0 ([oefening 9](https://wger.de/api/v2/exerciseinfo/9/)), de afbeelding op CC-BY-SA 3.0, en de documentatie noemt de oorspronkelijke dataset CC-BY-SA 3.0 ([documentatie](https://wger.readthedocs.io/)); de API kent ook CC-BY, CC0 en ODbL ([licenties](https://wger.de/api/v2/license/)). Wat CC-BY-SA betekent: gebruiken en verkopen mag, maar je moet de auteur en de licentie noemen, en een bewerkte versie van de data moet weer onder dezelfde licentie. Een databestand dat los naast de app staat, maakt de app zelf daarmee volgens de gangbare lezing niet CC-BY-SA, maar de bewerkte oefenlijst wel. Ook dat is geen juridisch advies.

**exercemus** ([exercemus/exercises](https://github.com/exercemus/exercises)). Een samenvoeging van wger, exercises.json en eigen werk, met primaire en secundaire spieren, toestel, aliassen en soms tempo. Code onder MIT, maar elke oefening houdt de licentie van zijn bron; de README zegt zelf dat je per oefening auteur en licentie moet tonen. Handig als bron, maar je erft de licentiemix.

**exercises-dataset** ([hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)). 1.324 oefeningen, data en teksten onder MIT, maar de afbeeldingen en animaties zijn auteursrechtelijk van een commerciële partij en vragen een eigen licentie. Alleen de kale data zou bruikbaar zijn; de herkomst van die data staat er niet bij.

**RepDB, gratis deel** ([sergei-argutin/exercise-dataset](https://github.com/sergei-argutin/exercise-dataset)). Volgens de zoekresultaten gratis voor gebruik in een app met naamsvermelding, met beperkingen op de afbeeldingen. Geen open licentie in de strikte zin; niet nader onderzocht.

Advies (afgeleid): ASCEND heeft geen 900 oefeningen nodig. De eigenaar traint met een beperkte set, en de GR5-lijst uit *Trainingswetenschap* (squat, step-downs, step-ups met rugzak, Roemeense deadlift, kuitheffen met gestrekte en gebogen knie, tibialis, carries, rugstrekken) plus een gewone boven- en onderlichaamindeling is samen 40 tot 80 oefeningen. Die lijst kan ASCEND zelf schrijven in `data/`, met eigen Nederlandse namen, eigen spierindeling (primair telt 1, secundair een halve), toestel, bewegingspatroon en of de oefening de benen belast. Zonder foto's, of later met eigen lijnpictogrammen in de stijl van `icons.tsx`. Dan is er geen licentievraag, ook niet bij verkoop. De wger-id kan als verwijzing mee, zodat een latere koppeling makkelijk blijft; neem je teksten of afbeeldingen van wger over, dan horen naamsvermelding en de CC-BY-SA-regel erbij. Voor de koppeling met MacroFactor-namen bestaat al een naamkoppeling (`engine/macrofactorNames.ts`).

## 5. Wat dit betekent voor ASCEND: een voorstel voor een rekenmodel

Alles hieronder is een voorstel voor engine-regels, geen besluit. De getallen zijn startwaarden om te toetsen, niet uitkomsten van onderzoek. De regels heten KR (kracht) zodat ze in een latere beslissing en in tests herkenbaar zijn.

### Wat er eerst moet kunnen

Nu bewaart ASCEND per set alleen herhalingen, gewicht en een optionele RPE (`SetLog` in `src/models/training.ts`). Bij het inlezen van MacroFactor gaan de RIR per set en de opwarmsets verloren: de RIR wordt samengevat tot één laagste waarde voor de beenindex (`engine/macrofactorSets.ts`) en de opwarmsets worden overgeslagen. Voor dit model is per set nodig: herhalingen, gewicht, RIR en soort (opwarmen of werkset). Dat is een uitbreiding van een opgeslagen vorm en vraagt dus een migratiestap, zoals CLAUDE.md voorschrijft. Daarnaast per oefening een toestelprofiel voor de afronding.

Een goedkope eerste stap: het model kan al gevoed worden met de MacroFactor-exports die nu binnenkomen, als die de RIR per set blijven bewaren. Dan rekent ASCEND een paar weken stil mee en kun je zijn voorstel naast dat van MacroFactor leggen, voordat de eigenaar ook maar één set in ASCEND logt.

### KR-1. Een geschat maximum per set

Voor elke werkset: `e1RM = gewicht × (1 + (herhalingen + RIR) / 30)` (Epley met herhalingen tot falen). Voorwaarden:

- Alleen werksets, nooit opwarmsets.
- Alleen als herhalingen plus RIR hooguit 12 is; daarboven is de omrekening te onzeker (Nuzzo, Halperin).
- RIR 6+ telt niet mee voor de schatting; RIR 4 of 5 telt mee met een half gewicht.
- Ontbreekt de RIR, dan geen schatting uit die set (of RIR 2 als zwakke aanname, duidelijk gemarkeerd). Liever niets dan schijnprecisie.
- Bij oefeningen met lichaamsgewicht (optrekken, dips) is de last het lichaamsgewicht plus het extra gewicht; ASCEND kent het lichaamsgewicht al uit MacroFactor (`docs/beslissingen/2026-10-22-gewicht-uit-macrofactor.md`).

Waarom Epley en niet iets slimmers: onder 12 herhalingen verschillen de formules een paar procent, Epley is het makkelijkst uit te leggen ("één herhaling is ongeveer 3%"), en de fout valt binnen één oefening grotendeels weg (afgeleid).

### KR-2. Eén getal per training

Per oefening per training: het gemiddelde van de twee hoogste schattingen uit KR-1, of de ene als er maar één is. Niet alleen de hoogste, omdat één toevallig goede set dan te zwaar telt; niet alle sets, omdat latere sets door vermoeidheid lager uitvallen terwijl je kracht niet lager is (afgeleid). De zwaarste set van de dag, de set met de laagste RIR, is ook de betrouwbaarste (Halperin).

### KR-3. Gladstrijken over trainingen

`nieuw = oud + k × (vandaag - oud)`. In gewone woorden: het nieuwe getal schuift een deel van de afstand op naar wat je vandaag liet zien.

- Omhoog: k = 0,5. Een goede dag telt half mee, twee goede dagen achter elkaar brengen je ongeveer driekwart van de weg.
- Omlaag: k = 0,25. Eén slechte dag kost weinig. Twee slechte dagen achter elkaar: daarna k = 0,5.
- Omlaag na zware benen: k = 0,1 voor een beenoefening als de beenindex die ochtend "zwaar" of "flink" zegt, of als er in de 48 uur ervoor een bergtocht, een lange duurloop of een harde loop was. Na een loop deden getrainde mannen 9 tot 19% minder herhalingen ([Ratamess e.a. 2016](https://doi.org/10.1519/JSC.0000000000001548)), en na 5 en 7 km rennen daalde het beenpersvolume met 12 en 22% ([Ribeiro N e.a. 2019](https://doi.org/10.1080/17461391.2018.1500643)) (matig, uit *Warming up voor krachttraining*). Dat is vermoeidheid, geen krachtverlies, en het model hoort dat te weten.
- Na een pauze van meer dan drie weken voor die oefening: de eerste training opnieuw als beginpunt, met k = 0,7.

Deze k-waarden zijn een keuze (afgeleid). Asymmetrisch remmen past bij het principe in de rest van ASCEND: wel snel volgen als het goed gaat, rustig bij één slechte dag, en nooit straffen. MacroFactor zegt hetzelfde ("nooit straffend").

### KR-4. Het voorschrift voor de volgende keer

Invoer: het gladgestreken maximum, het herhalingenbereik (bijvoorbeeld 6 tot 8), de doel-RIR (bijvoorbeeld 2) en het toestelprofiel. Dan:

1. Doel in herhalingen tot falen: het midden van het bereik plus de RIR (7 + 2 = 9), zoals MacroFactor.
2. Ideaal gewicht: `maximum / (1 + 9/30)`.
3. Afronden naar beneden op een gewicht dat je hebt (KR-6).
4. Verwachte herhalingen bij dat gewicht: `30 × (maximum / gewicht - 1) - RIR`, naar beneden afgerond.
5. Gewicht eerst (de voorkeur van de eigenaar): neem het zwaarste beschikbare gewicht waarbij de verwachte herhalingen nog minstens de onderkant van het bereik halen. Is dat hetzelfde gewicht als vorige keer, dan wordt het doel de vorige herhalingen plus één, tot de bovenkant van het bereik (dubbele progressie als terugvaloptie).

Een rekenvoorbeeld. Geschat maximum 88 kg, bereik 6 tot 8, 2 over. Ideaal gewicht 88 / 1,3 = 67,7 kg. Afgerond op een stang met schijfjes van 1,25 kg: 67,5 kg. Verwacht: 30 × (88 / 67,5 - 1) - 2 = 7,1, dus 7 herhalingen met 2 over. Dat ligt in het bereik, dus het voorstel is 67,5 kg maal 7, met 2 over.

### KR-5. Hoe groot een stap mag zijn

Per training hooguit één gewichtsstap of 5% omhoog, wat het grootst is, en per week hooguit 10%. Omlaag hooguit 10% per training. Dit is een rem tegen de sprongen van 20% die een reviewer bij MacroFactor zag. Het getal 5% komt van de ACSM-band van 2 tot 10% (expert) en van de vuistregel dat 5% ongeveer anderhalve herhaling is (afgeleid).

### KR-6. Afronden op wat je echt hebt

Een toestelprofiel per oefening: stang (gewicht van de stang en het kleinste paar schijven, meestal 2 × 1,25 kg, dus stappen van 2,5 kg), dumbbells (een lijst, bijvoorbeeld per 2 kg), een gewichtstapel (stappen en bereik), lichaamsgewicht met extra gewicht, of een rugzak of vest (stappen van 1 kg; sluit aan op de rugzakladder). Werksets naar beneden afronden, opwarmsets naar het dichtstbijzijnde gewicht, nooit onder de lege stang. Rekenen gebeurt met de echte last; alleen het voorstel wordt afgerond, zoals MacroFactor ook doet.

Als de kleinste stap groter is dan ongeveer 1,5 herhaling (zie KR-5), schakelt de oefening vanzelf naar herhalingen ophogen. Dat zal bij dumbbells voor de schouders en armen vaak gebeuren, en dat is geen fout maar rekenkunde: een stap van 2 kg op 10 kg is 20%.

### KR-7. Opwarmsets

Volgens *Warming up voor krachttraining*, nu als regel:

- Alleen voor de eerste oefening van een bewegingspatroon (de eerste squat, de eerste druk, de eerste trek, de eerste heupscharnier). Bij een volgende oefening met een nieuw patroon één voelset op ongeveer 65% voor 5 herhalingen.
- Werkgewicht tot ongeveer de lege stang plus 10 kg, of een isolatieoefening: geen opwarmset.
- Standaard: ongeveer 50% voor 6 tot 8 herhalingen, ongeveer 80% voor 3 tot 5.
- Bij zware gewichten (werkgewicht meer dan ongeveer drie keer de lege stang) een derde set vooraf, ongeveer 35 tot 40% voor 5.
- Afronden op het profiel; valt een opwarmset samen met de vorige, dan vervalt hij.
- Opwarmsets tellen niet voor het volume en niet voor het geschatte maximum.

### KR-8. Gemiste en extra herhalingen

- In de training zelf: haal je in de eerste werkset 2 of meer herhalingen tot falen minder dan verwacht, stel dan voor de volgende sets 5% lichter voor (één tik, "Liever niet" mag). Haal je er 2 of meer meer, stel dan één stap zwaarder voor. Dat doet MacroFactor ook en het is de praktijk die Helms beschrijft (expert).
- De volgende keer volgt vanzelf uit KR-3: een slechte dag verlaagt het maximum een beetje, een goede dag verhoogt het flink.
- Bij zware benen (KR-3, derde punt): gewicht houden, doel in herhalingen een lager, en een zin die het uitlegt: "Gisteren 1.100 m daling; vandaag minder herhalingen is normaal, je gewicht blijft staan."
- Twee trainingen achter elkaar duidelijk onder de verwachting, zonder vermoeidheid die het verklaart: 5% lager en dat zeggen. Drie keer: de plateauregel.

### KR-9. Plateau

Als het gladgestreken maximum van een hoofdoefening na vier trainingen niet meer dan 1% hoger is dan ervoor, terwijl je trainingen volgehouden zijn, een voorstel met keuzes: een ander herhalingenbereik voor de volgende fase (bijvoorbeeld van 6 tot 8 naar 8 tot 12), de rustweek naar voren halen, of het zo laten. In de GR5-fases en in het wedstrijdblok is gelijk blijven het doel, dus dan geen plateaumelding. Er bestaat geen gevalideerde drempel voor een plateau (expert); vier trainingen en 1% zijn een keuze.

### KR-10. Volume per spiergroep

Per week per spiergroep: werksets met hooguit 4 over tellen; de primaire spier telt 1, een secundaire een halve (Pelland). Tonen als band bij de spiergroep (bijvoorbeeld "billen 9 sets, kuiten 3"), niet als score. Voor ASCEND is de beenkant het interessantst: het aantal harde beensets per week is een betere invoer voor de beenindex dan één RIR per training, en een kuit- of tibialiswerk dat structureel ontbreekt is een nuttige melding richting de GR5.

### KR-11. Rustweken en fases

De krachtdeload valt samen met de rustweken die ASCEND al plant (`engine/restWeek.ts`) en met de taper voor de 10 km: dezelfde dagen, 40 tot 50% minder sets, hetzelfde gewicht, 2 over extra (Bell 2023, expert). In Bergcapaciteit en Expeditieklaar schakelen de beenoefeningen naar behouden: een derde van het volume, zwaarte blijft (Bickel 2011, matig), zodat de benen hun kracht houden voor de rugzak en de afdalingen. Bovenlichaam en romp kunnen gewoon doorlopen.

### KR-12. Af en toe ijken

Om de vier weken per hoofdoefening één laatste set "tot er nog één over is", om het gevoel voor RIR te ijken, zoals Helms en de makers van MacroFactor aanraden (expert). Niet op een beendag in de 72 uur voor een test of wedstrijd, en niet de dag voor een bergtocht.

### Wat ASCEND anders of beter kan

- **Vermoeidheid uitleggen in plaats van straffen.** MacroFactor ziet alleen je sets. ASCEND weet dat je gisteren een bergtocht met 12 kg liep of vanochtend een lange duurloop deed, en kan een slechte beendag daarom als vermoeidheid lezen (KR-3, KR-8). Dat is het grootste verschil, en het volgt direct uit wat de app al heeft (`engine/legFatigue.ts`, de 48-uursregel in de planner).
- **De beenindex met echte inspanning.** Met een RIR per set rekent de beenindex niet meer met de aanname RPE 8 en één getal per training, maar met het aantal harde beensets en hoe hard ze waren. Dat lost knelpunt 7 uit *Trainingswetenschap* echt op.
- **Fases die de GR5 kennen.** Opbouwen in de winter, behouden in de bergmaanden, minder beensets in de taper. MacroFactor kent alleen blokken en deloads; het weet niet dat er in juli een tocht van een maand komt.
- **Rugzak en vest als gewicht.** Step-ups en step-downs met rugzak kunnen dezelfde stappen van 1 tot 2 kg volgen als de rugzakladder (`engine/packLadder.ts`), en nooit tegelijk met een stap in de rugzak op de bergtocht van die week (de regel "één variabele tegelijk").
- **Eerlijke getallen.** Het geschatte maximum heet in de app "geschatte kracht" en verschijnt als lijn, nooit als "je max". Bij elk voorstel één zin waar het vandaan komt, zoals de rest van ASCEND doet.

### Hoe je het eerst toetst

Vier tot zes weken laat ASCEND stil meerekenen op de MacroFactor-exports. Per hoofdoefening per training noteer je het voorstel van ASCEND en het voorstel van MacroFactor (uit de screenshots of de app). Een redelijke verwachting om te toetsen: in minstens vier op de vijf gevallen liggen ze niet meer dan één gewichtsstap uit elkaar, en waar ze verschillen, kan ASCEND uitleggen waarom (bijvoorbeeld vermoeidheid na een tocht). Pas als dat klopt, is loggen in ASCEND naast MacroFactor zinvol.

### Aannames die nog getest moeten worden

- Dat Epley met herhalingen plus RIR voor de oefeningen van de eigenaar een stabiele trend geeft; vooral bij beenpers, kuiten en machines kan het afwijken.
- Dat de RIR van de eigenaar op de zware sets binnen ongeveer één herhaling klopt.
- De k-waarden van KR-3, de grens van 12 herhalingen, de stapgrens van 5% en de plateaudrempel.
- Dat de vermoeidheidsregel (KR-3, derde punt) niet te veel slechte dagen wegverklaart.
- Dat de eigenaar per set een RIR wil invullen in ASCEND; zonder dat werkt het model niet.

## 6. Afsluiting

### Wat het onderzoek zegt

MacroFactor Workouts stuurt op herhalingen tot falen: wat je deed plus wat je over had, vergeleken met wat het verwachtte. Daarachter zit een krachtschatting en een vermoeidheidslogica waarvan de formule niet openbaar is, en waaraan ze in 2026 nog werken. De wetenschap steunt de kern: RIR-sturing werkt minstens zo goed als vaste percentages, RIR-schattingen zijn ongeveer één herhaling te voorzichtig en het best dicht bij falen, gewicht en herhalingen ophogen werken allebei, opwarmsets op ongeveer 50 en 80% zijn genoeg, en fractioneel tellen past het best bij volume per spiergroep. Een geschat maximum uit één set is onnauwkeurig, maar binnen één oefening bruikbaar als trend.

### Wat het betekent voor de app

Een klein, toetsbaar model in `engine/` is haalbaar: KR-1 tot KR-12 hierboven. Eerst moet de opgeslagen set een RIR en een soort krijgen (met een migratie), en daarna kan het model stil meerekenen op de MacroFactor-exports voordat de eigenaar iets in ASCEND logt. Oefeningen komen het best uit een eigen, kleine Nederlandse lijst zonder foto's, eventueel met verwijzing naar wger. Het echte voordeel boven MacroFactor zit niet in een slimmere formule, maar in de context: beenvermoeidheid, bergtochten, de rugzakladder en de GR5-fases.

### Wat nog onzeker is

De formule van MacroFactor en hun regels voor stappen, deloads, plateaus en volume zijn niet openbaar; wat hier staat is opgebouwd uit helpartikelen, twee reviews en eigen afleiding. Reddit en podcasts konden niet worden geraadpleegd. De kleuren van de bolletjes zijn niet beschreven. Van een paar studies (Halperin, Pelland, Plotkin, Nuzzo) heb ik alleen de samenvatting of een secundaire bespreking gelezen. De herkomst van de inhoud van free-exercise-db is onbekend. Alle getallen in hoofdstuk 5 zijn startwaarden zonder eigen toetsing.

### Vragen voor de eigenaar bij de screenshots

1. Wat betekenen de kleuren van de bolletjes: is dat de RIR van de set (en welke kleur bij welke RIR), of iets anders, zoals boven of onder de verwachting?
2. Welke instellingen staan aan bij Smart Progression: bereik verbreden, gewicht vasthouden, eerst herhalingen of eerst gewicht?
3. Hoe ziet je sportschoolprofiel eruit: kleinste schijven, dumbbellstappen, toestellen? Daar hangt de afronding van af.
4. Welk opwarmschema gebruikt de app bij je squat en bankdrukken (percentages en herhalingen), en heb je dat aangepast?
5. Is je eerste werkset zwaarder dan de rest (de ijkset), en hoe vaak vul je bij elke set een RIR in?
6. Een voorbeeld waarin je minder herhalingen haalde: wat deed de app de volgende keer met gewicht en herhalingen?
7. Zie je ergens een "geschatte kracht" of een grafiek per oefening, en hoe beweegt die na een slechte dag?
8. Het scherm Levels na een bankdruktraining: telt de triceps daar mee, en als een halve set?
9. Staat er een deload in je programma (eerste of laatste cyclus), en hoe lang is een blok?
10. Zou je bereid zijn een paar weken in ASCEND per set de RIR in te vullen naast MacroFactor, of alleen de export te laten inlezen?

## Bronnen

MacroFactor (officieel, geraadpleegd 22 oktober 2026):

- Productpagina Workouts, 2026: https://macrofactor.com/workouts/
- Quick start, januari 2026: https://macrofactor.com/welcome-to-macrofactor-workouts/
- Nieuwsbrief januari 2026: https://macrofactor.com/mm-jan-2026/
- Nieuwsbrief april 2026: https://macrofactor.com/mm-april-2026/
- Nieuwsbrief mei 2026: https://macrofactor.com/mm-may-2026/
- Blog Reps in reserve, april 2026: https://macrofactor.com/reps-in-reserve/
- Blog warm-up, 2026: https://macrofactor.com/warm-up-resistance-training/
- Help 280, spiergroepen: https://help.macrofactorapp.com/en/articles/280-muscle-groups
- Help 293, RIR instellen: https://help.macrofactorapp.com/en/articles/293-setting-rir-for-exercises-in-a-program
- Help 297, deload: https://help.macrofactorapp.com/en/articles/297-deload-first-cycle-or-last-cycle
- Help 304, opwarmsets instellen: https://help.macrofactorapp.com/en/articles/304-configuring-warm-ups
- Help 305, Smart Progression: https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions
- Help 311, opwarmsets aan of uit: https://help.macrofactorapp.com/en/articles/311-remove-or-add-smart-warm-ups
- Help 313, schijvencalculator: https://help.macrofactorapp.com/en/articles/313-using-the-plate-calculator
- Help 314, RIR aanpassen: https://help.macrofactorapp.com/en/articles/314-changing-rir-during-an-active-workout
- Help 317, soorten sets: https://help.macrofactorapp.com/en/articles/317-logging-different-types-of-sets
- Help 343, sets en volume: https://help.macrofactorapp.com/en/articles/343-viewing-sets-and-volume-over-time
- Help 370, programmamaker: https://help.macrofactorapp.com/en/articles/370-what-information-does-macrofactor-workouts-use-to-generate-my-program
- Help 372, progressieve overload: https://help.macrofactorapp.com/en/articles/372-what-does-progressive-overload-mean-in-macrofactor-workouts
- Help 373, gewicht of herhalingen omlaag: https://help.macrofactorapp.com/en/articles/373-why-does-the-app-sometimes-recommend-lowering-weight-or-reps
- Help 377, startgewicht: https://help.macrofactorapp.com/en/articles/377-how-do-i-know-what-weight-to-start-with
- Help 385, RIR: https://help.macrofactorapp.com/en/articles/385-what-is-rir-and-how-should-i-use-it-during-training
- Help 389, periodisering: https://help.macrofactorapp.com/en/articles/389-how-can-i-customize-periodization-rir-reps-and-sets-for-the-exercises-in-my-program
- Help 390, toestellen en afronding: https://help.macrofactorapp.com/en/articles/390-how-to-change-equipment-settings-to-simplify-weight-recommendations
- Help 391, het toverstafje: https://help.macrofactorapp.com/en/articles/391-what-does-the-smart-progression-wand-mean
- Help 392, veel herhalingen: https://help.macrofactorapp.com/en/articles/392-why-am-i-being-recommended-very-high-reps
- Help 397, ijkset en dalende RIR: https://help.macrofactorapp.com/en/articles/397-is-it-normal-to-see-failure-sets-or-rir-decreasing-across-sets
- Help 403, gewichtstapels: https://help.macrofactorapp.com/en/articles/403-how-to-configure-weight-stack-ranges-for-pin-loaded-machines
- App Store, MacroFactor Workouts: https://apps.apple.com/app/id6737156524

Reviews (gemeld):

- FeastGood, review MacroFactor Workouts, oktober 2026: https://feastgood.com/marofactor-workouts-review/
- GainFrame (concurrent), review, september 2026: https://gainframe.app/blog/macrofactor-workouts-review/

Onderzoek:

- Zourdos e.a. 2016, RIR-gebaseerde RPE-schaal: https://pubmed.ncbi.nlm.nih.gov/26049792/
- Helms e.a. 2016, toepassing van de RIR-schaal: https://pmc.ncbi.nlm.nih.gov/articles/PMC4961270/
- Halperin e.a. 2022, nauwkeurigheid van RIR, meta-analyse: https://pubmed.ncbi.nlm.nih.gov/34542869/
- Stronger By Science, overzicht RIR-nauwkeurigheid: https://www.strongerbyscience.com/reps-in-reserve
- Florida Atlantic University 2022, RIR-nauwkeurigheid over zes weken: https://fau.isle.flvc.org/node/37482
- Nuzzo e.a. 2024, herhalingen bij percentages van het maximum: https://pure.solent.ac.uk/en/publications/maximal-number-of-repetitions-at-percentages-of-the-one-repetitio/
- Zourdos over Nuzzo, Stronger By Science: https://www.strongerbyscience.com/?p=59930
- Marzagao 2026, preprint omrekening naar 1RM: https://arxiv.org/abs/2603.17495
- Plotkin e.a. 2022, gewicht of herhalingen ophogen: https://peerj.com/articles/14142
- ACSM 2009, progressiemodellen: https://www.sportgeneeskunde.com/wp-content/uploads/ACSM-Position-Stand-Progression-Models-in-Resistance-Training-for-Healthy-Adults.pdf
- Hickmott e.a. 2022, autoregulatie, meta-analyse: https://pmc.ncbi.nlm.nih.gov/articles/PMC8762534/
- Helms e.a. 2018, RPE tegenover percentages: https://pmc.ncbi.nlm.nih.gov/articles/PMC5877330/
- Graham en Cleather 2021, RIR-sturing van de squat: https://research.stmarys.ac.uk/3067
- Robinson e.a. 2023, nabijheid tot falen, preprint: https://sportrxiv.org/index.php/server/preprint/view/295
- Refalo e.a. 2024, falen of 1 tot 2 over: https://www.tandfonline.com/doi/full/10.1080/02640414.2024.2321021
- Viveiros e.a. 2024, opwarmset op 80%: https://pubmed.ncbi.nlm.nih.gov/39593476/
- Ribeiro e.a. 2020, opwarmsets: https://pubmed.ncbi.nlm.nih.gov/32971729/
- Ratamess e.a. 2016, kracht na een loop: https://doi.org/10.1519/JSC.0000000000001548
- Ribeiro N e.a. 2019, beenpers na 3, 5 en 7 km: https://doi.org/10.1080/17461391.2018.1500643
- Pelland e.a. 2025, volume en frequentie, fractioneel tellen: https://sponet.de/sponet/Record/4097139?lng=en (preprint: https://sportrxiv.org/index.php/server/preprint/view/460)
- Bickel e.a. 2011, behoud met minder volume: https://pubmed.ncbi.nlm.nih.gov/21131862/
- Bell e.a. 2023, deload-consensus: https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/

Oefeningendatabases:

- free-exercise-db: https://github.com/yuhonas/free-exercise-db (schema: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/schema.json)
- wrkout/exercises.json: https://github.com/wrkout/exercises.json
- wger, code: https://github.com/wger-project/wger
- wger, API en licenties: https://wger.de/api/v2/exercise/ en https://wger.de/api/v2/license/ en https://wger.de/api/v2/muscle/
- wger, documentatie: https://wger.readthedocs.io/
- exercemus: https://github.com/exercemus/exercises
- exercises-dataset: https://github.com/hasaneyldrm/exercises-dataset
- RepDB gratis deel: https://github.com/sergei-argutin/exercise-dataset

Eigen rapporten waarop dit voortbouwt: *Warming up voor krachttraining*, *Betrouwbaarheid beenvermoeidheid-index*, *Andere manieren om belasting te plannen*, *Aanvullend onderzoek GR5 voorbereiding* (met de notitie over het krachtprogramma), *Spierbelasting en beenvermoeidheid*, en in `docs/visie/` *Trainingswetenschap* en *Data zonder handwerk*.

Geen medisch advies. Bij pijn of klachten tijdens of na krachttraining: een arts of fysiotherapeut.

## 7. Aanvulling: wat de screenshots van de eigenaar laten zien

De eigenaar stuurde op 22 oktober 2026 schermafdrukken van zijn eigen MacroFactor Workouts (versie 1.4.1). Die staan niet in de repo, omdat er persoonsgegevens op staan. Wat ze laten zien, zonder die gegevens:

- **De bolletjes zijn de RIR.** Het getal in het rondje is de doel-RIR per set ("2", oranje). Het voorschrift luidt bijvoorbeeld "47,5 kg x 11 tot 13, 2 RIR". Welke kleur bij welke RIR hoort, is nog niet bekend.
- **Per set een eigen gewicht.** Bij een barbell row met vier sets van 11 tot 13 bij 2 RIR schrijft de app 47,5, 45, 42,5 en 42,5 kg voor. Vermoeidheid binnen de training zit dus in het voorschrift, niet alleen tussen trainingen. Dat ontbreekt in KR-4 en hoort er als aanvulling bij.
- **Bereik verbreden bij grove stappen.** Bij een kabeloefening in stappen van 5 kg (30 kg x 6 of 25 kg x 11 bij een doel van 7 tot 9) meldt de app dat het herhalingenbereik tijdelijk is verbreed, zonder het plan te veranderen. Dat bevestigt KR-6.
- **Twee manieren van opwarmen.** "Slim": percentages van het geschatte 1RM (40% x 10 en 61% x 6). "Schema": percentages van het eerste werkgewicht (40, 60 en 80% voor 5, 5 en 3). Met de optie om op handige schijven af te ronden en voltooide opwarmsets te verbergen.
- **Sportschoolprofielen** met stangen (15 en 20 kg), schijven met aantallen (1,25 tot 20 kg) en bumper plates. Ruilen kiest alleen oefeningen met dezelfde spieren die in die sportschool kunnen.
- **Lichaamsgewicht telt mee.** Een machine-assisted pull-up staat als negatief gewicht, met het lichaamsgewicht erbij opgeteld. Elke oefening heeft een "bijdrage van het lichaamsgewicht" (bij de row 8%).
- **Fractioneel tellen bevestigd.** De biceps krijgt 10,5 sets uit drie trekoefeningen: secundair telt half. De lichaamskaart toont het gemiddelde aantal sets per week per spier over een maand.
- **Een geschat 1RM per training** staat in de historie van elke oefening, als trendgetal.
- **Programma's in blokken.** Het actieve programma is een kant-en-klaar bovenlichaam-onderlichaamschema met drie trainingen per week, met wisselende blokken in de historie. Per oefening zijn er instellingen voor gewichtsstappen, rusttijd, bereik verbreden, opwarmen en "niet aanbevelen".

Voor ASCEND valt één ding op. Over een maand gemiddeld kregen kuiten, scheenbeenspieren en heupabductoren 0 sets per week, en de hamstrings 1,9. Voor lopen met een zware rugzak bergaf zijn juist die spieren belangrijk (zie *Spierbelasting en beenvermoeidheid*). Dat is precies het soort melding dat ASCEND kan geven en MacroFactor niet, omdat MacroFactor de GR5 niet kent.
