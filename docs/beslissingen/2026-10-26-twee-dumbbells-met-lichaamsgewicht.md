# Twee dumbbells met lichaamsgewicht in de last

Datum: 2026-10-26
Status: aangenomen

## Besluit

Bij een dumbbell-oefening met een deel van het lichaamsgewicht in de last (split squat, Bulgarian split squat, walking lunge, reverse lunge, step-up) is de last het deel van het lichaamsgewicht plus twee keer het gelogde gewicht als je per dumbbell logt, en plus het gelogde gewicht als je het totaal van twee logt. Een oefening met één dumbbell (goblet squat) en een oefening zonder lichaamsgewicht in de last rekenen als eerst.

## Reden

Wie per dumbbell logt, heeft twee dumbbells in handen. Het model telde er één, waardoor een stap van één dumbbell als een te kleine stap in de last gold en de voorstellen per hand ongeveer twee keer te grote sprongen maakten. Zonder lichaamsgewicht in de last viel dat niet op, want dan is alles binnen de oefening dezelfde maat. Per dumbbell en als totaal geven nu voor dezelfde training dezelfde last.

## Alternatieven

De fracties van het lichaamsgewicht veranderen (LG-1 tot LG-3 in het onderzoek): nog geen besluit, hier niet aangeraakt. Het logboek omrekenen naar totalen: nee, het logboek verandert nooit, alleen de berekening.

## Bron

`docs/onderzoek/Lichaamsgewicht in de last bij beenoefeningen.md` (laatste bevinding en LG-2) en `docs/beslissingen/2026-10-25-kracht-eigen-regels.md` (dumbbells als totaal van twee).

## Vervangt

Niets. Het vult het besluit over dumbbells als totaal aan.

Bekende beperking: de overzichten van de geschiedenis (de lijn met geschatte kracht en de vergelijking met wat je deed) lezen per oefening één maat voor de hele geschiedenis. Slaat "Vanzelf herkennen" halverwege om van per dumbbell naar totaal, dan wordt een oud voorstel daar in de nieuwe maat gelezen. Het voorstel zelf kijkt altijd alleen naar de trainingen ervoor.

## Terugdraaien

Laat de keuze `dumbbellTotal` in `loadFromExternal` en `externalFromLoad` (`src/engine/strengthWeights.ts`, de vermenigvuldiger in `handsFactor`) altijd 1 geven. Er is niets opgeslagen om terug te zetten.
