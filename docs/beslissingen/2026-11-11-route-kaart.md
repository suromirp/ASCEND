# Een echte kaart in Route voorstellen: MapLibre met OpenFreeMap, terugval OSM en effen vlak

Datum: 2026-11-11
Status: aangenomen

## Besluit

Het paneel Route voorstellen krijgt een kaart met MapLibre GL JS 6.17.0 op de stijl Dark van OpenFreeMap, overgeschilderd met de tokens. Op de kaart staan alle voorgestelde lussen (de gekozen in mint, de andere gedempt en gestreept), het startpunt als ijsblauwe ring en je plek als ijsblauwe stip. Tik op een lus kiest hem; tik op de kaart zet een ring neer en de knop Start hier maakt dat punt je startpunt en zoekt opnieuw; Gebruik waar ik nu ben doet hetzelfde vanaf je plek. Een nieuwe instelling Ondergrond van de kaart (Donker, advies; Licht; Geen) vervangt het nooit gebouwde Kaartje bij de lussen.

## Eigen keuzes van de bouwer

- Startpunt kiezen: een gewone tik plus een duidelijke knop Start hier, geen lange tik. Een lange tik ontdek je niet, botst op een trage telefoon met slepen, en een tik op de verkeerde plek zoekt dan meteen. Nu zie je eerst de ring en beslis je zelf. Een tik op een lus kiest de lus en zet geen ring; de onzichtbare tiklaag onder elke lus is 28 px breed.
- Een startpunt van de kaart wordt je Precies-startpunt (`storage/routeStart.ts#startFromMap`): Start hier en Gebruik waar ik nu ben bewaren het punt als `routeStartPoint`, net als in de instelling, en zetten Startpunt van je lus op Precies. De eigenaar wil gemak (antwoord via de coördinator, 11 november); zo klopt ook de regel van Ongeveer weer. Gebruik waar ik nu ben loopt via `locateStartHere`: dezelfde toestemmingsvraag en grens (`MAX_START_ACCURACY_M`), en een te grove plek geeft "ASCEND krijgt je precieze plek niet." Lukt het bewaren van de keuze niet, dan geldt het punt alleen in dit paneel.
- Je plek op de kaart (de stip): alleen meteen als de browser al weet dat het mag (`permissions.query`), anders pas na een tik op Naar mijn plek. Voor de stip is een grove plek genoeg, zonder de vraag om je precieze plek. De stip wordt niet bewaard.
- Start hier is gedempt (tone dim): de hoofdknop van het paneel blijft die van de gekozen lus. De uitleg zegt "de doorgetrokken lijn is de gekozen lus", wat ook op Licht klopt.
- De kaart is ongeveer vierkant (`aspect-ratio: 1`), hoogstens 58 procent van de schermhoogte, zodat de knoppen eronder op 360 px in beeld blijven. Een knop Groter (kaart op volle hoogte) is niet gebouwd: dat vraagt een eigen blad met zijn eigen terugknop, en dat is geen kleine stap.
- De ronde knoppen Naar mijn plek en Alles in beeld op de kaart zijn een uitzondering op de primitives in `ui.tsx`: een rond pictogram van 44 bij 44 met aria-label en titel, alleen op de kaart. Het icoon van Alles in beeld is een lus binnen vier hoeken, niet de hoeken van volledig scherm.
- De gekozen lus bepaalt welk blok onder de kaart de hoofdknop heeft; de volgorde van de blokken blijft die van Welke lus eerst.
- Volgorde van de ondergrond: de kaart begint altijd op het effen vlak (nooit een leeg vak) en zet dan OpenFreeMap erop. Komt er binnen 6 seconden geen tegel of geeft de bron een fout, dan de rastertegels van OpenStreetMap (donker: grijs, omgekeerd en half doorzichtig op `--color-bg`), en daarna weer het effen vlak. Alleen vooruit, nooit een herhaling. Na de eerste tegel laat een losse tegelfout de kaart staan. Zonder netwerk en bij Geen meteen het effen vlak.
- Licht gebruikt de stijl Positron van OpenFreeMap zonder overschilderen, met de varianten voor licht (`--color-action-on-light` en verwanten) voor de lijnen. Het effen vlak is altijd donker.
- Het stijlbestand van OpenFreeMap haalt ASCEND zelf op (binnen dezelfde 6 seconden, met een AbortController) en geeft het als object aan MapLibre. Een adres aan `setStyle` haalt de oude stijl meteen weg, en dan stonden de lussen en de ring even nergens. Overschilderen gebeurt voordat MapLibre tekent, per laag op naam en soort; een laag die OpenFreeMap later toevoegt blijft ongemoeid. Het bospatroon valt weg (het vraagt een plaatje) en kaartlabels van een vaste maat onder 12 px gaan naar 12 px.
- Naamsvermelding staat als eigen regel in de hoek van de kaart in de tokens, als link naar de licentie van OpenStreetMap, niet de knop van MapLibre (wit en inklapbaar): "© OpenMapTiles © OpenStreetMap contributors" bij OpenFreeMap, "© OpenStreetMap contributors" bij het raster, niets bij het effen vlak.
- Geen WebGL2, of MapLibre kan geen kaart maken: een regel "Deze telefoon kan de kaart niet tekenen.", met "De lussen staan hieronder." alleen als er lussen zijn. Laadt het losse stuk niet binnen 15 seconden of zonder netwerk: "De kaart kon niet laden." Geen knop om het nog eens te proberen.
- `globIgnores`: de stukken `assets/maplibre-gl-*` (code, worker en stijl, samen ruim 1,6 MB) staan niet in de precache. Zonder netwerk is er ook geen lus, dus een kaart offline heeft weinig waarde, en zo betaalt niemand die het paneel nooit opent bij elke update 1,6 MB. In de Android-app zit alles in de bundel. Gevolg: net na een update kan een oude precache-index de nieuwe stukken nog niet kennen; zonder netwerk zie je dan tijdelijk "De kaart kon niet laden". Tegels komen nooit in de service worker en worden nooit vooraf opgehaald; alleen de gewone cache van de browser.
- De worker komt uit de eigen build (`maplibre-gl-worker.mjs?worker&url` en `setWorkerUrl`), niet van een CDN.
- Beweging: de camera beweegt alleen in Vol, 300 ms; in Rustig en Uit springt hij meteen naar de eindstand, en het vervagen van tegels staat dan ook uit.
- Gebaren: draaien en kantelen uit (`dragRotate`, `touchPitch`, `pitchWithRotate`, `rollEnabled` uit, `maxPitch` 0, draaien bij knijpen en met het toetsenbord uit). Het kaartvak heeft `data-no-sheet-drag`, `touch-action: none` en `overscroll-behavior: contain`: slepen of knijpen sluit het blad niet en scrollt de pagina niet.

