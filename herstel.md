# Herstel I-84: ochtend dubbel (Warden, 20 november 2026)

Review van claude/ochtend-dubbel (116ebc39) tegen main. Controles groen: tsc, lint, vitest (776 bestanden, 11701 tests), build, kennisindex. Niet akkoord voor main tot M1 gedaan is (M2 doet de coördinator bij de squash).

Goed en blijft: de leesvolgorde (orderBySource), doubleMornings, morningsToImport, opruimen alleen na een geslaagde ronde, de opstartstap, geen migratie, geen uitzondering op logs.

## M1 (Moet): een ochtend zonder bron hoort niet bij de koppeling

Plek: src/engine/morningDouble.ts#belongsToLink, gebruikt in src/storage/wellness.ts (ofLink in syncWellness, clearWellness, pruneWellness) en src/engine/morningBackup.ts#archiveToClear.

Reden: de aanname "ASCEND heeft geen scherm om een ochtend in te vullen, dus hij kwam ooit van een koppeling" klopt niet.
- ASCEND schreef nooit een ochtend zonder id: morningsForBackup zet het id er al in sinds de eerste versie (66fffa81). Een ochtend zonder id komt dus uit een bestand dat iemand zelf maakte of bewerkte (docs/onderhoud/2026-11-16-onderhoudsronde.md: "een oude of handgemaakte back-up").
- De commentaar in src/storage/migrationsBody.ts#migrateMornings zegt het omgekeerde: het id komt uit de eigen bron "zodat een ochtend die je zelf invulde nooit voor een opgehaalde van intervals.icu doorgaat".
- import:<datum> ontstaat ook bij een onbekende bron en bij source 'import' zonder id.

Nagespeeld met nagemaakte ochtenden:
- Ontkoppelen met "Ochtendgetallen in back-up" uit: import:2026-11-10 is weg, terwijl health-connect: en manual: blijven. Health Connect haalt hem niet terug.
- Een ronde ophalen met die instelling uit: import:2025-01-10 (ouder dan 400 dagen) gaat stil weg. Voor deze wijziging bleef hij staan.
- HRV uitzetten onder "Wat ASCEND van je horloge gebruikt", archief aan: import:2025-01-10 met alleen HRV is weg, import:2026-11-10 verliest zijn HRV, zonder vraag of Ongedaan maken. Botst met de valkuil in het werkbriefje.

Fix:
- Haal belongsToLink weg. syncWellness (400 dagen), clearWellness en pruneWellness kijken weer alleen naar intervals.icu: (en pruneWellness naar health-connect:), zoals op main.
- Een ochtend zonder bron gaat alleen nog weg via doubleMornings (gedekt). Na ontkoppelen blijft tidyDoubleMornings draaien: met het archief aan dekt de bewaarde opgehaalde ochtend hem, met het archief uit blijft hij staan.
- Een uitgezette soort: laat de opslag van import: met rust en filter bij het lezen (filterRecovery in getRecoveryMetrics, of in orderBySource de import:-rij door het filter halen).
- archiveToClear: import: mag in de lijst blijven (daar staat een vraag en Ongedaan maken); zeg het dan in de tekst van MorningBackupOff als er ochtenden uit een bestand bij zitten, of laat ze eruit. Kies één en test het.
- Tests: ontkoppelen met archief uit laat import: staan (ook met Health Connect aan); een ronde met archief uit laat import: van voor de grens staan; een soort uitzetten laat de opslag van import: gelijk en de dag toont de soort niet.
- Besluit: een nieuw bestand in docs/beslissingen/ dat de regel Ontkoppelen en de reden uit 2026-11-20-ochtend-dubbel.md vervangt (niet herschrijven), met een regel in bronnen.json. Pas de zin in het werkbriefje aan.

## M2 (Moet, bij de squash, coördinator): verslag-I-84.md uit de root

## G1 (Mag, mee): een gedekt getal en een bron die later minder geeft
Bestand HRV 66, ronde 1 geeft HRV 60 (ochtend zonder bron weg), ronde 2 geeft dezelfde dag zonder HRV: de dag heeft geen HRV meer. Fix: zet het in het besluit als bekende grens.

## G2 (Mag, mee): lezen en weghalen in één transactie
src/storage/wellness.ts#tidyDoubleMornings: getAll en deleteMany zijn twee stappen. Fix: lezen, beslissen en weghalen in één readwrite-transactie op recoveryMetrics, zoals commitHealthRound.

## G3 (Mag, mee): clearWellness roept tidyDoubleMornings aan, niet de stille variant
Gooit die, dan faalt clearConnection nadat de sleutel al weg is. Fix: tidyDoubleMorningsQuietly.

## G4 (Mag, mee): tests op elke plek van de regel
De Health Connect-ronde (healthConnect.ts#runRound) en fetchLongStretch ruimen op zonder eigen test. Fix: een geslaagde ronde ruimt een gedekte ochtend op, een mislukte of uitgezette ronde laat alles staan.

## G5 (Mag, later): het opruimen bij de start laat geen spoor na

## Regels voor het werkbriefje koppelingen-en-data (Valkuilen)
- Een ochtend zonder bron (import:<datum>) is van de gebruiker, niet van een koppeling: ASCEND schreef er zelf nooit een. Hij gaat alleen weg als hij gedekt is, nooit bij ontkoppelen, de grens van 400 dagen of een uitgezette soort.
- Wie een regel breder toepast dan de opdracht vroeg, schrijft op elke nieuwe plek een test die laat zien wat er verdwijnt.
