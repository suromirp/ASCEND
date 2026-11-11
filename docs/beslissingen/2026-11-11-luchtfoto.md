# Luchtfoto op de kaart

Datum: 2026-11-11
Status: aangenomen

## Besluit

Op de kaart in de Briefing en het blad Route staat rechtsboven een schakelaar Kaart of Luchtfoto. De keuze wordt onthouden in de instelling Kaart of luchtfoto (`routeMapPhoto`, advies Kaart). Eén luchtfoto per kaart: PDOK in Nederland, IGN in Frankrijk, anders EOX (Sentinel-2 cloudless 2016). Laadt de luchtfoto niet, dan staat de kaart er met één regel.

## Reden

- De eigenaar wil voor een buitenloop of tocht zien hoe het terrein eruitziet: bos, akker, rots, water. De schakelaar staat op de kaart zelf, omdat je hem daar nodig hebt, vlak voor je gaat; nergens anders in de app.
- Bronkeuze in `src/integrations/aerialImagery.ts#aerialSourceFor`, puur en getest. Op 11 november getest met echte tegels: PDOK en IGN geven buiten hun land en op zee een witte tegel, geen fout. Een rechthoek om het land zou een route over de grens dus half wit maken. Daarom grove vlakken aan de binnenkant van de grens, en alles wat de kaart in beeld brengt (lussen, startpunt, je plek) moet met een kilometer rand in één vlak liggen. Twijfel geeft EOX: wazig, maar nooit half leeg.
- PDOK: de laag `Actueel_ortho25` (25 cm, zomer), niet `Actueel_orthoHR` (8 cm) uit het onderzoek. De laag van 8 cm is wit op de Waddenzee, het IJsselmeer en de zee voor de kust; die van 25 cm niet. Een zomerfoto met blad laat ook beter zien waar je in het bos loopt.
- Het Franse vlak blijft een paar kilometer van de kust, want IGN is ook wit op zee. Zuid-Limburg is een eigen vlak; een route van Zuid-Limburg naar Brabant gaat door België en krijgt EOX. Bij de Mont Blanc ligt de grens op de kam: een route naar de top krijgt EOX.
- Gevolg van de krappe vlakken (review van Warden): rond Maastricht, Venlo en Kerkrade, en aan de Franse kust (Normandië, Bretagne, Côte d'Azur, Marseille, Duinkerken) krijg je EOX. Bewust: nooit half wit gaat voor scherpte. Strakkere vlakken kunnen later.
- De lus blijft mint met de donkere rand, ook als Ondergrond Licht is; de foto is iets gedempt (`raster-brightness-max` 0,85). Geen kleur buiten de tokens.
- De schakelaar heeft geen mint: de gekozen kant is lichter en vet. Mint blijft van de lus. Tikdoel 44 px, tekst 14 px. De ruimte bovenaan voor Alles in beeld gaat van 36 naar 60 px, zodat de lus niet onder de schakelaar valt (`FIT_PADDING`; de test die de oude waarde letterlijk noemde is daarom aangepast).
- Naamsvermelding: per bron, in de hoek van de kaart. De volle tekst van EOX is drie regels op 412 px en bedekt de lus, dus eerst een korte vorm (`short`) en na een tik de volle tekst met link, zoals de compacte vermelding van MapLibre. De volle teksten komen uit het onderzoek; die van EOX is letterlijk.
- Terugval: een tegelfout (CORS, 404, offline) of geen tegel binnen zes seconden gaat naar de trap van Kaart, met de regel "De luchtfoto laadt niet. Je ziet de kaart." De instelling blijft Luchtfoto; een tik op Luchtfoto probeert het opnieuw. Zonder netwerk probeert hij de luchtfoto wel (de cache kan tegels hebben) en valt anders naar het effen vlak. CORS is in Chromium getest: alle drie geven `Access-Control-Allow-Origin`.
- Cache: alleen een runtime-cache in de service worker, per host een eigen cache van hoogstens 300 tegels en 30 dagen (`AERIAL_CACHE`), CacheFirst, alleen status 200. Geen precache en nooit vooraf ophalen. Dit is een bewuste uitzondering op "tegels nooit in de service worker" uit het besluit van de kaart, alleen voor de luchtfoto.
- Bij Ondergrond Geen haalt de kaart geen tegels op; dan is er ook geen schakelaar.
- Privacy: de tegels gaan om wat er in beeld staat, dus om je lus en je plek. PDOK, IGN en EOX staan daarom in de eerste vraag, de uitleg van Route voorstellen en de zoektekst van de instelling.
- Een oude back-up zonder het veld leest als Kaart; het veld is optioneel, dus geen migratie. Een onbekende waarde valt weg bij het inlezen (`backupClean.ts`).

## Alternatieven

- Per tegel kiezen (witte tegels van PDOK of IGN vervangen door EOX via een eigen protocol in MapLibre): dekt de kust en de grens beter, maar halve tegels aan een kust blijven half wit en het is veel meer code. Niet nu.
- De lagen stapelen (EOX onder PDOK): JPEG is niet doorzichtig, dus de witte tegel dekt EOX af.
- De schakelaar als Segmented onder de kaart: duwt de hoofdknop en de vier vakken van de Briefing omlaag.
- Esri World Imagery: sleutel en licentie, valt af (onderzoek).

## Bron

`docs/onderzoek/Luchtfoto op de kaart.md`; eigen tests met tegels op 11 november 2026 (wit buiten het land en op zee, de laag van 25 cm dekt water, CORS-koppen). Backlog, Bouwrij, "Luchtfoto op de kaart".

## Vervangt

Niets. Vult `2026-11-11-route-kaart.md` aan: daar blijven de kaarttegels buiten de service worker; alleen de luchtfoto heeft een begrensde runtime-cache.

## Terugdraaien

Haal de schakelaar uit `RouteMap.tsx` en de stap `aerial` uit `stagesFor`; `routeMapPhoto` mag in back-ups blijven staan (wordt dan genegeerd). Haal de runtime-cache voor `AERIAL_HOSTS` uit `vite.config.ts`.
