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
