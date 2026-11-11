# Ontwerp: het Info-blad van een training

Status: voorstel van Cartographer, 11 november. Er is geen code gewijzigd.

Aanleiding, de eigenaar op 11 november: "Dat infomenu is kut. En dat moet gewoon een hele refactor krijgen, een hele UI en UX verandering." De Datavelden voor zijn horloge stonden in dat menu en hij kon ze nauwelijks vinden. Hij vroeg om te kijken waar het in de app logisch hoort.

Gelezen: CLAUDE.md, `docs/architectuur/ontwerp-en-tokens.md`, `docs/werkbriefjes/bediening-en-beweging.md`, de stemgids, de tekstkaarten `training-blad`, `vandaag`, `week`, `datavelden`, `instellingen`, de twee eerdere ontwerpen (`docs/ontwerp/uitlegblad-training.md`, `docs/ontwerp/datavelden-horloge.md`), de besluiten over datavelden (9 november) en trainingen naar het horloge (22 oktober), en de code van `TrainingGuideSheet`, `guideMenu`, `GuideRow`, `ExerciseLogger`, `TodayMissionCard`, `SessionActionSheet`, `WatchStatusRow`, `WatchSetupGuide`, `WatchFields` en `engine/watchFields.ts`.

## 1. Wat er nu is

### Hoe je er komt

Hetzelfde blad heeft vier namen en vijf wegen.

- Vandaag, missiekaart: het rondje met drie puntjes rechtsboven opent een menu, daarin "Meer over deze training". Twee tikken.
- Vandaag, Gedaan: opent het trainingsscherm met het formulier. Onderaan staat de knop "Info". Twee tikken, en je bent al aan het invullen.
- Week, een training: het blad van die training heeft een i-knopje naast de titel (voorgelezen als "Meer over deze training"). Twee tikken.
- Week, Hoe je het doet: opent het trainingsscherm om alleen te lezen, met onderaan "Info". Drie tikken.
- Forge, het menu van de workout: "Uitleg bij deze training". Drie tikken.

Wie de datavelden zoekt, moet daarna nog voorbij vier tekstdelen scrollen, de groep "Waar en waarmee" vinden en de vierde rij kiezen. Die rij verlaat het blad en opent een pagina. Vanuit het trainingsscherm sluit je daarmee ook het trainingsscherm zelf. Elders staat de pagina alleen bij Garmin koppelen, onderaan bij Je horloge instellen, en in de Instellingen onder Koppelingen, Geavanceerd.

### Wat erin staat

Bovenaan: de dag, de naam en het soort training (`SessionHeader`), dan de regels voor weer, heuvels, route en kleding, dan vier tekstdelen: Waarom, Je tempo, Zo voelt elk tempo en Wat het vraagt van je lichaam.

Daaronder het menu van 10 november, in drie groepen:

- Wat je doet: De stappen (onderblad), Te zwaar? Zo pas je het aan (onderblad).
- Waar en waarmee: Waar train je het best? (onderblad), Waar kun je dit doen? (pagina Plekken), Stappen voor je Garmin (onderblad), Datavelden voor je horloge (pagina).
- Achtergrond: Deze fase, week voor week (onderblad), Achtergrond en bronnen (onderblad, met de Garmin-opmerking die naar Garmin koppelen gaat).

Onderaan staat nog een knop Sluiten.

### Waar dezelfde informatie elders staat

Per onderdeel, met de plek waar het ook staat.

