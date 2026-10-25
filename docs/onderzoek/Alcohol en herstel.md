# Alcohol en herstel: hoeveel het echt scheelt, en hoe weinig de app hoeft te doen

Onderzoeksrapport, 25 oktober 2026. Geschreven vanuit de rol van sportwetenschapper. Het gaat over een recreatieve sporter die zelden drinkt (minder dan eens per maand) en traint voor een 10 km en een meerdaagse bergtocht met rugzak: hardlopen, heuvels, rugzakwandelen en zware beenkracht, met een horloge dat via intervals.icu slaapduur, slaapscore, rusthartslag en HRV levert. Het rapport gaat niet over een bepaalde persoon.

Dit rapport bouwt voort op *Aanvullend onderzoek GR5 voorbereiding* (het stuk over alcohol en de regels C2 en C6) en de notities daarbij (`notities/Aanvullend onderzoek GR5 voorbereiding/herstel_leefstijl.md`, deel 3: Parr 2014, Barnes 2014, Pietilä 2018). Wat daar staat herhaal ik kort; nieuw zijn de getallen van Pietilä per dosis uit de volledige tekst, een meta-analyse over slaap uit 2025, een grote studie met 21.000 dragers van een wearable uit 2026, studies naar prestatie de ochtend erna (waaronder een studie bij wandelaars in een kloof), en een rekensom over wat één nacht doet met het eigen gemiddelde in `engine/wellnessCheck.ts`.

Sterkte van het bewijs, zoals in de andere rapporten: **sterk** (meta-analyses of meerdere consistente gecontroleerde studies), **matig** (een enkele goede studie, een grote cohort of een review van kleine studies), **zwak** (klein, observationeel, of alleen via een samenvatting gelezen), **expert** (consensus of praktijk zonder uitkomstdata) en **afgeleid** (eigen redenering of berekening).

Een glas is hier een Nederlands standaardglas: ongeveer 10 gram alcohol (een glas bier, wijn of een borrel uit de horeca). Bij iemand van 75 kg is 1 tot 2 glazen 0,13 tot 0,27 gram per kilo, 3 tot 5 glazen 0,4 tot 0,67 gram per kilo, en 6 glazen of meer 0,8 gram per kilo of meer (afgeleid). Die grammen per kilo zijn de maat die de studies gebruiken.

## 1. In het kort

**Hoeveel het scheelt.** Bij 1 tot 2 glazen is het effect klein en kort: in de nacht ligt de hartslag tijdens de slaap 1 tot 3 slagen hoger en de HRV een paar milliseconden lager, vooral in de eerste uren, en de prestatie de dag erna is in studies niet meetbaar slechter. Dat valt binnen hoe die getallen van nacht tot nacht toch al schommelen. Bij 3 tot 5 glazen wordt het zichtbaar: ongeveer 4 tot 8 slagen hoger, de HRV 10 tot 25% lager, minder REM-slaap, een korter nachtje, en een harde training de dag erna voelt zwaarder. Bij 6 glazen of meer ligt de hartslag in de eerste uren van de slaap gemiddeld bijna 9 slagen hoger en de HRV ongeveer 13 milliseconden lager (Pietilä 2018, 4.098 mensen), en de ochtend erna hield iemand het op een zware fietstest 11% korter vol (21 seconden op ruim 3 minuten). Sprongkracht daalde bij rugbyspelers ongeveer 10%, maximale kracht bleef vrijwel gelijk. Hoe lang: bij weinig drinken is de volgende nacht weer gewoon, bij veel drinken ongeveer één tot twee dagen voor een harde training weer goed gaat. Voor de nacht erna bestaan geen directe metingen.

**Is het belangrijk genoeg om vast te leggen?** Nee, niet als vaste gewoonte. Voor iemand die minder dan eens per maand drinkt kost het vastleggen meer dan het oplevert. Een paar keer per jaar één rustiger training heeft geen meetbaar effect op een 10 km-tijd of op klaar zijn voor een bergtocht. Eén afwijkende nacht verschuift het gemiddelde van 28 dagen met een derde slag en minder dan een milliseconde. En de app reageert al op de getallen zelf, zonder dat hij de oorzaak hoeft te weten. Het telt **alleen in drie gevallen**: (1) als de ochtendgetallen duidelijk afwijken, om die ene nacht uit het eigen gemiddelde te laten; (2) als er de dag erna of die ochtend een test of wedstrijd staat, omdat een test na een avond met veel drinken een te trage uitslag geeft waar de app daarna tempo's uit afleidt; (3) bij 6 glazen of meer met de dag erna een bergtocht, intervallen, een lange duurloop of een zware beendag. Bij 1 tot 2 glazen is het nooit de moeite.

**Wat ASCEND zou moeten doen.** Niets vragen. Het eigen gemiddelde ongevoelig maken voor één uitschieter (dat werkt voor elke oorzaak, zonder vraag). Achter de ochtendregel een verborgen keuze "Deze nacht niet meetellen" met optioneel "Weet je waarom?" en neutrale redenen, één mechanisme voor alcohol, cannabis, warmte, cafeïne, ziekte en laat naar bed. Bij een test of wedstrijd na zo'n nacht een voorstel met Akkoord om hem te verschuiven. Nooit tellen, nooit een grafiek, nooit herinneren, nooit raden dat het alcohol was.

## 2. Hoeveel scheelt het echt (vraag 1)

### De nacht: slaap

