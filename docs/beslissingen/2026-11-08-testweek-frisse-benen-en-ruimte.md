# Een testweek: frisse benen en ruimte tussen zware dagen samen

Datum: 2026-11-08
Status: aangenomen

## Besluit

In de week voor een test of wedstrijd kiest de planner één oplossing die "frisse benen voor de test" en "genoeg ruimte tussen zware dagen" allebei haalt, en houdt die vast. Een beendag die de weekcontrole kort maakte voor de test blijft kort op zijn dag: het raceblok zet hem niet meer terug als oude ruil (`engine/raceBlock.ts#restoreLegSwaps`, `beforeTestOrRace`). Lukt het de planner niet zelf, dan blijft het een zorg in Week, en het voorstel daarbij mag als laatste keuze de test zelf naar een andere dag van die week zetten, met Akkoord (`engine/weekFixProposal.ts#planWeekFix`, TEST-FRESH).

Daarbij:

1. "Voor een test" is hier: de test of wedstrijd ligt na de korte beendag en hoogstens 7 dagen na de dag waar die beendag terug zou gaan. Dezelfde 7 dagen als waarover de weekcontrole frisse benen telt (`engine/scheduler.ts#findHeavyConflicts`). Een overgeslagen test telt niet.
2. Een oude ruil uit de tijd van voor het merkteken gaat buiten zo'n week nog steeds terug, zoals eerst.
3. In het voorstel gaat alleen een test, nooit een wedstrijd. Eerst wat jij of een voorstel voor de test zette (zoals eerst), dan de test naar een lege dag, dan de test naar een dag waar een training van het systeem plaats voor maakt.
4. De planning zelf verplaatst een test nooit; dat blijft een voorstel met Akkoord.

## Reden

De eigenaar zag "Planning bijgewerkt" telkens terugkomen (5 november). Nagespeeld met nagemaakte data: de weekcontrole maakte Benen A kort voor de test (TEST-FRESH), het raceblok zag een korte beendag vóór een bovenlichaamdag en zette hem vol en een dag later terug, en de weekcontrole schoof daarna weer. Zo ging het om de beurt in elke ronde; welke stand overbleef hing af van het aantal beurten, en een tweede ronde veranderde weer iets. De melding was al stil gemaakt (alleen een netto verandering telt), de botsing zelf niet.

## Alternatieven

- In de planningsronde een lus herkennen en dan stoppen. Afgewezen: de stand waarop je stopt is voor het raceblok geen eindstand, dus de volgende ronde begint opnieuw.
- Een merkteken op de beendag die de weekcontrole kort maakte. Afgewezen: een nieuw veld in de opgeslagen vorm voor iets wat uit de week zelf te lezen is.
- Bij het terugzetten de beenindex van de test uitrekenen. Afgewezen: het raceblok heeft de logs niet, en de oude ruilen zijn bijna allemaal al teruggezet; de eenvoudige regel is voorspelbaar.

## Bron

`docs/backlog.md`, "Weekcontrole die heen en weer schuift" (5 november). Scenario met nagemaakte data in `src/engine/testWeekFreshSpacing.test.ts`.

## Vervangt

Niets.

## Terugdraaien

Haal de regel met `beforeTestOrRace` in `restoreLegSwaps` weg en de twee regels met `testMay` in het TEST-FRESH-geval van `planWeekFix`. Er is niets opgeslagen dat terug moet.
