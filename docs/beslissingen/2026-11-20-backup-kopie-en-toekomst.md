# Back-up: een kopie van voor een import zet Laatste back-up niet terug, en Laatste back-up ligt nooit in de toekomst

Datum: 2026-11-20
Status: aangenomen

## Besluit

Bij het terugzetten van een kopie van voor een import (Ongedaan maken, of een kopie uit de lijst) blijft het nieuwste van de twee paren `lastExportedAt` en `lastBackupLogs` staan: dat van het toestel of dat van de kopie. Laatste back-up springt dus nooit terug in de tijd. En een `lastExportedAt` dat in de toekomst ligt wordt rechtgezet naar nu, met de lijst die erbij hoort.

Bij een import haalt de app een uitgezette soort niet meer uit een ochtend zonder bron (`import:<datum>`). Dat volgt uit `2026-11-20-ochtend-zonder-bron.md` en staat hier omdat het in dezelfde wijziging is gebouwd.

## De regel

Het paar bij een kopie, in `engine/backupSince.ts#newestBackupPair`:

1. Is het tijdstip van het toestel gelijk aan of later dan dat van de kopie, dan blijft het paar van het toestel staan.
2. Anders komt het paar van de kopie terug, tijdstip en lijst samen.
3. Een kopie zonder leesbaar tijdstip verandert niets aan het paar. Een toestel zonder back-up krijgt het paar van de kopie.
4. Beide tijdstippen tellen hoogstens als nu.
5. Al het andere in de kopie komt terug zoals voorheen; de regel gaat alleen over deze twee velden. Trainingen van daarna blijven staan.

De regel draait in dezelfde transactie als de import (`storage/backupApply.ts`, `settingsWrite`), op de instellingen zoals ze op dat moment zijn opgeslagen. Een fout halverwege laat alles zoals het was, ook de kopieën.

Laatste back-up in de toekomst, in `engine/backupSince.ts#straightBackupPair`:

1. Ligt `lastExportedAt` later dan nu, dan wordt hij nu. Hoorde de lijst bij dat tijdstip, dan krijgt die hetzelfde tijdstip, zodat de telling op id blijft. Een lijst die er niet bij hoorde blijft zoals hij is.
2. Nu of eerder, geen tijdstip of een onleesbaar tijdstip: er verandert niets en er wordt niets geschreven. Een back-up van eerder vandaag blijft dus staan; later vandaag is ook de toekomst.
3. De app kijkt bij elke start (`storage/backupTime.ts#straightenBackupTime`, aangeroepen uit `storage/bootMigrations.ts`) en bij elke import, voor de vergelijking met het bestand of de kopie. De stap bij de start staat niet in de lijst van opstartstappen, want de klok hoort niet bij een versie van de app. Hij kost één leesactie, gooit nooit en houdt het openen niet tegen.

Een ochtend zonder bron bij een import: `storage/backupApply.ts` schrijft hem heel. Het filter op uitgezette soorten (`engine/watchUse.ts#filterRecovery`) geldt bij een import alleen nog voor ochtenden met een bron. Bij `intervals.icu:` en `health-connect:` doet `pruneWellness` hetzelfde en kan de koppeling ze opnieuw leveren; `manual:`, `garmin:` en `macrofactor:` kan geen koppeling opnieuw leveren, en dat de import die nog filtert staat open in de Inbox. Elk scherm leest de ochtenden al door hetzelfde filter, dus de dag toont de soort niet, en aanzetten brengt het getal terug.

## Reden

Een kopie van 8 november terugzetten nadat op 15 november een back-up is gemaakt zette Laatste back-up op 8 november. Dat is hetzelfde terugspringen als bij I-68, alleen op het pad van de kopie (Warden, Mag 5). De automatische back-up haalde het vanzelf in, maar tot dan telde de app trainingen die in het bestand van 15 november staan als niet bewaard, en de herinnering sprak van een oudere datum.

Een tijdstip in de toekomst zet alles stil wat op "sinds" rekent: de automatische back-up komt niet, de herinnering ook niet, en het toestel wint van elk later bestand. Sinds I-68 kan een bestand dat niet meer veroorzaken, maar een toestel waar het al stond (een klok die voorliep, of een oudere versie die het tijdstip uit een bestand overnam) bleef zo tot de volgende back-up met de hand.

Met een bijpassende lijst telt de app hoogstens te veel, nooit te weinig. Een id staat alleen in de lijst als de training in een echt bestand staat: de back-up van het toestel zelf, of het bestand dat is ingelezen. Rechtzetten verandert de lijst niet, alleen het tijdstip.

