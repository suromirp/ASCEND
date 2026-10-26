# De Ascend-tab als doelen is gebouwd (ronde 2c)

Datum: 2026-10-26
Status: aangenomen

## Besluit

De tab uit `2026-10-26-ascend-tab-als-doelen.md` staat er. Wat erbij kwam of anders werd:

1. **Alles over een doel zit in het doelblad.** De drie puntjes rechtsboven in het blad openen het menu: Doel aanpassen, Label wijzigen, Hoger en Lager in de lijst en Archiveren. Archiveren is geen losse rode tekst meer. Het label heeft een eigen blad met drie keuzes met elk één regel; onder het gekozen label staan hoogstens drie korte regels met wat het voor dit doel doet.
2. **Doel aanpassen is hetzelfde blad als Doel toevoegen, stap 2.** De vragen komen uit `data/goalKinds.ts` (`engine/goalDraft.ts#questionsFor`): bij een hardloopwedstrijd de afstand als keuze (5, 10, halve marathon, marathon of eigen afstand), de doeltijd met het tempo eronder, de datum en de naam. Geen losse eisen met een sport per regel. Bij een tocht staat "Slapen: in hutten of met tent"; wisselen verandert de soort tussen `trek_hut` en `trek_tent` en loopt via het voorstel met Akkoord. Eisen die het blad niet vraagt blijven zoals ze waren (`applyGoalEdit`), ook de mijlpalen, de datum, het label en de aanvaarde botsingen.
3. **De aparte Marathondoel-kaart is weg.** Een marathon is een hardloopwedstrijd van 42,2 km. Het oude marathondoel (naam "Marathon", `isMarathonGoal`) houdt zijn instellingen (`marathonRaceType`, datum en doeltijd) bij elke aanpassing in hetzelfde voorstel gelijk.
4. **`/ascend/doelen` stuurt door naar `/ascend`.** De oude pagina met GR5-kaart, Marathondoel, Tussendoelen, Doelfocus en seizoenkaart is weg. De Tochten (vrije periodes met een tocht) en het Krachtblok staan als twee rijen op de tab, in een blad, tot een tocht echt een doel van de soort Trektocht is. Krachtprogressie en Trainingsverdeling staan nu op Je stand.
5. **Volgorde.** `TrainingGoal.order` (optioneel, met een regel in `migrateTrainingGoal`) bewaart de plek in de lijst. Het label groepeert, de volgorde beslist binnen een label en bij een botsing wie wijkt (`goalConflicts` leest `order`). Alleen een volgorde die een botsing verschuift of een ander label geeft, is een voorstel; een gewone verplaatsing slaat op met "Ongedaan maken".
6. **Slepen** met een greep van 44 px, ook met het toetsenbord (spatie, pijltjes, Escape). Waar je loslaat bepaalt het label (`engine/goalList.ts#moveGoal`). De kaarten klappen tijdens het slepen niet in.

## Bewust nog niet

- De tegel Combinatie bestaat niet, want er is geen soort voor in `data/goalKinds.ts`.
- Geavanceerde eisen achter "Meer" zijn er niet; het blad toont alleen de vragen van de soort.
- Een instelling voor de seizoenstrook is er niet; hij staat er zodra er een doel met datum is.
- De volgende stap is de zwaarste training van de komende twee weken en staat bij het eerste doel, niet per doel.
- Een nieuwe installatie plant niets: "Doel toevoegen" op de lege tab brengt je naar Vandaag, waar de eerste vragen staan (`2026-10-25-eerst-vragen-dan-plannen.md`).

## Terugdraaien

Revert van de commit van ronde 2c. `TrainingGoal.order` is optioneel en onschadelijk als hij blijft staan.
