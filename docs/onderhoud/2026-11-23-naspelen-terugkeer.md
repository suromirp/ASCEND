# Naspelen terugkeer op een rustdag (I-144)

Melding: "Vandaag staat er een rustdag, maar ik heb de hele week niks gedaan." Nagespeeld zonder echte back-up, op een nagemaakte staat van dezelfde vorm met verschoven datums (`src/engine/terugkeerRustdag.test.ts`).

## Vorm

- Vandaag T is een maandag met alleen de vaste Herstelwandeling; daarna Bovenlichaam A, Benen A, Rustige duurloop, Bovenlichaam B, Heuvelintervallen en Lange duurloop.
- De laatste log is kracht op T-12; daarna geen logs.
- Een periode zonder sportschool van vijf dagen met twee dagen ziek boven de nek; de laatste vijf dagen alles overgeslagen of verplaatst.
- Geen `reentry` en geen `reentryWeeks`.

## Oorzaak

Niet bewezen voor de gemelde vorm. Met zonder sportschool T-9 tot en met T-5 en ziek T-8 en T-7 is de dag terug T-4, en `proposeReentry` geeft op main na I-124 al het voorstel; REENTRY staat bovenaan het advies (Warden heeft dit nagespeeld met drie maandagen en twee programmastarts). Meest waarschijnlijk draaide de app van de eigenaar nog de bouw van voor I-124: I-124 kwam op 23 november om 02.38 UTC op main, de melding om 06.59 UTC, en voor I-124 stond het voorstel alleen tot drie dagen na de dag terug (`OFFER_DAYS` 3), dus met de dag terug op T-4 kwam er niets. Vraag aan de eigenaar: ververs de app en kijk of de kaart er nu staat.

Een tweede gat, wel gedicht: eindigt de periode op T-8 of eerder (dag terug meer dan zes dagen terug), dan noemde `proposeReentry` de terugkomst voorbij, ook zonder training sindsdien. De maandag met weinig training kwam er dan ook niet, want `returnDay` kiest een terugkomst in de laatste twee weken boven de maandag.

Nog denkbaar met echte data, niet te toetsen zonder back-up: twee keer Liever niet op REENTRY (`learnFromDeclines` zet hem achteraan, de CoachCard toont alleen het eerste advies), een eerder antwoord op een reentry-id in dezelfde pauze, of een ziekte zonder einddatum (dan staat er een ziektekaart, geen rustdag).

## Fix

1. `proposeReentry`: na de eerste week stopt het voorstel alleen als je na de dag terug trainde (`firstAfter`). Zonder training blijft het staan, met hetzelfde id, tot de dag terug buiten de twee weken valt.
2. `reentryFirstDay` en `reentryFirstDayItems`: staat er op de eerste dag van de instap alleen herstel en trainde je sinds de terugkomst niet (`firstAfter`, Warden moet 2), dan ruilt de eerste kracht- of looptraining van de zeven dagen (geen test of wedstrijd, en geen zware benen binnen 48 uur na een gelogde zware beensessie) van dag met het herstel. Dat staat in de tekst van het voorstel en in de regel van de planningsronde, en gaat als `startItems` mee in hetzelfde Akkoord (`CoachCard.tsx`). Zonder Akkoord verandert er niets.
3. `pauseRestDayLine`: op een dag met alleen herstel zegt Vandaag na meer dan zeven dagen zonder echte training: "Je trainde N dagen niet. Vandaag rustig beginnen: houd je eerste training korter dan gewoon." Met Hersteldag staat er "wandel een half uur, en" voor. Niet op een vakantie- of tochtdag en niet tijdens Weer opbouwen. N komt uit de logs.
4. `reentryNote` noemt de datum niet meer twee keer ("komt naar die dag").

Besluit: `docs/beslissingen/2026-11-23-terugkeer-eerste-dag.md` (vult `2026-11-23-terugkeer-na-pauze.md` aan op één punt). Kennisindex bijgewerkt, werkbriefje planning met een nieuwe valkuil.

## Tests

Nieuw, `src/engine/terugkeerRustdag.test.ts` ("I-144: maandag een rustdag na twaalf dagen niets", 11 tests):
- de laatste log twaalf dagen terug en geen terugkeer gekozen: de vorm klopt
- elke plek van de periode zonder sportschool tussen je laatste training en de laatste vijf dagen geeft vandaag het voorstel (start -14 tot en met -9; -9 is de gemelde vorm en slaagde al op main; -14 tot en met -12 faalden voor de fix)
- als advies op Vandaag, bovenaan, met de eerste dag als training in hetzelfde voorstel
- de ruil is een eigen voorstel: twee items die naar elkaar wijzen, pas met Akkoord toegepast
- geen ruil als de eerste dag al een training heeft, als er al getraind is, of zonder kracht- of looptraining in die dagen
- getraind na de terugkomst: geen ruil van de eerste dag, ook niet met zware benen gisteren (Warden)
- zware benen komen nooit binnen 48 uur na een zware beensessie naar voren
- getraind na de terugkomst: de terugkomst is na een week voorbij, zoals in I-124
- na Liever niet voor deze terugkomst geen nieuwe vraag, ook niet een week later
- zonder Akkoord zegt de rustdag eerlijk hoe lang je niet trainde; N is afgeleid (ook: Hersteldag, vakantiedag, Weer opbouwen)
- deterministisch: twee keer dezelfde invoer geeft hetzelfde voorstel

Nieuw, `src/storage/reentryFirstDay.test.ts`: "de ruil staat in het voorstel, gebeurt pas na Akkoord en blijft na een nieuwe ronde" (door de echte planningsronde).

Aangepast, omdat het gedrag bewust verandert:
- `src/engine/terugkeerNaPauze.test.ts`: "de hele eerste week na terugkomst; D+15 alleen nog als je sindsdien niet trainde (I-144)", "om 23.59 op D+14 nog het voorstel, om 00.01 op D+15 niet meer (na een training sinds de terugkomst)", en de verwachte tekst bij D+12 (nu met de ruil van de Herstelwandeling).
- `src/engine/vakantieZiekGemist.test.ts`: de eerste week na terugkomst (D+7 na een training voorbij, zonder training nog een voorstel) en de verwachte tekst op de dag terug (een maandag met herstel).

Golden A en C (`src/storage/planGolden.test.ts`) bewegen niet: zonder `reentryWeeks` en zonder Akkoord verandert de planning niet.
