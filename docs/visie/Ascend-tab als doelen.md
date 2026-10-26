# Ascend-tab als de plek van je doelen: ontwerpvoorstel

Cartographer Doelen, 26 oktober 2026. Een voorstel, geen besluit. Er is niets in `src` gewijzigd. Bij dit stuk horen twee mockups op 390 px (`variant-a.html`, `variant-b.html`), de lege staat (`leeg.html`), het scherm "Sporten" (`sporten.html`) en het blad "Doel toevoegen" (`toevoegen.html`, met `#1`, `#2` en `#3` voor de drie stappen), met PNG's in dezelfde map. De kleuren zijn gekopieerd uit `@theme` in `src/index.css`. Alle namen en getallen in de mockups zijn verzonnen.

Bronnen: `docs/beslissingen/2026-10-26-kracht-en-berg-voor-iedereen.md`, `docs/visie/Kracht en berg in één plan.md` (deel 3), `docs/onderzoek/Meerdere doelen en prioriteit.md`, `Doelsoorten berg en buiten.md`, `Doelsoorten duur.md` en de huidige `src/pages/Ascend.tsx` met zijn kaarten.

## 1. In het kort

1. De tab is nu een GR5-pagina met een tweede pagina erachter (`/ascend/doelen`) waar je doelen instelt. Dat vervalt. De tab wordt één lijst van je doelen, op volgorde, elk met "Klaar voor je doel", de zin waaruit dat bestaat, de volgende stap en het aantal weken. Instellen gebeurt in een blad op dezelfde tab.
2. Elk doel heeft een label. Het label bepaalt de afbouw en de opbouw, de volgorde bepaalt alleen wie wijkt als labels gelijk zijn (regel 8 uit het onderzoek). Sleep je een doel over de grens van een label, dan neemt het het label van die plek over, altijd via een voorstel met Akkoord als je plan erdoor verandert.
3. Er is geen vaste route meer. De tochtmodule (Reisplanner, Paklijst, Etappes, Alleen onderweg) hangt onder een doel van de soort Trektocht.
4. Zonder doel staat er één regel en één knop.
5. Advies: de lijst van variant B (compacte rijen die uitklappen, seizoenstrook op de lucht) met de zinnen en het doelblad van variant A voor wie meer wil zien. Reden in deel 9. De labels zijn die van de eigenaar, Top, Voortop en Verkenning, op elke kaart met één regel uitleg eronder (deel 5).

## 2. Structuur van boven naar onder

1. **Lucht** (`SkyBand`, tall). Links `AppMark`, rechts een plus (doel toevoegen) en het tandwiel, beide in `--color-on-light`, 44 bij 44 px, op dezelfde plek als op de andere tabs. Daaronder `Eyebrow` "Ascend" in de tabkleur (alpengloed, op de lucht `--color-tab-ascend-light`), de titel "Je doelen" in Marcellus 28 en één regel: "3 doelen. Het eerste is over 37 weken." Het getal staat in Inter, ijsblauw (waar je bent).
2. **Eerste kaart op de lucht.** Variant A: het eerste doel als volle kaart. Variant B: de seizoenstrook (alle doelen op een tijdlijn van nu tot een jaar verder, met de weken ertussen en de afbouw als lichte balk).
3. **De lijst met doelen**, in de volgorde die jij sleept. Per doel: label (pil), naam, datum, soort en kenmerken, het aantal weken (Inter 28 in ijsblauw, "weken" gedempt), de ring met het ene percentage, het kopje "Klaar voor je doel", de zin, de volgende stap.
4. **Doel toevoegen** als mint omlijnde knop (`SecondaryButton`). Als er al doelen zijn is er geen gevulde mint knop: het ene accent van het scherm is de mint van de ringen en meters. Alleen op de lege staat is "Doel toevoegen" de gevulde hoofdknop.
5. **Seizoen** (alleen A, onderaan; in B staat het bovenaan op de lucht).
6. **Eerder** als één rij: afgeronde, voorbije en weggelegde doelen (de huidige `ArchivedGoalsCard`, ingeklapt).

Het tandwiel, de tabbalk (Ascend actief, roze streepje) en de scrollherstelling blijven zoals ze zijn. Op deze tab staat verder niets meer dat geen doel is.

### De doelkaart