- Weer, heuvels, route en kleding: ook op de missiekaart van Vandaag; de route ook op het trainingsscherm. Dubbel. Alleen voor een latere dag (vanuit Week) staat het weer nergens anders.
- Waarom: het trainingsscherm heeft een eigen doelzin onder de titel (`brief.purpose`). Bijna dubbel, andere woorden.
- Je tempo: op Vandaag staat een tempozin onder de getallen (`paceNote`). Op het trainingsscherm niet als zin. Half dubbel.
- Zo voelt elk tempo: elke stap op het trainingsscherm zegt al zwaarte, zone en praattest. Dubbel.
- Wat het vraagt van je lichaam: nergens anders.
- De stappen: precies dezelfde stappen staan op het trainingsscherm onder "Zo doe je het", met het profiel erboven. Dubbel. Het blad is zelfs vanaf dat scherm te openen.
- Te zwaar? Zo pas je het aan: het trainingsscherm heeft "Stop of schakel terug als", uit een andere bron. Verwant, niet dubbel.
- Waar train je het best?: het trainingsscherm heeft de keuze "Waar train je?" met één zin per plek. De volledige uitleg staat alleen hier.
- Waar kun je dit doen?: alleen hier en via Instellingen, Gidsen, Plekken.
- Stappen voor je Garmin: alleen hier. Daarnaast stuurt ASCEND dezelfde workout vanzelf naar het horloge als intervals.icu gekoppeld is; die stand staat op het trainingsscherm en op Vandaag (`WatchStatusRow`). Twee vormen van hetzelfde ding op twee plekken die niets van elkaar weten.
- Datavelden voor je horloge: hier, bij Garmin koppelen en diep in de Instellingen. Nergens bij de training zelf in beeld.
- Deze fase, week voor week: alleen hier.
- Achtergrond en bronnen: alleen hier. De link naar hartslagzones instellen staat er verstopt tussen.

### Waarom het niet werkt

1. Het blad beantwoordt drie vragen tegelijk (wat doe ik, hoe zet ik mijn horloge klaar, waarom doe ik dit) en geen ervan als eerste.
2. De helft is dubbel met het trainingsscherm. Vanaf dat scherm open je dus een blad dat grotendeels herhaalt wat eronder staat.
3. Het horloge is verdeeld over drie plekken: de stand op het trainingsscherm, de Garmin-stappen in een onderblad, de datavelden op een pagina die je uit de training haalt.
4. De knop heet "Info", "Meer over deze training", een i of "Uitleg bij deze training". Niemand verwacht achter "Info" iets wat je moet doen voordat je vertrekt.
5. Het nuttige staat onder de vouw: eerst vier tekstdelen, dan pas de rijen.

## 2. Waar elk onderdeel hoort

Ik ga uit van de vraag die je op dat moment hebt.

Voor de training, op Vandaag of de avond ervoor in Week: wat doe ik, hoe lang, hoe hard, waar en wat trek ik aan. Dat is het trainingsscherm. Daar horen de stappen, het profiel, je tempo, het weer en de kleding, de plek waar je traint en de plekken in de buurt.

Het horloge klaarzetten, vlak voor vertrek of de avond ervoor: staat de workout erop, en zo niet, hoe zet ik hem erop; welke datavelden horen bij deze loop. Dat is een eigen blad, Je horloge, dat je vanaf de training met één tik opent.

Tijdens de training: bij een loop of tocht kijk je naar je horloge, niet naar de app. In Forge is het workoutscherm zelf het antwoord. Het blad hoeft hier niets te doen.

Als je tijd hebt, of iets wilt snappen: waarom deze training, wat ze vraagt van je lichaam, waar ze in de fase valt, wat je doet als het te zwaar is, en de bronnen. Dat is het Uitleg-blad, de opvolger van Info.

Vaste plek voor de datavelden en de Garmin-workout: het blad Je horloge. Het opent onderaan het trainingsscherm met de knop "Horloge", in het blad van een training in Week met de rij "Je horloge", en op Vandaag in het menu achter de drie puntjes. De datavelden staan daar als tekst in beeld (welke velden op welke pagina); de pagina met de tekening is voor kijken en aanpassen.

## 3. Drie richtingen

Alle schetsen op 390 px breed, ongeveer 780 px hoog. Een blad is hoogstens 90 procent hoog, dus ongeveer 700 px; boven de vouw betekent binnen die 700 px zonder scrollen.

### Richting A: drie plekken, drie vragen

Het trainingsscherm wordt de plek voor wat je doet. Een nieuw blad Je horloge is de plek voor het horloge. Info wordt Uitleg, met alleen wat je wilt begrijpen.

Trainingsscherm (onderaan veranderd, bovenaan bijna gelijk):

