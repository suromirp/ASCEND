# Zonder doel, stap 8: de startvragen met vijf keuzes

Datum: 2026-10-31
Status: aangenomen

## Besluit

De eerste vraag van een nieuwe installatie is "Wat wil je?" met vijf keuzes in vaste volgorde: Fit blijven, Fitter worden, Sterker worden, Rustig aan, en Een tocht of wedstrijd. Die laatste opent de bestaande keuze tussen een meerdaagse tocht en een hardloopwedstrijd. Kies je een richting, dan bewaart Akkoord de richting en de maandag waarop hij begint samen met het eerste plan, zodat de weken meteen in golven lopen. Een nieuwe installatie kan nu elke richting kiezen.

## Wat er per richting anders is

- Het advies voor dagen: Fit blijven 3, Fitter worden 4, Sterker worden 4, Rustig aan 3, met de reden in één zin.
- Sterker worden vraagt "Hoeveel keer kracht?" met 2, 3 of 4 en 3 als advies (`chooseWeekShape` met `strengthSessions`). Rustig aan plant 1 keer kracht.
- Bij een richting komt er een vraag bij, alleen als er nog geen trainingen zijn die het beantwoorden: "Ben je de laatste tijd weinig aan het sporten geweest?" Ja geeft de beginnersstart en hoogstens vier dagen; het antwoord wordt de instelling Beginnersstart (Ja of Nee). Zonder vraag blijft die op Automatisch.
- In de beginnersstart wordt een training nooit langer dan haar gewone lengte, ook als het weekbudget meer vraagt. Eerst wennen; de kaart Je week zegt eerlijk dat het budget dan nog niet gehaald wordt.
- Het voorstel "Zo ziet je eerste week eruit" krijgt de regels "Richting: Fitter worden." en "Je week: 120 minuten en 2 keer kracht.", en "Je week bestaat uit kracht en lopen. Andere sporten die je doet tellen straks gewoon mee."

## Golden test

Scenario B (nieuwe gebruiker, Fit blijven, 4 dagen) verandert met reden: de startvragen zetten nu de richting Fit blijven, en zonder trainingen is de beginnersstart Automatisch aan. De eerste vier weken heten "Rustig beginnen", daarna "Golven". De rustige loop en de lange loop volgen het weekbudget: in de start hun gewone lengte (35 en 60 minuten), daarna langer omdat 150 minuten over twee duurtrainingen verdeeld worden, met een lichtere vierde week. A, C en D zijn niet veranderd.

## Reden

`docs/visie/Zonder doel.md` (2.1 en stap 8). De zin over 10% meer dan de laatste vier weken uit het ontwerp staat er niet bij: een nieuwe installatie heeft geen vier weken.

## Alternatieven

- De tegel "Een tocht of wedstrijd" als twee tegels laten: zes keuzes is er een te veel, en het ontwerp vraagt vijf.

## Bron

`docs/visie/Zonder doel.md`, `docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md`.

## Vervangt

Niets.

## Terugdraaien

`GOAL_OPTIONS` terug naar de drie oude tegels; `directionOfStart` voor 'fit' leeg laten geven. Scenario B gaat dan terug naar de stand van stap 4.
