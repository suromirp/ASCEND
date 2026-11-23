# Eén stem per log

Datum: 2026-11-23
Status: aangenomen

## Besluit

Staan er twee adviezen over hetzelfde log (`relatedLogId`), dan wint de regel die eerst staat in `VOICE_RANK` (`src/engine/oneVoice.ts`: TEST-RETRY, HARD-THEN-SPACE, LIGHT-TWICE). De verliezer valt weg, zonder extra zin bij de winnaar. HARD-THEN-SPACE zwijgt als het nieuwste zware log een testloop of wedstrijd is: die heeft eigen rust.

## Reden

Een extra zin brengt de tegenspraak terug die we weg wilden hebben: "houd het rustig" naast "een nieuwe poging, zodat je benen dan fris zijn". De winnaar houdt zijn eigen knoppen en Akkoord. Dit wijkt af van het ontwerp, dat de verliezer als zin wilde houden.

## Alternatieven

De verliezer als zin bij de winnaar (het ontwerp): afgewezen om de reden hierboven. HARD-THEN-SPACE ook na een test, en TEST-RETRY een dag later: afgewezen, het advies bij vraag 1 van het ontwerp was dat een test eigen rust heeft; de eigenaar antwoordde niet, dus geldt het advies.

## Bron

`docs/visie/Ontwerp Eén plan.md` (symptoom D, invariant 5, vraag 1), backlog I-14, review van Warden op 23 november.

## Vervangt

Niets.

## Terugdraaien

Haal `oneVoicePerLog` uit `computeAdvice` (`src/engine/adviceCompute.ts`) en de controle op test of wedstrijd uit `tooHardAdvice` (`src/engine/adviceLoad.ts`); zet de tests in `src/engine/eenPlanNaspelen.test.ts` en `src/engine/oneVoice.test.ts` mee terug.
