# Warden: herstelopdracht beginner heel licht (derde ronde)

Branch `claude/beginner-licht`, commit `52a45de`, nagekeken tegen de vorige uitslag (`warden/beginner-herstel`). 15 november 2026.

Uitslag: **Niet akkoord.** Eén blokkerend punt (nieuw, een gat in het herstel van punt 3), twee die moeten, vier die mogen. De regelnummers zijn die van `52a45de`.

## De vier punten van de vorige ronde

- Blokkerend 1, horlogelog in wandeltempo: **opgelost.** Nagespeeld en met drie mutaties getoetst.
- Blokkerend 2, het eerste Akkoord noemt de beginnersstart niet: **opgelost voor het gemelde geval** (Automatisch met logs). Eén restgeval, punt 2 hieronder.
- Moet 3, geen rem zonder log van de start: **half opgelost.** Zonder enig log klopt het nu. Bij het eerste eigen log valt de rem weg, punt 1 hieronder.
- Moet 4, de test met de bodem: **niet opgelost.** De test slaagt nog steeds met en zonder bodem, punt 3 hieronder.

## Wat klopt

- Golden: tegen `origin/main` en tegen `origin/claude/nacht` beweegt alleen B (22 regels tegen main, waarvan 14 nieuw in deze commit: week 5 tot 14). A, C, D en E zijn byte voor byte gelijk.
- Een gewone loop van 10:32 per km zonder beginnersstart wordt nog steeds een wandeling: zonder geplande training, en ook met een geplande Rustige duurloop. De bouwer toetst het zelf (`src/engine/activityFit.test.ts`, "zonder gepland wandelen en dribbelen blijft hetzelfde tempo een wandeling") en de mutatie "elke match blijft een loop" wordt gedood.
- De uitzondering hangt aan de rol `start_only`, niet aan een id (`activityImport.ts` regel 258 en 291, `activityFit.ts` regel 156).
- De fase Rustig beginnen bestaat alleen in een plan met een beginnersstart (`layoutWaves`, `beginnerWeeks > 0`). Een plan zonder start raakt `plannedAfterStart` dus niet; de bouwer toetst dat ook.
- Zonder logs, heel licht, bekeken op de maandag van week 5: Rustige duurloop 25, 30, 35 en Lange duurloop 35, 40, 45, 50, 55, 60, nooit boven het plan. Bij Gewoon: 65, 70, 75 vanaf 60. Geen sprong.
- Deterministisch: geen klok en geen toeval in de nieuwe code. Het nieuwe register `setStartBuild` wordt gezet waar de andere registers gezet worden (`setPlanningRegisters`) en in de scope van een voorstel, en `withDurationScope` zet hem terug.
- Akkoord: er is geen nieuwe weg waarlangs de planning stil verandert. De plan-maat is een rem zoals de 110%, afgeleid en niet opgeslagen; `beginnerBuild` zat al in `horizonKey`.
- Geen nieuwe opslag, geen migratie nodig. Geen gedachtestreepjes in de nieuwe regels, geen persoonsgegevens, kennisindex zonder verschil.

## Blokkerend

### 1. Na een start zonder logs springt de lange duurloop bij het eerste eigen log van 35 naar 50

`src/engine/substitutions.ts` regel 235, 246 en 254 tot 258.

De plan-maat (`plannedAfterStart`) staat in de `else` van de rem op logs. Zodra er één eigen log van de loop in het venster zit en geen log van de start, geldt weer de oude tak: `afterStart` is onwaar, dus de bodem van Wennen komt terug, en de plan-maat wordt niet meer geraadpleegd.

Nagespeeld met het programma uit `afterBeginnerStart.test.ts` (bodem lang 50, kort 30), start niet gelogd, week 5 gedaan precies zoals gevraagd (donderdag 25, zondag 35), bekeken op de maandag van week 6:

- Lange duurloop week 6: **50**, en week 7 ook 50. Zonder dat log was het 40 en 45.
- Rustige duurloop week 6: 30. Dat klopt alleen omdat de bodem daar toevallig 30 is.

Van 35 naar 50 is 43% erbij, voor een beginner, in de week nadat hij voor het eerst deed wat de app vroeg. Dit is dezelfde sprong die `024d057` weghaalde voor wie de start wel logde ("35 naar 50").