```
[ lucht met bergen                          ]
[ <  EYEBROW soort training             (i) ]
[    Lange duurloop                         ]
[    doelzin                                ]
[    Zo 1 november · week 3 van 8           ]
+--------------------------------------------+
| 50          5,5                            |
| minuten     km                             |
| zonebalk, Zone 2. Praten kan.              |
| Zon, 9 graden. Lange mouw.                 |
+--------------------------------------------+
ZO DOE JE HET
| stappen ...                                |
| Je tempo: 6:10 tot 6:30 per km             |
WAAR TRAIN JE?
| keuze ...                                  |
+--------------------------------------------+
| Eerst opwarmen              6 oefeningen > |
| Route voorstellen                        > |
| Waar kun je dit doen?          Pagina    > |
| (horloge) Staat op je horloge sinds 07:12  |
+--------------------------------------------+
STOP OF SCHAKEL TERUG ALS
...
------------------------------------------------
[ Horloge ]  [ v Gedaan, invullen            ]
```

De i rechtsboven opent Uitleg. Onderaan staat links "Horloge" in plaats van "Info".

Blad Je horloge:

```
[ greep ]
ZO 1 NOVEMBER                              X
Je horloge

WORKOUT
| (horloge) Staat op je horloge sinds 07:12  |
|--------------------------------------------|
| Zelf nabouwen in Garmin Connect          > |
| Hardlopen, 5 stappen                       |

DATAVELDEN · LANGE DUURLOOP
Pagina 1: Hartslagzone, Hartslag, Timer
Pagina 2: Rondetempo, Afstand, Gemiddeld tempo
Pagina 3: Cadans, Tijd
Hartslag groot, want daar stuur je op.
| Bekijken en aanpassen          Pagina    > |

| Hartslagzones op je horloge    Pagina    > |
```

Alles staat boven de vouw (ongeveer 480 px).

Blad Uitleg:

```
[ greep ]
ZO 1 NOVEMBER                              X
Lange duurloop
Hardlopen · 50 min

WAAROM
Twee zinnen uit het plan.

WAT HET VRAAGT VAN JE LICHAAM
Hart en longen   ===--  gemiddeld
Benen            ==---  licht

| Te zwaar? Zo pas je het aan              > |
| Waar train je het best?                  > |
| 3 opties                                   |
| Deze fase, week voor week                > |
| Week 3 van 8                               |
| Achtergrond en bronnen                   > |
| 4 delen, 2 bronnen                         |
```

Ook dit staat boven de vouw (ongeveer 560 px). Geen groepskoppen meer: vier rijen hebben ze niet nodig.

Voordelen:
- Elke plek beantwoordt één vraag, en de knop zegt welke.
- De datavelden zijn één tik vanaf de training en twee vanaf Vandaag of Week, en je ziet ze zonder de training te verlaten.
- De Garmin-workout heeft één plek: de stand en het zelf nabouwen staan onder elkaar.
- Niets dubbel meer tussen het trainingsscherm en de uitleg.
- Hergebruikt bijna alles: `Sheet`, `GuideRow`, `WatchStatusRow`, de inhoud van de onderbladen.

Nadelen:
- Twee bladen in plaats van één, en de bouwer raakt vier aanroepers.
- Weer en kleding komen op het trainingsscherm erbij; vanaf Vandaag zie je ze dan twee keer (missiekaart en trainingsscherm).
- De knop onderaan heet bij een loop "Horloge" en bij een training zonder iets voor het horloge "Uitleg" of "Annuleren". Dat wisselt per training.

### Richting B: één blad met drie delen

Info blijft één blad, maar bovenaan staat een `Segmented` met drie delen: Doen, Horloge, Waarom. Elke ingang heet "Over deze training". Vanaf het trainingsscherm opent het blad op Horloge, elders op Doen.

```
[ greep ]
ZO 1 NOVEMBER                              X
Lange duurloop
[  Doen  |  Horloge  |  Waarom  ]

(Doen)    stappen, tempo, weer, waar
(Horloge) workout, datavelden als tekst
(Waar.)   waarom, lichaam, fase, te zwaar, bronnen
```

