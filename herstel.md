# Herstelopdracht Back-up terugzetten (Warden, 20 november)

Branch `claude/backup-terugzetten`, commit 3cbd1a38 (I-68). Oordeel: AKKOORD voor main, op één voorwaarde die niets met de code te maken heeft: eerst opnieuw op origin/main zetten (Moet 1). In de code zit geen blokkerend punt. Moet 2 is drie regels en hoort liefst nog voor de squash mee.

## Controles

Gedraaid op de branch zelf (3cbd1a38), in een eigen kopie.

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen, één waarschuwing in `src/components/LegFatigueCard.tsx:25` die al op main staat.
- `npx vitest run`: 771 bestanden, 11656 van 11656 groen.
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: geen verschil (op de branch; na de herbasis opnieuw draaien, zie Moet 1).
- Geen gedachtestreepjes in de wijziging of het commitbericht, geen losse kleuren, geen persoonsgegevens; testdata is nagemaakt. Besluit, regel in het werkbriefje en `Klaar: I-68` zijn aanwezig.
- Proefmerge op origin/main (8c5da337, één commit verder dan de branch): de code voegt schoon samen, twee conflicten in de kennisindex (Moet 1).
- Niet tot het einde gedraaid: `npm run kaart:vergelijk` (na ruim vier en een halve minuut afgebroken, zoals vorige keer). De wijziging raakt geen scherm en geen tekst. Niet gedaan: een doorloop op een echte telefoon. De controles zijn niet opnieuw gedraaid op het resultaat van de proefmerge, omdat die niet schoon was.

## Proeven

Acht eigen proeven met nagemaakte gegevens door de echte opslag (`normalizeBackupToCurrentModel`, `buildImportPreview`, `applyImportPlan`, `restoreSnapshot`). Het proefbestand is na afloop weggehaald en staat niet op deze branch; de gevallen staan hieronder bij het punt waar ze bij horen, als testgeval.

## Wat klopt

- De regel draait in `settingsWrite`, binnen de transactie, op wat er op dat moment is opgeslagen. Proef: een back-up die tussen het voorbeeld en Akkoord wordt gemaakt (toestel naar 15 november met a en b, bestand van 8 november) blijft staan, telling nul.
- Beide sleutels worden in elk gewoon pad overschreven of weggehaald, ook als het bestand zelf een lijst draagt (gedownloade kopie) of een kapotte lijst (`lastBackupLogs: 'kapot'`). Er blijft nooit een tijdstip van de een met een lijst van de ander.
- Oude platte back-up (`schemaVersion` met `exportDate`) op een leeg toestel: het paar wordt `exportDate` met de ids uit het bestand, telling nul. Het tijdstip uit de instellingen in het bestand komt niet over.
- Envelop zonder tijdstip, met een leeg, kapot of niet-tekstueel tijdstip: het toestel blijft. `fileCreatedAt` is dan leeg en het moment van inlezen telt niet. Een datum zonder tijd (`2026-11-15`) leest als middernacht UTC en wordt als volledige UTC-tekst bewaard.
- Automatische back-up: het toestel noteert het begin van de poging, het bestand een tel later. Het bestand wint dan, met dezelfde ids; de telling verandert niet. Getest door de bouwer.
- Samenvoegen: instellingen en paar blijven van het toestel, ook op een leeg toestel.
- Kopie van voor een import en Ongedaan maken: `deviceCopy` slaat de regel over, de kopie brengt haar eigen paar terug. Logs blijven en tellen dan te veel, nooit te weinig.
- Gedownloade kopie op een ander toestel: volgt de gewone regel, de lijst van het eerste toestel komt niet mee. Mijn punt B1 van 15 november is daarmee opgelost.
- Fout halverwege: de transactie breekt af, instellingen, paar en logs zijn gelijk aan ervoor, Ongedaan maken werkt nog.
- Logs: de wijziging raakt alleen het instellingenrecord. Logs gaan nog steeds alleen als nieuwe rij (`historyWrite`, `onlyNew`). De test vergelijkt de hele lijst logs voor en na.
- Te weinig tellen kan in geen pad: een id komt alleen in de lijst als het log in een echt bestand staat (de back-up van het toestel of het bestand dat net is ingelezen).
- Geen vormwijziging zonder migratiestap, hier terecht. `fileCreatedAt` staat alleen op `NormalizedBackupData`, dat nergens wordt opgeslagen (het plan bewaart `backupCreatedAt`, de kopie de envelop). De derde parameter van `applyImportPlan` is optioneel met een lege standaard; de enige aanroeper die hem zet is `restoreSnapshot`. `AppSettings` en de envelop zijn ongewijzigd, `backupSchemaVersion` hoeft niet omhoog.
- De logica staat in `src/engine/backupSince.ts` en is daar getest; `backupApply.ts` roept alleen aan.

