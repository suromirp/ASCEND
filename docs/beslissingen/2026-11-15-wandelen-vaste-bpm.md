# Wandelen en StairMaster: vaste bpm uit je hardloopzones, geen zone

Datum: 2026-11-15
Status: aangenomen

## Besluit

Een wandelworkout naar je horloge (de StairMaster bij een looptraining, en elke wandeltraining met soort Walk of Hike) krijgt geen zonedoel op een stap. Boven de stappen staat een regel met vaste slagen per minuut uit je hardloopzones ("Hartslag onder 151 bpm."), en de rij Horloge in de Briefing zegt dezelfde getallen ("Hartslag onder 151 bpm, uit je hardloopzones."). De instelling Hartslag bij wandelen staat aan (het advies); uit is het gedrag van voor dit besluit.

## Reden

De eigenaar meldde op 14 november met schermafdrukken van intervals.icu: daar zijn alleen instellingen voor Fietsen, Hardlopen, Zwemmen en Andere. Wandelen valt onder Andere, en daar staan geen eigen hartslagzones. Een doel als "Z2 HR" of "75-85% LTHR" heeft op een wandelworkout dan geen maat.

## Wat ik vond

- De workouttaal van intervals.icu kent voor hartslag alleen een percentage van de maximale hartslag (`70% HR`), van de drempel (`90-95% LTHR`) en zones (`Z2 HR`). Zo staat het in de Workout Builder Syntax Quick Guide op het forum.
- Een vaste waarde in bpm kent hij niet. De maker schreef op 24 maart 2024 dat het op zijn lijst staat maar lastig is, omdat de workouts om percentages en zones heen gebouwd zijn (draad "Add custom beats per minutes in workout"). Op 5 maart 2025 schreef hij dat absolute bpm bij een import wordt omgerekend naar een percentage van de drempel uit de instellingen van die soort. Bij wandelen is dat de soort Andere, zonder drempel.
- Daarom is de vaste bpm tekst in de beschrijving van de workout, geen hartslagdoel op een stap. Je horloge piept er dus niet op. Dat zegt de uitleg bij de instelling eerlijk.
- Niet gecontroleerd: een echte verzending, en hoe de beschrijving op de Forerunner verschijnt. Dat kan niet zonder sleutel.

## Eigen keuzes

- De getallen komen uit `engine/heartRateZones.ts#zoneBpm`, dezelfde hardloopzones als in de rest van de app (drempel, of anders maximale hartslag). Zonder een van beide geen regel.
- Rustig (zwaarte 1 of 2): alleen een bovengrens, het einde van de hoogste rustige zone in de training. Wandelend onder zone 1 zakken is goed, dus een ondergrens zou alleen storen. Bij heuvelintervallen op de StairMaster is het herstel zone 1, dus is de grens daar het einde van zone 1.
- Stevig (zwaarte 3 of 4) alleen bij een blok van minstens twee minuten, met dezelfde grens als een hartslagdoel op het horloge: korter loopt de hartslag achter. De blokken van één minuut op de StairMaster houden hun RPE 8-9.
- Opwarmen, uitlopen en een stap zonder doel tellen niet mee.
- Een wandeltraining kreeg tot nu toe geen enkel doel (je wandelt op gevoel). Die regel blijft voor de stappen; de bpm-regel komt er alleen bij als tekst.
- Het blad Je horloge zegt dezelfde regel, zodat wie de workout zelf instelt hetzelfde getal ziet.
- Hardlopen en fietsen veranderen niet. De vingerafdruk van elke wandelworkout verandert wel zolang de instelling aan staat en je een drempel of maximale hartslag hebt: die gaan bij de volgende ronde één keer opnieuw naar de agenda. Met de instelling uit of zonder hartslag blijft alles byte voor byte gelijk (getoetst in `walkHeartRate.test.ts`).
- De instelling `watchWalkBpm` is optioneel en erbij, dus geen migratiestap. Hij gaat mee in de back-up zoals de andere schakelaars.

## Alternatieven

- Percentage van de drempel van hardlopen (`75-85% LTHR`) op de stap: intervals.icu rekent dat om met de drempel van Andere, die er niet is. Onbekend wat er dan op het horloge komt.
- De soort van de workout Hardlopen maken zodat de loopzones gelden: dan legt je horloge een wandeling als loop vast en telt de weeklast verkeerd.
- Zones van Andere laten invullen in intervals.icu: dat vraagt de eigenaar om iets buiten de app, en de zones lopen dan uit de pas met die van de app.

## Bron

Backlog, StairMaster en wandelen naar het horloge (eigenaar, 14 november 2026). Forum van intervals.icu: Workout Builder Syntax Quick Guide, "Add custom beats per minutes in workout" (maart 2024), "Import workouts from fit file does not work with absolute HR or pace" (maart 2025). Besluiten `2026-11-12-stairmaster-horloge.md` en `2026-10-25-hartslag-op-het-horloge.md`.

## Vervangt

Niets. Het vult `2026-11-12-stairmaster-horloge.md` aan: daar stonden zonenamen als hartslagdoel op een wandelworkout.

## Terugdraaien

De instelling Hartslag bij wandelen uitzetten. In de code: `walkHrFromSettings` in `src/engine/walkHeartRate.ts` altijd `undefined` laten geven.
