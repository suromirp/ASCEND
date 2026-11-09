# Calisthenics als soort per training: kracht, calisthenics of samen (F4g)

Datum: 2026-11-09
Status: aangenomen

## Besluit

Per krachttraining in de sportschool kies je kracht (met gewicht, het advies), calisthenics (met je eigen gewicht, op je ladders) of samen. De keuze is geen nieuw plansysteem en geen nieuw opgeslagen veld: ze zet ladderstappen in de training, in precies de vorm die het stapvoorstel al gebruikt (`StrengthSettings.stepSwaps`, `engine/stepSwaps.ts`). Een andere keuze is altijd eerst een voorstel met wat er verandert, met Liever niet links, Akkoord rechts en daarna Ongedaan maken. Dit is punt 6 van "Wat later komt" in `docs/beslissingen/2026-11-09-calisthenics-ontwerp.md`. De instelling heet Calisthenics per training en staat in Forge, in het blad Bij het invullen, na Stap voorstellen.

## Hoe het werkt

Welke plek welke ladder kan worden, staat als gegevens in `data/calisthenicsStyle.ts`, per familie van oefeningen: bankdrukken, schuin drukken en smal drukken worden de push-up, en bij een tweede keer duwen de dip; schouderdrukken wordt de handstand push-up; lat pulldown en optrekken met hulp worden optrekken; triceps pushdown en de triceps boven je hoofd worden de dip. Elke ladder hoogstens één keer per training. Alleen bovenlichaam: het ontwerp zegt dat calisthenics bovenlichaam, romp en grip aanvult en de beendag niet vervangt. Een beentraining en Eigen gewicht krijgen dus geen keuze; in Eigen gewicht staat de push-up al op een ladder en die blijft van het stapvoorstel.

`engine/trainingStyle.ts` (puur, deterministisch, geen AI) rekent alles uit. `styleSlots` vindt de plekken, `styleChange` zegt wat Akkoord schrijft, `withStyleAccepted` schrijft het, `withStyleUndone` zet het terug. Een nieuwe ladderplek begint op de stap waar je staat (`ladderState`, dezelfde regels als Forge), zonder training op die ladder op stap 1. Daarna neemt het stapvoorstel het over: haal je de toets, dan komt in deze training het voorstel voor de volgende stap.

Calisthenics zet alle plekken op hun ladder. Samen houdt de eerste helft met gewicht en zet de rest op een ladder; de zware basisoefeningen staan vooraan in een training. Samen is er pas vanaf twee plekken. Kracht haalt de stappen van deze keuze weg.

Teksten. Per plek: "Barbell Bench Press wordt High Incline Push-Up (stap 1 van 7)." of bij terug "High Incline Push-Up wordt weer Barbell Bench Press.". Bij een houding: "Een houding begint op 3 keer 10 seconden.". Dan "Eerst een voorstel, pas na Akkoord verandert er iets. Je planning en je dagen blijven.". Na Akkoord: "Bovenlichaam A is nu calisthenics. Je ziet het de volgende keer dat je deze training opent." (of "is nu kracht en calisthenics samen." of "is weer kracht met gewicht."), met Ongedaan maken; daarna "Bovenlichaam A staat weer zoals het was.".

## Eigen keuzes

