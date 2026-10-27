# Zonder doel

Ontwerp voor de ronde "zonder doel goed": een richting kiezen, een weekbudget in minuten, golven van vier weken en een terugblik. Cartographer, 27 oktober 2026. Een voorstel, geen besluit. Er is niets in `src` gewijzigd.

Bronnen: `docs/onderzoek/ASCEND voor iedereen.md` (deel 3, 4 en 6), `docs/onderzoek/Doelsoorten berg en buiten.md` (Fit blijven en Sterker worden), `docs/visie/Kracht en berg in één plan.md`, `docs/visie/Ascend-tab als doelen.md`, `docs/beslissingen/2026-10-26-kracht-en-berg-voor-iedereen.md` en `2026-10-26-doelsoorten-als-gegevens.md`, plus de code van `engine/firstPlan.ts`, `engine/weekShape.ts`, `data/templateRoles.ts`, `data/goalKinds.ts` en `pages/Ascend.tsx`.

## 1. In het kort

1. Zonder doel kies je een richting: Fit blijven, Fitter worden, Sterker worden, Rustig aan, of Naar een doel. De eerste vier kennen geen datum. Naar een doel is wat er al is.
2. Elke richting heeft een weekbudget in minuten en een aantal keer kracht, volgens de beweegrichtlijn (150 minuten, 2 keer kracht) of eronder of erboven, met de reden erbij.
3. Zonder doel loopt de planning in golven van vier weken: drie weken opbouwen, een lichte week. Er komt geen bergtocht, rugzakladder of GR5-fase meer in een plan zonder tochtdoel.
4. Op de Ascend-tab staat dan geen lege kaart meer, maar "Je richting" en "Je week": hoeveel minuten en hoeveel keer kracht je deze week al haalde.
5. Na elke golf een terugblik met drie keuzes: nog een golf, rustiger aan, of een doel kiezen.
6. Alles wat de planning verandert, komt als voorstel met Akkoord. Wie nu een GR5-doel heeft, ziet niets veranderen.
7. De bouwvolgorde begint met een test die vastlegt wat een plan zonder doel nu doet, want dat is in het onderzoek alleen uit de code gelezen.

## 2. Wat de gebruiker ziet en kiest

### 2.1 De startvragen

De eerste vraag van `StartWelcome` ("Wat wil je?", nu drie tegels in `GOAL_OPTIONS`) krijgt vijf keuzes in vaste volgorde, elk met één zin:

- Fit blijven: "Een vaste week die je kunt volhouden. Geen opbouw, geen eindpunt."
- Fitter worden: "Elke vier weken een stapje meer, en dan een lichtere week."
- Sterker worden: "Kracht staat voorop, duur loopt rustig mee."
- Rustig aan: "Kort en zacht. Liever iets dan niets."
- Een tocht of wedstrijd: "Met een datum. Dan reken ik terug vanaf die dag." Dit opent de bestaande keuze tussen meerdaagse tocht en hardloopwedstrijd.

De stappen daarna zijn die van nu (`startSteps`): datum alleen bij een tocht of wedstrijd, dan dagen, welke dagen en kracht. Verschil per richting:

- Sterker worden zet de krachtvraag niet uit: kracht is hier de bedoeling. De vraag wordt "Hoeveel keer kracht?" met 2, 3 of 4 en 3 als advies.
- Rustig aan stelt 3 dagen voor, korte trainingen, en slaat de vraag over harde training over.
- Elke richting krijgt één beginnersvraag, alleen als de geschiedenis het niet beantwoordt: "Ben je de laatste tijd weinig aan het sporten geweest?" Ja geeft de beginnersstart (2.7).
- Het advies voor dagen (`adviceDays`) wordt: Fit blijven 3, Fitter worden 4, Sterker worden 4, Rustig aan 3. De reden staat erbij in één zin, zoals nu.

