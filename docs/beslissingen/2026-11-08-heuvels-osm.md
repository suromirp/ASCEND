# Heuvels en trappen in de buurt via OpenStreetMap

Datum: 2026-11-08
Status: aangenomen

## Besluit

Bij een heuveltraining en bij trap- of bergconditie staat één regel ("Op 1,2 km een helling van 60 m") met een link naar openstreetmap.org. De gegevens komen van Overpass (OpenStreetMap) en de hoogtes van Open-Meteo. De regel verandert de planning nooit.

## Reden

Akkoord van de eigenaar op 7 november (backlog: "Heuvels en trappen in de buurt via OpenStreetMap"). Een heuvel- of traptraining is pas bruikbaar als je weet waar een helling of trap ligt.

## Eigen keuzes

- Adapter `src/integrations/overpass.ts`, model `src/models/nearbyTerrain.ts` met `source: 'osm'`; geen veld met een leveranciersnaam. Soorten: `hill`, `steps`, `dirt_path`, `sports_ground`, `track`. Onverharde paden, sportvelden en de baan worden opgehaald en bewaard, maar de regel gebruikt ze nog niet: die horen bij de periode "Zonder sportschool", een later stuk.
- De hoogte-aanroep van Open-Meteo bestond niet (alleen `elevation` als parameter bij bergweer). Hij staat in dezelfde adapter, niet in `openMeteo.ts`, om niet te botsen met het werk aan UV, zon en hoogte; samenvoegen kan later. Hoogteverschil is de hoogte van de heuvel min de hoogte van de afgeronde plek, in de regel afgerond op 5 m. Mislukt de hoogte, dan staat er "een helling" zonder maat.
- Privacy: alleen een plek op twee decimalen (ongeveer een kilometer) gaat naar Overpass en Open-Meteo, zonder naam. Bewaard wordt per afgeronde plek het resultaat (hoogstens zes plekken, dertig dagen vers) in `MetaRepo` onder `nearbyTerrain`; het gaat nooit mee in de back-up en bevat geen naam of exacte positie. Daarom is er geen migratie nodig en gaat `DB_VERSION` niet omhoog.
- Eerste vraag: de schakelaar "Heuvels en trappen in de buurt" staat standaard aan (Instellingen, Vandaag, Weer en kleding, `overviews.hillsNearby`). Voor het eerste verzoek vraagt een korte kaart bij de regel of ASCEND mag zoeken en wat er naar OpenStreetMap gaat. "Ja, zoek" wordt per toestel bewaard (`nearbyTerrainAsked`), niet in de back-up, zodat een herstelde back-up op een ander toestel opnieuw vraagt. "Liever niet" zet de schakelaar uit; zet je hem later weer aan, dan vraagt de app opnieuw.
- Welke training: de rol `hills` of het id `tpl_hill_intervals` of `tpl_hills_descent` (heuvels), en `tpl_bergconditie` (trap of helling). Een nieuwe rol zou in opgeslagen programma's ontbreken en een migratie vragen; daarom de rol voor heuvels en het id voor bergconditie, dat geen eigen rol heeft. Alle andere trainingen krijgen niets.
- Keuze: heuveltraining neemt de dichtstbijzijnde helling van minstens 20 m (zonder hoogtegegevens telt een helling mee), anders een trap. Bergconditie neemt de dichtstbijzijnde trap of helling. Straal 3 km.
- Plek: alleen de plek van het weer (`homeLocation`). Het adres van een vakantie en de periode "Zonder sportschool" volgen later.
- Tijdgrenzen: 12 s voor Overpass en 8 s voor de hoogte, met `AbortController`. Elke fout of geen netwerk betekent geen regel en geen melding; offline blijft een eerder bewaard resultaat van de plek bruikbaar.
- De link is een gewone verwijzing buiten de app, naar de plek van de helling of trap.
- Bron van de kaartgegevens: OpenStreetMap, licentie ODbL.

## Alternatieven

- Een eigen rol voor trap- of bergconditie op sjablonen: vraagt een migratie van opgeslagen programma's.
- De hoogte uit OpenStreetMap-tags (`ele`): te vaak leeg of fout.
- De regel als eigen kaart: te veel; hij staat onder het weer.

## Bron

`docs/backlog.md`, secties "Heuvels en trappen in de buurt via OpenStreetMap" en "Buiten: UV, zon en hoogte uit Open-Meteo".

## Vervangt

Niets.

## Terugdraaien

Zet de schakelaar uit, of haal `HillsNearbyLine` weg uit `TodayMissionCard.tsx` en `TrainingGuideSheet.tsx`. De bewaarde plekken op het toestel zijn alleen een cache.
