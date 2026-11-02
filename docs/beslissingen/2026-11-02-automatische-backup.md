# Automatische back-up, in de app en in de browser

Datum: 2026-11-02
Status: aangenomen

## Besluit

ASCEND maakt vanzelf een back-up: wekelijks op zondagavond (het advies), dagelijks of uit, met de
instelling Automatische back-up in Gegevens en back-up. Het is dezelfde back-up als "Back-up maken":
hetzelfde bestand, hetzelfde schema, dezelfde import, met de datum in de naam
(`ascend-JJJJ-MM-DD.ascend-backup.json`).

Het moment (`engine/autoBackup.ts`) is zondag om 18:00, of bij dagelijks elke dag om 18:00, in de tijd
van het toestel. Een back-up op de dag van dat moment telt, ook een van die ochtend en ook een die je
zelf maakte. Is de app dicht op het moment, dan gebeurt het de eerstvolgende keer dat je hem opent of
terugkomt in de app. Een lege app (geen training gelogd of gepland) krijgt geen back-up.

In de Android-app schrijft ASCEND het bestand zelf, met de officiële plugin `@capacitor/filesystem`,
in de openbare map Documenten onder ASCEND (`integrations/backupFolder.ts`). Die map zie je in elke
bestandsbeheerder, en een app die mappen naar Google Drive kopieert kan hem meenemen. Vanaf Android 11
is er geen toestemming nodig voor bestanden die ASCEND zelf maakt; op Android 10 en ouder vraagt ASCEND
die alleen na een tik op "Toegang geven" bij Vaste map, nooit vanzelf. Er gaat niets naar buiten: alleen
het bestand in die map. De laatste 8 bestanden blijven (instelbaar: 4, 8, 16 of alles); oudere ruimt
ASCEND op, maar alleen bestanden die de automatische back-up zelf schreef en waarvan hij de naam
bijhoudt, en alleen in de map waar hij ze schreef. Wat je er zelf in zet blijft altijd staan.
`android/native-level.txt` gaat naar 2, want de plugin vraagt een nieuwe APK.

In de browser mag een website niet zelf een bestand opslaan zonder tik. Op het moment staat er daarom
een rustige kaart onder de missie op Vandaag ("Tijd voor je back-up", `engine/todayCards.ts`, kaart
`backupDue`, nooit boven de missie) met Niet nu en de bestaande knop Back-up maken. Is de vaste map
gekozen (File System Access) en geeft de browser die zonder vragen vrij, dan gaat de back-up daar stil
naartoe en is er geen kaart; ASCEND vraagt de browser nooit zelf om toestemming. Met de instelling uit
blijft de oude herinnering na 7 dagen zoals hij was.

Laatste back-up zegt wanneer en waar ("In Documenten/ASCEND", "In je downloads"). Mislukt een
automatische back-up (geen toegang, map weg, schrijven mislukt, langer dan 30 seconden), dan staat er
één rustige regel in amber onder de groep Back-up en op de kaart van Vandaag, met wat je kunt doen en
altijd de weg terug: de back-up zelf maken. ASCEND probeert het na een uur opnieuw. Een gelukte back-up,
met de hand of vanzelf, haalt de regel weg. Nooit stil falen.

Wat bij het toestel hoort (waar de laatste staat, een mislukte poging en de namen van de eigen
bestanden) staat in de opslag van het toestel (`storage/autoBackup.ts`) en gaat nooit mee in een
back-up. De twee instellingen zelf (`autoBackup`, `autoBackupKeep`) zijn optioneel en reizen mee
(`storage/migrations.ts#migrateAutoBackupSettings`); een oudere back-up importeert zoals eerst.

Om onder de twaalf rijen van Gegevens en back-up te blijven, staat Adviezen opnieuw berekenen (een
noodknop) nu onder Geavanceerd.

## Reden

Alles staat alleen op de telefoon. De eigenaar wil niet zelf aan een back-up hoeven denken. Een
vaste dag in de week past bij het ritme van de weekterugblik, en de avond komt na de training van de
dag.

## Alternatieven

- De map kiezen via het systeem (Storage Access Framework). Geen officiële plugin van Capacitor kan in
  zo'n map schrijven; dat vraagt eigen native code of een plugin van derden. Niet gekozen; Documenten
  is een map die iedereen kan vinden en die een synchronisatie-app kan meenemen.
- De map Downloads (`Directory.ExternalStorage`): die is vanaf Android 11 niet te bereiken met de
  plugin. Niet gekozen.
- Een geplande taak op de achtergrond, zodat de back-up ook met de app dicht op zondagavond gebeurt.
  Met de bestaande plugins kan dat niet (Local Notifications plant alleen een melding, geen code).
  Daarom bij het openen.
- In de browser een download zonder tik: browsers staan dat niet toe, en het zou elke week een
  bestand in je downloads zetten zonder dat je het merkt.

## Bron

Opdracht van de eigenaar via de coördinator op 2 november 2026; `docs/beslissingen/2026-11-01-android-app.md`
(functies van de app achter een laag, met een webweg in de browser).

## Vervangt

Niets. De herinnering na 7 dagen blijft voor wie de automatische back-up uit zet.

## Terugdraaien

De instelling op Uit zetten geeft precies het oude gedrag. In de code: `AutoBackupHost` uit `App.tsx`
halen en de kaart `backupDue` uit Today.tsx; de plugin `@capacitor/filesystem` en de twee
toestemmingen in `AndroidManifest.xml` mogen dan weg (met een hoger native niveau). De instellingen
`autoBackup` en `autoBackupKeep` zijn optioneel en mogen blijven staan.