Voordelen:
- Eén blad, één naam, één gebaar.
- Het horloge is een deel met een eigen naam, dus vindbaar.

Nadelen:
- Doen herhaalt het trainingsscherm, dus de dubbeling blijft.
- Drie delen met een heel verschillende lengte: het blad springt in hoogte bij elk wisselen.
- Een gekozen segment is mint; samen met de rest van het blad wordt het lastig om bij één accent te blijven.
- De eigenaar zei liever aparte bladen dan delen die wisselen; een segment is een zachtere vorm van uitklappen.

### Richting C: geen blad, alles op het trainingsscherm

Het Info-blad verdwijnt. Het trainingsscherm krijgt onderaan twee kaarten: Horloge (de stand, zelf nabouwen, de datavelden als tekst) en Achtergrond (Waarom, lichaam, fase, te zwaar, bronnen als rijen die een onderblad openen). Vandaag krijgt in het menu "Hoe je het doet", dat het scherm opent om te lezen.

```
... trainingsscherm zoals nu ...
HORLOGE
| Staat op je horloge sinds 07:12            |
| Zelf nabouwen in Garmin Connect          > |
| Pagina 1: Hartslagzone, Hartslag, Timer    |
| ...                                        |
ACHTERGROND
| Waarom deze training                     > |
| Deze fase, week voor week                > |
| Achtergrond en bronnen                   > |
HOE GING HET?
...
```

Voordelen:
- Eén plek voor alles over een training; geen knop om te zoeken.
- Minste bladen.

Nadelen:
- Het trainingsscherm wordt veel langer en het formulier zakt verder weg. Op Vandaag springt Gedaan meteen naar het formulier, dus daar zie je de horlogekaart niet eens.
- Lezen en invullen lopen door elkaar op één scherm.
- Forge heeft een eigen workoutscherm; daar moet de uitleg alsnog een blad blijven. Dan zijn er toch twee vormen.

## 4. Advies

Richting A. Het probleem is niet de opmaak van het menu maar dat het blad drie vragen mengt en de helft van het trainingsscherm herhaalt. A haalt die vragen uit elkaar, geeft het horloge een eigen naam en plek, en maakt de uitleg kort genoeg om zonder scrollen te lezen. B lost de vindbaarheid op maar houdt de dubbeling; C maakt het trainingsscherm te lang en werkt niet voor Forge.

## 5. Richting A uitgewerkt

### Trainingsscherm (`ExerciseLogger`)

Van boven naar beneden:

1. Lucht (`SkyBand variant="low"`), terugknop, eyebrow, naam, doelzin, datum. Nieuw: rechts naast de naam een `InfoButton` met het label "Uitleg bij deze training" (alleen als er een gids is). Het tikdoel is 44 bij 44 px; de knop is niet de compacte variant.
2. De kaart met de kerngetallen en de zone of het profiel, zoals nu. Nieuw eronder: `WeatherLine` en `ClothingAdvice` in de compacte vorm, en `HillsNearbyLine`, met de datum van de training. Ze verhuizen uit het blad; de regels zelf veranderen niet.
3. Versie (Segmented), Kracht in MacroFactor: ongewijzigd.
4. Zo doe je het: ongewijzigd. Nieuw: de zin Je tempo (uit `paceLine`) onder de stappen, als die er is en de kerngetallen het tempo nog niet noemen. De bouwer controleert dat in `brief.facts`.
5. Waar train je?: ongewijzigd.
6. De lijst met rijen (opwarmen, rekken, route, horloge): nieuw is de rij "Waar kun je dit doen?" met het woord "Pagina" rechts, onder dezelfde voorwaarde als nu (`showSpots`). De horlogestand (`WatchStatusRow`) blijft waar hij staat; als er iets misging moet je dat zien zonder te tikken.
7. Kracht, Stop of schakel terug als, Hoe ging het?: ongewijzigd.
8. Onderbalk: links "Horloge" als het blad Je horloge iets te tonen heeft; anders "Uitleg" als er een gids is; anders "Annuleren", zoals nu. Rechts ongewijzigd. In de leesstand (een latere dag vanuit Week): "Horloge" en "Sluiten".

