# Forge: kern zichtbaar, niet inkorten, RIR bij afvinken en schijven per set

Datum: 2026-11-11
Status: aangenomen

## Besluit

1. Elke oefening in Forge toont zijn rol: Kern, Bijwerk of Extra. Het woord staat vooraan in de regel onder de naam in de kop van de oefening (`ExerciseBlock.tsx`), niet op de strook en niet in de intro. De namen komen uit één functie, `forgeTimeCap.ts#roleLabel`, met `ExercisePriority` uit `models/training.ts` als bron. Een geruilde oefening houdt de rol van zijn plek.
2. De instelling Hoogstens per krachttraining (gewone krachttraining en beendag) krijgt een nieuwe standaard: Tonen, niet inkorten. Uit (0) en Tonen zijn één keuze: 0. De hele training staat er dan altijd. Een gekozen 45, 60, 75 of 90 blijft inkorten zoals in `2026-11-03-forge-tijdsgrens.md`, met "1 set weg door je tijdsgrens" en Terugzetten bij de oefening (`2026-11-08-forge-tijdsgrens-en-bergspieren.md`) en de regel bovenaan voor een oefening die helemaal wegviel. Wie de standaard houdt ziet `timeCapLine`, `capLineFor` en `capRemovedLine` nooit, want `capSlots` haalt met 0 niets weg.
3. Een gedempte regel onder de klok in `ForgeHeader.tsx`: "Je zit op 64 minuten. Wat nog komt is bijwerk en extra; stoppen kan." (`forgeTimeCap.ts#overTimeLine`, getoond door `OverTimeNote` in `ForgeTimers.tsx`). Alleen als de actieve klok (`forgeSession.ts#activeSeconds`, pauzes tellen niet) over de referentie is, elke werkset van de kern is afgevinkt en er nog een werkset van bijwerk of extra open staat. De referentie is een gekozen grens, anders 60 minuten en op een beendag 75 (`referenceMinutes`). Niet tijdens een pauze, niet bij alleen kijken of met MacroFactor als bron. De regel noemt alleen wat nog open is: "bijwerk", "extra" of "bijwerk en extra".
4. Afronden met open bijwerk of extra telt niet als gemist. Dat deed het al: gedaan is een log bij de geplande sessie (`sessionStatus.ts`), en de weekterugblik, de vraag Niet gedaan? (`missedTraining.ts`) en het weekbudget (`weekBudget.ts#strengthCount`) tellen het log, niet de sets. `forgeKern.test.ts` legt het vast.
5. De volgorde verplaatsen bouwen we niet: je kunt in Forge al in elke volgorde trainen door op de strook (`ForgeStrip.tsx`, `onJump`) of in de lijst naar een andere oefening te gaan.
6. Hoeveel over na een set (`strengthModel.quickRir`) krijgt drie standen in plaats van aan en uit (`strengthModel.quickRirMode`): Als het anders ging (het advies), Vaker vragen (de oude regel: altijd na de eerste en de laatste werkset en na een zware set) en Uit. Met het advies vraagt `forgeReckon.ts#asksReserve` alleen bij een zware set (0 of 1 over, tot falen) en bij twijfel (minder herhalingen dan gevraagd, 2 of meer boven de bovenkant, de eerste werkset op een zwaarder gewicht dan vorige keer, elke werkset in de eerste drie trainingen van een oefening), ook zonder Afvinken telt als het doel. Een set volgens schema, ook de eerste en de laatste, krijgt geen vraag. Vraagt hij wel, dan staat het doel gedempt voorgekozen.
7. Een afgevinkte set zonder vraag krijgt het doel als RIR met `rirAssumed: true` (dat deed `forgeWorkout.ts#fillTicked` al). Zo telt hij niet in `learnFatigue`, `learnAfterHard` en klaar voor je doel, en het log draagt het getal voor het verloop. Het rekenmodel verandert verder niet.
8. De regel met schijven onder elke werkset ("per kant ...", "alleen de stang") staat achter de bestaande instelling Schijven bij de set tonen (`strengthModel.showPlates`), nu standaard uit. Dat een gewicht niet precies past ("kan niet precies, dichtstbij ...", `plateShortText`) staat er altijd, alleen onder die set en zonder lege regel bij de andere sets; `barNote` blijft ook. Het cijferblok (`InputDock.tsx`) toont de schijven zoals voorheen.
9. Extra betekent in Forge alleen nog de rol. De kolomkop "extra kg" bij een ladderstap met gewicht heet nu "+ kg", de toets op de ladder zegt "met 2,5 kg erbij", het cijferblok zegt "Gewicht erbij" en de ijkset vraagt "Nog één set bij ...".
10. Instellingen: geen nieuwe rij onder Geavanceerd (daar staan er al zes, besluit 8 november). Hoeveel over na een set en Schijven bij de set tonen blijven in het blad Bij het invullen; Hoogstens per krachttraining blijft in zijn eigen blad. Elk staat in `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts`, `settingsDiff.ts` en `ForgeGroup.tsx`.

