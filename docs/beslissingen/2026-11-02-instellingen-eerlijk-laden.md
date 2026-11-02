# Instellingen laden per bron en nooit een verzonnen waarde

Datum: 2026-11-02
Status: aangenomen

## Besluit

De feiten van Instellingen laden per bron, elk met een eigen grens van 2 tot 4 seconden (`utils/loadParts.ts`, `components/settings/factsLoader.ts`). Een rij die de eerste keer nog wacht zegt "Bezig…". Een bron die te lang duurt of faalt zegt "Onbekend", gedimd en zonder regel eronder; een standaardwaarde zoals "Niet gekoppeld", "0" of "Alles staat alleen op deze telefoon" wordt nooit getoond voor iets wat we niet weten.

## Reden

Eén trage bron (het tellen van de reeksen) hield alle rijen een minuut tegen. Een terugval met een verzonnen waarde loste dat op ten koste van de waarheid: wie wel gekoppeld is, zou "Niet gekoppeld" zien. Had een bron al eens een waarde, dan blijft die staan en wordt hij nooit overschreven door een mislukte ronde. Elke bron heeft een teller, zodat een laat antwoord van een oudere vraag een nieuwer antwoord niet overschrijft.

## Alternatieven

Een terugval per bron (verworpen: verzint feiten). Alles op één tijdsgrens (verworpen: houdt snelle rijen tegen).

## Bron

Meting van de eigenaar in de Android-app en de Chromium-doorloop op 360 px met vertraagde processor.

## Vervangt

Niets.

## Terugdraaien

Terug naar één `Promise.all` in `useSettingsFacts`; dat brengt de wachttijd terug.
