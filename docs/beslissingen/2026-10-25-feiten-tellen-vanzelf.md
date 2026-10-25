# Wat ASCEND zelf weet, telt vanzelf mee

Datum: 2026-10-25
Status: aangenomen

## Besluit

Dit vult `2026-10-25-wat-speelde-er.md` aan, dat blijft staan.

1. Wat ASCEND zelf weet hoeft niet bevestigd te worden: een zware beendag (uit het logboek), warm (uit het weer bij de log), kort geslapen (van het horloge, niet bij een nacht die je "Niet goed gemeten" noemde) en ziek (uit de ziekmelding). In het blad van een training en van een dag staan ze als gewone regels onder "Wat ASCEND al weet", met de bron, zonder rondje en zonder tikdoel. De zin "Tik als het klopt." vervalt.
2. Deze feiten tellen in "Wat doet dit met je?" mee als redenen, zonder dat er een notitie wordt opgeslagen. Ze staan op dezelfde plek als een notitie zou staan (een training, of een dag) en raken dezelfde ochtend (`affectedMorning`). Een reden die je vroeger zelf bevestigde en een afgeleide reden op dezelfde plek tellen één keer.
3. Feiten hebben hun eigen rij als reden, maar halen geen ochtend uit een band. Alleen wat je zelf vastlegde (een notitie met een reden) gaat uit de banden en maakt een dag "niet gewoon". Een zware beendag of een korte nacht van het horloge hoort bij je normale week. Voor "lijkt op" zijn de gewone dagen dus de dagen zonder eigen notitie; een dag met alleen een feit telt als gewoon. "Lijkt op" noemt alleen een reden die je zelf vastlegde, nooit een feit: met deze banden kan het voor een feit ook niets zeggen. Het blad van een reden toont alleen de metingen waarvoor die reden telt.
4. Warm gebeurt tijdens de training en telt alleen voor Hartslag bij tempo en Zwaarte, niet voor rusthartslag, HRV en slaap, en niet bij "lijkt op" op die metingen.
5. Een ziekmelding telt één keer per periode: de eerste ochtend van de melding binnen het venster van 400 dagen, ook als je die dag niet trainde. De melding telt dus één keer, op de ochtend van de startdatum. Een eigen "ziek" bij een dag of training op een andere ochtend telt los.
6. Een korte nacht waarop je nog niet antwoordde telt al als kort geslapen. "Niet goed gemeten" telt niet.
7. Een reden die je vroeger zelf bevestigde, is in het blad onzichtbaar zolang ASCEND het feit zelf ziet, en telt niet dubbel. Verdwijnt het feit, dan komt ze terug als gekozen chip.
8. De feiten worden één keer uitgerekend per wijziging in logboek, metingen, ziekmeldingen of nachtoordelen, en gedeeld door Je stand en het blad van een training. De cache volgt de inhoud (`engine/factsCache.ts`), dus een nieuwe lijst met dezelfde inhoud is een hit. Een tik op een chip rekent de 400 dagen niet opnieuw door. 700 logs en 400 dagen kosten een paar milliseconden.
9. Feiten tellen altijd mee in het overzicht, ook als Mogelijke oorzaak op "Uit" staat. Die instelling beslist alleen of het blad ze toont en of "lijkt op" iets zegt. Op Je stand verschijnt de kaart zodra er iets te tonen is, uit een notitie of uit een feit. Is er alleen een feit en geen notitie, dan komt er geen lege toestand met "Leg vast".
10. Er verandert niets aan het model of de back-up. Bestaande notities met een bevestigd feit blijven staan en worden gelezen als altijd.

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
