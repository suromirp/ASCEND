# Back-up: eerlijk tellen en een laat antwoord blijft van de app

Datum: 2026-11-15
Status: aangenomen

## Besluit

"Sinds je laatste back-up" telt de trainingen die niet in dat bestand staan, op id, niet op tijdstip. Een schrijfactie die na de tijdsgrens alsnog landt is van de app: de volgende poging vervangt dat bestand onder dezelfde naam, in plaats van er -2 naast te zetten.

## Reden

De herinnering op Vandaag ("Je N trainingen staan alleen op deze telefoon", "N trainingen sinds je laatste back-up") en de regel bij Back-up op Gegevens telden logs met een `completedAt` na de back-up. Een Forge-training van gisteren die je na de back-up van vandaag afrondt krijgt de tijd van haar laatste set, van gisteren, en telde dus niet mee terwijl ze in geen enkele back-up staat (I-55). Terugzetten telde al op id (`storage/backupPreview.ts#logsNotInBackup`).

Daarom bewaart de app bij elke gelukte back-up, met de hand of vanzelf, de ids van de trainingen in dat bestand, met hetzelfde tijdstip als Laatste back-up (`AppSettings.lastBackupLogs`). Eén pure functie telt voor beide plekken (`engine/backupSince.ts#logsNotInLastBackup`). Hoort de lijst niet bij de laatste back-up, of ontbreekt ze (een oudere app, of instellingen die van een back-up terugkwamen), dan telt de app zoals eerst, op tijd. Het veld is optioneel en wordt defensief gelezen; een kapotte waarde telt als "niet bekend". Daarom is er geen migratiestap: een oude stand en een oude back-up lezen als leeg (test met een back-up zonder het veld in `storage/backupTelling.test.ts`). De lijst hoort bij dit toestel en gaat niet mee in een gewone back-up; alleen de kopie van voor een import neemt hem mee. De zinnen zelf veranderen niet.

Een tijdsgrens stopt de schrijfactie niet (I-50). De automatische back-up gaf na een laat antwoord van de telefoon bij de volgende poging een bestand met -2, en het eerste bestand stond in geen lijst en werd dus nooit opgeruimd. Nu onthoudt de app bij een time-out de naam (`halfWritten`), ook als de hele poging al was opgegeven en het bestand toch landt; de volgende poging vervangt het en zet het in de eigen lijst. Een opgegeven poging ruimt niets op, want een nieuwere kan op dezelfde naam bezig zijn. Een onthouden naam hoort bij de map waar hij geschreven is: in een andere map geeft hij nooit recht om een bestand te vervangen, en een andere vaste map kiezen vergeet alle onthouden namen (Warden B4). Bij Back-up maken met de hand geldt hetzelfde: een nieuwe tik na een opgegeven poging mag de naam vervangen waar die poging aan schreef. Afmaken (`keep`) en opruimen (`tidy`) hebben bij de hand een eigen grens van 5 seconden: het bestand staat er dan al, dus een map die daar hangt maakt de back-up niet mislukt.

Resten van een poging (`<naam>.<id>.tmp` en `.old`) herkent de app aan een vast begin van het id (`ascpoging`). Een bestand dat je zelf hernoemde, ook met een eigen woord van tien tekens of meer, valt er niet onder en blijft staan. Resten van een oudere app, zonder dat begin, blijven ook staan: liever een overbodig bestand dan een bestand van jou weg.

De regel voor de hele laag blijft: een leesfout of time-out haalt nooit een goed bestand weg.

## Alternatieven

De ids in Meta bewaren, naast de staat van de automatische back-up: dan moet Vandaag een tweede bron laden en bijhouden, voor iets dat bij Laatste back-up hoort. Alleen een telling bewaren: zegt niets over welke trainingen er later bijkomen of verdwijnen. Bij elke start het laatste bestand teruglezen: kost tijd, en in de browser is het bestand er vaak niet.

## Bron

Review van Warden op 15 november (I-50, I-55 in `docs/backlog.md`), `docs/beslissingen/2026-11-15-backup-eerste-keer.md`, `docs/beslissingen/2026-11-15-dag-van-afronden-opnieuw-afvinken.md`.

## Vervangt

Niets. Het besluit over de eerste tik van 15 november blijft staan; dit vult het aan.

## Terugdraaien

Laat `Today.tsx` en `GegevensSheets.tsx` weer op `completedAt` tellen en laat `lastBackupLogs` ongelezen staan; het veld kan blijven. Voor de namen: haal `halfWritten.add` bij een time-out en `Abort.writing` weg in `src/storage/autoBackup.ts` en `src/storage/manualBackup.ts`.
