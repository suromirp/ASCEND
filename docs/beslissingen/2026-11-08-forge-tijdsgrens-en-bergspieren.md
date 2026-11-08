# Tijdsgrens zichtbaar bij de oefening, en Spieren voor de berg in Forge

Datum: 2026-11-08
Status: aangenomen

## Besluit

1. De tijdsgrens haalde inderdaad een set bijwerk weg. Een test bootst het na (`forgeTimeCap.test.ts`, "Cable Rope High Row met 3 sets"): een training van vier oefeningen met 14 sets in een geplande 66 minuten is 4,7 minuten per set, boven de 60. Daarna gaat bij het bijwerk telkens een set eraf tot er twee over zijn, dus de high row gaat van 3 naar 2. De regel bovenaan zei dat al, maar niet bij de oefening zelf.
2. Bij zo'n oefening staat nu "1 set weg door je tijdsgrens" (of "2 sets weg ...") met een tik op Terugzetten, de tekstknop van Forge (44 px hoog). Terugzetten voegt één set toe op de bestaande manier van Set toevoegen, dus ook in het verloop; de regel telt zelf af en verdwijnt. Een set die jij zelf weghaalde telt niet als tijdsgrens (`capRemovedFor`). De kern wordt nooit ingekort en zegt dus niets. De planning en het sjabloon blijven zoals ze waren.
3. Past 60 minuten bij vier oefeningen van 3 tot 4 sets, met 2:00 rust en drie opwarmsets? Van onderaf gerekend net: 4+4+3+3 sets, ongeveer 45 seconden per set plus de rust van `estimatedRest` (3:00 voor bankdrukken met de stang bij 8 herhalingen of minder, 2:00 voor de rest, 1:30 voor isolatie), drie opwarmsets bij de eerste oefening en één bij de andere geeft ongeveer 53 minuten, 3,8 minuten per set. Dat past onder 60, maar met weinig lucht: een vierde set bij alle oefeningen komt erboven. De grens grijpt in als de duur per set hoger is dan dat, uit de geplande duur van de training of uit je eigen logs (pauzes, wachten op een toestel). Dat is bedoeld, maar dan hoort de oefening het te zeggen en terug te kunnen zetten. De standaard blijft 60; wie meer sets wil kiest 75 of 90, of Uit.
4. Spieren voor de berg: het voorstel uit de weekterugblik (`mountainMuscleProposal`, dezelfde melding en dezelfde Akkoord, `MountainMuscleNotice` met `onlyFor`) staat nu ook bovenaan Forge, alleen in de training waar de oefening bij zou komen, alleen bij het openen (niet bij kijken en niet meer zodra de sessie begonnen is). Het verandert niets zonder Akkoord; Liever niet laat de spier acht weken met rust, ook in de weekterugblik.
5. Geen nieuwe instelling: de bestaande schakelaar "Spieren voor de berg" (standaard aan) bepaalt ook of het voorstel in Forge staat. Een eigen schakelaar kon niet: Forge heeft op Instellingen al het maximum van 6 rijen onder Geavanceerd (`settingsLayout.test.ts`). De uitleg staat bijgewerkt in `settingsHelp.ts` en `settingsIndex.ts`; `settingsLayout.ts` en `settingsSummary.ts` blijven gelijk, want de rij en zijn waarde veranderen niet.

## Reden

De eigenaar zag 2 sets waar het programma er 3 had en begreep niet waarom, en vond het voorstel voor de berg pas laat in de weekterugblik.

## Alternatieven

- De grens ruimer maken of de duur per set anders leren: zegt wat de eigenaar wil niet, en grijpt in op een keuze die bij hem hoort.
- De set automatisch terugzetten: dan is de grens er niet meer.
- Het bergvoorstel op Vandaag: een tweede plek voor een onderwerp van de training; Forge sluit aan bij het moment van trainen.

## Bron

Inbox en backlog van 7 en 5 november 2026.

## Vervangt

Niets. Vult `2026-11-03-forge-tijdsgrens.md` en `2026-11-02-forge-herinrichting.md` aan.

## Terugdraaien

De regel en Terugzetten: `capText` weghalen in `ExerciseBlock.tsx`. Het bergvoorstel in Forge: de instelling uit, of `MountainMuscleNotice` uit `ForgeWorkout.tsx` halen.
