# Wat ASCEND zelf weet, telt vanzelf mee

Datum: 2026-10-25
Status: aangenomen

## Besluit

Dit vult `2026-10-25-wat-speelde-er.md` aan, dat blijft staan.

1. Wat ASCEND zelf weet hoeft niet bevestigd te worden: een zware beendag (uit het logboek), warm (uit het weer bij de log), kort geslapen (van het horloge, niet bij een nacht die je "Niet goed gemeten" noemde) en ziek (uit de ziekmelding). In het blad van een training en van een dag staan ze als gewone regels onder "Wat ASCEND al weet", met de bron, zonder rondje en zonder tikdoel. De zin "Tik als het klopt." vervalt.
2. Deze feiten tellen in "Wat doet dit met je?" mee als redenen, zonder dat er een notitie wordt opgeslagen. Ze staan op dezelfde plek als een notitie zou staan (een training, of een dag) en raken dezelfde ochtend (`affectedMorning`). Een reden die je vroeger zelf bevestigde en een afgeleide reden op dezelfde plek tellen één keer.
3. Een dag met een feit is geen gewone dag meer voor "lijkt op" en voor de banden van je eigen schommeling.
4. Feiten tellen altijd mee in het overzicht, ook als Mogelijke oorzaak op "Uit" staat. Die instelling beslist alleen of het blad ze toont en of "lijkt op" iets zegt. Op Je stand verschijnt de kaart zodra er iets te tonen is, uit een notitie of uit een feit. Is er alleen een feit en geen notitie, dan komt er geen lege toestand met "Leg vast".
5. Er verandert niets aan het model of de back-up. Bestaande notities met een bevestigd feit blijven staan en worden gelezen als altijd.

## Reden

De eigenaar zag onder "Wat ASCEND al weet. Tik als het klopt." de regel "Zware beendag, Heuvelsprints en afdalen, uit je logboek" met een leeg rondje en zei: "Dit weet ASCEND toch gewoon zelf." Wat ASCEND uit zijn eigen gegevens kent, is een feit en geen vraag. Alleen wat ASCEND niet kan weten (alcohol, wiet, stress, een eigen woord) vraagt nog om een tik.

## Alternatieven

Het rondje laten staan en de feiten bij het openen van het blad vanzelf opslaan als notitie: valt af, want dan schrijft de app notities die jij niet maakte, en een feit dat later verdwijnt (ander weer, nacht anders beoordeeld) bleef dan staan. Afgeleid rekenen laat het feit meebewegen met de gegevens.

## Bron

De reactie van de eigenaar op het blad van 24 oktober, en het besluit `2026-10-25-wat-speelde-er.md`.

## Vervangt

Niets. Het vult `2026-10-25-wat-speelde-er.md` aan op het punt dat feiten bevestigd moesten worden.

## Terugdraaien

In `components/influence/useInfluenceEffects.ts` de feiten niet meegeven (`facts: []`) zet het meetellen uit. In `InfluenceBlock.tsx` terugzetten van de knoprij brengt de tik terug. Er is niets opgeslagen om op te ruimen.
