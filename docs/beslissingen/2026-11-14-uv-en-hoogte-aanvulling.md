# UV en hoogte: aanvulling na Pathfinder

Datum: 2026-11-14
Status: vastgelegd

## Besluit

De UV-zin volgt het kledingadvies, zodat ze elkaar niet herhalen of tegenspreken:
- Korter dan 45 minuten (de grens waarop het kledingadvies zonnebrand noemt, `clothing.ts#SUNSCREEN_MINUTES`) staat er alleen het getal: "UV 4".
- Noemt het kledingadvies op hetzelfde scherm de zonnebrand al, dan ook alleen het getal. In de Briefing is dat de eerste kledingzin (`sunscreenFirst`), op de pagina Weer het hele advies (`sunscreenShown`).
- In de rij Weer van de Briefing staat vanaf 6 alleen "smeer je in". "Pet en zonnebril" staat alleen op de pagina Weer, zodat de rij op 360 px hoogstens drie regels blijft.
- De rij Racedag (blad Racedag, `engine/raceDay.ts`) toont het weer van huis rond het startuur, zonder de UV-zin en de hoogte (het kledingadvies daar kent de UV wel). Dat blijft zo: UV en hoogte horen bij het trainingsscherm, waar de plek gekozen is.
- De instelling staat in het blad Weer en kleding direct vóór Kledingadvies.

## Reden

Pathfinder zag op de pagina Weer "UV 5, smeer je in" boven "Zonnebrand, zonnebril en pet" uit het kledingadvies, en bij een korte loop "smeer je in" terwijl het kledingadvies onder 45 minuten geen zonnebrand noemt.

## Alternatieven

De 45 minuten uit het kledingadvies halen en altijd "smeer je in" zeggen: dan spreekt de UV-zin het kledingadvies tegen bij elke korte loop. Niet gekozen.

## Bron

Doorloop van Pathfinder, 14 november; `docs/onderzoek/Kleding bij het weer.md` (Zon en uv, de 45 minuten).

## Vervangt

Niets. Vult `2026-11-14-uv-en-hoogte-buiten.md` aan op de zin over de zonnebrand en vanaf 6 pet en zonnebril.

## Terugdraaien

De opties `minutes`, `full` en `sunscreenSaid` van `engine/outdoorSun.ts#uvPhrase` weglaten.
