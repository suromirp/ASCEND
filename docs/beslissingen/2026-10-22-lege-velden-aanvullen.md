# Een import mag lege velden van een bestaande log aanvullen

Datum: 2026-10-22
Status: aangenomen

## Besluit

Een import (MacroFactor, het horloge) mag in een bestaande SessionLog alleen velden vullen die leeg zijn, en alleen na een tik van de eigenaar. Een bestaande waarde wordt nooit overschreven; een log wordt nooit verwijderd.

## Reden

Wie een training eerst afvinkt (Gedaan in MacroFactor) en later de export inleest, wil de sets en RIR erbij zonder een tweede log. De regel "historie wordt nooit herschreven" gaat over wat er gebeurde; aanvullen wat ontbrak verandert dat niet.

## Alternatieven

Een tweede log maken (dubbel geteld). Niets aanvullen (RIR en sets gaan verloren).

## Bron

Review 22 oktober 2026. Code: src/storage/macrofactor.ts.

## Vervangt

Niets.

## Terugdraaien

In macrofactor.ts het aanvullen uitzetten; de import maakt dan alleen nieuwe logs.
