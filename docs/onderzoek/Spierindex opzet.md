# Spierindex: een opzet

Scout Spierindex, 2 november 2026. Dit is een opzet, geen besluit. Het bouwt voort op *Kracht loggen en progressie* (regel KR-10), *Aanvullend onderzoek GR5 voorbereiding* (regels F1 tot F5), *Spierbelasting en beenvermoeidheid*, *Pijn spierpijn en vermoeidheid melden* en de visie *Spierpijn en een zware beendag*. Nieuw onderzoek is er bijna niet bij; het meeste staat er al.

## Wat er al is

`engine/muscleVolume.ts` telt per week (maandag tot zondag) de harde sets per spiergroep: een werkset via `isWorkSet` met hooguit 4 herhalingen over, de hoofdspier 1, een meehelpende spier een halve. Het wordt nog nergens getoond. `engine/muscleMap.ts` tekent alleen het kaartje bij een oefening. Let op: `engine/substitutions.ts` gaat niet over oefeningen maar over de korte en minimale versie van een sessie (geparkeerd). Het echte vervangen van een oefening zit in `engine/forgeWorkout.ts#swapOptions`, dat kiest op gedeelde hoofdspieren, hetzelfde bewegingspatroon en het materiaal in je sportschool. Stap 2 hoort dus daar, niet in `substitutions.ts`.

## 1. Wat een spierindex zou zijn

Per spiergroep één stand, geen score: **te weinig, op koers of veel**, afgeleid uit het gemiddelde aantal harde sets per week over de **laatste vier weken**. Vier weken omdat één week te grillig is (een gemiste training, een rustweek) en omdat de richtwaarden in het onderzoek per week gelden en over maanden gemeten zijn. Een rustweek uit regel F3 telt niet mee in het gemiddelde, anders lijkt elke vierde week een tekort (afgeleid).

