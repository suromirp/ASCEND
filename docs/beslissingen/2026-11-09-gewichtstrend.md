# Gewichtstrend

Datum: 2026-11-09
Status: aangenomen

## Besluit

Bij Lichaamsgewicht staat je gewicht als trend: een gewogen gemiddelde van je wegingen van de laatste 14 dagen, met de laatste weging erbij ("Trend 78,4 kg, laatste weging 79,1 kg"). Een nieuwe schakelaar "Gewichtstrend gebruiken" (standaard aan) zet dat terug op de laatste weging. In deze stap verandert alleen wat je ziet: alles wat met je gewicht rekent (rugzak, beenindex, zweten, Forge) houdt de nieuwste weging, via `currentBodyKg`.

## Hoe het werkt

Rekenen. `engine/weightTrend.ts#weightTrend` krijgt wat `engine/bodyWeight.ts#weightsInUse` teruggeeft, dus één gewicht per dag met de schakelaars van MacroFactor en Health Connect al toegepast en de vaste voorrang van eigen invoer. Het venster is de 14 dagen tot en met de nieuwste weging (niet tot vandaag, zodat een paar dagen niet wegen de trend niet wegneemt). Elke weging telt met gewicht 0,5 tot de macht (dagen oud gedeeld door 7): een weging van een week oud telt half zo zwaar. Een weging die meer dan 3 procent van de middelste weging (mediaan) van het venster afwijkt is een uitschieter en telt niet mee; het blad zegt hoeveel. De trend staat op een decimaal.

Te weinig. Onder de drie wegingen in het venster (na het weglaten van uitschieters) is er geen trend en telt de nieuwste weging, zoals voorheen (`weightShown`). Dat geldt ook na een gat van meer dan twee weken.

MacroFactor. Is de nieuwste dag een trendgewicht uit MacroFactor (`basis: 'trend'`), dan is er al een trend en rekent ASCEND hem niet nog eens af. Een trenddag eerder in het venster telt met de weging van die dag (`scaleKg`), of anders niet.

Laten zien. In het blad Lichaamsgewicht staat de trend groot, daaronder "Trend 78,4 kg, laatste weging 79,1 kg", de bron van de laatste weging ("Uit Health Connect, 3 nov") en "Gemiddelde van 9 wegingen sinds 21 okt". De rij zegt "Trend 78,4 kg" met "Laatste weging 79,1 kg, 3 nov". De herinnering op Vandaag vult het veld vooraf in met hetzelfde getal.

De plekken. `data/settingsIndex.ts` (`gewichtstrend`, groep Lichaam), `data/settingsLayout.ts` (in het blad van Lichaamsgewicht), `engine/settingsSummary.ts` (aan of uit, en de trend in de rij Lichaamsgewicht), `engine/settingsDiff.ts` (verschil met het advies), de uitleg `gewichtstrend` in `data/settingsHelp.ts` en de rij in `components/settings/groups/LichaamSheets.tsx`.

Opslag. Nieuw is alleen het optionele veld `AppSettings.weightTrend`; afwezig is aan. Geen schemastap: oudere instellingen en back-ups lezen als voorheen. Het gaat mee in de back-up met de instellingen; terugzetten vervangt het zoals elke voorkeur (`storage/backupMerge.ts` hoeft niets te weten, want het is geen historie). Een kapotte waarde valt weg (`storage/backupClean.ts`). De trend zelf wordt nooit bewaard; hij wordt elke keer uit de wegingen berekend.

## Reden

De eigenaar weegt zich via Health Connect en dat kan elke dag. Eén weging schommelt een kilo met water, zout en eten, en de nieuwste weging is dan het minst rustige getal. Een trend is het getal waar je naar wilt kijken, net als het trendgewicht in MacroFactor.

Waarom het rekenen nog niet verandert. Het rugzakaandeel, de beenindex, zweetverlies en Forge lezen allemaal `currentBodyKg`. De trend daar gebruiken verandert getallen in de planner (de beenindex leest gewicht; `storage/planGolden.test.ts` mag niet bewegen) en in Forge, waar een andere sessie bouwt. Dat hoort in een eigen stap, met een eigen besluit per plek.

## Alternatieven

Een gewoon gemiddelde over 7 dagen: reageert schokkerig zodra een oude weging uit het venster valt. Een exponentieel gemiddelde per dag zoals in een spreadsheet (elke dag 10 procent naar de nieuwe weging): vraagt elke dag een weging, en Health Connect geeft gaten. Het tijdgewogen gemiddelde over 14 dagen werkt met gaten. Een vaste grens in kilo's voor een uitschieter: past niet bij elk lichaam; 3 procent van de mediaan wel. De trend meteen overal laten tellen: zie de reden.

## Bron

Opdracht van de eigenaar via de coördinator (backlog, "Gewicht uit Health Connect, verder"). `docs/beslissingen/2026-11-04-gewicht-uit-health-connect.md`, `docs/beslissingen/2026-10-22-gewicht-uit-macrofactor.md`, `docs/beslissingen/2026-10-25-vetpercentage-uit-macrofactor.md` (dezelfde gedachte voor vet). Testdata nagemaakt.

## Vervangt

Niets. Voor wat je ziet bij Lichaamsgewicht vervalt "de nieuwste dag telt" uit `2026-11-04-gewicht-uit-health-connect.md`; voor het rekenen blijft het gelden.

## Terugdraaien

Voor de gebruiker: "Gewichtstrend gebruiken" uit in het blad Lichaamsgewicht. In de code: `weightShown` in het blad en de rij weghalen; het veld `weightTrend` mag blijven staan, niets anders leest het.
