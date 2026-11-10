# De regel bij te dicht op elkaar vraagt wat de controle vraagt

Datum: 2026-11-10
Status: aangenomen

## Besluit

De melding in Week over twee zware beendagen rekent het aantal dagen dat ertussen hoort met dezelfde som als de controle zelf (`findHeavyConflicts` in `engine/scheduler.ts`): een dag extra als het logboek van een van de twee zwaarder was dan normaal (RPE 9 of hoger, of een uitschieter). De regel zegt dat er dan bij: "Lange duurloop was zwaarder dan normaal, daarom een dag extra." Staat er genoeg ruimte tussen en meldt de controle het toch, dan is de training ertussen ook zwaar voor de benen en zegt de regel dat het drie zware beendagen achter elkaar zijn.

## Reden

De eigenaar zag "Er zit 1 dag tussen, liefst 1 dag ertussen (48 uur)". De controle vroeg 2 dagen, de tekst rekende zonder de extra dag. De planning zelf verandert niet: alleen de tekst.

## Niet gecontroleerd

Geen Warden en geen Lookout: kleine fix door de coördinator zelf, alleen tekst uit de engine, met een test. Het scherm is niet in beeld gezien met deze stand.
