# Rechtzettingen na de review van ronde 2b

Datum: 2026-10-26
Status: aangenomen

## Besluit

`2026-10-26-planning-met-labels.md` blijft zoals het was. Dit zijn de rechtzettingen uit de review van ronde 2b.

- Een Verkenning krijgt alleen een wedstrijd op zijn dag (anker) en herstel als je het label zelf koos (`TrainingGoal.priorityChosen`, gezet in de app, nooit door de migratie). Een doel dat uit het oude "alleen volgen" kwam, blijft zonder anker en zonder blok.
- Het herstel (AFTER-GOAL) loopt door na de dag van de wedstrijd (`engine/raceBlock.ts#afterGoalWindows`), los van het blok. Een harde training die het herstel rustig maakte, krijgt `PlannedSession.afterGoal` en komt terug als het doel verschuift of weggaat. Alleen een sessie van het systeem zelf (slotniveau 3, niet in een tocht, niet van het wedstrijdblok) wordt teruggezet. Een gelogde sessie of een sessie in het verleden blijft helemaal ongemoeid, ook de markering; van een sessie die jij vastzette gaat alleen de markering weg.
- "Toch allebei" bewaart het paar van beide datums; verschuift een van beide, dan komt de melding terug.
- Een overgeslagen of al gelogde wedstrijd komt niet opnieuw in de planning.
- Bewust niet gedaan: half herstel bij een andere soort (onderzoek "Meerdere doelen en prioriteit", regel 5) is nog niet gebouwd, omdat er alleen hardloopblokken zijn.
- Het vierde punt (de lange loop) en de bewuste beperking "niet naast een tocht" zijn vervangen door `2026-10-26-groei-lange-loop.md`.

## Reden

De review vond dat het eerste besluit te ruim was in wat het herstel mocht aanraken, en dat enkele randgevallen (Verkenning, een verschoven wedstrijd, een gelogde wedstrijd) niet klopten.

## Alternatieven

Het eerste besluit herschrijven. Afgewezen: besluiten worden nooit herschreven.

## Bron

- De review van ronde 2b (Warden), 26 oktober 2026
- `docs/onderzoek/Meerdere doelen en prioriteit.md`

## Vervangt

Niets. Het vult `2026-10-26-planning-met-labels.md` aan waar dat besluit afwijkt.

## Terugdraaien

Revert van de commit van deze rechtzettingen. Het veld `PlannedSession.afterGoal` is optioneel en onschadelijk als het blijft staan.
