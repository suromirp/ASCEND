# Richting en weekbudget zonder doel

Datum: 2026-10-31
Status: aangenomen

## Besluit

Zonder doel werkt ASCEND met een richting en een weekbudget. Er zijn vier richtingen: Fit blijven (het advies), Fitter worden, Sterker worden en Rustig aan. Een doel met een datum is "Naar een doel" en gaat altijd voor. De richting bepaalt het weekbudget in tel-minuten (een matige minuut telt 1, een pittige 2) en een aantal keer kracht, en de planning loopt in golven: een paar weken opbouwen, dan een lichtere week. Er komt geen bergtocht, wandeldag of rugzakladder in een plan zonder doel.

Op de Ascend-tab staat zonder doel Je week (de ring met de minuten is het ene accent), Je richting en na een golf de terugblik. Met een doel staat Je week er niet en blijft "Klaar voor je doel" de enige voortgangstaal.

## Wat er vastligt

- Een richting kiezen, een ander weekbudget terwijl het plan een richting volgt, Golven, Beginnersstart en een keuze na een golf die het plan verandert: altijd eerst een voorstel met Akkoord. Wat je deed, wat voorbij is en wat je zelf vastzette verandert nooit.
- De richting, de startmaandag, het weekbudget, de golven en de beginnersstart staan in `AppSettings`; de weken van een golf en of de beginnersstart loopt zijn afgeleid, nooit per week opgeslagen. Het programma krijgt bij elke planningsronde `Program.direction` en `Phase.wave` erbij, zoals het rugzakdoel.
- Een plan met een doel verandert hier niet door: de golden scenario's met een doel (A en C) staan precies zoals ze waren.
- Instellingen staan bij Doel en tochten in het blad Zonder doel: Richting, Weekbudget, Golven (met Terugblik na een golf) en Beginnersstart, alleen zichtbaar zonder doel.

## Reden

De eigenaar koos bij de open vragen van het ontwerp steeds het advies: één taal voor richting en de doelsoorten Fit blijven en Sterker worden, kracht als aparte teller, geen automatisch voorstel voor wie nu geen doel heeft, Rustig aan op 90 minuten en 1 keer kracht, golven van vier weken, en de terugblik alleen op de Ascend-tab. De stappen staan in de besluiten van 27 en 31 oktober.

## Alternatieven

Zie de besluiten per stap: `2026-10-27-zonder-doel-stap-1.md`, `2026-10-31-zonder-doel-stap-4.md`, `2026-10-31-zonder-doel-minuten-in-de-planning.md`, `2026-10-31-zonder-doel-beginnersstart.md`, `2026-10-31-zonder-doel-sterker-worden-en-golven.md`, `2026-10-31-zonder-doel-startvragen.md` en `2026-10-31-zonder-doel-terugblik-na-een-golf.md`.

## Wat nog niet gebouwd is

- De kaart Je week op Je stand (ontwerp 2.8). Je stand blijft zoals hij was.
- De vorm van de week later veranderen: wie al een plan heeft en Sterker worden of Rustig aan kiest, houdt het aantal krachttrainingen dat er staat.
- Andere sporten dan kracht en lopen in het weekritme: dat is de ronde "Sporten die meetellen".

## Bron

`docs/visie/Zonder doel.md`, `docs/onderzoek/ASCEND voor iedereen.md`.

## Vervangt

Niets. Het vat de besluiten per stap samen.

## Terugdraaien

Per stap, zoals in die besluiten staat.
