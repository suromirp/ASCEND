# Ontwerp: route per training en een routeplanner die hoogtemeters haalt

Cartographer, 25 november. Hoort bij I-160 en het besluit `docs/beslissingen/2026-11-24-route-per-training.md`. Bouwt voort op `docs/visie/Ontwerp Plekken en routes.md` (die blijft staan; er komt hier geen bibliotheek van plekken of routes) en op de Briefing (`RouteProposalLine.tsx`, `RoutePanel.tsx`, `routeSheet.ts`). Alleen een voorstel; er verandert niets in `src/`. Compact gehouden, zodat het aan te passen is aan wat Pathfinder over de plek vindt.

## Wat er nu is

Route voorstellen opent een blad met twee lussen (Simpel en Avontuurlijk), alleen voor een training buiten te voet, en bewaart niets. De lus van vandaag leeft tot middernacht op het toestel. Simpel begint bij je plek en loopt eerst naar de helling (`composeSimple`); het aantal herhalingen is het kleinste van wat de hoogtemeters vragen, wat de afstand toelaat (1,5 keer de doelafstand min twee keer de aanloop) en twintig. Daardoor wint de afstand stil. Zonder kaart (`mapAge` none) kiest de planner een helling blind, en de regel `mapAgeLine` zegt dat alleen ergens onderaan. Trappen staan alleen in de gids Trainingsplekken (`/plekken`) en in één vaste regel, `SUBSTITUTE_LINE`.

## Deel 1. Route per geplande training

### Wat er bewaard wordt

Eén optioneel veld op de geplande training (`PlannedSession.route`), geen aparte lijst. Erin: de stijl (Simpel of Avontuurlijk), afstand en hoogtemeters, het aantal keer op en neer als dat er is, het vereenvoudigde spoor (hoogstens 800 punten, dezelfde regel als in het eerdere ontwerp), de bron (BRouter of Valhalla), waar hij begint (naam van de plek of "bij je plek") en wanneer gekozen. Het is een veld op een planning, geen log: een gedane training houdt zijn route als feit, een log verandert er nooit door. Een migratiestap in `storage/migrations.ts`, het veld optioneel, schemaversie blijft zoals hij is, een oude back-up opent gelijk. Het veld gaat mee in de back-up en de export. Nooit een exact punt van je voordeur: de lus begint waar de planner hem begon (afgeronde plek zoals nu).

### De ingang in Week

In Week opent een tik op een training het bestaande blad `SessionActionSheet`. Daar komt onder Andere keuzes, bij een training buiten te voet (zelfde voorwaarde als nu: `routeShownFor`) en voor een dag vanaf vandaag, één rij Route. Geen nieuwe knop op de weekrij zelf: die is al vol (greep, pil, ondertitel; zie I-141).

De rij, van links naar rechts: icoon `lopen` in de ronde vulling (zoals Eerst opwarmen), titel Route, daaronder één gedempte regel, chevron. De regel is "Nog geen gekozen" zolang er niets is. Is er een route, dan staat er het droge feit: "10,2 km, 300 hoogtemeters, 4 keer op en neer". Staat Route voorstellen uit in de instellingen, dan is de rij er niet. Staat de training op Loopband of Sportschool (Waar train je?), dan is de rij er ook niet; een bewaarde route blijft dan ongezien staan en komt terug zodra je weer buiten gaat.

### Het blad Route (vooraf kiezen)

Het is het bestaande blad Route voorstellen (`RouteSheet`) in een tweede stand: de plan-stand. Dezelfde kaart, dezelfde twee lussen, dezelfde keuzerijen, dezelfde i met "Zo werkt de kaart". Wat anders is, van boven naar beneden:

- Kop: `SheetHeader` met eyebrow de naam van de training en titel "Route kiezen". Onder de kop de dag in gewone woorden: "Voor zaterdag 28 november". Het weer voor die dag staat er niet; de Briefing toont dat op de dag zelf.
- De zoektocht, de kaart en de lussen zoals nu. Het zoeken begint bij het openen, met de tijdgrenzen die er al zijn (hoogstens drie aanroepen per soort, een voor een).
- Daaronder de keuze uit Deel 2 (hoogtemeters halen of afstand houden).
- Onderaan één mint knop: "Kies deze route". Dat is het enige mint in het blad. "Naar Garmin Connect" wordt in deze stand een tekstknop (`TextButton`) eronder, zodat je ook vooraf al kunt sturen als je dat wilt.
- Een tekstknop "Liever niet" sluit het blad zonder te bewaren (het vaste woord; hij staat er al in de Briefing).

