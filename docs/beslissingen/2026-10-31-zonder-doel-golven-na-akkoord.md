# Zonder doel: een bestaand plan gaat pas in golven na Akkoord

Datum: 2026-10-31
Status: aangenomen

## Besluit

Wie al een plan had dat niet in golven loopt en nu geen doel heeft, houdt dat plan zoals het is tot hij Akkoord geeft op één voorstel: "Plannen zonder doel: neutrale golven". Het voorstel staat als advies op Vandaag, laat bij Bekijk de hele planningsronde zien (bergtochten worden weer de lange loop, wandeldagen weer de heuvelloop, geen rugzak meer) en slaat pas bij Akkoord iets op. Liever niet laat alles staan, en het voorstel komt niet terug.

## Wat er precies verandert

- De planningsronde houdt het oude plan vast zolang het programma nog geen fase Golven heeft en `AppSettings.noGoalWaves` niet op `'agreed'` staat (`engine/noGoalWaves.ts#wavesHeld`, gelezen in `engine/direction.ts#planDirection`). Dan geldt de oude indeling, met de bergtochten in de bergfase, precies zoals voor stap 4.
- Het Akkoord is een antwoord op een voorstel, geen vlag op een training. Ongedaan maken zet het terug en brengt het voorstel weer op Vandaag.
- Een voorstel over je doelen (een doel erbij, een andere datum, archiveren, pauzeren), een richting kiezen en een keuze na een golf laten het plan zonder doel al vooraf zien. Hun Akkoord is ook het Akkoord op de golven (`withWavesConsent`, in `storage/horizonPlan.ts#computeHorizonPlan`). Loopt het plan na zo'n voorstel toch niet in golven, dan gaat het Akkoord er weer af.
- Een nieuw plan dat al in golven begint (de startvragen zonder doel) heeft geen Akkoord nodig: het loopt al in golven.
- Liever niet staat bij de adviezen (`adviceResponses`, het vaste id `nogoal-waves`), zoals elk ander voorstel. Wie later een richting kiest op de Ascend-tab, krijgt via dat voorstel alsnog golven.
- Een oude back-up zonder het veld houdt bij import zijn plan zoals het is (`migrations.ts#migrateWaveSettings` laat alleen `'agreed'` over). Er is geen nieuw schemanummer nodig.

## Golden test

Scenario D (bestaande gebruiker, alle doelen buiten de app om gearchiveerd) staat weer op de nulmeting van stap 1: de oude fasen met hun bergtochten en rugzak, omdat er geen Akkoord is. Het nieuwe scenario E is D met Akkoord op neutrale golven, en is precies wat D na stap 4 was. A, B en C zijn niet veranderd.

## Reden

De planningsronde zette de geplande bergtochten van een bestaande gebruiker zonder doel stil terug naar de lange loop, met alleen de melding "Planning bijgewerkt" en ongedaan maken. Alles wat de planning inhoudelijk verandert is een voorstel met Akkoord, en de eigenaar koos eerder "geen automatisch voorstel, plan blijft zoals het is". Eén voorstel dat je kunt afwijzen, en dat daarna wegblijft, past bij allebei.

## Alternatieven

- Geen voorstel, alleen het plan laten staan: dan krijgt wie golven wel wil er nooit iets van te horen, tenzij hij zelf een richting zoekt.
- Het voorstel steeds opnieuw tonen tot je kiest: niet gekozen, Liever niet betekent hier wat het overal betekent.
- Bij het opstarten iedereen met een plan markeren: dat raakt ook wie al in golven plant. Het programma zelf zegt al of het in golven loopt.

## Bron

Melding van de bouwer van Zonder doel stap 4 tot 10; `docs/beslissingen/2026-10-31-zonder-doel-stap-4.md`; `docs/visie/Zonder doel.md`.

## Vervangt

Uit `2026-10-31-zonder-doel-stap-4.md` de zin dat de planningsronde bij een plan zonder doel een geplande bergtocht van het systeem stil weer de lange loop maakt. De rest van dat besluit blijft.

## Terugdraaien

`wavesHeld` altijd `false` laten geven; de snapshot van D gaat dan terug naar die van E.
