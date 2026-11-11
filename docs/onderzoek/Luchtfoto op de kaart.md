# Luchtfoto op de kaart

Bronnencheck van 11 november 2026 voor de schakelaar Kaart of Luchtfoto in de Briefing en het blad Route. Bouwt voort op `Kaartbron voor Route voorstellen.md` en `Kaartje bij Route voorstellen.md`; de kaartbron zelf (OpenFreeMap, terugval OSM-raster) verandert hier niet.

Bij elke bewering staat hoe zeker ze is. Zeker betekent: vandaag zelf gezien in het officiële document of met een echte tegel getest. Waarschijnlijk betekent: volgt uit de bron maar niet letterlijk bevestigd. Onzeker betekent: niet gevonden, de bouwer moet het nalopen.

## 1. Nederland: PDOK Luchtfoto

Tegel-URL voor maplibre (zeker, uit de GetCapabilities en getest met een tegel op zoom 19):

`https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg`

De volgorde is zoom, kolom, rij, dus gewoon `{z}/{x}/{y}`. Formaat is alleen JPEG. Tegels van 256 px.

Lagen (zeker): `Actueel_orthoHR` is de nieuwste 8 cm opname (winter, zonder blad), `Actueel_ortho25` de nieuwste 25 cm opname (zomer, met blad). De Actueel-lagen schuiven vanzelf mee naar de nieuwste jaargang, dus de app hoeft geen jaartal te kennen. Vaste jaargangen bestaan ook, bijvoorbeeld `2026_orthoHR` en `2025_ortho25`. De set EPSG:3857 loopt van zoom 0 tot en met 21.

Sleutel: niet nodig (zeker; AccessConstraints en Fees staan op none).

Licentie: CC BY 4.0 (zeker; PDOK schrijft "onder een CC-BY licentie" en "voor iedereen kosteloos en vrij beschikbaar voor alle toepassingen", data.overheid.nl noemt CC-BY 4.0). Dus niet publiek domein: naamsvermelding is verplicht.

Naamsvermelding: PDOK schrijft geen letterlijke tekst voor (zeker dat die op de productpagina ontbreekt). Voorstel dat aan CC BY voldoet (waarschijnlijk goed): `Luchtfoto: Beeldmateriaal Nederland, via PDOK, CC BY 4.0`.

Grenzen: op de productpagina staat geen limiet (zeker). De algemene pagina met het fair use beleid van PDOK was niet te openen (onzeker wat daar nu staat). Ga uit van gewoon kijkgebruik en niet van massaal ophalen.

Bronnen: https://www.pdok.nl/introductie/-/article/pdok-luchtfoto-rgb-open- en https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0?request=GetCapabilities&service=WMTS en https://data.overheid.nl/dataset/77581-luchtfoto-beeldmateriaal-2026-5cm---8cm-rgb-open-data

## 2. Frankrijk: IGN Géoplateforme

Tegel-URL voor maplibre (zeker dat hij werkt zonder sleutel; getest op zoom 10 en zoom 19 in de Alpen):

`https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`

PM is de gewone webkaartprojectie (EPSG:3857). Tegels van 256 px.

Hoogste zoom: 19 (waarschijnlijk; een tegel op zoom 19 kwam terug, dezelfde plek op zoom 20 gaf 404. De laag stond te ver in het grote capabilities-document om de officiële grens te lezen).

Sleutel: niet nodig voor deze open laag (zeker, de test slaagde zonder).

Licentie: Licence Ouverte Etalab 2.0 (waarschijnlijk; de gebruiksvoorwaarden zeggen dat de licentie van de leverancier geldt en anders de Licence Ouverte, en BD ORTHO staat op data.gouv.fr onder Licence Ouverte). Die licentie vraagt de naam van de bron en de datum van de laatste bijwerking.

Naamsvermelding: geen letterlijke tekst gevonden (onzeker). Voorstel: `Luchtfoto: IGN, Géoplateforme, Licence Ouverte 2.0`.

Grenzen: de voorwaarden op cartes.gouv.fr/cgu noemen limieten per IP per seconde (zeker voor WMS-raster 40 en WFS 30 verzoeken per seconde; daarboven fout 429 en vijf seconden blokkade). Een getal voor WMTS is niet gevonden (onzeker). IGN mag toegang beperken bij gebruik dat het platform hindert.

Bronnen: https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities en https://cartes.gouv.fr/cgu en https://www.data.gouv.fr/datasets/bd-ortho-r

## 3. Daarbuiten: Sentinel-2 cloudless van EOX

Tegel-URL voor maplibre (zeker; getest met een tegel):

`https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg`

Let op de volgorde: bij EOX komt de rij voor de kolom, dus `{z}/{y}/{x}`. Wie hier `{x}/{y}` schrijft krijgt de verkeerde plek. Het capabilities-document noemt http, de tegel kwam ook over https.

Licentie per jaargang (zeker voor 2016 en voor 2018 en later, volgens EOX zelf): de jaargang 2016 (laag `s2cloudless_3857`) is CC BY 4.0. De jaargangen 2018 tot en met 2025 zijn CC BY-NC-SA 4.0, dus alleen niet-commercieel en met gelijk delen; commercieel gebruik vraagt een betaalde licentie van EOX. Voor de laag 2017 las de samenvatting van het capabilities-document CC BY 4.0, maar dat is niet letterlijk nagekeken (onzeker). Kies daarom de laag van 2016.

