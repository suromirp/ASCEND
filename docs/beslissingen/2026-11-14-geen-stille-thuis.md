# Geen stille Thuis: lukt je plek niet, dan vraagt de lus waar hij begint

Datum: 2026-11-14
Status: aangenomen

## Besluit

Lukt Waar je nu bent niet (geweigerd, niet beschikbaar, niet op tijd, te grof of niet ondersteund), dan valt de lus nooit meer stil terug op Thuis of op Ongeveer, en er wordt niet gezocht. Op de plek van de kaart staat één regel met de reden ("ASCEND mag je locatie niet gebruiken. Kies waar de lus begint.") en drie keuzes: Opnieuw (precies één nieuwe vraag om je plek), Thuis (alleen als die er is) en Andere plek (het blad met zoeken en je bewaarde plekken). Pas na een tik wordt er gezocht. Wie Thuis koos in de instelling Startpunt van je lus, begint gewoon bij Thuis: dat is een eigen keuze.

Daarnaast zegt de regel als zoeken niet lukt welke stap niet op tijd was (heuvels en paden, of de routeplanner), en zonder verbinding "Je hebt geen verbinding. Zonder netwerk is er geen route." in plaats van "probeer het later".

## Reden

De eigenaar, 14 november, op reis in het buitenland: "Hij moet dus stoppen met automatisch thuis." Thuis kan duizenden kilometers verderop liggen; een lus daar is nutteloos en de regel erboven las je makkelijk over.

## Alternatieven

- Terugvallen op Thuis alleen binnen een straal van je laatste plek: ASCEND weet je laatste plek niet als de vraag net mislukte, en bewaart hem niet.
- Ongeveer als terugval houden: Ongeveer is je plaats uit de instellingen (de plaats van het weer), ook die kan thuis liggen.

## Bron

Opdracht van de eigenaar via de coördinator, 14 november. Code: `engine/routeStart.ts#planStart` (stand `ask`, `startReady`, `locateNow`), `engine/routeSheet.ts#searchFailLine`, `components/RoutePanel.tsx#AskStart`, `components/TrainingBriefing.tsx` (de stand in de Briefing).

## Vervangt

Uit `2026-11-11-route-kaart-2.md`: "Lukt het niet, dan je vaste punt als dat er is ..., anders Ongeveer". Uit `2026-11-11-route-start.md` de terugval `hereStart` op Thuis.

## Terugdraaien

In `planStart` bij een mislukte plek weer `home` of `approx` teruggeven in plaats van `ask`; de stand `ask` valt dan nooit en `AskStart` tekent niets.
