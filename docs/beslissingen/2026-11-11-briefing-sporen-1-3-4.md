# De Briefing, sporen 1, 3 en 4: route alleen buiten, de plek onthouden, de engine

Datum: 2026-11-11
Status: aangenomen

## Besluit

Spoor 1, 3 en 4 uit hoofdstuk 7 van `docs/visie/Ontwerp Route en trainingsscherm.md`, binnen `2026-11-11-briefing.md`.

- Spoor 1: `engine/routeTarget.ts#wantsRouteAt` zegt of er bij een training en een keuze een route hoort. Het trainingsscherm toont Route voorstellen alleen als die ja zegt. Bij Loopband is de rij weg, bij Buiten terug.
- Spoor 3: `engine/trainingPlace.ts` geeft de keuzes, de standaard, de geldende keuze en of er een route bij hoort. `storage/trainingPlace.ts` bewaart de keuze per geplande training op dit toestel. Het trainingsscherm leest hem als beginwaarde en bewaart een tik meteen.
- Spoor 4: `engine/briefing.ts` zegt wat er op de Briefing staat, zonder scherm. Het geeft de stand, de keuzes, de plek van de kaart, de vakken en de knop in de onderbalk.

Eigen keuzes:

- Een route hoort bij een keuze buiten en te voet. Buiten op de fiets (Fietsen, buiten, op een loopdag) krijgt ook geen looplus. Zonder keuze of met een sleutel die de training niet kent, telt de training zelf, zoals voorheen.
- Met Garmin Suggested of Vrij als manier telt de keuze niet mee voor de route. Dan beslist alleen de training.
- De keuze geldt alleen voor die ene geplande training (eigenaar). Ze staat onder één sleutel `trainingPlaces` in de meta-opslag, met de dag. Bij een nieuwe keuze gaan keuzes van meer dan 14 dagen oud weg, en er blijven er hoogstens 100.
- Bewust niet in de export en niet in een back-up, dus geen migratie. Het is een voorkeur voor één training die binnen dagen voorbij is. Wat er echt gebeurde staat in het log (`modality`, `environment`), en dat verandert niet. Een oude back-up of een ander toestel heeft geen keuze, en dan geldt de standaard. Een kapotte, onbekende of vergrendelde waarde valt stil terug op de standaard.
- Het concept van het scherm en een tik gaan voor de bewaarde keuze. De bewaarde keuze komt asynchroon binnen en overschrijft nooit iets wat je al koos.
- Ook in de leesstand (een training van een latere dag, vanuit Week) wordt een tik bewaard. Daar kies je hem vooraf.
- De stand van de Briefing is "zelf invullen" zolang de koppeling nog gelezen wordt (de veilige kant, zoals het ontwerp zegt), zonder koppeling, met Vanzelf afvinken uit, zonder trainingen van je horloge, bij een stille koppeling, en bij een testloop of wedstrijd. Alleen een stilte van trainingen telt: stille ochtenden alleen houden het afvinken niet tegen.
- De knop in de onderbalk: Zelf invullen als je zelf invult. Route naar Garmin Connect als je horloge afvinkt en er een route is. Anders Sluiten (loopband, Route voorstellen uit, of al gedaan), zoals in het ontwerp.
- Een training die al een log heeft: de stand "Deze training is al gedaan.", geen kaart en geen zoektocht, de knop Sluiten.
- De plek van de kaart: de route bij Buiten (zoeken bij openen vandaag en morgen, verder weg na een tik), wat je instelt bij loopband of binnen, de plekken in de buurt bij een wandeling of rugzaktraining buiten (de planner kan nog geen wandelroutes), en niets bij Route voorstellen uit of op de fiets.
- De vakken: Wat je loopt heeft duur, zone ("tot zone 4-5" als de stappen verschillen) en het rugzakgewicht. Het vak Horloge bestaat als het blad Je horloge bestaat. De korte stand staat erin, amber als versturen mislukte. Weer en kleding staat alleen bij een keuze buiten. Het heeft de temperatuur en de eerste kledingregel, amber bij weer dat niet prima is, en "Nog geen weer" zonder voorspelling. Staan weer en kleding allebei uit, dan is er geen vak. Eten en drinken heeft één regel met drinken uit je zweettempo (alleen buiten, vanaf 90 minuten) en eten onderweg (ook op de loopband, achter de instelling Eten onderweg), zoals "1,5 liter en 2 tot 4 gels mee". Zonder weer staat er "Drinken" zonder hoeveelheid. Zonder drinken en zonder eten is er geen vak.
- De drinkregel staat op één plek: `engine/eveningBefore.ts#drinkAmount` en `drinkLine`. De Avond ervoor en de Briefing lezen dezelfde regel. De uitzondering voor testloop en wedstrijd is `engine/autoTick.ts#mayAutoTick`, en Vanzelf afvinken gebruikt hem zelf ook. Het gedrag van beide is ongewijzigd.
- Eten onderweg kwam tijdens dit werk op main. Het vak leest `engine/fuelOnTheGo.ts#fuelForTraining`, met één nieuwe korte vorm `fuelShortText` ("2 tot 4 gels") voor het smalle vak. Er is geen eigen rekenregel voor eten.

## Reden

De eigenaar: "Op de loopband heb je natuurlijk geen route nodig." Week en Vandaag moeten later weten waar je traint, en de Briefing (spoor 5) heeft een engine nodig die zegt wat erop staat.

## Alternatieven

De keuze in de back-up, met een migratie. Niet gedaan: het is een keuze voor een paar dagen, en het log bewaart al wat er gebeurde. De keuze in `localStorage`, zodat hij synchroon gelezen wordt. Niet gedaan: de rest van wat op dit toestel blijft, staat in de meta-opslag.

## Bron

`docs/visie/Ontwerp Route en trainingsscherm.md`, `docs/beslissingen/2026-11-11-briefing.md`, de opdracht van de coördinator van 11 november.

## Vervangt

Niets.

## Terugdraaien

Spoor 1: in `ExerciseLogger.tsx` weer `wantsRoute(template)`. Spoor 3: de beginwaarde en `choosePlace` eruit. De sleutel `trainingPlaces` mag dan blijven staan, want niemand leest hem nog. Spoor 4 heeft nog geen scherm.
