# Calisthenics als ladder: ontwerp en eerste bouwstap

Datum: 2026-11-09
Status: aangenomen

## Besluit

Calisthenics komt in ASCEND als ladders: per bewegingspatroon een lijst stappen, elke stap een eigen oefening met een eigen id. Vooruitgang is twee dingen: welke stap, en hoeveel herhalingen of seconden op die stap. Een stap omhoog is altijd een voorstel met Akkoord, nooit stil. Deze ronde (F4a) bouwt alleen de grond: optionele modelvelden, drie ladders (push-up, optrekken, dip) met de oefeningen die daarvoor ontbreken, en de zuivere engine die uit je logs de huidige stap en de toets afleidt. Wat de gebruiker ziet (de rij in Forge, seconden, band, het doel Vaardigheid, de Ascend-tab, de planner) volgt in aparte stappen, in de volgorde onder "Wat later komt".

## Hoe het werkt

Een ladder is gegevens (`data/skillLadders.ts`): id, naam, soort (`balance` of `strength`) en stappen in volgorde van licht naar zwaar. Een stap heeft een `exerciseId`, een toets en een korte regel. De toets is `{ kind: 'reps'; sets; reps }` of `{ kind: 'hold'; sets; seconds }`. Een stap begint op de onderkant (3 keer 5, of 3 keer 10 seconden) en is gehaald op de toets (3 keer 8, of 3 keer 30 seconden), met nette vorm. Dat is de regel van de Recommended Routine van r/bodyweightfitness, in eigen woorden (docs/onderzoek/Calisthenics in apps en wetenschap.md).

Logs blijven append-only. Je logt op de variant die je echt deed (een eigen oefening per stap), dus een ladder die later verandert herschrijft niets. Een band is een eigen keuze op de set (`band`: licht, middel, zwaar), geen negatief gewicht, want de hulp verschilt per band. Extra gewicht is gewoon `weightKg`, met `bodyweightFraction` voor de systeemlast zoals nu.

Modelvelden, allemaal optioneel en aanvullend. `Exercise`: `measure` (`reps` of `hold`, afwezig is reps), `ladder` (`{ id, step }`), `perSide` (herhalingen per kant), `assist` (`band`). `SetLog`: `seconds` (een houding; dan staat `reps` op 1 zodat alles wat herhalingen telt blijft werken), `band`, `clean` (afwezig is onbekend). Een oude back-up leest gelijk; de schemastap volgt het patroon van `repsAsked` en `weightKgAsked`.

De push-upladder volgt de meting van Wurm en Ebben (2010) als deel van je gewicht: handen 60 cm hoog 0,41, op de knieën 0,49, handen 30 cm hoog 0,55, gewoon 0,64, voeten 30 cm hoog 0,70, voeten 60 cm hoog 0,74. Dat is één congresstudie (waarschijnlijk), dus de getallen staan als `bodyweightFraction` met een regel dat het een schatting is. De knie-push-up is lichter dan de push-up met de handen op een lage bank; de volgorde in de ladder volgt de meting, niet het gevoel.

De engine (`engine/skillLadder.ts`, puur, deterministisch, geen AI) levert uit de logs: de huidige stap per ladder (de zwaarste stap waarop je de onderkant van de toets haalde), of de toets gehaald is (drie werksets op de bovenkant met nette vorm, of `clean` onbekend), en het voorstel voor de volgende stap. Haal je de onderkant drie trainingen achter elkaar niet, dan is het voorstel de lichtere stap. Een houding telt in seconden; een set zonder `isWorkSet` telt nooit.

## Reden

Alle apps die dit goed doen (Caliverse, de Recommended Routine, Calimove) werken met ladders en een toets per stap. Het past op wat ASCEND al heeft (de rugzakladder en de mijlpalen van de GR5), het houdt de planner deterministisch en de historie onaangeroerd, en de toets is eenvoudig genoeg om uit te leggen: drie keer de bovenkant met nette vorm. Een push-up met de juiste zwaarte bouwt ongeveer evenveel kracht als bankdrukken; voor de berg blijven benen met last nodig, dus calisthenics vult bovenlichaam, romp en grip aan en vervangt de beendag niet.

## Alternatieven

Een vrij veld "niveau" bij een oefening: logs zouden dan van betekenis veranderen als een ladder wijzigt; afgewezen. Een band als negatief gewicht: schijnprecisie; afgewezen. Alles in één keer bouwen: de opdracht wordt dan te groot voor één controle (de skill `werkverdeling` zegt hoogstens een uur per stap). De handstand en de andere vaardigheden meteen: er zijn geen tekeningen voor en de toetsen zijn praktijk, geen onderzoek; later.

## Wat later komt (in deze volgorde, elk een eigen stap met eigen controle)

