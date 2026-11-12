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

## Aanvulling na de review (12 november, dezelfde dag, voor main)

Warden keurde één eigen keuze af; dit stuk gaat voor waar het de tekst hierboven tegenspreekt.

- Alleen de StairMaster. Welke manier een eigen workout krijgt staat in een vaste lijst (`OWN_WORKOUT_PLACES` in `engine/watchWorkout.ts`), niet meer afgeleid uit de sport van de manier. De lange duurloop als wandeling buiten krijgt hem dus niet: Hike tegen Wandelen sprak elkaar tegen, de stap heette nog Lange duurloop, de hartslag ging naar wandelzones, en het stond aan zonder dat erom gevraagd was. Een nieuwe manier komt er pas bij na een eigen besluit.
- Het boekje gelooft het antwoord. Noemt het antwoord van intervals.icu een andere soort dan gevraagd, dan telt de verzending als mislukt: het boekje houdt de oude workout en de rij zegt "Versturen lukte niet". Een antwoord zonder soort wordt aangenomen zoals voorheen.
- Eén rij. Alles wat naar de agenda schrijft (de ronde bij start en terugkomen, een instelling, de knoppen, de tik in de Briefing) loopt een voor een door dezelfde rij in `storage/watchWorkouts.ts`. Een gewone ronde kan dus niet naast een tik lopen en het boekje terugschrijven.
- Een nieuwe poging wist eerst de oude fout, zodat de rij "komt eraan" zegt terwijl hij loopt; mislukt hij, dan schrijft hij zijn eigen reden.
- Regels erbij in de rij Horloge:
  - mislukt terwijl er al een oudere wandelworkout staat: "Er staat een wandelworkout op. Een wijziging versturen lukte niet. Start hem bij Wandelen."
  - terug naar buiten, nog niet vervangen: "Er staat nog een wandelworkout op. De hardloopworkout komt eraan."
  - terug naar buiten en mislukt: "Versturen lukte niet: er staat nog een wandelworkout op."
- De uitleg bij de instelling zegt eerlijk dat je horloge de training als wandeling vastlegt, zonder traptelling.
- Niet nu, naar de backlog: een ronde overslaan als er al een nieuwere wacht; het blad Je horloge noemt nog "Hard bergop".

## Tweede aanvulling (12 november, na Pathfinder, voor main)

- Na afloop telt de training mee. Een wandelworkout komt van het horloge binnen als wandeling, en die paste niet op een looptraining: de heuvelintervallen bleven open en er kwam een los log Herstel of Bergtocht, terwijl de rij Horloge "Vinkt zelf af." zei. Nu past een wandeling (en een activiteit van de soort `StairStepper`, als je die zonder workout startte) op een geplande looptraining waarvoor de StairMaster is gekozen. Alleen op de dag van die training en alleen met die keuze; zonder keuze verandert er niets. Dat geldt bij vanzelf afvinken, bij het voorstel op Vandaag, bij Andere training en bij koppelen achteraf (`fitsChosenWay`, `fitsChosenWayLog`).
- Historie: dit is geen uitzondering op de regel. Er wordt geen bestaand log herschreven. Vanzelf afvinken maakt een nieuw log dat naar de geplande training wijst; koppelen achteraf vult alleen een lege verwijzing na Akkoord, via de bestaande weg (`linkLog`, terug met `unlinkLog`). Het nieuwe log zegt welke manier het was (`modality`), zoals een handlog dat doet.
- De soortnaam `StairStepper` is die van intervals.icu voor zo'n activiteit; dat is niet met echte data gecontroleerd. Klopt de naam niet, dan gebeurt er voor die activiteit niets anders dan voorheen.
- Het blad Je horloge toont bij de StairMaster de wandelworkout: soort Wandelen, de stapnamen van de manier en de regel "Op gevoel en hartslag, geen tempo. De stevige blokken: RPE 8-9." (`watchManualFor`).
- Verder weg dan zeven dagen staat de dag erbij: "Er komt op zaterdag 14 november een wandelworkout op je horloge."
- De schakelaar uitzetten en pauzeren lopen ook door de rij. Regel: een functie binnen de rij roept nooit een andere rij-functie aan, maar de variant die op Now eindigt.
- Niet meegenomen: de teller van de weeklast (`looseStandIns`) kent de keuze nog niet. Dat speelt alleen bij een los wandellog dat nog niet gekoppeld is; na het afvinken of koppelen telt het gewoon.

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

## Aanvulling van de coördinator (12 november, na Warden ronde 3)

- Het log van een StairMaster-training die het horloge als wandeling opnam telt als wandelen (`sport: 'hiking'`, zoals een handlog met die manier), niet als looplast.
- Zo'n log krijgt geen omgeving (geen "Buiten"), en de stijging van de stepper telt niet als daling.
- Bekende grens: een gewone wandeling van vergelijkbare duur op de dag van de training wordt ook afgevinkt als die training; Klopt niet haalt het log weg. Een los StairStepper-log (eigen sport) koppel je niet achteraf, alleen een wandeling.