De uitkomst is zoals nu een voorstel met Akkoord ("Zo ziet je eerste week eruit"). Het regelblok in het voorstel krijgt twee regels erbij: "Richting: Fitter worden." en "Je week: 135 minuten en 2 keer kracht. Dat is 10% meer dan wat je de laatste vier weken deed."

Eerlijk over de grens van de vorm van de week: `weekShape` kent nu zes vaste trainingen (drie loop, drie kracht). Fietsen of zwemmen als vast onderdeel van dit ritme komt pas met de sportenronde (zie `Sporten die meetellen.md`). In dit ontwerp bestaat een plan zonder doel dus uit kracht, rustig lopen, een langere duurtraining, de heuvelloop als harde prikkel en de herstelwandeling. De tekst in het voorstel zegt dat niet technisch: "Je week bestaat uit kracht en lopen. Andere sporten die je doet tellen straks gewoon mee."

### 2.2 De Ascend-tab zonder doel

Nu staat er bij geen doel een kaart "Hier staat nog niets. Zeg maar: wat wil je bereiken?" met de gevulde mint knop. Dat blijft voor wie geen richting heeft gekozen en geen programma heeft (de lege installatie, `needsFirstPlan`: Vandaag toont dan `StartWelcome`). Voor iedereen die wel een plan heeft maar geen doel, wordt het:

Van boven naar beneden:

1. `SkyBand` (zoals nu). Rechts naast het tandwiel het plusje "Doel toevoegen" (`AscentTabPlusButton`), nu ook zonder doel. `Eyebrow` "Ascend", titel "Waar je naartoe werkt" (zoals nu), regel eronder: "Geen doel, wel een richting: fitter worden."
2. Eerste kaart op de lucht, de kaart Je week (`Card`, vanzelf licht): `Eyebrow` "Je week", een `Ring` met de minuten en de tekst "135 van 150 minuten", daaronder "Matige minuten tellen 1, pittige tellen 2. 150 is de beweegrichtlijn." Op de tweede regel de krachtteller: "Kracht: 2 van 2 keer" met de uitleg "Een volledige krachttraining telt als één keer." Op de derde regel de plaats in de golf: "Week 2 van 4. Deze week bouw je op." De ring is het ene mint accent van het scherm. Een tik opent het blad Je week (2.4).
3. Kaart Je richting (`Card`, marine): `Eyebrow` "Je richting", de naam in Marcellus ("Fitter worden"), één zin ("Elke vier weken een stapje meer, en dan een lichtere week.") en een `TextButton` "Richting wijzigen" die het richtingblad opent (2.3).
4. Alleen als een golf net klaar is: de terugblikkaart (2.5), boven Je richting.
5. `SecondaryButton` "Doel toevoegen". Er is dus geen gevulde mint knop, want de ring is het accent.
6. Rijen "Tochten" en "Krachtblok" en "Eerdere doelen", zoals nu.

De seizoenstrook en de doelenlijst ontbreken, want er is niets om op te tonen. Het getal in de ring is Inter met vaste cijferbreedte. Elk getal heeft zijn korte uitleg erbij, zoals hierboven.

Heeft iemand wel een doel (ook een tussendoel), dan staat er geen Je week op de tab. Er blijft één voortgangstaal: "Klaar voor je doel" (zie de bestaande regel in CLAUDE.md en het besluit van 26 oktober). Je week met 150 minuten bestaat dan alleen op Je stand, zie 2.8.

### 2.3 Het richtingblad

Een `Sheet` via `useSheetClose`. `Eyebrow` "Je richting", titel "Wat past nu bij jou?". Vijf rijen onder elkaar (keuzes, geen uitklapblokjes), de gekozen met een mint vinkje. Per rij de naam en één zin, plus een regel met wat het in je week doet:

- Fit blijven: "Een vaste week. 150 minuten en 2 keer kracht." Regel: "Elke vierde week stel ik een lichtere voor."
- Fitter worden: "Elke vier weken een stapje meer. Je begint bij wat je nu doet, hoogstens 10% erbij per week." Regel: "Drie weken opbouwen, dan een lichte week."
- Sterker worden: "Kracht 3 keer per week, duur op onderhoud. 120 minuten rustige duur." Regel: "Voor zware beenkracht en een lange training houd ik 48 uur rust."
- Rustig aan: "90 minuten en 1 keer kracht. Minder dan de richtlijn, en dat is een keuze." Regel: "Elke week hetzelfde, nooit een harde training."
- Naar een doel: "Kies een tocht of wedstrijd." De rij opent het bestaande toevoegblad (`GoalFormSheet`); de richting wordt dan vanzelf "Naar een doel".

Onderaan, als er al een plan is: de knop `PrimaryButton` "Bekijk wat er verandert" (de enige gevulde mint knop in het blad). Die opent het bestaande `ProposalSheet` met de preview van de planning (zelfde pass als bij elk voorstel). Akkoord bewaart richting en plan, "Liever niet" laat alles zoals het was met de zin "Prima, alles blijft zoals het was."

Staat er al een doel van de soort Fit blijven of Sterker worden (die bestaan in `data/goalKinds.ts`), dan is dat doel zelf de richting. Het blad toont dan die ene keuze en zegt: "Je hebt een doel met deze richting. Pas het daar aan." Zie vraag 1.

### 2.4 Het blad Je week

Een `Sheet`. `Eyebrow` "Je week", titel "Zo staat je week ervoor". Van boven naar beneden:

1. De ring, groter, met de zin: "135 van 150 minuten. Je haalde 4 dagen van je week al."
2. Een rij per telbare training deze week met pictogram, naam, datum en de minuten die telden ("Rustige loop, 40 minuten, telt 40" en "Heuvelloop, 30 minuten pittig, telt 60"). Zo is het getal na te rekenen.
3. Kracht: "2 van 2 keer", met de trainingen die telden.
4. "Wat telt mee": één zin. "Matige minuten tellen 1. Pittige minuten tellen 2. Krachttraining telt apart, als keer." De pittige minuten komen uit je hartslag als die er is, anders uit hoe zwaar de training bedoeld was.
5. "Deze golf": "Week 2 van 4. Je budget is deze week 135 minuten, 10% meer dan vorige week. In week 4 loop je het rustiger." Een kleine reeks van vier balkjes met de minuten per week (ijsblauw alleen voor de huidige week, de rest marine met mint voor wat gehaald is).
6. `TextButton` "Weekbudget aanpassen" naar de rij in Instellingen.

De ring is nooit rood. Ligt de week achter, dan staat er een rustige regel: "Nog 45 minuten te gaan. Donderdag staat er een loop van 40." Lukt het volgens de planning niet meer (te weinig dagen), dan zegt de regel dat eerlijk: "Met wat er nog staat kom je op 130. Een extra wandeling van 20 minuten brengt je op 150." Een voorstel doet de app daarvoor niet; de wandeling is jouw keuze.

### 2.5 De terugblik na een golf

Een kaart op de Ascend-tab (niet op Vandaag, want Vandaag antwoordt op de missie van vandaag), vanaf maandag na de vierde week, verdwijnt na een keuze of na tien dagen:

`Eyebrow` "Golf klaar". Titel in Marcellus: een oordeel ("Goede golf" of "Een rustige golf" of "Een zware golf"). Eronder twee feiten met uitleg: "3 van 4 weken haalde je je minuten. Dat is volhouden: 75%." en "Gemiddeld 138 minuten per week, 5% meer dan de golf ervoor." Dan de vraag: "Wat nu?" met drie knoppen:

- "Nog een golf" (`SecondaryButton`): zelfde of iets hoger niveau. Haalde je minstens 3 van de 4 weken (de grens uit de instellingen), dan stapt het niveau op; anders blijft het gelijk met de zin "Dezelfde golf nog eens is geen falen."
- "Rustiger aan": de richting wordt Fit blijven, op het niveau van je laatste golf.
- "Een doel kiezen": opent het toevoegblad.

