# Na je hoofddoel wijzigen is een voorstel als het doel voorbij is

Datum: 2026-10-22
Status: aangenomen

## Besluit

Aanvulling op `2026-10-22-na-het-hoofddoel.md`, dat niet is herschreven. De
keuze "Na je hoofddoel" (Instellingen, Programma) wordt direct opgeslagen
zolang je hoofddoel nog voor je ligt of onderweg is: dan verandert er nog
niets aan de planning. Ligt het doel al achter je, dan verandert de keuze de
planning meteen. Dan komt eerst een voorstel met Akkoord en Liever niet, met in
gewone woorden wat er gebeurt: onderhoudsweken erbij, of hoeveel open
trainingen er van de planning gaan. Pas na Akkoord wordt de keuze opgeslagen.
Staat er na het doel niets open, dan is er niets te vragen en gaat het direct.

## Reden

Alles wat de planning inhoudelijk verandert gaat via een voorstel met Akkoord,
nooit stil (`docs/beslissingen/2026-10-21-werkwijze.md`). Na het doel was dit
de enige keuze die zonder vraag weken toevoegde of weghaalde.

## Alternatieven

Altijd een voorstel, ook voor het doel: dan vraagt de app akkoord voor iets
wat nu niets verandert. Een volledig voorstel met elke training die erbij komt:
vraagt een tweede planningsronde in het geheugen, voor een keuze die je hooguit
één keer maakt. Het voorstel zegt nu in gewone woorden wat er gebeurt, en wie
terug wil kiest de andere optie, weer met een voorstel.

## Bron

Review van Warden. `engine/programLayout.ts#afterMainGoalChange`,
`src/pages/Settings.tsx`.

## Vervangt

Niets.

## Terugdraaien

In `Settings.tsx` de keuze weer altijd direct opslaan; de functie
`afterMainGoalChange` kan dan weg.
