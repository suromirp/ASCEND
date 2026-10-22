# Ochtendcheck vooraf ingevuld uit je horloge

Datum: 2026-10-22
Status: aangenomen

## Besluit

ASCEND haalt via intervals.icu per dag slaapduur, slaapscore, rusthartslag en HRV op (de wellness-gegevens, `GET /api/v1/athlete/{id}/wellness.json?oldest=...&newest=...`, velden `sleepSecs`, `sleepScore`, `restingHR`, `hrv`) en toont die bovenaan de ochtendcheck als regels met een korte uitleg. Slaap staat daarmee al ingevuld en energie mag leeg blijven, zodat alleen nog te bevestigen is hoe de benen voelen. Zonder gegevens werkt de ochtendcheck zoals altijd.

## Hoe de getallen gelezen worden

Rusthartslag en HRV worden vergeleken met het eigen gemiddelde van de laatste vier weken, nooit met een norm, en pas vanaf zeven dagen eigen gegevens. Daarvoor staat er een eerlijke zin dat er nog te weinig dagen zijn. Een rusthartslag die 5 of meer slagen hoger ligt dan het eigen gemiddelde en een HRV onder het eigen gewone bereik krijgen een waarschuwingskleur, alles daarbuiten niet. Het is een hint, geen oordeel: een horloge schat slaap, en hoe de benen voelen blijft een vraag.

## Opslag

De waarden staan in de bestaande vorm `RecoveryMetric` (`src/models/metrics.ts`) met `source: 'import'`, zonder velden van een leverancier. De bron is `import` en niet `garmin` omdat een wellness-record niet zegt wie het mat (horloge of een met de hand getypte waarde in intervals.icu). Nieuw is alleen het generieke optionele veld `sleepMinutes`. Omdat het een optioneel veld in een bestaande opslag is, is er geen migratiestap nodig en lezen oude gegevens als altijd.

De waarden zijn een kopie van gegevens die bij intervals.icu blijven staan en elke keer opnieuw worden opgehaald, net als de opgehaalde activiteiten en de sleutel. Ze gaan daarom niet mee in de back-up (het back-upschema blijft 5). Ontkoppelen wist ze, behalve waarden die op een andere manier zijn ingevoerd.

## Reden

De eigenaar zei ja (vraag 7 in `docs/visie/Visuele upgrade en nieuwe ideeën.md`). De ochtendcheck is nu handwerk, en slaap en rusthartslag zijn precies wat het horloge al weet.

## Alternatieven

De waarden in de back-up meenemen: vergroot elk bestand voor gegevens die altijd terug te halen zijn. De waarden bij het bericht van de ochtendcheck zelf bewaren (`settings.morningCheckIns`): zou het opgeslagen model en het back-upschema veranderen voor iets wat al in `recoveryMetrics` past. Een vaste norm voor rusthartslag: zegt weinig over één persoon.

## Bron

Eigenaar, 22 oktober 2026. Idee 3 in `docs/visie/Visuele upgrade en nieuwe ideeën.md`. Veldnamen uit de OpenAPI-beschrijving van intervals.icu (https://intervals.icu/api/v1/docs). Code: `src/integrations/intervalsIcu.ts`, `src/engine/wellnessCheck.ts`, `src/storage/wellness.ts`.

## Vervangt

Niets.

## Terugdraaien

Ontkoppel de koppeling, of zet in intervals.icu de wellness-synchronisatie met Garmin uit: dan komen er geen nieuwe waarden meer en toont de ochtendcheck ze niet.