Elke keuze die de planning verandert opent het voorstel met Akkoord, met als eyebrow "Na je golf". Heb je "Terugblik na een golf" uitgezet, dan rolt de golf door op hetzelfde niveau en komt er geen kaart.

### 2.6 Lege, laad- en foutstand

- Leeg: geen richting en geen programma: de bestaande lege staat met "Doel toevoegen" als enige gevulde knop. Geen richting maar wel een programma (bestaande gebruiker): Je week toont het advies Fit blijven als alleen-lezen kaart met `TextButton` "Kies je richting" (zie migratie). Geen telbare training deze week: de ring staat op 0, de regel zegt "Deze week nog niets. Je eerste training staat op dinsdag."
- Laden: de kaart toont de ring leeg (`--color-track`) met een rustige lijn "Je week wordt berekend." Geen spinner. De opslag is lokaal; een berekening duurt milliseconden, dus dit is er vooral voor de eerste render. De berekening wacht niet op de sync (zoals bij openen).
- Fout: lukt het lezen van de logs niet, dan staat er "Je week kon niet worden uitgerekend. Je trainingen zijn niet kwijt." met `TextButton` "Opnieuw proberen". Het voorstel in het richtingblad heeft de bestaande foutstand van `ProposalSheet` (de knop wacht met een grens in tijd en een zichtbare uitkomst).
- Past het budget niet in je dagen: "Met 3 dagen en hoogstens 45 minuten per dag komt je week op 135. Een dag erbij of een langere training brengt je op 150." Dit staat in het voorstel en op de kaart, nooit stil.

### 2.7 De beginnersstart

Wie de laatste acht weken gemiddeld minder dan twee keer per week sportte, of het zelf zegt, krijgt: hoogstens 4 dagen, de eerste twee weken alleen rustige trainingen en de eerste harde training pas na vier weken. Het voorstel zegt het in een zin: "Je begint rustig: de eerste twee weken alleen makkelijk, de eerste pittige training pas na vier weken. Zo wen je lichaam eerst aan het ritme." De beginnersstart staat in de instelling (4) en loopt vanzelf af.

### 2.8 Je stand

Je stand leest dezelfde functie als de Ascend-kaart. Met een doel blijft Je stand zoals nu (één voortgangstaal). Zonder doel staat de kaart "Je week" met de ring en de twee tellers bovenaan, boven de bestaande weekbelasting per soort. De vier weekbalkjes staan hier ook, zodat je je golf terugziet.

### 2.9 Wat dit bewust niet doet

- Geen tweede percentage. Zonder doel is "Je week" het enige getal; met een doel verdwijnt het.
- Geen reeks of streak, geen beloning, geen rood als je een week mist.
- Geen gevulde mint knop naast de ring.
- Geen budget bij een doel. Een doel houdt zijn eigen ondergrenzen.
- Geen uitklapblokjes: het richtingblad, Je week en de terugblik zijn blad of kaart.
- Geen automatisch voorstel dat je richting of golf wijzigt zonder dat jij het opent.
- Geen sporten behalve kracht en lopen in het weekritme. Dat is de ronde "Sporten die meetellen".
- Geen aanpassing van sets in Forge in een lichte week. Voor Sterker worden wordt alleen de duur lichter; Forge blijft zelf doseren (latere ronde).

## 3. Wat de engine moet doen

### 3.1 Hergebruikt

