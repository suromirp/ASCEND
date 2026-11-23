# Sherpa Eén plan 2: stap minuten en een stem (I-14 C en D)

Tak `claude/een-plan-minuten-stem`, vanaf `origin/claude/een-plan-naspelen`.

## Warden M1, hersteld

- `src/engine/adviceLoad.ts#tooHardAdvice`: eerst het nieuwste zware log, testen en wedstrijden inbegrepen; is dat een test of wedstrijd, dan geen advies. Eerder viel de test weg voor de keuze en noemde de regel een oudere zware loop van dezelfde dag, met een ander `relatedLogId` naast TEST-RETRY.
- Toets in `src/engine/eenPlanNaspelen.test.ts`: zware loop om 07:00 en test om 10:00 op dezelfde dag geeft geen HARD-THEN-SPACE (op de testdag en de dag erna); een zware loop na de test geeft hem wel, met dat log.
- Valkuil in `docs/werkbriefjes/planning.md` (zelfde regel als de afdaalklok, het briefje blijft binnen 45 regels).
- Besluit `docs/beslissingen/2026-11-23-een-stem-per-log.md`, regel in `docs/kennisindex/bronnen.json`, `npm run kennisindex` gedraaid, vergelijk zegt geen verschil.

## Wat de eerste commit deed

- `src/engine/substitutions.ts#plannedMinutesOf`: de minuten van Week (vaste lengte van de rij, anders `resolveEffectiveFullDuration`).
- `src/engine/repeatWeek.ts`: `loadAt` en `keyImpact` rekenen daarmee; `costSentence` noemt één getal als het gelijk blijft en de zwaarste week alleen als die verandert.
- `src/engine/oneVoice.ts#oneVoicePerLog` met `VOICE_RANK`, aangeroepen in `computeAdvice` op de lijst `rest`.
- De it.fails van C en D in `src/engine/eenPlanNaspelen.test.ts` zijn `it`; A en B blijven it.fails.

## Niet gecontroleerd

- Geen screenshot van het blad "Deze week nog een keer?" en de debrief na een test.
- Geen naspelen met een echte back-up.
