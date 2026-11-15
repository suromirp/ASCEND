# Lookout: Beginner heel licht (stap 1 en 2)

Branch `claude/beginner-licht` op 2bab43f. Chromium, 360, 390 en 412 px, CPU 4x vertraagd, echte touch, preview op poort 4317. Afdrukken in `lookout-afdrukken/` (naam begint met de breedte). Geen code gewijzigd.

Uitslag: groen op de harde punten, geen moet-punten. Drie opmerkingen (mag).

## Doorlopen
- Welkom en wizard (Nieuw beginnen, Fitter worden, dagen, kracht, beginnervraag Ja, Bekijk je plan, Akkoord), daarna Vandaag, Week en Je stand, op 360, 390 en 412: geen overloop, geen tikdoel onder 44 px, geen tekst onder 12 px, geen console-fouten.
- Instellingen, Doel en tochten, Zonder doel, Beginnersstart (Automatisch, Ja, Nee; Ja opgeslagen, planning blijft) en Opbouw van de start (Gewoon geeft een voorstel met Liever niet en Akkoord): 360, 390 en 412 schoon.
- Zinsletters bij alle knoppen, geen `uppercase` in nieuwe componentregels, geen losse hex of rgba in nieuwe componentregels, geen U+2013 of U+2014 in nieuwe tekst (src en docs), geen persoonsgegevens.
- Eén mint accent per scherm: Vandaag, voorstel en wizard hebben een mint hoofdknop; geen tweede.
- Wachtende knop: Bekijk je plan toont "Even rekenen…" en eindigt in het voorstel; Opbouw geeft altijd een voorstel (alwaysAsk).

## Mag (geen blokkade)
1. De audit meldt de infoknoppen "Uitleg: ..." als 20x20 px (Instellingen, Doel en tochten en de bundel Zonder doel). Vals alarm: `.st-info::before` geeft een tikvlak van 46 px. Bestond al.
2. Voorstel eerste week (afdruk `390-6-voorstel.png`): in week 1 van "heel licht" staat Herstelwandeling ma 16 nov op 45 min, langer dan de lange wandeling van 30 min (zo 15 en zo 22 nov), en Bovenlichaam A en Benen A (zwaar) op 75 min. Past niet bij "de eerste weken alleen makkelijk". Het werkbriefje zegt dat de planning de ladder nog niet leest (stap 3), dus waarschijnlijk bekend; wel zichtbaar voor de gebruiker.
3. Vandaag (`390-7-vandaag.png`): de kaart van Lang wandelen en dribbelen heeft het etiket "VANDAAG · HARDLOPEN" en vraagt "Kun je hele zinnen" onder Weeg je even; wandelen krijgt dus het hardloopetiket.

## Niet gecontroleerd
- De bodem en rem van tien procent zelf: alleen de uitkomst op scherm gezien (30 min in week 1, 20 min donderdag), niet de dagen na het eerste eigen log of de overgang van de 30 dagen (15 november); dat vraagt een stand met logs. De vitest-suite is niet gedraaid (opdracht was alleen UI).
- Geen echt apparaat; vertraagde CPU is een emulatie.
- Tabs Ascend, Logboek en Forge en de uitgelegde teksten achter de infoknoppen niet bekeken.
