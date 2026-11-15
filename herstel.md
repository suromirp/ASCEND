# Warden: herstelopdracht beginner heel licht (vierde ronde)

Branch `claude/beginner-licht`, commit `2bab43f`, nagekeken tegen de vorige uitslag (`warden/beginner-herstel-3`). 15 november 2026.

Uitslag: **Akkoord.** Geen blokkerend punt, geen punt dat moet, zes die mogen. De regelnummers zijn die van `2bab43f`.

## De punten van de vorige ronde

- Blokkerend 1, sprong 35 naar 50 bij het eerste eigen log na een start zonder logs: **opgelost.** Nagespeeld per dag en met drie mutaties getoetst, zie hieronder.
- Moet 2, het eerste voorstel leest de opgeslagen keuze Beginnersstart niet: **opgelost in de engine.** `buildFirstPlan` leest de bewaarde keuze als er geen antwoord is (`src/engine/firstPlan.ts` regel 246), met dezelfde toets als de planning (`src/storage/databaseHorizon.ts` regel 93). De mutatie "bewaarde keuze genegeerd" wordt gedood. De draad vanuit de wizard is niet getoetst, punt 3 hieronder.
- Moet 3, de test met de bodem: **opgelost.** De test rekent nu met een start van 30 naast een eigen loop van 35 en verwacht 40 bij een bodem van 50 (`src/engine/afterBeginnerStart.test.ts` regel 101). De mutatie van de vorige ronde ("de bodem ook naast de start") laat nu deze test omvallen, met vier andere.
- Mag 4: half. `durationScopeFor` is getoetst en de mutatie wordt gedood; `setPlanningRegisters` zonder het register overleeft nog, punt 4 hieronder.
- Mag 5: gedaan, het register begint op Gewoon (`src/engine/substitutions.ts` regel 121). De golden rekent met de bewaarde opbouw en de foto is niet bewogen.
- Mag 6: gedaan in het werkbriefje. Eén getal daar klopt niet, punt 1 hieronder.
- Mag 7: gedaan, beide mutaties worden nu gedood.

## De overgangen tussen de drie takken, nagespeeld

Programma uit `afterBeginnerStart.test.ts` (heel licht, bodem lang 50, kort 30, plan lang 96). Per dag van week 5 tot en met week 11 gevraagd wat de eerstvolgende zondag en donderdag vragen, met `recentSessionMaxima` op die dag. Dertien verlopen.

De week waarin het eerste eigen log binnenkomt:

- Start niet gelogd, elke week gedaan wat gevraagd werd: lange duurloop 35, 40, 45, 50, 55, 60, 65. Rustige duurloop 25, 30, 35, 40. Geen sprong, nergens boven het plan. Dit was blokkerend 1.
- Start niet gelogd, eerste eigen log pas in week 7 (35 gedaan waar 45 gevraagd was): week 8 vraagt 50, dat is de bodem en ook de maat van het plan. Geen sprong ten opzichte van wat er al stond.
- Start gelogd, daarna het plan gevolgd: 35, 40, 45, 50, 55, 60. De dag waarop het laatste log van de start uit de 30 dagen valt (woensdag van week 9) verandert niets: de eigen loop van 50 geeft 55, de bodem is 50.
- Start alleen in week 1 en 2 gelogd (ziek in week 3 en 4), daarna gevolgd: 35, 40, 45, 50, 55. Het log van week 2 valt op woensdag van week 7 weg; de week erna gaat van 45 naar 50, de zondag van die week blijft 45.
- Niets gelogd, ook niet na de start (ziek overgeslagen en niet begonnen): 35, 40, 45, 50, 55, 60, 65, elke maandag vijf erbij. Dat is de maat van het plan, zoals bedoeld.

Wat ik zag en als mag beoordeel staat in punt 1 en 2.

## Wat klopt

