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


## Tweede aanvulling

Na de review van Warden veranderde dit:

- Tikvakken: het figuur wordt getekend op schaal 1,2 (`FIGURE_SCALE`) en elke plek krijgt
  een eigen vak van minstens 44 bij 44 px (`engine/bodyMap.ts#hitBoxes`). Bij een paar
  loopt het vak vanaf de middenlijn naar buiten, en vakken die elkaar nog raken worden
  bijgesneden, zodat het midden van de plek altijd in het eigen vak blijft. De pols en
  onderarm staan iets hoger op de arm (cy 174) zodat ze niet over de heup liggen. Een test
  controleert per kant dat geen twee vakken overlappen en dat elk vak minstens 44 bij 44 px is.
- Rode vlaggen: duizeligheid of dubbelzien bij nekpijn, een klap of knap in de achillespees
  of niet meer op je tenen kunnen staan, en buikpijn met koorts of misselijkheid staan nu
  onder "direct" (dezelfde dag naar de huisarts, bij uitval 112). Bij de algemene redenen
  staat een rode, warme plek met koorts erbij.
- De kop "Melden voor je planning" is "Melden". Of melden de planning gaat aanpassen is
  nog niet beslist en dus niet veranderd.
- Iets anders melden: onder "Open klachten" opent een blad met een naam uit de lijst die
  niet op het figuur staat (zoals Elleboog) of een eigen naam, de ernst en een datum
  (standaard vandaag, niet in de toekomst). Het formulier bij een plek heeft nu ook een datum.
  Beide gaan via `addInjury` met een tijdsgrens van tien seconden en tonen anders de foutregel.
- Rekken en losmaken heeft een InfoButton met het algemene advies en de bron, inclusief de
  twee correcties over de IT-band en de nekrollen.
- Een klacht verwijderen vraagt nu eerst bevestiging in een klein blad (Verwijderen of
  Annuleren). Gekozen boven Ongedaan maken, omdat de meldingsbalk alleen planningswijzigingen
  terugdraait en een verwijderde klacht dan een eigen terugweg nodig had.
- De gloed om de gekozen plek is weg; mintlijn, lichte vulling en schaal blijven.
- Ascend toont in de kop een amber regel als het aantal loopdagen ontbreekt, en verbergt
  "Details van het doel" als er in dat blad niets te zien is. De zoekterm voor Lichaam heet
  "Lichaam: rekken en klachten" en kent rekken, stretchen, lichaam, klacht en pijn.
