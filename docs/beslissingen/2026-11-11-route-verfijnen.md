# Route voorstellen verfijnd: melding bij geen hoogte, te kort telt als mislukt, startpunt precies

Datum: 2026-11-11
Status: aangenomen

## Besluit

Route voorstellen kiest betere lussen. Een lus die de hoogtemeters van de training duidelijk niet haalt, zegt dat in één regel met het droge feit over de buurt en wat de lus wel heeft. Een lus die meer dan 10 procent korter is dan de training telt als mislukt: de planner zoekt verder en lukt het niet, dan staat de afstand er eerlijk bij. Bij Precies begint en eindigt de lus op het startpunt zelf, en zoekt ook de kaart om dat punt. Een helling zonder bekende hoogte telt niet meer als helling.

## Reden

De eigenaar na een proef op zijn telefoon (11 november): hij zet niet altijd de juiste route, hij meldt niet dat er geen hellingen zijn, soms is de afstand te kort, en de lus begint ongeveer bij de deur maar dat mag verfijnder. Het is verfijnen, geen herbouw: de twee lussen, de bronnen, de grens van drie aanroepen per soort lus en de tijdgrens blijven.

## Wat er gevonden is en wat er veranderde

Te kort:

- De avontuurlijke lus dunde de punten uit tot de geschatte lengte onder de afstand van de training zat, ook in een tweede en derde poging. De schatting kon dus nooit boven de afstand uitkomen. Kwam de eerste lus te kort uit, dan gaf een groter bereik dezelfde punten en stopte de planner. Nu mikt elke poging op een lengte die meegroeit met wat de vorige lus te kort kwam (`aim` in `adventureVias`), en net boven de afstand (3 procent).
- Lagen alle hellingen en paden dicht bij het startpunt, dan was er niets om de lus mee te verlengen. Nu komen er in het grootste gat tussen twee richtingen een of twee punten bij, zo ver weg dat de geschatte lengte past (`padVias`). De hellingen blijven in de lus. Is de lijst al vol (acht punten), dan maken de punten met de laagste waarde plek, tot er zes over zijn; zonder dat bleef juist in heuvelland, waar de lijst vol is, de lus te kort (gevonden in de review: acht paden op 400 m gaven 2,9 km bij 10 km).
- Bij een vlakke training lag het laatste keerpunt van Simpel op de helft gedeeld door 1,3. Waren de wegen rechter dan die schatting, dan was de lijn korter dan de helft en de lus te kort. Het laatste keerpunt ligt nu hemelsbreed op de volle helft: de weg ernaartoe is nooit korter, en de lus wordt op de helft afgeknipt.
- De grens: `SHORT_LIMIT` is 10 procent onder de afstand (de eis van de eigenaar). Langer mag tot de bestaande 12 procent (`CLOSE_ENOUGH`). Een lus waarvan de afstand past gaat altijd voor op een die niet past; daarna telt de bestaande score. De planner stopt pas met vragen als de afstand past.
- Blijft de lus na de aanroepen te kort, dan staat er "8,1 km, korter dan de 10 km van je training." Binnen de 10 procent staat er hoeveel korter, en dat tot 10 procent korter goed genoeg is.

Geen hoogtemeters mogelijk:

- Elke lus krijgt een veld `notice` als de training hoogtemeters vraagt (vanaf 20 m) en de lus er minder dan 75 procent van haalt. De tekst: wat er op de kaart lag en wat de lus heeft, op tien meter zoals de feiten van de lus, bijvoorbeeld "Geen heuvels binnen 3 km. Deze lus stijgt 10 m; de training vraagt 120 m." Liggen er wel hellingen, dan "De hoogste helling dichtbij ligt 18 m boven je plek." Daar staat dichtbij en niet binnen 3 km, omdat alleen de twaalf dichtstbijzijnde heuvels een hoogte krijgen. Kent de kaart alleen hellingen zonder hoogte, dan "Geen helling met een bekende hoogte binnen 3 km." Antwoordde de kaart niet, dan alleen de zin over de lus.
- "Geen heuvels" staat er alleen als de kaart geen enkele helling gaf. Liggen er hellingen die lager zijn dan je plek of minder dan 10 m erboven (wie op een heuvel woont), dan staat er "Geen helling dichtbij die 10 m of meer boven je plek ligt." De lus kan dan best stijgen: je daalt eerst en klimt terug.
- De grens van 75 procent is de bestaande `SHORT_ASCENT`. Onderbouwing: ASCEND telt hoogtemeters met een dode band van 5 m en een hoogtemodel zit er in bos een paar meter naast, dus een verschil tot ongeveer een kwart kan meetruis zijn. Onder de 75 procent is het geen ruis meer. Dezelfde grens bepaalt al wanneer de vervanger (trap, brug, loopband) verschijnt, dus de twee regels spreken elkaar niet tegen.
- De melding staat bij de lus, tussen de regels die er al stonden, en vervangt "Minder dan de hoogtemeters van je training". Het paneel hoefde daarvoor niet te veranderen. Bovenaan staat dan alleen nog waar je de hoogte anders haalt, niet twee keer hetzelfde feit.
- Een training zonder hoogtemeters krijgt nooit een melding.

