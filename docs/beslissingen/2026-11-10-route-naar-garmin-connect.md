# Een voorgestelde lus naar Garmin Connect (fase 3 van de routeplanner)

Datum: 2026-11-10
Status: aangenomen

## Besluit

Onder elke voorgestelde lus staat de knop Naar Garmin Connect, naast GPX downloaden. Een tik biedt het GPX-bestand aan in het venster van de telefoon; de gebruiker kiest daar Garmin Connect en slaat de lus op als koers. ASCEND stuurt zelf niets naar Garmin: geen sleutel, geen account, geen backend, geen aanroep.

## Reden

De eigenaar wil een lus met zo min mogelijk tikken op zijn Forerunner 255. Tot nu toe moest hij het bestand opslaan, een bestandsbeheerder openen, het bestand zoeken en Openen met kiezen. De Scout-ronde van 10 november (deel 4b van `docs/onderzoek/Routeplanner voor een training.md`) vond dat alle werkende meldingen over Garmin Connect op Android over Openen met gaan, en dat het voor het deelvenster onzeker is of Garmin Connect erin staat.

## Wat er gebeurt

- In de Android-app: het bestand komt in de cachemap van de app (map `delen`, nooit meer dan dit ene bestand; een eerder bestand gaat eerst weg) en een klein eigen deel van de app (`FileOpenPlugin.java`) toont de keuzelijst van Android. In die lijst staan de apps die het bestand kunnen openen (met het type van GPX en met de algemene typen) en de apps die het via delen aannemen. Zo staat Garmin Connect erin langs welke van die wegen het ook luistert. Altijd de lijst, ook als er een standaardapp voor GPX is.
- In de browser: het deelvenster van de browser, alleen als die een GPX-bestand wil delen (`canShare`). Anders is er geen knop Naar Garmin Connect en blijft GPX downloaden, met de regel dat je het bestand met Garmin Connect opent.
- Een oudere Android-app zonder het nieuwe deel houdt alleen GPX downloaden (opslaan in Documenten/ASCEND), met dezelfde regel. Er verandert daar niets.
- Onder de knoppen staat één regel wat er gebeurt, en daaronder de uitkomst. Het venster wegtikken is geen fout ("Niets gedeeld."). In de app weet ASCEND niet wat er in de lijst gekozen is; de regel zegt dan dat het venster geopend is en wat je doet als Garmin Connect er niet bij staat.
- Grens in tijd: in de app 15 seconden voor het klaarzetten en openen, daarna een fout; in de browser is de knop na een minuut weer vrij, zonder fout, ook als het deelvenster nog open staat.
- Schrijven gaat via een tijdelijk bestand en dan hernoemen (dezelfde weg als de back-up). Mislukt het halverwege, dan is er geen half bestand, opent er geen venster en staat er dat klaarzetten niet lukte.
- Onder de lussen staat Zo komt hij op je horloge, drie stappen achter een tik: opslaan als koers (vraagt internet), in Garmin Connect naar je horloge sturen, op het horloge Hardlopen, Navigatie, Koersen. De zin dat het horloge bij Simpel met herhalingen kan verspringen blijft staan waar hij stond.
- Het bestand is voor beide knoppen hetzelfde: GPX 1.1, één spoor, geen tijd, geen plek, geen naam van de gebruiker. De bestandsnaam heeft alleen de soort lus en de datum.

## Geen instelling nodig

Geen instelling nodig: geen keuze voor de gebruiker die de app voor hem maakt. Beide knoppen staan er, en de app doet niets tot hij tikt.

## Eigen keuzes buiten de opdracht

- Een eigen deel in de app in plaats van een plugin van Capacitor. De plugin Share doet alleen delen, waar Garmin Connect volgens de bronnen waarschijnlijk niet op luistert; de plugin File Viewer doet alleen openen, zonder lijst en zonder type. Het eigen deel is ongeveer tachtig regels Java, vraagt geen nieuw recht en gebruikt de FileProvider die al in het manifest staat. Het is wel een native wijziging en ging dus door de proefbouw.
- Het native niveau blijft 8. De webversie kijkt of het deel er is en valt anders terug op GPX downloaden, dus een oude app breekt niet en hoeft niet gedwongen bij te werken. Gevolg: de app vraagt niet zelf om een nieuwe APK; de knop Naar Garmin Connect verschijnt in de Android-app pas na het installeren van de nieuwe. De coördinator kan het niveau alsnog ophogen als de eigenaar de melding in de app wil.
- De naam in het bestand (die Garmin Connect als naam van de koers toont) is nu "ASCEND Simpel 6 km" of "ASCEND Avontuurlijk 8,2 km". Eerst stond de naam van de training erin; die kiest de gebruiker zelf en kan een plek noemen. Dit geldt ook voor GPX downloaden.
- GPX downloaden blijft naast de nieuwe knop staan: het is de uitweg als Garmin Connect niet in het venster staat, en het bestand is ook voor andere apps.
- De menunamen van Garmin in het Nederlands zijn niet nagekeken; de stappen zeggen daarom wat je doet en noemen alleen Navigatie en Koersen uit de opdracht.
- Het bestand in de cachemap blijft staan tot de volgende keer of tot Android de cache leegt. Meteen wissen kan niet: de gekozen app leest het pas na de keuze.
- De uitleg achter de i (`routeVoorstel`) en de regel in `settingsIndex` zijn niet veranderd: ze kloppen nog (een GPX-bestand voor je horloge) en bestaande regels daar mocht deze opdracht niet aanraken.

## Alternatieven

- De plugin Share van Capacitor (delen): een pakket erbij en een hoger native niveau, voor de weg waar Garmin Connect het minst zeker op luistert.
- Een koppeling met de Garmin-API: vraagt een sleutel, een account en een backend. Niet in ASCEND.
- Alleen opslaan in Documenten met uitleg: werkt, maar kost vier of vijf tikken meer.

## Niet gecontroleerd

- Garmin Connect en het horloge heeft niemand van ons gezien. Onbewezen: dat Garmin Connect in de keuzelijst staat, dat het een GPX zonder tijd als koers aanneemt, en hoe de stappen daarna precies heten.
- De keuzelijst van Android is alleen gebouwd (proefbouw), niet op een toestel geopend.
- Wat één proef beslist: tik op Naar Garmin Connect in de nieuwe app en kijk of Garmin Connect in de lijst staat. Staat hij er niet, dan toont `adb shell dumpsys package com.garmin.android.apps.connectmobile` waar hij wel op luistert.

## Bron

De opdracht van de coördinator (fase 3), `docs/beslissingen/2026-11-09-routeplanner.md` (Nog niet gebouwd), deel 4 en 4b van `docs/onderzoek/Routeplanner voor een training.md`.

## Vervangt

Niets. Het besluit van de routeplanner blijft staan; alleen de naam in het bestand is anders dan daar gebouwd.

## Terugdraaien

Haal de knop en `WatchSteps` uit `RoutePanel`, en `storage/routeSend.ts`, `engine/routeSend.ts`, `integrations/fileSender.ts` weg. `FileOpenPlugin.java` en de regel in `MainActivity` mogen blijven staan (zonder aanroep doen ze niets) of gaan weg bij een volgende APK. Er is geen bewaarde vorm.
