# Ontwerp: Plekken en bewaarde routes

Cartographer, 11 november. Hoort bij het besluit `docs/beslissingen/2026-11-11-plekken-en-routes.md` en bouwt verder op de Briefing (`docs/visie/Ontwerp Route en trainingsscherm.md`, hoofdstuk 5 tot 7). Alleen een voorstel; er verandert niets in `src/`.

## Wat er nu is

Er zijn nu zes dingen die op een plek lijken, met vier verschillende namen:

- Waar train je? (Buiten, Loopband, Sportschool) per geplande training. Dat is een soort, geen punt, en alleen op het toestel (`storage/trainingPlace.ts`).
- Vast punt: één coördinaat op vijf decimalen onder de meta-sleutel `routeStartPoint`, nooit in de back-up (`storage/routeStart.ts`). Start hier op de kaart overschrijft hem.
- De plaats voor het weer: `settings.homeLocation`, een naam en een punt op twee decimalen. Die gaat wel mee in de back-up, schuift mee met Weer volgt je locatie, en dient ook als Vanaf in de gids Trainingsplekken.
- De gids Trainingsplekken (`/plekken`, `data/trainingSpots.ts`): een vaste lijst openbare heuvels en trappen in Nederland, met hoogteverschil en ondergrond.
- De plek van een tocht (`LeavePeriod.place`), voor het bergweer.
- De lus van vandaag: tot middernacht op het toestel, niet in de back-up.

Belangrijk voor deel twee: het spoor van een horlogeloop wordt bewust nooit bewaard (`models/activityStreams.ts`, `StreamSet.position` alleen in het geheugen). Een route uit je horloge bewaren vraagt dus het spoor opnieuw op, en dat is een eigen keuze van de eigenaar (vraag 3).

## 1. Het datamodel in woorden

Een Plek is een punt waar een lus kan beginnen, met een naam die jij kent.

- Een id, een naam (hoogstens 40 tekens), een punt (breedte en lengte op vijf decimalen, ongeveer een meter).
- Kenmerken, alleen als ze er zijn: een korte vaste lijst om uit te tikken (Heuvel, Trap, Bos of zacht pad, Vlak, Parkeren). Leeg mag. Een plek uit de gids Trainingsplekken neemt de kenmerken van de gids mee.
- Of het Thuis is. Er is hoogstens één Thuis; hernoem je hem, dan blijft hij Thuis voor Startpunt van je lus.
- Waar hij vandaan komt (Vast punt, de kaart, zoeken op plaatsnaam, je plek van nu, de gids, een horlogeloop) en wanneer hij is aangemaakt. Alleen voor de regel onder de naam en voor een fout uitzoeken.
- Een pin is een plek zonder routes. Er is geen apart ding dat pin heet; in de app staat nergens het woord pin.

Een bewaarde Route hoort altijd bij één plek.

- Een id, de plek, een naam (vanzelf: "Avontuurlijk 8,2 km", aan te passen), waar hij vandaan komt (een voorstel van de Briefing of een horlogeloop) en bij een voorstel de stijl (Simpel of Avontuurlijk).
- Afstand in meters, hoogtemeters, de punten met hoogte waar die er is. Hoogstens 800 punten: een lang spoor wordt vereenvoudigd tot ongeveer 5 m nauwkeurig, zodat de back-up klein blijft.
- Of het een lus is: eindpunt binnen 150 m van het begin. Een route van A naar B mag, en zegt dat in zijn regel.
- Wanneer aangemaakt, en bij welke geplande trainingen hij gekozen werd (datum en id van de geplande training). Wanneer gelopen wordt niet als vlag bewaard: een route is gelopen op een dag als er een `SessionLog` is bij een geplande training waarvoor hij gekozen was, net als bij de status van een sessie. Een route uit een horlogeloop telt die loop vanzelf mee.
- Een plek wissen wist zijn routes, na een vraag die het aantal noemt. Logs veranderen nooit.

Wat meegaat en wat niet.

