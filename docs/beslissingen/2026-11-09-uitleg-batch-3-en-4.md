# Uitleg bij oefeningen, batch 3 en 4

Datum: 2026-11-09
Status: voorgesteld

## Besluit

Veertig oefeningen krijgen uitleg in twee lagen, in de vorm van de proef en batch 1 en 2. Batch 3: de dertien stappen van de ladders push-up, optrekken en dip, de drie oefeningen die Spieren voor de berg als eerste kiest, en vier oefeningen waar een bestaande tekst naar verwijst. Batch 4: wat verder bij de berg hoort en de gangbaarste oefeningen in een eigen programma. Het model, het blad en de instelling Uitleg standaard uitgeklapt blijven zoals ze zijn.

## Reden

De oefeningen van het demoprogramma hadden na batch 2 allemaal uitleg. Daarna komt wat de app zelf in een training kan zetten (een ladderstap of een oefening voor de berg, elk met Akkoord) en waar Lichter en Zwaarder al naartoe wezen zonder dat daar uitleg stond.

## Eigen keuzes buiten de opdracht

- De push-up kreeg Lichter (handen op een lage bank) en Zwaarder (voeten op een bank), de pull-up Zwaarder (met extra gewicht) en de step-up Zwaarder (met rugzak), zodat de tikken de ladder volgen. De teksten zelf zijn niet veranderd.
- Een nieuwe test eist dat elke stap van elke ladder uitleg heeft, en dat een nieuwe uitleg binnen de lengte van de oudere teksten blijft (Lees verder en elk deel apart).
- De lijn "Te licht? Neem een lager steunpunt." gebruikt "steunpunt", een woord dat al in de kennisteksten staat.
- Batch 4 gebruikt "tibialisstang" voor het hulpmiddel uit de alias "Tibialis Bar Raise"; er is geen bestaand woord voor.

## Twijfels over de catalogus

De catalogus is niet veranderd. De uitleg volgt steeds wat de regels (`cues`) bedoelen.

- `support-hold`: de oude regel noemt "ellebogen op slot drukken" een fout. Scout vond in de bronnen het omgekeerde (armen gestrekt, bovenaan op slot). De uitleg zegt gestrekt. Voorstel: de derde regel wordt "Vaak fout: je schouders laten optrekken naar je oren."
- `dead-hang`: de alias "Passive Hang" is een andere oefening dan de actieve hang die de regel en de ladder vragen. De uitleg vraagt actieve schouders. Voorstel: de alias weghalen.
- `glute-bridge`: de alias "Single Leg Glute Bridge" is een zwaardere oefening op één been. De uitleg beschrijft twee benen. Voorstel: de alias weghalen, na een controle of hij nodig is voor het herkennen van geïmporteerde namen.
- `negative-chin-up`: de naam zegt onderhands, de alias "Negative Pull-Up" en de plek op de ladder voor de overhandse pull-up niet. De uitleg zegt onderhands; Scout noemt dat verdedigbaar.
- `dumbbell-shoulder-press`: de alias "Standing Dumbbell Overhead Press" is staand; de uitleg beschrijft zittend, zoals de naam.
- `face-pull`: de alias "Low Pulley Cable Face Pull" is een lage kabel; de uitleg zegt ooghoogte of iets hoger.
- De volgorde decline, diamond, archer op de ladder van de push-up is volgens Scout een keuze, geen meting: decline heeft meer last op de handen dan diamond.

## Alternatieven

Eerst de hele catalogus op alfabet. Niet gekozen: dan krijgt een oefening die niemand in zijn programma heeft uitleg voor een ladderstap die de app zelf voorstelt.

## Bron

`docs/onderzoek/Bronnen bij de uitleg van oefeningen, batch 3.md` en `batch 4.md` (met de toetsing door Scout), `docs/onderzoek/Calisthenics in apps en wetenschap.md`.

## Vervangt

Niets. Vult `2026-11-09-uitleg-bij-oefeningen.md` aan.

## Terugdraaien

Haal de sleutels van een batch uit `src/data/exerciseGuides.ts` en de lijst uit `src/engine/exerciseGuide.test.ts`; de oefening valt dan terug op haar drie oude regels.
