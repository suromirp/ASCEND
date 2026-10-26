# Kracht en berg in één plan

Wat ASCEND is als de GR5 niet meer de kern is, waarmee het zich onderscheidt, en wat er in de app en in het bouwplan voor verandert. Geschreven op 26 oktober 2026, na het onderzoek `docs/onderzoek/ASCEND voor iedereen.md` en een marktverkenning van Scout Markt. De ruwe notities staan buiten de repo. De bronnen staan in de tekst.

## 1. In het kort

1. ASCEND draait niet om één tocht, maar om één lichaam. Wat de app bijzonder maakt is dat kracht, hardlopen en bergen in één plan zitten, omdat ze dezelfde benen gebruiken.
2. In de markt bestaat dat niet. Er zijn duurapps met kracht erbij (Runna), krachtapps zonder duur (Fitbod, Ladder, Hevy) en bergplannen als pdf of TrainingPeaks-plan (Uphill Athlete, Mountain Tactical). Een paar nieuwe hybride apps beloven één model, maar laten nergens zien hoe ze rekenen.
3. De positie: **de trainingsapp die weet wat je benen al hebben gedaan.** Eén beenbudget voor kracht, lopen, bergop en bergaf. Bij elke regel staat het onderzoek en hoe sterk dat is. Elk scenario kan. Alles blijft lokaal en de toon is kalm.
4. De GR5 wordt een voorbeeld van één doelsoort: een meerdaagse tocht met rugzak. Naast die doelsoort komen een bergtocht, een hardloopwedstrijd, trail, sterker worden en fit blijven. Elke doelsoort heeft zijn eigen meters, maar er blijft één voortgangstaal: "Klaar voor je doel".
5. Specialistisch blijft het door wat nu al werkt verder uit te diepen: bergaf en dragen, kracht naast duur, de eigen ijking per gebruiker, inzichten uit je eigen gegevens, en eerlijk onderzoek per regel.
6. De GR5 zit nu in 101 bronbestanden, met 521 keer de naam. Het uitpakken gaat in drie bakken: algemene logica die alleen GR5 heet, een tochtmodule die alleen verschijnt bij een tocht, en taal.
7. In het bouwplan komt er een eigen ronde bij: "De GR5 uit de kern", direct na het fundament en het opruimen van de instellingen.

## 2. De positie

### Wat de markt laat zien

Scout Markt keek naar hybride apps, krachtapps, duurapps en bergplannen. Er zijn drie kampen.

