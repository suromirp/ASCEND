# Sherpa Route bewaren (I-160, deel A)

25 november 2026. Opslag en Briefing voor een route bij één geplande training. Besluit `docs/beslissingen/2026-11-24-route-per-training.md`, plek van Pathfinder en ontwerp van Cartographer in `docs/visie/`.

## Wat er gebouwd is

- Vorm: `src/models/sessionRoute.ts` (`SessionRoute`: geplande training, soort, bron, km, hm, keer op en neer, hoogstens 800 punten, dag gekozen).
- Engine: `src/engine/sessionRoute.ts` met `sessionRouteFrom` (uitdunnen met `places.ts#simplifyTrack`, afronden zoals de opslag leest), `routeOfSession`, `withSessionRoute`, `withoutSessionRoute`, `routesOfSessions`, `mergeSessionRoutes`, `sessionRouteLine` en `sessionRouteFacts`.
- Opslag: `src/storage/sessionRoutes.ts`, één meta-sleutel `sessionRoutes`, schrijven achter elkaar en in één transactie; elke schrijfactie ruimt routes op van trainingen die er niet meer zijn. `src/state/useSessionRoutes.ts` voor de schermen.
- Migratie: `src/storage/migrationsSessionRoutes.ts` (`migrateSessionRoutes`, via `migrations.ts`); export in `backupExport.ts`, lezen in `backupNormalize.ts`, schrijven bij de planning in `backupApply.ts`.
- Briefing: `TrainingBriefing.tsx` toont bij een bewaarde route `SavedRouteBlock.tsx` (stille kaart, getallen, Andere route, Route verwijderen met bevestigen; tik op de kaart opent de lus groot) en de knop onderaan stuurt die route naar Garmin Connect. Bij zoeken staat onder de lus "Bewaar voor deze training"; bij Andere route ook Annuleren.
- Week: een stille derde regel op de rij ("Route: Avontuurlijk, 10,2 km, 310 m"), alleen buiten en niet als hij gedaan is. Vandaag: dezelfde regel op de missiekaart, een tik opent de Briefing.

## Eigen keuzes

- Een eigen lijst gekoppeld aan `PlannedSession.id`, geen veld op `PlannedSession`. Beide ontwerpen adviseerden een veld; ik koos anders omdat veel paden een hele rij uit een eerdere stand terugschrijven en een veld dan stil verdwijnt: een voorstel dat vóór het kiezen berekend is, Ongedaan maken, de weekcontrole, en vooral `replanWeek.ts#weekDiff`, dat een nieuw gemaakte rij het id van de oude geeft (`{ ...s, id: same.id }`), dus zonder de velden van de oude. Het id blijft bij verplaatsen, ruilen, het raceblok en het herstel na een doel. Een inhaal (`catchUp.ts#catchUpRows`) maakt een nieuw id; die rij leest de route via `catchUp.fromId`. Bijkomend: een route start geen planningsronde (`horizonKey` leest de rijen) en zit niet in elke kopie van een voorstel of Ongedaan maken.
- Geen hogere schemaversie. De opdracht vroeg erom, maar de regel van de repo is dat een optioneel, aanvullend veld de versie laat staan (`places`, `savedRoutes`, `skillGoals`), en vier bestaande tests leggen versie 6 vast (`places.test.ts`, `activityDetail.test.ts`, `routePlan.test.ts`, `runDetailStorage.test.ts`). Omhoog zou betekenen dat ik bestaande tests aanpas; dat heb ik niet gedaan. Een oude back-up zonder het veld leest gelijk en laat de routes van het toestel staan (getest).
- Overgeslagen: de route blijft bewaard maar is niet te zien; Toch doen brengt hem terug. Verwijderd door de planning: bij de volgende schrijfactie en bij de export valt hij weg, en de schermen tonen hem nergens omdat de rij er niet is.
- Een rij die de planning naar een andere training omzet (herstel na een doel) houdt zijn route; buiten de loopband en gedaan toont Week hem gewoon. De eigenaar kan hem wijzigen of weggooien.
- De import neemt de routes mee met de categorie planning: die van het bestand winnen bij hetzelfde id, daarna blijven alleen routes van trainingen die er zijn.
- Kiezen gaat met een tekstknop (gedempt), zodat de knop onderaan het enige mint blijft.
- `readPoint` in `migrationsPlaces.ts` is nu geëxporteerd, zodat beide routes hetzelfde punt lezen.

## Tests

- `src/engine/sessionRoute.test.ts`: uitdunnen tot 800, de regel, verplaatsen, Ongedaan maken van een verplaatsing, ruilen, overgeslagen, inhalen, de week opnieuw ingedeeld (`weekDiff`), verwijderd door de planning, de dag zelf, samenvoegen bij import.
- `src/storage/sessionRoutes.test.ts`: kiezen, wijzigen en weggooien, de training verandert niet, een fout halverwege (alles of niets), opruimen, een kapotte route, de migratie, export en import heen en terug gelijk, een oude back-up zonder veld, een import zonder die training.

## Niet gedaan of niet gecontroleerd

- Deel B (routePlanner, routeSheet, instellingen) niet aangeraakt; `RoutePanel.tsx` ook niet: het blok staat in `TrainingBriefing.tsx` en het nieuwe `SavedRouteBlock.tsx`.
- Geen regel in `SessionActionSheet` (besluit coördinator). De regel "De training is veranderd, de route past nog ..." van Pathfinder is niet gebouwd.
- De bevestiging van Route verwijderen staat in het blok zelf, niet in een eigen blad.
