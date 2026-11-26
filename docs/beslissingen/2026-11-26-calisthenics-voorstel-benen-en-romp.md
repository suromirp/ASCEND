# Calisthenics algemeen: de squat op één been en de L-sit als voorstel in een training

Datum: 2026-11-26
Status: aangenomen

## Besluit

Staat de squat op één been of de L-sit van het doel Calisthenics algemeen nergens in je trainingen, dan staat op de kaart onder de rij van die ladder één voorstel met Akkoord: zet de eerste passende stap als laatste oefening in één krachttraining. Liever niet links, Akkoord rechts, daarna Ongedaan maken. Dit is het eerste punt van Open in `2026-11-09-calisthenics-algemeen.md` (akkoord eigenaar 9 november, backlog "Voorstel squat op één been en L-sit"); dat besluit blijft zoals het is.

## Hoe het werkt

De beslissing staat in `engine/ladderAddProposal.ts#ladderAddProposals`. Per ladder van het doel (alleen `pistol` en `l-sit`, in `LADDER_ADD_PLACES`) is er een voorstel als geen stap van die ladder in een training staat (`ladderInTrainings`, met dezelfde plekken als Forge via `forgeSlotsFor`, ook toegevoegde oefeningen), als je geen Liever niet zei voor die ladder en als er een passende training met plek is. De startstap is `ladderState(...).current` (logs tot en met vandaag, ook een stap die je via Ruilen deed), anders de eerste stap.

Welke training: een krachttraining (soort kracht of rol kracht, zoals het stapvoorstel, dus ook Eigen gewicht) waar `canAddExercise` plek geeft. De squat op één been gaat alleen naar een training met beenwerk (minstens één oefening met `loadsLegs`), die met het meeste beenwerk eerst. De L-sit gaat naar elke krachttraining met plek, die met het minste beenwerk eerst, zodat de beendag niet langer wordt. Een training die vanaf vandaag gepland staat gaat voor (`scheduled`): Benen B bestaat nog voor oude logs maar staat niet meer in je week. Daarna de naam. Geen plek: geen voorstel, en de rij zegt "Staat nog niet in je trainingen.".

Akkoord gebruikt het mechanisme van Spieren voor de berg zonder iets nieuws: `withAddedExercise` zet de oefening-id in `StrengthSettings.addedExercises` van die training. Het sjabloon, de geplande sessies, de datums en de logs veranderen niet. Forge zet hem achter de oefeningen van de training (`addedSlotsFor`). Ongedaan maken (`withLadderAddUndone`) zet de lijst van die training precies terug op wat er voor Akkoord stond. Beide zijn één opslag met een grens van 8 seconden (`components/forge/stepUndo.ts#saveWithLimit`) en een zichtbare uitkomst; een late gelukte opslag telt alsnog. Na Akkoord staat de ladder in je training, dus de rij zegt "Nog geen training gelogd." en het voorstel komt vanzelf niet terug.

Teksten (`ladderAddText`): "Zet Assisted Pistol Squat in Benen A (zwaar)?" en in klein "Sets en herhalingen: 3 keer 5 per been, als laatste oefening." (bij de L-sit "3 keer 10 seconden"). Na Akkoord: "{oefening} staat in {training}. Je ziet het de volgende keer dat je die training opent.", na Ongedaan maken "{training} is weer zoals hij was.". De rij erboven zegt het droge feit al ("Staat nog niet in je trainingen."), dus het voorstel begint met de vraag.

## Eigen keuzes