- `engine/mainGoal.ts#mainGoal`: bepaalt of er een doel is. Geen tweede zoekregel.
- `data/goalKinds.ts`: de doelsoorten `fit` en `stronger` bestaan al met meters (minuten per week, krachtdagen, volhouden). De richtingen Fit blijven en Sterker worden gebruiken dezelfde getallen, zodat een doel van die soort en een richting niet uiteenlopen.
- `engine/onCourse.ts#recentAdherence` (volhouden), `engine/intensityMinutes.ts` (echte minuten per zone), `engine/legFatigue.ts#PLANNED_RPE` (zwaarte voor een training zonder hartslag), `engine/planPass.ts`, `engine/weekValidator.ts`, `engine/candidatePlacement.ts`, `engine/substitutions.ts#resolveEffectiveFullDuration` (Ambitie grijpt daar al in), `engine/weekShape.ts#chooseWeekShape`, `storage/horizonPlan.ts` (`computeHorizonPlan`, `applyHorizonPlanNow`) en `planHorizonChange` met `settings` en `trigger`.
- `AppSettings.leavePeriods`, `availability.allowedDays`, tijd per dag, ziekte en `Ambitie`: ze werken op het budget zoals op elke training.

### 3.2 Nieuw

- `data/directions.ts`: de vier richtingen als gegevens, elk getal met een bewijslabel (sterk, matig, zwak, expert, afgeleid) en een bronverwijzing, zoals `goalKinds.ts`. Per richting: naam, zin, weekbudget (minuten, kracht), aandeel pittig, golflengte, wat er in een lichte week verandert, beginnersregels en wat de planning niet doet.
- `engine/direction.ts`: `activeDirection(settings, goals, milestones)`, afgeleid en nooit alleen opgeslagen: bestaat er een hoofddoel of een doel met een datum, dan "doel"; anders een doel van de soort fit of stronger; anders `AppSettings.direction`; anders ongekozen (zie migratie). Plus `directionSpec(direction, history)` voor de getallen.
- `engine/weekBudget.ts`: `countedMinutes(log)` (matig 1, pittig 2, pittig uit hartslagzones of, zonder hartslag, uit RPE 7 of hoger, anders uit de bedoelde zwaarte), `strengthCount(logs)`, `weekProgress(week, logs, plan, spec)` en `budgetFor(spec, history, waveWeek)`. Krachttrainingen tellen niet in de minuten maar in de krachtteller (advies; zie vraag 2). Pure functies met tests.
- `engine/waves.ts`: `waveWeek(directionStart, date)` (afgeleid uit de startdatum, nooit per week opgeslagen), `waveReview(logs, plan, wave)` met het oordeel, de feiten en de keuzes, en `nextWaveLevel`.
- `engine/programLayout.ts`: een tweede indeling `layoutWaves(startDate, today, weeks)` naast `layoutPhases`. Fasen zonder doel zijn neutraal ("Opbouw 1, 2, 3, Lichte week") en bevatten geen bergcapaciteit of expeditieklaar.
- `PATTERN_SWAPS` (de wissels naar bergtocht en wandeldag) en `engine/packLadder.ts` gelden alleen als `mainGoal` een tocht is. Zonder doel geen wissel, zonder tocht geen rugzakladder.
- `AppSettings.direction` ('maintain', 'improve', 'stronger', 'easy'), `directionStart` (een maandag), `weekBudget` (eigen waarden), `waveReview` (aan of uit), `beginnerStart` ('auto', 'ja', 'nee'). Defensief gelezen (`parseDirection`, zoals `parseWeekShape`).
- Een uitbreiding van `StartGoalKind` met 'improve', 'stronger' en 'easy' en van `chooseWeekShape` met `strengthSessions` (nu is het aantal krachttrainingen afgeleid uit het aantal dagen).
- Triggers 'direction_changed' en 'wave_review' voor `planHorizonChange`.

### 3.3 Hoe een richting de planning vormt

Het getal per richting (advies, met het label van het bewijs):

