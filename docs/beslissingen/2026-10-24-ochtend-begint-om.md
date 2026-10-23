# De ochtend begint om 5 uur

Datum: 2026-10-24
Status: aangenomen

## Besluit

De ochtendkaart en de vraag hoe je je voelt (de regel Gevoel in Je dag) verschijnen pas vanaf het begin van de ochtend, standaard 5 uur, en niet meteen na middernacht. Het uur is instelbaar bij Vandaag en meldingen, "Ochtend begint om": 4, 5, 6 of 7 uur. Een ochtend die al is ingevuld blijft zichtbaar. De ochtendmelding houdt haar eigen tijd.

## Reden

De eigenaar kreeg na twaalf uur 's nachts al de vraag "Goedemorgen. Hoe voel je je?" en vond dat verwarrend: dan ben je vaak nog wakker.

## Alternatieven

De kaart laten beginnen op de tijd van de ochtendmelding. Die tijd is bedoeld voor een melding en staat vaak later dan wanneer je opstaat.

## Bron

Gesprek met de eigenaar, 24 oktober.

## Vervangt

Vult `2026-10-23-ochtendkaart-en-melding.md` aan; dat besluit blijft verder staan.

## Terugdraaien

`fromHour` uit `engine/morningCard.ts#showMorningCard` en de regel in `components/MorningCheckInCard.tsx` halen, en de instelling `morningCardFrom` met haar rij weghalen.
