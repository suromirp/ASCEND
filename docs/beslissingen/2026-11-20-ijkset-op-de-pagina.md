# De ijkset staat op de Forge-pagina

Datum: 2026-11-20
Status: aangenomen

## Besluit

De rij IJkset staat in de groep Forge zelf, onder Voorstellen, en niet meer in het blad Bij het invullen. De kaart IJkset in de training heeft een knop IJkset aanpassen die naar die rij springt; de terugknop brengt je weer in de training. De groep Forge heeft daarom 13 rijen in plaats van 12 (`src/data/settingsLayout.test.ts`).

## Reden

De eigenaar vond de instelling niet: ze zat vijf tikken diep, achter Geavanceerd en een blad. Een voorstel met Akkoord hoort een korte weg naar zijn instelling te hebben.

## Alternatieven

Een rij uit Forge naar een blad verplaatsen om op 12 te blijven: er is geen rij die minder vaak gezocht wordt dan een voorstel dat je telkens ziet. Gekozen is één rij extra, alleen voor deze groep.

## Bron

Inboxpunt I-83 en het advies van Pathfinder.

## Vervangt

Niets.

## Terugdraaien

Zet `place` van `forge-ijkset` terug op `{ in: 'bundel-invullen' }`, de rij terug in dat blad en het plafond van Forge op 12.
