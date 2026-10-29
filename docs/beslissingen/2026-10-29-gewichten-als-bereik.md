# Gewichten van een toestel als bereik

Datum: 2026-10-29
Status: aangenomen

## Besluit

De gewichten van een kabel of toestel met een gewichtsblok kun je ook invullen als bereik (begin, eind en stap), zoals MacroFactor het doet, naast de lijst. Het bereik is een snelle start, niet de waarheid: je kunt er gewichten uit weghalen en losse gewichten bij zetten.

## Reden

Een blok van 4,5 kg tot 113 kg in stappen van 7 kg overtypen als lijst is veel werk. Maar een blok loopt niet altijd in gelijke stappen: 113 ligt niet op de stap van 7 (het hoogste is 109,5). Daarom komen de uitgerekende gewichten als chips in beeld, die je kunt weghalen, en kun je een los gewicht toevoegen. Onder de velden staat dat het eind niet op de stap ligt, met een knop om het eind toe te voegen.

Wat is besloten:

1. `GymProfile.exerciseWeightRanges` (per oefening-id een lijst bereiken, hoogstens 5): `{ startKg, endKg, stepKg, removedKg? }`. Het bereik geeft begin, begin plus stap, enzovoort, zolang het niet boven het eind komt, afgerond op 0,01 kg tegen drijvende-kommafouten (`weightsFromRange`). Grenzen: stap boven nul, eind niet onder begin, 0,25 tot 500 kg, hoogstens 200 gewichten per bereik.
2. De losse gewichten staan in het bestaande `exerciseWeightsKg`. De gewichten van een toestel zijn de unie van die lijst en alle bereiken (min `removedKg`), oplopend en zonder dubbele (`ownWeightsFor`). Alles wat de lijst al las (`externalWeights`, de vraag in Forge, "geen gewicht past") leest daarom ook de bereiken.
3. De tussengewichten (`addOnKg`, `exerciseAddOnKg`) leggen zich daar zoals nu overheen. Met een blok van 4,5 tot 113 per 7 en tussengewichten van 1,1 en 2,3 kg kent Forge 4,5, 5,6, 6,8, 7,9, 11,5, 12,6 en zo verder. Het blad zegt dat onder "Hoogste gewicht": "Met tussengewichten 1,1 en 2,3 kg erbij."
4. ASCEND leert daarnaast nog steeds van de gewichten die je echt gebruikt (`strengthWeights.ts`, "Gewichten van toestellen"). De opgave van het blok gaat voor als er een staat, zoals bij een lijst.
5. Het blad heeft de keuze Lijst of Bereik. Bij Bereik staan Begin, Eind en Stap (komma of punt), de regel met het hoogste gewicht, de chips (tik haalt een gewicht weg, nog een tik zet het terug), "Bereik toevoegen" voor een tweede bereik en "Gewicht toevoegen" voor een los gewicht.

6. Veel blokken zijn in pond. Een bereik heeft een eenheid (`unit: 'kg' | 'lb'`, afwezig is kg; de getallen staan in die eenheid). In pond rekent ASCEND exact in pond (1 lb = 0,45359237 kg) en gaat pas bij gebruik naar kg, op 0,1 kg: 10 tot 250 lb per 15 is 4,5; 11,3; 18,1; ... tot 113,4 kg. Eindigt een bereik in kg niet op zijn stap maar valt het in pond wel netjes (begin op een heel pond, stap van 5, 10 of 15 lb, eind een heel aantal stappen verder), dan stelt het blad droog voor: "Dit blok lijkt in pond: 10 tot 295 lb per 15. Zo omrekenen?" met "In pond" (`poundRangeFor`; 4,5/113/7, 4,5/134/7 en 4,5/134/6,5 worden herkend). De zin "134 ligt niet op een stap van 7; het hoogste is 130,5" blijft staan, met "134 toevoegen", als terugval. Tussengewichten blijven in kg.

Er verandert niets stil aan de planning of aan een bestaande training.

## Opgeslagen vormen

`exerciseWeightRanges` is optioneel en additief op `GymProfile`. Het gaat door `normalizeProfile` (defensief: een kapot bereik valt weg, de rest blijft), dus ook door de schoonmaak van de back-up. Het schemanummer verandert niet en er is geen migratiestap nodig; een oude back-up heeft het veld niet en werkt zoals altijd. Een nieuwe sportschool begint zonder de eigen bereiken, net als zonder de eigen lijsten.

## Alternatieven

Het bereik alleen opslaan als uitgerekende lijst. Valt af: je kunt dan niet meer zien dat het een bereik was en het bewerken blijft overtypen.

Alleen een bereik zonder weghalen of losse gewichten. Valt af: het blok van de eigenaar eindigt buiten de stap.

## Bron

Een wens van de eigenaar op 29 oktober 2026, met als voorbeeld een blok van 4,5 tot 113 kg in stappen van 7 kg en losse gewichten van 1,1 en 2,3 kg. Vult `2026-10-26-gewichten-per-toestel.md` en `2026-10-28-tussengewichten.md` aan.

## Vervangt

Niets.

## Terugdraaien

Wis de bereiken van een toestel met "Lijst wissen", of laat `exerciseWeightRanges` weg in `ownWeightsFor` (`engine/machineWeights.ts`): de lijst werkt dan zoals voorheen.
