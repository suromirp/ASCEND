# Sherpa Planning, bouwmoment 26 november (tweede vervolg)

Branch `claude/planning-mag-26nov`, vanaf origin/main 3b9dda6. Engine-punten uit I-164 en I-52.

## Wat er veranderde

- Terugval van Geen tijd vandaag (`src/engine/scheduler.ts#proposeNoTimeToday`): de oude `fallback` koos de eerste
  latere dag met ruimte die niet in de eerste lijst stond. Een dichte dag haalde `tryDay` toch al af, dus de terugval
  koos in de praktijk alleen een dag naast een test of wedstrijd, tegen het besluit over I-147 in. Weg; zijn er alleen
  zulke dagen over, dan zichtbaar overslaan. Tests in `src/engine/availabilityOpenDay.test.ts` (alleen dagen naast een
  test over, en een vastgezette rij op de dag zelf). De opstartstap (`computeForecastReplan`) gebruikt dezelfde lus.
- Geen tijd vandaag: geen scherm riep `proposeNoTimeToday` of `applyNoTimeToday` uit de AppData aan (grep op
  components en pages leeg; `moveSuggestions.ts` zegt al dat het vervangen is). De twee acties zijn weg uit
  `src/state/bodyAndLeave.ts`, `src/state/AppDataProvider.tsx` en `src/state/appDataTypes.ts`, met hun ongebruikte
  imports en de parameter `sessionsForWeek` van `useBodyAndLeave`. Er waren geen tests van. De enginefunctie blijft:
  `src/engine/adaptiveReplanner.ts` gebruikt hem, met tests.
- `restRowLine` uit `src/engine/dayPlan.ts` weg, met zijn blok in `dayPlan.test.ts`. `REST_ROW_QUIET` blijft (gebruikt
  door `restRow.ts`). `src/engine/restRow.test.ts` toetst de tekst nu rechtstreeks, en neemt het geval over dat alleen
  in het oude blok stond: een training van een andere dag die je op de rustdag deed (en die op zijn dag blijft).
  Werkbriefje week verwijst nu naar `restRow.ts#restRowText`.
- Langer voor hoogtemeters (nieuwe instelling, groep Vandaag, bundel weer en route, zichtbaar als Route voorstellen
  aan staat): 1,2, 1,3 (advies), 1,5 of 2 keer de afstand. Veld `routeAscentLength`, optioneel; zonder veld (oude
  back-up) het advies via `resolveAscentLength`, dus geen migratiestap. `backupClean.ts` laat een vreemde waarde vallen.
  Engine: `LoopOptions.maxLengthFactor`, doorgegeven aan `ascentRepeatsCap` en `chosenRepeats`; de lus onthoudt de
  grens in `ascentCapFactor` (alleen in het geheugen) zodat de zin "meer dan 1,2 keer zo lang" de gekozen grens noemt.
  `useRouteSearch.ts` geeft de instelling mee en zet hem in de zoeksleutel. Foto van de instellingen bijgewerkt.
- Wezen in `sessionRoutes` (`src/engine/sessionRoute.ts#routesOfSessions`): bewaart nu elke route die via de keten
  van een inhaal (`chainIds`) nog bereikt wordt, dezelfde keten als `routeOfSession`. Een route van een rij van toen
  die zelf weg is, blijft zo voor de inhaal; een route die geen enkele training meer bereikt, gaat weg.
- I-52: kracht 75 en Herstelwandeling 45 in de eerste week zijn al opgelost door de ladder (`beginnerPlan.ts`, met
  Akkoord). Een start op heel licht van voor de ladder houdt ze bewust tot het voorstel op Vandaag. Erbij: een
  toets in `src/storage/beginnerLadder.test.ts` voor week 1 (Herstelwandeling niet langer dan de lange wandeling,
  kracht hoogstens de trede). Het etiket: `sessionKindLabel` en `logKindLabel` (`src/engine/sports.ts`) zeggen
  "Wandelen en dribbelen" voor een sjabloon met rol `start_only`; de kaart op Vandaag zegt nu "Vandaag · wandelen en
  dribbelen". De kop van de Briefing (`sessionBrief.ts`) leest de sport zelf en zegt nog Hardlopen; niet aangeraakt.

## Wat over is van I-164

Niet van de engine en niet in deze opdracht: Akkoord in het blad Belangrijk advies zonder de lijst met wijzigingen,
het blad dat na een mislukte Akkoord niet terugkomt (`FirstAdviceHost.tsx`), een stand op de app-kaart met het blad,
wat er na PermissionWelcome gebeurt, de losse "·" op Week op 360 px, Opnieuw proberen van de route in de browser.

## Niet gecontroleerd

Geen browser: het etiket op Vandaag en de nieuwe instellingsrij niet op een scherm gezien.
