# Kaartje bij Route voorstellen

Scout Kaartje, 10 november 2026 (bouwmoment). Een keuze van bron en aanpak, geen sportwetenschap. Bouwt voort op `docs/onderzoek/Routeplanner voor een training.md` (bronnen voor de route, naamsvermelding van OpenStreetMap in deel 5), `docs/beslissingen/2026-11-09-routeplanner.md` (een eigen kaart stond daar als fase 4), `docs/beslissingen/2026-11-09-startpunt-lus.md` (Ongeveer en Precies) en `docs/beslissingen/2026-11-10-route-naar-garmin-connect.md`. In `docs/onderzoek/` stond nog niets over kaarttegels; `docs/onderzoek/Run in detail.md` raadde eerder af een gelopen spoor te bewaren voor een kaart, omdat een spoor laat zien waar iemand woont.

Zekerheid staat bij elke bewering: zeker (eigen proef of primaire bron), goed (documentatie of officiële pagina), waarschijnlijk (meerdere bronnen of een nette afleiding), onzeker (één melding of eigen aanname). Alle webpagina's zijn gelezen op 10 november 2026.

## De vraag

Het paneel Route voorstellen (`src/components/RoutePanel.tsx`) toont twee lussen, Simpel en Avontuurlijk, elk met afstand, hoogtemeters en de knoppen Naar Garmin Connect en GPX downloaden. De eigenaar wil een kaartje met beide lussen en het startpunt, om ze naast elkaar te zien voor hij er een naar Garmin Connect stuurt. Later wil hij een startpunt kiezen door op de kaart te tikken, de huidige locatie gebruiken en een lus bijsturen. Dat ontwerp ik niet, maar de keuze nu mag het niet in de weg zitten.

## Wat er nu al naar buiten gaat

Dit is de nulmeting; een kaartje voegt hier iets aan toe of niet.

- Overpass (OpenStreetMap) krijgt de plek afgerond op twee decimalen, ongeveer 1,1 km noord-zuid en 0,7 km oost-west in Nederland (zeker, `docs/beslissingen/2026-11-08-heuvels-osm.md` en de code in `engine/routeStart.ts`).
- BRouter, en anders Valhalla van FOSSGIS, krijgt alle tussenpunten van de lus en geeft de hele lijn terug. Bij Ongeveer begint die lijn bij het pad dat het dichtst bij de afgeronde plek ligt; bij Precies is het eerste punt het bewaarde startpunt met vijf decimalen, ongeveer een meter (zeker, `docs/beslissingen/2026-11-09-startpunt-lus.md`). De routeplanner kent de lus dus al helemaal.
- Elke aanroep vanuit de PWA draagt het IP-adres en de herkomst van de pagina. Op GitHub Pages staat in die herkomst de naam van het account als subdomein (waarschijnlijk, afgeleid uit hoe browsers Origin en Referer meesturen). Dat geldt al voor de bestaande aanroepen; een tegelserver zou het ook zien.

In gewone woorden: wie de lijn tekent uit wat er al in het geheugen staat, stuurt niets nieuws de deur uit. Wie tegels ophaalt, vertelt een nieuwe partij in welk gebied van een paar kilometer de lus ligt.

## Hoeveel verraden tegels