- Geen veld voor de soort. De soort wordt afgeleid uit de stappen die er staan (`trainingStyleOf`): geen enkele plek op een ladder is kracht, alle plekken is calisthenics, een deel is samen. Zo is er één waarheid, leest een oude back-up zonder stappen als kracht overal, en bestaat er geen tweede opslag die uit de pas kan lopen met wat Forge echt plant. Gevolg: zet je in het blad van een oefening één plek terug (Terug naar ... in je plan), dan heet de training samen. Dat klopt met wat er staat.
- Geen migratie en geen hogere schemaversie: de opgeslagen vorm verandert niet. `stepSwaps` bestond al, wordt defensief gelezen (`normalizeStepSwaps`) en reist mee in de back-up met de rest van het krachtmodel. De tests zetten een back-up zonder het veld, een back-up met alleen een stap uit het stapvoorstel en een heen-en-terug met een keuze.
- Herhalingen houden de sets en herhalingen van het sjabloon, net als bij het stapvoorstel; een houding begint op de onderkant (3 keer 10 seconden). Een plek die al op zijn ladder staat, blijft zoals hij is: van calisthenics naar samen zet een stap die het stapvoorstel later hoger zette niet terug naar het begin.
- Alles of niets. Akkoord schrijft alle plekken met één opslag. Landt één plek niet (het maximum van 20 trainingen of 6 plekken in `stepSwaps`), dan geeft `withStyleAccepted` niets terug en slaat het blad niets op: "Dit past niet meer bij je andere trainingen. Er is niets veranderd.". Een opslag heeft een grens van 8 seconden (`saveWithLimit`); lukt het niet op tijd, dan blijft het voorstel staan met "Opslaan lukte niet op tijd". Een late gelukte opslag telt alsnog. Lukt Ongedaan maken niet, dan blijft de knop staan.
- De planner hoeft niets anders te lezen. De planningsronde, de 48 uur tussen beendagen en de weekcontrole lezen de belasting (`baseStressProfile`) en de rollen van het sjabloon, nooit de oefeningen. Bovenlichaam blijft bovenlichaam met zware belasting voor de bovenkant: een ladderstap op de juiste zwaarte is ook zwaar, en geen enkele bovenlichaamladder belast de benen (`loadsLegs` is onwaar). De spiergroepen per week (`muscleVolume.ts`) lezen de oefening van het log, dus een set op een ladder telt voor borst, rug, schouders, triceps of onderarmen, een houding ook, de benen niet. `planGolden.test.ts` beweegt niet; een test draait de ronde twee keer met een keuze in een week met een tocht, een vakantie en zonder sportschool.
- De dag zelf: de stap waar je staat rekent met je logs tot en met vandaag; een training van vandaag is gedaan en telt, een log van morgen niet. Er is geen datum in de keuze: ze geldt voor elke volgende keer dat je de training opent, en raakt geen geplande sessie, geen slot, test, tocht of vakantie.
- Een lopende Forge-sessie verandert niet: Forge bevriest de stappen bij het openen en zet ze in het concept (`forgeDraft.ts#sessionStepSwaps`), ook na herladen.
- De instelling staat in het blad Bij het invullen, na Stap voorstellen, waar de andere instellingen voor calisthenics staan. De pagina Forge en Geavanceerd zaten aan hun plafond. Ze is zichtbaar als je Forge in de app bijhoudt (niet met MacroFactor als bron), zoals het stapvoorstel. De rij zegt "Alles kracht" of hoeveel trainingen calisthenics hebben.
- Niet in `settingsDiff.ts`: terugzetten naar het advies zou de inhoud van je trainingen zonder voorstel veranderen. Terug naar kracht gaat in het blad zelf, met Akkoord. Zo ook voor `stepSwaps` van het stapvoorstel.
- Alleen Forge ziet de ladder (via `forgeSlotsFor`), zoals bij het stapvoorstel. Korter vandaag, het oude invulscherm en de uitleg van de training tonen de oefening van het sjabloon.

## Reden

Het stapvoorstel had een ladder alleen in een training waar de oefening al stond. Met deze keuze komt een ladder ook in een gewone krachttraining, op de plek van de oefening die hetzelfde traint. Door de bestaande stappen te gebruiken blijft er één manier om de inhoud van een training te veranderen, die al getest is, de historie niet raakt en de planning niet ziet.

## Alternatieven

Een veld `soort` op `SessionTemplate`: de ingebouwde sjablonen worden bij elke start teruggezet, dus de keuze zou verdwijnen, en een tweede waarheid naast `stepSwaps` kan uit de pas lopen; afgewezen. Een eigen veld per training in het krachtmodel naast de stappen: zelfde tweede waarheid, plus een migratie; afgewezen. Calisthenics als eigen trainingssoort in Hoeveel per soort, met eigen sjablonen: raakt de planningsronde, de rollen en de golden scenario's; afgewezen voor nu. Samen als ladders achter de training erbij: maakt de training langer dan de tijdsgrens; afgewezen. Benen meenemen (squat op één been): het ontwerp zegt dat calisthenics de beendag niet vervangt.

## Bron

`docs/beslissingen/2026-11-09-calisthenics-ontwerp.md` (Wat later komt, punt 6), `docs/beslissingen/2026-11-09-calisthenics-stapvoorstel.md`, `docs/beslissingen/2026-10-22-alles-instelbaar.md`, `docs/beslissingen/2026-11-09-stem-van-ascend.md`.

## Vervangt

Niets.

## Terugdraaien

Kies Kracht per training in het blad: de stappen van deze keuze gaan weg en de sjablonen gelden weer. In code: `engine/trainingStyle.ts`, `data/calisthenicsStyle.ts` en `components/settings/groups/TrainingStyleSheet.tsx` weghalen, met de rij in `ForgeGroup.tsx`, `settingsIndex.ts`, `settingsLayout.ts`, `settingsHelp.ts` en `settingsSummary.ts`. Opgeslagen stappen blijven leesbaar; Forge gebruikt ze tot je ze terugzet.
