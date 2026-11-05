# Een gemiste training naar later heet gewoon verplaatsen

Datum: 2026-11-05
Status: aangenomen

## Besluit

Zet je een gemiste training naar vandaag of later (slepen of het blad), dan ziet dat eruit als een gewone verplaatsing. Week toont de oude rij niet meer, de nieuwe rij zegt "verplaatst van wo 4", en het blad en het Akkoord-blad heten Verplaatsen en Toch verplaatsen, niet Inhalen. Onder de motorkap blijft alles zoals in `2026-10-29-gemiste-training-inhalen.md`: de oude rij wordt overgeslagen met jouw slot, er komt een nieuwe rij met `catchUp`, Ongedaan maken zet het terug. De historie verandert niet.

## Reden

De eigenaar vond "ingehaald" onlogisch: een training die je een dag opschuift heb je niet ingehaald, je hebt hem verplaatst, net als elke andere dag in je week. De dubbele rij met een rood kruis voegde niets toe.

## Alternatieven

De oude rij echt verplaatsen: omschrijft een voorbije dag, verworpen zoals in het eerste besluit. De oude rij laten staan met "verplaatst naar": nog steeds een dubbele rij, verworpen.

## Bron

Gesprek met de eigenaar, 5 november.

## Vervangt

De woorden en de zichtbare oude rij uit `2026-10-29-gemiste-training-inhalen.md`; de opslag daaruit blijft.

## Terugdraaien

Haal de regel in `WeekPlanner.tsx` weg die een overgeslagen rij met een inhaal overslaat, en zet de woorden in `engine/catchUp.ts`, `placeReason.ts`, `RescheduleDialog.tsx`, `SessionActionSheet.tsx` en `MoveSuggestions.tsx` terug.
