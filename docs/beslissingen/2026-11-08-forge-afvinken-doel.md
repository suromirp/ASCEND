# Forge: afvinken telt als het doel

Datum: 2026-11-08
Status: aangenomen

## Besluit

Een werkset die je afvinkt zonder zelf een RIR te kiezen, telt met de RIR van het doel als hij ging zoals gevraagd ("bevestigd"). Dat is een regel bij het lezen, ook voor oude logs; een log wordt nooit herschreven. Gebouwd zijn stap 1 tot en met 5 van het bouwvoorstel in `docs/onderzoek/RIR en RPE in krachtapps.md` (regel 1 tot 8 van het advies), achter de instelling "Afvinken telt als het doel" in Rekenmodel, standaard aan. Uit is het gedrag van voor dit besluit.

De regels staan in `src/engine/assumedSets.ts`, met alle drempels als benoemde constanten bij elkaar: 2 herhalingen tekort bij de volgende set (regel 3), 2 boven de bovenkant en de eerste 3 trainingen (regel 2), de helft van de extra herhalingen (regel 4), 2 trainingen achter elkaar aan de bovenkant (regel 5). Alle zijn een gok uit het verslag.

Eigen keuzes, buiten wat het verslag vastlegt:

- Een nieuw log bewaart bij een set zonder eigen RIR wat Forge vroeg: `SetLog.repsAsked` (de herhalingen in het vak) en `SetLog.weightKgAsked` (het gewicht van het voorschrift). Zonder die velden is "minstens de gevraagde herhalingen" en "niet lichter dan voorgeschreven" niet te lezen. De velden zijn optioneel en aanvullend, met de migratiestap `migrateLogSetAsked` in `src/storage/migrationsLogs.ts`: alleen een geldig getal naast `rirAssumed` blijft, een oud bestand leest zoals altijd. Het back-upnummer beweegt niet, zoals bij `rir`, `kind` en `at`.
- Een aangenomen set die niet bevestigd is, telt zoals hij altijd telde (`estimateSet` kijkt niet naar `rirAssumed`). Zo blijft een mindere dag zonder eigen RIR de kracht omlaag trekken; alleen bevestigde sets krijgen de nieuwe regel.
- "Naar boven afgerond" in regel 4 lees ik als de RIR naar boven afronden (de mildste lezing): 1 extra herhaling telt dus niet, 2 extra telt als 1 minder over.
- Een bevestigde set is een ondergrens: met precies het gevraagde houdt hij de gladgestreken kracht vast, met meer telt hij alleen omhoog. Zonder eerdere kracht (de eerste training) telt hij als meting.
- Het bereik van oude logs is de onderkant van het plan van vandaag, of zonder plan het afgeleide bereik. Bij een golf in het bereik kan een oud log daardoor iets anders lezen dan op die dag; het gevraagde aantal in nieuwe logs heeft daar geen last van.
- Voor de stap zwaarder tellen "alle werksets" zonder onderscheid in doel per set, omdat het log het doel per set niet bewaart. Dat is strenger dan het verslag bij een topset met terugsets; de tweede weg (de topset twee keer aan de bovenkant op hetzelfde gewicht) blijft dan over.
- De twijfelvragen komen naast de bestaande vragen (eerste, zware en laatste set) en alleen met de instelling aan. "De eerste werkset op een zwaarder gewicht" lees ik als de eerste werkset van vandaag op een gewicht boven het zwaarste werkgewicht van vorige keer; de eerste werkset werd al gevraagd. Het aantal eerdere trainingen staat in het concept als `WorkoutExercise.trainings`; een oud concept zonder dat getal vraagt niet extra.
- De instelling staat in het blad Rekenmodel (nu acht rijen), niet als eigen rij op de pagina Forge: de pagina zelf houdt zijn zes rijen.
- Klaar voor je doel (`strengthReadiness.ts`) en het leren van vermoeidheid blijven aangenomen sets overslaan (regel 6 en 7). De stille toets "raak" rekent via `prescribe` mee met de instelling; de instelling hoort bij `checkModelKey`.

## Reden

De eigenaar vroeg dat afvinken "gedaan zoals gepland" betekent, ook voor eerdere workouts. Het verslag laat zien dat een set met precies de voorspelde herhalingen geen bewijs omhoog is, maar wel dat je niet zwakker bent; zonder deze regel zakt de schatting langzaam door afronding (KR-3).

## Alternatieven

Alle aangenomen sets uit de schatting halen: verliest het teken van een mindere dag. Oude logs herschrijven met een vlag: breekt append-only. Het gevraagde aantal reconstrueren door het voorschrift van toen opnieuw te rekenen: te broos bij een gewijzigde instelling of sportschool.

## Bron

`docs/onderzoek/RIR en RPE in krachtapps.md`, hoofdstuk 4 en 6; de wens van de eigenaar van 5 november in `docs/backlog.md`.

## Vervangt

Niets. Het werkbriefje Forge is op het punt `rirAssumed` rechtgezet.

## Terugdraaien

De instelling uit zetten geeft het oude gedrag. Helemaal terug: `LoadContext.confirm` niet meer zetten in `prescribe` en de extra vragen in `asksReserve` weghalen; de velden `repsAsked` en `weightKgAsked` mogen in de logs blijven staan, ze worden dan niet gelezen.