Na een tik op Kies deze route sluit het blad en toont de rij Route het feit. Er is geen toast; de rij zelf is de uitkomst. Mislukt het bewaren: "Bewaren lukte niet. Je lus staat er nog." met de knop op zijn plek (dezelfde zin als in het eerdere ontwerp).

### Wijzigen en weggooien

Heeft de training al een route, dan opent de rij Route hetzelfde blad, maar met de gekozen route al op de kaart en geen zoektocht:

- Kop: eyebrow de naam van de training, titel "Je route".
- De kaart met de lus, de getallen met hun uitleg (afstand, hoogtemeters, keer op en neer), en `RouteInfo` zoals nu.
- Mint knop: "Naar Garmin Connect" (of het bestand openen, de bestaande weg `routeSender`), want dit is de gewone werkstand.
- Twee tekstknoppen: "Andere route" (opent de zoektocht in dezelfde stand als bij kiezen; de oude blijft staan tot je een nieuwe kiest) en "Route verwijderen" (toon `danger`).
- Route verwijderen vraagt eerst, zoals Verwijderen in `SessionChoiceSheet` (twee tikken): "Route verwijderen? De training blijft staan." met Verwijderen en Annuleren. Daarna staat de rij weer op "Nog geen gekozen".

Een bewaarde route verandert de planning nooit en is dus geen voorstel met Akkoord. Dat is hetzelfde als Waar train je? en de lus van vandaag: een keuze voor deze ene training.

### Als de training verschuift

De route is een veld op de geplande training, dus hij gaat vanzelf mee met Verplaatsen, ruilen (`onSwap`) en Toch doen. Er is geen aparte stap en geen vraag. Wat wel bijwerkt, omdat het afhangt van de dag: de regel "terug voor het donker" (`routeBackBeforeDark`) en het weer, beide alleen tekst, op de dag zelf berekend. Een route voor een training die je overslaat blijft op de rij staan; Toch doen brengt hem terug. Verwijdert de planner een training (een voorstel met Akkoord), dan gaat de route mee weg. Dat is nieuw gedrag voor de lijst met wat een voorstel doet, dus het Akkoord-blad noemt het niet apart: de route is bij een verwijderde training niets waard.

### Op de dag zelf

`RouteProposalLine` leest de geplande training van die dag. Zonder gekozen route verandert niets: "Route voorstellen" zoals nu. Met een gekozen route verandert alleen de rij, op Vandaag en in de Briefing: de titel wordt "Je route" en de regel eronder het feit ("10,2 km, 300 hoogtemeters, 4 keer op en neer"). Een tik opent het blad in de werkstand hierboven (kaart klaar, Naar Garmin Connect mint). Geen nieuwe zoektocht, geen netwerk nodig om de kaart van de lus te zien, want het spoor staat op het toestel (de tegels zijn de bestaande regel zonder netwerk). Zo beantwoordt Vandaag binnen twee seconden de vraag wat je missie is: de rij zegt wat je loopt, niet wat je nog moet zoeken.

### Standen

- Laden: de rij Route staat er meteen met "Nog geen gekozen"; de regel krijgt een vaste hoogte en wordt vervangen zodra de planning gelezen is. Bij het blad: `RouteSearching` zoals nu, vaste hoogte zodat niets springt.
- Leeg: "Nog geen gekozen" en in het blad de lussen zoals ze komen.
- Fout bij lezen van de planning: de rij toont niets extra en de Briefing werkt zoals nu.
- Zonder netwerk: kiezen kan niet, de bestaande regel; een bewaarde route is gewoon te zien en te sturen als er een bestand of koppeling is.

### Bewust niet

Geen bibliotheek, geen lijst "Mijn routes", geen eigen tab, geen scherm erbij in Instellingen. Geen route die de planning verandert. Geen route automatisch kiezen voor een training. Geen spoor van een gelopen horlogeloop bewaren (dat blijft het open spoor uit het eerdere ontwerp). Geen nieuwe kleur of token.

## Deel 2. De routeplanner

### a. Simpel begint aan de voet van de steilste helling