Wat het onderzoek zegt over de ondergrens. Ongeveer 10 harde sets per spiergroep per week, verdeeld over twee trainingen, is een goede richtwaarde voor een recreant ([ACSM 2026](https://acsm.org/resistance-training-guidelines-update-2026/), sterk; [Pelland e.a. 2025](https://pubmed.ncbi.nlm.nih.gov/41343037/), matig tot sterk). Maar dat is een richtwaarde voor groei. Wie vooral wil **behouden**, zoals deze sporter in een loop- of tochtblok, heeft veel minder nodig: één sessie per week met één set per oefening hield bij jonge volwassenen kracht en spiermassa tot 32 weken vast, zolang de zwaarte bleef ([Bickel e.a. 2011](https://pubmed.ncbi.nlm.nih.gov/21131862/), matig; [Spiering e.a. 2021](https://pubmed.ncbi.nlm.nih.gov/33629972/), narratieve review). In gewone woorden: drie of vier zware sets per week voor een spiergroep is genoeg om niet achteruit te gaan; tien is wat je doet als je sterker wilt worden.

Wat het onderzoek zegt over de bovengrens. Meer sets geven steeds minder extra, voor kracht veel eerder dan voor spiergroei ([Pelland e.a. 2025](https://pubmed.ncbi.nlm.nih.gov/41343037/)). Regel F1 noemt 10 tot 20 voor het programma Kracht. Voor deze sporter is de echte bovengrens bij de benen niet de groei maar de vermoeidheid: elke extra beenset komt bovenop lopen en afdalen, en dat meet de beenindex al (`engine/legFatigue.ts`). De spierindex moet daarom bij de benen nooit "meer" adviseren als de beenindex hoog staat (afgeleid).

Voorstel voor de standen (afgeleid, nog te ijken): **te weinig** onder 4 sets per week gemiddeld, **op koers** van 4 tot ongeveer 12 bij behouden of van 8 tot ongeveer 20 bij een krachtdoel, **veel** daarboven. De grenzen volgen het hoofddoel (`engine/mainGoal.ts`), niet een vaste lijst.

Herstel per spiergroep is geen aparte teller. Zware sets herstellen in 24 tot 72 uur, afhankelijk van hoe dicht bij falen ([Morán-Navarro e.a. 2017](https://pubmed.ncbi.nlm.nih.gov/28965198/), matig), en dat is voor de benen al gevangen in de beenindex. Voor de bovenrug of borst is herstel voor deze sporter zelden een knelpunt. Een tweede herstelmodel naast de beenindex zou dubbel tellen.

Voor wie geldt dit: recreanten en getrainde volwassenen, vooral jonge mannen in de studies. Voor ouderen is behouden zwaarder: mogelijk twee sessies en twee tot drie sets per oefening ([Spiering e.a. 2021](https://pubmed.ncbi.nlm.nih.gov/33629972/)).

## 2. Stap 1: controle op je training

Drie meldingen, elk in de weekreview of als regel bij de krachttraining, nooit als rood signaal:

- **Een bergspier ontbreekt.** Kuiten, tibialis of bilspieren staan vier weken op "te weinig" terwijl er een GR5 of bergdoel is. Tekst bijvoorbeeld: "Je kuiten kregen de laatste vier weken gemiddeld 1 harde set per week. Voor bergaf met een rugzak kan kuitwerk helpen." Met een voorstel om een oefening toe te voegen aan een beentraining, dat pas na Akkoord iets verandert. Onderbouwing: bij gewone loopsnelheden leveren soleus en kuit het grootste deel van de steun ([Dorn, Schache en Pandy 2012](https://pubmed.ncbi.nlm.nih.gov/22573774/), matig, een modelstudie bij negen lopers) en de GR5-krachtlijst in *Trainingswetenschap* punt 8 noemt kuit, soleus en tibialis al.
- **Een spiergroep zakt weg.** Van op koers naar te weinig over vier weken, zonder rustweek of ziekte als verklaring. Alleen een zin, geen voorstel, want het kan bewust zijn.
- **Benen veel en vermoeid.** Beensets op "veel" en de beenindex hoog voor een test of race. Dan is het voorstel een set minder of de korte versie, via de bestaande weg van `legDayEase`.

Regels die vastliggen: de melding plant niets; elke verandering is een voorstel met Akkoord; zorgtekst zegt "kan helpen", nooit "voorkomt"; een oefening die de app niet kent (`unknownSets`) telt niet en wordt eerlijk genoemd ("3 sets kon ik niet toewijzen"). Bij pijn geen volume-advies maar de bestaande pijnroute uit *Pijn spierpijn en vermoeidheid melden*, met verwijzing naar een arts of fysiotherapeut als het blijft. Elke melding is instelbaar (aan, uit) met aan als standaard.

## 3. Stap 2: slimmer vervangen

`swapOptions` ordent nu op gedeelde spieren en patroon. Met de index zou het bij gelijke score de oefening voorop zetten die een spiergroep op "te weinig" bedient, en een oefening die vooral een spiergroep op "veel" belast wat lager zetten. Op een zware beendag vlak voor een test zou het een variant met minder remwerk iets hoger zetten; dat vraagt wel een kenmerk per oefening, wat *Spierpijn en een zware beendag* vraag 3 bewust nog openliet. Het blijft jouw keuze in Forge: de volgorde verandert, Forge wisselt nooit zelf, en een korte reden staat erbij ("Je tibialis kreeg weinig deze maand").

## 4. Stap 3, later

Een rustig overzicht per spiergroep in Forge of Stand, als band ("bilspieren 9 sets, kuiten 3") zoals KR-10 al voorschreef. Daarna eventueel de sets als echte invoer voor de beenindex in plaats van RPE maal minuten, wat knelpunt 7 in *Trainingswetenschap* zou verkleinen. Beide pas als stap 1 een paar maanden op echte data heeft gedraaid.

## 5. Wat het niet moet doen

Geen getal van 0 tot 100, geen levels, balken die vollopen of badges per spier; geen kleur per spiergroep (al uitgesloten in *Ontwerprapport Forge*); geen lichaam dat oplicht als een heatmap van "gespierdheid"; geen advies over spiergroei of uiterlijk; geen extra percentage op de Ascend-tab. Geen doelen per spier die de gebruiker niet zelf koos. En de app doet MacroFactor niet na: de lastprogressie blijft daar.

## 6. Advies

Bouwen, in de kleinste vorm: alleen de eerste melding (een bergspier ontbreekt), gelezen uit `muscleVolumeByWeek`, in de weekreview, met een voorstel met Akkoord om één oefening toe te voegen. De volgorde in `swapOptions` is een kleine tweede stap die weinig risico heeft. De andere twee meldingen wachten.

Risico's: de telling is zo goed als de oefenlijst (onbekende namen uit MacroFactor tellen niet, en een verkeerde koppeling geeft een vals tekort); RIR ontbreekt vaak, dus bijna elke werkset telt als hard; "de helft voor een meehelpende spier" is een vereenvoudiging; een rustweek of vakantie kan een tekort laten lijken; en te veel meldingen maken van een rustig gereedschap een zeurende app.

## Samengevat

**Wat het onderzoek zegt.** Ongeveer 10 harde sets per spiergroep per week is een goede richtwaarde om sterker te worden; om te behouden is veel minder genoeg, zolang de zwaarte blijft. Meer sets leveren steeds minder op. Herstel per spier hangt vooral af van hoe dicht bij falen je traint.

**Wat het betekent voor de app.** Een stand per spiergroep over vier weken, geen score. Begin met één melding voor ontbrekende bergspieren, als voorstel met Akkoord, en laat `swapOptions` daarna die spieren voorrang geven.

**Wat nog onzeker is.** De grenzen van 4 en 12 of 20 zijn afgeleid en niet getoetst bij een loper en bergwandelaar. Of extra kuit- en tibialiswerk bij deze sporter echt klachten scheelt, is niet onderzocht. De studies gaan vooral over jonge mannen in een lab. De telling hangt af van hoe goed MacroFactor-namen herkend worden.
