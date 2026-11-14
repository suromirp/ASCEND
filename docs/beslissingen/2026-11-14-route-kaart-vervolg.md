# Route-kaart, vervolg: bijsturen, per stuk en Groter

Datum: 2026-11-14
Status: aangenomen

## Besluit

In het blad Route (bereikbaar via Groter in de Briefing en via Route voorstellen op Vandaag, Week en het trainingsscherm) komt onder de hoofdknop een blok Bijsturen met Andere kant op, Langer, Korter en, na een bijsturing, Zoals je training. Daaronder staat Per stuk: de gekozen lus in stukken met afstand en hoogtemeters; een tik op een stuk legt er een rand in inkt om op de kaart en geeft Vermijd dit stuk. Op de grote kaart staat een derde ronde knop Groter: de kaart op volle hoogte met een terugknop, en alleen daar mag de telefoon liggend. Hoogtelijnen zijn er nog niet.

- Andere kant op: alleen bij Avontuurlijk (Simpel gaat heen en terug over hetzelfde pad). Dezelfde punten achterstevoren, zonder nieuwe zoektocht; de hoogtemeters tellen opnieuw met `routeGeometry.ts#ascentOf`.
- Langer en Korter: een nieuwe zoektocht met een andere afstand, in stappen van 1 km (onder een training van 5 km een halve). Nooit onder 1 km (`MIN_LOOP_KM`); dan zoekt ASCEND niet en zegt één regel waarom. Langer gaat tot de helft erbij, bij een korte training tot 2 km erbij. De hoogtemeters van de training blijven het doel. Een lus die na het zoeken onder 1 km uitkomt telt als mislukt.
- Vermijd dit stuk: een cirkel om het midden van het stuk (een kwart van het stuk, tussen 60 en 200 m) die de routeplanner moet mijden: BRouter als `nogos`, Valhalla als `exclude_polygons`. Hoogstens drie stukken; een stuk vlak bij de start kan niet weg. Een lus die toch door de cirkel gaat telt niet (`routeAdjust.ts#crossesArea`, ook een recht stuk dwars erdoorheen).
- Lukt een bijsturing niet (geen netwerk, te laat, het enige pad, geen langere of kortere lus), dan blijft de lus zoals hij was en zegt één regel waarom (`settleAdjust`). De vorige lus staat er meteen weer: de laatste vier antwoorden blijven in het geheugen.
- Bijsturen geldt voor deze lus zolang het blad of de Briefing open is, en voor dit startpunt. Het plant niets, bewaart niets en verandert de training niet. Het blad en de Briefing delen de regie, dus een bijgestuurde lus in Groter is ook de lus in de Briefing.
- Per stuk: een kilometer tot 10 km, twee tot 20 km, daarboven tien stukken; een laatste stukje onder 30 procent van een stuk gaat bij het vorige. Afstand op 0,1 km (zoals de lus zelf, zonder ",0"), hoogtemeters op hele meters. De klim wordt met de hysterese van `elevation.ts#hysteresisLine` over de hele lus geteld en over de stukken verdeeld, zodat de stukken samen de klim van de hele lijn zijn. Een stuk zonder hoogte zegt "hoogte onbekend".
- Groter: een eigen laag over alles (geen blad: een kaart sleep je, dus niet wegvegen), door `useSheetClose` voor de terugknop van de telefoon. Draaien via `deviceShell.freeRotation`: in de Android-app een klein eigen deel (`OrientationPlugin.java`, `SCREEN_ORIENTATION_FULL_USER` en terug naar `PORTRAIT`), in een geïnstalleerde web-app `screen.orientation.lock('any')` en terug `lock('portrait')`, in een gewoon tabblad niets (dat draait toch al). Dicht is altijd weer rechtop, ook als de telefoon nog ligt; twee keer loslaten telt één keer. Draait de telefoon terug naar staand, dan rekent de kaart opnieuw en staat de lus weer in beeld (`routeMapView.ts#resize`).
- Offline: valt de kaart terug op het effen vlak omdat geen tegels laden, dan zegt één regel onder de kaart "Zonder netwerk laadt de kaart niet. Je ziet alleen de lus." (online maar geen bron: "De kaart laadt niet."). Bij Ondergrond Geen zwijgt hij.
- Van Warden: tijdens het bewaren van een getikt punt als Thuis staat er "Thuis wordt bewaard." (en tijdens Start hier "De lus wordt gezocht vanaf dit punt."), `routeMap.ts#mapStatusLine`.
- Geen nieuwe instelling: ASCEND kiest hier niets voor je; elke bijsturing is een tik.

## Na review (Warden, 14 november)

