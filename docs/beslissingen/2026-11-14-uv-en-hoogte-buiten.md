# UV en hoogte bij een training buiten

Datum: 2026-11-14
Status: vastgelegd

## Besluit

Bij een training buiten staat in de rij Weer van de Briefing (en op de pagina Weer, onder de weerregel) de UV-index vanaf 3, met wat je doet, en de hoogte van je plek vanaf 1000 m. Alleen tekst, alleen bij `placeIsOutdoor`, instelbaar ("UV en hoogte bij buiten", standaard aan). Verandert de planning nooit.

## Reden

Backlog ronde 1, "Buiten: UV en hoogte van je plek". De UV zat al in de voorspelling, maar de Briefing toont alleen de eerste zin van het kledingadvies, dus de zon viel weg. De hoogte geeft Open-Meteo bij elk weerantwoord mee (`elevation`), er is dus geen nieuwe aanvraag nodig.

Eigen keuzes:
- UV vanaf 3, op hele getallen: de WHO-grens uit `docs/onderzoek/Kleding bij het weer.md`. Van 3 tot 5 "smeer je in", vanaf 6 ook pet en zonnebril, zoals het kledingadvies. De backlog noemde 6 bij een lange loop of tocht; de opdracht van de coördinator koos 3 voor elke training buiten, omdat de grens van de WHO 3 is.
- Noemt de eerste kledingzin al zonnebrand, dan alleen "UV 4".
- Hoogte vanaf 1000 m, op 10 m afgerond ("je plek ligt op 1.240 m"). Lager zegt het niets.
- Laadde het weer van de gekozen plek niet en is het weer van huis, dan geen hoogte: die zou van huis zijn.
- Geen amber: de toon van de rij blijft van het weeroordeel.
- Uit de Briefing naar de pagina Weer: buiten. Anders volgt de pagina de bewaarde keuze Waar train je? van die training.

## Alternatieven

Een eigen hoogteaanvraag (Open-Meteo elevation API of de aanroep in `overpass.ts`): een extra verzoek voor iets dat al in het weerantwoord staat. Niet gekozen.

## Bron

`docs/backlog.md` ronde 1; `docs/onderzoek/Kleding bij het weer.md` (Zon en uv); `docs/onderzoek/Kansen met gegevens.md` (Open-Meteo `elevation`).

## Vervangt

Niets.

## Terugdraaien

Instellingen, Vandaag, Weer en kleding, "UV en hoogte bij buiten" uit. Of de commit terugdraaien: alleen een optionele sleutel `uvAltitude` in `overviews` en een optioneel `elevationM` in de weercache (niet in de back-up), geen migratie.
