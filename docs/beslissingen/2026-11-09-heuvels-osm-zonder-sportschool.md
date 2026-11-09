# Heuvels in de buurt ook op een dag zonder sportschool

Datum: 2026-11-09
Status: aangenomen

## Besluit

Op een dag van een periode zonder sportschool met Heuvels in de buurt aan krijgt elke loop dezelfde regel als een heuveltraining: "Op 800 m een helling van 40 m", met de link naar OpenStreetMap (`engine/nearbyTerrain.ts#terrainWishOn`). Het is alleen een tekstregel en verandert de planning nooit.

## Reden

Het besluit over Heuvels en trappen in de buurt (2026-11-08) liet de periode zonder sportschool voor later. Met Heuvels in de buurt aan zegt de dagband al "Lopen, rustig heuvels op"; de regel zegt waar die heuvel ligt.

## Eigen keuzes

- Alleen een loop (`engine/noGym.ts#isNoGymRun`), niet Eigen gewicht. Een vakantie over dezelfde dagen is strenger: dan geen regel.
- Dezelfde keuze als een heuveltraining: de dichtstbijzijnde helling van minstens 20 m, anders een trap. Dezelfde schakelaar en dezelfde eerste vraag.
- Plek: nog steeds `homeLocation`. Een periode heeft geen eigen adres; dat zou de opgeslagen vorm veranderen. Staat de plek van het weer op "Volgt je locatie", dan is `homeLocation` op reis al de plek waar je bent, dus daar werkt het vanzelf.

## Alternatieven

Een eigen adres per periode: vraagt een nieuw veld met migratie en een invoer in het blad, voor iets dat het volgen van je plek al geeft.

## Bron

`docs/beslissingen/2026-11-08-heuvels-osm.md`, `docs/beslissingen/2026-11-09-zonder-sportschool.md`, `docs/backlog.md`.

## Vervangt

Niets. Het vult de zin "de periode Zonder sportschool volgt later" uit het besluit van 8 november aan; het adres van een vakantie blijft open.

## Terugdraaien

Laat `terrainWishOn` alleen `terrainWish(template)` teruggeven.
