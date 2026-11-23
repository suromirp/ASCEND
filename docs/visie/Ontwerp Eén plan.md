# Ontwerp Eén plan

Backlogpunt I-14 (D. Eén plan). Wat een voorstel, Vandaag, Week en de weekbalk zeggen, komt uit één afleiding van het plan, met één duur per training en één stem per aanleiding. Planning blijft deterministisch en zonder AI. Dit is een ontwerp; er is niets nagespeeld. Code gelezen op de tak claude/ontwerp-bundel-9 (gelijk aan main, 23 november 2026). Bouwt voort op `docs/onderzoek/Planning op een lijn.md` (één schrijver, weekcontrole), `docs/visie/Ontwerp Week minimaal.md` (één functie, één venster) en `docs/visie/Ontwerp Je dag.md`.

## 1. De vier symptomen in de code

### A. Het eerste voorstel: een herstelwandeling die nergens staat, twee keer kracht bij één

Bestaat nog, in twee delen.

- Twee keer kracht. Met een richting zonder doel zegt het voorstel `Je week: N minuten en 2 keer kracht` uit `src/engine/directionChange.ts:25`. Dat getal komt uit het weekbudget van de richting (`budgetFor`, `src/data/directions.ts:55` en `:66` zetten 2). De dagen in het voorstel komen uit een andere functie: `src/engine/firstPlan.ts:254` noemt `week.kept` uit `chooseWeekShape`, en `src/engine/weekShape.ts:96` geeft bij drie dagen of minder één krachttraining. Het advies voor Fit blijven is drie dagen, dus de standaardkeuze geeft al "2 keer kracht" naast één krachtdag. De weekbalk en de weekmeter tellen daarna ook tegen 2 (`src/engine/weekBudget.ts:179`).
- De herstelwandeling. `src/engine/weekShape.ts:219` zet `tpl_herstel` op de rustdag in de vorm van de week, maar niet in `kept`, dus de zin met de dagen noemt hem niet. Het voorbeeld van het plan (`src/storage/horizonPlan.ts:152`, `settledPreview`) laat hem wel zien als toegevoegde rij met de sjabloonnaam Herstelwandeling (`src/data/defaultProgram.ts:314`). Week noemt dezelfde rij daarna Rustdag (een recovery telt niet als training, `src/pages/Week.tsx:151`; de weekbalk tekent een rustpoppetje, `src/components/vandaag/WeekStrip.tsx:91`). Daarnaast rekent het voorbeeld zonder het krachtblok en zonder je beschikbare dagen: die schrijft `applyHorizonPlanNow` pas na de planningsinstellingen (`src/storage/horizonPlan.ts:395` tot `:413`), en de opstartstappen beschikbaarheid, krachtcontrole en weekplanning (`src/state/boot.ts:165`) draaien helemaal buiten het voorbeeld. Of de rij echt verdwijnt of alleen anders heet, beslist het naspelen in stap 1.

### B. Vandaag, Week en de weekbalk noemen verschillende trainingen

Bestaat nog, als bouw: drie plekken kiezen elk zelf wat er op een dag staat, met een gekopieerd filter.

- Vandaag: `src/pages/Today.tsx:168` filtert de dag, ordent met `dayOrder` en kiest de missie op `:188` (niet gedaan, niet overgeslagen, mag bij ziekte).
- Week: `src/pages/Week.tsx:119`, hetzelfde filter, maar laat overgeslagen rijen staan en houdt een gedane training op zijn geplande dag (`weekRow.ts#doneOnOtherDay`).
- Weekbalk: `src/components/vandaag/WeekStrip.tsx:81` tot `:93` met `src/engine/weekLogs.ts:148`, zet een gedane training op de dag van uitvoeren, verbergt overgeslagen, sorteert op duur en toont er hoogstens twee.

Gevolgen die nu kunnen: een training van morgen die je vandaag deed staat in de balk onder vandaag met een vinkje, in Week op morgen en op Vandaag niet; bij ziekte valt een training van de missie af maar staat hij in Week en in de balk; bij twee trainingen op een dag kiest Vandaag de volgorde van `dayOrder`, de balk de langste. Dat de balk de dag van uitvoeren volgt is een besluit (`docs/beslissingen/2026-11-23-telt-op-dag-van-uitvoeren.md`) en blijft; het verschil moet alleen uit één afleiding komen en zichtbaar zijn.

### C. "Deze week nog een keer?" noemt 60, 55 en 50 minuten voor dezelfde loop

