# Warden: back-up eerste keer, herstelronde 2

Branch `claude/backup-eerste-keer`, alleen de diff 9d8dcbe6..40679346.
Datum: 15 november 2026. Vorige ronde: `herstel.md` op `warden/backup-herstel`.

## Uitslag

Geen blokkerende bevinding. Moet 1 tot en met 4 van de vorige ronde zijn opgelost. Het herstel opent wel één nieuwe naad (moet 5): de automatische back-up onthoudt de naam niet meer als weghalen van een kapot bestand mislukt. Geen verlies, wel een kapot bestand onder de eerste naam en een volgnummer ernaast.

Niet akkoord voor main zolang moet 5 open staat. Het is een wijziging van een paar regels met een test; daarna volstaat een blik op de diff.

## De vier punten van de vorige ronde

1. Moet 1, opgelost. `writeThroughTemp` haalt `.old` niet meer zelf weg en geeft `keep` en `undo` terug (`backupFolder.ts:214` tot `223`). Met de hand en automatisch roepen `keep` alleen na 'ok' en `undo` alleen na 'broken' (`manualBackup.ts:103` tot `111`, `autoBackup.ts:299` tot `305`). Bij 'unknown' gebeurt geen van beide: het nieuwe bestand en `.old` blijven allebei staan. De test "een goede back-up gaat nooit verloren aan een kapotte opvolger" (`manualBackup.test.ts`) speelt precies mijn geval van vorige keer na en valt zonder het terugzetten (mutatie N1), met het oude gedrag (N2) en als de aanroeper `remove` gebruikt in plaats van `undo` (N3 met de hand, N4 automatisch).
2. Moet 2, opgelost. M5 valt nu, op de test "stat blijft haperen op een naam waar een echt ander bestand staat". Ook de strengere vorm (elke stat-fout is vrij) valt.
3. Moet 3, opgelost op één tak na. M11 en M12 vallen op de nieuwe `backupFileAdapter.webFolder.test.ts`. De tak "geen map bij nakijken" (`backupFileAdapter.ts:233`, bij mij M20) overleeft nog: de nagemaakte map geeft altijd een handle terug. Ik reken dat als mag 1 en niet als moet, omdat `remove` zonder map niets kan weghalen; het gevaar van de vorige ronde (een leesfout haalt in de browser het bestand weg) is met M12 vastgepind. Kanttekening: de nummering van M12 en M20 heb ik uit de regelnummers van vorige ronde afgeleid.
4. Moet 4, opgelost volgens de keuze van de coördinator. `exists` in de Android-map kijkt bij een stat-fout na 300 ms nog één keer (`backupFolder.ts:239` tot `251`). De test "stat hapert een keer op een lege map" geeft de eerste naam zonder -2 en valt zonder de tweede blik (N5). Twee haperingen op rij tellen als bezet; het besluit zegt dat nu ook zo.

## Moet

5. Nieuw door dit herstel. `undo` vangt elke fout zelf op en gooit nooit (`backupFolder.ts:218` tot `222`). De automatische back-up leest "undo is afgelopen" als "het bestand is weg" (`autoBackup.ts:300` tot `302`) en haalt de naam dan uit `halfWritten`. Lukt het weghalen van het kapotte bestand niet, dan blijft het staan en is de naam niet onthouden. Nagespeeld met `writeThroughTemp` achter `runAutoBackupIfDue`: poging 1 komt afgekapt aan en weghalen mislukt, uitkomst mislukt, het kapotte bestand van 10 tekens staat onder de eerste naam. Poging 2 twee uur later lukt, maar als `ascend-2026-11-02-2.ascend-backup.json`; het kapotte bestand blijft onder de eerste naam staan en komt nooit in de lijst die wordt opgeruimd. In 9d8dcbe gooide `target.remove` hier, werd de naam onthouden en verving poging 2 het bestand; de bestaande test daarvoor (`autoBackup.test.ts:287`) loopt over een nagemaakte map zonder `undo` en ziet het dus niet. Het besluit zegt letterlijk "lukt weghalen niet, dan onthoudt de app de naam". Er gaat niets goeds verloren, maar een -2 naast een bestand dat niet te herstellen is, is het symptoom waar dit onderwerp mee begon. Voorstel: na `undo` kijken wat er staat, zoals met de hand al gebeurt (`manualBackup.ts:107`): staat de naam er nog, dan onthouden, anders vergeten. Met een test op een map die `undo` teruggeeft en waar weghalen mislukt.

## Mag