Startpunt preciezer. Vier oorzaken gevonden:

- De routeplanner begint op het pad of de weg het dichtst bij het gevraagde punt, niet op het punt zelf. Bij een proef met een openbaar punt lag dat 39 en 76 m verder. Nu krijgt de lus bij Precies een recht stukje van het startpunt naar dat pad en aan het eind weer terug (`anchorLine`), vanaf 10 m verschil. Het stukje telt mee in de afstand. Ligt het pad 100 m of verder, dan staat dat erbij, met dat het stuk een rechte lijn is.
- De heuvels en paden werden gezocht om de afgeronde plek, tot ongeveer 700 m van het startpunt, en de hoogte van een heuvel werd vergeleken met de hoogte van die afgeronde plek. In heuvelland scheelt dat tientallen meters, en dan valt een echte helling af of telt een bult mee. Bij Precies zoekt OpenStreetMap nu om het startpunt zelf (vier decimalen) en is de hoogte die van het startpunt. De cache heeft daarvoor een eigen plek naast de afgeronde.
- Wat daardoor de deur uit gaat: het startpunt op vier decimalen gaat naar OpenStreetMap en ook naar Open-Meteo, dat de hoogte van het punt en van de heuvels geeft. Dat mag volgens `2026-11-11-locatie-en-kaart.md`, en het staat in de eerste vraag en in de uitleg bij Route voorstellen en Startpunt van je lus.
- Wis startpunt haalt ook de heuvels weg die rond dat punt bewaard zijn (`clearExactTerrain`), want daar staat het punt op vier decimalen in. Een nieuw startpunt doet hetzelfde met het oude.
- Gebruik waar ik nu ben nam een plek aan met een nauwkeurigheid tot 250 m. Dat kan een paar straten naast de deur zijn. De grens is nu 50 m. Lukt het niet, dan staat de bestaande reden er en zoekt het paneel ongeveer.
- De afronding op vijf decimalen (ongeveer een meter) is geen oorzaak en blijft.

Bij Ongeveer komt er geen stukje bij: de afgeronde plek is niet je deur.

Niet altijd de juiste route:

- Een helling zonder bekende hoogte werd behandeld als een helling van 20 m. Bij Simpel kon hij een van de drie aanroepen krijgen, in de avontuurlijke lus woog hij als een echte helling, en hij telde mee in "langs 3 hellingen" en in de telling bovenaan. Nu gaat een helling met een bekende hoogte altijd voor, weegt een zonder hoogte net boven een onverhard pad, en telt hij niet mee in de titel en niet in het aantal. Dit lost het punt uit de backlog op (Klein en fouten, Overig).
- Zei de routeplanner dat er bij het startpunt zelf geen pad ligt, dan liet de planner toch een voor een punten vallen en gebruikte alle aanroepen. Nu stopt hij na één aanroep, slaat Simpel over (hetzelfde punt, hetzelfde antwoord) en staat er één regel: "Bij je startpunt ligt geen pad of weg die de routeplanner kent. Kies een startpunt aan een weg." De blokken eronder zeggen dan "Geen lus zonder pad bij je startpunt." en niets over hellingen. Dit geldt alleen als BRouter antwoordt: die zegt welk punt geen pad heeft. Valhalla (fout 171) zegt dat niet, en dan laat de planner zoals voorheen het laatste punt vallen.
- Een lus die tussen 12 en 15 procent te lang was telde als niet passend maar zei het niet. De zin "Langer dan" gebruikt nu dezelfde grens als de planner (`CLOSE_ENOUGH`).
- De titel "langs N hellingen" telt alleen hellingen met een bekende hoogte.

Deterministisch: de aanvulpunten komen uit een vast aantal halveringen, de volgorde van de heuvels op de kaart maakt niet uit, en er is een test die twee keer dezelfde invoer vergelijkt, punt voor punt.

## Eigen keuzes buiten de opdracht

