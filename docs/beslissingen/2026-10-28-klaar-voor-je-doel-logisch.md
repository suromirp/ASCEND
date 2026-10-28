# Klaar voor je doel: snelheid als weken werk

Datum: 2026-10-28
Status: aangenomen

## Besluit

De snelheidsmeter van een hardloopwedstrijd met doeltijd rekent het gat tussen je verwachte tijd en je doeltijd om in weken werk bij gemiddelde groei (W), en vult zich als 10 / (10 + W): 50% bij tien weken werk, 25% bij dertig. Het getal, de meters, de haalbaarheidsregel en "Hier is nog het meeste te winnen" lezen dezelfde W, en "het meeste te winnen" is de meter met het grootste gewogen gat.

## Reden

De kaart van een 10 km met doeltijd 45:00 toonde 77% terwijl de zin eronder zei dat 45:00 meer vraagt dan gemiddelde groei. Een tijdsverhouding (45 gedeeld door 55:40 is 81%) maakt een gat van 19% in tijd klein, terwijl prestatie ongeveer een half procent per week groeit. Nu staat het voorbeeld op 41%: snelheid 21%, langste loop 86%, weekvolume 56%, en het meeste te winnen is snelheid (voorheen weekvolume, de laagste breuk maar niet het grootste gat). Getal en zin zeggen hetzelfde.

De vaste keuzes, door de coördinator vastgesteld:

1. De helft ligt bij tien weken werk (`HALF_WEEKS`).
2. Eén gemiddelde groei per sport uit `data/goalGrowth.ts` (hardlopen 0,55% per week), niet je eigen tempo.
3. Een doeltijd zonder testloop blijft zoals het was: snelheid telt pas na een testloop, met de regel "Nog geen testloop".
4. Capaciteit blijft de breuk best gedeeld door nodig, zodat "8,6 van 10 km" en de balk hetzelfde zeggen.
5. Een cutoff of tijdslimiet krijgt 10% marge (`LIMIT_MARGIN`) en telt als gewone meter. Nog niet gebouwd.
6. Volhouden blijft zoals het was bij Sterker worden en Fit blijven.
7. Geen tempometer voor de GR5. De GR5 en `gr5Readiness` veranderen niet; bij gelijke gewichten is het grootste gewogen gat precies de laagste meter.

De haalbaarheidsregel zegt droog "Bij gemiddelde groei rond 20 maart: 47 tot 54 minuten. 45:00 vraagt ongeveer 39 weken; tot 20 maart zijn het er 21." Past het (minder weken nodig dan er zijn), dan "je doel valt erbinnen", ligt het doel boven de band "je doel ligt erboven". De app oordeelt niet en past het doel nooit aan; het doel blijft het doel.

## Gebouwd en niet gebouwd

Gebouwd: stappen 1 tot 4 en 8 van het bouwplan (`data/goalGrowth.ts`, `engine/goalGap.ts`, `engine/raceReadiness.ts`, het gewogen gat in `engine/goalReadiness.ts`, de uitleg in `goalKinds.ts` en `settingsHelp.ts`). De instelling "Weging bij een doeltijd" blijft. Er komt geen nieuwe instelling: de vaste gemiddelde groei is het advies, en een strengere keuze ("Hoe streng") is niet nodig zolang er maar één groeigetal is.

Niet gebouwd: de krachtmeter van Sterker worden als gat in weken (stap 5), de voorwaardemeters voor tijdslimiet en cutoff met hun velden en migratie (stap 6), en de instellingen "Groei bij het rekenen" en "Marge bij een tijdslimiet" (stap 7). Ze volgen in een eigen ronde. De getallen staan al klaar in `goalGrowth.ts` en `goalGap.ts`.

## Alternatieven

Een strengere of mildere kromme (zes weken of veertien), de langzame kant van de groei (voorbeeld 36%) of je eigen tempo uit twee tests; ook capaciteit in weken rekenen. Verschillen met de gekozen variant zijn een paar punten, en de vaste keuze houdt de uitleg eenvoudig.

## Bron

`docs/onderzoek/Klaar voor je doel logisch per doel.md` (Scout), en de besluiten van 28 oktober over snelheid en de aanvulling daarop. Geen persoonsgegevens.

## Vervangt

Het deel van `2026-10-28-klaar-voor-je-doel-snelheid.md` dat snelheid als doeltijd gedeeld door verwachte tijd rekent, en de zin "dus 45:00 vraagt meer dan gemiddelde groei" uit de aanvulling. De rest van die besluiten blijft.

## Terugdraaien

Zet `HALF_WEEKS` heel hoog of vervang `fillFromWeeks` door doeltijd gedeeld door verwachte tijd in `raceReadiness.ts#speedAt`. "Gelijk" in de instelling laat alle meters even zwaar wegen.
