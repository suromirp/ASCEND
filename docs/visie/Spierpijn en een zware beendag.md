# Spierpijn en een zware beendag

Ontwerp van Cartographer Beendag. Geen code, een voorstel voor de eigenaar en voor Sherpa. Het sluit aan op `docs/onderzoek/Pijn spierpijn en vermoeidheid melden.md`, `docs/onderzoek/Betrouwbaarheid beenvermoeidheid-index.md`, `docs/onderzoek/Volgorde van twee trainingen.md`, het besluit `docs/beslissingen/2026-10-26-hoe-voelt-je-lijf.md` en de stem uit `docs/beslissingen/2026-10-27-stem-van-ascend.md`.

## Aanleiding

De eigenaar liep vanochtend een testloop op RPE 9, reed daarna naar Benen A met flinke spierpijn in zijn benen, en had drie dagen eerder heuvels met afdalen gedaan en twee dagen eerder een lange duurloop. MacroFactor schreef de gewone, zware training voor. Hij vroeg: wat kan de app in zo'n situatie doen?

## Kort antwoord

Dit is een kleine functie in twee delen.

1. Op de dag zelf weet ASCEND nu niet dat je benen moe zijn, terwijl alle gegevens er zijn. Spierpijn uit de ochtendcheck tilt wel de beenindex op, maar Forge leest die tilling niet. Spierpijn die je meldde in "Hoe voelt je lijf?" telt nergens mee. En de testloop van vanochtend telt niet in de index, omdat de index een training van dezelfde dag bewust overslaat. Het ontwerp laat ASCEND dat drie keer rechtzetten en daarna een voorstel doen: "Lichter" (dezelfde training, met minder gewicht, meer reserve en een set minder per oefening) of een dag later, met altijd "Liever niet".
2. Vooraf is het antwoord: allebei, in drie stappen. Eerst een stille regel bij het verplaatsen (alleen lezen, verandert geen plan), daarna een regel in de weekcontrole voor wat het systeem zelf plant, achter een instelling. De weekregel verandert de planning en dus de bevroren jaarplanning (`planGolden.test.ts`), daarom komt die als laatste.

De kleinste bouwstap die al iets oplevert is stap 1 hieronder: Forge en de kaart Benen laten weten dat je spierpijn meldde, en de testloop van vanochtend meetellen. Dat zijn kleine aanpassingen in bestaande functies en geen nieuw scherm.

## Wat er al is, en waar het gat zit

- `engine/legFatigue.ts#legFatigueOn` rekent de beenindex. Gemelde spierpijn uit de ochtendcheck zet een ondergrens (spierpijn minstens 8,5, flinke spierpijn minstens 12). Een training van dezelfde dag telt niet (`days < 1` wordt overgeslagen). Dat is goed voor de dagen erna, maar op de dag van de beendag zelf mist de testloop van vanochtend.
- `components/LegFatigueCard.tsx#useLegFatigueInputs` geeft alleen de ochtendcheck door als spierpijn. Een melding van spierpijn in een been uit "Hoe voelt je lijf?" (een `InjuryNote` met `kind: 'spierpijn'`) wordt niet gelezen.
- `engine/forgeWorkout.ts#legDayLine` zegt op een beendag alleen "Beenindex 9, wat vermoeid." of "Je benen zijn nog moe van ...". `engine/strengthHistory.ts#legsTiredAt` kijkt wel naar een harde loop eerder vandaag (RPE 7 of hoger en 20 minuten of meer, dus ook een testloop), maar niet naar gemelde spierpijn.
- `engine/forgeAdjust.ts` stelt "Lichter" voor na een set die te zwaar bleek. Dat is reactief, per oefening, en pas als je al een set hebt gedaan.
- `engine/adviceEngine.ts#morningAdvice` (regel MORNING-CHECK) doet na spierpijn in de ochtendcheck al een voorstel om de eerstvolgende zware beendag of harde training te verplaatsen, met meerdere data via `moveOptions` en Akkoord via de bestaande planningsronde. Als er geen goede dag is, staat er alleen tekst: "Kies de korte versie ... met lichtere gewichten en ruim reserve". Er is dan geen knop die dat doet.
- `engine/weekValidator.ts` kent TEST-FRESH (beenindex voor een test), TEST-DAY, AFTER-TEST en LEG-SPACING (48 uur tussen twee zware beendagen). Een beendag zelf wordt niet op de index getoetst. Een testloop is geen zware beendag (`lowerBodyLoad` is gemiddeld), dus LEG-SPACING kent hem niet. TEST-DAY meldt wel dat Benen A op de testdag staat, en `TEST-MAKE-ROOM` houdt Benen A die dag bewust "na de test, liefst 6 uur later".
- Het onderzoek zegt: doortrainen met spierpijn mag, maar één tot twee dagen geen kwaliteit en geen zware benen. Spierpijn zegt weinig over de werkelijke schade ("fris" haalt daarom nooit iets af). Pijn op een plek is iets anders en blijft een aparte rem. Dat staat al in `Pijn spierpijn en vermoeidheid melden.md`; dit ontwerp voegt daar geen nieuwe claims aan toe.