## De drie omgedraaide tests

Alle drie terecht.

- `src/storage/backupCompact.test.ts:249` (heen en terug): `lastExportedAt` gaat uit de vergelijking en wordt apart getoetst tegen `createdAt` van het eerste bestand. De rest van de vergelijking is even streng als eerst.
- `src/storage/backupTelling.test.ts:43` (oude back-up zonder het veld): verwacht nu het tijdstip van het bestand met de ids. Het log van daarna kreeg een tijd van voor de back-up (8 november in plaats van 11 november); de test bewijst daardoor nu ook dat er op id wordt geteld. Sterker dan eerst. De terugval op tijd bij een ontbrekende lijst blijft getoetst in `src/engine/backupSince.test.ts`.
- `src/storage/backupTelling.test.ts:59` (instellingen van de back-up): verwacht nu dat het toestel blijft. Let op: ook de opzet is veranderd, niet alleen de verwachting. De lijst van het toestel ging van leeg naar `['log_a']` en het bestand kreeg een eigen tijdstip. Dat is juist: een back-up van 15 november op een toestel met log_a van 14 november bevat log_a, de lege lijst was kunstmatig.

## Punten

### Moet 1: de branch loopt een commit achter op main, een squash zoals afgesproken zou die commit terugdraaien

`docs/kennisindex/README.md:14` en `docs/kennisindex/bronnen.json:883`.

Main is bewogen naar 8c5da337 (besluit gemengde bouwers en wissel, overdracht, twee skills). De squash gaat met `git commit-tree HEAD^{tree} -p origin/main`: die neemt de boom van de branch en zou alles uit 8c5da337 stil weghalen. Een gewone merge geeft twee conflicten, beide omdat elke kant een document aan de index toevoegde.

Voorstel: de branch op origin/main zetten, in `bronnen.json` beide regels houden, daarna `npm run kennisindex` in plaats van de telregel met de hand te kiezen (verwacht: 557 documenten, 339 gelden, 83 deels ingehaald). Testgeval: `npm run kennisindex:vergelijk` zegt "Geen verschil met docs/kennisindex/." en `git diff origin/main --stat` toont alleen de veertien bestanden van deze wijziging.

### Moet 2 (open punt a): een tijdstip in de toekomst zet de automatische back-up en de herinnering stil

`src/engine/backupSince.ts:39-43` en `src/storage/backupApply.ts:150`.

Ja, afvangen. Het is meer dan een rare datum. Proef: toestel met een back-up van 15 november, bestand met `createdAt` 20 november 2027. Na terugzetten staat `lastExportedAt` op 2027. Een maand later zegt `isAutoBackupDue` (dagelijks) nee, waar het met 15 november ja zegt, en `backupAge` geeft 0 dagen en niveau ok in plaats van 35 dagen en oud. De app maakt dus tot die datum geen automatische back-up en herinnert ook niet. Bovendien wint het toestel daarna van elk bestand. Het vraagt een bestand van een toestel met een verkeerde klok of een met de hand aangepast bestand, en een back-up met de hand herstelt het. Dezelfde soort fout kon voor deze branch ook via de instellingen in het bestand binnenkomen; nieuw is dat het nu het tijdstip van het bestand zelf is. Daarom niet blokkerend, wel de moeite van drie regels.

Voorstel: begrens op nu. `backupPairAfterRestore` krijgt een vierde parameter `nowMs` (de engine blijft zonder klok), `settingsWrite` geeft `Date.now()` mee, en de functie rekent met `Math.min(fileMs, nowMs)`, zowel in de vergelijking als in wat bewaard wordt. Een bestand uit de toekomst wordt dan "net teruggezet": Laatste back-up is nu, met de ids uit het bestand. Dat is waar (alles in dat bestand is bewaard) en telt hoogstens te veel. Het alternatief, een tijdstip in de toekomst als onbruikbaar behandelen (regel 3), is ook veilig maar laat een leeg toestel zeggen dat er nooit een back-up was. Een regel erbij in het besluit.

Testgevallen: (1) engine: toestel 15 november, bestand 20 november 2027, nu 20 november 2026 12:00 UTC geeft `backupMadeSettings('2026-11-20T12:00:00.000Z', ids)`; (2) engine: bestand precies op nu en een seconde ervoor blijven ongewijzigd; (3) opslag: na terugzetten van zo'n bestand is `lastExportedAt` niet later dan nu en zegt `isAutoBackupDue` de volgende dag ja.

Niet in deze wijziging, wel noemen: een `lastExportedAt` dat al in de toekomst op een toestel staat blijft staan tot de volgende back-up met de hand. Mag als eigen Inboxpunt (bij het lezen begrenzen in `isAutoBackupDue` en `backupAge`).

