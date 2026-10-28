# Plaatjes bij oefeningen, aanvulling: volgorde, wat weg is en het laden

Datum: 2026-10-28
Status: aangenomen

## Besluit

De tekeningen spelen in de volgorde van de beweging: stap 1 is de beginhouding, stap 2 het midden, stap 3 de eindstand. Wat een verkeerd of vaag plaatje geeft, is weggehaald: een verkeerd plaatje is erger dan geen plaatje. Het blad haalt je niet meer uit een lopende training, en het laden is strakker.

## Reden

De bron bewaart de drie beelden niet altijd in de volgorde van de beweging; bij een pull-up kwam de opening bij "hangend" uit op "boven". Een tekening die een andere oefening laat zien (een Pallof press die opzij duwt, een ab wheel met een stang erbij) leert je het verkeerde. En een tik op "Bronnen en licentie" in het blad nam je mee uit Forge, midden in je training.

## Wat er veranderd is

- Volgorde: `ART_ORDER` in `data/exerciseArt.ts`, per slug welk beeld bij stap 1, 2 en 3 hoort (een rangschikking van 0, 1 en 2, getest). Geen regel betekent de volgorde van het bestand. `utils/exerciseArtLoader.ts` zet de beelden goed bij het laden, `engine/exerciseArtData.ts#orderedDrawing` doet het werk. De bestanden zelf zijn niet veranderd. Wie een tekening toevoegt, bekijkt de drie beelden en zet zo nodig een order.
- Weg (alleen de spierkaart): pallof press (de tekening duwt opzij in plaats van recht vooruit, en het middelste beeld is een vage afdruk), hack squat (lijkt op de leg press), ab wheel rollout en barbell rollout (de tekening mengt een stang en een wiel), cable high row (de face pull is te ver weg). De bestanden `ab-wheel`, `pallof-press` en `hack-squat` zijn uit `public/exercise-art/` gehaald.
- Variant met een regel in plaats van exact: lat pulldown ("een bovenhandse greep"), barbell row ("een brede greep, bovenhands"), dumbbell bench press en de pauzevariant ("een schuine bank"), bodyweight calf raise ("met twee stangen om je aan vast te houden"), dip ("op een toestel dat je helpt, op je knieën"). De regels van low incline dumbbell fly ("een steilere bank") en low-to-high cable fly ("op een schuine bank in plaats van staand") kloppen nu met de tekening.
- Nieuwe tellingen: 76 oefeningen met een exacte tekening, 32 met een variant en 12 met alleen de spierkaart (van 120), samen 89 tekeningen.
- Licentie: een bron "Licentie CC BY-SA 4.0" bij de soort Afbeeldingen (https://creativecommons.org/licenses/by-sa/4.0/deed.nl), en in het blad een directe link "Licentie CC BY-SA 4.0" die in een nieuw tabblad opent, zodat je training blijft staan. `ATTRIBUTION.md` zegt dat het drie standen van de beweging zijn, in de volgorde begin, midden, eind.
- Laden: `?v=1` achter de url (`DRAWING_VERSION`, ophogen als een bestand verandert), `purgeOnQuotaError` op de cache "exercise-art", de prefetch kijkt elke ronde naar `navigator.onLine` en stopt na de eerste mislukking, en het blad toont na ongeveer anderhalve seconde de spierkaart als de tekening nog niet binnen is (en de tekening alsnog als hij komt).
- Lijndikte: de lijn van de tekeningen is `vector-effect: non-scaling-stroke`, zodat elke tekening even dik lijkt, ongeacht hoe ver zij is verkleind.

## Alternatieven

De volgorde in de bestanden zelf omzetten: dan wijken de bestanden af van de bron en is de naamsvermelding minder eenvoudig waar te maken. Het blad voor de bronnen boven Forge openen: meer code en een tweede laag voor een regel die een link kan zijn.

## Bron

Het onderzoek `docs/onderzoek/Afbeeldingen bij oefeningen.md` (een verkeerd plaatje is erger dan geen plaatje) en de doorloop van Lookout.

## Vervangt

Niets; het telt als aanvulling op `2026-10-28-plaatjes-bij-oefeningen.md`, waarvan de getallen (85, 28, 7) hierdoor veranderen.

## Terugdraaien

Haal `ART_ORDER` leeg en zet de koppelingen terug uit de git-geschiedenis.