- Vast punt wordt Thuis. Startpunt van je lus houdt de waarde `exact` in de opslag (geen tweede migratie), maar in de app heet die keuze voortaan Thuis. Wis startpunt verhuist naar de plek Thuis als Wissen.
- De plaats voor het weer blijft apart en heet zo. Hij volgt je onderweg en is een plaats, geen deur; samenvoegen zou je Thuis laten meeschuiven als je op vakantie bent. Nieuwe plek gebruikt wel dezelfde zoekdienst (Open-Meteo, `searchPlaces`).
- Waar train je? blijft een soort. Een plek kies je alleen bij Buiten.
- De plek van een tocht blijft bij de tocht. De gids blijft een gids, met per heuvel een tekstknop Bewaar als plek.
- Zo heet maar één ding plek: wat in Je plekken staat. Van vier soorten plek die je zelf maakt (Vast punt, Start hier, een pin, een plek) blijft er één over.

De migratie op het toestel, één keer bij de eerste start na het bijwerken:

- Staat er een `routeStartPoint` en nog geen Thuis, dan wordt hij de plek Thuis (herkomst Vast punt, aangemaakt op de dag van de migratie).
- Pas als Thuis gelezen kan worden, gaat de oude sleutel weg. Mislukt het schrijven, dan blijft alles staan en probeert de app het bij de volgende start opnieuw.
- Een tweede keer draaien doet niets. Terugdraaien kan niet (besluit).

De back-up:

- Plekken en bewaarde routes gaan mee, als twee optionele velden naast de rest, zoals `skillGoals`. De schemaversie blijft 2: optioneel en erbij, dus een oude back-up opent gelijk.
- Een import zonder deze velden laat de plekken op het toestel staan; leeg ontbreken is nooit "geen plekken". Met de velden vervangt de import de lijst, zoals bij de rest van een terugzetting.
- Een kapotte plek of route valt weg bij het inlezen, zonder de rest te verliezen, en telt mee in de regel met wat er is overgeslagen.
- Niet in de back-up: de keuze Waar train je?, de lus van vandaag tot middernacht, de cache met heuvels en paden, je plek van nu. `backupClean` blijft `routeStartPoint` uit oude instellingen halen.

## 2. Schermen

### Je plekken (Instellingen, Vandaag en meldingen)

Een rij Je plekken onder Plaats voor het weer, met als waarde "Thuis en 3 andere". Drie tikken van Vandaag (tandwiel, groep, rij); dat mag, want beheren doe je zelden. Het opent een eigen scherm met terugknop, geen blad, omdat er nog een laag onder zit.

Van boven naar beneden:

- `PageHeader` met kopje Instellingen, titel Je plekken, regel "Waar je lussen beginnen".
- Een `Card` met de plekken als rijen: naam, eronder één gedempte regel ("2 routes · 14 km hemelsbreed van Thuis" of "Nog geen route"), chevron. Thuis staat altijd bovenaan. Daarna op naam.
- `SecondaryButton` Nieuwe plek. Op dit scherm is dat het enige mint.
- Een tweede `Card` met de instellingen van hoofdstuk 4 als gewone `SettingsRow`s, met uitleg achter de i.

Een plek openen geeft het scherm van de plek: de naam als titel, de kaart (`RouteMap` op de lage stand, met de ring van het startpunt en zijn routes gestreept), de kenmerken als `Chip`s, de routes als rijen (naam, "8,2 km · 240 hoogtemeters", "Gelopen op 2 november" of "Nog niet gelopen"), en onderaan tekstknoppen Naam wijzigen, Punt verplaatsen en Wissen. Een route openen geeft een blad (`useSheetClose`, `SheetGrip`) met de kaart, de getallen met hun uitleg en de knop Route naar Garmin Connect, plus Naam wijzigen en Wissen.

Standen:

- Laden: de kop staat er meteen, de lijst krijgt een vaste hoogte met één gedempte regel "Plekken lezen". Na 3 seconden de foutregel.
- Eerste keer, met Vast punt: Thuis staat er al, met de regel "Je vaste punt heet nu Thuis." tot je hem een keer opent.
- Leeg: "Nog geen plekken. Een plek is waar een lus begint, zoals je deur of een heuvel waar je heen rijdt." met Nieuwe plek eronder.
- Fout: "Je plekken konden niet gelezen worden. Je lussen beginnen nu waar je bent." met Opnieuw.
- Zonder netwerk: de lijst werkt, de kaart toont de bestaande regel en de routes als tekst.

### Route bewaren in de Briefing

Onder de gekozen lus en de mint knop Route naar Garmin Connect komt één tekstknop: Bewaar bij Thuis (of de naam van de plek waar de lus begint). Twee tikken van Vandaag: Briefing, Bewaar.