- Golden: tegen `origin/main` en tegen `origin/claude/nacht` beweegt alleen B (22 regels, dezelfde als de vorige ronde). Tegen `52a45de` is de foto byte voor byte gelijk. A, C, D en E bewegen niet.
- Een plan zonder beginnersstart raakt de nieuwe code niet: `plannedAfterStart` geeft niets terug zonder de fase Rustig beginnen, dus de bodem blijft de eerste stap van Wennen (`substitutions.ts` regel 253, `planned ?? wennen`).
- De maat van het plan is alleen een bovengrens. Hij verlaagt de bodem en verhoogt hem nooit boven Wennen; een sessie met een eigen vaste lengte raakt hij niet (regel 247).
- Deterministisch, geen klok en geen toeval in de nieuwe regels. Geen nieuwe opslag, geen migratie nodig. Geen nieuwe weg waarlangs de planning stil verandert: de maat is afgeleid, zoals de 110%.
- De valkuil over de drie takken staat in het werkbriefje planning.
- Geen gedachtestreepjes in de nieuwe regels, geen persoonsgegevens, kennisindex zonder verschil.

## Blokkerend

Geen.

## Moet

Geen.

## Mag

### 1. Als het laatste log van de start wegvalt, komt de bodem met 10 minuten terug, ook zonder gat

`src/engine/substitutions.ts` regel 235 en 253; `docs/werkbriefjes/planning.md` regel 37.

Start gelogd (30), daarna elke zondag 35 gelopen waar 40 gevraagd werd. Tot en met dinsdag van week 9 vraagt de zondag 40. Op woensdag valt het log van de start uit de 30 dagen, de bodem van Wennen geldt weer, en dezelfde zondag vraagt 50. Hetzelfde na een start gevolgd door alleen week 5.

Dit bestond al voor deze commit en is dezelfde overgang die de vorige twee rondes als mag telden. Het is ook wat elke gebruiker zonder beginnersstart altijd krijgt (de bodem houdt hem op 50). Daarom mag en geen sprong in de zin van blokkerend 1: het raakt alleen wie vijf weken na de start nog niet is gegroeid. Maar het werkbriefje zegt "5 minuten, alleen na een gat", en dat klopt niet: het is 10 minuten, en ook voor wie elke week loopt maar niet langer wordt.

Voorstel: de zin in het werkbriefje rechtzetten ("tot 10 minuten, voor wie na de start niet groeide"). Of de bodem na de start pas terug mag komen is een keuze over wanneer een beginner geen beginner meer is; dat hoort bij de coördinator, niet bij dit herstel.

### 2. Zonder log van de start groeit de vraag op de kalender, ook als je gelijk blijft

Regel 253. Start niet gelogd, elke zondag 35 gelopen: gevraagd wordt 40, 45, 50 en dan blijft het 50. Met een gelogde start en hetzelfde gedrag blijft het 40 tot week 9. Wie de start niet logde krijgt dus een iets lossere rem dan wie hem wel logde. Stappen van 5 minuten, nooit boven de bodem van Wennen, geen sprong. Het volgt uit "de maat telt de weken", wat al in het werkbriefje staat.

Daarnaast, zoals de vorige ronde (mag 6): na weken zonder enige loop schuift de maat van het plan door. Start niet gelogd, alleen week 5 gedaan: de rustige duurloop gaat op de zondag van week 9 van 30 naar 50, de lange op woensdag van week 10 van 50 naar 60. Start gelogd en daarna niets: kort 25 naar 45, lang 35 naar 55 in week 9. Altijd na minstens vier weken niet lopen, en nooit boven het plan; daar is het voorstel na een pauze voor (`reentry.ts`).

### 3. De draad van de wizard naar het eerste plan is niet getoetst

`src/components/start/StartWizard.tsx` regel 46. Twee mutaties overleven heel `src/engine`, `src/storage`, `src/state` en `src/components`: de wizard geeft de bewaarde keuze niet door, en de wizard geeft de logs niet door. Dit is de enige aanroeper, dus het herstel van moet 2 hangt in de app aan deze ene regel. De code is goed; een test die de wizard met een bewaard Ja laat rekenen ontbreekt.

### 4. Het register in `setPlanningRegisters` is nog niet getoetst