Eén mint accent: de hoofdknop onderaan blijft de enige gevulde mint knop. "Horloge" is een `SecondaryButton`, mint omlijnd, zoals "Info" nu.

### Blad Je horloge (nieuw)

Gebouwd op `Sheet` uit `src/components/settings/Sheet.tsx` (dus `useSheetClose`, `ref={sheetRef}`, `SheetGrip`). Eyebrow: de dag (`guideDayLabel`). Titel: "Je horloge".

Van boven naar beneden:

1. Groep Workout (kop als `Eyebrow`).
   - De stand: `WatchStatusRow` met `plain`, zoals op het trainingsscherm. Daar zitten ook Nu versturen en Opnieuw. Staat "Laten zien of het gelukt is" uit, dan valt deze regel weg.
   - Niet gekoppeld: één zin "Deze workout staat nog niet op je horloge." en de rij "Vanzelf laten sturen" met "Pagina", naar Garmin koppelen.
   - De rij "Zelf nabouwen in Garmin Connect", met eronder het soort en het aantal stappen ("Hardlopen, 5 stappen"). Opent een onderblad met de bestaande uitleg en regels (nu "Stappen voor je Garmin"). Alleen als `plan.garmin` bestaat.
   - Geen workout voor het horloge (kracht, rustdag, wedstrijd): "Deze training zet je niet op je horloge." en de groep heeft verder niets.
2. Groep Datavelden, met de soort in de kop ("Datavelden · Lange duurloop").
   - Per pagina één regel: "Pagina 1: Hartslagzone, Hartslag, Timer". Dat zijn de regels die `watchSteps` al maakt, zonder het menupad.
   - De zin waarom van de eerste pagina, in gedempte inkt.
   - De rij "Bekijken en aanpassen" met "Pagina", naar `/horloge/datavelden?soort=`.
   - Geen advies voor deze soort: "Voor deze training heb ik geen advies." met dezelfde rij, die dan opent op Zone 2.
   - Instelling Datavelden uit: de groep valt weg.
3. De rij "Hartslagzones op je horloge" met "Pagina", naar Garmin koppelen bij Je horloge instellen. Dit is de Garmin-opmerking die nu onder Achtergrond verstopt zit; alleen als de gids die opmerking heeft.

Welke versie van de datavelden staat in de regels? Het advies, tenzij de eigenaar een eigen versie heeft. Er is nu geen "deze staat op mijn horloge"; zie de vragen. Tot die keuze er is: het advies, met de regel "Je hebt ook een eigen versie." als die bestaat.

Staten:
- Leeg: heeft het blad niets (geen workout, geen datavelden, geen zones-opmerking), dan bestaat de knop "Horloge" niet en ook de rij in Week en Vandaag niet. Een leeg blad kan dus niet openen.
- Laden: de datavelden en de Garmin-regels zijn lokaal en staan er meteen. De stand komt uit `useWatchStatuses` en laadt zoals nu; de regel verschijnt als hij er is en houdt de rest niet tegen.
- Fout: versturen heeft al een grens van 30 seconden en een zichtbare uitkomst in `WatchStatusRow`. Kunnen de eigen versies niet gelezen worden, dan tonen de regels het advies.

### Blad Uitleg (was Info, `TrainingGuideSheet`)

Van boven naar beneden:

1. Greep, de dag en het kruisje, de naam en het soort (`SessionHeader`): ongewijzigd.
2. Waarom: ongewijzigd.
3. Wat het vraagt van je lichaam: ongewijzigd.
4. Eén lijst zonder groepskop, met hoogstens vier rijen: Te zwaar? Zo pas je het aan; Waar train je het best?; Deze fase, week voor week; Achtergrond en bronnen. Dezelfde `GuideRow` en dezelfde onderbladen als nu.
5. Sluiten onderaan: blijft, om niets te verschuiven.

