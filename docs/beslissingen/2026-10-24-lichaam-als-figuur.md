# Lichaam als figuur: rekken en klachten op één plek

Datum: 2026-10-24
Status: aangenomen, nog te bouwen

## Besluit

De lijst "Waar zit het?" (rekken) en de losse pagina Blessures worden één scherm
met een menselijk figuur, voor- en achterkant, in de stijl "lijn met spieren"
(ontwerp B): een rustig lijnfiguur zoals de iconen, met dunne spierlijnen. Je
tikt op een spier of gewricht; die licht mint op en eronder staat de naam en de
spier. Daarna opent een scherm met vier delen: wat je doet bij last (met wanneer
je naar een fysio gaat), rekken en losmaken, voorkomen (versterken) en melden
voor je planning. Melden gaat, zoals alles wat de planning verandert, via een
voorstel met Akkoord. Het poppetje rechtsboven op Vandaag opent het scherm.
Het figuur is man of vrouw, een instelling bij Lichaam; weet de koppeling het,
dan neemt ASCEND dat over.

## Reden

De eigenaar en zijn vriendin vonden de lijst te kaal: je wilt aanwijzen waar
het zit, niet zoeken in namen. Bij de keuze uit drie voorbeelden (lijnfiguur,
lijn met spieren, gevuld silhouet) koos de eigenaar B: hij vindt anatomie
interessant, en de lijnstijl houdt het rustig en ver van een sportschool-app.

## Alternatieven

- Alleen een lijnfiguur zonder spieren (A): rustiger, maar je ziet niet welke
  spier je aanwijst.
- Een gevuld silhouet met vlakken (C): duidelijk, maar minder precies.
- Een anatomische spierkaart in kleur: afgewezen, dat oogt als een
  bodybuilding-app (CLAUDE.md).

## Bron

Gesprek met de eigenaar op 24 oktober 2026 en de voorbeelden op het ontwerpcanvas
"Lichaam ASCEND". De bestaande rekoefeningen (Stretches), pijnmeldingen
(engine/pain.ts) en blessures blijven de bron van de inhoud.

## Vervangt

Niets. De lijst "Waar zit het?" en de pagina Blessures gaan op in het nieuwe
scherm; oude links sturen door.

## Terugdraaien

Het poppetje op Vandaag weer de lijst laten openen en de route naar Blessures
terugzetten. De gegevens (rekoefeningen, pijnmeldingen) veranderen niet.

## Aanvulling

Gebouwd op 24 oktober 2026, op de branch `claude/lichaam-als-figuur`.

Wat er staat: het scherm `/lichaam` met de keuze Voorkant of Achterkant, het figuur in
lijnstijl met 17 plekken voor en 11 achter (elk een tikdoel van minstens 44 bij 44 px),
een balk met de gekozen plek en "Bekijk wat helpt", en daaronder de open klachten en,
weggeklapt, de opgeloste. Het detail is een eigen route (`/lichaam/:plek`) met de vier
delen: wat je doet bij last met wanneer je naar een fysio gaat, rekken en losmaken (de
bestaande rekoefeningen), voorkomen (twee tot vier oefeningen per plek, met de
onderbouwing en de sterkte van het bewijs uit `docs/onderzoek/`) en melden. De koppeling
tussen plek en inhoud is data (`src/data/bodySpots.ts`, `bodyCare.ts`, `bodyFigure.ts`)
plus pure functies met tests (`src/engine/bodyMap.ts`). Het poppetje op Vandaag opent het
scherm; `/stretches`, `/stretches/:areaId` en `/blessures` sturen door (een groep
rekoefeningen naar de bijbehorende plek). De pagina's Rekoefeningen, Rekoefening per
groep en Blessures zijn verwijderd. De instelling Figuur (Automatisch, Man, Vrouw) staat
bij Lichaam.

Waar ik afweek of wat ik besliste:

- Melden verandert de planning niet, dus er is geen voorstel met Akkoord. Een klacht
  wordt vastgelegd met `addInjury`; wat de app daarmee doet is alleen de hint
  INJURY-LEGS bij een klacht aan been of voet. De tekst bij het knopje zegt dat eerlijk.
  Het ontwerp beloofde "ASCEND stelt daarna een aangepaste week voor"; dat doet de app
  nu niet en dat staat er daarom niet. Zodra melden de planning wel gaat veranderen,
  hoort er een voorstel met Akkoord tussen.
- De naam van een klacht is de blessurenaam met de kant erachter ("Knie rechts"), zodat
  de bestaande hint hem herkent. Daarvoor kwamen 'scheen' en 'bil' bij de beenplekken
  van die hint, en 'Borst', 'Buik', 'Bil' en 'Onderarm' bij de lijst blessurenamen.
- Het geslacht van de koppeling is nergens beschikbaar: intervals.icu wordt alleen voor
  trainingen en welzijn gelezen en geen import levert het. Automatisch valt dus terug op
  Man en de rij zegt "Nog niet bekend, we tonen Man". `resolveFigure` neemt al een
  `linkedSex` aan voor als een koppeling het ooit levert.
- De instelling is een optioneel veld (`AppSettings.figure`), gelezen met een
  terugval, net als Beweging en Lucht bovenaan. Daarom geen migratiestap: een back-up
  zonder het veld importeert als Automatisch.
- De gekozen plek staat in een compacte balk die onderaan het scherm blijft hangen, niet
  eronder zoals in het ontwerp, omdat op een telefoon de ruimte onder het figuur buiten
  beeld valt. De pagina schuift een stukje op als de gekozen plek onder de balk zou
  liggen.
- De voorkom-oefeningen hebben geen videolink: er was geen gecontroleerde bron, dus
  geen verzonnen link. Waar de onderzoeken niets over een plek zeggen (nek, onderarm),
  staat dat in de onderbouwing.
- Het verschil tussen man en vrouw zit in het silhouet (schouders, taille, heupen) en in
  de borstlijn, zonder geslachtsdelen.

