# Herstelopdracht Back-up telling (Warden, 15 november)

Branch `claude/backup-telling`, commit 74b5f18 (I-50, I-55). Oordeel: AKKOORD voor main, geen blokkerend punt. Twee moet-punten, één ervan is één regel en hoort liefst nog voor de squash mee.

De branch staat recht op origin/main (5d68b877), geen conflict.

## Controles

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen, één waarschuwing in `src/components/LegFatigueCard.tsx:25` die al op main staat.
- `npx vitest run`: 11232 van 11232 groen.
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: geen verschil.
- Geen gedachtestreepjes in de wijziging of het commitbericht, geen losse kleuren, geen persoonsgegevens, besluit en valkuil in het werkbriefje aanwezig.
- Niet gedraaid tot het einde: `npm run kaart:vergelijk` (liep langer dan vijf minuten). Niet gedaan: een doorloop op een echte telefoon; alle paden zijn met nagemaakte mappen getoetst.

## Proeftests

`src/storage/wardenTelling.proef.test.ts`, 14 tests, allemaal groen op de branch. Ze leggen vast wat de code nu doet. Waar dat een bevinding is, staat B en een nummer in de naam; na het herstel draait de verwachting van die test om.

## Wat klopt

- In beeld: een Forge-log van gisteren dat na de back-up is bewaard telt mee, op id.
- Weg: een log uit de lijst dat van het toestel verdween geeft nul, nooit een negatief getal.
- Kapot veld: null, tekst, getal, lijst, leeg object, een verkeerd tijdstip of ids die geen lijst zijn vallen terug op `completedAt`. Ids die geen teksten zijn tellen alles als niet bewaard: te veel, nooit te weinig.
- Oude back-up zonder het veld: importeert, en telt op tijd (test van de bouwer, bevestigd).
- Alles verwijderen: tijdstip en lijst weg, telling nul.
- Terugzetten van een kopie: tijdstip en lijst komen samen terug. Wat daarna in een back-up kwam telt weer mee; te veel, nooit te weinig.
- Gewone back-up: het veld gaat niet mee.
- Automatisch, laat antwoord voor de tweede poging, door de echte schrijflaag (`writeThroughTemp`): één bestand, geen -2, geen rest, in de eigen lijst.
- Een vreemd bestand en een eigen woord (`.mijnkopie12345678.old`, `.zondagavond22.tmp`, `.old`) blijven staan na opruimen; alleen de rest met `ascpoging` gaat weg.
- Met de hand: een leesfout bij het nakijken haalt het bestand niet weg, en de volgende tik vervangt het zonder -2.
- Geen vormwijziging zonder migratiestap: hier veilig. Het veld is optioneel, komt er alleen bij, heeft één lezer en die leest defensief; de vorm van een gewone back-up verandert niet, dus `backupSchemaVersion` hoeft niet omhoog. Een migratiestap zou niets te doen hebben.

## Punten

### Moet 1 (B4): een andere map na een time-out schrijft over een vreemd bestand

`src/storage/autoBackup.ts:149` (`forgetAutoBackupFolder`) en `:292` (`halfWritten.add(candidate)`).

`halfWritten` kent alleen namen, geen map. Na een time-out in map A en een andere vaste map B (browser) slaat de volgende poging de blik op `exists` over en schrijft over het bestand `ascend-<dag>.ascend-backup.json` dat al in B stond, bijvoorbeeld van een ander toestel in een gedeelde map. Voor deze branch gaf dat -2. Wie een mislukte back-up ziet, kiest juist dan een andere map. Nieuw door deze wijziging.

Voorstel: `halfWritten.clear()` in `forgetAutoBackupFolder`, of de namen per map bijhouden zoals `orphans` in `manualBackup.ts`. Test: B4 omdraaien (het vreemde bestand blijft, de app schrijft -2).

### Moet 2 (B2): na Terugzetten van je eigen back-up telt de app weer op tijd, en dan het verkeerde log

`src/storage/backupApply.ts:138-141` (de instellingen uit het bestand gaan over die van het toestel) en `src/engine/backupSince.ts:36`.

In een back-up staat `lastExportedAt` van de back-up daarvoor. Bij volledig terugzetten springt Laatste back-up dus terug (hier van 15 naar 8 november), de lijst van het toestel past niet meer bij dat tijdstip, en de telling valt terug op tijd. In de proef zegt de app daarna 1, maar het is het log dat wel in de back-up staat; het Forge-log van I-55 telt niet. Samenvoegen gaat goed (de instellingen van het toestel blijven). Het terugspringen bestond al; I-55 is op dit pad dus nog niet opgelost tot de volgende back-up.