Een meta-analyse van 27 studies bij gezonde volwassenen vond dat alcohol de REM-slaap (de droomslaap) later laat beginnen en korter maakt, al vanaf een lage dosis (0,5 gram per kilo of minder, ongeveer twee glazen), en sterker naarmate de dosis hoger is. Sneller inslapen en sneller in de diepe slaap gebeurden alleen bij een hoge dosis (0,85 gram per kilo of meer, ongeveer vijf glazen). Op totale slaapduur, slaapefficiëntie en wakker liggen was het bewijs te wisselend om iets te zeggen ([Gardiner e.a. 2025](https://research.monash.edu/en/publications/the-effect-of-alcohol-on-subsequent-sleep-in-healthy-adults-a-sys/)) (bewijs: sterk voor REM, zwak voor duur; ik las alleen de samenvatting, geen minuten per dosis). Het oudere beeld uit de review van Ebrahim e.a. (2013, Alcoholism: Clinical and Experimental Research) past daarbij: in de eerste helft van de nacht wat meer diepe slaap, in de tweede helft onrustiger slaap zodra de alcohol is afgebroken (bewijs: matig).

Wat de makers van wearables zien bij nachten waarop mensen zelf "alcohol" aantikten, vergeleken met de nachten ervoor en erna van dezelfde persoon: Oura meldt over meer dan 800.000 leden (januari tot augustus 2026) 7,7% kortere slaap, 14% minder REM en 5% minder diepe slaap ([Oura](https://ouraring.com/blog/how-does-alcohol-impact-oura-members/)). Een eerdere versie van dezelfde pagina noemde ongeveer 35 minuten minder slaap. Bij wandelaars die de avond ervoor gemiddeld 3 glazen dronken en een kater hadden, was de nacht 5,9 uur tegen 6,2 uur zonder kater ([Verster e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7019771)) (bewijs: zwak, zelf gemeld). Wearables schatten slaapfasen bovendien onnauwkeurig; de REM-getallen van een horloge zijn een richting, geen meting (bewijs: expert).

In gewone woorden: na een paar glazen slaap je even lang of iets korter, maar met minder droomslaap. Na veel glazen val je snel in slaap en word je in de tweede helft van de nacht vaker wakker.

### De nacht: rusthartslag en HRV

De beste losse studie is Pietilä e.a. 2018: 4.098 werknemers met een hartslagmeter, elk vergeleken met hun eigen nachten zonder alcohol, in de eerste drie uur van de slaap ([volledige tekst](https://pmc.ncbi.nlm.nih.gov/articles/PMC5878366)). Per dosis:

- laag (0,25 gram per kilo of minder, gemiddeld 1,1 glas van 12 gram): hartslag 1,4 slagen hoger, RMSSD (de HRV-maat die ook Garmin gebruikt) 2,0 ms lager;
- matig (0,25 tot 0,75 gram per kilo, gemiddeld 2,9 glazen): hartslag 4,0 hoger, RMSSD 5,7 ms lager;
- hoog (meer dan 0,75 gram per kilo, gemiddeld 7 glazen): hartslag 8,7 hoger, RMSSD 12,9 ms lager.

Bij een lage dosis waren de waarden in het derde uur al bijna terug op het gewone niveau. Het effect was sterker bij jongere mensen en bij mensen met een lage hartslag in de slaap, en sportieve mensen werden net zo hard geraakt als niet-sportieve (bewijs: matig; groot, maar observationeel, dosis zelf gemeld, twee auteurs werkten bij de maker van de software).

De grootste recente studie volgde 20.968 dragers van een Whoop een jaar lang, ruim vijf miljoen dagen, ook binnen dezelfde persoon. Eén glas meer dan je eigen gemiddelde, tegen één minder, gaf bij mannen een rusthartslag in de slaap die 2,4 slagen hoger lag en een HRV die 3,3 ms lager lag; bij vrouwen 2,8 slagen en 3,8 ms. De effecten stapelden met de dosis, waren groter bij jongere mensen, en kleiner als er vroeger op de avond gedronken werd ([Grosicki e.a. 2026, PLOS Digital Health](https://journals.plos.org/digitalhealth/article?id=10.1371/journal.pdig.0001284)) (bewijs: matig; zeer groot, binnen de persoon, vooraf vastgelegd plan, maar betaald door Whoop en met zelf gemelde glazen).

De makers zelf: Whoop noemt per extra glas 1,3 slag hoger, 2,4 ms lager en 4,2% minder "Recovery", en elders 3 slagen en 7 ms na "elke hoeveelheid" ([Whoop](https://www.whoop.com/us/en/thelocker/research-alcohol-effect-on-your-body/)). Oura meldt op nachten met de tag een laagste hartslag die 7,5% hoger ligt (bij een rusthartslag van 50 is dat bijna 4 slagen) en een HRV die 23% lager ligt ([Oura](https://ouraring.com/blog/how-does-alcohol-impact-oura-members/)). Deze getallen zijn betrouwbaar in hun richting en ruw in hun grootte: geen aantal mensen, geen spreiding, geen hoeveelheid, en iemand tikt "alcohol" vooral aan na een avond die hij voelde (bewijs: zwak). Garmin en Polar publiceren geen eigen cijfers; Garmin heeft sinds 2025 "Lifestyle Logging" in Garmin Connect, dat een gedrag tegen slaapscore, HRV en stress zet en pas na ongeveer vier weken iets toont ([DC Rainmaker](https://www.dcrainmaker.com/2025/09/lifestyle-logging-journaling-health-status-vs-whoop-everything.html)).

Samen per hoeveelheid, voor de getallen die het horloge 's ochtends geeft (afgeleid uit Pietilä, Grosicki en Oura; het horloge middelt over de hele nacht, en dan valt het effect bij weinig drinken kleiner uit dan in de eerste drie uur):

- 1 tot 2 glazen: rusthartslag 1 tot 3 slagen hoger, HRV 2 tot 7 ms lager (ongeveer 3 tot 10%);
- 3 tot 5 glazen: 4 tot 8 slagen hoger, HRV 6 tot 15 ms lager (10 tot 25%);
- 6 glazen of meer: 8 tot 15 slagen hoger, HRV 13 tot 25 ms lager (20 tot 40%).

Hoe lang het duurt: alle studies kijken naar dezelfde nacht. De nacht erna is in geen enkele studie gemeten die ik vond, ook niet door Whoop of Oura (bewijs: geen). Alcohol wordt afgebroken met ruwweg 7 tot 10 gram per uur, dus ongeveer een glas per uur ([Cederbaum 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3484320/)) (bewijs: sterk). Na 2 glazen is het er voor middernacht uit; na 6 tot 8 glazen tot laat op de avond zit er 's ochtends vaak nog alcohol in het bloed. Mijn verwachting: de nacht erna is weer gewoon, behalve na veel drinken met een korte nacht, waar het slaaptekort nog een nacht doorwerkt (afgeleid).

### Is het anders bij iemand die zelden drinkt?

Waarschijnlijk iets sterker, maar dat is niet direct gemeten. Wie vaker drinkt raakt binnen enkele nachten gewend aan de slaapverwekkende werking: in een studie verdween het effect van 0,6 gram per kilo op slaapduur en diepe slaap tussen nacht 2 en nacht 6 ([Roehrs en Roth 2018](https://pubmed.ncbi.nlm.nih.gov/29762764/); review [Roehrs en Roth 2001](https://pmc.ncbi.nlm.nih.gov/articles/PMC6707127/)) (bewijs: matig voor gewenning, zwak voor de vertaling naar hartslag). Twee dingen uit de grote studies wijzen dezelfde kant op: het effect is groter bij jongere mensen en bij een lage hartslag in de slaap, wat bij goed getrainde mensen past (Pietilä 2018) (bewijs: matig). Voor iemand die zelden drinkt en fit is, kun je dus beter de bovenkant van de banden hierboven aanhouden (afgeleid). Wie vaak drinkt heeft daarnaast een lagere HRV in het algemeen, maar dat speelt hier niet.

### De dag erna: prestatie

- **Duurvermogen op hoge intensiteit.** Twaalf recreatief sportieve mensen dronken 's avonds 1,09 gram per kilo vetvrije massa (ruwweg 0,9 gram per kilo lichaamsgewicht, 6 tot 7 glazen) of water. De ochtend erna hielden ze een zware fietstest 181 tegen 203 seconden vol, 11% korter. Sprong, trekkracht en armkracht verschilden niet ([IJSPP 2021, samenvatting](https://lida.sport-iat.de/ta/Record/4073475)) (bewijs: zwak tot matig, één kleine gecontroleerde studie).
- **Wandelen in de bergen.** Bij 299 wandelaars in de Samaria-kloof op Kreta (15,8 km, van 1.230 m naar zeeniveau) liepen mensen met een kater (gemiddeld 3 glazen van 10 gram de avond ervoor) even snel als mensen zonder alcohol: 6,0 tegen 6,1 uur. Ze voelden zich na afloop wel uitgeputter (8,8 tegen 7,8 op 10) en dronken 300 ml meer water ([Verster e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7019771)) (bewijs: zwak, observationeel, maar wel precies de activiteit van een wandeltocht).
- **Sprongkracht en sprint.** Na een rugbywedstrijd en gemiddeld veel drinken daalde de sprong de ochtend erna ongeveer 10,5% tegen 2,4% zonder alcohol ([Murphy e.a. 2013](https://opus.lib.uts.edu.au/handle/10453/27641)) (bewijs: zwak, klein). Bij clubspelers die tot 20 glazen dronken was er twee dagen later geen verschil in kracht, sprint of vochtbalans, en de ochtend erna alleen een kleine daling in springen ([Prentice e.a. 2014](https://m.medicalxpress.com/news/2014-06-binge-affect-rugby.html)) (bewijs: zwak, via een samenvatting).
- **Kracht.** Maximale kracht blijft de dag erna in de meeste studies gelijk (bewijs: matig, meerdere kleine studies).
- **Concentratie.** Een kater gaat samen met tragere reacties en minder volgehouden aandacht (systematische review, Gunn e.a. 2018, Addiction) (bewijs: matig). Op een technisch bergpad of een afdaling met rugzak is dat het echte risico, meer dan een paar procent minder vermogen (afgeleid).

Bij 1 tot 2 glazen is er geen studie die een prestatieverlies de dag erna vond, en de review van Barnes noemt 0,5 gram per kilo (bij 75 kg ongeveer 4 glazen) "waarschijnlijk zonder effect op de meeste aspecten van herstel" ([Barnes 2014](https://link.springer.com/article/10.1007/s40279-014-0192-8)) (bewijs: matig tot expert).

### Spierherstel en spieropbouw

- Na een zware excentrische training (300 maximale remmende samentrekkingen van één been) verloren mannen die daarna 1 gram per kilo dronken (6 tot 8 glazen) in de dagen erna 41 tot 45% kracht, tegen 26 tot 32% zonder alcohol ([Barnes e.a. 2010](https://www.springermedicine.com/post-exercise-alcohol-ingestion-exacerbates-eccentric-exercise-i/21068004)). Met 0,5 gram per kilo was er geen verschil ([Barnes e.a. 2011](https://www.springermedicine.com/a-low-dose-of-alcohol-does-not-impact-skeletal-muscle-performanc/21068724)) (bewijs: zwak tot matig, twee studies van tien mannen).
- Na een bekende zware squattraining veranderde alcohol niets aan sprongkracht, sprint of spierpijn ([Levitt e.a. 2020](https://twu-ir.tdl.org/handle/11274/11099)) (bewijs: zwak). Een training die het lichaam kent beschermt dus voor een deel.
- De spiereiwitsynthese na gecombineerde kracht- en duurtraining steeg 109% met eiwit, 57% met eiwit en 1,5 gram per kilo alcohol (ongeveer 12 glazen), 29% met alcohol en koolhydraten ([Parr e.a. 2014](https://research.bond.edu.au/en/publications/alcohol-ingestion-impairs-maximal-post-exercise-rates-of-myofibri/)) (bewijs: matig, één studie, zeer hoge dosis). Bij gewone hoeveelheden is het niet gemeten.

In gewone woorden: veel drinken op de avond van een zware beendag maakt het herstel van die ene training trager en de opbouw van die ene training kleiner. Een paar keer per jaar is dat één training van de ruim honderd in een jaar (afgeleid).

### Uitdroging

Alcohol drijft vocht af, maar minder dan vaak gedacht. Een liter bier van 4% gaf bij mannen die goed gehydrateerd waren ongeveer 160 ml meer urine dan alcoholvrij bier; bij mensen die al wat vocht kwijt waren was er geen duidelijk verschil ([Hobson en Maughan 2010](https://pubmed.ncbi.nlm.nih.gov/20497950/)) (bewijs: matig). Sterkere drank en grotere hoeveelheden drijven meer af (bewijs: matig). Voor de praktijk: bij een paar glazen bier is uitdroging nauwelijks een punt; na veel drinken en een warme tocht de dag erna wel, en dan helpt vooral water en zout bij het ontbijt (bewijs: expert).

### Blessurerisico

Er is geen goede studie naar blessures de dag na drinken bij duursporters. Een review noemt bij teamsporters een blessurekans van 54,8% bij drinkers tegen 23,5% bij niet-drinkers, maar daar zit veel andere leefstijl in en het is geen studie naar de dag na drinken ([O'Brien en Lyons 2000, Sports Medicine](https://lida.sport-iat.de/twm/Record/4004034?lng=en)) (bewijs: zwak). Wat wel aannemelijk is: tragere reacties met een kater (Gunn 2018) maken een val op een technisch pad of een misstap met rugzak waarschijnlijker (afgeleid). Bij hartkloppingen, een onregelmatige hartslag of pijn op de borst na drinken hoort een arts, niet een trainingsapp.

### Hoe lang tot je weer op je gewone niveau zit

- 1 tot 2 glazen: de nacht zelf iets onrustiger, de volgende ochtend gewoon (bewijs: matig).
- 3 tot 5 glazen: één nacht duidelijk anders, de dag erna rustig trainen gaat prima, een harde training voelt zwaarder; de dag daarna gewoon (bewijs: matig voor de nacht, afgeleid voor de dagen).
- 6 glazen of meer: de dag erna minder op hoge intensiteit (ongeveer 11% korter volhouden), minder sprongkracht, tragere reacties; na een zware excentrische training dagen trager herstel. Harde training liefst pas na ongeveer 48 uur (bewijs: zwak tot matig voor de dag erna, afgeleid voor de 48 uur).

## 3. Wat het betekent voor de training (vraag 2)

**Wat kan wel.** Na 1 tot 2 glazen: alles zoals gepland. Na 3 tot 5 glazen: rustig hardlopen, wandelen, een rugzakwandeling en techniek gaan prima; kracht kan, maximale kracht lijdt nauwelijks (bewijs: matig). Na 6 of meer: rustig bewegen, wandelen op makkelijk terrein, een rustdag.

**Wat beter niet.** Na 6 glazen of meer de dag erna: intervallen, een tempoloop, een test of wedstrijd, een zware bergtocht met afdalingen, en vroeg opstaan voor een harde sessie (vroeg wakker na een korte nacht is het slechtste soort slaaptekort, [Craven e.a. 2022](https://link.springer.com/article/10.1007/s40279-022-01706-y), bewijs: sterk). Een zware beendag met veel remmend werk op de avond van het drinken is de combinatie die het herstel het meest kost (Barnes 2010).

**Wat het voor de doelen kost als het een paar keer per jaar gebeurt.** Neem vier keer per jaar een avond met veel drinken, met elke keer één harde training die rustiger wordt of een dag schuift. Dat zijn vier van ongeveer 150 trainingen, en geen enkele daarvan valt weg; hij wordt anders gedaan. De conditie voor een 10 km verandert over weken en maanden, en een week met een gemiste kwaliteitssessie kost geen meetbare tijd (afgeleid, past bij [Mujika en Padilla 2000](https://lida.sport-iat.de/ta/Record/3047130): pas na ongeveer twee weken stilstand gaat er meetbaar conditie verloren). Voor de bergtocht telt het herhaald dragen van gewicht en dagen achter elkaar; één rustige dag schuift daar niets aan. De winst van helemaal niet drinken is voor deze doelen dus vrijwel nul, het verlies van een paar avonden ook (afgeleid). Waar het wel uitmaakt:

- **Een test of wedstrijd.** Een test na zo'n avond valt slechter uit, en de app leidt tempo's en een doeltijd af uit de test (*Trainingswetenschap*, idee 1). Een te trage test maakt dan weken trainingstempo's te traag. Dat is de enige plek waar een avond doorwerkt in het plan (afgeleid).
- **De wedstrijd zelf, en de week ervoor.** Een kater op de wedstrijddag kost op een 10 km grofweg enkele procenten, bij een uur lopen al gauw een minuut of meer (afgeleid uit de 11% op een korte zware test; op een 10 km is het verlies kleiner, maar niet gemeten).
- **Een bergtocht op de dag erna, of een tochtdag.** Even snel, maar uitgeputter, met meer dorst en tragere reacties (Verster 2020, Gunn 2018). Op een pad met afgrond is dat een veiligheidszaak, geen prestatiezaak (afgeleid).

Dit vervangt een deel van regels C2 en C6 uit *Aanvullend onderzoek GR5 voorbereiding*. Die gingen ervan uit dat een avond vooraf gelogd wordt ("na een gelogde sociale avond of alcohol plant de engine ...", "op een avond met 1 of 2 drankjes ligt de krachtsessie eerder"). Voor iemand die niet wil dat er gevraagd wordt, werkt plannen op een avond die de app niet kent niet. Mijn voorstel: het deel over vooruit plannen laten vallen, en houden wat zonder vraag kan (hoofdstuk 6). Dat rapport zelf blijft zoals het is; dit is een voorstel, geen besluit.

## 4. Wat het betekent voor de ochtendgetallen (vraag 3)

### Hoe de app nu rekent

`engine/wellnessCheck.ts` vergelijkt de rusthartslag en HRV van vanochtend met het gemiddelde van de 28 dagen ervoor, met minstens 7 dagen met een waarde. Rusthartslag 5 of meer boven het gemiddelde krijgt de kleur "let op". HRV krijgt die kleur als hij lager ligt dan het gemiddelde min de spreiding (standaardafwijking), en die marge is minstens 7% van het gemiddelde. Zijn beide duidelijk slecht (rusthartslag 5 hoger en HRV onder het bereik), dan stelt de ochtendkaart "Moe" voor als energie (`suggestEnergyFeeling`), en dat telt in `engine/wellbeing.ts` mee voor een rustiger dag en voor de reeks van drie moeie ochtenden (`tiredStreak`).

Wat dat betekent per hoeveelheid (afgeleid uit de banden in hoofdstuk 2):

- 1 tot 2 glazen: meestal geen kleur. De rusthartslag komt zelden 5 boven het gemiddelde, de HRV blijft vaak binnen het bereik.
- 3 tot 5 glazen: vaak één van de twee in de kleur, soms beide.
- 6 glazen of meer: vrijwel altijd beide, dus de kaart stelt "Moe" voor.

Dat is precies wat je wilt: de app reageert op hoe het lichaam erbij ligt, ongeacht waarom. Na een avond met veel drinken stelt hij vanzelf een rustiger dag voor, zonder dat iemand iets heeft verteld.

### Hoeveel scheeft één nacht het gemiddelde?

Een rekenvoorbeeld met gewone waarden (afgeleid): rusthartslag gemiddeld 50 met een spreiding van 2,5 slagen; HRV gemiddeld 60 ms met een spreiding van 6 ms. Eén nacht met 6 glazen of meer: rusthartslag 58, HRV 40.

- Het gemiddelde van de rusthartslag gaat van 50 naar 50,3 (8 gedeeld door 28). Afgerond blijft het meestal 50. De grens "5 boven je gemiddelde" schuift dus hooguit een derde slag op. Verwaarloosbaar.
- Het gemiddelde van de HRV gaat van 60 naar 59,3 ms. Maar de spreiding stijgt van 6 naar ongeveer 7 ms, omdat één uitschieter in het kwadraat meetelt. De ondergrens van het gewone bereik zakt daardoor van 54 naar ongeveer 52,3 ms. Vier weken lang krijgt een ochtend met 53 ms dan geen kleur meer, terwijl hij die zonder de uitschieter wel kreeg. Dat is een kleine maar echte vervaging, ongeveer 3% van het gemiddelde, die precies het signaal dempt waar de app op let.
- In de eerste weken, met maar 7 tot 10 dagen gegevens, weegt dezelfde nacht drie tot vier keer zwaarder. Twee zulke nachten in dezelfde vier weken (een feestweek) tellen op.

Conclusie: één nacht scheeft het gemiddelde nauwelijks, maar de spreiding van de HRV wel merkbaar. Hij hoort er dus liefst uit, maar dat hoeft niet via een vraag. Een gemiddelde dat één uitschieter vanzelf negeert (bijvoorbeeld de mediaan, of waarden die meer dan drie keer de spreiding afwijken niet meetellen in de spreiding) lost het op voor elke oorzaak: alcohol, koorts, een nacht met een slecht zittend horloge (afgeleid; dit is gangbare robuuste statistiek, geen sportonderzoek). Het mechanisme "Niet goed gemeten" dat nu gebouwd wordt, doet hetzelfde voor een nacht die iemand zelf aanwijst.

### Kan de app een alcoholnacht herkennen?

Niet betrouwbaar, en hij moet het ook niet proberen. Het patroon (rusthartslag fors hoger en HRV fors lager, één nacht, de nacht erna weer gewoon) is niet eigen aan alcohol:

- **Ziekte.** Een beginnende infectie geeft dezelfde richting, vaak al een paar dagen voor de klachten. In een studie met smartwatches had 63% van 32 mensen met covid een duidelijk verhoogde rusthartslag tegen hun eigen gewone waarde, voor of bij het begin van de klachten ([Mishra e.a. 2020](https://www.nature.com/articles/s41551-020-00640-6)) (bewijs: matig). Het verschil met alcohol: ziekte houdt meestal meerdere nachten aan of loopt op. Na één nacht is dat nog niet te zien.
- **Een zware of lange training.** Na een harde sessie kan de HRV de nacht erna lager zijn en de hartslag iets hoger, en het herstel van het zenuwstelsel loopt tot 48 uur ([Stanley e.a. 2013](https://pubmed.ncbi.nlm.nih.gov/23912805)) (bewijs: matig). Dat weet de app zelf, want de training staat in het logboek.
- **Warmte.** Een warme slaapkamer of een hete dag geeft een hogere hartslag in de slaap (bewijs: matig in het algemeen, geen getal voor wearables gevonden).
- **Laat en veel eten.** Waarschijnlijk een paar slagen, het bewijs is wisselend en klein (bewijs: zwak).
- **Stress, een korte nacht, cafeïne laat op de dag, cannabis, reizen.** Allemaal dezelfde richting, kleiner of wisselend (bewijs: zwak tot matig).

Hoe vaak het verward zou worden is niet onderzocht. Een schatting op basis van de kansen vooraf (afgeleid): bij iemand die minder dan eens per maand drinkt, en waarvan alleen de avonden met veel drinken een duidelijke afwijking geven, is hooguit een paar keer per jaar een duidelijke afwijking door alcohol. Afwijkingen door ziekte, warme nachten, slecht slapen en zware trainingen komen samen eerder een tot een paar keer per maand voor. Van de duidelijke afwijkende ochtenden is dan misschien een op de vijf tot een op de tien alcohol. Een app die "alcohol?" raadt, raadt dus meestal fout, en raakt daarmee precies het gevoel van gecontroleerd worden dat je wilt vermijden. Whoop zelf waarschuwt dat alcohol en laat eten andere conclusies vertroebelen ([Whoop, zelfexperiment](https://www.whoop.com/us/en/thelocker/a-guide-to-self-experimentation-optimizing-your-habits-for-performance/)).

Het enige onderscheid dat de app wel kan maken: was er gisteren een zware training (staat in het logboek), en is het morgen weer normaal (dan was het één nacht, en dan hoeft er geen ziektezin te komen). Dat kan zonder oorzaak te noemen.

## 5. Hoe anderen het doen, en wat te veel is (vraag 4, eerste deel)

- **Whoop** heeft een dagboek dat elke ochtend een rij vragen stelt, ook "alcohol?", en pas een uitkomst toont na minstens 5 keer ja en 5 keer nee binnen 90 dagen ([Whoop Journal](https://www.whoop.com/thelocker/the-whoop-journal/); [inzichten](https://whoop.com/thelocker/a-new-way-to-see-insights-on-which-behaviors-affect-your-recovery)). Wie minder dan eens per maand drinkt komt daar nooit aan: hij beantwoordt de vraag elke ochtend en krijgt er nooit iets voor terug. Gebruikers die het lang doen vinden de patronen nuttig; anderen ergeren zich aan het dagelijkse invullen en dat je pas de dag erna kunt loggen (reacties bij [DC Rainmaker](https://www.dcrainmaker.com/2025/09/lifestyle-logging-journaling-health-status-vs-whoop-everything.html)) (bewijs: zwak, gebruikersreacties).
- **Oura** heeft tags die je zelf aantikt, zonder vraag, en raadt aan naar meerdere getagde nachten te kijken in plaats van één ([Oura](https://ouraring.com/blog/how-does-alcohol-impact-oura-members/)). Minder opdringerig, maar een tag zonder gevolg is werk zonder opbrengst.
- **Garmin** heeft Lifestyle Logging met optionele herinneringen; je moet voor volledige analyse elke dag ook "nee" invullen, en de eerste uitkomst komt na ongeveer vier weken. De kritiek van een bekende tester: "hoe meer je mensen laat doen, hoe minder ze doen", en lezers zeiden dat ze het drinken dan gewoon niet loggen ([DC Rainmaker](https://www.dcrainmaker.com/2025/09/lifestyle-logging-journaling-health-status-vs-whoop-everything.html); [the5krunner](https://the5krunner.com/2025/10/06/garmin-lifestyle-logging-fails-to-take-on-whoop/)) (bewijs: zwak).
- **Polar** heeft geen tags voor alcohol die ik kon vinden.

Wat te veel is (afgeleid uit het bovenstaande en uit de wens om zelden te vragen): een vaste vraag, een herinnering, een telling ("3 keer deze maand"), een grafiek van drinkavonden, een score die erop reageert, een correlatie die pas na tientallen keren iets zegt. Voor iemand die zelden drinkt levert een dagboek nooit genoeg ja-antwoorden op om iets te leren, dus is elke vaste vraag puur kosten.

## 6. Opties voor ASCEND (vraag 4)

Alle opties gaan uit van één algemeen, neutraal mechanisme voor alles wat de ochtendgetallen of een training anders maakt: alcohol, cannabis (zie het lopende onderzoek *Cannabis en training*), warmte, cafeïne, ziekte, laat naar bed, stress, een zware dag. Nooit een aparte vraag per middel. Het verschil tussen de opties is alleen wanneer de app iets laat zien.

### Optie A: niets vragen, alleen stevig rekenen

**Wat.** Geen enkele vraag. Het eigen gemiddelde wordt ongevoelig voor één uitschieter: de app rekent het bereik van de HRV en rusthartslag met de mediaan, of laat waarden die meer dan drie keer de gewone spreiding afwijken niet meetellen in de spreiding. Nachten die met "Niet goed gemeten" zijn aangewezen tellen niet mee. Verder blijft alles zoals het is: een duidelijk slechte ochtend kleurt en stelt "Moe" voor, en dat leidt tot een rustiger dag.

**Voor.** Nul moeite, geen enkel gevoel van gecontroleerd worden, werkt voor elke oorzaak, en lost het enige echte rekenprobleem op (de vervaagde HRV-marge).

**Tegen.** Bij een test na een slechte nacht weet de app niet dat de test minder telt, tenzij de ochtendgetallen het zelf al zeggen. De reeks van drie moeie ochtenden kan heel soms een avond meetellen.

### Optie B: een rustige regel als de ochtendgetallen duidelijk afwijken

**Wat.** Alleen als rusthartslag en HRV allebei duidelijk afwijken (bijvoorbeeld rusthartslag 7 of meer boven het gemiddelde en HRV onder het bereik), en er gisteren geen zware training was, één regel onder de getallen: "Rusthartslag 7 boven je gemiddelde. Weet je waarom?" met keuzes als "Laat naar bed", "Warm geslapen", "Ziek of grieperig", "Stress", "Iets gedronken of gebruikt", "Geen idee". Overslaan is de gewone keuze. Hoogstens eens per veertien dagen, en nooit twee ochtenden achter elkaar.

**Voor.** Geeft de app een oorzaak op het moment dat die iets uitmaakt, en een antwoord als "ziek" kan meteen naar de bestaande ziekteregel.

**Tegen.** Uit hoofdstuk 4: zo'n ochtend is meestal geen alcohol. De vraag verschijnt dus vooral na warme nachten, slechte nachten en verkoudheden, en voelt na een paar keer toch als een vaste vraag. De keuze "Iets gedronken of gebruikt" in beeld, ook al is hij neutraal, is precies wat iemand die zelden drinkt niet steeds wil zien.

### Optie C: een verborgen keuze achter de ochtendregel

**Wat.** Niets in beeld. Wie op de regel met de horlogegetallen tikt, ziet het blad met de getallen en daaronder één rij "Deze nacht niet meetellen". Kies je die, dan kun je optioneel aangeven waarom, met dezelfde neutrale keuzes als in optie B, en "Zeg ik liever niet" als gewone keuze. Hetzelfde staat bij een training als "Hartslag niet zoals normaal" (warm, ziek, slecht geslapen, iets gedronken of gebruikt, cafeïne, horloge zat los, geen idee), zodat een loop met een rare hartslag niet meetelt in de hartslag-tempotrend en de zones.

Wat er met zo'n nacht gebeurt:

- hij telt niet mee in de eigen gemiddelden van slaap, rusthartslag en HRV (zelfde als "Niet goed gemeten");
- bij de getallen staat één zin: "Deze nacht telt niet mee in je gemiddelde." Geen oorzaak in beeld;
- de ochtend telt niet mee in de reeks moeie ochtenden en geeft geen ziektezin, tenzij de reden "ziek" is (dan de bestaande ziekteregel);
- staat er vandaag of morgen een test of wedstrijd, dan een voorstel met Akkoord: "Je test staat morgen. Na een nacht die niet telt is een test minder betrouwbaar. Een paar dagen later?" Zonder oorzaak te noemen. Een gewone harde training wordt niet verschoven: daarvoor zorgt de ochtendcheck al via de getallen en het gevoel;
- een test die toch na zo'n nacht gedaan is, krijgt bij de uitslag de vraag of hij mag meetellen voor de tempo's.

Wat nooit: geen telling, geen grafiek, geen lijst van nachten met een reden, geen herinnering, geen melding, geen vraag 's avonds, geen woord als "kater" of "drinken" in een samenvatting, geen invloed op "Volgehouden" of een percentage, niet in de Strava-tekst, en de reden staat alleen bij die ene nacht.

**Voor.** Kost niets wie hem niet nodig heeft, en levert precies op wat telt: een schoon gemiddelde en een eerlijke test. Eén mechanisme voor alles. Geen raden.

**Tegen.** Je moet zelf weten dat hij er is. Daarom één keer, bij de eerste ochtend met een duidelijke afwijking, een kleine verwijzing in het blad (niet op de kaart).

### Optie D: een dagboek of een vaste vraag

**Wat.** Elke ochtend of avond "Alcohol gedronken?", zoals Whoop en Garmin. **Afgeraden.** Voor iemand die minder dan eens per maand drinkt geeft het nooit genoeg ja-antwoorden om iets te leren (Whoop vraagt er 5 binnen 90 dagen), het kost elke dag een tik, en het voelt als gecontroleerd worden.

### Optie E: de app raadt zelf

**Wat.** "Je getallen lijken op een avond met alcohol." **Afgeraden.** Meestal fout (hoofdstuk 4), en een fout gegokte oorzaak is erger dan geen oorzaak.

### Vergelijking

A kost niets en lost het rekenprobleem op voor elke oorzaak. C voegt daar zonder kosten de twee dingen aan toe die A niet kan: een nacht zelf uitzetten en een test beschermen. B geeft iets meer informatie, maar vooral op ochtenden waar het niet om alcohol gaat, en komt dicht bij een vaste vraag. D en E zijn te veel. De beste combinatie is A plus C, met B alleen als iemand dat zelf aanzet (een instelling "Vraag waarom bij afwijkende ochtenden", standaard uit), zoals de werkafspraak "alles instelbaar" vraagt.

## 7. Advies (vraag 5)

**Wel doen, als voorstel voor engine-regels:**

1. **WELLNESS-ROBUST.** Het eigen bereik in `wellnessCheck.ts` ongevoelig maken voor één uitschieter: de spreiding van HRV en rusthartslag rekenen zonder waarden die meer dan drie keer de gewone spreiding afwijken (of mediaan en mediane afwijking), en nachten die "niet meetellen" helemaal buiten het gemiddelde laten. Minimaal 7 dagen blijft. Dit is voor alcohol het belangrijkste deel, omdat het zonder vraag werkt en het enige rekeneffect wegneemt dat er echt is (afgeleid; de grootte is in hoofdstuk 4 uitgerekend).
2. **NIGHT-EXCLUDE met een optionele reden.** De verborgen keuze uit optie C, hetzelfde mechanisme als "Niet goed gemeten", met een neutrale lijst redenen die ook cannabis, warmte, cafeïne, ziekte en laat naar bed dekt, en "Zeg ik liever niet". De reden verandert alleen twee dingen: "ziek" gaat naar de ziekteregel; alle andere redenen maken de ochtend tot één losse nacht (niet in de reeks moeie ochtenden, geen ziektezin).
3. **TEST-AFTER-NIGHT.** Staat er vandaag of morgen een test of wedstrijd en is de nacht uitgezet, of zijn vanochtend rusthartslag en HRV allebei duidelijk afwijkend, dan een voorstel met Akkoord om de test een paar dagen te verschuiven, en bij een test die toch doorging de vraag of hij mag meetellen voor de tempo's. Na het gemiddelde is dit het tweede belangrijke deel voor alcohol: een test is de enige plek waar één avond weken doorwerkt.
4. **Regel C6 inperken.** Het deel "een HRV- of rusthartslagdip de ochtend erna telt niet als overbelastingssignaal" houden, maar alleen voor een nacht die uitgezet is; het vooruit plannen rond een avond (C2, het eerste deel van C6) laten vallen, omdat het een vraag vooraf nodig heeft.
5. In de kennis (niet op de kaart) één korte tekst met de getallen uit hoofdstuk 2, in de toon "kan", zonder oordeel, met als praktische punten: drink vroeg op de avond in plaats van laat (Grosicki 2026: een uur eerder geeft een kleinere afwijking), water erbij, na veel drinken de dag erna rustig en geen vroege harde sessie, en bij hartkloppingen of pijn op de borst naar een arts.

**Niet de moeite waard:** een vaste vraag of dagboek, een tag die iets telt, een eigen analyse "wat doet alcohol met jou" (te weinig nachten om iets te leren), het automatisch herkennen van een alcoholnacht, het vooruit plannen rond een sociale avond, en het verschuiven van gewone trainingen op basis van een reden (dat doet de ochtendcheck al op basis van de getallen en het gevoel).

**Het antwoord op de hoofdvraag, nog één keer.** Moet een recreatieve sporter die minder dan eens per maand drinkt alcohol vastleggen zodat de app er rekening mee houdt? Nee. Het effect is bij 1 tot 2 glazen te klein om te meten en bij meer glazen kort (één tot twee dagen), de app reageert al op de getallen zelf, en één nacht verschuift het gemiddelde nauwelijks als de app het gemiddelde robuust rekent. Vastleggen loont alleen als de ochtendgetallen duidelijk afwijken (om die nacht uit het gemiddelde te halen, en dan zonder reden te hoeven noemen), en als er die ochtend of de dag erna een test of wedstrijd staat. Bij veel drinken met de dag erna een bergtocht, intervallen of een lange duurloop is het nuttig om het rustiger te doen, maar daarvoor hoeft de app de reden niet te kennen: de ochtendgetallen en het gevoel zeggen het al.

## 8. Afsluiting

**Wat het onderzoek zegt.** Alcohol verhoogt de hartslag in de slaap en verlaagt de HRV in dezelfde nacht, afhankelijk van de dosis: ongeveer 1 tot 3 slagen bij 1 tot 2 glazen, 4 tot 8 bij 3 tot 5, en 8 tot 15 bij 6 of meer, met de HRV 3 tot 10%, 10 tot 25% en 20 tot 40% lager (matig bewijs, grote studies binnen de persoon). REM-slaap neemt al bij weinig drinken af (sterk). De prestatie de dag erna lijdt pas bij veel drinken: ongeveer 11% korter volhouden op hoge intensiteit, minder sprongkracht, tragere reacties, maximale kracht vrijwel gelijk, wandeltempo gelijk maar zwaarder gevoeld (zwak tot matig). Veel drinken na een zware remmende training vertraagt het herstel van die training (zwak tot matig). Uitdroging speelt bij bier nauwelijks. Wie zelden drinkt en fit is, zit waarschijnlijk aan de bovenkant van die banden.

**Wat het betekent voor de app.** Niet vragen. Het eigen gemiddelde robuust rekenen, zodat één uitschieter van welke oorzaak ook het bereik niet vervaagt. Achter de ochtendregel en bij een training een verborgen, neutrale keuze om een nacht of een hartslag niet te laten meetellen, met een optionele reden die voor alcohol, cannabis, warmte, cafeïne, ziekte en laat naar bed hetzelfde werkt. Een test of wedstrijd na zo'n nacht via een voorstel met Akkoord verschuiven. Nooit tellen, tonen, herinneren of raden.

**Wat nog onzeker is.** Er is geen studie die de nacht na de alcoholnacht meet; de "weer gewoon na één tot twee dagen" is afgeleid. De banden per aantal glazen zijn samengesteld uit studies met verschillende maten (eerste drie uur tegen hele nacht, per glas boven het eigen gemiddelde, getagde nachten) en dus ruw. Of zeldzame drinkers echt sterker reageren is niet direct gemeten. De studie naar prestatie de ochtend erna en de rugbystudies zijn klein, en twee bronnen las ik alleen via een samenvatting (de fietsstudie uit 2021 en Prentice 2014; van de meta-analyse uit 2025 alleen de samenvatting). Hoe vaak een afwijkende ochtend door alcohol komt in plaats van door iets anders is een schatting, geen meting. De cijfers van Whoop en Oura komen van de makers zelf. Het rekenvoorbeeld van het gemiddelde gebruikt gangbare, niet persoonlijke waarden.

## Bronnen

Onderzoek:

- Gardiner e.a. 2025, alcohol en slaap, meta-analyse van 27 studies, Sleep Medicine Reviews: https://research.monash.edu/en/publications/the-effect-of-alcohol-on-subsequent-sleep-in-healthy-adults-a-sys/
- Pietilä e.a. 2018, alcohol en hartslag en HRV in de eerste uren slaap, 4.098 mensen, JMIR Mental Health: https://pmc.ncbi.nlm.nih.gov/articles/PMC5878366
- Grosicki e.a. 2026, alcohol, hartslag, slaap en activiteit bij 20.968 dragers van een wearable, PLOS Digital Health: https://journals.plos.org/digitalhealth/article?id=10.1371/journal.pdig.0001284
- Roehrs en Roth 2018, gewenning aan alcohol voor het slapen, Sleep: https://pubmed.ncbi.nlm.nih.gov/29762764/
- Roehrs en Roth 2001, slaap en alcohol, Alcohol Research and Health: https://pmc.ncbi.nlm.nih.gov/articles/PMC6707127/
- Cederbaum 2012, afbraak van alcohol, Clinics in Liver Disease: https://pmc.ncbi.nlm.nih.gov/articles/PMC3484320/
- Effect van alcohol de dag ervoor op spierfunctie en zware inspanning, IJSPP 2021 (samenvatting): https://lida.sport-iat.de/ta/Record/4073475
- Verster e.a. 2020, kater en wandelen in de Samaria-kloof, Journal of Clinical Medicine: https://pmc.ncbi.nlm.nih.gov/articles/PMC7019771
- Murphy e.a. 2013, alcohol na een rugbywedstrijd en herstel, JSCR: https://opus.lib.uts.edu.au/handle/10453/27641
- Prentice, Stannard en Barnes 2014, veel drinken en prestatie bij rugbyspelers, JSAMS (samenvatting): https://m.medicalxpress.com/news/2014-06-binge-affect-rugby.html
- Barnes, Mündel en Stannard 2010, alcohol na excentrische training: https://www.springermedicine.com/post-exercise-alcohol-ingestion-exacerbates-eccentric-exercise-i/21068004
- Barnes, Mündel en Stannard 2011, lage dosis zonder effect: https://www.springermedicine.com/a-low-dose-of-alcohol-does-not-impact-skeletal-muscle-performanc/21068724
- Levitt e.a. 2020, alcohol na zware squats en herstel van sprongkracht: https://twu-ir.tdl.org/handle/11274/11099
- Parr e.a. 2014, alcohol en spiereiwitsynthese, PLoS One: https://research.bond.edu.au/en/publications/alcohol-ingestion-impairs-maximal-post-exercise-rates-of-myofibri/
- Barnes 2014, review alcohol, prestatie en herstel, Sports Medicine: https://link.springer.com/article/10.1007/s40279-014-0192-8
- Hobson en Maughan 2010, vochtbalans en een kleine dosis alcohol: https://pubmed.ncbi.nlm.nih.gov/20497950/
- O'Brien en Lyons 2000, alcohol en de sporter, Sports Medicine 29(5): https://lida.sport-iat.de/twm/Record/4004034?lng=en
- Craven e.a. 2022, slaapverlies en prestatie, Sports Medicine: https://link.springer.com/article/10.1007/s40279-022-01706-y
- Mishra e.a. 2020, ziekte vooraf zien aan de rusthartslag van een smartwatch, Nature Biomedical Engineering: https://www.nature.com/articles/s41551-020-00640-6
- Stanley, Peake en Buchheit 2013, herstel van het zenuwstelsel na inspanning, Sports Medicine: https://pubmed.ncbi.nlm.nih.gov/23912805
- Mujika en Padilla 2000, verlies van conditie bij stilstand: https://lida.sport-iat.de/ta/Record/3047130
- Gunn e.a. 2018, kater en denkvermogen, systematische review, Addiction (via de titel, niet zelf gelezen).
- Ebrahim e.a. 2013, alcohol en slaap, review, Alcoholism: Clinical and Experimental Research (via de titel, niet zelf gelezen).

Makers en tests van apps:

- Oura, wat alcohol doet bij leden: https://ouraring.com/blog/how-does-alcohol-impact-oura-members/
- Whoop, onderzoek naar alcohol: https://www.whoop.com/us/en/thelocker/research-alcohol-effect-on-your-body/
- Whoop Journal: https://www.whoop.com/thelocker/the-whoop-journal/
- Whoop, inzichten uit het dagboek: https://whoop.com/thelocker/a-new-way-to-see-insights-on-which-behaviors-affect-your-recovery
- Whoop, zelfexperiment: https://www.whoop.com/us/en/thelocker/a-guide-to-self-experimentation-optimizing-your-habits-for-performance/
- DC Rainmaker over Garmin Lifestyle Logging en Whoop: https://www.dcrainmaker.com/2025/09/lifestyle-logging-journaling-health-status-vs-whoop-everything.html
- the5krunner over Garmin Lifestyle Logging: https://the5krunner.com/2025/10/06/garmin-lifestyle-logging-fails-to-take-on-whoop/

Eigen rapporten in deze repo waarop dit voortbouwt: *Aanvullend onderzoek GR5 voorbereiding* (regels C2 en C6), de notities `herstel_leefstijl.md`, *Trainingswetenschap* (idee 1 en 7), *Pijn spierpijn en vermoeidheid melden*.
