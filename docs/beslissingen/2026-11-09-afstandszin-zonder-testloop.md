# Afstandszin op Vandaag ook zonder testloop

Datum: 9 november 2026

## Besluit

Zonder testloop toont Vandaag bij een rustige of lange loop toch een afstandszin, uit het echte tempo van de laatste lange of rustige lopen (zelfde bron als Tempo bij zone 2, `engine/recentRunPace.ts`). Er komt dan geen tempoblok en geen testregel bij. Bij een tempoloop of zonder lopen staat er niets.

## Waarom

Dit beantwoordt de vraag uit het besluit 2026-11-08-tempo-zone-2-en-afstand. Antwoord van de coördinator, met het advies: ja. Het bestaande gedrag met testloop is niet veranderd: daar gaat het tempo van de laatste lopen voor, zonder die lopen het tempo van de test. De bouwer las "met testloop blijft het tempo van de test" als "ongewijzigd"; Warden bevestigde dat. Wil de eigenaar dat de test altijd voorgaat, dan is dat een kleine aanpassing in `engine/missionFacts.ts`.

## Gevolgen

- `engine/missionFacts.ts`, tests in `missionFacts.test.ts`; werkbriefje `lopen-en-tests.md` bijgewerkt.
