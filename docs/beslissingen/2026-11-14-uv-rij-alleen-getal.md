# UV in de rij Weer: alleen het getal

Datum: 2026-11-14
Status: vastgelegd

## Besluit

In de rij Weer van de Briefing staat bij UV 3 of hoger alleen "UV 8", met een vaste spatie (U+00A0) zodat het nooit over twee regels breekt. Geen "smeer je in" en geen hoogte in de rij. De zin over smeren (met de 45 minuten en pet en zonnebril vanaf 6) en de hoogte van je plek staan op de pagina Weer, waar de rij naartoe leidt. De pagina Weer blijft zoals in `2026-11-14-uv-en-hoogte-aanvulling.md`.

Daarmee vervalt in de Briefing de vlag `sunscreenFirst` van het kledingadvies: de rij zegt niets meer over smeren, dus er is niets om dubbel te zeggen.

## Reden

Lookout zag de rij op 360 px over vijf regels lopen bij UV 8 en een plek op 1.250 m, en "UV 8" brak over twee regels. De coördinator koos voor het getal alleen: het droge feit in de rij, de uitleg een tik verder.

## Alternatieven

De hoogte houden en alleen "smeer je in" weglaten: nog steeds vier regels bij een plek in de bergen. Niet gekozen.

## Bron

Doorloop van Lookout en keuze van de coördinator, 14 november.

## Vervangt

Uit `2026-11-14-uv-en-hoogte-buiten.md` en `2026-11-14-uv-en-hoogte-aanvulling.md` alleen wat over de rij Weer van de Briefing gaat; de rest blijft staan.

## Terugdraaien

In `engine/briefing.ts#weatherRow` weer `outdoorSunParts` gebruiken in plaats van `uvShort`.
