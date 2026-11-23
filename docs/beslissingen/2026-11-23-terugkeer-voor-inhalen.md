# Terugkeer gaat voor inhalen

Datum: 2026-11-23
Status: aangenomen

## Besluit

Een aanvulling op `2026-11-23-terugkeer-eerste-dag.md` (I-144), na een melding van de eigenaar. Backlog I-154.

- Staat het voorstel voor een rustiger instap open (REENTRY gevonden en nog niet beantwoord), dan komt er geen inhaaladvies: geen MISSED-CATCH-UP, geen SKIPPED-KEY-TO-REST en geen TEST-MAKE-ROOM (een gemiste testloop op een nieuwe dag). Ze worden niet berekend, dus ze tellen ook niet mee in wat andere regels als bezet zien (`usedIds`, de inhaaldagen voor REST-BACK, de volle week). Dat geldt zolang het voorstel staat, voor elke oorzaak van de terugkeer, ook twee stille weken.
- Na een antwoord op de instap (Liever niet of Akkoord) mag inhalen weer, met de gewone regels en het gewone venster van drie dagen.
- De ruil van de eerste dag in de instap (`reentryFirstDay`) telt als bezet: REST-SWAP en REST-PULL zetten geen tweede ruil op dezelfde rustdag of training.
- De vraag Niet gedaan? wacht, net als achter een inhaaladvies. Het advies REENTRY draagt dan `holdsCatchUp` (alleen als er echt een inhaaladvies wachtte, niet opgeslagen) en `components/useMissedTraining.ts` leest dat.
- Bij gelijke prioriteit gaat REENTRY voor in de volgorde van `computeAdvice`; daarna blijft de volgorde op id. De kaart op Vandaag toont alleen het eerste advies.
- Niet onder inhalen: REST-SWAP en REST-PULL (een rustdag schuiven, niets gemists terugzetten) en TEST-RETRY (een nieuwe poging voor een test die wel gedaan is). Die blijven zoals ze waren.

## Reden

Nagespeeld met nagemaakte data (`src/engine/terugkeerVoorInhalen.test.ts`): laatste training twaalf dagen terug, daarna een periode zonder sportschool en aansluitend ziek, de trainingen van de drie dagen voor vandaag gemist. MISSED-CATCH-UP en REENTRY hadden allebei prioriteit 3, de id `missed:` kwam alfabetisch eerst en de kaart toonde alleen het inhalen: de lange duurloop op de rustdag, terwijl na twaalf dagen niets de rustige instap het eerste antwoord is. Inhalen na een pauze is precies wat de instap wil voorkomen: meteen de volle week oppakken.

## Alternatieven

- Alleen de volgorde omdraaien en het inhalen laten staan. Niet gekozen: dan liggen twee voorstellen naast elkaar die elk kloppen, maar samen de instap ondergraven (inhalen op volle lengte in de eerste week).
- Inhalen alleen weglaten bij een gemelde pauze, niet bij twee stille weken. Niet gekozen: na twee weken zonder training geldt dezelfde reden.
- REENTRY een hogere prioriteit geven. Niet gekozen: dan schuift hij ook voor andere adviezen met prioriteit 3 die er niets mee te maken hebben, en verandert de volgorde verder dan nodig.

## Bron

Melding van de eigenaar (I-154): na een lange pauze geen voorstel om rustig terug te komen. Nagespeeld met de skill naspelen, zonder echte back-up.

## Vervangt

Niets. Een aanvulling op `2026-11-23-terugkeer-eerste-dag.md` en `2026-11-23-terugkeer-na-pauze.md`.

## Terugdraaien

In `computeAdvice` (`src/engine/adviceCompute.ts`) `holdCatchUp` op `false` zetten en de tiebreak op REENTRY uit de sortering halen; in `useMissedTraining.ts` de toets op `holdsCatchUp` weghalen. Er is geen opgeslagen vorm veranderd.
