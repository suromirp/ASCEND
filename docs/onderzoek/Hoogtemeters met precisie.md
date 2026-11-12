# Hoogtemeters met precisie

Scout Hoogtemeters, 12 november 2026. Bronnenonderzoek met proefaanroepen, geen medisch advies. De vraag van de eigenaar: hoogtemeters zijn heel belangrijk voor de planning en moeten precies zijn.

Bouwt voort op `Routeplanner voor een training.md` (BRouter, Valhalla, dode band, fout in bos), `Avontuurlijke plekken uit OpenStreetMap.md` (grove maat zonder route) en `Kaartbron voor Route voorstellen.md` (hoogtetegels als tweede stap). Wat daar staat herhaal ik niet.

Zekerheid per bewering: zeker (zelf gezien in een proefaanroep of in de bron zelf), waarschijnlijk (meerdere aanwijzingen of nette afleiding), onzeker (één melding of eigen aanname). Alles wat een advies is, is een voorstel voor een engine-regel en geen besluit.

Wat ik niet kon: koppen van een antwoord zien. Mijn gereedschap toont alleen de inhoud. CORS is dus nergens zelf vastgesteld, alleen afgeleid. De proefpunten liggen op het openbare punt dat het eerdere onderzoek al gebruikte.

## 1. Wat is precies

Er zijn drie getallen, en ze meten niet hetzelfde.

**(a) Een gebied zonder route.** Dit is geen meting maar een belofte: zoveel kun je hier ongeveer halen. Het hangt meer af van waar de paden lopen dan van het hoogtemodel.

**(b) Een geplande route.** Hoogtes uit een model langs een lijn van de kaart, daarna opgeteld met een drempel. Drie foutbronnen: het model zelf, de lijn die een paar meter naast het echte pad ligt, en de manier van tellen.

**(c) Wat je liep.** De Forerunner 255 heeft een barometer (waarschijnlijk, specificatie niet opnieuw nagelezen). Het horloge telt met zijn eigen filter en dat getal komt via intervals.icu binnen als `total_elevation_gain` (zeker, `src/integrations/intervalsIcu.ts`). Health Connect levert in de huidige code geen hoogte (zeker, geen treffer in `src/`).

