# Nieuwe testpoging maakt ruimte

Datum: 2026-10-28
Status: aangenomen

## Besluit

Aanvulling op `2026-10-28-nieuwe-testpoging.md`, dat zelf ongewijzigd blijft. In een gewone week staat de harde loop op zaterdag, de lange duurloop op zondag en een zware beendag twee dagen ervoor. Dan vond TEST-RETRY nooit een dag en zei niets. Nu maakt hij ruimte, zoals TEST-MAKE-ROOM dat doet, in één voorstel met Akkoord.

1. **De testloop.** Elke harde loop (rol `hard_run`) van 3 tot 10 dagen vooruit wordt beoordeeld. De gekozen wordt de testloop op dezelfde rij en dag, zoals eerst.
2. **De dag erna.** Staat daar een lange duurloop of andere harde loop, dan schuift die naar de eerstvolgende dag waar hij past volgens dezelfde afstandsregels, bijvoorbeeld de maandag. Een herstelwandeling op die dag mag wijken als er de dag ervoor niets meer staat, anders moet er plek naast zijn. Valt hij in een week met een eigen lange training, dan wordt hij korter, met de bestaande korte variant (`catchUpMinutes`). Past hij nergens, dan is die harde loop geen kandidaat.
3. **De dagen ervoor.** Een zware beendag die de test minder fris maakt schuift naar na de test, met dezelfde bouwstenen als `moveStrengthFor` (nu gedeeld in `leavesNextHardFresh`). Wat jij zelf vastzette (`PlannedSession.lock`), gelogd of voorbij is, wordt nooit bewogen. Een zelf vastgezette beendag komt dus niet als item in het voorstel, maar de tekst zegt het eerlijk: "Benen A (zwaar) van do 29 oktober maakt de test minder fris; laat hem gaan of doe hem Lichter." Hetzelfde geldt voor een beendag die nergens meer past na de test. Een vastgezette lange duurloop of een andere zelfgekozen sessie die in de weg staat maakt die dag geen kandidaat.
4. **Kiezen.** De dag die het minst verandert wint: elke verschoven training weegt 2, een wijkende herstelwandeling 1, een genoemde beendag die blijft 3; bij gelijk de vroegste dag. Meer dan één goede dag geeft `options` (hoogstens drie), zoals TEST-MAKE-ROOM.
5. **Tekst.** Eerst het droge feit, dan elke verandering in één zin, en daarna: "Kies een route zonder stoplichten en zet auto-pauze uit."

## Reden

Zonder dit zei het advies in de meest gewone week niets, terwijl de eerstvolgende harde loop met één verschuiving prima een testloop kon worden. De voorvertoning loopt via dezelfde planningsronde, dus wat je ziet is wat je krijgt.

## Alternatieven

- De beendag van de gebruiker toch verschuiven. Dat doet een voorstel niet met iets wat de gebruiker zelf vastzette zonder dat het uit de tekst blijkt, en het blijft zijn keuze.
- Een nieuwe planningsregel voor de testweek. Dat zou naast de bestaande afstandsregels een tweede waarheid maken.

## Gevolg

Een standaardweek geeft een voorstel voor zaterdag, met de lange duurloop naar maandag (korter als die week een eigen lange training heeft). De golden snapshots in `planGolden.test.ts` veranderen niet: het advies verschijnt alleen met een testlog met stops en verandert nooit stil de planning.

## Bron

Een nagemaakte standaardweek: harde loop op zaterdag, lange duurloop op zondag, een zelf verplaatste Benen A op donderdag.

## Vervangt

Niets. Vult `2026-10-28-nieuwe-testpoging.md` aan.

## Terugdraaien

Haal `retryPlanFor` uit `testRetryAdvice` en kies weer de eerste harde loop die direct past.
