# Forge herinrichting, de rest: kolom Voorschrift weg, één plek per handeling, naam in Marcellus, blad Set zichtbaar

Datum: 2026-11-26
Status: aangenomen

## Besluit

Het vervolg op `2026-11-02-forge-herinrichting.md`, volgens `docs/visie/Ontwerprapport Forge.md`. Alleen `src/components/forge/` en de kolombreedte in `src/index.css`; geen engine-logica veranderd.

- Kolom Voorschrift weg (rapport 3 en 4.1): de tweede kolom van de tabel is altijd Vorige keer, de wisselknop in de kop is weg. Het bereik en de reserve staan als één regel onder de naam ("4 sets van 6 tot 8 met 2 over", gelijke sets samen, een afwijkende laatste set erachter), uit `engine/programLine.ts` via `prescriptionLine` in `forgeWorkoutHelpers.ts`. Daaronder "Rust 3:00 tussen sets"; "0 van 4 sets" is uit de kaart (de vinkjes en de kop zeggen het). Een oefening op tijd of een houding heeft geen regel; dan staat het aantal sets er zoals voorheen. Voorschrift overnemen staat in het blad Set. Het concept bewaart `column` niet meer; een concept van eerder met het veld opent gewoon met Vorige keer (veld optioneel, genegeerd, geen migratie).
- De instelling Woorden in Forge blijft: het rapport haalt haar niet weg, en ze bepaalt nog steeds Plan of Voorschrift en Over of RIR in het blad Set, de uitleg en de RIR-kop.
- Kleiner maken en Afronden alleen in de kop (rapport 3): de rijen zijn uit het menu van de training, dat nu Pauzeren, Een oefening per scherm, Waarom deze training en Training verwijderen heeft. De drie puntjes blijven (voorlopig) in regel één; verplaatsing naar regel twee (rapport 4.5) is niet gedaan, want dat valt buiten deze zes punten.
- De naam van een oefening staat in de display-letter (Marcellus, `font-display`, 20 px, één gewicht) en breekt af over meerdere regels in plaats van af te kappen.
- Het blad Set is zichtbaar: het setnummer is een knop van 44 bij 44 px (`data-sheet-from`, begin van de veeg naar links blijft, `data-swipe-ok`) die dezelfde `RowMenuSheet` opent als lang drukken. De eerste kolom van de tabel is 36 in plaats van 30 px; Vorige keer krijgt daardoor ongeveer 84 px op 360 px, wat het rapport ook noemt. De regels onder een set staan 40 px ingesprongen (was 36). In een training om mee te kijken is de knop uit.
- De regel met schijven ("per kant ...", "alleen de stang") is gewone tekst zonder knop (rapport 4.1; de stang staat in het cijferblok). Hij stond al onder elke werkset van een stang zodra Schijven bij de set tonen aan staat; die instelling blijft standaard uit (besluit `2026-11-11-forge-kern-zichtbaar.md`, de eigenaar koos dat), "kan niet precies" staat er altijd. Het rapport bedoelt een regel per set "alleen als het nodig is", dus er is geen tweede regel per oefening bijgekomen en de lijst is niet onrustiger geworden.
- Het percentage van je maximum bij een set is niet gebouwd: het Ontwerprapport noemt het niet en een tweede getal in de rij botst met "zo weinig mogelijk in de kaart". Geen getal in de engine hoefde daarvoor te veranderen. Wil de eigenaar het, dan is het een eigen besluit.

## Reden

De backlog "Forge herinrichting, de rest": Voorschrift herhaalde wat in de vakken staat en was een onzichtbare knop, Kleiner maken en Afronden stonden dubbel, lang drukken was de enige weg naar het blad Set.

## Alternatieven

Voorschrift laten staan achter de instelling: houdt een onzichtbare knop in de kop en vier keer dezelfde tekst. Het setnummer 44 px breed maken door de kolom op 44 px te zetten: Vorige keer zou dan op 360 px te smal worden; een negatieve marge van 4 px houdt de rij gelijk, zoals bij het vinkvak.

## Terugdraaien

Per punt de wijziging in `ExerciseBlock.tsx`, `ForgeMenus.tsx` en `index.css` terugzetten uit de commit van deze ronde; er is niets opgeslagen dat weg moet.
