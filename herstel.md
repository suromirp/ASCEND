# Warden: back-up eerste keer, herstelronde

Branch `claude/backup-eerste-keer`, commit 9d8dcbe, tegen `origin/main`, proefmerge met `origin/claude/nacht`.
Datum: 15 november 2026.

## Uitslag

Geen blokkerende bevinding. Het blokkerende punt van de vorige ronde is weg: een leesfout of een stat-fout bij het nakijken haalt in geen van de drie bestanden nog iets weg.

Niet akkoord voor main zolang moet 1 tot en met 4 open staan. Daarna Akkoord; een blik op de diff volstaat dan, een volle review is niet nodig.

## Hoe gemeten

Een eigen proef, niet in de repo: de plugin Filesystem nagebouwd zoals ionfilesystem 1.1.1 `renameFile` werkt (bron moet bestaan, het doel gaat eerst weg, dan renameTo, bij mislukken kopie en bron weghalen, fout als dat weghalen mislukt), achter de echte `androidFolder`, met willekeurige fouten op stat, lezen, weghalen en hernoemen (vier soorten: niets gedaan, hele kopie met bron nog aanwezig, halve kopie, gelukt maar toch een fout).

- Back-up maken: 4000 mappen, 7997 tikken, een tot drie tikken in dezelfde minuut, met nul, een of twee vreemde bestanden onder de namen. Geen enkel vreemd bestand veranderd of weg. Elke tik die gelukt meldde heeft een heel bestand onder zijn naam. Het aantal hele back-ups in de map daalde nooit.
- Automatische back-up: 300 mappen, 600 pogingen, met een goede eigen back-up van vandaag en van gisteren en een vreemd bestand. Gisteren en het vreemde bestand nooit geraakt. Er was na elke poging een hele back-up van vandaag.
- 27 mutaties op de nieuwe takken, zie onderaan.

## Per pad

- Gelukt: goed. Een bestand, eerste naam, geen rest.
- Leesfout bij nakijken (`backupFolder.ts:275`, `manualBackup.ts:98`, `autoBackup.ts:292` en `296`): goed. Uitkomst `unknown`, het bestand blijft, de naam wordt onthouden. Mutaties M1, M2, M6, M8, M17 worden gevangen.
- Stat-fout: goed in de code, niet vastgepind in een test (moet 2). Daarnaast geeft een stat-fout op een lege map meteen een volgnummer (moet 4).
- Laat antwoord, met de hand: goed. De tik daarna wacht op dezelfde poging en meldt hetzelfde bestand. Automatisch: mag 3.
- Tweede snelle tik: goed, een poging, een bestand (M15 gevangen). Na 60 seconden een nieuwe; dat is altijd een andere minuut, dus een andere naam.
- Automatische back-up: goed bij een leesfout. Zie moet 1 voor de dubbele fout.
- Bestand bestaat al: goed. Een vreemd bestand blijft heel en de back-up krijgt een volgnummer.

## Moet

1. Een goede back-up kan nog verloren gaan bij twee fouten achter elkaar. `backupFolder.ts:198` haalt `.old` weg direct na de rename, dus voor het nakijken; `manualBackup.ts:102` tot `106` en `autoBackup.ts:296` halen daarna een kapot nieuw bestand weg. Nagespeeld met de hand: tik 1 schrijft een hele back-up, teruglezen faalt drie keer, het bestand blijft (goed). Tik 2 in dezelfde minuut vervangt het, het nieuwe bestand is echt afgekapt, nakijken zegt kapot, het gaat weg. De map is leeg, terwijl er na tik 1 een hele back-up stond. Hetzelfde bij de automatische back-up met het eigen bestand van vandaag, daar zelfs zonder leesfout: vervangen, kapot, weg. Oudere dagen blijven staan. Dit vraagt een echte beschadiging naast de leesfout, daarom niet blokkerend. Maar het is wel de regel "een leesfout leidt nooit tot overschrijven van een goed bestand" in zijn letterlijke vorm: de leesfout van tik 1 is de reden dat tik 2 mag vervangen. Voorstel: `.old` pas weghalen als het nieuwe bestand goed is nagekeken, en bij kapot `.old` terugzetten. Met een test die valt zonder dat terugzetten.

2. De regel "een stat-fout is nooit vrij" hangt in de Android-map aan `backupFolder.ts:219` en geen test valt als je daar `return false` van maakt (mutatie M5 overleeft). In mijn proef gaan er met die mutatie 154 vreemde bestanden verloren. De test op `manualBackup.test.ts:331` laat stat een keer haperen; de tweede blik in `writeThroughTemp` redt het dan. Voorstel: dezelfde test met stat die twee keer hapert, of blijvend.

3. De vaste map in de browser heeft geen enkele test op de nieuwe regel. `backupFileAdapter.ts:228` (alleen "niet gevonden" is vrij), `:233` en `:238` (leesfout is `unknown`) overleven alle drie hun mutatie (M11, M12, M20). Met M12 haalt de automatische back-up in de browser bij een leesfout het bestand weer weg: precies het blokkerende punt van de vorige ronde, nu alleen door de code zelf bewaakt. Voorstel: drie korte tests op `webFolderTarget` met een nagemaakte map.

