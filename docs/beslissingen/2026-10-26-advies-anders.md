# Anders dan het advies, op de plek zelf

Datum: 2026-10-26
Status: aangenomen

## Besluit

De grote kaart "Anders dan het advies" bovenaan het overzicht van Instellingen is weg. Wat jij
anders koos dan het advies zie je op de plek zelf: de rij krijgt het kleine, gedempte label
"aangepast" (zelfde stijl als "auto"). In het keuzeblad staat bij de geadviseerde keuze "Advies",
en kiezen is terugzetten. Wie alles wil zien heeft één rij "Aangepaste instellingen" onder Gegevens
en back-up, met het aantal als waarde, die een blad opent met de lijst en onderaan "Alles terug naar
het advies" (met bevestiging). Is er niets aangepast, dan is de rij er niet.

## Reden

De kaart was groot, stond boven alles wat je kwam doen, en uitgeklapt was het een lange lijst met
steeds "Terug naar advies". De eigenaar vond hem niet mooi en snapte hem niet.

## Wat er is gebouwd

- `adjustedRows` (`engine/settingsAvailability.ts`): welke rijen een aangepaste instelling hebben,
  ook als die in het blad van een rij zit. `SettingsRow` leest dat uit `SettingsAdjustedContext`.
- "Alles in deze groep terug naar het advies" onderaan een groep is een `TextButton` en er alleen
  als in die groep iets anders staat.
- Wat de planning raakt gaat bij terugzetten nog steeds samen in één voorstel met Akkoord.

## Alternatieven

Een teller op de tandwielknop: te onrustig. Een eigen groep: de rij hoort bij gegevens.

## Vervangt

Het onderdeel "Anders dan het advies bovenaan het overzicht" van `2026-10-26-instellingen-opruimen.md`.
De engine (`settingsDiff.ts`) en het terugzetten zelf blijven.

## Terugdraaien

Alleen UI en indeling; geen opgeslagen veld veranderd.
