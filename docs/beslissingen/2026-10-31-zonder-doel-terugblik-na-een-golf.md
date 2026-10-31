# Zonder doel, stap 9: de terugblik na een golf

Datum: 2026-10-31
Status: aangenomen

## Besluit

Na elke golf staat er op de Ascend-tab, zonder doel, een kaart "Golf klaar" met een oordeel (Goede golf, Een rustige golf, Een zware golf), twee feiten en de vraag "Wat nu?". De kaart staat er vanaf de maandag na de laatste week van een golf, tot je een keuze maakt of tien dagen voorbij zijn (`engine/waveReviewCard.ts`). Drie keuzes:

- Nog een golf. Haalde je genoeg weken je minuten (advies 3 van 4), dan stelt ASCEND bij Fit blijven en Sterker worden een iets hoger weekbudget voor; anders blijft het gelijk, met de zin "Dezelfde golf nog eens is geen falen." Bij Fitter worden rekent de nieuwe golf zelf vanaf wat je de laatste vier weken deed, dus daar verandert niets en komt er geen voorstel.
- Rustiger aan: de richting wordt Fit blijven, op het niveau van je laatste golf (nooit onder 90 minuten).
- Een doel kiezen: opent het toevoegblad.

Wat de planning verandert is een voorstel met Akkoord, met als kopje "Na je golf" (trigger `wave_review`). Bewaard wordt alleen je antwoord: `AppSettings.waveReviewDone`, de maandag waarop de besproken golf begon. Met Liever niet blijft de kaart staan.

## Instelling

In Golven: de schakelaar "Terugblik na een golf" (aan) en "Zo veel weken halen voor een stap omhoog" (advies 3 van 4). Uit betekent dat de golf doorloopt op hetzelfde niveau en er geen kaart komt. Beide veranderen de planning niet en worden meteen bewaard. Zoekindex, indeling, uitleg en samenvatting horen erbij; `migrateWaveSettings` houdt bij een import alleen bekende waarden over.

## Keuzes

- De kaart zegt "3 van 4 weken haalde je je minuten." zonder het percentage volhouden uit het ontwerp: zonder doel is Je week het enige getal, en een tweede percentage op hetzelfde scherm maakt dat minder duidelijk.
- De terugblik staat alleen op de Ascend-tab, niet op Vandaag en niet als melding (advies van het ontwerp, vraag 6).
- Rustig aan heeft geen golf en dus geen terugblik.

## Reden

`docs/visie/Zonder doel.md` (2.5, 3.5 en stap 9).

## Alternatieven

- Na een goede golf vanzelf een stap hoger: niet gekozen, een hoger budget verandert je planning en vraagt dus Akkoord.

## Bron

`docs/visie/Zonder doel.md`, `engine/waves.ts#waveReview` en `nextWaveLevel` uit stap 2.

## Vervangt

Niets.

## Terugdraaien

De kaart weghalen uit `pages/Ascend.tsx`; de instelling en `waveReviewDone` mogen blijven staan, ze doen dan niets.
