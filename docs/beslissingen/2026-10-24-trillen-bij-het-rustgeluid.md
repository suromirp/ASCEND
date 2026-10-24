# Het trillen volgt het rustgeluid

Datum: 2026-10-24
Status: aangenomen

## Besluit

Het trillen als de rust om is heeft het ritme van het gekozen geluid, in plaats van één vast patroon. Boksbel is drie snelle tikken, Fluitje twee korte, Gong één lange, Klokjes drie tonen met een aanhoudende laatste, Bel één middellange, Piep vier korte. Een onbekend geluid houdt het vaste patroon van vroeger. De afteltimer (CountdownTimer) houdt dat vaste patroon ook.

Bij "Alleen trillen" trilt het patroon van het gekozen geluid, zonder geluid. Daarom staat de rij "Geluid na de rust" nu ook bij "Alleen trillen", met de regel "Je voelt alleen het ritme", en blijft alleen weg bij "Niets" of als de rusttimer niet vanzelf start. Kies je in Instellingen een geluid, dan hoor je het (als geluid aan staat) en voel je het patroon (als trillen aan staat).

Het patroon is een pure functie (`restVibrationPattern` in `engine/restVibration.ts`) met een test. Geen trilstoot is korter dan 70 ms, want veel Android-motoren laten hele korte stoten weg. Er is geen nieuwe instelling: de keuze van het geluid bepaalt het ritme, en "Signaal als de rust om is" bepaalt of je het hoort, voelt of allebei.

## Reden

Eén vast patroon voor alle geluiden liet je met alleen trillen niet weten welk geluid het zou zijn. Met het ritme van het geluid kun je in je zak horen en voelen wat er gebeurt, en kies je met het geluid ook hoe je het voelt.

## Alternatieven

Een aparte instelling "Trilpatroon": een keuze erbij zonder dat het iets wint, want je wilt bij Boksbel ook een snelle tik voelen.

Het vaste patroon laten staan en alleen bij het kiezen laten voelen: het zou dan nooit overeenkomen met wat later gebeurt.

## Bron

Verzoek van de eigenaar, 24 oktober. De geluiden zelf: `src/utils/sound.ts`.

## Vervangt

Niets.

## Terugdraaien

In `ForgeWorkout` en `ForgeGroup` weer `haptics.alarm()` aanroepen en de rij `forge-geluid` weer verbergen bij "Alleen trillen" (`engine/settingsSummary.ts`).
