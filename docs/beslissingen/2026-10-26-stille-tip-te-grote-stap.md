# Een tweede stille tip als het lichtere gewicht een te grote stap is

Datum: 2026-10-26
Status: aangenomen

## Besluit

Na het invullen van de gewichten van een toestel kan het eerstvolgende lichtere gewicht ver boven het bereik uitkomen. Dan geeft het bijsturen niets en vraagt ook het invullen niets, omdat het lichtste gewicht de onderkant wel haalt. In dat geval staat onder de oefening één gedimde regel zonder knoppen, bijvoorbeeld "35 kg is een te grote stap: naar verwachting 16 herhalingen." De rekening staat in `engine/forgeAdjust.ts#suggestTooBigStep` en de tekst in `tooBigStepTip`, met dezelfde vermoeidheid per set als het bijsturen. De regel verdwijnt op dezelfde momenten als de eerste stille tip: bij de volgende afgevinkte set van die oefening, als de oefening klaar is en bij ruilen.

## Reden

Zonder regel verdween de vraag na het opslaan zonder uitleg, ook in dit geval. Het is dezelfde keuze als bij de stille tip voor te zware gewichten: zeggen wat er aan de hand is, niets vragen en de training niet onderbreken.

## Alternatieven

Een voorstel doen met een gewicht dat ver boven het bereik uitkomt: dat is eerder bewust uitgesloten. Niets laten zien: dan lijkt het of er iets misging.

## Bron

Een doorloop van Lookout en het eerdere besluit `2026-10-26-stille-tip-bij-toestelgewichten.md`.

## Vervangt

Niets.

## Terugdraaien

Haal de aanroep van `suggestTooBigStep` weg in `components/forge/ForgeWorkout.tsx` (bij `onSaved` van het invulblad). De eerste stille tip blijft werken.
