# Back-up maken meldt geen fout terwijl het bestand er staat

Datum: 2026-11-15
Status: aangenomen

## Besluit

Een back-up in de Android-app is gelukt zodra het bestand heel onder zijn naam staat, wat de telefoon onderweg ook meldde. Eén back-up geeft nooit twee bestanden: een volgnummer komt er bij een echt ander bestand, of als de app twee keer achter elkaar niet kan zien of de naam vrij is. Mislukt het echt, dan noemt de zin de stap die het was.

## Reden

Op 15 november meldde de eerste tik na het openen "het bestand kon niet worden geschreven"; de tweede tik lukte en gaf een bestand met -2, dus de naam van die minuut was al bezet. Ruimte was het niet.

Wat vaststaat uit de code. De plugin Filesystem (8.1.5, bibliotheek ionfilesystem 1.1.1, `renameFile`) gooit bij hernoemen het doel eerst weg en hernoemt dan met `renameTo`; lukt dat niet, dan kopieert hij naar de echte naam, haalt het tijdelijke bestand weg en meldt een fout als dat weghalen mislukt. Het bestand kan er dus heel staan terwijl de app een fout krijgt. De oude laag las elke fout bij het hernoemen naar een vrije naam als "naam bezet" en ging door naar het volgende volgnummer. Verder keek de app één keer na, direct na het hernoemen, en liet hij een bestand dat hij niet kon nakijken en niet kon weghalen staan.

Wat bij de melding past, en wat niet. De kopieerroute verklaart de melding niet: daarmee had de eerste tik zelf een bestand met -2 opgeleverd, of bij een blijvende fout twintig bestanden. Wat wel past bij "fout bij de eerste tik, -2 bij de tweede" zijn twee paden. Eén: hernoemen lukt, nakijken faalt en weghalen faalt ook; het bestand blijft staan en een tweede tik in dezelfde minuut zet er -2 naast. Twee: twee pogingen tegelijk, die elkaars bestand onder dezelfde naam weghalen of vervangen. Dit is vermoed, niet gemeten: welke van de twee het op het toestel van de eigenaar is, en waarom nakijken daar de eerste keer na het openen faalt, kan alleen een echt toestel zeggen. Daarom sluit de wijziging beide paden af en zegt de zin voortaan welke stap het was.

Wat er nu gebeurt. Of een naam vrij is hangt alleen aan de blik vooraf, omdat hernoemen het doel weggooit: alleen "bestaat niet" telt als vrij, elke andere fout bij het kijken als bezet. Hapert die blik, dan kijkt de app na ongeveer 300 ms nog één keer; een lege map geeft dan gewoon de eerste naam. Hapert hij twee keer, dan telt de naam als bezet en komt er een volgnummer, ook als er niets onder de eerste naam staat: veilig gaat hier voor netjes. Meldt het hernoemen een fout, dan kijkt de app een paar keer wat er onder de naam staat. Precies deze back-up: gelukt. Niets: nog één keer na een kwart seconde, en pas daarna geldt de naam als bezet. Iets anders dat te lezen is: een halve kopie van deze poging, die gaat weg. Niet te lezen: het bestand blijft staan, want het kan de hele back-up zijn, en de zin wordt die van nakijken. Nakijken probeert het hoogstens drie keer met een korte pauze en kent drie uitkomsten. Goed: gelukt. Kapot, dus gelezen maar de grootte of de inhoud klopt niet: het bestand gaat weg. Niet te lezen, ook na de tijdsgrens: het bestand blijft staan, want het kan de hele back-up zijn. Blijft er zo een bestand staan, of lukt weghalen niet, dan onthoudt de app de naam en vervangt de volgende poging hem. Een eigen bestand dat voor het nieuwe opzij ging (`.old`) gaat pas weg als het nieuwe goed is nagekeken, en komt terug als het nieuwe kapot is: een kapotte opvolger kost nooit een back-up die er al stond. Na een gelukte back-up ruimt de app eigen resten van eerdere pogingen op die naam op (`.tmp` en `.old`). De regel voor de hele laag: een fout bij kijken of lezen haalt nooit iets weg en verklaart nooit een naam vrij. Dat geldt ook voor het id van de installatie (een leesfout schrijft er geen nieuw id overheen) en voor de vaste map in de browser (alleen "niet gevonden" is een vrije naam). Een tweede tik terwijl de eerste nog loopt, ook na "het duurde te lang", wacht op dezelfde poging; na een minuut zonder antwoord begint een nieuwe. De automatische back-up loopt over dezelfde laag en kijkt op dezelfde manier na.

Bekende grens. De onthouden namen staan alleen in het geheugen. Sluit je de app tussen een mislukte poging met een achtergebleven bestand en de volgende tik in dezelfde minuut, dan komt er toch een volgnummer. Bewaren voor de volgende start zou een nieuwe opgeslagen sleutel vragen voor een geval van hoogstens een minuut; dat is het niet waard.

De zinnen bij een mislukte schrijfactie: het tijdelijke bestand houdt de zin over ruimte; hernoemen wordt "het bestand kon zijn naam niet krijgen"; nakijken wordt "het bestand is geschreven, maar teruglezen lukte niet"; twintig bezette namen wordt "er staan al te veel back-ups van deze minuut in de map". De stap wordt nergens bewaard.

## Alternatieven

Een eigen stuk Android-code dat in één stap schrijft: vraagt een nieuwe APK en een hoger native niveau, terwijl de oorzaak dan nog steeds niet gemeten is. Het tijdelijke bestand overslaan en direct onder de echte naam schrijven: dan kan een half bestand de echte naam krijgen.

## Bron

Melding van de eigenaar op 15 november (versie fe704a3), de broncode van `@capacitor/filesystem` 8.1.5 en `io.ionic.libs:ionfilesystem-android` 1.1.1 (`IONFILELocalFilesHelper.renameFile`), en `docs/beslissingen/2026-11-02-backup-maken-android.md`.

## Vervangt

Niets. Het besluit van 2 november blijft staan; dit vult het aan.

## Terugdraaien

Zet `writeThroughTemp` in `src/integrations/backupFolder.ts` en `write` in `src/storage/manualBackup.ts` terug naar de stand van voor deze wijziging.
