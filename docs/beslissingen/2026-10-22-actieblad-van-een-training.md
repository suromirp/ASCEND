# Het blad van een geplande training: eerst kiezen, dan invullen

Datum: 2026-10-22
Status: aangenomen

## Besluit

Het blad dat opent als je op een geplande training tikt, toont eerst wat het is (dag, naam, soort en minuten), één gouden knop voor de keuze die bij de dag past en daaronder de andere keuzes als rijen. Gedaan en Verplaatsen openen elk hun eigen stap. Elk onderblad in de app past binnen het scherm dat je ziet.

- Vandaag of eerder: Gedaan is de hoofdkeuze (kracht die je in ASCEND bijhoudt: Training starten). Voor een dag die nog komt is Verplaatsen de hoofdkeuze en staat afvinken alleen als rij "Vandaag al doen".
- Kracht in MacroFactor: de knop heet Gedaan, met de regel "Je sets komen vanzelf uit MacroFactor". Staat de training van die dag al in het ingelezen bestand, dan toont het blad "Uit MacroFactor: 52 min, 18 sets" met Opslaan in plaats van Gedaan. Een training die uit MacroFactor kwam, toont dezelfde regel.
- De duur in de stap Gedaan zegt waar hij vandaan komt: "Uit MacroFactor" alleen als er echt een MacroFactor-training is, anders "Gepland".
- De zwaarte is één rij van 4 tot 10. Tien vakjes passen op 360 px niet naast elkaar met tikdoelen van 44 px, en een hele krachttraining lichter dan 4 vraagt het plan niet. Het invulscherm van de training houdt de schaal van 1 tot 10.
- Verplaatsen: vrije dagen eerst, dan dagen waar het samen kan, met de reden eronder ("Vrije dag", "Met Rustige duurloop, samen 105 min"). Een gedeelde dag telt twee dagen afstand extra mee, zodat een vrije dag dichtbij wint. De regel van 48 uur blijft.
- Elk onderblad stopt 16 px onder de statusbalk en scrolt binnen zichzelf (`.animate-sheet-in` in `src/index.css`, in dvh zodat de adresbalk van Android niet meetelt).

## Reden

De eigenaar: "Dit is niet top." Afvinken en verplaatsen stonden door elkaar in één lange lap, met "Duur, uit MacroFactor" voor een training die nog moest komen, eerst twee dagen waar al een lange training stond, onderstreepte links en een losse Sluiten. Daarna: "Ik zie de bovenkant van het scherm niet." Een blad hoger dan het scherm duwde naam, dag en sluiten buiten beeld.

## Alternatieven

Alles open laten maar netter zetten: blijft een lange lap. Tien zwaartevakjes in twee rijen: het oude raster waar de eigenaar over viel. Een schuifregelaar: geen leeg begin, en een getal kies je sneller met één tik. De hoogte per blad regelen: dertig bladen, en een nieuw blad vergeet het weer.

## Bron

Feedback van de eigenaar op een screenshot (Bovenlichaam B van morgen) en de vaste regel voor een rij en een onderblad uit het ontwerp van de nieuwe instellingen.

## Vervangt

Niets.

## Terugdraaien

`engine/sessionActions.ts` bepaalt de keuzes; de oude opbouw staat in de geschiedenis van `SessionActionSheet.tsx`. De extra afstand voor een gedeelde dag staat bij FREE-DAY-FIRST in `engine/moveSuggestions.ts`, de zwaarte bij SESSION-RPE-FROM-4 in `engine/sessionActions.ts`. De hoogtegrens is één regel in `src/index.css`.
