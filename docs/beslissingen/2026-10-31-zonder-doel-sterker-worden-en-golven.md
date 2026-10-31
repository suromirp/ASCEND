# Zonder doel, stap 7: Sterker worden en de instelling Golven

Datum: 2026-10-31
Status: aangenomen

## Besluit

Sterker worden plant zonder doel rustige duur: de heuvelloop van de zaterdag wordt een herstelloop, zodat je benen fris zijn voor de krachtdagen en het aandeel pittig binnen de 0 tot 10% blijft. De duur volgt het weekbudget (120 minuten, de vierde week 35% minder) en kracht is 3 keer, instelbaar van 2 tot 4. `chooseWeekShape` kent nu `strengthSessions`, zodat de startvragen (stap 8) een gevraagd aantal krachttrainingen kunnen plannen. Nieuwe instelling Golven in Doel en tochten, Zonder doel: de lengte van een golf (3, 4 of 6 weken, advies 4) en Lichte week voorstellen (aan).

## Hoe het werkt

- Een golf zonder doel draagt zijn lengte en of hij een lichte week heeft op de fase zelf (`Phase.wave`). De rustweek op Week en Je stand, Deze week nog een keer en de opbouw lezen die lengte via `models/program.ts#phaseWaveLength` en `isLightWeekOf`. Een fase zonder dit veld (elk plan met een doel, en een plan zonder gekozen richting) werkt precies zoals altijd met golven van vier.
- Rustig aan heeft geen golf: zijn fase heeft geen lichte week, Vandaag zegt "Je vaste week" en er staat geen rustweek in de week. Dat was in stap 4 nog wel zo.
- Een andere lengte of de lichte week uit is een voorstel, zoals elke planningsinstelling. Bij "Terug naar het advies" hoort Golven bij het deel dat de planning raakt.
- Bij golven van 3 of 6 weken beslaat de beginnersstart hele golven, dus zes weken. Zo blijft week 1 van de golf in het plan dezelfde week als op de kaart Je week.
- `AppSettings.waves` is optioneel; `migrateWaveSettings` houdt bij een import alleen een bekende lengte (3 of 6) en `lightWeek: false` over.

## Eerlijk over wat niet verandert

Wie al een plan heeft en Sterker worden kiest, houdt het aantal krachttrainingen dat in zijn week staat. De vorm van de week later veranderen bestaat nog niet (`docs/architectuur/planning.md`). Het blad Weekbudget zegt dat.

## Reden

Het ontwerp (`docs/visie/Zonder doel.md`, 2.3 en 3.3) spreekt van "120 minuten rustige duur" en pittig 0 tot 10% voor Sterker worden. Zonder doel is de heuvelloop de enige pittige training, dus rustige duur betekent geen heuvelloop. De lengte op de fase houdt de golven van een plan met een doel onaangeraakt.

## Alternatieven

- De heuvelloop houden maar korter: dan is hij nog steeds de zwaarste beenprikkel van de week, vlak naast de krachtdagen.
- Alleen 4 weken toestaan: eenvoudiger, maar het ontwerp vraagt de keuze en het advies blijft 4.

## Bron

`docs/visie/Zonder doel.md` (2.3, 3.3, 4 en stap 7).

## Vervangt

Niets.

## Terugdraaien

`directionSwaps` voor Sterker worden leeg laten geven, en `layoutWaves` zonder `wave` aanroepen: dan zijn het weer golven van vier met een rustweek.
