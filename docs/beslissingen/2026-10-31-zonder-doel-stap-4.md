# Zonder doel, stap 4: richting kiezen en neutrale golven

Datum: 2026-10-31
Status: aangenomen

## Besluit

Zonder doel plant ASCEND in neutrale golven van vier weken (fase "Golven", `engine/programLayout.ts#layoutWaves`). Er komt dan geen bergtocht, geen eerste wandeldag en geen rugzakladder in het plan; die horen alleen bij een plan met een doel. Een richting kiezen is een voorstel met Akkoord (`components/ascend/useDirectionChange.tsx`, trigger `direction_changed`): pas bij Akkoord worden de richting, de maandag waarop hij begint en de planning samen bewaard, en ongedaan maken zet alle drie terug. Fit blijven geeft drie gelijke weken en een lichtere vierde, Rustig aan elke week hetzelfde zonder harde training (de heuvelloop van de zaterdag wordt een herstelloop).

## Wat er precies verandert

- "Zonder doel" betekent in de planning hetzelfde als op de Ascend-tab: geen doel in de lijst, of alleen een doel van de soort Fit blijven of Sterker worden, en geen einddag van het plan (`engine/direction.ts#planDirection`). Een doel met een datum, ook een hardloopwedstrijd zonder tocht, houdt de oude indeling, zodat de golden scenario's A en C precies gelijk blijven.
- De richting gaat als `Program.direction` mee in het programma, zoals het rugzakdoel: de planningsronde zet het elke keer opnieuw uit `AppSettings.direction`. Het veld is afgeleid, dus een oud programma of een oude back-up zonder dit veld werkt zoals het was; `readProgramDirection` leest het defensief. Er is geen nieuw schemanummer nodig.
- De golven tellen vanaf `AppSettings.directionStart`, zodat week 1 van de golf in het plan dezelfde week is als op de kaart Je week. De weken ervoor zijn een eigen stuk van dezelfde fase.
- Fit blijven heeft nu ook in de gegevens een golf (`data/directions.ts`): geen opbouw, wel een lichtere vierde week. De kaart Je week en het plan zeggen daardoor hetzelfde.
- Vandaag zegt in een golf "Week 2 van 4 van je golf" in plaats van een weeknummer in het programma.
- Instellingen, Doel en tochten: de rij Weekbudget is de rij "Zonder doel" geworden, met in het blad Richting en Weekbudget. Zo blijft de groep op twaalf rijen. Richting heeft een eigen plek in de zoekindex, uitleg achter de InfoButton en een samenvatting.

## Golden test

Scenario B (nieuwe gebruiker, Fit blijven) en D (bestaande gebruiker, alle doelen gearchiveerd) veranderen: de fasen Basisfase, Opbouw, Bergcapaciteit en Expeditieklaar worden "Golven", de bergtochten met 11 tot 15 kilo worden weer de lange loop, de wandeldagen weer de heuvelloop, en de heuvelloop met afdalen is in een golf de gewone heuvelloop. De lijsten "bergtochten en rugzak" zijn leeg. Een paar minuten schuiven omdat de extra groei van de Opbouwfase er niet meer is. A en C zijn niet veranderd. Het nieuwe geval "richting kiezen" staat in `src/storage/planDirection.test.ts`: het voorstel verandert niets tot Akkoord, en bij Akkoord volgen de weken de richting.

## Reden

Een plan zonder doel kreeg een bergtocht en een rugzak waar niemand om vroeg (de nulmeting van stap 1). De eigenaar koos eerder dat een gebruiker zonder doel geen automatisch voorstel krijgt. Daar blijft het bij: er komt geen voorstel uit zichzelf. Wel corrigeert de planningsronde bij een plan zonder doel de eigen sessies van het systeem: een geplande bergtocht wordt weer de lange loop en dat staat in de melding "Planning bijgewerkt", met ongedaan maken, zoals bij elke wissel die bij de fase van een week hoort. Wat je zelf vastzette, wat gelogd is en wat voorbij is, blijft staan. In de app gaat het verdwijnen van een doel bovendien al via het voorstel van archiveren, dus daar zie je het vooraf.

## Alternatieven

- De oude indeling laten staan tot je een richting kiest: dan bleef scenario D een bergtocht tonen zonder doel, en dat moest weg.
- Een nieuw voorstel uit zichzelf voor wie nu geen doel heeft: niet gekozen, de eigenaar wilde geen automatisch voorstel.
- Rustig aan met minder krachttrainingen: het aantal keer kracht in de week volgt pas met stap 7 (`strengthSessions`). Het voorstel zegt nu eerlijk wat er gebeurt.

## Bron

`docs/visie/Zonder doel.md` (2.3, 3.2, 3.3, 3.5 en stap 4), `docs/beslissingen/2026-10-27-zonder-doel-stap-1.md`.

## Vervangt

Niets. Het vult `2026-10-27-zonder-doel-stap-1.md` aan: de zin "de planning volgt in een volgende versie" geldt niet meer.

## Terugdraaien

`layoutPhases` zonder `free` geeft de oude indeling; `patternContext` dan weer `activeSwaps` laten gebruiken. De golden snapshot van B en D gaat dan terug naar de nulmeting.
