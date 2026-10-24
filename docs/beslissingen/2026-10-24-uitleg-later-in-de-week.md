# Uitleg van een training later in de week alvast openen

Datum: 2026-10-24
Status: aangenomen

## Besluit

Het blad van een training van morgen of later heeft een rij "Hoe je het doet", boven "Vandaag al doen" en "Overslaan". Die opent hetzelfde trainingsscherm als op de dag zelf, maar alleen om te lezen. Voor een loop, wandeling of tocht is dat het duurscherm met de opbouw, de zones en het opwarmen. Voor kracht is dat het Forge-scherm met het voorschrift per oefening, zonder invulvelden. Het scherm toont de dag en de week van de training zelf ("Donderdag 29 oktober · Week 6 van 12, opbouwfase"), niet die van vandaag.

Alleen lezen betekent: geen "Gedaan, invullen", geen afvinken en geen Opslaan. Onderaan staat Sluiten, met Info als er een uitleg bij de training is. Kracht heeft bovenaan Sluiten in plaats van Afronden. Het scherm schrijft geen concept weg en raakt het concept van de dag zelf niet aan, en houdt het scherm niet aan. De terugknop sluit het scherm en laat het blad staan.

Voor een training van vandaag of een dag die voorbij is verandert er niets. Een overgeslagen training krijgt de rij niet: die heeft "Toch doen".

## Reden

Je wilt donderdag al weten wat zaterdag gevraagd wordt: hoe lang, hoe zwaar, wat voor opwarmen, welke oefeningen. Het scherm bestond al, maar alleen voor vandaag. Het blad had voor later alleen keuzes die iets veranderen (verplaatsen, vandaag doen, overslaan).

## Alternatieven

Een eigen, kleiner uitlegscherm voor later: twee schermen die hetzelfde zeggen en uit elkaar kunnen lopen. Hergebruik houdt het voorschrift op een plek.

Het formulier laten staan en alleen Opslaan uitzetten: een invulveld voor iets dat nog niet gebeurd is nodigt uit tot invullen en tot verwarring over de dag.

## Bron

Verzoek van de eigenaar, 24 oktober. Het duurscherm: `2026-10-24-trainingsscherm-duursport.md`.

## Vervangt

Niets. Vult `2026-10-24-trainingsscherm-duursport.md` aan.

## Terugdraaien

In `src/engine/sessionActions.ts` de rij `preview` weghalen uit de keuzes voor een dag die nog komt; de prop `preview` van `ExerciseLogger` en `ForgeWorkout` is dan ongebruikt en kan mee weg.