Weg uit dit blad: weer, heuvels, route en kleding (naar het trainingsscherm), Je tempo (naar het trainingsscherm), Zo voelt elk tempo (staat bij elke stap), De stappen (staan op het trainingsscherm), Waar kun je dit doen? (naar het trainingsscherm), Stappen voor je Garmin en Datavelden (naar Je horloge). De Garmin-opmerking verhuist ook naar Je horloge.

Staten: een training zonder plan toont alleen kop, en wat er van Waarom en de rijen is. Is er helemaal niets, dan bestaat de knop niet (zoals nu: alleen met een gids). Geen laden of fout: alles is lokaal.

### Week, het blad van een training (`SessionActionSheet`)

- Het i-knopje naast de titel blijft, met het label "Uitleg bij deze training".
- In de kaart Andere keuzes, direct na "Hoe je het doet": de rij "Je horloge", met als regel eronder de stand als die er is ("Staat op je horloge sinds 07:12"), anders "Workout en datavelden". Alleen voor een training die nog moet komen en waarvoor het blad iets heeft. Een gedane of overgeslagen training krijgt de rij niet.

### Vandaag, het menu achter de drie puntjes (`TodayMissionCard`)

- "Meer over deze training" heet voortaan "Uitleg bij deze training".
- Nieuw, als tweede rij: "Je horloge". Het menu sluit eerst en dan opent het blad, zoals de andere rijen (`afterMenu`).
- De missiekaart zelf verandert niet. Dit wijkt af van het besluit van 9 november ("Niets op Vandaag"); het staat in een menu en niet op de kaart, maar ik vraag het de eigenaar.

### Forge

"Uitleg bij deze training" in het menu van de workout opent het nieuwe Uitleg-blad. Geen horloge: kracht gaat niet naar het horloge en heeft geen advies voor datavelden.

### Beweging en terugknop

- Beide bladen komen met `animate-sheet-in` en gaan met `animate-sheet-out`, zoals elk blad. In Rustig en Uit staan ze meteen op de eindstand.
- Elke rij en knop die een blad opent krijgt `data-sheet-from`; een rij met "Pagina" niet.
- Terug sluit eerst het onderblad, dan Je horloge of Uitleg, dan het trainingsscherm. Eén geschiedenisstap per laag, via `useSheetClose`.
- Een rij met "Pagina" sluit eerst de lagen en navigeert pas daarna. Terug vanaf die pagina brengt je naar Vandaag of Week, niet terug in het blad. Omdat de datavelden nu als tekst in het blad staan, hoef je die pagina alleen nog te openen om iets aan te passen.

### Teksten

Nieuw: "Je horloge", "Horloge" (knop), "Uitleg" (knop), "Uitleg bij deze training" (rij en label), "Zelf nabouwen in Garmin Connect", "Vanzelf laten sturen", "Bekijken en aanpassen", "Hartslagzones op je horloge", "Deze workout staat nog niet op je horloge.", "Deze training zet je niet op je horloge.", "Je hebt ook een eigen versie.", "Workout en datavelden". Hergebruikt: "Voor deze training heb ik geen advies.", "Pagina", "Sluiten", de regels van `watchStatusLine`.

### Wat dit bewust niet doet

- Geen nieuwe kleur, letter of token, geen eigen kaart- of knopopmaak.
- Geen tekening van het horloge in een blad: die blijft op de eigen pagina (besluit 9 november).
- Geen uitklapblokje en geen segmenten.
- Niets nieuws op de missiekaart van Vandaag.
- Geen nieuwe inhoud: alles bestaat al en verhuist alleen. De teksten van de gids en het plan blijven gelijk.
- Geen terugkeer in het blad na een pagina.
- Geen nieuwe instelling. Wat er in het blad staat volgt de bestaande schakelaars (Datavelden voor je horloge, Laten zien of het gelukt is, Trainingen naar je horloge). Het is de opbouw van een scherm, geen keuze die de app voor je maakt.
- De planning verandert nergens; het blad plant niets.

## 6. Voor de bouwer

### Bestanden

