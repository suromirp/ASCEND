# De korte test, de rest: de echte dag, alleen geplande tests, één regel voor de duur

Datum: 2026-11-20
Status: aangenomen

## Besluit

Vier dingen aan de korte test, de rest van backlogpunt I-91 na de bouw van 18 november.

1. Een loop die je achteraf aan zijn geplande training koppelt, telt als gedaan op de dag dat je hem echt liep, en in die week. Ontkoppelen zet alles terug.
2. De rustige loop met de korte test staat in het blad Je horloge, bij Zelf nabouwen in Garmin Connect, met de vier stappen van de test.
3. Alleen de geplande testloop van een week telt voor je eigen midden en krijgt een oordeel. Bij een import blijft de reeks alleen staan met een echte dag, niet later dan morgen.
4. Of de test in een loop past, toetsen de Briefing en het horloge met één regel: de kortste van de duur in je planning en de duur van de workout, en die is minstens 25 minuten.

## Reden

De review van Warden en de doorloop van Pathfinder op 18 november lieten vier dingen open (`2026-11-18-korte-test.md`, Open).

Hoe het werkt:

- De dag van een gekoppelde loop. `engine/shortTest.ts#shortTestDone` leest uit de logs wat er al gebeurde, voor de Briefing, het horloge, de stand op het horloge en het logblad samen. Bij een log met `linkedLater` onthoudt het de dag van het log (`completedDate`) per geplande training. `shortTestSessionIds` kiest de eerste rustige loop van een week op die dag. Voorbeeld: de loop van zondag liep je op maandag en koppelde je later. Dan heeft de week van maandag zijn loop al en krijgt de rustige loop later in die week geen tweede test. Eerder telde hij voor de week van zondag, waarin je niet liep.
- Geen historie herschreven. Koppelen en ontkoppelen blijven wat ze waren (`engine/missedTraining.ts#linkLog` en `unlinkLog`, de bestaande uitzondering). De korte test leest alleen. Omdat alles elke keer opnieuw uit de logs volgt, is de stand na ontkoppelen precies die van voor het koppelen. Er is geen vlag en geen nieuw veld op het log.
- Je horloge. `engine/watchWorkout.ts#shortTestManualFor` geeft de stappen om na te bouwen: Warming-up 10:00 zonder doel, Hardlopen 4:00 op je testtempo met 2 procent eromheen, Herstel 1:00 stilstaan, Hardlopen voor de rest zonder doel. Erboven één zin met het testtempo. De rij zegt "Hardlopen, 4 stappen, met de korte test". Het blad en de rij zijn de bestaande (`WatchSheet.tsx`, `GuideRow`); de woorden voor de stappen zijn die van de andere workouts in het blad. Alle vier de plekken waar het blad opent lezen het via `components/useShortTestManual.ts`.
- Dezelfde regel als het versturen. De stappen staan er alleen als het horloge de test ook krijgt: `carriedShortTest` in `watchWorkout.ts` is de ene toets voor de workout die verstuurd wordt en voor de stappen om na te bouwen (de loop van de week, hardlopen als manier, genoeg minuten, "Korte test als workout" aan).
- Het midden. `plannedTestLogIds` geeft de logs van de geplande testlopen: per week de rustige loop die de test droeg, met de logs zoals ze nu zijn. `shortTestLogIds` en `shortTestView` lezen alleen die, plus de loop waar je naar kijkt. Een loop die geen geplande testloop was maar wel een teststuk heeft, laat zijn feiten zien met de zin "Deze loop stond niet als korte test in je week. Je ziet de feiten, zonder oordeel." Hij telt niet in je midden.
- De import. `storage/migrationsSettings.ts#migrateShortTestSeries` eist een dag die op de kalender bestaat (geen 31 februari, geen lege tekst) en niet later is dan morgen. Anders valt de reeks weg, wordt hij geteld bij wat is overgeslagen en komt het voorstel opnieuw. Het schemanummer blijft; een oudere back-up zonder reeks leest zoals hij was.
- De 25 minuten. `shortTestRunMinutes` is de ene regel. Het horloge (`carriedShortTest`) en de Briefing (`TrainingBriefing.tsx` geeft hem door aan `ShortTestBlock`) lezen hem allebei.

## Eigen keuzes

Keuzes die niet in de opdracht stonden.