- Sets en herhalingen: een toegevoegde ladderstap krijgt de onderkant van zijn stap, de sets van de toets keer 5 of keer 10 seconden (`addedPrescription` kijkt nu naar `Exercise.ladder`), zoals het stapvoorstel bij een overgang. Andere toevoegingen houden hun bereik. Een ladderstap die Spieren voor de berg ooit zou toevoegen begint daardoor ook op 3 keer 5 in plaats van 10 tot 12; dat ligt boven de toets van 8 en hoort dus niet bij een ladder.
- Eén voorstel tegelijk op de kaart (eerst de squat op één been, dan de L-sit): één mint accent op het scherm. Na Liever niet of op een volgend bezoek komt het andere.
- "Eén keer": Liever niet onthoudt dit toestel per ladder in `localStorage` (`utils/ladderAddDeclines.ts`, sleutel `ascend.ladder.erbij.nee`), zonder einddatum en voor elke stap van die ladder. Net als `utils/stepDeclines.ts` niet in de back-up; Alles verwijderen wist het. Ongedaan maken is geen Liever niet: staat de ladder daarna nog nergens, dan komt het voorstel een volgende keer terug.
- Instelling: dit valt onder de bestaande instelling Stap voorstellen (`stepProposal`, blad Bij het invullen); staat die uit, dan komt er geen voorstel. De uitleg van die instelling heeft er een punt bij. Geen nieuwe instelling: het is hetzelfde soort voorstel over een ladderstap in je training.
- Opslag: geen nieuwe vorm, geen hogere schemaversie en geen migratiestap. `addedExercises` bestond al, is optioneel en wordt defensief gelezen; een oude back-up zonder het veld leest zoals voorheen en krijgt het voorstel.
- `planStartSteps` kreeg `addedExercises` in zijn type: hij gaf het model al door aan `forgeSlotsFor`, dus een toegevoegde ladderstap telde al als "in je trainingen"; alleen het type zei het niet.
- Het voorstel staat op de kaart op Ascend, niet in Forge en niet in de weekterugblik: daar vraagt de rij erom. Geen nieuw scherm.

## Reden

Het besluit van 9 november liet open hoe de squat op één been en de L-sit in een training komen: Calisthenics per training kent alleen ladders voor het bovenlichaam en de beendag blijft. De eigenaar wilde een voorstel met Akkoord. Spieren voor de berg had al een getest mechanisme dat een oefening toevoegt zonder sjabloon of planning te raken; een tweede manier zou meer kunnen breken.

## Alternatieven

Een stap in het sjabloon of in `stepSwaps`: er is geen plek om te ruilen (geen oefening van de ladder in de training), en `stepSwaps` vervangt een plek. Calisthenics per training uitbreiden met de beendag: dat raakt de planning en is afgewezen in `2026-11-09-calisthenics-ontwerp.md`. Beide ladders tegelijk tonen: twee mint knoppen op één scherm.

## Open

- Een toegevoegde ladderstap krijgt geen stapvoorstel: `skillStepProposal.ts` slaat plekken met `plus:` over. Haal je de toets op Assisted Pistol Squat, dan zegt de kaart "Toets gehaald. Volgende stap: ..." en kun je in Forge ruilen binnen de familie, maar de toevoeging zelf blijft op de eerste stap. Een voorstel dat de id in `addedExercises` vervangt is een eigen stap.
- Een toevoeging gaat niet in het concept van een open Forge-sessie (zoals bij Spieren voor de berg): opent een training van vandaag opnieuw na herladen, dan kan de stap er al bij staan. De tekst zegt daarom "de volgende keer dat je die training opent".
- Het tweede punt van Open van 9 november (een knop naar Calisthenics per training) blijft open.

## Bron

`docs/beslissingen/2026-11-09-calisthenics-algemeen.md` (Open), `docs/beslissingen/2026-11-09-calisthenics-stapvoorstel.md`, `docs/beslissingen/2026-11-02-forge-herinrichting.md` (Spieren voor de berg), `docs/beslissingen/2026-11-09-stem-van-ascend.md`, backlog "Voorstel squat op één been en L-sit" (akkoord eigenaar 9 november).

## Vervangt

Niets. Het besluit van 9 november blijft staan; dit vult het eerste punt van Open in.

## Terugdraaien

Zet Stap voorstellen uit: dan komt er geen voorstel. Een toegevoegde stap haal je weg met Uit deze training halen in het blad van de oefening in Forge. In code: `engine/ladderAddProposal.ts`, `components/ascend/useLadderAddProposal.ts`, `LadderAddNotice.tsx` en `utils/ladderAddDeclines.ts` weghalen en de prop `below` uit `GeneralStrengthCard.tsx`. `addedExercises` blijft zoals het was.