- `src/engine/watchSheet.ts` (nieuw): een pure functie die zegt wat het blad Je horloge toont: de workout (gestuurd, niet gekoppeld, zelf nabouwen, geen), de datavelden (staat, soortnaam, regels per pagina, of er een eigen versie is), de zones-rij, en `hasWatchSheet` voor de knop en de rijen. Leest `watchKindOf`, `watchAdvice`, `watchSteps`, `watchFieldsShown`, `resolveWatchModel`, `plan.garmin` en de stand. De component tekent alleen.
- `src/components/WatchSheet.tsx` (nieuw): het blad op `Sheet`, met `GuideRow` (of `SheetRows`/`SheetRow`) voor de rijen en `WatchStatusRow` voor de stand. Het onderblad Zelf nabouwen neemt de Garmin-code over uit `TrainingGuideSheet`.
- `src/engine/guideMenu.ts`: de rijen `stappen`, `plekken`, `garmin` en `datavelden` eruit, en één groep zonder titel (of een platte lijst). De invoer krimpt mee.
- `src/components/TrainingGuideSheet.tsx`: de regels voor weer, heuvels, route en kleding eruit, Je tempo en Zo voelt elk tempo eruit, de onderbladen voor stappen en Garmin eruit, de Garmin-opmerking eruit, de navigatie naar plekken en datavelden eruit. `WorkoutSteps` mag dan weg als niemand hem meer gebruikt. De properties blijven gelijk, zodat de aanroepers niet breken.
- `src/components/GuideRow.tsx`: zonder groepskop als de groep geen titel heeft.
- `src/components/ExerciseLogger.tsx`: `InfoButton` in de lucht, weer, kleding en heuvels in de eerste kaart, Je tempo onder de stappen, de rij plekken in de lijst, de knop onderaan (Horloge, Uitleg of Annuleren), en het nieuwe blad.
- `src/components/SessionActionSheet.tsx`: label van de i, de rij Je horloge, het nieuwe blad.
- `src/components/TodayMissionCard.tsx`: de naam van de rij en de rij Je horloge.
- `src/components/forge/ForgeSheets.tsx`: niets, behalve dat het Uitleg-blad kleiner is.

### Wat niet mag bewegen

- `src/storage/planGolden.test.ts`: de planning blijft gelijk.
- `src/data/trainingGuide.ts`, `buildWorkoutPlan`, `buildSessionBrief`: geen wijziging.
- De pagina `/horloge/datavelden`, de route, `?soort=`, en `engine/watchFields.ts` zelf: alleen lezen.
- `WatchStatusRow` en het versturen: alleen hergebruiken.
- De voorwaarden `showSpots`, `watchFieldsShown`, `hasModalities` en die van de horlogestand.
- De missiekaart van Vandaag.
- `SettingsList` en `settings/Sheet.tsx`: alleen hergebruiken.

### Instellingen

Er komt geen instelling bij. Wat wel geraakt wordt:

- `src/data/settingsHelp.ts`, de uitleg bij `datavelden`: één zin erbij dat je ze bij elke loop onder Horloge ziet.
- `src/data/settingsIndex.ts`: bij `datavelden` en `datavelden-bekijken` de zoekwoorden "je horloge" en "workout" erbij.
- Alleen als de eigenaar ja zegt op vraag 3: `datavelden-bekijken` verhuist in `src/data/settingsLayout.ts` van Koppelingen, Geavanceerd naar Gidsen (daar staan vier rijen, er is ruimte), met `src/components/settings/groups/GidsenGroup.tsx`. `engine/settingsSummary.ts` blijft gelijk (de rij heeft geen waarde). De test in `src/data/settingsLayout.test.ts` regel 140 tot 146 verwacht nu Geavanceerd van Koppelingen en moet dan bewust mee.

### Tests

