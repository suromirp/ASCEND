# RIR en RPE in krachtapps

Onderzoeksverslag, 8 november 2026, Scout RIR en RPE. Aanleiding: twee punten in `docs/backlog.md`, "Onderzoek: hoe de beste apps RIR en RPE bijhouden" (met vermoeidheid tussen oefeningen) en "Forge: afvinken is de RIR van het doel". Er is geen code geschreven.

Dit bouwt voort op `docs/onderzoek/Kracht loggen en progressie.md` (MacroFactor in detail, de RIR-schaal, Halperin 2022, Epley, de regels KR-1 tot KR-12) en op de besluiten `2026-11-03-forge-rekent-mee.md` en `2026-11-03-forge-na-de-eerste-vergelijking.md`. Wat daar staat, herhaal ik niet. `RPE bij een testloop.md` gaat over lopen en raakt dit niet.

Zekerheid staat bij elke bewering: **zeker** (de bron zegt het letterlijk, of de code doet het aantoonbaar), **waarschijnlijk** (goede bron of consistente studies, maar met een gat; of een samenvatting die ik niet in de volle tekst nalas), **gok** (mijn eigen keuze of afleiding, te toetsen). Over apps gaat het alleen om wat de makers en reviews openbaar zeggen.

Geen medisch advies. Pijn tijdens of na een set is geen RIR-vraag: dan stoppen, en bij klachten die blijven een arts of fysiotherapeut.

## Kort

- De beste apps vragen de inspanning per set, optioneel, en vullen nooit iets af dat je niet hoeft te tikken. Alleen MacroFactor en JuggernautAI sturen er ook de volgende set mee bij; Hevy en Strong bewaren het alleen. Boostcamp heeft de regel die het dichtst bij de wens van de eigenaar komt: een lege RPE houdt het gewicht nooit tegen.
- Mensen schatten hun RIR redelijk goed (gemiddeld minder dan een herhaling ernaast) dicht bij falen, met weinig herhalingen en bij zwaardere lasten. Ervaring helpt nauwelijks, en zes weken oefenen maakte de schatting in de gepubliceerde studie niet beter. De bruikbare hefboom is dus niet "leer het beter", maar "vraag het op de sets waar het klopt".
- Een eerdere oefening voor dezelfde spieren kost de volgende oefening gemeten 20 tot 33% herhalingen in de eerste set, ruwweg 5 tot 7% geschatte kracht. Geen enkele app legt openbaar uit hoe hij dat verrekent.
- Afvinken als "gedaan zoals gepland" kan, mits zo'n set de geschatte kracht alleen vasthoudt en nooit zelf omhoog duwt, en de stap zwaarder op een aangenomen RIR een iets strengere drempel krijgt. Dan loopt het niet te snel.
- Een bevinding in de code: sets met `rirAssumed` tellen nu al wel mee in de gladgestreken geschatte kracht, anders dan het werkbriefje zegt. Zie hoofdstuk 4.

## 1. Hoe de apps het vragen en wat ze ermee doen

### MacroFactor Workouts

