# Tijdens en na het hoofddoel staat er geen training

Datum: 2026-10-22
Status: aangenomen

## Besluit

Het plan eindigt op de dag van je hoofddoel, ook als die dag gekomen is. Tijdens de GR5 (van de eerste tot de laatste loopdag) staat er geen gewone training, en daarna ook niet, tot je een nieuw doel kiest of het doel op behaald zet. Vandaag zegt dan "GR5, dag 2 van 30" of dat het doel achter je ligt, Ascend telt niet meer af maar zegt "onderweg" of "voorbij", en een tussendoel waarvan de dag voorbij is staat niet meer onder "Ook onderweg naar".

Wie na de tocht gewoon wil doortrainen, kiest bij Instellingen, Programma, "Na je hoofddoel" voor Onderhoudsweken. Die beginnen pas na de laatste dag van de tocht; tijdens de tocht nooit. Het advies en de standaard is Niets meer plannen.

## Reden

Met de klok op 2 augustus 2027 (dag 2 van de GR5) plande de app "Week 45, onderhoud" met een zware beendag, zei Ascend "nog 0 weken" en "Klaar voor de GR5 0%", en stond de 10 km van 20 maart nog als komend tussendoel. Het hoofddoel telde na zijn datum niet meer als einde van het plan, dus de planning liep door alsof er geen doel was.

## Alternatieven

Altijd onderhoudsweken na het doel: dan staat er tijdens een tocht van dertig dagen een gewone trainingsweek. Het doel automatisch op behaald zetten na de laatste dag: dat is een keuze van jou, niet van de app.

## Bron

Lookout Doorloop, punt 10. `engine/programLayout.ts#planEndDay`, `engine/goalRoute.ts#goalTiming`, `storage/database.ts#syncProgramHorizon`, `AppSettings.afterMainGoal`.

## Vervangt

Niets.

## Terugdraaien

`planEndDay` vervangen door `programAnchorDate` in de planning; de instelling kan dan weg.
