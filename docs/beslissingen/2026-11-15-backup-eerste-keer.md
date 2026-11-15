# Back-up maken meldt geen fout terwijl het bestand er staat

Datum: 2026-11-15
Status: aangenomen

## Besluit

Een back-up in de Android-app is gelukt zodra het bestand heel onder zijn naam staat, wat de telefoon onderweg ook meldde. Eén back-up geeft nooit twee bestanden: een volgnummer komt er alleen bij een echt ander bestand. Mislukt het echt, dan noemt de zin de stap die het was.

## Reden

Op 15 november meldde de eerste tik na het openen "het bestand kon niet worden geschreven", terwijl het bestand er stond; de tweede tik zette er een bestand met -2 naast. Ruimte was het niet.

Wat vaststaat uit de code. De plugin Filesystem (8.1.5, bibliotheek ionfilesystem 1.1.1) hernoemt met `renameTo`; lukt dat niet, dan kopieert hij naar de echte naam, haalt het tijdelijke bestand weg en meldt een fout als dat weghalen mislukt. Het bestand staat er dan heel en de app krijgt toch een fout. De oude laag las elke fout bij het hernoemen naar een vrije naam als "naam bezet" en ging door naar het volgende volgnummer. Verder keek de app één keer na, direct na het hernoemen, en liet hij een bestand dat hij niet kon nakijken en niet kon weghalen staan, zodat de volgende tik er -2 naast zette.

Wat niet vaststaat. Welke van deze stappen op het toestel van de eigenaar de eerste keer misgaat is hier niet gemeten: dat kan alleen op een echt toestel. Daarom sluit de wijziging elk van deze wegen af en zegt de zin voortaan welke stap het was.

Wat er nu gebeurt. Meldt het hernoemen een fout, dan kijkt de app of het bestand er toch precies staat; zo ja, dan is het gelukt. Zo nee, dan nog één keer na een kwart seconde, en pas daarna geldt de naam als bezet. Nakijken probeert het hoogstens drie keer met een korte pauze. Lukt nakijken echt niet, dan gaat het bestand weg; lukt weghalen niet, dan onthoudt de app de naam en vervangt de volgende poging hem. Een tweede tik terwijl de eerste nog loopt, ook na "het duurde te lang", wacht op dezelfde poging; na een minuut zonder antwoord begint een nieuwe. De automatische back-up loopt over dezelfde laag en kijkt op dezelfde manier na.

De zinnen bij een mislukte schrijfactie: het tijdelijke bestand houdt de zin over ruimte; hernoemen wordt "het bestand kon zijn naam niet krijgen"; nakijken wordt "het bestand is geschreven, maar teruglezen lukte niet"; twintig bezette namen wordt "er staan al te veel back-ups van deze minuut in de map". De stap wordt nergens bewaard.

## Alternatieven

Een eigen stuk Android-code dat in één stap schrijft: vraagt een nieuwe APK en een hoger native niveau, terwijl de oorzaak dan nog steeds niet gemeten is. Het tijdelijke bestand overslaan en direct onder de echte naam schrijven: dan kan een half bestand de echte naam krijgen.

## Bron

Melding van de eigenaar op 15 november (versie fe704a3), de broncode van `@capacitor/filesystem` 8.1.5 en `io.ionic.libs:ionfilesystem-android` 1.1.1 (`IONFILELocalFilesHelper.renameFile`), en `docs/beslissingen/2026-11-02-backup-maken-android.md`.

## Vervangt

Niets. Het besluit van 2 november blijft staan; dit vult het aan.

## Terugdraaien

Zet `writeThroughTemp` in `src/integrations/backupFolder.ts` en `write` in `src/storage/manualBackup.ts` terug naar de stand van voor deze wijziging.
