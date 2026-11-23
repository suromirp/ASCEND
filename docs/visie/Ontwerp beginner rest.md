# Ontwerp: de rest van beginner heel licht

Status: voorstel van Cartographer, 23 november. Geen code gewijzigd. Hoort bij [I-18] en [I-52] in `docs/backlog.md`, vervolg op `docs/visie/Ontwerp beginner heel licht.md` (stappenplan in deel 4). Regelnummers van main op 23 november.

## 1. Stand per stap

- Stap 0, bronnen: klaar. `docs/onderzoek/Wandelen en dribbelen voor beginners.md` bestaat en de ladder citeert hem (`src/data/beginnerLadder.ts:7`, `:19`, `:60`).
- Stap 1, gegevens en functie: klaar. De ladder 35/45/55/65 minuten kracht, 10/13/17/20 sets, 20 tot 35 en 30 tot 45 minuten wandelen en dribbelen staat in `beginnerLadder.ts:53-86`, `beginnerWeek` in `src/engine/beginnerStart.ts:103`, getest in `src/engine/beginnerWeek.test.ts`.
- Stap 2, sjabloon en wissel: klaar. `tpl_walk_jog` en `tpl_walk_jog_long` in `src/data/defaultProgram.ts:505` en `:518`, de wissel in `src/engine/programLayout.ts:682-685`, getest in `src/engine/programWaves.test.ts:143-172`; golden B toont ze (`src/storage/__snapshots__/planGolden.test.ts.snap:295-311`).
- Stap 3, duur en sets in de planning: half. Wel: de rem van 10% na de start (`src/engine/substitutions.ts:142`, `src/engine/afterBeginnerStart.test.ts:50-60`). Niet: de planning leest de ladder niet (`beginnerStart.ts:102`, werkbriefje planning regel 13). Golden B plant elke startweek kracht 75 minuten, wandelen en dribbelen 20 en 30, en de Herstelwandeling 45 (snapshot regel 292-311). Dat is precies [I-52]. Het weekbudget kent de start niet (geen verwijzing in de budgetbestanden); niet verder nagegaan.
- Stap 4, Akkoord en instelling: grotendeels. Instelling Opbouw van de start (`src/engine/settingsDefs/doel.ts:69`, `src/components/settings/groups/DoelGroup.tsx:127` met `alwaysAsk`), migratie (`src/storage/migrationsPlanning.ts:150`), back-up (`src/storage/directionSettings.test.ts:41-100`), Akkoord en Liever niet (`src/storage/planDirection.test.ts:168`). Het eerste voorstel en een richting kiezen zetten Heel licht in hun Akkoord (`src/engine/firstPlan.ts:277`, `beginnerStart.ts:55`). Ontbreekt: het eenmalige voorstel op Vandaag voor wie al in een start zit.
- Stap 5, teksten: open. De belofte zegt nog "alleen makkelijk" (`beginnerStart.ts:75`, vastgepind in `beginnerStart.test.ts:48`). Het voorstel noemt geen getallen voor week 1 (`firstPlan.ts:262-265`). De verhouding dribbelen en wandelen staat nergens in beeld (`src/data/workoutStructure.ts:63-65`).
- Stap 6, vaktaal: open. Voorschrift en RIR in Forge (`src/components/forge/ExerciseBlock.tsx:308`, `:315`, `:520`), Voorschrift op Vandaag (`src/components/TodayMissionCard.tsx:373`), "Zwaarte (RPE)" in `forge/FinishSheet.tsx:149`, `logForm/LogFormParts.tsx:132`, `StrengthDoneElsewhere.tsx:83`. Geen instelling Vaktaal. Zone 2 staat bij elke rustige loop, ook wandelen en dribbelen (`src/engine/sessionBrief.ts:152`).
- Stap 7, poorten: open.

## 2. Ontwerp stap 3: de ladder wordt de planning