- De lus begint bij een plek (binnen 300 m): één tik bewaart. Daarna staat er "Bewaard bij Thuis. Past hij een volgende keer, dan staat hij bovenaan." en de knop wordt Bewaard met een vinkje.
- De lus begint bij je plek van nu of een getikt punt, ver van elke plek: de knop heet Bewaar als plek en opent een blad met de naam (leeg, met de naam van de dichtste gidsplek als voorbeeld als die binnen 1 km ligt), de kenmerken en Bewaar. Plek en route komen samen.
- Fout bij bewaren: "Bewaren lukte niet. Je lus staat er nog." De knop blijft.
- Start hier op de kaart zet het startpunt alleen voor deze zoektocht en overschrijft Thuis niet meer (vraag 2). Bewaren gaat dan via Bewaar als plek.

### Route bewaren uit een buitenloop met spoor

In Training bekijken van een gedane loop of wandeling buiten met een gekoppeld horloge, onder de getallen, één rij Bewaar deze route. Alleen als de koppeling het spoor kan geven; anders is de rij er niet.

- Bij een tik haalt de app het spoor van die ene loop één keer op, met een grens van 15 seconden en de regel "Je spoor ophalen". Het wordt vereenvoudigd en gaat de route in; het ruwe spoor wordt losgelaten zoals nu.
- Daarna dezelfde keuze als in de Briefing: bij de plek waar hij begint, of Bewaar als plek.
- Zonder netwerk of te laat: "Het spoor kwam niet binnen. Probeer het later nog eens." Een loop zonder spoor (loopband, horloge zonder GPS): "Deze loop heeft geen spoor."

### Een plek voorgesteld in de Briefing

Bovenaan de Briefing staat de keuze waar je traint. Onder Buiten komt één regel Start bij, met `Chip`s: Waar je nu bent, Thuis, en als er een betere plek is die plek. De keuze volgt Startpunt van je lus. Geen extra tik voor wie niets wil.

De voorgestelde plek verschijnt alleen als alles klopt: de training vraagt hoogtemeters (heuveltraining of een doel van minstens 100 hoogtemeters) of is lang (vanaf 90 minuten); Plek voorstellen staat aan; de plek ligt binnen de ingestelde afstand, hemelsbreed van waar je lus nu begint; en een bewaarde route daar past duidelijk beter dan wat er bij je startpunt kan.

- Onder de chips één regel met het droge feit: "Heuveltop haalt 240 van je 250 hoogtemeters, hier 60. 14 km hemelsbreed." Bij lang: "Je route van 18 km bij Duinpad past precies. 9 km hemelsbreed."
- Tik je de plek, dan toont de kaart de bewaarde route meteen, zonder zoektocht, en de knop eronder stuurt die naar Garmin Connect. Het weer-vak schakelt naar die plek als hij verder dan 10 km weg ligt (vraag 5).
- Het is een keuze voor deze ene training, net als Loopband, en verandert de planning niet; daarom geen Akkoord.
- Een vierde chip Andere plek opent een blad met je plekken en onderaan Nieuwe plek.
- Laden: de chips Waar je nu bent en Thuis staan er meteen; de voorgestelde plek komt erbij zodra de plekken gelezen zijn, zonder dat de kaart verspringt (de regel heeft een vaste hoogte). Na 1 seconde lezen komt hij niet meer.
- Leeg of fout: geen voorstel en geen regel. De Briefing werkt zoals nu.

### Nieuwe plek, ook vooraf voor een plek waar je nog heen gaat

Vanuit Je plekken en vanuit Andere plek in de Briefing (drie tikken van Vandaag). Een blad, of vanuit Instellingen een scherm.

- Bovenaan een zoekveld "Plaatsnaam" met de bestaande zoekdienst, daaronder hoogstens acht treffers als rijen (naam, provincie, land). Bovenaan de lijst ook Gebruik waar ik nu ben.
- Een treffer kiezen opent de kaart rond die plaats met de regel "Tik waar je lus begint, bijvoorbeeld een parkeerplaats." De ring komt waar je tikt.
- Daaronder naam (de plaatsnaam als voorbeeld), kenmerken, en `PrimaryButton` Bewaar plek.
- Vanuit de Briefing gaat het meteen door: de plek is gekozen voor deze training en de lus wordt gezocht. Voor een training na morgen zoekt de Briefing na een tik op Zoek een lus, zoals besloten. Bewaar bij [plek] en Route naar Garmin Connect zetten hem klaar, zodat je ter plekke niets meer hoeft. Of dat vooraf naar Garmin Connect kan, zoekt Scout uit.
- Laden: "Zoeken naar Heuveltop" met een grens van 8 seconden. Leeg: "Geen plaats gevonden met die naam. Probeer een grotere plaats in de buurt." Fout: de bestaande regel zonder netwerk. Geen toestemming voor je plek: de bestaande regel, zoeken op naam werkt dan gewoon.