## Reden

De eigenaar wil "een duidelijke kaart waar ik op zie waar ik nu ben, wat mijn route is en zelfs wat de optionele andere routes zijn", en kiezen vanaf waar. Scout raadde MapLibre met OpenFreeMap aan: sleutelvrij, wereldwijd, een donkere stijl met paden (`docs/onderzoek/Kaartbron voor Route voorstellen.md`). Bij het bouwen zelf nagegaan: OpenFreeMap en `tile.openstreetmap.org` sturen `access-control-allow-origin: *`, dus ze werken vanuit de PWA en vanuit `https://localhost` in de app.

## Alternatieven

Een eigen SVG zonder tegels (`2026-11-10-kaartje-route-bron.md`): geen straten, dus je ziet niet waar je loopt. Leaflet met lichte OSM-tegels en een filter: geen sleutelvrije donkere bron, en een filter op elke tegel bij elk slepen. Een lange tik voor het startpunt: zie boven. MapLibre in de precache: zie boven.

## Bron

Opdracht van de coördinator (11 november), `docs/onderzoek/Kaartbron voor Route voorstellen.md`, `docs/onderzoek/Kaartje bij Route voorstellen.md`, `docs/beslissingen/2026-11-11-locatie-en-kaart.md`.

## Vervangt

De instelling Kaartje bij de lussen uit `2026-11-10-kaartje-route-bron.md`, die nooit gebouwd is.

## Terugdraaien

Ondergrond van de kaart op Geen haalt geen tegels meer op. Helemaal weg: `RouteMap.tsx`, `routeMapView.ts`, `engine/routeMap.ts` en `integrations/mapLibre.ts` verwijderen, de regel met `<RouteMap` en de staat `mapStart` en `chosen` uit `RoutePanel.tsx` halen, `maplibre-gl` uit `package.json`, en de rij `route-kaart` en het veld `routeMapBase` uit de instellingen (een oude waarde in een back-up valt dan weg bij het opschonen). Er wordt geen route bewaard; een punt van de kaart staat als gewoon Precies-startpunt op het toestel en is te wissen in de instelling.