Bestaat nog. De tekst van het voorstel (`src/engine/adviceBlock.ts:50`) rekent de sleuteltraining met `loadAt` in `src/engine/repeatWeek.ts:154` tot `:158`, en dat is `progressionTarget` (`src/engine/programLayout.ts:479`): de kale stap van het schema, zonder vaste lengte, ambitie, hoeveel per soort en de rem van 110%. Zo ontstaan "55 in plaats van 60" en de zwaarste week (`costSentence`, `repeatWeek.ts:283` tot `:289`). Week, de weekbalk, Vandaag en de regels van het voorstel zelf rekenen met `resolveEffectiveFullDuration` (`src/engine/substitutions.ts:216`, via `src/storage/weekLoadPlan.ts:65`, `src/components/WeekLoadCards.tsx:60` en `src/pages/Week.tsx:139`), en daar komt met de rem 50 uit. Drie getallen, twee functies.

### D. Na een zware test: "je benen zijn dan fris" naast "rustig houden"

Bestaat nog. Twee regels lezen hetzelfde log, los van elkaar:

- HARD-THEN-SPACE (`src/engine/adviceLoad.ts:20`) reageert op elke loop met zwaarte 8 of meer, dus ook op een testloop, die hoort zwaar te zijn. Zonder zware beendag morgen zegt hij "Houd het de komende dag rustig" (`:37`), anders "rustig houden (RPE 3-4)" (`:47`).
- TEST-RETRY (`src/engine/adviceCompute.ts:61` tot `:64`) stelt bij veel stilstand of twijfel een nieuwe poging voor, minstens drie dagen later, met "zodat je benen vrijdag fris zijn" (`:127`).

Beide komen uit `computeAdvice` (`adviceCompute.ts:508` en `:532`) met hetzelfde `relatedLogId`; er is geen regel "één stem per log". Elke zin klopt op zich, samen lezen ze als tegenspraak.

## 2. Eén bron van waarheid

Eén regel: tekst volgt het plan, nooit andersom. Een zin noemt alleen wat de afleiding van het plan oplevert, met dezelfde naam en hetzelfde getal als Week.

- Eén dagbeeld. Nieuw `src/engine/dayPlan.ts` met `weekPlan(weekStart, ctx)`: per dag de rijen (sessie, sjabloon, naam, minuten, stand uit `deriveSessionStatus` met de pauzes, open concept en programmastart) en per dag de missie (`primary`, met `dayOrder` en de ziekteregel uit `dayRules`). Vandaag leest `weekPlan(...).days[today].primary`, Week leest de rijen, de weekbalk leest dezelfde rijen met een tweede plaatsing `executedOn` uit `countDayOf`. Het gekopieerde filter (recovery overgeslagen, `leave.role` dropped) staat dan op één plek.
- Eén duur. Nieuw `plannedMinutesOf(session, template, program)`: `plannedMinutes` van de rij, anders `resolveEffectiveFullDuration`. Alles wat minuten noemt gaat hierdoor: dagbeeld, voorstellen, de herhaalde week. Voor een voorstel dat de duur zelf verandert rekent dezelfde functie in de proefstand van dat voorstel (`withDurationScope`, het programma van `withWeekRepeated`). `costSentence` leest dan de regel van de sleuteltraining uit `repeatWeekChange` in plaats van `progressionTarget`.
- Eén voorbeeld. Het eerste voorstel en elk ander voorstel uit `computeHorizonPlan` krijgen hun zinnen over de week uit `run.after` van het voorbeeld: dagen, aantal krachtdagen, rustdag. Het voorbeeld krijgt het krachtblok en de beschikbare dagen mee (`HorizonOverrides`), zodat het rekent wat Akkoord schrijft. `directionChangeLines` noemt het budget als doel ("je richting vraagt 2 keer kracht") en apart wat er past.
- Eén stem per aanleiding. Na `computeAdvice` een stap `oneVoicePerLog`: twee adviezen met hetzelfde `relatedLogId` worden er één, met de zwaarste als kop en de ander als zin. HARD-THEN-SPACE telt een test of wedstrijd niet (die heeft eigen rust, `testRest`), zie vraag 1.

Wat dit niet doet: geen nieuwe schrijver in de planning, geen ander moment van plannen, niets in `planPass` of de weekcontrole. Alleen afleiding en tekst.

## 3. Invarianten als tests