1. De tak zonder map in `verify` van de vaste map (`backupFileAdapter.ts:233`) heeft geen test (M20 overleeft). Zie punt 3.
2. De blik in `undo` (`backupFolder.ts:221`: alleen terugzetten als de naam leeg is) is niet vastgepind (N6 overleeft) en werkt tegen het doel in. Lukt het weghalen van het kapotte nieuwe bestand niet, of hapert stat twee keer, dan komt het goede oude bestand niet terug en blijft het staan als `<naam>.<poging>.old`. Niet verloren, wel onvindbaar voor de eigenaar en voor Herstellen, en een volgende gelukte back-up op die naam ruimt het op. Wat op dat moment onder de naam staat is gelezen en kapot, of weg; terugzetten zonder die blik is hier veiliger dan met.
3. `tidy` (`backupFolder.ts:322`) haalt alles weg dat met `<naam>.` begint en op `.tmp` of `.old` eindigt, dus ook `<naam>.old` zonder poging ertussen. Wie een back-up van vandaag zelf zo hernoemt, raakt hem kwijt bij de volgende gelukte back-up op die naam. Vergezocht, maar de regel is dat alleen eigen resten weggaan. Voorstel: het patroon van de poging erbij (`\.[a-z0-9]+\.(tmp|old)$`).
4. De vaste map in de browser geeft geen `undo` terug. Een eigen bestand van vandaag dat daar wordt vervangen door een bestand met de verkeerde grootte gaat nog steeds weg. De browser schrijft via een wisselbestand en zet pas bij sluiten om, dus dit is in de praktijk niet te raken; alleen genoemd omdat de regel nu op één plek wel en op één plek niet geldt.
5. De punten mag 1, 2, 3 en 6 van de vorige ronde staan nog open (M7, M10, M22 en M23 zijn niet opnieuw gedraaid). Mag 4 (rommel van `.tmp` en `.old`) is opgelost met `tidy`, mag 7 (de regel in het werkbriefje) is overgenomen.

## Nieuwe naden nagekeken

- Een leesfout leidt nooit tot weghalen of overschrijven: goed. `undo` loopt alleen na 'broken'. De mutaties die `undo` ook bij 'unknown' laten lopen vallen, met de hand (N8) en automatisch (N9). Bij 'unknown' blijft `.old` staan; `tidy` haalt het pas weg na een volgende back-up op die naam die goed is nagekeken. Een keten van onbekend, onbekend, kapot, goed met de hand doorgelopen: op elk moment staat de laatste goede back-up onder de naam of als `.old`.
- Tweede snelle tik: goed, ongewijzigd. Eén poging per map; de tweede blik bij een stat-fout maakt de poging hoogstens 300 ms per naam langer en valt binnen de grens van 20 seconden.
- Automatische back-up: goed bij een leesfout en bij een kapotte opvolger van het eigen bestand van vandaag (test aanwezig, valt bij N4). Zie moet 5 voor weghalen dat mislukt.
- `tidy` naast een poging die nog loopt: met de hand is er één poging per map en na 60 seconden een andere minuut, dus een andere naam; automatisch krijgt een late poging een andere naam. Geen pad gevonden waarin `tidy` het tijdelijke bestand van een lopende poging raakt.
- Geen gewijzigde opgeslagen vorm, geen migratie nodig. Geen gedachtestreepjes in de nieuwe regels, geen persoonsgegevens. Het besluit en het werkbriefje zijn bijgewerkt in dezelfde wijziging; geen nieuw document, dus de kennisindex verandert niet.

## Mutaties

Gevangen (13): M5 twee stat-fouten zijn vrij, M5b elke stat-fout is vrij, M11 elke fout bij kijken in de browser is vrij, M12 leesfout in de browser is kapot, N1 undo zet niet terug, N2 `.old` meteen weg, N3 met de hand remove in plaats van undo, N4 automatisch remove in plaats van undo, N5 geen tweede blik bij een stat-fout, N7 tidy haalt elke `.old` en `.tmp` weg, N8 en N9 undo ook bij onbekend, N10 keep voor undo.

Overleeft (2): M20 geen map bij nakijken is kapot (mag 1), N6 undo zet terug zonder te kijken (mag 2).

## Controles

Op 40679346, zonder proefmerge:

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npx vitest run` voor de back-uptests (`backupFolder`, `autoBackup`, `manualBackup`, `backupFileAdapter`, engine): groen, 7 bestanden, 128 tests.

Niet gecontroleerd: de volle testronde, lint, build, kaart en kennisindex zijn deze ronde niet gedraaid, alleen de back-uptests en de typecontrole zoals gevraagd. Geen proefmerge met `origin/claude/nacht`. De willekeurige proef met 4000 mappen van vorige ronde is niet herhaald. Een echt toestel blijft ongemeten.

Niet akkoord: moet 5 (de automatische back-up onthoudt de naam niet als weghalen van een kapot bestand mislukt).
