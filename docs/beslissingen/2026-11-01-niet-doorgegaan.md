# Een training die niet doorging

Datum: 2026-11-01
Status: aangenomen

## Besluit

Een geplande training die een paar dagen voorbij is zonder log (advies: 2 dagen, instelbaar op 1, 2 of 3) krijgt één korte vraag op Vandaag: "Niet gedaan?" met Niet gedaan (de rij gaat op overgeslagen, een status), Toch gedaan (het gewone invullen) en Niet nu. Hoogstens één vraag tegelijk, de oudste eerst, niet ouder dan twee weken. Staat er binnen twee dagen ervoor of erna een log van het horloge of MacroFactor van dezelfde soort die nergens aan hangt, dan komt eerst een voorstel om die log te koppelen ("Je rustige duurloop van dinsdag staat op woensdag in je horloge. Hoort die bij elkaar?"), met Akkoord en Liever niet. De instelling Training die niet doorging (Planning, onder Geavanceerd) kent drie keuzes: Vragen (advies), Zelf overslaan en Niets doen, plus het aantal dagen en de schakelaar Log op een andere dag koppelen.

## Reden

In een back-up van de eigenaar telden 22 van de 34 trainingen van de laatste acht weken als gemist, veel nog op gepland zonder log. Soms was er wel getraind, maar kwam de log van het horloge of MacroFactor op een andere dag of zonder koppeling binnen. Week en de cijfers zeiden dan iets wat niet klopte. Eén vraag op het juiste moment houdt de week eerlijk zonder te zeuren, en het koppelvoorstel herstelt wat de import niet kon weten.

Zo werkt het (`engine/missedTraining.ts#planMissed`, puur en getest):

- Telt mee: voorbij (de training van vandaag nooit, ook niet voor een koppelvoorstel), niet overgeslagen, geen log, geen rustdag (Herstel), niet op een ziektedag, niet ouder dan 14 dagen. Een rij van een vakantie of tocht (`leave`) krijgt geen vraag en gaat nooit vanzelf. Een training die al in een ander voorstel op Vandaag staat (MISSED-CATCH-UP, TEST-MAKE-ROOM) krijgt geen tweede kaart.
- De soort komt uit het sjabloon en de sport (`templateSport`, `logSport`, kracht via het type), nooit uit een lijst met sjabloon-id's. Een test of wedstrijd (rol `test` of `race`) koppelt alleen aan een log van een test of wedstrijd.
- Een log hoort bij de dichtstbijzijnde training van dezelfde soort zonder log; alleen een log die niet met de hand is ingevuld en nog nergens aan hangt.
- Zelf overslaan raakt alleen wat de automatische planning ook zelf mag raken (`lockLevel` zoals op de dag zelf is 3): een test, een wedstrijd en wat jij of een voorstel vastzette krijgen toch de vraag. Het gebeurt nooit stil: de meldingsbalk zegt wat er overgeslagen is, met Ongedaan maken. Na Ongedaan maken doet ASCEND het voor die training niet nog eens en vraagt er ook niet meer naar.
- Niet nu laat die training rusten en geeft die dag geen volgende vraag. Liever niet op een koppelvoorstel onthoudt dat paar.

Historie: overslaan is een status van de PlannedSession; er komt nooit een log bij en er gaat er geen weg. Koppelen is een vijfde uitzondering op "logs nooit herschrijven", naast de vier in `docs/architectuur/historie-en-logs.md`, op verzoek van de eigenaar (in de backlog: "koppelt hij als voorstel aan de geplande training"). Net als de andere vier gebeurt het alleen op jouw verzoek en zet zijn eigen functie het terug. Het is de lichtste van de vijf: de vier andere vervangen gemeten getallen, deze vult alleen een verwijzing die leeg was (`plannedSessionId`) wordt gevuld, op een log die nergens aan hing, en alleen na Akkoord. Het moment staat erbij in `SessionLog.linkedLater`, zodat te zien is dat de koppeling later kwam en Ongedaan maken precies de verwijzing en dat veld weer weghaalt. Een log die vanaf het begin gekoppeld was, of een log die je zelf invulde, wordt nooit omgezet, gekoppeld of losgemaakt (`linkLog`, en nog eens in `storage/missedTraining.ts#linkLogNow`, dat ook een weggehaalde of overgeslagen training weigert). Datum, duur en alle cijfers van de log blijven zoals ze waren.

Opslag: drie nieuwe sleutels in de instellingen (`missedTraining`, `missedTrainingDays`, `missedLink`, afwezig is het advies) en het optionele veld `SessionLog.linkedLater`, met `storage/migrations.ts#migrateLogLinkedLater` en de controle in `storage/backup.ts`. Het schemanummer van de back-up beweegt niet; een oud bestand leest zoals het was. Wat dit toestel van je antwoorden onthoudt (Niet nu, Liever niet, wat al eens vanzelf ging) staat in de meta-opslag onder `missedTraining`, niet in je planning. Het gaat mee in de back-up als `payload.missedTraining`, zoals de antwoorden op adviezen, en wordt bij importeren gelezen via `resolveMissedMemory`; een oud bestand zonder het veld laat het toestel zoals het was. `planGolden.test.ts` beweegt niet.

Vervolgstap: MISSED-CATCH-UP (`engine/adviceEngine.ts`) stelt nu inhalen of laten vervallen voor zonder te kijken of er een losse log van het horloge of MacroFactor bij de gemiste training hoort. Beter is eerst nagaan of er een log te koppelen is (`planMissed`), en pas daarna inhalen voorstellen. Zolang dat niet zo is, krijgt een training die in dat advies staat geen eigen kaart.

## Alternatieven

- Eén kaart voor alle trainingen samen met "Overslaan" (het ontwerprapport instellingen). Niet gekozen: één training per keer is sneller te beantwoorden en laat ruimte voor Toch gedaan per training. De oudste eerst houdt het rustig.
- Na een paar dagen alles vanzelf op overgeslagen als standaard. Niet gekozen: dan verandert de app iets zonder dat je het vroeg. Zelf overslaan blijft een keuze, met een melding en Ongedaan maken.
- De koppeling apart bewaren, naast de log, in plaats van de verwijzing op de log. Niet gekozen: elk scherm en elke regel leest `plannedSessionId`; een tweede plek zou overal een tweede vraag betekenen en kan uit de pas lopen.
- Een gemiste training vanzelf verplaatsen. Niet gekozen: inhalen blijft jouw tik (`2026-10-29-gemiste-training-inhalen.md`).
- De rij Training die niet doorging tussen de gewone rijen van Planning. Niet gekozen: Planning zit op het plafond van twaalf rijen (`2026-10-26-instellingen-opruimen.md`); onder Geavanceerd staat hij met het advies als standaard. Komt de bundel Testloop uit het ontwerprapport er, dan kan hij naar boven.

## Bron

Een back-up van de eigenaar van 31 oktober 2026 (alleen de telling, geen gegevens), `docs/visie/Ontwerprapport instellingen.md` (Training die niet doorging, groep Planning) en de opdracht van de eigenaar via de coördinator.

## Vervangt

Niets.

## Terugdraaien

Zet de instelling op Niets doen en de schakelaar Log op een andere dag koppelen uit: dan verschijnt er niets meer en gebeurt er niets vanzelf. In de code: `MissedTrainingCard` uit `pages/Today.tsx` halen. Wat al overgeslagen of gekoppeld is, blijft staan; een koppeling haal je per log weg met `engine/missedTraining.ts#unlinkLog` (alleen logs met `linkedLater`).
