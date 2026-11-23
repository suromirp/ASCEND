# Eén dagbeeld voor Vandaag, Week en de weekbalk

Datum: 2026-11-23
Status: aangenomen

## Besluit

Wat er op een dag staat, komt uit één afleiding: `src/engine/dayPlan.ts#weekPlan`. Vandaag, Week, de weekbalk, de weekterugblik en de zin in het Logboek lezen die. Wat vandaag gedaan is, telt op de dag van uitvoeren, zoals de balk: de kaart op Vandaag ook. Drie keuzes horen erbij:

- Week kijkt voor de volgordetip van twee trainingen ("morgen hard", `dayOrder`) ook voorbij zondag, naar de maandag erna, net als Vandaag.
- De zin "vandaag nog gepland" in het Logboek noemt de missie van Vandaag, dus met de ziekteregel: met koorts of buikgriep noemt hij geen training.
- De balk noemt het verschil met Week alleen in het aria-label: "Tempoloop van do 19, gedaan". De balk zelf blijft pictogrammen zonder tekst.

## Reden

Drie plekken die elk zelf kozen, zeiden voor dezelfde dag iets anders (symptoom B van `docs/visie/Ontwerp Eén plan.md`). Week en Vandaag keken een andere dag vooruit; het Logboek kon een training noemen die Vandaag bij ziekte niet als missie geeft. De kaart op Vandaag zei op de dag van uitvoeren "niets gepland" naast een gedane training in de balk. De balk is een strook van zeven pictogrammen; een woord erin past niet zonder een nieuwe indeling, en dat is geen bijwerking van deze stap. Wie de balk voorleest, hoort het verschil wel; wie kijkt, vindt het woord in Week ("gedaan wo 18").

## Alternatieven

Een zichtbaar teken in de balk voor een training van een andere dag: niet gekozen, een nieuw ontwerp hoort bij een eigen opdracht. Week alleen binnen de week laten kijken: niet gekozen, dan geeft zondag in Week een andere volgorde dan Vandaag. Het Logboek zonder ziekteregel: niet gekozen, dan noemt het een training die Vandaag niet geeft. De kaart op Vandaag op de geplande dag laten tellen: niet gekozen, de balk telt op de dag van uitvoeren (`docs/beslissingen/2026-11-23-telt-op-dag-van-uitvoeren.md`).

## Bron

`docs/visie/Ontwerp Eén plan.md` (symptoom B, invariant 3 en 6, stap 5), backlog I-14, de review van de Warden en de Pathfinder van 23 november. Verslag: `docs/onderhoud/2026-11-23-een-plan-dagbeeld.md`.

## Vervangt

Niets.

## Terugdraaien

De kaart: in `src/pages/Today.tsx` `allTodayDone` en `anyDoneToday` weer uit de rijen van de geplande dag halen in plaats van uit `plan.day(today)`. Week: in `weekPlan` de dag na zondag uit de week halen. Het Logboek: `todayPlanned` in `src/pages/History.tsx` zonder `illness`. Het woord in het label: `plannedOn` niet tonen in `src/components/vandaag/WeekStrip.tsx` en de tests in `src/components/vandaag/eenPlanDag.test.ts` terugzetten. Liever niet: dan zeggen de schermen weer iets anders.
