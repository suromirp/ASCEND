# De testloop beter lezen, aanvulling na de review

Datum: 2026-10-27
Status: aangenomen

## Besluit

De beste 5 km van een testloop verandert je tempo's nooit stil: hij telt pas mee als hij geen tempo verandert, als de test net binnenkomt, of nadat je Akkoord hebt gegeven op de getallen. Een wachtende test is zichtbaar op Vandaag, en de beste 5 km hoort bij de getallen van de bron waarvoor hij is gelezen.

Dit vult `2026-10-27-testloop-lezen.md` aan. Dat besluit blijft zoals het is.

## Reden

Warden vond in de eerste opzet vijf gaten. Het aanvullen van de beste 5 km bij het openen van een logblad kon de tempo's veranderen zonder dat je het zag, en de tempo's hingen dan af van of je een log toevallig opende. Een wachtende test stond nergens op Vandaag. Na een correctie bij intervals.icu klopte de beste 5 km niet meer met de log. Een oudere twijfeltest verloor zijn vraag zodra een nieuwere ook trager was.

Wat er nu gebeurt:

1. **Een regel op Vandaag.** Zolang er een wachtende test is (`countedTests(...).pending`), staat er een rustige regel: "Je laatste test wacht op je antwoord: telt hij mee voor je tempo's?" Geen kaart en geen gevulde knop, onder de missie. Een tik opent het logblad van die test met de vraag (`TestPendingLine`, `engine/testJudgment.ts#pendingTestLine`).
2. **De beste 5 km telt pas na akkoord.** Gekozen is een vlag op de afgeleide waarde zelf: `SessionLog.bestEffort.accepted`. De vlag wordt direct gezet als de test net via het horloge binnenkomt (het koppelen rond het opslaan, dus vóór of tijdens de Debrief, die zich bijwerkt zodra het getal er is), of als meetellen geen enkel tempo verandert (`mayAcceptAtOnce`, hetzelfde vergelijk als `paceChangeRows`). Bepaalt de test de tempo's wel anders, dan blijft hij op de hele run staan en toont het logblad: "Uit je run blijkt een beste 5 km van 27:40. Je tempo's rekenden met de hele run." met Nu en Straks per tempo en Akkoord of Annuleren. Pas na Akkoord (`acceptBestEffort`) telt de beste 5 km. Zonder `accepted` telt altijd de hele run, dus de tempo's hangen er nooit van af of je een log opende. Een beste 5 km uit de eerste opzet, zonder vlag, wacht op dezelfde manier op Akkoord. De Debrief en het logblad zeggen "Hele run" zolang de reeks er niet is.
3. **Gebonden aan de bron.** `bestEffort` bewaart de totalen waarvoor hij is gelezen (`wholeKm`, `wholeMinutes`), de vingerafdruk van de log op dat moment. Zijn de afstand of tijd van de log daarna anders (een correctie uit intervals.icu, `sourceSync.updated`), of ontbreekt de vingerafdruk, dan wordt hij genegeerd en bij het volgende ophalen opnieuw berekend. Een gesneden log telt nooit met een beste 5 km.
4. **Een oudere test tussen twee trage.** Een test die wacht, houdt zijn vraag ("Telt mee" of "Telt niet mee") ook als een nieuwere test eveneens trager is, met de regel "Een nieuwere test wacht ook op je antwoord." Een trage test die een snellere nieuwe is voorbijgegaan, vraagt het zachter: "Deze test was trager dan je vorige en is niet meegeteld. Telt hij toch mee?". Vastgelegd in `engine/testJudgment.test.ts`.
5. **Klein.**
   - De reeks wordt per log één keer geprobeerd voor dezelfde totalen. Geeft hij geen beste 5 km (loopband, gaten, afstand), dan staat de vingerafdruk daarvan in `SessionLog.bestEffortTried` en wordt er niet opnieuw gehaald. Kon de reeks niet worden opgehaald, dan wacht dat tot de app opnieuw is geopend.
   - Bij het afkappen van de oordelen op 60 vallen "Telt mee"-oordelen eerst af en "Telt niet mee" als laatste (`capTestJudgments`).
   - Basisverschil: heeft de ene test de beste 5 km als basis en de andere de hele run, dan worden voor de vergelijking van beide de hele runs gebruikt, zodat er geen onterechte twijfel ontstaat (`comparablePaces`). Hebben beide dezelfde basis, dan gebeurt het op die basis.

`bestEffort` is afgeleid en append-only, net als `detail` bij het loopinzicht: hij wordt toegevoegd of, bij een gewijzigde bron, opnieuw berekend, en de vlag `accepted` is jouw akkoord op die afgeleide waarde. Geen gemeten waarde verandert, en het is geen nieuwe uitzondering op "never rewrite logs".

## Alternatieven

- Een oordeel in `testJudgments` voor de basis. Dat mengt twee vragen (telt de test, en met welk stuk) in één lijst. De vlag op de afgeleide waarde is eenvoudiger en reist met de log.
- De beste 5 km altijd direct laten tellen. Dat is wat Warden afkeurde: tempo's veranderen stil.
- Bij het openen niets aanvullen. Dan blijft een oudere test voor altijd op de hele run staan.
- De vraag op de missiekaart of als kaart op Vandaag. Een rustige regel valt het minst op en is toch zichtbaar.

## Bron

De review van Warden op commit 2b4f54c. Opzet van de afgeleide waarde: `docs/beslissingen/2026-10-22-loopinzicht.md`.

## Vervangt

Niets. Het vult `2026-10-27-testloop-lezen.md` aan.

## Terugdraaien

Zet "Twijfeltest eerst vragen" uit voor het oude gedrag van de vraag. De velden `accepted`, `wholeKm`, `wholeMinutes` en `bestEffortTried` zijn optioneel; zonder ze te lezen telt de hele run.