- Een los horlogelog telt nog steeds niet als gedaan. Overwogen is om elke losse rustige loop te laten tellen als de loop van zijn week, zodat koppelen niets meer verschuift. Niet gedaan: een losse loop heeft geen vaste plek in je week. Een extra rondje eerder in de week zou de test van je geplande loop afnemen, terwijl je horloge de test daar niet in had. Wie de test liep op een andere dag, koppelt de loop; daarna klopt het.
- Alleen een achteraf gekoppeld log (`linkedLater`) telt op zijn eigen dag. Een log dat vanaf het begin bij zijn training hoorde, houdt de dag van het plan. Reden: een log van MacroFactor of een training die je na middernacht afsloot kan een dag later eindigen dan gepland, en de dag in Week is dan die van het plan (`2026-10-29-dag-van-een-training.md`). Zo verandert er voor die logs niets.
- Hangen er twee achteraf gekoppelde logs aan één training, dan telt de vroegste dag, wat de volgorde van binnenkomen ook is.
- Een gekoppelde loop van voor de eerste dag van de reeks telt niet, ook als de training zelf na die dag stond.
- Vakantie en tocht krijgen geen eigen regel. Een rustige loop die voorbij is zonder log telt niet als de eerste van zijn week, ook als hij in Week Vervallen heet. Een loop die het voorstel van je vakantie op overgeslagen zette telt niet. Een loop die blijft staan en nog komt, draagt de test, want hij gaat ook gewoon naar je horloge. Liep je hem toch, dan is hij gedaan.
- Voor het midden telt de instelling Korte test niet mee: wat je liep blijft staan, ook als je de test later uitzet. Wel telt Liever niet: zonder reeks is er geen test.
- Gevolg voor wat er al stond: een test in een losse loop of in de tweede rustige loop van een week telde tot nu toe mee en valt uit je midden. Het oordeel kan daardoor één of twee tests later komen. Er wordt niets weggegooid; koppelen brengt een losse loop terug.
- De ene regel is de kortste van de twee duren, niet één van beide. Alleen de duur van de workout kiezen had de Briefing een drempelstuk laten tonen in een loop die in je planning op 20 minuten staat (de dagen van terugkomen na ziekte of verlof). Alleen `plannedMinutes` kiezen had een test kunnen geven in een workout die korter is dan 25 minuten. Met de kortste past de test alleen als hij in allebei past.
- Wat dit verandert op het horloge: een rustige loop met een vaste duur onder 25 minuten kreeg de test wel als workout en krijgt nu de gewone rustige loop. Dat is één nieuwe vingerafdruk, alleen voor die loop. Gemeten op het demoprogramma over 8 weken (24 workouts die naar het horloge gaan): geen enkele geplande training heeft daar een vaste duur, dus 0 van 24 krijgen een nieuwe vingerafdruk en alle zijn byte voor byte gelijk. `buildWorkoutPlan` is niet aangeraakt.
- De stappen om na te bouwen volgen "Korte test als workout". Staat die uit, dan staan in het blad de gewone stappen van de rustige loop. Reden: de instelling gaat over de workout op je horloge, welke weg je ook kiest, en de stand Verstuurd en de stappen eronder spreken elkaar dan nooit tegen. Het blok in de Briefing blijft staan zoals het was.
- Morgen mag bij de import. Een back-up die net na middernacht in een andere tijdzone is gemaakt, heeft een dag die hier nog morgen is.
- Geen nieuwe instelling. Er komt geen nieuwe keuze bij die de app voor je maakt: de vier punten maken de bestaande instellingen "Korte test" en "Korte test als workout" kloppend. Een schakelaar "losse lopen tellen mee" is overwogen en niet gedaan: hij zou je midden vullen met lopen waarvan niet vaststaat dat het een test was. Koppelen is de weg, en die is er al.
- Niets hiervan verandert je planning. Geen geplande training verschuift; alleen welke rustige loop het blok en de workout van de test draagt, volgt uit je logs. Daarom geen voorstel met Akkoord. Het koppelen zelf gaat al via Akkoord.

## Alternatieven

- De dag van het log op de geplande training bewaren. Niet gedaan: dat is een opgeslagen vlag naast het log, en ontkoppelen zou hem moeten opruimen.
- De test in een losse loop herkennen aan zijn reeks en hem dan laten tellen. Niet gedaan: welke loop de test krijgt zou dan afhangen van reeksen die op de achtergrond gelezen worden, en het horloge leest die niet.
- Een eigen kop Korte test in het blad Je horloge. Niet gedaan: de andere tests staan er als de workout om na te bouwen, zonder eigen kop.

## Open

- Een los horlogelog telt niet als gedaan tot je het koppelt. Loop je de test op een andere dag en koppel je niet, dan krijgt een latere rustige loop van die week de test nog een keer.
- De workout op het horloge duurt zo lang als het workoutplan, ook als je planning een kortere vaste duur heeft. Dat geldt voor elke training en hoort niet bij de korte test.
- Uit `2026-11-18-korte-test.md` blijven open: de eerste loop van de week wordt gekozen zonder naar duur of manier te kijken, en is de rustige loop van vandaag al gelogd, dan staat het voorstel die dag nergens.

## Bron

Backlog I-91; review Warden en doorloop Pathfinder van 18 november, vastgelegd onder Open in `docs/beslissingen/2026-11-18-korte-test.md`. `docs/onderzoek/Drempel en submaximale test.md`, hoofdstuk 3.

## Vervangt

Niets helemaal. Haalt uit `2026-11-18-korte-test.md` in: dat elke rustige loop voor het midden kan tellen, dat een import elke dag aanneemt, dat de Briefing de 25 minuten alleen op `plannedMinutes` toetst en het horloge alleen op de duur van het workoutplan, en dat de korte test niet in het blad Je horloge staat. De rest van dat besluit geldt.

## Terugdraaien

In `shortTestDone` de dag van het log weglaten: dan telt een gekoppelde loop weer op de dag van het plan. `plannedTestLogIds` niet meer meegeven aan `shortTestLogIds`: dan telt elke rustige loop weer voor het midden. `useShortTestManual` weghalen bij de vier plekken van het blad: dan staan er weer de gewone stappen. `shortTestRunMinutes` alleen de duur van de workout laten geven: dan krijgt het horloge de test weer in een loop met een korte vaste duur. Er is geen opgeslagen vorm veranderd, dus er is niets te migreren.
