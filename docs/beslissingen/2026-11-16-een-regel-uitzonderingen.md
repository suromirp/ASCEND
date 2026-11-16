# Eén regel voor alle uitzonderingen

Datum: 2026-11-16
Status: aangenomen

## Besluit

Of een training of een stap op een dag mag, en zo niet wat dan, zegt één functie: `src/engine/dayRules.ts`. De feiten per dag (ziek, opbouw na ziekte, vakantie, tocht, de lichte dagen rond een tocht, zonder sportschool, de racedag en de afbouw, de dag van je doel, je rustdag, een vaste afspraak, kracht uit, een rustige week) staan op volgorde van voorrang. Een vaste tabel van oorzaak maal stap geeft het oordeel: mag, vervalt, vervang, verplaats, waarschuw of weiger, met de reden uit één tabel met teksten (`DAY_CAUSE_TEXT`). De functie schrijft en plant niets; wat de planning inhoudelijk verandert blijft een voorstel met Akkoord.

Wie leest er nu uit:

- Tellen: `isPausedFor`, `leftOutOfCount`, het verlies van de volle week, Niet gedaan? en de zieke dagen van de reeks (stap tellen, `pauseRules`).
- Verplaatsen: de voorgestelde dagen, slepen, ruilen, de datumkiezer in Week en op Vandaag (`keptDay`, `keptAsk`), Week opnieuw plannen (`illnessHeld`) en de missie van Vandaag bij ziek (stap doen).
- Let op: de regel ILL en de regel NO-GYM lezen de stap plaatsen.
- Inhalen: wat verviel haal je niet in (`catchUpEligibility` met `pause`).
- Forge: de ijkset (`calibrationBlock`, stap een set erbij).
- Voorstellen: de poort van elk voorstel is `mayPropose` (ziek of opbouwen na ziekte); de extra training, hoeveel per soort en het weekvoorschrift lezen de stap erbij.

Een scan in de tests (`src/engine/dayRulesScan.test.ts`) laat een nieuwe aanroep van een van de oude functies (zoals `isIllnessDay`, `isAwayFor`, `leaveDays`, `lightDays`, `leaveLabelOn`) buiten `dayRules.ts` en de bronbestanden falen, ook onder een andere naam (`as`). Wat nog zo toetst staat daar per bestand met het aantal aanroepen en de reden; die lijst wordt alleen korter. De scan ziet namen, geen bedoeling: een toets die de periode of melding zelf leest (zoals `fixedSports.ts#leaveBlocks` of de ziekte in `influence.ts`) ziet hij niet.

## Keuzes van de eigenaar

- Een training die je zelf vastzette op een dag dat je ziek bent (of een zware training terwijl je verkouden bent of opbouwt na ziekte) staat altijd in Let op, regel ILL, met het voorstel hem te laten vervallen. Zonder sportschool stond er al altijd (Week draait de controle met `reportYours`).
- In een periode zonder sportschool komt er niets bij: geen extra loop en niet meer kracht. Alleen de heuvelloop die de periode zelf neerzet (`engine/noGym.ts`).

## Eigen keuzes van de bouwer

- Neus of keel houdt alleen tegen wat zwaar is, ook bij slepen naar morgen: een rustige loop mag, een zware vraagt eerst ("Je bent verkouden. Rustig bewegen mag, niets zwaars."). Koorts of buikgriep houdt vandaag en morgen dicht. Zo zijn de vier versies van ziek er één (gat 5). De opbouw na ziekte vraagt bij slepen eerst voor wat zwaar is tot de dag dat zwaar weer mag (gat 6). De voorgestelde dagen van ASCEND slaan die dagen over.
- Voor de telling is een training van morgen nog gewoon gepland, ook als je ziek bent: alleen dagen die in de melding vallen (tot vandaag) vervallen. Zo bleef het; de tekstkaart (stand ziek-eerder) ving een tussenversie die dat brak.
- ILL meldt alleen wat van jou is (slot of verplaatst door jou of een voorstel). Wat van het systeem is, haalt ziek melden zelf weg. Staat een rij zowel in je ziekte als zonder sportschool, dan één melding: ziek gaat voor.
- De ijkset houdt de week voor een race aan als venster (dat van `raceWeekGuard`), naast zijn eigen regel voor tests en tochten in de planning (dezelfde week of de drie dagen erna). Die eigen regel blijft: hij gaat over een test of tocht, niet over een dag. Rustige week betekent hier: een rustige instap waar je Akkoord op gaf en de lichte week van een golf (`engine/quietWeeks.ts`). De beginnersstart nog niet: die hangt af van je richting en je logs en wordt niet in Forge gelezen.
- De stap doen (Vandaag) leest alleen ziek. Een vakantiedag of tochtdag verandert de missie van Vandaag niet; dat doet de planning al.
- De extra training zegt bij ziek of opbouwen "Je bent ziek gemeld of bouwt op na ziekte." (gat 11: hij wachtte niet tijdens de opbouw).
- Het weekvoorschrift houdt voor een dag die al voorbij is het oude antwoord (alleen vakantie, tocht of zonder sportschool); vanaf vandaag de stap erbij, met ziek en de opbouw (gat 9).
- Stap 5 van het ontwerp (de ronde: LEAVE-OFF, LEAVE-LIGHT, REST-DAY, GOAL-DAY en `noGym.ts` uit `dayFacts`) is niet gedaan, zoals het ontwerp adviseert: de ronde klopt al en het risico is het grootst. Kracht uit in de planning (`sports.ts`, het weekvoorschrift) hoort daarbij en staat in de lijst van de scan.
- De dagkeuze binnen een voorstel (de testloop, inhalen, de afdaalklok, de rustdag terug, kracht bij een richting) is nog niet omgezet. De poort ervoor is al `mayPropose`, dus tijdens ziekte komt er geen voorstel; ze staan met reden in de lijst van de scan.
- Gat 7 (de reeks telt anders dan Week) bleek al dicht via `leftOut` in Stand; de toets staat er nu.
- Gat 10: inhalen weigert wat verviel; het scherm bood de greep al niet aan.
- Slepen naar zo'n dag heet in Week `ask` (een nieuwe soort dag naast `nogym` en `rest`), met dezelfde vorm: amber, eerst de vraag.

