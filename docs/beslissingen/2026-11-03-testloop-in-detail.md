# Testloop in detail: de bovenkant gaat over het teststuk

Datum: 2026-11-03
Status: aangenomen

## Besluit

Bij een testloop met een herkend teststuk (inlopen, beste 5 km, uitlopen; `testLayout`) gaan het oordeel,
de verdeling en de hartslag bovenaan "Hoe de run liep" over de 5 km van het teststuk, met één zin dat inlopen
en uitlopen hier niet meetellen (`runDetailView.ts#testFocusLine`). Een teststuk waarvan de helften minder dan
3,5 procent verschillen (`PACING.nearEvenPct`) en waarin geen kilometer 5 procent of meer afwijkt, heet
"Vrij gelijkmatig" in plaats van "Wisselend". Wijkt geen kilometer meer dan 4 procent af (`PACING.evenKmPct`),
dan zegt de zin "zonder kilometer die eruit sprong"; anders noemt hij de kilometer van de test die iets meer
afweek. Daarbuiten blijft het oude oordeel. Bij een gewone run verandert niets.

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

Alles wordt bij weergave uitgerekend (`runDetailView.ts#withoutEdgePauses`, `edgePauseLine`).
`SessionLog.runDetail` blijft wat het is: afgeleid en append-only, er komt geen nieuwe versie en niets wordt
herschreven. De stilstand aan de randen komt uit de bewaarde reeks (`runDetail.ts#edgePausesOfStreams`,
gelezen met `storage/activityDetail.ts#edgePausesFor`, alleen lezen, met een grens van 3 seconden): de pauzes
vóór het eerste en na het laatste stuk beweging, met 10 meter speling voor wat drift of een stap. Een stop
waarna je nog verder liep, ook vlak voor het einde, blijft stilstaan tijdens de run. Is de reeks er niet
(niet bewaard, ander totaal of ingekort), dan wordt niets apart gezet en blijft het scherm zoals het was; de
regels over stilstaan wachten tot de reeks gelezen is, zodat een staart niet even als stilstaan oplicht.
Een ronde telt alleen bewegende tijd en heeft geen eigen stilstand, dus de staart komt daar nooit in.
Tempo's en voorspelling lezen nog steeds `countedTests`; `bestEffort` is niet veranderd.

## Alternatieven

Een schatting uit de opgeslagen lijn (de eerste versie van dit besluit): de lijn kan een pauze na het laatste
punt niet onderscheiden van een stop vlak voor het einde waarna je verder liep, dus die is vervangen door de
reeks. Een nieuw veld in `runDetail` met de precieze stilstand aan de randen: dat helpt alleen runs die nog
binnenkomen, en het bestaande detail wordt niet opnieuw gelezen.

## Bron

Melding van de eigenaar over een eigen testloop, 3 november 2026. Tests met nagemaakte reeksen in
`src/engine/runDetailView.test.ts`.

## Vervangt

Niets. Vult `2026-10-27-run-in-detail-gegevens.md` en `2026-10-27-testloop-lezen.md` aan.

## Terugdraaien

In `RunDetailScreen.tsx` weer `log.runDetail` gebruiken in plaats van `withoutEdgePauses` (en `edgePausesFor`
niet meer lezen), en in `runDetailView.ts` de tak `nearEvenTest` en `testStretchKms` voor de hartslag weghalen.