## Deel 1: op de dag zelf

### Wanneer het verschijnt

Een kleine functie `legDayEase` beslist. Ze draait op een dag waarop een nog niet gelogde zware beendag (`type === 'strength'` en `isLegHeavyTemplate`) is gepland, vandaag. Voor een kwaliteitstraining (harde loop, geen test) geldt hetzelfde alleen voor het voorstel om te verplaatsen; die kan niet "lichter" in Forge. Een test of wedstrijd valt erbuiten: die hebben TEST-FRESH en de inloop.

Er is een reden als een van deze drie klopt. Alle getallen zijn afgeleid, niet gemeten, en staan als constanten bovenaan het bestand met tests eromheen.

- Spierpijn gemeld. De ochtendcheck van vandaag zegt Spierpijn of Flinke spierpijn bij Benen, of er is een open melding "spierpijn" van vandaag of gisteren op een beenplek (de plekken in `LEG_BODY_PARTS`, via `engine/injuryKind.ts`). Het laatste antwoord wint: zegt de ochtendcheck van vandaag Fris of Wat stijf, dan telt een oudere melding niet. Spierpijn piekt 48 tot 72 uur na de training en is binnen een week weg; een melding van twee dagen terug telt daarom niet meer mee.
- Een harde loop eerder vandaag. Een gelogde loop van vandaag met RPE 7 of hoger en 20 minuten of meer (dat is `hardLegLabel`, dus ook een testloop op RPE 9). Er komt een rekenpost bij, zie `earlierTodayPoints`: de index negeert nu per ontwerp de training van dezelfde dag, en dat is hier het gat. De punten volgen dezelfde halfwaardetijden als de index, met het aantal uren tussen de twee trainingen (zonder tijd: 6 uur, de ondergrens uit `Volgorde van twee trainingen.md`). Voor intensiteit halveert dat per 12 uur, voor kracht en klappen per 24 uur, en spierschade blijft de eerste dag. Een testloop van 25 minuten op RPE 9 geeft zo ongeveer 9 tot 10 punten erbij op 6 uur afstand.
- Een hoge beenindex. De index van vandaag, plus de punten van eerder vandaag, is hoger dan 12 (`HEAVY_LEG_INDEX` in `engine/bodyCheck.ts`, het woord "Vermoeid" op de kaart Benen). Tussen 10 en 12 zegt de kaart al "Wat vermoeid" en gebeurt er verder niets. De index is een schatting die rond de grens een paar punten kan afwijken (`FATIGUE_BAND`, 2 punten), dus op de grens zelf zegt de tekst "ongeveer".

Er komt geen voorstel als de training al gelogd is, al is begonnen (een werkset is afgevinkt), door de eigenaar is overgeslagen, of als hij "Liever niet" koos voor deze training vandaag. Bij pijn op een plek is dit niet het juiste instrument: dan werkt de bestaande regel INJURY-LEGS en de rem op die plek, en de tekst hieronder verschijnt niet maar die van de pijnrem.

### Stap 1, de kleinste bouwstap: ASCEND leest wat het al weet

Geen nieuw scherm, geen nieuwe knop.

- `useLegFatigueInputs` geeft ook open spierpijnmeldingen op beenplekken door als `FatigueSoreness` (niveau Spierpijn). De index krijgt dan dezelfde ondergrens als bij de ochtendcheck. Kaart Benen en Forge zeggen daardoor hetzelfde.
- `legsTiredAt` krijgt een extra invoer voor gemelde spierpijn. Forge zegt dan "Je benen zijn nog moe van spierpijn. Zelfde gewicht, een herhaling minder is normaal." Daardoor telt zo'n training ook als "benen moe" in de geschiedenis (`HistorySession.legsTired`) en verlaagt ze de schatting van je kracht niet, zoals bij een bergtocht gisteren al gebeurt.
- `legDayLine` telt de testloop van vanochtend mee via `earlierTodayPoints`, en noemt hem: "Je testloop van vanochtend telt nog mee. Beenindex 15, vermoeid."

