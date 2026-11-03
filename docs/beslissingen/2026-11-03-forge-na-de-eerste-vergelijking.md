# Forge na de eerste vergelijking met MacroFactor

Datum: 2026-11-03
Status: aangenomen

## Besluit

Na de eerste training die de eigenaar naast MacroFactor in Forge deed (Benen A, 3 november) veranderen vijf dingen in Forge.

1. Na een zware topset rekenen de terugsets met een grotere daling.
2. Een zware topset krijgt altijd minstens drie opwarmstappen.
3. Na de topset en de laatste set vraagt Forge in de rij "Hoeveel over?", en een aangenomen RIR kan ook een stap zwaarder geven, maar alleen bij een duidelijk teken.
4. Een gewicht onder de lege stang krijgt een zachte regel.
5. Een toestel dat in ponden werkt, krijgt een voorstel om het als ponden op te slaan.

## Wat er gebeurde

Squat: een topset van 82,5 kg voor 7 (de RIR aangenomen als 1), daarna schreef Forge 72,5 en 70 kg voor 7 tot 9 met 2 over voor. Het werden er twee keer 6. MacroFactor gaf 65. Deadlift: één opwarmset van 67,5 kg voor 5 voor een topset van 102,5 kg, en die topset werd 10 tot falen waar 7+ gevraagd was. Daarna gingen 95, 92,5 en 90 kg elk voor 7. De eerste opwarmset van de squat stond als 10 kg, onder de stang van 20. De beenpers stond als 73, 104,4 en 95,3 kg in het log: dat zijn 161, 230 en 210 lb van een toestel in ponden. De RIR is nergens ingevuld.

## 1. De daling na een zware topset

Een topset is een werkset met 0 of 1 over (of tot falen) gevolgd door een werkset die meer over vraagt. Gelijke sets (vier keer 4 tot 6 met 1 over) zijn geen topset. Van de topset naar de eerste terugset gaat er bovenop de daling per set (`fatiguePerSet`, 3% of geleerd) nog 6% van de geschatte kracht af (`strengthModel.ts#fatigueFactor`, `HARD_SET_EXTRA`). Dezelfde regel geldt overal waar Forge per set rekent: het voorschrift van een programma (`forgeWorkout.ts#programWeights`, ook voor terugsets die hetzelfde bereik hebben als de schatting zelf), de verwachte herhalingen per rij, Forge rekent mee (`forgeReckon.ts#strengthFor`) en Lichter (`forgeAdjust.ts`).

De 6% is een startwaarde. Per oefening leert Forge hem uit je eigen sets (`learnAfterHard`): de mediaan van de daling van topset naar terugset min de daling per set, naar 6% getrokken zolang er weinig paren zijn (zoals bij de daling per set, met 8 paren), tussen 0 en 15%. Alleen sets met een RIR die je zelf invulde tellen; een aangenomen RIR leert niets, net als bij `learnFatigue`. De paren na een topset tellen niet meer mee voor de gewone daling per set, zodat die niet dubbel telt. "Vast 3%" bij Vermoeidheid per set houdt ook de 6% vast.

Na het afvinken van een topset die anders ging dan gevraagd, en waarvan Forge weet hoeveel je over had (een set tot falen, of een RIR die je koos), volgen alle open terugsets die je niet aanraakte samen je kracht van die dag (`forgeReckon.ts#reckonBackOffs`): het zwaarste gewicht waarmee je de onderkant haalt, met de extra daling, alleen de kant op van wat je deed. Een topset met een aangenomen RIR die meer herhalingen gaf dan het vak, leest Forge voorzichtig: zoveel minder over (niet onder 0), want meer dan gevraagd op 0 of 1 over is vaak dichter bij falen (`readRir`). Bij gewone sets blijft de aangenomen RIR het doel, zodat Forge rekent mee na een betere set gewoon meebeweegt.

De proef met nagemaakte cijfers in de buurt van 3 november (`src/engine/forgeTopSet.test.ts`, een week voorgeschiedenis met een geschatte kracht van ongeveer 99 kg voor de squat en 128 kg voor de deadlift):

