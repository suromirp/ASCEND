# Oude pagina's weg, weer en kleding makkelijker te vinden

Datum: 2026-10-24
Status: aangenomen

## Besluit

De Trainingsgids (`/gids`) en de Garmin-gids (`/garmin`) zijn geen eigen pagina's meer. `/gids` stuurt door naar Week, `/garmin` naar Garmin koppelen (`/koppelen/garmin`), waar de uitleg nu onderaan staat onder het kopje "Je horloge instellen", in vier ingeklapte rijen. Een adres dat niet bestaat opent Vandaag in plaats van een leeg scherm. Bronnen opent ingeklapt, een rij per soort met het aantal, met een zoekveld. Het weer en het kledingadvies staan bovenaan de pagina Weer, die nu "Weer en kleding" heet, en de weerregel op de missiekaart van Vandaag opent die pagina.

## Reden

De eigenaar zei dat oude tabbladen die geen functie meer hebben of niet passen in ASCEND weg mogen, en koos "weghalen, links doorsturen". De Trainingsgids had vaste tekst over maand 1 en dubbelde de uitleg "Hoe je het doet" bij elke training. De Garmin-gids was de derde plek voor Garmin naast de koppeling en de instellingen. Bronnen was 56.000 pixels hoog. De vraag "waar doe ik bijvoorbeeld het weerbericht en aangeraden kleding?" liet zien dat het weer alleen te vinden was als je al een plaats had gekozen.

## Alternatieven

De Garmin-gids als blad onder Koppelingen: meer onderdelen voor dezelfde uitleg. De Trainingsgids als blad houden: dubbel met het trainingsblad. Bronnen inkorten of weghalen: de bronnen zijn de controle op de adviezen en blijven, alleen ingeklapt. Bij geen plaats niets tonen op Vandaag: dan blijft het weer onvindbaar.

## Bron

Gesprek met de eigenaar en de inventaris van de schermen (`scratchpad/inventaris/rapport.md`).

## Vervangt

Niets. De gegevens in `data/trainingGuide.ts` en `data/garminGuide.ts` blijven, het trainingsblad en de bronnenlijst lezen ze nog.

## Terugdraaien

De twee pagina's staan in de git-geschiedenis vóór deze wijziging (`src/pages/TrainingGuide.tsx`, `src/pages/GarminGuide.tsx`). De routes terugzetten in `src/App.tsx` en de rijen in `GidsenGroup.tsx`, `settingsIndex.ts` en `settingsLayout.ts`.
