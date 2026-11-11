# Plekken: de opslag (spoor 1)

Datum: 2026-11-11
Status: aangenomen

## Besluit

Plekken en bewaarde routes zijn een opgeslagen vorm: twee sleutels in de meta-opslag (`places` en `savedRoutes`), twee optionele velden in de back-up, en Vast punt is de plek Thuis geworden. Dit is spoor 1 uit `docs/visie/Ontwerp Plekken en routes.md`; er is nog geen nieuw scherm.

Wat er staat:

- `src/models/place.ts`: `Place` en `SavedRoute`, met `source` voor de herkomst en zonder veld van een leverancier.
- `src/storage/places.ts`: lezen gooit nooit, elke schrijfactie is één transactie, en de migratie `migrateStartPointToHome`.
- `src/storage/migrationsPlaces.ts`: opschonen bij het inlezen, van een back-up en van het toestel zelf.
- `src/storage/routeStart.ts`: Startpunt van je lus leest en zet Thuis. De instelling houdt de waarde `exact`.
- De back-up: `places` en `savedRoutes` in de envelop (versie 5 blijft 5) en als optionele velden op de oude platte export (schemaversie 2 blijft 2).

De keuzes die niet in het ontwerp stonden:

- De migratie staat niet in de lijst `BOOT_MIGRATIONS`. Die lijst onthoudt per versie van de app wat gelopen heeft, en een stap die zonder fout eindigt krijgt een vinkje. Deze migratie moet bij elke start opnieuw kijken tot het gelukt is. Hij loopt aan het eind van `runBootMigrations`, binnen hetzelfde slot, met dezelfde grens in tijd als een herstelstap. Is de oude sleutel weg, dan kost hij één leesactie. De bestaande tests van de opstartstappen bewegen zo niet.
- Thuis heeft een vast id (`place_home`). Twee keer migreren kan zo nooit twee keer Thuis geven.
- De volgorde is die van het ontwerp: Thuis schrijven, teruglezen, dan pas de oude sleutel wissen. Mislukt het wissen, dan staat Thuis er al en wist de volgende start alleen de sleutel.
- Zolang de migratie niet gelukt is, leest `getRouteStartPoint` de oude sleutel nog. Vast punt valt dus nooit een start lang weg.
- Een kapotte oude waarde was al geen punt. Er komt dan geen Thuis en de sleutel gaat weg.
- Gebruik waar ik nu ben en Start hier verhuizen Thuis naar het nieuwe punt; naam, dag en routes blijven. Dat Start hier Thuis niet meer verschuift is spoor 4.
- Wis startpunt haalt Thuis weg, met zijn routes, in één transactie. In dit spoor kan Thuis nog geen routes hebben, behalve uit een back-up van een latere versie. De vraag die het aantal routes noemt komt met het scherm in spoor 3; tot dan vraagt Wis startpunt niets.
- Of een route een lus is wordt niet bewaard. Het volgt uit het eerste en het laatste punt (`engine/places.ts#isLoopRoute`, 150 m), net zoals gelopen uit de logs volgt. Een bewaarde vlag kan gaan afwijken van de punten.
- Een onbekende herkomst wordt bij het inlezen `import`. Een te lange naam wordt ingekort, een onbekend kenmerk valt uit de lijst, en van twee keer Thuis blijft de eerste Thuis. Daarvoor valt geen plek weg.
- Een route met meer dan 800 punten valt bij het inlezen weg. Dun maken is `simplifyTrack` in spoor 2; de opslag bewaart alleen wat al klein genoeg is.
- Een route van een plek die er niet is valt weg, ook bij een import: een route hoort altijd bij één plek.
- Een lege lijst gaat niet de back-up in. Een bestand zegt zo nooit "geen plekken", en een back-up van een toestel zonder plekken laat de plekken van een ander toestel staan.
- De kopie die voor een import wordt gemaakt is de uitzondering: die schrijft een lege lijst wel, zodat Ongedaan maken de plekken weghaalt die de import bracht. Een kopie van voor dit spoor heeft de velden niet en laat de plekken staan.
- Een lijst waarvan bij het inlezen niets overblijft (alleen kapotte rijen) telt als niet aanwezig. Kapotte rijen maken het toestel nooit leeg.
- Kunnen de plekken van het toestel bij een import niet gelezen worden, dan verandert een bestand met alleen routes niets.
- Plekken reizen bij een import mee met Instellingen: bij Volledig terugzetten vervangen ze de lijst, bij Samenvoegen blijft het toestel met rust.
- De naam van een route mag 60 tekens zijn. Het ontwerp noemt alleen de 40 van een plek.