Naamsvermelding voor 2016 (zeker, letterlijk van EOX): `Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 & 2017)`. EOX vraagt de link mee te nemen bij gebruik online. s2maps.eu verwijst nu door naar cloudless.eox.at.

Grenzen: geen sleutel, geen getal voor het aantal verzoeken gevonden (onzeker). Het is een gratis dienst van een bedrijf zonder garantie.

Scherpte: 10 meter per pixel. Dat is bruikbaar tot ongeveer zoom 13 of 14 (waarschijnlijk). Een pad of een straat zie je er niet op, een dal, een meer of een bergkam wel.

Esri World Imagery valt af (waarschijnlijk, niet tot op de letter van de overeenkomst nagelopen): het valt onder de licentieovereenkomst van Esri, de ontwikkelaarsdocumentatie vraagt een account met sleutel en de regel Powered by Esri, en de laag is volgens Esri zelf niet bedoeld om tegels voor offline uit te voeren. Geen andere sleutelvrije wereldwijde bron met een open licentie en betere scherpte gevonden.

Bronnen: https://tiles.maps.eox.at/wmts/1.0.0/WMTSCapabilities.xml en https://eox.at/2019/02/sentinel-2-cloudless-2018/ en https://cloudless.eox.at/documentation/license en https://developers.arcgis.com/documentation/mapping-apis-and-services/deployment/basemap-attribution/

## 4. Wisselen per gebied en overzoom

Een rasterbron in maplibre kent `bounds` (west, zuid, oost, noord), `minzoom` en `maxzoom` (zeker, stijlspecificatie van maplibre). Buiten `bounds` vraagt maplibre geen tegels op. Boven `maxzoom` vraagt het ook niets nieuws op maar rekt het de tegel van de hoogste zoom uit; de kaart blijft dus werken en wordt alleen waziger (zeker).

Voorstel voor de grenzen: Nederland ongeveer 3.2, 50.75, 7.25, 53.7 en Europees Frankrijk ongeveer -5.2, 41.3, 9.6, 51.1. Voorstel voor `maxzoom`: PDOK 19 (of 21 voor de 8 cm laag), IGN 19, EOX 13.

Een rechthoek is geen landsgrens. De rechthoek van Nederland bevat stukken België en Duitsland, die van Frankrijk stukken van zijn buren. Wat PDOK en IGN daar teruggeven (leeg, wit of een fout) is niet getest (onzeker). Omdat JPEG niet doorzichtig is, kan een witte tegel de wereldlaag eronder afdekken. Kies daarom per kaart één bron op het midden of de omlijsting van de route, in plaats van lagen te stapelen. De GR5 loopt ook door België, Luxemburg en een stukje Zwitserland; daar is alleen de 10 meter laag van EOX beschikbaar.

CORS: niet uit de koppen bevestigd (waarschijnlijk in orde, alle drie worden breed in webkaarten gebruikt). De bouwer test dit in de browser; faalt een tegel, dan moet de bestaande trap in `engine/routeMap.ts` terugvallen op Kaart.

Bron: https://maplibre.org/maplibre-style-spec/sources/#raster

## 5. Offline en precache

De licenties zelf staan kopiëren en bewaren toe: CC BY 4.0 (PDOK, EOX 2016) en de Licence Ouverte 2.0 (IGN) geven het recht om te verveelvoudigen, mits de naamsvermelding blijft staan (zeker voor de licentietekst).

De diensten zijn iets anders dan de data. Geen van de drie noemt een verbod op een cache in de browser (zeker dat het in de gelezen pagina's niet staat). IGN verbiedt gebruik dat de dienst hindert en kan toegang blokkeren (zeker). Tegels bewaren die de gebruiker zelf heeft bekeken is daarmee waarschijnlijk in orde. Vooraf een heel gebied of een hele route op alle zoomniveaus binnenhalen is massaal ophalen en hoort niet zonder na te vragen (waarschijnlijk).

Voorstel: alleen een runtime-cache in de service worker (eerst cache, dan netwerk), met een grens in aantal tegels en een verloop van bijvoorbeeld dertig dagen, en geen precache. De naamsvermelding moet ook offline zichtbaar blijven.

## Advies voor de bouwer

Bouw de schakelaar met één luchtfotobron per kaart, gekozen op de omlijsting van de route: binnen Nederland PDOK `Actueel_orthoHR`, binnen Frankrijk IGN `ORTHOIMAGERY.ORTHOPHOTOS`, anders EOX `s2cloudless_3857` van 2016, elk met eigen `maxzoom` en de naamsvermelding uit dit stuk in het attribution-veld. Zet de keuze Kaart als standaard en laat een mislukte luchtfototegel terugvallen op Kaart, zodat de kaart nooit leeg blijft. Bewaar tegels alleen in een begrensde runtime-cache en haal niets vooraf binnen.

## Wat nog onzeker is

De letterlijke naamsvermelding die PDOK en IGN willen zien; de voorstellen hier voldoen aan de licentie maar zijn eigen formulering. De limiet per seconde voor WMTS bij IGN en het huidige fair use beleid van PDOK. Wat PDOK en IGN teruggeven net buiten hun land, en of de CORS-koppen kloppen in de browser. Of de laag 2017 van EOX echt CC BY 4.0 is. Of de officiële hoogste zoom van de IGN-laag 19 is.
