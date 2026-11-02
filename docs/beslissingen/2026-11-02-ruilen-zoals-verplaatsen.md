# Ruilen vraagt zoals Verplaatsen, met een keuze voor loslaten

Datum: 2026-11-02
Status: aangenomen

## Besluit

Een ruil die vraagt, heeft in het blad dezelfde opbouw als een verplaatsing. Botst hij (de 48 uur tussen beenzware dagen, je rustdag, te weinig tijd, twee zware beendagen achter elkaar), dan is "Liever niet" de hoofdknop en "Toch ruilen" de tweede keus. Alleen een test of een training die opzij schoof voor een vakantie vraagt gewoon Akkoord, met Liever niet links en Akkoord rechts, zoals `decideMove` daar ook doet. Wat loslaten op een training doet is een instelling: "Loslaten op een training" met Ruilen (advies) en Samen.

## Wat is vastgesteld

`engine/weekSwap.ts#decideSwap` geeft `resolved: false` bij een botsing, rustdag, te weinig tijd of `legsClose`, en `resolved: true` als alleen een test of vakantietraining de reden is. `RescheduleDialog` toont dan zoals voor elke verplaatsing de knoppen; bij een ruil heet de tweede keus "Toch ruilen". Een ruil die twee trainingen samen op een dag zet die je beter niet combineert, zegt dat stil ("Beter niet op één dag"), tijdens het slepen en in de lijst van het blad, zonder te vragen.

Lukt het wegschrijven van een ruil niet, dan blijven beide trainingen staan en zegt de melding "Dat lukte niet, er is niets geruild." zonder Ongedaan maken. Ongedaan maken van een ruil zet de twee alleen terug als ze nog precies zijn wat de ruil schreef (`storage/weekSwap.ts#undoSwap`); anders zegt de melding dat het niet meer kan en verandert er niets.

De instelling staat in Planning onder Geavanceerd, in het blad "Trainingen slepen in Week" naast de schakelaar voor het slepen (`AppSettings.dropOnTraining`, afwezig is Ruilen, `engine/dropOnTraining.ts`). Samen geeft het slepen van voor de ruil terug: de training komt erbij op die dag. Het actieblad biedt Ruilen altijd.

## Reden

Review door Warden: een ruil die botst mag niet onder een andere knop vallen dan een verplaatsing die botst, anders leert de app je twee manieren voor hetzelfde. Hier laten is de standaard; een botsing bewust toch doen is de tweede keus. Daarnaast hoort elke keuze die de app voor je maakt instelbaar te zijn (`docs/beslissingen/2026-10-22-alles-instelbaar.md`), en loslaten op een training was eerst Samen.

## Alternatieven

Liever niet links en Akkoord rechts bij elke ruil die vraagt (het eerste besluit): gekozen omdat een ruil altijd een eigen keuze is, nu afgewezen om dezelfde opbouw als Verplaatsen. Geen instelling voor loslaten: dan kon wie liever twee trainingen op één dag zet dat met slepen niet meer.

## Bron

Review van Warden op `docs/beslissingen/2026-11-02-trainingen-wisselen.md`, keuze van de coördinator.

## Vervangt

Het deel over de knoppen in `docs/beslissingen/2026-11-02-trainingen-wisselen.md` ("Liever niet links, Akkoord rechts" bij elke ruil die vraagt, en het alternatief daarover). De rest van dat besluit blijft.

## Terugdraaien

Kies Samen bij "Loslaten op een training" om het slepen van voor de ruil terug te krijgen. Voor de knoppen: `resolved` in `decideSwap` weer op `true` voor elke ruil die vraagt.
