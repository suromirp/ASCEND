# MacroFactor Workouts is tijdelijk

Datum: 2026-10-25
Status: aangenomen

## Besluit

Het inlezen van MacroFactor Workouts (programma, trainingen, 1RM) is een tijdelijke brug. Het dient om te leren hoe MacroFactor kiest en om het eigen algoritme van ASCEND te verbeteren. Het doel is niet dat ASCEND hetzelfde gaat kiezen als MacroFactor. Op een gegeven moment haalt de eigenaar het workoutdeel uit de app, en dan plant en volgt ASCEND alle krachttraining zelf, in Forge.

Tot dan geldt:
- De vergelijking blijft de "raak"-meting: voor beide kanten dezelfde toets ("was het voorstel goed voor die dag"), nooit "kiest ASCEND hetzelfde" (`2026-10-24-kracht-stil-toetsen.md`).
- Wat ASCEND uit de werkwijze van MacroFactor overneemt, komt in de eigen engine terecht, met een eigen onderbouwing uit het onderzoek. Er komt nergens een regel die alleen bestaat omdat MacroFactor het zo doet.
- Wat uit een eigen export af te leiden is over hoe MacroFactor rekent, blijft privé en komt niet in deze openbare repo. De voorwaarden van MacroFactor verbieden reverse engineering (artikel 7.4). In de repo staat alleen wat MacroFactor zelf publiceert, in eigen woorden en met de bron erbij.
- Code die alleen voor het inlezen van MacroFactor Workouts bestaat, blijft achter de adapter in `src/integrations/` en de importfuncties. Zo is het workoutdeel later in één keer weg te halen, zonder dat de engine of de schermen van Forge ervan afhangen.

Het inlezen van gewicht en vetpercentage uit MacroFactor valt hier niet onder. Dat blijft, tot de eigenaar anders besluit.

## Reden

De eigenaar: "Het doel was niet om precies MacroFactor te worden, maar te begrijpen wat zij doen." En: "Die functie gaan we op een gegeven moment er weer uit halen. Dan gaat het hele workoutdeel weg uit de app en kan de app dit allemaal zelf. Nu proberen we ons algoritme eerst te verbeteren."

## Alternatieven

ASCEND naar MacroFactor laten kiezen: valt af. Niemand weet of MacroFactor goed kiest, en het eigen algoritme zou dan nooit beter worden dan de kopie.

## Bron

Gesprek met de eigenaar op 25 oktober 2026, en het verslag van Scout MacroFactor over hoe MacroFactor kiest (privé, niet in de repo).

## Vervangt

Niets. Het vult `2026-10-24-kracht-stil-toetsen.md` aan.

## Terugdraaien

Wil de eigenaar MacroFactor Workouts toch houden, dan vervalt alleen het voornemen om het workoutdeel weg te halen. De rest blijft zoals het is.
