# Racedag: de rij onder de ochtendvraag, het weer op drie plekken

Datum: 2026-11-14
Status: aangenomen

## Besluit

De rij Racedag staat op Vandaag onder de ochtendvraag en de kaarten onder de missie, niet direct onder de missie. Zo blijft het. De zin "direct onder de missie" in `2026-11-14-racedag-10km.md` geldt niet meer; de plek is: na de missie, de ochtendvraag en de andere kaarten onder de missie, vóór de bevestigkaarten. Het weer staat op de racedag op drie plekken; dat blijft zo en is hieronder vastgelegd, er wordt niets voor gebouwd.

## De drie plekken van het weer op de racedag

- De missiekaart op Vandaag: de weerregel van de training (`TodayMissionCard.tsx`, `WeatherLine`).
- Het blad Racedag: "Weer thuis rond" het startuur, met wat je aantrekt (`engine/raceDay.ts`).
- Het trainingsscherm van de race: weer, heuvels en kleding, alleen buiten (`ExerciseLogger.tsx`, achter `placeIsOutdoor`).

Alle drie lezen dezelfde voorspelling (`engine/weather.ts#sessionWeather`) met hetzelfde uur (`usualStartHour`), dus ze noemen nooit een ander getal. Elke plek hoort bij een ander moment: de ochtend, het plannen van de race, het aankleden vlak voor de start.

## Reden

De ochtendvraag is een taak van vandaag en gaat voor een ingang naar een blad dat je al in de dagen ervoor zag (Lookout en coördinator, 14 november). Het weer op drie plekken is dubbel, maar elke plek heeft een eigen moment en dezelfde bron; weghalen kost een plek waar je het op dat moment zoekt.

## Alternatieven

De rij boven de ochtendvraag: duwt een taak van vandaag omlaag voor iets dat geen taak is. Het weer op één plek (alleen het blad): dan mist de missiekaart op de racedag het weer, op elke andere dag wel.

## Bron

Backlog, Racedag rest (Lookout en coördinator, 14 november); `2026-11-14-racedag-10km.md`.

## Vervangt

Alleen de zin over de plek ("direct onder de missie", en in de aanvulling "direct na de kaarten onder de missie") in `2026-11-14-racedag-10km.md`. De rest van dat besluit blijft gelden; het wordt niet herschreven.

## Terugdraaien

Zet `RaceDayLine` in `src/pages/Today.tsx` boven `placement.underMission` en trek dit besluit in.
