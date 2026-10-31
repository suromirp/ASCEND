# Zonder doel, stap 6: de beginnersstart

Datum: 2026-10-31
Status: aangenomen

## Besluit

Wie zonder doel een richting kiest en in de acht weken ervoor gemiddeld minder dan twee keer per week sportte, of zelf Ja kiest, begint rustig: de eerste vier weken van de richting zijn de fase "Rustig beginnen", zonder harde training. De heuvelloop van de zaterdag is dan een herstelloop. Daarna lopen de weken gewoon in golven. Het is afgeleid uit de startmaandag van je richting en je logs (`engine/beginnerStart.ts`), nooit als vlag opgeslagen, en loopt dus vanzelf af. Instelling Beginnersstart in Doel en tochten, Zonder doel: Automatisch (advies), Ja of Nee.

## Hoe het werkt

- De regel NO-HARD-YET uit het ontwerp is gebouwd als wissel van de fase, niet als nieuwe regel in de weekcheck. Het effect is hetzelfde: alleen de eigen trainingen van het systeem veranderen, de planningsronde meldt het ("Planning bijgewerkt", met ongedaan maken) en een training die je zelf vastzette blijft staan. Zo houdt de weekcheck zijn bestaande regels en blijft hij voor een plan met een doel precies gelijk.
- Automatisch meet over de acht weken voor de startmaandag, niet tot vandaag, zodat het oordeel niet halverwege omslaat. Herstel telt niet als sporten.
- Het voorstel van een richting zegt het in één zin: "Je begint rustig: de eerste vier weken alleen makkelijk, de eerste pittige training pas daarna."
- Een andere keuze bij Beginnersstart verandert je planning en volgt dus het pad van elke planningsinstelling: eerst wat er verandert, dan Akkoord. Bij "Terug naar het advies" hoort ze bij het deel dat de planning raakt.
- `AppSettings.beginnerStart` is optioneel; `storage/migrations.ts#migrateWaveSettings` houdt bij een import alleen een bekende waarde over. Een oud bestand importeert zoals het was.

## Reden

Het ontwerp (`docs/visie/Zonder doel.md`, 2.7 en 3.4) noemt twee weken alleen rustig en de eerste pittige training na vier weken. Zonder doel is de heuvelloop de enige harde training in de week, dus dat valt samen in vier weken zonder heuvelloop.

## Alternatieven

- Een nieuwe regel NO-HARD-YET in `engine/weekValidator.ts`: meer code in de weekcheck die elke planning raakt, voor hetzelfde resultaat.
- Hoogstens vier dagen voor een beginner: dat hoort bij de startvragen (stap 8).

## Bron

`docs/visie/Zonder doel.md` (2.7, 3.4, 4 en stap 6).

## Vervangt

Niets.

## Terugdraaien

`isBeginnerStart` altijd onwaar laten geven: dan is er geen fase Rustig beginnen meer en blijven de golven zoals in stap 5.
