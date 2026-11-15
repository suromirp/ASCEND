# De avond ervoor kent de plek uit de Briefing

Datum: 2026-11-15
Status: aangenomen

## Besluit

Een plek die je in de Briefing bij Start bij kiest, blijft voor die ene geplande training staan tot de dag van de training voorbij is. Open je de Briefing opnieuw, dan staat de plek er weer en zoekt de lus daar. De avond ervoor leest dezelfde keuze en toont het weer van die plek ("In Verwegdal: ..."), met dezelfde regels als de rij Weer in de Briefing. De nieuwe instelling Gekozen plek onthouden staat aan.

## Reden

Pathfinder en Lookout vonden op 13 november een naad (I-37): je kiest 's avonds een plek op een uur rijden voor de loop van morgen, en De avond ervoor toont daarna het weer van je eigen straat. Alleen de kaart de plek laten kennen was niet genoeg: dan zegt de kaart "In Verwegdal" en toont de Briefing na heropenen weer thuis. Het hoort één keuze te zijn, die op elke plek gelijk is.

De keuze geldt nog steeds voor één training en niet voor andere. Wat verandert is alleen dat sluiten en opnieuw openen hem niet meer wist.

## Keuzes van de bouwer

- Opslag: één meta-sleutel `startPlaceChoices` per geplande training, met de dag, de naam en het punt, en het id van een bewaarde plek of de treffer van een gezochte plek. Net als Waar train je? (`storage/trainingPlace.ts`) niet in de export en niet in een back-up, en dus geen migratiestap. Na de dag van de training vervalt de keuze; bij het volgende bewaren gaat hij weg.
- Een training die naar een andere dag verschuift begint opnieuw zonder plek: daar past de plek misschien niet meer.
- Een bewaarde plek die intussen gewist is komt niet stil terug. Een gezochte plek komt terug met zijn treffer, zodat Bewaar als plek nog werkt.
- Thuis, Waar je nu bent, Start hier op de kaart en Opnieuw met je plek wissen de onthouden plek. Start hier blijft zo voor één zoektocht.
- De onthouden plek staat er voordat er gezocht wordt: de lus leest hem samen met Thuis, binnen dezelfde grens in tijd. Er gaat geen zoektocht naar thuis uit die daarna verspringt.
- De avond ervoor toont het weer van de plek alleen als de rij Weer dat ook zou doen: Weer van de gekozen plek aan, Route voorstellen aan, een manier buiten met een lus, en een plek verder dan 10 km van huis. Zolang de plek laadt staat het weer van huis er zonder naam; laadt hij niet, dan "Weer in Verwegdal laadde niet. Thuis: ...". De lamp en het drinken lezen dezelfde voorspelling.
- De melding de avond ervoor gebruikt dezelfde invoer en volgt dus mee.
- Zonder geplande training (een Briefing zonder sessie) wordt niets onthouden.

## Alternatieven

- Niets onthouden en op De avond ervoor "Weer thuis:" zetten. Niet gekozen: eerlijk, maar dan ziet de eigenaar 's avonds nog steeds het verkeerde weer voor morgen, en in bijna elke andere situatie is die toevoeging ruis.
- Alleen De avond ervoor de plek laten kennen, de Briefing niet. Niet gekozen: twee schermen die het oneens zijn over dezelfde training.
- De plek in het plan of het log zetten. Niet gekozen: een plek is een voorkeur voor één training, geen planwijziging; logs blijven onaangeroerd.

## Bron

`docs/backlog.md` (I-37, Pathfinder en Lookout 13 november), `docs/beslissingen/2026-11-12-weer-op-de-plek.md`, `docs/beslissingen/2026-11-13-weer-van-de-plek-pagina.md`.

## Vervangt

Deels `2026-11-11-route-start.md`: de zin dat een tik op een plek niet bewaard wordt geldt niet meer voor een bewaarde of gezochte plek bij een geplande training. Voor Waar je nu bent, Thuis en Start hier blijft hij gelden.

## Terugdraaien

Zet Gekozen plek onthouden uit: dan leest en schrijft de lus niets en kent De avond ervoor de plek niet. In code: haal `sessionId` weg bij `useRouteSearch` in `TrainingBriefing.tsx` en `placeWeather` uit `useEveningInput`. De sleutel `startPlaceChoices` mag blijven staan.