Dit is stap 1. Het is te bouwen zonder nieuwe instelling, want het verandert alleen wat ASCEND zegt en rekent, niet wat het doet of voorstelt. Het gedrag van de index voor de planner (`freshnessAt`) verandert niet, dus `planGolden.test.ts` blijft groen.

### Stap 2: het voorstel op Vandaag en in Forge

Dit is het deel met knoppen. Het zit achter de instelling "Lichter bij vermoeide benen" (zie Instelling).

#### Vandaag, van boven naar beneden

De missiekaart blijft zoals hij is, met de ene gevulde mint knop. Dit is een gewone kaart eronder, alleen zichtbaar als er een reden is.

1. `Card` met `Eyebrow` "Benen".
2. Titel in gewone tekst (geen Marcellus, het is geen paginatitel): "Benen A op vermoeide benen". De naam is de naam van de training zonder haakjes.
3. De feitregel, met hoogstens twee redenen, in de volgorde spierpijn, harde loop, index. Letterlijk, afhankelijk van wat klopt:
   - "Je meldde spierpijn in je benen en je liep vanochtend hard. Beenindex 15."
   - "Je meldde flinke spierpijn in je benen. Beenindex 12."
   - "Je liep vanochtend je testloop. Beenindex 15."
   - "Beenindex 14. Je benen dragen nog veel van de afgelopen dagen."
   Vanochtend wordt "eerder vandaag" als de loop na de middag begon. Een testloop heet "je testloop", een andere harde loop "je loop".
4. De uitleg bij het getal, kleiner, in de dimme inkt: "Beenindex: wat je benen nog dragen van eerdere trainingen. Tot 12 kan een zware dag."
5. De C-regel: "Doortrainen mag. Wil je het rustiger aanpakken, dan kan het lichter of een dag later."
6. De uitleg wat Lichter is, dim: "Lichter is minder gewicht, zeker 3 herhalingen over en een set minder per oefening. Het blijft dezelfde training."
7. Knoppen, in deze volgorde: `SecondaryButton` "Lichter"; `TextButton` "Naar vrijdag" (de eerste goede dag, met de bestaande `moveOptions` kiest hij tussen meer data, en Akkoord staat in het bekende voorstelblad, niet hier); `TextButton` "Liever niet". Geen "Niet nu": de kaart is stil en blijft gewoon staan onder de missie, hij verdwijnt zodra de training gelogd is.

Als er geen goede dag deze week is, valt "Naar ..." weg en blijft "Lichter" over. Dat sluit het gat in MORNING-CHECK, waar nu alleen tekst staat.

Na "Lichter" verandert de kaart in één regel: "Lichter gemaakt. In Forge staan minder gewicht en minder sets klaar." met `TextButton` "Terugzetten". Daaronder, dim: "Doe je de training in MacroFactor? Kies daar zelf een lichtere set met zeker 3 herhalingen over."

Na "Liever niet" blijft er niets staan op Vandaag voor deze training.

De kaart is dezelfde `Advice` als die MORNING-CHECK nu al maakt voor spierpijn in de ochtendcheck, met één veld erbij waarmee de knop "Lichter" verschijnt. Er komt dus geen tweede kaart bij dezelfde reden. Een reden die MORNING-CHECK nog niet leest (een melding uit "Hoe voelt je lijf?", de index, een harde loop van vandaag) krijgt een eigen advies met `ruleId: 'LEG-EASE'`, in dezelfde vorm. De kaart verdringt niets: Vandaag heeft al veel blokken, daarom komt dit in plaats van, niet naast, de bestaande beenkaart-regel van MORNING-CHECK, en alleen één keer per dag.

Hergebruikt: `Card`, `Eyebrow`, `SecondaryButton`, `TextButton`, het bestaande `ProposalSheet` voor het verplaatsen. Geen nieuw onderdeel in `ui.tsx`.

#### Forge, van boven naar beneden

Bovenaan het trainingsscherm staat nu de regel van `legDayLine`. Die wordt de plek van het voorstel, zolang er nog geen werkset is afgevinkt.

