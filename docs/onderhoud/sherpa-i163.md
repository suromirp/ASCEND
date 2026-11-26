# I-163: nawerk routes en Week

Verslag van Sherpa Routes en week, 26 november. Tak `claude/routes-week-163`, vanaf main (a9556c7). Keuzes en punt 6 staan in `docs/beslissingen/2026-11-26-routes-en-week-nawerk.md`.

## Per punt
1. Wezen: `src/storage/sessionRoutes.ts#loadSessionRoutes` filtert ze bij het lezen, `update` ruimt ze bij de volgende schrijfactie in de opslag op. Test in `sessionRoutes.test.ts`.
2. Inhaal van een inhaal: `src/engine/sessionRoute.ts#routeOfSession` met de lijst van geplande trainingen als derde argument; Week, Vandaag en de Briefing geven `plannedSessions` mee. Test in `sessionRoute.test.ts`.
3. Voet van de helling: `SessionRoute.footStartM`, gelezen in `migrationsSessionRoutes.ts`, getoond in `SavedRouteBlock.tsx` met `routePlanner.ts#footStartLine`.
4. Opnieuw proberen: `routeSheet.ts#mapRetryLine(state, tries)`, `useRouteSearch.ts` telt de pogingen.
5. Lengte: `routePlanner.ts#ascentRepeatsCap` (1,3 keer de afstand) en `ascentCappedLine`; `RouteProposal.ascentCapped`. De oude test van 19,8 km bij 10 km is vervangen.
6. Besluit: het weren blijft, gedrag niet veranderd.
7. Eén blad: `restDayFollows.ts#withRestDayFollow`, gebruikt in `Week.tsx#moveTo`. Test in `rustdagSchuift.test.ts`.
8. `src/engine/restRow.ts#restRowText`, gebruikt in `WeekPlanner.tsx`. `restRowLine` in `dayPlan.ts` is niet aangeraakt (ander spoor) en zegt nog het oude bij een open training; alleen de test van I-150 gebruikt hem nog.
9. `rustdagSchuift.test.ts` roept de echte `applyProposal` aan (via `useMoveActions` met een `useCallback` die de functie teruggeeft, en een stille `flipDom`).
10. `goalWording.ts#goalRefName`.
11. `WeekPlanner.tsx`: de tweede regel mag wrappen als er een routeregel is en de regel een staart heeft.
12. `src/engine/guideWording.ts#guideForGoal` en `src/state/useTrainingGuide.ts`; zes plekken lezen de gids nu via de hook.

## Niet gecontroleerd
- Echte kaartdata en echte hoogtes: alleen nagemaakte hellingen.
- Week op 360 px in een browser: de wrap is niet gemeten.
- De gids met een echt doel op een toestel: alleen de tekstvervanging is getest.
