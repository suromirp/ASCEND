# Spierpijn en een zware beendag

Datum: 2026-10-27
Status: aangenomen

## Besluit

Op de dag van een zware beendag kijkt ASCEND naar spierpijn die je meldde (ochtendcheck of "Hoe voelt je lijf?"), een harde loop eerder die dag en de beenindex, en doet bij een reden één voorstel: "Lichter" (dezelfde training met meer reserve en een set minder) of een dag later via de bestaande planningsronde, altijd met "Liever niet". Bij het verplaatsen van een zware beendag of harde training staat een stille regel met de beenindex van de nieuwe dag. Gebouwd zijn stap 1, 2 en 3 uit `docs/visie/Spierpijn en een zware beendag.md`. Stap 4 (weekregel LEG-FRESH) is bewust niet gebouwd en krijgt later een eigen besluit.

## Reden

Alle gegevens waren er al, maar ASCEND zei er niets over: Forge las de ophoging door gemelde spierpijn niet, een melding uit "Hoe voelt je lijf?" telde nergens mee, en de testloop van die ochtend telde niet in de beenindex omdat de index een training van dezelfde dag bewust overslaat. Doortrainen met spierpijn mag volgens `docs/onderzoek/Pijn spierpijn en vermoeidheid melden.md`, maar een of twee dagen geen kwaliteit en geen zware benen kan helpen. De eigenaar kiest zelf; ASCEND biedt de keuze aan.

## Wat er is gebouwd

- Stap 1, lezen. `engine/legSoreness.ts`: een melding "spierpijn" op een beenplek (`engine/legSpots.ts`, dezelfde lijst als INJURY-LEGS) van vandaag of gisteren telt even zwaar als "Spierpijn" in de ochtendcheck, en het laatste antwoord wint (zegt de ochtendcheck van vandaag Fris of Wat stijf, dan telt een melding van gisteren niet meer). De kaart Benen, Forge (`legsTiredAt`, "Je benen zijn nog moe van spierpijn") en de raak-geschiedenis lezen dat. `engine/legDayEase.ts#earlierTodayPoints` telt een harde loop van dezelfde dag mee (RPE 7 of hoger en 20 minuten of meer, dus ook een testloop) met 6 uur ertussen als de tijd onbekend is. `legFatigueOn` en `freshnessAt` zijn ongewijzigd, dus de planner en `planGolden.test.ts` ook.
- Stap 2, het voorstel. Een kaart op Vandaag (`LegEaseCard`, alleen met een reden, onder de missie) en dezelfde vraag boven in Forge. "Lichter" gaat via `easeSlots`: zeker 3 herhalingen over per werkset (een set tot falen wordt een gewone set), van elke beenoefening met drie sets of meer vervalt de laatste, een extra oefening vervalt, bovenlichaam en romp blijven. Daarna rekent `planExercise` zoals altijd. De dag later is een voorstel met Akkoord (`adviceEngine.ts#legEaseMoveAdvice`, regel LEG-EASE); als MORNING-CHECK dezelfde training al aanwijst, zwijgt die zodra de kaart het overneemt. Voor een kwaliteitsloop bestaat alleen de dag later.
- Stap 3, de stille regel. In het verplaatsblad (`RescheduleDialog`) en in het voorstelblad (`ProposalSheet`) staat bij een zware beendag of harde training een dimme regel als de beenindex op de nieuwe dag boven 12 komt, op de grens met "op de grens". Zonder knop en zonder iets te blokkeren.
- Instellingen: "Lichter bij vermoeide benen" (`legEase`: voorstel, regel of uit) en "Hoe licht" (`legEaseHow`: standaard, alleen gewicht, extra licht), in de groep Vandaag en meldingen. Uit zet ook de stille regel uit.
- Bewaren: `AppSettings.legEaseDays`, per datum en training wat je koos, de laatste 60, optioneel en defensief gelezen (`storage/migrations.ts#migrateLegEaseDays`), per datum en training samengevoegd bij een back-up terugzetten. Het schemanummer van de back-up verandert niet. De training, de planning en de logs veranderen er niet door; "Terugzetten" haalt de keuze weg.

## Keuzes van de eigenaar op de open vragen

1. Het voorstel verschijnt ook als een testloop en een beendag bewust op een dag staan. Het is een voorstel, geen verplaatsing.
2. Lichter standaard is zeker 3 herhalingen over en de laatste set eraf, met de instelling "Hoe licht" voor alleen gewicht of extra licht.
3. Minder excentrisch: niet in deze ronde.
4. Zowel Vandaag (met de zin voor wie in MacroFactor traint) als Forge.
5. Geen weekregel nu.
6. Een melding "spierpijn" op een beenplek van vandaag of gisteren telt even zwaar als "Spierpijn" in de ochtendcheck.
7. 6 uur tussen een ochtendloop en de beendag als de tijd onbekend is.

## Raak en een bewust lichtere training

De toets "raak" (`engine/prescriptionCheck.ts`) meet of een voorstel een goed voorstel was voor die dag, tegen het doel van het sjabloon (bereik en reserve). Wie bewust lichter traint, zit met zijn herhalingen en reserve boven dat doel en zou als "te licht" tellen aan de kant van jezelf en van MacroFactor. De vlag `legsTired` kent `prescriptionCheck` niet, en een voorstel van ASCEND zelf zou tegen die lichtere training worden afgemeten. Daarom telt een log van een training waarvoor je "Lichter" koos niet mee: `comparisonRows` krijgt de logs van die keuze (`legDayEase.ts#easedLogIds`, via `legEaseDays`, op planning en datum) en geeft die rijen geen `check` en de markering `eased`. Ze blijven zichtbaar met "Bewust lichter gedaan. Dit telt niet mee voor raak." en tellen ook niet mee voor de zin "x van de y keer zat ASCEND hooguit een stap naast het gewicht dat je pakte". Aan `prescriptionCheck.ts` zelf is niets veranderd: dezelfde functie en dezelfde ruimte voor beide kanten. Een training op een dag met spierpijn krijgt via `legsTiredAt` wel `legsTired`, zodat Forge uit zo'n dag geen lagere kracht leert, zoals bij een bergtocht gisteren.

## Alternatieven

Een weekregel LEG-FRESH meteen bouwen (stap 4): verandert de planning en dus de bevroren jaarplanning, daarom later en met een eigen besluit. Een vast percentage lichter in kilo's: het krachtmodel met reserve volgt het onderzoek beter. LEG-SPACING uitbreiden met meer sessies: maakt de regel groffer en de planning krapper; de beenindex weegt al alles samen.

## Bron

`docs/visie/Spierpijn en een zware beendag.md`, `docs/onderzoek/Pijn spierpijn en vermoeidheid melden.md`, `docs/onderzoek/Betrouwbaarheid beenvermoeidheid-index.md`, `docs/onderzoek/Volgorde van twee trainingen.md` en `docs/beslissingen/2026-10-26-hoe-voelt-je-lijf.md`. Keuzes op de open vragen: de eigenaar liet ze aan ons over en nam het advies.

## Vervangt

Niets. Het beenkaartadvies van MORNING-CHECK blijft bestaan voor andere dagen en andere trainingen; alleen voor een zware beendag van vandaag na spierpijn neemt de kaart het over.

## Terugdraaien

Zet "Lichter bij vermoeide benen" op Uit: dan verschijnt er niets meer, ook niet de stille regel, en MORNING-CHECK doet weer wat het deed. Het veld `legEaseDays` blijft veilig in de back-up staan en doet niets.
