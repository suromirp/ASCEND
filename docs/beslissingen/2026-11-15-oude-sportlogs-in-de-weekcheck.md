# Oude sportlogs tellen ook in de weekcheck

Datum: 2026-11-15
Status: aangenomen

## Besluit

De weekcheck leest de sport van een log via `engine/sportOfLog.ts#sportOfLog`, ook voor een log uit Losse training van voor 14 november dat zijn sport alleen in het templateId noemt (`sport_padel`, `sport_custom_tennis`). Dat geldt voor de sportdagen (`engine/sportDays.ts#sportLogDays`), de melding over benen tussen sporten (`engine/weekConcerns.ts`, LEG-SPACING) en de zware dag voor een test (`engine/weekValidator.ts#lastHeavyBefore`), en ook voor de wandellog bij de StairMaster (`engine/looseLog.ts#fitsChosenWayLog`). Het log zelf wordt niet herschreven en de opslagvorm verandert niet.

## Reden

Sinds 14 november tellen Logboek, Lopen, Terugblik en capaciteit zo'n oud log als zijn sport (besluit in commit 2ee2f6f, backlog M). De planner las `countedSport` nog kaal, dus een oude padelpartij op donderdag gaf geen melding voor een zware beendag op vrijdag, terwijl hetzelfde log met `countedSport` dat wel deed. Merkbaar: wie zo'n oud log heeft van de laatste vier dagen, kan nu in Week de melding "Je speelde gisteren padel." zien, met een voorstel met Akkoord. De check verplaatst nog steeds niets zelf. Een eigen sport en zwemmen geven geen sportdag, net als een nieuw log van die sport.

## Alternatieven

De oude logs bij het openen aanvullen met `countedSport`: herschrijft historie, mag niet. Niets doen: de planner en de rest van de app tellen hetzelfde log dan verschillend.

## Bron

Backlog M2 (Warden, 14 november). Tests in `src/engine/sportDays.test.ts` ("een oud log zonder countedSport"). De golden scenario's (`src/storage/planGolden.test.ts`) bewegen niet.

## Vervangt

Niets. Vult de stap van 14 november voor oude sportlogs aan.

## Terugdraaien

De vier plekken weer `log.countedSport` laten lezen; de nieuwe tests geven dan aan wat er verandert.