1. Dezelfde feitregel als op Vandaag, in één zin: "Spierpijn gemeld en vanochtend een testloop. Beenindex 15."
2. De vraag: "De hele training lichter?" met dim eronder wat er dan verandert: "Minder gewicht, zeker 3 herhalingen over, een set minder per oefening. Oefeningen die je als extra had gemarkeerd vervallen."
3. Knoppen: `SecondaryButton` "Lichter" en `TextButton` "Liever niet".
4. Na "Lichter": de rijen in de tabellen zijn opnieuw berekend. Per oefening staat de bestaande redenregel eronder: "Lichter door spierpijn: zeker 3 herhalingen over." Bovenaan één regel met wat er veranderde: "Lichter gemaakt: 3 sets minder, 2 oefeningen lichter, Side plank vervalt." en `TextButton` "Terugzetten".
5. Zodra je een werkset van een beenoefening hebt afgevinkt, gaat het hele-training-voorstel weg. Daarna neemt de bestaande "Lichter" per oefening (`forgeAdjust`) het over, die toch al reageert op wat je echt deed.

"Terugzetten" kan zolang er nog geen werkset is afgevinkt. Afgevinkte rijen blijven altijd staan, zoals bij `stillOpen`.

### Wat "Lichter" doet

Een nieuwe pure functie `easeSlots(slots, how)` maakt van de voorschriften van de training (de MacroFactor-sets die al in `ExercisePrescription` staan) een lichtere versie. Daarna rekent `planExercise` gewoon zoals altijd, dus de gewichten komen uit hetzelfde krachtmodel en blijven op gewichten die het toestel heeft.

- Meer reserve. Elke werkset krijgt minstens 3 herhalingen in reserve (voor `ExercisePrescription` en per `SetTarget.rir`). Een set tot falen ("9+") wordt een gewone set. Het gewicht volgt daaruit: de zwaarste waarde waarbij de verwachte herhalingen de onderkant van het bereik nog halen, precies zoals `programWeights` nu al doet voor sets met een eigen RIR.
- Minder sets. Van elke oefening met drie of meer sets vervalt de laatste. Een oefening met prioriteit `optional` vervalt. `core` blijft altijd staan.
- Alleen oefeningen die de benen belasten (`Exercise.loadsLegs`). Bovenlichaam en romp blijven zoals voorgeschreven.
- Niet in stap 2: minder excentrische oefeningen. Daar is geen veld voor (een oefening heeft geen "excentrisch zwaar" kenmerk), en een lijst van id's raden we liever niet. Dit is een vraag voor later, zie de open vragen.

De standaard heet "standaard" en is instelbaar (zie hieronder).

### Wat er bewaard wordt

- De training zelf verandert nooit. `SessionTemplate` en `PlannedSession` blijven zoals ze zijn. Lichter bestaat alleen in het scherm van Forge en in het log dat daaruit komt, net als elke andere aanpassing in een training. Een gelogde training wordt nooit aangepast.
- Een kleine lijst `AppSettings.legEaseDays`: per datum en `plannedSessionId` wat je koos (`'lichter'` of `'liever-niet'`), de redenen (`'spierpijn' | 'flink' | 'harde-loop' | 'index'`), de beenindex op dat moment en het tijdstip. Maximaal de laatste 60, optioneel en defensief gelezen, `storage/migrations.ts#migrateLegEaseDays` laat een beschadigde waarde weg, op een andere telefoon samengevoegd per datum en sessie bij een back-up terugzetten. Het schemanummer van de back-up verandert niet (alleen optionele velden).
- "Terugzetten" haalt de keuze weg uit de lijst. Daarvoor gaat er niets mee naar een log.
- Het log van een lichtere training is een gewoon log. Of de benen moe waren, vult `legsTiredAt` bij het loggen in (dankzij stap 1 ook bij gemelde spierpijn), en die vlag zorgt dat Forge uit zo'n training geen lagere kracht leert. De "raak"-toets (`prescriptionCheck`) kent die vlag niet; Sherpa controleert dat een training met `legsTired` en een gekozen "Lichter" niet als misser voor MacroFactor of ASCEND telt. Als dat nu wel zo is, wordt dat een kleine toevoeging, geen nieuwe regel.
- Een planning-wijziging (verplaatsen) gaat zoals altijd: voorstel, Akkoord, `planChangeLog`, ongedaan maken.

### Wat dit voor MacroFactor betekent

