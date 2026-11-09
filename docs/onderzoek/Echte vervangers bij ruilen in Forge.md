# Echte vervangers bij ruilen in Forge

Onderzoek voor de backlogwens "Forge: ruilen met een echte vervanger" (4 november). Scout, 9 november 2026. Bouwt voort op `docs/onderzoek/Spierindex opzet.md` (de voorkeur voor bergspieren in `swapOptions`) en `docs/visie/Ontwerprapport Forge.md` (waar Ruilen in het blad Oefening staat). Er was nog geen eerder onderzoek naar hoe oefeningen elkaar vervangen.

## Wat er nu misgaat

`swapScore` in `src/engine/forgeWorkout.ts` telt gedeelde hoofdspieren (3 punten per spier), gedeelde bijspieren (1 punt), hetzelfde bewegingspatroon (4) en dezelfde beenbelasting (1). Nagerekend voor Barbell Bench Press: Dips, Dumbbell Bench Press, Pause Dumbbell Bench Press, Pin-Loaded Machine Chest Press, Push-Up en Wide Grip Bench Press krijgen allemaal precies 10 punten. Bij gelijke score sorteert `swapOptions` op naam, en "Dips" komt alfabetisch voor "Dumbbell". Dat is de hele oorzaak: de score kan een dip niet van een dumbbell bench press onderscheiden, omdat ze in de lijst dezelfde spieren en hetzelfde patroon (`push_horizontal`) hebben. De 45° Incline Barbell Press en de Close Grip Bench Press krijgen 9 punten en staan net daaronder.

Een Smith Machine Bench Press, die de eigenaar als voorbeeld noemde, staat niet in `src/data/exercises.ts`.

## 1. Hoe andere apps het doen

MacroFactor Workouts. De helppagina's beschrijven de handeling: bij een oefening kies je Swap, de app toont "smart substitutions", je kiest er een, en onderaan staat "Find Other Replacements" om zelf te zoeken. Ruilen kan in het programma (blijvend) en tijdens een training (alleen nu). Na een ruil begint de progressie van de nieuwe oefening bij de sets die je ermee logt; de oude gegevens blijven als achtergrond zichtbaar ([MacroFactor, Swap exercises](https://help.macrofactorapp.com/en/articles/332-swap-exercises); [MacroFactor, als je een oefening niet kunt doen](https://help.macrofactorapp.com/en/articles/375-what-should-i-do-if-i-cannot-perform-an-exercise-or-do-not-have-the-required-equipment)). De twee redenen die MacroFactor zelf noemt zijn "voelt vandaag niet goed" en "het toestel is er niet of bezet". Hoe de slimme vervangers gekozen worden staat nergens openbaar; dat kon ik niet verifiëren. Wat wel opvalt: MacroFactor geeft elke uitvoering een eigen naam ("Pin-Loaded Machine Chest Press", "Neutral Grip Machine-Assisted Pull-Up"), en ASCEND neemt die namen over. Hun bibliotheek is dus fijn verdeeld naar uitrusting en greep, wat doet vermoeden dat de vervangers vooral binnen dezelfde beweging met andere uitrusting worden gezocht. Dat is een aanname.

