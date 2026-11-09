# Uitleg bij oefeningen en open bronnen

Onderzoek door Scout Calisthenics, 8 november 2026. Twee vragen: welke open bronnen voor oefeningen, vaardigheden en progressies ASCEND mag gebruiken, en hoe een goede, korte Nederlandse uitleg per oefening eruitziet, als basis voor een proef van vijf teksten door Scribe. Hoort bij de backlogpunten "Forge: uitleg bij oefeningen" en "Calisthenics, los of naast krachttraining". Er is geen code veranderd.

Gelezen vooraf, en hier niet herhaald: *Afbeeldingen bij oefeningen* (Workout Guide, Everkinetic, free-exercise-db, wger, ExerciseDB en MuscleWiki als bron van beelden), *Kracht loggen en progressie* (hoofdstuk 4 over open databases), `public/exercise-art/ATTRIBUTION.md`, het besluit over de stem (`docs/beslissingen/2026-10-27-stem-van-ascend.md`) en de huidige aanwijzingen in `src/data/exercises.ts` (drie regels per oefening: Doen, Let op, Vaak fout). Het zusterverslag is *Calisthenics in apps en wetenschap*.

Hoe zeker: **zeker** (bij de bron zelf gelezen, of meerdere studies), **waarschijnlijk** (één studie of een tweede partij), **gok** (praktijk of eigen afleiding). Wat hieronder over licenties staat is een praktische lezing, geen juridisch advies.

## 1. In het kort

1. De tekeningen van Workout Guide, die ASCEND al gebruikt, dekken een groot deel van calisthenics: een hele push-upladder (muur, schuin, knie, gewoon, voeten hoog, diamond, archer, pike, handstand push-up), optrekken (dead hang, active hang, scapular, negatief, pull-up, met gewicht), dips, pistol en shrimp squat, hollow body en L-sit. Een front lever, planche, muscle-up, vrije handstand en steunhouding vond ik niet (zeker voor wat er staat, waarschijnlijk voor wat ontbreekt).
2. wger is de enige open database met tekst onder een open licentie (CC-BY-SA 3 of 4 per oefening en per vertaling). Bruikbaar als controle en als bron van varianten; een tekst die op een wger-tekst is gebaseerd, moet onder dezelfde licentie met naamsvermelding (zeker voor de licenties, gok voor waar "gebaseerd op" begint).
3. free-exercise-db blijft af als bron van tekst en beeld, om de onbekende herkomst (al vastgesteld). De velden niveau, mechaniek en kracht mogen als controle (zeker dat de herkomst onbekend is).
4. De wiki van r/bodyweightfitness heeft geen open licentie. De ladders zelf (welke oefening na welke) zijn kennis die je in eigen woorden mag gebruiken; de tekst niet overnemen, en de bron als dank noemen (gok, praktische lezing).
5. Een goede uitleg heeft een vaste opbouw: hoe je begint, hoe de beweging gaat, tempo en adem, de fouten die je echt ziet, en lichter of zwaarder. NSCA-handboeken en apps als Hevy doen het zo (zeker voor de opbouw).
6. Voor ASCEND: bovenaan "In het kort" met drie regels, daaronder "Lees verder" van hoogstens ongeveer 120 woorden. Taal die een beeld geeft van het resultaat ("duw de vloer weg") mag, maar is geen wondermiddel: het bewijs ervoor is na correctie voor publicatiebias zwak (waarschijnlijk).

## 2. Open bronnen voor oefeningen en progressies

### Workout Guide en Everkinetic (de tekeningen die er al zijn)

Wat er al in ASCEND staat: de tekeningen uit Workout Guide van Bryl Lim, op de poses van Everkinetic, onder CC BY-SA 4.0, aangepast (drie beelden per bestand, kleur weg, getallen afgerond), met de vermelding in `public/exercise-art/ATTRIBUTION.md` en in de app onder elke tekening (zeker).

