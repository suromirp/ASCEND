# Calisthenics: een stap omhoog of omlaag als voorstel met Akkoord

Datum: 2026-11-09
Status: aangenomen

## Besluit

Haal je de toets van een ladderstap (push-up, optrekken, dip), of drie voorbije trainingen achter elkaar de onderkant niet, dan staat bovenaan de krachttraining met die oefening een kaart met het voorstel om je plan op de volgende of de lichtere stap te zetten. Liever niet links, Akkoord rechts. Pas na Akkoord verandert er iets: de oefening op die plek in je training wordt de nieuwe stap, vanaf je volgende training. Dit is F4d uit `docs/beslissingen/2026-11-09-calisthenics-ontwerp.md`. De instelling heet Stap voorstellen en staat aan.

## Hoe het werkt

Of er een stap is, beslist `engine/skillLadder.ts#ladderState`; daar verandert niets. `engine/skillStepProposal.ts#stepProposals` zoekt er per ladder de krachttrainingen bij die de oefening op de huidige stap echt bevatten (bij lichter de stap die je niet haalde) en geeft hoogstens één voorstel per ladder. Akkoord schrijft met `withStepAccepted` alle plekken in één opslag; Ongedaan maken (`withStepUndone`) zet precies terug wat er voor Akkoord stond. De stille regel in Forge (`engine/forgeLadder.ts#ladderHint`) blijft zoals hij was.

Teksten. Omhoog: "Je toets op {stap} is gehaald. Volgende stap: {naam}." en "Zet je plan op {naam}?". Omlaag: "Drie trainingen onder de onderkant van {stap}." en "Zet je plan op de lichtere stap {naam}?". Daaronder in klein: "In {training}." en "Sets en herhalingen blijven." (of "Je begint op 3 keer 5." of "op 3 keer 10 seconden." bij een overgang tussen herhalingen en een houding). Na Akkoord: "Je plan staat op {naam}. Je ziet het vanaf je volgende training; deze training blijft zoals hij is." met Ongedaan maken.

## Eigen keuzes

- Een gekozen stap staat niet in het sjabloon maar in het krachtmodel, `StrengthSettings.stepSwaps` (`engine/stepSwaps.ts`), net als een toegevoegde oefening bij Spieren voor de berg: de ingebouwde sjablonen worden bij elke start teruggezet. Per training per plek de oefening van het sjabloon (`from`) en de stap (`to`). Forge leest hem in `engine/forgeSlots.ts`. Klopt de plek niet meer met `from` (een nieuw sjabloon, een ander programma uit MacroFactor), dan geldt het sjabloon weer. Optioneel en defensief gelezen, geen hogere schemaversie en geen migratiestap: een oude back-up heeft het veld niet en een kapotte waarde valt weg. Het veld gaat mee in de back-up met de rest van het krachtmodel.
- Een krachttraining is een sjabloon met soort kracht of de rol kracht, nooit een id. Eigen gewicht (zonder sportschool) hoort er dus bij; daar staat Push-Up in.
- Staat de oefening in twee trainingen, dan noemt één voorstel ze allebei en schrijft Akkoord ze samen of geen van beide. Staat de voorgestelde stap al in een training, dan slaat het voorstel die training over (anders zou hij er twee keer in staan). Dat is hoe ik "een voorstel dat al wacht" lees: wat al gedaan is, komt niet nog eens.
- Sets en herhalingen blijven. Bij een overgang tussen herhalingen en een houding komt de onderkant van de nieuwe stap: `sets` uit de toets (3) keer 5, of keer 10 seconden. Die onderkant blijft bij een volgende stap met dezelfde meting. Komt de stap terug op de oefening van het sjabloon, dan gaat de stap weg en gelden de getallen van het sjabloon weer. Een doelgewicht en de notitie van de oude oefening gaan niet mee; het doel per set van een programma (herhalingen en RIR) wel, behalve na zo'n overgang.
- Liever niet onthoudt dit toestel per voorstel-id (ladder, van- en naar-stap) in `localStorage` (`utils/stepDeclines.ts`), net als Spieren voor de berg: het is een herinnering, geen trainingsgegeven, en staat niet in de back-up. Het geldt zonder einddatum voor die ene stap; een voorstel voor een andere stap komt wel. Alles verwijderen wist het.
- Een sessie met jouw slot (`lockLevel` 1 in `engine/weekValidator.ts`) gaat over wie de datum van een geplande sessie mag verschuiven. Het voorstel raakt geen geplande sessie en geen datum, alleen de inhoud van een training, en alleen na jouw Akkoord. Een vastgezette sessie van die training krijgt de nieuwe stap dus ook. Hetzelfde voor een tocht, vakantie, test of race: de planning ziet het krachtmodel niet.
- De kaart staat op dezelfde plek en hetzelfde moment als Spieren voor de berg: bovenaan de training, niet bij alleen kijken, niet met MacroFactor als bron en niet meer na de eerste handeling. Hoogstens één kaart tegelijk; na Liever niet komt het volgende voorstel voor die training. De eyebrow zegt "Volgende stap" of "Lichtere stap".
- De lopende sessie verandert niet: Forge houdt in een geopende sessie de stappen van het openen (`sessionStepSwaps` in `ForgeWorkout.tsx`), ook voor Ruilen en Terug naar. Zonder dat zou het voorschrift van een plek onder de al geplande rijen verschuiven. Spieren voor de berg doet dat niet zo; daar viel het minder op.
- Ongedaan maken kan op de kaart zelf, en later in het blad van de oefening met "Terug naar {oefening} in je plan" (`StepUndoRow.tsx`), zoals "Uit deze training halen" bij een toegevoegde oefening. Beide met één opslag, een grens van 8 seconden en een zichtbare uitkomst.
- De instelling staat in het blad Bij het invullen, na Band bij optrekken en dip, zodat de pagina Forge geen rij meer krijgt. Ze hangt niet aan Stappen bij calisthenics of Kracht meerekenen: het voorstel heeft geen regels in de rij nodig.

## Reden

Het ontwerp zegt dat een stap altijd een voorstel met Akkoord is. Het patroon van Spieren voor de berg bestaat al, is getest en laat de planning en de logs met rust; een tweede manier om een training te veranderen zou meer kunnen breken.

## Alternatieven

Het sjabloon zelf herschrijven: het wordt bij elke start teruggezet, en een eigen sjabloon herschrijven raakt de rollen en de duur; afgewezen. Een voorstel per training in plaats van per oefening: dan kan Akkoord de ene training wel en de andere niet raken; afgewezen. Liever niet acht weken stil zoals bij de bergspieren: een stap hangt aan je logs, niet aan de tijd, dus een ander voorstel komt vanzelf als je verder bent.

## Bron

`docs/beslissingen/2026-11-09-calisthenics-ontwerp.md` (Wat later komt, punt 3), `docs/beslissingen/2026-11-09-calisthenics-forge-rij.md`, `docs/beslissingen/2026-11-02-forge-herinrichting.md` (Spieren voor de berg), `docs/beslissingen/2026-10-27-stem-van-ascend.md`.

## Vervangt

Niets.

## Terugdraaien

Zet Stap voorstellen uit: dan komt er geen kaart meer. Gekozen stappen blijven staan tot je ze in het blad van de oefening terugzet. In code: `engine/skillStepProposal.ts`, `components/forge/StepProposalNotice.tsx` en `StepUndoRow.tsx` weghalen en `withStepSwaps` uit `engine/forgeSlots.ts`; het veld `stepSwaps` mag blijven staan, het wordt dan niet meer gelezen.
