# Het weekvoorschrift volgt de planningsronde

Datum: 2026-11-09
Status: aangenomen

## Besluit

Het weekvoorschrift houdt alleen de toevoegingen en verplaatsingen die de planningsronde daarna laat staan. De stap draait de ronde in het geheugen over de planning met zijn wijzigingen erin (`previewProgramHorizon`, zonder te schrijven) en laat vallen wat de fase-regel omzet of de weekcontrole terugzet of weghaalt (`src/engine/weeklyPrescriptionDiff.ts#changesTheRoundKeeps`, `src/storage/weeklyPrescriptionStep.ts#keptByPlanningRound`). De ronde wint; het voorschrift onthoudt niets, het rekent het elke opening opnieuw na. Daarnaast meldt de ronde een omzetting alleen nog als de rij zo blijft: een rij die daarna weggaat, zegt alleen "eruit".

## Reden

Melding van 9 november: "Weekplanning bijgewerkt" kwam bij elke opening terug. Het voorschrift zette een Wandeldag in een week waarin de fase er geen wil, de ronde maakte er Heuvelintervallen van en haalde hem weg omdat die er al stonden, en de volgende opening begon opnieuw. Met de ronde zelf als toets staan de fase-regel en de weekcontrole op één plek; een tweede kopie van de regels in het voorschrift zou bij de volgende regel weer uit elkaar lopen. Dezelfde toets vangt ook een dubbele training op dezelfde dag (nagespeeld met Heuvelsprints en afdalen naast de zaterdagtraining).

## Alternatieven

Alleen de fase-regel (`templateForPhase`) in het voorschrift toetsen: vangt de Wandeldag, maar niet wat de weekcontrole weghaalt. Het voorschrift laten onthouden wat de ronde eerder weghaalde: extra opgeslagen vorm met een migratie, en het blijft fout zodra de week verandert. De ronde het voorschrift laten volgen: dan schuift de weekcontrole niets meer recht en komt de dubbele training op het plan.

## Bron

Melding van de eigenaar (9 november), nagespeeld op nagemaakte gegevens in `src/storage/openingPingpong.test.ts`.

## Vervangt

Niets.

## Terugdraaien

Haal de aanroep van `keptByPlanningRound` uit `runWeeklyPrescriptionStep` en de regel met `finalById` uit de omzettingen in `syncProgramHorizon`. De test `src/storage/openingPingpong.test.ts` faalt dan weer.
