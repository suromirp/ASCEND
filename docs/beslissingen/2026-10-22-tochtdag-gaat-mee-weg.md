# Een tochtdag gaat met zijn tocht mee weg

Datum: 2026-10-22
Status: aangenomen

## Besluit

Een wandeldag die een tocht of periode zelf op je planning zette, verdwijnt van de planning als je die tocht wijzigt of verwijdert. Het is geen overgeslagen training. Rijen die een oudere versie al zo achterliet, ruimt de planningsronde op, maar alleen als aantoonbaar is dat een tocht ze plaatste en weer weghaalde, en nooit als er een log bij hoort.

## Reden

Bij elke wijziging van een tocht bleef per oude tochtdag een rij "Overgeslagen Bergtocht" staan, en bij een tweede wijziging nog een. Die rijen bliezen het weektotaal op (meer dan 20 uur in een week van ongeveer 5) en telden zodra de dag voorbij was als niet gedaan bij Volgehouden en bij de coach. Een dag die de tocht zelf bedacht was nooit een training van jou, dus er is niets om als overgeslagen te bewaren.

## Alternatieven

De rij laten staan en overal verbergen: dan moet elk scherm en elke telling hem herkennen, en één vergeten plek telt hem weer mee. Weggooien is eenvoudiger en eerlijker. Ongedaan maken in de melding zet de rij gewoon terug, zoals elke andere aangeraakte rij.

## Bron

Lookout Doorloop, punt 1 (blokkerend). `engine/leaveProposal.ts` (het weghaalitem krijgt `discard`), `engine/proposalEngine.ts`, `engine/leaveStrays.ts` (opruimen), `storage/database.ts#syncProgramHorizon`.

## Vervangt

Niets. Vult `2026-10-22-tochten-als-doel.md` aan.

## Terugdraaien

`discard` niet meer zetten in `leaveProposal.ts` en de aanroep van `strayTrekRows` in `syncProgramHorizon` weghalen.
