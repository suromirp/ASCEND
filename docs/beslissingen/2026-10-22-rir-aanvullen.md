# Herhalingen in reserve en opwarmsets aanvullen bij een log uit MacroFactor

Datum: 2026-10-22
Status: aangenomen

## Besluit

Een log die eerder uit MacroFactor kwam, heeft nog geen RIR en geen opwarmsets per set. Leest de gebruiker dezelfde training opnieuw in en zijn de werksets (herhalingen en gewicht, per oefening, in volgorde) precies gelijk aan die in het bestand, dan vult ASCEND alleen die lege velden aan: de RIR van een set die er nog geen heeft, en de opwarmsets van een oefening die er nog geen opgeslagen heeft. Dit valt onder `2026-10-22-lege-velden-aanvullen.md`: alleen lege velden, alleen na een tik van de gebruiker op de importkaart ("Alles verwerken"), nooit iets overschrijven, nooit iets verwijderen. Verschilt een werkset in iets, dan blijft die oefening zoals ze was.

## Reden

Het model van Forge (kracht meerekenen) heeft de RIR per set nodig. De trainingen die al zijn ingelezen hebben die niet. Opnieuw inlezen zonder aanvullen zou ze dubbel tellen of onbruikbaar laten.

## Alternatieven

Een tweede log maken (dubbel geteld). Niets aanvullen (het model mist de RIR van alles wat al is ingelezen). Ook sets aanpassen die afwijken (dat schrijft historie om).

## Bron

Code: `src/engine/macrofactorEnrich.ts`, `src/storage/macrofactor.ts#enrichLog`. Test: `src/engine/macrofactorEnrich.test.ts` (alles wat niet leeg was blijft gelijk).

## Vervangt

Niets. Breidt `2026-10-22-lege-velden-aanvullen.md` uit met opwarmsets, die als nieuwe sets worden toegevoegd aan een oefening die er nog geen had.

## Terugdraaien

De voorstelsoort `enrich` uit `planMacroFactor` halen. Reeds aangevulde logs houden hun RIR; dat zijn gegevens uit het bestand.