Voorstel: `lastExportedAt` hoort net als `lastBackupLogs` bij het toestel. Laat een import het paar van het toestel staan als dat nieuwer is dan het tijdstip in het bestand (in `settingsWrite`), of haal `lastExportedAt` ook uit een gewone back-up. Vraagt een regel in het besluit. Mag als eigen Inboxpunt.

### Mag 3 (B3): een laat antwoord na de tweede poging zet de oude tekst over de nieuwe back-up

`src/integrations/backupFolder.ts:180-188` en `src/storage/autoBackup.ts:287`.

Hangt de eerste schrijfactie in het tijdelijke bestand en antwoordt ze pas nadat de tweede poging klaar is, dan zet ze de nieuwe, nagekeken back-up opzij als `.ascpoging….old` en haar eigen oudere tekst onder de naam. Niemand roept `keep` of `undo`; de volgende opruimbeurt haalt de nieuwere back-up weg. De telling zegt nul terwijl de training van tussendoor niet in het bestand staat. Bestond voor deze branch ook (de tweede poging vond de naam toen vrij) en vraagt een antwoord na meer dan een uur. Met de hand speelt het niet: daar weigert `neverReplace` de late schrijfactie.

Voorstel: geef `writeThroughTemp` een vraag mee (`stillWanted`), gezet door de poging bij een time-out, en kijk ernaar vlak voor het opzij zetten; niet meer gewenst is het tijdelijke bestand weghalen en stoppen.

### Mag 4 (B1): het veld lekt via de download van een kopie van voor een import

`src/components/settings/groups/GegevensSheets.tsx:198-201` en `src/storage/backupExport.ts:69`.

De kopie neemt `lastBackupLogs` mee en is te downloaden als bestand. Op een ander toestel teruggezet komt de lijst van het eerste toestel mee. Het zijn alleen ids die al in dat bestand staan, dus geen schade, maar het besluit zegt dat het veld bij het toestel hoort.

Voorstel: in `download` het veld weglaten, of de zin in het besluit aanpassen.

### Mag 5 (B5): `Abort.writing` raakt in de app nooit dezelfde naam

`src/storage/manualBackup.ts:58-62` en `src/storage/backupFileAdapter.ts:132`.

De app roept `saveManualBackup` aan zonder `now`; de naam heeft uren en minuten en een poging is pas na 60 seconden opgegeven. De nieuwe tik krijgt dus altijd een andere naam. Er komt geen -2 en er gaat niets weg (twee bestanden met elk een eigen tijd), maar de tests met een vaste `now` en `staleMs: 0` toetsen een pad dat op de telefoon niet voorkomt. Het besluit belooft hier meer dan de code doet.

Voorstel: zo laten en het in het besluit zeggen, of de tweede poging de `now` van de opgegeven poging laten hergebruiken zolang die nog schrijft.

### Mag 6: de lijst groeit met elk log, zonder grens

`src/engine/backupSince.ts:25`.

Gemeten: 5000 logs is 110 kB, 20000 logs 440 kB, in het ene instellingenrecord dat bij elke wijziging van een instelling opnieuw wordt geschreven en in elk van de vijf kopieën van voor een import staat. Tellen kost bij 20000 logs 4,5 ms per keer, in de render van Vandaag zonder `useMemo`. Bij een paar honderd trainingen per jaar is dat jaren geen probleem.

Voorstel: nu niets. Later kan de lijst naar een eigen sleutel in Meta, of alleen de ids bewaren van logs met een `completedAt` in het laatste jaar plus het tijdstip (ouder telt dan op tijd).

### Mag 7: een kapot veld blijft na een import staan

`src/storage/backupClean.ts` (`cleanSettings`).

De lezer vangt het op, maar het type in `AppSettings` zegt dan iets wat niet waar is. Voorstel: in `cleanSettings` door `readLastBackupLogs` halen en bij niets het veld weglaten.

## Nieuwe valkuilen voor het werkbriefje koppelingen-en-data

- Een onthouden naam hoort bij een map: wie de map wisselt, vergeet de namen (`halfWritten`, `orphans`).
- Een schrijfactie zonder `neverReplace` die laat antwoordt zet zichzelf over wat er dan staat: toets een laat antwoord altijd in beide volgordes, voor en na de volgende poging.
- Wat bij het toestel hoort (`lastExportedAt`, `lastBackupLogs`) lees je na een import opnieuw na: een tijdstip uit het bestand is het tijdstip van de back-up daarvoor.
- Een test met een vaste `now` bewijst niets over een pad dat van de klok afhangt: toets ook met de tijd die de app zelf zou geven.
