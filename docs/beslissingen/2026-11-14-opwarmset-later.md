# Opwarmset later in de training

Datum: 2026-11-14
Status: aangenomen

## Besluit

Een opwarmset later in de training, op een beweging die al warm is (de leg press na squat en deadlift), blijft in Forge zichtbaar maar gedempt, met één zin waarom: "Je benen zijn warm van de Barbell Back Squat. Twijfel je over de stoel of het gewicht, doe hem dan." Je vinkt hem af of laat hem liggen. Laten liggen telt niet als gemist en nergens mee; afvinken telt als opwarmset, nooit als werkset. Een nieuwe spiergroep of een nieuw bewegingspatroon krijgt de gewone opwarmset, zonder zin en niet gedempt. Geen nieuw woord: het blijft een opwarmset (W).

## Hoe

- Wanneer: alleen als Forge al één aanloopset koos (`'ramp'` in `src/engine/warmup.ts`): zelfde patroon, lichaamsdeel al warm. Een nieuw patroon op warme spieren (`'feel'`, zoals deadlift na squat), een koude spier (`'light'`) en de volle opbouw (`'full'`) blijven gewoon. De stappen naar een zware topset worden nooit gedempt.
- De bron in de zin is de laatste oefening op hetzelfde patroon die opwarmsets had, met de naam zoals op het scherm (`WarmState.by`). Bij een toestel staat "de stoel of het gewicht" erin, anders "het gewicht".
- Logica in `src/engine/warmupLater.ts` (`warmAlready`, `warmAlreadyAfter`, `warmAlreadyLine`, `mutedWarmup`, `leftAlone`); `planExercise` zet `warmAlready` op de geplande opwarmrijen en `warmFrom` op de oefening. Alleen in het concept, nooit in het log.
- Laten liggen: Alle sets afvinken vinkt hem niet mee af, de rust start niet na de laatste werkset alleen omdat hij nog open staat, en terug naar boven slaat hij over. De telling van sets (`progress`, `isWorkSet`, `muscleVolume`) verandert niet: opwarmsets telden al nooit.
- Weergave: in het blok van de oefening, dezelfde rij met een lagere dekking (0,55 tegen 0,78 voor een gewone open opwarmset) en de zin eronder in de stijl van de andere regels onder een set. Het vinkje blijft een tikdoel van 44 px.

## Instelling

"Opwarmset later dempen", standaard aan, in het blad Bij het invullen van Forge (de Forge-pagina had al twaalf rijen). Uit: elke opwarmset staat er zoals altijd. De bestaande keuze Opwarmen per spiergroep of per oefening dekt het niet, maar sluit erop aan: met Per oefening krijgt elke samengestelde oefening de volle opbouw en is er niets te dempen (de rij zegt dat dan). De instelling staat niet in `strengthModelKey`: ze verandert geen getal.

## Reden

De eigenaar (11 november) vond de opwarmset bij de leg press na squat en deadlift vaak overbodig, met als uitgangspunt geen black box: nooit stil weglaten of stil beslissen. Gedempt met de reden erbij laat de keuze bij hem. Op 14 november akkoord met het advies.

## Alternatieven

De set weglaten (stil beslissen, afgewezen). Een nieuw woord zoals Voelset, Proefset, Proefslag, Bijgloeien of Optioneel (afgewezen of vaag). Ook dempen bij een nieuw patroon op warme spieren: daar is een set om het patroon te voelen juist nuttig.

## Bron

Eigenaar 11 en 14 november (backlog, punt Opwarmset later in de training). `docs/beslissingen/2026-10-23-opwarmen-per-spiergroep.md` voor de soorten opwarming.

## Vervangt

Niets.

## Terugdraaien

Zet de standaard van `warmupMuted` op uit in `src/engine/strengthSettings.ts`, of haal de aanroep van `warmAlready` uit `planExercise`. Logs hoeven niet terug: ze kregen geen veld.