4. Het besluit zegt: een volgnummer komt er alleen bij een echt ander bestand. Dat klopt niet met de code. Hapert stat een keer op een lege map (`manualBackup.ts:82`, `autoBackup.ts:280`), dan krijgt de eerste back-up de naam met -2 en staat er niets onder de eerste naam. Nagespeeld: een stat-fout, uitkomst gelukt als `...10u30-2.ascend-backup.json`. In de proef 1690 keer een volgnummer zonder bestand ervoor, tegen 22 met stat-fout als vrij; het komt dus bijna geheel hiervandaan. Het is veilig, maar het is wel het symptoom dat de eigenaar meldde. Kies: de zin in het besluit aanpassen, of bij een stat-fout een keer opnieuw kijken na een korte pauze voordat de naam als bezet telt.

## Mag

1. `manualBackup.ts:84`: `neverReplace: !mine` is niet vastgepind (M7 overleeft; de test op `manualBackup.test.ts:233` slaagt ook zonder). De blik op regel 82 vangt het gewone geval; `neverReplace` is alleen het vangnet voor iets dat tussendoor onder de naam komt.
2. `backupFolder.ts:299`: een leesfout op het id van de installatie schrijft geen nieuw id. Geen test (M10 overleeft).
3. Automatische back-up met een laat antwoord: na de tijdsgrens loopt het schrijven door, de naam komt niet in de lijst met eigen bestanden, en de poging een uur later zet er een volgnummer naast. Twee bestanden van een dag. Gedrag van voor deze wijziging, geen verlies.
4. Na een fout bij de naam met een onleesbaar bestand (`backupFolder.ts:177` tot `181`) blijft een eigen back-up die opzij ging staan als `<naam>.<poging>.old` en komt nooit terug of weg. In de proef 25 keer bij de automatische back-up en 37 keer met de hand; in 212 mappen bleef een `.tmp` of `.old` achter. Niets verloren, wel rommel met een naam die de eigenaar niet herkent. Voorstel: bij de volgende gelukte back-up eigen `.old` en `.tmp` van die naam opruimen, of terugzetten als de naam leeg is.
5. Blijft stat haperen, dan zijn alle twintig namen "bezet" en zegt de zin dat er te veel back-ups van deze minuut staan. Dat is dan niet waar.
6. `backupFolder.ts:272` (grootte) en `:119` (de tak zonder `holds`) hebben geen test (M22, M23). De tak zonder `holds` wordt in de app niet gebruikt.
7. Voorstel voor het werkbriefje, onder Valkuilen: "Een oud bestand dat opzij ging, gaat pas weg als het nieuwe is nagekeken. Een regel die op meer dan een plek staat (Android-map en vaste map in de browser) heeft op elke plek een test."

## Verder nagekeken

- Geen gewijzigde opgeslagen vorm, dus geen migratie nodig. De stap van de fout wordt nergens bewaard.
- Geen gedachtestreepjes in de nieuwe regels van de back-upbestanden, het besluit en het werkbriefje. Geen persoonsgegevens.
- Besluit vastgelegd (`docs/beslissingen/2026-11-15-backup-eerste-keer.md`) en opgenomen in de kennisindex.
- Logica in `engine/`, `storage/` en `integrations/`; geen component geraakt door dit onderwerp.

## Mutaties

Gevangen (17): M1 leesfout in verify is kapot, M2 worp in verifySettled is kapot, M3 onleesbaar na naamfout gaat weg, M4 worp bij de blik is vrij, M6 onleesbaar met de hand gaat weg, M7b tweede blik in writeThroughTemp weg, M8 automatisch haalt onleesbaar weg, M9 onthouden naam telt niet, M13 en M13b leesfout in holds is afwezig of anders, M14 en M14b naam niet onthouden, M15 tweede tik deelt de poging niet, M16 eigen bestand komt niet terug, M17 tijdsgrens bij nakijken is kapot, M18 worp in holds is anders, M19 grens van een minuut weg.

Overleeft (8): M5, M7, M10, M11, M12, M20, M22, M23, zie hierboven. Twee andere (M3b, M6b) zijn gelijkwaardig aan de code en tellen niet.

## Controles

Op de proefmerge van 9d8dcbe met `origin/claude/nacht` (geen conflict):

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen (alleen bestaande waarschuwingen).
- `npx vitest run`: groen, 727 bestanden, 10810 tests.
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: geen verschil.

Niet gecontroleerd: `npm run kaart:vergelijk` was na tien minuten niet klaar en is niet afgewacht (er verandert geen scherm, alleen de zin bij een mislukte back-up). Een echt toestel: waarom nakijken daar de eerste keer na het openen faalt is niet gemeten, zoals het besluit zelf ook zegt. Twee pogingen echt tegelijk op het bestandssysteem zijn in de proef niet nagebouwd; de proef draait de tikken na elkaar.
