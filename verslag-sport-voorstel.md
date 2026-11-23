# Verslag Sherpa Sport-voorstel blijft (I-23 punt 10, stap 0 en 3)

Branch: claude/sport-voorstel-blijft. Dit bestand is niet voor main.

## Stap 0: naspelen

- Test: src/storage/sportVoorstelNaspelen.test.ts (TZ Europe/Amsterdam, primePlanningRegisters, nagemaakte data: padel op donderdag, Benen B door jou op vrijdag gezet).
- Test 1 laat zien: de melding staat er donderdagavond en vrijdag, en is zaterdag weg, terwijl Benen B nog op vrijdag staat zonder log. Niemand koos, niets bleef bewaard.
- Test 2 (het spoor) faalde voor de bouw met "expected undefined to be defined" (er bestond geen sportRestOffers). Na de bouw groen.
- Meest voor de hand: weg (a), de dag is voorbij. Een training in het verleden zonder log leest de weekcontrole niet meer.
- Weg (b), sport ouder dan 4 dagen, komt pas ruim na de beendag (rust is hoogstens 72 uur).
- Weg (c), gedekt door een voorstel op Vandaag, vraagt een ochtendantwoord en is dus zeldzamer.

## Stap 3: gebouwd

- Engine: src/engine/sportRestOffer.ts (append-only lijst, id sportrest:<logId>:<sessionId>, parse met 30 dagen, unie voor de back-up, vervallen-regel, voorstel op de beendag, instelling). Tests: src/engine/sportRestOffer.test.ts.
- Opslag: src/storage/sportRestOffers.ts (toevoegen in een transactie via MetaRepo.update), databaseSettings.ts, migrationsSports.ts plus export in migrations.ts, backupClean.ts, backupMerge.ts. Tests: src/storage/sportRestOffers.test.ts.
- State: AppDataProvider.tsx en appDataTypes.ts (appendSportRest).
- UI: src/components/sports/useSportRest.ts, SportRestLine.tsx (regel met Begrepen), SportRestOfferCard.tsx (Akkoord, Liever niet, vaste zin), Today.tsx, WeekNotice.tsx (schrijft de eerste regel als Week het voorstel laat zien), todayCards.ts plus test.
- Instelling "Voorstel na een zware sport" (Blijft tot je kiest, advies; Vervalt vanzelf): settingsDefs/planning.ts, order.ts, settingsSummary.ts, SportCountingSheet.tsx, instellingen-foto.json bijgewerkt.
- Fout: "Dit lukte niet. Je planning is niet veranderd." met Opnieuw proberen, tijdsgrens 8 seconden.
- Geen schemanummer omhoog: de velden zijn optioneel en additief; migratiestappen schonen ze op bij import. Een oude back-up zonder lijst laat de lijst op het toestel staan.

## Tests

- Grensdag, eerder Liever niet (geen nieuw voorstel), eerder Akkoord, zelf verplaatst of overgeslagen, keuze in Week via de echte weekFixId, ochtendkeuze.
- Back-up nieuw (rondgang, onlyNew, toestel gaat voor), back-up oud (zonder veld, skippedInvalid 0), kapotte regel telt mee.
- Twee tabbladen: gelijktijdig toevoegen, beide regels staan er, dezelfde regel staat er één keer.
- Golden A en C (planGolden.test.ts) groen in de volledige run.

## Controles

- npx tsc -p tsconfig.app.json --noEmit: groen.
- npm run lint: groen, 0 fouten; één waarschuwing in LegFatigueCard.tsx die ook op main staat.
- npx vitest run: 810 bestanden, 12397 tests groen.
- npm run build: groen.

## Let op

- silentCatch-scan: de achtergrondregels (Week of Vandaag zag het voorstel, keuze in Week, Akkoord bewaard) loggen bij een fout alleen in de console, via traceInBackground met uitleg. Er wacht geen knop en de planning hangt er niet van af; de volgende opening probeert het opnieuw.
- Ongedaan maken na Akkoord brengt het voorstel niet terug; de accepted-regel blijft staan (append-only).
- Mogelijk conflict bij de squash met claude/sport-duur-voorstel in settingsDefs/planning.ts, order.ts en instellingen-foto.json (daarna npx vitest run src/engine/settingsFoto.test.ts -u).

## Niet gecontroleerd

- Geen screenshot of Lookout, geen kaart:vergelijk (doet de coördinator), geen test op een echt toestel.
