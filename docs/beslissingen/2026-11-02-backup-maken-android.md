# Back-up maken in de Android-app schrijft zelf naar Documents/ASCEND

Datum: 2026-11-02
Status: aangenomen

## Besluit

In de Android-app schrijft "Back-up maken" het bestand zelf naar Interne opslag > Documents > ASCEND, op dezelfde veilige weg als de automatische back-up, en toont daarna altijd een uitkomst. In de browser blijft het een download, met "Back-up gedownload.".

## Reden

Op "Back-up maken" tikken gaf in de app geen enkele bevestiging en er kwam geen bestand. De knop gebruikte de browser-download (een link met `download` en een blob-URL), en die doet in de Capacitor-webview niets, zonder fout. Laatste back-up werd toch bijgewerkt, dus de app zei iets wat niet klopte.

Het bestand krijgt een eigen naam met datum en tijd (`ascend-JJJJ-MM-DD-UUuMM.ascend-backup.json`) die niet lijkt op de namen van de automatische back-up, zodat die hem nooit opruimt. Het gaat via een tijdelijk bestand en wordt na het schrijven nagekeken. Een bestaand of vreemd bestand wordt nooit vervangen: bij een bezette naam komt er een volgnummer. Het hele traject heeft een tijdsgrens van 30 seconden, met de zin "Kijk in de map of hij er toch staat". Laatste back-up wordt pas bijgewerkt na een gelukte schrijfactie, en een gelukte back-up wordt nooit als mislukt gemeld.

Het pad staat overal zoals de bestandsbeheerder het toont (Interne opslag > Documents > ASCEND), omdat Samsung "Documents" toont en geen "Documenten". Het oude label "Documenten/ASCEND" in de opgeslagen staat wordt bij het lezen omgezet, zodat bestanden die de automatische back-up al schreef eigen blijven.

Op Android 11 en nieuwer is voor deze map geen toestemming nodig. De knop "Toegang geven" op het blad Vaste map staat daarom alleen waar de toestemming ontbreekt (Android 10 en ouder). Het blad zegt ook wanneer de laatste automatische back-up lukte, of dat hij nog niet draaide.

## Alternatieven

Delen via de share-intent: vraagt een nieuw pakket, daarom niet gebouwd. Een andere map kiezen: de map is vast en zichtbaar, dus er is niets in te stellen.

## Bron

Meting van de eigenaar in de Android-app, en `docs/beslissingen/2026-11-02-automatische-backup.md`.

## Vervangt

Niets. Het besluit over de automatische back-up blijft staan.

## Terugdraaien

Haal de Android-tak uit `webBackupFileAdapter.saveBackup` weg; dan valt de knop terug op de download.
