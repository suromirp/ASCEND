# Route-blok: de lus in de Briefing minimaal

Datum: 2026-11-12
Status: aangenomen

## Besluit

Het blok met de route in de Briefing (een loop te voet, onder de hartkaart) heeft nog drie dingen: Start bij met twee chips, een stille kaart met één lijn, en de regel met de gekozen lus en Groter. De rest verhuist naar Groter (het blad Route).

- Start bij: twee chips, Waar je nu bent en een tweede chip. Die draagt de naam van de plek die nu geldt (Thuis, een bewaarde plek of een gezochte plek), anders Andere plek. Een tik op de tweede chip opent het blad Andere plek: bovenaan het zoekveld, eronder je bewaarde plekken met Thuis bovenaan. De chip Thuis en de chips van bewaarde plekken verdwijnen uit de rij; de schuifrij verdwijnt. Een lange naam wordt in de chip afgekort met een beletselteken (hoogstens 8,5 rem tekst); de chip zelf valt nooit af, ook niet op 360 px. Dit geldt ook in het blad Route (Groter en Week): StartChips is één onderdeel.
- Een instelling die bij Thuis start (Startpunt van je lus, Thuis) blijft werken: dan staat Thuis gekozen als naam op de tweede chip. De thuisplek zelf blijft bewaard; weer, zon, lucht en Plekken gebruiken hem.
- De kaart in de Briefing is stil: Kaart en Luchtfoto, Naar mijn plek, Alles in beeld, Start hier en Bewaar als plek staan alleen nog op de grote kaart. Eén knop over de hele kaart opent Groter (aria "Groter: de kaart met je lus"); de pagina scrolt eroverheen (touch-action pan-y). De knop Groter naast de lus blijft.
- Eén lijn: op de stille kaart staat alleen de gekozen lus in mint, met de ring bij de start. Je eigen plek (de ijsblauwe stip) staat er niet; die staat op de grote kaart.
- De naamsvermelding staat klein rechtsonder als "© OpenMapTiles © OpenStreetMap" (zonder "contributors"), en de lus blijft er altijd buiten: Alles in beeld laat onderaan 40 px vrij (`QUIET_FIT_PADDING`). Op de grote kaart blijft de volle vorm.
- De pagina scrolt zo ver dat de laatste regel volledig boven de vaste knop onderaan staat: de ruimte onderaan is de gemeten hoogte van de onderbalk plus 16 px (ook als er een uitkomstregel bij komt), in plaats van een vaste 128 px.

## Wat er gemeten is (Chromium, 412 px, nagemaakte lussen)

- (a) Start bij had vier chips in een schuifrij (Waar je nu bent, Thuis, een bewaarde plek, Andere plek); de derde lag half achter Andere plek. Nu twee chips: op 360 px samen 338 px breed bij een gekozen plek met een lange naam, binnen de 328 px plus rand.
- (b) Boven de kaart stonden Hardlopen/Wandelen/Loopband en Start bij; op de kaart Kaart/Luchtfoto en twee ronde knoppen. Nu op de kaart niets.
- (c) De witte stippellijn is de andere lus (bijvoorbeeld Simpel naast Avontuurlijk), gestreept en 5 px naast de gekozen lus gelegd. Waar de lussen samenlopen (het stuk vanaf de start, of heen en terug bij Simpel) liggen ze door elkaar. In de Briefing weggelaten: de andere lus staat er al als regel met Kies, en op de grote kaart blijft hij gestreept, waar je tussen lussen kiest. De bronvermelding lag met 287 px breed over het eind van de lus; nu 215 px en de lus blijft erboven.
- (d) In de eerste stand vallen de regel van de lus en Groter onder de vaste knop (op 412 bij 915 bij y 839, knop vanaf 838). Bij uitscrollen staan ze erboven; de ruimte onderaan volgt nu de knop.

## Eigen keuzes van de bouwer

- Het zoekveld krijgt in het blad Andere plek alleen meteen focus als er geen bewaarde plekken zijn: anders bedekt het toetsenbord de lijst. Tijdens het typen staan de treffers op de plek van de lijst; leeg veld is weer de lijst.
- De gekozen plek in de lijst heeft een rand in inkt en een vinkje, zoals een gekozen lus; geen mint.
- Je eigen plek als stip alleen op de grote kaart, niet op de stille kaart: één lijn en één ring.
- "© OpenStreetMap" is de vorm die OpenStreetMap op een kleine kaart toestaat; de volle vorm staat op de grote kaart, één tik verder.
- De woorden van de instellingen: Startpunt van je lus zegt nu dat je Thuis of een andere bewaarde plek onder Andere plek kiest; Ondergrond van de kaart zegt "rechtsboven op de grote kaart". De waarden van de instelling blijven gelijk; geen nieuwe instelling, er komt geen nieuwe keuze bij.
- De eerste vraag van Route (Waar je nu bent, Thuis, Ongeveer) blijft ongewijzigd: dat is de keuze van de instelling, niet Start bij.

## Niet gedaan

- Het weer op een plek ver van huis: het weer-vak van de Briefing volgt de gekozen startplek nog niet. `engine/places.ts#weatherAtPlace` bestaat, maar niets gebruikt hem. Het weer op die plek vraagt een tweede voorspelling (een nieuwe aanroep naar Open-Meteo met dat punt) en raakt het weer-vak, waar een andere bouwer werkt. Voorstel voor de backlog: het weer-vak toont bij een startplek verder dan 10 km van Thuis het weer op die plek, met de naam erbij.

## Reden

De eigenaar stuurde een afdruk op 412 px: "Dit is niet mooi" en "Thuis mag ook weg, je gebruikt toch alleen waar je nu bent of je zoekt een nieuwe plek op". De Briefing is het moment vlak voor je vertrekt: daar wil je zien waar de lus loopt en hem versturen, niet de kaart bedienen.

## Alternatieven

De andere lus gedempt laten staan in plaats van weglaten: ook gedempt ligt hij op het eerste stuk door de gekozen lus heen, en dat was precies de klacht. Een vervaging aan de rand van de schuifrij: lost op dat de chip afvalt, niet dat er vier chips staan. De naamsvermelding onder de kaart: kost een regel van 44 px hoog (tikdoel van de link). De kaart lager maken zodat de regel in de eerste stand boven de knop staat: werkt alleen op één schermhoogte.

## Bron

Afdruk en woorden van de eigenaar (12 november), opdracht van de coördinator, besluiten `2026-11-12-andere-plek.md`, `2026-11-11-route-kaart-2.md` en `2026-11-11-briefing.md`.

## Vervangt

Uit `2026-11-12-andere-plek.md` het deel "Bewaarde plekken staan als chip tussen Thuis en Andere plek, samen hoogstens vier chips ... De rij schuift opzij als de namen niet passen". De rest van dat besluit (zoeken, Bewaar als plek, Je plekken) blijft.

## Terugdraaien

`components/RoutePanel.tsx#StartChips` weer de chips van `model.startChips` laten tekenen in een schuifrij; in `TrainingBriefing.tsx#LoopPlace` `onOpen` weglaten en `routes={model.mapRoutes}`, `me`, `onPhoto` en de bewaarprops weer doorgeven; `paddingBottom` weer `pb-32`.