De kandidaten in `simpleCandidates` worden gerangschikt op steilheid (hoogteverschil gedeeld door lengte) en daarna op hoogte, niet op nabijheid; een helling onder `MIN_CLIMB_M` telt niet. De lus begint aan de voet van de gekozen helling: de aanloop wordt nul en de afstand gaat helemaal op en neer. Dat verandert wat "start" betekent. Twee gevallen:

- De voet ligt binnen een kilometer van je plek: je begint vanaf je plek, zoals nu, met een korte aanloop.
- De voet ligt verder: de lus begint op de voet en dat zegt de regel: "Begint bij de voet van de helling, 14 minuten rijden van je plek." Je rijdt er zelf heen; ASCEND routeert geen auto. De GPX en Naar Garmin Connect beginnen op de voet.

Waarom: nu eet een aanloop van 4 km heen en terug de afstand op en blijven er twee herhalingen over (I-160, 54 m over 1690 m). Zonder aanloop passen er meer. Dat Simpel de steilste kiest en niet de dichtstbijzijnde is een bewuste keuze van de eigenaar.

### b. Hoogtemeters halen of afstand houden

In het blad Route, boven de knop, één keuze van twee rijen (de bestaande keuzerij, `RouteChoiceRow`-stijl, geen schuifregelaar):

- "Hoogtemeters halen": de lus wordt zo lang als nodig voor de hoogtemeters van de training.
- "Afstand houden": de lus blijft bij de afstand van de training en haalt daar zoveel hoogtemeters als erin passen.

Elke rij heeft de som in één regel, uitgerekend uit de helling die gekozen is. Een voorbeeld met 10 km en 300 hm als vraag:

- "Hoogtemeters halen" met "14 km, 300 hoogtemeters: 4 keer op en neer"
- "Afstand houden" met "10 km, 210 hoogtemeters: 3 keer op en neer"

Het advies is Hoogtemeters halen als de training hoogtemeters vraagt (een heuveltraining of een doel van minstens `MIN_ASCENT_TARGET_M`), anders Afstand houden; het advies staat voorgeselecteerd en heet "Advies" in de rij. De keuze geldt alleen voor deze zoektocht; wat hij verandert in je plan is niets: de training blijft zoals hij was, alleen de lus verschilt. Een instelling is dus niet nodig; wel hoort het advies in `settingsDefs/vandaag.ts` onder Route voorstellen als "Wat gaat voor in een lus", Hoogtemeters halen of Afstand houden, met één zin uitleg. Dat past bij de regel dat elke keuze van de app instelbaar is.

In `composeSimple` betekent dit: bij Hoogtemeters halen valt de grens `room` (1,5 keer de afstand) weg en geldt alleen de tak van twintig herhalingen; bij Afstand houden blijft de afstand de grens en wordt de som getoond. De uitkomst is deterministisch.

De zin "4 keer op en neer" is voor een loop met één helling het aantal herhalingen (`repeats`). Bij Avontuurlijk is er geen herhaling en staat alleen "14 km, 220 hoogtemeters". Een lus die minder dan 90 procent van de gevraagde hoogtemeters haalt, houdt de bestaande amberregel (`ascentOverLine`/`ascentNotice`).

### c. Creatief als buiten niet genoeg is

Haalt de beste lus buiten minder dan 75 procent van de gevraagde hoogtemeters (`SHORT_ASCENT`), dan staat onder de lussen een derde rij, met de kop "Buiten plus een trap" of "Buiten plus de loopband". Dit is een voorstel voor deze training, geen wijziging van het plan; het kost dus geen Akkoord. Wel staan de som en de verdeling er, zodat je ziet wat je doet.

Van boven naar beneden in de rij:

- Titel: "Buiten plus een trap" met daaronder het droge feit: "Buiten 10 km, 110 hoogtemeters. Daarna Trap Zandgat, 8 keer op en neer, 210 hoogtemeters."
- De verdeling in één regel met getallen: "Samen 10 km en 320 hoogtemeters." Een kleine uitleg achter de i: "Een trap telt per keer op en neer, de hoogte staat in de gids Trainingsplekken."
- De plek met naam, afstand van je plek en haar kenmerken uit de gids (lengte, hoogte, ondergrond), bijvoorbeeld "Trap Zandgat, 26 m, metalen trap, 18 minuten rijden". Een tik opent de plek in `/plekken`; dat is het antwoord op punt (e): de eigenaar hoeft de gids niet te kennen.
- Het aantal keer op en neer volgt uit de hoogte van die trap: ontbrekende hoogtemeters gedeeld door de hoogte per keer, afgerond naar boven op hele keren, hoogstens 30.

