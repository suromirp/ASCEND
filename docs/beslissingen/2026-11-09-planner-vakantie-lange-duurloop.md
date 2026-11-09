# Rond een vakantie hoogstens één lange duurloop per week, beenkracht blijft staan

Datum: 2026-11-09
Status: aangenomen

## Besluit

In de indeling rond een vakantie (`engine/leaveAround.ts`) telt een tweede lange duurloop in dezelfde week, of binnen vijf dagen van de vorige, als een harde fout, even zwaar als een bevinding van de weekcontrole. De gelogde lange duurloop telt mee. Zo vervalt die tweede lange duurloop eerder dan beenkracht (Benen A en B), die pas valt als hij echt nergens past. De vaste regels blijven: 48 uur tussen beenzware dagen, frisse benen voor heuvels en intervallen, liever geen dubbele dag.

Alleen een lange duurloop telt: een bergtocht (dezelfde rol), een korte versie en een dag in een tocht tellen niet mee, zoals bij ONE-LONG in de weekcontrole. De rangorde van het vorige besluit blijft, met één toevoeging bij punt 1: een tweede lange duurloop binnen een week of vijf dagen hoort bij de vaste regels.

## Reden

In het nagemaakte voorbeeld (vakantie za 14 en zo 15 en ma 16 tot en met wo 18 november, lange duurloop gelogd op zo 8) zette de indeling op wo 11 een tweede lange duurloop, drie dagen na die van zo 8, en liet Benen A en B in beide weken vallen. De eigenaar koos op 9 november het advies: hoogstens één lange duurloop per week. Nu staat week 1 als: ma Rustige duurloop, di Bovenlichaam A, wo Benen A, do Bovenlichaam B, vr Heuvelintervallen.

## Alternatieven

- De lange duurloop zwaarder laten vallen dan beenkracht met alleen een zwaarder gewicht voor het laten vallen: een lange duurloop op wo 11 bleef dan nog altijd goedkoper dan twee beendagen kwijt.
- Een grens van zeven dagen: een lange duurloop elke zondag valt dan buiten de regel, maar vijf dagen is wat de eigenaar noemde.

## Bron

De melding van de eigenaar van 9 november, `docs/beslissingen/2026-11-09-planner-rond-vakantie.md`, `docs/beslissingen/2026-11-02-48-uur-lange-duurloop.md`.

## Vervangt

Niets. Het besluit `2026-11-09-planner-rond-vakantie.md` blijft staan; dit vult de rangorde aan.

## Terugdraaien

Haal `W_LONG_NEAR` uit de score in `engine/leaveAround.ts`. Er is niets opgeslagen.