- In `PHASE_GOLF_START` met Heel licht leest de duurregel `beginnerWeek(week, sets)`: kracht krijgt de minuten en de sets van die week, de twee sessies wandelen en dribbelen hun korte en lange minuten. `START_PLANNED_MINUTES` verdwijnt en de rem na de start meet aan de laatste ladderweek (45 lang, 35 kort).
- Sets: de korte versie zonder optionele oefeningen (`engine/substitutions.ts`) en een grens op werksets langs de weg van `engine/forgeTimeCap.ts`, geteld met `isWorkSet`. Geen nieuwe opgeslagen vorm.
- [I-52]: de Herstelwandeling in de start duurt hoogstens zoveel als de korte sessie wandelen en dribbelen van die week (20, 25, 30, 35). Zie keuze 1.
- Week 5 en 6 bij golven van drie of zes weken: het gewone plan zonder harde training, zoals nu.
- Het weekbudget volgt wat er gepland staat, zodat de ring in week 1 niet op rood staat.

## 3. Ontwerp stap 4: wie al in een start zit

Eén voorstel op Vandaag, met de bestaande voorstelkaart: "Je start wordt lichter. Kracht 35 minuten, wandelen en dribbelen 20 en 30 minuten." met de vaste zin "Eerst een voorstel, pas na Akkoord verandert er iets." Eén id per start (de startmaandag). Liever niet laat alles staan en komt niet terug. Het geldt voor een lopende start zonder keuze en voor een lopende start op Heel licht van voor stap 3, want dat Akkoord noemde alleen wandelen en dribbelen (`beginnerStart.ts:60`), niet kortere kracht. Tot het Akkoord blijft zo'n start zoals hij is.

## 4. Ontwerp stap 5: wat het voorstel noemt, staat in Week

- De belofte bij Heel licht, drie korte regels uit `beginnerWeek(1)`, nooit met de hand getypt: "Week 1: kracht 35 minuten." / "Twee keer wandelen en dribbelen: 20 en 30 minuten." / "Elke week iets meer. Pittig pas na vier weken." Bij zes weken "zes".
- Bij Gewoon: "De eerste vier weken geen harde training." Het droge feit, zonder "alleen makkelijk".
- `WALK_JOG_LINE` blijft, maar zegt de verhouding van week 1: "Je dribbelt 1 minuut en wandelt 2 minuten, om de beurt."
- Het trainingsscherm en het blad in Week tonen dezelfde verhouding bij de stap Dribbelen en wandelen: "1 min dribbelen, 2 min wandelen". De detailregel in `workoutStructure.ts` wordt een functie van de week, net als de duur.
- De fasetekst Rustig beginnen (`programLayout.ts`) krijgt dezelfde belofte.
- Het etiket "Vandaag · Hardlopen" op de wandelkaart wordt "Vandaag · Wandelen en dribbelen" ([I-52]). Waar het etiket gemaakt wordt is niet nagegaan.
- Test: bouw het eerste voorstel voor een beginner, pas het toe, lees week 1 zoals Week hem toont (`resolveEffectiveFullDuration`) en controleer dat elk getal uit de regels bij een sessie van week 1 hoort, en dat de verhouding gelijk is aan die in de detailregel. Ook voor week 3 met het voorstel van stap 4.
- Lege stand: geen start, dan geen regels. Laden en fout: alles is lokaal en rekent mee met het voorstel.

## 5. Ontwerp stap 6: de woorden

Al beslist (15 november, punt 3): Plan, Over en Zwaarte voor iedereen, met een instelling voor vaktaal. De stem houdt RIR en zone 2 Engels (`docs/beslissingen/2026-11-09-stem-van-ascend.md`, regel 5). Dat botst niet: waar de term staat blijft hij Engels, alleen het opschrift wordt een gewoon woord, en in de uitleg en in de stand Vaktaal staat RIR.

