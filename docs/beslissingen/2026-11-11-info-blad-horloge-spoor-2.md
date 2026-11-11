# Info-blad, spoor 2: Je horloge vanuit Week en Vandaag, en de punten van Warden

Datum: 2026-11-11
Status: aangenomen

## Besluit

Het blad Je horloge is nu ook te openen met de rij "Je horloge" in het blad van een training in Week (in Andere keuzes, direct na Hoe je het doet) en in het menu achter de drie puntjes op Vandaag (tweede rij, na Meer over deze training). Beide openen hetzelfde blad als de knop Horloge op het trainingsscherm. Spoor 1 en 2 gaan samen naar main, zodat de datavelden vanaf Vandaag en Week nooit slechter te bereiken zijn dan voor de wijziging.

## Eigen keuzes

- Week: de rij staat alleen bij een training die nog moet komen (vandaag of later), niet overgeslagen en niet gedaan, en alleen als het blad iets heeft. De regel eronder is de stand ("Verstuurd naar je horloge om 07:12") als de training gekoppeld is en "Laten zien of het gelukt is" aan staat, anders "Workout en datavelden" (`watchSheet.ts#rowSub`). Een rij met Pagina in Je horloge sluit eerst het blad van Week.
- Vandaag: de rij volgt `afterMenu` (eerst het menu dicht, dan het blad). De missiekaart zelf verandert niet (vraag 1 van het ontwerp, de eigenaar zei ja).
- De namen "Meer over deze training" en het label van de i blijven nog staan; gelijktrekken naar "Uitleg bij deze training" hoort bij spoor 3.

## Correcties op het besluit van spoor 1

Het besluit `2026-11-11-info-blad-horloge.md` wordt niet herschreven; dit zijn de correcties.

- Een wedstrijd en een testloop krijgen wel de knop Horloge. Ze hebben een workout (Hardlopen) om op je horloge te zetten, alleen geen advies voor de datavelden; het blad zegt dan "Voor deze training heb ik geen advies." Alleen kracht en rust hebben geen blad. Het commentaar bij `hasWatchSheet` zegt dat nu, met een test voor `tpl_race` (review van Warden).
- De rij naar Garmin koppelen heet "Je horloge instellen" in plaats van "Hartslagzones op je horloge": bij Heuvelintervallen en Bergconditie gaat de opmerking over een eigen activiteit en databeelden, niet alleen over zones.
- De horlogestand op het trainingsscherm sluit voor Garmin koppelen nu ook met `closeSheet`, zodat het concept bewaard blijft (was `requestClose`).
- De knop Horloge laat het blad uit zich groeien (`data-sheet-from`), net als elke rij die een blad opent.
- De uitleg bij Datavelden zegt "Bij een training" in plaats van "Bij een loop": een tocht met rugzak heeft ook datavelden.
- Het werkbriefje `bediening-en-beweging.md` noemt de drie bestanden van Je horloge en de valkuil van `closeSheet`.

## Tekstkaart

Eén verschil: het blad van de Lange duurloop in Week heeft de rij "Je horloge" met "Workout en datavelden" eronder (de stand heeft geen koppeling). Vandaag verandert niet, want in de nagemaakte stand is vandaag kracht en kracht heeft geen blad. De kaart is bijgewerkt met `npm run kaart`.

## Reden

Warden zag dat spoor 1 alleen de datavelden uit de uitleg haalde, waardoor ze vanaf Vandaag en Week tot spoor 2 juist verder weg stonden. Dat is precies de klacht van de eigenaar.

## Alternatieven

Spoor 1 los naar main en spoor 2 later: de datavelden stonden dan een tijd verder weg. De rij op de missiekaart zelf: het besluit van 9 november en het ontwerp houden de kaart gelijk.

## Bron

`docs/visie/Ontwerp Info-blad.md`, de review van Warden op `claude/info-blad-1` (11 november), de keuzes van de eigenaar op de vijf vragen.

## Vervangt

Vult `2026-11-11-info-blad-horloge.md` aan en corrigeert daar de zin over de wedstrijd en de naam van de zones-rij.

## Terugdraaien

Haal de rij in `SessionActionSheet.tsx` en `TodayMissionCard.tsx` weg; het blad zelf blijft werken vanaf het trainingsscherm.