## Eigen keuzes van de bouwer

- De regel onder de klok noemt alleen wat nog open is: "bijwerk", "extra" of "bijwerk en extra".
- Twijfel in `asksReserve` houdt ook "elke werkset in de eerste drie trainingen van een oefening" (regel 2 van het verslag RIR en RPE).
- Extra betekent in Forge alleen de rol; de woorden in punt 9 zijn daarom veranderd. De eigenaar nam "+ kg" aan (Pathfinder kijkt nog).
- De tekstkaart heeft een Forge-scherm (`docs/app-kaart/forge.md`, Benen A via Week).
- De instelling heet nog Schijven bij de set tonen (bestaand woord, bevestigd door de coördinator).

## Reden

De eigenaar (11 november): "niet zo erg als het uitloopt, zolang je weet wat de belangrijkste oefeningen zijn; soms extra, een keertje niet is geen probleem." Inkorten verborg wat er wegviel; tonen met de rol erbij laat de keuze bij hem. Bij Benen A bleef het RIR-bolletje van de laatste werkset grijs met een vraag, terwijl alles volgens schema ging: de vraag hoort bij een set die iets zegt.

## Alternatieven

- De tijdsgrens houden en alleen de rol tonen: dan valt nog steeds bijwerk weg dat de eigenaar wil doen als hij tijd heeft.
- De regel onder de klok in `ForgeIntro.tsx`: die is bij oefening 4 uit beeld (Pathfinder vooraf).
- De rol op de strook: de kaartjes zijn 44 px en dragen al de tekening en de stand.
- Een tweede vlag voor de schijven: `showPlates` doet precies dit; alleen de standaard verandert.
- Een nieuwe naam voor de stand met de oude vraag: geen nieuw woord, de instelling blijft Hoeveel over na een set.

## Bron

Backlog, Bouwrij, punt "Forge: kern zichtbaar" (eigenaar 11 november). Pathfinder vooraf over de plek.

## Vervangt

Deels `2026-11-03-forge-tijdsgrens.md` (de standaard 60 en 75 wordt Tonen, niet inkorten; Uit valt samen met Tonen) en `2026-11-08-forge-tijdsgrens-en-bergspieren.md` punt 3 (de standaard blijft niet 60). Deels `2026-11-03-forge-na-de-eerste-vergelijking.md` voor Hoeveel over? na de topset en de laatste set: dat is nu de stand Vaker vragen.

## Terugdraaien

Het advies in `settingsChoices.ts` (`grensKracht`, `grensBeen`, `rirSnel`) en de standaarden in `forgeTimeCap.ts#resolveTimeCap`, `strengthSettings.ts` (`showPlates`, `quickRirMode`) en de standaardstand van `asksReserve` terugzetten. Er is geen migratie; een bewaarde keuze blijft gelden.
