# Startpunt van je lus: Ongeveer of Precies

Datum: 2026-11-09
Status: aangenomen

## Besluit

Een voorgestelde lus kan bij de deur van de eigenaar beginnen. De instelling Startpunt van je lus (blad Weer en kleding, onder Welke lus eerst) heeft twee keuzes: Ongeveer (je plaats, afgerond op ongeveer een kilometer; de standaard tot de gebruiker kiest) en Precies (een eigen startpunt dat alleen op het toestel staat). De eerste vraag van Route voorstellen biedt beide aan, met Precies als advies. Dit beantwoordt de vraag onderaan `docs/beslissingen/2026-11-09-routeplanner.md`; dat besluit blijft staan.

## Reden

De eigenaar wil dat de lus bij zijn deur begint, zeker bij een rustige duurloop; het inlopen hoort bij de lus. Met alleen de afgeronde plek begint de lus tot ongeveer 700 m van huis. Een exact punt naar een routeplanner sturen is een keuze over privacy, dus is het een eigen instelling met een eerste vraag die zegt wat de deur uit gaat.

## Wat er gebeurt

- Bij Precies gaat alleen het startpunt van de lus precies naar de routeplanner (BRouter, anders Valhalla van FOSSGIS). Heuvels en paden zoekt OpenStreetMap op de afgeronde plek van dat punt, met de bestaande cache. De overige grenzen blijven: hoogstens drie aanroepen per soort lus, tijdgrens, geen automatische herhaling.
- Het punt kiezen gaat met Gebruik waar ik nu ben: één keer de plek van het toestel, met een grens van 15 seconden en een zichtbare uitkomst. Geen adres typen, geen geocoder, geen nieuwe dienst.
- Het punt staat onder een eigen sleutel in de meta-opslag (`routeStartPoint`, `storage/routeStart.ts`). Het zit niet in de export, niet in een back-up, niet in een log en niet in de instellingen; een import schrijft en wist de sleutel niet, en een back-up met zo'n sleutel in de instellingen laat hem vallen (`backupClean`). Alleen de keuze Ongeveer of Precies is een instelling en gaat dus mee. Wis startpunt in het blad haalt het punt weg met één tik.
- Lukt de locatie niet (geen toestemming, geen antwoord binnen de tijdgrens, geen locatie in de browser, alleen een ruwe plek), dan zoekt het paneel ongeveer en staat er één rustige regel met de reden. De instelling blijft Precies, zodat de gebruiker het opnieuw kan proberen. Is Precies gekozen en is er geen punt, dan vraagt het paneel eerst om een punt, met Ongeveer ernaast.
- De regel bovenaan het paneel zegt welk startpunt geldt.

## Eigen keuzes buiten de opdracht

- De Android-app vroeg tot nu toe alleen de ruwe plek (`coarseLocation`), te grof voor een deur. Voor dit ene punt vraagt de app één keer de fijne plek (`location`, op een tik) en haalt de plek met hoge nauwkeurigheid op. Het manifest had beide rechten al; er is geen native wijziging en geen nieuw plugin. Voor het weer, de etappe en de rest blijft de ruwe plek.
- Een plek met een nauwkeurigheid boven de 250 m telt niet als startpunt (de gebruiker kiest op de Android-vraag soms "ongeveer"): dan staat er de reden en valt het paneel terug op Ongeveer.
- Het bewaarde punt heeft vijf decimalen (ongeveer een meter), geen volle precisie van het toestel.
- Kiest de gebruiker Precies in de eerste vraag, dan wordt de instelling Precies; kiest hij Ongeveer, dan wordt die instelling Ongeveer. Wie al eerder ja zei op de oude vraag krijgt de keuze niet opnieuw, maar kan hem in de instellingen zetten.
- Gebruik waar ik nu ben in de instellingen bewaart alleen het punt en zet de keuze niet om; de regel zegt dat Precies het gebruikt.
- Het punt staat nooit op het scherm, ook niet als getal.
- Een import zet Precies nooit aan: `routeStart: 'exact'` in een back-up wordt `approx`, want zonder vraag zou er een punt de deur uit gaan. Het punt komt nooit mee.
- De rij Startpunt van je lus blijft zichtbaar ook als Route voorstellen uit staat, zodat Wis startpunt altijd bereikbaar is.
- Het venster van Android heeft een eigen grens van een minuut; de 15 seconden gelden voor de plek zelf. Geen fijne toestemming of een plek zonder nauwkeurigheid telt als ruw. Sluit je het paneel tijdens het bepalen, dan wordt er niets bewaard.
- De opdracht vroeg "Precies (advies)" in de eerste vraag, terwijl de standaard in de instellingen Ongeveer is (privacyzuinig tot de gebruiker kiest). Daardoor toont het keuzeblad Ongeveer als Advies en de eerste vraag Precies. Dat verschil is bewust; de coördinator beslist of het gelijk moet.
- Het GPX-bestand dat de gebruiker zelf downloadt begint wel bij het startpunt. Dat bestand is van hem en staat op zijn toestel.
- De uitleg achter de i heeft een eigen onderwerp `routeStartpunt` in `settingsHelp`. Op verzoek van de coördinator zijn ook de uitleg `routeVoorstel` en de noot van `route-voorstel` in `settingsIndex` bijgewerkt: standaard de afgeronde plek, bij Precies alleen het startpunt precies.

- Op verzoek van de eigenaar staat Route voorstellen ook als rij op de trainingspagina van een looptraining ("Waar train je?", Eerst opwarmen, Daarna rekken; `ExerciseLogger`), onder Daarna rekken in dezelfde kaart. Dezelfde regel als op Vandaag (`wantsRoute` en de schakelaar Route voorstellen) en de datum van die training. Gekozen: het paneel klapt op zijn plek open (mode inline), niet als blad, want deze pagina is zelf al een blad en er komt nooit een blad op een blad.

## Alternatieven

- Een adres typen of een punt op een kaart kiezen: vraagt een geocoder of een kaart, een nieuwe dienst en meer wat de deur uit gaat. Niet nu.
- De plek van het toestel elke keer opnieuw vragen: de gebruiker staat dan niet altijd bij zijn deur, en elke zoektocht zou om toestemming vragen.
- Het punt in de instellingen bewaren: dan gaat het mee in de back-up en de export. Niet gekozen.

## Niet gecontroleerd

Een echt toestel met locatie (fijne plek in de Android-app, het venster van Android, de uitkomst bij "ongeveer") is niet gezien; de bouwer kan dat niet, het is met nagemaakte plekken en antwoorden getest.

## Bron

De Inbox van `docs/backlog.md` (9 november, avond) en de vraag onderaan `docs/beslissingen/2026-11-09-routeplanner.md`.

## Vervangt

Niets. Het antwoord op de vraag onderaan het besluit van de routeplanner; dat besluit blijft staan.

## Terugdraaien

Zet Startpunt van je lus op Ongeveer en kies Wis startpunt: dan gaat er weer alleen een afgeronde plek de deur uit en staat er niets meer op het toestel. Helemaal weg: `storage/routeStart.ts`, `engine/routeStart.ts`, `RouteStartFooter` en de rij `route-start` halen; de sleutel `routeStartPoint` in de meta-opslag blijft dan achter tot de gebruiker hem wist.
