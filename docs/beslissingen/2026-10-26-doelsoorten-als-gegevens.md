# Doelsoorten als gegevens, Klaar voor je doel en belangrijkheid

Datum: 2026-10-26
Status: aangenomen

## Besluit

Een doel heeft een soort (`TrainingGoal.kind`), de ingevulde gegevens (`details`) en een belangrijkheid (`priority`: top, voortop of verkenning). De soorten staan als gegevens in `src/data/goalKinds.ts`, elk getal met een bewijslabel (sterk, matig, zwak, expert of afgeleid) en een verwijzing naar `docs/onderzoek/Doelsoorten berg en buiten.md` of `Doelsoorten duur.md`. `engine/goalReadiness.ts` rekent "Klaar voor je doel" uit die gegevens; `engine/gr5Readiness.ts` is een dunne wrapper die voor een tocht met hutten exact dezelfde uitkomst geeft als voorheen. Dit is ronde 2a: alleen engine en gegevens, geen nieuwe schermen en geen ander planningsgedrag.

## Reden

Het besluit van 26 oktober (`2026-10-26-kracht-en-berg-voor-iedereen.md`) maakt van de GR5 één doelsoort naast andere. Eén voortgangstaal blijft: één percentage, het gemiddelde van de meters, elk begrensd op 100%, altijd met de zin waaruit het bestaat.

Keuzes van de eigenaar die hierin zitten:

- Een meter die nog niet meetbaar is (bijvoorbeeld de langste zwemafstand bij een triathlon) telt niet mee in het percentage, maar wordt wel genoemd als ontbrekend.
- Een combinatiedoel toont het laagste onderdeel, met de naam erbij.
- "Alleen volgen" bestaat niet meer; het wordt Verkenning.

Bij een doel van één lange dag volgt 100% een aandeel van de doeldag (1,0 tot 3 uur, 0,6 bij 8 uur, 0,5 vanaf 12 uur). Dat getal is afgeleid en wordt zo getoond. Bij een meerdaagse tocht blijft het 1,0.

## Overzetten

Het bestaande hoofddoel met mijlpalen wordt een tocht met hutten, of met tent als in het etappeplan een nacht in tent of bivak gekozen is, met de huidige getallen als details, `homeDaysInRow` op 2 (zoals de meter nu rekent) en belangrijkheid top. Een hardloopdoel wordt `run_race`, met de belangrijkheid uit `planRole` (main, secondary, track naar top, voortop, verkenning). `planRole` blijft staan en wordt defensief gelezen. De stap staat in `storage/migrations.ts#migrateTrainingGoal`, loopt bij het inlezen van een back-up en als opstartstap `migrateGoalKinds`. Er is geen nieuwe schemaversie nodig: de velden zijn optioneel en een oud bestand blijft importeerbaar.

## Eerlijk over het bewijs

Trail, fietsen, triathlon en mountaineering zijn dun onderbouwd; hun weken, afbouwdagen, herstel en streefwaarden zijn vooral expert of afgeleid en staan zo gelabeld. De opbouwweken, de afbouwdagen per afstand en het dagaandeel zijn startwaarden die in een latere ronde instelbaar worden.

## Alternatieven

- De meters als code per soort. Afgewezen: het besluit zegt dat doelsoorten gegevens zijn.
- Een ontbrekende meter op 0% zetten. Afgewezen door de eigenaar; weglaten met een zichtbare melding.

## Bron

- `docs/beslissingen/2026-10-26-kracht-en-berg-voor-iedereen.md`
- `docs/visie/Kracht en berg in één plan.md`, deel 3 en 4
- `docs/onderzoek/Doelsoorten berg en buiten.md` en `docs/onderzoek/Doelsoorten duur.md`

## Vervangt

Niets. Het werkt het deel van `2026-10-22-gr5-voortgang-een-percentage.md` uit dat de voortgang aan de GR5 bindt.

## Terugdraaien

Revert van de commit van ronde 2a. De velden `kind`, `details` en `priority` zijn optioneel en onschadelijk als ze blijven staan; niets in de planning leest ze.
