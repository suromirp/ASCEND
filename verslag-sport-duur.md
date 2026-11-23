# Verslag Sport-duur voorstel (I-23 punt 9, stap 0 en 4)

Branch `claude/sport-duur-voorstel`, vanaf origin/main 6fe4db90. Dit verslag is voor de coördinator en hoort niet op main.

## Stap 0: de naspeeltest

`src/storage/sportDuurNaspelen.test.ts`, met het demoprogramma, vier verzonnen loopjes, voetbal vast op dinsdag en donderdag en padel op vrijdag, alle drie Zwaar. TZ=Europe/Amsterdam en `primePlanningRegisters`.

- Op main faalde de eerste test met acht regels als "Heuvelintervallen: aangepast (met voetbal deze week past er een harde training minder, daarom een rustige loop)": de weekcontrole (HARD-DAYS) zette de harde loop stil om naar een rustige loop.
- Op main faalde de tweede test omdat het auditrecord geen wijzigingen had (`changes: []`).
- ONE-LONG raakt nooit een sport (een sportsjabloon heeft geen rol long). LEG-SPACING met een vaste afspraak verplaatst alleen een dag en verandert geen duur; met een gelogde sport liep hij al via fromSport. Alleen HARD-DAYS veranderde stil een soort en dus een duur.

## Stap 4: wat er gebouwd is

- Instelling "Duur aanpassen na een sport" (`sportDurationChange`): Eerst een voorstel (advies, ook als de instelling ontbreekt) of Vanzelf, met melding. Staat in het blad Meldingen in Week van Planning, met uitleg en samenvatting. Een andere waarde gaat via `plan.changeSetting`, dus via een voorstel.
- `weekValidator.ts`: een bevinding door een sport draagt `sport` (naam en datum) en bij HARD-DAYS `hardDays` (telling en grens). `repairWeeks` laat zo'n bevinding op Eerst een voorstel liggen, behalve voor wat het voorstel zelf mag verplaatsen (`mayMove`).
- Week: HARD-DAYS staat in `CONCERN_RULES`. Kop "Met voetbal op dinsdag past er deze week een harde training minder.", het feit met telling en grens, en een voorstel met Akkoord: "Heuvelintervallen op zaterdag wordt een rustige duurloop van N minuten in plaats van M." Het voorstel zet het sjabloon en de minuten in de wijziging (`templateId`, `fromMinutes`, `toMinutes`).
- Op Vanzelf: de ronde zet om zoals voorheen, met de melding Planning bijgewerkt, en het auditrecord van de weekcontrole krijgt nu de wijzigingen in soort of minuten (`src/engine/repairAudit.ts`). Een nieuw record per ronde, niets omgeschreven. Dat geldt voor elke reparatie die een duur of soort raakt, niet alleen die door een sport.
- Geen migratiestap: alle nieuwe velden zijn optioneel en additief; `migrations.ts` is niet aangeraakt (ook om botsing met punt 10 te vermijden).

## Bestanden

Nieuw: `src/engine/repairAudit.ts`, `src/engine/repairAudit.test.ts`, `src/storage/sportDuurNaspelen.test.ts`.
Gewijzigd: `src/engine/weekValidator.ts`, `src/engine/planPass.ts`, `src/engine/weekConcerns.ts`, `src/engine/weekFixProposal.ts`, `src/engine/settingsDefs/planning.ts`, `src/engine/settingsDefs/uitleg/planning.ts`, `src/engine/settingsDiff.ts`, `src/engine/settingsSummary.ts`, `src/models/planChange.ts`, `src/storage/databaseSettings.ts`, `src/storage/databaseHorizon.ts`, `src/storage/backupClean.ts`, `src/state/planningSync.ts`, `src/state/bodyAndLeave.ts`, `src/state/AppDataProvider.tsx`, `src/components/settings/groups/PlanningGroup.tsx`, `docs/werkbriefjes/planning.md` (valkuil). Tests bijgewerkt: `src/engine/fixedSports.test.ts`, `src/engine/settingsDiff.test.ts`, de snapshot `src/engine/__snapshots__/instellingen-foto.json`.

## Tests

- Naspeeltest: geen stille omzetting op het advies; op Vanzelf wel, met de minuten in de items; Week toont het punt en het voorstel; na Akkoord blijft de rustige loop staan; drie openingen achter elkaar veranderen niets; het auditrecord heeft de wijzigingen; zonder sport maakt de instelling niets uit.
- `fixedSports.test.ts`: Vanzelf zet om, twee keer planPass verandert de tweede keer niets; op het advies geen HARD-DAYS-reparatie en dezelfde soorten als zonder sport, met de sport in de bevinding.
- `planGolden.test.ts` en `openingPingpong.test.ts` ongewijzigd groen.

## Controles

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen (alleen de bestaande waarschuwing in LegFatigueCard.tsx).
- `npx vitest run`: 809 bestanden en 12380 tests, alles groen.
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: geen verschil.

## Niet gecontroleerd

- Geen `kaart:vergelijk` (opdracht). De tekstkaart en schermen met het nieuwe punt in Week en de instelling zijn niet bekeken: Lookout nodig. Warden nodig (engine, opslag en planner).
- De snapshot van de instellingen telt de index opnieuw; punt 10 voegt ook een instelling toe, dus bij het mergen van de tweede tak die snapshot opnieuw maken met `npx vitest run src/engine/settingsFoto.test.ts -u`. `settingsDefs/planning.ts` kan daar ook een kleine botsing geven.
- Weken na de getoonde week: op het advies blijft HARD-DAYS er ook staan; Week toont het voorstel alleen voor de week die je bekijkt.
- Geen regel in `.claude/kosten/logboek.md`; dat doet de coördinator.
