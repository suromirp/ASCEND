# Afbeeldingen bij oefeningen

Onderzoek door Scout, 28 oktober 2026. Vraag van de eigenaar: bij elke oefening in Forge een klein plaatje, en bij aantikken een groter plaatje met meer uitleg. Eisen: gratis, betrouwbaar, mag in een openbare repo, werkt offline in de PWA zonder server, en past bij de stijl van ASCEND of is er goed in te passen. Video mag, hoeft niet.

Gelezen vooraf: `docs/onderzoek/Kracht loggen en progressie.md` (hoofdstuk 4 over open oefeningendatabases, 22 oktober), `src/data/exercises.ts` (120 oefeningen, met primaire en secundaire spiergroepen en drie tot vijf korte aanwijzingen), `src/models/exercise.ts` (19 spiergroepen, 15 bewegingspatronen, een veld `videoUrl` dat nog nergens gevuld is), `src/components/pictograms.tsx` en het besluit over stijl C, `data/bodySpots.ts`, `engine/bodyMap.ts` en `components/lichaam/BodyFigure.tsx` (met `SpotThumb` en `MiniBody`), en de plek waar de aanwijzingen nu staan (het menublad van een oefening in `components/forge/ForgeWorkout.tsx`).

Het eerdere rapport adviseerde een eigen oefenlijst zonder foto's, omdat afbeeldingen juridisch het lastigste deel zijn. Dat advies is uitgevoerd. Dit rapport bouwt daarop voort en kijkt alleen naar de plaatjes.

Hoe zeker: wat ik bij de bron zelf heb nagelezen staat er met een link bij. Wat ik heb afgeleid of geschat staat er als "afgeleid" bij. Niets hierin is juridisch advies.

## 1. Bronnen en hun licentie

### yuhonas/free-exercise-db

Wat het is: meer dan 800 oefeningen als JSON, met per oefening meestal twee JPG-foto's (`0.jpg` en `1.jpg`, start en eind), in een map per oefening ([repo](https://github.com/yuhonas/free-exercise-db)). De repo staat onder de Unlicense, dus publiek domein voor wat de maker zelf heeft gemaakt.

De herkomst van de foto's is het probleem, en dat is sinds 22 oktober duidelijker geworden:

- De maker schreef in 2023 dat hij "geen idee" heeft waar de foto's vandaan komen of of ze vrij van rechten zijn, en dat gebruik "op eigen risico" is ([issue 2](https://github.com/yuhonas/free-exercise-db/issues/2)).
- De bron waar deze repo een herwerking van is, wrkout/exercises.json, zei in zijn eigen bijdrage-instructies dat de foto's "van internet geschraapt" zijn, dat de makers het auteursrecht niet hebben, en dat ze gebruik in commerciële projecten afraden. Een gebruiker vond met omgekeerd zoeken een grote commerciële sportsite als waarschijnlijke bron ([issue 305 bij wrkout](https://github.com/wrkout/exercises.json/issues/305)). Later schreef de maker daar dat hij de beelden zelf met 3D-software heeft gemaakt; de twee uitspraken worden nergens met elkaar verzoend.
- In augustus 2026 vroegen gebruikers de foto's te verwijderen; de maker stelde voor ze dan door lege plaatsvervangers te vervangen ([issue 13](https://github.com/yuhonas/free-exercise-db/issues/13)).
- De instructieteksten lezen als die van een oude commerciële oefensite (bijvoorbeeld bij Barbell Squat de verwijzing naar "the foot stances section", [Barbell_Squat.json](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat.json)) (afgeleid, niet bevestigd).

Oordeel: niet meeleveren in een openbare repo. Ook niet als link vanaf GitHub laden, want de foto's kunnen verdwijnen en de vraag blijft dezelfde. De spierindeling (feiten) is wel bruikbaar als controle.

### wger