MacroFactor blijft leidend voor kracht. Het schrijft de training voor en blijft dat doen; ASCEND slaat nooit iets terug naar MacroFactor en verandert het programma niet. "Lichter" is een voorstel in Forge voor jouw uitvoering van die dag. De tekst voor wie in MacroFactor traint staat daarom ook op de kaart: "Doe je de training in MacroFactor? Kies daar zelf een lichtere set met zeker 3 herhalingen over." Een log dat uit MacroFactor binnenkomt blijft zoals het binnenkomt, zonder markering dat het lichter was. ASCEND zegt nergens dat MacroFactor het mis had; de regel is: de zwaarte van vandaag is jouw keuze, het programma blijft staan.

### Instelling

Elke keuze die de app hier maakt is instelbaar, met het advies als standaard.

- "Lichter bij vermoeide benen" (id `lichterbenen`, groep Vandaag en meldingen, naast "Hoe voelt je lijf?"). Waarde in `AppSettings.legEase`: `voorstel` (advies, de kaart met knoppen), `regel` (alleen de feitregel, geen knoppen en niets te kiezen), `uit` (niets). Hulp (`settingsHelp`): één zin, "Na spierpijn of een zware loop stelt ASCEND een lichtere beendag of een dag later voor. Je kiest zelf, en je planning verandert nooit zonder jouw akkoord." met punten over wat Lichter is en dat MacroFactor leidend blijft.
- "Hoe licht" (id `lichterbenen-hoe`, een keuze in een onderblad, `AppSettings.legEaseHow`): `standaard` (3 herhalingen over, een set minder), `alleen-gewicht` (3 herhalingen over, alle sets), `extra` (4 herhalingen over, een set minder). Zichtbaar waarde in de rij: "Standaard", "Alleen gewicht", "Extra licht".
- Bestanden: `engine/legEaseSettings.ts` met de resolvers (defensief, zoals `bodyCheckSettings.ts`), `data/settingsIndex.ts` (titel, notitie, zoekwoorden spierpijn, benen, vermoeid, lichter, beendag), `data/settingsLayout.ts` (in de lijst van Vandaag en meldingen), `data/settingsChoices.ts` (de opties met `advice`), `data/settingsHelp.ts`, `engine/settingsDiff.ts` (de rij in het overzicht), `engine/settingsSummary.ts` (waarde en regel, met tests in `settingsSummary.test.ts`), de groepspagina `components/settings/groups/VandaagGroup.tsx`, en `storage/database.ts` en `storage/backup.ts` voor het veld en de lijst. Kijk ook of `engine/settingsProfiles.ts` een profiel heeft waar dit bij hoort (een rustig profiel mag `regel` kiezen).

### Lege, laad- en foutstand

- Leeg: geen reden, geen kaart, geen regel in Forge. De kaart neemt dan geen ruimte in. Dat is bijna elke dag.
- Laden: de uitkomst komt uit data die al in `AppDataContext` zit, dus er is geen eigen laadtoestand. Zolang de data nog niet klaar is, staat de kaart er niet; hij verschijnt zonder dat de missiekaart verspringt, omdat hij eronder staat.
- Fout in de berekening of een sjabloon dat ontbreekt: de kaart zwijgt en de rest van Vandaag werkt. Een kaart die niets kan zeggen, zegt niets.
- Opslaan van "Lichter" of "Liever niet" mislukt: "Opslaan lukte niet. Probeer het nog eens." met `TextButton` "Opnieuw". Een tikgrens in tijd en zichtbare uitkomst zoals elke knop die wacht.
- Je bent intussen al begonnen: "Je bent al begonnen. Lichter kan nu per oefening." met `TextButton` "Begrepen".
- Zonder gym- of gewichtgegevens voor een oefening (geen model): de regel "Zeker 3 herhalingen over" staat er nog, maar het gewicht blijft zoals voorgeschreven. De knop zegt dan niet dat het gewicht omlaag gaat.

### Wat dit bewust niet doet

