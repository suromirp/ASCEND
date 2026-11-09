# Rond een vakantie gaat beenkracht voor een tweede keer heuvels of intervallen

Datum: 2026-11-09
Status: aangenomen

## Besluit

In de indeling rond een vakantie (`engine/leaveAround.ts`) krijgt een beendag (Benen A, een krachttraining met zware benen) voorrang als in een week niet allebei passen: de beendag en heuvels of intervallen, met 48 uur rust en rust voor de lange duurloop. Dat geldt als de week ervoor of erna al heuvels of intervallen heeft. Heeft geen van beide buurweken ze, dan blijft de huidige volgorde: de heuvels of intervallen van die week blijven staan.

Twee weken achter elkaar zonder beenkracht mag niet als het anders kan. Heuvels (of harde loopjes) twee keer in dezelfde week telt als fout, zodat wat niet past eruit gaat en niet in de week erna wordt gedrukt. Een training zonder eigen plek in de week (zoals Benen B, die het programma niet meer plant) valt voor een met eigen plek.

De vaste regels van het vorige besluit blijven gelden, ook 48 uur tussen Bovenlichaam A en B.

## Reden

In het nagemaakte voorbeeld (vakantie za 14 tot wo 18 november) liet de indeling Benen A in de tweede week vallen en bewaarde de heuvelintervallen, terwijl de week ervoor al heuvelintervallen had. De eigenaar koos op 9 november het advies: beenkracht gaat voor een tweede keer heuvels.

Uitkomst van het voorbeeld: week 1 ongewijzigd; week 2 do Bovenlichaam A, vr Benen A, za Bovenlichaam B, zo Lange duurloop, de heuvelintervallen van week 2 vervallen met de vaste zin. De eigenaar verwachtte vr Bovenlichaam A en do Benen A; dat zet Bovenlichaam A en B op twee dagen na elkaar, wat de weekcontrole (LEG-SPACING, 48 uur) een bevinding noemt. Daarom staat Benen A op vrijdag. Op beide dagen heeft de week dezelfde trainingen.

## Alternatieven

- Beenkracht altijd voorrang geven: dan verdwijnen de enige heuvels in een week zonder heuvels in de buurweken.
- De 48 uur tussen Bovenlichaam A en B loslaten voor het verwachte voorbeeld: breekt een vaste regel.

## Bron

De melding van de eigenaar van 9 november, `docs/beslissingen/2026-11-09-planner-rond-vakantie.md`, `docs/beslissingen/2026-11-09-planner-vakantie-lange-duurloop.md`.

## Vervangt

Niets. De twee besluiten hierboven blijven staan; dit vult de rangorde aan.

## Terugdraaien

Haal `W_HARD_OVER_LEG`, `W_LEGLESS_PAIR`, `W_HARD_TWICE` en `W_DROP_SPARE` uit de score in `engine/leaveAround.ts`. Er is niets opgeslagen.
