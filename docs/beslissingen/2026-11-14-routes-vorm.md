# De vorm van een lus: doodlopende stukken, grote wegen en de helling op de kaart

Datum: 2026-11-14
Status: aangenomen

## Besluit

ASCEND telt de doodlopende stukken van elke voorgestelde lus in de meetkunde zelf (`engine/routeGeometry.ts#deadEnds`): een tak van minstens 80 m die je in en weer uit loopt, waar geen ander deel van de route voorbij gaat. Simpel mag er één hebben (heen en terug, of de helling), Avontuurlijk geen. Meer dan dat zegt de naam ("Heen en terug over twee takken", "Lus met een stuk heen en terug"); "Eén lus" heet alleen een lus zonder doodlopend stuk. Bij gelijke pasvorm van de afstand wint de lus met minder takken dan bij zijn soort hoort. Een tak in de aanloop naar een helling valt weg (`withoutDeadEnds`), en past een avontuurlijke lus met een tak, dan volgt nog één poging zonder het punt bij de tak (binnen de drie aanroepen).

Bij lopen vraagt ASCEND BRouter om `consider_noise` (wegen bij verkeerslawaai, grote wegen en knooppunten van snelwegen, duurder) en Valhalla om een voetpad boven de weg (`walkway_factor` 0,8). Loopt er toch 300 m of meer over een grote weg (trunk, primary of secondary volgens BRouter), dan zegt een regel in amber bij de lus dat ("Langs een grote weg: 0,8 km."). Valhalla zegt niet welke weg, dus daar geen regel.

Bij herhalingen op een helling staat dat stuk gemarkeerd op de kaart (de rand van Per stuk), met de regel "Gemarkeerd op de kaart: hier 6 keer op". De ingeklapte rij van de andere lus in de Briefing toont in amber dat hij te kort is, net als de gekozen lus.

## Reden

De eigenaar zag op reis (14 november) een "1 × de helling op en af" die een Y tekende met twee doodlopende takken, en een "Eén lus" met een doodlopend stuk. De Y kwam uit de reserve van Simpel: de helling uit de avontuurlijke lus, met in de aanloop een tak naar een punt van die lus. Ook liep een lus langs grote wegen en een knooppunt van snelwegen.

## Alternatieven

- De vorm uit de punten van de aanvraag afleiden: zegt niets over wat de routeplanner tekende.
- Een tak altijd afkeuren: soms is er geen andere weg naar de helling of het pad; dan liever een eerlijke naam.
- Een tekst op de kaart zelf (een label in MapLibre): de effen en de rasterkaart hebben geen lettertype, dus de regel staat bij de lus.
- Een strengere grens dan 12 m voor heen en terug op hetzelfde pad: een weg met een fietspad ernaast op 8 m telt nu als hetzelfde pad; ruimer gaf valse takken bij haarspeldbochten.
- BRouter `path_preference`: maakte een lus in een proef een kwart langer dan `consider_noise` en stuurt niet op lawaai.

## Bron

Inbox P in `docs/backlog.md`, schermafdrukken van de eigenaar (niet in de repo). Proef met nagemaakte punten (52.1, 5.9): een lus van vier punten had twee doodlopende stukken (80 m en 5,2 km); `consider_noise` haalde secondary-wegen van 4,7 naar 2,7 km.

## Vervangt

Niets.

## Terugdraaien

`SPUR_MIN_M` hoger zetten of `extraDeadEnds` op nul laten uitkomen zet de keuze terug; `BROUTER_PROFILE_PARAMS` leeg en `costing_options` weg zet de aanvraag terug; `climbStretch` undefined laten geven haalt de markering weg.
