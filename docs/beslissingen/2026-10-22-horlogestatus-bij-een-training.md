# Horlogestatus bij een training

Datum: 2026-10-22
Status: aangenomen

## Besluit

Op het trainingsscherm staat onder de tegels één regel die zegt of de training naar het horloge is gestuurd (verstuurd met tijd, wacht, wijziging nog niet verstuurd, niet gelukt met de reden, of de vraag om te koppelen), met een knop "Nu versturen" of "Opnieuw" die dezelfde verzending doet als de automatische ronde, zonder het kwartier wachten. In de weeklijst staat een klein horloge, alleen bij verstuurd of mislukt. Beide zijn instelbaar en staan standaard aan.

## Reden

De eigenaar zag nergens of de training op zijn horloge kwam en of dat gelukt was. Het versturen ging vanzelf, maar zonder bewijs. De status komt uit wat al werd bijgehouden: de vingerafdruk van wat verstuurd is tegen wat de training nu is (`engine/watchStatus.ts`). Elke verstuurde training onthoudt nu ook het tijdstip (`sentAt`).

"Verstuurd" betekent: ASCEND heeft de training in de intervals.icu-agenda gezet. Of het horloge hem al heeft, hangt van Garmin Connect af en kan ASCEND niet zien. De tekst zegt daarom "Verstuurd naar je horloge" en niet "Staat op je horloge".

## Alternatieven

Een melding na elke ronde: te veel ruis, en weg als je hem mist. Een aparte pagina met een lijst: de vraag hoort bij de training zelf. Een eigen hartslag van het horloge terugkoppelen: kan niet zonder een andere koppeling.

## Bron

Gesprek met de eigenaar, 22 oktober 2026. Geen persoonsgegevens.

## Vervangt

Niets.

## Terugdraaien

Zet "Status van het versturen" en "Markering op Week" uit op de Garmin-pagina. Het versturen zelf verandert er niet door.
