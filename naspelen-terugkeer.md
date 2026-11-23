# Naspelen terugkeer op een rustdag (I-144)

Melding: "Vandaag staat er een rustdag, maar ik heb de hele week niks gedaan." Nagespeeld zonder echte back-up, op een nagemaakte staat van dezelfde vorm met verschoven datums (`src/engine/terugkeerRustdag.test.ts`).

## Vorm

- Vandaag T is een maandag met alleen de vaste Herstelwandeling; daarna Bovenlichaam A, Benen A, Rustige duurloop, Bovenlichaam B, Heuvelintervallen en Lange duurloop.
- De laatste log is kracht op T-12; daarna geen logs.
- Een periode zonder sportschool van vijf dagen met twee dagen ziek boven de nek; de laatste vijf dagen alles overgeslagen of verplaatst.
- Geen `reentry` en geen `reentryWeeks`.

## Oorzaak

`proposeReentry` (src/engine/reentry.ts) gaf niets zodra de dag terug (de dag na de periode, of de dag van weer beter) meer dan zes dagen voor vandaag lag (`OFFER_DAYS`). Dat gebeurde ook als je sinds die dag niets had gedaan. Met een periode die op T-8 of eerder eindigt (bijvoorbeeld T-14 tot en met T-10, met je laatste training erin) was de terugkomst voorbij. De maandag met weinig training kwam er ook niet, want `returnDay` kiest een terugkomst in de laatste twee weken boven de maandag. Een scan over alle plekken van de periode: eindigt hij op T-7 of later, dan kwam het voorstel wel; eindigt hij op T-8 of eerder, dan niet. In plaats daarvan stond er "Deze week nog een keer?" (REPEAT-WEEK), en op de rustdag de tekst "Je lichaam bouwt op wat je deze week deed".

Zekerheid: de precieze dagen van de echte periode en ziekte zijn niet bekend. Dit is de enige plek in de vorm waar het voorstel wegviel. Overgeslagen en verplaatst, boven de nek en de ordening van het advies (REENTRY staat bovenaan) blokkeerden niets. Andere mogelijke oorzaken die met de echte data te toetsen zijn: `program.startDate` minder dan twee weken voor de dag terug, een eerder Liever niet in dezelfde pauze, of een ziekte met "weer beter" pas gisteren of vandaag (dan loopt Weer opbouwen).

## Fix

1. `proposeReentry`: na de eerste week stopt het voorstel alleen als je na de dag terug trainde (`firstAfter`). Zonder training blijft het staan, met hetzelfde id, tot de dag terug buiten de twee weken valt.
2. `reentryFirstDay` en `reentryFirstDayItems`: staat er op de eerste dag van de instap alleen herstel, dan ruilt de eerste kracht- of looptraining van de zeven dagen (geen test of wedstrijd) van dag met het herstel. Dat staat in de tekst van het voorstel en in de regel van de planningsronde, en gaat als `startItems` mee in hetzelfde Akkoord (`CoachCard.tsx`). Zonder Akkoord verandert er niets.
3. `pauseRestDayLine`: op een dag met alleen herstel zegt Vandaag na meer dan zeven dagen zonder echte training: "Je trainde N dagen niet. Vandaag rustig beginnen: wandel een half uur stevig door, en houd je eerste training korter dan gewoon." N komt uit de logs.

Besluit: `docs/beslissingen/2026-11-23-terugkeer-eerste-dag.md` (vult `2026-11-23-terugkeer-na-pauze.md` aan op één punt). Kennisindex bijgewerkt, werkbriefje planning met een nieuwe valkuil.

## Tests

Nieuw, `src/engine/terugkeerRustdag.test.ts` ("I-144: maandag een rustdag na twaalf dagen niets"):
- de laatste log twaalf dagen terug en geen terugkeer gekozen: de vorm klopt
- elke plek van de periode zonder sportschool tussen je laatste training en de laatste vijf dagen geeft vandaag het voorstel (faalde voor de fix bij T-14 tot en met T-12)
- als advies op Vandaag, bovenaan, met de eerste dag als training in hetzelfde voorstel
- de ruil is een eigen voorstel: twee items die naar elkaar wijzen, pas met Akkoord toegepast
- geen ruil als de eerste dag al een training heeft, als er al getraind is, of zonder kracht- of looptraining in die dagen
- getraind na de terugkomst: de terugkomst is na een week voorbij, zoals in I-124
- na Liever niet voor deze terugkomst geen nieuwe vraag, ook niet een week later
- zonder Akkoord zegt de rustdag eerlijk hoe lang je niet trainde; N is afgeleid
- deterministisch: twee keer dezelfde invoer geeft hetzelfde voorstel

Nieuw, `src/storage/reentryFirstDay.test.ts`: "de ruil staat in het voorstel, gebeurt pas na Akkoord en blijft na een nieuwe ronde" (door de echte planningsronde).

Aangepast, omdat het gedrag bewust verandert:
- `src/engine/terugkeerNaPauze.test.ts`: "de hele eerste week na terugkomst; D+15 alleen nog als je sindsdien niet trainde (I-144)", "om 23.59 op D+14 nog het voorstel, om 00.01 op D+15 niet meer (na een training sinds de terugkomst)", en de verwachte tekst bij D+12 (nu met de ruil van de Herstelwandeling).
- `src/engine/vakantieZiekGemist.test.ts`: de eerste week na terugkomst (D+7 na een training voorbij, zonder training nog een voorstel) en de verwachte tekst op de dag terug (een maandag met herstel).

Golden A en C (`src/storage/planGolden.test.ts`) bewegen niet: zonder `reentryWeeks` en zonder Akkoord verandert de planning niet.
