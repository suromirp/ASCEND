# Lookout Wandeling plannen

Branch claude/wandeling-plannen (db5a70c3), Chromium 360, 390 en 412 px, processor 4x vertraagd, echte touch, kracht-demostand, preview op poort 4321. Afdrukken in afdrukken/ (naam: breedte-stap).

Groen (alle drie de breedtes):
- Vandaag: ronde + is 44 x 44 px.
- Keuzeblad: Loggen of plannen met Training loggen, Wandeling plannen en Annuleren; geen overloop, geen tekst onder 12 px, geen tikdoel onder 44 px; terugknop en Annuleren sluiten het blad.
- Training loggen: stap 1 sporten (Wandelen, Hardlopen, Fietsen, Kracht); Hardlopen opent het logblad met Welke training precies? en de wissellijst; terugknop gaat netjes terug; Kracht toont de lijst Welke training was het?, terug sluit netjes.
- Wandeling plannen: blad met km-chips (3, 5, 8, 12, Anders), 5 km gekozen, hoogtemeters, Grote wegen mijden, Stel route voor; terugknop sluit het blad.
- Ascend: rij Wandeling plannen (80 px hoog) opent hetzelfde blad; terug sluit het blad op /ascend.
- Route voorstellen uit: + heet Losse training en opent meteen stap 1 Losse training; de rij op Ascend is weg.
- Mint: per scherm een mint accent (eyebrow en Annuleren-rand zijn bestaand; vul-knop alleen Opslaan of Stel route voor).

Rood/let op:
- Console op 390: waarschuwing over preload en een service worker uit een vorige context ("cross-world service worker resource mismatch"). Komt van de preview met opgeslagen stand, niet van de wijziging.

Niet gecontroleerd: echte route zoeken (geen plaats gekozen, Stel route voor blijft gedempt, dus de kaart zelf niet bekeken); de schakelaar Route voorstellen is voor de test via een script omgezet, niet met een tik; het scherm Vandaag met een geplande training erbij; geen echte telefoon.
