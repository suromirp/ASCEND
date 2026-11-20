# Back-up terugzetten: Laatste back-up en de lijst horen bij het toestel

Datum: 2026-11-20
Status: aangenomen

## Besluit

Bij volledig terugzetten komt Laatste back-up (`lastExportedAt`) nooit uit de instellingen in het bestand. Het tijdstip en de lijst met trainingen (`lastBackupLogs`) horen bij het toestel en gaan altijd als paar: het paar van het toestel blijft staan als het even oud als of nieuwer dan het bestand is, en anders wordt het bestand zelf de laatste back-up.

## Reden

In een back-up staat `lastExportedAt` van de back-up daarvoor: de app werkt het tijdstip pas bij nadat het bestand geschreven is. Bij volledig terugzetten gingen de instellingen uit het bestand over die van het toestel, dus Laatste back-up sprong terug naar dat oudere tijdstip. De lijst van het toestel paste dan niet meer bij het tijdstip en de telling viel terug op tijd. Een training die wel in de back-up stond telde als niet bewaard, en een Forge-training met een eerdere dag die na de back-up was afgerond (I-55) viel juist weg (Warden, punt B2; I-68).

De regel, in `engine/backupSince.ts#backupPairAfterRestore`:

1. Is het tijdstip van het toestel gelijk aan of later dan het tijdstip van het bestand (`createdAt` van de envelop, `exportDate` bij een heel oud bestand), dan blijft het paar van het toestel staan. Het toestel weet dan meer dan het bestand.
2. Anders wordt het paar het tijdstip van het bestand, met de ids van de trainingen die in het bestand staan. Alles in dat bestand is bewaard, ook op een leeg toestel.
3. Een bestand zonder tijdstip, of met een tijdstip dat niet te lezen is, verandert niets aan het paar. Het moment van inlezen telt niet als tijdstip van het bestand; daarvoor onthoudt het inlezen apart of het tijdstip echt in het bestand stond (`NormalizedBackupData.fileCreatedAt`, alleen in het geheugen).
4. Samenvoegen verandert niet: de instellingen van het toestel blijven, het paar ook.
5. Een kopie van voor een import terugzetten (Ongedaan maken, of een kopie uit de lijst) verandert niet: die kopie is van dit toestel, draagt het paar zelf en brengt het terug zoals het was (`restoreSnapshot` geeft `deviceCopy` mee). Had het toestel toen nog geen back-up, dan heeft de kopie de twee velden niet en blijft het paar van de import staan: een ontbrekend veld betekent niet aanraken, en de trainingen blijven op het toestel en staan in dat bestand.
6. Een tijdstip in de toekomst telt als nu. Een tijdstip uit een bestand is van een andere klok; zonder grens zou Laatste back-up in de toekomst staan, en dan maakt de app tot die datum geen automatische back-up, herinnert hij niet, en wint het toestel van elk later bestand. Het bestand is dan "net teruggezet": Laatste back-up is nu, met de trainingen uit het bestand. De engine krijgt het moment mee (`nowMs`) en heeft zelf geen klok. Een tijdstip dat al in de toekomst op een toestel staat blijft staan tot de volgende back-up; dat is een eigen punt.

De regel hangt aan het vervangen van de instellingen. Een bestand zonder instellingen laat het paar dus zoals het is, en bij Eigen keuze met instellingen vervangen maar trainingen laten staan wordt het bestand toch de laatste back-up. In beide gevallen telt de app hoogstens te veel, nooit te weinig.

Het voorbeeld voor Akkoord telt de twee velden niet mee bij Instellingen (`storage/backupPreview.ts`): Laatste back-up is geen keuze van de gebruiker en de import bepaalt hem pas bij het schrijven. Het voorbeeld rekent de regel niet zelf na, want dat antwoord kan tussen voorbeeld en Akkoord veranderen.

De vergelijking gaat op het moment, niet op de tekst, en het nieuwe tijdstip wordt als UTC bewaard, omdat de telling op tijd teksten vergelijkt. De regel draait binnen de transactie van de import, op de instellingen zoals ze op dat moment zijn opgeslagen: een back-up die tussen het voorbeeld en Akkoord wordt gemaakt telt mee, en een import die halverwege mislukt laat het paar zoals het was.

Een kopie van voor een import die als bestand is gedownload en op een ander toestel wordt teruggezet volgt de gewone regel. De lijst van het eerste toestel komt dus niet meer mee (Warden, punt B1): het bestand zelf telt.

Er is geen migratiestap. De vorm van een back-up verandert niet: er komt geen veld bij en er gaat er geen weg, `lastExportedAt` staat nog steeds in het bestand en wordt alleen niet meer overgenomen. `backupSchemaVersion` blijft gelijk en elke oude back-up blijft importeerbaar (test met een back-up van schema 5 in `storage/backupTelling.test.ts`). Geen log wordt aangeraakt; dit is geen uitzondering op de historieregel.

## Alternatieven

`lastExportedAt` ook uit een gewone back-up weglaten: verandert de vorm van het bestand, helpt niet bij de back-ups die er al zijn, en een leeg toestel zou na terugzetten zeggen dat er nog nooit een back-up was. Het paar van het toestel altijd laten staan: op een leeg of achterlopend toestel tellen dan alle teruggezette trainingen als niet bewaard, terwijl ze in het bestand staan. Na de import het paar opnieuw schrijven, buiten de transactie: een fout daartussen laat een tijdstip achter dat niet bij de lijst hoort.

## Bron

Herstelopdracht van Warden van 15 november (Moet 2, B2) met zijn proeftest, zijn review van 20 november (de grens op nu, het voorbeeld), I-68 in `docs/backlog.md`, `docs/beslissingen/2026-11-15-backup-telling.md`.

## Vervangt

Niets geheel. Het vult `docs/beslissingen/2026-11-15-backup-telling.md` aan: tellen op id, de lijst buiten een gewone back-up en de regels voor een laat antwoord blijven. Ingehaald is alleen dat de telling na terugzetten met de instellingen van een back-up op tijd terugvalt.

## Terugdraaien

Haal de aanroep van `backupPairAfterRestore` weg uit `settingsWrite` in `src/storage/backupApply.ts`. De instellingen uit het bestand gaan dan weer over het paar van het toestel; er is geen opgeslagen vorm om terug te zetten.
