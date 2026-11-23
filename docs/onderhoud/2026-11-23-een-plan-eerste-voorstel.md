# Eén plan, stap 4: het eerste voorstel (23 november 2026)

Backlogpunt I-14, stap A van `docs/visie/Ontwerp Eén plan.md` (symptoom A, stap 4 van het stappenplan). Tak `claude/een-plan-eerste-voorstel`, vanaf main 500f8d29. Sherpa.

## Wat er veranderde

- Het eerste voorstel maakt zijn zinnen over de week uit het voorbeeld zelf. `computeHorizonPlan` (`src/storage/horizonPlan.ts`) neemt de eerste volle week van `run.after` en laat `firstPlanLines` (`src/engine/firstPlan.ts`, puur) de zinnen maken: de dagen met de naam die Week toont, het aantal trainingen, het aantal keer kracht, de rustdag. Wat er naast de week nodig is, reist mee als `FirstPlanExtras.text` (gewone gegevens uit `buildFirstPlan`). Zonder `text` blijft alles zoals het was.
- Vraag 2 op advies: de tekst volgt het plan. "Je week: 150 minuten en 1 keer kracht; je richting vraagt 2, met een vierde dag past het." Met welk aantal dagen het past, rekent `buildFirstPlan` met dezelfde `chooseWeekShape` en een dag meer, tot het past of je dagen op zijn (een beginner tot vier). Is het plan gelijk aan het budget, dan blijft de oude zin. Met kracht uit noemt de zin alleen minuten. `directionChangeLines` kreeg daarvoor een derde, optionele parameter; het voorstel van een richting zelf is ongewijzigd.
- Vraag 3 op advies: een recovery-rij heet in de lijst van elk voorstel Rustdag, zoals in Week en de dagkaarten van het blad, en een nieuwe rustdag krijgt "ma 9 nov · wandelen mag" in plaats van minuten (`src/engine/proposalPreview.ts`, veld `rest`; `src/components/ProposalSheet.tsx#MoveLine`).
- Beschikbaarheid in het voorbeeld: met een doel draait het voorbeeld van het eerste plan dezelfde beschikbaarheidsstap als de opstart (`computeForecastReplan` met de dagen die Akkoord schrijft), zodat het laat zien wat er na de eerste opening staat. Die stap raakt alleen de vervolgweken.
- Het krachtblok: de planningsronde leest het niet. Alleen het weekvoorschrift (vervolgweken, met een doel) en de krachtcontrole (alleen een suggestie) lezen het. Dat heb ik niet in het voorbeeld nagebouwd; invariant 2 hieronder toetst dat de eerste twee weken van het voorbeeld na Akkoord plus een opening (met het weekvoorschrift) gelijk zijn.

Er komt geen nieuw voorstel bij en de planning zelf verandert niet: alleen tekst en het voorbeeld. Het eerste voorstel blijft een voorstel met Akkoord. Historie wordt niet geraakt.

## Naspelen vooraf

Op een lege app met nagemaakte antwoorden (Fit blijven, Fitter, Sterker, Rustig aan, tocht en wedstrijd, 2 tot 6 dagen, ook met beperkte dagen en een doeldatum) was het voorbeeld al gelijk aan Week na Akkoord en een opening, in alle 52 standen. Symptoom A was dus alleen tekst: de dagregel noemde de vorm (Rustige duurloop) waar de beginnersstart Wandelen en dribbelen zet, en de zin over kracht noemde het budget.

## Tests

- `src/storage/eenPlanEersteVoorstel.test.ts`: de drie `it.fails` van symptoom A zijn `it` en slagen. De opzet geeft `text: setup.text` mee, zoals de start (`StartWizard.tsx`) dat nu doet; de toetsen zelf zijn ongewijzigd. Erbij: invariant 1 en 2 voor Fit blijven, Fitter, Sterker, Rustig aan en een tocht met datum, elk met 2 tot 6 dagen (25 gevallen).
- `src/engine/firstPlan.test.ts` ongewijzigd groen.
- Golden A, B en C bewegen niet.
- Beginnersladder (I-18, I-143) en terugkeer (I-124, I-144): hun tests zitten in de volledige run en zijn groen.

## Controles

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen (alleen de bestaande waarschuwingen).
- `npx vitest run`: 804 bestanden, 12224 geslaagd, 2 verwacht falend (de `it.fails` van andere stappen van I-14).
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: geen verschil.
- `kaart:vergelijk` niet gedraaid, op verzoek.

## Niet gecontroleerd

- Geen screenshot en geen Lookout: de regel "ma 9 nov · wandelen mag" en de langere zin over kracht heb ik niet op een scherm gezien.
- Met Op je rustdag op Hersteldag zegt Week "Hersteldag"; de lijst van het voorstel zegt dan Rustdag, net als de dagkaarten van het blad al deden. Het blad kent die instelling niet.
- Het weekvoorschrift met het krachtblok zit niet in het voorbeeld (zie boven); alleen de eerste twee weken zijn getoetst.
- Een app met bestaande rijen of logs bij het eerste plan (`existing`) is niet apart nagespeeld.
