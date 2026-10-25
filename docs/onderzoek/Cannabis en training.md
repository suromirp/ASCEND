# Cannabis en training

Datum: 25 oktober 2026
Door: Scout Cannabis
Status: onderzoek en voorstel. In `src/` is niets veranderd. Dit rapport gaat over een recreatieve sporter in het algemeen die af en toe of regelmatig cannabis gebruikt, niet over een bepaalde persoon. Er staat geen persoonsgegeven en geen gewoonte van wie dan ook in. Geen medisch advies: wie last heeft van hartkloppingen, duizeligheid, benauwdheid of pijn op de borst gaat naar een arts.

## Samenvatting

THC (het werkzame deel van cannabis dat je high maakt) verhoogt de hartslag binnen enkele minuten. Bij mensen die zelden gebruiken was dat in een gecontroleerde proef 11 tot 27 slagen per minuut in rust, het hoogst direct na het gebruik en na ongeveer drie uur weer terug ([Spindle e.a. 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6324384/)) (bewijs: matig). Bij wekelijkse gebruikers die fietsten lag de hartslag bij een rustig tempo 14 tot 18 slagen hoger en daalde het vermogen in een tijdrit van 20 minuten met 5 tot 8 procent ([Cheung e.a. 2024](https://pubmed.ncbi.nlm.nih.gov/38299223/)) (bewijs: matig). Bij regelmatige gebruikers met een eetbare dosis van 10 mg was het verschil maar 3 tot 5 slagen en niet zeker ([Ewell e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9760823/)) (bewijs: zwak tot matig). Hoe vaker iemand gebruikt, hoe kleiner het effect op de hartslag, maar het verdwijnt niet helemaal ([Colizzi en Bhattacharyya 2018](https://iris.univr.it/handle/11562/995710)) (bewijs: matig).

Lopen voelt na THC zwaarder bij hetzelfde tempo, en tegelijk leuker ([Gibson e.a. 2024](https://doi.org/10.1007/s40279-023-01980-4)) (bewijs: matig). Sneller of sterker word je er niet van; elk overzicht vindt geen of een negatief effect op prestatie ([Kennedy 2017](https://researchprofiles.canberra.edu.au/en/publications/cannabis-exercise-performance-and-sport/); [Kramer e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7819470/); [Burr e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8566388/)) (bewijs: matig). Het grootste praktische risico is niet het hart maar de balans en het reactievermogen: die zijn na roken of dampen drie tot zes uur minder, na eten tot tien uur ([McCartney e.a. 2021](https://doi.org/10.1016/j.neubiorev.2021.01.003)) (bewijs: matig tot sterk). Op straat en op een smal bergpad, alleen, telt dat.

Voor de gegevens in ASCEND betekent het: één rustige loop kort na gebruik kan bij iemand die zelden gebruikt 20 tot 40 seconden per km trager lijken bij dezelfde hartslag (afgeleid). Dat is genoeg voor een misleidende "Let op" na de loop, en omdat de trend "Tempo bij zone 2" twee weken met maar een paar loopjes middelt, kan die ene loop de trend 5 tot 10 seconden per km verschuiven, net zoveel als een maand echte vooruitgang (afgeleid, uit de code). De ochtendgetallen verschuiven door één nacht vrijwel niet: één afwijkende nacht verandert een gemiddelde van 28 dagen met minder dan 0,2 slag. Belasting (duur, afstand, hoogtemeters) klopt gewoon.

Advies: bouw geen vraag over een middel. Bouw twee dingen die voor alles werken wat je hartslag een dag scheef trekt (warmte, ziek worden, een korte nacht, alcohol, cafeïne, een haperende polsmeting, en ook cannabis): de trend rekent robuuster zodat één uitschieter weinig doet, en bij een loop staat, verstopt in het menu, de keuze "Hartslag niet meetellen", die die loop uit de hartslaginzichten haalt en in de belasting laat. De planning verandert er nooit door.

## Hoe ik gewerkt heb en hoe zeker iets is

Ik las eerst CLAUDE.md, `docs/visie/Trainingswetenschap.md` en `docs/onderzoek/`. Over cannabis stond er nog niets. Over alcohol staat een stuk in *Aanvullend onderzoek GR5 voorbereiding* (regel C6: een HRV- of rusthartslagdip de ochtend na drinken telt niet als overbelasting). Het aparte rapport *Alcohol en herstel* bestond op 25 oktober 2026 nog niet in de repo; ik heb mijn opties zo gemaakt dat ze daar zonder aanpassing op passen (zie optie B en het slot van hoofdstuk 6).

In de code bekeek ik `engine/wellnessCheck.ts` (ochtendgetallen tegen je eigen gemiddelde van 28 dagen, minstens 7 dagen nodig), `engine/runInsight.ts` en `engine/runComparison.ts` (de twee regels na een loop; vergelijken met de middelste van de laatste 3 tot 5 vergelijkbare loopjes, ruis 3,5 procent, een regel pas bij 1,5 keer de ruis), `engine/aerobicTrend.ts` (de kaart "Tempo bij zone 2": tempo omgerekend naar één referentiehartslag, de laatste twee weken tegen twee weken een maand eerder, een verschil telt vanaf 5 seconden per km) en `engine/legFatigue.ts` (de beenindex rekent met duur, RPE, reserve in herhalingen, hoogtemeters en rugzak, niet met hartslag).

Bewijsschaal zoals in de rest van `docs/onderzoek/`: **sterk** (meta-analyses of meerdere goede gecontroleerde studies), **matig** (één goede studie, een grote cohort of een review van kleine studies), **zwak** (klein, observationeel, cijfers van een fabrikant, of alleen via een samenvatting gelezen), **expert** (consensus of praktijk zonder uitkomstdata), **afgeleid** (mijn eigen redenering of berekening). Waar ik een studie alleen via een samenvatting of persbericht las, staat dat erbij. Het onderzoek naar cannabis en sport is klein: de meeste proeven hebben 10 tot 40 deelnemers, en de oudere gebruikten cannabis met 1 tot 2 procent THC, veel minder dan wat nu gangbaar is.

## 1. Wat THC kort voor een training doet

### Hartslag en bloeddruk

Dat THC de hartslag verhoogt is het best vastgestelde effect van cannabis op het lichaam (bewijs: sterk, in elk overzicht). De grootte hangt af van de dosis, de manier van gebruik en hoe gewend iemand eraan is.

- **Mensen die zelden gebruiken.** In een dubbelblinde proef met 17 gezonde volwassenen die al minstens een maand niet gebruikt hadden, steeg de hartslag in rust na 10 mg THC met 11 slagen (gerookt) of 23 slagen (gedampt), en na 25 mg met 19 of 27 slagen. Het hoogtepunt lag direct na het gebruik, en na ongeveer drie uur was de hartslag terug ([Spindle e.a. 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6324384/)) (bewijs: matig). In gewone woorden: wie normaal met 60 in rust zit, zit kort na een flinke trek op 80 tot 85.
- **Wekelijkse gebruikers, tijdens inspanning.** Veertien recreatieve sporters die minstens wekelijks gebruikten, fietsten na roken of dampen van cannabis met THC een warming-up op vast tempo met een hartslag die 14 tot 18 slagen hoger lag dan zonder ([Cheung e.a. 2024](https://pubmed.ncbi.nlm.nih.gov/38299223/), cijfers via [Outside](https://www.outsideonline.com/health/training-performance/this-is-your-endurance-on-cannabis/)) (bewijs: matig; de volledige tekst heb ik niet gelezen). Bij het uiterste in de tijdrit was de hartslag gelijk: THC duwt de hartslag bij een rustig tempo omhoog, niet de bovengrens.
- **Regelmatige gebruikers, eetbaar.** Negen getrainde sporters die regelmatig gebruikten, fietsten 35 minuten na 10 mg THC in snoepjes. Bij vaste belasting lag de hartslag 3 tot 5 slagen hoger, wat binnen het toeval viel; bloeddruk, zuurstofverbruik en inspanningsgevoel veranderden niet ([Ewell e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9760823/)) (bewijs: zwak tot matig, negen mensen, en iedereen merkte of hij THC had gekregen).
- **Af en toe tegenover vaak.** Na dezelfde joint met 6,8 procent THC steeg de hartslag bij af-en-toe-rokers duidelijker dan bij dagelijkse rokers, met een verhoging tussen een half uur en drie uur na het roken ([Desrosiers e.a. 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4416120)) (bewijs: matig). Een systematisch overzicht van 36 studies concludeert dat regelmatige gebruikers gewend raken aan de effecten op denken en bewegen, en maar gedeeltelijk aan het effect op het hart ([Colizzi en Bhattacharyya 2018](https://iris.univr.it/handle/11562/995710)) (bewijs: matig, alleen de samenvatting gelezen).
- **Hoe snel het weer zakt.** Na dampen volgt de hartslag het THC-gehalte in het bloed bijna direct, met een halfwaardetijd van ongeveer acht minuten, terwijl wankelen en het gevoel high te zijn langer blijven ([Zuurman e.a. 2008](https://bedrocan.com/wp-content/uploads/2008-effect-of-intrapulmonary-tetrahydrocannabinol-administration-in-humans_zuurman.pdf)) (bewijs: matig, twaalf mannen). Bij eten begint het pas na 30 tot 60 minuten en ligt de piek na 1,5 tot 3 uur ([Burr e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8566388/)) (bewijs: matig).

Bloeddruk: wisselend. In de proef van Spindle daalde de bovendruk in rust 4 tot 10 mmHg. Bij opstaan kan de bloeddruk wegzakken, met duizeligheid en soms flauwvallen; in een oude studie viel 2 van 29 mensen flauw bij het opstaan, en 2 van 12 konden een inspanningstest niet afmaken door duizeligheid ([Kramer e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7819470/), over Hollister 1968 en Benowitz en Jones 1975) (bewijs: zwak, oude studies met hoge doses).

### Ervaren inspanning en plezier

De beste studie hiernaar komt uit Boulder. 42 hardlopers van 21 tot 39 jaar die al regelmatig cannabis gebruikten en er ook mee liepen, liepen 30 minuten op een loopband in een gematigd tempo, één keer nuchter en één keer na hun eigen, legaal gekochte cannabis (een soort met vooral THC of een met vooral CBD). Na cannabis vonden ze het lopen leuker en voelden ze meer "runner's high". Met THC voelde hetzelfde tempo duidelijk zwaarder ([Gibson e.a. 2024](https://doi.org/10.1007/s40279-023-01980-4), via het [persbericht](https://www.newswise.com/articles/study-shows-weed-makes-workouts-more-fun-but-it-s-no-performance-enhancer)) (bewijs: matig; ik kon de volledige tekst niet lezen, dus geen getallen voor hartslag of RPE). De deelnemers wisten wanneer ze gebruikt hadden, dus verwachting speelt mee. In een eerdere studie van dezelfde groep, buiten het lab op een eigen route, liepen 49 lopers na cannabis gemiddeld 31 seconden per mijl trager, ongeveer 19 seconden per km, terwijl ze het leuker vonden (Gibson e.a. 2023, Cannabis and Cannabinoid Research, via het persbericht) (bewijs: zwak, eigen tempo en geen loting).

In een enquête onder 605 gebruikers in Amerikaanse staten waar het legaal is, gebruikte 81,7 procent cannabis rond het sporten, vooral voor plezier en minder pijn ([YorkWilliams e.a. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6503143/)) (bewijs: matig voor hoe vaak het voorkomt, niet voor wat het doet). In de groep van Gibson noemde 90,5 procent plezier als reden en 28,6 procent betere prestatie.

### Prestatie: duur, VO2max en kracht

- **Duur.** Na roken of dampen van THC was het vermogen in een tijdrit van 20 minuten 5,1 procent (gerookt) en 7,5 procent (gedampt) lager; CBD alleen deed niets ([Cheung e.a. 2024](https://pubmed.ncbi.nlm.nih.gov/38299223/)) (bewijs: matig). In gewone woorden: voor een 10 km van een uur is dat drie tot vier minuten. Oudere studies zagen een lagere werkcapaciteit, waarschijnlijk omdat de hoge hartslag de test eerder liet eindigen ([Kramer e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7819470/)) (bewijs: zwak).
- **VO2max.** Niet anders, ook niet bij regelmatige gebruikers vergeleken met niet-gebruikers ([Kramer e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7819470/); [Burr e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8566388/)) (bewijs: matig). Je motor wordt niet kleiner, je gebruikt hem alleen minder zuinig die dag.
- **Kracht.** Knijpkracht veranderde niet na roken ([Ware e.a. 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6116792/), over Steadward en Singh 1975) (bewijs: zwak). Er is geen goede studie met zware squats of deadlifts kort na gebruik. De overzichten zeggen samen: geen voordeel, waarschijnlijk geen of een klein nadeel ([Kennedy 2017](https://researchprofiles.canberra.edu.au/en/publications/cannabis-exercise-performance-and-sport/); [Burr e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8566388/)) (bewijs: matig voor "geen voordeel", zwak voor de rest).

### Coördinatie, evenwicht en reactietijd

Dit is het deel waar het voor veiligheid om draait.

- Een meta-analyse van 80 publicaties over rijden en denken na THC vond dat de achteruitgang na een gewone gerookte of gedampte dosis ongeveer vier uur duurde, bij hogere doses en ingewikkelde taken zes tot zeven uur, en na eten tot tien uur ([McCartney e.a. 2021](https://doi.org/10.1016/j.neubiorev.2021.01.003), via [ScienceAlert](https://www.sciencealert.com/scientists-reveal-how-long-a-cannabis-high-actually-lasts)) (bewijs: matig tot sterk). Regelmatige gebruikers presteerden beter dan af-en-toe-gebruikers, maar meestal nog niet helemaal normaal.
- In de proef van Spindle waren aandacht en reactie na 25 mg pas na zes tot acht uur terug op het niveau van voor het gebruik ([Spindle e.a. 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6324384/)) (bewijs: matig, bij mensen die het niet gewend waren).
- Wankelen bij stilstaan (lichaamszwaai) nam toe met de dosis en bleef langer dan de hartslag ([Zuurman e.a. 2008](https://bedrocan.com/wp-content/uploads/2008-effect-of-intrapulmonary-tetrahydrocannabinol-administration-in-humans_zuurman.pdf)) (bewijs: matig).
- Bij af-en-toe-rokers was de verdeelde aandacht (een taak waarbij je tegelijk moet sturen en reageren) tot ongeveer 3,5 uur na roken slechter, bij dagelijkse rokers veel minder ([Desrosiers e.a. 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4416120)) (bewijs: matig).

Wat dat betekent voor lopen op straat (verkeer, oversteken in het donker) en voor een bergpad (losse stenen, een smalle richel, een afdaling met rugzak, vaak alleen): in de eerste uren na gebruik zijn precies de dingen minder die een val of een aanrijding voorkomen. Er bestaat geen studie naar vallen op een bergpad na cannabis; de stap van rijsimulator en balansplaat naar het pad is mijn eigen redenering (afgeleid). Eetbare cannabis is op een tocht extra lastig, omdat het effect pas na een uur of langer komt, als je al onderweg bent, en lang blijft (bewijs: matig voor de tijdlijn, afgeleid voor de tocht).

### Warmte en vocht

Hier is weinig over bekend. Een oude studie vond bij normale of koele temperatuur geen verandering of een daling van 0,1 tot 0,2 graad, maar bij 40 graden een stijging van de lichaamstemperatuur ([Jones e.a. 1980, samenvatting](https://erowid.org/references/refs_view.php?ID=8417)) (bewijs: zwak, alleen een samenvatting van een oude, kleine studie). Bij dieren geeft THC onder een bepaalde omgevingstemperatuur onderkoeling en erboven oververhitting (bewijs: zwak voor mensen). Er is geen studie naar THC met inspanning in de hitte of met vochttekort. Een droge mond is een bekend effect, maar zegt niets over je vochtbalans. Voorzichtig gezegd: een hogere hartslag bij warmte en een hogere hartslag door THC tellen bij elkaar op, en op een hete bergdag is dat geen goed idee (afgeleid).

### Roken: koolmonoxide en tabak

Hoe je gebruikt maakt uit. Een joint geeft per stuk ongeveer vijf keer zoveel stijging van koolmonoxide in het bloed als een sigaret, en drie keer zoveel teer, omdat er dieper en langer wordt ingeademd ([Wu e.a. 1988](https://www.nejm.org/doi/full/10.1056/NEJM198802113180605)) (bewijs: matig, vijftien mannen). Koolmonoxide neemt de plek van zuurstof in het bloed in; op hoogte, waar al minder zuurstof is, kost dat extra (afgeleid). In Europa mengt 77 tot 91 procent van de rokers cannabis met tabak ([Hindocha e.a. 2016](https://doi.org/10.3389/fpsyt.2016.00104)) (bewijs: matig, grote enquête), en nicotine verhoogt de hartslag ook (bewijs: sterk, algemene farmacologie). Dampen geeft geen rook, maar dezelfde dosis werkte in de proef van Spindle juist sterker. Eetbaar spaart de longen maar is het minst voorspelbaar in de tijd.

### Regelmatig of af en toe

Het patroon is in alle studies hetzelfde: hoe vaker iemand gebruikt, hoe kleiner het effect van één keer, het sterkst voor denken en bewegen, minder voor het hart ([Colizzi en Bhattacharyya 2018](https://iris.univr.it/handle/11562/995710); [Desrosiers e.a. 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4416120)) (bewijs: matig). Twee kanttekeningen. Regelmatige gebruikers nemen vaak een hogere dosis, waardoor hun effect juist minder voorspelbaar is (McCartney, via [ScienceAlert](https://www.sciencealert.com/scientists-reveal-how-long-a-cannabis-high-actually-lasts)) (bewijs: expert). En bij regelmatig gebruik hoort het effect bij je gewone getallen: je eigen gemiddelde bevat het al.

### Met een kater of weinig slaap

Er is geen studie naar sporten na cannabis plus een kater of een korte nacht. Wat wel bekend is:

- Alcohol en THC samen geven hogere THC-waarden in het bloed dan THC alleen, en hun effect op sturen telt bij elkaar op ([Hartman e.a. 2015](https://pubmed.ncbi.nlm.nih.gov/26019183/)) (bewijs: matig, 19 tot 32 deelnemers).
- Een korte nacht en de ochtend na alcohol verhogen elk de hartslag en verlagen de HRV ([Pietilä e.a. 2018](https://mental.jmir.org/2018/1/e23/), zie ook *Aanvullend onderzoek GR5 voorbereiding*) (bewijs: matig). Bovenop een hogere hartslag door THC is de kans groot dat een rustige loop die dag buiten zone 2 valt (afgeleid).
- De ochtend na alleen cannabis: een overzicht van 20 studies vond weinig bewijs dat de prestatie de volgende dag (meer dan acht uur later) slechter is; de paar studies die dat wel vonden waren oud en zwak ([McCartney e.a. 2023](https://www.drugsandalcohol.ie/41843/)) (bewijs: matig voor "weinig bewijs", niet voor "geen effect").

### Het hart: zeldzaam maar echt

In de eerste 60 minuten na gebruik was de kans op een hartinfarct ongeveer 4,8 keer zo groot als normaal, in het tweede uur ongeveer 1,7 keer ([Mittleman e.a. 2001](https://www.ahajournals.org/doi/10.1161/01.CIR.103.23.2805)) (bewijs: zwak tot matig, gebaseerd op negen mensen). Dat klinkt groot, maar het gaat om een heel kleine kans die tijdelijk een paar keer zo groot wordt, en bij jonge gezonde mensen is die kans heel klein. Bij hartpatiënten kwam pijn op de borst bij inspanning eerder ([Kennedy 2017](https://researchprofiles.canberra.edu.au/en/publications/cannabis-exercise-performance-and-sport/)) (bewijs: matig). In een grote Amerikaanse enquête ging dagelijks gebruik samen met 25 procent meer hartinfarcten en 42 procent meer beroertes ([Jeffers e.a. 2024](https://www.ahajournals.org/doi/10.1161/JAHA.123.030178)) (bewijs: zwak tot matig, observationeel). Een hoge hartslag door THC plus een zware inspanning vraagt meer van het hart (bewijs: expert). Wie bij inspanning na gebruik hartkloppingen, pijn op de borst of duizeligheid voelt, stopt en laat het nakijken door een arts.

## 2. Slaap, rusthartslag en HRV

### De nacht na gebruik

- **Slaap.** Een meta-analyse uit 2025 van 18 slaapstudies met hersengolfmeting (9 bruikbaar voor de berekening) vond dat cannabis geen vast effect heeft op hoe lang je slaapt, hoe snel je inslaapt of hoe je slaapfases verdeeld zijn. De oude bevinding dat THC de droomslaap onderdrukt kwam uit kleine studies met hoge doses (Sleep Medicine Reviews 2025, alleen de [samenvatting](https://businessofcannabis.com/research/cannabis-and-sleep-architecture-a-systematic-review-and-meta-analysis/) gelezen) (bewijs: matig).
- **Horlogegegevens.** Er is geen gepubliceerde studie die met een horloge of ring de nachtelijke HRV na cannabis meet. Een studie met Fitbits bij 55 jonge volwassenen over 28 dagen vond een hogere nachthartslag na alcohol, maar meldde voor cannabis geen eigen hartslagbevinding ([De Rosa e.a. 2025](https://pubmed.ncbi.nlm.nih.gov/39914500/)) (bewijs: zwak). WHOOP schrijft op basis van eigen leden die minstens tien keer in 90 dagen cannabis logden dat ze op die dagen langer slapen maar minder goed ([WHOOP](https://www.whoop.com/us/en/thelocker/impact-of-marijuana-sleep-resting-heart-rate-hrv/)); volgens een samenvatting van die cijfers ligt de rusthartslag die nacht gemiddeld ongeveer 1 slag hoger en de HRV ongeveer 2,8 ms lager ([Welltory](https://welltory.com/blog/cannabis-and-sleep-recovery)) (bewijs: zwak, cijfers van een fabrikant, niet onafhankelijk getoetst; de pagina van WHOOP zelf kon ik niet openen).
- In gewone woorden: voor zover bekend is het effect op de ochtendgetallen klein, veel kleiner dan van een paar glazen alcohol (vergelijk Pietilä hierboven), en het verschilt sterk per persoon (bewijs: zwak).

### De nachten na stoppen bij regelmatig gebruik

Dit is het duidelijkste slaapeffect, en het verrassende: niet het gebruik maar het stoppen verstoort de slaap. Na het stoppen met dagelijks gebruik beginnen de klachten na één tot drie dagen, zijn ze het ergst na twee tot zes dagen en duren de meeste vier tot veertien dagen; slapen en vreemde dromen horen erbij ([Budney e.a. 2003](https://pubmed.ncbi.nlm.nih.gov/12943018/)) (bewijs: matig, 18 mensen). In een studie met 18 zware gebruikers in een kliniek werd de slaap in twee weken zonder cannabis korter (ongeveer 42 minuten) en minder efficiënt ([Bolla e.a. 2010](https://pmc.ncbi.nlm.nih.gov/articles/PMC2938870)) (bewijs: zwak tot matig; ze hadden al eerder slaapproblemen bij stoppen gemeld). De meta-analyse uit 2025 noemt stoppen het meest consistente slaapeffect (bewijs: matig).

Dat raakt een meerdaagse tocht direct: wie regelmatig gebruikt en op tocht stopt, kan de eerste één tot twee weken slechter slapen, juist in de dagen waarin de benen het meest te verduren hebben en in een tent (afgeleid). Dat hoort bij de voorbereiding, niet bij dag één van de tocht. Grenzen en regels verschillen per land; dat valt buiten dit onderzoek.

### Rusthartslag en HRV bij regelmatig gebruik

Langdurig hoge doses THC verlaagden in een oude labstudie de rusthartslag en de bloeddruk ([Kramer e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7819470/), over Benowitz en Jones 1975) (bewijs: zwak). Regelmatige gebruikers hadden in rust soms een andere hartslag dan niet-gebruikers, maar in maar één van de vier studies (bewijs: zwak). Voor ASCEND maakt het niet uit: de ochtendgetallen vergelijken met je eigen gemiddelde, en bij regelmatig gebruik zit het effect daar al in.

## 3. Kracht tegenover duur

**Voor de gegevens maakt het bij duurtraining veel meer uit.** Bijna alles wat ASCEND na een loop of tocht zegt, leunt op de hartslag: efficiëntie, drift, klimmen, de trend "Tempo bij zone 2". Een hartslag die 10 tot 20 slagen hoger ligt, verandert die getallen direct (hoofdstuk 4). Krachttraining komt uit MacroFactor met sets, herhalingen en gewichten; daar zit geen hartslag in, dus daar wordt niets scheef (afgeleid, uit de code).

**Voor prestatie maakt het bij duurtraining ook meer uit.** Bij duur is 5 tot 8 procent minder vermogen gemeten ([Cheung e.a. 2024](https://pubmed.ncbi.nlm.nih.gov/38299223/)), bij kracht is geen effect op knijpkracht gevonden en geen goede studie gedaan (bewijs: matig voor duur, zwak voor kracht).

**Voor veiligheid maakt het bij zware kracht en bij bergpaden meer uit.** Een zware squat of deadlift vraagt balans en controle onder een last. Minder evenwicht en een tragere reactie zijn daar een risico, net als duizeligheid bij snel opstaan tussen sets (afgeleid, uit de studies over evenwicht en bloeddruk). Bij een rustige duurloop op een vlak fietspad is het risico vooral het verkeer.

**Voor herstel en spieropbouw** is er bij mensen geen studie die THC na krachttraining meet. Bij actieve regelmatige gebruikers waren ontstekings- en stresswaarden niet anders dan bij niet-gebruikers ([Burr e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8566388/), over Lisano) (bewijs: zwak). Van CBD na spierschade is geen voordeel aangetoond (bewijs: zwak). Een uitspraak over spieropbouw zoals bij alcohol (Parr 2014) kan voor cannabis niet.

## 4. Wat het betekent voor de gegevens in ASCEND

Alle getallen in dit hoofdstuk zijn mijn eigen berekening uit de code en de studies (afgeleid). Ik reken met een voorbeeld: een rustige loop van 8 km in 7:00 per km bij een hartslag van 140, en een hartslag die door THC 12 slagen hoger uitkomt bij hetzelfde tempo. Dat ligt binnen wat Cheung (14 tot 18) en Spindle (11 tot 27) vonden voor iemand die het niet of weinig gewend is; bij regelmatig gebruik en eetbaar ligt het eerder op 3 tot 5 (Ewell).

### Hartslagzones

De zones zelf veranderen niet: ze staan in de instellingen. Maar een rustige loop kan erdoor uit zone 2 vallen. Loopt iemand op tempo, dan wordt 140 ongeveer 152; ligt de bovengrens van zone 2 daaronder, dan valt de loop al vanzelf uit de trend (`aerobicTrend` laat loopjes boven zone 2 weg). Loopt iemand op hartslag, wat ASCEND bij rustig lopen vraagt, dan blijft de hartslag op 140 en zakt het tempo. Die loop telt dan wel mee, en dat is het lastige geval.

### Het loopinzicht na een loop ("Bij dezelfde hartslag liep je ... sneller")

Als 12 slagen meer bij hetzelfde tempo, omgerekend volgens de verhouding die de app gebruikt, betekent dat je bij dezelfde hartslag 140 / 152 zo snel loopt, dan is dat ongeveer 8,6 procent trager: 7:36 in plaats van 7:00 per km, 36 seconden per km. De ruis van één loop is 3,5 procent; 8,6 procent is ongeveer 2,5 keer die ruis, ruim boven de grens van 1,5 keer. De app zegt dan "Let op: bij dezelfde hartslag liep je 36 seconden per km trager", met als mogelijke verklaringen slecht slapen, warmte of moe gelopen benen. Dat is niet schadelijk, wel misleidend. Bij regelmatig gebruik met 3 tot 5 slagen meer is het 2 tot 3,5 procent, binnen de ruis: geen regel.

Voor de loopjes daarna doet die ene loop weinig: de app vergelijkt met de middelste van de laatste 3 tot 5, en één uitschieter verschuift de middelste hoogstens naar de buurwaarde.

**Drift op een lange loop** kan beide kanten op. Na roken of dampen is de hartslag in het begin het hoogst en zakt hij binnen een paar uur terug, dus de tweede helft lijkt rustiger dan de eerste en de drift te goed: een onterechte "Beter". Na eten komt het effect pas na een uur, dus de hartslag stijgt in de tweede helft: een onterechte "Let op" (afgeleid uit de tijdlijnen van Spindle en Burr). **Klimmen op een tocht** werkt als efficiëntie: een hogere hartslag bij dezelfde klimsnelheid. **Pas en vorm** (grondcontact, paslengte) leunen niet op hartslag en blijven bruikbaar.

### De trend "Tempo bij zone 2" en "Je wordt fitter"

De trend middelt de laatste twee weken, gewogen naar afstand, tegen twee weken een maand eerder, en noemt een verschil vanaf 5 seconden per km. Met twee rustige loopjes per week staan er in zo'n venster ongeveer vier. Eén loop die 36 seconden per km trager lijkt, maakt het gemiddelde van vier ongeveer 9 seconden per km trager. Dat is meer dan de drempel van 5, en ongeveer zoveel als een maand echte vooruitgang (in *Loopgegevens en vooruitgang*: 1 tot 2 procent per maand, bij 7:00 per km dus 4 tot 8 seconden).

Twee gevolgen. Zolang die loop in de laatste twee weken zit, kan hij echte vooruitgang verbergen. En drie tot vijf weken later zit hij in het vergelijkingsvenster van een maand eerder, waardoor de gewone loopjes van dat moment sneller lijken dan ze zijn: de app kan dan ten onrechte "Je wordt fitter" melden. Met het tempo uit de studie van Gibson buiten het lab (ongeveer 19 seconden per km trager) is het effect op vier loopjes ongeveer 5 seconden: precies op de grens.

### Ochtendgetallen

Eén nacht met een rusthartslag van 5 slagen boven gemiddeld verandert een gemiddelde van 28 dagen met 5 / 28, ongeveer 0,2 slag. Dat is niets. De HRV-band (de spreiding) wordt door één lage waarde iets breder, ook verwaarloosbaar. Alleen die ene ochtend kan een regel "let op" krijgen, en die is een hint: de check-in vraagt daarna toch hoe je je voelt. Voor zover bekend is het effect van cannabis op de nacht klein (hoofdstuk 2). Een nacht buiten het gemiddelde houden levert dus bijna niets op, en bij regelmatig gebruik zou het juist verkeerd uitpakken: als je de nachten met gebruik weglaat, wordt het gemiddelde de uitzondering in plaats van je gewone stand.

### Belasting, de beenindex en een test

- **Duur, afstand, hoogtemeters en rugzak** zijn wat het horloge meet en kloppen gewoon. De training telt volledig mee voor de belasting, de 10-procentgrens per loop, de week en de GR5-meters. De benen hebben het werk echt gedaan.
- **De beenindex** gebruikt geen hartslag, wel RPE als die gelogd is. Omdat hetzelfde tempo met THC zwaarder voelt (Gibson), kan een gelogde RPE hoger uitvallen en de index die training iets zwaarder rekenen. Dat is de voorzichtige kant; niets aan doen (afgeleid).
- **Een testloop** is de training waar het het meest uitmaakt. Met 5 tot 8 procent minder vermogen (Cheung) is een 5 km-test die dag een halve tot anderhalve minuut trager, en daar zouden tempo's en een doeltijd uit afgeleid worden. Een test die kort na gebruik gelopen is, is een slechte test (afgeleid). De regel uit *Trainingswetenschap* (een test die meer dan 3,5 procent van de trend afwijkt heet twijfelachtig) vangt dat al gedeeltelijk.

### Kort samengevat voor dit hoofdstuk

Wie zelden gebruikt en daarna een rustige loop doet op hartslag, krijgt één misleidende regel na de loop en een trend die twee weken en een maand later wat scheef ligt. Wie regelmatig gebruikt, heeft een kleiner effect dat grotendeels in zijn eigen gemiddelde zit. Ochtendgetallen en belasting worden nauwelijks of niet scheef.

## 5. Hoe andere apps en gebruikers het doen

- **WHOOP** heeft een dagboek met vragen over gedrag, waaronder cannabis; volgens WHOOP logt ongeveer 11 procent van de mannen en 9 procent van de vrouwen het, en na genoeg dagen toont de app het verband met herstel en slaap ([WHOOP](https://www.whoop.com/us/en/thelocker/impact-of-marijuana-sleep-resting-heart-rate-hrv/), via zoekresultaten) (zeker voor het bestaan, zwak voor de cijfers). Het dagboek vraagt elke dag en telt; precies wat ASCEND niet wil.
- **Oura** heeft meer dan honderd labels en eigen labels; labels veranderen de scores niet en dienen alleen om in grafieken verbanden te zoeken ([Oura support](https://support.ouraring.com/hc/en-us/articles/360038676993)) (zeker voor de werking; of er een vast label voor cannabis is, kon ik niet bevestigen).
- **Garmin** heeft sinds 2025 "Lifestyle Logging": een lijst gedragingen (alcohol, cafeïne, maaltijden en meer), eigen gedragingen toevoegen, herinneringen in de ochtend of avond die je uit kunt zetten, en na ongeveer vier weken een verband met slaap ([DC Rainmaker](https://www.dcrainmaker.com/2025/09/lifestyle-logging-journaling-health-status-vs-whoop-everything.html); [TechRadar](https://www.techradar.com/health-fitness/lifestyle-logging-is-garmin-connects-latest-useful-tool-rolling-out-to-all-users-heres-how-to-set-it-up-and-use-it)) (zeker voor de werking; een vaste keuze voor cannabis vond ik niet).
- **Strava en intervals.icu** heb ik niet gevonden met een functie die een activiteit om deze reden buiten een trend houdt (onzeker; niet volledig nagezocht).
- **Wat opvalt:** alle drie de horlogemerken doen het omgekeerde van wat ASCEND nodig heeft. Ze vragen naar het gedrag om er een verband mee te tonen, en houden de gegevens zelf gewoon in de scores. Niemand haalt een training of nacht uit een trend. En hun aanpak heeft een eigen nadeel: een label met de naam van het middel staat in de gegevens, met tellingen en grafieken erbij.
- **Lopers zelf.** De enquêtes laten zien dat lopers die cannabis gebruiken het vooral doen voor plezier en minder pijn, en weten dat ze trager zijn ([YorkWilliams e.a. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6503143/); Gibson, via het [persbericht](https://www.newswise.com/articles/study-shows-weed-makes-workouts-more-fun-but-it-s-no-performance-enhancer)). Forums heb ik niet systematisch gelezen; wat daar staat is anekdote en past bij dit beeld (bewijs: expert op zijn best).

Wat subtiel werkt, is dus geen vraag en geen label, maar een neutrale handeling op de training zelf, zonder reden, en een rekenmethode die een losse uitschieter vanzelf dempt (afgeleid).

## 6. Opties voor ASCEND

Uitgangspunt bij elke optie: er staat nergens "heb je gebruikt?", er wordt geen reden opgeslagen, en de planning verandert niet. Alles hieronder is een voorstel voor een engine-regel, geen besluit.

### Optie A: niets doen

Wat het kost: niets. Wat het oplevert: niets, en het probleem blijft: af en toe een misleidende "Let op" na een loop en een trend die een paar weken scheef kan liggen, waaronder een onterechte "Je wordt fitter". Bij regelmatig gebruik is het effect klein en zit het in het eigen gemiddelde, dus voor die groep is niets doen verdedigbaar. Het weer wordt al afgevangen (`withWeather`), net als moe gelopen benen (`legsTired`); voor de andere oorzaken van een afwijkende hartslag is er niets.

### Optie B: een neutrale keuze bij de training, "Hartslag niet meetellen"

**Wat.** In het logblad van een loop of tocht, achter het bestaande menu (de drie puntjes of "Meer"), één regel: "Hartslag niet meetellen", met eronder "Telt wel mee voor je belasting." Opnieuw tikken zet hem terug ("Hartslag weer meetellen"). De uitleg achter de InfoButton (`settingsHelp`): "Soms ligt je hartslag een dag anders dan normaal: door warmte, ziek worden, een korte nacht, cafeïne, alcohol of iets anders, of omdat je horloge haperde. Zet hem dan uit; deze training telt mee voor je belasting en niet voor je hartslagbeeld." Geen keuze uit redenen, geen vrij tekstveld, niets wat een oorzaak vastlegt.

**Wat het doet in de engine (voorstel).**

- Regel HR-UIT-1: een uitgezette training geeft na afloop geen regels over efficiëntie, drift en klimmen; alleen pas en vorm en het feit over dalen blijven. De zin onder de kaart: "Deze loop telt niet mee voor je hartslagbeeld."
- Regel HR-UIT-2: `comparableLogs` laat uitgezette trainingen weg als vergelijkingsmateriaal, met een eigen reden naast `windy` en `legsTired` (bijvoorbeeld `setAside`, in het blad "Waarom": "één loop telt op jouw keuze niet mee"), en `aerobicTrend` slaat ze over zoals een loop buiten zone 2.
- Regel HR-UIT-3: duur, afstand, hoogtemeters, rugzak en RPE tellen gewoon mee voor de beenindex, de week, de 10-procentgrens en de GR5-meters.
- Regel HR-UIT-4: een uitgezette test telt niet voor tempo's of een doeltijdvoorstel; de app zegt er neutraal bij dat de test niet meetelt en biedt aan hem later opnieuw te plannen, als voorstel met Akkoord.

**Opslag.** Niet als veld op de log, zodat de log onaangeroerd blijft (append-only), maar als een aparte, merkloze lijst van log-id's (bijvoorbeeld `heartRateSetAside`), mee in de back-up met een migratiestap volgens CLAUDE.md. De naam zegt niets over een oorzaak, ook niet in een gedeeld back-upbestand.

**Waarom zo.** Het werkt voor alles wat de hartslag een dag scheef trekt, dus ook voor het alcoholonderzoek: daar hoeft geen eigen vraag bij. Het is de handeling die een sporter zelf zou doen ("die loop telt niet"), het is verstopt, en het wordt nooit gevraagd.

**Werk.** Klein tot middel: een lijst, een menuregel, twee filters, een migratiestap, een instelling.

### Optie C: de keuze aanbieden waar een afwijking al zichtbaar is

**Wat.** Geen nieuwe vraag, maar dezelfde handeling uit optie B op de plek waar de app al zegt dat de hartslag afwijkt: in het blad "Waarom" achter een "Let op" over efficiëntie, drift of klimmen, onderaan een kleine `TextButton` "Deze loop niet meetellen voor je hartslag". Alleen als het weer en de benen het niet verklaren (die gevallen vangt de app al af). Geen melding, geen badge, geen herhaling bij de volgende loop.

**Regel HR-UIT-5 (voorstel):** de knop verschijnt alleen in het blad van een "Let op" met een sterkte van minstens 2 keer de ruis (bij efficiëntie ongeveer 7 procent), en nooit vaker dan in dat ene blad. Een "Beter" krijgt hem niet: een onterecht goede loop (de drift na roken) is zeldzamer en mag in de trend blijven, of de gebruiker zet hem zelf uit via het menu.

**Waarom.** Wie een vreemde regel ziet en "Waarom" opent, wil op dat moment weten wat hij ermee moet. De knop is dan een antwoord, geen vraag. Het voorkomt ook dat de handeling uit optie B onvindbaar is.

**Risico.** Een echte waarschuwing (beginnende ziekte, te weinig herstel) wordt weggetikt. Daarom telt de training mee voor de belasting, verandert de ochtendcheck-in niet, en blijven pijnmeldingen en het gevoel "Slechter" gewoon werken.

### Optie D: robuuster rekenen, zonder dat iemand iets hoeft te doen

**Wat.** De trend "Tempo bij zone 2" zo rekenen dat één loop weinig doet, wat de oorzaak ook is:

- Regel HR-TREND-1: in elk venster van twee weken telt een loop die meer dan 2,5 keer de ruis (ongeveer 9 procent) trager of sneller is dan de middelste van dat venster niet mee, mits er minstens drie loopjes in het venster zijn. Bij twee of minder loopjes geen uitschieterfilter, wel de bestaande regels.
- Regel HR-TREND-2: zo'n weggelaten loop telt wel in de belasting en blijft zichtbaar als punt in de grafiek, en in het blad "Waarom" staat een feit zonder reden: "één loop week sterk af van de rest en telt niet mee in de trend".

**Waarom.** Het doet het werk van optie B voor de trend, zonder handeling en zonder vraag, en het helpt ook bij een haperende polsmeting, een hete dag die de weergegevens missen, of een ziekte die nog niet gemeld is. De bestaande vergelijking na een loop gebruikt al de middelste van 3 tot 5 en is daardoor al robuust; de trend gebruikt een gemiddelde en is het niet.

**Risico.** Een echte snelle verbetering wordt even gedempt. Met een grens van 9 procent op één loop (een maand echte vooruitgang is 1 tot 2 procent) is dat risico klein (afgeleid). De grens is een eigen aanname en moet op eigen gegevens worden nagekeken.

**Werk.** Klein: een paar regels in `aerobicTrend.ts` met tests.

### Optie E: een neutrale kennistekst

**Wat.** In Gidsen en kennis een stuk "Als je hartslag anders is dan normaal": warmte, slaap, ziekte, cafeïne, alcohol, cannabis, nicotine, sommige medicijnen, en wat je eraan hebt (op gevoel lopen, de loop niet meetellen). Met de getallen uit dit rapport, de waarschuwing over evenwicht op straat en bergpad, en "stop en ga naar een arts" bij hartkloppingen of pijn op de borst. Het woord staat alleen in een tekst die je zelf opzoekt, nooit in een melding of op een kaart.

**Waarom.** Eerlijke informatie zonder oordeel is wat harm reduction vraagt, en het stuk geldt voor iedereen, ook wie niets gebruikt. Of het woord in de kennistekst mag, is een keuze van de eigenaar; zonder het woord werkt de rest even goed.

**Werk.** Klein.

### De planning

Mijn voorstel: nooit. Geen regel die een training verschuift, verlicht of schrapt om deze reden, en geen voorstel met Akkoord. Redenen: de app weet de oorzaak niet en mag hem niet raden; de effecten op prestatie duren uren, niet dagen ([McCartney e.a. 2023](https://www.drugsandalcohol.ie/41843/)); en de bestaande signalen (ochtendcheck-in, beenindex, pijn, "Slechter") dekken wat er de volgende dag wel speelt. Alleen de gegevens zuiver houden. Dat verschilt bewust van regel C6 voor alcohol in *Aanvullend onderzoek GR5 voorbereiding*, die wel de volgende dag rustig wil maken; voor cannabis is daar geen onderbouwing voor.

### Eén mechanisme voor alcohol, cannabis en de rest

Optie B en D zijn met opzet algemeen. Als het alcoholrapport iets wil met trainingen, is het dezelfde handeling "Hartslag niet meetellen". Wil het iets met nachten (zoals regel C6: een dip de ochtend na drinken telt niet als overbelasting), dan stel ik hetzelfde patroon voor op een datum: "Deze nacht niet meetellen" achter de InfoButton van de ochtendregel, zonder reden, uit het gemiddelde van 28 dagen en zonder voorgestelde energie die ochtend. Voor cannabis zelf is die nachtversie niet nodig (hoofdstuk 4), maar hij kan er later bij zonder iets nieuws te ontwerpen. Nooit per middel een eigen vraag, knop of veld.

## 7. Advies

**Is het het waard?** Ja, maar niet om cannabis. Het probleem (één afwijkende loop die een misleidende regel en een scheve trend geeft) bestaat net zo goed bij warmte, ziekte, een korte nacht, alcohol en een haperend horloge. Een oplossing die voor al die oorzaken werkt en geen vraag stelt, is klein werk en maakt de loopgegevens beter voor iedereen.

**Welke opties.**

1. **Eerst optie D**, robuuster rekenen in de trend. Klein, onzichtbaar, geen handeling, en het vangt het grootste gevolg (de trend en een onterechte "Je wordt fitter") voor alle oorzaken op. Instelling in de groep waar het loopinzicht staat: "Uitschieters dempen in je trend", standaard aan, met één zin uitleg.
2. **Dan optie B met C**: "Hartslag niet meetellen" verstopt in het menu van de log, en dezelfde knop in het blad "Waarom" achter een sterke "Let op". Instelling: "Niet meetellen aanbieden bij een afwijkende loop", standaard aan. Volgens de werkafspraken komt alles ook in `settingsIndex.ts`, `settingsLayout.ts` en `settingsSummary.ts`.
3. **Optie E** als de eigenaar dat wil, met of zonder het woord in de tekst.
4. **De planning blijft erbuiten.**

**Wat nooit.**

- Nooit de vraag "heb je gebruikt?" of een andere vraag naar een middel, ook niet als keuze tussen redenen.
- Nooit het woord in een melding, op een kaart, in een regel na de training of in een bestandsnaam of veldnaam in de back-up.
- Nooit een telling, een reeks, een percentage, een grafiek of een vergelijking ("dit was je derde keer", "je herstel is slechter op die dagen").
- Nooit een herinnering of een vraag die terugkomt.
- Nooit een oordeel of een advies om te minderen; wel eerlijke informatie in een tekst die je zelf opzoekt.
- Nooit raden: de app zegt nooit dat een afwijking door een middel komt, ook niet als hij het patroon herkent. Een afwijkende hartslag heet altijd "anders dan normaal".
- Nooit de planning laten veranderen om deze reden.
- Nooit iets opslaan of exporteren wat de reden kan verraden.

## Wat het onderzoek zegt

THC verhoogt de hartslag direct, het sterkst in het eerste uur en tot ongeveer drie uur na roken of dampen: 11 tot 27 slagen in rust bij wie het niet gewend is, 14 tot 18 bij een rustig tempo bij wekelijkse gebruikers, 3 tot 5 bij regelmatige gebruikers met een kleine eetbare dosis. Hetzelfde tempo voelt zwaarder en tegelijk leuker. Duurvermogen daalt 5 tot 8 procent, VO2max en kracht veranderen voor zover bekend niet, en er is geen enkel prestatievoordeel. Evenwicht, aandacht en reactie zijn drie tot zes uur minder na roken of dampen en tot tien uur na eten, wat op straat en op een bergpad het grootste risico is. Regelmatige gebruikers raken grotendeels gewend aan de effecten op denken en bewegen en gedeeltelijk aan die op het hart. Voor zover bekend is het effect op de slaap en de ochtendgetallen klein; stoppen na regelmatig gebruik verstoort de slaap één tot twee weken duidelijk. Over warmte, kater plus cannabis en spieropbouw is bijna niets bekend.

## Wat het betekent voor de app

Belasting, beenindex en ochtendgetallen kloppen gewoon. Wat scheef wordt, zijn de hartslaginzichten bij duurtraining: één rustige loop kort na gebruik kan bij iemand die het niet gewend is 20 tot 40 seconden per km trager lijken, een "Let op" geven, en de trend "Tempo bij zone 2" ongeveer 5 tot 10 seconden per km verschuiven, net zoveel als een maand echte vooruitgang, met een kans op een onterechte "Je wordt fitter" een maand later. Mijn voorstel: de trend robuuster rekenen (optie D), en verstopt in het menu van een loop en in het blad "Waarom" de neutrale keuze "Hartslag niet meetellen" (optie B en C), die voor elke oorzaak werkt en ook het alcoholonderzoek bedient. Geen vraag, geen woord, geen telling, geen planning.

## Wat nog onzeker is

- De hartslagcijfers komen uit kleine proeven (9 tot 17 deelnemers per dosis) met andere doses en manieren van gebruik dan in het echte leven; hoeveel het bij één persoon is, verschilt sterk.
- De studie van Gibson en de tijdritstudie van Cheung heb ik alleen via samenvatting en pers gelezen; de exacte hartslag en RPE tijdens de loop van Gibson ken ik niet.
- Over nachtelijke HRV en rusthartslag na cannabis bestaan alleen cijfers van fabrikanten, geen onafhankelijke studie.
- Of THC de warmteregeling bij inspanning in de hitte verslechtert, is niet onderzocht bij mensen.
- Er is geen studie naar vallen op een bergpad, naar zware krachttraining kort na gebruik, of naar cannabis bovenop een kater of een korte nacht.
- De verschuiving van de trend en de grenzen in optie C en D (2 keer en 2,5 keer de ruis) zijn mijn eigen berekening en aanname, te controleren op echte gegevens met de bestaande tests van `aerobicTrend` en `runInsight`.
- Of Strava of intervals.icu een activiteit buiten hun eigen trends kunnen houden, heb ik niet kunnen nagaan.
- Het alcoholrapport bestond nog niet; als het een ander mechanisme voorstelt, moeten de twee op elkaar worden afgestemd voordat er iets gebouwd wordt.

## Bronnen

Studies en overzichten:

- Spindle e.a. 2018, gerookte en gedampte cannabis bij mensen die zelden gebruiken, JAMA Network Open: https://pmc.ncbi.nlm.nih.gov/articles/PMC6324384/
- Cheung, Baker, Coates en Burr 2024, THC en een tijdrit van 20 minuten, Journal of Applied Physiology: https://pubmed.ncbi.nlm.nih.gov/38299223/ (cijfers via Outside: https://www.outsideonline.com/health/training-performance/this-is-your-endurance-on-cannabis/)
- Ewell e.a. 2022, eetbare cannabis en fietsen, Frontiers in Physiology: https://pmc.ncbi.nlm.nih.gov/articles/PMC9760823/
- Desrosiers e.a. 2015, af-en-toe- en dagelijkse rokers, Journal of Analytical Toxicology: https://pmc.ncbi.nlm.nih.gov/articles/PMC4416120
- Colizzi en Bhattacharyya 2018, gewenning aan cannabis, Neuroscience and Biobehavioral Reviews: https://iris.univr.it/handle/11562/995710
- Zuurman e.a. 2008, gedampte THC, hartslag en lichaamszwaai: https://bedrocan.com/wp-content/uploads/2008-effect-of-intrapulmonary-tetrahydrocannabinol-administration-in-humans_zuurman.pdf
- Gibson e.a. 2024 (online december 2023), cannabis en hardlopen op de loopband, Sports Medicine: https://doi.org/10.1007/s40279-023-01980-4 (persbericht: https://www.newswise.com/articles/study-shows-weed-makes-workouts-more-fun-but-it-s-no-performance-enhancer)
- YorkWilliams e.a. 2019, cannabis en sporten in staten met legale cannabis, Frontiers in Public Health: https://pmc.ncbi.nlm.nih.gov/articles/PMC6503143/
- Kennedy 2017, cannabis, prestatie en sport, Journal of Science and Medicine in Sport: https://researchprofiles.canberra.edu.au/en/publications/cannabis-exercise-performance-and-sport/
- Kramer e.a. 2020, langdurig gebruik en prestatie, Journal of Cannabis Research: https://pmc.ncbi.nlm.nih.gov/articles/PMC7819470/
- Burr e.a. 2021, cannabis en sportprestatie, Sports Medicine: https://pmc.ncbi.nlm.nih.gov/articles/PMC8566388/
- Ware e.a. 2018, cannabis en de topsporter, Clinical Journal of Sport Medicine: https://pmc.ncbi.nlm.nih.gov/articles/PMC6116792/
- McCartney e.a. 2021, hoe lang THC rijden en denken beïnvloedt, Neuroscience and Biobehavioral Reviews: https://doi.org/10.1016/j.neubiorev.2021.01.003 (samenvatting: https://www.sciencealert.com/scientists-reveal-how-long-a-cannabis-high-actually-lasts)
- McCartney, Suraev en McGregor 2023, effecten de volgende dag, Cannabis and Cannabinoid Research: https://www.drugsandalcohol.ie/41843/
- Hartman e.a. 2015, cannabis en alcohol samen, Clinical Chemistry: https://pubmed.ncbi.nlm.nih.gov/26019183/
- Mittleman e.a. 2001, hartinfarct na cannabis, Circulation: https://www.ahajournals.org/doi/10.1161/01.CIR.103.23.2805
- Jeffers e.a. 2024, cannabisgebruik en hart- en vaatziekten, Journal of the American Heart Association: https://www.ahajournals.org/doi/10.1161/JAHA.123.030178
- Wu e.a. 1988, longbelasting van cannabis tegenover tabak, New England Journal of Medicine: https://www.nejm.org/doi/full/10.1056/NEJM198802113180605
- Hindocha e.a. 2016, cannabis en tabak mengen, Frontiers in Psychiatry: https://doi.org/10.3389/fpsyt.2016.00104
- Jones e.a. 1980, cannabis en lichaamstemperatuur (samenvatting): https://erowid.org/references/refs_view.php?ID=8417
- Meta-analyse cannabis en slaapopbouw, Sleep Medicine Reviews 2025 (samenvatting): https://businessofcannabis.com/research/cannabis-and-sleep-architecture-a-systematic-review-and-meta-analysis/
- Budney e.a. 2003, verloop van onthouding, Journal of Abnormal Psychology: https://pubmed.ncbi.nlm.nih.gov/12943018/
- Bolla e.a. 2010, slaap bij zware gebruikers die stoppen, Sleep Medicine: https://pmc.ncbi.nlm.nih.gov/articles/PMC2938870
- De Rosa e.a. 2025, slaap, middelen en Fitbit bij jonge volwassenen, International Journal of Psychophysiology: https://pubmed.ncbi.nlm.nih.gov/39914500/
- Pietilä e.a. 2018, alcohol en herstel in de eerste uren slaap, JMIR Mental Health: https://mental.jmir.org/2018/1/e23/

Apps en fabrikanten:

- WHOOP, cannabis, slaap, rusthartslag en HRV: https://www.whoop.com/us/en/thelocker/impact-of-marijuana-sleep-resting-heart-rate-hrv/
- Welltory, samenvatting van die cijfers: https://welltory.com/blog/cannabis-and-sleep-recovery
- Oura, labels gebruiken: https://support.ouraring.com/hc/en-us/articles/360038676993
- DC Rainmaker over Garmin Lifestyle Logging: https://www.dcrainmaker.com/2025/09/lifestyle-logging-journaling-health-status-vs-whoop-everything.html
- TechRadar over Garmin Lifestyle Logging: https://www.techradar.com/health-fitness/lifestyle-logging-is-garmin-connects-latest-useful-tool-rolling-out-to-all-users-heres-how-to-set-it-up-and-use-it

Eigen rapporten waarop dit voortbouwt: *Loopgegevens en vooruitgang* (ruis van één loop, drempels van het loopinzicht), *Aanvullend onderzoek GR5 voorbereiding* (alcohol, regel C6), *Trainingswetenschap* in `docs/visie/` (twijfelachtige test).
