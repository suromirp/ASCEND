# Eén plan, stap 4: het eerste voorstel (23 november 2026)

Backlogpunt I-14, stap A van `docs/visie/Ontwerp Eén plan.md` (symptoom A, stap 4 van het stappenplan). Tak `claude/een-plan-eerste-voorstel`, vanaf main 500f8d29. Sherpa. Tweede ronde na de Warden (moet 1 en 2, mag 3, 4, 5, 7 en 8). Besluit: `docs/beslissingen/2026-11-23-een-plan-eerste-voorstel.md`.

## Wat er veranderde

- Het eerste voorstel maakt zijn zinnen over de week uit het voorbeeld zelf. `computeHorizonPlan` (`src/storage/horizonPlan.ts`) neemt een week uit `run.after` en laat `firstPlanLines` (`src/engine/firstPlan.ts`, puur) de zinnen maken: de dagen met de naam die Week toont, het aantal trainingen, het aantal keer kracht, de rustdag. Wat er naast de week nodig is, reist mee als `FirstPlanExtras.text` (gewone gegevens uit `buildFirstPlan`). Zonder `text` blijft alles zoals het was.
- Welke week (mag 5): de eerste volle week zonder een rij van vóór het voorstel, binnen twaalf weken. Is er geen, dan de eerste volle week en de zin zegt "Je eerste volle week: ..." in plaats van "per week".
- Vraag 2 op advies: de tekst volgt het plan. "Je week: 150 minuten en 1 keer kracht; je richting vraagt 2, met een vierde dag past het." Met welk aantal dagen het past, rekent `buildFirstPlan` met dezelfde `chooseWeekShape` en een dag meer, tot het past of je dagen op zijn (een beginner tot vier). Koos je zelf minder keer kracht dan de richting vraagt (Sterker worden met 2), dan noemt de zin geen dag: een dag meer helpt dan niet; de zin met 6 dagen klopte wel volgens de vorm, maar zei het verkeerde (mag 8). Is het plan gelijk aan het budget, dan blijft de oude zin. Met kracht uit noemt de zin alleen minuten.
- De richtlijn (mag 8): noemt de zin twee getallen voor kracht, dan zegt hij welk getal onder de richtlijn ligt: "Met 1 keer kracht zit je onder de richtlijn, en dat mag een keuze zijn." Anders de oude zin. Het voorstel van een richting zelf is ongewijzigd.
- Vraag 3 op advies en mag 3: een recovery-rij in de lijst van elk voorstel en in de dagkaarten van het blad heet zoals in Week, met de stand van Op je rustdag (`REST_DAY_COPY[mode]`): Rustdag, of Hersteldag. Een nieuwe rustdag krijgt "ma 9 nov · wandelen mag" in plaats van minuten, alleen in de stand Rustdag (`src/engine/proposalPreview.ts`, veld `rest`; `src/components/ProposalSheet.tsx`, `useRestCopy`).
- Mag 4: "Rustdag: <dag>." alleen als de week een herstelrij heeft, met de dag van die rij.
- Mag 8: het voorstel van de beginnersladder zegt "Wandelen op je rustdag: hoogstens 20 minuten." in plaats van "Je herstelwandeling" (`src/engine/beginnerLadderOffer.ts`).
- Beschikbaarheid in het voorbeeld: met een doel draait het voorbeeld van het eerste plan dezelfde beschikbaarheidsstap als de opening (`computeForecastReplan` met de dagen die Akkoord schrijft). Die stap staat nu los in `src/storage/availabilityStep.ts#runAvailabilityStep`; de opening (`src/state/strengthAndReplan.ts#runForecastReplan`) roept hem aan, zodat een test hem kan draaien zoals de app.
- Moet 1: `computeForecastReplan` (`src/engine/adaptiveReplanner.ts`) liet elke rij op een niet beschikbare dag schuiven of vervallen, ook een wedstrijd. Nu blijven een test, een wedstrijd en een rij met een slot staan (`lockLevel` onder 3). Ze komen achteraan in de week, zodat wat wel mag eerst een dag krijgt; het eerste voorstel van `proposeNoTimeToday` dat er een zou raken, stopt de dag, want de voorstellen bouwen op elkaar voort. Dat herstelt ook de fout die al op main zat: de opening haalde de wedstrijddag weg en hij kwam niet terug.
- Het krachtblok: de planningsronde leest het niet. Alleen het weekvoorschrift (vervolgweken, met een doel) en de krachtcontrole (alleen een suggestie) lezen het. Dat heb ik niet in het voorbeeld nagebouwd; invariant 2 toetst de eerste twee weken na Akkoord plus een opening.

