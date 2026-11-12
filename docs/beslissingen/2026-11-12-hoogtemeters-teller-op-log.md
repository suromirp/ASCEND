# Hoogtemeters: het merk van de teller op een log

Datum: 2026-11-12
Status: voorgesteld

## Besluit

Een nieuw log draagt op `detail` en op `runDetail` een optioneel veld `counter: 2`: de stijging is geteld met de teller van `engine/elevation.ts`. Een log zonder dat veld is geteld met de oude dode band. De grens voor vlak bij zone 2 uit de bewaarde kilometers (`zone2Pieces.ts#kmPieces`) is 10 m per km voor een log met het merk en blijft 5 m voor een log zonder.

De keuzes:

- **Een toevoeging, geen herschrijving.** Geen bestaand log krijgt het veld erbij en geen bestaand getal verandert. Het veld komt alleen op wat nieuw wordt gebouwd: `buildActivityDetail` en `buildRunDetail` zetten het altijd (`ELEVATION_COUNTER`).
- **Opnieuw berekend is nieuw geteld.** `runDetail` dat opnieuw wordt gebouwd na een wijziging bij de bron (andere totalen) of omdat het ontbrak, en het profiel na inkorten, krijgen het merk, want ze zijn met de nieuwe teller geteld. Inkorten ongedaan maken zet het oude profiel terug zoals het was, zonder merk.
- **Geen stap in het schemanummer, wel defensief lezen.** Het veld is optioneel en erbij, net als `runDetail` en `zone2Pieces` zelf dat waren. Een back-up van voor deze stap heeft het niet en importeert zoals hij was. `migrateActivityDetail` bouwt het profiel veld voor veld op en bewaart het merk alleen als het precies 2 is; iets anders valt weg en de rest van het profiel blijft. `runDetail` gaat bij het lezen in zijn geheel door (`isUsableRunDetail`), dus het merk reist mee; een merk dat de app niet kent telt bij het lezen van de grens als geen merk.
- **De waarde 2.** De oude dode band is de eerste teller en heeft geen merk; deze is de tweede. Verandert de telwijze later zo dat getallen per kilometer verschuiven (bijvoorbeeld een ander venster voor het gladmaken), dan hoort daar een nieuw nummer bij.
- **De grens: 10 m per km** (`ZONE2_RULES.flatMetresPerKmCounted`). De 5 m was afgesteld op een teller die tien meter per klim en afdaling verloor. Naspelen met de echte lopen van de eigenaar (vijf vlakke lopen en een heuvelloop, met gladmaken over 30 seconden): veel vlakke kilometers komen tussen 5 en 8 m, en boven 10 m blijven er drie over, waarvan twee in een loop met echte kleine hellingen. Op de nagemaakte reeksen: 17 van de 35 vlakke kilometers gaan over 5 m, geen enkele over 10 m (hoogste 9,0 m).
- **Wat niet meebeweegt.** `stablePieces` (uit de reeks per seconde) houdt zijn eigen dode band en dus de grens van 5 m. `PACING.climbM` (10 m), `HILLY_M_PER_KM` (10 m per km) en de 15 m per km in `runDetailRules.ts` en `runMetrics.ts#formOf` blijven staan. Bijvangst die blijft: de nagemaakte heuvellus gaat van 10,3 naar 15,9 m per km eigen telling en heet bij een nieuw log te heuvelachtig voor een oordeel over tempo en loopvorm, en de regel "De route was heuvelachtig" verschijnt vaker.

## Reden

Zonder merk leest een regel met een grens op de eigen stijging oude en nieuwe logs met dezelfde maat, terwijl ze anders zijn geteld. Bij zone 2 zou de helft van de vlakke kilometers van een nieuw log niet meer vlak heten en met het gecorrigeerde tempo tellen in plaats van het echte.

## Alternatieven

- De grens voor alle logs naar 10 m: dan heten oude kilometers met 5 tot 10 m in de oude telling (in werkelijkheid 15 tot 20 m) ten onrechte vlak.
- De datum van het log als scheiding: klopt niet voor een oud log dat opnieuw wordt berekend.
- Oude logs herrekenen uit de bewaarde reeksen: herschrijft afgeleide velden en is uitgesloten.
- `version` ophogen: de lezers eisen `version === 1` en zouden een nieuw log in een oudere app weggooien.

## Bron

`docs/beslissingen/2026-11-12-hoogtemeters-stap-1.md` (de meting per kilometer), het naspelen door de coördinator met de back-up van de eigenaar, de opdracht van de coördinator van 12 november. Tests: `src/engine/elevationCounter.test.ts`.

## Vervangt

Niets. Het vult `2026-11-12-hoogtemeters-stap-1.md` aan: het voorstel onder Meting daar is hiermee gebouwd.

## Terugdraaien

De commit terugdraaien. Logs die intussen het veld kregen houden het; een app zonder deze stap negeert het bij `runDetail` en laat het bij het importeren van `detail` weg.
