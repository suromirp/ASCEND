# Bronnen bij de uitleg van oefeningen

Opgesteld door Sherpa Forge, 9 november 2026, bij de proef met vijf teksten (`src/data/exerciseGuides.ts`). Per oefening waarop de techniek rust. Ik had geen toegang tot de handboeken zelf en heb niets nagelezen: wat hieronder staat komt uit mijn kennis van gangbare handboeken en coachpraktijk. Een bron die ik niet kon controleren heet "nog te toetsen door Scout". Studies noem ik alleen als ik ze zeker weet; verder niet. De teksten zijn eigen werk, niet gebaseerd op een open bron met licentie, dus geen van de vijf heeft een `source` in de data.

Scout toetst deze lijst en de teksten. Twijfelpunten staan per oefening.

## Push-Up

- Rust op: NSCA, *Essentials of Strength Training and Conditioning* en *Exercise Technique Manual for Resistance Training*, de beschrijving van de push-up (handen iets breder dan de schouders, lichaam in een lijn, zakken tot de borst bijna de vloer raakt). Nog te toetsen door Scout.
- De ellebooghoek van ongeveer 45 graden van het lichaam is gangbare coaching en komt ook voor in het voorbeeld in het onderzoeksverslag *Uitleg bij oefeningen en open bronnen*. Een studie die er een getal voor geeft kon ik niet nalezen: nog te toetsen door Scout.
- "Een vuist boven de vloer" is mijn eigen maat om "bijna de vloer" te kunnen controleren, geen bronwaarde.

## Pull-Up

- Rust op: NSCA, *Exercise Technique Manual for Resistance Training*, de pull-up (overhandse greep iets breder dan de schouders, begin in een volledige hang, kin boven de stang, gecontroleerd terug). Nog te toetsen door Scout.
- Schouders licht omlaag in de hang is gangbare coaching (de actieve hang, zie ook het zusterverslag *Calisthenics in apps en wetenschap*). Nog te toetsen door Scout.
- De ademaanwijzing (uit tijdens het trekken) is algemene praktijk en nergens specifiek nagelezen.

## Step-Down

- Rust op: algemene revalidatie en krachtpraktijk voor de excentrische step-down (langzaam zakken, knie boven de tweede teen, bekken waterpas). Een handboek dat dit zo beschrijft kon ik niet aanwijzen: nog te toetsen door Scout.
- De drie tellen omlaag is een gangbare maat voor een gecontroleerde excentrische fase, geen bronwaarde.
- De hoogte van de verhoging heb ik bewust weggelaten, omdat ik er geen bron voor ken.

## Barbell Romanian Deadlift

- Rust op: NSCA, *Exercise Technique Manual for Resistance Training*, de Romanian deadlift (stang tegen de bovenbenen, knieën licht gebogen en vast, heupen naar achteren, stang dicht langs de benen, rug vlak, zakken tot onder de knieën of tot de rek in de hamstrings, stoppen als de rug wil ronden). Nog te toetsen door Scout.
- De ademaanwijzing (in en romp aanspannen voor het zakken) volgt de gangbare handboekpraktijk bij zware heffen. Nog te toetsen door Scout.

## 45 graden Incline Barbell Press

- Rust op: NSCA, *Exercise Technique Manual for Resistance Training*, de incline bench press (schouderbladen samen en omlaag, voeten plat op de vloer, billen op de bank, stang naar de bovenste borst, spotter of veiligheidsarmen). Nog te toetsen door Scout.
- De hoek van 45 graden is de hoek van deze oefening in de catalogus (`incline-bench-press`, "45° Incline Barbell Press"; de lagere variant is `low-incline-barbell-press` op 30 graden). De oude regel zei "een lichte helling" en klopte daarmee niet.
- "Onderarmen ongeveer loodrecht" is gangbare coaching voor de onderste stand. Nog te toetsen door Scout.

# Toetsing door Scout, 9 november 2026

