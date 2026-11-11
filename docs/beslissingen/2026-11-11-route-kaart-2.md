# Route-kaart 2: de lus begint waar je nu bent, alle lussen herkenbaar, en zichtbaar zoeken

Datum: 2026-11-11
Status: aangenomen

## Besluit

Startpunt van je lus krijgt een derde keuze, Waar je nu bent, en die is de nieuwe standaard voor wie nooit zelf koos. Precies heet voortaan Vast punt (je deur); Ongeveer blijft. De lus die niet gekozen is, staat op de kaart als een lichte gestreepte lijn op een donkere rand, iets naast de gekozen lus, en een regel boven de kaart zegt hoeveel lussen er zijn en welke welke is. Zolang er gezocht wordt, staat er "Lussen zoeken…" met de stappen op de plek van de kaart en de blokken.

## Wat er gemeten is bij de kaart (b)

Het vermoeden was dat de kaart alleen fit als er nog maar een startpunt is. In Chromium (390 px, processor 4 keer vertraagd, nagemaakte lussen bij een openbaar punt, echte tegels van OpenFreeMap) met tijdelijke meetregels in `routeMapView.ts`:

- fit bij het maken van de kaart, met alleen het startpunt en de stip;
- fit na de eerste tegel (`ready`), nog zonder lussen;
- de lussen kwamen 5,5 s later binnen, en meteen daarna kwam een fit met beide lussen; het vak van de kaart (52,0866 tot 52,1204 noord) bevatte de hele niet-gekozen lus (tot 52,1170).

Het vermoeden klopte hier dus niet: de kaart fitte wel opnieuw. Wat wel klopte met de schermafdruk van de eigenaar: de gestreepte lus was gedempt grijs (`--color-ink-dim`), 3 px, en liep op het eerste stuk precies onder de gekozen lus. Je zag alleen het stuk dat eruit stak, en dat leek op een weg. Op een trage telefoon kan de kaart ook nog bewegen terwijl de lussen binnenkomen. Daarom nu allebei: de kaart komt pas na het zoeken (dan heeft hij bij het maken alle lussen en fit hij meteen), en de andere lus is duidelijk anders.

## Eigen keuzes van de bouwer

