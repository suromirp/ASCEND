# Luchtfoto op de kaart

Datum: 2026-11-11
Status: aangenomen

## Besluit

Op de kaart in de Briefing en het blad Route staat rechtsboven een schakelaar Kaart of Luchtfoto. Luchtfoto is een stand van de instelling Ondergrond van de kaart: Donker (advies), Licht, Luchtfoto, Geen. De schakelaar wisselt snel tussen de gekozen kaart en Luchtfoto en wordt onthouden. Eén luchtfoto per kaart: PDOK in Nederland, IGN in Frankrijk, anders EOX (Sentinel-2 cloudless 2016). Laadt de luchtfoto niet, dan staat de kaart er met één regel.

## Reden

- De eigenaar wil voor een buitenloop of tocht zien hoe het terrein eruitziet: bos, akker, rots, water. De schakelaar staat op de kaart zelf, omdat je hem daar nodig hebt, vlak voor je gaat; nergens anders in de app.
- Bronkeuze in `src/integrations/aerialImagery.ts#aerialSourceFor`, puur en getest. Op 11 november getest met echte tegels: PDOK en IGN geven buiten hun land en op zee een witte tegel, geen fout. Een rechthoek om het land zou een route over de grens dus half wit maken. Daarom vlakken aan de binnenkant van de grens, en alles wat de kaart in beeld brengt (lussen, startpunt, je plek) moet met een rand in één vlak liggen. Twijfel geeft EOX: wazig, maar nooit half leeg.
- De vlakken (herstel na review 11 november; de eerste versie was met de hand getekend en lag op een tiental plekken in België, Duitsland, Zwitserland, Italië en Spanje) komen uit Natural Earth 1:10m (publiek domein), uitgerekend in EPSG:3035 met shapely. Frankrijk: het vasteland zonder meren, 4,5 km naar binnen, vereenvoudigd binnen 1,5 km, dus minstens 3 km van elke grens, kust en meeroever. Nederland: het land met een gesloten zoom van 1,5 km (Waddenzee en IJsselmeer horen erbij, de laag van 25 cm dekt water), minus 2,9 km rond België en Duitsland, vereenvoudigd binnen 400 m, dus minstens 2,5 km van de landsgrens; het steekt niet meer in Duitsland of België in. De enclaves bij Baarle zijn een gat in het vlak.
- Nagemeten met echte tegels: elke kilometer langs elke rand een tegel op zoom 13 van PDOK of IGN, wit is meer dan de helft van de pixels rond het punt met alle kanalen boven 250. De eerste meting (alleen hoekpunten, zoom 15) vond één wit punt, op het Meer van Genève bij Évian; daarom gaan de meren eruit. Uitslag van de laatste meting: 5699 punten langs de randen, geen wit; vijf punten gaven bij de eerste poging een fout bij ophalen en hadden bij een tweede poging gewoon beeld.
- De rand: een kilometer, of een kwart van de langste zijde van de route als dat meer is (`aerialMarginKm`), omdat Alles in beeld naast een lange smalle route meer laat zien. Een grens die blijft: op een brede telefoon kan aan de korte kant van een lange route nog meer in beeld komen; daar kan het aan de rand wit zijn.
- PDOK: de laag `Actueel_ortho25` (25 cm, zomer), niet `Actueel_orthoHR` (8 cm) uit het onderzoek. De laag van 8 cm is wit op de Waddenzee, het IJsselmeer en de zee voor de kust; die van 25 cm niet. Een zomerfoto met blad laat ook beter zien waar je in het bos loopt.
- Zuid-Limburg is een eigen vlak; een route van Zuid-Limburg naar Brabant gaat door België en krijgt EOX. Bij de Mont Blanc ligt de grens op de kam: een route naar de top krijgt EOX.
- Gevolg: binnen een paar kilometer van een grens, een Franse kust of een Frans meer (Annecy, Bourget, Genève) krijg je EOX. Bewust: nooit half wit gaat voor scherpte.
- De lus blijft mint met de donkere rand, ook als Ondergrond Licht is; de foto is iets gedempt (`raster-brightness-max` 0,85). Geen kleur buiten de tokens.
- De schakelaar heeft geen mint: de gekozen kant is lichter en vet. Mint blijft van de lus. Elke knop is zelf 44 px hoog (de rand komt erbij), tekst 14 px; de korte naamsvermelding heeft een raakvlak van 44 bij 44. De ruimte bovenaan voor Alles in beeld gaat van 36 naar 60 px, zodat de lus niet onder de schakelaar valt (`FIT_PADDING`; de test die de oude waarde letterlijk noemde is daarom aangepast).
- Naamsvermelding: per bron, in de hoek van de kaart. De volle tekst van EOX is drie regels op 412 px en bedekt de lus, dus eerst een korte vorm (`short`) en na een tik de volle tekst met link, zoals de compacte vermelding van MapLibre. De volle teksten komen uit het onderzoek; die van EOX is letterlijk.
- Terugval: een tegelfout (CORS, 404, offline) of geen tegel binnen vier seconden (`AERIAL_LIMIT_MS`, korter dan de zes van de kaart, zodat je niet twee keer zes seconden wacht) gaat naar de trap van Kaart. In het ergste geval (ook de kaart en OpenStreetMap antwoorden niet) duurt het tot het effen vlak 4 plus 6 plus 6 seconden; de uitleg noemt die getallen uit de constanten. Hij gaat met de regel "De luchtfoto laadt niet. Je ziet de kaart." (zonder netwerk: "Zonder netwerk is er geen luchtfoto.", want dan zie je het effen vlak) De instelling blijft Luchtfoto; een tik op Luchtfoto probeert het opnieuw. Zonder netwerk probeert hij de luchtfoto wel (de cache kan tegels hebben) en valt anders naar het effen vlak. CORS is in Chromium getest: alle drie geven `Access-Control-Allow-Origin`.
- Cache: alleen een runtime-cache in de service worker, per host een eigen cache van hoogstens 300 tegels en 30 dagen (`AERIAL_CACHE`), CacheFirst, alleen status 200. Geen precache en nooit vooraf ophalen. Dit is een bewuste uitzondering op "tegels nooit in de service worker" uit het besluit van de kaart, alleen voor de luchtfoto.
- Eén instelling (Pathfinder): Ondergrond van de kaart heeft vier standen. Bewaard in twee velden, `routeMapBase` (Donker, Licht, Geen) en `routeMapPhoto` (Luchtfoto aan), gelezen door `engine/routeMap.ts#resolveMapGround`: zo weet de schakelaar naar welke kaart hij terug moet, en leest een back-up van vóór de samenvoeging vanzelf goed. Geen wint: dan geen tegels en geen schakelaar.
- Privacy: de tegels gaan om wat er in beeld staat, dus om je lus en je plek. De zin "Met Luchtfoto haalt de kaart tegels bij PDOK, IGN of EOX, afhankelijk van waar je loopt." staat daarom in de eerste vraag, de uitleg van Route voorstellen en Ondergrond, en de zoektekst, uit één constante (`PHOTO_SOURCES_LINE`).
- Een oude back-up zonder het veld leest als de kaart die erin staat; het veld is optioneel, dus geen migratie. Een onbekende waarde valt weg bij het inlezen (`backupClean.ts`).

