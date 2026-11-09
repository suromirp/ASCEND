# Varianten voor de periode in de weeklijst

Tijdelijke afdrukken om uit te kiezen, alleen op de branch `claude/week-band-varianten`. De code (`src/components/WeekBandVariants.tsx`, een schakelaar `window.__WB`, drie tokens `--color-period-*` in `src/index.css`) is tijdelijk en gaat niet naar main.

Gebruikte standen (nagemaakt, klok op maandag 9 november): Zonder sportschool van za 14 t/m wo 18 november over de weekgrens, met Eigen gewicht op di 17 en een vrije wo 18, en Vakantie van do 12 t/m wo 18 november. Namen: `<variant>-<breedte>-week16.png` en `<variant>-<breedte>-week9.png` voor Zonder sportschool, `<variant>-<breedte>-vakantie-week16.png` en `-vakantie-week9.png` voor Vakantie, op 412 px; `-360-` is dezelfde week 16 op 360 px.

## A. Paneel
De periode is een eigen afgerond paneel met een lichte ijsblauwe tint, de dagen iets ingesprongen erin, en een kop op één regel met icoon, naam en "14 t/m 18 nov", de notitie klein eronder. Voordeel: het eind van de periode is onmiskenbaar, want het paneel stopt (en blijft vlak open als de periode volgende week doorloopt). Nadeel: een kaart in een kaart, en de dagen verliezen 8 px breedte.

## B. Lucht
Een smalle kop met de lucht en twee rijen bergen van SkyBand, met icoon, naam en dagen erop, en een ijsblauwe lijn van 3 px links langs de dagen tot het eind. Voordeel: het is het meest alpine en herkenbaar als "dit is anders". Nadeel: een lichte lucht halverwege de pagina strijdt met de regel dat lucht alleen bovenaan staat, en hij trekt meer aandacht dan een statusregel verdient.

## C. Lijn
Alleen een kleine kop boven de eerste dag (icoon, naam, dagen, notitie) en een dikke rustige lijn van 4 px in de statuskleur langs de dagen, met een afgerond begin en eind. Voordeel: het rustigst en het kost het minste ruimte en kleur. Nadeel: de lijn is het enige teken, dus de kop valt weg tussen de rijen en het eind blijft subtiel.

## Advies
Variant A, omdat alleen het paneel in één oogopslag zegt waar de periode begint en stopt zonder een nieuwe lichte vlakte of extra kleur in de lijst te brengen.

## Gecontroleerd
Op 360 en 412 px geen horizontale overloop, geen tikdoel onder 44 px en geen tekst onder 12 px in de band. De tikdoelen en de blad-opening (Periode bijwerken) zijn niet opnieuw doorlopen met slepen; tests, lint en Warden zijn niet gedraaid, want dit is geen code voor main.
