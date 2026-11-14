# Spieren voor de berg: een week weg telt voor geen rij mee

Datum: 2026-11-14
Status: aangenomen

## Besluit

Een week met vakantie (`no_training`), een tocht (`trek`) of zonder sportschool (`no_gym`) telt ook voor kuiten, scheenspier en bilspieren niet mee in het gemiddelde van Spieren voor de berg, net als een rustweek en net als al bij enkel en evenwicht. Vrije dagen tellen wel. Blijven er minder dan twee weken over, dan zwijgt het. De i bij het voorstel zegt dat bij elke rij met dezelfde zin, en "daarom gaat het hier over drie weken" als er een week wegviel.

Ruilen in Forge volgt mee: de voorrang voor een spier die weinig kreeg rekent met dezelfde weken (`swapPreference` krijgt `leave`).

Daarnaast, zonder dat de telling verandert:

- De i bij een spier zegt nu ook dat een set zonder ingevulde reserve telt en dat een spier die alleen meehelpt half telt. Daardoor is een gemiddelde als 1,5 te volgen. Om de i kort te houden is de zin over Liever niet ingekort tot "Na Liever niet blijft het acht weken stil over je kuiten."
- Tien oefeningen op één been of om en om hebben `perSide` in de data, zodat het voorstel "per been" zegt: Single Leg Calf Raise, Bulgarian Split Squat, Split Squat, Walking Lunge, Reverse Lunge, Step-Up, Weighted Step-Up, Step-Down, Weighted Step-Down en Single Leg Romanian Deadlift.
- De elf kandidaten zonder uitleg hebben er nu een, zodat het voorstel altijd zegt wat je doet.

## Reden

Op vakantie, op tocht of zonder sportschool train je niet in Forge. Die week telde bij de spieren als een week met nul sets, dus na elke vakantie stond er een voorstel voor een spier die je gewoon traint. Bij evenwicht was dat op 11 november al opgelost; de spieren bleven toen bewust staan als open vraag. Twee regels voor één melding is ook lastig uit te leggen: de i moest per rij iets anders zeggen.

## Alternatieven

- Zo laten: de eigenaar krijgt na een vakantie een voorstel dat niet klopt met wat hij deed.
- Alleen vakantie laten wegvallen en een tocht of week zonder sportschool niet: dan verschillen de rijen nog steeds, en een tocht is juist een week zonder Forge.
- "Per been" via een eigen lijst in het voorstel in plaats van `perSide` in de data: niet nodig. `perSide` wordt alleen door de tekst van het voorstel gelezen (`muscleNoticeText`); Forge plant, telt en toont er niets anders door, en er staat niets van in een log. Eén veld in de data is dan eenvoudiger dan twee lijsten.

## Bron

`docs/beslissingen/2026-11-11-enkel-evenwicht.md` (de open vraag over de spieren), `docs/beslissingen/2026-11-14-voorstel-begrijpelijk.md` (wat achter de i staat), de backlog (advies ja) en de review van Warden van 14 november.

## Vervangt

Niets. Het vult `2026-11-11-enkel-evenwicht.md` aan op één punt: "De spieren laten zo'n week nu nog wel meetellen" geldt niet meer. In `2026-11-14-voorstel-begrijpelijk.md` staat dat bij de drie spieren alleen een rustweek achter de i staat; dat is nu dezelfde zin als bij evenwicht.

## Terugdraaien

Geef in `mountainMusclesShort` geen `leave` meer door aan `countedWeeks` en zet de zin in `muscleNoticeText` voor de spieren terug naar "Een rustweek telt niet mee". Er is geen opslagvorm veranderd, dus er hoeft niets gemigreerd te worden. De uitleg en `perSide` kunnen blijven staan.
