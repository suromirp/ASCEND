# Kaartbron voor Route voorstellen

Scout Kaartbron, 11 november 2026. Een keuze van bron en aanpak, geen sportwetenschap.

## Advies in drie zinnen

Bouw de kaart met MapLibre GL JS en de vectortegels van OpenFreeMap: geen sleutel, geen account, geen grens op kaartweergaven, een kant-en-klare donkere stijl die je met de tokens van ASCEND overschildert, en lijnen, stippen en tikken zijn in MapLibre gewone bouwstenen. Reserve: als OpenFreeMap niet binnen een paar seconden antwoordt, schakelt dezelfde kaart over op de rastertegels van OpenStreetMap, donker gemaakt met de rasterinstellingen van MapLibre; antwoordt ook die niet, dan staan de lijnen en je stip op een effen vlak in een token-kleur, zodat er nooit een leeg vak staat. Hoogtelijnen en schaduw van hellingen heeft geen sleutelvrije donkere bron kant-en-klaar; dat is een tweede stap met sleutelvrije hoogtetegels, niet voor vanavond.

## Waar dit op voortbouwt

`docs/onderzoek/Kaartje bij Route voorstellen.md` (10 november) heeft de gebruiksregels van de OSM-standaardtegels, OpenTopoMap, PDOK en de logregels van OpenFreeMap al uitgezocht; die herhaal ik niet, ik verwijs ernaar. Dat onderzoek koos toen voor een eigen tekening zonder tegels, uit voorzichtigheid (`docs/beslissingen/2026-11-10-kaartje-route-bron.md`). Dat is vervangen door `docs/beslissingen/2026-11-11-locatie-en-kaart.md`: je locatie mag op de kaart en naar de diensten; de enige harde grenzen zijn geen echte plek in de repo en geen API-sleutel. Wat ik nu opnieuw woog is dus niet privacy, maar gebruiksgemak, een donkere stijl, paden, kneedbaarheid en werken in de Android-app.

Zekerheid per bewering, op dezelfde schaal als het vorige onderzoek: zeker (eigen proef of de bron zelf), goed (officiële documentatie), waarschijnlijk (meerdere bronnen of een nette afleiding), onzeker (één melding of eigen aanname). Pagina's gelezen op 11 november 2026.

## De tegelbronnen zonder sleutel

