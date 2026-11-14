# Profiel: de dwarsligger

Lookout en Pathfinder, 14 november 2026. Chromium op 412 px, 4x vertraagde processor, echte touch, klok vast met Playwright `page.clock`, een lege app en alleen nagemaakte gegevens. Build van origin/main (`3f9962a`). Schermafdrukken staan in de scratchpad, niet in de repo.

## Moet

**Een log van 0 minuten of een negatieve duur wordt stil bewaard.**
- Scherm: Hoe ging het? (Gedaan bij de lange duurloop en Losse training).
- Wat ik zag: duur `-5` of `0` en Opslaan geeft zonder waarschuwing een log met `durationMinutes: 0`. Vandaag zegt "Lange duurloop gedaan, 0 min", het Logboek telt "Getraind 0:00 uur" en de training telt als gedaan.
- Wat ik verwachtte: een lege of nul duur houdt Opslaan uit, of de app vraagt "Klopt dit?". Een minteken wordt niet stil een nul.
- Naspelen: klok zondag 28 maart 2027 08:00 Europe/Amsterdam. Eerst een Nieuw beginnen met Fit blijven en de rest op de standaard, Akkoord. Dan Vandaag, Gedaan, duur `-5`, Normaal, Nee, Opslaan.
- Een log is append-only, dus een fout log blijft staan. Dat maakt een stille nul erger dan bij andere velden.

**Op Vandaag spreken twee regels elkaar tegen na zo'n log.**
- Scherm: Vandaag, kaart "Vandaag zit erop" en de rij "Lange duurloop, Gedaan" in Je dag.
- Wat ik zag: de kaart zegt "gedaan, 0 min", de rij eronder zegt "Gedaan · 95 min". De ene toont het log, de andere het plan.
- Wat ik verwachtte: één waarde, die van het log.
- Naspelen: hetzelfde als hierboven, kijk na Opslaan naar Vandaag.

## Mag

**Het vraagnummer in de start klopt niet.**
- Scherm: Nieuw beginnen, de zes vragen.
- Wat ik zag: Vraag 1 zegt "van 6", daarna staat er "VRAAG 2 VAN 5", "3 VAN 5" tot "5 VAN 5". Het totaal krimpt na de eerste keuze.
- Wat ik verwachtte: een totaal dat niet verspringt, of op vraag 1 al "van 5".
- Naspelen: klok maandag 16 november 2026 07:30, lege app, Nieuw beginnen, Fit blijven, Volgende.

**Twee keer snel op Volgende slaat een vraag over.**
- Scherm: Nieuw beginnen, vraag 1.
- Wat ik zag: na twee tikken vlak na elkaar stond ik op "VRAAG 3 VAN 5". Vraag 2 (hoeveel dagen) was met het advies beantwoord zonder dat ik hem zag. De tweede tik raakt de Volgende van het volgende scherm, die op dezelfde plek staat.
- Wat ik verwachtte: een nieuwe vraag blijft een moment ongevoelig voor tikken, of de tweede tik doet niets.
- Naspelen: dezelfde start, dubbel tikken op Volgende bij vraag 1. Let op: ik tikte via Playwright, een mensenvinger zit mogelijk iets langzamer. Ik heb het niet met een echte telefoon gezien.

**Opslaan bij een negatief gewicht is uit, zonder uitleg.**
- Scherm: Gewicht bijwerken.
- Wat ik zag: `-70`, `0` en `abc` laten Opslaan uitgeschakeld, zonder tekst waarom. `999` kg wordt wel gewoon geaccepteerd.
- Wat ik verwachtte: één regel bij het veld ("Vul een gewicht tussen 30 en 250 kg in") en een grens bovenaan.
- Naspelen: klok 28 maart 2027 09:00, Vandaag, Gewicht bijwerken, vul `-70` en daarna `999` in.

**Hoogtemeters 999 bij een duur van 0 minuten worden niet bevraagd.**
- Scherm: Hoe ging het? met "Afstand, hoogtemeters en notities".
- Wat ik zag: 999 m omhoog bij 0 min wordt bewaard en staat zo in het Logboek ("0 min · 999 m D+", "Samen 999 meter omhoog").
- Wat ik verwachtte: een zachte vraag bij onmogelijke combinaties.
- Naspelen: als bij het log van 0 minuten, open Afstand, hoogtemeters en notities en vul het derde veld met `999`.

