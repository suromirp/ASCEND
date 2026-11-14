# Ponytail en Graphify

Proef op 13 november 2026, in opdracht van de eigenaar ("Allebei"). Branch `claude/proef-ponytail-graphify`. Niets van beide staat in main.

## Wat er gedaan is

Ponytail (versie 5.3.3, MIT) en Graphify (PyPI `graphifyy` 0.9.108, Apache 2.0) zijn eerst nagelezen. Ponytail maakt geen netwerkaanroepen. De hook leest alle chatverslagen in `~/.claude/projects` alleen bij het commando `/ponytail band import`. Graphify heeft geen telemetrie, alleen een reclamelink voor Graphify Cloud in de terminal (uit met `GRAPHIFY_NO_TIPS`). De AI-stap kiest Graphify vanzelf als er een sleutel in de omgeving staat. Die stap is uitgezet met `GRAPHIFY_BACKEND=none`.

- Ponytail-audit: Warden draaide de skill `ponytail-audit` over `src/`, alleen lezen.
- Ponytail lite: Sherpa bouwde Kleding en wind met de regels van de lichte stand. Het schrijven van de hook in `~/.claude/settings.json` werd door de rechten geweigerd. Daarom kreeg de bouwer dezelfde tekst die de hook invoegt, gemaakt met de eigen functie van Ponytail (`getPonytailInstructions('lite')`), plus zijn codekaart. Alleen de hook zelf is dus niet getest.
- Graphify: een graaf van alleen de code van `src/`, in een kopie in de scratchpad. Sherpa bouwde Weer van de plek (vervolg) en gebruikte de graaf eerst, voor grep. CLAUDE.md is niet aangeraakt en `graphify install` is niet gedraaid.

## Ponytail

De audit kostte 188k tokens en 8,5 minuten op sonnet. Hij vond twaalf punten, waarvan drie als moet. Twee zijn door de coördinator in de code bevestigd. Bij Intervals.icu stopt de tijdgrens als de kop binnen is, en het lezen van de body heeft geen grens meer (`integrations/intervalsIcu.ts`). Bij het opstarten telt een herstelstap die een fout gooit als hangen, en dan worden de herstelstappen erna die start overgeslagen (`storage/bootMigrations.ts`). De meeste punten waren nieuw, alleen de ongebruikte componenten stonden al in de backlog. Hij las ongeveer 44 bestanden; pagina's, componenten en het grootste deel van engine bleven ongelezen. Het is een goede gerichte steekproef, geen volledige audit.

De bouwtaak met lite kostte 68k tokens en 18 minuten op sonnet, met 8 bestanden en +112 en -22 regels. Alle controles waren groen en er was geen herstelronde nodig tot aan de review. Een eerlijke vergelijking met dezelfde taak zonder Ponytail is er niet, want die is maar één keer gebouwd. Wat Ponytail zichtbaar deed: geen nieuwe component, een tabel met teksten weggehaald, en een deel van de taak (het kledingstuk noemen na de tik) zelf laten vallen als kleinere optie. Dat laatste had volgens lite aan de eigenaar voorgelegd moeten worden. Waar de regels botsten met CLAUDE.md won CLAUDE.md: meer tests dan "één test", een besluit, en de hulptekst bijgewerkt. Zijn codekaart (2000 tekens) bespaarde niets. `src/engine/` viel buiten de grens en stond er niet in.

Wat botst met onze regels: "geen opties of instellingen die niemand vroeg" tegenover "elke keuze instelbaar"; "één kleine test" tegenover de testeisen per geval; de standaardstand full voor elke helper als de hook aan staat, ook voor Warden en Lookout; en zelf kleiner kiezen waar de eigenaar beslist.

## Graphify

De graaf bouwen kostte 37 seconden, zonder AI. Hij heeft 14034 knopen, 61448 verbindingen en 229 groepen; graph.json is 21 MB. Een query duurt ongeveer een seconde.

De bouwtaak kostte 89k tokens en 19 minuten op fable. De vergelijkbare taak zonder graaf, Weer op de plek op 12 november (zelfde gebied, ook fable), kostte ongeveer $5,9 en 24 minuten; de tokens staan voor die taak niet in het logboek. De nieuwe taak is kleiner, dus het verschil in tijd zegt weinig. De bouwer deed negen aanroepen. `affected` en `explain` op een bekend symbool hielpen: de aanroepers met regelnummer, en welke scantests een bestand als tekst lezen. Een vraag in gewone taal hielp niet: die gaf honderden knopen uit het verkeerde hoekje. Dubbele namen vragen een tweede aanroep, en een verbinding via een route (`navigate('/weer')`) kent de graaf niet. Zijn eigen schatting: 2 tot 3 greps bespaard en 3 aanroepen verspild, netto ongeveer gelijk. De werkbriefjes wezen de bestanden al aan.

Wat botst met onze regels: `graphify install` schrijft in CLAUDE.md en zet een hook, en de AI-stap gaat vanzelf aan als er een sleutel in de omgeving staat. Beide zijn hier vermeden.

## Advies

Ponytail: alleen een deel houden. De skill `ponytail-audit` is als prompt bruikbaar voor de wekelijkse onderhoudsronde, naast of in de skill `onderhoud`, zonder plugin of hook. De lichte stand voor bouwers niet: onze regels dwingen het nuttige deel al af, en wat overblijft (zelf kleiner kiezen, minder tests, geen instellingen) botst met afspraken van de eigenaar.

Graphify: weg, of hooguit later opnieuw proberen. Bij deze repo met goede werkbriefjes leverde het netto niets op, en het vraagt een venv, 21 MB per graaf en een herbouw na elke wijziging. `affected` is het enige dat echt iets toevoegde; dat kan grep met een vaste zoekterm ook.

De cijfers in de posts (94 procent minder code, 80 procent minder tokens) zijn hier niet gezien. Beide tools zijn één keer getest op één taak, zonder blinde vergelijking op dezelfde taak. Het oordeel is dus voorlopig.

## Niet gecontroleerd

De hooks van Ponytail zelf (geweigerd door de rechten), de standen full en ultra (bewust niet), het MCP-deel en de AI-stap van Graphify, en de twee bouwerbranches: die hebben nog geen Warden, Lookout, Pathfinder of screenshot gehad en gaan zonder die poorten niet naar main.