Het filteren bij de import haalde een uitgezette soort voorgoed uit een ochtend die geen bron opnieuw kan leveren, en liet een ochtend met alleen die soort helemaal weg. Dat is verlies van gegevens van de gebruiker en wringt met het besluit dat een uitgezette soort de opslag van zo'n ochtend niet verandert.

Er is geen migratiestap. Geen opgeslagen vorm verandert: `AppSettings`, de envelop en `RecoveryMetric` zijn gelijk, `backupSchemaVersion` blijft staan en elke oude back-up en elke oude kopie blijft importeerbaar. Geen log wordt aangeraakt; dit is geen uitzondering op de historieregel.

## Alternatieven

- Het tijdstip bij het lezen begrenzen (`isAutoBackupDue`, `backupAge`) en de opslag laten staan. Niet gekozen: er zijn meer lezers (de herinnering op Vandaag, de telling op tijd, de vergelijking bij een import), en elke nieuwe lezer zou het weer moeten weten. Eén keer rechtzetten in de opslag houdt elke lezer simpel.
- Een tijdstip in de toekomst weghalen. Niet gekozen: dan zegt de app dat er nooit een back-up was en telt alles als niet bewaard, terwijl de lijst klopt.
- Het paar bij een kopie altijd van het toestel laten. Niet gekozen: Ongedaan maken op een toestel dat achterloopt zou het paar van de kopie dan niet terugbrengen.
- Het filter bij de import voor alle ochtenden weghalen. Niet gekozen: voor een ochtend met een bron haalt `pruneWellness` de uitgezette soort ook uit de opslag; een import zou hem dan weer terugzetten.

## Bekende grens

Zet iemand de klok van het toestel tijdelijk terug, dan ligt een echte Laatste back-up even in de toekomst en wordt hij bij de start op dat vroegere moment gezet. De lijst blijft, dus de telling klopt; de automatische back-up komt hoogstens een keer te vroeg.

Rechtzetten toont Laatste back-up vandaag, dus de automatische back-up komt hoogstens één periode later.

Een klok die achterloopt geeft een te vroeg tijdstip; daardoor kan later een ouder bestand winnen bij de vergelijking. Dat telt te veel, niet te weinig.

Een tijdstip in de toekomst zonder bijpassende lijst telt na rechtzetten op tijd en dus 0: de herinnering zwijgt zeven dagen en de automatische back-up slaat een periode over. Hier telt de app te weinig. Een strengere variant (zonder bijpassende lijst het paar weghalen) staat in de Inbox.

Na Ongedaan maken blijft een nieuwer paar van de import staan. De trainingen uit dat bestand blijven ook op het toestel (historie groeit alleen) en staan in dat bestand, dus dat ze als bewaard tellen is waar.

## Bron

Herstelopdracht van Warden van 20 november bij I-68 (Mag 5 en de noot bij Moet 2), I-93 en I-97 in `docs/backlog.md`. Tests: `src/engine/backupSince.test.ts`, `src/storage/backupKopie.test.ts`, `src/storage/backupTerugzetten.test.ts`, `src/storage/ochtendDubbel.test.ts`.

## Vervangt

Uit `2026-11-20-backup-terugzetten.md` punt 5 (een kopie brengt het paar terug zoals het was) en de laatste zin van punt 6 (een tijdstip dat al in de toekomst op een toestel staat blijft staan). De rest van dat besluit geldt. Het vult `2026-11-20-ochtend-zonder-bron.md` aan met de import; dat besluit blijft gelden.

## Terugdraaien

Zet in `settingsWrite` in `src/storage/backupApply.ts` `if (options.deviceCopy) return next;` terug en haal de aanroep van `straightenBackupTime` uit `src/storage/bootMigrations.ts`. Voor de ochtenden: laat `filterRecovery` weer over alle ochtenden van `morningsToImport` lopen. Er is geen opgeslagen vorm om terug te zetten; een tijdstip dat is rechtgezet blijft rechtgezet.

Aangevuld 22 november (I-101): de strengere variant is gebouwd. Bij een import wordt een tijdstip in de toekomst zonder bijpassende lijst met het paar weggelaten (`straightImportedPair` in `src/engine/backupSince.ts`), zodat de herinnering niet zeven dagen zwijgt en alles als nog niet bewaard telt. Bij het opstarten (`straightenBackupTime`) blijft rechtzetten zoals het was. Aangevuld 22 november (I-98): het ochtendfilter bij een import raakt alleen intervals.icu en Health Connect (`isPrunedMorning` in `src/storage/wellness.ts`, dezelfde lijst als `pruneWellness`).
