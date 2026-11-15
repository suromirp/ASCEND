# Warden: herstelopdracht beginner heel licht (tweede ronde)

Branch `claude/beginner-licht`, commits `ecdfa31` en `024d057`, tegen `origin/main`. 15 november 2026.

Uitslag: **Niet akkoord.** Twee blokkerende punten, twee die moeten, drie die mogen.

## Wat klopt

- Golden: tegen `origin/main` beweegt alleen B (acht regels, week 1 tot 4 wandelen en dribbelen, 20 en 30 minuten). A, C, D en E zijn byte voor byte gelijk.
- De rem zelf rekent goed als de sessies onder hun eigen sjabloon gelogd zijn. Doorloop week 5 tot 13, bekeken op elke dag van de week: 20 en 30 in de start geeft Rustige duurloop 25, 30, 35 en Lange duurloop 35, 40, 45, 50, 55, 60. Met de ladder (35 en 45 in week 4): 40, 45, 50 en 50, 55, 60. Geen sprong, geen getal dat midden in de week verandert.
- Een andere Opbouw van de start gaat via `changeSetting` met `alwaysAsk`; Liever niet laat alles staan. Alles terug naar het advies gaat ook via het voorstel (`plan: true`). `horizonKey` kent het veld. Zonder veld blijft een lopende start Gewoon.
- Opslag: het veld is optioneel, de import houdt alleen een bekende waarde over, een oude back-up importeert zonder veld.
- Scheduler deterministisch: geen klok, geen toeval in de nieuwe code.
- Geen gedachtestreepjes in de nieuwe regels, geen persoonsgegevens, kennisindex zonder verschil.

## Blokkerend

### 1. Een horlogelog in wandeltempo telt niet voor de rem

`src/engine/activityImport.ts` regel 254 tot 258 (`effectiveActivity`) en `src/engine/substitutions.ts` regel 110 tot 111.

Wandelen en dribbelen is langzaam. Een loop van het horloge op 10:00 per km of trager wordt een wandeling (`isWalkLike`, grens 600 seconden per km), en de uitzondering in `effectiveActivity` geldt alleen voor een training die geen rustige loop is. Wandelen en dribbelen is rustig, dus de uitzondering geldt niet.

Nagespeeld met `proposeImport` en een geplande `tpl_walk_jog` op die dag:

- 20 minuten, 1,9 km (10:32 per km): soort wandeling, geen match, sjabloon `tpl_herstel`, met de regel "dit wordt een herstelwandeling".
- 30 minuten, 2,9 km (10:21 per km): hetzelfde.
- 20 minuten, 2,2 km (9:05 per km): wel een match op `tpl_walk_jog`.

Eén minuut dribbelen op 7,5 km per uur en twee minuten wandelen op 5 km per uur is gemiddeld 10:17 per km. Week 1 van de ladder valt voor een gewone beginner dus aan de verkeerde kant van de grens; wie langzamer dribbelt ook week 2 tot 4.

Gevolg: de geplande training blijft open, het log staat onder `tpl_herstel`, `fromStart` blijft leeg en de rem heeft niets om aan te meten. Week 5 vraagt dan het volle plan: in de golden B is dat 55 en 95 minuten na 20 en 30. Dat is precies de sprong die deze functie moet voorkomen, bij iemand die alles deed zoals gepland.

Voorstel: een loop op de dag van een geplande training met de rol `start_only` wordt nooit een wandeling (de uitzondering in `effectiveActivity` uitbreiden, op de rol, niet op een id). Test: `proposeImport` met 20 minuten op 10:30 per km en een geplande `tpl_walk_jog` geeft een match, en `recentSessionMaxima` over dat log vult `fromStart`.

Nieuwe valkuil voor het werkbriefje lopen en tests: "Een nieuw loopsjabloon dat trager is dan 10:00 per km toets je met een horlogelog in dat tempo: `effectiveActivity` maakt er anders een wandeling van."

### 2. Het eerste Akkoord zegt Rustige duurloop en plant wandelen en dribbelen

`src/engine/firstPlan.ts` regel 257, 259 en 272; `src/components/start/StartWizard.tsx` regel 28.

De wizard slaat de beginnersvraag over zodra er een log bestaat (`sessionLogs.length > 0`). `answers.beginner` is dan leeg, `beginnerStart` blijft op auto, en auto zegt beginner bij minder dan twee trainingen per week in de acht weken ervoor. Dat is iemand die terugkomt na een pauze. Het eerste plan zet dan toch `beginnerBuild: 'licht'`, en de planning wisselt beide lopen vier weken naar wandelen en dribbelen.

Nagespeeld met `buildFirstPlan` zonder antwoord: de regels van het voorstel zijn "3 trainingen per week (dinsdag: Bovenlichaam A, donderdag: Rustige duurloop, zondag: Lange duurloop)", zonder de zin over de beginnersstart en zonder `WALK_JOG_LINE`. Beide zinnen hangen aan `answers.beginner === true`.

Dat is een inhoudelijke verandering van de planning die het Akkoord niet noemt, en het voorstel zegt zelfs iets anders. De zin over de beginnersstart had dit gat al op nacht (alleen de harde training viel weg); met heel licht is het gevolg veel groter.

Voorstel: `buildFirstPlan` krijgt te horen of de start een beginnersstart wordt (dezelfde `isBeginnerStart` met de logs als `patternContext` gebruikt), en beide zinnen hangen daaraan. Test: logs die auto op beginner zetten, geen antwoord, en de regels van het voorstel bevatten `WALK_JOG_LINE`.

