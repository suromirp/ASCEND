# Een training die bleef liggen loopt nog

Datum: 2026-11-15
Status: aangenomen

## Besluit

Een voorbije geplande training waar nog een concept van in Forge ligt, heet "loopt nog". Hij is niet gemist en niet gedaan: Week toont hem met het woord "loopt nog" en het teken in ijsblauw, hij krijgt geen vraag Niet gedaan?, niets vanzelf overgeslagen, geen koppelvoorstel, geen regel Vervallen, geen inhaaladvies en geen telling in de krachthint, en hij telt niet mee in de ring van Week, de weekterugblik, Ritme, het seizoen en de reeks. Rond je hem af, dan is er een log en is hij gedaan. Verwijder je het concept, dan geldt weer het gewone gedrag (gemist, met de vraag).

De status blijft afgeleid. Eén functie leest het concept: `engine/sessionStatus.ts#openDraftId` krijgt de wijzer uit `utils/forgeSessionStore.ts#readSession` (die niets geeft als het concept weg is) en de logs. AppData geeft de uitkomst door als `openDraftId`; elke aanroeper geeft hem mee als `openDraft`, naast leave, illness en races, aan `deriveSessionStatus`, `leftOutOfCount`, `buildWeekReview`, `recentAdherence`, `planMissed` en `computeAdvice`. De toets zelf is `isDraftOpen`: zelfde sessie, niet overgeslagen, dag voorbij. Er komt geen vlag op PlannedSession en geen log verandert.

Een concept van vandaag verandert niets: die training is gewoon vandaag. Een overgeslagen training blijft overgeslagen. Een concept van een losse training (zonder plannedSessionId) raakt geen geplande training. In Week is er geen greep en geen Verplaatsen als inhaal voor een training die nog loopt.

## Reden

Backlog Afbreker vervolg: na `2026-11-14-training-blijven-liggen.md` lag een begonnen training als concept met de pil Niet afgerond, terwijl Vandaag tegelijk "Niet gedaan?" vroeg en Week en de weekterugblik hem gemist noemden. Twee stemmen over dezelfde training. Met Zelf overslaan kon ASCEND hem zelfs op overgeslagen zetten terwijl je sets nog in het concept stonden.

## Alternatieven

- Een veld op PlannedSession dat zegt dat hij loopt. Niet gekozen: status is altijd afgeleid, en het concept is al de bron.
- Een concept laten tellen als gedaan. Niet gekozen: er is geen log, en de weekterugblik zou minuten en sets missen.
- Alleen de vraag Niet gedaan? onderdrukken. Niet gekozen: dan zegt Week gemist en Vandaag niets, weer twee stemmen.
- Het concept direct in de engine uit localStorage lezen. Niet gekozen: de engine blijft puur; de opslag levert de wijzer, de engine beslist.

## Bron

Backlog Afbreker vervolg; `docs/beslissingen/2026-11-14-training-blijven-liggen.md` (Alternatieven: "de planner laten weten dat er een concept is staat als vervolg"); `docs/beslissingen/2026-11-15-vervallen-een-bron.md` voor de weg via isPausedDay en leftOutOfCount.

## Vervangt

Niets. Vult `2026-11-14-training-blijven-liggen.md` aan.

## Terugdraaien

`openDraftId` in `engine/sessionStatus.ts` laten teruggeven `undefined`; dan geldt overal weer gemist. De stand `concept` in `scripts/app-kaart/maak-standen.mjs` en de invariant "Een training die nog loopt heet nergens gemist" gaan dan mee weg.