### Wat verdwijnt of samengaat

- Vast punt verdwijnt als woord; het is Thuis. De voet `RouteStartFooter` met Wis startpunt gaat naar de plek Thuis.
- In Startpunt van je lus worden de keuzes Waar je nu bent (advies), Thuis en Ongeveer.
- De uitleg achter de i bij de kaart (`MAP_HINT`) zegt niet meer dat Start hier je vaste punt wordt.

### Bewust niet

Geen vrij tekenen van een route, geen eigen tab, geen kaart op Vandaag, geen zoektocht bij het starten van de app, geen voorstel buiten de Briefing, geen automatisch rijden of reistijd (alleen hemelsbreed), geen nieuwe kleur of token. Een plek verandert nooit vanzelf je planning of je weerplaats.

## 3. Engine-functies (puur, in `src/engine/places.ts`)

- `placeNeed(template, target)`: uit de training en het doel van de lus wat er gevraagd wordt: hoogte (met het aantal hoogtemeters), lang (met de afstand), of niets.
- `rankSavedRoutes(routes, target, logs)`: de bewaarde routes van een plek, best passend bovenaan. Gebruikt `missScore` uit `routePlanner.ts`, zodat een bewaarde route en een nieuwe lus op dezelfde maat staan; bij gelijke stand de route die het vaakst gelopen is. Geeft per route een zin: "Past: 8,1 km en 240 hoogtemeters, je liep hem 3 keer."
- `suggestPlace(need, places, routes, start, maxKm)`: hoogstens één plek met zijn beste route, de afstand hemelsbreed en één zin waarom, of niets. Alleen als die route minstens 80 procent haalt van wat de training vraagt en het startpunt van nu daar ruim onder blijft.
- `nearestPlace(point, places, withinM)`: bij welke plek een route hoort (standaard 300 m), of geen.
- `routeRunDates(route, logs, planned)`: de dagen waarop hij gelopen is, afgeleid uit de logs.
- `simplifyTrack(points, maxPoints)` en `trackFacts(points)`: een spoor dun maken en afstand, hoogtemeters en lus of niet berekenen.
- `homeFromStartPoint(point, today)`: de plek Thuis uit een oud Vast punt, voor de migratie.
- `startChoices(setting, places, suggestion)`: de chips onder Start bij en welke gekozen is.

Allemaal zonder React, IndexedDB of netwerk, en twee keer dezelfde invoer geeft twee keer hetzelfde.

## 4. Instellingen

Alle vier in het scherm Je plekken, en in `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts` en `settingsHelp.ts`.

- Plek voorstellen: Aan (advies) of Uit. "Bij een heuveltraining of lange training stelt de Briefing een plek voor die beter past."
- Hoe ver: 10 km, 25 km (advies), 50 km, Geen grens. "Hemelsbreed van waar je lus nu begint; rijden kan langer zijn."
- Bewaarde route eerst: Als hij past (advies) of Altijd zoeken. "Past een bewaarde route bij de training, dan staat die bovenaan en zoekt de Briefing niet."
- Weer bij je plek: Aan (advies) of Uit. "Kies je in de Briefing een plek verder dan 10 km, dan toont het weer-vak het weer daar."

Startpunt van je lus blijft waar hij staat, met de keuze Thuis in plaats van Vast punt.

## 5. Bouwsporen

Na Briefing spoor 5 en 6. Voor elk spoor: `src/storage/planGolden.test.ts` beweegt niet, `sheetDrag.scan.test.ts` blijft groen, `npm run kaart:vergelijk` met elk verschil verklaard, Lookout op 360 en 390 px.

