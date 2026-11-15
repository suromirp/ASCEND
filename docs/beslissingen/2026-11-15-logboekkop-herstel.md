# Logboekkop met alleen herstel

Datum: 2026-11-15
Status: aangenomen

## Besluit

De kop bovenaan het Logboek zegt nooit "niets" of "geen trainingen" als er in die maand een log staat. Staat er alleen herstel, dan noemt de kop dat met de minuten: "Alleen herstel in deze maand: 56 min." Herstel blijft buiten elke telling van trainingen.

## Reden

Lookout zag op 15 november "Nog niets in deze maand." boven een lijst met een Herstelwandeling van die maand. De kop telde alleen trainingen, en een log van type herstel is geen training. Met de nieuwe horlogetoets wordt een loop op wandeltempo vaker een herstelwandeling, dus dit kwam vaker voor.

Wat er veranderd is (`src/engine/logbookMonth.ts`):

- `monthCompare` geeft naast `totals` ook `recovery` (aantal en minuten van de herstellogs in de maand). "Nog niets in november" in de eerste dagen van een maand komt alleen als er geen enkel log staat.
- `emptyMonthTitle` kiest eerst herstel, dan een log dat in de lijst staat maar bij de maand van zijn geplande training telt (een MacroFactor-training na middernacht, besluit `2026-10-29-dag-van-een-training.md`): "Wat hier staat telt bij de maand van de geplande training." Daarna de oude zinnen.

Wat bewust zonder herstel blijft:

- Trainingen op de kaart (`totals.count`), de rijen per sport en de vergelijking met vorige maand. De vergelijking vraagt een training vorige maand; een vorige maand met alleen herstel geeft geen vergelijking. De minuten in Getraind en in de vergelijking tellen herstel wel mee, zoals al zo was; dat is aan beide kanten hetzelfde.
- Ritme op Stand: dat telt wat gepland stond en gedaan is (de lat van de coach, `engine/onCourse.ts`). Een rustdag is geen geplande training, dus herstel hoort daar niet.
- De weekbelasting op Stand (`engine/standing.ts`) en "Geen trainingen in deze week." in die grafiek: belasting is training, herstel is geen belasting. Die zin staat niet boven een lijst met logs.

## Alternatieven

Herstel meetellen als training. Niet gekozen: dan klopt Trainingen niet meer met de rijen per sport, en Ritme en belasting zouden een rustdag als werk zien.

De lege kop houden en alleen het woord veranderen ("Geen trainingen"). Niet gekozen: dat is waar maar zegt niet wat er wel was, en de eigenaar ziet de wandeling eronder.

## Bron

Lookout, 15 november, op 360 px. Backlog-melding van de coördinator.

## Vervangt

Niets.

## Terugdraaien

`emptyMonthTitle` en `monthCompare` terugzetten naar de vorige versie; het veld `recovery` weghalen. De invariant in `scripts/app-kaart/invarianten.mjs` en het scherm `logboek-herstel` gaan dan rood en moeten mee terug.
