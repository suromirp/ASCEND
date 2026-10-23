# Oefeningnamen zoals MacroFactor

Datum: 2026-10-23
Status: aangenomen

## Besluit

ASCEND noemt een oefening zoals MacroFactor hem noemt, in het Engels en zo specifiek als daar ("Bent-Over Underhand Grip Barbell Row", "45° Incline Barbell Press", "Pin-Loaded Machine Chest Press"). Elke naam uit de MacroFactor-logs van de eigenaar wordt herkend, zodat Forge een gewichtsvoorstel en de schijven kan geven.

Hoe een naam wordt opgelost:

- Een superset-achtervoegsel ("∈ SS1", ook zonder spaties, met "SS 1" of met tekst erachter) wordt weggehaald voor het vergelijken, ook bij een gereedschap tussen haakjes. Tekens als °, º en ’ breken het vergelijken niet.
- Een variant krijgt een eigen oefening als het gewicht of de beweging echt anders is en de progressie apart moet lopen: helling (45° tegen laag), pauze, brede of smalle greep bij bankdrukken, een ander toestel (gewichtenblok tegen schijven, quad-biased beenpers), één arm tegen twee.
- Alleen een andere greep, houding of aanhechting is een alias van dezelfde oefening: boven- of onderhandse, neutrale of brede greep bij de lat pulldown, staand of zittend schouderdrukken met dumbbells, touw of stang bij de rechte-armen pulldown, een lage katrol bij face pulls.
- Pin-loaded is `machine_stack` (stap van het toestel), plate-loaded is `machine_plates` (schijven, dus de plaatcalculator). Pin-loaded hoort nooit bij `usesPlates`.
- Bestaande oefeningen krijgen de MacroFactor-naam als weergavenaam waar de eigenaar ze zo logt. Het id blijft gelijk, zodat de historie gekoppeld blijft; de oude naam wordt een alias.
- Rollouts staan als lichaamsgewicht, ook "Barbell Rollout": een plaatcalculator heeft daar geen zin.

Eén wijziging aan een bestaande alias: "30° Incline Barbell Bench Press" hoorde bij de 45°-oefening en hoort nu bij "Low Incline Barbell Press".

Het standaardprogramma noemt de hoofdnamen van oefeningen die de eigenaar echt doet, met dezelfde slot-id's (`ex1` en verder), prioriteiten, sets en herhalingen:

- Bovenlichaam A: Barbell Bench Press, Bent-Over Underhand Grip Barbell Row, Barbell Overhead Press, Underhand Grip Cable Lat Pulldown, Standing Dumbbell Lateral Raise, Cable V-Bar Triceps Pushdown, Dumbbell Preacher Curl.
- Benen A: Barbell Back Squat, Barbell Romanian Deadlift, Seated Hamstring Curl, Bulgarian Split Squat, Step-Down, Pin-Loaded Leg Press Calf Raise, Plank.
- Bovenlichaam B: Pin-Loaded Machine Chest Press, 45° Incline Dumbbell Press, Chest-Supported Dumbbell Row, Neutral Grip Machine-Assisted Pull-Up, Standing Dumbbell Lateral Raise, Incline Hammer Curl, Overhead Triceps Extension.
- Benen B: Goblet Squat, Step-Up, Step-Down, Seated Single Leg Hamstring Curl, Seated Pin-Loaded Machine Calf Raise, Side Plank.

## Reden

De eigenaar logt kracht in MacroFactor. Veel namen daar kende ASCEND niet, dus Forge gaf geen gewichtsvoorstel en geen schijven. Ook vond hij de ASCEND-namen te vaag. Een test controleert nu dat elke naam uit zijn logs (als nagemaakte lijst) iets vindt.

## Alternatieven

- Elke variant een eigen oefening: dat splitst de progressie op zonder reden bij pure greepverschillen.
- Alles als alias: dan deelt een 45°-incline het gewicht met een lage incline en klopt het voorstel niet.
- Namen vertalen: nee, oefeningnamen blijven Engels (`2026-10-22-oefeningnamen-engels.md`).

## Bron

Gesprek met de eigenaar en zijn MacroFactor-logs (alleen de oefeningnamen).

## Vervangt

Niets. Het sluit aan op `2026-10-23-echte-oefeningen-in-het-standaardprogramma.md` en `2026-10-23-oude-oefeningnamen-blijven-in-de-historie.md`, die onaangeroerd blijven. Logs die een oude programmanaam dragen blijven zoals ze zijn; `engine/macrofactorSets.ts#legacySetShape` negeert het id van de oefening, zodat een andere sjabloonnaam geen valse overname voorstelt (met een test).

## Terugdraaien

De namen in `src/data/exercises.ts` en `src/data/defaultProgram.ts` terugzetten. De ids van bestaande oefeningen zijn niet veranderd, dus er is niets in opgeslagen gegevens om terug te draaien. Bestaande gebruikers houden hun eigen programma; alleen een nieuw standaardprogramma gebruikt de nieuwe namen.