- RIR per set op een schaal van 0 tot 6+, optioneel maar "sterk aanbevolen", en het hoeft niet precies te zijn ([help 385](https://help.macrofactorapp.com/en/articles/385-what-is-rir-and-how-should-i-use-it-during-training)). Zeker.
- Aanpassen tijdens de training: tik op het vak Herh. en kies de RIR, dus twee tikken; ook na de set kan het nog ([help 314](https://help.macrofactorapp.com/en/articles/314-changing-rir-during-an-active-workout)). Zeker.
- Wat er gebeurt met een set waarbij je niets kiest, staat nergens. Het doel staat als getal in het rondje naast de set; of dat bij afvinken als gelogde RIR geldt, is niet openbaar. Zeker dat het niet openbaar is; wat de app doet is een gok.
- Uitleg aan de gebruiker: een redelijke schatting is genoeg, bij een nieuwe oefening duurt het een paar trainingen voor je schatting goed is, en voelde een set anders dan gepland, pas dan de volgende set aan (help 385). Programma's beginnen een oefening met een zware set, soms tot falen, zodat je leert hoe falen voelt (help 397, al in *Kracht loggen en progressie*). Zeker.
- Wat ermee gebeurt: het voorstel komt uit gewicht, herhalingen, het RIR-doel, hoe je prestatie zich verhoudt tot de verwachting en je hele historie (help 373). Aanpassingen "nooit straffend". Zeker. De rekenregel zelf is niet openbaar.
- Vermoeidheid tussen oefeningen: niets openbaar. In april 2026 schreven ze dat ze werken aan "grote updates van de krachtschatting en de vermoeidheidslogica" om onregelmatige gewichten en herhalingen glad te strijken ([nieuwsbrief april 2026](https://macrofactor.com/mm-april-2026/)). Of die logica ook eerdere oefeningen meeneemt, zegt geen bron. Zeker dat het niet openbaar is.

### RP Hypertrophy

- RP vraagt geen RIR per set als invoer. Het programma zet een RIR-doel per week dat door het blok daalt, volgens gebruikers van 3 naar 2, 1 en 0 ([forumdraad r/RPHypertrophy](https://redlib.hbubli.cc/r/RPHypertrophy/comments/1kpe6ft/approaching_rep_ranges)). Waarschijnlijk (gebruikers, niet de maker).
- Wat het wel vraagt, tijdens de training: per spiergroep of oefening de pomp, de spierpijn, hoe zwaar het volume voelde en gewrichtspijn ([help RP, oud helpcentrum](https://hypertrophy.zendesk.com/hc/en-us/articles/14605661323671); [review Dr. Muscle](https://dr-muscle.com/rp-hypertrophy-app-for-strength-training-expert-review/)). Weinig pomp, weinig spierpijn en "makkelijk" geeft meestal meer sets. Waarschijnlijk (het helpartikel kon ik niet zelf openen, alleen de zoeksamenvatting).
- Gewicht en herhalingen: volgens het oude helpcentrum gaat het gewicht elke week een paar procent omhoog, en is de volgende stap te groot (dumbbells), dan komt er een herhaling per set bij. Waarschijnlijk.
- Uitleg: "blijf dicht bij de RIR die voor de set staat" ([help RP](https://help.rpstrength.com/hc/en-us/articles/32434237175447-Shouldn-t-I-be-doing-more-sets-or-weight)). Zeker.
- Les voor Forge: RP stuurt het volume op gevoel per spiergroep en het gewicht vrijwel vast per week. De RIR is daar een opdracht, geen meting. Gok dat dat voor kracht minder goed werkt dan meten; voor ASCEND past de MacroFactor-vorm beter.

### JuggernautAI

- RPE per set voor de grote oefeningen (squat, bankdrukken, deadlift), RIR voor de hulpoefeningen: daar doe je herhalingen tot je de doel-RIR bereikt en log je het aantal ([help JTS, RPE en RIR](https://help.jtsstrength.com/en/articles/2-all-about-rpe-and-rir)). Zeker.
- Wat ermee gebeurt: de RPE van de topset en de terugsets stelt de sets erna bij "in real time", en voor elke training een korte vraag naar slaap, stemming, energie en spierpijn die gewicht of volume van die dag aanpast ([help JTS, individueel](https://help.jtsstrength.com/en/articles/3-how-juggernautai-is-individualized-to-you)). Zeker. Hoeveel het bijstelt, staat er niet.
- Uitleg: kies bij twijfel de lagere RPE, liever iets onder het doel dan erover, vooral vroeg in een blok (help JTS, RPE en RIR). Zeker.
- Een review beschrijft dat de app na een RPE 10 op set twee de derde set schrapte ([Garage Gym Reviews](https://garagegymreviews.com/juggernautai-review)). Waarschijnlijk (één review).

### Hevy

- RPE per set als extra kolom die je in de instellingen aanzet, alleen 6 tot 10, per set optioneel, niet bij oefeningen op tijd ([Hevy, RPE](https://www.hevyapp.com/features/how-to-calculate-rpe/)). Zeker.
- Een doel-RPE in een routine kan niet; de RPE is een notitie voor jezelf. Hevy zegt nergens dat het voorstel er iets mee doet. Waarschijnlijk.

### Strong

- RPE per set, optioneel, 6 tot 10; de app kiest het volgende gewicht er niet mee ([review sensai](https://www.sensai.fit/blog/strong-app-review-2026)). Waarschijnlijk (een review; een eigen helppagina vond ik niet).

### Boostcamp

- RPE per set van 6 tot 10 in halve stappen, met bij elke waarde de betekenis in herhalingen over ([Boostcamp, RPE](https://www.boostcamp.app/features/rpe-logging)). Zeker (eigen pagina).
- Automatische progressie (betaald): bij een bereik eerst een herhaling erbij op hetzelfde gewicht tot **elke** set de bovenkant haalt, dan een stap zwaarder; stap standaard twee keer het kleinste schijfje ([Boostcamp, auto-progression](https://www.boostcamp.app/features/auto-progression)). Zeker.
- De RPE is een rem: "Log een RPE boven het doel en het gewicht blijft staan." En: "Een lege RPE houdt het nooit tegen." Zeker. Dit is precies "afvinken is de RIR van het doel", met de strengere drempel dat alle werksets de bovenkant halen.

### Wat ze samen laten zien

- Niemand dwingt een RIR af; overal is het optioneel. Zeker.
- Hoe vaak: MacroFactor, Hevy, Strong en Boostcamp per set; JuggernautAI per set voor de hoofdoefeningen; RP per spiergroep, niet per set. Zeker.
- Hoeveel tikken: twee bij MacroFactor (vak openen en kiezen), twee bij Hevy (kolom en waarde). Forge vraagt met één tik op een bolletje na het afvinken, zonder blad. Zeker voor Forge (`forgeReckon.ts#asksReserve`, `QUICK_RIR`); voor de anderen zeker zoals hun hulp het beschrijft.
- Alleen MacroFactor en JuggernautAI gebruiken de inspanning om sets in dezelfde training bij te sturen. Forge doet dat al met "Forge rekent mee". Zeker.
- Hoe een eerdere oefening op dezelfde spieren meetelt, legt geen enkele app openbaar uit. Zeker dat het niet openbaar is.

## 2. Hoe goed mensen hun RIR schatten

Wat al in *Kracht loggen en progressie* staat (Halperin 2022: gemiddeld 0,95 herhaling te weinig over, spreiding ongeveer 1,5, beter dicht bij falen en onder 12 herhalingen) blijft staan. Nieuw:

- **Bankdrukken bij getrainde mannen en vrouwen:** gemiddelde fout 0,65 herhaling bij doelen van 1 en 3 over, licht te weinig geschat; geslacht, ervaring en kracht maakten geen verschil ([Refalo e.a. 2023, JSCR](https://pubmed.ncbi.nlm.nih.gov/?term=Refalo+accuracy+intraset+repetitions-in-reserve+bench+press)). Waarschijnlijk (samenvatting gelezen).
- **Machines, een gewricht, getraind en ongetraind:** dichter bij falen en in latere sets nauwkeuriger; geslacht, ervaring en ervaring met RIR maakten geen verschil (Remmert, Laurson en Zourdos 2023, Perceptual and Motor Skills, via de [samenvatting bij Stronger By Science](https://www.strongerbyscience.com/reps-in-reserve)). Waarschijnlijk.
- **Zes weken oefenen:** negen getrainde mannen, drie keer per week bankdrukken met de laatste set tot falen. De nauwkeurigheid werd niet significant beter; later in de weken schatten ze vaker te weinig over, en bij sets met meer herhalingen was de fout groter (Remmert e.a. 2023, Perceptual and Motor Skills; [scriptieversie FAU](https://fau.isle.flvc.org/node/37482)). Waarschijnlijk. **Correctie** op *Kracht loggen en progressie*: daar staat op basis van de scriptie dat de schatting in week 5 en 6 duidelijk beter was. De gepubliceerde versie zegt dat de echte fout niet significant veranderde. Leidend is de gepubliceerde versie.
- **1 over tegen 3 over, zwaar tegen licht:** 34 jonge sporters met minstens een half jaar ervaring schatten 1 over beter dan 3 over, en op 75% van het maximum beter dan op 50% ([Casanova e.a. 2025](https://rdpc.uevora.pt/handle/10174/39787)). Waarschijnlijk.
- **Systematische review van 26 studies:** de nauwkeurigheid daalt als het aantal herhalingen stijgt en de last lichter wordt, en is het best dicht bij falen, vooral bij bovenlichaamoefeningen ([Russo e.a. 2025, Physical Therapy Reviews](https://rdpc.uevora.pt/handle/10174/39438)). Waarschijnlijk.

Wat dit betekent, in gewone woorden:

- Een "2 over" op een set van 6 tot 10 herhalingen klopt meestal op ongeveer één herhaling; een "3+" op een set van 15 is een ruwe gok. Waarschijnlijk.
- Mensen houden gemiddeld iets meer over dan ze zeggen. Een set die iemand als "2 over" afvinkt, had dus eerder 2 tot 3 over dan 1. Rekenen met het doel is daarom gemiddeld voorzichtig voor de geschatte kracht. Waarschijnlijk (gemiddelde over studies; per persoon kan het andersom zijn).
- Beter worden door oefenen is zwak onderbouwd. Wat wel werkt is de vraag stellen waar de schatting goed is: de zwaarste set, een set dicht bij falen, de laatste set, en af en toe een set tot er nog één over is om het gevoel te ijken (Helms 2016 en MacroFactor help 397, expert). Waarschijnlijk.

## 3. Vermoeidheid tussen oefeningen

### Wat Forge nu doet

- Binnen een oefening kost elke eerdere werkset een vast of geleerd deel van de kracht (`strengthModel.ts#fatigueFactor`, start 3% per set, geleerd per oefening met `learnFatigue`, tussen 1 en 12%), met 6% extra na een zware topset (`HARD_SET_EXTRA`, `learnAfterHard`). Zeker.
- Wat eerder in de training voor dezelfde spieren is gedaan, telt niet voor het gewicht. Alleen voor het opwarmen kijkt Forge ernaar: `forgeWorkout.ts#doneBefore` zoekt eerdere samengestelde oefeningen met een gedeelde hoofdspier en bepaalt daarmee de opwarmladder. Zeker.
- Indirect zit de gewone voorvermoeidheid al in de historie: traint iemand altijd eerst squat en dan beenpers, dan is de geschatte kracht van de beenpers gemeten in vermoeide toestand en klopt het voorstel voor die volgorde vanzelf. Het gaat pas mis als de volgorde of het aantal sets ervoor verandert. Waarschijnlijk (afgeleid uit hoe `analyseSessions` rekent).

### Wat onderzoek zegt

- **Volgorde:** een oefening later in de training haalt minder herhalingen dan dezelfde oefening vooraan, bij grote en kleine spiergroepen ([Simão e.a. 2012, Sports Medicine, review](https://link.springer.com/article/10.2165/11597240-000000000-00000)). Waarschijnlijk. Op lange termijn groeit de kracht het meest in de oefening die vooraan staat (Nunes e.a. 2021, European Journal of Sport Science, meta-analyse). Waarschijnlijk (samenvatting).
- **Squat na een hele training:** negen getrainde mannen haalden in de eerste set squat op 85% van hun maximum gemiddeld 8,0 herhalingen als de squat vooraan stond en 5,4 na een training van het hele lichaam ([Spreuwenberg e.a. 2006, JSCR](https://read.qxmd.com/read/16503673/influence-of-exercise-order-in-a-resistance-training-exercise-session)). Dat is een derde minder herhalingen; met Epley ongeveer 7% minder geschatte kracht (eigen berekening: 1,18 gedeeld door 1,27). Waarschijnlijk voor de richting; het getal komt uit één kleine studie en de training ervoor was zwaar en breed.
- **Eén set voor een hulpspier:** veertien getrainde mannen deden bankdrukken op hun 10RM alleen of direct na een set triceps pushdown. Met pushdown ervoor haalden ze 8 in plaats van 10 herhalingen, 20% minder ([Soares e.a. 2016, JSSM 15:111](https://jssm.org/jssm-15-111.xml%3EFulltext)). Met Epley ongeveer 5% minder geschatte kracht. Waarschijnlijk.
- **Voorvermoeiing van de benen:** beenstrek direct voor beenpers gaf minder herhalingen op de beenpers en minder activiteit van de quadriceps (Augustsson e.a. 2003, JSCR 17:411). Waarschijnlijk; het precieze getal heb ik niet kunnen lezen.
- **Rust tussen sets:** het verlies over opeenvolgende sets is groter na sets dicht bij falen en met zware lasten (Willardson, al in `2026-11-03-forge-na-de-eerste-vergelijking.md`). Over de rust tussen twee oefeningen vond ik geen bruikbare getallen. Zeker dat ik het niet vond.

### Wat dat in een getal betekent

- Eén harde set voor dezelfde of een overlappende spier, kort ervoor, kost de eerste set van de volgende oefening grofweg 3 tot 5% geschatte kracht; een volle training ervoor ongeveer 7%. Gok, afgeleid uit twee studies en de 3% per set die Forge binnen een oefening al gebruikt.
- Het verlies stapelt minder dan lineair: een hele training ervoor kostte geen 15 keer zoveel als één set. Gok (Spreuwenberg tegen Soares, verschillende opzet).
- De beste bron is de eigen historie: dezelfde oefening, wisselend vooraan of later, met gemeten RIR. Hoe dat geleerd kan worden, staat in het bouwvoorstel (stap 6 tot 8). Gok voor de methode, maar dezelfde vorm als `learnFatigue`, die al werkt.

## 4. Afvinken is de RIR van het doel

### Wat Forge nu doet (code van 8 november)

- Afvinken zonder RIR te kiezen bewaart het doel als RIR met het merkje `rirAssumed` (`forgeWorkout.ts`, regel 539 bij het afvinken en 639 naar het log; standaard `rirPrefill: 'hint'` in `strengthSettings.ts`). Zeker.
- Niet meegeteld: het leren van vermoeidheid (`strengthModel.ts#setPairs`, `learnFatigue`, `learnAfterHard`), de stap zwaarder bij de bovenkant van het bereik (`strengthModel.ts#prescribe`, `topReached` eist `!last.top.rirAssumed`), klaar voor je doel (`strengthReadiness.ts`, regel 75), en "Forge rekent mee" in de training zolang de set ging zoals gevraagd (`forgeReckon.ts#wentOtherwise`). Zeker.
- Wel meegeteld, met een duidelijk teken: 3 of meer herhalingen boven de bovenkant geeft toch een stap (`ASSUMED_RAISE_REPS`, `assumedRaise`); en bij een zware topset die meer herhalingen haalde dan gevraagd rekent Forge met zoveel minder over (`forgeReckon.ts#readRir`). Zeker.
- **Bevinding:** `estimateSet` kijkt niet naar `rirAssumed`. Daardoor tellen aangenomen sets wel mee in `sessionStrength` (KR-2) en in de gladgestreken geschatte kracht van `analyseSessions` (KR-3), en ook in `shortfall` (de regel "twee keer onder de verwachting"). De sets gaan ongefilterd mee vanuit `strengthHistory.ts#exerciseHistories`. Het werkbriefje `docs/werkbriefjes/forge.md` zegt onder Valkuilen dat zo'n set "niet meetelt voor kracht"; dat klopt voor het leren en de stap, niet voor de geschatte kracht zelf. Waarschijnlijk (gelezen in de code, niet nagespeeld met een test; ik heb geen test gevonden die het vastlegt).

### Is een set met precies de voorspelde herhalingen nieuw bewijs?

- Nee, niet omhoog. Forge kiest het gewicht uit de geschatte kracht en zet daarbij de herhalingen die bij het doel passen, naar beneden afgerond (`expectedReps`). Haal je precies die herhalingen en tel je het doel als RIR, dan komt de schatting uit op de oude kracht of iets eronder. Zeker (rekenkundig).
- Een voorbeeld. Geschatte kracht 88 kg, doel 2 over. Forge zet 67,5 kg maal 7. Afgevinkt zoals het stond: 67,5 maal (1 + 9/30) = 87,75 kg. Dat is onder 88, dus `analyseSessions` ziet een iets mindere dag en schuift een kwart van de afstand omlaag, naar ongeveer 87,9 kg. Zeker (nagerekend met de constanten in `strengthModel.ts`).
- Het gevaar is dus niet dat de schatting te snel stijgt, maar dat ze door afronding langzaam zakt en dat sets zonder nieuwe informatie toch als meting tellen. Waarschijnlijk.
- Wel bewijs: dat je niet zwakker bent dan gedacht. Je haalde wat gevraagd was, en mensen houden gemiddeld iets meer over dan ze zeggen (hoofdstuk 2). Zo'n set is een ondergrens, geen nieuwe meting. Waarschijnlijk.
- Wat de stap zwaarder betreft: de bovenkant van het bereik halen met het doel is de gewone dubbele progressie. Boostcamp zet dan een stap zonder RPE, maar alleen als elke werkset de bovenkant haalt. Zeker voor Boostcamp. De rem van KR-5 (hoogstens 5% kracht per training, 10% per week) blijft in Forge altijd staan. Zeker.
- Het echte risico is iemand die op een te zwaar gewicht de gevraagde herhalingen er met moeite uit perst en toch gewoon afvinkt. Dat vang je met twee dingen: de volgende set (valt die ruim tekort, dan was de vorige niet "zoals gepland"), en de vraag bij de eerste keer op het nieuwe gewicht. Gok voor de vorm, waarschijnlijk voor de werking (KR-8 haalt een te zware stap na twee mindere trainingen al terug).

### Advies, als voorstel voor engine-regels

Afgevinkt zonder eigen RIR heet hieronder **bevestigd** als het aan alle voorwaarden voldoet. Alle drempels zijn een gok om te toetsen.

1. **Bevestigd** als: een werkset, `rirAssumed`, het gewicht niet lichter dan voorgeschreven, en minstens de gevraagde herhalingen. Voor oude logs (er staat geen gevraagd aantal in het log) geldt bij het lezen: minstens de onderkant van het bereik van die dag. Het log zelf verandert nooit.
2. **Twijfel, dan de vraag Hoeveel over?** (de bestaande bolletjes, één tik), naast de sets die `asksReserve` nu al vraagt (eerste, zware en laatste werkset):
   - minder herhalingen dan gevraagd;
   - 2 of meer boven de bovenkant van het bereik (de eigenaar noemde "ruim meer"; 2 is één meer dan de stap van "Forge rekent mee" nodig heeft om te twijfelen);
   - de eerste werkset op een gewicht dat zwaarder is dan vorige keer;
   - de eerste drie trainingen van een oefening (je gevoel voor die oefening moet nog ijken, MacroFactor help 385);
   - eens per vier weken per hoofdoefening de topset, als ijkmoment (KR-12).
   Kies je niets, dan blijft de set aangenomen en geldt regel 1 of niet.
3. **Achteraf vervalt bevestigd:** haalt de volgende werkset van dezelfde oefening 2 of meer herhalingen minder dan gevraagd, dan was de set ervoor waarschijnlijk zwaarder dan het doel. Die set telt dan weer als aangenomen.
4. **Geschatte kracht (KR-1 tot KR-3):** een bevestigde set met precies de gevraagde herhalingen houdt de kracht vast: hij mag de gladgestreken waarde niet omlaag trekken (geen afrondingsdrift) en niet omhoog. Met meer herhalingen dan gevraagd telt de helft van het verschil als echte winst: RIR wordt het doel min de helft van de extra herhalingen, naar boven afgerond, niet onder 0. Voorbeeld: 9 in plaats van 7 met doel 2 rekent als 9 met 1 over, 67,5 maal (1 + 10/30) = 90 kg, ongeveer 2% boven 88. Dezelfde gedachte als `readRir`, maar milder, omdat het hier niet om een zware topset gaat.
5. **Stap zwaarder:** bevestigde sets tellen voor `topReached`, maar strenger dan een gemeten RIR: alle werksets met hetzelfde doel halen de bovenkant (de regel van Boostcamp), of de topset haalt de bovenkant twee trainingen achter elkaar. Met een gemeten RIR blijft één keer genoeg. De eerstvolgende training op het nieuwe gewicht valt onder twijfel (regel 2) en wordt dus gevraagd.
6. **Vermoeidheid leren:** bevestigde sets tellen nooit mee voor `learnFatigue` en `learnAfterHard`. De herhalingen zijn daar het eigen voorspelde verloop van Forge; meetellen leert de gok terug. Dat blijft zoals het nu is.
7. **Klaar voor je doel** (`strengthReadiness.ts`): voorlopig niet meetellen; eerst zien of bevestigd in de praktijk klopt met wat de eigenaar zelf kiest.
8. **Instelling:** "Afvinken telt als het doel" in Rekenmodel, standaard aan, met de zin "Vink je een set af zonder te kiezen, dan telt het doel als wat je over had, behalve bij twijfel." Uit: het gedrag van nu.

Loopt het zo te snel? Waarschijnlijk niet. Bevestigd verhoogt de kracht nooit uit zichzelf, extra herhalingen tellen maar half, de stap vraagt meer dan nu bij een gemeten RIR, KR-5 remt, en de eerste set op een nieuw gewicht wordt gevraagd. Het enige dat sneller gaat is de stap bij dubbele progressie als de eigenaar nooit een RIR kiest; dat is precies wat hij vroeg.

## 5. Wat Forge kan overnemen, naast wat Forge al doet

Wat Forge al heeft en goed doet:

- **Hoeveel over?** met één tik op 0, 1, 2 of 3+ na de eerste, een zware en de laatste werkset (`asksReserve`). Dat is minder tikken dan MacroFactor en Hevy, en het vraagt precies de sets waar een schatting het meest klopt. Zeker.
- **Aangenomen RIR** als merkje in plaats van een stille waarde (`rirAssumed`). Geen van de apps maakt dat onderscheid zichtbaar. Zeker voor Forge; voor de apps zeker zoals hun hulp het beschrijft.
- **Forge rekent mee** binnen de training: de volgende set na een set die anders ging, de terugsets na een topset. Vergelijkbaar met MacroFactor en JuggernautAI. Zeker.

Wat Forge kan overnemen:

- **De rem van Boostcamp:** een lege RIR houdt een stap niet tegen, een te zware RIR wel; met de strengere drempel "alle werksets aan de bovenkant" (regel 5). Waarschijnlijk zinvol.
- **De uitleg van MacroFactor en JuggernautAI** in één zin bij de bolletjes, eenmalig of in de uitleg van de instelling: "Een schatting is genoeg. Twijfel je tussen twee, kies het lagere." Gok dat dit helpt; het sluit wel aan bij de neiging om te weinig over te schatten (hoofdstuk 2).
- **Een ijkset** (MacroFactor help 397, KR-12): eens per vier weken de topset tot er nog één over is, met de vraag erbij. Waarschijnlijk zinvol; nog niet gebouwd.
- **Vragen bij een nieuwe oefening** de eerste drie keer (MacroFactor: "een paar trainingen"). Gok voor het getal drie.
- **Niet overnemen:** RPE in halve stappen (te veel keuze voor wat de schatting waard is), en de pomp en spierpijn per spiergroep van RP voor het gewicht (dat is voor volume, en ASCEND vraagt spierpijn al apart). Gok.
- **Voorvermoeidheid** als eigen regel, omdat geen app het openbaar doet en ASCEND de spieren per oefening al kent (`Exercise.primary`, `Exercise.secondary`). Zie het bouwvoorstel.

## 6. Bouwvoorstel

Voor de volgende ronde. Elke stap hoogstens een uur, met een test, in `src/engine/`. Forge-engine, dus Sherpa en Warden op opus. `planGolden.test.ts` beweegt niet. Geen opgeslagen vorm verandert, tenzij in een stap anders staat.

**Afvinken is de RIR van het doel**

1. Een test die vastlegt wat nu gebeurt: een aangenomen set telt mee in `sessionStrength` en `analyseSessions`, niet in `learnFatigue` en niet in `topReached`. Daarna het werkbriefje `docs/werkbriefjes/forge.md` op dat punt rechtzetten. (Klein; maakt de bevinding hard.)
2. Een pure functie `confirmedAssumed(set, ctx)` in `strengthModel.ts`, met regel 1 en regel 3: bevestigd of niet, met als invoer de set, de volgende set van dezelfde oefening en het bereik van die dag. Tests voor nieuwe en oude logs.
3. KR-1 tot KR-3 op bevestigde sets (regel 4): een bevestigde set met de gevraagde herhalingen houdt de waarde vast, extra herhalingen tellen half. Test met het voorbeeld van 88 kg uit hoofdstuk 4 en een reeks van tien zulke trainingen die niet zakt en niet stijgt.
4. De stap zwaarder op bevestigde sets (regel 5) in `prescribe`, achter een nieuwe instelling "Afvinken telt als het doel" (standaard aan) in `strengthSettings.ts`, met `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts` en de groepspagina. De instelling hoort bij `checkModelKey`.
5. De twijfelvragen (regel 2) in `forgeReckon.ts#asksReserve`: minder dan gevraagd, 2 boven de bovenkant, eerste set op een zwaarder gewicht, eerste drie trainingen van een oefening. De ijkset eens per vier weken kan als aparte stap later. Tekstkaart vergelijken.

**Vermoeidheid tussen oefeningen**

6. Een pure functie `setsBefore(exercise, eerdereRijen)`: het aantal harde werksets (gemeten of bevestigd, 3 of minder over, of tot falen) eerder in deze training op een gedeelde spier, een gedeelde hoofdspier telt 1, alleen een hulpspier een half. Dezelfde spierregels als `forgeWorkout.ts#doneBefore`. Ook uit een oud log te halen, zodat het voor de historie werkt.
7. Per oefening het gewone aantal: de mediaan van `setsBefore` in de laatste trainingen met die oefening. De correctie is het verschil met vandaag, keer een kost per set, zodat een vaste volgorde niets verandert (de historie bevat die vermoeidheid al). Start 2% per set (gok uit hoofdstuk 3), alleen omlaag, hoogstens 10% in totaal. In `planWorkout` voor de eerste set en in `strengthFor` tijdens de training; na de eerste afgevinkte set neemt "Forge rekent mee" het toch over. Eén zin in het voorschrift: "Twee sets meer voor je benen dan normaal ervoor: iets lichter."
8. Leren per oefening, zoals `learnFatigue`: de eerste werkset met gemeten RIR afgezet tegen de gladgestreken kracht van ervoor, tegen het verschil in `setsBefore`. Pas vanaf zes trainingen met minstens twee verschillende waarden, naar de 2% getrokken zolang er weinig is, tussen 0 en 5% per set. Onder de bestaande instelling "Vermoeidheid per set" (Geleerd of Vast), geen nieuwe rij.

## Wat het onderzoek zegt

De beste krachtapps vragen de inspanning per set en laten het altijd optioneel. MacroFactor en JuggernautAI sturen er de volgende sets mee bij, Hevy en Strong bewaren het, RP vraagt gevoel per spiergroep in plaats van RIR, en Boostcamp laat een lege RPE een stap nooit tegenhouden. Mensen schatten hun RIR op ongeveer een herhaling na, het best dicht bij falen, bij weinig herhalingen en zware lasten, en worden er met oefenen niet duidelijk beter in. Een eerdere oefening op dezelfde spieren kost in studies 20 tot 33% herhalingen in de eerste set, ruwweg 5 tot 7% geschatte kracht.

## Wat het betekent voor de app

Forge vraagt de RIR al zuiniger en slimmer dan de meeste apps. "Afvinken is de RIR van het doel" kan veilig als een afgevinkte set de geschatte kracht alleen vasthoudt, extra herhalingen half telt, en de stap zwaarder op een aangenomen RIR pas komt als alle werksets de bovenkant halen of de topset het twee keer doet, met een vraag bij de eerste set op het nieuwe gewicht. Het leren van vermoeidheid blijft alleen op sets die je zelf invulde. Vermoeidheid tussen oefeningen kan als correctie op het verschil met je gewone volgorde, klein beginnen en per oefening leren. Daarnaast moet het werkbriefje worden rechtgezet: aangenomen sets tellen nu al mee in de geschatte kracht.

## Wat nog onzeker is

- Hoe MacroFactor een set zonder RIR behandelt en of zijn vermoeidheidslogica eerdere oefeningen meeneemt: niet openbaar.
- De helppagina's van RP en Hevy konden niet worden geopend (geweigerd); wat er staat komt uit zoeksamenvattingen en eigen pagina's van de makers.
- Van Refalo 2023, Remmert 2023, Nunes 2021 en Augustsson 2003 las ik alleen samenvattingen; van Spreuwenberg 2006 alleen de cijfers uit de samenvatting.
- Alle drempels in hoofdstuk 4 en het bouwvoorstel (2 boven de bovenkant, drie eerste trainingen, half meetellen, 2% per set, 10% hoogstens) zijn keuzes zonder eigen toetsing. Te toetsen met de stille vergelijking "raak" (`prescriptionCheck.ts`) op de trainingen van de eigenaar.
- Of de eigenaar tot de mensen hoort die meer over hebben dan ze zeggen, of juist minder: dat laat alleen een paar ijksets zien.
- De bevinding over `estimateSet` en `rirAssumed` is uit het lezen van de code en nog niet met een test bevestigd (bouwstap 1).

## Bronnen

Apps (openbaar, geraadpleegd 8 november 2026):

- MacroFactor, help 385, RIR: https://help.macrofactorapp.com/en/articles/385-what-is-rir-and-how-should-i-use-it-during-training
- MacroFactor, help 314, RIR aanpassen: https://help.macrofactorapp.com/en/articles/314-changing-rir-during-an-active-workout
- MacroFactor, help 373 en 397 (zie *Kracht loggen en progressie*)
- MacroFactor, nieuwsbrief april 2026: https://macrofactor.com/mm-april-2026/
- RP, oud helpcentrum (zoeksamenvatting): https://hypertrophy.zendesk.com/hc/en-us/articles/14605661323671
- RP, helpcentrum: https://help.rpstrength.com/hc/en-us/articles/32434237175447-Shouldn-t-I-be-doing-more-sets-or-weight
- RP, review Dr. Muscle: https://dr-muscle.com/rp-hypertrophy-app-for-strength-training-expert-review/
- RP, forumdraad: https://redlib.hbubli.cc/r/RPHypertrophy/comments/1kpe6ft/approaching_rep_ranges
- JuggernautAI, RPE en RIR: https://help.jtsstrength.com/en/articles/2-all-about-rpe-and-rir
- JuggernautAI, individueel: https://help.jtsstrength.com/en/articles/3-how-juggernautai-is-individualized-to-you
- JuggernautAI, review: https://garagegymreviews.com/juggernautai-review
- Hevy, RPE: https://www.hevyapp.com/features/how-to-calculate-rpe/
- Strong, review: https://www.sensai.fit/blog/strong-app-review-2026
- Boostcamp, RPE: https://www.boostcamp.app/features/rpe-logging
- Boostcamp, automatische progressie: https://www.boostcamp.app/features/auto-progression

Onderzoek:

- Halperin e.a. 2022 (zie *Kracht loggen en progressie*): https://pubmed.ncbi.nlm.nih.gov/34542869/
- Refalo e.a. 2023, JSCR, RIR bij bankdrukken (samenvatting)
- Remmert, Laurson en Zourdos 2023, Perceptual and Motor Skills, machines (samenvatting): https://www.strongerbyscience.com/reps-in-reserve
- Remmert e.a. 2023, Perceptual and Motor Skills, zes weken bankdrukken; scriptie: https://fau.isle.flvc.org/node/37482
- Casanova e.a. 2025, Journal of Physical Education and Sport: https://rdpc.uevora.pt/handle/10174/39787
- Russo e.a. 2025, Physical Therapy Reviews, systematische review: https://rdpc.uevora.pt/handle/10174/39438
- Simão e.a. 2012, Sports Medicine, volgorde van oefeningen: https://link.springer.com/article/10.2165/11597240-000000000-00000
- Nunes e.a. 2021, European Journal of Sport Science, volgorde, meta-analyse (samenvatting)
- Spreuwenberg e.a. 2006, JSCR, squat na een hele training: https://read.qxmd.com/read/16503673/influence-of-exercise-order-in-a-resistance-training-exercise-session
- Soares e.a. 2016, JSSM 15:111, voorvermoeiing bij bankdrukken: https://jssm.org/jssm-15-111.xml%3EFulltext
- Augustsson e.a. 2003, JSCR 17:411, beenstrek voor beenpers (samenvatting)

Code (gelezen op 8 november 2026): `src/engine/strengthModel.ts` (`estimateSet`, `sessionStrength`, `setPairs`, `learnFatigue`, `learnAfterHard`, `fatigueFactor`, `analyseSessions`, `assumedRaise`, `prescribe`), `src/engine/forgeReckon.ts` (`readRir`, `wentOtherwise`, `strengthFor`, `asksReserve`), `src/engine/forgeWorkout.ts` (`doneBefore`, het afvinken), `src/engine/strengthReadiness.ts`, `src/engine/strengthHistory.ts`, `src/engine/strengthSettings.ts`.
