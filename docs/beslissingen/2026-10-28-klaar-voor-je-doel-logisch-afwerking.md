# Klaar voor je doel: afwerking van het logische model

Datum: 2026-10-28
Status: aangenomen

## Besluit

De kernregel van de eigenaar blijft de maat: het getal, de meters, de regel onder het getal, "Hier is nog het meeste te winnen" en het voorstel spreken elkaar nooit tegen. Dit besluit werkt de loshangende punten af die de review vond, en bouwt wat in `2026-10-28-klaar-voor-je-doel-logisch-voorwaarden.md` onder "Niet gebouwd" stond.

Het voorstel past na Akkoord. Het voorstel van TARGET-TIME is de kleinste hele minuut waarvoor de rekening zegt dat de doeltijd binnen de weken past (`racePaces.ts#raceOutlook`, veld `wholeMinutes`). Dat is ook het getal dat de kaart "ongeveer" noemt. Voorheen werd afgerond, waardoor het voorstel in ongeveer de helft van de gevallen net niet paste. Een test over een raster van verwachte tijden en weken bewaakt dat het voorstel past en dat één minuut minder niet past.

Welke berekening bij welk doel hoort, staat op één plek: `engine/goalReadinessFor.ts#goalReadinessFor`. De Ascend-kaart en het blad lezen die functie. Het doel met de mijlpalen rekent zoals Je stand; een hardloopwedstrijd met afstand de wedstrijdberekening; Sterker worden de krachtmeter; een dagtocht of trailrun de voorwaarde Tempo; al het andere de gewone.

Het verschil met vier weken terug (`since`) hoort daarbij. Bij een hardloopwedstrijd, Sterker worden, een dagtocht en een trailrun telt het pas als het doel zelf al vier weken bestond en toen een waarde had: `since` is dan de dag waarop het doel is gemaakt. Het doel met de mijlpalen en de overige doelen krijgen geen `since`, zoals het was. Een test legt dit vast.

Twee nieuwe instellingen, allebei met het advies als standaard:

1. "Groei bij het rekenen": Gemiddeld (advies, het midden van de band) of Voorzichtig (de onderkant van de band). Bij hardlopen is dat 0,55% of 0,3% per week. Meter, regel, voorstel, de krachtmeter en het tempo bij een limiet lezen dezelfde keuze (`AppSettings.goalGrowth`, `data/goalGrowth.ts#growthPer`). De derde keuze uit het onderzoek, je eigen tempo uit twee tests, is niet gebouwd.
2. "Marge bij een tijdslimiet": 10% (advies), 5% of Geen (`AppSettings.limitMargin`). De regel onder het getal noemt de gekozen marge, of zegt dat de limiet zelf de grens is.

De weging 60 en 40 bij Sterker worden volgt de bestaande instelling "Weging bij een doeltijd": Gelijk laat de meters even zwaar wegen. De hulptekst zegt het.

Eerlijk over het getal. De 0,55% per week is het midden van een band van 0,3 tot 0,8%, afgeleid uit meerdere bronnen, en wordt in `goalGrowth.ts` en in de uitleg van TARGET-TIME niet aan één studie toegeschreven. Elk groeigetal heeft nu een `low` en een `high`.

Kleine correcties:

- Een cutoff hoort alleen bij een ultra. `applyGoalEdit` gooit hem weg als een ultra naar kort gaat (zoals `buildGoalDraft`), `readLimit` eist de variant ultra, en `readGoalDetails` laat hem los bij een andere variant.
- Een meter zonder gewicht die open blijft maakt nooit "het meeste te winnen" en houdt het getal niet onder 100. De onbereikbare terugval in `goalReadiness.ts` is weg.
- Sterker worden zegt "gehaald" alleen als de meter vol is. Zit er nog werk in maar rondt het gat af op nul, dan staat er "nog minder dan een halve kilo". Weken staan in enkelvoud ("ongeveer 1 week werk", "minder dan een week werk").
- De regel onder de doeltijd zegt "Je doeltijd past daarbinnen." in plaats van "je doel valt erbinnen", en noemt bij voorzichtige groei "voorzichtige" in plaats van "gemiddelde".
- Het voorstel zegt de doeltijd op dezelfde klok als de kaart (47:45, niet 48 minuten). Het id van het voorstel blijft op de hele minuut, zodat een eerder Liever niet blijft gelden.
- Bij een tijdslimiet of cutoff staat "6:54 uur", en bij een trail "je lange lopen" of "je lange wandelingen", naar de dag waarop het tempo rust. De uitleg van Tempo bij een dagtocht zegt: "Haal je de laatste lift of bus niet, dan wordt het een lange terugweg of een nacht in de bergen."

Nieuw, op verzoek van de eigenaar: de krachtdoelen per oefening staan in het formulier van Sterker worden (`GoalDetails.strengthTargets`). Je kiest een oefening uit de bestaande lijst (zonder lichaamsgewicht), geeft gewicht en herhalingen, en voegt toe of haalt weg. Een tweede doel voor dezelfde oefening vervangt het eerste, hoogstens acht doelen. Het veld is vrijwillig. De logica staat in `engine/strengthTargetsDraft.ts`, het veld in `components/ascend/StrengthTargetsField.tsx`.

## Wat opgeslagen wordt

Twee optionele instellingen (`goalGrowth`, `limitMargin`), gelezen met een terugval op het advies en in de back-upcontrole weggelaten als ze beschadigd zijn. Het schema blijft 2; een oudere back-up importeert als voorheen. `readGoalDetails` leest `strengthTargets` strenger (naam van gewone lengte, gewicht tot 500 kg, hele herhalingen tot 30, hoogstens acht) en laat een cutoff los bij een korte trail. Geen historie wordt herschreven.

## Reden

Warden vond dat een voorstel dat je accepteert op de kaart toch nog "past niet" kon geven, en dat een paar zinnen elkaar of de feiten niet volgden. Eén plek voor de keuze van de berekening voorkomt dat twee schermen twee getallen geven.

## Alternatieven

Het voorstel afronden naar boven met `Math.ceil` op de kaart zelf (de kaart zou dan 50 zeggen waar de rekening 49,4 geeft): de kleinste passende hele minuut is hetzelfde getal voor kaart en voorstel. Een derde groeikeuze met je eigen tempo: wacht op twee tests van minstens zes weken uit elkaar.

## Bron

`docs/onderzoek/Klaar voor je doel logisch per doel.md`, de review van Warden en de opdracht van de coördinator. Geen persoonsgegevens.

## Vervangt

Het deel van `2026-10-28-klaar-voor-je-doel-logisch-voorwaarden.md` dat zegt dat er geen nieuwe instelling komt en dat de krachtdoelen en de instellingen "Groei bij het rekenen" en "Marge bij een tijdslimiet" niet gebouwd zijn.

## Terugdraaien

Laat `useGoalViews` de oude losse keuzes weer maken, of zet de twee instellingen op hun advies (de rekening is dan gelijk aan die van voor dit besluit, behalve het voorstel dat nu de kleinste passende minuut is).