Een bestaande test is aangepast, en dat hoort bij dit besluit. `routeStart.test.ts` zei "staat niet in de export en niet in een back-up". Het besluit `2026-11-11-plekken-en-routes.md` laat dat vervallen: Thuis gaat mee. De test zegt nu dat het punt als de plek Thuis in de back-up staat, en nooit onder de oude sleutel of in de instellingen. De zin in Instellingen onder Startpunt van je lus zei "Het gaat niet mee in een back-up" en zegt nu "Het gaat mee in je back-up", omdat de oude zin niet meer waar was.

## Reden

De opslag en een migratie die niet terug kan komen eerst, los van elk scherm, zodat de volgende sporen op een vaste vorm bouwen.

## Alternatieven

- Een stap in `BOOT_MIGRATIONS`: dan moet de stap een fout gooien om geen vinkje te krijgen, houdt hij de herstelstappen na hem tegen, en bewegen drie bestaande tests.
- Schrijven en wissen in één transactie: sterker tegen een fout halverwege, maar het ontwerp vraagt teruglezen voor het wissen. De twee stappen zijn zo gemaakt dat elke tussenstand bij de volgende start goed afloopt.
- Thuis buiten de back-up houden: tegen het besluit van vandaag.

## Bron

`docs/visie/Ontwerp Plekken en routes.md` (hoofdstuk 1 en hoofdstuk 5, spoor 1), `docs/beslissingen/2026-11-11-plekken-en-routes.md`, `docs/beslissingen/2026-11-11-plekken-antwoorden.md`. De opdracht van de coördinator van 11 november.

## Vervangt

Het deel van `2026-11-09-startpunt-lus.md` dat zegt dat het vaste punt nooit in een back-up staat, zoals `2026-11-11-plekken-en-routes.md` al aankondigde.

## Terugdraaien

De migratie draai je niet terug. De twee velden in de back-up zijn optioneel: een versie die ze niet kent leest de rest. `getRouteStartPoint` kan weer de oude sleutel lezen, maar die is na de migratie weg; het punt staat dan in `places`.

## Nog open

- De teksten die zeggen dat het vaste punt alleen op dit toestel wordt bewaard (`RoutePanel.tsx`, `settingsHelp.ts`, `settingsIndex.ts`): het punt gaat nu mee in je eigen back-up. Ze veranderen met spoor 3, waar Vast punt Thuis gaat heten.
- Het voorbeeld van een import noemt de plekken nog niet. Dat is een zichtbare regel en hoort bij spoor 3.
- Een import loopt niet door de keten van schrijfacties in `storage/places.ts`. Een plek die je bewaart in dezelfde tel als een import kan de oude stand terugschrijven. Een import vraagt eerst een bevestiging, dus dat is in de praktijk niet te raken.
- Een waarde in de opslag die geen lijst is leest als leeg; de eerstvolgende schrijfactie zet er een schone lijst overheen.
- De lus van vandaag tot middernacht is nog niet gebouwd (Briefing spoor 9). Dit spoor raakt hem niet: de opslag schrijft alleen `places`, `savedRoutes` en wist `routeStartPoint`, en daar staat een test op.
