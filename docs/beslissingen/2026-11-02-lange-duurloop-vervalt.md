# Een nieuwe testpoging laat de lange duurloop vervallen als de week erna er al een heeft

Datum: 2026-11-02
Status: aangenomen

## Besluit

Moet de lange duurloop wijken voor een nieuwe testpoging (TEST-RETRY) en heeft de week waar hij heen zou schuiven al een eigen lange duurloop, dan vervalt hij in plaats van te schuiven. Hij wordt ook niet ingekort meegenomen. De tekst van het voorstel zegt het droog: "Lange duurloop van zo 1 november vervalt. Je houdt de lange duurloop van zo 8 november in die week." Heeft die week geen eigen lange duurloop, dan schuift hij zoals eerst. Het blijft een voorstel met Akkoord.

## Reden

Besluit van de eigenaar. Een lange duurloop die kort in de volgende week landt, naast de eigen lange duurloop van die week, gaf daarna een melding in Week ("Twee zware beendagen achter elkaar") en een tweede voorstel om er één te laten gaan (`2026-11-02-tweede-lange-duurloop.md`). Twee lange duurlopen in één week voegen weinig toe; de week erna houdt zijn eigen opbouw.

## Hoe het werkt

- In `retryPlansFor` (`engine/adviceCompute.ts`) slaat de zoektocht een dag over in een week met een andere sessie met de rol `long` en dezelfde sport (`ownLongOf`). Vindt hij daarbuiten geen dag, dan vervalt een lange duurloop van het systeem (niveau 3) en onthoudt het plan welke lange duurloop blijft (`RetryPlan.longKept`).
- Een lange duurloop die jij vastzette vervalt nooit: die maakt de dag, zoals eerst, geen kandidaat.
- Een harde loop die de dag na de test moet wijken, houdt de bestaande korte variant (`catchUpMinutes`).
- Het voorstel test zijn eindstand zoals altijd (`2026-10-28-voorstel-eindstand.md`).

## Alternatieven

- Ingekort schuiven, zoals eerst. Afgewezen door de eigenaar: dat gaf een tweede lange duurloop in de week.
- De lange duurloop naar de week van de test zelf halen. Dat zet hem vlak voor de test, en daar moet nu juist rust zijn (`2026-11-02-rust-voor-een-test.md`).

## Bron

Besluit van de eigenaar, 2 november 2026. Tests met nagemaakte gegevens: `src/engine/rustVoorEenTest.test.ts`.

## Vervangt

Het deel van `2026-10-28-nieuwe-testpoging-ruimte.md`, punt 2, dat zegt: "Valt hij in een week met een eigen lange training, dan wordt hij korter, met de bestaande korte variant (`catchUpMinutes`)." Voor de lange duurloop geldt nu dit besluit; de rest van dat besluit blijft staan.

## Terugdraaien

Haal in `retryPlansFor` de regel met `ownLongOf` en het blok met `longKept` weg; dan schuift hij weer ingekort. `planGolden.test.ts` bewoog niet.
