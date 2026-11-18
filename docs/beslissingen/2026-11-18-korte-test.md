# De korte test: elke week vier minuten op je drempeltempo

Datum: 2026-11-18
Status: aangenomen

## Besluit

Eens per week een korte submaximale test aan het begin van je eerste rustige loop: 10 minuten inlopen, 4 minuten op je vaste testtempo (het midden van je drempeltempo uit je testloop, op 5 seconden), 1 minuut rechtop stilstaan, daarna je gewone loop. ASCEND leest uit de reeks van die loop je hartslag in de laatste minuut van het teststuk, het tempo dat je liep en hoeveel je hartslag zakte in de minuut stilstaan. Na vier geldige tests krijgt elke volgende één woord met een zin: Normaal, Beter of Let op. Alleen tekst: je zones en je drempel veranderen er nooit door.

## Reden

De eigenaar besloot op 17 november (I-79 stap 3): 4 minuten op drempeltempo plus 1 minuut stilstaan, elke week aan het begin van een rustige loop, het eerste oordeel pas na vier tests, alleen tekst, zones nooit. De hartslag heeft 3 tot 4 minuten nodig om bij te zijn en schommelt het minst bij een stevige inspanning; vier tests samen halveren de ruis (onderzoek hoofdstuk 3).

Hoe het werkt:
- Engine: `engine/shortTest.ts` (het voorstel, de dag, het teststuk, het eigen midden en het oordeel), alle grenzen in `engine/shortTestRules.ts`. Componenten: `ShortTestBlock.tsx` in de Briefing, `ShortTestCard.tsx` op het logblad.
- Planning alleen via Akkoord: in de Briefing van een rustige loop van vandaag of later staat het voorstel "Elke week een korte test" met het testtempo, Liever niet en Akkoord. Akkoord bewaart `settings.shortTestSeries` (antwoord, dag, tempo); de geplande trainingen zelf veranderen niet. Vanaf die dag krijgt per week (maandag tot zondag) de eerste rustige loop die niet is overgeslagen het blok "Korte test aan het begin" in de Briefing. Een rustige loop vóór vandaag zonder log is gemist en telt niet als de eerste: dan krijgt de volgende van die week de test. Een rustige loop korter dan 25 minuten, of met een andere manier dan hardlopen (StairMaster, fiets), krijgt geen test.
- Horloge (instelling "Korte test als workout", standaard aan): de rustige loop met de test gaat als tempoworkout: inlopen 10 minuten zonder doel, Korte test 4 minuten op het testtempo (2 procent eromheen), Stilstaan 1 minuut, de rest van de loop zonder doel. Nooit hartslag en tempo door elkaar (`watchWorkout.ts`). `buildWorkoutPlan` is niet aangeraakt. Gemeten op het demoprogramma over 8 weken (24 workouts die naar het horloge gaan): 8 van 24 krijgen een nieuwe vingerafdruk, precies de rustige loop met de test per week; de andere 16 zijn byte voor byte gelijk. Pas na Akkoord. Versturen en de stand op het horloge lezen dezelfde regel (`shortTest.ts#watchShortTest`), zodat een verstuurde loop op Verstuurd staat; Korte test aan of uit draait meteen een ronde als het sturen aan staat.
- Het teststuk: het snelste stuk van 4 minuten dat begint tussen minuut 5 en 20. Ligt het binnen 8 procent van je testtempo, dan was het een test; anders een gewone rustige loop, en het logblad zegt niets. Geldig voor een oordeel als het tempo binnen 2 procent lag, de test begon tussen minuut 8 en 15, je niet langer dan 10 seconden stilstond, er geen gat van meer dan 15 seconden in de hartslag van de laatste minuut zit, en je borstband het teststuk dekte. Anders de feiten met de reden, zonder oordeel en niet in je eigen midden.
- Zonder borstband dezelfde regel als stap 1 en 2: standaard telt de test niet ("Bij deze test zag ASCEND geen borstband. Je ziet de feiten, zonder oordeel."), met "Ik had hem wel om" (in `settings.strapWorn`, alleen als je band er anders meestal is), en met "Test zonder borstband" op Telt met ruime marge telt hij wel, met een grens van 8 slagen in plaats van 4.
- Het eigen midden: de mediaan van je laatste vier tot zes geldige tests ervoor, in hetzelfde dagdeel (voor of na 12 uur), één per dag (de eerste op tijd). Verschil kleiner dan 4 slagen: Normaal. Lager en niet zwaarder: Beter. Lager en zwaarder: Let op (vermoeidheid). Hoger: Let op, eerst warmte, slaap of een beginnende verkoudheid. Bij een duidelijk verschil zonder zwaarte geen woord, wel "Vul je zwaarte in bij deze loop voor een oordeel."
- De daling: je hartslag in de laatste 5 seconden van de test min die in de laatste 10 seconden van de minuut stilstaan, alleen als je stilstond (minder dan 25 meter in die minuut). Stopt de reeks binnen die minuut, dan staat er "De daling na de test is niet te lezen." Achtergrond, nooit een uitslag op zichzelf.
- Niets nieuws op het log: elke keer opnieuw uit de bewaarde reeksen (`storage/testStreams.ts#streamsForLogs`, alleen lezen, met tijdgrens). Niet op tijd gelezen: geen kaart.
- Instellingen: "Korte test" (blad Testloop, standaard aan; weer aan na Liever niet brengt het voorstel terug) en "Korte test als workout" (Trainingen naar je horloge, standaard aan).
- Opslag: `shortTest`, `shortTestWatch` en `shortTestSeries` in de instellingen, optioneel en additief; `storage/migrationsSettings.ts#migrateShortTestSeries` laat bij een import alleen een hele reeks door (bekend antwoord, dag, bij Akkoord een tempo tussen 2:30 en 15:00 per km). Een oudere back-up leest zoals hij was en krijgt later het voorstel. Het schemanummer blijft.

