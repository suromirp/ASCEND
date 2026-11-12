# Andere plek: Photon als tweede zoekdienst

Datum: 2026-11-12
Status: aangenomen, met één open punt (CORS van Photon is niet gemeten, zie Open)

## Besluit

Het zoekveld van Andere plek vraagt eerst Open-Meteo, zoals nu. Vindt die niets, dan gaat hetzelfde zoekwoord naar Photon van Komoot (`photon.komoot.io`), dat in OpenStreetMap zoekt en ook een top, een heuvel en een natuurgebied kent. Beide vragen vallen binnen de ene grens van 8 seconden van de sessie; sluiten of een nieuw woord stopt ook de vraag aan Photon. De adapter staat in `src/integrations/photon.ts` (`photonUrl`, `photonKind`, `mapPhoton`, `searchPhoton`), de volgorde in `placeSearchSession.ts#searchInTurn`, de regels in `engine/placeSearch.ts` (`searchTerm`, `mergeFound`, `PLACE_KIND_LABEL`).

Bij een adres met komma's gaat alleen het deel voor de eerste komma naar de diensten; straat en postcode gaan de deur niet uit. Het veld houdt de hele tekst.

Een treffer van Photon toont zijn naam en eronder soort, regio en land: Top, Natuurgebied of Plaats. Andere soorten (een winkel, een straat, een huis) vallen weg. Een treffer die binnen 300 m van een eerdere ligt is dezelfde plek en staat er één keer.

De zin onder het veld is nu: Open-Meteo krijgt je zoekwoord. Vindt die niets, dan ook Photon van Komoot, dat in OpenStreetMap zoekt.

Geen nieuwe instelling: er wordt niets voor je gekozen, zoeken gebeurt alleen als je typt. Er is geen instelling voor externe bronnen die dit veld dekt.

## Reden

Een heuvel met adres en postcode gaf Geen plaats gevonden. Gemeten door de coördinator: de zoekdienst van Open-Meteo kent bijna alleen plaatsen, Photon vindt zo'n top wel.

## Eigen keuzes van de bouwer

- Photon wordt alleen gevraagd als Open-Meteo niets vindt, zoals de opdracht zegt. Gevolg: heet een dorp elders net als de heuvel die je zoekt, dan zie je alleen het dorp. Dat is niet opgelost; altijd beide vragen zou elk zoekwoord naar twee diensten sturen.
- Geeft Open-Meteo een fout, dan blijft zijn melding staan en wordt Photon niet gevraagd.
- Faalt Photon of is hij te traag binnen de grens, dan staat er Geen plaats gevonden of Zoeken duurde te lang, zonder eigen foutzin voor Photon.
- Geen `lang` in de vraag: Photon kent geen Nederlands en weigert een taal die het niet kent. Namen en landen komen zoals ze ter plaatse heten.
- De soort komt uit het label van OpenStreetMap: `natural` met peak, hill, volcano, ridge of saddle is Top; ander `natural`, `leisure` nature_reserve of park, `boundary` national_park of protected_area en `landuse` forest zijn Natuurgebied; `place` behalve house is Plaats.
- Een treffer van Photon houdt vijf decimalen (ongeveer een meter), zoals een bewaarde plek; Open-Meteo rondt zijn treffers af op twee decimalen en dat is niet aangeraakt.
- De lijst van Open-Meteo wordt niet ontdubbeld: alleen een treffer van de tweede bron kan wegvallen. Door de afronding op twee decimalen zouden twee dorpen anders één worden.
- `kind` staat alleen op de treffer in het geheugen en wordt niet bewaard: `placeToSave` kiest de velden zelf. Geen migratie.
- Het veld heet nog Plaatsnaam en de melding nog Geen plaats gevonden: geen nieuwe woorden als bijwerking.

## Open

CORS van `photon.komoot.io` is niet gemeten. Vanuit de bouwcontainer geeft Photon geen antwoord: de verbinding komt tot stand en daarna blijft het stil, met curl na 45 seconden en met een fetch in Chromium vanaf de preview na 30 seconden (Failed to fetch). Dat is geen CORS-uitkomst, niet ja en niet nee; Open-Meteo antwoordde in dezelfde proef binnen een seconde. Voor main: één fetch in Chromium op een toestel of netwerk dat Photon wel bereikt. Weigert de browser het antwoord, draai dit dan terug. Tot dan is het risico klein: een falende Photon geeft precies het gedrag van voor deze wijziging.

## Alternatieven

Nominatim: verboden terrein, het beleid staat zoeken tijdens het typen niet toe. Beide diensten tegelijk vragen: sneller en vollediger, maar elk zoekwoord gaat dan altijd naar twee partijen. Overpass op naam: traag en bedoeld voor een gebied, niet voor een naam.

## Bron

Opdracht van de coördinator van 12 november; `docs/beslissingen/2026-11-12-andere-plek.md`.

## Vervangt

Niets. Vult `2026-11-12-andere-plek.md` aan: de zin "geen tweede zoekdienst" en de privacyzin daar gelden niet meer.

## Terugdraaien

In `placeSearchSession.ts` de standaard terugzetten naar alleen `searchPlaces` en de privacyzin in `engine/placeSearch.ts` terug naar de oude. `photon.ts` kan dan weg.

## Aanvulling na de review (12 november, avond)

De tekst hierboven blijft staan; waar deze aanvulling iets anders zegt, geldt de aanvulling.

- CORS: Warden kreeg met curl en een Origin-kop 200 en `Access-Control-Allow-Origin: *`. In de testcontainer van Lookout was de host niet bereikbaar, net als in de bouwcontainer. Een echte fetch in de browser is dus nog niet gezien.
- Photon wordt ook gevraagd als Open-Meteo minder dan drie treffers geeft (`SECOND_SOURCE_BELOW`), binnen dezelfde grens van 8 seconden. Open-Meteo blijft voorop, de treffers van Photon komen erachter via `mergeFound`. Reden (Pathfinder): een top die net zo heet als een dorp werd anders nooit gevonden. Gevolg: bij een zoekwoord met weinig treffers gaat het woord naar beide diensten.
- De zinnen noemen geen dienst meer: Geen plek gevonden met die naam. Probeer een grotere plaats in de buurt. En: Geen verbinding. Controleer je internet en probeer het later opnieuw.
- Faalt Photon terwijl Open-Meteo niets vond, dan staat er Zoeken lukte niet. Probeer het zo nog eens. Een fout is geen nee. Vond Open-Meteo wel iets, dan blijven die treffers staan zonder melding.
- De privacyzin is nu: Je zoekwoord gaat naar Open-Meteo, en zo nodig naar Photon (OpenStreetMap). Van een adres gaat alleen het deel voor de komma mee.
- Treffers van Open-Meteo krijgen het label Plaats, zodat een gemengde lijst klopt. Eigen keuze van de bouwer: het label komt erbij in de sessie, niet in `mapPlaces`, want die vorm wordt ook bij het weer bewaard. Open-Meteo kent een enkele top; die heet dan ook Plaats.
- Geen bestaande zin gevonden voor de twee nieuwe meldingen (grep); de zinnen uit de opdracht zijn genomen, in de vorm van Ophalen lukte niet. Probeer het zo nog eens.
