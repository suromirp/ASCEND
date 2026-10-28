# Nieuwe testpoging: herstel na de review

Datum: 2026-10-28
Status: aangenomen

## Besluit

Herstel op `2026-10-28-nieuwe-testpoging.md` en `-ruimte.md`, die zelf ongewijzigd blijven. Waar dit besluit iets anders zegt, geldt dit besluit.

1. **Fris op de testdag.** TEST-RETRY toetst de eindstand: de beenindex op de testdag, na alle verschuivingen, tegen dezelfde grens als de weekcontrole (TEST-FRESH) en TEST-MAKE-ROOM gebruiken (`FATIGUE_THRESHOLDS.test.fresh`). Zo kan het voorstel na Akkoord niet door een van die twee worden tegengesproken of stil worden bijgesteld.
2. **Een beendag die jij vastzette.** Zijn de benen alleen fris als een zware beendag vervalt, ook een die jij zelf vastzette, dan staat die als `remove` in het voorstel, met naam en reden: "Benen A (zwaar) van do 29 oktober laat je deze week gaan, zodat je benen zaterdag fris zijn." Dat mag omdat het een voorstel met Akkoord is en het er letterlijk in staat. Een dag waar de benen ook zonder niet fris worden, is geen kandidaat. Een voorstel dat een eigen sessie raakt weegt zwaarder dan een verschuiving, dus een optie zonder dat gaat voor.
3. **Vrije dagen en tochten.** De testdag en elk doel van een verschuiving slaan vakantiedagen, tochtdagen en de lichte dagen rond een tocht over.
4. **Alleen een gewone harde loop.** Een harde loop die jij vastzette of verplaatste wordt geen test.
5. **Eerlijke tekst.** "Lange duurloop van zo 1 november doe je op ma 2 november in plaats van je rustdag, korter (45 minuten). De herstelwandeling van die dag vervalt."
6. **Een stem per test.** TEST-RETRY zwijgt zolang TEST-MAKE-ROOM spreekt, raakt geen sessie die al in een ander voorstel staat en geen beendag van vandaag waar de kaart Benen voor spreekt.
7. **Ruimte op de dag.** Het dagbudget wordt getoetst voor de testloop op de testdag en voor de verschoven lange duurloop met zijn korte lengte.
8. **Rol in plaats van id.** "Er staat al een test of wedstrijd" gaat via de rol (`idIsTestOrRace`).
9. **Uitleg.** De hulptekst bij "Nieuwe test voorstellen bij stilstand" zegt hetzelfde.

## Reden

Na Akkoord op de eerste versie kwam direct TEST-MAKE-ROOM met "je benen zijn dan nog niet fris" en een voorstel om de door jou vastgezette Benen A te verschuiven, wat niet in het eerste voorstel stond. Een simulatietest past nu het voorstel toe, draait de planningsronde en vraagt het advies opnieuw: geen tegenspraak, geen stille verschuiving.

## Alternatieven

- De beendag toch buiten het voorstel laten en alleen noemen. Dat liet de test op index 14,8 staan.
- De grens van TEST-MAKE-ROOM (10) gebruiken. De weekcontrole gebruikt 8 en zou dan stil verschuiven.

## Gevolg

Een standaardweek met een vastgezette Benen A op donderdag geeft een voorstel voor zaterdag, met de lange duurloop naar maandag en Benen A die vervalt. De golden snapshots in `planGolden.test.ts` veranderen niet. Bekende grens: het dagbudget kent voor de verschoven lange duurloop wel de korte lengte, maar voor sessies die er al staan alleen de volle lengte (zoals overal).

## Bron

Review door Warden en een doorloop in de browser van Lookout.

## Vervangt

Niets. Vult `2026-10-28-nieuwe-testpoging.md` en `-ruimte.md` aan en wijzigt de zin over vastgezette beendagen in `-ruimte.md` (punt 3).

## Terugdraaien

Haal de toets op de eindstand uit `retryPlanFor`.