- Nieuw: `src/engine/watchSheet.test.ts`: een loop met advies en Garmin-stappen, een loop zonder koppeling, kracht (geen blad), datavelden uit, een soort zonder advies, een eigen versie, de stand uit.
- `src/engine/guideMenu.test.ts`: bijwerken voor de kleinere lijst.
- `src/components/trainingGuideSheet.scan.test.ts`: het aantal onderbladen gaat van zes naar vier; de test telt nu precies zes en moet bewust mee. Nieuw: een scan dat `WatchSheet.tsx` door `Sheet` gaat, geen eigen kleuren heeft en het onderblad met eyebrow "Uitleg" opent.
- Altijd mee: `src/components/sheetDrag.scan.test.ts`, `src/components/randOnder`, `src/components/silentCatch`, `src/utils`, `src/engine/workoutPlan.test.ts`, `src/engine/watchFields.test.ts`, `src/engine/sessionActions.test.ts`.
- `npm run kaart:vergelijk`: de kaarten van het trainingsblad, Vandaag en de training veranderen; elk verschil verklaren. Nieuwe invarianten voorstellen: "elke ingang naar de uitleg van een training heet Uitleg" en "de stappen van een training staan op één scherm".
- Lookout: 360 en 390 px, de terugknop door drie lagen, Rustig en Uit, en controleren dat beide bladen zonder scrollen passen.

### Valkuilen

- Het trainingsscherm is zelf een laag. Een rij met "Pagina" vanuit Je horloge moet alle lagen sluiten voordat er genavigeerd wordt (werkbriefje bediening, Nooit). Het concept van het formulier blijft bewaard, maar het open scherm niet.
- `WatchStatusRow` geeft `null` als de stand uit staat of er niets te melden is; de groep Workout moet dan nog kloppen.
- Een losse training (zonder geplande sessie) heeft geen stand; het blad toont dan alleen zelf nabouwen en de datavelden.

### Losse sporen

Dit kan los van elkaar en in deze volgorde:

1. Het blad Je horloge met `watchSheet.ts`, en de knop Horloge op het trainingsscherm. Dit lost de klacht al op.
2. De rij Je horloge in Week en in het menu op Vandaag.
3. Het Uitleg-blad opschonen (dubbelingen eruit, de i in de lucht, de namen gelijk), met weer, kleding, heuvels, tempo en plekken naar het trainingsscherm.
4. Alleen na ja van de eigenaar: Datavelden bekijken naar Gidsen.
5. Alleen na ja van de eigenaar: een keuze op de pagina Datavelden "Deze staat op mijn horloge", zodat het blad die versie toont. Dat is een nieuw optioneel veld in `watchFieldVersions` (zonder migratie, wel in `backupClean`), met een rij in de instellingenbestanden als het een keuze wordt.

## Samenvatting

Het Info-blad mengt drie vragen en herhaalt de helft van het trainingsscherm. Het voorstel splitst het in drie plekken. Het trainingsscherm zegt wat je doet. Een nieuw blad Je horloge zegt welke workout op je horloge staat en welke datavelden je zet, met de velden als tekst in beeld. Het Uitleg-blad zegt waarom. Je opent Je horloge met de knop Horloge onderaan het trainingsscherm, met een rij in Week en met een rij in het menu op Vandaag. Alles bestaat al en verhuist alleen; er komt geen kleur, token of instelling bij.

## Vragen voor de eigenaar

1. Mag Je horloge in het menu achter de drie puntjes op Vandaag? Het besluit van 9 november zei "niets op Vandaag". Advies: ja, want de missiekaart zelf blijft gelijk.
2. Welke datavelden staan echt op je horloge: het advies of een eigen versie? Advies: eerst het advies tonen, en later een knop "Deze staat op mijn horloge" op de pagina Datavelden, zodat het blad jouw versie laat zien.
3. Moet Datavelden bekijken in de Instellingen naar Gidsen, naast Plekken en Bronnen, in plaats van onder Koppelingen, Geavanceerd? Advies: ja, dan vind je hem ook zonder training.
4. Gebruik je het vanzelf versturen via intervals.icu, of zet je de workout zelf in Garmin Connect? Advies: het blad toont beide; maar als je alleen zelf nabouwt, zet ik die rij bovenaan.
5. Weer en kleding verhuizen naar het trainingsscherm. Vanaf Vandaag zie je ze dan op de missiekaart en op het trainingsscherm. Is dat goed, of liever alleen in de leesstand (een latere dag)? Advies: altijd, want het hoort bij "wat trek ik aan".