- **Duur met kracht erbij.** Runna (sinds april 2025 van Strava) zet kracht in je plan, maar houdt hem buiten zijn aanpassingen. TrainingPeaks rekent kracht met een vaste score per uur. Joe Friel, de bedenker van de belastingmaten daar, raadt zelf aparte grafieken per sport aan.
- **Kracht zonder duur.** Fitbod, Ladder en Hevy. Fitbod laat cardio de vermoeidheid van je benen veranderen, maar plant geen duur.
- **Bergplannen zonder app.** Uphill Athlete heeft de inhoudelijke diepte en legt het waarom uit, maar levert plannen via TrainingPeaks. Het schrijft zelf dat hartslagscores het dalen onderschatten en dat hun correcties "ervaringsschattingen" zijn ([Uphill Athlete over TrainingPeaks-maten](https://uphillathlete.com/?p=16521)). Mountain Tactical Institute verkoopt vaste plannen. Komoot en FATMAP zijn kaarten, geen training.

Hybride nieuwkomers (HYBRD, Athletica, de Hyrox-apps) beloven één model voor kracht en duur, maar publiceren de rekenregel niet. Of ze intern meer doen, is niet vast te stellen zonder ze te gebruiken.

**De witte plekken** zijn er vijf:
1. een uitgelegd belastingmodel voor de benen over kracht, lopen, bergop en bergaf;
2. planning zonder doel of met meerdere doelen tegelijk;
3. een trainingsapp voor tochten en bergwandelen;
4. lokaal en rustig als keuze;
5. bewijskracht per regel in een app voor gewone sporters.

**De doelgroep is groot en groeit,** al is "kracht plus berg plus duur" niet als één cijfer te meten.
- Trailrunning in de VS: 16,1 miljoen in 2024 en 17,2 miljoen in 2025 ([OIA Running Report 2026](https://outdoorindustry.org/2026-running-report/)).
- Deelname aan wedstrijden met een UTMB-index: 2,4 keer zo hoog als in 2022 ([UTMB en Strava](https://utmb.world/news/announcement-collaboration-strava)).
- Hyrox: rond de 1,5 miljoen deelnemers in 2025/26. Dat cijfer komt van het bedrijf en de vakpers; Reuters noemt "meer dan een miljoen".
- Wandelen is de grootste buitensport in de VS (63,6 miljoen in 2025).
- De Duitse Alpenverein had eind 2025 een recordaantal van 1,64 miljoen leden ([DAV](https://www.alpenverein.de/verband/presse/pressemeldungen/alpenverein-waechst-auf-rekordwert-164-millionen-mitglieder-und-ueber-36000-ehrenamtliche)).
- Volgens Strava kiest Gen Z twee keer zo vaak krachttraining als hoofdsport.

### Wat ASCEND belooft

**Kracht, hardlopen en bergen in één plan, omdat ze dezelfde benen gebruiken, en bij elke beslissing staat waarom.**

Vier pijlers.

1. **Eén beenbudget.** De beenindex, 48 uur tussen zware beendagen en 72 uur na een bergtocht of zware afdaling. Kracht, lopen, bergop, bergaf en straks voetbal of padel tellen in dezelfde rekening. Bergaf en dragen zijn de as die niemand anders meerekent. Dat is het verschil tussen ASCEND en een hardloop- of Hyrox-app met kracht.
2. **Eerlijk onderzoek per regel.** Elke regel heeft een bron en een sterkte in gewone woorden, en de app zegt wat onzeker is. Een voorbeeld dat opvalt: de beste meta-analyse vond geen verlies aan spiergroei of maximale kracht als je kracht en duur combineert. Er was alleen wat minder winst in explosieve kracht, vooral als beide in dezelfde sessie zitten ([Schumann e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8891239/), 43 studies). De 48- en 72-uursregels zijn dus geen "cardio kost je spieren", maar regels voor de kwaliteit van je volgende training en voor vermoeide benen. Wie dat zo zegt, is eerlijker dan het volksverhaal.
3. **Elk scenario.** Geen doel, een wedstrijd, een tocht, alleen kracht, of meerdere doelen tegelijk. De markt denkt in één plan naar één wedstrijd.
4. **Lokaal en kalm.** Geen account, geen cloud, geen beloningen of reeksen die breken. De toon is Stoïsch: rustig, eerlijk, op jou gericht.

**Wat ASCEND niet claimt:**
- beter dan een coach;
- voorkomt blessures (de werkafspraak blijft "kan helpen");
- "slimme AI".

Vaste, uitlegbare regels zijn een sterker verhaal dan "slimmer", en het woord AI is vol en niet te controleren.

### Merk

De naam en de merkregel passen al: "Train. Progress. Explore. Ascend." Ascend is klimmen naar wat jij wilt bereiken, en dat is niet altijd een berg. Het beeld blijft hetzelfde: de lichte lucht met de bergen bovenaan, de contourlijnen, het marine. Dat zijn bergen als beeld, niet de Alpen van één route. Er verandert niets aan het ontwerp.

## 3. Doelen als doelsoorten

Een doel krijgt een soort. Die soort is een gegeven, geen code, net als de sporten in het onderzoek. Een doelsoort zegt drie dingen: wat hij per soort training minstens vraagt, welke meters bij "Klaar voor je doel" horen, en welke module erbij hoort.

**Meerdaagse tocht met rugzak.** Bijvoorbeeld de GR5, de Kungsleden of een week met tent in de Ardennen.
- Vraagt: kracht één tot twee keer per week, wandelvolume, een rugzaksessie twee tot vier keer per maand, elke één tot twee weken een prikkel om af te dalen, en lange dagen achter elkaar.
- Meters: de vier van nu (rugzak, langste dag, stijgen en dalen, dagen achter elkaar).
- Module: de tochtmodule (deel 4).
- Dit is de enige doelsoort die al helemaal bestaat.

**Bergtocht of alpine dag.** Eén lange dag met veel hoogtemeters, zoals een top of een lange klim.
- Vraagt: kracht, bergop en bergaf, een lange dag.
- Meters: langste dag, stijgen, dalen, en de rugzak licht.
- Bestaat grotendeels: het is de tocht zonder de dagen achter elkaar.

**Hardloopwedstrijd** (5 km tot marathon).
- Vraagt: drie loopjes per week, een lange loop die groeit, een kwaliteitssessie, kracht minstens één keer.
- Meters: de verwachte tijd tegen je doeltijd (uit testlopen), de lange loop, het weekvolume, en volhouden.
- Bestaat als raceblok voor de 10 km. Het moet alleen een eigen doelsoort worden, in plaats van een tussendoel van de GR5.

**Trail of bergloop.**
- Vraagt: wat een hardloopwedstrijd vraagt, plus hoogtemeters per week en dalen op snelheid.
- Meters: die van een hardloopwedstrijd, plus stijgen en dalen.
- Nieuw, maar opgebouwd uit wat er is. Onderzoek nodig naar bergaf hardlopen in de opbouw.

**Sterker worden.** Kracht is het hoofddoel, duur loopt mee op onderhoud.
- Vraagt: kracht twee tot vier keer per week, duur twee keer.
- Meters: de krachttrend in Forge op je hoofdoefeningen, het volume per spiergroep, en volhouden.
- Forge heeft het meeste al, maar kracht had nog nooit een doel.

**Fit blijven of fitter worden.** Geen datum.
- Meters: je week tegen de beweegrichtlijn (150 minuten en twee keer kracht) en volhouden.
- Zie het onderzoek "ASCEND voor iedereen", deel 4.

**Hyrox en fitness racing.** Later, en alleen met eigen onderzoek naar de opbouw (lopen tussen krachtstations). De markt raadt het aan als instroom, niet als merk: de apps eromheen zijn druk en gericht op de wedstrijd. ASCEND kan het als doel ondersteunen met dezelfde logica.

**Meerdere doelen.**
- Eén hoofddoel en tussendoelen, zoals nu de 10 km op weg naar de GR5.
- De planning telt terug vanaf het hoofddoel, en een tussendoel krijgt zijn eigen blok (dat is er al: `raceBlock.ts`).
- Twee doelen die botsen (een marathon twee weken voor een lange tocht) geven een eerlijk voorstel, geen stille keuze.

**Eén voortgangstaal blijft.** De regel "één percentage, het gemiddelde van de meters, altijd met de zin waaruit het bestaat" geldt voor elke doelsoort. `gr5Readiness` wordt `goalReadiness`, met de meters per doelsoort uit de gegevens. De mijlpalen blijven een ladder voor wie dat wil, nooit een tweede percentage.

## 4. De GR5 uit de kern halen

De GR5 staat nu in 101 bronbestanden, met 521 keer de naam. Dat gaat in drie bakken.

**Bak 1: algemene logica die GR5 heet.** Die wordt hernoemd en uit de gegevens gelezen.
- De fasen Basis, Opbouw, Bergcapaciteit en Expeditieklaar worden de fasen van de doelsoort tocht. Andere doelsoorten krijgen hun eigen fasen. Zonder doel worden het neutrale golven.
- De rugzakladder en de wandelladder gelden alleen voor een tocht.
- De sleutelsessies en de wissels naar bergtocht en wandeldag lezen de doelsoort.
- `gr5Readiness`, `gr5Profile`, de coachzinnen en `onCourse` krijgen de doelsoort mee.
- Eén functie `mainGoal()` vervangt de tien kopieën.

**Bak 2: de tochtmodule.** Die verschijnt alleen als een tocht je doel is: Reisplanner, Etappes, Alleen onderweg, Paklijst, Water per etappe, Bergschoenen inlopen, Rust na een bergtocht en Volgende tocht. De GR5 zelf (etappes, regels voor bivak per gebied, de vergelijking van een GR5-dag met je beste) wordt een route in de gegevens: de eerste, niet de enige. Een andere route kan er later naast, of een eigen route uit een GPX.

**Bak 3: taal en kennis.** Kennisteksten, weektips, lessen van de week en meldingen worden algemeen. Wat alleen over de GR5 gaat, gaat mee in de routegegevens. De vaste tekst in CLAUDE.md ("Klaar voor de GR5", de GR5 als enige voortgangstaal) wordt via een besluit "Klaar voor je doel".

**Voor de eigenaar verandert niets zichtbaars,** behalve woorden. Je hoofddoel is een tocht, de route is de GR5, je tussendoel is de 10 km, en je planning blijft precies gelijk. De vaste test uit ronde 0 bewaakt dat.

## 5. Specialistisch blijven

Breed op doelen en smal op benen. De diepte zit niet in meer doelen, maar in wat ASCEND over je lichaam weet. Dit zijn de assen om verder uit te diepen, op volgorde van onderscheid.

1. **Bergaf en dragen.** De beenindex weegt dalen en rugzak nu al mee. De volgende stap is je eigen herstel leren: hoe lang jouw benen na een afdaling van 1.000 meter nodig hebben, uit je eigen ochtendcheck en de volgende training. Zo wordt de regel jouw regel.
2. **Kracht naast duur.** De volgorde op één dag, de afstand tot een harde loop, en een lichtere beendag na een tocht. Forge met een eigen rekenmodel dat leert van je toestellen, je vermoeidheid per set en je sportscholen. Geen andere app heeft beide.
3. **Sporten met kenmerken.** Elke sport telt met impact, remmen, stop en start, bovenlichaam en techniek. Zo past een voetbalwedstrijd in hetzelfde beenbudget als een squatdag.
4. **Inzichten uit je eigen gegevens.** Hetzelfde hart bij een sneller tempo, je zweetverlies per temperatuur, wat een korte nacht of alcohol met je doet, de krachttrend tegen 4 en 8 weken terug. Altijd met je eigen band, nooit tegen een gemiddelde mens.
5. **Onderzoek zichtbaar in de app.** Elke "waarom" bij een beslissing krijgt de bron en de sterkte in één regel: "Sterk bewijs" of "Ervaringsregel van coaches". Dat bestaat al voor een deel (de bronnenpagina en `docs/onderzoek/`). Het moet in de uitleg bij elke regel zelf komen.
6. **Uitlegbare, vaste regels.** Geen gok en geen zwarte doos. Elk voorstel zegt welke regel het is, en alles kan ongedaan worden.

## 6. Het bouwplan, aangepast

Het plan uit "ASCEND voor iedereen" krijgt een ronde erbij. De nieuwe volgorde:

- **Ronde 0, fundament, niets zichtbaar.** `mainGoal()`, sporten als gegevens, rollen op sjablonen, doelsoorten als gegevens (eerst alleen tocht en hardloopwedstrijd, zoals nu), en de vaste test dat jouw plan gelijk blijft.
- **Ronde 1, instellingen opruimen.**
- **Ronde 2, de GR5 uit de kern** (nieuw). De drie bakken uit deel 4, "Klaar voor je doel" met meters per doelsoort, de tochtmodule alleen bij een tocht, en de GR5 als route. Daarna de doelsoorten bergtocht, sterker worden en fit blijven.
- **Ronde 3, zonder doel goed.** Richting kiezen, neutrale golven, de kaart "Je week".
- **Ronde 4, sporten die meetellen** (zwemmen, padel, voetbal, yoga, een eigen sport).
- **Ronde 5, vaste afspraken.**
- **Ronde 6, hoe vaak per sport,** met nieuwe startvragen en de vorm van de week later te wijzigen.
- **Ronde 7, hoeveel per soort.**
- **Later, elk met eigen onderzoek:** trail, Hyrox, andere routes en een route uit een GPX, je eigen herstel na bergaf leren, en de bron per regel in de uitleg.

## 7. Wat jij beslist

1. **De positie.** Is "de trainingsapp die weet wat je benen al hebben gedaan" de goede kern, of wil je een andere zin?
2. **De eerste doelsoorten.** Het advies is tocht, bergtocht, hardloopwedstrijd, sterker worden en fit blijven. Trail en Hyrox komen later, met onderzoek. Akkoord?
3. **De GR5 als route.** De GR5 blijft de eerste route met al zijn gegevens. Andere routes komen alleen als iemand erom vraagt. Akkoord?
4. **De volgorde.** Mag de nieuwe ronde 2 vóór "zonder doel" komen? Dan is de app eerst algemeen voor iedereen met een doel, en daarna ook voor wie er geen heeft.

## 8. Wat onzeker is

- Of HYBRD of Athletica intern toch een gedeeld beenmodel hebben, is niet vast te stellen zonder ze te gebruiken.
- De cijfers over Hyrox komen van het bedrijf en de vakpers. Voor Nederland zijn geen cijfers over bergwandelen gevonden; Duitsland en Oostenrijk dienen als benadering.
- Het onderzoek naar herstel na bergaf gaat over hardlopen met jonge mannen. Voor wandelen zijn het bovengrenzen.
- De eisen per doelsoort voor trail en Hyrox zijn nog niet onderzocht.
- Een deel van de marktbronnen komt van concurrerende bedrijven en is daardoor gekleurd.