## Alternatieven

- Een eigen vraag naar de zwaarte van het teststuk (het onderzoek). Niet gedaan: de zwaarte van de hele loop uit Hoe ging het? telt, want elke test zit in dezelfde soort loop. Een aangenomen zwaarte telt niet. Een eigen vraag is open werk.
- Het resultaat als afgeleid veld `shortTest` op het log met een migratiestap (het onderzoek). Niet gedaan: zoals de drempel elke keer opnieuw uit de reeksen, dus geen omschrijving van logs en geen nieuwe vorm op het log.
- De vorm van intervals.icu (3 minuten op 105 procent). Niet gedaan: de eigenaar koos 4 minuten op drempeltempo.
- Niet gebouwd in deze stap: de vlakgrens, de warmtegrens, de wind, ziek gemeld en een zware dag in de 48 uur ervoor als poort; een nieuwe reeks voorstellen als je drempeltempo meer dan 5 procent verschuift; een voorstel voor een testloop na drie keer Beter; de rij op Je stand; de korte test in het blad Je horloge (handmatig nabouwen). Open punten voor een volgende stap.

## Open

- Elke loop met het sjabloon rustige loop kan als test tellen, ook een losse horlogeloop zonder vaste plek; later alleen lopen uit `shortTestSessionIds` laten meetellen voor het midden (review Warden 18 november).
- Een import met een onmogelijke of verre datum in `shortTestSeries` wordt aangenomen; later een echte datum eisen, niet later dan vandaag (`storage/migrationsSettings.ts`).
- Een los horlogelog telt niet als gedaan, en de eerste loop van de week wordt gekozen zonder naar duur of manier te kijken: is dat een loop op de fiets of korter dan 25 minuten, dan krijgt die week geen test en staat het voorstel nergens tot die dag voorbij is.

Bijgewerkt 18 november (I-91, deel 1 en 3):
- Manier: `buildWatchWorkout` toetst nu dezelfde `shortTestWay` als de Briefing, op de manier zoals de Briefing hem leest (`resolvePlace`), ook met "Eigen workout bij een andere manier" uit. Met de fiets (buiten of binnen) krijgt het horloge de gewone rustige loop, zonder test. Getoetst per manier aan beide kanten en met status Verstuurd na versturen. Alleen de rustige loop met de test en een manier die geen hardlopen is krijgt een andere vingerafdruk; bij hardlopen (buiten, loopband, wandelen en dribbelen) blijft elke workout byte voor byte gelijk.
- Plek van het voorstel: het voorstel staat alleen in de Briefing van de loop die na Akkoord van vandaag als eerste de test krijgt (`shortTestBriefing` via `nextShortTestRun`, dezelfde keuze als `shortTestSessionIds` met vandaag en de logs). Gekozen boven de dag noemen in de voorstelregel: het is één toets, geen nieuwe tekst, en Akkoord geeft de test dan aan de loop waar je naar kijkt.

- De Briefing toetst de 25 minuten op `plannedMinutes`, het horloge op de duur van het workoutplan; bij een vaste duur in de dagen van terugkomen na ziekte of verlof kan de Briefing de test tonen terwijl het horloge de gewone loop krijgt (herkeuring Warden 18 november).
- Is de rustige loop van vandaag al gelogd, dan staat het voorstel die dag nergens; morgen staat het op de volgende loop.
## Bron

`docs/onderzoek/Drempel en submaximale test.md` (hoofdstuk 3, hoofdstuk 4 en stap 3); de eigenaar 17 november (backlog I-79).

## Vervangt

Niets. Vult `2026-11-17-drempel-uit-je-tests.md` aan.

## Terugdraaien

"Korte test" uit zet het voorstel, het blok en de workout stil; de bewaarde reeks blijft staan. "Korte test als workout" uit laat de rustige loop op het horloge zoals hij was. In code: `ShortTestBlock` en `ShortTestCard` weghalen; `shortTestSeries` blijft onschadelijk in de instellingen staan.