## Aanvulling na Warden, Lookout en Pathfinder (16 november)

- Voorrang: op de dag van je doel en met koorts of buikgriep is een dag dicht, ook als het je rustdag is. Voor I-67 vroeg je rustdag eerst (slepen ging dan na Akkoord door). Zo staat het in het ontwerp (hoofdstuk 3.4): doel en ziek boven rustdag.
- ILL komt altijd, zonder instelling: de eigenaar koos op 15 november dat een training die je zelf vastzette op een zieke dag altijd in Let op staat. Daarom bewust geen instelling (afwijking van `2026-10-22-alles-instelbaar.md`, op zijn eigen verzoek).
- De tweede zin van ILL hoort bij de soort: bij ziek "Wat je mist terwijl je ziek bent, telt niet als gemist.", bij verkouden en de opbouw "Rustig bewegen mag wel, niets zwaars." De soort staat als veld op de bevinding (`Finding.illness`).
- Eén woord: overal "opbouw na ziekte".
- Het sleepblad heeft hoogstens twee zinnen, het droge feit eerst: de sterkste reden in één zin, en valt de dag ook dicht op een zware dag, de 48 uur kort ("Dicht op Benen A, liefst 48 uur ertussen."). Twee redenen zonder botsing: "Sportschool nodig, en je zit zonder sportschool. Dit is je rustdag." "Die is al geweest" staat er alleen als die dag voorbij is; een training van vandaag die al gelogd is, heb je "al gedaan".
- Een dag die al zegt wat Let op zou zeggen (rustdag, zonder sportschool, ziek), slaat die melding over in het voorbeeld onder de vinger (`DayVerdict.skipRules`).
- De datumkiezer in Week en op Vandaag weigert een dag die dicht is, met dezelfde zin als slepen ("Dinsdag 17 november valt nog in je ziekte.") onder de kop "Niet verplaatst." (`moveSuggestions.ts#keptRefusal`).
- De uitleg van IJkset noemt ook de week voor een wedstrijd, een rustige week en krachttraining uit.

## Reden

De eigenaar op 15 november, 22:15: "Maak die ene functie voor alle uitzonderingen." Die avond gingen drie dingen mis waar twee regels elkaar niet kenden. Het ontwerp van Cartographer (`docs/visie/Ontwerp een regel voor uitzonderingen.md`) vond twaalf gaten; de toetsen per gat staan in `src/engine/eenRegelUitzonderingen.test.ts`, de tabel en de vergelijking met de oude toetsen in `src/engine/dayRules.test.ts`.

## Alternatieven

- Elke stap zijn eigen toets laten houden en alleen de gaten dichten. Niet gekozen: zo ontstonden de fouten van 15 november, en zonder scan komt er een vierde poging.
- Ook de ronde omzetten. Niet gekozen, zie hierboven.
- Alles achter `reportYours`. Niet gekozen: de eigenaar koos een melding die altijd komt.

## Bron

Backlog I-67, het ontwerp in `docs/visie/`, `docs/beslissingen/2026-11-15-zonder-sportschool-verplaatst.md`, `docs/beslissingen/2026-11-15-ijkset-automatisch.md`.

## Vervangt

Niets. Vult de twee besluiten van 15 november aan: hun regels staan nu op één plek.

## Terugdraaien

Per stap een eigen commit op de branch: stap 0 (de functie), stap 1 (tellen), stap 2 (verplaatsen en Let op), stap 3 (Forge), stap 4 (voorstellen), dan de scan. Een stap terugdraaien zet de oude toets terug; de scan moet dan die aanroepen weer in de lijst krijgen. Er verandert geen opgeslagen vorm, dus geen migratie.