- Het verandert nooit stil iets aan de planning. Verplaatsen is een voorstel met Akkoord via de bestaande planningsronde, en het raakt geen gelogde training, geen training die je zelf vastzette zonder voorstel, en geen test of wedstrijd.
- Het blokkeert niets. Spierpijn blokkeert nooit de extra loop, het overslaan van een rustweek of je ambitie (onderzoek). Wie "Liever niet" kiest, krijgt die dag niet nog eens dezelfde vraag.
- Het zegt niets over pijn op een plek, blessures of rode vlaggen. Dat blijft bij Lichaam en de pijnrem.
- Het schrijft geen nieuwe drempels voor de planner: stap 1 en 2 raken `freshnessAt` niet.
- Het zegt niet dat het veilig is. Gezondheid is "kan helpen". "Doortrainen mag" staat in het onderzoek als expertopinie en blijft zo gesteld.
- Geen nieuw getal of percentage naast de bestaande. Het enige getal is de beenindex, mét uitleg.

### Engine-functies en tests

Nieuw bestand `engine/legDayEase.ts`, puur (geen React, geen IndexedDB):

- `soreFromNotes(notes, checkIns, date)` geeft `'spierpijn' | 'flink' | undefined`, met "het laatste antwoord wint". Tests: ochtendcheck Fris na een melding van gisteren geeft niets; een melding van twee dagen terug geeft niets; een melding op een niet-beenplek geeft niets; stijf en pijn tellen niet.
- `earlierTodayPoints(date, logs, templates, bodyKg, hoursApart = 6)`. Tests: een testloop van 25 minuten op RPE 9 geeft meer dan 8 en minder dan 12 punten; een rustige loop van vandaag geeft 0 (RPE onder 7); een training van gisteren telt hier niet; meer uren ertussen geeft minder punten; spierschade blijft gelijk.
- `legDaySignals(date, deps)` geeft redenen, index, band en de eerste training die er last van heeft. Tests rond de grens 12 (11,9 geen, 12,1 wel), de reden "spierpijn" met een lage index, en "geen training vandaag" geeft niets.
- `shouldOfferEase(signals, session, template, mode, decisions)` geeft of er een voorstel komt. Tests: gelogd geeft nee; `liever-niet` van vandaag geeft nee; een test of wedstrijd geeft nee; een kwaliteitsloop geeft alleen verplaatsen; mode `regel` geeft geen knoppen.
- `easeSlots(slots, how)`. Tests: een set tot falen wordt een gewone set; een oefening met drie sets krijgt er twee; `optional` vervalt; `core` blijft; bovenlichaamoefeningen blijven ongewijzigd; `how: 'alleen-gewicht'` laat het aantal sets staan; een oefening met twee sets houdt er twee; MacroFactor-sets met eigen RIR hoger dan 3 houden die RIR.
- `easeText(...)` bouwt de teksten hierboven. Tests: geen gedachtestreepjes, elke zin met een getal heeft de uitleg erbij, de vaste woorden.

Aanpassingen in bestaande bestanden, met tests:

- `engine/legFatigue.ts`: geen wijziging van `legFatigueOn`. Een test blijft dat een training van dezelfde dag er niet in telt, zodat de planner onveranderd blijft.
- `components/LegFatigueCard.tsx#useLegFatigueInputs`: spierpijnmeldingen op beenplekken meenemen.
- `engine/strengthHistory.ts#legsTiredAt`: nieuwe invoer voor gemelde spierpijn. Tests: een training op een dag met spierpijn krijgt `legsTired`.
- `engine/forgeWorkout.ts`: `legDayLine` met de extra reden, `PlanContext` met `ease`, en `planWorkout` past `easeSlots` toe als de keuze `lichter` is. Een test dat zonder keuze niets verandert (de bestaande tests blijven groen).
- `engine/adviceEngine.ts`: MORNING-CHECK leest ook de spierpijnmelding en krijgt het veld voor "Lichter"; nieuw advies `LEG-EASE`. Tests: een advies met een goede latere dag heeft twee uitwegen (Lichter en Naar ...); zonder latere dag alleen Lichter; een gelogde of overgeslagen training krijgt geen advies; een training die je zelf vastzette (`lock`) wordt niet automatisch verplaatst, alleen voorgesteld.
- `storage/migrations.ts#migrateLegEaseDays` en een backup-test (heen en terug, beschadigd veld, samenvoegen per datum en sessie).

## Deel 2: vooraf, voor een harde loop of afdalen en een zware beendag

### Het antwoord op de vraag

Beide, in volgorde, omdat ze een ander probleem oplossen.

