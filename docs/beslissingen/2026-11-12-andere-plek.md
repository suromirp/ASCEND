# Andere plek: zoeken op naam bij Start bij

Datum: 2026-11-12
Status: aangenomen

## Besluit

In de rij Start bij (Briefing en blad Route) staat een chip Andere plek. Een tik opent het blad Nieuwe plek met één zoekveld dat meteen focus krijgt. Na een pauze van 400 ms in het typen zoekt de bestaande zoekdienst van het weer (Open-Meteo, `searchPlaces`), met een grens van 8 seconden en een zichtbare uitkomst: treffers met naam, regio en land, geen treffers, geen verbinding, te traag of een fout. Leeg en één letter zoeken niet. Een tik op een treffer zet de start voor deze training daar, zoals Start hier, en bewaart niets; de chip toont dan de naam. Ligt de treffer binnen 100 m van een bewaarde plek of Thuis, dan wordt die chip gekozen. Onder de kaart staat dan Bewaar als plek: één tik bewaart hem met zijn naam via `storage/places.ts#savePlace`, nooit dubbel; heet een andere plek al zo, dan komt de regio erbij en anders een nummer. Bewaarde plekken staan als chip tussen Thuis en Andere plek, samen hoogstens vier chips, de recentste eerst; een plek die je voor deze training koos blijft erbij. De rij schuift opzij als de namen niet passen, met een vaste hoogte van 44 px.

Geen nieuwe instelling. Er wordt niets voor je gekozen: zoeken gebeurt alleen als je typt, en de keuze geldt voor één training. Wie geen andere plek wil, tikt de chip niet. De privacyzin staat onder het zoekveld en in de eerste vraag: Open-Meteo krijgt alleen de plaatsnaam die je typt.

Bewaar als plek bij een gezochte plek is één tik, zonder Maak dit Thuis: een gezochte plek heeft een naam en is zelden je deur. Bij een getikt punt blijft Bewaar als plek de weg naar Maak dit Thuis.

## Reden

De eigenaar wil een heuvelrug of natuurgebied kunnen intypen zodat de lus daar begint (backlog, Zoeken op de kaart en avontuurlijke plekken; spoor 7 van Plekken naar voren gehaald).

## Alternatieven

Een tweede zoekdienst (Nominatim) voor natuurgebieden: niet nu, de opdracht was hergebruiken; voorstellen van heuvels en natuurgebieden komen in een volgende stap na onderzoek door Scout. Na een treffer eerst de kaart met "tik waar je lus begint" (ontwerp): niet gedaan, Start hier op de kaart doet dat al na de keuze. Een instelling voor het aantal chips: geen keuze die de app voor je maakt, dus niet nodig.

## Bron

Backlog (eigenaar 11 november), `docs/visie/Ontwerp Plekken en routes.md` (Nieuwe plek, ook vooraf; spoor 7), `docs/onderhoud/2026-11-11-pathfinder-route-start.md` eis 1.

## Vervangt

Niets.

## Terugdraaien

In `components/RoutePanel.tsx#StartChips` de chip Andere plek weer weglaten (filter op `here` en `home`) en `NewPlaceSheet` niet meer openen; `planStart` negeert dan `place`.