Wat er per doel altijd staat, in deze volgorde: label, naam, datum met soort en kenmerken ("Tent, 9 dagen", "Doeltijd 55:00"), weken tot het doel, ring met percentage, "Klaar voor je doel" met de korte zin ("Het gemiddelde van vier dingen die je tocht vraagt: rugzak, langste dag, stijgen en dalen, dagen achter elkaar."), bij het eerste doel ook de zwakste meter, en de volgende stap ("Za 31 okt en zo 1 nov. Twee wandeldagen achter elkaar met 10 kg in je rugzak. Dit werkt aan je zwakste meter.").

De meters staan achter een tik: in A opent een tik op de kaart het doelblad, in B klapt de rij open. In beide staat de lange zin (met de getallen, zoals `Gr5ReadinessCard` nu) pas in het blad of de uitgeklapte rij; op de kaart staat de korte zin met alleen de namen. Dat is een kleine uitbreiding van de regel "altijd met de zin waaruit het bestaat" en vraagt jouw akkoord (deel 10).

Het percentage blijft het enige voortgangsgetal. De coachstatus ("Op koers", "Bijna op koers") staat in het doelblad onder "De coach", niet als tweede getal op de kaart.

### Het doelblad (A) en de uitgeklapte rij (B)

Hetzelfde, in deze volgorde: het percentage met de uitleg dat elke meter stopt bij 100%, de meters (naam, "9 van 14 kg", balk, één zin waarom), de volgende stap, de coach (`OnCourseCard` verhuist hierheen), de tochtmodule voor een trektocht, en onderaan "Dit doel": label, plek in de lijst (met Hoger en Lager als alternatief voor slepen), aanpassen, archiveren. Het blad gaat door `useSheetClose`, dus de terugknop sluit het eerst.

## 3. Gedrag

**Tikken.** Naam en ring openen het doelblad (A) of klappen de rij uit (B). De labelpil opent het labelblad. De greep rechts (6 stippen, 44 bij 44 px) is alleen voor slepen. De tochtregel onderaan een trektochtkaart opent de Reisplanner, losse knoppen voor Paklijst en Etappes. Elk tikdoel is minstens 44 px; de pil heeft een onzichtbare uitbreiding, zoals `InfoButton`.

**Slepen.** Je pakt de greep. Alle kaarten klappen in tot een kop (naam, weken, ring, pil), zodat de afstand klein blijft. Het opgepakte doel zweeft (kleine schaduw, mint rand, geen draaiing). Op de plek waar je loslaat komt een invoegstreep (B) of een zone met de naam van het label (A). Het label in de pil van het zwevende doel verandert mee zodra je een grens passeert. Loslaten binnen dezelfde labelgroep verandert alleen de volgorde, stil en met een "Ongedaan maken" in `ChangeNotice`. Loslaten in een andere groep opent eerst het voorstel met wat het label in je plan doet (Akkoord of Liever niet); bij Liever niet springt het doel terug. Technisch: pointer events op de greep met `touch-action: none` alleen daar, zodat scrollen over de kaart blijft werken; automatisch scrollen aan de randen. Met het toetsenbord: greep focussen, spatie pakt op, pijltjes verplaatsen, spatie laat los, Escape annuleert, met een `aria-live` melding "Plek 2 van 3". De Hoger en Lager knoppen in het doelblad zijn de bediening zonder slepen. De beweging is 150 tot 250 ms ease-out en staat in Rustig en Uit meteen op de eindstand (`mx-*`, `data-motion`).

**Label wijzigen.** Pil tikken opent het labelblad (`Sheet`): drie keuzes met elk één zin, en eronder "Voor jouw 10 km" met wat het label voor dit doel doet in dagen en weken (afbouw, rustdag erna, eigen opbouw of niet, past het naast je andere doelen). Dit voldoet aan "laat bij elk voorstel zien wat het label doet". Een eigen keuze verandert niet door de planner zonder vraag.

