# Een herkansing die niet doorging, en twee zware beendagen die je zelf neerzette

Datum: 2026-11-02
Status: aangenomen

## Besluit

Een herkansing van de testloop die je oversloeg of liet liggen, telt niet als gedaan: ASCEND stelt nog één
keer een test voor (regel TEST-RETRY, id `retest:<datum van de test>:opnieuw`), met Akkoord en Liever niet. Na
Liever niet vraagt hij het pas weer als er een nieuwe test is gelogd.

Twee zware beendagen achter elkaar die het schema bewust koppelt (de heuvels en de lange duurloop, via
`pairingOverride`) gelden alleen op hun eigen dagen als bewust. Zette jij ze ergens anders in de week, dan meldt
Week het als "Twee zware beendagen achter elkaar." met een voorstel met Akkoord om één van de twee te verschuiven.
Slepen naar zo'n plek vraagt eerst "Twee zware beendagen achter elkaar. Toch hier?" met Annuleren en Toch hier.

In Week breekt de naam van een training alleen tussen woorden; past hij met het label Vandaag niet op één
regel, dan staat het label onder de naam.

## Reden

Twee meldingen van de eigenaar. Een testloop met veel stilstand kreeg een herkansing; die ging niet door,
en daarna kwam er geen voorstel meer omdat de eerste vraag als beantwoord telde. De tempo's bleven zo op een
test rusten die zelf al iets te gunstig was.

In dezelfde week stonden de heuvelsprints met afdalen en de lange duurloop op twee dagen achter elkaar midden
in de week, allebei door de eigenaar zelf gesleept. De weekcontrole zag dat niet, omdat dat paar in het schema bewust na elkaar staat
(heuvels op zaterdag, lange duurloop op zondag) en `findHeavyConflicts` het daarom nooit een botsing noemt,
ook niet op andere dagen. Midden in de week is het gewoon twee zware beendagen binnen 48 uur.

## Hoe het werkt

- De rij die een geaccepteerde TEST-RETRY tot test maakte, wordt gelezen uit de opgeslagen voorstellen
  (`retryTestRows`, een ongedaan gemaakt voorstel telt niet); er is geen nieuw veld en geen migratie.
- Het tweede voorstel zoekt een dag met de zoektocht van een gemiste test (TEST-MAKE-ROOM): frisse benen, 48 uur
  na een zware beendag, de dag na de test rustig. Geen vakantie, tocht, lichte dag rond een tocht of ziektedag.
  Wat jij vastzette schuift en vervalt er niet voor. Geen dag die past: geen voorstel. TEST-MAKE-ROOM spreekt niet
  ook over dezelfde overgeslagen herkansing, zodat er één stem en één Liever niet is.
- De tempo's lezen zoals altijd `pacesFromLogs` en `countedTests`; aan de logs verandert niets.
- De melding in Week komt alleen uit de controle met `reportYours` (de kaart in Week, het voorstel en de vraag bij
  slepen). De planning zelf leest de controle zonder die optie, dus ze verschuift niets stil en
  `planGolden.test.ts` beweegt niet. Alleen als minstens één van de twee van jou is, en niet als beide op hun
  eigen dag van het weekpatroon staan.
- Is de week te vol om één van de twee te verplaatsen, dan mag het voorstel een training van het systeem zelf
  laten ruilen (twee wijzigingen, nooit iets van jou).
- Instellingen: het tweede testvoorstel hoort bij "Nieuwe test voorstellen bij stilstand", de knop van de melding
  bij "Voorstel bij een probleem in de week", de vraag bij slepen bij "Trainingen slepen in Week".

## Alternatieven

- De uitzondering voor het paar overal schrappen. Dan verandert de planning zelf en beweegt de gouden test; het
  bewuste weekendblok zou ook een melding krijgen.
- De herkansing via TEST-MAKE-ROOM laten lopen. Dat voorstel had hier al eerder Liever niet gekregen, over iets
  anders (benen niet fris), en hield daarom zijn mond. Een eigen id per test is duidelijker.
- Het label Vandaag kleiner maken. Dan breekt een nog langere naam alsnog midden in een woord.

## Bron

Meldingen van de eigenaar uit de app, 2 november 2026, nagelopen op zijn back-up (alleen gelezen, niets ervan in
de repo). Tests met nagemaakte gegevens: `src/engine/testRetryOpnieuw.test.ts`,
`src/engine/zwareBenenAchterElkaar.test.ts`.

## Vervangt

Niets. Vult `2026-10-28-nieuwe-testpoging.md` en `2026-10-28-waarschuwingen-in-week.md` aan.

## Terugdraaien

Haal de tak `retryAgainAdvice` uit `testRetryAdvice` en `retryRows` uit `AppDataContext`; haal het blok met
`isIntentionalBackToBack` onder `reportYours` uit `weekValidator.ts` en `legsClose` uit `Week.tsx#moveTo`.