## Moet

### 3. Een beginner zonder logs springt van 30 naar 95 minuten

`src/engine/substitutions.ts` regel 190 tot 213; `src/storage/__snapshots__/planGolden.test.ts.snap` regel 310 tot 316.

Zonder log van de start is `longest` leeg en geldt er geen rem. De golden B laat het zien: zondag 22 november 30 minuten wandelen en dribbelen, zondag 29 november 95 minuten Lange duurloop; donderdag van 20 naar 55. Wie de start deed zonder te loggen, of hem oversloeg, krijgt in week 5 het volle plan.

Het besluit `2026-11-15-beginner-tien-procent.md` zegt "daarna door met de bestaande grens". Die grens bestaat hier niet zonder log.

Voorstel: zolang de start minder dan 30 dagen geleden eindigde en er geen eigen log en geen log van de start is, meet de rem aan de geplande minuten van de laatste week van de start (20 en 30, straks de ladder). Geen nieuwe opslag nodig: het programma kent de fase en het sjabloon. Dit beweegt golden B in week 5 en 6; dat mag, met de reden in de commit. Wil de bouwer dit niet zo, dan hoort er een besluit in `docs/beslissingen/` dat zegt waarom een beginner zonder logs het volle plan krijgt.

### 4. De test met "de bodem van de eerste week" toetst de bodem niet

`src/engine/afterBeginnerStart.test.ts`, de test "een eigen langere lange duurloop telt zoals altijd, met de bodem van de eerste week".

Sinds `024d057` geldt de bodem juist niet zolang er een log van de start in het venster zit (`afterStart`, regel 195 en 204). De test vergelijkt twee uitkomsten die allebei onder de grens blijven en slaagt dus met en zonder bodem. De naam belooft het omgekeerde van wat de code doet.

Voorstel: de naam aanpassen en een geval erbij waar het verschil telt: een eigen loop van 35 naast de start, de week erna hoogstens 40 en niet de bodem.

## Mag

### 5. De bodem komt midden in de week terug als het venster afloopt

`src/engine/substitutions.ts` regel 195 en 204. Start gedaan met 30, week 5 een eigen loop van 35, twee weken niets, week 8 een loop van 40. Op maandag en dinsdag van week 9 vraagt de zondag 45; vanaf woensdag 50, omdat het laatste log van de start dan ouder is dan 30 dagen en de bodem van Wennen terugkomt. Er gebeurde niets en het getal verandert. Klein (5 minuten) en alleen na een gat, maar het is een grens op een datum die de gebruiker niet kent. Een regel in het werkbriefje is genoeg.

### 6. Twee mutaties overleven

- "Minstens 5 minuten erbij" ook buiten de start (`afterStart ?` weggehaald, regel 211): alle 9666 tests van `src/engine` en `src/storage` blijven groen. Geen test legt vast dat een gewone loper op 20 minuten bij 110% blijft.
- Het venster van 30 dagen op 28 gezet (regel 97): groen. De grensdag is niet getoetst. Dit was al zo op nacht.

### 7. Tekst in het werkbriefje

`docs/werkbriefjes/planning.md` regel 13 zegt nog "de planning leest hem nog niet" over de ladder. Dat klopt (de start plant vast 20 en 30 minuten), maar de tests in `afterBeginnerStart.test.ts` rekenen met 30, 35, 40, 45. Eén zin erbij dat de ladder pas in stap 3 de geplande minuten wordt voorkomt verwarring.

## Mutaties op de rem

Tien mutaties in `src/engine/substitutions.ts`, getoetst met de tests van de rem, de golden en de golven; de overlevers daarna met heel `src/engine` en `src/storage`.

- Gedood: zonder de 5 minuten erbij; de bodem van Wennen altijd; de start telt niet mee; de laatste in plaats van de langste; de bodem terug na de eerste eigen loop; stap 10 in plaats van 5; de start wint altijd van een eigen loop; de bodem weg voor iedereen.
- Overleeft: 5 erbij ook zonder start; venster 28 dagen (punt 6).

De vier gevraagde gevallen:

- Grens week 4: goed, ook per dag van week 5 bekeken.
- 20 minuten: goed, 20 wordt 25.
- Beginner zonder logs: geen rem, punt 3.
- Langste sessie uit een horlogelog: in looptempo goed, in wandeltempo niet gelezen, punt 1.

## Uitslag van de controles

Op een proefmerge van `origin/claude/beginner-licht` met `origin/claude/nacht` (schoon, geen conflict):

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen.
- `npx vitest run`: groen, 729 bestanden, 10814 tests.
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: geen verschil.

Niet gecontroleerd:

- Een merge met `origin/main` zelf geeft conflicten in dertien bestanden, omdat main via een squash loopt. Dat hoort bij de werkwijze (nacht, dan squash) en is geen bevinding; de vergelijking met main is gedaan op de diff en de golden-foto.
- Geen doorloop in Chromium: dat is Lookout. De nieuwe rij Opbouw van de start en de regel in het voorstel zijn alleen in de code gelezen.
- De rem is nagespeeld met nagemaakte logs, niet met een back-up.

De code van de bouwer is niet gewijzigd. De proeven stonden in een tijdelijke worktree en zijn weg.

**Niet akkoord: punt 1 (horlogelog in wandeltempo) en punt 2 (het eerste Akkoord noemt wandelen en dribbelen niet).**