**Toevoegen.** Plus rechtsboven, de knop onderaan of een snelkeuze in de lege staat opent een blad in drie stappen (mockup `toevoegen.html`):
1. Soort kiezen: tien tegels (Trektocht, Bergtocht, Mountaineering, Hardloopwedstrijd, Trailrun, Fietstocht of wedstrijd, Triathlon, Sterker worden, Fit blijven, Combinatie). Een tocht met hut of tent is één soort met een vraag.
2. Een paar vragen, afhankelijk van de soort, hoogstens vijf plus het label. Voor een hardloopwedstrijd: afstand, datum, doeltijd (mag leeg), naam, label. Voor een trektocht: dagen, afstand, stijgen en dalen, rugzak, hut of tent. Fit blijven heeft geen datum. Het label staat voorgeselecteerd: het eerste doel is "Top", een volgend doel "Voortop" als het vóór je Top ligt en "Verkenning" als het erna ligt.
3. Voorstel met Akkoord (`ProposalSheet`): past het, dan staat er wat er in je plan verandert; past het niet, dan staat er waarom (de balk met herstel, opbouw en afbouw naast het aantal dagen dat er is), een stap lager als voorstel, en wat er in de weken verandert. Knoppen: Akkoord, Liever niet (niets toevoegen, niets verandert) en een stille tekstknop "Toch als Top" voor wie het weet en het wil (de open vraag uit het onderzoek, deel 10). Het eerste doel op een lege installatie loopt via `firstPlan` zoals nu: niets plant zonder Akkoord.

**Botsing tussen doelen.** De volgorde van regel 6 uit het onderzoek, als vaste uitkomst van de engine: eerst de afbouw van het lagere doel inkorten tot de ondergrens, dan dat doel een stap lager zetten, dan eerlijk zeggen dat het niet past en het doel als rustige deelname laten staan. Welk doel wijkt: het laagste label, dan het doel lager in de lijst, dan het latere in de tijd. Een botsing verschijnt op drie plekken en lijkt overal op dezelfde zin: bij toevoegen, bij een andere datum of een ander label, en bij slepen over een grens. In de lijst zelf staat bij een stille botsing (bijvoorbeeld na een datumwijziging in de tochtmodule) een amberkleurige regel onder het doel, "Past niet naast je tocht. Bekijk voorstel", nooit een stille wijziging.

**Datum voorbij en onderweg.** Het percentage maakt plaats voor de stand: "Onderweg, dag 3 van 9" (bestaand gedrag, tijdens de tocht plant ASCEND niets) en na de datum "Hoe ging het?" met Behaald, Niet gehaald en Archiveren; het doel gaat daarna naar "Eerder". Een doel zonder datum (Fit blijven, Sterker worden zonder streefdatum) toont "Doorlopend" in plaats van weken, en bij Fit blijven de week tegen de richtlijn.

## 4. Lege staat

Mockup `leeg.html`. Eén regel, één knop, in de eerste kaart op de lucht: "Nog geen doel. Wat wil je bereiken?" met de gevulde mint knop "Doel toevoegen". Onder de lucht, optioneel, vijf snelkeuzes in chips (Trektocht, Bergtocht, 10 km, Sterker worden, Fit blijven) onder "Of begin met"; elk opent het blad op stap 2. De chips mogen zonder verlies weg, dan blijft het een echte oneliner. Geen uitleg over labels of soorten: die staat in het blad, op het moment dat je hem nodig hebt. Past bij de regel "een nieuwe installatie plant niets": Vandaag blijft `StartWelcome` tonen zolang er geen programma is, en het eerste doel dat je hier toevoegt voedt dezelfde eerste planning.

## 5. Labels

**Eerste voorstel, van de eigenaar: Top, Voortop, Verkenning.** Het label staat altijd met één regel uitleg eronder, op elke kaart, in het labelblad en in het toevoegblad, zodat het op zichzelf staat en niemand "hoofddoel of tussendoel" hoeft te raden:
- Top: hier train je naartoe, alles bouwt hiernaartoe, twee rustiger weken ervoor.
- Voortop: wil je goed doen onderweg, een paar dagen rustiger ervoor.
- Verkenning: je doet mee als training, geen rust ervoor.
De pil toont daarnaast drie streepjes (3, 2 of 1 gevuld) als taalloos signaal van hoe zwaar het doel telt. De drie woorden vormen één beeld (de top, de voortop, het verkennen) en passen bij de berg en bij de rest van de app zonder RPG-taal. "Kamp" is niet gebruikt, want dat zijn de mijlpalen.

Twee kleine punten om te weten. De regel onder het label is per doel opgebouwd uit de soort: bij een tocht met tent is het "twee rustiger weken", bij een 10 km "tien dagen" (Top) of "vijf dagen" (Voortop), en dat komt uit `labelEffect` in de engine. De mockups tonen dat zo. En "Top" staat ook als slotwoord onder aan de mijlpalenladder (`AscentLadder`); dat blijft werken zolang de ladder alleen in het doelblad staat.

