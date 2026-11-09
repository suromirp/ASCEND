# Calisthenics: het doel Vaardigheid en de ladder op Ascend (F4e)

Datum: 2026-11-09
Status: aangenomen

## Besluit

Er komt een doelsoort Vaardigheid: een doelstap op een van de drie ladders (push-up, optrekken, dip), met een mijlpaal `skillStep` per ladderstap tot en met de doelstap. Op de Ascend-tab staat elke vaardigheid als kaart met de ladder als trap, het werk op je huidige stap en één droge regel. Een vaardigheid heeft geen datum, plant niets en wordt nooit het hoofddoel. Toevoegen en weghalen gaan via een voorstel met Akkoord. Instelling: Vaardigheidsdoelen tonen, standaard aan.

## Hoe het werkt

Model (`models/skillGoals.ts`): `SkillGoal` met id, naam, `ladderId`, `targetStep` (vanaf 1) en `removedAt` als je hem weghaalt. `SkillStepMilestone` (`kind: 'skillStep'`) is afgeleid uit het doel en wordt niet bewaard. `SkillStepProgress` is append-only, net als `GoalMilestoneProgress`: een rij per gehaalde stap, met de dag van de training die hem haalde.

Een stap is gehaald als je de toets erop haalde, of de onderkant van een zwaardere stap. Dat leest `engine/skillGoal.ts#clearedSkillSteps` per trainingsdag met `ladderState`, dus met precies dezelfde regels als Forge (werksets, band telt niet, `clean: false` telt niet, de stap met extra gewicht). Een log van na vandaag telt niet; een training van vandaag wel, want hij is gedaan. De rij wordt één keer geschreven (`newSkillStepProgress`) en daarna nooit meer aangeraakt: verandert de toets of de ladder later, dan blijft de stap gehaald.

De berekening staat op één plek: `engine/goalReadinessFor.ts#skillReadinessFor`. Die geeft de trap (gehaald, de stap waar je aan werkt, nog niet aan de beurt), het werk ("Nu: Pull-Up. Toets: 3 keer 8.") en één regel. De regel is een droog feit: "Nog geen training op deze ladder.", "Nog 3 stappen tot Pull-Up.", "Je werkt aan je doelstap.", "Toets gehaald. Volgende stap: ..." of "Doelstap gehaald op 2 nov.". Geen percentage, geen ring, geen x van y.

Toevoegen: Doel toevoegen op Ascend, de tegel Vaardigheid, dan een blad met de ladder (Segmented) en de doelstap (standaard de stap boven je huidige, zonder training stap 1), dan het voorstel met Akkoord of Liever niet. Akkoord schrijft het doel en de stappen die je al haalde in één keer. Weghalen: Weghalen op de kaart, dan Weghalen of Annuleren.

## Eigen keuzes

