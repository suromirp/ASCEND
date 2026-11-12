# StairMaster krijgt een eigen wandelworkout op je horloge

Datum: 2026-11-12
Status: aangenomen

## Besluit

Kies je bij een looptraining in de Briefing een manier die wandelen is (de StairMaster bij heuvelintervallen en bij heuvelsprints en afdalen), dan gaat er een wandelworkout naar je horloge in plaats van de hardloopworkout: dezelfde opbouw in tijd, de namen van de manier, geen tempo. De rij Horloge zegt welke workout er staat. De instelling Eigen workout bij een andere manier (aan, het advies) zet het uit; uit is het gedrag van voor dit besluit.

## Reden

De eigenaar vroeg erom op 12 november ("Ja, StairMaster een eigen wandelworkout"). Een hardloopworkout met tempo klopt niet op de trap, en de Briefing kon alleen eerlijk zeggen dat je de Stair Stepper zonder workout moest starten.

## Wat ik vond over de soort

- Garmin kent voor een geplande workout maar een korte lijst soorten: hardlopen, fietsen, baanzwemmen, kracht, cardio, algemeen, yoga en pilates. Dat zei de maker van intervals.icu op het forum (draad "Planned Walk transfers to Garmin as Custom / Workout", 30 november en 1 december 2023, https://forum.intervals.icu/t/planned-walk-transfers-to-garmin-as-custom-workout/54574). Wandelen en Stair Stepper staan er niet in. Een geplande workout die op het horloge als Stair Stepper start bestaat dus niet via deze weg.
- In dezelfde draad: een geplande Walk kwam eerst als "Custom" aan en stond na een aanpassing bij de optie Walk op het horloge. Of dat nu nog zo is, staat er niet.
- Over Hike en Stair Stepper als soort van een geplande workout vond ik niets bevestigd.
- Gekozen: `Walk`. Dat is de soort die ASCEND al stuurt voor wandeltrainingen (bergconditie, rugzak), dus dezelfde weg als wat al werkt, en de enige waarvan gemeld is dat hij bij wandelen op het horloge aankomt.
- Niet gecontroleerd: een echte verzending. Dat kan niet zonder sleutel. Of de workout op de Forerunner bij Wandelen staat, en of je hem ook vanuit Stair Stepper kunt openen, moet de eigenaar één keer op het horloge zien. De Briefing zegt daarom "Start hem bij Wandelen" en niet "Start Stair Stepper".

## Eigen keuzes

- Welke manieren: elke looptraining (soort Run) met een manier die als wandelen telt (`modalitySport`). Dat zijn er nu drie: heuvelintervallen met StairMaster, heuvelsprints en afdalen met StairMaster, en de lange duurloop als wandeling buiten (`long_hike_outdoor`). De laatste zat niet in de opdracht maar volgt uit dezelfde regel en uit de naam van de instelling; die workout is één stap in zone 2. Fietsen in plaats van lopen blijft zoals het was. De lijst staat vast in een snapshot (`watchWorkoutPlace.test.ts`).
- De workout zelf: de stappen en duren van de training (`buildWorkoutPlan`, ongewijzigd), met de namen uit `data/placeBrief.ts` ("Stevig traplopen", "Rustig doorstappen"). Geen tempo, ook niet met een testloop. Hartslag volgens de bestaande regels: geen doel op een stap korter dan twee minuten, op herstel, opwarmen en uitlopen. Bij heuvelintervallen blijft er dan geen hartslagdoel over, dus zegt een regel boven de stappen de intensiteit in woorden: "Traplopen, StairMaster. Op gevoel en hartslag, geen tempo. De stevige blokken: RPE 8-9." (RPE 8-9 is wat de training al zegt voor zwaarte 4). Hartslagdoelen op een wandelworkout zijn zonenamen, niet de slagen van ASCEND: dat zijn loopzones.
- Vervangen: één `PUT` op hetzelfde evenement in de agenda (zelfde id en `external_id`), niet eerst weghalen en dan opnieuw maken. Zo zijn er nooit twee, en mislukt het, dan staat de oude er nog. Of intervals.icu bij een wissel van soort de workout bij Garmin netjes vervangt, kon ik niet controleren.
- Wanneer: meteen na de tik in de Briefing (`syncWatchAfterPlaceChange`), zonder de rem van 15 minuten, met de bestaande tijdgrens per aanvraag. Een keuze die voor het horloge niets verandert (heuvel of loopband) vraagt niets van het netwerk. Tikken gaan een voor een. De keuze in het logformulier stuurt niet meteen: daar ben je al aan het loggen; de gewone ronde pakt het op.
- Het boekje onthoudt per verstuurde workout de soort (`TrackedWorkout.type`, optioneel, alleen op dit toestel en niet in een back-up; daarom geen migratie). Een oud record zonder soort was altijd de workout van de training.
- De regels in de rij Horloge, in de woorden die er al stonden:
  - verstuurd: "Er staat een wandelworkout op. Start hem bij Wandelen."
  - gekozen na het versturen, nog niet vervangen: "Er staat nog een hardloopworkout op. De wandelworkout komt eraan." (amber)
  - nog niet verstuurd: "Er komt een wandelworkout op je horloge."
  - mislukt: "Versturen lukte niet: er staat nog een hardloopworkout op. Start Stair Stepper zonder workout." of zonder oude workout "Versturen lukte niet. Start Stair Stepper zonder workout." (amber)
  - horloge sturen uit of niet gekoppeld: "Start Stair Stepper zonder workout." zoals het was.
  - instelling uit: de regels van voor dit besluit.
- Het blad achter de rij Horloge (Je horloge) laat nog de stappen van de training zien; dat heb ik niet aangeraakt.

## Vingerafdruk

Een training zonder wandelkeuze geeft precies dezelfde workout en vingerafdruk als voorheen: getoetst over alle trainingen, vier weken, met en zonder testloop, voor elke manier die geen eigen workout krijgt. Er wordt dus niets stil opnieuw verstuurd. Alleen de drie combinaties hierboven veranderen, en alleen als de keuze is gemaakt.

## Alternatieven

- `Hike`: ook wandelen, maar nergens bevestigd dat het op Garmin aankomt.
- Een cardio-workout: zou dichter bij Stair Stepper kunnen starten, maar intervals.icu heeft geen eigen soort die daar zeker op uitkomt en hartslagzones voor wandelen gaan dan verloren.
- Weghalen en opnieuw maken: twee aanvragen, en mislukt de tweede dan staat er niets.

## Bron

Opdracht van de eigenaar, 12 november 2026. `docs/onderzoek/Horloge, server en weegschaal.md`, `docs/onderzoek/Datavelden voor je horloge.md`, het forum van intervals.icu (zie boven). Besluit `2026-11-12-briefing-per-manier.md`.

## Vervangt

Niets. Het vult `2026-11-12-briefing-per-manier.md` aan: daar stond dat wat naar je horloge gaat niet verandert met de manier.

## Terugdraaien

De instelling uitzetten geeft het oude gedrag. In de code: `watchPlaceOf` in `src/engine/watchWorkout.ts` altijd `undefined` laten geven.