Scout heeft de vijf teksten in `src/data/exerciseGuides.ts` en de drie regels (`cues`) van `incline-bench-press` in `src/data/exercises.ts` getoetst. Per aanwijzing staat er klopt, onzeker of fout, met de bron die ik zelf heb gelezen. De NSCA-handboeken zelf kon ik niet openen: de pagina van NSCA met het uittreksel over de Romanian deadlift gaf een weigering, en een uittreksel van NSCA over de gewone push-up, pull-up of schuine bankdruk vond ik niet. Waar Sherpa hierboven NSCA noemt, blijft dat dus ongetoetst; ik heb de aanwijzingen in plaats daarvan aan andere bronnen getoetst. De bronnen van NASM en Catalyst Athletics zijn opleidings- en coachbronnen, geen studies; ik noem ze omdat ze nagelezen zijn en met elkaar overeenkomen.

Hoe zeker: "klopt" betekent dat een gelezen bron het zo zegt; "onzeker" dat ik geen bron vond, of dat bronnen het anders zeggen zonder dat het gevaarlijk is; "fout" dat een gelezen bron het tegenspreekt. Alles geldt voor gezonde volwassenen zonder klachten. Wie pijn heeft bij een oefening, gaat naar een arts of fysiotherapeut.

## Push-Up, getoetst

