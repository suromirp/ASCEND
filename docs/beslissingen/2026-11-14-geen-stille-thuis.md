# Geen stille Thuis: lukt je plek niet, dan vraagt de lus waar hij begint

Datum: 2026-11-14
Status: aangenomen

## Besluit

Lukt Waar je nu bent niet (geweigerd, niet beschikbaar, niet op tijd, te grof of niet ondersteund), dan valt de lus nooit meer stil terug op Thuis of op Ongeveer, en er wordt niet gezocht. Op de plek van de kaart staat één regel met de reden ("ASCEND mag je locatie niet gebruiken. Probeer het opnieuw, of kies hierboven Thuis of Andere plek.") en Opnieuw (precies één nieuwe vraag om je plek); Thuis (alleen als die er is) en Andere plek (het blad met zoeken en je bewaarde plekken) zijn de chips erboven. Pas na een tik wordt er gezocht. Wie Thuis koos in de instelling Startpunt van je lus, begint gewoon bij Thuis: dat is een eigen keuze.

Daarnaast zegt de regel als zoeken niet lukt welke stap niet op tijd was (heuvels en paden, of de routeplanner), en zonder verbinding "Je hebt geen verbinding. Zonder netwerk is er geen route." in plaats van "probeer het later".

## Na Warden en de schermopname (14 november)

- Start bij heeft vaste chips met vaste namen op een vaste plek: Waar je nu bent, Thuis (alleen als die er is) en Andere plek. Eerder droeg de tweede chip de naam van de plek die gold ("Thuis", dan "Andere plek"), en dan versprong er een knop onder je vinger. Een gekozen andere plek staat met haar naam in een regel onder de chips ("Bij ..."). Dit zet de chip Thuis terug die `2026-11-12-route-blok.md` uit de rij haalde.
- De vraag in het vak heeft alleen nog de reden en Opnieuw; Thuis en Andere plek zijn de chips erboven, dus ze staan er niet twee keer. Het blad Andere plek hangt aan de chip en sluit netjes als de keuze de stand verandert.
- Je plek bepalen staat alleen als stap in de zoekbalk zolang je plek bepaald wordt of als er een verse plek van deze poging is; na een mislukte plek en een tik op Thuis staat er geen afgevinkte plek meer.
- Een tik op Waar je nu bent zet chip en regel meteen om; "De lus begint bij Thuis." komt na een mislukte plek nergens meer voor.
- Wat de regie uit het plan haalt staat puur in `engine/routeStart.ts#startView` en `#maySearch`, met tests; `routeStart.scan.test.ts` legt vast dat de regie ze gebruikt.

## Reden

De eigenaar, 14 november, op reis in het buitenland: "Hij moet dus stoppen met automatisch thuis." Thuis kan duizenden kilometers verderop liggen; een lus daar is nutteloos en de regel erboven las je makkelijk over.

## Alternatieven

- Terugvallen op Thuis alleen binnen een straal van je laatste plek: ASCEND weet je laatste plek niet als de vraag net mislukte, en bewaart hem niet.
- Ongeveer als terugval houden: Ongeveer is je plaats uit de instellingen (de plaats van het weer), ook die kan thuis liggen.

## Bron

Opdracht van de eigenaar via de coördinator, 14 november. Code: `engine/routeStart.ts#planStart` (stand `ask`, `startReady`, `locateNow`), `engine/routeSheet.ts#searchFailLine`, `components/RoutePanel.tsx#AskStart`, `components/TrainingBriefing.tsx` (de stand in de Briefing).

## Vervangt

Uit `2026-11-11-route-kaart-2.md`: "Lukt het niet, dan je vaste punt als dat er is ..., anders Ongeveer". Uit `2026-11-11-route-start.md` de terugval `hereStart` op Thuis. Uit `2026-11-12-route-blok.md` de tweede chip met de naam van de plek die geldt, en dat de chip Thuis uit de rij gaat.

## Terugdraaien

In `planStart` bij een mislukte plek weer `home` of `approx` teruggeven in plaats van `ask`; de stand `ask` valt dan nooit en `AskStart` tekent niets.
