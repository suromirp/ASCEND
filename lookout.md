# Lookout: Zonder sportschool verplaatst, herkeuring (I-64)

Branch `claude/zonder-sportschool-verplaatst`, kop 88ba6678. Chromium, 360, 390 en 412 px, 4x vertraagde processor, echte touch (CDP). Zelfde nagemaakte stand als de vorige keer (periode wo 18 t/m vr 20 november, Bovenlichaam A op di 17 en do 19). Build uit de worktree, preview op poort 4327. Afdrukken in `afdrukken/`.

## Groen
1. Slepen van Bovenlichaam A naar wo 18 (`-3-slepen.png`): de regel zegt "je zit zonder sportschool" en noemt de dag erbij ("Bovenlichaam A op woensdag 18 november valt dicht op Bovenlichaam A van donderdag 19"), dus niet meer met zichzelf vergeleken. Het woord vakantie komt nergens voor. Eindigt met "Als je loslaat, komt eerst de vraag of je dat echt wilt." Naar do 19 (`-5-slepen-leeg.png`): zelfde patroon, een feit.
2. Losgelaten (`-4-losgelaten.png`, `-6-losgelaten-leeg.png`): blad Ruilen met Liever niet (mint, hoofd) en Toch ruilen (rand). De reden is nu "je periode zonder sportschool", niet vakantie. De twee rijen met dezelfde naam tonen hun datums.
3. Let op (`-1-week.png`): amber punt, "Sportschool nodig, en je zit zonder sportschool. Bovenlichaam A staat op donderdag 19, in je periode zonder sportschool." Voorstel (`-2-voorstel.png`): Bovenlichaam A do 19 vervalt, Eigen gewicht 20 min nieuw, Liever niet en Akkoord. Liever niet: Let op blijft. Akkoord: Let op weg, Eigen gewicht in de week (`390-13`, `390-14`).
4. Datum 19 november kiezen in het actieblad (`-11-datum-vraag.png`): eerst het blad Schema-aanpassing met de vraag in amber, Liever niet en Toch verplaatsen. Liever niet sluit het blad en laat de week staan (`-12`).
5. Audit (kit, op pagina en blad): geen horizontale overloop, geen tikdoel onder 44 px, geen tekst onder 12 px, op alle stappen en breedtes. Geen console-fouten. Geen U+2013, U+2014 of losse hexkleur in de nieuwe regels van de diff; geen persoonsgegevens gezien.

## Let op
1. De regel bij slepen heeft op 360 en 390 bij een ruil naar wo 18 vier zinnen: de ruil, twee waarschuwingen (te dicht, geen sportschool) en de loslaat-zin. Dat is twee feiten plus de loslaat-zin, zoals gevraagd, maar de ruilzin ("Ruilen met ..., die gaat naar ...") komt ervoor en maakt het blok op 360 acht regels hoog. Het dekt dan de rij eronder.
2. Het blad Ruilen naar wo 18 (`-4`) heeft drie feiten (te dicht, sportschool nodig, "Deze training werd korter door je periode zonder sportschool"). De korter-zin klopt hier niet duidelijk: er wordt niets korter, de duurloop is de reden van de periode. Voorstel: weglaten of alleen "periode zonder sportschool" laten staan.
3. Het blad Schema-aanpassing bij datum 19 november (`-11`) noemt "Sportschool nodig, en je zit zonder sportschool", niet "je periode". Het tweede Bovenlichaam A (do 19) schuift naar ma 16 november, de vaste rustdag en vandaag. Dat is een bijeffect van de 48-uurregel; de tekst zegt het niet.
4. Bestaand op main, alleen genoteerd: de chip ("Ruilen met ...") valt over de titel van de rij eronder ("Rustige duu", "Bovenlic"), op 360 het sterkst.
5. Mint in het voorstelblad: kop, labels en Akkoord en rand Liever niet zijn mint, zelfde patroon als bestaande bladen. Amber alleen bij let op, doelrand bij slepen en de vraag.

## Niet gecontroleerd
- Voorstel "Laten vervallen": in deze stand staat de periode op Eigen gewicht, dus alleen die keuze is gezien. De variant met vervallen is niet geopend.
- Geen swap naar een echt lege dag in de periode (een dag krijgt daar meteen een duurloop), dus de chip "Zonder sportschool" niet gezien.
- Geen echte telefoon; de systeemdatumkiezer is niet geopend (waarde met fill). Rustig en Uit voor beweging niet apart bekeken.
- tsc, lint, vitest en build zijn niet gedraaid (alleen vite build voor de doorloop).