- Handen iets breder dan je schouders: klopt. NASM, exercise library, push-up ("slightly wider than shoulder-width apart").
- Lichaam als een plank van hoofd tot hielen, billen en buik aanspannen bij hangende heupen: klopt. NASM ("straight line from your head to heels"); Naternicola, *Fitness: Steps to Success* (Human Kinetics, uittreksel "Proper push-up form"): bij een zakkende onderrug buik en billen aanspannen.
- Ellebogen ongeveer 45 graden van je lichaam: klopt als aanwijzing. NASM noemt precies "approximately 45 degrees from your body". De studie erachter is Suprak en anderen (2013, *Journal of Athletic Training* 48(6), PMC3867095): bij 16 gezonde volwassenen bracht een push-up met de armen hoog (rond 65 graden) het schouderblad in een stand die bij inklemming past, en de auteurs raden aan onder 60 graden te blijven. Zelf gekozen stond de arm gemiddeld op ongeveer 54 graden. In gewone woorden: 45 graden ligt veilig onder de grens van 60, en wie het niet bewust doet zit er vaak vlak onder. Een studie die bewijst dat precies 45 beter is dan 30 of 55 bestaat niet voor zover ik vond. De fout "ellebogen recht opzij" (rond 90 graden) klopt als fout volgens dezelfde studie.
- Zakken tot je borst een vuist boven de vloer is: klopt in grote lijnen. NASM zegt "chest nearly touches the floor"; Naternicola zegt tot ongeveer 4 inch (zo'n 10 centimeter) boven de vloer. Een vuist is ongeveer die maat.
- Adem in bij het zakken, uit bij het duwen: klopt. Naternicola.
- "Kijk naar een punt een halve meter voor je handen": onzeker. Naternicola zegt hoofd en nek in lijn met de rug en naar de vloer kijken, niet vooruit. Een halve meter voor je handen trekt de blik iets vooruit en kan de nek juist laten strekken, de fout die je wilt voorkomen. Voorstel hieronder.
- Twee tellen omlaag, voeten bij elkaar, vingers naar voren: geen bron gevonden, gangbare praktijk, niet schadelijk.

## Pull-Up, getoetst

- Overhandse greep iets breder dan je schouders: klopt. NASM, exercise library, pull-up ("slightly wider than shoulder-width").
- Beginnen in een volledige hang en terugzakken tot gestrekte armen: klopt. NASM; de testprotocollen op Topend Sports (pull-up test) rekenen het niet volledig strekken als fout.
- Schouders licht omlaag, weg van je oren: klopt. NASM, stap 2 ("depress your shoulder blades").
- Ellebogen naar je heupen trekken: klopt. NASM ("driving your elbows downward").
- Kin boven de stang: klopt. NASM en Topend Sports.
- Niet zwaaien, buik aanspannen, benen stil: klopt als fout. NASM noemt zwaaien als veelgemaakte fout; Topend Sports staat zwaaien en schoppen in de test niet toe.
- Uitademen tijdens het trekken: onzeker. Geen bron gelezen die het voor de pull-up noemt; gangbare praktijk, niet schadelijk.
- Gewicht aan een riem als het te licht wordt: geen bron gelezen, gangbare praktijk.

## Step-Down, getoetst

- Knie boven de tweede teen, niet naar binnen: klopt. Manske en Davies (2016, *International Journal of Sports Physical Therapy* 11(6), PMC5095938), de lateral step-down test van Rabin en anderen: het scheenbeen naar binnen van de tweede teen telt als fout.
- Bekken waterpas, niet zakken aan de kant van het vrije been: klopt. Dezelfde test: "loss of horizontal plane" van het bekken telt als fout.
- Langzaam zakken tot de andere voet de grond licht raakt, er geen gewicht op zetten: klopt. In beide tests in Manske en Davies raakt de hiel van het vrije been de grond en gaat dan terug.
- Hoogte van de verhoging: de tests gebruiken 15 centimeter (lateral step-down, Rabin) en 20 centimeter (anterieure step-down). Dat zijn testhoogtes, geen trainingsvoorschrift, maar ze geven een redelijke maat voor "een lage verhoging". Voorstel hieronder, optioneel.
- Romp: de test telt ook voorover of opzij leunen als fout. De tekst zegt daar niets over. Geen fout, wel een gemis; niet nodig binnen de woordgrens.
- Drie tellen omlaag: geen bron voor dit getal. De anterieure test in Manske en Davies gaat met ongeveer één herhaling per twee seconden; drie tellen omlaag is dus rustiger dan de test en past bij een gecontroleerde zakfase. Onzeker als getal, niet schadelijk.
- Bij kniepijn: een excentrische step-down belast het knieschijfgewricht. Dat is de reden dat fysiotherapeuten hem gebruiken, en ook de reden dat wie kniepijn heeft eerst een fysiotherapeut vraagt.

## Barbell Romanian Deadlift, getoetst

- Knieën licht gebogen en vast tijdens de beweging: klopt. Everett, Catalyst Athletics, "The Romanian Deadlift": knieën ongeveer 15 graden gebogen, en ze blijven in die stand.
- Heupen naar achteren, stang zo dicht mogelijk langs de benen: klopt. Catalyst Athletics ("pushing your hips back", "keep the bar as close to the body as possible").
- Rug recht, schouderbladen licht naar achteren: klopt. Catalyst Athletics (natuurlijke holling vasthouden, schouderbladen naar achteren).
- Stoppen zodra de onderrug wil ronden: klopt. Catalyst Athletics: de onderste stand is het punt net voor de rug rondt of de knieën verder buigen.
- "Tot onder je knieën of tot je de achterkant van je bovenbenen sterk voelt rekken": onzeker als maat, niet fout. Catalyst Athletics laat zakken zo ver als kan zonder de vloer te raken, zolang de rug niet rondt; de stopregel in de tekst is de echte grens en die klopt.
- Inademen en romp aanspannen voor het zakken, uitademen boven: klopt. Catalyst Athletics zegt precies dit.
- Voeten op heupbreedte, overhandse greep net buiten de benen: klopt in grote lijnen. Catalyst Athletics zegt de houding van de gewone deadlift en een greep van de clean; de tekst kiest de gangbare smallere greep, wat geen fout is.
- Twee tellen omlaag: geen bron, gangbare praktijk.

## 45 graden Incline Barbell Press, getoetst

- Bank op 45 graden: klopt voor deze oefening. NASM, exercise library, incline barbell bench press ("set a bench to a 45-degree incline"). Wel goed om te weten: Rodríguez-Ridao en anderen (2020, *International Journal of Environmental Research and Public Health* 17(19), PMC7579505) maten bij 30 getrainde volwassenen de meeste activiteit van de bovenste borst bij 30 graden; boven 45 graden neemt de voorste schouder het steeds meer over. In gewone woorden: 45 is de bovengrens, 30 is voor de bovenste borst iets beter. Dat is de lagere variant in de catalogus (`low-incline-barbell-press`), dus de catalogus klopt.
- Stang naar je bovenste borst: klopt. NASM ("back toward your upper chest").
- Schouderbladen samen en omlaag, voeten plat op de vloer: klopt. NASM ("retract your shoulder blades", "feet flat on the floor").
- Greep iets breder dan je schouders: klopt. NASM ("slightly wider than shoulder-width apart").
- Billen op de bank houden, geen overdreven holle rug: klopt als fout. NASM noemt overdreven hollen van de onderrug als veelgemaakte fout.
- Onderarmen ongeveer loodrecht in de onderste stand: onzeker, niet fout. Dit is gangbare coaching om de greepbreedte te kiezen; een gelezen bron of studie die het onderbouwt vond ik niet. Laten staan.
- Ellebogen niet recht opzij: klopt als fout. NASM noemt ellebogen te wijd of te smal als fout; de redenering van Suprak bij de push-up (arm boven 60 graden geeft een ongunstige stand van het schouderblad) wijst dezelfde kant op, al is die studie niet bij bankdrukken gedaan.
- Veiligheidsarmen of een spotter als je alleen traint: geen bron gelezen, maar algemeen aanvaard; laten staan.
- Oude regel "Let op: steiler dan 45 graden wordt een schouderpers": onzeker, overdreven. Rodríguez-Ridao: boven 45 graden stijgt de activiteit van de voorste schouder duidelijk en daalt die van de borst, maar het wordt geen schouderpers; ook bij 60 graden werkt de borst nog mee. NASM zegt het voorzichtiger ("shifts emphasis to anterior deltoid"). Voorstel hieronder.
- Oude regel "Vaak fout: de stang naar je nek laten zakken": klopt als fout, want de stang hoort op de bovenste borst (NASM). Of het vaak gebeurt, kon ik niet nalezen.

## Voorgestelde tekstwijzigingen

1. `incline-bench-press`, `cues` in `src/data/exercises.ts`. Nu: "Let op: steiler dan 45 graden wordt een schouderpers." Voorstel: "Let op: steiler dan 45 graden neemt je voorste schouder het over." Reden: Rodríguez-Ridao en anderen (2020) en NASM.
2. `push-up`, fout over het hoofd in `src/data/exerciseGuides.ts`. Nu: "Kijk naar een punt een halve meter voor je handen." Voorstel: "Houd je hoofd in lijn met je rug en kijk naar de vloer vlak voor je handen." Reden: Naternicola, *Fitness: Steps to Success*.
3. Optioneel, `step-down`, opzet. Nu: "Sta met je werkbeen op een lage, stevige verhoging." Voorstel: "Sta met je werkbeen op een stevige verhoging van 15 tot 20 centimeter." Reden: de testhoogtes in Manske en Davies (2016). Controleer daarna de woordgrens van Lees verder.

## Wat nog onzeker is

- De NSCA-handboeken zelf zijn niet nagelezen. Wie ze heeft, kan de vijf beschrijvingen ernaast leggen; ik verwacht geen tegenspraak, want NASM en Catalyst Athletics zeggen hetzelfde.
- Tempo's (twee of drie tellen) en de ademregel bij de pull-up hebben geen bron. Ze zijn gangbaar en niet schadelijk.
- De studie over de ellebooghoek (Suprak 2013) is klein (16 gezonde volwassenen) en meet de stand van het schouderblad, geen blessures. Het getal 60 is een grens om onder te blijven, geen bewezen veilige zone.

Bronnen die Scout heeft gelezen:

- Suprak DN en anderen, Scapular kinematics and shoulder elevation in a traditional push-up, *Journal of Athletic Training* 2013;48(6):826-835: https://pmc.ncbi.nlm.nih.gov/articles/PMC3867095/
- Rodríguez-Ridao D en anderen, Effect of five bench inclinations on the electromyographic activity of the pectoralis major, anterior deltoid, and triceps brachii during the bench press exercise, *IJERPH* 2020;17(19):7339: https://pmc.ncbi.nlm.nih.gov/articles/PMC7579505/
- Manske RC, Davies GJ, Examination of the patellofemoral joint, *IJSPT* 2016;11(6):831-853: https://pmc.ncbi.nlm.nih.gov/articles/PMC5095938/
- Naternicola NL, *Fitness: Steps to Success*, uittreksel "Proper push-up form", Human Kinetics: https://us.humankinetics.com/blogs/excerpt/proper-push-up-form
- NASM exercise library, push-up: https://www.nasm.org/resource-center/exercise-library/push-up
- NASM exercise library, pull-up: https://www.nasm.org/resource-center/exercise-library/pull-up
- NASM exercise library, incline barbell bench press: https://www.nasm.org/resource-center/exercise-library/incline-barbell-bench-press
- Everett G, The Romanian Deadlift, Catalyst Athletics: https://catalystathletics.com/article/23/The-Romanian-Deadlift/
- Topend Sports, pull-up test: https://www.topendsports.com/testing/tests/pullup.htm
