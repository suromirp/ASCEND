# Alles verwerken uit MacroFactor als eigen ronde

Datum: 2026-10-22
Status: aangenomen

## Besluit

Alles verwerken loopt als één ronde buiten de kaart (`storage/macrofactorRun.ts`)
met voortgang op de knop, een grens van 45 seconden per stap en een eerlijke
uitkomst. Een rij die af is verdwijnt van de kaart; een groep overnames alleen
als hij helemaal lukte. Twee tikken zijn één ronde, en zolang een stap die over
zijn tijd ging nog loopt, start er geen nieuwe ronde, zodat een log nooit dubbel
wordt opgeslagen.

## Reden

De knop bleef bij de eigenaar op "Bezig…" staan zonder dat hij wist wat er
gebeurde, en de kaart wachtte op een verversing van de hele app.

## Alternatieven

Alleen een grens op de knop: laat de opslag op de achtergrond doorlopen terwijl
een nieuwe tik hetzelfde nog eens kan doen.

## Bron

Gesprek met de eigenaar op 22 oktober 2026, review van Warden.

## Vervangt

Niets.

## Terugdraaien

De oude `processAll` in `MacroFactorCard.tsx` terugzetten.