Twee alternatieven als de eigenaar liever iets anders wil. Ze hebben dezelfde drie zinnen.

**Alternatief 1, "Bekende woorden"** (wat de app en het onderzoek al zeggen):
- Hoofddoel, Tussendoel, Als training.
Zwak punt: een tussendoel suggereert dat het vóór het hoofddoel ligt, terwijl een doel erna dat label ook kan krijgen.

**Alternatief 2, "Wat je ervoor laat"** (zegt wat het met je plan doet):
- Alles erop, Fris starten, Meetrainen.
Zwak punt: "Alles erop" kan na twee gelijke doelen vol raken; de botsingsregel vangt dat op.

De labelkeuze zelf hoeft niet in Instellingen: het zijn woorden, geen keuze van de app. Wel instelbaar (deel 8): de afbouwdagen per label en soort, en de afstand tussen doelen.

## 6. Hoe het in de stijl past

- **Lucht en bergen.** `SkyBand` tall bovenaan, de eerste kaart erop als lichte kaart (`.on-light`, vanzelf donker 's nachts). Geen `SkyPanel` halverwege: het enige "halve" vlak dat er stond ("Volgend kamp") verdwijnt met de GR5-mijlpalen van de tab.
- **Eén mint accent.** Met doelen: geen gevulde mint knop, alleen ringen, meters, een gekozen label en "Doel toevoegen" als omlijnde knop. Zonder doel: de gevulde knop "Doel toevoegen". Geen contourtextuur op de doelkaarten (die is voor de missiekaart op Vandaag).
- **Tabkleur alpengloed.** Alleen in `Eyebrow` ("Ascend", "Klaar voor je doel", "Je seizoen", "Voor jouw 10 km") en de tabbalk. Een eyebrow per kaart, geen handgemaakte kopjes.
- **IJsblauw alleen status**: de weken tot het doel en de "nu"-stip op de tijdlijn. De labelpil is dus nooit ijsblauw; het eerste label is licht mint omlijnd, de andere neutraal. Amber alleen voor "past niet" en "te kort".
- **Marcellus alleen voor woorden**: titel "Je doelen", namen van doelen, de oordelen ("Op koers"). Alle getallen in Inter met vaste cijferbreedte: percentages, weken, "9 van 14 kg", datums in de zin. Het getal in de ring is 22 (eerste doel) of 17 px, de weken 28 px.
- **Niets onder 12 px**, zinsletters in knoppen, "Liever niet", "Akkoord", "Annuleren" en "Sluiten" overal gelijk. Kaarten 16 px afgerond, 12 px tussenruimte, 16 px binnenruimte.
- **Iconen.** Bediening (plus, grip, pijltjes, vinkje, vlag) uit `icons.tsx`; de greep (6 stippen) is nieuw. De tien soorttegels hebben pictogrammen nodig. In de mockup staan lijniconen als plaatshouder voor fiets, trail, mountaineering, triathlon, fit blijven en combinatie, die nu niet bestaan. Die horen in `pictograms.tsx` in stijl C (Cartographer pictogrammen, aparte opdracht).
- **Beweging.** Alleen bij verschijnen en bij slepen (150 tot 250 ms ease-out), geen lus. Het cijfer in de ring telt op met `CountUp` zoals nu, in Rustig en Uit direct de eindstand.
- **Terugknop.** Het doelblad, het labelblad en het toevoegblad gaan door `useSheetClose`; zolang er een laag open staat, wordt het adres niet herschreven. De uitgeklapte rij in B gaat in `usePageState`, zodat hij een bezoek aan een andere pagina overleeft.

## 7. Wat er van de huidige kaarten blijft, verhuist of verdwijnt

Blijft, maar algemeen:
- `Gr5ReadinessCard` en `Gr5ReadinessSheet` worden het hart van elke doelkaart en het doelblad (`GoalReadinessCard`, `GoalReadinessSheet`), met meters per soort. Je stand leest dezelfde functie.
- `JourneyEntryCard` wordt de tochtregel op een trektochtkaart (Reisplanner, Paklijst) en de rijen "Je tocht" in het doelblad (Etappes, Alleen onderweg, later Water per etappe en Bergschoenen inlopen).
- `SeasonCard` wordt de seizoenstrook (A onderaan, B op de lucht), alleen met doelen en afbouw, geen fasebalk.
- `OnCourseCard` wordt het blok "De coach" in het doelblad, per doel, met het oordeel in Marcellus.
- `ArchivedGoalsCard` wordt de rij "Eerder".
- `Sheet`, `PrimaryButton`, `SecondaryButton`, `TextButton`, `Chip`, `Eyebrow`, `Ring`, `Meter`, `StatusPill` blijven de bouwstenen; nieuw zijn alleen de labelpil met streepjes, de greep en de seizoenstrook.

Verhuist:
- `StrengthProgressionCard` en de rij "Trainingsverdeling richting GR5" gaan naar Je stand (het zijn standcijfers, geen doelen). Bij een doel van de soort Sterker worden komt de krachttrend als meter in het doelblad.
- `StrengthProgramCard` (het krachtblok) blijft bereikbaar via Instellingen en via het doelblad van Sterker worden.
- De mijlpalen (`AscentLadder`, `MilestoneDetailSheet`, "Volgend kamp") gaan in het doelblad onder "Kampen", alleen voor doelen die er een hebben (de overgezette GR5). Nieuwe doelen krijgen geen ladder; "een tweede percentage erbij" blijft verboden.
- `GoalSetupWizard`, `GoalRouteEditor`, `MarathonGoalCard`, `GR5GoalCard` en `CustomGoalsList` gaan op in het toevoegblad en "Doel aanpassen" in het doelblad.

Verdwijnt:
- `GoalsPage` op `/ascend/doelen`. Het adres blijft werken en stuurt naar `/ascend` (oude links blijven kloppen).
- `GoalFocusCard` ("Doelfocus" met "krijgt x% van de aandacht"): het label doet nu wat die kaart probeerde uit te leggen, zonder tweede percentage. De haalbaarheidszin (`feasibility.explanation`) kan als regel in "De coach".
- `NextTrekLine` en `TrekGoalsCard`: een tocht is nu gewoon een doel van de soort Trektocht. Vrije dagen en vakanties blijven op Week.
- De vaste GR5-teksten (`GR5_TRACK_DESCRIPTION`, "36 etappes" in de rij Etappeplan, "TRAININGSVERDELING RICHTING GR5") gaan naar routegegevens of vervallen.
- "Details van het doel" en de losse kaarten "Onderweg" en "Achter je": de stand zit nu in de kaart zelf.

## 8. Wat de engine moet leveren

Alles hieronder is puur (geen React, geen opslag) en getest, in lijn met de werkafspraken. Opbouw en regels staan in de onderzoeksstukken; ik noem alleen wat de tab nodig heeft.

1. **Doelsoorten als gegevens** (`data/goalKinds.ts`): per soort de naam en het pictogram, de vragen van stap 2, de meters (type beste dag, reeks, volume of versheid; logs die tellen; venster; aandeel; de zin "waarom"), het wekelijkse minimum, de minimale en aanbevolen weken, de fasenamen, afbouw per label in dagen, herstel in dagen, en de module (alleen Trektocht heeft de tochtmodule).
2. **`goalReadiness(goal, logs, today)`** in de plaats van `computeGr5Readiness`: percentage, meters met tekst en aandeel, de korte zin (alleen namen), de lange zin (met getallen), de zwakste meter, het verschil met vier weken geleden, en een uitkomst "nog geen meting" in plaats van een stille nul.
3. **`goalNextStep(goal, plannedSessions, journeyTasks)`**: de eerstvolgende geplande training die de zwakste meter voedt; anders de volgende sleuteltraining; anders de open taak uit de Reisplanner. Geeft datum, tekst en de reden in één zin.
4. **`goalTiming`** uitbreiden met "doorlopend" (geen datum) en de afstand in weken tussen twee doelen, voor de seizoenstrook.
5. **Labels en volgorde**: `GoalPriority` ('main', 'important', 'join') bovenop `planRole`, plus `AppSettings.goalOrder` (lijst met ids). Migratie met een eigen `migrate...`-stap: bestaand `main` en `secondary` worden hoofddoel en tussenlabel, `track` krijgt voorlopig het laagste label of een schakelaar "Alleen volgen" in het doelblad (open vraag, deel 10), `TrekImportance` ('training' of 'goal') valt samen met het label.
6. **`goalCollision(goals, candidate)`** met regels 3, 4, 5 en 6 uit het onderzoek: minimale afstand tussen twee hoofddoelen (herstel, 21 dagen heropbouw, afbouw, ondergrens 42), de afstand voor een tussenlabel, de overlap per soort, en de vaste volgorde inkorten, een stap lager, eerlijk melden. Levert de onderdelen van de balk in het voorstel (7 herstel, 21 opbouw, 14 afbouw, 35 beschikbaar), de uitkomst en de zinnen.
7. **`reorderGoals(order, id, toIndex)`**: levert de nieuwe volgorde en het label dat bij de plek hoort (regel 8), zodat het label nooit de lijst tegenspreekt. Een gewijzigd label of een nieuw doel gaat daarna door `computeHorizonPlan` en `planPass` voor de preview, zoals nu bij `planGoalRole`, en wordt pas bij Akkoord opgeslagen.
8. **Weergave van wat een label doet** (`labelEffect(kind, label, goal)`): dagen afbouw, rustdag erna, eigen opbouw of niet, zodat het labelblad en het voorstel dezelfde zinnen tonen.
9. **De tocht als vrij doel**: velden voor dagen, afstand, stijgen en dalen, rugzak, hut of tent, nachten; de overzetting van de bestaande GR5 naar een eigen tocht met dezelfde getallen (planning blijft gelijk, bewaakt door de vaste toets uit ronde 0); een koppeling tussen een doel van de soort Trektocht en zijn `LeavePeriod` en Reisplanner.
10. **Instellingen** (werkafspraak "alles instelbaar"): afbouwdagen per label en soort, de minimale afstand tussen hoofddoelen (42 dagen), de waarschuwingsgrenzen van regel 10, "Seizoenstrook tonen" (alleen als variant B wordt gekozen), en de herstelregel voor Meedoen. Elk in `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts` en een groepspagina; een besluit in `docs/beslissingen/` voor de tabindeling en de labels.

## 9. De twee varianten

**Variant A, "Missielijst"** (`variant-a.png`, `variant-a-doelblad.png`, `variant-a-label.png`, `variant-a-slepen.png`). Het eerste doel is een volle kaart op de lucht, de andere twee volle kaarten op het marine, het seizoen onderaan. Een tik opent het doelblad. Sterk: elk doel heeft hetzelfde gewicht, de zin en de volgende stap zijn altijd zichtbaar, de tochtmodule zit direct op de kaart. Zwak: drie volle kaarten zijn ongeveer 1.700 px hoog (bijna drie schermen), en slepen over zulke kaarten vraagt dat ze inklappen tijdens het slepen. Beide varianten gebruiken de labels van de eigenaar.

**Variant B, "Route"** (`variant-b.png`, `variant-b-label.png`, `variant-b-slepen.png`). De seizoenstrook staat op de lucht (waar je staat in het jaar, met de weken tussen doelen en de afbouw), de lijst is compact: het eerste doel staat uitgeklapt met meters, volgende stap en tochtmodule, de rest is een rij met ring, naam, weken, pil, een zin van twee regels en de volgende stap in één regel. Sterk: de hele tab is ongeveer 1.770 px met het eerste doel open, de rijen zijn klein genoeg om te slepen en te vergelijken, en de tijdlijn laat meteen zien wat de botsingsregels rekenen. Zwak: de zin wordt in een ingeklapte rij afgekapt na twee regels (de volledige zin staat erna), en de uitgeklapte rij kan lang worden bij vijf meters.

**Advies.** B als structuur, met uit A de uitleg "Voor jouw doel" in het labelblad en het doelblad als vervolg voor een doel dat veel meters heeft (Trailrun, Triathlon). De seizoenstrook heeft in B een betekenis die de lijst niet heeft, namelijk de datumvolgorde naast de prioriteitsvolgorde, en dat is precies waar het onderzoek zegt dat gebruikers het zoeken (TrainingPeaks, IntervalCoach).

## 10. Per sport kiezen hoe ASCEND ermee omgaat

Mockup `sporten.html` (`sporten.png`). Het scherm staat bij Instellingen, groep Planning, als "Sporten" (en is dezelfde plek als "Sporten die meetellen" en "Vaste afspraken" uit ronde 4 en 5 van het bouwplan). Het is een lijst van kaarten, één per sport, met een voorbeeld dat je in één oogopslag leest: hardlopen, voetbal op dinsdag, padel en zwemmen.

Elke sport heeft precies vier keuzes, in vaste woorden:
- **Plan dit voor mij**: ASCEND zet het in je week, op dagen die bij je benen passen. Voorbeeld hardlopen: drie keer per week, ASCEND kiest dinsdag, donderdag en zaterdag.
- **Vaste dag**: jij kiest de dag, ASCEND plant de rest eromheen. Voorbeeld voetbal: elke dinsdag; je andere trainingen schuiven mee en woensdag blijft licht voor je benen.
- **Telt mee als ik het doe**: je plant het zelf, ASCEND plant er niets voor. Log je het, dan telt het in je benen en je week. Voorbeeld padel: de dag erna blijft lichter.
- **Negeren**: ASCEND doet er niets mee. Voorbeeld zwemmen: buiten je plan en je benen.

Hoe de kaart het in één oogopslag duidelijk maakt:
1. Een kaart per sport met bovenaan het pictogram en de naam, daaronder de gekozen keuze als pil met een eigen icoon.
2. Een weekstrook van maandag tot zondag laat zien waar de sport landt: mint omlijnd is "ASCEND kiest de dag", mint gevuld is "jouw vaste dag", grijs omlijnd is "een dag die ASCEND rustig houdt", leeg is "niets gepland" en vervaagd is "doet niet mee". Zo zie je het verschil tussen de vier keuzes zonder te lezen.
3. Eén zin in gewone woorden met het voorbeeld van deze sport.
4. Tik je op een kaart, dan klapt ze open (zoals Voetbal in de mockup): de vier keuzes onder elkaar met elk één regel, en bij Vaste dag de strook als kiezer ("Tik op een dag"). Een wijziging die je plan inhoudelijk verandert gaat via een voorstel met Akkoord.

Voor de engine: `AppSettings.sportHandling` per sport ('plan', 'fixed', 'counts', 'ignore') met voor 'fixed' de dag, gelezen door scheduler en `weekValidator` (een vaste dag wordt een eigen vergrendeling, zoals een eigen verplaatsing), en door de beenindex (alleen 'plan', 'fixed' en 'counts' tellen mee). De sportenlijst komt uit de gegevens (ronde 4); pictogrammen voor voetbal, padel en zwemmen bestaan nog niet in stijl C (de mockup tekent plaatshouders). Een doelsoort bepaalt welke sporten voor zijn meters tellen, de keuze per sport bepaalt wat ASCEND ermee doet in je week; die twee blijven gescheiden.

## 11. Wat jij beslist, en wat ik niet kon controleren

Open vragen:
1. Of Top, Voortop en Verkenning blijven, of dat een van de twee alternatieven toch beter klinkt.
2. Mag de zin op de kaart de korte vorm zijn (alleen namen van de meters) en de lange (met getallen) pas achter de tik, of moet de lange altijd zichtbaar zijn? Dat is een kleine wijziging van het besluit over "altijd met de zin waaruit het bestaat".
3. Blijft "Alleen volgen" bestaan, als schakelaar in het doelblad, of valt het samen met het laagste label (open vraag uit het onderzoek).
4. Een tweede hoofddoel dat dicht bij het eerste ligt: de stille knop "Toch als Top" in het voorstel mag blijven, of ASCEND weigert dat.
5. Krijgen nieuwe doelen een mijlpalenladder, of blijft die alleen voor de overgezette GR5?
6. Mogen Krachtprogressie en Trainingsverdeling naar Je stand?

Niet gecontroleerd:
- De mockups zijn statische HTML met de tokens uit `index.css`; ze zijn niet in de echte app gebouwd en niet getest op 360 px, met de nachtlucht, met Rustig of Uit, of met een screenreader. Slepen is alleen als beeld getekend, niet uitgeprobeerd.
- De percentages, meters en datums zijn verzonnen en nagerekend op een gemiddelde van de meters (47, 71 en 37). De dagen in het voorstel (7, 21, 14, 28, 35 en 42) volgen regel 3 en 4 uit het onderzoek, dat zelf zegt dat het expertregels en afgeleid zijn.
- De pictogrammen voor de nieuwe soorten zijn plaatshouders.
- De mockups gebruiken de lettertypen uit `@fontsource` voor de schermafbeeldingen; de HTML zelf laadt Inter en Marcellus via Google Fonts.
