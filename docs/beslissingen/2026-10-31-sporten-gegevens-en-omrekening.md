# Sporten die meetellen, stap 2: gegevens en omrekening

Datum: 2026-10-31
Status: aangenomen

## Besluit

Zwemmen, padel en voetbal staan als gegevens in `data/sports.ts`, in een eigen lijst `COUNTED_SPORTS`: sporten die kunnen meetellen maar die ASCEND niet plant (`plannable: false`, rollen Vaste dag, Telt mee en Negeren). Ze horen bewust nog niet bij `SPORT_IDS`, zodat de instellingen, de import en de planning er niets van merken tot er een keuze voor is. `engine/sportStress.ts#stressProfileOf` rekent de vijf kenmerken om naar een belastingsprofiel, en `legRestHours` zegt hoeveel uur de benen daarna vrij blijven van een zware beendag. Er is niets zichtbaar veranderd.

## Hoe het werkt

- Kenmerken (afgeleid, niet getoetst): zwemmen 0, 0, 0, 3, 3; padel 2, 2, 3, 2, 2; voetbal 3, 3, 3, 1, 2 (impact, remmen, stop en start, bovenlichaam, techniek). Gebruikelijke zwaarte: zwemmen en padel Pittig, voetbal Zwaar. Geen pictogram in stijl C en geen eigen sportkleur: de rustige salie.
- De hoogste van impact, remmen en stop en start bepaalt hoe zwaar de benen werken; impact, remmen en bovenlichaam volgen hun kenmerk; het hart volgt de zwaarte.
- Fietsen krijgt een eigen profiel (`stressOverride`), gelijk aan de fietstocht, zodat de beenindex voor wie nu fietst niet verandert.
- `legRestHours`: 72 uur na een tocht met afdalen (de bestaande regel na een bergtocht) en na een zware wedstrijd met zware impact en zwaar remmen, 48 uur na elke andere zware beendag, anders niets. Een test bewaakt dat het voor elk zwaar sjabloon dezelfde rust geeft als `engine/scheduler.ts#legSpacingDays`. Een voetbaltraining (Pittig) is 48 uur, een wedstrijd (Zwaar) 72.
- De typenamen van intervals.icu staan erbij (`countedSportOfExternalType`), maar de import leest ze nog niet. Tennis hoort bewust niet bij padel.

## Reden

`docs/visie/Sporten die meetellen.md` (3.2, 3.3, stap 2), met het advies bij vraag 1 en 4. Het ontwerp noemde "zware remmen én zware impact" voor 72 uur; omdat de bergtocht in de gegevens geen zware impact heeft, houdt de regel voor tochten de bestaande vorm, zodat de bergtocht precies 72 uur blijft.

## Alternatieven

- De drie sporten in `SPORTS` zetten: dan krijgen ze meteen een rij in Planning, een schakelaar en een import, en dat moest uit blijven.

## Bron

`docs/visie/Sporten die meetellen.md`, `docs/onderzoek/ASCEND voor iedereen.md`.

## Vervangt

Niets.

## Terugdraaien

`COUNTED_SPORTS`, `stressOverride` en `engine/sportStress.ts` weghalen; niets anders leest ze nog.
