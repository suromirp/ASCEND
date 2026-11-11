# Plekken en routes: de antwoorden van de eigenaar

Datum: 2026-11-11
Status: aangenomen

## Besluit

De vijf vragen uit `docs/visie/Ontwerp Plekken en routes.md`:

1. De rij in Instellingen heet Je plekken. De gids Trainingsplekken krijgt per heuvel de knop Bewaar als plek.
2. Start hier op de kaart geldt alleen voor die ene zoektocht. Wil je het punt houden, dan tik je Bewaar als plek. Thuis schuift niet meer mee.
3. Op jouw tik op Bewaar deze route haalt de app het spoor van die ene horlogeloop op en bewaart het als route bij een plek. Verder wordt een spoor nooit bewaard.
4. Hoe ver een voorgestelde plek mag liggen, hangt af van de training. De standaardgrens is 75 km hemelsbreed, instelbaar tot onbeperkt. Bij een training korter dan 90 minuten stelt de app geen plek voor die verder dan 25 km ligt. Vanaf 90 minuten geldt de ingestelde grens. Van de plekken die passen komt de dichtstbijzijnde eerst.
5. Ligt de gekozen plek verder dan 10 km van huis, dan toont de Briefing het weer bij die plek. Een bovengrens is er niet.

## Reden

Bij vraag 4 zei de eigenaar dat een plek ook verder weg mag liggen, omdat een heuvelgebied op enige afstand voor hem het beste bergtraining is. Een vaste grens van 25 km zou dat uitsluiten. Een ruime grens voor elke heuveltraining maakt van elke korte sessie een voorstel om te gaan rijden, en dat wordt ruis. Daarom hangt de afstand af van de lengte van de training. Bij vraag 5 vroeg de eigenaar of dat ook voor het weer geldt: ja, en juist verder weg is het weer ter plekke het nuttigst. Vraag 1 tot 3: "En verder advies".

## Alternatieven

- Eén vaste grens van 25 km (advies van Cartographer): sluit het beste heuvelgebied uit.
- Geen grens: dan stelt de app bij een korte sessie een rit van een uur voor.
- Reistijd in plaats van hemelsbreed: dat vraagt een extra dienst en netwerk. De afstand hemelsbreed is een benadering die vooraf te zeggen is.

## Bron

Gesprek met de eigenaar in de coördinator-chat, 11 november. Ontwerp: `docs/visie/Ontwerp Plekken en routes.md`.

## Vervangt

Vult `2026-11-11-plekken-en-routes.md` aan. Het advies van 25 km in het ontwerp vervalt door punt 4. Het deel van `2026-11-09-startpunt-lus.md` waarin Start hier het vaste punt bewaart, vervalt door punt 2.

## Terugdraaien

De drempels (75 km, 25 km, 90 minuten, 10 km) zijn instellingen of constanten in `engine/places.ts`. Punt 2 en 3 draai je terug met een nieuw besluit.
