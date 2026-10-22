# Garmin-trainingen via intervals.icu

Datum: 2026-10-22
Status: aangenomen

## Besluit

Trainingen van het Garmin-horloge komen binnen via intervals.icu, met de eigen sleutel van de eigenaar. Ze worden als voorstel getoond (Opslaan, Andere training, Niet opslaan), nooit stil opgeslagen. De sleutel staat los van de instellingen en gaat nooit mee in een export of back-up.

## Reden

Zonder server is dit de enige route die op Android en iPhone werkt: intervals.icu staat browserverzoeken toe, Garmin zelf niet. De eigenaar gaf akkoord dat zijn data via intervals.icu loopt.

## Alternatieven

Garmin Personal API (geen browsertoegang). Health Connect (niet vanuit een webapp). Strava (betaald, geen daling). Bestanden met de hand.

## Bron

Eigenaar, 21 oktober 2026. docs/visie/Data zonder handwerk.md. Code: src/integrations/intervalsIcu.ts.

## Vervangt

Niets.

## Terugdraaien

Ontkoppelen onder Meer wist de sleutel en de opgehaalde activiteiten.