- Fit blijven: 150 tel-minuten, 2 keer kracht, hoogstens 20% pittig, een harde prikkel mag nul zijn, bij 4 dagen of meer een lange training. Geen opbouw. Elke vierde week een lichtere week als voorstel (sterk voor de 150 en de 2, expert voor de golf).
- Fitter worden: het budget begint bij je gemiddelde van de laatste vier weken (naar boven afgerond op 5, minimaal 120 zonder geschiedenis, nooit onder 100), loopt drie weken op met hoogstens 10% per week en één ding tegelijk, en gaat in de vierde week 35% omlaag bij dezelfde intensiteit (matig voor het laatste, expert voor de golf). Plafond 300 minuten: daarboven vraagt de richtlijn niets meer. Kracht 2, pittig hoogstens 20%.
- Sterker worden: kracht 3 (instelbaar 2 tot 4), duur 120 tel-minuten, pittig 0 tot 10%, zodat benen fris zijn voor de krachtdagen. Lichte week: duur 35% omlaag. De krachtdagen houden de 48-uursregel voor zware beenkracht en een lange duurtraining.
- Rustig aan: 90 minuten, 1 keer kracht, geen pittig, geen golf. Het label "onder de richtlijn" staat erbij, maar zonder waarschuwingskleur.

Verdeling over de week: eerst kracht (het aantal keer uit de richting), dan de lange training als er minstens 4 dagen zijn, dan de rustige duur, en pittig alleen als het aandeel boven 0 is en de week de limiet van harde dagen niet raakt. Plaatsen gebeurt door dezelfde `candidatePlacement` en `chooseWeekShape` als nu.

Minuten per training: de bestaande volledige duur van een sjabloon (via `progressionTarget` en `resolveEffectiveFullDuration`) maal één factor per week: budget van die week gedeeld door de som van de volledige duren van wat die week gepland staat (de kracht niet meegeteld), begrensd door de sessiepiek van 110% van je langste training van dezelfde soort in 30 dagen, door je tijd per dag en door ziekte. Past het niet, dan wint de grens en zegt de app het (2.6).

Intensiteit: het aandeel pittig bepaalt of de heuvelloop (de harde prikkel van het patroon) erin staat en in welke duur. Voor een beginner staat hij er de eerste vier weken niet.

### 3.4 Regels voor de weekcheck

Er komt zo weinig mogelijk bij; wat er is blijft gelden.

- Blijven zoals nu: `TWO-HARD-RUNS`, `LEG-SPACING` (48 uur tussen zware beendagen), `ONE-LONG`, `REST-DAY`, `DAY-FULL`, `LEAVE-*`.
- Nieuw: `NO-HARD-YET`. Zolang de beginnersstart loopt, repareert de weekcheck een harde training van het systeem zelf naar een rustige, en meldt het ("Planning bijgewerkt", met ongedaan maken). Een harde training die jij zelf vastzette (lock) blijft, met een noot.
- Geen nieuwe regel voor de lichte week: die zit in de factor van het budget, niet in een controle.
- Geen weekregel die een minimum aan minuten afdwingt. Het budget is een doel, geen grens (zonder doel is de richtlijn een waarschuwing, geen blokkade).
- Een goal-regel (`AFTER-GOAL`, `TEST-DAY`) speelt zonder doel niet. Een nieuw doel zet de gewone regels aan zoals nu.

### 3.5 Hoe het in de planning komt (voorstel met Akkoord)

Elke wijziging loopt door `planHorizonChange`: richting kiezen of wijzigen ('direction_changed'), de eerste week na de startvragen (`firstPlan`), en de keuze na een golf ('wave_review'). De preview draait dezelfde `planPass`, dus wat het voorstel toont is wat je krijgt. Akkoord slaat de instelling (`direction`, `directionStart`) en de planning samen op; ongedaan maken zet beide terug. Wat al gelogd of vastgezet is, verandert nooit. De dagelijkse stap van een golf (de volgende week met 10% erbij) is geen aparte beslissing: de golf is bij Akkoord als geheel voorgesteld, de weken zijn afgeleid van `directionStart`. De `syncProgramHorizon` rekent ze zoals nu bij de fasen.

Bij een nieuwe golf zonder verandering (niveau gelijk, geen terugblik gekozen) gebeurt er niets in de planning en dus geen voorstel.

