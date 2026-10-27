# Ziek melden en weer beter zijn een voorstel met Akkoord

Datum: 2026-10-27
Status: aangenomen

## Besluit

Ziek melden, van soort veranderen en "Ik ben weer beter" passen je planning niet meer stil aan. Als de planning verandert, zie je eerst een voorstel (`ProposalSheet`) met wat er vervalt, met "Akkoord" en "Liever niet". Verandert de planning niet, dan wordt de periode direct bewaard.

## Reden

Alles wat de planning van de gebruiker inhoudelijk verandert gaat via een voorstel met Akkoord. Ziek melden was de laatste plek waar dat nog stil gebeurde. Het rekenen zit nu in `engine/illness.ts#planIllnessChange` en is puur: het bewaart niets.

Wat er gebeurt:
- Akkoord: de ziekteperiode wordt bewaard en de trainingen uit het voorstel gaan van de planning. De meldingsbalk biedt "Ongedaan maken", dat de periodes en de planning samen terugzet, zoals bij andere voorstellen.
- Liever niet: alles blijft zoals het was en er wordt niets genoteerd. De periode is dus ook niet bewaard, en dus telt de dag niet als ziektedag voor gemist of opbouwen.
- Geen verandering in de planning: de periode wordt direct bewaard, zonder blad.

Lopende ziekteperiodes uit oudere gegevens blijven werken; de opgeslagen vorm is niet veranderd, dus er is geen migratiestap nodig.

## Alternatieven

Bij "Liever niet" toch de ziekte noteren zonder de planning aan te passen. Dat is niet gekozen: het is het eenvoudigste dat eerlijk is om "Liever niet" te laten betekenen dat er niets verandert. Wie wel ziek is maar de planning wil houden, kan de trainingen zelf overslaan. Een ziekteperiode zonder planningswijziging zou ook de afspraak breken dat gemiste trainingen tijdens ziekte niet tellen.

## Bron

Werkafspraken voor agents (voorstel met Akkoord), `docs/beslissingen/2026-10-22-terugzetten-zonder-slot.md` voor het gedrag van undo, en de keuze van de eigenaar.

## Vervangt

Niets. De regels uit `engine/illness.ts` (wat er wegvalt, hoelang je opbouwt) blijven zoals ze waren.

## Terugdraaien

`IllnessCard.tsx` roept dan `applyIllness` direct aan zonder het blad. De engine en de opslag blijven bruikbaar.
