# Plekken: de engine (spoor 2)

Datum: 2026-11-11
Status: aangenomen

## Besluit

De pure functies uit hoofdstuk 3 van `docs/visie/Ontwerp Plekken en routes.md` staan in `src/engine/places.ts`, met tests in `src/engine/places.test.ts`: `placeNeed`, `placeReachKm`, `routeRunDates`, `rankSavedRoutes`, `nearestPlace`, `suggestPlace`, `weatherAtPlace`, `startChoices`, `simplifyTrack` en `trackFacts`. Geen scherm, geen opslag, geen netwerk; niets verandert de planning.

De keuzes die niet in het ontwerp stonden:

- `placeNeed` vraagt hoogte bij een doel van minstens 100 hoogtemeters, of bij een heuveltraining met een doel van minstens 20 (`MIN_ASCENT_TARGET_M`). Een heuveltraining zonder hoogtemeters vraagt niets. Hoogte gaat voor lang. Een optioneel derde argument geeft de minuten van deze ene training (de stap van de week of een vaste lengte); anders telt `durationVariants.full`.
- Een training zonder duur (nul, negatief of geen getal) is nooit lang en krijgt de korte grens van 25 km.
- De grens hemelsbreed is een eigen functie, `placeReachKm(need, instelling)`: korter dan 90 minuten hoogstens 25 km, vanaf 90 minuten de instelling (standaard 75 km, `null` is Geen grens). Een plek precies op de grens telt mee.
- `routeRunDates` kijkt alleen naar `chosenFor` en de logs; het ontwerp noemde ook de planning als invoer, maar een log noemt zijn geplande training zelf. Een route uit een horlogeloop telt zijn loop pas mee als spoor 5 die loop in `chosenFor` zet.
- `rankSavedRoutes`: een route die past gaat voor (de afstand volgens `fitsDistance` en minstens 80 procent van de hoogtemeters), dan `missScore` uit `routePlanner.ts`, dan het vaakst gelopen, dan de naam, dan het id. De zin begint met Past of Wijkt af en eindigt met "Nog niet gelopen." of "Je liep hem 3 keer.".
- `suggestPlace` neemt erbij wat er bij het startpunt kan (`here`: hoogtemeters of afstand, als die bekend zijn) en de logs. Wat het startpunt kan is het beste van `here` en de routes van een plek binnen 300 m van het startpunt. "Ruim onder" betekent: onder dezelfde 80 procent. Is niets bekend, dan telt dat als niet genoeg en zegt de zin niets over hier.
- Een plek binnen 300 m van het startpunt wordt nooit voorgesteld: daar begin je al.
- Van de plekken die passen komt de dichtstbijzijnde eerst (antwoord 4 van de eigenaar), ook als een verdere beter past. Bij gelijke afstand de beste route, dan de naam, dan het id; de volgorde van de invoer telt niet.
- Een route van A naar B mag in een voorstel; of hij een lus is staat in de regel, niet in de keuze.
- `startChoices` kiest nooit vanzelf de voorgestelde plek. `exact` kiest Thuis als die er is, anders Waar je nu bent; Ongeveer valt onder Waar je nu bent. Een tik voor deze ene training (`picked`) gaat voor; een tik op een plek die er niet meer is telt niet.
- `simplifyTrack` is Douglas-Peucker zonder recursie, eerst op 5 m. Haalt dat de 800 punten niet, dan verdubbelt de tolerantie tot het past. Begin en eind blijven altijd. De hoogte telt mee als de drie punten hem hebben, zodat een bult in een rechte weg in de hoogtemeters blijft. Punten zonder geldige breedte of lengte vallen weg.
- `trackFacts` rondt afstand en hoogtemeters af op hele meters en telt hoogte met de dode band van `routeGeometry.ts#ascentOf`.
- `weatherAtPlace` (verder dan 10 km) staat er al voor spoor 6, met de constante uit antwoord 5.

## Reden

Spoor 3 tot 7 bouwen op deze functies. Door ze puur en apart te toetsen hoeft een scherm geen afstanden of volgorde te kennen.

## Alternatieven

- Een tolerantie in één keer berekenen voor 800 punten: verdubbelen is eenvoudiger en voor een spoor van een paar duizend punten snel genoeg.
- Een voorstel zonder te weten wat hier kan weigeren: dan stelt de Briefing nooit iets voor zolang de zoektocht nog loopt.

## Bron

`docs/visie/Ontwerp Plekken en routes.md` (hoofdstuk 1, 3 en 5), `2026-11-11-plekken-antwoorden.md`, `2026-11-11-plekken-opslag.md`.

## Vervangt

Niets.

## Terugdraaien

Alles staat achter constanten in `engine/places.ts` (`PLACE_ASCENT_NEED_M`, `LONG_TRAINING_MIN`, `PLACE_REACH_DEFAULT_KM`, `SHORT_TRAINING_REACH_KM`, `SUGGEST_SHARE`, `NEAR_PLACE_M`, `WEATHER_AT_PLACE_KM`, `SIMPLIFY_TOLERANCE_M`). Nog niets gebruikt de functies, dus weghalen raakt geen scherm.
