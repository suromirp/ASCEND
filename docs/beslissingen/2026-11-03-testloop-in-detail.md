# Testloop in detail: de bovenkant gaat over het teststuk

Datum: 2026-11-03
Status: aangenomen

## Besluit

Bij een testloop met een herkend teststuk (inlopen, beste 5 km, uitlopen; `testLayout`) gaan het oordeel,
de verdeling en de hartslag bovenaan "Hoe de run liep" over de 5 km van het teststuk, met één zin dat inlopen
en uitlopen hier niet meetellen (`runDetailView.ts#testFocusLine`). Een teststuk dat net buiten
"Gelijkmatig" valt, zonder kilometer die eruit springt, heet "Vrij gelijkmatig" met het verschil tussen de
helften in seconden per km, in plaats van "Wisselend". Bij een gewone run verandert niets.

Stilstaan vóór de eerste en ná de laatste beweging telt niet als stilstaan tijdens de run. Het scherm toont
alleen de stops tussen begin en einde ("Je stond samen 1:09 stil"), en een lange staart apart ("Na afloop
liep je horloge nog 9:18 door; die tijd telt nergens mee."). De kilometer waar de staart in viel, krijgt geen
"stilgestaan" meer. Bewegende tijd, afstand, het log en Inkorten blijven gelijk.

De tekstknop op het logblad bij een test die meetelt heet "Niet laten meetellen", als handeling naast
"Laten meetellen". De antwoorden op de vraag bij een twijfeltest blijven "Telt mee" en "Telt niet mee".

## Reden

Bij een echte testloop van de eigenaar (gegevens niet in de repo) zei het blad "Wisselend" en hartslag 170,
terwijl het teststuk gelijk liep (5:12 en 5:21 per km per helft) met een hartslag rond 183: het oordeel had
geen woord voor een lichte, gelijkmatige vertraging en de hartslag ging over de hele run met het rustige
inlopen erbij. "Je stond samen 10:25 stil" telde ook de 9 minuten dat het horloge na afloop doorliep.

## Hoe

Alles wordt bij weergave uitgerekend (`runDetailView.ts#withoutEdgePauses`, `edgePausesOf`, `edgePauseLine`).
`SessionLog.runDetail` blijft wat het is: afgeleid en append-only, er komt geen nieuwe versie en niets wordt
herschreven. De staart (en de kop) worden geschat uit de opgeslagen lijn: de kloktijd van het laatste (of
eerste) stukje lijn min de bewegende tijd die het tempo daar geeft. Boven de pauzegrens van 20 seconden is
dat stilstand aan de rand, nooit meer dan de stilstand die de kilometer zelf al had. Tempo's en voorspelling
lezen nog steeds `countedTests`; `bestEffort` is niet veranderd.

## Alternatieven

Een nieuw veld in `runDetail` met de precieze stilstand aan de randen: dat helpt alleen runs die nog
binnenkomen, het bestaande detail wordt niet opnieuw gelezen, en het vraagt een migratiestap. De reeks zelf
lezen bij het openen van het scherm: preciezer, maar trager en niet altijd bewaard ("Volledige reeks bewaren").
De schatting uit de lijn zit op een paar seconden na goed (in de tests binnen 5 seconden).

## Bron

Melding van de eigenaar over een eigen testloop, 3 november 2026. Tests met nagemaakte reeksen in
`src/engine/runDetailView.test.ts`.

## Vervangt

Niets. Vult `2026-10-27-run-in-detail-gegevens.md` en `2026-10-27-testloop-lezen.md` aan.

## Terugdraaien

In `RunDetailScreen.tsx` weer `log.runDetail` gebruiken in plaats van `withoutEdgePauses`, en in
`runDetailView.ts` de tak `nearEvenTest` en `testStretchKms` voor de hartslag weghalen.
