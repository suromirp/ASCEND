# Vanzelf afvinken, met een vraag en een weg terug

Datum: 2026-10-22
Status: aangenomen

## Besluit

Als je horloge (via intervals.icu) precies één activiteit heeft die onmiskenbaar bij de geplande training van die dag past, slaat ASCEND die zelf op als log van die training. De kaart "Van je horloge" vraagt daarna alleen nog "Hoe ging het?" (gevoel, zwaarte en eventueel pijn), met "Klopt niet" om de afvinking weer weg te halen. Bij twijfel blijft het gewone voorstel met Opslaan, Andere training en Niet opslaan.

"Onmiskenbaar" is een vaste regel in `src/engine/autoTick.ts`: dezelfde dag, één geplande training van dezelfde soort (zonder log en niet overgeslagen), een duur binnen 15 minuten of 35 procent van het plan, geen met de hand gemaakte log van die dag die erop lijkt, en geen tweede activiteit van die dag voor dezelfde training. Een testloop en een wedstrijd vink je altijd zelf af. Op het koppelscherm staat de schakelaar "Vanzelf afvinken", standaard aan.

## De uitzondering op "nooit herschrijven"

Een log wordt normaal nooit verwijderd door de app. Hier mag dat in precies één geval: "Klopt niet" op een log die ASCEND zelf een moment eerder vanzelf maakte. Het mag alleen als aan alles tegelijk voldaan is (`canRejectAutoLog`): de log is die van het bijbehorende bericht, de vraag "Hoe ging het?" is nog niet beantwoord, de afvinking is niet ouder dan drie dagen, en de log komt van het horloge (niet met de hand gemaakt). Elke andere log verdwijnt alleen door de gewone verwijdering in het logboek, zoals voorheen.

Het verwijderen gebruikt dezelfde `undoLog` als altijd, dus een mijlpaal die de log vanzelf haalde gaat er ook weer af. Daarna komt de activiteit terug als gewoon voorstel en wordt hij nooit opnieuw vanzelf afgevinkt. Dat wordt onthouden in een notitie bij de koppeling (`autoLogged`, status `rejected`), net als een afvinking die later in het logboek verwijderd wordt.

## Reden

De eigenaar zei ja tegen vanzelf afvinken om handwerk te sparen: bij de meeste dagen is er maar één logische match. De afvinking is een nieuwe log, geen aanpassing van een oude, dus de historie blijft aangroeien. Dat de eigenaar de app meteen kan corrigeren is nodig omdat het horloge zich kan vergissen (een wandeling om de hond is geen Herstel-training). Geen stille verandering van de planning: er wordt niets verplaatst of overgeslagen, alleen een afgelopen training vastgelegd.

De vanzelf gemaakte log is stil: geen geluid, geen felicitatiescherm en geen terugblik, want de eigenaar deed op dat moment niets. Een mijlpaal die hij daarmee haalt wordt wel gevierd.

## Alternatieven

Altijd vragen (zoals tot nu toe): behoudt het handwerk dat dit besluit wil wegnemen. Vanzelf afvinken zonder weg terug: te riskant bij een verkeerde match. De log laten staan en alleen verbergen bij "Klopt niet": dan blijft een training meetellen die niet gedaan is.

## Bron

Eigenaar, 22 oktober 2026 (ja op idee 2 in `docs/visie/Visuele upgrade en nieuwe ideeën.md`). Code: `src/engine/autoTick.ts`, `src/components/WatchActivityCard.tsx`, `src/components/WatchAskCard.tsx`.

## Vervangt

Niets. Vult `2026-10-22-intervals-icu.md` aan, dat zei dat een activiteit nooit stil wordt opgeslagen: dat geldt nu voor alles behalve het onmiskenbare geval.

## Terugdraaien

Zet "Vanzelf afvinken" uit op het koppelscherm, dan staat alles weer op voorstellen. Een training die al vanzelf is afgevinkt blijft in het logboek en kan daar gewoon verwijderd worden.
