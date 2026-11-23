# Zuinige start van de coördinator

Datum: 2026-11-23
Status: aangenomen

## Besluit

De coördinator wisselt bij ongeveer 200k context of na drie bundels, wat eerst komt. Bij de start leest hij CLAUDE.md en het blok Start van `.claude/coordinator/overdracht.md` (hoogstens 3 KB). `.claude/coordinator/werkwijze.md` leest hij alleen als hij het nodig heeft; `docs/backlog.md` en `eigenaar.md` alleen met grep op een I-nummer. Elke helperopdracht eindigt met "Antwoord hoogstens tien regels; details in een bestand op je tak."

## Reden

Vannacht zat een verse coördinator na twintig minuten al op 149k context, vooral door de uitslagen van helpers en door lange bestanden bij de start. Een lange chat leest bij elke melding zijn hele geschiedenis opnieuw en wordt duur.

## Alternatieven

- De grens op 150k houden. Niet gekozen: dan wisselt de coördinator midden in een bundel, terwijl de start zelf al te veel kostte.
- Alles bij de start blijven lezen. Niet gekozen: het meeste is voor de taak van dat moment niet nodig.

## Bron

Opdracht van de eigenaar, 23 november. Bouwt voort op `2026-11-21-zuinige-stand.md`. Uitgewerkt in de skills `coordinator-wissel` en `werkverdeling`.

## Vervangt

De wisselgrens van 250k tot 300k en de overdracht onder 10 KB uit `2026-11-20-lange-chat-en-kosten.md`.

## Terugdraaien

De grens en de startregels in de skill `coordinator-wissel` terugzetten en `werkwijze.md` weer in de overdracht opnemen.