- De regie van de zoektochten staat nu puur in `engine/routeSearchState.ts` (useReducer in `useRouteSearch.ts`). Eerst zocht het blad ook voor een sleutel waarvan het antwoord al in het geheugen stond: na een mislukte bijsturing begon dan stil een nieuwe zoektocht voor de oude sleutel, die de bewaarde lus overschreef (offline: lus weg; time-out: een andere lus onder "De lus blijft zoals hij was"). Nu zoekt het blad alleen voor een sleutel zonder antwoord, ook niet opnieuw na een mislukt antwoord.
- Alleen gelukte antwoorden gaan het geheugen in: een tweede tik op Langer na een fout zoekt echt opnieuw. Een laat antwoord voor een sleutel die niet meer geldt telt niet.
- Een bijsturing die nog zoekt hoort bij één startpunt en één poging; is dat intussen anders, dan vervalt hij zonder regel en geldt bij dat startpunt weer wat ervoor gold.
- Groter staat buiten de delen van het blad en blijft open tijdens een nieuwe zoektocht, met één regel; liggend blijft de kaart van de inkeping en de ronde hoeken vandaan (`safe-area-inset-left` en `-right`).

## Na Pathfinder (14 november)

- De kaartknop in het blad heet Hele kaart (niet Groter: zo heet de knop in de Briefing die het blad opent). Hele kaart is om te kijken en een lus te kiezen; bijsturen doe je in het blad.
- Zoals je training heet Terug naar het voorstel: hij zet ook Andere kant op en vermeden stukken terug.
- Per stuk staat standaard dicht achter één tikregel ("Per stuk: 4 stukken"), zodat wat er gevonden is, Opnieuw zoeken en de bronnen niet ver naar beneden gaan. Dit is een bewuste uitzondering op "nergens een uitklap" van het blad Route.
- De uitleg achter de i over bijsturen is één zin: Bijsturen geldt alleen voor deze lus; lukt het niet, dan blijft de lus zoals hij was.

## Niet gedaan: hoogtelijnen

De tegels kunnen: Mapterhorn (`tiles.mapterhorn.com`, terrarium in webp, 512 px) antwoordt zonder sleutel met `access-control-allow-origin: *` (gemeten 14 november). Het pakket `maplibre-contour` (0.1.1) installeren werd in deze sessie door de rechten van de omgeving tegengehouden, dus zonder pakket geen hoogtelijnen; zelf hoogtelijnen uit tegels rekenen is te veel voor deze taak. Voor de volgende bouwer: pakket toevoegen (exacte versie, zoals `maplibre-gl`), een `raster-dem`-bron op Mapterhorn met maxzoom 12, de lijnen in een token, Mapterhorn erbij in de eerste vraag, de uitleg en de zoekregel (elke tegelhost staat daar), en een instelling Hoogtelijnen (aan op de grote kaart, uit op de stille kaart) in settingsIndex, settingsLayout, settingsSummary en een groepspagina. Een reliëfschaduw (`hillshade`) kan zonder pakket, maar is niet gevraagd.

## Reden

Backlog, Bouwrij "Route-kaart, vervolg" (eigenaar 11 november), plus het verzoek van Warden.

## Alternatieven

- Bijsturen door de lus zelf te knippen en te plakken: een lus moet over echte paden, dus de routeplanner beslist.
- Andere kant op bij Simpel: dezelfde lus, een knop die niets doet.
- Vermijden met een tik op de lijn op de kaart: botst met de tik die een lus kiest; de lijst Per stuk is ook de plek voor de getallen.
- Groter als blad: wegvegen botst met slepen op de kaart.

## Bron

`docs/backlog.md` (Route-kaart, vervolg), `docs/beslissingen/2026-11-11-alleen-staand.md`, `2026-11-12-route-blok.md`, `docs/onderzoek/Hoogtemeters met precisie.md`.

## Vervangt

Niets. Vult `2026-11-11-alleen-staand.md` aan: de app staat rechtop, behalve de vergrote kaart.

## Terugdraaien

Haal `'adjust'` uit `engine/routeSheet.ts#routeSheetParts` en `onBigger` uit `RoutePanel.tsx`; de regie in `useRouteSearch.ts` valt dan stil op `NO_ADJUST`. Voor het draaien: `registerPlugin(OrientationPlugin.class)` uit `MainActivity.java`.

## Niet gecontroleerd

Een echt toestel: draaien in de Android-app (het eigen deel is niet gebouwd of gestart), `screen.orientation.lock` in een geïnstalleerde web-app, en de antwoorden van BRouter en Valhalla op een echt stuk om te mijden (de vorm van `nogos` en `exclude_polygons` komt uit hun documentatie, getest met nagemaakte routeplanners).