## Alternatieven

- Per tegel kiezen (witte tegels van PDOK of IGN vervangen door EOX via een eigen protocol in MapLibre): dekt de kust en de grens beter, maar halve tegels aan een kust blijven half wit en het is veel meer code. Niet nu.
- De lagen stapelen (EOX onder PDOK): JPEG is niet doorzichtig, dus de witte tegel dekt EOX af.
- De schakelaar als Segmented onder de kaart: duwt de hoofdknop en de vier vakken van de Briefing omlaag.
- Esri World Imagery: sleutel en licentie, valt af (onderzoek).

## Bron

`docs/onderzoek/Luchtfoto op de kaart.md`; eigen tests met tegels op 11 november 2026 (wit buiten het land en op zee, de laag van 25 cm dekt water, CORS-koppen); Natural Earth 1:10m admin 0 en lakes (publiek domein); de meting van de vlakken met echte tegels (5699 punten, geen wit); review van Warden met de witte plekken van de eerste versie. Backlog, Bouwrij, "Luchtfoto op de kaart".

## Vervangt

Niets. Vult `2026-11-11-route-kaart.md` aan: daar blijven de kaarttegels buiten de service worker; alleen de luchtfoto heeft een begrensde runtime-cache.

## Terugdraaien

Haal de schakelaar uit `RouteMap.tsx` en de stap `aerial` uit `stagesFor`; `routeMapPhoto` mag in back-ups blijven staan (wordt dan genegeerd). Haal de runtime-cache voor `AERIAL_HOSTS` uit `vite.config.ts`.
