# Een andere rustdag is een voorstel met Akkoord

Datum: 2026-10-22
Status: aangenomen

## Besluit

Een andere rustdag kiezen in Instellingen laat eerst een voorstel zien, zoals bij vrije dagen en tochten: wat er verschuift, ook deze en volgende week, gemaakt met dezelfde planningsronde als na Akkoord. De rustdag en de nieuwe indeling worden pas samen bewaard na Akkoord; Liever niet laat alles zoals het was. De melding na Akkoord telt elke training die verschoof, en Ongedaan maken zet de rustdag en de planning terug.

Dit geldt altijd, ook met "Alles automatisch": een rustdag verandert tientallen weken tegelijk, net als een vakantie.

## Reden

De rustdag omzetten verschoof in de doorloop 84 trainingen over 40 weken, ook deze en volgende week, zonder voorstel, terwijl de melding "2 sessies aangepast" zei: alleen de reparaties van de weekcontrole werden geteld, niet de nieuwe indeling zelf. De werkafspraak is dat alles wat de planning inhoudelijk verandert via een voorstel met Akkoord gaat.

## Alternatieven

Twee opties in het voorstel, vanaf deze week of vanaf volgende week: de weekcontrole houdt de rustdag van deze week toch vrij, dus "vanaf volgende week" zou na Akkoord alsnog deze week veranderen. Eén voorstel dat laat zien wat er echt gebeurt is eerlijker. De trainingen krijgen geen slot: het blijven trainingen van het systeem, die de weekcontrole later nog mag bijstellen.

## Bron

Lookout Doorloop, punt 5. `engine/restDayProposal.ts`, `pages/Settings.tsx` (Rustdag), `state/AppDataContext.tsx#applyRestDay`.

## Vervangt

Niets. Het oude pad in `syncProgramHorizon` blijft alleen voor een rustdag die op een andere manier is opgeslagen (oudere gegevens).

## Terugdraaien

In Instellingen weer `updateSettings({ restDay })` aanroepen in plaats van `planRestDay`.
