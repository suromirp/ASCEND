# Meerdaagse tochten plannen

Datum: 2026-11-14. Scout, op de vraag van de eigenaar: "Zoek wat specialistischer dan Komoot voor meerdere dagen; ik weet niet zo goed hoe het werkt om goed te plannen." Hij gebruikt Komoot, loopt de GR5 door de Alpen met hutten en tent, heeft een Garmin en ASCEND.

Prijzen en functies zijn op 14 november 2026 nagekeken op de sites zelf waar dat lukte. Waar een site niet te openen was staat dat erbij. Niets hiervan is op een toestel geprobeerd.

## Wat er al stond en hier niet opnieuw staat

- Bivakregels per gebied (Haute-Savoie, Vanoise, Queyras, Mercantour, Écrins), water, bevoorrading, gas, vervoer, alleen onderweg en de paklijst: `docs/visie/GR5-reis en coaching.md`, deel 2b. De regels staan ook in de app (`src/data/gr5Bivouac.ts`).
- De 36 etappes met afstand, stijgen en dalen, en het spoor uit OpenStreetMap: `docs/beslissingen/2026-11-11-gr5-uit-osm.md`.
- De looptijdformule DIN 33466 met rekenvoorbeeld: `docs/onderzoek/Doelsoorten berg en buiten.md`. Ze zit al in `estimatedHikingMinutes`.
- Sneeuw op de passen: de kennistekst `src/data/knowledge/sneeuw-velden.ts`.
- Een koers naar het horloge: `docs/onderzoek/Garmin koers vooraf klaarzetten.md` en `docs/beslissingen/2026-11-10-route-naar-garmin-connect.md`.
- Hoogte, hitte, eten, voeten en de regel van een rustdag per 5 tot 7 etappes: `docs/onderzoek/Aanvullend onderzoek GR5 voorbereiding.md`.

Dit stuk voegt toe: de volgorde waarin je plant, de tempo-regels met hun grenzen, en het gereedschap naast Komoot.

## In het kort

1. Goed plannen is geen kwestie van een betere app maar van een vaste volgorde: eerst de dagen in uren rekenen, dan de slaapplek vastleggen, dan water en eten, dan per dag een uitweg. De app komt daarna.
2. Voor de GR5 heeft hij naast Komoot twee dingen nodig: de officiële GR-lijn op de IGN-kaart 1:25.000 die ook zonder bereik werkt (MaRando van de FFRandonnée, of Outdooractive Pro), en refuges.info voor hutten, onbemande hutten en waterpunten.
3. ASCEND heeft het etappeplan al. Wat ontbreekt is de laatste stap: een koers per dag van zijn eigen plan naar het horloge, en hutten en water bij de etappe.

## 1. Stappenplan voor wie nog nooit meerdere dagen plande

### Stap 1. Reken dagen in uren, niet in kilometers

Twee regels, allebei zonder pauzes en zonder rugzak.