1. De rij voor een stap in Forge: "Stap 4 van 6", de toets eronder, en een tik naar lichter of zwaarder (Cartographer eerst).
2. Seconden voor een houding (met de bestaande klok van Forge) en "Ging het netjes?" na een houding; de RIR-bolletjes blijven voor herhalingen. Band en extra gewicht in de rij.
3. Het voorstel voor een stap omhoog of omlaag in een template, met Akkoord (opus, met review).
4. Doelsoort `skill` en mijlpaalsoort `skillStep` met migratie; de ladder op de Ascend-tab zoals de rugzakladder.
5. De overige ladders (squat op één been, handstand, handstand push-up, L-sit, front lever, muscle-up) als gegevens, met eigen tekeningen onder CC BY-SA 4.0 waar ze ontbreken.
6. De planner: calisthenics als trainingssoort en de keuze kracht, calisthenics of samen per training. Opus, `planGolden.test.ts` beweegt niet.
7. Instellingen (volgende stap voorstellen, toets 3 of 1 set, de vraag "Ging het netjes?") komen mee bij de stap waarin ze iets doen; een functie zonder instelling is niet af.

## Bron

Backlog, "Calisthenics, los of naast krachttraining" (wens van 7 november). `docs/onderzoek/Calisthenics in apps en wetenschap.md` en `docs/onderzoek/Uitleg bij oefeningen en open bronnen.md`.

## Vervangt

Niets.

## Terugdraaien

De velden zijn optioneel: zonder ladders en zonder de nieuwe oefeningen werkt alles als voorheen. In code: `data/skillLadders.ts` en `engine/skillLadder.ts` weghalen; de optionele velden mogen blijven staan.

## Stand

Gebouwd: F4a (de grond: modelvelden, drie ladders met hun oefeningen, `engine/skillLadder.ts`). Eigen keuzes in deze stap:

- Geen hogere schemaversie. Het patroon van `repsAsked` en `weightKgAsked` hield de versie ook gelijk: de velden zijn optioneel, een oudere app laat ze op de set staan en verliest dus niets. `migrateLogSetSkill` in `storage/migrationsLogs.ts` (via `migrations.ts`, in de keten van `backupNormalize.ts`) laat een kapotte waarde vallen: `seconds` alleen een eindig getal boven 0 tot 3600, `band` alleen licht, middel of zwaar, `clean` alleen waar of onwaar.
- De push-up houdt `bodyweightFraction` 0,65 (de meting zegt 0,64), want de uitkomsten van het krachtmodel voor bestaande oefeningen bewegen niet. Voeten hoog is de stap op 30 cm (0,70). Diamond en archer zijn niet gemeten en staan op 0,65 als schatting; de houdingen hebben geen fractie.
- Nieuwe ids: `incline-push-up-high`, `knee-push-up`, `incline-push-up`, `decline-push-up`, `diamond-push-up`, `archer-push-up`, `dead-hang`, `scapular-pull-up`, `weighted-pull-up`, `support-hold`, `negative-dip`, `weighted-dip`. Hergebruikt: `push-up`, `negative-chin-up` (de negatieve pull-up), `pull-up`, `dip`. De bandstap uit het onderzoek zit niet in de ladder (niet in de opdracht); `assist` bestaat als veld maar geen oefening gebruikt het nog.
- Namen met extra gewicht heten "Pull-Up With Added Weight" en "Dip With Added Weight": de aliassen "Weighted Pull-Up" en "Weighted Dip" horen al bij `pull-up` en `dip` en blijven daar, anders verandert het inlezen uit MacroFactor.
- De stap telt vanaf 1. De plek op de ladder (`Exercise.ladder`) komt uit `data/skillLadders.ts` (`LADDER_PLACE`), zodat er één bron is. Een stap met extra gewicht heeft in de toets `addedKg` 2,5: alleen een set met minstens dat gewicht telt voor die stap.
- Families: de push-upvarianten in `push_up`, diamond apart (`close_push_up`, zoals `close_press`), negatieve dip en dip met gewicht in `dip`, pull-up met gewicht in `vertical_pull` met de nieuwe nuance `added` ("met extra gewicht"); dead hang, scapular pull-up en steunhouding elk een eigen familie. De twaalf nieuwe oefeningen staan in `FAMILY_ONLY` (`data/exerciseFamilies.ts`): Ruilen biedt ze alleen binnen hun familie, nooit in "Zelfde spier, anders", anders duwen ze Dips en Push-Up uit de lijst bij bankdrukken. Dips en Push-Up hebben nu wel echte vervangers (hun ladderstappen); dat veranderde een test.
- De engine: een training is het laatste log van de dag met sets op de ladder; de huidige stap is de zwaarste met de onderkant in de laatste training die ergens de onderkant haalde; de toets telt in de laatste training op die stap; een set met `clean: false` telt voor onderkant en toets niet. Drie voorbije trainingen achter elkaar zonder de onderkant op de zwaarste stap van de laatste voorbije training geeft de lichtere stap; een training van vandaag is geen misser, maar haalt hij die onderkant, dan vervalt het voorstel.

Na de review: een ladderstap in een bestaande familie staat in Ruilen alleen bij wie op dezelfde ladder staat (anders kreeg Assisted Pull-Up de stap met extra gewicht als aanbevolen vervanger); een log met alleen opwarmsets haalt een eerder log van dezelfde dag niet uit de ladder; bij de archer push-up is één set beide kanten. Open voor F4b en F4d: een eigen nuance voor de decline push-up (voeten hoog) en een import "Weighted Pull-Up" op de stap met gewicht.
