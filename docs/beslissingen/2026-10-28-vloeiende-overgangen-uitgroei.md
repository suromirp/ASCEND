# Vloeiende overgangen, tweede ronde: de uitgroei en het schuiven

Datum: 2026-10-28
Status: aangenomen

## Besluit

De rest van onderdeel 1 van `docs/visie/Vloeiende overgangen.md`, bovenop `2026-10-28-vloeiende-overgangen.md` en de aanvulling daarop. Twee dingen, allebei alleen in Beweging Normaal.

1. Een blad dat uit een rij of kaart opent, groeit eruit en krimpt er weer in. Een eigen FLIP met een stil vlak in de kleur van het blad, geen View Transitions API.
2. Een training die van dag wisselt, schuift in Week van zijn oude naar zijn nieuwe plek, en de rijen eromheen schuiven mee.

## Keuzes

Rustig houdt de bestaande bladen en laat de verplaatste rij alleen kort verschijnen (150 ms). Uit en `prefers-reduced-motion` staan meteen op de eindstand. Er is geen krimp terug bij automatisch sluiten na Gedaan of Verplaatsen, want die sluiten via de pagina en niet via `requestClose`; wel bij het kruisje, de waas, de terugknop en het wegslepen. Schuiven bestaat eerst alleen op Week. Bij slepen begint de rij waar de zwevende rij losgelaten werd. Het afspelen wacht tot een voorstelblad weg is, hooguit 600 ms; daarna staat de rij gewoon op zijn plek. De `animate-rise-in` na een verplaatsing is vervallen.

Geen nieuwe instelling: het gaat om dezelfde Beweging die al bestond, en wie die op Rustig of Uit zet krijgt precies wat daar al beloofd werd.

## Vastgelegd

Uitgroei. Een rij met `data-sheet-from` (Week: `SessionRow` en `LooseRow`; Vandaag: de trainingsrijen via `DayRow sheetFrom`; Logboek: de rijen van de lijst; Ascend: `GoalCard`) onthoudt bij een tik waar je op tikte (`installSheetOrigin` in `main.tsx`, een luisteraar op `document`, 600 ms geldig, opgebruikt door het eerste blad). `useSheetClose` zet via `sheetRef` het blad in gang (`utils/sheetGrowDom.ts#startSheetGrow`): het paneel krijgt `data-grow` (de CSS vervangt de slide door een fade), en een `div` vast aan het scherm groeit met `element.animate()` op `transform` en `opacity` van de rij naar het paneel in 280 ms, met de inhoud die na 100 ms verschijnt. Sluiten via `requestClose` krimpt het vlak in 240 ms naar de rij, mits die nog in beeld is. Zonder gevonden rij, bij een rij die voor minder dan de helft in beeld staat of groter is dan het blad, doet het blad wat het deed. De rekensom staat in `components/growPlan.ts` met tests.

Schuiven. `armFlip()` (`utils/flipDom.ts`) meet vlak voor `applyProposal`, `commitPlanChange` (Akkoord op een voorstel) en `undoRecentChange` de plek van elke `[data-session-row]` in paginaruimte; `useFlipList` in `WeekPlanner` speelt het in een layout effect af. De voorbereiding verloopt na een seconde, dus een synchronisatie op de achtergrond animeert nooit. De duur is 220 tot 400 ms naar de afstand. `components/flip.ts` heeft de rekensom en tests.

## Reden

De eigenaar wil een premium gevoel dat de werking nooit in de weg zit. Alleen `transform` en `opacity`, geen lus, geen bibliotheek, en elke tik of de terugknop werkt tijdens het spelen gewoon.

## Alternatieven

View Transitions API: niet gekozen (bevriest de pagina, botst met de terugknop, tweede pad nodig), zie het ontwerp. Het blad zelf schalen: niet gekozen, tekst rekt uit.

## Niet gebouwd

Schuiven op Vandaag. Een krimp na automatisch sluiten. Dat de rij die je losliet tussen loslaten en nieuwe gegevens even op zijn oude plek staat is niet weggewerkt; het duurt een paar beelden.

## Bron

`docs/visie/Vloeiende overgangen.md`, `docs/beslissingen/2026-10-28-vloeiende-overgangen.md` en de aanvulling.

## Vervangt

Niets. De `animate-rise-in` van `rise` in `WeekPlanner` vervalt.

## Terugdraaien

`data-sheet-from` van de rijen halen en `installSheetOrigin` uit `main.tsx`, of `useFlipList` uit `WeekPlanner`. Er is geen opgeslagen vorm veranderd en niets in de planning.
