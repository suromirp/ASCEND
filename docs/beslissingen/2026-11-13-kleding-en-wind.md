# Wind in de weerzin en een grotere eerste kledingtik

Datum: 2026-11-13
Status: aangenomen

## Besluit

De weerzin noemt de wind vanaf 15 km/u ("11 graden, voelt als 8, wind 20 km/u") en toont de gevoelstemperatuur dan al bij 2 graden kouder, niet pas bij 4. De eerste tik op Te koud of Te warm voor een sport schuift een hele graad, elke tik daarna een halve. Na een tik zegt de app in één zin wat er de volgende keer anders wordt.

## Reden

De eigenaar op 12 november: de app hield geen rekening met wind en het was heel koud. Een halve graad per tik merk je niet, dus de eerste tik is groter. De zin na de tik zegt eerlijk dat een kledingstuk pas verandert als het weer op een grens zit, want zonder het weer van de volgende keer is het stuk niet te noemen.

Eigen keuzes:
- 15 km/u als grens voor het noemen van wind (onder de 25 van het kledingadvies en de 38 van "harde wind"; bij harde wind blijft de bestaande tekst en komt de wind niet dubbel).
- 2 graden verschil voor de gevoelstemperatuur, alleen als er wind in de zin staat en het kouder aanvoelt. Zonder wind blijft het bij 4 graden.
- "Eerste tik" is: nog niets bijgesteld voor die sport (waarde 0). Terug op 0 en weer tikken is dus weer een graad.
- Een bewaarde waarde van -1 uit een oude back-up blijft geldig; de vorm verandert niet, dus geen migratie. De volgende tik is een halve graad.

Geen nieuwe instelling: de zin hangt aan de bestaande schakelaar Weerregel en de feedback aan Kledingadvies bij het weer. De hulptekst van die rij is bijgewerkt. Het is geen keuze over de planning.

## Alternatieven

Een instelbare windgrens: niet gedaan, de zin verandert niets aan het advies. Elke tik een graad: te grof voor een lopende bijstelling.

## Bron

Een gesprek met de eigenaar (inbox, 12 november). De windgrens van 25 km/u in het kledingadvies en de warmtebonus van de lange duurloop zijn bewust niet veranderd: daar komt eerst een bronnencheck.

## Vervangt

Niets.

## Terugdraaien

`LINE_WIND_KMH` en de tweede voorwaarde in `weatherLine` weghalen; `FIRST_STEP_C` op 0,5 zetten.