- Squat, voorschrift vooraf: was 82,5, 72,5 en 70; nu 82,5, 67,5 en 65. Na de topset van 7 met een aangenomen 1 over blijft het 67,5 en 65.
- Deadlift, voorschrift vooraf: was 102,5, 95, 92,5 en 90; nu 102,5, 87,5, 85 en 82,5. Na de topset van 10 tot falen: 95, 92,5 en 90, precies wat werkte. Haal je in de topset wat gevraagd was, dan blijven de lichtere terugsets staan.
- Deadlift, de training erna: was 105, 97,5, 95 en 92,5; nu 105, 92,5, 87,5 en 85 vooraf, en na een topset die even sterk is als op 3 november 95, 92,5 en 87,5.

De deadlift staat vooraf dus lichter dan wat werkte. Dat is eerlijk: de terugsets van 3 november lukten omdat de topset veel beter ging dan gevraagd, en de daling van topset naar terugset was ook daar ongeveer 10%. Forge weet pas na de topset hoe sterk je die dag bent, en zet de terugsets dan goed.

## 2. Opwarmen voor een zware topset

De deadlift kreeg één opwarmset omdat de benen al warm waren van de squat (`warmup.ts#warmupKind` geeft dan een voelset van 65% voor 5). De tijdsgrens van 75 minuten (`forgeTimeCap.ts`) raakt opwarmsets niet; die haalt alleen werksets weg. Een zware topset (de eerste werkset met 0 of 1 over of tot falen, bij een samengestelde oefening) krijgt nu altijd minstens drie stappen (`strengthModel.ts#topSetWarmups`, `TOP_SET_WARMUPS`): de lege stang of een vijfde van het gewicht, dan ongeveer 57% en 76% van de topset, zoals 20, 60 en 80 voor 105 kg. Op warme spieren 5, 3 en 2 herhalingen, koud 8, 5 en 3. Een opbouw die al drie stappen heeft blijft zoals hij is. Opwarmen uit blijft uit, en een licht gewicht of een isolatieoefening krijgt niets.

## 3. Hoeveel over?

Na het afvinken van de eerste werkset, een zware set of de laatste werkset van een oefening staat in de rij de vraag "Hoeveel over?" met 0, 1, 2 en 3+, elk een knop van 44 bij 44 px (`forgeReckon.ts#asksReserve`, `QUICK_RIR`, `ExerciseBlock.tsx#QuickRir`). Eén tik, zonder blad. Kies je niets, dan blijft de RIR aangenomen zoals nu. De vraag gaat weg bij een keuze of bij de volgende tik; staat de oefening na de laatste set ingeklapt, dan staat de vraag onder de kop. Een gekozen RIR is van jou (`rirAssumed: false`) en Forge rekent er meteen mee voor de sets erna. Instelling "Hoeveel over na een set" in Bij het invullen (`strengthModel.quickRir`, standaard aan, een eigen rij omdat het iets anders is dan rekenen).

Forge rekent mee zette alleen een stap zwaarder bij de bovenkant van het bereik met een RIR die je zelf invulde. Nu ook bij een aangenomen RIR, maar alleen bij een duidelijk teken: 3 of meer herhalingen boven de bovenkant (`ASSUMED_RAISE_REPS`, `assumedRaise`). De bovenkant van een set tot falen als "7+" is 7, dus 10 is het teken. In een programma geldt dat voor de topset (de eerste werkset van vorige keer tegen die van nu), zonder programma voor de beste set tegen het bereik. De regel zegt alleen wat je deed, zonder "over": "2,5 kg erbij, je haalde vorige keer 10." Terugzetten werkt zoals bij de gewone stap. Dit valt onder de instelling Forge rekent mee.

## 4. Onder de lege stang

Bij een oefening met een stang staat onder een rij met een gewicht onder de stang (de zwaarste stang die niet boven het werkgewicht ligt, zoals bij de schijven) een zachte regel: "Lege stang is 20 kg. Klopt 10?" (`barCheck.ts#barNote`). Er wordt niets geblokkeerd en het gewicht wordt bewaard zoals je het typte; een bestaand log wordt nooit aangeraakt. Wel rekent Forge in de training niet stil met zo'n set als je kracht van vandaag. De geschiedenis en het model blijven zoals ze zijn: een opwarmset telt daar toch al niet mee, en een stang die niet in je profiel staat (een lichte curlstang) zou anders onterecht wegvallen.