- Een vraag of regel bij het verplaatsen (stap 3) is voor wat jij zelf doet. Zet je Benen A op een dag waarop de index al hoog is, dan hoort dat een stille regel te zijn die het getal noemt, zonder te blokkeren. Dit verandert geen plan en dus ook geen bevroren planning. Hier doet de eigenaar het zelf, en eigen verplaatsingen krijgen een slot dat de automatische planning niet aanraakt.
- Een regel in de weekcontrole (stap 4) is voor wat het systeem zelf plant. Zonder die regel plant het systeem een zware beendag op een dag waarvan het weet dat de index te hoog is (TEST-FRESH doet dat al voor een test, niet voor een beendag). Het is het eerlijke antwoord op "vandaag stond een testloop en Benen A op één dag", maar het verandert de planning en dus de snapshots van `planGolden.test.ts`.

### De tekortkoming in de 48-uursregel

LEG-SPACING kent "zware beendag" als `lowerBodyLoad: 'heavy'`. Een testloop, een tempoloop en intervallen zijn gemiddeld, dus ze tellen niet, ook niet op RPE 9. Een tweede gat is dat de index een sessie van dezelfde dag overslaat, en dat een harde loop gevolgd door Benen A de volgende dag als "loop eerst" geldt en dus toegestaan is (terecht volgens het onderzoek, tenzij de loop heel hard was of de benen toch al zwaar zijn). Ik stel daarom niet voor LEG-SPACING uit te breiden met meer sessies, want dat maakt de regel groffer en de planning krapper. De index is al de maat die de som van alles weegt; de nieuwe regel gebruikt die.

### Stap 3: een stille regel bij het verplaatsen

Waar: het verplaatsblad (`RescheduleDialog`) en de data in het voorstelblad van `moveOptions`. Bij een gekozen dag voor een zware beendag of kwaliteitstraining toont het blad, onder de datum, één regel in dim inkt, alleen als de index op die dag hoger is dan 12:

"Op vrijdag is je beenindex ongeveer 15. Dat is vermoeid. Je kunt hem zo plannen, of een dag later."

Met de uitleg erachter: "Beenindex: wat je benen dan nog dragen van eerdere trainingen. Tot 12 kan een zware dag." De regel blokkeert niets en heeft geen knop. De berekening is `freshnessAt` plus `earlierTodayPoints` voor wat dezelfde dag eerder gepland staat (zonder tijd: 6 uur). Alleen een regel tonen als het verschil niet binnen de onzekerheid valt: tussen 10 en 14 zegt de regel "ongeveer 12 tot 14, op de grens", daarboven zonder voorbehoud.

Geen instelling nodig; het is een lezing, geen keuze die de app voor je maakt. Wel schakelt de instelling `lichterbenen` op `uit` de regel ook uit, zodat één schakelaar alles stil krijgt.

### Stap 4: de weekregel LEG-FRESH

Pas bouwen nadat stap 1 tot 3 een paar weken zijn gebruikt, en met een eigen besluit.

- Regel `LEG-FRESH` in `engine/weekValidator.ts`, na TEST-FRESH en voor LEG-SPACING in `RULE_ORDER`. Voor elke geplande zware beendag (`strength` en `isLegHeavyTemplate`) in de toekomst: de index op die dag volgens `freshnessAt` plus `earlierTodayPoints` voor wat dezelfde dag eerder staat. Een bevinding bij een index hoger dan 14, dus 12 plus de onzekerheid van 2 punten (`FATIGUE_BAND`). De planner en de kaart verschillen tot ongeveer 2 punten (onderzoek), dus alleen een duidelijk te hoge index telt. Het onderzoek zegt dat een index boven ongeveer 11 stevig "niet fris" is, dus 14 is voorzichtig.
- Bericht (letterlijk, naar het voorbeeld van TEST-FRESH): "Benen A op vrijdag: beenindex 15, grens 12." En in de uitleg (`RULE_LABEL` rond regel 566): "frisse benen voor een zware beendag".
- Herstel: alleen de eigen sessies van het systeem, niet wat je vastzette, niets gelogds of in het verleden, geen test of wedstrijd. Eerst de eerstvolgende dag in dezelfde week waarop de index 12 of lager is en LEG-SPACING heel blijft, anders de korte versie (`durationVariants.short`), zoals TEST-FRESH nu doet. Zoals elke planningsronde eindigt het met "Planning bijgewerkt" en ongedaan maken, en alleen als de week aantoonbaar beter wordt.
- Instelling: "Frisse benen voor een beendag" (id `frissebenen`, groep Planning, `AppSettings.legFresh`): `plannen` (advies, de weekcontrole herstelt eigen sessies), `melden` (alleen de stille regel bij het verplaatsen en een bevinding in Week, geen wijziging), `uit`. Standaard `plannen` omdat het advies de planning eerlijk houdt; zie de open vragen, want dit verandert de snapshots.
- Tests: nieuwe gevallen in de weekvalidator voor een index van 13,9 (geen bevinding), 14,1 (wel), een vastgezette beendag (geen verplaatsing), een korte versie als er geen dag is, en `planGolden.test.ts`. Dat laatste verandert vermoedelijk; de commit moet de reden noemen (zie `CLAUDE.md`, "a change to the planning only updates its snapshot with the reason in the commit").

