# Andere lus: Soort terrein en Via een punt

Datum: 2026-11-23
Status: aangenomen

## Besluit

Het blad Andere lus (`2026-11-22-andere-lus.md`) krijgt twee dingen erbij.

- **Soort:** een groep met drie rijen, elk met één regel uitleg: Langs water, Door bos of groen, Meer onverhard. Elke keuze is één zoektocht van de bestaande planner (`proposeAdventure` met `kind`), dus binnen `MAX_ROUTE_CALLS` en dezelfde tijdgrens als de richtingen (`storage/routeProposal.ts#findOtherLoop`). De punten van de lus zijn alleen dingen van die soort. Ligt er binnen een kwart van de afstand van de training (het eerste zoekbereik) niets van die soort, dan staat er één droge zin ("Binnen 3 km ligt geen water.") en blijft de lus zoals hij was; er gaat dan geen aanroep naar de routeplanner.
- **Via een punt:** een rij die de kaart in Groter zet, in kiesstand, met de regel "Tik waar de lus langs moet". Een tik zet een speld (dezelfde ring als bij Start hier); de knoppen zijn Lus erlangs en Annuleren. De lus begint bij de start, gaat langs het punt en komt terug bij de start (`routePlanner.ts#viaLoopVias`: het punt en een aanvulpunt opzij, zo ver dat de lengte past). Een lus telt alleen als hij binnen 250 m van het punt komt; de planner laat het punt nooit vallen. Zonder pad bij het punt staat er een zin en blijft de lus. Zonder punt (knop onder Andere lus, zolang de lus langs een punt gaat) brengt terug naar de gewone lus. Buiten de kiesstand doet een tik op de kaart Start hier, zoals altijd. Plekken zijn geen via-punt.

Het via-punt en de gekozen soort staan alleen in het geheugen: niet bewaard, geen migratie, geen instelling. Het punt gaat naar de routeplanner zoals de start. Het blad noemt Simpel en Avontuurlijk niet.

## Eigen keuzes buiten de opdracht

- **Water en bos in dezelfde Overpass-vraag.** De bewaarde kaartgegevens kenden alleen hellingen, trappen, onverharde paden, sportvelden en atletiekbanen. De vraag krijgt een tweede deel (water: `natural=water`, rivieren en kanalen; bos of groen: `landuse=forest`, `natural=wood`, parken en natuurgebied) in hetzelfde verzoek, met een eigen limiet van 200 zodat ze de hellingen niet verdringen. Het nieuwe veld `scenery` op een bewaarde plek zegt dat ze erin zitten. Geen migratie: de cache gaat nooit in een back-up en een plek zonder het veld is gewoon oud.
- **Een oudere bewaarde plek wordt voor Langs water en Door bos of groen eenmalig opnieuw gevraagd** (`refreshNearbyTerrain` met `needScenery`), binnen de tijdgrens. Lukt dat niet, dan zegt de regel dat water en bos nog niet zijn opgehaald, niet dat er niets ligt. Meer onverhard heeft die gegevens al en vraagt niets nieuws.
- **Een plas of bos is een punt.** De kaart geeft van een vlak alleen het midden (`out center`). Een lus naar het midden van een groot meer wordt door de routeplanner op het dichtstbijzijnde pad gezet; wat dat oplevert is niet getoetst met echte antwoorden.
- **Het via-punt is geen schuifkaart:** na Lus erlangs of Annuleren sluit Groter weer, zodat de zoekregel en de lus in het blad staan.
- **Een mislukte Via-lus krijgt geen Opnieuw:** een nieuwe poging met hetzelfde punt geeft hetzelfde antwoord.
- **De lus langs een punt wordt niet op de wind gedraaid:** het punt bepaalt de vorm.

## Instellingen bij route-info (I-120)

Terug voor het donker (`routeBackBeforeDark`) krijgt een uitleg achter de i, zoals Wind bepaalt de richting. Hoogteprofiel, ondergrond en afhaken blijven zonder instelling, omdat ze feiten over de lus zijn die uit de lus zelf komen en geen keuze van de app: ze veranderen de lus niet, kosten geen aanroep en lieten bij uitzetten alleen minder zien (`2026-11-22-route-info.md`); Terug voor het donker is een oordeel over jouw uur, dat je mag uitzetten.

## Reden

De eigenaar vroeg in het besluit Andere lus al om Via een punt en Soort terrein, later (I-112). Een lus langs water of bos, of langs een plek die je zelf aanwijst, is wat een loper zelf zou kiezen.

## Alternatieven

- Een tweede Overpass-verzoek voor water en bos: een extra aanroep met je plek, tegen de afspraak. Het zit nu in het verzoek dat er al is.
- Het soort terrein te lezen uit de lus achteraf (de ondergrond of wat langs de lus ligt): dan zoekt de planner eerst en kijkt daarna, zonder dat de lus er een reden voor heeft.
- Het via-punt bewaren of een plek als via-punt: een route wordt nergens bewaard, en een plek is een start.

## Bron

Het besluit `2026-11-22-andere-lus.md` (Alternatieven), inbox I-112, en de besluiten `2026-11-09-routeplanner.md` en `2026-11-14-route-kaart-vervolg.md`.

## Vervangt

Niets. Het besluit Andere lus blijft; dit voegt toe.

## Terugdraaien

De rijen Soort en Via een punt uit `OTHER_LOOP_CHOICES` en `OtherLoopRows` halen; `kind` en `via` uit `AdventureShape`, `viaPick` uit `RouteMap.tsx` en `other.choosing` uit `useRouteSearch.ts`. De Overpass-vraag kan dan zijn tweede deel kwijt; `scenery` in een bewaarde plek blijft onschadelijk.
