# Plaatjes bij oefeningen: het kaartje toont de tekening

Datum: 2026-10-28
Status: aangenomen, vult `2026-10-28-plaatjes-bij-oefeningen.md` aan

## Besluit

Het kleine kaartje van 44 bij 44 px (`ExerciseArtButton`: in de kop van een oefening, in de rijen van de lijst en in het ruilblad) toont voortaan het middelste beeld van de tekening, in plaats van het spierkaartje. Alleen bij de instelling "Spierkaart en tekening" en alleen als de tekening er al is. In alle andere gevallen blijft het spierkaartje staan: bij "Alleen spierkaart", als er geen tekening is, en zolang hij nog niet geladen is of het laden mislukt. Het blad zelf verandert niet.

## Reden

Een tekening laat in één oogopslag zien welke oefening het is, het spierkaartje laat zien welke spieren werken. In een lijst met namen als Pause Back Squat of Goblet Squat helpt het eerste meer.

Het middelste beeld (stap 2 na `ART_ORDER`) is het herkenbaarst. Het pad krijgt een eigen vierkante viewBox om zijn omlijning (`engine/exerciseArtThumb.ts#thumbFrame`, met 6% lucht), getekend in `currentColor`. Variant-tekeningen mogen ook, het blad zegt al "Op de tekening: ...".

Het kaartje haalt zelf nooit iets op. Het toont wat al in het geheugen staat (door het blad of door de achtergrondlading van `useExerciseArtPrefetch`) of wat de service worker al bewaarde (`utils/exerciseArtLoader.ts#readCachedDrawing`, alleen de cache, geen netwerk). Komt een tekening later binnen, dan wisselt het kaartje met een korte fade van 200 ms op dezelfde maat; in Rustig en Uit staat hij meteen op de eindstand. Een lijst of ruilblad kost daarom geen extra netwerk: wat je eigen trainingen niet al ophaalden, blijft het spierkaartje.

## Alternatieven

Het eerste of laatste beeld: de beginhouding is vaak een staande figuur zonder gewicht, de eindstand lijkt erop. Een lege plek tot de tekening er is: een leeg kaartje is slechter dan een spierkaartje. Alle tekeningen in de ruilblad ophalen: tot twintig bestanden per keer openen.

## Bron

Een wens van de eigenaar. De tekeningen zijn van Workout Guide (CC BY-SA 4.0), zoals vastgelegd in het oorspronkelijke besluit.

## Vervangt

Niets. Het kaartje in de kop is niet meer het spierkaartje bij "Spierkaart en tekening"; de rest van `2026-10-28-plaatjes-bij-oefeningen.md` blijft gelden.

## Terugdraaien

Zet "Plaatjes bij oefeningen" op "Alleen spierkaart": dan is het kaartje weer het spierkaartje.