Overstappen naar een doel: kiest iemand een tocht of wedstrijd, dan gaat de gewone doelflow (`GoalFormSheet` en voorstel) lopen. De weken tot de datum worden teruggeteld; de weken ervoor die hij algemeen trainde tellen als basis. De richting wordt vanzelf "Naar een doel" (afgeleid). Verdwijnt het doel (archiveren), dan valt de richting terug op wat in `AppSettings.direction` stond, als voorstel.

## 4. Instellingen

Groep "Doel en tochten", zonder doel zichtbaar via `SHOW_WHEN` (met een doel verborgen, met de reden "Zichtbaar zodra je geen doel hebt"). Vier rijen, elk in `settingsIndex.ts`, `settingsLayout.ts`, `engine/settingsSummary.ts` (de waarde in de rij) en een groepspagina in `components/settings/groups/`, met uitleg achter de InfoButton in `data/settingsHelp.ts`:

- Richting. Waarde: "Fitter worden". Blad: de vijf keuzes uit 2.3. Advies: wat de startvragen gaven; zonder keuze Fit blijven.
- Weekbudget. Waarde: "150 min, 2× kracht". Blad: minuten per week (stappen van 15), keer kracht (1 tot 4), en de schakelaar "Pittige minuten tellen dubbel" (aan). Onder het advies de regel "Onder de richtlijn" als je lager kiest. Terug naar advies per regel, via de bestaande "Anders dan het advies".
- Golven. Waarde: "4 weken, met terugblik". Blad: lengte (3, 4, 6 weken, advies 4), "Lichte week voorstellen" (aan), "Terugblik na een golf" (aan), "Zo veel weken halen voor een stap omhoog" (3 van 4).
- Beginnersstart. Waarde: "Auto". Blad: Auto, Ja, Nee, met de regels uit 2.7.

Het getal van 12 rijen per groep en 6 onder Geavanceerd (test uit ronde 1) blijft gehaald omdat Golven en Beginnersstart in een blad zitten. De schakelaar "Je week tonen" hoort niet in Instellingen: de kaart is er zodra er een richting is.

Profiel "Kaarten op Vandaag" bestaat al (ronde 1, `engine/settingsProfiles.ts`). Zonder doel komt er geen nieuwe kaart op Vandaag, dus er verandert niets aan dat profiel.

## 5. Migratie

Principe: een ontbrekende `direction` betekent "nog niet gekozen" en laat het gedrag van nu volledig staan.

- Gebruiker met een doel (de GR5, een hardloopdoel, een tocht): `activeDirection` geeft "doel". Niets in zijn planning, Ascend-tab, Je stand of instellingen verandert. De vier nieuwe rijen blijven verborgen (SHOW_WHEN). De bestaande golden test (`storage/planGolden.test.ts`) blijft ongewijzigd groen voor de gevallen met een doel; dat is de poort voor elke bouwstap.
- Gebruiker zonder doel en zonder gekozen richting: de planning blijft precies zoals ze is, ook als die nu een bergtocht zou bevatten. Op de Ascend-tab verschijnt hoogstens de alleen-lezen kaart Je week met het advies (150 minuten, 2 keer kracht) en de knop "Kies je richting". Een richting kiezen opent het voorstel; pas bij Akkoord komen de neutrale golven. Geen automatisch voorstel (vraag 3).
- Een doel van de soort fit of stronger geldt als richting; er wordt niets omgezet.
- Backup: de nieuwe velden zijn optioneel en defensief gelezen (`parseDirection`), een oud bestand importeert zoals het was. De stap staat in `storage/migrations.ts` (`migrateDirection`) met een samenvoeging per veld bij terugzetten, en een nieuw schemanummer volgens de gewone gang. Een nieuwe installatie begint met de startvragen en plant niets zonder Akkoord (`seedIfEmpty({ withProgram: false })` blijft zo).

## 6. Bouwvolgorde

Elke stap is los live, gaat door de vaste poorten (tsc, lint, vitest, build, Warden, Lookout, screenshot) en laat een bestaande gebruiker met een doel ongemoeid.

