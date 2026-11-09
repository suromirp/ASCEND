# Een weghaling valt mee met haar toevoeging

Datum: 2026-11-09
Status: aangenomen

## Besluit

In een week zonder vrije dag haalt de weekindeling een training weg en zet de nieuwe op die dag (`src/engine/weekReconciliation.ts`, de terugval). De toevoeging noemt voortaan de rij die ze vervangt (`PlanChangeItem.replacesSessionId`). Valt de toevoeging weg, omdat de planningsronde hem niet laat staan of omdat de dag een vakantie-, tocht- of wedstrijddag is, dan valt de weghaling op die dag mee en blijft de oude training staan (`src/engine/weeklyPrescriptionDiff.ts#withoutOrphanedRemovals`, `#changesOnAllowedDays`).

Eigen keuzes buiten de letter van de opdracht:

- Een expliciete koppeling in plaats van alleen dag en week vergelijken. Op één dag kunnen twee weghalingen staan, en een weghaling van een training die niet meer bij de week hoort staat los van een toevoeging. Alleen op dag en week zou die ook meevallen. De koppeling is een optioneel, additief veld: geen migratiestap, oude back-ups lezen hetzelfde (`src/storage/migrations.ts`).
- Hetzelfde voor de filter op verboden dagen in `src/storage/weeklyPrescriptionStep.ts`: daar viel een toevoeging op een vakantie- of wedstrijddag weg en bleef de weghaling ook staan.
- De terugval kiest geen training meer van een dag die voorbij is (`pickSwapCandidate` met `asOf`); vandaag telt mee. Zonder deze grens kon een week een training van gisteren verliezen voor een nieuwe op gisteren. Het weekvoorschrift geeft geen `asOf` mee en rekent alleen over twee weken vooruit, dus daar verandert niets; alleen het krachtblok voor deze en volgende week merkt het.
- `keptByPlanningRound` leest de opslag één keer (`readHorizonStore`) en geeft die met de planning aan elke ronde mee (`HorizonOverrides.store`, alleen bij een voorbeeldronde).
- De teksten `consequences` en `explanation` van het krachtblok, de vervolgweken en het weekvoorschrift volgen de stemgids: het feit eerst, geen vaktaal (geen "forecast", "x/week", "dit bestand"). Alleen tekst, geen planningseffect; de tekstkaart toont ze niet.

## Reden

Review van Melding bij elke opening (9 november): sinds het voorschrift alleen houdt wat de ronde laat staan, kon de toevoeging wegvallen terwijl de weghaling bleef. Dan verliest een week een training zonder vervanging, stil.

## Alternatieven

Alleen dag en week vergelijken: raakt een losse weghaling op dezelfde dag. De weghaling in de ronde zelf toetsen: de ronde laat een weggehaalde rij gewoon weg, dus daar is niets te zien. De terugval laten vallen: dan krijgt een volle week nooit de training die het doel vraagt.

## Bron

Inbox van `docs/backlog.md` (9 november), nagespeeld op nagemaakte gegevens in `src/storage/openingPingpong.test.ts`, `src/engine/weeklyPrescriptionDiff.test.ts` en `src/engine/weekReconciliation.test.ts`.

## Vervangt

Niets. Vult `docs/beslissingen/2026-11-09-voorschrift-volgt-planningsronde.md` aan.

## Terugdraaien

Haal de aanroep van `withoutOrphanedRemovals` uit `changesTheRoundKeeps` en `changesOnAllowedDays`, en `replacesSessionId` uit de terugval in `weekReconciliation.ts`. De test "volle week" in `src/storage/openingPingpong.test.ts` faalt dan.
