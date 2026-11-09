# Calisthenics: algemeen sterk met eigen gewicht

Datum: 2026-11-09
Status: aangenomen

## Besluit

Het doel Calisthenics begint met een keuze: Algemeen sterk met eigen gewicht (het advies en de standaard) of Eén vaardigheid. Algemeen volgt vijf basisladders tegelijk (push-up, optrekken, dip, squat op één been, L-sit), zonder datum. Op de Ascend-tab staat per ladder de stap waar je nu op traint, met één zin samen. Eén vaardigheid blijft zoals het was.

## Hoe het werkt

Model: `SkillGoal` krijgt het optionele veld `general` met `ladderIds`, `startDate` (de dag van Akkoord) en `baseline` (per ladder de stap bij de start, 0 als er toen geen training was). Een algemeen doel heeft `ladderId: 'algemeen'`. Dat is bewust geen bestaande ladder: een oudere versie van de app verbergt het doel dan en bewaart het ongewijzigd, en alle code van de vaardigheid (`liveSkillGoals`, de gehaalde stappen) slaat het over.

De berekening staat op één plek: `engine/goalReadinessFor.ts#generalReadinessFor`. Per ladder leest die `ladderState`, dus dezelfde regels als Forge en de vaardigheid. De rij zegt de stap ("Stap 4: Pull-Up.") en één regel: de toets, "Toets gehaald. Volgende stap: ...", de lichtere stap, "Nog geen training gelogd." of "Staat nog niet in je trainingen.". De samenvattende zin telt de ladders die hoger staan dan bij de start: "2 ladders een stap hoger dan op 20 okt.". Voor een ladder zonder training bij de start telt de stap van je eerste training als begin (`generalBaseline`), zodat een eerste Pull-Up op stap 4 niet meteen als hoger telt.

Toevoegen: Doel toevoegen, de tegel Calisthenics, dan het blad met de twee keuzes (`CalisthenicsChoiceSheet.tsx`), dan het voorstel met Akkoord of Liever niet. Akkoord schrijft alleen het doel. Weghalen zet `removedAt`, zoals bij de vaardigheid. Er is hoogstens één algemeen doel; staat er al een, dan is die keuze uitgegrijsd met "Al een doel".

Forge: het stapvoorstel met Akkoord (`engine/skillStepProposal.ts`) werkte al per ladder en is niet veranderd. Het geldt voor elke ladder waarvan een stap in een van je krachttrainingen staat.

Migratie: geen hogere schemaversie, het veld is optioneel en aanvullend. `migrateSkillGoals` (`storage/migrationsSkill.ts`, via `migrations.ts`) leest een back-up zonder het veld precies als voorheen. Met het veld controleert hij de vorm; een kapotte `general` laat alleen dat doel vallen en telt het bij de overgeslagen regels. Onbekende ladders en velden van een nieuwere versie blijven staan.

## Eigen keuzes

- De samenvattende zin is niet "3 van 5 ladders": de Ascend-tab kent geen tweede "x van y" voor voortgang naar een doel (`docs/werkbriefjes/doelen.md`, Nooit). De zin noemt alleen het aantal ladders en de startdag.
- De core-houding is de L-sit: die ladder bestaat al, met tekeningen en uitleg. Een hollow hold zou een nieuwe ladder met nieuwe oefeningen vragen.
- Geen bewaarde gehaalde stappen (`SkillStepProgress`) voor het algemene doel. De sleutel van zo'n rij is doel en stap, en die botst tussen vijf ladders; een oudere versie zou bij het inlezen rijen weggooien. De kaart toont daarom de huidige stap uit de logs. Zak je een stap (Stap lichter), dan zegt de kaart dat ook; er wordt niets herschreven.
- Het doel plant niets en zet geen oefening in een training. De squat op één been en de L-sit komen niet vanzelf in je trainingen: Calisthenics per training (`forge-soort`) kent alleen ladders voor het bovenlichaam, en de beendag blijft (`2026-11-09-calisthenics-ontwerp.md`, Reden). De rij zegt dan "Staat nog niet in je trainingen.". Hoe die twee ladders in een training komen is een open punt, zie Open.
- Geen nieuwe instelling. De keuze zelf is de instelling (Algemeen als advies en standaard), en Vaardigheidsdoelen tonen zet ook deze kaart en de tegel uit; de uitleg en de zoekwoorden van die rij noemen nu ook het algemene doel.
- De kaart staat boven de kaarten van losse vaardigheden en onder de lijst van doelen. IJsblauw voor "Hoger" (status), geen mint.
- De tekstkaart heeft een eigen stand `algemeen` en het scherm `ascend-algemeen`.

## Reden

Wens van de eigenaar (9 november): het doel Calisthenics vroeg één vaardigheid, terwijl hij ook gewoon algemene fitheid met eigen gewicht wil kunnen kiezen. De ladders, `ladderState` en het stapvoorstel bestonden al; een doel dat er vijf tegelijk volgt vraagt alleen een veld en een kaart.

## Alternatieven

Vijf losse vaardigheden aanmaken bij Akkoord: dan staan er vijf kaarten met elk een doelstap, en "zonder verplichte datum of eindpunt" klopt niet meer. Een eigen opslag naast `skillGoals`: een tweede sleutel in de back-up voor één doel; afgewezen. Een percentage over de vijf ladders: een tweede percentage op Ascend mag niet.

## Open

- De squat op één been en de L-sit hebben geen weg naar een training behalve Ruilen in Forge binnen hun familie. Een voorstel dat ze met Akkoord toevoegt raakt de beendag en de planning en is een eigen stap.
- De rij "Staat nog niet in je trainingen." heeft geen knop naar Calisthenics per training.

## Bron

`docs/backlog.md`, Inbox van 9 november (lijn Forge). `docs/beslissingen/2026-11-09-calisthenics-vaardigheidsdoel.md`, `docs/beslissingen/2026-11-09-calisthenics-stapvoorstel.md`, `docs/beslissingen/2026-11-09-stem-van-ascend.md`.

## Vervangt

Niets. Het doel Vaardigheid blijft zoals in `2026-11-09-calisthenics-vaardigheidsdoel.md`.

## Terugdraaien

Haal de keuze uit `pages/Ascend.tsx` (de tegel opent dan weer direct het blad Vaardigheid) en de kaart `GeneralStrengthCard.tsx`. Het veld `general` mag blijven staan: zonder de kaart is een algemeen doel verborgen en blijft het bewaard.
