# Hoe goed kent Forge je

Datum: 2026-11-09
Status: aangenomen

## Besluit

Forge meet zich aan je eigen trainingen en toont dat in het blok "Hoe goed kent Forge je" op de Forge-pagina: voorspelling, bijsturen en sterker worden, over de laatste 4 weken (`engine/forgeCalibration.ts#calibrate`). Het blok is alleen tekst en verandert nooit een plan of een log. Instelling `knowsYou` (standaard aan).

## Reden

De eigenaar wil MacroFactor Workouts overbodig maken. We weten niet hoe MacroFactor rekent, en een ander advies is niet vanzelf fout; MacroFactor is dus een tweede mening, geen scheidsrechter (`docs/visie/Los van MacroFactor.md`). De maat moet uit je eigen sets komen.

## De maten

- Voorspelling: alleen werksets uit Forge waar je het voorgestelde gewicht pakte en zelf een RIR invulde. Gehaalde herhalingen omgerekend naar de gevraagde RIR (`reps + rir - rirAsked`) tegen wat Forge vroeg (`repsAsked`): raak bij hooguit 1 verschil (`REPS_ROOM`, dezelfde ruimte als "raak"). Het teken van de gemiddelde afwijking zegt te zwaar (negatief) of te licht (positief) voorgeschreven. Goed vanaf 70 procent.
- Bijsturen: aandeel werksets waarin je het gewicht veranderde voor je afvinkte, of bij een afgevinkte set zonder eigen RIR de herhalingen. Bij een set met eigen RIR zijn de herhalingen de uitkomst en geen bijsturing. Goed onder 1 op de 10.
- Sterker: trend van het geschatte maximum (dezelfde kracht van de dag als de rest van Forge, `sessionStrength`) per hoofdoefening over 8 weken: een kleinste-kwadratenlijn, binnen 2 procent heet gelijk. Hoofdoefeningen zijn de samengestelde patronen (squat, heupscharnier, duwen, trekken) met de meeste trainingen, hoogstens 4, elk met minstens 3 trainingen over minstens 6 weken. Goed als er geen daalt.
- Genoeg data: een oefening telt vanaf 6 sets (`MIN_SETS`); anders staat er "nog te weinig data" in plaats van een getal. Het geheel telt alleen oefeningen met genoeg sets.
- Veilig (geen open fout over sprongen, onmogelijke herhalingen of warming-ups) blijft in de backlog; de functie meet het niet.

## Eigen keuzes buiten de opdracht

- Nieuw veld `SetLog.rirAsked` (de RIR van het doel) en `repsAsked`, `weightKgAsked`, `forgeKg` voortaan bij elke Forge-werkset, niet alleen bij een afgevinkte set zonder eigen RIR. Zonder die velden weet het log niet wat Forge vroeg, en achteraf herrekenen zou de maat laten meebewegen met de engine. Oude logs hebben ze niet of alleen naast `rirAssumed`; die tellen voor de voorspelling niet mee en worden nooit geraden. De migratiestap `migrateLogSetAsked` houdt een geldig getal nu ook zonder `rirAssumed` en laat een beschadigd veld vallen. Geen nieuwe schemaversie: optioneel en aanvullend, zoals `repsAsked`. Historie blijft append-only.
- Een set telt alleen als hij `rirAsked` draagt: afgevinkte sets van 8 en 9 november (zonder dat veld) zouden een scheve steekproef geven. Lichter telt niet als bijsturen: Forge zet dan zelf `forgeKg`, en een set op dat gewicht heet gevolgd. `askedReps` in `assumedSets.ts` leest `repsAsked` alleen bij een afgevinkte set zonder eigen RIR, zodat regel 3 van Afvinken telt als het doel niet verandert door de bredere schrijfregel.
- Sterker heet goed zolang er geen hoofdoefening daalt (gelijk telt, zoals het visiedocument zegt).
- Alleen logs uit Forge zelf (`logOrigin` is `forge`) tellen mee.
- Eén zin uitleg achter de i; de grenzen en uitleg staan in het blad Per oefening.
- Plek: op de Forge-pagina onder de lijst, boven "Voorstel en wat je deed", altijd zichtbaar bij de instelling aan (ook zonder "ASCEND naast MacroFactor").

## Alternatieven

- De voorspelling achteraf herrekenen met `prescribe` (zoals `comparisonRows`): afhankelijk van de huidige engine en dus een bewegende maat.
- Een eigen sterkte-trend uit `exerciseViews`: zwaarder en gebonden aan de MacroFactor-instelling.

## Bron

`docs/visie/Los van MacroFactor.md`, `docs/onderzoek/RIR en RPE in krachtapps.md`.

## Vervangt

Niets.

## Terugdraaien

De instelling Hoe goed kent Forge je uitzetten; de velden in het log blijven staan en doen niets.
