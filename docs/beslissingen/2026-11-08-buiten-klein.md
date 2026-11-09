# Buiten klein: regen in het komende uur en de maanstand

Datum: 2026-11-08
Status: aangenomen

## Besluit

Twee kleine regels bij een training buiten, alleen tekst en nooit een wijziging van de planning. Regen in het komende uur uit Open-Meteo `minutely_15`, en de maanstand (volle of nieuwe maan) bij een avondtocht of een tocht met tent of bivak, uitgerekend zonder API. Allebei instelbaar, standaard aan, in het blad Weer en kleding.

## Reden

De eigenaar vroeg dit op 7 november (backlog, "Regen in het komende uur, feestdagen, oefeningendatabase, maanstand"). UV (kledingadvies, zonnebrand en pet) en zon op en onder ("licht tot 18:12") stonden er al en zijn niet nog eens gebouwd. De hoogte van de tochtplek staat al in het bergweer (`highestM`); een hoogteverschil bij een training zit niet in de data en is overgeslagen.

Eigen keuzes:
- De regenregel gebruikt een eigen kleine aanvraag in plaats van het uurlijkse weer uit te breiden: kwartierdata is na een half uur oud, hoort niet in de opgeslagen voorspelling en niet in een back-up. Alleen in het geheugen, hoogstens eens per tien minuten, met een grens van tien seconden.
- "Nu" wordt gelezen op de klok van de plek (`utc_offset_seconds`), zodat tijdzone en middernacht kloppen.
- De regel verschijnt alleen als de regen de training raakt en binnen een uur begint (of nu valt en droog wordt). Regen die al voorbij is voor de start, of die pas na het einde begint, zegt niets.
- Tijden staan als 18:30, zoals de rest van de app, niet als 18.30.
- De maan krijgt alleen een regel bij volle en nieuwe maan (anderhalve dag marge, de maanmaand is gemiddeld uitgerekend). Bij een wandeling die na zonsondergang eindigt, en op een tochtdag met tent in de bergenkaart. Die kaart verschijnt alleen met bergweer, dus zonder netwerk ook zonder maanregel.
- Het blad Weer en kleding krijgt twee rijen erbij; het blad telt nu "van 6 aan". De pagina Vandaag houdt evenveel rijen.

## Alternatieven

`minutely_15` in de gewone voorspelling opnemen: groter model, meer data in de cache, en een migratie of verouderde vorm. Niet gekozen.

## Bron

`docs/backlog.md`, sectie "Regen in het komende uur, feestdagen, oefeningendatabase, maanstand". Maanmaand: gemiddelde synodische maand, nieuwe maan van 6 januari 2000.

## Vervangt

Niets.

## Terugdraaien

Beide regels uitzetten in Instellingen, Vandaag, Weer en kleding. Of de commit terugdraaien: er is geen opgeslagen vorm veranderd behalve twee optionele sleutels in `overviews`.
