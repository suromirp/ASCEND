# Lookout: Zonder sportschool verplaatst (I-64)

Branch `claude/zonder-sportschool-verplaatst`, kop 88297581. Chromium, 360, 390 en 412 px, 4x vertraagde processor, echte touch (CDP). Nagemaakte stand: periode Zonder sportschool wo 18 t/m vr 20 november, Bovenlichaam A met eigen slot (lock user) op di 17 en do 19, benen za, lange duurloop zo. Build uit de worktree, preview op poort 4323.

## Groen
- Week, Let op: amber punt, kop "Deze week heeft 2 punten die niet kloppen." met "Sportschool nodig, en je zit zonder sportschool. Bovenlichaam A staat op donderdag 19, in je periode zonder sportschool." (afdrukken 360/390/412 `-1-week.png`).
- Bekijk voorstel opent het blad "Bovenlichaam A zonder sportschool": Bovenlichaam A vervalt, Eigen gewicht 20 min nieuw, Liever niet en Akkoord (`-2-voorstel.png`). Liever niet: blad dicht, Let op blijft. Akkoord: blad dicht, Let op weg, Eigen gewicht staat in de week (`390-13`, `390-14`).
- Slepen (echt touch) van Bovenlichaam A naar een dag in de periode: de dag kleurt amber en de live-tekst zegt de vraag; loslaten opent eerst het blad Ruilen met "Liever niet" en "Toch ruilen" (`-3-slepen.png`, `-4-losgelaten.png`).
- Actieblad, Verplaatsen, Andere dag kiezen, datum 19 november: eerst blad Schema-aanpassing met de vraag in amber, Liever niet en Toch verplaatsen (`-9` tot `-12`). Voorgestelde dagen slaan de dagen in de periode over.
- Audit op alle schermen en bladen: geen horizontale overloop, geen tikdoel onder 44 px, geen tekst onder 12 px. Geen console-fouten. Bladen sluiten netjes.
- Geen U+2013 of U+2014 en geen losse hexkleuren in de nieuwe regels van de diff; geen persoonsgegevens gevonden.

## Let op (afwijkingen en vragen)
1. De chip "Zonder sportschool" zag ik niet bij slepen. Een dag in de periode heeft altijd een rij (de periode zet er zelf een duurloop neer), dus het doel is een ruil en de chip luidt dan "Ruilen met Rustige duurloop" (`-3-slepen.png`). De chip "Zonder sportschool" hoort bij een lege dag; zo'n dag kon ik in de periode niet bereiken (hij kreeg meteen weer een duurloop). Niet bevestigd met een echte lege dag.
2. De chip staat boven op de rij eronder en drukt de titel af ("Rustige" gevolgd door de chip); op 360 dekt hij de rest van de naam. Geen overloop, wel een afgekapte rijtitel tijdens het slepen.
3. De ruiltekst zegt "Deze training schoof opzij voor je vakantie" bij een periode zonder sportschool (`-4-losgelaten.png`). Woordkeus klopt hier niet.
4. Het voorstel biedt alleen Eigen gewicht (de oude vervalt). "Laten vervallen" als aparte keuze is er niet in het blad; dat staat in de periode zelf (strength: bodyweight of drop).
5. Mint: in het voorstelblad staan VOORSTEL, WEEK VAN, NIEUW, Akkoord en de rand van Liever niet allemaal mint; in Let op is Bekijk voorstel de enige mint knop. Amber alleen voor let op: gezien in Let op, doelrand bij slepen en de vraag. Zelfde patroon als bestaande bladen, niet nieuw.
6. De vraagbladen hebben "Liever niet" als mint hoofdknop en "Toch ruilen" als randknop: bedoeld, de veilige keuze staat voorop.

## Niet gecontroleerd
Geen echte telefoon; de datumkiezer van het systeem is niet geopend (de waarde is met fill gezet). Geen swap naar een lege dag in de periode. Rustig en Uit voor beweging niet apart bekeken. tsc, lint, vitest en build zijn niet gedraaid (alleen vite build voor de doorloop).