**OpenFreeMap** (vectortegels, `tiles.openfreemap.org`). Geen registratie, geen sleutel, geen cookies en geen grens op het aantal kaartweergaven of aanvragen (goed, https://openfreemap.org/). Stijlen: Positron, Bright, Liberty, Dark, Fiord en 3D (goed, zelfde pagina). Het stijladres volgt het patroon `https://tiles.openfreemap.org/styles/liberty` (goed, https://openfreemap.org/quick_start/); `https://tiles.openfreemap.org/styles/dark` bestaat en is een geldige MapLibre-stijl met een achtergrond van bijna zwart, een laag `highway_path` voor paden en `track` (veldwegen) in de laag van kleine wegen (zeker, de stijl zelf opgehaald). Hoogtelijnen en reliëfschaduw zitten er niet in; de donkere stijl heeft alleen een grove schaduw van Natural Earth voor lage zoom (zeker, zelfde stijl). Naamsvermelding verplicht, MapLibre zet hem er zelf in: "© OpenMapTiles" en "Data from OpenStreetMap", de naam OpenFreeMap mag weg (goed, https://openfreemap.org/). Een eigen User-Agent wordt gevraagd van apps die tegels voor offline downloaden; downloaden voor offline mag tot 3.000 tegels of 50 MB (goed, https://openfreemap.org/tos/ en de quick start). Logregels: zonder IP-adres, zeven dagen (goed, https://openfreemap.org/privacy/, al in het vorige onderzoek). Geen garantie op beschikbaarheid (goed). Tegels mogen tot een dag gecachet worden, stijlen tot een uur (goed, FAQ in https://github.com/hyperknot/openfreemap).

Voor één gebruiker die het paneel een paar keer per week opent is dit ruim binnen alles wat de dienst toelaat (waarschijnlijk, afgeleid uit "geen grens").

**OpenStreetMap-standaardtegels** (raster, `tile.openstreetmap.org`). Gebruiksregels staan uitgebreid in het vorige onderzoek: duidelijke vermelding op de kaart, herkenbare User-Agent, geldige Referer, cachekoppen volgen, nooit vooraf ophalen of voor offline downloaden, zwaar gebruik kan zonder waarschuwing worden geblokkeerd (goed, https://operations.osmfoundation.org/policies/tiles/). Overal ter wereld, toont paden goed, maar licht en kleurig, geen hoogtelijnen, geen dubbele versie voor scherpe schermen. Goed als reserve, niet als hoofdbron voor een donkere app.

**OpenTopoMap** (raster). Hoogtelijnen en reliëfschaduw, mag in een app met vermelding, geen garantie, kleine vrijwilligersserver (goed, https://opentopomap.org/about; uit het vorige onderzoek). Licht van kleur en naar verluidt traag (onzeker). Donker maken met omkeren maakt van een topokaart een rommelig beeld (onzeker, eigen inschatting). Een optie als keuze "Topokaart" later, niet als standaard.

**Protomaps met een eigen PMTiles-bestand op GitHub Pages.** De gedachte is mooi: één bestand, geen dienst van derden. In de praktijk valt het af. GitHub weigert bestanden boven 100 MB in een repo en een Pages-site mag hoogstens 1 GB zijn (waarschijnlijk, de bekende grenzen van GitHub; niet opnieuw nagelezen). Een uitsnede met paden tot zoom 15 van alleen Nederland is al honderden megabytes (onzeker, schatting), en de eigenaar loopt ook in de Ardennen, de Alpen en op de GR5. Een PMTiles-bestand vraagt ook dat de host deelaanvragen (HTTP Range) goed afhandelt; de documentatie van Protomaps noemt een statisch PMTiles-bestand zonder randcache als mogelijkheid, maar noemt GitHub Pages niet (goed voor wat de pagina zegt, https://docs.protomaps.com/deploy/). De gehoste kaart van Protomaps vraagt een sleutel. Niet gekozen.

**VersaTiles** (vectortegels, `tiles.versatiles.org`). Geen sleutel, geen kosten, volgt gebruikers niet (goed, https://versatiles.org/). Maar het is uitdrukkelijk een demoserver: grens per IP-adres met een 429 als antwoord, geen garantie, stijlen en namen kunnen breken zonder aankondiging, en ze raden aan zelf te hosten (goed, https://docs.versatiles.org/guides/use_tiles_versatiles_org.html). Er zijn donkere varianten van hun stijlen (waarschijnlijk, uit een samenvatting van hun stijlpakket; niet zelf gezien). Een mogelijke tweede vectorbron, maar minder stabiel beloofd dan OpenFreeMap.

**PDOK BRT Achtergrondkaart.** Grijs thema past bij donker, geen sleutel, maar alleen Nederland (goed, vorig onderzoek). Valt af voor een kaart die ook in het buitenland moet werken.

**Afgevallen omdat er een sleutel of account nodig is.** Google Maps, Mapbox, MapTiler (zoals de opdracht al zei). CARTO, dat vroeger een sleutelvrije donkere rasterkaart had (`dark_all`), vraagt nu ook voor rastertegels een sleutel (waarschijnlijk, een ontwikkelaar meldt het en CARTO heeft een aanvraagpagina, https://www.carto.com/basemaps/apikey/ en https://docs.carto.com/faqs/carto-basemaps). Stadia Maps (met de donkere Alidade Smooth Dark) werkt zonder sleutel alleen na registratie van een domein bij een account (onzeker, niet nagelezen), dus ook niet.

Kort: de enige bron die tegelijk sleutelvrij, wereldwijd, stabiel beloofd en donker is, is OpenFreeMap.

## Hellingen en hoogtelijnen

Geen van de sleutelvrije vectorbronnen levert hoogtelijnen. Wel bestaan er sleutelvrije hoogtetegels: de Terrain Tiles op AWS (Terrarium-codering, `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`, open data, zonder account) (waarschijnlijk, https://registry.opendata.aws/terrain-tiles en meerdere voorbeelden), en Mapterhorn van Protomaps, ook zonder sleutel tot zoom 12 (onzeker, https://protomaps.com/blog/mapterhorn-terrain/). MapLibre kan daarmee zelf reliëfschaduw tekenen met een laag van het soort `hillshade`, en de plug-in `maplibre-contour` rekent er hoogtelijnen uit in de browser (waarschijnlijk, uit de zoekresultaten; de README niet nagelezen). Op een donkere kaart werkt een zachte schaduw meestal mooi (onzeker, smaak). Dit is een tweede stap; voor vanavond tonen de lijnen al hoe ver en waar, en de hoogtemeters staan al als getal in het paneel.

## De bibliotheek

**MapLibre GL JS** (nu 6.17.0, goed, https://data.jsdelivr.com/v1/packages/npm/maplibre-gl). Ongeveer 1,1 MB geminimaliseerd en bijna 300 KB gecomprimeerd (goed, bundlephobia, uit het vorige onderzoek). Versie 6 vraagt WebGL2 en is alleen nog ESM (goed, release-notities v6.0.0 via https://newreleases.io/project/github/maplibre/maplibre-gl-js/release/v6.0.0). Android-WebView op een gangbare telefoon van de laatste jaren heeft WebGL2 (waarschijnlijk). Wat de eigenaar vraagt zit er standaard in (goed, MapLibre API-documentatie): slepen en knijpen staan aan, draaien en kantelen zijn uit te zetten, `map.on('click', laag, ...)` geeft een tik op een lijn, `map.on('click', ...)` geeft de plek van een tik voor een startpunt, meerdere routes zijn één GeoJSON-bron met lijnlagen, en je stip is een cirkellaag of een `Marker`. Kleuren zijn gewone CSS-kleurtekst, dus je kunt ze bij het starten uit de tokens lezen. De quick start van OpenFreeMap geeft de regels voor Vite: `setWorkerUrl` met `maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url` en de CSS uit `maplibre-gl/dist/maplibre-gl.css` (goed, https://openfreemap.org/quick_start/).

React 19: MapLibre is geen React-pakket; je maakt de kaart in een `useEffect` op een `ref` en ruimt hem op met `map.remove()`. Dan is er geen afhankelijkheid van React-versies (waarschijnlijk, gangbaar patroon). Een omhulsel zoals `react-map-gl` is niet nodig.

**Leaflet** (1.9.4 stabiel, 2.0 nog in beta; goed, https://data.jsdelivr.com/v1/packages/npm/leaflet). Veel lichter, ongeveer 148 KB geminimaliseerd (goed, vorig onderzoek), werkt met rastertegels als gewone afbeeldingen, dus zonder WebGL en zonder CORS-vraag. Maar Leaflet heeft geen sleutelvrije donkere rasterbron meer om op te tekenen (CARTO vraagt nu een sleutel), en vectortegels van OpenFreeMap in Leaflet gaan via `@maplibre/maplibre-gl-leaflet`, dus dan laad je MapLibre er alsnog bij (goed, quick start van OpenFreeMap). Met Leaflet blijf je dus op lichte OSM-tegels met een CSS-filter, en dat filter draait op elke tegel bij elk slepen (onzeker, niet gemeten).

**Iets lichters** (eigen SVG met tegels als afbeelding, of een kleine tegelbibliotheek): kan, maar dan bouw je knijpen, slepen, traagheid en tikken zelf, en blijf je op lichte rastertegels. Niet kneedbaar genoeg voor wat de eigenaar vraagt.

Het gewicht van MapLibre is te dragen als je het alleen laadt wanneer het paneel opengaat (dynamische import), zodat de start van de app er niets van merkt (waarschijnlijk).

## CORS en de Android-app

ASCEND draait in Capacitor met `androidScheme: 'https'` en `hostname: 'localhost'` (zeker, `capacitor.config.ts`), dus de herkomst in de app is `https://localhost`, geen eigen schema. Een gewone https-herkomst gedraagt zich in de WebView zoals een website (waarschijnlijk; Chromium zegt dat alleen bij een eigen schema `*` of `null` nodig is, https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/cors-and-webview-api.md).

MapLibre haalt stijl, tegels, lettertypen en pictogrammen op met `fetch`, dus de server moet CORS toestaan. OpenFreeMap wordt door duizenden sites op hun eigen domein met MapLibre gebruikt, wat alleen werkt als de server een open `Access-Control-Allow-Origin` stuurt (waarschijnlijk, afgeleid; de kop zelf heb ik niet kunnen zien, er was geen opdrachtregel beschikbaar). Dan werkt hij ook voor `https://localhost` en voor de PWA op GitHub Pages. Hetzelfde geldt voor de OSM-rastertegels als MapLibre ze ophaalt (waarschijnlijk). Leaflet zou rastertegels als `<img>` laden en heeft geen CORS nodig (zeker, zo werken afbeeldingen).

Er is geen CSP in de app (zeker, vorig onderzoek), dus niets aan te passen. Komt er ooit een CSP, dan horen `tiles.openfreemap.org` en `tile.openstreetmap.org` in `connect-src` en `img-src`, en `worker-src blob:` of `'self'` voor de worker van MapLibre (onzeker, niet in de MapLibre-documentatie nagelezen).

## Wat de bouwer moet weten

Naamsvermelding. Laat de vermelding van MapLibre staan en zichtbaar op de kaart (`attributionControl` niet compact), anders moet je zelf "© OpenMapTiles" en "© OpenStreetMap contributors" in de hoek zetten. Bij de OSM-reserve hoort "© OpenStreetMap contributors" erin (goed, beide bronnen hierboven). De bestaande regel "Kaartgegevens van OpenStreetMap" onder de lussen mag blijven.

Donker met tokens. Begin van `styles/dark` (of `positron` als die makkelijker te kleuren is) en schilder bij het laden de grote lagen over met `setPaintProperty`, met kleuren die je via `getComputedStyle(document.documentElement).getPropertyValue('--color-...')` uit `src/index.css` leest. Dan staat er geen hex in de code. Paden (`highway_path`) en veldwegen moeten zichtbaar blijven, want daar loop je. Dempen van labels en gebouwen maakt de routes leesbaar. Eén mint accent: de gekozen route in mint, de andere routes in een gedempt inkt-token en gestreept, je stip in ijsblauw (status) met een rand.

Tikken op een route. Een lijn van 3 px is geen tikdoel van 44 px. Leg onder elke route een onzichtbare brede lijn (ongeveer 24 tot 32 px) als tiklaag; tik op een andere route maakt die de gekozen.

Gebaren. Zet draaien en kantelen uit (`dragRotate: false`, `touchPitch: false`, draaien uit bij knijpen); dat houdt het simpel. De kaart staat in een blad met `useSheetClose`; zorg dat slepen op de kaart het blad niet sluit of de pagina niet scrolt (aanraking op de kaart niet laten doorbubbelen). Een knop "Naar mijn plek" en "Alles in beeld" (`fitBounds` op alle routes) maakt het kneedbaar zonder te verdwalen.

Wachten en reserve. Geef de kaart een grens in tijd: komt de stijl van OpenFreeMap niet binnen ongeveer 6 seconden of geeft MapLibre een fout op die bron, wissel dan naar een stijl met de OSM-rastertegels. Een rasterlaag in MapLibre kun je donker maken met `raster-saturation` op -1 en `raster-brightness-min` hoger dan `raster-brightness-max`, wat de helderheid omkeert (onzeker, bekende truc, niet zelf getest). Werkt ook die niet, dan blijft een achtergrondlaag in een token-kleur met de routes en de stip erop staan. Nooit een lus van herhaalpogingen.

Cache en vooraf ophalen. Gebruik de HTTP-cache van de browser en de eigen geheugencache van MapLibre. Zet geen tegels in de service worker (`runtimeCaching` in `vite.config.ts` laten zoals hij is) en haal nooit tegels vooraf op of voor offline; dat verbieden OSM en het is bij OpenFreeMap aan grenzen gebonden (goed, beide bronnen). Let op: `globPatterns` in de workbox-instelling neemt alle `.js` mee, dus het losse stuk met MapLibre en de worker komen in de precache van de PWA, ongeveer 1 MB extra bij installeren (waarschijnlijk). Dat is te verdedigen (de kaart staat dan sneller), of je zet ze in `globIgnores`; een keuze voor de bouwer.

Geen sleutel. OpenFreeMap en OSM vragen er geen; nergens een `key=` of token in de code.

Instelling. Volgens de werkafspraken hoort er een instelling bij, bijvoorbeeld Ondergrond van de kaart: Donker (OpenFreeMap, advies), Licht (OSM) of Geen (alleen de lijnen). Dat laatste is ook de terugval.

Testdata. Alleen nagemaakte punten op een openbare plek, nooit de echte plek van de eigenaar.

## Wat het onderzoek zegt

OpenFreeMap is de enige tegelbron die zonder sleutel en account werkt, overal ter wereld, zonder grens op kaartweergaven en met een kant-en-klare donkere stijl die paden en veldwegen toont. Hij vraagt MapLibre GL JS, dat zwaar is (bijna 300 KB gecomprimeerd, WebGL2), maar knijpen, slepen, tikken, meerdere routes en een stip voor je locatie standaard kan. De OSM-standaardtegels zijn een betrouwbare reserve maar licht van kleur; OpenTopoMap heeft hoogtelijnen maar is licht en traag; Protomaps op GitHub Pages loopt vast op bestandsgrootte en dekking; CARTO en Stadia vragen nu een sleutel of account.

## Wat het betekent voor de app

Een voorstel, geen besluit: MapLibre GL JS 6 met de stijl Dark van OpenFreeMap, overgeschilderd met de tokens, alleen geladen als het paneel opengaat; de routes als lijnen met een brede tiklaag, je locatie als ijsblauwe stip, tikken op de kaart voor een startpunt. Reserve OSM-rastertegels in dezelfde kaart, en daarna een effen vlak met alleen de lijnen. Hoogtelijnen en reliëfschaduw later uit sleutelvrije hoogtetegels.

## Wat nog onzeker is

- De CORS-kop van OpenFreeMap en OSM heb ik niet zelf gezien; de eerste proef in de PWA en in de Android-app moet dat bevestigen.
- Of MapLibre 6 met WebGL2 soepel draait in de WebView op de telefoon van de eigenaar met vertraagde processor; Lookout moet dat meten.
- Hoe goed de donkere stijl van OpenFreeMap paden toont na het overschilderen; een ontwerpvraag voor Cartographer.
- De omkeertruc voor donkere rastertegels in MapLibre is niet getest.
- Of de OSMF de Referer `https://localhost` uit de Android-app accepteert.
- De bestandsgrootte van een PMTiles-uitsnede heb ik geschat, niet gemeten; de grenzen van GitHub Pages niet opnieuw nagelezen.
- Hoogtetegels van AWS en Mapterhorn en de plug-in `maplibre-contour` zijn niet uitgeprobeerd.