1. Meten wat nu gebeurt. Een test in `planGolden.test.ts` met een gebruiker zonder doel (fit gekozen bij de start) die vastlegt wat het plan nu bevat, vooral of de bergtocht en de rugzak erin staan. Geen codewijziging. Hij bevestigt of weerlegt het punt dat in het onderzoek alleen uit de code gelezen is, en is de nulmeting voor stap 4.
2. Gegevens en pure functies. `data/directions.ts`, `engine/direction.ts`, `engine/weekBudget.ts`, `engine/waves.ts` met tests (voorbeelden uit 2.2 tot 2.5, rand: geen geschiedenis, ziekte, vakantieweek, 7 dagen). Niets zichtbaar.
3. Je week, alleen-lezen. De kaart op de Ascend-tab zonder doel en op Je stand, met het blad Je week, met de advieswaarden (Fit blijven). Plus de rij Weekbudget (Instellingen) en haar zoek-, samenvattings- en helpregels. Eerste zichtbare stap; de planning verandert niet.
4. Richting kiezen, neutrale golven. Het richtingblad en de rij Richting, `layoutWaves`, wissels en rugzakladder alleen bij een tocht, voorstel 'direction_changed'. Alleen Fit blijven en Rustig aan (constante weken). De golden test krijgt een geval "zonder doel" dat bij Akkoord verandert, met de reden in de commit.
5. Minuten in de planning. De factor per week in `progressionTarget` en `resolveEffectiveFullDuration`, sessiepiek, tijd per dag, de eerlijke zin als het niet past. Hiermee gaat Fitter worden live (golf van vier weken, 10% erbij).
6. Beginnersstart en `NO-HARD-YET`, met de rij Beginnersstart.
7. Sterker worden. `strengthSessions` in `chooseWeekShape`, kracht 2 tot 4, pittig 0 tot 10%, de rij Golven (lengte en lichte week).
8. Startvragen. Vijf keuzes, de nieuwe krachtvraag, de voorstel-regels. Een nieuwe installatie kan nu elke richting kiezen.
9. Terugblik na een golf. De kaart, de drie keuzes, 'wave_review', de schakelaar in Golven.
10. Opruimen. De oude lege-kaart tekst, de CLAUDE.md-regel ("Klaar voor je doel", Je week zonder doel) en een besluit in `docs/beslissingen/` voor richting en weekbudget.

## 7. Open vragen voor de eigenaar

1. Overlap met de doelsoorten. Fit blijven en Sterker worden bestaan al als doel (zonder datum) en nu ook als richting. Advies: één taal. De richting is de lichte vorm en het doel van die soort de uitgebreide (met een krachtdoel op oefeningen). Kies je in het toevoegblad Fit blijven of Sterker worden, dan opent het richtingblad; voeg je daar een krachtdoel aan toe, dan wordt het een doel. Zo bestaat er nooit een richting die zijn eigen doel tegenspreekt.
2. Telt kracht mee in de minuten? Advies: nee. Kracht heeft zijn eigen teller (keer per week), want de richtlijn telt ze apart en zo zie je "135 van 150 minuten, 2 van 2 keer kracht" zoals je eerder koos.
3. Wat gebeurt er met wie nu geen doel heeft? Advies: alleen de kaart met het advies en de knop "Kies je richting". Geen automatisch voorstel, ook al staat er nu mogelijk een bergtocht in zijn plan. Zo verandert er niets zonder dat hij het zelf opent.
4. Rustig aan: 90 minuten en 1 keer kracht. Advies: akkoord als startwaarde, instelbaar in Weekbudget. Het bewijs is matig (elke beweging heeft nut) en het getal is afgeleid.
5. Golven. Advies: 4 weken (3 opbouwen, 1 licht) voor Fitter worden en Sterker worden, en alleen als voorstel voor Fit blijven. Rustig aan heeft geen golf.
6. De terugblik alleen op de Ascend-tab, niet als melding of op Vandaag. Advies: ja, om Vandaag bij de missie te houden.
