# Nieuwe testpoging: de rustdag van een week blijft

Datum: 2026-10-28
Status: aangenomen

## Besluit

Vult `2026-10-28-nieuwe-testpoging-verschuiven.md` aan, dat zelf ongewijzigd blijft.

1. **Een rustdag is een dag zonder training.** Een herstelwandeling telt als rust, dezelfde opvatting als de rustdagruil en de regel REST-DAY. Een verplaatsing in TEST-RETRY mag de laatste rustdag van een week niet innemen.
2. **Eerst een andere dag.** De doeldagen worden eerst alleen doorlopen op dagen die de rustdag van die week laten staan.
3. **Dan de lichtste training laten vervallen.** Past alleen de rustdag, dan laat hetzelfde voorstel de lichtste training van die week vervallen die alleen op haar dag staat: bij voorkeur een rustige duurloop of herstelloop, daarna de kortste van de rest. Nooit een lange duurloop, harde loop, test, wedstrijd, beendag, iets wat jij vastzette of iets gelogds. De regel in het voorstel: "Rustige duurloop van do 5 november vervalt: dat wordt je rustdag."
4. **Lukt dat niet, dan vervalt de verschuiving.** De lange duurloop vervalt deze keer, met de zin "Lange duurloop van zo 1 november vervalt deze keer: zo houd je die week een rustdag." Zonder rustdag is geen optie.
5. **Gewicht.** Een vervallen lichte training weegt 2, een vervallen systeemtraining 5, dus een voorstel dat de rustdag ongemoeid laat wint altijd.

## Reden

Een geaccepteerd voorstel zette de lange duurloop op de rustdag van de week erna. Die week had daardoor geen rustdag meer en de weekcontrole kon niets herstellen, omdat alles van het voorstel een slot heeft.

## Alternatieven

- De weekcontrole laten herstellen: kan niet, de sessies van een voorstel zijn van jou.
- Een nieuwe regel voor rust: niet nodig, de bestaande opvatting van rust volstaat.

## Gevolg

De nagemaakte week (ma herstelwandeling, di Bovenlichaam A, wo Benen A, do Rustige duurloop, vr Bovenlichaam B, za Heuvelsprints en afdalen, zo Lange duurloop, test op za 31 oktober) geeft: de lange duurloop gaat korter naar ma 2 november, de herstelwandeling en de rustige duurloop van do 5 november vervallen (die dag is dan de rustdag) en Benen A van do 29 oktober vervalt. Na Akkoord geeft `planPass` geen herstelling en blijft er een dag zonder training. `planGolden.test.ts` verandert niet.

## Bron

Een voorstel uit de praktijk dat de week zonder rustdag liet.

## Vervangt

Niets.

## Terugdraaien

Haal in `retryPlansFor` de controle `hasRest` uit `tryMove` weg.