`src/state/planningSync.ts` regel 103. De mutatie zonder `setStartBuild(scope.startBuild)` overleeft. Sinds het register op Gewoon begint is de gevolgschade omgedraaid: een start op heel licht zonder logs zou na de start de eigen loop van de laatste startweek als maat krijgen (65 in plaats van 35 in het nagemaakte programma). Dat is de sprong die de maat moest voorkomen, dus deze regel verdient een test. De mutatie "het register begint op heel licht" overleeft ook; die raakt niets zolang de app het register zet.

### 5. Drie randen van de nieuwe bodem zonder test

`src/engine/substitutions.ts` regel 247 en 253. Overleven:

- De maat van het plan als bodem, ook boven Wennen (`planned ?? wennen` zonder de `Math.min`). Dan stijgt de bodem vanaf week 9 elke week mee met de kalender, ook voor wie niet groeit. Een test in week 9 of later met een eigen log van 35 (verwacht 50, niet 55) dekt het.
- De maat van het plan ook bij een vaste eigen lengte (`!fixed` weg in regel 247). Dan kort de maat stil een sessie in die de gebruiker zelf een lengte gaf.
- Geen bodem zodra er een maat van het plan is. Raakt alleen wie in week 5 korter liep dan gevraagd; geen sprong.

### 6. Een antwoord gaat voor de bewaarde keuze, maar geen test zegt dat

`src/engine/firstPlan.ts` regel 246. De mutatie die de bewaarde keuze voor het antwoord zet overleeft. De planning schrijft het antwoord over de bewaarde keuze heen, dus het voorstel en de planning zouden dan uiteenlopen. Eén regel in de bestaande test: bewaard Ja, antwoord Nee, geen `WALK_JOG_LINE`.

## Mutaties

Negentien mutaties op de nieuwe takken, eerst tegen de tests van de rem, het eerste plan, de golden, de wizard en `src/state`; de overlevers daarna tegen heel `src/engine`, `src/storage`, `src/state` en `src/components`.

- Bodem naast een eigen log, gedood: de bodem zonder de maat van het plan (de oude code); het maximum in plaats van het minimum.
- Bodem naast de start, gedood: de bodem van Wennen ook met een log van de start (nu ook door de test van moet 3).
- Maat van het plan, gedood: de tak zonder log weg; een stap minder; voor elk sjabloon; de golden zonder de bewaarde opbouw.
- Registers, gedood: de scope zet de opbouw niet terug; `durationScopeFor` leest de instelling niet.
- Eerste plan, gedood: de bewaarde keuze genegeerd; de logs genegeerd.
- Overleeft: de maat als bodem boven Wennen; de maat bij een vaste lengte; geen bodem zodra er een maat is; de bodem met de maat ook naast een log van de start (punt 5); het register begint op heel licht; `setPlanningRegisters` zet het register niet (punt 4); de wizard geeft keuze of logs niet door (punt 3); de bewaarde keuze voor het antwoord (punt 6).

## Uitslag van de controles

Op een proefmerge van `origin/claude/beginner-licht` (`2bab43f`) met `origin/claude/nacht` (schoon, geen conflict):

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen.
- `npx vitest run`: groen, 731 bestanden, 10878 tests.
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: geen verschil.

Niet gecontroleerd:

- Geen doorloop in Chromium: dat is Lookout. De wizard met een bewaarde keuze is alleen in de code gelezen, niet in de app nagespeeld.
- De rem is nagespeeld met nagemaakte logs op het nagemaakte programma, niet met een back-up en niet door de hele planningsronde heen. Een ziekmelding zelf is niet nagespeeld; ik ging ervan uit dat ziek de fases niet verschuift en dus neerkomt op een start zonder logs.
- Gewoon is alleen zonder logs nagespeeld (65, 70, 75), niet met een eerste eigen log.
- Geen merge met `origin/main` zelf (main loopt via een squash; nacht loopt 3 commits achter op main); de golden is wel tegen main vergeleken.

De code van de bouwer is niet gewijzigd. De proeven en mutaties stonden in tijdelijke worktrees en zijn teruggezet.

**Akkoord voor main.**