JuggernautAI. Je mag alles ruilen, maar de app raadt aan uit de eigen lijst te kiezen, die voor de hoofdoefeningen gericht is op je zwakke punten. Belangrijk advies erbij: ruil niet elke week, want dan bouw je geen vaardigheid en geen progressie op; alleen op reis of zonder uitrusting mag het per week, en dan "de dichtstbijzijnde variant" ([JTS, Should I swap exercises?](https://help.jtsstrength.com/en/articles/4-should-i-swap-exercises)).

Hevy. Ruilen is gewoon zoeken in de bibliotheek; ik vond geen lijst met voorgestelde vergelijkbare oefeningen ([Hevy, programmeeropties](https://www.hevyapp.com/features/exercise-programming-options/)).

Fitbod. Volgens een blog van Fitbod toont Replace oefeningen die dezelfde spieren raken met vergelijkbare uitrusting, en het algoritme geeft voorrang aan oefeningen die je vaker logde ([Fitbod, helpcentrum](https://help.fitbod.me/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod)). De blogpost zelf kon ik niet openen (geweigerd), dus dit komt uit een zoeksamenvatting en is niet geverifieerd.

RP Hypertrophy. Geen openbare uitleg gevonden over hoe vervangers gekozen worden.

Wat dit betekent: geen van deze apps legt uit waarom een vervanger bovenaan staat. Een korte reden per keuze, zoals de eigenaar vraagt, is dus iets wat ASCEND beter kan doen dan de voorbeelden.

## 2. Wat de literatuur zegt

De grote lijn: zelfde beweging met andere uitrusting is een echte vervanger; een andere hoek, een andere greep die het gewricht anders laat werken, of een andere spierlengte verschuift het werk naar andere spieren of delen van een spier.

Uitrusting maakt weinig uit. Het nieuwe standpunt van het ACSM, een overzicht van 137 systematische reviews, vond dat het soort uitrusting en de complexiteit van een oefening geen consistent verschil geven in kracht of spiergroei ([Currier e.a. 2026, ACSM Position Stand](https://pubmed.ncbi.nlm.nih.gov/?term=10.1249%2FMSS.0000000000003897), Med Sci Sports Exerc 58(4)). Ik las alleen de samenvatting en het persbericht. Zeker: matig tot sterk, voor gezonde volwassenen.

Bankdrukken met stang, dumbbells of Smith. Bij twaalf getrainde mannen was de activiteit van borst en voorste schouder gelijk bij alle drie. De triceps werkte minder en de biceps meer met dumbbells. Met twee dumbbells tilden ze samen ongeveer 17 procent minder dan met de stang; de Smith lag 3 procent onder de stang ([Saeterbakken, van den Tillaar en Fimland 2011](https://read.qxmd.com/read/21225489/a-comparison-of-muscle-activity-and-1-rm-strength-of-three-chest-press-exercises-with-different-stability-requirements), J Sports Sci). In gewone woorden: dezelfde spieren, alleen het gewicht is anders. Zeker: matig (klein, alleen spieractiviteit, geen groei gemeten).

De hoek telt. Bij vijf hellingen (0, 15, 30, 45 en 60 graden) werkte het bovenste deel van de borst het hardst op 30 graden, het middelste en onderste deel op vlak, en de voorste schouder het hardst op 60 graden ([Rodríguez-Ridao e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7579505/), IJERPH). Vlak en schuin zijn dus geen echte vervangers van elkaar; 30 en 45 graden liggen dicht bij elkaar. Zeker: matig (spieractiviteit).

Push-up en bench press. Bij gelijke spieractiviteit (push-up met elastiek, zware 6RM) gaven ze evenveel krachtwinst ([Calatayud e.a. 2015](https://producciocientifica.uv.es/documentos/5ef106d0299952068d595025?lang=en), JSCR). Het werkt dus als je de last kunt evenaren, maar in een sportschool lukt dat zelden: een gewone push-up heeft een vaste last. Daarom hoort hij bij "zelfde spier, anders", zoals de eigenaar ook voorstelde.

Dips. Bar dips vragen veel strekking in de schouder en geven hoge activiteit van triceps en borst ([McKenzie e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9603242/), IJERPH). Het is een andere beweging dan bankdrukken: lichaam omhoog, arm langs het lichaam naar achter. Geen echte vervanger. Zeker: matig voor de beweging.

Schouderpers. Staand met dumbbells gaf de meeste schouderactiviteit en de laagste 1RM; staand met dumbbells was ongeveer 7 procent zwakker dan staand met de stang, en ongeveer 10 procent zwakker dan zittend met dumbbells ([Saeterbakken en Fimland 2013](https://pubmed.ncbi.nlm.nih.gov/23096062/), JSCR). Dezelfde beweging met andere uitrusting; zitten of staan maakt weinig uit voor de schouder.

Optrekken en pulldown. Bij pull-up en chin-up was de activiteit van de lats gelijk; de chin-up gaf meer biceps en borst ([Youdas e.a. 2010](https://pubmed.ncbi.nlm.nih.gov/21068680/), JSCR). Chin-up tegenover lat pulldown: meer biceps en onderrug bij de chin-up, zelfde hoofdspier ([Doma, Deakin en Ness 2013](https://pubmed.ncbi.nlm.nih.gov/24245055/), Sports Biomech). Greep verschuift de bijspieren, niet de hoofdspier. Zeker: matig.

Squat en leg press. De squat gaf meer activiteit van quadriceps en hamstrings dan de leg press ([Escamilla e.a. 2001](https://pubmed.ncbi.nlm.nih.gov/11528346/), MSSE). Zelfde hoofdspieren, maar een andere beweging zonder last op de romp. Een split squat met achterste voet hoog gaf in vijf weken evenveel kracht als de back squat bij jonge rugbyspelers ([Speirs e.a. 2016](https://read.qxmd.com/read/26200193/unilateral-vs-bilateral-squat-training-for-strength-sprints-and-agility-in-academy-rugby-players), JSCR), maar dat is klein en kort. Front squat tegenover back squat noem ik op geheugen (Gullett e.a. 2009, JSCR: vergelijkbare spieractiviteit); niet opnieuw nagekeken.

Deadlift. Sumo gaf meer activiteit in de quadriceps, conventioneel meer in de kuit ([Escamilla e.a. 2002](https://pubmed.ncbi.nlm.nih.gov/11932579/), MSSE); latere studies vonden minder verschil. Over de trap bar (meer knie, minder onderrug) noem ik Swinton e.a. 2011 op geheugen; niet opnieuw nagekeken.

Heup en bil. Hip thrust en back squat gaven in negen weken evenveel bilgroei, maar de squat meer groei van quadriceps en adductoren ([Plotkin e.a. 2023](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1279170/full), Front Physiol). Voor de bil vervangen ze elkaar dus, als oefening niet: de squat doet veel meer.

Spierlengte telt. Zittend hamstrings curlen gaf meer groei dan liggend (14 tegen 9 procent) ([Maeo e.a. 2021](https://pubmed.ncbi.nlm.nih.gov/33009197/), MSSE). Kuitheffen met gestrekte knie gaf veel meer groei van de gastrocnemius dan met gebogen knie, waar alleen de soleus meedeed ([Kinoshita e.a. 2023](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1272106/full), Front Physiol). Zittend en liggend curlen zijn dus nog vervangers (zelfde beweging, iets ander effect), maar zittend en staand kuitheffen niet. Op geheugen: triceps boven het hoofd strekken gaf meer groei dan pushdowns (Maeo e.a. 2023, Eur J Sport Sci); niet opnieuw nagekeken.

Armen en schouders. Curlen met rechte stang, EZ-stang of dumbbells geeft kleine verschillen; de auteurs noemen de keus "een kwestie van comfort" ([Marcolin e.a. 2018](https://peerj.com/articles/5165), PeerJ). Bij de lateral raise verschuift de draaiing van de bovenarm het werk tussen voorste en middelste schouder en de trapezius ([Coratella e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7503819), IJERPH).

Niet te vaak wisselen. Wat systematische variatie helpt de groei per spierdeel, maar veel en willekeurig wisselen kan de winst kosten, vooral bij oefeningen met veel techniek zoals de squat ([Kassiano e.a. 2022](https://pubmed.ncbi.nlm.nih.gov/35438660/), JSCR; 8 studies, alleen jonge mannen). Dat steunt het huidige gedrag van Forge: een ruil geldt alleen voor deze training.

NSCA. Het handboek (Haff en Triplett 2016, Essentials of Strength Training and Conditioning, 4e druk) deelt oefeningen in naar kernoefening en hulpoefening en naar bewegingspatroon, en stelt specificiteit voorop. Dit noem ik op geheugen en heb ik in deze ronde niet nagelezen.

Samengevat, als regel voor een echte vervanger: dezelfde beweging (zelfde gewrichten in dezelfde richting), dezelfde hoek, dezelfde hoofdspieren op ongeveer dezelfde spierlengte. Uitrusting (stang, dumbbell, toestel, kabel), zitten of staan, en een kleine gripverandering mogen verschillen. Een andere hoek, een ander gewricht dat het werk doet (dip tegenover bankdrukken, leg press tegenover squat), of een andere spierlengte (zittend tegenover staand kuitheffen) maakt het "zelfde spier, anders".

## 3. Een klein model voor ASCEND

### Twee nieuwe gegevens per oefening

Familie. Eén woord per oefening dat zegt welke beweging het is, op het niveau van "vlak drukken" of "verticaal trekken", fijner dan `pattern`. Zelfde familie betekent echte vervanger. Elke oefening krijgt er een; een familie van één mag.

Nuance. Een korte, optionele lijst kenmerken die de beweging binnen de familie iets anders maakt: `pause`, `wide`, `low` (30 graden), `front` (last voor), `light` (last begrensd, zoals goblet), `single` (één arm of been), `underhand`, `preacher`, `floor` (kleiner bereik bij een bridge), `step`, `walking`, `elevated`, `trap`, `sumo`, `quad`, `hinged` (romp vrij voorover), `legs` (benen helpen), `negative`, `lying` (liggend curlen, kortere hamstrings), `frog` (voeten tegen elkaar), `y` (armen in een Y).

Beide kunnen als map naast de lijst staan, net als `ONE_DUMBBELL` en `FAILURE_RISK` bovenaan `src/data/exercises.ts`, en in `ex()` worden samengevoegd. Dan hoeven de 120 regels zelf niet open. Het is statische data en wordt niet opgeslagen, dus geen migratie.

### Twee afgeleide regels

Echte vervanger: zelfde familie, niet de oefening zelf, niet al in de training, en past in je sportschool (de bestaande stangregel).

Afstand binnen de familie: 1 als de uitrusting (`resistance`) anders is, plus 1 als de een eigen gewicht is en de ander niet (je kunt de last dan niet kiezen), plus 1 per nuance die de een heeft en de ander niet. Kleinste afstand bovenaan; bij gelijke afstand de volgorde in `EXERCISES` (die is al met zorg gemaakt), daarna de bestaande voorkeur voor bergspieren. De eerste is de aanbevolen keuze.

Zelfde spier, anders: alles wat nu uit `swapScore` boven 0 komt en niet in de familie zit, in de huidige volgorde. Zo blijft de huidige score bruikbaar en verdwijnt de fout: Dips zit niet in de familie van bankdrukken.

### Een korte reden, afgeleid

Voor een echte vervanger: "Zelfde beweging en spieren" plus wat anders is: "met dumbbells", "op een toestel", "met een pauze", "met een brede greep", "op één arm". Voor de andere groep: de gedeelde hoofdspier plus het verschil: "Ook borst, maar schuin", "Ook borst, je duwt jezelf omhoog", "Ook kuiten, met gebogen knie, meer soleus". De woorden per familie en nuance passen in twee kleine kaarten in de engine. De precieze tekst is voor Cartographer en later Scribe.

### Voorstel per familie voor alle 120

Knie en squat: `squat` (back-squat, front-squat met front, goblet-squat met front en light, hack-squat, pause-back-squat met pause); `leg_press` (leg-press, leg-press-plates, leg-press-quad-biased met quad); `knee_extension` (leg-extension, reverse-nordic-curl); `quad_bodyweight` (spanish-squat, eccentric-squat); `split_squat` (split-squat, bulgarian-split-squat met elevated, reverse-lunge met step, walking-lunge met step en walking); `step_up` (step-up, step-up-pack); `step_down` (step-down, step-down-pack).

Heup: `deadlift` (deadlift, trap-bar-deadlift met trap, sumo-deadlift met sumo); `hip_hinge` (romanian-deadlift, dumbbell-rdl, single-leg-rdl met single); `back_extension` (back-extension, weighted-roman-chair-back-extension, weighted-ghd-hip-hinge, superman met light); `hip_thrust` (hip-thrust, barbell-glute-bridge met floor, dumbbell-glute-bridge met floor, glute-bridge met floor, dumbbell-frog-pump met floor en frog); `knee_flexion` (seated-leg-curl, lying-leg-curl met lying, seated-single-leg-curl met single, nordic-curl met negative, glute-ham-raise).

Onderbeen en heup opzij: `calf_straight` (standing-calf-raise, leg-press-calf-raise, bodyweight-calf-raise, single-leg-calf-raise met single); `calf_bent` (seated-calf-raise); `tibialis` (tibialis-raise, tibialis-raise-loaded); `hip_abduction` (hip-abduction-machine, cable-hip-abduction, hip-abduction-band, lateral-band-walk met walking, side-lying-hip-abduction); `hip_adduction` (hip-adduction-machine, copenhagen-plank).

Romp: `anti_extension` (plank, dead-bug, ab-wheel-rollout, barbell-rollout); `trunk_flexion` (hanging-leg-raise, cable-crunch, decline-weighted-sit-up); `anti_rotation` (pallof-press, horizontal-cable-chop, machine-torso-rotation); `side_plank` (side-plank); `carry` (farmers-carry).

Duwen: `flat_press` (bench-press, dumbbell-bench-press, machine-chest-press, wide-grip-bench-press met wide, pause-dumbbell-bench-press met pause); `incline_press` (incline-bench-press, incline-dumbbell-press, low-incline-barbell-press met low, low-incline-dumbbell-press met low); `close_press` (close-grip-bench-press); `dip` (dip); `push_up` (push-up); `chest_fly` (cable-fly, pec-deck-fly, low-incline-dumbbell-fly met low, low-to-high-cable-fly met low); `overhead_press` (overhead-press, dumbbell-shoulder-press, machine-shoulder-press, push-press met legs); `lateral_raise` (lateral-raise, single-arm-cable-lateral-raise met single); `rear_delt` (rear-delt-fly, face-pull, chest-supported-dumbbell-y-raise met y); `shrug` (shrug, snatch-grip-shrug met wide, kelso-shrug met hinged).

Trekken: `vertical_pull` (pull-up, chin-up met underhand, assisted-pull-up, lat-pulldown, single-arm-cable-lat-pulldown met single, negative-chin-up met underhand en negative); `row` (barbell-row met hinged, dumbbell-row met single, chest-supported-row, seated-cable-row, machine-row, machine-row-plates, inverted-row); `high_row` (cable-high-row, chest-supported-dumbbell-high-row, bent-over-barbell-high-row met hinged); `lat_isolation` (straight-arm-pulldown, dumbbell-pullover).

Armen: `curl` (barbell-curl, dumbbell-curl, dumbbell-preacher-curl met preacher, machine-preacher-curl met preacher); `hammer_curl` (hammer-curl, incline-hammer-curl); `triceps_pushdown` (triceps-pushdown); `triceps_overhead` (overhead-triceps-extension).

Elke familie deelt minstens één hoofdspier tussen alle leden; nagekeken op de lijst van vandaag. Dat hoort een test te worden.

### Uitgewerkt voor vijftien gangbare oefeningen

Barbell Bench Press. Echt: Dumbbell Bench Press (afstand 1, aanbevolen), Pin-Loaded Machine Chest Press (1), Wide Grip Bench Press (1), Pause Dumbbell Bench Press (2). Anders: Dips, Push-Up, Close Grip Bench Press, 45° Incline Barbell Press, Low Incline Barbell Press, de fly's. Reden bovenaan: "Zelfde beweging en spieren, met dumbbells."

Barbell Back Squat. Echt: Front Squat (1, aanbevolen), Hack Squat (1), Pause Back Squat (1), Goblet Squat (3). Anders: de leg presses (hoog, door het patroon), Bulgarian Split Squat, Split Squat. Met de keuze "andere uitrusting eerst" (zie onderaan) wordt Hack Squat de aanbevolen, handig als het rek bezet is.

Conventional Deadlift. Echt: Trap Bar Deadlift (1, aanbevolen), Sumo Deadlift (1). Anders: Barbell Romanian Deadlift, Barbell Hip Thrust, Back Extension.

Barbell Overhead Press. Echt: Seated Dumbbell Overhead Press (1, aanbevolen), Pin-Loaded Machine Shoulder Press (1), Barbell Push Press (1). Anders: de lateral raises en de incline presses.

Bent-Over Underhand Grip Barbell Row. Echt: Chest-Supported Dumbbell Row (2, aanbevolen), Seated Cable Row (2), de machine rows (2), Single Arm Dumbbell Row (3), Inverted Row (3). Anders: de high rows, de pulldowns.

Pull-Up. Echt: Chin-Up (1, aanbevolen), Neutral Grip Machine-Assisted Pull-Up (2), Underhand Grip Cable Lat Pulldown (2), Single Arm Cable Lat Pulldown (3), Negative Chin-Up (2). Anders: Cable Rope Straight Arm Lat Pulldown, Dumbbell Pullover, de rows.

Underhand Grip Cable Lat Pulldown. Echt: Neutral Grip Machine-Assisted Pull-Up (1, aanbevolen), Single Arm Cable Lat Pulldown (1), Pull-Up (2), Chin-Up (3). De aanbevolen keuze is de hulpversie omdat je daar, net als bij de pulldown, zelf de last kiest.

Barbell Romanian Deadlift. Echt: Dumbbell Romanian Deadlift (1, aanbevolen), Single Leg Romanian Deadlift (2). Anders: Conventional Deadlift, de leg curls, Back Extension, Glute Ham Raise.

Pin-Loaded Leg Press. Echt: Plate-Loaded Leg Press (1, aanbevolen), Pin-Loaded Quad-Biased Leg Press (1). Anders: Hack Squat, Barbell Back Squat, Goblet Squat, Leg Extension.

Dumbbell Curl (Bicep Curl). Echt: Barbell Curl (1, aanbevolen), Dumbbell Preacher Curl (1), Pin-Loaded Machine Preacher Curl (2). Anders: Hammer Curl en Incline Hammer Curl (meer onderarm).

Standing Dumbbell Lateral Raise. Echt: Single Arm Cable Lateral Raise (2, aanbevolen, de enige). Anders: de schouderpersen, Cable Face Pull.

Standing Calf Raise. Echt: Pin-Loaded Leg Press Calf Raise (0, aanbevolen), Bodyweight Calf Raise (2), Single Leg Calf Raise (3). Anders: Seated Pin-Loaded Machine Calf Raise, met de reden "met gebogen knie, vooral de soleus".

Barbell Hip Thrust. Echt: Barbell Glute Bridge (1, aanbevolen), Dumbbell Glute Bridge (2), Glute Bridge (3), Dumbbell Frog Pump (3). Anders: Barbell Back Squat, Conventional Deadlift, Back Extension.

Walking Lunge. Echt: Reverse Lunge (1, aanbevolen, minder ruimte nodig), Split Squat (2), Bulgarian Split Squat (3). Anders: Step-Up, Goblet Squat, de squats.

Dips. Echt: geen. Anders: Close Grip Bench Press, Barbell Bench Press, Push-Up. Het blad zegt dan dat er geen oefening is die precies hetzelfde doet, en toont alleen de tweede groep.

## 4. Wat een bouwer in een uur kan doen, en wat later

In een uur (Sherpa, engine en data, geen blad):

1. In `src/models/exercise.ts` twee velden: `family: string` en `nuance?: string[]`.
2. In `src/data/exercises.ts` twee kaarten `FAMILY` en `NUANCE` volgens de lijst hierboven, samengevoegd in `ex()`.
3. In `src/engine/forgeWorkout.ts` een functie die twee groepen teruggeeft: de echte vervangers op afstand, en de rest op de huidige `swapScore`. `swapOptions` kan blijven bestaan als de twee groepen achter elkaar, zodat de huidige schermen niet breken.
4. Tests: elke oefening heeft een familie; elke familie deelt een hoofdspier; Barbell Bench Press geeft eerst Dumbbell Bench Press en Dips staat niet in de eerste groep; Dips heeft een lege eerste groep; zonder stang geen stangoefening in beide groepen. Let op: de bestaande test "bij gelijke score een oefening voorop die een spier met te weinig sets bedient" in `src/engine/forgeWorkout.test.ts` gaat ervan uit dat de volgorde de score volgt. Die moet per groep gaan gelden.

Later:

1. Het blad met twee groepen, de reden en het woord aanbevolen (Cartographer eerst, dan Sherpa).
2. Het startgewicht na een ruil. De gegevens geven een eerste idee (twee dumbbells samen ongeveer 17 procent onder de stang bij bankdrukken, ongeveer 7 procent bij de staande schouderpers), maar dat zijn kleine groepen getrainde mannen. Een eigen eerder log van de vervanger gaat altijd voor.
3. Leren van je eigen ruilen: een vervanger die je vaker kiest, komt hoger, zoals Fitbod het lijkt te doen.
4. Uitrusting in het sportschoolprofiel. Nu kent `GymProfile` alleen stangen, schijven, dumbbells en stappen; of er een hack squat of kabel is, weet ASCEND niet. Dan kan een vervanger die je sportschool niet heeft weg.
5. Smith Machine Bench Press en andere ontbrekende varianten toevoegen; met een familie is dat één regel.
6. Een reden bij ruilen vragen ("bezet", "doet pijn", "geen zin"). Bij pijn geen oefenadvies van de app maar een verwijzing naar een arts of fysiotherapeut, zoals elders in ASCEND.

## Wat het onderzoek zegt

Zelfde beweging met andere uitrusting geeft vrijwel dezelfde spieractiviteit en volgens het ACSM geen consistent ander resultaat. Hoek, gewricht en spierlengte maken wel verschil: vlak tegenover schuin, dip tegenover bankdrukken, zittend tegenover staand kuitheffen. Te vaak wisselen kost vooral bij technische oefeningen winst. De apps leggen niet uit hoe ze vervangers kiezen; MacroFactor noemt alleen "smart substitutions".

## Wat het betekent voor de app

Eén woord per oefening (familie) en een paar kenmerken (nuance) zijn genoeg om een echte vervanger van "zelfde spier, anders" te scheiden, met een afstand die de beste bovenaan zet en een reden die zich uit de gegevens laat afleiden. De huidige `swapScore` blijft voor de tweede groep. Geen opslagwijziging, geen planning geraakt: een ruil blijft alleen voor deze training.

## Wat nog onzeker is

De studies meten meestal spieractiviteit, niet groei, in kleine groepen jonge, vaak getrainde mannen; voor vrouwen en beginners is het minder zeker. Hoe MacroFactor kiest is niet openbaar. Drie bronnen noem ik op geheugen en zijn niet opnieuw nagekeken (Gullett 2009, Swinton 2011, Maeo 2023), net als het NSCA-handboek. De indeling in families en de nuances zijn mijn voorstel op basis van deze bronnen en praktijk, geen vaststaande wetenschap; vooral de grenzen (hack squat bij squat of bij leg press, push-up apart van bankdrukken) zijn keuzes.

## Keuzes voor de bouwer

1. Familie en nuance als kaarten naast de lijst (voorstel) of als argumenten in elke `ex()`-regel.
2. Bij gelijke afstand de volgorde in de lijst (voorstel), of eerst een andere uitrusting, zodat bij een bezet rek de hack squat bovenaan staat.
3. Hack Squat in de familie `squat` (voorstel) of bij `leg_press`.
4. Push-Up apart (voorstel, zoals de eigenaar vroeg) of in `flat_press` met een hoge afstand.
5. Een lege eerste groep (bij Dips) stil weglaten, of met één zin uitleggen (voorstel).
6. `swapOptions` behouden als de twee groepen achter elkaar (voorstel) of meteen vervangen door de nieuwe functie.