1. Wat een voorstel noemt, staat daarna in Week. Na Akkoord op het eerste plan (fake-indexeddb, plus één opstart met beschikbaarheid, krachtcontrole en weekplanning): elk sjabloon dat de regels noemen staat in `weekPlan` van de eerste volle week, en het aantal krachtdagen in de tekst is het aantal in Week. Voor elke richting en 2 tot 6 dagen.
2. Voorbeeld is uitkomst. `computeHorizonPlan` en daarna `applyHorizonPlanNow` plus één opstart: de eerste twee weken verschillen niet van `run.after`.
3. Eén dag, één antwoord. Over willekeurige standen (ziek, twee op een dag, gedaan op een andere dag, overgeslagen, concept open): de missie op Vandaag is een open rij van Week op die dag, en de balk toont dezelfde rijen, behalve wat `executedOn` verplaatst; dat verschil staat in beide met een woord ("gedaan di 27").
4. Eén getal per training. Elk getal in minuten in een voorstel is na Akkoord het getal van die rij in Week (herhaalde week, inhalen korter, TEST-RETRY korter, rustiger instap).
5. Eén stem. Geen twee adviezen op Vandaag met hetzelfde `relatedLogId`; na een testloop met zwaarte 9 geen HARD-THEN-SPACE.
6. Scan. Geen bestand in `src/pages/` of `src/components/vandaag/` filtert `plannedSessions` zelf op `scheduledDate === today`; een nieuwe plek gaat door `weekPlan`.
7. Golden. `src/storage/planGolden.test.ts` A en C bewegen niet in geen enkele stap; ze toetsen de planning, en die verandert hier niet.

## 4. Wat met Akkoord moet

Niets in dit ontwerp verandert de planning zelf, dus er komt geen nieuw voorstel bij. Wel:

- Het eerste voorstel blijft een voorstel met Akkoord; het laat alleen eerlijker zien wat het schrijft.
- Kiest de eigenaar bij vraag 2 dat het plan de richting volgt (een tweede krachtdag), dan is dat een verandering van de planning en komt hij alleen via het voorstel van de richting, nooit stil achteraf.
- Een samengevoegd advies (één stem) houdt de knoppen en het Akkoord van het advies dat een wijziging heeft; een advies zonder wijziging wordt een zin.

## 5. Stappenplan

Elke stap een eigen tak vanaf main, los te leveren, met `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`, `npx vitest run`, `npm run build` en `npm run kaart:vergelijk`.

1. `claude/een-plan-naspelen`. Skill naspelen met nagemaakte standen voor de vier personae (beginner, GR5, hardloper), `primePlanningRegisters()` en `TZ=Europe/Amsterdam`. Invarianten 1 tot 5 als tests die nu falen, gemarkeerd met `it.fails`. Uitkomst: welke van A zich echt voordoet (weg of anders genoemd). Risico laag, alleen tests; Warden kijkt de standen na.
2. `claude/een-plan-minuten`. `plannedMinutesOf` en `costSentence` uit `repeatWeekChange`. Tests: invariant 4 voor de herhaalde week, `src/engine/repeatWeek.test.ts` met rem en ambitie. Risico middel (engine, tekst van een voorstel): Warden en Lookout.
3. `claude/een-plan-een-stem`. `oneVoicePerLog` en HARD-THEN-SPACE zonder test of wedstrijd (na vraag 1). Tests: invariant 5, de grensdag van TEST-RETRY met een zware test ervoor. Risico middel (adviezen): Warden en Lookout.
4. `claude/een-plan-eerste-voorstel`. Zinnen uit `run.after`, krachtblok en beschikbaarheid in het voorbeeld, de rustdag met hetzelfde woord als Week. Tests: invarianten 1 en 2, `src/engine/firstPlan.test.ts`, golden B mag alleen bewegen met de reden in de commit, A en C niet. Risico hoog (opslag en planner): Warden en Lookout.
5. `claude/een-plan-dagbeeld`. `engine/dayPlan.ts`, Vandaag, Week en de weekbalk erop, de scan van invariant 6. Tests: invariant 3 over willekeurige standen, `src/engine/weekTelling.test.ts`, de tekstkaart met elk verschil verklaard. Risico hoog (drie schermen): Warden en Lookout, Pathfinder voor de samenhang van Vandaag en Week.

Volgorde 1, 2, 3, 4, 5: de kleine tekstfouten eerst, het dagbeeld als laatste omdat het het meeste raakt.

## 6. Vragen voor de eigenaar

1. HARD-THEN-SPACE na een testloop. Advies: niet bij een test of wedstrijd, want die hoort zwaar te zijn en heeft eigen rust. Anders: wel, en dan wacht TEST-RETRY een dag. Zonder antwoord: het advies.
2. Een richting met 2 keer kracht en drie dagen. Advies: de tekst volgt het plan ("1 keer kracht; je richting vraagt 2, met een vierde dag past het"). Anders: het plan volgt de richting en een loop wordt kracht, via het voorstel. Zonder antwoord: het advies.
3. De herstelwandeling op de rustdag in het eerste voorstel. Advies: noemen met het woord van Week, "Rustdag ma, wandelen mag". Anders: weglaten uit het voorstel. Zonder antwoord: het advies.
4. De herhaalde week. Advies: één getal, dat van deze week zoals Week het toont, de zwaarste week alleen als die ook verandert. Anders: altijd beide. Zonder antwoord: het advies.
