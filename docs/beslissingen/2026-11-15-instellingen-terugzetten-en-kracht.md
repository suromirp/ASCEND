# Instellingen: terugzetten, zoeken, antwoorden uit de start en kracht uit

Datum: 2026-11-15
Status: aangenomen

## Besluit

1. Alles terug naar het advies (en Alles in deze groep terug naar het advies) zet instellingen die de planning niet raken meteen terug, met een regel als uitkomst. Instellingen die de planning wel raken gaan samen in één voorstel met Akkoord of Liever niet, altijd, ook als je bij Wijzigingen kleine wijzigingen automatisch laat doorvoeren (`useAdviceReset`, `alwaysAsk`). Liever niet zegt wat er wel terugging. Na Akkoord draait de planningsronde ook als alleen lengtes veranderen (`storage/horizonPlan.ts#applyHorizonPlanNow`), zodat Week meteen toont wat het voorstel liet zien.
2. Het zoekveld toont bij elk resultaat de waarde van de instelling zelf (`engine/settingsSummary.ts#searchResultValue`): de eigen samenvatting, anders de waarde uit Aangepaste instellingen, anders geen waarde. Nooit de waarde van de rij waarin het blad opent. De foto leest het zoekveld nu via dezelfde functie.
3. Een antwoord uit de start dat een instelling met een advies zet, is jouw keuze en geen afwijking. De start bewaart die antwoorden in `AppSettings.startChoices`; zolang de instelling daarop staat telt hij niet bij Aangepaste instellingen en zet Alles terug naar het advies hem niet terug. De rij zegt "Je antwoord bij de start". Kies je later iets anders dan het advies en dan je antwoord, dan telt hij wel. Nu gaat het alleen om de beginnersstart: dat is de enige instelling met een advies die de start zet (nagerekend voor alle doelen en antwoorden).
4. Krachttraining is een instelling (`strengthTraining`, advies aan) op het scherm Sporten, in `settingsDefs/planning.ts` als `on: 'sporten'`. Uit haalt de open krachttrainingen weg en laat er geen nieuwe in (patroon en weekvoorschrift, `engine/strengthTraining.ts`); de week houdt lopen en rust. Aan of uit is altijd eerst een voorstel; bij uit staat de waarschuwing in het voorstel onder Let op: "Kracht helpt bij bergtochten: sterke benen en romp vangen de klappen van het dalen op en sparen je knieën." Terug naar het advies zet de krachttrainingen in hetzelfde Akkoord terug.

## Reden

Het profiel instellingen van 14 november: terugzetten veranderde de lengte van trainingen zonder voorstel, terwijl de harde regel zegt dat de planning alleen via een voorstel met Akkoord verandert. Het zoekveld liet bij 189 van 281 instellingen de waarde van de bundel zien. Een antwoord uit de start stond als afwijking in de lijst, en was zo de eerste valkuil van terugzetten. Kracht uitzetten kon nergens; de eigenaar koos op 14 november voor uit mag, met een waarschuwing (`2026-11-14-keuzes-avond.md`, punt 3).

De oorzaak van punt 1 was dubbel: met Kleine wijzigingen automatisch ging een voorstel met alleen andere lengtes zonder vragen door, en na Akkoord draaide de ronde niet, zodat de beginnersstart pas bij de volgende opening in Week kwam.

## Alternatieven

- Terugzetten volgt Wijzigingen, zoals een gewone instelling. Niet gekozen: terugzetten raakt meerdere instellingen tegelijk en is geen keuze per instelling; je hoort eerst te zien wat er verandert.
- De beginnersstart uit de lijst van adviezen halen, zoals Slapen onderweg. Niet gekozen: dan telt ook een latere eigen keuze niet meer als aangepast.
- Het antwoord los bewaren en Automatisch het antwoord laten volgen. Niet gekozen: grotere wijziging in de planning, en het werkt alleen voor deze ene instelling.
- Krachttraining als rij op de pagina Planning. Niet gekozen: Planning zit op het plafond van 12 rijen. Op het scherm Sporten staat kracht naast je andere sporten.
- Het startantwoord "Geen krachttraining" aan de nieuwe instelling koppelen. Niet gekozen in deze stap: zo'n start bewaart een eigen week zonder krachtdag, en weer aanzetten zou dan niets terugbrengen. Zie Open.

## Open

- Wie bij de start "Geen krachttraining" koos, heeft een eigen week zonder krachtdag. De instelling staat dan op Aan, maar weer aanzetten brengt geen kracht terug zolang die eigen week geen krachtdag heeft.
- Bij kracht uit blijft de stepper Keer kracht per week in het weekbudget staan; de rij Weekbudget zegt wel "Zonder kracht".
- Een bestaande installatie met een beginnersstart uit een eerdere start heeft geen `startChoices`; daar blijft die keuze als aangepast tellen tot een nieuwe start.

## Bron

Backlog Q; het profielverslag `docs/profielen/2026-11-14-instellingen.md` op `claude/profiel-instellingen`; besluit `2026-11-14-keuzes-avond.md`. Tests: `src/storage/adviceResetPlan.test.ts`, `src/storage/strengthOff.test.ts`, `src/engine/settingsDiff.test.ts`, `src/engine/settingsSummary.test.ts`, `src/components/settings/adviceReset.scan.test.ts`.

## Vervangt

Niets. Vult `2026-10-26-advies-anders.md` aan: wat de planning raakt gaat bij terugzetten altijd eerst als voorstel.

## Terugdraaien

Punt 1: `alwaysAsk` weghalen in `useAdviceReset`. Punt 2: in `SettingsOverview` weer `searchValue(placement.row, ...)` (niet doen). Punt 3: `fromStart` uit `plain` in `settingsDiff.ts`; het veld `startChoices` kan blijven staan. Punt 4: de rij op Sporten weghalen; wie kracht uit had, zet hem eerst weer aan, anders blijft `strengthTraining: false` gelden.

## Aanvulling (15 november, na Pathfinder)

Open punten 1 en 2 zijn dichtgezet, het besluit hierboven blijft staan.

- Wie bij de start Geen krachttraining koos, houdt de instelling op Aan en een eigen week zonder krachtdag. Gekozen: de rij zegt eerlijk wat er is, "Je week heeft geen krachtdag" (`engine/settingsSummary.ts`, tak `krachttraining`). Niet gekozen: het startantwoord de instelling laten zetten, want dat zou Alles terug naar het advies en het voorstel bij Aan zetten veranderen voor een kleine winst.
- Bij kracht uit verdwijnt de stepper Keer kracht per week uit het weekbudget; er staat één regel voor in de plaats ("Krachttraining staat uit, dus het budget telt geen kracht").
- De uitleg van Sporten zegt dat kracht altijd eerst een voorstel is, en de kop boven de rij heet Naast je sporten.
