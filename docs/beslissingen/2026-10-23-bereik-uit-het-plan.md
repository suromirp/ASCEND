# Het bereik en de RIR komen uit het plan

Datum: 2026-10-23
Status: aangenomen

## Besluit

Op het workoutscherm komen het herhalingsbereik en de herhalingen over (RIR) van een oefening uit het sjabloon (bijvoorbeeld "6-8", met de RPE als die er staat) of, bij een programma uit MacroFactor, uit de eerste normale set van het programma. Alleen als het plan geen bereik geeft, of geen RIR, wordt dat uit de historie afgeleid. De pagina Kracht heeft geen sjabloon en blijft het bereik afleiden.

## Reden

Het onderzoek (KR-4) noemt het bereik en de RIR als invoer van het voorschrift, niet als uitkomst. Afleiden uit de eerste training gaf dat het sjabloon 5 tot 8 op het scherm als 5 tot 7 stond, en dat een nieuwe fase met een ander bereik (4 tot 6) pas doorwerkte na twee trainingen buiten het oude bereik. Een keer RIR 1 waar 2 bedoeld was werd bovendien het nieuwe streven. Wie het sjabloon of het programma aanpast, verwacht dat het scherm dat meteen volgt.

## Alternatieven

Bereik altijd afleiden zoals voor deze wijziging: afgewezen om bovenstaande reden. Het afgeleide bereik schrappen: niet gedaan, want het blijft nodig op de pagina Kracht en als terugval.

## Bron

`docs/onderzoek/Kracht loggen en progressie.md` (KR-4) en het rapport van Warden Krachtregels (bevinding B7).

## Vervangt

Niets. Het afleiden uit de historie (`deriveRange`) blijft bestaan als terugval.

## Terugdraaien

In `planExercise` (`src/engine/forgeWorkout.ts`) geen `plan` aan `prescribe` meegeven.

## Aanvulling (ronde 2)

Bij het ruilen van een oefening neemt de nieuwe oefening het bereik van het sjabloon niet over, want squat 5 tot 8 zegt niets over beenstrekken. Er gaat dan alleen de RIR van het plan mee; het bereik komt uit de eigen historie van de geruilde oefening.
