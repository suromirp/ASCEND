# Een tweede lange duurloop in de week, en de laatste vrije dag

Datum: 2026-11-02
Status: aangenomen

## Besluit

1. Twee zware beendagen achter elkaar (LEG-SPACING) in Week krijgen dezelfde laatste keuze als TEST-DAY: alleen als verplaatsen niets oplevert, biedt het voorstel aan om een training van jou (niveau 1) te laten gaan. Dat mag alleen als de week nog een sessie met dezelfde taak en dezelfde sport houdt die minstens even lang is, zoals de eigen lange duurloop van die week. Zo gaat altijd de kortste van de twee. Altijd een voorstel met Akkoord, als laatste optie. Zo gaat nooit weg: iets van het systeem, een test of wedstrijd, een bergtocht of wandeling, een training met het merkteken van een vakantie of tocht, of een training van het wedstrijdblok. De zin in het voorstel luidt "Laat de lange duurloop op dinsdag 27 gaan.", ook bij TEST-DAY.
2. De planningsronde (`repairWeeks`, `relocate`) zet een training van het systeem nooit op de laatste vrije dag van een week. Staat er op je rustdag iets van jou, dan is die vrije dag de rust die de week nog heeft. Past de training nergens anders, dan blijft hij staan en meldt de controle het zoals eerst.
3. Uitzondering op punt 2: in een week met een vakantie, vrije dagen of een tocht (of de lichte dag ervoor of erna) geldt die regel niet. Daar zijn de vakantiedagen de rust, en LEAVE-OFF, LEAVE-LIGHT en een beendag naast een tocht houden hun eigen weg. Zonder deze uitzondering zou de eerste van twee trainingen op een vakantiedag vervallen in plaats van verhuizen, omdat de vakantiedag nog niet vrij is zolang de tweede er staat.

## Reden

Een melding uit de praktijk, nagebouwd met nagemaakte gegevens. Een eerder geaccepteerd voorstel (TEST-RETRY, zoals besloten in `2026-10-28-nieuwe-testpoging-ruimte.md`) zette de lange duurloop van de week ervoor kort in de volgende week. Daarna zette de gebruiker zelf de heuvels op de maandag ervoor. Week meldde "Twee zware beendagen achter elkaar" maar vond geen dag die beter past: zaterdag was vrij, maar lag tussen Benen A op vrijdag en de lange duurloop op zondag, dus binnen 48 uur aan beide kanten. Die uitsluiting klopt. Wat ontbrak was de uitweg die voor de hand ligt: de extra lange duurloop laten gaan, want de week heeft er al een.

Daarnaast verschoof de planningsronde bij het openen Bovenlichaam B van een te volle vrijdag naar die vrije zaterdag. Dan had de week geen enkele vrije dag meer en kwam er een tweede melding bij ("Deze week heeft geen rustdag"). TEST-RETRY neemt de laatste rustdag van een week al nooit; nu doet de planningsronde dat ook niet.

## Alternatieven

De zaterdag toch toestaan: dan staan er twee zware beendagen naast elkaar, dat is precies wat de regel voorkomt. Twee trainingen van jou tegelijk verplaatsen: dat schuift meer om dan nodig en blijft ook binnen 48 uur van iets zwaars. TEST-RETRY de lange duurloop niet meer naar de volgende week laten schuiven: dat raakt een eerder besluit en laat het advies in een gewone week weer zwijgen, en blijft dus een vraag voor de eigenaar.

## Bron

Een melding van de eigenaar over zijn week; `docs/architectuur/week.md`, `docs/architectuur/planning.md`, `2026-10-31-testdag-in-week.md`.

## Vervangt

Niets.

## Terugdraaien

Haal in `planWeekFix` het blok met `lastResort` onder LEG-SPACING weg, en in `repairWeeks#relocate` de regel met `hadFree`. `planGolden.test.ts` bewoog niet.
