# Wind en lus: begin tegen de wind in

Datum: 2026-11-22
Status: aangenomen

## Besluit

Bij een Avontuurlijke lus geeft de app de draairichting zo dat je tegen de wind in begint en hem op de terugweg mee hebt. Het is dezelfde lus achterstevoren of niet (`engine/routeAdjust.ts#reverseProposal`, nul aanroepen); de afstand blijft.

- **De wind:** de windrichting en snelheid van het uur waarop je de training meestal begint (`engine/weather.ts#usualStartHour`), of van nu bij een wandeling die je zelf plant. Ze komen uit de voorspelling die de app al ophaalt. Het veld `wind_direction_10m` staat daarvoor in hetzelfde verzoek aan Open-Meteo (`WeatherHour.windDirDeg`, optioneel, de voorspelling is een cache en zit niet in een back-up). Er gaat niets nieuws de deur uit: geen nieuwe bron, geen nieuw verzoek, dezelfde afgeronde plek.
- **Niets doen:** is er geen wind bekend (geen voorspelling, een oude voorspelling zonder richting, een uur dat er niet in staat) of is de wind zwakker dan 12 km/u (ongeveer 3 Beaufort), dan blijft de lus zoals hij was en staat er geen regel. Simpel gaat heen en terug over hetzelfde pad en heeft geen draairichting.
- **De maat:** de gemiddelde hoek tussen je looprichting en de wind over het eerste derde van de lus (naar afstand); de richting met het hoogste getal wint, bij gelijk blijft de lus zoals hij was. Een derde en geen helft: bij een rondje eindigt de eerste helft in beide richtingen op hetzelfde verste punt, dus de verplaatsing tegen de wind is gelijk en de helft kan nooit kiezen. Het begin en het eind verschillen wel (`engine/routeWind.ts#windEnds`).
- **De regel:** één regel onder de knop Andere lus, over de lus zoals hij nu staat. "Je begint tegen de wind in (zuidwest, 25 km/u) en hebt hem op de terugweg mee." Ligt het eerste of laatste derde niet duidelijk tegen of mee (grens 0,3), dan laat de regel dat deel weg; staat de wind dwars, dan zegt hij dat. Kies je Andersom of Een andere kant op onder Bijsturen, dan zegt de regel eerlijk "Je begint met de wind mee (...) en loopt de terugweg ertegenin."
- **Een nieuwe lus** uit Andere lus (een andere kant, een richting, zonder heen en terug) wordt op dezelfde manier gedraaid.
- **Instelbaar:** Wind bepaalt de richting, standaard aan, in Vandaag en meldingen onder Weer en kleding (`routeWind`, optioneel veld, geen migratie; afwezig is aan).

## Reden

De eigenaar zei bij het advies voor Andere lus dat de windrichting top was, en gaf akkoord op het idee dat de wind de richting bepaalt. Tegen de wind in beginnen met verse benen en hem terug mee hebben is wat een loper zelf zou kiezen.

## Alternatieven

- De eerste helft als maat: wiskundig een gelijkspel bij elk rondje, dus de lus zou nooit draaien. Daarom het eerste derde.
- Een stille keuze zonder regel: de lus lijkt dan willekeurig om te draaien. De regel zegt wat er gebeurde, ook bij Andersom.
- Een nieuw weerverzoek per lus of de windrichting op het uur van de zoektocht: extra aanroepen voor niets; de voorspelling die er is volstaat.
- De wind van de gekozen plek: de voorspelling hoort bij de plek waar je woont, en wind verschilt over een paar kilometer weinig. Een eigen verzoek per plek komt als dat nodig blijkt.

## Bron

Het verzoek van de eigenaar (22 november, I-114), besluiten `2026-11-22-andere-lus.md`, `2026-11-09-routeplanner.md` en `2026-11-11-route-verfijnen.md`.

## Vervangt

Niets. Het besluit Andere lus blijft; Andersom werkt zoals daar.

## Terugdraaien

De instelling Wind bepaalt de richting uitzetten, of `orientByWind` en `windLine` uit `useRouteSearch.ts` halen; `routeWind.ts` en `windDirDeg` zijn dan ongebruikt.