Het alternatief is "Buiten plus de loopband op helling", alleen als Waar train je? voor je een loopband kent (Loopband is een bestaande keuze); hij staat er niet als je dat niet kiest. Hij geeft de ontbrekende hoogtemeters als minuten bij een stijgingspercentage: "Daarna 25 minuten op de loopband op 10 procent, 130 hoogtemeters." Geen echte hoogtemeters, dus de regel zegt dat: "Op de loopband tel je de helling, niet de meters van je horloge." De rekenregel (afstand en percentage) hoort in de engine met een vuistregel van de bouwer; dat moet in het besluit komen als "geen onderzoek", zoals de eerdere vuistregels.

De voorkeur is echte heuvels binnen de rijtijd. Dus eerst zoekt de planner de steilste helling binnen de rijtijd (a). Pas als dat te weinig geeft komt deze rij. Een trap met 8 keer op en neer verdringt dus nooit een helling die het zelf haalt.

De rijtijd is een instelling in dezelfde plek als de andere rij-instellingen: "Hoe ver rijden voor een helling", 15, 30 (advies), 45 minuten of Geen grens. Eén zin uitleg: "Zo ver zoekt ASCEND naar een helling of trap als er bij je plek niets past; het rekent met een ruime schatting, geen routeplanner voor de auto." ASCEND heeft geen reistijden, dus rekent het hemelsbreed met een vaste vuistregel (voorstel: 1 minuut per 0,8 km hemelsbreed, 30 minuten is dan 24 km, dichtbij de 25 km uit het eerdere ontwerp). De plek komt uit de gids `TRAINING_SPOTS` (die heeft lat, lon, hoogte en lengte), niet uit een extra vraag aan een dienst. Bij een tekort aan zulke plekken zegt de rij dat eerlijk: "Binnen 30 minuten rijden staat geen trap of helling in de gids."

### d. Ontbreekt de kaart

Nu staat dit ergens onderaan als `mapAgeLine`. Dat wordt het eerste wat je ziet, boven de lussen, als één tekstregel in amber (let op), zonder nieuw kaartje, op de plek van de bestaande meldingen, met de knop eronder:

- Regel: "Er is geen actuele kaart van de omgeving, dus de lussen zijn zonder heuvels gezocht. Probeer het opnieuw voor je een route kiest."
- Knop: "Opnieuw proberen" (`TextButton`, tone `dim`, inkt). Dat haalt alleen de kaart van de omgeving opnieuw op (de cache met heuvels en paden, `nearbyTerrain`), met de tijdgrens van de Overpass-aanroep, en zoekt daarna opnieuw. Het is een tik van jou, geen automatische herhaling, zoals nu bij Opnieuw zoeken.
- Tijdens het wachten staat er "De kaart ophalen" in dezelfde regel, de knop is uit; na de tijdgrens de uitkomst: "De kaart kwam niet binnen. Probeer het later nog eens." met Opnieuw proberen terug.

"Opnieuw zoeken" blijft het woord voor het zoeken van lussen zelf (`RouteFailure`); "Opnieuw proberen" is alleen voor de kaart. Zo zijn het twee verschillende dingen met twee verschillende woorden.

Bij een lus die zonder kaart gevonden is, zegt de rij van die lus dat hij blind gekozen is, en Kies deze route vraagt dan niets extra (geen waarschuwing, die staat er al). De bouwer test dat zonder kaart geen helling blind als "steilste" wordt voorgesteld: zonder kaart staat er geen "steilste helling" in de tekst.

## Teksten op een rij

Hergebruikt, ongewijzigd: Route voorstellen, Zo werkt de kaart, Naar Garmin Connect, Opnieuw zoeken, Andere plek, Liever niet, Annuleren, Verwijderen, Hoogtemeters, "Geen helling gevonden die bij je training past."

Nieuw, woord voor woord:

- Rij in Week en Vandaag: Route, "Nog geen gekozen", "10,2 km, 300 hoogtemeters, 4 keer op en neer", "Je route".
- Blad: "Route kiezen", "Voor zaterdag 28 november", "Kies deze route", "Je route", "Andere route", "Route verwijderen", "Route verwijderen? De training blijft staan.", "Bewaren lukte niet. Je lus staat er nog."
- Keuze: "Hoogtemeters halen", "Afstand houden", "Advies", "14 km, 300 hoogtemeters: 4 keer op en neer", "10 km, 210 hoogtemeters: 3 keer op en neer".
- Simpel: "Begint bij de voet van de helling, 14 minuten rijden van je plek."
- Creatief: "Buiten plus een trap", "Buiten plus de loopband", "Buiten 10 km, 110 hoogtemeters. Daarna Trap Zandgat, 8 keer op en neer, 210 hoogtemeters.", "Samen 10 km en 320 hoogtemeters.", "Daarna 25 minuten op de loopband op 10 procent, 130 hoogtemeters.", "Op de loopband tel je de helling, niet de meters van je horloge.", "Binnen 30 minuten rijden staat geen trap of helling in de gids."
- Kaart: "Er is geen actuele kaart van de omgeving, dus de lussen zijn zonder heuvels gezocht. Probeer het opnieuw voor je een route kiest.", "Opnieuw proberen", "De kaart ophalen", "De kaart kwam niet binnen. Probeer het later nog eens."
- Instelling: "Wat gaat voor in een lus" met Hoogtemeters halen of Afstand houden; "Hoe ver rijden voor een helling" met 15, 30 (advies) of 45 minuten of Geen grens.

Het aantal in "4 keer op en neer" staat altijd als getal, niet als "vier keer", omdat het een som is naast kilometers.

## Waar het in de code landt (alleen als richting, Sherpa beslist)

`engine/routePlanner.ts#composeSimple` en `simpleCandidates` (a en b), een nieuwe `proposeWithSteps` of vergelijkbaar in dezelfde module voor c, `engine/routeSheet.ts` voor de teksten, `components/RouteProposalLine.tsx` en `RoutePanel.tsx` voor de plan-stand, een rij in `SessionActionSheet.tsx`, `models/` plus `storage/migrations.ts` voor het veld, `engine/settingsDefs/vandaag.ts`, `settingsSummary.ts` en `components/settings/groups/VandaagGroup.tsx` voor de twee instellingen. Niet bewegen: `planGolden.test.ts`, `routeTarget.test.ts` (toStrictEqual), `sheetDrag.scan.test.ts`.

## Nog niet bekend of niet gezien

De GPX begint nu altijd bij het startpunt; een begin op de voet van de helling is nieuw voor de bronnen en voor Garmin Connect. De cache van heuvels en paden (3 km) is te klein voor een voet op 24 km: de planner moet daar de punten uit `TRAINING_SPOTS` halen of een tweede aanroep doen; dat laatste kost een extra toestemming (een plek verder weg gaat naar OpenStreetMap). De loopbandvuistregel is niet onderzocht. Niets hiervan is op een scherm gezien.

## Samenvatting

Een route is een optioneel veld op één geplande training; Week krijgt één rij Route in het blad van de training, Vandaag toont op de dag zelf "Je route" met de kaart klaar, wijzigen en verwijderen staan in hetzelfde blad, en bij verschuiven gaat hij mee. In de planner begint Simpel aan de voet van de steilste helling, kies je tussen Hoogtemeters halen en Afstand houden met de som erbij, komt bij te weinig hoogte buiten een rij "Buiten plus een trap" (of loopband) uit de gids Trainingsplekken, en ontbreekt de kaart dan staat de regel bovenaan met Opnieuw proberen.

## Vragen voor de eigenaar

1. Mag Simpel op de voet van de helling beginnen, ook als je er voor moet rijden, met je zelf naartoe rijden en een GPX die daar begint? Advies: ja; zonder dat blijft de aanloop de afstand opeten. Zonder antwoord blijft de aanloop zoals nu.
2. De rijtijd rekent hemelsbreed met een vuistregel (30 minuten is ongeveer 24 km). Is dat goed genoeg, of wil je toch een echte reistijd (een extra vraag aan een dienst)? Advies: de vuistregel. Zonder antwoord geldt die.
3. De loopbandregel (minuten op een percentage) is een vuistregel van de bouwer, geen onderzoek. Mag hij erin, met de zin dat het niet de meters van je horloge zijn? Advies: ja. Zonder antwoord komt alleen de trap.
4. Mag een bewaarde route bij een training die de planner verwijdert stil meegaan? Advies: ja. Zonder antwoord gaat hij mee.
