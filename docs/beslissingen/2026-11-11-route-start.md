# Route: start bij waar je nu bent, en een balk die doorloopt

Datum: 2026-11-11
Status: aangenomen

## Besluit

Boven de kaart en de zoekstand van Route (in de Briefing en het blad Route) staat een rij Start bij met chips: Waar je nu bent (het advies) en Thuis als die er is. De rij is neutraal (de stille variant van Chip, zonder mint), zodat er één mint accent per scherm blijft; Waar train je? houdt de mint. Een tik geldt voor deze training, wordt niet bewaard en breekt een zoektocht die loopt af. Start hier op de kaart geldt alleen voor die zoektocht; Thuis verschuift alleen via Bewaar als plek, Maak dit Thuis. Lukt je plek niet of is hij grover dan 50 m, dan valt de lus niet stil terug: één regel zegt de reden en waar hij nu begint. Met Thuis staat dan de chip Thuis gekozen; zonder Thuis begint hij afgerond ("Geen Thuis en geen locatie"). Kon Thuis niet gelezen worden, dan zegt de regel dat en is er geen Maak dit Thuis. Bij de instelling Ongeveer blijft ook een tik op Waar je nu bent afgerond. In teksten heet Vast punt nu Thuis; in de opslag blijft de waarde `exact`.

De zoekbalk loopt in Vol op tijd: één doorlopende, vertragende beweging naar ongeveer 90 procent in de grens van de zoektocht, nooit vol voor hij klaar is, zonder herhaling; een nieuwe stap schuift hem in 300 ms ease-out naar het begin van die stap. In Rustig en Uit staat hij stil op het aandeel van de stap. Dit is een uitzondering op de regel van 150 tot 400 ms, alleen voor een voortgangsbalk op tijd.

## Reden

De eigenaar zag een lus beginnen in een andere stad dan waar hij was: een getikt punt (Start hier) werd zijn vaste punt en de instelling ging om, en bij een mislukte locatie viel Waar je nu bent stil terug op dat punt. Hij zag zichzelf niet op de kaart en de balk leek vast te lopen, want hij schoof alleen per stap en een stap kan twintig seconden duren.

## Alternatieven

Start hier laten bewaren met een Ongedaan maken: afgewezen, een tik voor één zoektocht hoort niets blijvends te doen. Een balk die heen en weer loopt: afgewezen, dat is een lus van beweging. Bij klaar eerst de balk vol laten lopen voor de kaart komt: niet gedaan, dat houdt de lussen 300 ms tegen; het vak maakt meteen plaats voor de kaart.

## Bron

Melding van de eigenaar (11 november), `docs/onderhoud/2026-11-11-pathfinder-route-start.md`, backlog Route voorstellen: start en laden.

## Vervangt

Het deel van `2026-11-11-route-kaart.md` waarin Start hier het punt bewaart als vast punt en de instelling op Vast punt zet, en de balk per stap uit `2026-11-11-route-kaart-2.md`.

## Terugdraaien

`storage/routeStart.ts#startFromMap` weer laten bewaren en `useRouteSearch` de chips laten negeren; de balk terug naar `searchStepShare` met een overgang van 300 ms ease-out per stap.
