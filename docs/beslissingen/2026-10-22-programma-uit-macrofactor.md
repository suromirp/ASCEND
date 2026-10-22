# Het trainingsprogramma uit MacroFactor vult de krachtsjablonen

Datum: 2026-10-22
Status: aangenomen

## Besluit

Staat er in een MacroFactor-export een trainingsprogramma (het werkblad Training Programs), dan leest ASCEND het (`src/engine/macrofactorProgram.ts`) en stelt het voor de krachtsjablonen ermee te vullen: per training de oefeningen, en per set het herhalingenbereik en de RIR, per week van het programma. Dat is een voorstel met Akkoord op de pagina MacroFactor inlezen (`src/components/forge/ProgramProposal.tsx`), met per dag van het programma de keuze welke ASCEND-training het wordt (of Niet gebruiken) en welke week van het programma deze week is. Pas na Akkoord wordt het bewaard, in `AppSettings.strengthModel.program`.

Het verandert alleen welke oefeningen een krachtsjabloon toont. De planning blijft zoals ASCEND hem maakt (dagen, rustdagen, de 48-uursregel), en geen enkele log verandert. Loslaten kan in de instellingen onder Forge, kopje In de sportschool; daarna tonen de sjablonen weer hun eigen oefeningen.

## Hoe het werkt

- Het werkblad: een regel Program met de naam en het aantal weken (Cycles), per week een kop met Exercise, Skipped, Notes en per set Type, Rep Range, RIR en Rest, dan de dagen. Een regel met een naam in de eerste kolom begint een dag, een regel zonder voegt een oefening toe. Kolommen worden op naam gevonden, nooit op plek. Een overgeslagen oefening (Skipped Yes) en een opwarmset komen er niet in; opwarmen doet Forge zelf.
- "9+" met Failure Set is een set tot falen vanaf 9 herhalingen; in het workoutscherm staat dan "9+" en 0 over.
- De naam van de sportschool achter "@" wordt nooit bewaard: die kan zeggen waar iemand woont of werkt.
- Het voorstel koppelt in volgorde een beendag (de meeste oefeningen belasten de benen) aan een beensjabloon en een andere dag aan een bovenlichaamsjabloon, de geplande eerst. Wat je bij hetzelfde programma eerder koos, gaat voor.
- De sjablonen zelf blijven in de database zoals ze zijn (ze worden bij elke start gelijkgezet met het standaardprogramma). Het programma ligt eroverheen: `withProgramExercises` in `AppDataContext` geeft de app de sjablonen met de oefeningen van de week van vandaag, en het workoutscherm vraagt de week van de dag van de training (`programExercisesFor`).
- Elke maandag schuift het programma een week op. Na de laatste week begint het weer bij week 1.
- In het workoutscherm krijgt elke set het bereik en de RIR van het programma. Het gewicht volgt uit de geschatte kracht van Forge: per set het zwaarste gewicht waarbij je de onderkant van het bereik nog haalt met de gevraagde RIR, met de vermoeidheid per eerdere set. Een set waarvan bereik en RIR gelijk zijn aan die van Forge zelf, houdt het gewicht van Forge met zijn grenzen per training (KR-5). De korte reden zegt dan: "Je programma vraagt nu 3 sets van 4-6, 1, 2 en 3 over; het gewicht volgt uit je geschatte kracht."

## Reden

De eigenaar traint met een programma uit MacroFactor met golvende weken (4 tot 6, dan 7 tot 9, dan 2 tot 4, en een rustweek) en een eigen RIR per set. Zonder dat programma toont ASCEND de grove eigen sjablonen ("Squat / Leg press, 4 x 5-8") en klopt het voorschrift in de sportschool niet met wat hij moet doen.

## Alternatieven

De sjablonen in de database overschrijven: gaat bij de volgende start verloren (`ensureDefaultTemplates`) en kan niet netjes terug. Alleen de eerste week overnemen: mist de golving, die het programma juist zijn werking geeft. De dagen van MacroFactor ook als planning overnemen: botst met de planning rond lopen en tochten, en die blijft van ASCEND.

## Bron

Het werkblad Training Programs uit een echte export van de eigenaar (alleen lokaal bekeken om het formaat te begrijpen, niet in de repo); de tests gebruiken een nagemaakt programma. Besluiten `2026-10-22-forge-workoutscherm.md`, `2026-10-22-forge-kracht-meerekenen.md` en `2026-10-22-macrofactor-leidend-voor-kracht.md`.

## Opgeslagen vorm

`StrengthSettings.program` is optioneel en additief en gaat door `normalizeStrengthSettings` (en dus door de back-upimport): een programma zonder bruikbare dag, een onzinnig bereik of een kapotte datum valt weg. Geen nieuwe back-upversie. `ExercisePrescription.setTargets` is een optioneel veld voor de sets per oefening en wordt nergens opgeslagen.

## Vervangt

Niets.

## Terugdraaien

In de instellingen onder Forge op Programma loslaten tikken. In code: `withProgramExercises` niet meer toepassen in `AppDataContext`; het bewaarde programma doet dan niets.
