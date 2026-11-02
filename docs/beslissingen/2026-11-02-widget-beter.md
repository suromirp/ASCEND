# Widget beter: pictogram, morgen en nooit afgeknipt

Datum: 2026-11-02
Status: aangenomen

## Besluit

De widget Vandaag krijgt links een rond sportpictogram, rechts de tekst, en een regel over morgen. De tekst wordt bij geen enkele standaardgrootte meer afgeknipt. Dit vraagt een nieuwe APK, dus het native niveau gaat naar 6.

## Reden

Op een Samsung-telefoon werd de regel met de duur onderaan afgeknipt en was de widget kaal. De oorzaak zat in de indeling: 16dp opvulling boven en onder plus drie regels (kopje, titel, duur) pasten niet in de rij van één cel (minimaal 40dp hoog). Nu is de opvulling 8dp boven en onder, de hoogte van de tekst wordt niet meer vastgelegd, en de widget kiest zelf wat erop past.

Wat erop staat:
- Laag (één rij): de titel op één regel en daaronder de duur. Is de widget breed genoeg (vanaf 220dp), dan staat morgen op dezelfde regel: "40 min · morgen Lange duurloop". Het kopje Vandaag valt dan weg.
- Hoog (vanaf 100dp, bijvoorbeeld 4x2): het kopje Vandaag, de titel op twee regels, de duur, en een eigen regel "Morgen: <training>" of "Morgen rust" in gedempte kleur.
- Gedaan: is de training van vandaag gelogd, dan staat er een mint vinkje in plaats van het sportpictogram en "Gedaan" in mint onder de naam, met morgen eronder.
- Ziek: "Rust vandaag" blijft, zonder iets over morgen. Vakantie: "Vakantie", en morgen is rust zolang de vakantie doorloopt, anders de eerste training.

De soort (`kind`: hardlopen, kracht, wandelen, bergtocht, fietsen of rust) komt uit `components/sportKind.ts` en gaat mee in de samenvatting van `engine/widgetSummary.ts`, samen met `done`, `tomorrow` en `tomorrowRest`. De vectoren (`ic_widget_*.xml`) volgen de pictogrammen van stijl C in drie tinten van de sportkleur; de kleuren staan alleen in `colors.xml`, gelijk aan de tokens. De widget is nu te vergroten en te verkleinen (2x1 tot 4x2 en groter), standaard 4x1.

Rekken heeft geen eigen pictogram in de widget: een herstelsessie telt in de widget niet mee als training en valt onder rust.

Niet op een toestel of in een Gradle-build geprobeerd; de eerste proefbouw is de controle. De drempels (100dp en 220dp) zijn schattingen en staan bovenin `TodayWidgetProvider.java`.

## Alternatieven

Responsieve RemoteViews met een eigen indeling per maat (vanaf Android 12): meer bestanden voor weinig winst, en minSdk is 26. Het kopje Vandaag altijd laten staan: kost in een rij van één cel de ruimte voor de duur.

## Bron

`docs/beslissingen/2026-11-02-snelkoppelingen-en-widget.md`, `docs/beslissingen/2026-10-24-pictogrammen-in-stijl-c.md`.

## Vervangt

Niets. Het besluit over de snelkoppelingen en de widget blijft staan; dit breidt de widget uit.

## Terugdraaien

Zet de oude indeling terug; het native niveau blijft staan, want het gaat nooit omlaag.