- Simpel met herhalingen krijgt geen extra herhalingen om de afstand te halen. Meer hoogtemeters dan de training vraagt verandert de training; dan liever de eerlijke regel over de afstand. Simpel zoekt wel verder bij de andere hellingen als de eerste te kort uitkomt.
- Zonder helling op de kaart blijft Simpel "Geen helling gevonden die bij je training past" zeggen en vraagt hij niets extra. Een vlakke heen en terug als vervanger is geprobeerd en teruggedraaid: het kost aanroepen en het besluit van 9 november zegt zonder extra aanroep. De avontuurlijke lus is dan wat wel kan, met de melding.
- De melding hangt aan de lus (`RouteProposal.notice`) en niet aan het geheel, omdat de twee lussen verschillende hoogtemeters hebben. Het geheel heeft een eigen `notice` voor het startpunt zonder pad.
- De telling bovenaan onderscheidt nu hellingen met en zonder bekende hoogte (`TerrainFound.unknown`), en draagt de straal van het zoekgebied voor de zin "binnen 3 km".
- De teksten bij de eerste vraag, in de uitleg en in het zoeken van de instellingen zeggen nu dat OpenStreetMap bij Precies om het startpunt zoekt en dat de hoogte van Open-Meteo komt. In `RoutePanel.tsx` is dat één zin, en de zin van een blok zonder lus komt nu uit de engine (`failureLine`); verder is het paneel niet veranderd.
- Geen nieuwe instelling: de grenzen (10 procent, 75 procent, 50 m) zijn vaste regels van de planner, geen keuze die de app voor je maakt. Wil de eigenaar er een instelbaar, dan is de 10 procent de kandidaat.
- De nauwkeurigheid van 50 m is een schatting van de bouwer en niet op een toestel gemeten.

## Voorbeelden

Met een nagemaakte routeplanner (een knik per stuk, bulten als heuvels), per nagemaakte plek:

- Polder, 10 km en 120 m: Avontuurlijk 10,3 km, vrijwel vlak, "Geen heuvels binnen 3 km. Deze lus stijgt 0 m; de training vraagt 120 m." Simpel: geen helling.
- Twee heuvels, 10 km en 300 m: Avontuurlijk 9,1 km en 70 m, met de melding (de hoogste helling 45 m boven je plek). Simpel 10,7 km en 300 m, zonder melding.
- Hellingen zonder hoogte, 8 km en 200 m: Avontuurlijk 7,4 km, vrijwel vlak, "Geen helling met een bekende hoogte binnen 3 km." Simpel: geen helling.
- Vlakke duurloop, 12 km: Avontuurlijk 11,7 km, Simpel 12 km, geen melding.
- Een eiland van 900 m, 10 km: Avontuurlijk 5 km en Simpel 2,2 km, elk met "korter dan de 10 km van je training".

Met de echte BRouter en twee openbare punten (geen plek van de eigenaar, niet in de repo): 8,1 km bij 8 km en 9,9 km bij 10 km, elk in één aanroep, begin en eind op het startpunt.

## Niet gecontroleerd

- De echte zoektocht bij OpenStreetMap om een exact punt: Overpass antwoordde niet vanuit de bouwomgeving. De adapter is met nagemaakte antwoorden getest.
- Een toestel: de nieuwe grens van 50 m bij Gebruik waar ik nu ben, en hoe de lus er op de telefoon van de eigenaar uitziet.
- Lussen boven ongeveer 18 km: het zoekgebied blijft 3 km.

## Alternatieven

- De afstand halen door Simpel meer herhalingen te geven. Niet gekozen, zie hierboven.
- Het zoekgebied groter maken dan 3 km om verder weg een heuvel te vinden. Niet nu: het is een zwaardere vraag aan een dienst van vrijwilligers en de melding zegt al hoe ver er gezocht is.
- Het stukje naar het pad door de routeplanner laten leggen. Dat kan niet: hij kent daar geen pad.
- De grens voor te kort instelbaar maken. Niet gekozen: de eigenaar noemde zelf 10 procent.

## Bron

De Inbox van `docs/backlog.md` (11 november, Route voorstellen verfijnen), `docs/beslissingen/2026-11-11-locatie-en-kaart.md`, `docs/beslissingen/2026-11-09-routeplanner.md`, `docs/beslissingen/2026-11-10-route-uitleg.md`.

## Vervangt

Uit `2026-11-09-startpunt-lus.md`: dat OpenStreetMap bij Precies op de afgeronde plek zoekt, en de grens van 250 m. Uit `2026-11-10-route-uitleg.md`: de korter-zin met 12 procent en "Minder dan de hoogtemeters van je training"; een helling zonder bekende hoogte telt niet meer mee in het aantal. De rest van die besluiten blijft staan.

## Terugdraaien

De commit van deze wijziging terugdraaien. Los: `anchor` niet meer meegeven in `storage/routeProposal.ts` haalt het stukje naar het startpunt weg; `exact` niet meer meegeven zet de kaart terug op de afgeronde plek; `SHORT_LIMIT` op 0,12 en `MAX_START_ACCURACY_M` op 250 geven de oude grenzen. Er is geen bewaarde vorm om op te ruimen behalve de plekken op vier decimalen in de cache van heuvels op het toestel. Die verdwijnen met Wis startpunt, bij een nieuw startpunt en met Heuvels in de buurt uitzetten; vanzelf verdwijnen ze pas als zes nieuwere plekken ze verdringen.
