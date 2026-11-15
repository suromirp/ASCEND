# Lookout en Warden (tekst): Ziek met koorts (I-48), 1a1a007

Tekst
- Groen: geen U+2013 of U+2014, zinsletters, je/jij, kort, droog feit eerst. De keuzes en de knop "Toch koorts of klachten op je borst?" kloppen met de code: koorts haalt vandaag en morgen van de planning, neus of keel alleen zware trainingen.
- Moet: de vuistregel in `src/engine/illness.ts` (regel 134, uitleg bij Waarom) zegt nog "boven de nek" en "onder de nek", terwijl de keuzes dat woord niet meer gebruiken. Zet daar dezelfde woorden: neus of keel zonder koorts is licht bewegen, koorts is rust.
- Moet: de tekstkaart is niet bijgewerkt. `docs/app-kaart/vandaag-ziek.md` (regels 15 en 19), `vandaag-ziek-eerder.md` (regel 15) en `README.md` (regel 17) hebben nog de oude titels en knop. Draai `npm run kaart` en verklaar het verschil (`kaart:vergelijk` haalde ik niet binnen de tijd).
- Let op: `src/engine/replanWeek.ts` regel 55 heeft in een code-opmerking nog "boven de nek"; alleen een opmerking.

Scherm (Chromium 360, 390 en 412 px, 4x vertraagde processor, echte touch, stand kracht)
- Groen: Vandaag, Niet fit?, keuzes (drie rijen, uitleg leesbaar), voorstel Akkoord, Vandaag ziek met "Toch koorts..." (239 x 44 px), tweede voorstel (koorts), Vandaag koorts, Week. Overal: geen horizontale overloop, geen tikdoel onder 44 px, geen tekst onder 12 px, geen console-fouten.
- Eén mint: de kaart Ziek heeft de mint hoofdknop "Ik ben weer beter" en mint kopje en tekstknop, zoals voor deze wijziging. Niets nieuws.
- Let op, geen moet: de toast "Ziek gemeld: koorts, ook als je verkouden..." wordt op 390 afgekapt met puntjes; "Ongedaan maken" en "waarom" blijven bereikbaar.
- Niet gecontroleerd: `kaart:vergelijk`; de stand heeft een vaste klok, dus de datums in het voorstel (week van 9 november) volgen de stand en niet de echte dag.

Afdrukken staan in `afdrukken/` (390 volledig, 360 en 412 de keuzes).