## 5. Een toestel in ponden

Vul je bij een kabel of toestel zonder eigen gewichten in je sportschool zelf gewichten in die omgerekende ponden zijn (minstens twee die niet op een halve kilo liggen, allemaal binnen 0,1 kg van een heel pond, en samen op een stap van 10 of 5 lb), dan staat na een afgevinkte set: "Dit toestel lijkt in ponden te werken: je vulde 161, 210 en 230 lb in. Opslaan als 10 tot 300 lb per 10?" met Opslaan en Liever niet (`poundStack.ts`). Opslaan zet het toestel als bereik in ponden in je sportschool (`withMachineSetup`, de vorm van `2026-10-29-gewichten-als-bereik.md`); daarna past het voorschrift op het toestel. Liever niet laat het voorstel deze training liggen. De herkenning lijkt op `poundRangeFor`, maar werkt op losse ingetypte gewichten in plaats van op een bereik.

## Reden

De vergelijking van 3 november liet zien waar Forge en de werkelijkheid uit elkaar lagen. Dat het aantal herhalingen over opeenvolgende sets meer daalt na sets dicht bij falen en met zware lasten, staat in het werk van Willardson en collega's over rust tussen sets (matig bewijs, al genoemd in `2026-10-26-kracht-vermoeidheid-en-grove-stap.md`). MacroFactor bouwt een oefening op met een zware eerste set en daarna sets met meer over (`docs/onderzoek/Kracht loggen en progressie.md`, help 397), en die vorm vroeg om een eigen daling. De 6% is een keuze uit de cijfers van één training (ongeveer 12% bij de squat en 10% bij de deadlift van topset naar terugset, min de 3%), geen onderzoeksuitkomst; daarom leert Forge hem per oefening. De RIR-vraag is er omdat de RIR nergens werd ingevuld: zonder RIR kan Forge niet leren en geen stap met "over" zetten.

## Alternatieven

- Een vaste grotere daling per set voor alle sets: afgewezen, dan worden gewone aflopende sets te licht.
- De daling alleen in de training na het afvinken van de topset: afgewezen, de squat ging vooraf al mis.
- Een aangenomen RIR na meer herhalingen altijd lager lezen: afgewezen, dan beweegt Forge rekent mee na een betere gewone set nooit meer.
- De RIR-vraag als blad na elke set: afgewezen, de eigenaar vroeg om één tik zonder blad, en na elke set is te vaak.
- Een set onder de stang weigeren of uit het model halen: afgewezen, dat blokkeert of raakt geschiedenis die misschien klopt.
- Het toestel vanzelf als ponden opslaan: afgewezen, een sportschool wijzigen is een keuze van jou.

## Bron

De training van de eigenaar van 3 november (alleen als richting; de tests gebruiken nagemaakte cijfers), `docs/onderzoek/Kracht loggen en progressie.md` (KR-1, KR-4, KR-8, de zware eerste set), en de besluiten `2026-10-26-kracht-vermoeidheid-en-grove-stap.md`, `2026-11-03-forge-rekent-mee.md`, `2026-10-22-forge-opwarmen.md` en `2026-10-29-gewichten-als-bereik.md`.

## Vervangt

Niets. Het vult `2026-10-26-kracht-vermoeidheid-en-grove-stap.md` aan (de daling na een topset) en `2026-11-03-forge-rekent-mee.md` (de terugsets samen na een topset, de stap bij een aangenomen RIR).

## Terugdraaien

Zet `HARD_SET_EXTRA` op 0 en `TOP_SET_WARMUPS` op 0 in `strengthModel.ts` voor punt 1 en 2. "Hoeveel over na een set" en "Forge rekent mee" staan uit in de instellingen. Er is geen opgeslagen vorm veranderd: `quickRir` is een optioneel veld in de Forge-instellingen, `fatigueAfterHard` leeft alleen in het concept (een oud concept rekent met de 6%), en een toestel in ponden is een gewoon bereik.