- DIN 33466, de regel achter de tijden op wandelborden in de Duitstalige Alpen: 300 meter omhoog per uur, 500 meter omlaag per uur, 4 kilometer vlak per uur. Je rekent de tijd voor de hoogte en de tijd voor de afstand apart uit, halveert de kleinste en telt die bij de grootste op. De bron zegt er zelf bij wat de regel weglaat: pauzes, je vorm van de dag, weer, bagage, foto's en groepsgedrag ([DAV München en Oberland](https://www.alpenverein-muenchen-oberland.de/mitgliederservice/alpine-beratung-dav/bergwissen/tourenplanung-einstieg/woher-kommt-die-gehzeit-auf-den-wanderschildern)). Zeker voor de formule; de norm zelf is niet gelezen.
- Naismith (1892): een uur per 5 kilometer plus een uur per 600 meter stijgen. Oorspronkelijk een uur per drie mijl plus een uur per 2.000 voet, uit een tochtverslag in het Scottish Mountaineering Club Journal. Voor groepen noemt Langmuir 4 kilometer per uur plus een uur per 450 meter ([Wikipedia, Naismith's rule](https://en.wikipedia.org/wiki/Naismith%27s_rule), met de verwijzing naar Naismith 1892 en Langmuir 2013; de boeken zelf niet gelezen). Naismith zegt niets over dalen, en daarom past DIN beter in de Alpen.

Rekenvoorbeeld met DIN, de etappe van Peisey-Nancroix naar het Refuge du Col du Palet: 14,7 km en 1.297 m omhoog. Hoogte: 1.297 gedeeld door 300 is 4,3 uur, plus ongeveer 0,3 uur voor de korte daling, samen 4,6 uur. Afstand: 14,7 gedeeld door 4 is 3,7 uur. De kleinste gehalveerd is 1,8 uur. Samen ongeveer 6,5 uur lopen. Met pauzes ben je dan rond 8 uur onderweg.

Wat de rugzak doet. Er is geen onderbouwde opslag voor rugzakgewicht in deze regels; ze gaan uit van een gemiddelde wandelaar met dagrugzak. De energiekost groeit ongeveer mee met het totale gewicht (`docs/visie/Trainingswetenschap.md`, knelpunt 6). Voorstel, als aanname: reken met 14 kg 10 tot 20 procent bovenop de DIN-tijd en daarna nog een kwart voor pauzes. Beter dan elke opslag is zijn eigen gemeten klimtempo met rugzak, en dat rekent ASCEND al uit (`engine/climbPace.ts`).

Een redelijke dag voor een eerste meerdaagse tocht (expertadvies, geen onderzoek):

- 5 tot 7 uur looptijd volgens DIN, dus 7 tot 9 uur onderweg.
- De officiële etappes zijn gemiddeld ongeveer 16 km en ruim 800 m omhoog. Dat is niet toevallig een dag voor de meeste mensen.
- De eerste drie dagen korter dan de rest, en een rustdag of halve dag per 5 tot 7 etappes (regel B7 uit het eerdere onderzoek).
- Let op de daling net zo goed als op de stijging. Een dag met 1.600 m omlaag is voor de knieën zwaarder dan zijn kilometers doen denken.

### Stap 2. Leg per nacht de slaapplek vast voordat je de dag vastlegt

De slaapplek bepaalt waar een dag eindigt, niet andersom.

- Hutten. De meeste zijn open van 15 juni tot 15 september ([GTA, quand partir](https://www.grande-traversee-alpes.com/en/portfolio-item/periode-conseillee/)). Reserveren doe je per hut. De hutten van de FFCAM staan op [ffcam.fr](https://www.ffcam.fr/rechercher_refuge_chalet.html), met de beschikbaarheid per dag bij de hutten die online te boeken zijn ([FFRandonnée](https://www.ffrandonnee.fr/s-informer/actualites/montagne-une-nouvelle-plateforme-de-reservation-des-refuges), een bericht uit 2016, dus oud). Voor de Vanoise bestaat [refuges-vanoise.com](https://www.refuges-vanoise.com/), dat een rubriek Réserver heeft; welke hutten erop staan en hoe de aanbetaling werkt kon ik niet bevestigen. Veel hutten zijn particulier of van de gemeente en boek je per telefoon of mail. Rond 15 augustus is alles vol.
- Tent. Frankrijk kent twee woorden. Kamperen (meerdere nachten op een plek) mag met toestemming van de eigenaar en is verboden op onder meer beschermde plekken; een gemeente kan het verder beperken (Code de l'urbanisme, artikelen R111-32 tot R111-34, gelezen via samenvattingen en niet op Légifrance zelf). Bivak (een lichte tent, een nacht, van de avond tot de ochtend) staat niet in die wet ([Savoie, juridische analyse 2025](https://www.savoie.fr/upload/docs/application/pdf/2025-07/analyse_juridique_urbanisme.pdf)) en wordt per gebied geregeld. Matig zeker.
- Vanoise: in het hart van het park alleen op de bivakplek bij bepaalde bemande hutten, in de zomer, van 19.00 tot 8.00 uur, op reservering bij de hut. Mercantour: van 19.00 tot 9.00 uur, op meer dan een uur lopen van de parkgrens of de laatste weg, een nacht per plek. De bronnen en de andere gebieden staan in `docs/visie/GR5-reis en coaching.md`. Regels veranderen: nakijken in het voorjaar van 2027.
- Praktisch: boek eerst de nachten waar geen keuze is (het hart van de Vanoise, de reservaten in de Haute-Savoie), en vul de rest daaromheen.

### Stap 3. Zet per dag water en eten erbij

- Schrijf per dag op waar het laatste zekere water is voor de slaapplek, en waar de eerstvolgende winkel ligt. In het noorden is water ruim, in het zuiden liggen bronnen soms uren uit elkaar (zelfde visierapport).
- Reken met twee tot drie dagen eten tussen de dorpen, en koop gas in de grote plaatsen.
- ASCEND rekent per etappe al uit hoeveel je drinkt (`engine/stageWater.ts`).

### Stap 4. Geef elke dag een uitweg en plan lucht

- Per dag een punt waar je kunt afdalen naar een dorp met bus of trein. De officiële site noemt stations in Thonon, Les Houches, Landry, Modane, Briançon en Guillestre (zelfde visierapport).
- Een omkeerregel die je vooraf opschrijft, bijvoorbeeld: onweer voorspeld na 14.00 uur, dan voor 12.00 uur over de col of de lage variant.
- Twee tot drie reservedagen op een tocht van een maand, naast de rustdagen. Aanname uit de praktijk, geen onderzoek.

### Stap 5. Weer en sneeuw

- Vroeg in de zomer liggen er nog sneeuwresten in kommen en op noordhellingen ([GTA, quand partir](https://www.grande-traversee-alpes.com/en/portfolio-item/periode-conseillee/)). Er is geen vaste datum waarop een col sneeuwvrij is; het verschilt per jaar. In een gewoon jaar zijn de hoge passen begin juli grotendeels vrij, na een sneeuwrijke winter later (de kennistekst over sneeuwvelden, met bronnen). Met een start op 1 augustus is dit zelden een probleem, behalve bij de Col de Chavière op de GR55.
- Wie het weet: de hutwaard van de hut voor de col. Bel of vraag het de avond ervoor.
- Onweer komt in de zomer vooral laat op de middag: vroeg weg en de hoge col voor de middag over.
- Outdooractive Pro+ toont sneeuwhoogte op de kaart (zie deel 2). Open-Meteo geeft vriespunthoogte en sneeuwhoogte (`docs/onderzoek/Kansen met gegevens.md`).

### Stap 6. Wat je meeneemt om de weg te vinden

Drie lagen, omdat elke laag kan uitvallen.

- Horloge: een GPX per dag, niet een bestand voor de hele tocht. Geef elke koers een naam met het dagnummer, zodat ze op het horloge op volgorde staan. De Forerunner 255 heeft geen kaart; hij toont de lijn en trilt als je ervan afwijkt (`Garmin koers vooraf klaarzetten.md`). Hoeveel koersen er tegelijk op passen is niet bevestigd; een forumbericht noemt 100 voor een Forerunner 965. Zet ze er thuis op en kijk op het horloge of ze er staan.
- Telefoon: een app met de IGN-kaart 1:25.000, thuis binnengehaald voor het hele traject, in vliegtuigstand te gebruiken.
- Papier: een kaart of gids met kaartuitsneden en een kompas. Een telefoon valt, wordt nat of raakt leeg. De topoguides van de FFRandonnée en de gids van Cicerone hebben kaartuitsneden per etappe; welke delen hij nodig heeft is niet nagekeken.

## 2. Gereedschap naast Komoot

Eerst wat Komoot zelf doet, als maat. Komoot Premium heeft een meerdaagse planner die een route in etappes knipt en slaapplekken voorstelt, offline kaarten en weer op de route ([komoot.com/premium](https://www.komoot.com/premium)). De prijs staat niet op die pagina; andere sites noemen ongeveer 59,99 euro per jaar (niet bevestigd). Voor nieuwe gebruikers vraagt Komoot Premium om een route naar een toestel te sturen; een GPX downloaden kan met een ontgrendelde regio of Premium (Komoot-hulppagina's en [DC Rainmaker, maart 2025](https://dcrainmaker.com/2025/03/komoots-expanded-paywalls-trying-to-make-sense-of-it.html), via zoekresultaten). Wat Komoot mist voor de GR5: de officiële IGN-kaart, de officiële GR-lijn met omleidingen, en betrouwbare gegevens over hutten en water.

### De officiële GR-bronnen

- Grande Traversée des Alpes, de officiële site. Per etappe afstand, stijgen, dalen, tijd en een GPX; meldt omleidingen. Gratis. Geen app en geen kaart zonder bereik. GPX naar Garmin: ja, via Garmin Connect. Voor ASCEND: geen API gevonden en de licentie van de GPX is onduidelijk (besluit van 11 november). Zeker voor de inhoud, uit het eerdere rapport.
- MonGR met GR @ccess (FFRandonnée). Alle GR-lijnen op de IGN-kaart 1:25.000, je eigen stuk tussen twee punten kiezen, gegevens over slaapplekken langs de GR, export als GPX ([mongr.fr](https://www.mongr.fr/page/gr-access)). De winkel toont twee prijsparen, 27 euro (leden 20) en 14 euro (leden 12), bij de keuze Annuel of Mensuel; welke bij welke hoort was op de pagina niet te zien ([boutique.ffrandonnee.fr](https://boutique.ffrandonnee.fr/gr-access)). Een website om thuis te plannen, niet voor onderweg. Voor ASCEND: geen openbare API gevonden; alleen het GPX-bestand dat de gebruiker zelf exporteert.
- MaRando (FFRandonnée). De app is gratis, met GPX-import en routes die je binnenhaalt voor gebruik zonder bereik en als GPX of pdf kunt opslaan. De IGN TOP 25 als kaartlaag kost 13,99 euro per jaar ([FFRandonnée](https://www.ffrandonnee.fr/s-informer/actualites/marando-l-application-de-la-ffrandonnee-disponible-sur-les-stores) en de App Store, via zoekresultaten; de prijs staat ook in een bericht uit 2023, een prijspagina van 2026 is niet geopend). Beter dan Komoot: de officiële kaart met de GR-markering, voor weinig geld. Voor ASCEND: geen API gevonden.
- IGN Rando bestaat niet meer. De site ignrando.fr stopte op 20 november 2025; de app wordt vervangen door WeTrek, en de FFRandonnée verwijst gebruikers naar MaRando ([FFRandonnée, 6 januari 2026](https://www.ffrandonnee.fr/s-informer/actualites/fermeture-de-l-application-ignrando-comment-transferer-vos-donnees-sur-marando)). De prijs van WeTrek Plus is niet te bevestigen.

### Hutten en water

- refuges.info. Vrijwilligersbestand van bemande hutten, onbemande hutten (cabanes), gîtes en meer, met commentaar van wandelaars. Gratis. Beter dan Komoot: het zegt of een cabane een kachel en slaapplaatsen heeft, en mensen melden of een bron loopt. Export als GPX, KML, GeoJSON of CSV. Er is een openbare API zonder sleutel, alleen lezen: `/api/bbox`, `/api/massif` en `/api/point`, standaard hooguit 250 punten per vraag, onder de licentie CC BY-SA 2.0 ([refuges.info, API](https://www.refuges.info/api/doc/)). Een grens per seconde staat er niet. De volledige lijst van soorten punten (bijvoorbeeld waterpunten) stond niet op de pagina. Dit is de bron die ASCEND het makkelijkst via een adapter kan lezen. Zeker voor wat op de pagina staat.
- De reserveringssites van de hutten: zie stap 2. Geen API gevonden, en ASCEND hoeft niet te boeken.

### Kaart-apps

- Outdooractive. Pro kost 29,99 euro per jaar en geeft officiële topografische kaarten en offline opslaan; Pro+ kost 59,99 euro per jaar en voegt onder meer sneeuwhoogte op de kaart en 3D toe; koppelen met Garmin zit in het gratis deel ([outdooractive.com, plannen](https://www.outdooractive.com/en/membership/plans.html); het precieze bedrag verschijnt bij het afrekenen). Dat de IGN-kaart van Frankrijk in Pro zit staat in de App Store en op een Frans forum, niet op de prijspagina. Beter dan Komoot: de officiële kaart, en sneeuwhoogte. Voor ASCEND: er bestaat een API voor zakelijke partners; niet nagekeken en niet passend zonder sleutel.
- Mapy.com. Gratis kaart-app met wandellijnen uit OpenStreetMap, GPX-import en export, en offline kaarten van een land in het gratis deel; Premium geeft onbeperkt offline kaarten ([help.mapy.com](https://help.mapy.com/premium/subscription-plan/) en de App Store, via zoekresultaten). De jaarprijs staat alleen in het koopscherm; de Poolse App Store noemt 18,99 dollar. Beter dan Komoot: gratis en snel, goed als tweede kaart. Geen IGN. Voor ASCEND: er is een Mapy API voor kaarten, met sleutel; niet verder nagekeken.
- Hiiker. Heeft de GR5 als route, met een knop Download, Send to Garmin, een kaart om te printen en een planner die dagen maakt op je tempo ([hiiker.app, GR5](https://hiiker.app/hikes/france/thonon-les-bains/gr-5)). PRO+ kost 20,99 dollar per jaar als aanbieding (doorgestreept 29,99) of 7,37 dollar per maand ([hiiker.app, prijzen](https://hiiker.app/pricing)). Let op: de pagina toont de hele GR5 (1.666 km), niet alleen het Alpendeel, en noemt de IGN-kaart niet. Of GPX in het gratis deel zit is niet bevestigd.
- Gaia GPS. Kaart-app uit de Verenigde Staten met veel kaartlagen en offline gebruik in Premium ([gaiagps.com](https://www.gaiagps.com/premium/)). De prijs was op de site niet te openen; andere sites noemen ongeveer 60 dollar per jaar (niet bevestigd). Of de IGN-kaart erin zit is niet bevestigd. Geen reden om dit boven de Franse bronnen te kiezen.
- CalTopo. Sterk in eigen kaarten maken en hellingshoek, gericht op Noord-Amerika. De prijspagina was niet te lezen; het eigen blog noemt 20 dollar per jaar voor de mobiele laag (een bericht uit 2020). Voor de Alpen geen meerwaarde gevonden.
- FarOut (vroeger Guthook). Een gids per route met waterpunten en commentaar van lopers, precies wat je voor een lange tocht wilt. Er is een gids voor de Tour du Mont Blanc (14,99 euro in Europese App Stores), maar een gids voor de GR5 heb ik niet gevonden. Niet bruikbaar voor deze tocht, tenzij hij er in de app zelf wel staat.
- Bergfex. Oostenrijkse app, Pro volgens de eigen pagina 35,99 euro per jaar (andere bronnen noemen 24 euro); offline kaarten alleen met Pro. Sterk in Oostenrijk; of de IGN-kaart erin zit is niet bevestigd.
- Garmin Explore. De app van Garmin voor kaarten, verzamelingen en de inReach. Garmin zegt zelf dat Forerunner-horloges beperkt werken met koersen uit Explore, en gebruikers melden dat koersen niet op het horloge verschijnen (Garmin-forum, via zoekresultaten). Voor een Forerunner is Garmin Connect de weg. Explore wordt pas nuttig met een inReach.

## 3. Advies

Naast Komoot, voor de GR5:

1. MaRando met de IGN TOP 25 (13,99 euro per jaar) als kaart op de telefoon, met het etappe-GPX van de officiële site erin. Wil hij ook sneeuwhoogte en een app in het Engels of Duits, dan is Outdooractive Pro of Pro+ het alternatief. Een van de twee, niet allebei.
2. refuges.info voor hutten, cabanes en waterpunten, naast de reserveringssites van de hutten zelf.

Komoot kan blijven voor wat het goed doet: thuis schuiven met een route en zien hoe lang een variant is. De officiële lijn en de kaart komen uit de Franse bronnen.

Wat ASCEND al doet: de 36 etappes met officiële cijfers en het spoor, zijn eigen plan per etappe (slaapplek, samenvoegen, rustdag), het bivakregime van het gebied, water per etappe, de looptijd op zijn eigen klimtempo, de dag naast zijn beste dag, en waar hij op de etappe is (`components/StageSheet.tsx`, `engine/routePlan.ts`, `engine/climbPace.ts`, `engine/stageWater.ts`, `engine/stagePosition.ts`). Dat is het deel dat geen van de apps hierboven heeft: de tocht naast wat hij aankan. ASCEND hoeft geen kaart, geen routeplanner en geen boekingssite te worden.

Drie kansen, elk als voorstel:

1. Een koers per dag van je eigen plan: uit het spoor dat er al is en `engine/gpx.ts` een GPX per loopdag maken (samengevoegde etappes als een koers, met het dagnummer in de naam) en die via de bestaande knop Naar Garmin Connect aanbieden.
2. Hutten, cabanes en water bij de etappe: een adapter die refuges.info een keer per etappe leest (zonder sleutel, met naamsvermelding CC BY-SA), het resultaat bewaart voor gebruik zonder bereik en in het etappeblad toont, zonder iets te plannen.
3. Een eigen GPX inlezen als variant: een bestand uit Komoot, MonGR of de officiële site als dag in het plan zetten, waarbij ASCEND alleen afstand, stijgen, dalen en de looptijd uitrekent, zodat de GR55 of GR52 in het plan kan zonder dat de app een routeplanner wordt.

Kans 2 vraagt een nieuwe, optionele functie op `DataSourceAdapter` (`src/integrations/types.ts`), want die kent nu alleen metingen en activiteiten, geen plekken. Kans 1 en 3 hebben geen netwerk nodig.

## Tot slot

Wat het onderzoek zegt. Een dag plan je in uren met een vaste regel (DIN 33466: 300 m omhoog, 500 m omlaag en 4 km per uur), en die regel laat pauzes en de rugzak weg. De slaapplek stuurt de dagindeling, zeker waar bivak alleen op aangewezen plekken mag. De beste gegevens voor de GR5 zitten niet in een internationale app maar in de Franse bronnen: de officiële etappesite, de kaart van IGN via de FFRandonnée, en refuges.info.

Wat het betekent voor de app. ASCEND heeft het etappeplan en de vergelijking met zijn eigen kunnen al, en dat moet zo blijven. De logische aanvulling is klein: een koers per dag naar het horloge, hutten en water uit refuges.info, en een eigen GPX als variant. Elk daarvan is een voorstel; geen van de drie verandert zijn planning.

Wat nog onzeker is. De opslag voor de rugzak op de looptijd is een aanname. Welke prijs van GR @ccess per maand en welke per jaar is, en de prijzen van Komoot, Gaia, CalTopo, Mapy en WeTrek zijn niet op de eigen site bevestigd. Of Outdooractive en Hiiker de IGN-kaart tonen staat niet op hun prijspagina. Hoeveel koersen op de Forerunner 255 passen en of een koers van een lange dag onverkort overkomt is niet getest. Hoe refuges.info omgaat met veel vragen achter elkaar staat nergens. De bivakregels en de reserveringssites voor 2027 moeten in het voorjaar opnieuw bekeken worden. Dit is geen medisch advies; bij pijn of klachten onderweg of in de voorbereiding: naar een arts of fysiotherapeut.

## Bronnen

Tempo en dagindeling
- DAV München en Oberland, waar de looptijd op de borden vandaan komt: https://www.alpenverein-muenchen-oberland.de/mitgliederservice/alpine-beratung-dav/bergwissen/tourenplanung-einstieg/woher-kommt-die-gehzeit-auf-den-wanderschildern
- Wikipedia, Naismith's rule (verwijst naar Naismith 1892, Scottish Mountaineering Club Journal 2(3), 136, en Langmuir 2013, Mountaincraft and Leadership): https://en.wikipedia.org/wiki/Naismith%27s_rule
- GTA, quand partir: https://www.grande-traversee-alpes.com/en/portfolio-item/periode-conseillee/

Slapen
- FFCAM, hutten zoeken en boeken: https://www.ffcam.fr/rechercher_refuge_chalet.html
- FFRandonnée over het platform van de FFCAM (2016): https://www.ffrandonnee.fr/s-informer/actualites/montagne-une-nouvelle-plateforme-de-reservation-des-refuges
- Refuges Vanoise: https://www.refuges-vanoise.com/
- Savoie, juridische analyse kamperen en bivak (2025): https://www.savoie.fr/upload/docs/application/pdf/2025-07/analyse_juridique_urbanisme.pdf
- Bivakregels per gebied: de bronnenlijst van `docs/visie/GR5-reis en coaching.md`

Gereedschap (alles gezien op 14 november 2026)
- Komoot Premium: https://www.komoot.com/premium
- DC Rainmaker over de betaalmuren van Komoot (maart 2025): https://dcrainmaker.com/2025/03/komoots-expanded-paywalls-trying-to-make-sense-of-it.html
- MonGR, GR @ccess: https://www.mongr.fr/page/gr-access en https://boutique.ffrandonnee.fr/gr-access
- FFRandonnée, MaRando: https://www.ffrandonnee.fr/s-informer/actualites/marando-l-application-de-la-ffrandonnee-disponible-sur-les-stores
- FFRandonnée, einde van IGNrando (6 januari 2026): https://www.ffrandonnee.fr/s-informer/actualites/fermeture-de-l-application-ignrando-comment-transferer-vos-donnees-sur-marando
- refuges.info, API: https://www.refuges.info/api/doc/
- Outdooractive, plannen: https://www.outdooractive.com/en/membership/plans.html
- Mapy.com, Premium: https://help.mapy.com/premium/subscription-plan/
- Hiiker, prijzen en de GR5: https://hiiker.app/pricing en https://hiiker.app/hikes/france/thonon-les-bains/gr-5
- Gaia GPS Premium: https://www.gaiagps.com/premium/
- CalTopo, blog over de abonnementen (2020): https://blog.caltopo.com/2020/12/
- FarOut, Tour du Mont Blanc: https://shop.faroutguides.com/products/tour-du-mont-blanc-map
- Bergfex, app: https://www.bergfex.com/apps/touren/deeplink/entrypoint/search
- Garmin-forum, Forerunner en koersen in Explore: https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-explore-android/361774/what-does-limited-functionality-with-courses-feature-mean-for-forerunner-devices