Een tegel is 256 bij 256 pixels. Aan de evenaar is een tegel op zoomniveau 13 ongeveer 4,9 km breed, op 14 ongeveer 2,4 km en op 15 ongeveer 1,2 km; op een andere breedte vermenigvuldig je met de cosinus van de breedtegraad (goed, https://wiki.openstreetmap.org/wiki/Zoom_levels). Rond 52 graden noord is dat ongeveer 0,62, dus een tegel op 13 is ongeveer 3,0 km breed, op 14 ongeveer 1,5 km en op 15 ongeveer 750 m (afgeleid).

Een lus van 8 km beslaat meestal een gebied van zo'n 2,5 tot 3 km. Op een kaartje van ongeveer 300 pixels breed past dat op zoomniveau 13 (ongeveer 12 m per pixel bij 52 graden), met vier tot zes tegels (afgeleid). Een telefoon met een scherm van drie keer de dichtheid wil scherpere tegels; de standaardtegels van OpenStreetMap hebben geen dubbele versie, dus wie scherp wil vraagt een niveau dieper en dan zijn het vier keer zoveel tegels van 1,5 km (waarschijnlijk). Bij een korte lus van Simpel kan het kaartje ook op 14 of 15 uitkomen.

Wat dat betekent: de tegelserver ziet bij elk openen een rechthoek van ongeveer 3 bij 6 km tot 1,5 bij 3 km waarin de lus ligt. Dat is grover dan de afgeronde plek die Overpass al krijgt, maar het gaat naar een partij die nu niets van de gebruiker weet, en het gebeurt bij elk openen van het paneel. Woon je aan de rand van de lus, dan ligt je huis in een van die tegels.

## Optie a: zelf tekenen als SVG, zonder tegels

Hoe: de punten van beide lussen (die al in het geheugen staan zolang het paneel open is) worden geprojecteerd naar een vlak, op één schaal geschaald zodat beide passen, en als twee lijnen in een SVG getekend. Het startpunt is het eerste punt van de lijn. De heuvels uit de bestaande cache van Overpass (`storage/nearbyTerrain.ts`) kunnen als kleine stippen, of alleen de hellingen waar de planner langs gaat; die laatste kent de engine nu niet als lijst, `RouteProposal` heeft alleen het aantal (`hills`) (zeker, `src/models/route.ts`).

- Wat er naar buiten gaat: niets. Zeker.
- Voorwaarden: geen. De lijn is afgeleid van OpenStreetMap-gegevens via de routeplanner, en de naamsvermelding staat al onder de lussen ("Kaartgegevens van OpenStreetMap" met de link naar de licentie, `RoutePanel.tsx`). Voor een kaart vraagt OpenStreetMap de vermelding in een hoek van de kaart of ernaast (goed, https://osmfoundation.org/wiki/Licence/Attribution_Guidelines); naast het kaartje is dus genoeg.
- Offline: werkt altijd. Er is zonder netwerk ook geen lus, dus het kaartje heeft dan niets om te tekenen.
- Bundelgewicht: een eigen functie van naar schatting honderd tot tweehonderd regels, enkele kilobytes (onzeker, schatting). Geen nieuw pakket.
- CSP: niets nodig.
- Stijl: past meteen bij donker en premium; alleen tokens uit `src/index.css`. De app heeft al veel eigen SVG-grafieken (onder meer `components/runDetail/RunDetailCharts.tsx`, `components/stand/`), dus dit is een bekend patroon.
- Nadeel: geen straten, geen water, geen bos. Je ziet de vorm van de lussen, hoe ver ze uitwaaieren, waar ze elkaar overlappen en waar de start ligt, maar niet langs welke straat. Voor het vergelijken van twee lussen is dat de kern; voor "ken ik dat pad?" niet.

Een keuze die de toekomst open houdt: projecteer met Web Mercator (de projectie van alle tegelservers) en niet met een eenvoudige schaling per breedtegraad. Op 10 km scheelt dat niets zichtbaars, maar dan kunnen tegels later als `<image>` onder dezelfde lijnen in dezelfde SVG, en is tikken op de kaart om een punt te kiezen gewoon de omgekeerde functie (waarschijnlijk, afgeleid uit de formules op de wikipagina hierboven).

## Optie b: de standaardtegels van OpenStreetMap

Adres: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. De gebruiksregels (goed, https://operations.osmfoundation.org/policies/tiles/, zonder datum op de pagina, gelezen 10 november 2026):

- Naamsvermelding duidelijk op de kaart, meestal rechtsonder, "© OpenStreetMap contributors"; niet verstopt achter een knop of buiten beeld.
- Een duidelijke, eigen User-Agent die de app noemt; geen standaard van een bibliotheek en niet doen alsof je een browser bent. Een automatisch meegestuurde app-id in `X-Requested-With` is acceptabel, een eigen User-Agent blijft aanbevolen.
- In de browser een geldige Referer; geen Referrer-Policy die hem tegenhoudt. Een native app zonder Referer is acceptabel.
- Caches niet omzeilen: geen `no-cache`; de cachekoppen volgen, anders minstens zeven dagen bewaren; voorwaardelijke aanvragen voor verlopen tegels.
- Verboden: vooraf ophalen van tegels die de gebruiker niet bekijkt, "downloaden voor offline", archieven van tegels. Een klein beetje vooruitkijken rond het beeld mag.
- Apps krijgen geen eigen grens; de algemene regels gelden. Zwaar gebruik kan zonder waarschuwing worden geblokkeerd, en er is geen garantie op beschikbaarheid.
- Geen persoonlijke of vertrouwelijke gegevens naar de diensten sturen; de OSMF publiceert geanonimiseerde, samengevoegde gegevens over welke apps en sites de tegels gebruiken.

Geldt dat voor een PWA of een Android-webweergave van één gebruiker? Ja: de regels kennen geen ondergrens in aantal gebruikers (goed, zelfde pagina). Wat het in de praktijk vraagt (waarschijnlijk, afgeleid):

- In de PWA in Chrome gedraagt een `<img>` of SVG-`<image>` zich als een gewone website: de browser stuurt zijn eigen User-Agent en de herkomst als Referer, en de HTTP-cache van de browser volgt de cachekoppen zelf. Dat is wat de regels van een website vragen.
- In de Android-app (Capacitor, `androidScheme: 'https'` in `capacitor.config.ts`) is de User-Agent die van de webweergave. Een eigen naam erbij kan met de instelling `appendUserAgent` van Capacitor (goed voor het bestaan van die instelling, https://capacitorjs.com/docs/config; onzeker of een wijziging zonder nieuwe APK werkt, want het is native configuratie). Of de webweergave nog `X-Requested-With` meestuurt, heb ik niet nagegaan.
- De service worker van de PWA mag tegels niet vooraf ophalen; de Android-build heeft geen service worker (zeker, `vite.config.ts`). Advies: tegels helemaal niet in de service worker, alleen de gewone HTTP-cache van de browser.
- Gebruik: één gebruiker die het paneel een paar keer per week opent, vier tot zestien tegels per keer, is verwaarloosbaar (afgeleid).

Privacy: de privacyverklaring van de OSMF noemt het IP-adres en de details van de aanvraag bij tegels, zegt dat tegels via een wereldwijd net van cacheservers lopen en dat een CDN "could potentially generate a record of your location at a large scale". Een bewaartermijn voor tegellogs staat er niet in (goed, https://osmfoundation.org/wiki/Privacy_Policy). Dus: de OSMF en haar CDN zien je IP-adres met de rechthoek rond je lus.

Stijl: de standaardtegels zijn licht en kleurig. Op een donker, premium scherm valt dat uit de toon. Een CSS-filter (omkeren en de kleurtoon draaien) maakt ze donker, maar dat is een ontwerpbeslissing voor Cartographer en het kost rekenwerk op een trage telefoon (onzeker, niet gemeten).

Offline: zonder netwerk geen tegels; het kaartje moet dan zonder ondergrond tekenen. Tegels mogen niet vooraf voor offline worden opgehaald.

Bundelgewicht: geen bibliotheek nodig voor een vast kaartje zonder schuiven en zoomen; de tegels kunnen als `<image>` in dezelfde SVG als optie a. Wil je later schuiven en zoomen, dan is Leaflet 1.9.4 de lichte keuze: 147.552 bytes JavaScript en 14.806 bytes CSS geminimaliseerd (goed, https://data.jsdelivr.com/v1/packages/npm/leaflet@1.9.4), gecomprimeerd naar mijn schatting ongeveer 40 KB (onzeker, niet gemeten).

## Optie c: andere tegels zonder sleutel

**OpenTopoMap** (`tile.opentopomap.org`). Hoogtelijnen en schaduw van het reliëf, wat goed past bij een lus die hellingen zoekt. Licentie CC-BY-SA, vermelding "Kartendaten: © OpenStreetMap-Mitwirkende, SRTM | Kartendarstellung: © OpenTopoMap (CC-BY-SA)"; gebruik in een app mag, ook commercieel, met een melding aan de makers op prijs gesteld; de server mag niet overbelast worden, massaal downloaden is ongewenst, geen garantie op beschikbaarheid (goed, https://opentopomap.org/about). Over User-Agent, caching en wat er wordt gelogd zegt de pagina niets. Het is een kleine vrijwilligersserver die bekendstaat als traag (onzeker, niet gemeten). Licht van kleur, zelfde stijlvraag als b. Privacy: zelfde soort lek als b, naar een partij waarvan het beleid onbekend is.

**PDOK, BRT Achtergrondkaart van het Kadaster.** Vijf thema's: standaard, grijs, pastel, water en labels; WMTS in onder meer EPSG:3857, niveaus 0 tot 19, tegels van 256 pixels, adres `https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0/{laag}/EPSG:3857/{z}/{x}/{y}.png` (zeker, de capabilities op https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0?request=getcapabilities&service=wmts). Gratis via PDOK en open beschikbaar, ook als vector tiles (goed, https://www.pdok.nl/introductie/-/article/basisregistratie-topografie-achtergrondkaarten-brt-a-). Licentie CC-BY 4.0 volgens het register (goed, https://data.overheid.nl/dataset/48457-brt-achtergrondkaart); de vermelding is gangbaar "Kaartgegevens: © Kadaster" (waarschijnlijk, uit een voorbeeld van een derde). Zonder sleutel. De kaart komt uit TOP10NL; het omkaderende vak van de dienst loopt over de grens, maar buiten Nederland is er naar verwachting weinig of niets (waarschijnlijk). Voor een lus in de Ardennen, de Alpen of op de GR5 is dit dus leeg. Het thema grijs past beter bij een donker scherm dan de kleurige tegels van b en c. Een privacyverklaring of fair-use-regel van PDOK voor de webdiensten heb ik niet gevonden. Voordeel voor privacy: een Nederlandse overheidsserver zonder reclame; nadeel: ook hier een nieuwe partij die je IP-adres en je gebied ziet.

**OpenFreeMap** (vector). Geen registratie, geen gebruikersdatabase, geen sleutels en geen cookies; geen grens op kaartweergaven; een app moet een eigen User-Agent sturen; vermelding "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" (het deel OpenFreeMap mag weg) (goed, https://openfreemap.org/). Toegangslogs zonder IP-adres, zeven dagen bewaard; IP-adressen alleen bij misbruik, hoogstens dertig dagen; mogelijk via Cloudflare als CDN, dat zijn eigen beleid heeft (goed, https://openfreemap.org/privacy/). Downloaden voor offline mag tot 3.000 tegels of 50 MB, geen garantie (goed, https://openfreemap.org/tos/). Er is een donkere stijl. Maar vector tiles vragen een renderer: MapLibre GL JS 6.17.0 is 1.107.644 bytes geminimaliseerd en 296.691 bytes gecomprimeerd (goed, https://bundlephobia.com/package/maplibre-gl), draait op WebGL en haalt naast tegels ook een stijl, lettertypen en pictogrammen op. Op een trage telefoon is dat het zwaarste van alle opties (waarschijnlijk). Van de diensten met tegels heeft deze de zuinigste logregels op papier.

## CSP

Er is nu geen Content-Security-Policy: geen `meta` in `index.html`, geen kop in `vite.config.ts`, en GitHub Pages zet zelf geen CSP (zeker voor de repo, gezocht op 10 november; waarschijnlijk voor GitHub Pages). Capacitor zet in de Android-app ook geen CSP (waarschijnlijk). Gevolg:

- Optie a: niets te veranderen.
- Tegels als `<img>` of SVG-`<image>` werken nu zonder wijziging. Komt er ooit een CSP, dan hoort de tegelhost in `img-src` (bijvoorbeeld `https://tile.openstreetmap.org` of `https://service.pdok.nl`); `connect-src` alleen als je tegels met `fetch` ophaalt.
- MapLibre vraagt bij een CSP ook `connect-src` voor stijl, tegels en lettertypen en een regel voor zijn worker (`worker-src blob:` of het aparte CSP-bestand van MapLibre) (onzeker, niet nagelezen in de documentatie van MapLibre).

## Wat er later bij komt

- Startpunt kiezen door te tikken: met de projectie van optie a is een tik op het kaartje om te rekenen naar een punt. Zonder ondergrond weet je alleen niet waar je tikt; dat vraagt dus wel tegels, of een kaartje dat eerst rond de huidige locatie tekent. Het punt zou dan net als nu alleen op het toestel staan (`routeStartPoint`).
- Huidige locatie: bestaat al als `locateStartHere` met een grens van 15 seconden.
- Bijsturen: elke verschuiving is een nieuwe aanroep bij de routeplanner en telt mee in de grens van drie per soort lus. Slepen en zoomen vraagt eigen gebaren of Leaflet. Dat hoort bij een eigen besluit.

Geen van deze drie dwingt nu een bibliotheek af. Een eigen SVG met Web Mercator is een goede eerste laag waar tegels en tikken later op passen.

## Het startpunt op het scherm

Het besluit over het startpunt zegt: "Het punt staat nooit op het scherm, ook niet als getal" (`docs/beslissingen/2026-11-09-startpunt-lus.md`). De eigenaar vraagt nu om het startpunt op het kaartje. Op een kaartje zonder ondergrond is het een stip ten opzichte van twee lijnen; niemand leest daar een adres uit, al kan wie de vorm van een lus herkent hem op een echte kaart terugvinden (onzeker, afgeleid). Op een ondergrond met straten staat bij Precies je deur op het scherm, en een schermafbeelding laat dan zien waar je woont. Dat is een keuze van de eigenaar, niet van de bouwer.

## Wat het onderzoek zegt

Zelf tekenen stuurt niets naar buiten, kost geen pakket, werkt met de bestaande tokens en laat zien wat nodig is om twee lussen te vergelijken: vorm, omvang, overlap en start. Elke tegelbron vertelt een nieuwe partij bij elk openen in welk gebied van ongeveer 1,5 tot 3 km je lus ligt, met je IP-adres. De standaardtegels van OpenStreetMap mogen in een app van één gebruiker, mits vermelding, een herkenbare User-Agent, de browsercache en geen vooraf ophalen; ze zijn licht van kleur. PDOK grijs past het best bij een donker scherm maar dekt alleen Nederland. OpenFreeMap heeft de zuinigste logregels en een donkere stijl, maar vraagt MapLibre van bijna 300 KB gecomprimeerd en WebGL.

## Wat het betekent voor de app (voorstel, geen besluit)

- Eerst een eigen SVG zonder tegels, met Web Mercator, beide lussen op één schaal en het startpunt als stip. Een instelling Kaartje bij de lussen, standaard aan.
- Tegels pas later, als eigen besluit, als instelling Ondergrond van het kaartje met standaard Geen, en een eigen eerste vraag die de dienst noemt en zegt wat de tegels verraden. Eerste kandidaat OpenStreetMap (overal, bekende regels), PDOK grijs als keuze voor Nederland. Geen MapLibre, tenzij bijsturen en slepen later een echte kaart vragen.
- Tegels nooit in de service worker en nooit vooraf ophalen; alleen de HTTP-cache van de browser.

## Wat nog onzeker is

- Of de eigenaar het startpunt bij Precies op een kaart met straten wil zien; dat botst met een eerder besluit.
- Hoe snel een SVG met twee lijnen van een paar duizend punten op een trage telefoon tekent; uitdunnen lost het naar verwachting op, maar het is niet gemeten.
- Hoe de User-Agent van de Android-webweergave eruitziet en of `appendUserAgent` een nieuwe APK vraagt.
- De voorwaarden en logregels van PDOK voor de webdiensten, en hoe ver de BRT-tegels over de grens reiken.
- Of OpenTopoMap snel genoeg is voor een kaartje dat binnen een paar seconden moet staan.
- Het gecomprimeerde gewicht van Leaflet heb ik geschat, niet gemeten.