1. Opslag, migratie, export en import. Zwaarder model (Fable): opslag en een migratie die niet terug kan.
   - Bestanden: `src/models/place.ts` (nieuw), `src/storage/places.ts` (nieuw, twee meta-sleutels `places` en `savedRoutes`, lezen gooit nooit), `src/storage/migrationsPlaces.ts` (nieuw, opschonen bij import) en de export in `migrations.ts`, `migrationsSchema.ts` (twee optionele velden), de export en import, `storage/routeStart.ts` (leest Thuis), `engine/places.ts#homeFromStartPoint`.
   - Niet bewegen: schemaversie 2, oude back-ups, de waarde `exact`, `backupClean` voor `routeStartPoint`, de lus tot middernacht.
   - Einde: tests voor Vast punt wordt Thuis precies één keer, mislukt schrijven laat de oude sleutel staan, een oude back-up importeert gelijk en laat plekken staan, een kapotte route valt weg zonder de rest.
2. De engine. Opus.
   - Bestanden: `src/engine/places.ts` en test.
   - Niet bewegen: `routePlanner.ts` (alleen `missScore` hergebruiken).
   - Einde: tests per functie, ook gelijke stand, een route van A naar B, geen plekken.
3. Je plekken in Instellingen. Opus.
   - Bestanden: een nieuw scherm en een groepsblad in `src/components/settings/groups/`, `RouteStartFooter.tsx` (weg naar Thuis), `settingsChoices.ts` (Vast punt heet Thuis), de vier instellingenbestanden.
   - Niet bewegen: de gids Trainingsplekken, de plaats voor het weer.
   - Einde: Thuis openen, hernoemen, wissen met vraag; leeg, laden en fout gezien op 390 px.
4. Route bewaren in de Briefing. Opus.
   - Bestanden: `RoutePanel.tsx` (`ChosenLoop`), `TrainingBriefing.tsx`, `routeSheet.ts` (`MAP_HINT`), `storage/routeStart.ts#startFromMap` (Start hier alleen voor deze zoektocht).
   - Niet bewegen: de mint knop, hoe de lus gezocht wordt.
   - Einde: twee tikken van Vandaag tot een bewaarde route; Bewaar als plek maakt plek en route samen.
5. Route bewaren uit een horlogeloop. Opus, met een eigen besluit voor het spoor.
   - Bestanden: de adapter die streams ophaalt (alleen op een tik), Training bekijken, `engine/places.ts#simplifyTrack`.
   - Niet bewegen: `models/activityStreams.ts` (het spoor blijft buiten de opgeslagen reeksen), wat er bij de import van een loop gebeurt.
   - Einde: geen aanroep zonder tik, een loop zonder spoor toont geen rij, een route van hoogstens 800 punten.
6. Een plek voorstellen in de Briefing. Opus.
   - Bestanden: `engine/places.ts#suggestPlace` en `startChoices`, `TrainingBriefing.tsx`, het weer-vak.
   - Niet bewegen: de planning, Waar train je?, Vandaag.
   - Einde: bij een heuveltraining met een passende plek binnen 25 km één chip en één regel; bij een rustige duurloop niets.
7. Nieuwe plek met zoeken op plaatsnaam. Opus.
   - Bestanden: een blad Nieuwe plek, `integrations/openMeteo.ts#searchPlaces` hergebruikt, de chip Andere plek, Bewaar als plek in de gids.
   - Niet bewegen: `pages/Weather.tsx`.
   - Einde: van Week naar een training op zaterdag, Nieuwe plek, lus gevonden, bewaard, naar Garmin Connect.

## 6. Vragen voor de eigenaar

1. Mag de rij in Instellingen Je plekken heten? De gids met heuvels heet al Trainingsplekken. Advies: ja, en de gids krijgt per heuvel Bewaar als plek.
2. Nu wordt Start hier op de kaart je vaste punt. Mag dat voortaan alleen voor die ene zoektocht gelden, met Bewaar als plek als je hem wilt houden? Advies: ja, anders schuift Thuis weg zodra je elders zoekt.
3. Een loop van je horloge bewaart nu nooit het spoor. Mag de app bij jouw tik op Bewaar deze route het spoor van die ene loop ophalen en als route bewaren? Advies: ja, alleen op jouw tik.
4. Hoe ver mag een voorgestelde plek standaard liggen? Advies: 25 km hemelsbreed, instelbaar.
5. Kies je in de Briefing een plek verder weg, mag het weer-vak dan het weer daar tonen? Advies: ja, vanaf 10 km.