Het geval is niet zeldzaam. Wie wandelen en dribbelen op zijn horloge als wandeling opneemt, krijgt geen log onder de start: nagespeeld met `proposeImport`, soort wandeling, 20 minuten, een geplande `tpl_walk_jog` op die dag geeft geen match en sjabloon `tpl_herstel`. Die gebruiker heeft de hele start gedaan, heeft nul logs van de start, en loopt in week 5 voor het eerst een loop die wel telt. Hetzelfde geldt voor wie de start ziek oversloeg.

Voorstel: de bodem van Wennen geldt ook niet zolang de plan-maat onder die bodem ligt. Bijvoorbeeld: reken `planned = plannedAfterStart(...)` altijd uit, en gebruik als bodem `Math.min(bodem, planned)` als er een plan-maat is; of laat `afterStart` ook waar zijn als `planned` bestaat en kleiner is dan de bodem. Test: geen log van de start, eigen loop van 35 op de zondag van week 5, de zondag van week 6 vraagt 40.

Nieuwe valkuil voor het werkbriefje planning: "De rem na de start heeft drie takken (log van de start, eigen log, geen log). Toets elke nieuwe regel op de overgang ertussen: de week waarin het eerste eigen log binnenkomt, en de dag waarop het laatste log van de start uit de 30 dagen valt."

## Moet

### 2. Het eerste voorstel leest de opgeslagen keuze Beginnersstart niet

`src/engine/firstPlan.ts` regel 245; `src/storage/databaseHorizon.ts` regel 93; `src/storage/horizonPlan.ts` regel 190.

Zonder antwoord rekent `buildFirstPlan` met Automatisch. De planning rekent met `settings.beginnerStart`, en het voorstel legt zijn instellingen over de bestaande heen (`{ ...settings, ...input.settings }`), dus een eerder opgeslagen Ja of Nee blijft staan als de wizard de vraag overslaat.

Gevolg, in de code gelezen en niet in de app nagespeeld: opgeslagen Ja, genoeg logs, de wizard vraagt niets. Het voorstel noemt geen beginnersstart en geen wandelen en dribbelen, de planning plant ze wel. Omgekeerd bij opgeslagen Nee en weinig logs: het voorstel belooft wandelen en dribbelen en de planning doet het niet. `useDirectionChange.tsx` regel 85 doet het wel goed, met `settings.beginnerStart`.

Smaller dan het oorspronkelijke punt (het vraagt een keuze in Instellingen voor de start, of een start die opnieuw gedaan wordt), daarom moet en niet blokkerend. Voorstel: `buildFirstPlan` krijgt de opgeslagen keuze mee en gebruikt die in plaats van `'auto'` als er geen antwoord is. Test: opgeslagen Ja met zestien logs, geen antwoord, de regels bevatten `WALK_JOG_LINE`.

### 3. De test van punt 4 toetst de bodem nog steeds niet

`src/engine/afterBeginnerStart.test.ts` regel 94 tot 99.

De titel zegt "een eigen loop van 35 wordt hoogstens 40, niet 50". De verwachting is `step(45)`, dat is 50, en de bodem in dit programma is ook 50. Met de bodem aan en met de bodem uit is de uitkomst dus 50. Nagegaan met de mutatie "de bodem ook naast de start": vier andere tests in het bestand vallen om, deze niet. De tweede helft van de test (zonder start houdt de bodem hem op 50) toetst wel iets.

De bodem naast de start is elders gedekt ("de week erna", 35 naar 40), dus de code is niet onbewaakt. Maar de test die gevraagd was doet niet wat zijn naam zegt, en de naam noemt een getal (40) dat de test niet verwacht.

Voorstel: de start in dit geval korter maken (bijvoorbeeld 30, 30, 30, 30 naast een eigen loop van 35), dan is de verwachting 40 en de bodem 50, en klopt de titel.

## Mag

### 4. Het pad van de instelling naar het register is niet getoetst

`src/engine/durationScope.ts` regel 37 en `src/state/planningSync.ts` regel 103. Twee mutaties overleven heel `src/engine`, `src/storage`, `src/state` en `src/components`: `durationScopeFor` geeft altijd heel licht terug, en `setPlanningRegisters` zet het register niet. Wie een lopende start op Gewoon heeft (geen veld) zou dan na de start 25 en 35 krijgen in plaats van zijn eigen loop plus een stap, en geen test ziet het. Eén test op `durationScopeFor({})` en `durationScopeFor({ beginnerBuild: 'licht' })` is genoeg.

