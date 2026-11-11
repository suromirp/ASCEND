# Landsvlakken voor de luchtfoto

De bronkeuze van de luchtfoto (`src/integrations/aerialImagery.ts#aerialSourceFor`) kiest PDOK als alles wat de kaart in beeld brengt in het vlak van Nederland ligt, IGN als het in het vlak van Frankrijk ligt, en anders EOX. PDOK en IGN geven buiten hun land, en IGN ook op zee en op meren, een witte tegel. De vlakken liggen daarom een paar kilometer binnen de grens. Besluit: `docs/beslissingen/2026-11-11-luchtfoto.md`.

## Bron

Natural Earth 1:10m, `ne_10m_admin_0_countries` en `ne_10m_lakes` (publiek domein), bijvoorbeeld uit de geojson-map van github.com/nvkelso/natural-earth-vector. De bestanden komen niet in de repo.

## Opnieuw maken

Nodig: Python 3 met `shapely`, `pyproj` en `Pillow` (in een eigen venv buiten de repo).

1. `python3 maak-vlakken.py admin0.geojson lakes.geojson vlakken.json`
   Frankrijk: het vasteland zonder meren, 4,5 km naar binnen, vereenvoudigd binnen 1,5 km (dus minstens 3 km van grens, kust en meeroever). Nederland: het land met een zoom van 1,5 km, minus 2,9 km rond België en Duitsland, vereenvoudigd binnen 400 m (dus minstens 2,5 km van de landsgrens). Vlakken kleiner dan 40 km2 vallen weg.
2. `python3 schrijf-vlakken.py vlakken.json ../../../src/integrations/aerialImagery.ts`
3. `python3 meet-vlakken.py vlakken.json 13` meet elke kilometer langs elke rand met een echte tegel. De uitslag van 11 november 2026: 5699 punten, geen wit (vijf ophaalfouten hadden bij een tweede poging beeld).
4. `npx vitest run src/integrations/aerialImagery`

Een met de hand getekend of aangepast vlak controleer je altijd zo: tegen echte grensdata en met echte tegels, niet alleen met een paar steden.
