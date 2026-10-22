# Kwaliteitspoort voor alles wat live gaat

Datum: 2026-10-22
Status: aangenomen

## Besluit

Niets gaat naar main voordat het door vier poorten is: de vier controles
(typecontrole, lint, tests, build), een review door Warden, een doorloop in
Chromium op 360 en 390 px breed met een vertraagde processor door Lookout, en
voor elk scherm dat veranderde een screenshot dat de coördinator zelf bekijkt.
Een knop die op een antwoord wacht heeft altijd een grens in tijd en een
uitkomst die je ziet; de app start nooit op een leeg scherm.

## Reden

De eigenaar vond de kwaliteit slordig: een zwart scherm na herladen, knoppen
die op "Bezig…" bleven staan, een schakelaar die niet omging, velden die
afkapten en pagina's met te veel tekst. De vier controles waren telkens groen,
want ze testen de rekenregels en niet hoe de app op een telefoon met echte
gegevens aanvoelt.

## Alternatieven

Alleen strengere tests: vangt geen afkappen of te veel tekst. Alles eerst aan
de eigenaar laten zien: legt het controleren bij hem, en dat is niet zijn werk.

## Bron

Gesprek met de eigenaar op 22 oktober 2026.

## Vervangt

Niets. Vult de controles uit `2026-10-21-werkwijze.md` aan.

## Terugdraaien

Een poort weglaten kan alleen met een nieuw besluit dat zegt waarom.
