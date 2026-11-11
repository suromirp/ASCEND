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
- `rankSavedRoutes`: een route die past gaat voor (de afstand volgens `fitsDistance` en, als de training hoogtemeters vraagt, tussen 80 en 125 procent daarvan, `MAX_ASCENT_SHARE`), dan `missScore` uit `routePlanner.ts`, dan het vaakst gelopen, dan de naam, dan het id. De zin begint met Past of Wijkt af en eindigt met "Nog niet gelopen." of "Je liep hem 3 keer.".
- `suggestPlace` neemt erbij wat er bij het startpunt kan (`here`: hoogtemeters of afstand, als die bekend zijn) en de logs. Wat het startpunt kan is het beste van `here` en de routes van een plek binnen 300 m van het startpunt. "Ruim onder" betekent: onder dezelfde 80 procent. Is niets bekend, dan telt dat als niet genoeg en zegt de zin niets over hier. Warden zegt ja op beide vragen: bij een onbekende stand bij het startpunt komt het voorstel zonder hier, en `routeRunDates` heeft de planning niet nodig. Bij een lange training zegt de zin "past", niet "past precies": 18,2 of 22 km voor 20 km is niet precies.
- Een grens of maat die geen getal is, is geen grens: `!(x <= grens)`. Een doel dat geen getal is vraagt niets, een grens hemelsbreed die geen getal is geeft geen voorstel, een punt dat geen getal is ligt bij geen plek, en wat het startpunt kan telt alleen als eindig getal van minstens nul. Zo komt een NaN nooit in een zin.
- Een bewaarde route komt alleen in een voorstel als hij past volgens dezelfde regel als Past in `rankSavedRoutes`: de afstand past (`fitsDistance`: hoogstens 10 procent korter en 12 procent langer) en gevraagde hoogtemeters liggen tussen 80 en 125 procent. Dus geen 40 km voor een training van 8 km, geen 900 hoogtemeters voor 300, en bij een lange training van 20 km met 80 hoogtemeters geen vlakke route (review Warden). Wat het startpunt kan, telt alleen uit routes daar met een passende afstand: een route van 40 km bij Thuis houdt een voorstel voor 8 km niet tegen.
- Een plek binnen 300 m van het startpunt wordt nooit voorgesteld: daar begin je al.
- Van de plekken die passen komt de dichtstbijzijnde eerst (antwoord 4 van de eigenaar), ook als een verdere beter past. Bij gelijke afstand de beste route, dan de naam, dan het id; de volgorde van de invoer telt niet.
- Een route van A naar B mag in een voorstel; of hij een lus is staat in de regel, niet in de keuze.
- `startChoices` kiest nooit vanzelf de voorgestelde plek. `exact` kiest Thuis als die er is, anders Waar je nu bent; Ongeveer valt onder Waar je nu bent. Een tik voor deze ene training (`picked`) gaat voor; een tik op een plek die er niet meer is telt niet. Bekende grens voor spoor 3 en 6: een plek gekozen via Andere plek staat niet in de chips, dus `picked` met die plek valt terug op de instelling; dat spoor voegt de gekozen plek als chip toe.
- `simplifyTrack` is Douglas-Peucker zonder recursie die steeds het stuk met de grootste afwijking eerst splitst, tot alles binnen 5 m ligt of er 800 punten zijn. Verdubbelen van de tolerantie kon alles weggooien (20.000 zigzagpunten werden 2, review Warden): bij een zigzag is elke afwijking gelijk. Bij gelijke afwijking op hele meters kiest hij het punt het dichtst bij het midden van een stuk en splitst hij het langste stuk eerst, zodat de punten over het hele spoor verspreid blijven. Begin en eind blijven altijd. De hoogte telt mee als de drie punten een eindige hoogte hebben; een hoogte die geen getal is valt weg. Punten zonder geldige breedte of lengte vallen weg, ook in `trackFacts`.
- `trackFacts` rondt afstand en hoogtemeters af op hele meters en telt hoogte met de dode band van `routeGeometry.ts#ascentOf`.
- `weatherAtPlace` (verder dan 10 km) staat er al voor spoor 6, met de constante uit antwoord 5.

## Reden

Spoor 3 tot 7 bouwen op deze functies. Door ze puur en apart te toetsen hoeft een scherm geen afstanden of volgorde te kennen.

## Alternatieven

- De tolerantie verdubbelen of halveren tot het past: bij een zigzag houdt elke tolerantie alles of twee punten.
- Een voorstel zonder te weten wat hier kan weigeren: dan stelt de Briefing nooit iets voor zolang de zoektocht nog loopt.

## Bron

`docs/visie/Ontwerp Plekken en routes.md` (hoofdstuk 1, 3 en 5), `2026-11-11-plekken-antwoorden.md`, `2026-11-11-plekken-opslag.md`.

## Vervangt

Niets.

## Terugdraaien

Alles staat achter constanten in `engine/places.ts` (`PLACE_ASCENT_NEED_M`, `LONG_TRAINING_MIN`, `PLACE_REACH_DEFAULT_KM`, `SHORT_TRAINING_REACH_KM`, `SUGGEST_SHARE`, `MAX_ASCENT_SHARE`, `NEAR_PLACE_M`, `WEATHER_AT_PLACE_KM`, `SIMPLIFY_TOLERANCE_M`). Nog niets gebruikt de functies, dus weghalen raakt geen scherm.
