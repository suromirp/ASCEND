# Back-up kleiner zonder dataverlies

Datum: 2026-11-16
Status: aangenomen

## Besluit

Een back-up heet voortaan schema 6. Het bestand bevat dezelfde gegevens als schema 5, alleen kleiner opgeschreven: uitleg die in voorstellen steeds terugkomt staat één keer in `proposalTexts` en de voorstellen verwijzen ernaar (`{ "$tekst": "t3" }`), en elk record (een log, een voorstel, de reeksen van één loop, een ochtend, één instelling) staat op één regel. Weekcontroles blijven allemaal staan. Wat in IndexedDB staat verandert niet, ook de kopieën van voor een import niet. Gevolg: een toestel met een oudere app weigert een bestand van schema 6 met "Werk de app bij"; de oudere app kan een verwijzing niet als tekst lezen. Een verwijzing die niet in de tabel staat wordt een lege tekst; het voorstel blijft staan.

## Reden

Een echte back-up was 2,5 MB, waarvan ongeveer 0,7 MB alleen inspringing. Die zat bijna helemaal in de diepe records (sets per oefening, wijzigingen per voorstel), niet in de horlogereeksen: die staan al als base64 op één regel. Eén record per regel haalt die inspringing weg en blijft te lezen en te doorzoeken. De tabel met teksten staat in het bestand zelf, niet in de code: een tekst die de app later anders formuleert, verandert zo nooit de geschiedenis in een oude back-up.

Weekcontroles zonder wijziging worden gelezen door de lijst Aangepast door ASCEND (`engine/changeLog.ts`, de soort `plan_check` telt als vanzelf) en door naspelen (of iets bij elke opening terugkomt, met tijdstip en de regels die rechtgezet werden). Een teller per dag zou het id, het tijdstip en die regels kwijtraken, en dan importeert een bestand niet meer terug naar precies dezelfde database. Hun vaste uitleg en herhaalde regels gaan wel mee in de tabel, dus ze zijn nu klein.

Op een nagemaakte back-up van echte omvang (`src/storage/backupCompact.test.ts`) wordt het bestand 21 procent kleiner; logs en voorstellen halveren. Nagespeeld met een echte back-up: van 2,55 naar 1,61 MB, en heen en terug elke store gelijk aan de oude vorm.

## Alternatieven

Vaste teksten als sleutel in de code: kleiner, maar een tekst die later verandert zou een oude back-up anders terugzetten dan hij was, en elke nieuwe tekst vraagt onderhoud. Het hele bestand zonder inspringing: nauwelijks kleiner dan één record per regel, en niet meer te lezen. Alleen de reeksen zonder inspringing: scheelt ongeveer 1 procent, omdat de reeksen al op één regel staan. Weekcontroles samenvatten tot een teller per dag: verliest wat naspelen en de lijst lezen. De reeksen inpakken (deflate) zou de grootste volgende stap zijn, maar vraagt een import die wacht op uitpakken; niet nu.

## Bron

Backlog I-63 en het punt "Back-up kleiner zonder dataverlies" (eigenaar 12 november).

## Vervangt

Niets. Schema 5 en ouder blijven te importeren zoals ze waren.

## Terugdraaien

`storage/backupFile.ts#backupFileText` vervangen door `JSON.stringify(envelope, null, 2)` en `CURRENT_BACKUP_SCHEMA_VERSION` laten staan op 6: de app leest dan beide vormen en schrijft weer de oude. Een bestand van schema 6 blijft importeerbaar zolang `migrationsCompact.ts#unpackProposalTexts` blijft.