Er komt geen nieuw voorstel bij. De planning verandert alleen waar ze een regel brak: een wedstrijd, test of rij met slot blijft op zijn dag. Het eerste voorstel blijft een voorstel met Akkoord. Historie wordt niet geraakt.

## Naspelen

Eerste ronde: op een lege app met nagemaakte antwoorden was het voorbeeld in 52 standen al gelijk aan Week na Akkoord en een opening. Symptoom A was dus tekst. Tweede ronde, met de proef van de Warden (halve marathon op zondag 20 juni 2027, dagen ma, wo, vr): op fb7ea49d viel de wedstrijd uit het voorbeeld, nu staat hij erin en na drie openingen nog op zijn dag. Bij die proef zet het weekvoorschrift bij de eerste opening nog een rustige duurloop op 14 juni 2027 die het voorbeeld niet liet zien; dat is het weekvoorschrift in de vervolgweken, niet de tekst en niet deze stap.

## Tests

- `src/storage/eenPlanEersteVoorstel.test.ts`: de drie `it.fails` van symptoom A zijn `it` en slagen; de opzet geeft `text: setup.text` mee zoals `StartWizard.tsx`. Invariant 1 en 2 voor Fit blijven, Fitter, Sterker, Rustig aan en een tocht met datum, 2 tot 6 dagen; de opening draait nu ook de beschikbaarheidsstap. Een start op woensdag en op zondag (Fit blijven en een halve marathon). Een wedstrijd op zondag met dagen ma, wo, vr bij een start op maandag, woensdag en zondag: in het voorbeeld en na de opening. Een stand waarin de beschikbaarheid in het voorbeeld iets doet (alleen doordeweeks): wat de opening verschuift, stond al in het voorstel. Een app met een eigen rij en met een eigen rij in elke week.
- `src/engine/adaptiveReplanner.test.ts`: een wedstrijd op een niet beschikbare dag blijft; een rij met jouw slot blijft, een rij van het systeem op dezelfde dag schuift.
- `src/engine/firstPlan.test.ts`: de krachtzin met de richtlijn, Sterker worden met 2, de rustdag alleen met een herstelrij, de eerste volle week.
- Zonder de regel in `computeForecastReplan` falen zes van deze tests; zonder de weekkeuze twee. Nagegaan door ze tijdelijk terug te zetten.
- Golden A, B en C bewegen niet. Beginnersladder (I-18, I-143) en terugkeer (I-124, I-144) groen in de volledige run.

## Controles

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen (alleen de bestaande waarschuwingen).
- `npx vitest run`: groen, 804 bestanden, 12239 tests geslaagd en 2 verwachte fouten van andere onderwerpen.
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: geen verschil.
- `kaart:vergelijk` niet gedraaid, op verzoek.

## Niet gecontroleerd

- Geen screenshot en geen Lookout: "ma 9 nov · wandelen mag", Hersteldag in het blad en de langere krachtzin heb ik niet op een scherm gezien.
- Het weekvoorschrift met het krachtblok zit niet in het voorbeeld; alleen de eerste twee weken zijn getoetst.
- Een eerste plan bij bestaande doelen (`existing`) en met logs is niet apart nagespeeld.
- Een rij die de beschikbaarheid laat staan omdat een eerder voorstel van die dag een wedstrijd zou raken, blijft op een dag waarop je niet kunt; de weekcontrole ziet hem. Niet apart getoetst met echte gegevens.
