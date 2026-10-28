# Klaar voor je doel bij een doeltijd: snelheid weegt het zwaarst, en het doel blijft het doel

Datum: 2026-10-28

## Aanleiding

Voor een hardloopwedstrijd met een doeltijd (10 km in 45 minuten, Voortop) rekende "Klaar voor je doel" alleen met je langste loop en je weekvolume. De eigenaar: dat zegt niets over een doel dat vooral snelheid en tijd is. De kaart zei ook "Hier is nog niets van gemeten: je verwachte tijd" terwijl er een testloop was. Een "+71 in 4 weken" stond er bij een nieuw doel, een sprong van 0. En de naam van de soort stond onder een titel die hetzelfde heette.

Daarbovenop zei de eigenaar: "Het doel blijft het doel, hoe onrealistisch de app dat ook vindt."

## Besluit

1. **Snelheid is de hoofdmeter.** Bij een wedstrijd met een doeltijd en een afstand tot en met de halve marathon is de meter "Snelheid" je doeltijd gedeeld door je verwachte tijd nu, begrensd op 100%. De verwachte tijd komt uit de testloop die telt (`countedTests`, `racePaces`), dezelfde bron als de regel TARGET-TIME. Het percentage blijft één getal, de verdeling is `RACE_SPEED_WEIGHTS` in `engine/raceReadiness.ts`: snelheid 60%, langste loop 20%, weekvolume 20%. Is er geen tijd te geven (geen testloop, of de snelste 5 km wacht op Akkoord), dan telt snelheid niet mee en wegen de andere twee gelijk, zoals voorheen. Zonder doeltijd verandert er niets. De keuze 60/20/20 is afgeleid, niet getoetst: het gaat erom dat snelheid het zwaarst weegt en de andere twee elkaar niet overheersen.
2. **De kaart oordeelt niet.** Bovenaan staat het droge feit en de afstand tot het doel als werk: "Verwacht nu ongeveer 55:40. Doel 45:00: nog 10:40, ongeveer 1:04 per km sneller." Daaronder de band op wedstrijddag als feit: "Bij deze groei rond 20 maart: 47 tot 54 minuten." Geen "ambitieus", "onrealistisch" of "haalbaar" over het doel. Daarna de meters (Snelheid, Langste loop, Weekvolume), en "Hier is nog het meeste te winnen" volgt de laagste meter.
3. **Eerlijk over de test.** Wacht de snelste 5 km op Akkoord: "Je testloop wacht nog op je Akkoord." Is er geen testloop: "Nog geen testloop: loop er een om je tijd te kennen." De basis staat erbij: "Uit je snelste 5 km van 10 okt (26:42)." of "Uit je hele run van 5 km op 10 okt (26:42)."
4. **De verandering pas met een beginpunt.** "+x in 4 weken" staat er alleen als het doel vier weken geleden al bestond en toen al een waarde had (`ReadinessOptions.since`). Voor de GR5 en de andere doelen zonder deze optie verandert niets.
5. **De dubbele naam** ("Hardloopwedstrijd" onder de titel Hardloopwedstrijd) valt weg.
6. **Je stand** leest voor het hoofddoel dezelfde functie als Ascend (`computeMainGoalReadiness`). Een wedstrijd is nooit het hoofddoel met mijlpalen; zijn getal staat alleen op de Ascend-tab. Er komt geen tweede getal.

## TARGET-TIME vraagt niet opnieuw

TARGET-TIME stelde bij elke nieuwe testloop opnieuw voor de doeltijd aan te passen. Dat is een oordeel over het doel. Nu draagt het voorstel de doeltijd in zijn id (`goaltime:<doel>:<minuten>`) in plaats van de datum van de test: één Liever niet geldt voor elke volgende test, tot de doeltijd zelf verandert. Akkoord verandert alleen de doeltijd, zoals voorheen.

## Instellingen (groep Doel en tochten)

- "Klaar voor je doel bij een doeltijd": Snelheid weegt het zwaarst (advies) of Gelijk. `AppSettings.readinessWeighting`, afwezig of onbekend is snelheid.
- "Doeltijd aanpassen voorstellen": schakelaar, standaard aan (voor nieuwe gebruikers). Uit betekent dat TARGET-TIME zwijgt. `AppSettings.proposeTargetTime`, afwezig is aan.

Beide staan in settingsIndex, settingsLayout, settingsSummary, settingsHelp, settingsDiff en de back-upvalidatie (een onbekende waarde valt weg bij het importeren). Oudere back-ups importeren als voorheen.

## Wat niet verandert

De planning (`planGolden.test.ts` verandert niet), de opgeslagen logs en de testbeoordeling. Het advies TARGET-TIME blijft een voorstel met Akkoord, nooit stil.

## Terugdraaien

Zet "Klaar voor je doel bij een doeltijd" op Gelijk en "Doeltijd aanpassen voorstellen" op de gewenste stand. De code voor de oude verdeling is niet nodig: zonder `weights` telt elke meter gelijk.