### 5. Het register begint op heel licht, de instelling zonder veld is Gewoon

`src/engine/substitutions.ts` regel 121 tegenover `resolveBeginnerBuild`. De app zet het register altijd voor hij rekent, dus dit raakt nu niets. Maar "ongezet is heel licht" is het omgekeerde van "zonder veld Gewoon tot Akkoord", en een nieuwe aanroeper die de registers vergeet rekent voor een bestaande gebruiker met de verkeerde maat. Gewoon als beginstand is de veilige kant; de pure tests zetten dan zelf `startBuild: 'licht'`.

### 6. De plan-maat groeit op de kalender, ook als je niets deed

`plannedAfterStart`, regel 145. Start gelogd met 20 en 30, daarna vier weken niets, bekeken op de maandag van week 9: Lange duurloop 35 (het log van de start telt nog, 29 dagen), Rustige duurloop 45 (het log van donderdag is 32 dagen oud, dus de plan-maat van week 9). Een week later vraagt de lange 60. De bouwer koos dit bewust ("een vaste maat schuift de sprong alleen op") en voor zo'n gat is er het voorstel na een pauze (`reentry.ts`). Een zin in het werkbriefje dat de plan-maat de weken telt en niet wat je deed is genoeg. Dit vervangt punt 5 van de vorige ronde: de overgang is er nog, nu naar de plan-maat in plaats van naar de bodem voor de tak zonder eigen log.

### 7. Twee kleine mutaties overleven

- De plan-maat ook voor andere sjablonen dan de twee lopen (regel 135, de toets op `START_STAND_INS` weg): groen. Bij heel licht vangt `START_PLANNED_MINUTES` het op, bij Gewoon zou elke training met een opbouw de maat krijgen. Geen test met Gewoon en een ander sjabloon.
- `withDurationScope` zet `startBuild` niet terug (regel 204): groen.

## Mutaties

Tweeëntwintig mutaties op de nieuwe takken, eerst tegen de tests van de rem, het horloge, het eerste plan en de golden; de overlevers daarna tegen heel `src/engine`, `src/storage`, `src/state` en `src/components`.

- Rol `start_only`, gedood: de uitzondering weg uit `effectiveActivity`; de regel over wandeltempo ook bij wandelen en dribbelen; achteraf koppelen zonder de rol; elke match blijft een loop.
- 30 dagen, gedood: venster op 28 en op 31 (de grensdag is nu getoetst).
- Geplande minuten van de laatste startweek, gedood: 30 wordt 35; 20 wordt 25; een stap minder; heel licht en Gewoon omgedraaid; een andere dag van de laatste startweek bij Gewoon; ook in de start zelf; de plan-maat weg; de scope zet de opbouw niet; de stap zonder de 5 minuten erbij.
- Eerste plan, gedood: de logs genegeerd; het antwoord genegeerd.
- De bodem ook naast de start: gedood, maar niet door de test van punt 3.
- Overleeft: de plan-maat voor andere sjablonen; de scope zet niet terug; `durationScopeFor` leest de instelling niet; `setPlanningRegisters` zet het register niet (punt 4 en 7).

## Uitslag van de controles

Op een proefmerge van `origin/claude/beginner-licht` (`52a45de`) met `origin/claude/nacht` (schoon, geen conflict):

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen.
- `npx vitest run`: groen, 729 bestanden, 10830 tests.
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: geen verschil.

Niet gecontroleerd:

- Geen doorloop in Chromium: dat is Lookout. De regels in het eerste voorstel zijn alleen in de code en in de tests gelezen.
- Punt 2 is in de code gelezen, niet in de app nagespeeld; of de rij Beginnersstart voor de start bereikbaar is heb ik niet bekeken.
- De rem is nagespeeld met nagemaakte logs, niet met een back-up.
- Geen merge met `origin/main` zelf (main loopt via een squash); de golden is wel tegen main vergeleken.

De code van de bouwer is niet gewijzigd. De proeven en mutaties stonden in een tijdelijke worktree en zijn teruggezet.

**Niet akkoord: punt 1 (na een start zonder logs springt de lange duurloop bij het eerste eigen log van 35 naar 50).**