## Bouwvolgorde in één ronde

1. Stap 1 (lezen): spierpijnmeldingen in de index, `legsTiredAt`, `earlierTodayPoints`, `legDayLine`. Weinig risico, direct nuttig.
2. Stap 2 (voorstel op Vandaag en in Forge) met de twee instellingen, `easeSlots` en `LEG-EASE`.
3. Stap 3 (stille regel bij verplaatsen), omdat het dezelfde functies gebruikt en geen planning raakt.
4. Stap 4 (LEG-FRESH) in een tweede ronde, met een eigen besluit in `docs/beslissingen/`.

Een besluit voor stap 1 tot 3 komt in `docs/beslissingen/JJJJ-MM-DD-spierpijn-en-zware-beendag.md`, en de drempels (12, 14, 6 uur, 3 herhalingen in reserve, 60 bewaarde keuzes) staan als constanten bovenaan `engine/legDayEase.ts`, afgeleid en niet gemeten, net als bij `engine/bodyCheck.ts`.

## Samenvatting

- Op de dag zelf kijkt ASCEND voortaan ook naar gemelde spierpijn (ook uit "Hoe voelt je lijf?"), naar een harde loop eerder die dag en naar de beenindex, en doet bij een reden één voorstel: "Lichter" (dezelfde training, minder gewicht, zeker 3 herhalingen over, een set minder) of "Naar vrijdag" via de bestaande planningsronde met Akkoord, altijd met "Liever niet". Niets verandert stil en een gelogde training blijft zoals ze is.
- MacroFactor blijft leidend: het schrijft voor, ASCEND stelt alleen een lichtere uitvoering voor en zegt er bij wat je in MacroFactor zelf kunt kiezen.
- Vooraf: eerst een stille regel bij het verplaatsen, later een weekregel LEG-FRESH voor wat het systeem zelf plant. De weekregel raakt de bevroren jaarplanning en heeft een eigen instelling.
- Kleinste eerste stap: ASCEND leest wat het al weet (spierpijnmelding, testloop van vanochtend) in Forge en op de kaart Benen. Zonder nieuw scherm.

## Open vragen voor de eigenaar

1. Staat "Zware dingen op één dag" bij jou aan? Vandaag stond een testloop en Benen A op één dag, en de weekcontrole (TEST-DAY) meldt dat als je die instelling uit hebt. Als je het zo bewust gepland hebt, moet het voorstel dan stiller zijn, of blijft het zoals hier staat (ook dan een voorstel, nooit een verplichting)?
2. Is "zeker 3 herhalingen over en een set minder per oefening" de lichtere versie die je zelf zou doen? Of liever een vast percentage lichter in kilo's? Het advies hier volgt het krachtmodel en het onderzoek (reserve), niet een percentage.
3. Moet "minder excentrisch" (bijvoorbeeld step-downs of RDL vervangen door een oefening met minder remmen) er in een volgende stap bij? Dan heeft elke oefening een kenmerk nodig, wat extra onderhoud vraagt. Voorlopig staat het er niet in.
4. Train je beendagen in Forge of in MacroFactor zelf? In het tweede geval is vooral de tekst op Vandaag belangrijk en is de Forge-kant minder waard.
5. Mag de weekregel LEG-FRESH (stap 4) met `plannen` als advies, ook al verandert dat de bevroren planning van een jaar (zeker een aantal beendagen schuift), of liever eerst alleen `melden`?
6. Telt een melding van spierpijn in "Hoe voelt je lijf?" voor jou even zwaar als "Spierpijn" in de ochtendcheck? Hier wel, en alleen van vandaag of gisteren.
7. Is 6 uur de goede aanname tussen een loop in de ochtend en Benen A als de tijd niet bekend is? Een eigen tijd per training is mogelijk als de sessie een starttijd heeft.
