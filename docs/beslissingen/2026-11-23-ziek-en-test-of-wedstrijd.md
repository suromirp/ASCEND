# Ziek, en er staat een test of wedstrijd

Datum: 2026-11-23
Status: aangenomen

## Besluit

Een test of wedstrijd op een dag dat je ziek bent (koorts of buikgriep) staat in Let op, ook als het systeem hem plande. Een test krijgt alleen een voorstel om te verplaatsen, naar de verste passende dag van de week. Een wedstrijd krijgt nooit een voorstel, alleen de melding. Bij een gewone training van jou op een ziektedag biedt het voorstel laten vervallen of verplaatsen naar een rustige dag: ziek eerst laten vervallen, verkouden of in de opbouw eerst verplaatsen. De keuze gaat op de rol van de training, niet op het slot.

## Reden

Ziek melden haalt alleen weg wat van het systeem is en laat een test of wedstrijd staan, want die schuift alleen met jouw Akkoord. Dan zag je nergens dat hij op een ziektedag stond. Ziek zegt een test niets over je vorm, dus later in de week is beter dan morgen. Een wedstrijd heeft een vaste datum: of je start, kies je zelf. Verkouden mag rustig bewegen, dus daar is verplaatsen vriendelijker dan laten vervallen.

## Alternatieven

Een test of wedstrijd laten vervallen: dan verdwijnt een meetpunt of een doel zonder dat je het wilde. Een test naar de dichtstbijzijnde dag: die valt vaak net na de ziekte, als je nog niet hersteld bent. Kiezen op het slot (niveau 2): een test of wedstrijd met een slot is niveau 1 en kreeg dan het voorstel van een gewone training (Warden, 23 november).

## Bron

Backlog I-74, review van Warden op de tak claude/dayrules-23. Code: `src/engine/weekValidator.ts` (regel ILL), `src/engine/weekConcerns.ts`, `src/engine/weekFixProposal.ts#planWeekFix`.

## Vervangt

Niets. Bouwt voort op `2026-11-16-een-regel-uitzonderingen.md`.

## Terugdraaien

In `weekValidator.ts` de voorwaarde voor niveau 2 weghalen en in `planWeekFix` het verplaatsen bij ILL weglaten; dan meldt Let op weer alleen wat jij vastzette en biedt het alleen laten vervallen.