- Waar je nu bent vraagt per zoektocht (per poging; ook Opnieuw zoeken) één keer de plek via `locateStartHere` met `persist: false`: dezelfde grens van 50 m, dezelfde toestemmingsvraag, maar het vaste punt blijft zoals het is. Lukt het niet, dan je vaste punt als dat er is (de reden en dan "De lus begint bij je vaste punt."), anders Ongeveer met de regel die er al was (`engine/routeStart.ts#hereStart`, `hereStartLine`).
- Heuvels en paden bij Waar je nu bent zoekt OpenStreetMap op drie decimalen (ongeveer 100 m, `roundHere`), niet op vier: anders is elke zoektocht een nieuwe vraag aan Overpass en groeit de cache bij elke stap die je zet. De routeplanner krijgt wel de precieze plek. Wis startpunt wist ook deze plekken (zelfde vorm van sleutel).
- In de opslag heet Vast punt nog `exact`: geen migratie, oude back-ups blijven gelijk.
- Een back-up met `routeStart: 'exact'` blijft Vast punt. Eerder werd dat bij een import Ongeveer, omdat er zonder vraag een punt de deur uit zou gaan. Het punt zit nooit in de back-up; staat er op dit toestel geen punt, dan vraagt het paneel eerst om een punt. Volgt uit `2026-11-11-locatie-en-kaart.md` en uit "wie zelf koos, houdt dat". Een onbekende waarde valt weg en dan geldt Waar je nu bent; zonder veld ook.
- Op de kaart staat Gebruik waar ik nu ben alleen als de keuze niet Waar je nu bent is: daar begint de lus al bij je plek, en de knop zou de keuze op Vast punt zetten.
- De andere lus: een eigen token `--color-route-other` (licht, op een donkere rand in `--color-bg`; op de lichte kaart `--color-route-other-on-light`), 3,5 px, streepjes 2 op 1,25, en 5 px naast de lijn (`line-offset`), zodat hij ook te zien is waar hij met de gekozen lus samenloopt. Een heen-en-terug toont daardoor twee evenwijdige streepjeslijnen; dat klopt met heen en terug. Alleen de gekozen lus is mint.
- De regel boven de kaart en de blokken gebruiken dezelfde woorden: "2 lussen: Avontuurlijk (doorgetrokken) en Simpel (gestreept). Tik er een om te kiezen." en boven elk blok "Avontuurlijk · doorgetrokken". Bij één lus geen regel en geen woord erbij. De niet-gekozen lus heeft in zijn blok een knop Op de kaart kiezen (gedempt).
- De oude uitleg "De doorgetrokken lijn is de gekozen lus…" onder de kaart is weg; die zegt de regel erboven nu.
- Fit laat rechts 60 px vrij in plaats van 36, voor de kolom met de twee ronde knoppen.
- Lussen zoeken: een vlak zo groot als de kaart, met een balk in ijsblauw (status, geen tweede mint) die per stap één keer 300 ms verder schuift (in Rustig en Uit meteen), de stappen Je plek bepalen, Heuvels en paden zoeken en Lussen berekenen, en de grens in tijd uit de constanten. Een balk die over de hele halve minuut loopt is niet gekozen: beweging duurt 150 tot 400 ms. De stappen komen uit `findRoutes` (`onStep`).
- De code van MapLibre laadt al tijdens het zoeken, zodat de kaart er meteen is als de lussen er zijn.
- Sluiten tijdens het zoeken: het blad geeft `closing` door, en het zoeken stopt bij de tik, niet pas na de animatie. In de doorloop ging er toch nog één aanroep naar BRouter de deur uit na de tik: de poort (`routing.ts#createGate`) keek alleen voor de seconde ertussen of er gestopt was. Hij kijkt nu ook na die seconde (test in `routing.test.ts`). Daarna: nul aanroepen na sluiten.

## Reden

De eigenaar, 11 november, op zijn telefoon: de lus begon niet bij zijn plek (Ongeveer), hij zag niet dat er twee lussen waren, en hij zag niet dat er gezocht werd.

## Alternatieven

- Waar je nu bent laten bewaren als vast punt: dan schuift je deur weg zodra je ergens anders zoekt.
- De kaart laten staan tijdens het zoeken met een laag erover: dan moet de fit na het binnenkomen toch kloppen, en zie je een kaart zonder lussen. De kaart pas na het zoeken is eenvoudiger en fit altijd.
- Een andere kleur dan licht voor de andere lus (salie, ijsblauw): ijsblauw is status en salie is een soort of fase.

## Niet gecontroleerd

Een echt toestel: de Android-vraag om de fijne plek bij elke zoektocht (als de toestemming er al is komt er geen venster), en hoe de kaart op een trage telefoon fit. In Chromium met een nagemaakte plek en nagemaakte lussen.

## Bron

Melding van de eigenaar via de coördinator, 11 november; `2026-11-11-route-kaart.md`, `2026-11-11-locatie-en-kaart.md`, `2026-11-09-startpunt-lus.md`.

## Vervangt

Uit `2026-11-09-startpunt-lus.md`: Ongeveer als standaard, en dat een import Precies nooit aanzet. De rest blijft staan.

## Terugdraaien

Startpunt van je lus op Ongeveer of Vast punt zetten. Helemaal terug: `resolveRouteStart` weer `approx` als standaard geven, de keuze `here` uit `settingsChoices` halen (een opgeslagen `here` valt dan bij een import weg en wordt de standaard), en in `RoutePanel.tsx` de kaart weer tijdens het zoeken tonen.