Wat het is: de open trainingsapp met een open API. Op 22 oktober telde de API 932 oefeningen; vandaag telt hij nog steeds 383 afbeeldingen ([exerciseimage](https://wger.de/api/v2/exerciseimage/?limit=5)). Elke afbeelding heeft een eigen licentie en auteur. De API kent vijf licenties: CC-BY-SA 3, CC-BY-SA 4, CC0, CC-BY 4 en ODbL ([licenties](https://wger.de/api/v2/license/)). In de eerste 80 afbeeldingen die ik las stonden 41 onder CC-BY-SA 3 en 38 onder CC-BY-SA 4, en 38 hadden Everkinetic als auteur.

Mag het: ja, met naamsvermelding en de deel-gelijk-regel. Kwaliteit: wisselend. Een deel zijn de nette tekeningen van Everkinetic, de rest zijn foto's en tekeningen van gebruikers in allerlei stijlen, formaten (png, jpg, webp, zelfs jfif) en maten. Er is meestal één beeld per oefening, soms twee. Voor ASCEND is wger vooral interessant als de plek waar de Everkinetic-tekeningen ook staan, niet als bron op zich.

### Everkinetic

Wat het is: een set lijntekeningen van oefeningen, rond 2010 gemaakt door Greg Priday voor everkinetic.com, steeds een startpositie en een eindpositie. De site is uit de lucht. De tekeningen staan op Wikimedia Commons onder CC BY-SA 3.0 met Everkinetic als auteur, bijvoorbeeld [Biceps-curl-1](https://commons.wikimedia.org/wiki/File:Biceps-curl-1.gif) (221 bij 275 pixels, ongeveer 12 KB). De opvolger van het project, [everkinetic/data](https://github.com/everkinetic/data), staat onder CC BY-SA 4.0 en noemt zich "open data project based on everkinetic.com created by Greg Priday". Dat 3.0 en 4.0 allebei voorkomen is geen tegenspraak: een bewerking van een werk onder BY-SA 3.0 mag onder een latere versie met dezelfde elementen worden gedeeld ([BY-SA 4.0, artikel 3(b)](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en) en dezelfde regel in 3.0).

Mag het: ja, met naamsvermelding en deel-gelijk. Kwaliteit: rustig en duidelijk, maar oud, klein en als rasterbeeld. Hoeveel oefeningen de oude set precies had, kon ik bij de bron niet vaststellen; de repo noemt geen aantal.

### Workout Guide (bryllim/workout-guide), de vernieuwde Everkinetic

Dit is de beste vondst. Wat het is: 302 oefeningen met elk drie beelden (906 in totaal), als transparante SVG van 512 bij 512, met een manifest met naam, toestel, primaire en secundaire spier en per beeld de naamsvermelding ([repo](https://github.com/bryllim/workout-guide), [README](https://raw.githubusercontent.com/bryllim/workout-guide/main/README.md)). De code staat onder MIT, de beelden onder CC BY-SA 4.0. De oorspronkelijke poses komen van Everkinetic; Bryl Lim heeft oefeningen en tussenbeelden toegevoegd, alles gelijkgetrokken en als vector overgetrokken ([ATTRIBUTION.md](https://raw.githubusercontent.com/bryllim/workout-guide/main/ATTRIBUTION.md)). In het manifest staat per oefening wat er aan het origineel veranderd is, bijvoorbeeld "Rasterized on a transparent 512 × 512 canvas, recolored for monochrome display, and vector-traced" ([manifest](https://raw.githubusercontent.com/bryllim/workout-guide/main/packages/workout-guide/manifest.json)). Een ander project, een iOS-app, gebruikt dezelfde set op dezelfde manier en noemt drie namen: Everkinetic, Bryl Lim en de verzamelaar ([oefen-exercise-art](https://github.com/Baroknolia/oefen-exercise-art)).

Wat ik zelf in de bestanden zag: elk beeld is één `<path>` met `fill="#fff"` en `fill-rule="evenodd"`, geen lijnen, geen achtergrond, dus een wit silhouet met uitgespaarde details ([step-down, beeld 1](https://raw.githubusercontent.com/bryllim/workout-guide/main/packages/workout-guide/assets/step-down/frame-1.svg), [bench-press, beeld 1](https://raw.githubusercontent.com/bryllim/workout-guide/main/packages/workout-guide/assets/bench-press/frame-1.svg)). Een beeld is ongeveer 10 tot 17 KB. Dat betekent dat ASCEND de kleur volledig zelf kan bepalen: vervang `#fff` door `currentColor` en het silhouet krijgt de kleur van de tokens, ook 's avonds op de nachtlucht.

Mag het in een openbare repo: ja. Naamsvermelding: verplicht (zie hoofdstuk 4). Deel-gelijk: een aangepaste versie van de beelden zelf (andere kleur, minder decimalen) moet weer onder CC BY-SA 4.0. Een wijziging die alleen technisch nodig is om het te gebruiken (een ander bestandsformaat) telt volgens de licentie niet als bewerking (artikel 2(a)(4)). De app eromheen wordt niet CC BY-SA doordat hij de beelden toont; dat is een verzameling, geen bewerking (afgeleid uit de licentietekst, geen juridisch advies).

Onzeker: de repo heeft maar 10 commits en is van één persoon. Omdat ASCEND de bestanden zelf meelevert, maakt dat voor de app niets uit, maar er komen waarschijnlijk niet vanzelf nieuwe oefeningen bij. Wat de drie beelden precies zijn (start, midden, eind) zegt de README niet; de iOS-app spreekt van een animatie in drie stappen. De kwaliteit heb ik in de code gezien, niet met het oog; dat moet Cartographer nog doen.

### ExerciseDB (AscendAPI, via RapidAPI)

Wat het is: een commerciële database met volgens de eigen pagina meer dan 11.000 oefeningen, 15.000 video's, 20.000 afbeeldingen en 5.000 gifjes ([exercisedb-api](https://github.com/exercisedb/exercisedb-api)). De code staat onder AGPL-3.0, de media hebben geen open licentie. De gebruiksvoorwaarden zeggen (gelezen via de zoekmachine, de Notion-pagina zelf liet zich niet lezen) dat alle media eigendom van de maker blijven, dat je ze alleen mag gebruiken zolang je een abonnement hebt, en dat opslaan uitdrukkelijk verboden is: elk gebruik moet opnieuw worden opgevraagd ([voorwaarden](https://exercisedb.notion.site/ExerciseDB-API-Terms-of-Use-226983b728ca8090bf7be79564e4b356)). Grappig detail: het bedrijf heet AscendAPI, wat in een openbare repo van ASCEND alleen maar verwarring geeft.

Oordeel: valt af. Niet gratis, niet offline, niet meeleveren.

### MuscleWiki

Wat het is: een grote site met video's per oefening en een eigen API. De voorwaarden van de API (bijgewerkt 8 oktober 2026) verbieden het downloaden en opslaan van video's, miniaturen en spierkaarten voor offline gebruik, en "permanente opslag of langdurig bewaren van media" ([API-voorwaarden](https://api.musclewiki.com/api-terms)). De sleutel hoort op een server, zodat hij niet in de app zit, en de video's moeten via de API worden gestreamd. De site zelf houdt alle rechten voor ([voorwaarden](https://musclewiki.com/copyright)).

Oordeel: valt af. ASCEND heeft geen server, en offline mag niet.

### Wikimedia Commons

Wat het is: losse bestanden van allerlei makers, elk met een eigen licentie, meestal CC BY-SA. Behalve de Everkinetic-set zijn er losse animaties, bijvoorbeeld een rugstrek-animatie van een vrijwilliger onder CC BY-SA 4.0, 42 KB, twee beelden ([Roman chair animation](https://commons.wikimedia.org/wiki/File:Roman_chair_(hyperextension)_animation.gif)). Bruikbaar om een enkel gat te vullen, maar geen samenhangende stijl en per bestand een eigen naamsvermelding. Alleen als laatste redmiddel.

### Wat er verder is

Uit het eerdere rapport, niet opnieuw nagezocht: exercemus (een mengsel van licenties per oefening), hasaneyldrm/exercises-dataset (afbeeldingen van een commerciële partij met een eigen licentie) en RepDB (gratis met beperkingen op de afbeeldingen). Geen van drieën voldoet beter dan Workout Guide.

Over video: er is geen vrije set oefenvideo's die je offline mag meeleveren gevonden. Wat wel kan is wat Rekken al doet: een link naar een video op YouTube die buiten de app opent (`videoUrl` in `data/stretches.ts`, het veld bestaat ook al op `Exercise`). Dat werkt alleen online en hangt af van wie de video plaatste.

## 2. Dekking van de oefeningen in ASCEND

ASCEND heeft 120 oefeningen in `src/data/exercises.ts`. Ik heb ze vergeleken met de 302 namen in het manifest van Workout Guide. Drie groepen: zeker (dezelfde oefening, hetzelfde soort toestel), bijna (dezelfde beweging, maar een ander toestel, zonder gewicht of een andere hoek) en ontbreekt.

Een kanttekening vooraf: "zeker" betekent dat naam, toestel en spier in het manifest overeenkomen. Ik heb de beelden niet allemaal bekeken. Voordat de koppeling in de code komt, moet iemand elk plaatje een keer met het oog nalopen (zie hoofdstuk 5). Het manifest las ik in zes delen; het is mogelijk dat ik een enkele naam heb gemist, dus "ontbreekt" kan in een enkel geval toch bestaan. Dat `tibialis-raise` er niet is, heb ik apart nagekeken.

### Zeker: 85 van de 120 (ongeveer 70 procent)

Het voorstel voor de koppeling, steeds het id in ASCEND en daarachter de slug in Workout Guide.

Knie, squat en pers:
- back-squat (Barbell Back Squat): squat
- pause-back-squat (Pause Back Squat): squat
- front-squat (Front Squat): front-squat
- goblet-squat (Goblet Squat): goblet-squat
- leg-press (Pin-Loaded Leg Press): leg-press
- leg-press-plates (Plate-Loaded Leg Press): leg-press
- hack-squat (Hack Squat): hack-squat
- leg-extension (Leg Extension): leg-extension
- bulgarian-split-squat (Bulgarian Split Squat): bulgarian-split-squat
- split-squat (Split Squat): split-squat
- walking-lunge (Walking Lunge): walking-lunge
- reverse-lunge (Reverse Lunge): reverse-lunge
- step-up (Step-Up): step-up
- step-down (Step-Down): step-down

Heupscharnier en hamstrings:
- deadlift (Conventional Deadlift): deadlift
- sumo-deadlift (Sumo Deadlift): sumo-deadlift
- romanian-deadlift (Barbell Romanian Deadlift): romanian-deadlift
- trap-bar-deadlift (Trap Bar Deadlift): trap-bar-deadlift
- dumbbell-rdl (Dumbbell Romanian Deadlift): dumbbell-romanian-deadlift
- single-leg-rdl (Single Leg Romanian Deadlift): single-leg-romanian-deadlift
- hip-thrust (Barbell Hip Thrust): hip-thrust
- glute-bridge (Glute Bridge): glute-bridge
- dumbbell-glute-bridge (Dumbbell Glute Bridge): dumbbell-glute-bridge
- barbell-glute-bridge (Barbell Glute Bridge): barbell-glute-bridge
- back-extension (Back Extension): back-extension
- superman (Superman): superman
- nordic-curl (Nordic Hamstring Curl): nordic-hamstring-curl
- lying-leg-curl (Lying Leg Curl): lying-leg-curl
- seated-leg-curl (Seated Hamstring Curl): seated-leg-curl

Kuit en heup:
- standing-calf-raise (Standing Calf Raise): standing-calf-raise
- bodyweight-calf-raise (Bodyweight Calf Raise): calf-raise
- single-leg-calf-raise (Single Leg Calf Raise): single-leg-calf-raise
- seated-calf-raise (Seated Pin-Loaded Machine Calf Raise): seated-calf-raise
- leg-press-calf-raise (Pin-Loaded Leg Press Calf Raise): leg-press-calf-raise
- hip-abduction-machine (Hip Abduction Machine): hip-abduction-machine
- hip-abduction-band (Banded Hip Abduction): banded-standing-hip-abduction
- lateral-band-walk (Banded Lateral Walk): banded-lateral-walk
- side-lying-hip-abduction (Side Lying Hip Abduction): side-lying-hip-abduction
- cable-hip-abduction (Cable Hip Abduction): cable-standing-hip-abduction
- hip-adduction-machine (Hip Adduction Machine): hip-adduction-machine
- copenhagen-plank (Copenhagen Plank): copenhagen-plank

Romp:
- plank (Plank): plank
- side-plank (Side Plank): side-plank
- dead-bug (Dead Bug): dead-bug
- hanging-leg-raise (Hanging Leg Raise): hanging-leg-raise
- cable-crunch (Cable Crunch): cable-crunch
- pallof-press (Pallof Press): pallof-press
- farmers-carry (Farmer's Carry): farmer-carry
- ab-wheel-rollout (Ab Wheel Rollout): ab-wheel

Duwen:
- bench-press (Barbell Bench Press): bench-press
- incline-bench-press (45° Incline Barbell Press): incline-bench-press
- dumbbell-bench-press (Dumbbell Bench Press): dumbbell-bench-press
- pause-dumbbell-bench-press (Pause Dumbbell Bench Press): dumbbell-bench-press
- incline-dumbbell-press (45° Incline Dumbbell Press): incline-dumbbell-press
- close-grip-bench-press (Close Grip Bench Press): close-grip-bench-press
- push-up (Push-Up): push-up
- machine-chest-press (Pin-Loaded Machine Chest Press): machine-chest-press
- cable-fly (Horizontal Cable Fly): cable-fly
- pec-deck-fly (Pec Deck Fly): pec-deck
- dip (Dips): dip
- overhead-press (Barbell Overhead Press): overhead-press
- push-press (Barbell Push Press): push-press
- dumbbell-shoulder-press (Seated Dumbbell Overhead Press): seated-dumbbell-press
- machine-shoulder-press (Pin-Loaded Machine Shoulder Press): machine-shoulder-press
- lateral-raise (Standing Dumbbell Lateral Raise): lateral-raise
- single-arm-cable-lateral-raise (Single Arm Cable Lateral Raise): cable-lateral-raise
- rear-delt-fly (Reverse Fly): rear-delt-fly
- face-pull (Cable Face Pull): face-pull

Trekken:
- pull-up (Pull-Up): pull-up
- chin-up (Chin-Up): chin-up
- assisted-pull-up (Neutral Grip Machine-Assisted Pull-Up): assisted-pull-up
- lat-pulldown (Underhand Grip Cable Lat Pulldown): lat-pulldown
- straight-arm-pulldown (Cable Rope Straight Arm Lat Pulldown): straight-arm-pulldown
- barbell-row (Bent-Over Underhand Grip Barbell Row): barbell-row
- dumbbell-row (Single Arm Dumbbell Row): one-arm-dumbbell-row
- chest-supported-row (Chest-Supported Dumbbell Row): chest-supported-row
- seated-cable-row (Seated Cable Row): seated-row
- machine-row (Overhand Grip Pin-Loaded Machine Row): machine-row
- inverted-row (Inverted Row): inverted-row
- shrug (Dumbbell Shrug): dumbbell-shrug

Armen:
- dumbbell-curl (Dumbbell Curl): bicep-curl
- hammer-curl (Hammer Curl): hammer-curl
- machine-preacher-curl (Pin-Loaded Machine Preacher Curl): preacher-curl
- triceps-pushdown (Cable V-Bar Triceps Pushdown): tricep-pushdown
- overhead-triceps-extension (Overhead Triceps Extension): overhead-tricep-extension

Bij een paar hiervan klopt de greep niet precies (lat-pulldown en barbell-row heten in ASCEND onderhands, het plaatje is waarschijnlijk bovenhands; een pauze zie je niet op een tekening). Dat is voor een plaatje dat de beweging laat zien geen bezwaar, mits het grote blad dat niet anders beweert.

### Bijna: 28 van de 120

Hier is een plaatje van dezelfde beweging, maar niet van precies deze oefening. Voorstel: alleen tonen met een korte regel eronder die zegt wat anders is ("Op het plaatje zonder rugzak"), of niet tonen; dat is een keuze voor de eigenaar.

- step-up-pack (Weighted Step-Up): step-up, zonder rugzak
- step-down-pack (Weighted Step-Down): step-down, zonder rugzak
- eccentric-squat (Eccentric Squat): bodyweight-squat, de vertraging zie je niet
- leg-press-quad-biased (Pin-Loaded Quad-Biased Leg Press): leg-press, andere voetstand
- seated-single-leg-curl (Seated Single Leg Hamstring Curl): seated-leg-curl, met twee benen
- weighted-roman-chair-back-extension (Weighted Roman Chair Back Extension): back-extension, zonder gewicht
- weighted-ghd-hip-hinge (Weighted Glute Ham Developer Hip Hinge): back-extension, ander toestel
- glute-ham-raise (Glute Ham Raise): nordic-hamstring-curl, zonder toestel
- dumbbell-frog-pump (Dumbbell Frog Pump): frog-pump, zonder gewicht
- decline-weighted-sit-up (Decline Weighted Sit-Up): decline-sit-up, zonder gewicht
- horizontal-cable-chop (Horizontal Cable Chop): cable-woodchop, schuin in plaats van horizontaal
- barbell-rollout (Barbell Rollout): ab-wheel, met een wiel in plaats van een stang
- low-incline-barbell-press (Low Incline Barbell Press): incline-bench-press, steilere bank
- low-incline-dumbbell-press (Low Incline Dumbbell Press): incline-dumbbell-press, steilere bank
- low-incline-dumbbell-fly (Low Incline Dumbbell Fly): dumbbell-fly, vlakke bank
- wide-grip-bench-press (Wide Grip Bench Press): bench-press, gewone greep
- low-to-high-cable-fly (Low-To-High Cable Fly): incline-cable-fly, nog nakijken of de kabels laag beginnen
- chest-supported-dumbbell-y-raise (Chest-Supported Dumbbell Y-Raise): prone-y-raise, liggend zonder gewicht
- chest-supported-dumbbell-high-row (Chest-Supported Dumbbell High Row): chest-supported-row, ellebogen lager
- bent-over-barbell-high-row (Bent-Over Barbell High Row): barbell-row, ellebogen lager
- cable-high-row (Cable Rope High Row): face-pull, de trekrichting lijkt erop
- machine-row-plates (Overhand Grip Plate-Loaded Machine Row): machine-row, ander toestel
- single-arm-cable-lat-pulldown (Single Arm Cable Lat Pulldown): lat-pulldown, met twee armen
- negative-chin-up (Negative Chin-Up): negative-pull-up, andere greep
- barbell-curl (Barbell Curl): ez-bar-curl, gebogen stang (staat al als alias)
- dumbbell-preacher-curl (Dumbbell Preacher Curl): preacher-curl, op het toestel
- incline-hammer-curl (Incline Hammer Curl): incline-dumbbell-curl, andere handstand
- snatch-grip-shrug (Snatch Grip Shrug): dumbbell-shrug of shrug, smalle greep

### Ontbreekt: 7 van de 120

- spanish-squat (Spanish Squat): geen squat met een band achter de knieën.
- tibialis-raise (Tibialis Raise): niet in de set (nagekeken, het bestand bestaat niet).
- tibialis-raise-loaded (Weighted Tibialis Raise): idem.
- machine-torso-rotation (Machine Torso Rotation): geen draaitoestel; russian-twist is een andere oefening.
- kelso-shrug (Pin-Loaded Row Machine Kelso Shrug): niet in de set, en ook niet in een andere vrije bron gevonden.
- dumbbell-pullover (Dumbbell Pullover): niet gevonden.
- reverse-nordic-curl (Reverse Nordic Curl): niet gevonden.

Opvallend: juist een paar oefeningen die voor de bergen belangrijk zijn (tibialis, Spaanse squat, reverse nordic) ontbreken. Precies daar helpt de eigen spierkaart uit hoofdstuk 3, en eventueel later een eigen tekening in dezelfde stijl.

Ter vergelijking: wger heeft 383 beelden voor een veel grotere lijst, dus voor ASCEND een veel kleinere dekking in een gemengde stijl. free-exercise-db zou de lijst bijna helemaal dekken, maar valt af om de herkomst.

## 3. Een eigen spierkaart

Kan ASCEND per oefening zelf een plaatje tonen? Ja, en het meeste gereedschap is er al.

Wat er is:
- Het figuur van Lichaam in de lijnstijl van de iconen, voor en achter, met alle vormen uit `data/bodyFigure.ts`.
- `MiniBody` tekent dat figuur klein (44 bij 97 px per kant) met plekken zacht gekleurd in drie sterktes. Dat is precies de vorm van een spierkaart.
- `SpotThumb` snijdt het figuur bij tot de plekken die ertoe doen (72 bij 80 px). Dat is precies wat een klein plaatje in een rij nodig heeft, want het hele figuur is op rijhoogte te smal om iets te lezen.
- Elke oefening heeft al primaire en secundaire spiergroepen (19 groepen), dezelfde die het volume tellen.

Wat er mist: de plekken van Lichaam zijn plekken om een klacht aan te wijzen, geen spieren. Voor 12 van de 19 spiergroepen is er een plek die goed genoeg past (quadriceps op dij, hamstrings op ham, glutes op bil, calves op kuit, tibialis op scheen, lower_back op onderrug, core op buik, chest op borst, upper_back op bovenrug, front_delts op schouder voor, forearms op pols en onderarm, traps op nek achter en bovenrug). Voor 7 groepen moet er een eigen vlak bij: biceps, triceps, lats, side_delts en rear_delts (er is geen schouderplek op de achterkant), hip_adductors (binnenkant dij) en hip_abductors (buitenkant heup). Die nieuwe vlakken horen niet in `bodySpots.ts`, want dan worden het ook tikplekken op Lichaam. Ze horen in een eigen gegevensbestand, bijvoorbeeld `data/muscleRegions.ts`, met per spiergroep een of meer vormen op hetzelfde vlak van 200 bij 440.

Hoe groot is het werk (afgeleid, schatting):
- Gegevens: 19 spiergroepen naar vormen, waarvan 12 de bestaande plekken hergebruiken. Ongeveer een halve dag tekenen en schuiven, met Cartographer erbij.
- Een pure functie, bijvoorbeeld `engine/muscleMap.ts#muscleMarks(exercise)`: primair sterk, secundair zacht, en welke kant (voor of achter) de meeste primaire spieren heeft. Met tests: elke oefening geeft minstens één mark, elke spiergroep heeft een vorm. Een paar uur.
- Een component die `Body`, de gloed en de uitsnede van `SpotThumb` hergebruikt. Een paar uur.
- Samen ongeveer één tot twee dagen voor Sherpa, plus de gewone poorten.

Is het een goede eerste laag? Ja, om vier redenen. Het werkt altijd, ook voor de 7 oefeningen zonder tekening en voor elke oefening die later bijkomt, zonder een byte extra. Het kost geen licentie. Het past vanzelf bij de stijl, omdat het hetzelfde figuur is als op Lichaam en Vandaag. En het zegt iets wat een tekening niet zegt: welke spieren dit vooral vraagt, in dezelfde taal als de telling van het volume.

Wat het niet doet: het laat niet zien hoe je de beweging maakt. Daarvoor zijn de tekeningen.

Een eigen pictogram in stijl C per oefening is geen goed idee: 120 tekeningen die op 24 px van elkaar te onderscheiden moeten zijn, is veel werk en lukt voor de varianten (lage of steile bank, pauze, een of twee armen) niet. Per bewegingspatroon (15 patronen in `models/exercise.ts`) kan wel, maar dat voegt naast een spierkaart weinig toe.

Over de kleur, als voorstel voor Cartographer: `MiniBody` gebruikt nu salie voor "hard gewerkt". Voor een oefening ligt de kleur van kracht (`--color-sport-strength`) meer voor de hand, met de primaire spieren vol en de secundaire in de lichte tint (`--pic-light`). Niet mint, want dat is actie en voortgang.

## 4. Advies

### De combinatie

1. Klein in de rij: de eigen spierkaart, bijgesneden tot het deel van het lichaam dat werkt, ongeveer 40 bij 44 px. Altijd aanwezig, nul bytes, nul licentie.
2. Bij aantikken (het menublad dat de aanwijzingen nu al toont): bovenaan de drie tekeningen van Workout Guide naast elkaar, start, midden en eind, in de kleur van kracht; daaronder de spierkaart groot met de namen van de spieren (`MUSCLE_LABEL`), en dan de aanwijzingen die er al staan.
3. Video: geen eigen video's. Hooguit, net als bij Rekken, een link naar een video die buiten de app opent, via het veld `videoUrl` dat al bestaat. Dat is een aparte, latere keuze.

Waarom drie tekeningen naast elkaar en geen animatie: in CLAUDE.md staat dat er geen lus mag draaien behalve de adem van de missiekaart. Drie beelden naast elkaar laten de beweging ook zien en werken in Normaal, Rustig en Uit hetzelfde. Een tik op een beeld kan het groot tonen.

### Hoe het in de repo en de app komt (voorstel voor Sherpa)

- Alleen de beelden van de oefeningen die ASCEND gebruikt, niet de hele set: ongeveer 85 tot 105 oefeningen, maar veel delen een slug (squat, leg-press, back-extension), dus ongeveer 90 unieke sets van drie.
- Per oefening één klein bestand met de drie paden als tekst, bijvoorbeeld `public/exercise-art/squat.json` met drie `d`-waarden, en in React tekenen als `<path fill="currentColor" fillRule="evenodd" d=... />`. Dan volgt de kleur de tokens, ook op de nachtlucht, en er staat geen kleurwaarde in een bestand. De `fill="#fff"` weghalen en de getallen afronden is een aanpassing; die bestanden blijven dus CC BY-SA 4.0, met een eigen `LICENSE.md` en `ATTRIBUTION.md` in die map.
- De koppeling als gegevens: een veld op `Exercise`, bijvoorbeeld `art?: { slug: string; match: 'zeker' | 'bijna'; note?: string }`, gevuld in `data/exercises.ts`, met een test dat elk bestand bestaat. De koppeling in hoofdstuk 2 is het startpunt.

### Grootte voor de PWA

Een beeld is nu 10 tot 17 KB, dus een oefening ongeveer 40 tot 50 KB en 90 oefeningen samen ongeveer 4 MB (afgeleid). Met de getallen afgerond op hele eenheden (op 512 px is dat onzichtbaar) wordt dat naar schatting een derde tot de helft kleiner, en de server stuurt het ingepakt; over de lijn is het dan ongeveer 1 tot 1,5 MB (afgeleid, nog te meten).

Twee manieren:
- Alles in de precache, zodat het vanaf de installatie offline werkt. Dat maakt de eerste installatie en elke update waarin de beelden veranderen 1 tot 1,5 MB groter. De beelden veranderen bijna nooit, dus na de eerste keer kost het niets.
- Pas laden als je een oefening opent, met een bewaarregel in de service worker (eerst uit de cache), en op de achtergrond vooraf de oefeningen van je eigen programma. Kleiner, maar de eerste keer zonder netwerk zie je bij een nieuwe oefening alleen de spierkaart.

Advies: de tweede, met het vooraf laden van de oefeningen in je templates bij het openen. De spierkaart vangt het gat altijd op, dus er is nooit een leeg vlak. Let op: de huidige `globPatterns` in `vite.config.ts` nemen alle `svg` en `png` mee in de precache; de map met tekeningen moet daar dus uitdrukkelijk buiten blijven als voor de tweede manier gekozen wordt (daarom ook JSON in plaats van losse SVG).

### Naamsvermelding

CC BY-SA 4.0 vraagt de naam van de makers, de licentie, een link naar de licentie, waar redelijk een link naar het werk, en of je iets veranderd hebt; dat mag op elke redelijke manier die bij het medium past, ook met een link naar een plek waar alles staat ([artikel 3(a)](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en)).

Voorstel:
- In het blad van de oefening, onder de drie tekeningen, één regel in 12 px gedempt: "Tekening: Everkinetic en Bryl Lim, CC BY-SA 4.0, aangepast". Als link (die blijft onderstreept, zoals elke bronlink buiten de app) naar de bronpagina in de app.
- In Instellingen, Gidsen en kennis, de rij Bronnen (`engine/sourceLibrary.ts`) een eigen soort "Afbeeldingen" met Workout Guide en Everkinetic, de licentie, de link naar de repo's en de zin "Kleur en detail aangepast voor ASCEND".
- In de repo de map met tekeningen met `LICENSE.md` (de tekst van CC BY-SA 4.0 of een link), `ATTRIBUTION.md` met de drie namen en wat er veranderd is, en een regel in de README.

### Instelling

Volgens de werkafspraken krijgt dit een instelling, met het advies als standaard: "Plaatjes bij oefeningen" met de keuzes Spierkaart en tekening (advies), Alleen spierkaart, Uit. Eventueel een tweede: "Bij een andere variant toch een tekening tonen" (aan of uit), voor de groep bijna. Ook in `settingsIndex.ts`, `settingsLayout.ts` en `settingsSummary.ts`.

## 5. Wat nog onzeker is

- De beelden van Workout Guide heb ik in de code bekeken, niet met het oog. Cartographer moet een proefblad maken met tien oefeningen op marine, in de kleur van kracht, op 360 px, en zeggen of het silhouet bij stijl C past of te druk is.
- De groep "zeker" is op naam gekoppeld. Elk van de 85 moet een keer met het oog worden nagelopen voordat hij in de code komt; een verkeerd plaatje is erger dan geen plaatje.
- Of de drie beelden altijd start, midden en eind zijn, staat nergens zwart op wit.
- De bestandsgrootte na afronden en inpakken is een schatting.
- Het juridische deel (deel-gelijk, verzameling of bewerking) is mijn lezing van de licentietekst en geen juridisch advies. De ASCEND-repo heeft zelf geen licentiebestand; dat verandert niets aan de plicht om de tekeningen te vermelden.
- free-exercise-db: als de maker de foto's ooit vervangt door eigen, vrije beelden, kan dit opnieuw bekeken worden. Nu niet.

## In het kort

Wat het onderzoek zegt: de enige bron die gratis is, offline mag, in een openbare repo mag en in één nette stijl is, is Workout Guide (de vernieuwde Everkinetic-tekeningen, 302 oefeningen, drie SVG-beelden elk, CC BY-SA 4.0). free-exercise-db valt af om de onbekende herkomst van de foto's, ExerciseDB en MuscleWiki verbieden opslaan en vragen een abonnement of een server, wger is te gemengd.

Wat het betekent voor de app: een eigen spierkaart (het figuur van Lichaam met de werkende spieren gekleurd) als eerste laag die altijd werkt, en bij aantikken de drie tekeningen in de kleur van kracht. 85 van de 120 oefeningen hebben een tekening die klopt, 28 een tekening van een variant, 7 geen (onder meer tibialis, Spaanse squat en Kelso shrug).

Wat nog onzeker is: hoe de tekeningen er op marine uitzien, of elke koppeling klopt bij nakijken, en de precieze grootte na inpakken.
