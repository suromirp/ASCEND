# Eén log uit twee tabbladen, en een grens voor intervals.icu die een traag groot antwoord doorlaat

Datum: 2026-11-23
Status: aangenomen

## Besluit

Een nieuw log na Gedaan met een geplande training of een horloge-activiteit erbij wordt in één readwrite-transactie over de logs gekeken en geschreven (`SessionLogsRepo.add` in `src/storage/databaseRepos.ts`). Staat er al een log voor dezelfde geplande training of dezelfde `externalId`, dan komt er niets bij en zegt `logSession` nee; het tweede tabblad leest dat als "stond er al" en toont de bestaande zin daarvoor. Dat sluit I-54.

Een aanroep naar intervals.icu krijgt 15 seconden voor de kop, en daarna 15 seconden per stuk inhoud: elk binnengekomen stuk zet de klok opnieuw. De hele aanroep duurt nooit langer dan 120 seconden. Een herstelstap bij het openen die faalt, telt per stap door in meta (`bootStepFailures`) en staat als één zin onder Instellingen, Gegevens, Versie. Dat sluit I-35.

Eigen keuzes van de bouwer:

1. De transactie leest alle logs (`getAll`) in plaats van een nieuwe index op `plannedSessionId` en `externalId`. Een index is een nieuwe databaseversie met een migratie, voor een leesactie die nu al bij elk afvinken gebeurde. De garantie komt uit de transactie, niet uit de index.
2. Een losse training (zonder geplande training of horloge-activiteit) heeft geen sleutel en gaat ook door `add`, zonder te kijken. Daar blijft de bestaande regel: de knop staat uit tot het opslaan klaar is, en `looseInFlight` binnen één tabblad.
3. De geheugenlijsten (`loggingInFlight`, `externalInFlight`, `pending`) blijven. Ze houden binnen één tabblad een tweede poging tegen voordat de opslag geraakt wordt, en ze geven `slow` en `failed` hun bestaande betekenis.
4. De test speelt twee tabbladen na met een tweede kopie van de modules (`vi.resetModules`): eigen geheugen en een eigen verbinding met IndexedDB, op dezelfde nagemaakte database. Zonder de transactie schreef die test twee logs.
5. Grens: gemeten met een nagemaakte trage lijn (fake timers, een stroom die per stuk wacht). Met één grens van 15 seconden voor kop en inhoud haalde een antwoord met de kop na 14 seconden en daarna acht stukken met tien seconden ertussen het niet; met de nieuwe regel komt het binnen. Een lijn die na de kop 15 seconden niets stuurt, of eindeloos druppelt, geeft dezelfde melding als elke time-out.
6. 120 seconden als plafond: ruim genoeg voor een paar megabyte aan reeksen van een lange tocht over een trage mobiele lijn, en kort genoeg dat de achtergrondstappen na het openen niet minutenlang op één aanroep wachten.
7. De inhoud wordt stuk voor stuk gelezen (`readBody`). Een antwoord zonder leesbare stroom wordt in één keer gelezen onder dezelfde klok. Een fout tijdens het lezen blijft een onbegrepen antwoord, zoals het was.
8. De teller telt op rij: een stap die weer lukt gaat uit de teller. Een stap die over zijn tijd ging telt niet, die kan nog lukken. De teller staat alleen op dit toestel en gaat niet mee in de back-up: de back-up kiest zijn meta-sleutels zelf, dus er hoeft niets gemigreerd te worden en oude back-ups blijven gewoon importeerbaar.
9. Er is nog geen diagnosescherm. De zin staat daarom in het blad Versie, waar je ook naar een update zoekt, alleen als er een stap faalt. De stapnaam staat erbij zoals hij in de code heet, voor wie het doorgeeft.

## Reden

De geheugenlijsten die een dubbel log tegenhielden, delen geen tabbladen. Twee tabbladen keken allebei, zagen allebei niets, en schreven allebei. IndexedDB laat twee readwrite-transacties op dezelfde store nooit door elkaar lopen, ook niet uit twee verbindingen, dus kijken en schrijven in één transactie is genoeg.

Een lange activiteit over een trage lijn kon de grens van 15 seconden voor kop en inhoud samen niet halen, terwijl de lijn gewoon leefde. Een herstelstap die elke start faalde stond alleen in de console, die op een telefoon niemand ziet.

## Alternatieven

Een Web Lock rond het afvinken. Niet gekozen: werkt niet overal hetzelfde, en de opslag zelf geeft de garantie al.

Een unieke index op `plannedSessionId`. Niet gekozen: een geplande training mag in de historie ook zonder log of met een los log gekoppeld bestaan, oude back-ups kunnen dubbele hebben (dan faalt het openen van de database), en het vraagt een nieuwe databaseversie.

Aparte vaste grenzen voor kop en inhoud (15 en 60 seconden). Niet gekozen: een levende lijn met een groot antwoord kan langer nodig hebben, en een dode lijn hoort niet een minuut te mogen hangen.

## Bron

Backlog I-54 (Warden 15 november) en I-35 (Warden 14 november). `docs/beslissingen/2026-11-12-dubbel-log.md` en `docs/beslissingen/2026-11-14-opstarten-en-intervals-grens.md`.

## Vervangt

Deels `2026-11-14-opstarten-en-intervals-grens.md`: keuze 1 (één grens van 15 seconden voor de hele aanroep) en keuze 7 (geen teller). De rest van dat besluit geldt.

## Terugdraaien

Zet de commits terug. `SessionLogsRepo.add` gaat weg en `logSession` kijkt weer los; `withinLimit` krijgt weer één klok. De meta-sleutel `bootStepFailures` kan blijven staan, niemand leest hem dan nog; er is geen opgeslagen vorm veranderd die een migratie vraagt.