Nieuw nagekeken in het manifest van Workout Guide ([manifest](https://raw.githubusercontent.com/bryllim/workout-guide/main/packages/workout-guide/manifest.json)), alleen wat voor calisthenics telt. Ik las het manifest in delen; een enkele naam kan ik gemist hebben.

- Duwen: wall-push-up, incline-push-up, knee-push-up, push-up, decline-push-up, wide-push-up, diamond-push-up, archer-push-up, typewriter-push-up, explosive-push-up, hindu-push-up, scapular-push-up, push-up-shoulder-tap, weighted-push-up, pike-push-up, feet-elevated-pike-push-up, wall-handstand-push-up, handstand-push-up, wall-walk.
- Dippen: bench-dip, chair-dip, dip, chest-dip, weighted-dip, assisted-dip.
- Trekken: dead-hang, active-hang, scapular-pull-up, negative-pull-up, pull-up, neutral-grip-pull-up, chin-up, weighted-pull-up, weighted-chin-up, commando-pull-up, l-sit-pull-up, towel-pull-up, assisted-pull-up, inverted-row, doorway-row, towel-row, banded-row.
- Benen: bodyweight-squat, jump-squat, pistol-squat, assisted-pistol-squat, shrimp-squat, sissy-squat, cossack-squat, skater-squat, single-leg-box-squat, nordic-hamstring-curl, wall-sit, single-leg-calf-raise.
- Romp: plank, side-plank, hollow-body-hold, hollow-rock, l-sit-hold, dragon-flag, hanging-knee-raise, hanging-leg-raise, v-up, bear-crawl.

Niet gevonden: front lever (ook tuck en advanced tuck), back lever, planche (ook tuck), muscle-up, vrije handstand, handstand met de buik naar de muur, steunhouding aan de brug of ringen, skin the cat, one-arm push-up, tuck L-sit en een L-sit met steun van de voeten.

Wat mag: dezelfde regels als nu, met dezelfde naamsvermelding. Een eigen tekening van een ontbrekende houding in dezelfde stijl kan op twee manieren. Overgetrokken of samengesteld uit een bestaande pose (bijvoorbeeld de tuck front lever uit de pose van inverted-row en hanging-knee-raise): dat is een bewerking en valt onder CC BY-SA 4.0, met vermelding. Helemaal zelf getekend: eigen werk, maar ook dan zou ik het onder CC BY-SA 4.0 zetten, zodat de hele map één licentie heeft (gok, praktische keuze). In beide gevallen in `ATTRIBUTION.md` per tekening wie hem maakte.

### wger

Wat het is: de open trainingsapp met een open API. De API telt vandaag 954 oefeningen ([exerciseinfo](https://wger.de/api/v2/exerciseinfo/?limit=5)). Elke oefening heeft een licentie en een auteur, en elke vertaling ook, met een eigen geschiedenis van auteurs. In wat ik las kwamen CC-BY-SA 3 en CC-BY-SA 4 voor; de API kent daarnaast CC0, CC-BY 4 en ODbL ([licenties](https://wger.de/api/v2/license/)) (zeker).

Wat er in staat dat voor ASCEND telt: per oefening de naam en een beschrijving per taal, aliassen, notities, primaire en secundaire spieren, materiaal, en een `variation_group` die varianten van dezelfde oefening bij elkaar zet (zeker). Een volgorde binnen die groep (lichter naar zwaarder) heeft het niet, dus een ladder haal je er niet uit (zeker voor het veld, gok dat er ook elders geen volgorde is). Hoeveel calisthenics-vaardigheden erin staan, kon ik niet nagaan: het zoekadres van de API gaf een fout.

Wat mag (praktische lezing):

- Feiten hergebruiken mag altijd: welke spieren, welke varianten bestaan, welk materiaal. Feiten zijn geen tekst.
- Een beschrijving vertalen of dicht op de tekst herschrijven is een bewerking: dan onder CC BY-SA (3.0 mag naar 4.0) met de auteurs uit `author_history` en de vermelding dat het aangepast is.
- Een eigen tekst die alleen met wger is gecontroleerd, is geen bewerking.

Advies: Scribe schrijft vanuit primaire techniekbronnen (hieronder) en eigen kennis, niet vanuit een wger-tekst; wger alleen als controle op spieren en varianten. Zo blijft de uitleg vrij van de deel-gelijk-regel, en hoeft er per oefening geen lijst met auteurs bij. Wordt een tekst toch op wger gebaseerd, dan krijgt hij een veld met bron en licentie en een regel in Bronnen.

### free-exercise-db (yuhonas)

Wat al vaststaat (*Afbeeldingen bij oefeningen*): de repo zelf staat onder de Unlicense, maar de maker weet niet waar de foto's vandaan komen, en de teksten lijken uit een oude commerciële site te komen. Advies blijft: geen tekst en geen foto's overnemen (zeker voor de onduidelijke herkomst). De velden die het per oefening heeft (niveau beginner, gevorderd of expert; mechaniek; kracht duwen of trekken; materiaal "body only") zijn feiten en mogen als controle naast de eigen indeling.

### r/bodyweightfitness

Wat er is: de Recommended Routine met ladders per bewegingspatroon, en pagina's per oefening en vaardigheid in de wiki. Er staat geen open licentie op. Schrijvers houden hun rechten en geven Reddit een licentie om het te tonen ([gebruikersvoorwaarden, archief 2019](https://webarchive.library.unt.edu/web/20191121210518/https://www.reddit.com/help/useragreement)) (zeker voor de voorwaarden van toen; de huidige tekst niet nagelezen).

Wat dat praktisch betekent: de ladders (welke oefening na welke, de regel 3 keer 5 tot 3 keer 8) zijn kennis en praktijk; die gebruik je in eigen woorden en eigen volgorde. De tekst van de wiki neem je niet over en vertaal je niet. Als dank en voor wie meer wil, noemt ASCEND de Recommended Routine in Bronnen met een link (gok, praktische keuze, past bij de eerlijke toon).

### Wat er niet in kan

Zoals al vastgelegd: geen betaalde of sleutel-API's (ExerciseDB via RapidAPI, MuscleWiki). Geen sleutels in de app, en hun voorwaarden laten offline bewaren niet toe (zeker, zie *Afbeeldingen bij oefeningen*).

### Samengevat per bron

- Workout Guide en Everkinetic: tekeningen gebruiken en aanpassen, vermelden, aanpassingen onder CC BY-SA 4.0. Nieuwe tekeningen in dezelfde stijl ook onder die licentie.
- wger: feiten vrij; tekst alleen als bron met licentie en auteurs; liever niet als basis voor tekst.
- free-exercise-db: alleen feiten als controle.
- r/bodyweightfitness: ladders als kennis in eigen woorden, tekst niet, link als dank.

## 3. Hoe goede apps en handboeken uitleg geven

### De opbouw

- Het handboek van de NSCA (*Exercise Technique Manual for Resistance Training*) beschrijft elke oefening in dezelfde volgorde: soort oefening en hoofdspieren, beginstand, de beweging omhoog en de beweging omlaag, met adem, spotten en veiligheid apart. De punten zijn controleerbaar geschreven: wat stil blijft, wat beweegt, waar het eindigt ([uittreksel Nordic hamstring curl](https://us.humankinetics.com/blogs/excerpt/nordic-hamstring-curl), [uittreksel upright row](https://shop.humankinetics.com/blogs/excerpt/upright-row), [NSCA glute ham raise](https://nsca.com/education/articles/kinetic-select/glute-ham-raise)) (zeker voor de opbouw).
- Hevy geeft per oefening stap voor stap de opzet, de techniek en het aanspannen, met een korte animatie, de spieren en het materiaal, te openen met één tik op de naam tijdens het loggen ([Hevy, oefeningen](https://www.hevyapp.com/features/exercise-library/), [Hevy, prestaties](https://www.hevyapp.com/features/exercise-performance/)) (zeker dat ze het zo beschrijven).
- Caliverse toont bij elke oefening de lichtere en zwaardere varianten, met een tik ernaartoe ([blog Caliverse](https://blog.caliverse.app/exercise-progressions-and-regressions/)) (zeker).
- Freeletics zet techniek voor snelheid en vraagt erna of het netjes ging ([Coach-feedback](https://www.freeletics.com/en/blog/posts/coach-feedback/)) (zeker).

Hoe MacroFactor Workouts het doet, staat als aparte vraag in de backlog en is hier niet onderzocht.

### Wat de wetenschap zegt over aanwijzingen

- Aanwijzingen die op het resultaat van de beweging wijzen ("duw de vloer weg", "breng de stang naar je borst") leken in een overzicht van 15 jaar en een meta-analyse beter te werken dan aanwijzingen over je eigen lichaam ("strek je ellebogen") ([Wulf 2013](https://scinapse.io/papers/2044201858); [Chua e.a. 2021](https://digitalscholarship.unlv.edu/kns_fac_articles/424)).
- Een heranalyse die corrigeert voor publicatiebias vond die voordelen na correctie bijna nul, met veel verschil tussen studies ([McKay e.a. 2024](https://experts.mcmaster.ca/scholarly-works/3486012)) (waarschijnlijk).

Wat het betekent: een beeld van het resultaat is prettig te lezen en kort, dus gebruik het waar het vanzelf gaat, maar het is geen regel. Belangrijker is dat een aanwijzing klopt en te controleren is (gok, afgeleid).

### Wat er mis is met de huidige drie regels

Uit de backlog en `src/data/exercises.ts`: drie regels (Doen, Let op, Vaak fout) zijn te kaal en soms fout (bij de 45° Incline Barbell Press staat "een lichte helling"). Er staat geen tempo, geen adem, geen lichter of zwaarder, en de "Doen"-regel probeert beginstand en beweging in één zin te stoppen (zeker, gelezen in de code).

## 4. Voorstel voor een goede Nederlandse uitleg

### De opbouw per oefening

**In het kort** (altijd zichtbaar, drie regels, elk hoogstens ongeveer 60 tekens, volgens de stem):

1. De beweging in één zin, met het eindpunt.
2. Het belangrijkste punt om op te letten.
3. De fout die je het vaakst ziet, en wat je in plaats daarvan doet.

**Lees verder** (achter een tik, hoogstens ongeveer 120 woorden):

- Beginstand: waar handen en voeten staan, wat er aangespannen is. Twee zinnen.
- Beweging: omlaag en omhoog, met waar het eindigt. Twee of drie zinnen.
- Tempo en adem: in gewone woorden ("twee tellen omlaag, rustig omhoog"), geen code als 3010. Eén zin.
- Veelgemaakte fouten: twee, elk met de oplossing erbij.
- Lichter of zwaarder: de stap eronder en erboven, als tik naar die oefening (dit is waar calisthenics en de uitleg samenkomen).
- Spieren: uit het model (`primary`, `secondary`), niet opnieuw in tekst.

Wat er niet in hoort: geschiedenis, beloftes over resultaat, medische claims ("voorkomt blessures"). Bij pijn één vaste zin: "Doet het pijn, stop dan en vraag een arts of fysiotherapeut." Niet bij elke oefening herhalen, wel in het blad.

### Taal

- Je en jij, kort, het feit eerst, geen gedachtestreepjes, geen uitroepen.
- Engelse vaktermen alleen waar een sporter ze zo zegt (push-up, pull-up, RIR, tempo, lockout); verder gewoon Nederlands (schouderbladen, heupen, onderrug).
- Elke aanwijzing te controleren: je moet kunnen zien of voelen of je het doet ("borst raakt bijna de vloer", niet "goede diepte").
- Getallen waar ze helpen: een hoek (45 graden), een tijd (twee tellen), een afstand (een vuist tussen kin en borst).
- Geen letterlijke vertaling uit het Engels. Liever "laat je heupen niet zakken" dan "behoud een neutrale wervelkolom".

### Een voorbeeld (alleen om de vorm te laten zien, techniek nog door Scout te toetsen)

Push-up, In het kort:

- Zak tot je borst bijna de vloer raakt, duw dan terug.
- Lichaam als een plank, van hoofd tot hielen.
- Hangende heupen? Span billen en buik aan.

Lees verder: Handen iets breder dan je schouders, vingers naar voren, voeten bij elkaar. Zak met je ellebogen schuin naar achteren, ongeveer 45 graden van je lichaam, tot je borst een vuist boven de vloer is. Duw de vloer weg tot je armen gestrekt zijn. Twee tellen omlaag, rustig omhoog, adem uit bij het duwen. Vaak fout: ellebogen recht opzij, zet ze dan schuiner naar achteren; je hoofd vooruit, kijk dan een halve meter voor je handen. Te zwaar? Handen op een bank. Te licht? Voeten op een bank.

### De proef van vijf

Voorstel voor de vijf teksten die Scribe als eerste schrijft, zo gekozen dat ze verschillende soorten raken en een bekende fout herstellen:

1. Push-Up: calisthenics, met lichter en zwaarder.
2. Pull-Up: trekken met eigen gewicht, met negatieve en extra gewicht als stappen.
3. Step-Down: belangrijk voor de berg (langzaam omlaag).
4. Barbell Romanian Deadlift: heupscharnier met gewicht, veel fouten in de praktijk.
5. 45° Incline Barbell Press: de tekst die nu fout is.

Werkwijze per tekst, zoals de backlog voorstelt: Scribe schrijft, Scout toetst de techniek aan een primaire bron (het NSCA-handboek of een ander erkend handboek, en waar het bestaat een studie naar de techniek, bijvoorbeeld voor de ellebooghoek bij de push-up), Warden toetst aan de stem. De bron per oefening komt in een kort lijstje in `docs/onderzoek/`, niet in de app.

### Wat het model nodig heeft (voorstel)

In plaats van `cues: string[]` op `Exercise` een optioneel veld `guide` met `short` (drie regels), `setup`, `movement`, `tempo`, `mistakes` (lijst van fout met oplossing), `easier` en `harder` (ids van andere oefeningen), en eventueel `source` met licentie als een tekst toch op een open bron is gebaseerd. `cues` blijft staan zolang niet elke oefening een `guide` heeft. `easier` en `harder` kunnen bij calisthenics uit de ladder komen (zie het zusterverslag), zodat er één bron van waarheid is.

## 5. Afsluiting

**Wat het onderzoek zegt.** De tekeningen die ASCEND al heeft, dekken het grootste deel van calisthenics, maar niet de bekende vaardigheden front lever, planche, muscle-up en vrije handstand. wger is de enige open tekstbron, onder CC-BY-SA, en vooral bruikbaar als controle. free-exercise-db en de wiki van r/bodyweightfitness zijn geen bron van tekst; de ladders van de wiki zijn kennis die je in eigen woorden gebruikt. Goede uitleg volgt een vaste opbouw (beginstand, beweging, tempo en adem, fouten met oplossing, lichter of zwaarder). Aanwijzingen die naar het resultaat wijzen lezen prettig, maar het bewijs dat ze beter werken is zwak.

**Wat het betekent voor de app.** Elke oefening krijgt "In het kort" met drie regels en "Lees verder" van hoogstens 120 woorden, in eigen woorden van Scribe, getoetst door Scout op techniek en door Warden op stem. Lichter en zwaarder zijn tikken naar andere oefeningen, gevoed door de ladders. Ontbrekende tekeningen tekent ASCEND in dezelfde stijl, onder CC BY-SA 4.0, met vermelding. De proef begint met Push-Up, Pull-Up, Step-Down, Romanian Deadlift en de 45° Incline Barbell Press.

**Wat nog onzeker is.** Het manifest van Workout Guide las ik in delen; een enkele naam kan ontbreken of toch bestaan. Hoeveel vaardigheden wger heeft, kon ik niet nagaan. De lezing van de licenties is praktisch, geen juridisch advies. De huidige gebruikersvoorwaarden van Reddit heb ik niet nagelezen, alleen een archief uit 2019. Hoe MacroFactor Workouts zijn uitleg opbouwt, is nog niet onderzocht. Of 120 woorden de goede lengte is, moet de proef met de eigenaar uitwijzen.

## Bronnen

Open bronnen:

- Workout Guide, manifest: https://raw.githubusercontent.com/bryllim/workout-guide/main/packages/workout-guide/manifest.json
- Workout Guide, repo: https://github.com/bryllim/workout-guide
- Everkinetic data: https://github.com/everkinetic/data
- wger, exerciseinfo: https://wger.de/api/v2/exerciseinfo/?limit=5
- wger, licenties: https://wger.de/api/v2/license/
- free-exercise-db: https://github.com/yuhonas/free-exercise-db
- Reddit, gebruikersvoorwaarden (archief 2019): https://webarchive.library.unt.edu/web/20191121210518/https://www.reddit.com/help/useragreement
- CC BY-SA 4.0, licentietekst: https://creativecommons.org/licenses/by-sa/4.0/legalcode.en

Uitleg en techniek:

- NSCA, uittreksel Nordic hamstring curl: https://us.humankinetics.com/blogs/excerpt/nordic-hamstring-curl
- NSCA, uittreksel upright row: https://shop.humankinetics.com/blogs/excerpt/upright-row
- NSCA, glute ham raise: https://nsca.com/education/articles/kinetic-select/glute-ham-raise
- Hevy, oefeningen: https://www.hevyapp.com/features/exercise-library/
- Hevy, prestaties per oefening: https://www.hevyapp.com/features/exercise-performance/
- Caliverse, progressies en regressies: https://blog.caliverse.app/exercise-progressions-and-regressions/
- Freeletics, feedback aan de Coach: https://www.freeletics.com/en/blog/posts/coach-feedback/

Onderzoek naar aanwijzingen:

- Wulf 2013, aandacht en motorisch leren: https://scinapse.io/papers/2044201858
- Chua e.a. 2021, meta-analyse externe focus: https://digitalscholarship.unlv.edu/kns_fac_articles/424
- McKay e.a. 2024, heranalyse met correctie voor publicatiebias: https://experts.mcmaster.ca/scholarly-works/3486012

Eigen stukken waarop dit voortbouwt: *Afbeeldingen bij oefeningen*, *Kracht loggen en progressie*, *Calisthenics in apps en wetenschap*, `public/exercise-art/ATTRIBUTION.md` en `docs/beslissingen/2026-10-27-stem-van-ascend.md`.