**Een Vandaag-scherm dat open blijft over middernacht verspringt niet.**
- Scherm: Vandaag.
- Wat ik zag: klok zaterdag 27 maart 2027 23:58, de app open op de voorgrond. Na drie minuten doorlopen staat er nog "ZA 27 MAART". Pas na een naar-de-achtergrond-en-terug (visibilitychange) staat er "ZO 28 MAART". Een snelle sprong over de zomertijdwissel (02:00 wordt 03:00) gaf geen fout en de dag klopte zodra de app terug kwam.
- Wat ik verwachtte: over middernacht verspringt de dag ook zonder dat je weggaat, bijvoorbeeld een telefoon in een houder.
- Naspelen: zet de klok op 2027-03-27 23:58:30 +01:00, open Vandaag, `clock.runFor(180000)`, lees de kop.
- Op een gewone telefoon haalt het wegtikken en terugkomen dit meestal in, dus ik schat dit laag.

**"Eerste week" toont twee weken.**
- Scherm: het blad Je eerste week, na de laatste startvraag.
- Wat ik zag: "Zo ziet je eerste week eruit" met acht trainingen over twee weken (ma 16 nov tot zo 29 nov), de tekst "64 trainingen komen erbij" en "En nog 56 wijzigingen in de weken daarna". Trainingen en wijzigingen zijn hier hetzelfde ding.
- Wat ik verwachtte: één week, of "eerste twee weken", en één woord.
- Naspelen: lege app, klok 16 november 2026 07:30, Nieuw beginnen, alle vragen op de standaard.

**Back-up terugzetten zegt "Import gelukt" als er niets veranderd is.**
- Scherm: Gegevens importeren.
- Wat ik zag: samenvoegen met mijn eigen verse back-up laat alles op "staat er al" staan, daarna "Import gelukt." met Ongedaan maken.
- Wat ik verwachtte: "Niets nieuw in dit bestand".
- Naspelen: Instellingen, Gegevens en back-up, Back-up maken, daarna Back-up terugzetten met dat bestand en Gegevens samenvoegen, Importeren.

## Wat goed ging

- Dubbel tikken op Akkoord (Je eerste week): 64 geplande trainingen, geen dubbele. Dubbel tikken op Opslaan (Hoe ging het?): één log. Dubbel tikken op Back-up maken: één download. Dubbel tikken op Importeren (samenvoegen en volledig herstellen): geen verdubbeling, `Import gelukt` met een uitweg.
- Een blad sluiten 60 ms na het openen (Niet fit?) en de terugknop terwijl een blad open staat gaven geen vastloper en geen restant. Terug direct na Opslaan: één log, blad weg, geen foutmelding.
- Vijf keer achter elkaar "Niet fit?", Verkouden, Liever niet: elke keer een rustige uitkomst, de planning bleef gelijk, geen vastgelopen blad.
- Kapot JSON, een leeg bestand en een vreemd JSON-bestand importeren: elk een duidelijke Nederlandse melding ("beschadigd of onvolledig", "Er is niets gewijzigd"), de gegevens bleven gelijk.
- Twee tabs tegelijk (klok 31 maart 2027 08:00, twee pagina's in één context, Losse training in A en daarna in B): drie logs in de database, geen dubbel log, geen conflict, geen console-fout. Of tab B zijn scherm ververste na het log van A kon ik niet vaststellen: Vandaag toonde in beide tabs dezelfde tekst, ook in A zelf.
- Offline openen met een bestaande stand en offline door de tabs lopen werkte, zoals past bij een app zonder server.
- Een notitie met emoji en 800 tekens werd bewaard zonder fout. Geen horizontale overloop op 412 px in het Logboek met die waarden.
- Geen Engels gezien en geen console-fouten, alleen waarschuwingen over een preload in de service worker (cross-world resource mismatch), die verdwijnen als de pagina rustig staat.

## Niet gedaan of niet te zien

- Een echte telefoon en echte vinger: dubbel tikken ging via Playwright.
- Offline tijdens het opslaan van een log: de app schrijft lokaal, dus er is niets te wachten; ik heb geen netwerkafhankelijke actie (weer, route) laten mislukken.
- Een heel lange naam in Nieuwe plek en 999 km bij een loop heb ik niet doorlopen (tijd).
- De Chromium-filekiezer `showSaveFilePicker` hangt in een headless run zonder uitkomst; op Android bestaat die API niet, dus ik heb hem uitgezet en de downloadroute getest. Of een desktopbrowser met de picker een grens heeft als je annuleert, is niet bekeken.
- Alleen de standaardstart (Fit blijven). De wedstrijd- en toch-doelkeuzes van de start heb ik niet gevolgd.

## De drie belangrijkste punten

1. Een log van 0 minuten of met minteken wordt stil bewaard en blijft dan staan (append-only). Houd Opslaan uit bij duur kleiner dan 1, of vraag door.
2. Na zo'n log zeggen Vandaag en Je dag twee verschillende duren voor dezelfde training.
3. De start: het vraagnummer verspringt (1 van 6, dan 2 van 5) en een dubbele tik op Volgende slaat een vraag over.
