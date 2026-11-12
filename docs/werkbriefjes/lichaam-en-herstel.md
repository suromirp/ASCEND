# Lichaam en herstel

Het lichaamsfiguur, hoe voelt je lijf, een zware beendag op vermoeide benen, een korte nacht en wat speelde er.

## Bestanden
- `src/engine/bodyMap.ts#hitBoxes` plekken, tikvlakken van 44 bij 44 px en zorg per plek; data in `src/data/bodySpots.ts`
- `src/engine/bodyCheck.ts#bodyCheckEvents` de kaart "Hoe voelt je lijf?" op Vandaag, alleen bij een reden
- `src/engine/injuryKind.ts#isSoreness` spierpijn en stijf zijn geen blessure en sluiten na 7 dagen
- `src/engine/legSpots.ts#LEG_BODY_PARTS` een nieuwe beenplek hoort hierin, voor INJURY-LEGS
- `src/engine/legDayEase.ts#legEaseCardSession` zware beendag op vermoeide benen: Lichter of een dag later
- `src/engine/legSoreness.ts#legSorenessList` spierpijn in de benen uit ochtendcheck of notitie
- `src/engine/legFatigue.ts#legFatigueOn` de beenindex; de planner leest hem, de kaart laat hem ongemoeid. Je stand: `src/pages/Standing.tsx` in drie blokken (drie regels, Tempo bij zone 2, een lijst); `src/pages/StandScreen.tsx` de schermen `/stand/benen`, `/stand/belasting`, `/stand/ritme`, `/stand/lopen` en `/stand/invloed`; wat waar staat, de stip en de volgorde in `src/engine/standPage.ts`; de gegevens voor regel en scherm samen in `src/components/stand/useStandData.ts` (besluit `2026-11-12-stand-minimaal.md`)
- `src/engine/shortNight.ts#isDoubtfulShortNight` een twijfelachtige korte nacht wordt een vraag
- `src/engine/influence.ts#affectedMorning` wat speelde er: de ene regel voor welke ochtend een notitie raakt
- `src/engine/influenceProposal.ts#influenceMove` een test na veel glazen als voorstel met Akkoord
- `src/state/bodyAndLeave.ts#useBodyAndLeave` waar meldingen en notities worden geschreven

## Nooit
- Een melding de planning laten veranderen zonder voorstel met Akkoord.
- Zorgteksten met "voorkomt"; het woord is "kan helpen", met de sterkte van het bewijs uit `docs/onderzoek/`. De spoedtekst van een plek (`direct` in `src/data/bodyCare.ts`) of de lijst "Naar een fysio of je huisarts bij" in een inklap zetten: ze staan altijd zichtbaar, op de plekpagina en in het blad Hoe voelt je lijf (`src/components/lichaam/lichaamZorg.scan.test.ts`).
- `legFatigueOn` of de planner aanpassen vanuit een kaart; `src/storage/planGolden.test.ts` beweegt niet.
- Een log omschrijven om een notitie of beoordeling te verwerken: wat speelde er is een lijst naast de historie.
- Alcohol of wiet zelf noemen of afleiden; een reden komt nooit in een lijst, melding of Strava-tekst.
- Gemeten getallen bij Garmin of intervals.icu wijzigen voor "Niet goed gemeten".

## Valkuilen
- De avond ervoor is alleen tekst: kaart en melding (id 4001) lezen, plannen niets en tonen nooit een lege kaart. Meldings-id's: 1001 rust, 2001 en hoger ochtend, 3001 week, 4001 avond; een nieuwe melding krijgt een eigen bereik.
- Een klacht staat onder de naam uit `src/data/bodyAreas.ts` met de zijde erachter; anders herkent INJURY-LEGS hem niet.
- MORNING-CHECK en de kaart doen dezelfde keuze (`legEaseCardSession`): één spierpijn geeft één kaart, niet twee.
- Een spierpijnnotitie van dezelfde dag maakt een gelogde training niet "moe" (geen tijdstip); de ochtendcheck wel.
- "Alleen bovenlichaam" telt niet als beenspierpijn voor MORNING-CHECK, de kaart en de beenindex.
- De RPE van een test telt in de beenindex als 10 en een testloop met warming-up en cooling-down in twee delen; alles dat de index na een test leest, leest dus een lager getal (`src/engine/freshnessAfterTest.test.ts`).
- Feiten die ASCEND zelf weet (warmte, korte nacht, ziek) tellen vanzelf mee en worden nooit bewaard (`derivedFactEntries`).
- De gewichtstrend (`src/engine/weightTrend.ts#weightTrend`, alleen voor wat Lichaamsgewicht laat zien; rekenen gaat via `currentBodyKg`) leest wat `weightsInUse` teruggeeft, nooit de ruwe lijst: anders tellen een eigen gewicht en een weging uit Health Connect op dezelfde dag dubbel. Een trendgewicht uit MacroFactor wordt niet nog eens afgevlakt (`src/engine/weightTrend.test.ts`). Een veld dat een weging bewaart vul je nooit vooraf met de trend. De kaart Gewicht op Je stand en de wegingen in het Logboek komen uit `src/engine/weightCard.ts` (instelling `weightCard`); beide lezen `weightsInUse` met `weightCardOn`, nooit `settings.weightEntries` rechtstreeks, en de rij Gewicht staat bewust niet in `cardOrder` (hij staat vast onderaan de lijst op Je stand). Een tik op de kaart opent het overzicht Gewicht (`src/components/stand/WeightOverviewSheet.tsx`, rekenen in `src/engine/weightOverview.ts`); de lijn van kaart en overzicht komt uit `src/engine/weightTrend.ts#weightLineAt`, alleen uit echte wegingen: een trendgewicht uit MacroFactor telt nooit als losse weging (`src/engine/weightOverview.test.ts`). Tekst in een svg schaalt mee met de breedte: kies de viewBox zo dat `fontSize` 12 op 360 px nog 12 px of meer is (`src/components/stand/WeightChart.tsx`).
- Een los log staat alleen in voor een open training met dezelfde maatstaf als de koppeling achteraf (linkCandidates): van een bron, zelfde soort; een handlog is altijd extra (`src/engine/looseLog.ts`, gebruikt door `weeklyLoad` en `dayLoads`).
- Een nieuw veld in een opgeslagen vorm (`nightJudgments`, `influences`, `legEaseDays`) krijgt een leesbare migratie in `src/storage/migrationsBody.ts` en gaat mee in de back-up.

## Testen
- Tijdens het werk: `npx vitest run src/engine/bodyMap src/engine/bodyCheck src/engine/legDayEase src/engine/legSoreness src/engine/shortNight src/engine/influence`
- Nooit laten bewegen: `src/storage/planGolden.test.ts`.
- Tekstkaart (`npm run kaart:vergelijk`) als Lichaam of een kaart op Vandaag verandert.

## Lees verder
- `docs/architectuur/lichaam-en-herstel.md`, `docs/beslissingen/2026-10-27-spierpijn-en-zware-beendag.md`, `docs/beslissingen/2026-10-26-hoe-voelt-je-lijf.md`, `docs/beslissingen/2026-10-25-wat-speelde-er.md`, `docs/beslissingen/2026-11-02-rpe-bij-een-testloop.md`