- Geen `TrainingGoal` en geen nieuwe `GoalKindId`. Een TrainingGoal stuurt de planning: een actief doel moet een datum hebben, het doel met mijlpalen is het hoofddoel (`mainGoal` leest welke doelen mijlpalen hebben), botsingen, labels, Je week en `planHorizonChange` lezen alle doelen. Een vaardigheid in die lijst zou `mainGoal` kunnen raken en Je week laten verdwijnen. Een eigen opslag maakt "nooit het hoofddoel" en "geen planning" waar door de bouw, niet door voorzichtigheid. Daarom ook geen `GoalMilestone`- of `GoalMilestoneProgress`-rijen: die zouden de vaardigheid in `ladderGoalIds` zetten. `mainGoal`, `goalConflicts`, `sortedForList`, `goalDate` en `planGolden` zijn niet aangeraakt; een test bewaakt dat alleen `skillGoal.ts` en `goalReadinessFor.ts` het model kennen.
- Opslag in de meta-opslag onder `skillGoals` (doelen en gehaalde stappen samen), zoals `missedTraining`. Elke schrijfactie leest de opslag en schrijft hem in één put terug; een fout halverwege laat de oude opslag staan. De schrijfacties lopen achter elkaar in een keten op moduleniveau, zodat een tweede schrijfactie nooit een oudere stand over een nieuwere heen schrijft. Bij een time-out zegt de tab "Dat lukte niet op tijd." en leest hij de opslag opnieuw, want de put kan nog doorlopen. Geen nieuwe IndexedDB-store, dus geen database-upgrade.
- Geen hogere schemaversie. Het veld is optioneel en aanvullend, net als `missedTraining`, `mornings` en `migrateLogSetSkill`: een oudere back-up leest gelijk en het toestel houdt dan zijn eigen vaardigheden. `migrateSkillGoals` in `storage/migrationsSkill.ts` (via `migrations.ts`, aangeroepen in `backupNormalize.ts`) controleert bij een doel alleen de vorm (een id, een ladder als tekst, een doelstap als geheel getal vanaf 1) en laat een doel of rij met een kapotte vorm vallen, geteld bij de overgeslagen regels; bij een rij ook een rij zonder echte datum en een tweede rij voor dezelfde stap. Een doel met een ladder die deze versie niet kent, of met een doelstap boven de ladder, blijft ongewijzigd staan, ook met velden van een nieuwere versie: het tonen verbergt het (`liveSkillGoals`) of stopt bij de laatste stap. Zo laat geen lees-en-terugschrijfroute een doel vallen. Een rij van een doel dat er niet meer is blijft staan.
- In de back-up reist `skillGoals` mee met de categorie Doelen en mijlpalen. De gehaalde stappen worden altijd samengevoegd, ook bij Vervangen (zoals mijlpaalvoortgang); bij Vervangen wint een doel uit het bestand van een doel met hetzelfde id op het toestel, bij Samenvoegen het toestel.
- Een gehaalde stap wordt geschreven als de Ascend-tab de logs leest (bij openen en bij elke verandering van de logs), niet in de schrijfroute van een log. Zo raakt dit geen log, geen Forge en geen import, en klopt de dag toch: het is de dag van de training, niet de dag van schrijven. Tot die schrijfactie leest de kaart dezelfde stap al uit de logs.
- Gehaald blijft gehaald: na Stap lichter of een strengere toets toont de trap de bewaarde stappen als gehaald, terwijl het werk de stap van je laatste training noemt (bijvoorbeeld een stap lager); dat is zo bedoeld. Staan er bewaarde stappen maar geen training in de logs (een back-up), dan noemt het werk de eerste open stap van de trap; dat vond de tekstkaart.
- Een tweede vaardigheid met dezelfde ladder en doelstap kan niet: in het blad staat die stap uitgegrijsd met "Al een doel", en het blad stelt de eerste vrije stap voor.
- De importpreview zegt in één regel hoeveel vaardigheden er in de back-up staan en dat wat op het toestel staat blijft. Alles wissen wist de meta-opslag en neemt `skillGoals` dus mee.
- De tekstkaart heeft een eigen stand `vaardigheid` (één vaardigheid, Pull-Up, twee stappen gehaald) en het scherm `ascend-vaardigheid`.
- Weghalen zet `removedAt`; de gehaalde stappen en de logs blijven. Er is geen terughalen in deze stap.
- De namen van de stappen zijn de namen van de oefeningen zoals Forge ze toont (Pull-Up, Dead Hang). De naam van het doel is de naam van de doelstap; er is geen eigen naamveld, de opdracht vroeg één simpele keuze.
- De tegel Vaardigheid staat in het blad Doel toevoegen naast de andere soorten, maar hoort niet bij `ADD_TILES`, want dat zijn soorten van een TrainingGoal. Na Volgende opent het eigen blad; `goalDraft.ts`, `goalSetupAssist.ts` en `goalActions.ts` zijn niet veranderd.
- De kaart staat onder de lijst van doelen, ook als er geen doel is en Je week er staat: een vaardigheid is geen doel dat de planning stuurt, dus Je week blijft. Gehaald is ijsblauw (status), de stap waar je aan werkt in gewone inkt; geen mint, het ene accent van de tab blijft waar het was. De kaart verschijnt met de bestaande klasse `mx-row-in`: in Rustig en Uit meteen op de eindstand. Geen nieuwe kleur, token of klasse.
- De instelling: de pagina Doel en tochten had al twaalf rijen (het plafond). De Seizoensstrook ging daarom samen met Vaardigheidsdoelen tonen in een nieuwe rij met een blad, Op de Ascend-tab (`bundel-ascend`). Zoeken en het oude anker `seizoensstrook` vinden de seizoensstrook nog (in het blad). Uit: geen kaarten en geen tegel; je vaardigheden en wat je haalde blijven bewaard.
- Niet van toepassing: een vakantie, vrije periode, ziekte of tocht doet niets met een vaardigheid, want een vaardigheid plant niets. Een week- of maandgrens speelt geen rol; alleen de dag (via `today`, lokaal) telt, met een test rond 00:00 in Europe/Amsterdam.

## Reden

Punt 4 van "Wat later komt" in `2026-11-09-calisthenics-ontwerp.md`. Een ladder heeft al een duidelijke stand (`ladderState`); een doel erop vraagt alleen een doelstap en een plek waar je het ziet. Zo blijft het doel het doel, de planner deterministisch en de historie onaangeroerd.

## Alternatieven

Een nieuwe `GoalKindId` `skill` op `TrainingGoal`: raakt het hoofddoel, de botsingen, Je week en de planner, en een actief doel moet een datum hebben; afgewezen. Een vaardigheid zonder bewaarde stappen, alleen afgeleid uit de logs: dan verdwijnt een gehaalde stap als de toets later strenger wordt; afgewezen. Een percentage per ladder: een tweede percentage naast Klaar voor je doel mag niet; afgewezen. Een nieuwe IndexedDB-store: een database-upgrade voor twee kleine lijsten; afgewezen.

## Bron

`docs/beslissingen/2026-11-09-calisthenics-ontwerp.md` (Wat later komt, punt 4), `docs/beslissingen/2026-11-09-calisthenics-forge-rij.md`, `docs/werkbriefjes/doelen.md`, `docs/werkbriefjes/historie-en-logs.md`, `docs/beslissingen/2026-10-27-stem-van-ascend.md`.

## Vervangt

Niets.

## Terugdraaien

Zet Vaardigheidsdoelen tonen uit: geen kaart en geen tegel. In code: de kaart, het blad en de hook uit `pages/Ascend.tsx` halen en de tegel uit `GoalFormSheet.tsx`. De sleutel `skillGoals` mag blijven staan; een oudere app leest hem niet en een back-up zonder hem importeert gewoon.
