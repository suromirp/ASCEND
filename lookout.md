# Lookout Week samenhang (I-40 tot I-43)

Commit onder test: 7b2b03a. Chromium, 4x vertraagde processor, echte touch, klok 31 oktober 2026 08:00, breedte 360, 390 en 412 px.
Standen: zonder-sportschool (twee gemist, een vervallen, een overgeslagen, een log op een andere dag) en kracht (twee gemist).
Schermen: Vandaag, Week, weekterugblik, Ascend. Afdrukken in lookout-week-afdrukken/.

Uitslag: groen, geen moet-punten.

- Overloop: geen op enig scherm, enige breedte. Tikdoelen onder 44 px: 0. Tekst onder 12 px: 0. Console: alleen de bewuste melding dat de service worker geblokkeerd is.
- Rij "Bovenlichaam A, Ma 26 - 50 min - gedaan di 27": op 360 px een regel (302 x 52 px), geen afbreking, geen overloop. Rij Rustdag in de lijst breekt op 360 px naar twee regels, past.
- Schermlezer: de DOM heeft "gedaan" en "di 27" als twee spans in een flexrij (gap 4 px), zonder spatie in de tekst (textContent "gedaandi 27"). De toegankelijkheidsboom van Chromium geeft toch "gedaan di 27" (button "Bovenlichaam A Ma 26 50 min · gedaan di 27 Gedaan"). Advies, geen moet: een spatie in de tekst maakt het ook goed voor lezers die de flexrij niet als scheiding nemen.
- Weekterugblik: Overgeslagen en Vervallen staan er elk op een regel met "telt niet mee"; Gemist noemt de twee namen. Stand kracht: "0 gedaan · 1 losse training", Gemist noemt Benen A en Testloop. Geen overloop.
- Telling: de kop in de terugblik ("1 gedaan · 1 losse training · 1:46 uur") en Week ("1 van 4 gedaan · 1:46 uur") noemen dezelfde 1:46 uur. De twee vormen verschillen in woorden, niet in getal.
- Week opnieuw plannen: "Deze week 2 trainingen gemist. Niet dubbel doen; zet de rest terug." in beide standen, 74 px hoog, twee regels op 360 px.
- Vandaag en Ascend: geen leeg scherm, geen overloop, een mint accent per scherm.
- Nieuwe tekst in src: geen U+2013 of U+2014, geen hexkleur of rgba.

Niet gecontroleerd: een echte schermlezer (alleen de toegankelijkheidsboom); het wegvallen van de maand bij een log verder dan zes dagen (de stand heeft een log op een dag afstand); een stand zonder sportschool op een andere klok.
