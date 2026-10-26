# Een stille tip als ingevulde gewichten nog te zwaar zijn

Datum: 2026-10-26
Status: aangenomen

## Besluit

Vraagt Forge om de gewichten van een toestel in te vullen (`2026-10-26-gewichten-per-toestel.md`) en zijn de ingevulde gewichten nog steeds te zwaar voor het bereik, dan komt er geen nieuwe vraag. Onder de oefening staat dan één gedimde regel zonder knoppen, bijvoorbeeld "Ook 45 kg is nog te zwaar, naar verwachting 3 herhalingen." De tekst komt uit `engine/forgeAdjust.ts#stillHeavyTip` en rekent met dezelfde vermoeidheid per set als het bijsturen. De regel verdwijnt bij de volgende afgevinkte set van die oefening, als de oefening klaar is, en bij ruilen.

## Reden

Zonder iets verdween de vraag na het opslaan zonder uitleg, en zag je niet of het gelukt was. De eigenaar wil daar geen grote melding: het hoort de training niet te onderbreken. Een stille tip zegt wat er aan de hand is en vraagt niets.

## Alternatieven

De vraag laten staan met "Invullen" en "Liever niet": te opdringerig midden in een training. Niets laten zien: dan lijkt het of er iets misging.

## Bron

Gesprek met de eigenaar op 26 oktober 2026, na een doorloop van Lookout waarin de vraag zonder uitleg verdween.

## Vervangt

Niets. Het vult `2026-10-26-gewichten-per-toestel.md` aan.

## Terugdraaien

Haal de tip weg in `components/forge/ForgeWorkout.tsx` (`heavyTip`); de vraag zelf blijft werken zoals in het besluit over gewichten per toestel.
