# De eerste weekvoorschriften na een back-up zijn geen wijziging

Datum: 2026-10-22
Status: aangenomen

## Besluit

Als er nog geen enkel week- of trainingsvoorschrift is opgeslagen (een verse installatie, of net een back-up teruggezet), vult de weekplanning de inhoud van de trainingen in zonder melding en zonder regel in het wijzigingslogboek. Alleen wat de planning zelf verandert (een training erbij, eraf of naar een andere dag) blijft een melding.

## Reden

Na het terugzetten van een back-up meldde de volgende opening "Weekplanning bijgewerkt, de inhoud van 9 trainingen bijgesteld". Dat was niet de weekcontrole: de voorschriften (minuten, afstand, hoogtemeters per training) zijn afgeleide gegevens en zitten niet in de back-up. De eerste opening rekende ze opnieuw uit en zag ze als nieuw, terwijl het toestel voor de back-up precies dezelfde inhoud had. De melding was dus niet terecht.

## Alternatieven

De voorschriften in de back-up opnemen: een schemawijziging met een migratie voor iets wat bij elke opening opnieuw te berekenen is. Niet nodig zolang de eerste berekening stil is.

## Bron

Lookout Doorloop, punt 14. `storage/weeklyPrescriptionStep.ts`, test in `storage/bootReplay.test.ts`.

## Vervangt

Niets.

## Terugdraaien

`initialBuild` in `weeklyPrescriptionStep.ts` op false zetten.