**Hoe goed is het horloge.**
- Fietscomputers met barometer op drie echte klimmen, 216 metingen: de fout was 1,5 tot 1,9 procent in droog weer, slechter in de regen (waarschijnlijk, Menaspà en anderen 2016, alleen de samenvatting gelezen, https://researchprofiles.canberra.edu.au/en/publications/accuracy-in-measurement-of-elevation-gain-in-road-cycling/). Dit is het beste geval: lange klimmen, toestel op het stuur.
- Sporthorloges aan de pols, wandelen en hardlopen, 180 opnames per horloge, heuvelrondje van 2,5 km met 90 m stijging: 3,3 tot 9,8 procent te weinig met de standaardinstelling. Op een vlakke baan van 1.200 m telden ze 0 tot 4,8 m die er niet was (zeker voor de getallen, samenvatting van Ammann en anderen 2016, https://folia.unifr.ch/unifr/documents/305444). Dat laatste is belangrijk: omgerekend 0 tot 4 m per kilometer aan stijging die niet bestaat.
- Berglopen met meerdere ontvangers: gemiddeld 3,8 procent te weinig, met of zonder barometer (waarschijnlijk, Szot en Sontowski 2024, via een zoekresultaat, https://lida.sport-iat.de/twm/Record/4086627).
- 202 bergtochten met drie toestellen: de barometer telde stelselmatig te veel, GPS zonder barometer te weinig; nabewerken bracht de fout van 5 naar 1 procent (waarschijnlijk, Sánchez en Villena 2020, via een zoekresultaat, https://investigadores.anid.cl//en/public_search/work?id=629227).

**Hoe goed is een model langs een spoor.**
- Een bergrondje van 16 km met ongeveer 1.080 m echte stijging: ruwe GPS-hoogte gaf 2.326 m (ruim het dubbele), een model van 30 m zonder drempel 1.434 m (33 procent te veel), met een drempel rond 10 m kwam het dicht bij de werkelijkheid (zeker voor de getallen, één voorbeeld en geen studie, https://www.gpsvisualizer.com/tutorials/elevation_gain.php). De oorzaak: de lijn ligt zijwaarts een paar meter verkeerd op een helling, en het model maakt daar klimmetjes van.
- Andersom: wie een bergparcours grover bemonstert, verliest tot 10 procent aan afstand en stijging; de schrijvers bevelen 1 m aan (zeker voor de samenvatting, 34 parcoursen, voorpublicatie, Sánchez en anderen 2024, https://sportrxiv.org/index.php/server/preprint/view/481).
- Planners onderling: dezelfde route gaf 336 m bij de ene en 274 m bij de andere dienst, en 3.517 tegen 2.700 m (onzeker, forumberichten, https://forums.garmin.com/sports-fitness/cycling/f/edge-840-series/377703/course-ascent-differences-between-connect-strava-komoot-garmin-overstates-wildly).

**Achteraf corrigeren.** Strava toont bij een herkend toestel met barometer de hoogte uit het bestand en corrigeert alleen zonder barometer; het telt een klim pas boven 2 m met barometer en boven 10 m zonder (zeker, https://support.strava.com/hc/en-us/articles/115001294564-Elevation-on-Strava-FAQs). Garmin Connect zet correcties standaard uit bij een toestel met barometer; welk model Garmin gebruikt is niet gepubliceerd (waarschijnlijk, tekst van Garmin aangehaald op het forum, https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-web/213016/). intervals.icu heeft een reeks `fixed_altitude`; de app negeert die nu bewust (zeker voor de code; wat de reeks precies is, is onzeker).

**Per soort terrein (afgeleid uit het bovenstaande en uit de eigen lopen in punt 4).**
- Vlak land: de methodes verschillen een factor twee tot vijf, omdat bijna alles ruis en drempel is. Een verschil in procenten zegt hier niets; reken in meters. Eerlijk is: binnen 10 tot 20 m.
- Heuvels (20 tot 100 m per klim): horloge 5 tot 10 procent, een model van 30 m in bos 10 tot 30 procent per helling (eerder onderzoek), Lidar een paar procent. De drempel kost daar bovenop tot 20 procent.
- Bergen: de drempel doet er nauwelijks toe. Horloge 2 tot 10 procent, een model van 30 m met drempel ongeveer 10 procent, zonder drempel tot een derde te veel.

De belangrijkste gevolgtrekking: het doel van de training en het log zijn allebei in horlogemeters. Precies betekent voor ASCEND dus: het plan voorspelt wat het horloge straks zegt. Niet: het plan klopt met de landmeter.

## 2. Wat BRouter en Valhalla gebruiken

**BRouter.** De eigen pagina zegt: SRTM, de opgevulde versie 4.1 van CGIAR (dat is de reeks van 3 boogseconden, ongeveer 90 m), en boven 60 graden noord Lidar van Sonny (zeker voor de tekst, https://brouter.de/brouter/elevation.html). Sinds april 2024 kan BRouter ook rasters van 1 boogseconde bouwen, en een ontwikkelaar heeft toen Europese bestanden uit Sonny's Lidar-model op een server gezet; of de gewone server daarop draait staat nergens (zeker voor de samenvoeging, onzeker voor de server, https://github.com/abrensch/brouter/pull/644). De server meldt zich als versie 1.7.11-beta (zeker, proef). Op het proefpunt gaf BRouter 321,0 m, AHN-maaiveld 321,18 m, Open-Meteo 322 m en Valhalla 326 m (zeker, proef). Dat past bij Lidar maar bewijst het niet: het punt ligt open, en één punt is één punt. Een vraag aan de beheerder beslist het.

**Valhalla van FOSSGIS.** Niet gedocumenteerd. De hoogtes komen als hele meters terug (zeker, proef), wat past bij de gangbare tegels in SRTM-vorm van 1 boogseconde; die zijn in Europa uit SRTM en EU-DEM van 30 m gebouwd (waarschijnlijk, https://github.com/tilezen/joerd/blob/master/docs/data-sources.md). Op een hellingpunt gaf Valhalla 302 m waar Open-Meteo 318 m gaf (zeker, proef): 16 m verschil tussen twee modellen op dezelfde plek.

**Fout voor de totale stijging.** Geen van beide publiceert er een. BRouter zegt alleen dat gewone totalen ruis en rasterfouten optellen en dat `filtered ascend` dat wegfiltert (zeker, zelfde pagina). In mijn proef over 2,8 km met één doorlopende klim gaf BRouter 127 m gefilterd en 128 m als verschil tussen eind en begin (zeker). Op een schone klim klopt het dus; de fout zit in bos, op korte hellingen en in vlak land.

**Sonny's model.** Maaiveld uit open Lidar van de landen, als bestanden van 1 en 3 boogseconden met hele meters, licentie CC BY 4.0, volgens de maker duidelijk beter dan SRTM en Copernicus in bos en smalle dalen; een getal voor de fout geeft hij niet (zeker voor de tekst, https://sonny.4lima.de/).

## 3. Betere bronnen zonder sleutel en zonder backend

**Mapterhorn (de vondst van dit onderzoek).** Open hoogtetegels, gebouwd uit nationale Lidar waar die open is en Copernicus GLO-30 daarbuiten. Tegeladres `https://tiles.mapterhorn.com/{z}/{x}/{y}.webp`, Terrarium-codering, 512 pixels, zonder sleutel (zeker, https://tiles.mapterhorn.com/tilejson.json en drie tegels opgehaald). De tegels zijn WebP zonder verlies (zeker, de bytes beginnen met VP8L). Bronnen volgens de eigen lijst: Nederland AHN5 op 5 m, Vlaanderen 1 m, Wallonië 0,5 m, Luxemburg 0,5 m, alle zestien Duitse deelstaten 1 m, Frankrijk Lidar HD 0,5 m en RGE ALTI 1 m, Zwitserland swissALTI3D 0,5 m, Oostenrijk 1 m, delen van Italië 2 tot 10 m (zeker, https://download.mapterhorn.com/attribution.json). Tegels op zoom 15 in Nederland en zoom 16 in Zwitserland bestaan (zeker, proef). Rond 50 graden noord is één tegel op zoom 13 ongeveer 3 km breed met 6 m per pixel, op zoom 14 3 m per pixel (eigen berekening). Een lus van 10 km vraagt op zoom 13 vier tot negen tegels van ongeveer 100 kB.
Wat ontbreekt: gebruiksregels en een belofte van beschikbaarheid. De opslag en het verkeer zijn een gift van Cloudflare (zeker, https://mapterhorn.com/data-access/). CORS heb ik niet gezien; het project is gemaakt voor kaarten in de browser, dus open CORS is waarschijnlijk. Naamsvermelding: © Mapterhorn met een link naar hun bronnenlijst.

**AHN via PDOK.** Maaiveld (`dtm_05m`) en oppervlak (`dsm_05m`) op 0,5 m, geen kosten, CC0, WCS met GeoTIFF en ook EPSG:4326 (zeker, de capabilities van `https://service.pdok.nl/rws/ahn/wcs/v1_0`). Nieuw: de WMS geeft met GetFeatureInfo één hoogte als JSON, zonder GeoTIFF-lezer (zeker, proef: 321,18 m). Eén aanroep per punt, dus geschikt voor een controle en niet voor een heel profiel. In bos gaf maaiveld 189,1 m en oppervlak 202,0 m op vrijwel dezelfde plek (zeker, proef; de twee punten lagen ongeveer 20 m uit elkaar): 13 m boomkruin. Het maaiveldraster heeft gaten bij gebouwen en water (waarschijnlijk). PDOK noemt ook een nieuwer adres, `.../rws/actueel-hoogtebestand-nederland/...` (zeker, https://www.pdok.nl/ogc-webservices/-/article/actueel-hoogtebestand-nederland-ahn). CORS niet gezien.

**Frankrijk, Géoplateforme.** `https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevationLine.json` geeft zonder sleutel een profiel langs een lijn, met `height_differences` erbij; hoogstens 5.000 punten per aanroep en 5 aanroepen per seconde per adres (zeker, proef en https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/calcul-altimetrique/). Het meegeleverde totaal is ongefilterd: gebruik de hoogtes, niet het totaal. Let op voor de GR5: RGE ALTI is in het hooggebergte uit radar gemaakt, met een fout rond 7 m op steile hellingen, tegen 0,2 tot 0,5 m waar Lidar ligt (waarschijnlijk, https://developers.google.com/earth-engine/datasets/catalog/IGN_RGE_ALTI_1M_2_0). Lidar HD vervangt dat stap voor stap.

**Zwitserland, swisstopo.** `https://api3.geo.admin.ch/rest/services/profile.json` geeft zonder sleutel een profiel uit het model van 2 m (zeker, proef). Coördinaten in het Zwitserse stelsel, dus omrekenen. Regels: redelijk gebruik, een herkenbare afzender, bij 429 wachten, bij 403 stoppen (zeker, https://docs.geo.admin.ch/llms.txt).

**België, Duitsland, Oostenrijk.** Open Lidar bestaat overal, maar zonder één eenvoudige puntdienst per land. Mapterhorn bundelt ze; een eigen koppeling per land is het werk niet waard (waarschijnlijk).

**Copernicus GLO-30.** Oppervlaktemodel, 30 m, vrij te gebruiken, absolute fout onder 4 m bij 90 procent, onderling onder 2 m op flauwe en onder 4 m op steile hellingen (zeker, https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM). In bos meet het de kruinen mee (eerder onderzoek). Open-Meteo gebruikt de versie van 90 m en geeft hele meters (zeker, proef).

**Terrain Tiles op AWS.** In Europa SRTM en EU-DEM van 30 m, alleen Oostenrijk 10 m (zeker, joerd-lijst hierboven). Ouder en grover dan Mapterhorn, zelfde codering. Hoogstens als reserve.

**Mapbox en MapTiler.** Sleutel nodig; vallen af.

## 4. Het tellen zelf

**De drempel beslist in vlak land.** Zes eigen lopen met barometerhoogte per seconde, aangeleverd door de coördinator. Vijf vlakke lopen van 5 tot 9 km: Garmin meldt 21 tot 33 m bij een verschil tussen hoogste en laagste punt van 9 tot 17 m. Dezelfde reeks geteld zonder drempel geeft 44 tot 203 m, met 2 m 14 tot 57 m, met 5 m 5 tot 25 m. Samen: Garmin 132 m, drempel 2 m 147 m, drempel 3 m 93 m, drempel 5 m 60 m. De heuvelloop: Garmin 133 m, met 1 m 128, met 2 m 120, met 5 m 110. Garmin telt dus met iets dat op 1 tot 3 m lijkt, en 2 m past over alle zes het best (zeker voor de getallen; welke telwijze achter de drempel zat weet ik niet). Dat is ook de drempel van Strava voor een barometer.

Twee lessen. Eén: de 5 m van `ascentOf` geeft in vlak land een kwart tot de helft van het horloge en op de heuvelloop 17 procent te weinig. Twee: in vlak land is ook het horloge geen waarheid. Ammann vond tot 4 m per kilometer aan stijging die er niet is; op 6 tot 9 km is dat tot 30 m, precies de orde van wat Garmin hier meldt. Onder ongeveer 40 m totaal weet niemand het op 20 m na.

**Twee tellers in de code, die allebei te weinig tellen (afgeleid uit de code, niet met een test nagerekend).**
- `routeGeometry.ts#ascentOf` verplaatst zijn anker in stappen van de drempel. Het laatste stukje naar de top (minder dan 5 m) valt weg, en na een afdaling staat het anker tot 5 m boven het echte dal. Gemiddeld kost dat ongeveer één drempel per klim. Bij acht herhalingen van een helling van 30 m is dat ruwweg 40 van de 240 m.
- `activityDetail.ts#deadBand` (voor logs) laat een lijn op 5 m afstand volgen en verliest daardoor precies 10 m per klim en afdaling. De vergelijking `gainAgreementPct` zet dus een teller met 10 m verlies naast het getal van Garmin.
Een echte hysterese onthoudt het laagste punt sinds de laatste bevestigde top en het hoogste punt sinds het laatste dal. Een klim telt dan van echt dal tot echte top zodra hij boven de drempel komt, zonder verlies.

**Bemonstering.** Niet fijner dan het raster zin heeft: om de 10 m bij Lidar van 1 tot 6 m, om de 30 m bij een model van 30 m (afgeleid). Grover dan 30 m kost echte stijging (Sánchez 2024).

**Gladmaken.** Eerst een lopend gemiddelde of mediaan over ongeveer 30 m langs de lijn, dan pas tellen. Dat haalt de sprongen weg die ontstaan doordat de kaartlijn naast het pad ligt (afgeleid uit het voorbeeld van GPS Visualizer; de 30 m is een aanname).

**Bruggen en tunnels.** Een maaiveldmodel volgt het dal onder een brug en de berg boven een tunnel. Voorstel: een kuil of bult korter dan ongeveer 150 m met aan beide kanten meer dan 30 procent helling rechttrekken (aanname, niet beproefd). Op wandelpaden is het zeldzaam; het gladmaken vangt een voetbrug meestal al op.

**Bos.** Gebruik maaiveld (DTM). Een oppervlaktemodel maakt van elke bosrand een helling: 13 m in mijn proef met Lidar, 3 tot 7 m bij radar (eerder onderzoek).

**Drempel per bron (voorstel).**
- Horloge, barometer: 2 m. Past bij de eigen lopen en bij Strava. Voor het log blijft het getal van Garmin gelden; de eigen telling is er alleen om te vergelijken.
- Lidar-maaiveld, na gladmaken: 2 m, zodat plan en horloge op dezelfde manier tellen. Moet met een proef bevestigd.
- Model van 30 m (BRouter, Valhalla, Copernicus): 5 m met echte hysterese in heuvels; 10 m in de bergen, zoals GPS Visualizer en Strava. Lager dan 5 m telt ruis op.
- Vlak, alle bronnen: komt het totaal onder ongeveer 40 m uit, of onder 5 m per kilometer, noem het dan "vrijwel vlak" en toon geen getal met schijnprecisie.

## 5. IJken tegen wat je liep

**Wat nu kan.** Bewaarde routes hebben een `ascentM` en zijn via het log aan gelopen trainingen te koppelen (`engine/places.ts#rankSavedRoutes`). Elk paar van dezelfde lus (gepland getal, getal van het horloge) is een ijkpunt, mits de gelopen afstand binnen 10 procent van de route ligt. In de back-up staan geen GPS-punten, dus het model langs het echt gelopen spoor leggen kan achteraf niet.

**Wat beter is (voorstel).** Op het moment van importeren zijn de reeksen even in het geheugen, ook de posities. Reken dan meteen de stijging van het hoogtemodel langs dat spoor uit, met dezelfde teller, en bewaar alleen twee getallen bij het log: stijging volgens het model en volgens het horloge. Geen spoor in de opslag, wel een zuiver ijkpunt zonder de vraag of je de route precies volgde. Dit is een afgeleide toevoeging en dus append-only.

**De marge.** Uit de paren volgen twee dingen: de mediaan van horloge gedeeld door model (de scheefstand) en de spreiding. Tot er vijf paren zijn geldt een vaste marge uit de literatuur; daarna schuift de eigen meting er langzaam in, begrensd, per bron en apart voor vlak, heuvels en bergen.

Startwaarden (voorstel, afgeleid uit punt 1):
- Lidar-maaiveld: de grootste van 10 m en 10 procent.
- Model van 30 m: de grootste van 20 m en 20 procent.
- Grove maat zonder route: geen marge maar een band, bijvoorbeeld "150 tot 250".
Voorbeelden: 240 m op Lidar wordt "ongeveer 240, plus of min 25"; op een model van 30 m "plus of min 50"; 1.000 m in de bergen op Lidar "plus of min 100". Kleiner dan 5 procent belooft de app nooit, want zo goed is het horloge zelf niet.

De ijking verandert alleen het getoonde getal en de marge. Ze past nooit stil een doel of een planning aan.

## 6. Een plek zonder route

Een onderzochte maat die uit een paar honderd punten binnen 15 procent van de haalbare stijging komt, heb ik niet gevonden (zeker dat ik niets vond; dat is geen bewijs dat hij niet bestaat). Het kan ook moeilijk bestaan: wat haalbaar is hangt af van waar paden lopen, en dat weet een hoogtemodel niet.

Wat wel kan, in twee stappen (voorstel):
- **Rangschikken met één tegel.** Eén tegel op zoom 12 geeft ruim 260.000 hoogtes over ongeveer 6 bij 6 km, in één aanroep; dat is veel meer dan de 100 punten van Open-Meteo. Reken daaruit het bruikbare reliëf rond de plek (het verschil tussen het 90e en 10e percentiel binnen een straal van een kwart van de trainingsafstand). Goed genoeg om van twintig kandidaten de beste drie te kiezen, niet om een getal te beloven. Toon hoogstens een band.
- **Een echte lus bij de beste twee of drie.** Zodra de gebruiker de voorstellen opent, rekent de planner per kandidaat één lus en toont die stijging met de marge van punt 5. Dat blijft binnen de regel van weinig aanroepen, een voor een.

## Advies in acht punten

1. **Eén begrip van precies.** Het plan voorspelt horlogemeters. Plan en log tellen met dezelfde functie en dezelfde drempel per bron.
2. **Eerst de teller.** Vervang het verspringende anker door echte hysterese, in één gedeelde functie voor `ascentOf` en de telling op logs. Dit kost geen netwerk en haalt tot 20 procent fout weg bij herhalingen.
3. **Drempels.** Horloge 2 m, Lidar 2 m na gladmaken over 30 m, model van 30 m 5 m (10 m in de bergen). Onder ongeveer 40 m totaal: "vrijwel vlak".
4. **Bron per land.** Eén bron voor alles: de tegels van Mapterhorn op zoom 13 (Lidar-maaiveld in Nederland, België, Luxemburg, Duitsland, Frankrijk, Zwitserland en Oostenrijk, Copernicus daarbuiten). De lijn blijft van BRouter of Valhalla komen; alleen de hoogte komt uit de tegels. Reserve: de hoogte van de routeplanner zelf, met de ruime marge.
5. **Controles per land, later.** PDOK-puntaanroep voor top en voet in Nederland; het Franse en Zwitserse profiel alleen als de tegels daar tekortschieten. Voor de GR5: reken in het Franse hooggebergte met de ruime marge tot Lidar HD er ligt.
6. **IJking.** Twee getallen per log bij het importeren (model langs het spoor, horloge), geen spoor bewaren. Vaste marge tot vijf paren, daarna de eigen. Instelbaar, met uitleg in één zin.
7. **Plekken zonder route.** Rangschikken met één tegel, tonen pas na een echte lus bij de beste twee of drie.
8. **Eerst met een proef bevestigen.** (a) Mapterhorn in de PWA en de Android-app: CORS, het uitlezen van een WebP-tegel naar hoogtes zonder afwijking, en een bericht aan de makers of dit gebruik goed is. (b) Eén bekende heuvellus lopen met het horloge en naast BRouter, Valhalla en de tegels leggen, met drempel 2 en 5 m. (c) De beheerder van BRouter vragen welk model de server gebruikt. (d) CORS van PDOK.

## Wat het onderzoek zegt

Precisie zit in drie lagen: het model, de lijn en de teller. In vlak land bepaalt de teller alles en is zelfs het horloge op 20 m na onzeker; in heuvels kost een model van 30 m in bos 10 tot 30 procent per helling en de huidige teller nog eens tot 20 procent; in de bergen blijft ongeveer 10 procent over. Een barometer aan de pols zit zelf 3 tot 10 procent naast de werkelijkheid. Lidar-maaiveld is voor alle landen waar de eigenaar loopt vrij beschikbaar, en sinds kort gebundeld in sleutelvrije tegels.

## Wat het betekent voor de app

De grootste winst kost geen nieuwe bron: de teller herstellen en de drempel per bron kiezen. Daarna de hoogte uit Lidar-tegels in plaats van uit de routeplanner, en een marge die de app zelf leert uit plan en log. Elk getal krijgt "ongeveer" met een marge; vlak heet vlak. Er hoort een instelling bij (bron van de hoogte, marge tonen), en niets hiervan verandert de planning zonder Akkoord.

## Wat nog onzeker is

- CORS van Mapterhorn, PDOK, de Franse en de Zwitserse dienst: niet gezien, alleen afgeleid.
- Of Mapterhorn dit gebruik goed vindt en hoe lang de dienst blijft; er zijn geen gepubliceerde regels.
- Of een WebP-tegel in de WebView bit voor bit uit te lezen is (kleurbeheer of bescherming tegen herkenning kan pixels veranderen).
- Welk hoogtemodel de servers van BRouter en Valhalla nu echt gebruiken.
- De drempel van 2 m op Lidar, de 30 m gladmaken en de regel voor bruggen: eigen voorstellen, niet beproefd.
- De telwijze achter de zes eigen lopen; met echte hysterese vallen de getallen per drempel iets hoger uit.
- Wat Garmin precies telt, en wat `fixed_altitude` bij intervals.icu is.
- De startmarges zijn afgeleid uit studies met andere horloges en ander terrein; de eigen ijking moet ze vervangen.
- Enkele studies (Menaspà, Szot, Sánchez en Villena) las ik alleen als samenvatting; één bron (de studie over modelresolutie van Sánchez en Egli) was niet bereikbaar.