- Forge, kolomkoppen: Voorschrift wordt Plan (wissel Plan of Vorige), RIR wordt Over, Herh. blijft (voorgelezen als Herhalingen). De bolletjes zeggen "2 over" in plaats van "2 RIR".
- Vandaag, menu: Voorschrift wordt Plan.
- Zwaarte (RPE) wordt Zwaarte, op de drie plekken hierboven. De uitleg uit `logForm/formRules.ts:42` blijft, zonder "(RPE)".
- "RPE 3-4" in `src/data/trainingGuide.ts` en `workoutStructure.ts` wordt "rustig, je kunt hele zinnen praten". De intensiteit in `defaultProgram.ts` blijft, want de engine leest hem.
- Zone 2: blijft bij elke loop, met de bestaande i. Bij wandelen en dribbelen niet: daar staat "Rustig" met "Praten kan". Zie keuze 2.
- Uitleg, in het bestaande blad Waarom deze training (`TrainingGuideSheet`, het opgeschoonde Info-blad, zie `docs/visie/Ontwerp Info-blad.md`). Bij een krachttraining komt bovenaan de lijst de rij "Zo lees je de sets", die een onderblad opent via `Sheet` (dus `useSheetClose`, `ref={sheetRef}`, `<SheetGrip />`). Vier regels, elk één zin: "Plan: wat er vandaag voor je klaarstaat." "Herh.: herhalingen per set." "Over: hoeveel herhalingen je nog had kunnen doen (RIR). Twijfel je tussen twee, kies de laagste." "W: een opwarmset, telt niet mee." Teksten als gegevens in `src/data/`.
- In Forge staat naast de kolomkoppen een `InfoButton` (`components/ui.tsx`, 44 bij 44 px) die dit onderblad direct opent; terug brengt je naar Forge. Geen nieuw blad naast het Info-blad, geen nieuwe kleur.
- In de start staat boven de eerste krachttraining: "Kies een gewicht dat licht voelt. Je hebt er nog een paar over."
- Instelling Woorden in Forge: Gewoon (advies) of Vaktaal, met de zin "Vaktaal toont RIR en RPE zoals in andere krachtapps." Groep Forge, via `settingsDefs`, `settingsSummary.ts` en de groepspagina. Raakt de planning niet, dus geen Akkoord.
- Lege stand: een oefening met een houding heeft geen Over, de kop blijft leeg zoals nu.

Bewust niet: golf, beenindex en de Engelse oefeningsnamen (eigen backlogpunten); geen uitklapblok; geen tweede taal per soort gebruiker.

## 6. Akkoord

Stap 3 verandert de planning en valt onder het Akkoord van het eerste voorstel of van stap 4. Stap 4 is zelf het Akkoord. Stap 5 en 6 veranderen geen planning en vragen niets.

## 7. Branches, tests en poorten

- `claude/beginner-ladder-plan` (stap 3) en `claude/beginner-start-voorstel` (stap 4, bovenop 3): samen één bouwmoment en één squash, want 3 zonder 4 maakt een lopende start stil korter. Tests: per richting en per golflengte 3, 4 en 6; twee keer `planPass`; `src/storage/openingPingpong.test.ts`; een vastgezette training blijft; Herstelwandeling hoogstens de korte sessie; budget gelijk aan het geplande; Liever niet komt niet terug, ook niet na een tweede opening; een oude back-up importeert. Golden A en C byte voor byte gelijk, B regel voor regel verklaard. Planner: Warden en Lookout.
- `claude/beginner-teksten` (stap 5): de test uit deel 4 en de bijgewerkte `beginnerStart.test.ts`. Alleen tekst: controles en één screenshot.
- `claude/beginner-woorden` (stap 6a, alleen woorden): de nieuwe opschriften, `calisthenics.scan.test.ts:44` en `tikdoelen.render.test.ts:28` bewust mee. Controles en screenshot.
- `claude/beginner-woorden-uitleg` (stap 6b): onderblad, InfoButton, gewichtsregel en instelling. `trainingGuideSheet.scan.test.ts:28` gaat van vier naar vijf onderbladen; de instellingsfoto beweegt. UI: Lookout.
- Stap 7: Pathfinder voor de dag van een beginner, Lookout op 360, 390 en 412 px, en een besluit.

## 8. Keuzes voor de eigenaar

1. Herstelwandeling in de start: hoogstens zo lang als de korte sessie wandelen en dribbelen (advies), of de vaste 45 minuten laten. Zonder antwoord: het advies.
2. Zone 2 bij wandelen en dribbelen: vervangen door "Rustig, praten kan" (advies), of overal laten staan. Zonder antwoord: het advies.
3. Stap 3 en 4 samen in één bouwmoment (advies), of eerst alleen nieuwe gebruikers. Zonder antwoord: samen.

Al beslist: heel licht (14 november), de grens van 10% met 30, 35, 40, 45 minuten, een eigen sjabloon wandelen en dribbelen, en de gewone woorden voor iedereen met een instelling Vaktaal (15 november).