### Mag 3 (open punt b): het voorbeeld voor Akkoord telt het paar nog volgens de oude overname

`src/storage/backupPreview.ts:195-202`.

Proef: je eigen back-up terugzetten op hetzelfde toestel, verder niets veranderd. Het voorbeeld zegt bij Instellingen "1 wordt bijgewerkt" (`lastExportedAt` van 15 naar 8 november), terwijl de import geen enkele instelling wijzigt. Omgekeerd telt het voorbeeld niets als het bestand wint en het paar wel verandert. Het is één tel in een regel tekst, er gaat niets mis met gegevens, en `resolved.settings` uit `computeDiff` wordt op dit pad niet geschreven (de functie in `settingsWrite` gaat voor). Niet blokkerend.

Voorstel: Laatste back-up is geen keuze van de gebruiker, dus de twee sleutels horen niet in de telling. Sla `lastExportedAt` en `lastBackupLogs` over in de lus die `settingsChanges` vult. Liever geen tweede kopie van de regel in het voorbeeld: die zou tussen voorbeeld en Akkoord kunnen verschillen van wat de transactie doet. Testgeval: toestel 15 november, bestand van 12 november met 8 november in de instellingen, verder gelijk: `settingsChanges` is leeg en `toReplace` is 0.

### Mag 4: Ongedaan maken brengt het paar niet terug als het toestel voor de import nog geen back-up had

`src/storage/backupApply.ts:145-146` en het besluit, punt 5.

Proef: toestel zonder Laatste back-up, bestand van 15 november teruggezet (paar wordt 15 november met a), daarna Ongedaan maken. Het paar blijft 15 november met a. De kopie heeft de twee sleutels niet, en een ontbrekend veld betekent niet aanraken. Dat past bij de valkuil in het werkbriefje en het is niet onwaar: log a blijft op het toestel en staat in dat bestand. Maar het besluit zegt "brengt het terug zoals het was", en dat klopt hier niet. Bestond in deze vorm ook voor de branch.

Voorstel: de zin in het besluit aanvullen ("had het toestel toen nog geen back-up, dan blijft het paar van de import staan"). Niet de code: weghalen zou alles weer als niet bewaard tellen terwijl het in een bestand staat. Testgeval: bovenstaande proef, met de verwachting vastgelegd.

### Mag 5: een kopie van voor een import zet Laatste back-up terug in de tijd

`src/storage/backupApply.ts:146` (`if (options.deviceCopy) return next`).

Zo besloten ("zoals voorheen") en door de bouwer getest: een kopie van 8 november terugzetten nadat op 15 november een back-up is gemaakt zet Laatste back-up op 8 november. De lijst komt mee, dus de telling is op id en hoogstens te veel, en de automatische back-up haalt het vanzelf in. Maar het is hetzelfde terugspringen waar I-68 over ging, alleen op het pad van de kopie.

Voorstel: later dezelfde regel ook hier, met het paar uit de kopie als kandidaat: het nieuwste van de twee paren blijft. Vraagt een regel in het besluit, eigen Inboxpunt.

### Mag 6: de regel draait alleen als de instellingen worden vervangen

`src/storage/backupApply.ts:142`.

Twee randen, beide te veel en nooit te weinig. Een oud plat bestand zonder instellingen op een leeg toestel laat het paar leeg: alles telt als niet bewaard, terwijl het in het bestand staat. En bij Eigen keuze met instellingen vervangen maar trainingen laten staan wordt het bestand de laatste back-up met ids die niet op het toestel staan; trainingen a en b uit de eigen back-up van 8 november tellen daarna weer mee.

Voorstel: zo laten en in het besluit zeggen dat de regel aan het vervangen van de instellingen hangt. Wie het strakker wil: het bestand alleen laten winnen als ook de trainingen worden ingelezen (`touches(historyAction)`).

## Nieuwe valkuilen voor het werkbriefje koppelingen-en-data

- Een tijdstip uit een bestand is van een andere klok: begrens het op nu voordat je het bewaart of ermee vergelijkt. Een tijdstip in de toekomst zet alles wat op "sinds" rekent stil (`isAutoBackupDue`, `backupAge`).
- Het voorbeeld voor Akkoord telt alleen wat de import echt schrijft: een veld dat `settingsWrite` zelf bepaalt, hoort niet in `settingsChanges`.
- De squash neemt de boom van de branch: loopt de branch achter op main, dan verdwijnt wat main intussen kreeg. Eerst op origin/main zetten, dan pas de squash.

## Slot

Akkoord voor main, na Moet 1 (opnieuw op origin/main, kennisindex opnieuw maken, controles opnieuw groen). Moet 2 liefst in dezelfde squash, anders als eerste vervolg.
