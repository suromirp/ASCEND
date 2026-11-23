# Verslag I-154: terugkeer gaat voor inhalen

Tak: `claude/terugkeer-voorrang` (vanaf origin/main df187512).

## Wat er gebouwd is

- `src/engine/adviceCompute.ts#computeAdvice`: REENTRY wordt eerst berekend. Staat hij open (gevonden en niet in respondedIds), dan worden MISSED-CATCH-UP, SKIPPED-KEY-TO-REST en TEST-MAKE-ROOM niet berekend. Daardoor tellen ze ook niet in usedIds, catchUpDays (REST-BACK), retryUsed en weekBusy (volle week): geen stille bijwerking. Na Liever niet of Akkoord op de instap mag inhalen weer.
- De ruil van de eerste dag in de instap (`reentryFirstDay`: restId en trainingId) gaat in usedIds, zodat REST-SWAP of REST-PULL niet dezelfde rustdag ruilen nu het inhalen hem niet meer bezet.
- Sortering: bij gelijke prioriteit gaat REENTRY voor, daarna op id zoals eerst.
- `holdsCatchUp?: true` op Advice (`src/engine/adviceShared.ts`), alleen op REENTRY en alleen als MISSED-CATCH-UP er echt achter wachtte. `src/components/useMissedTraining.ts` leest het: de vraag Niet gedaan? wacht dan, net als achter MISSED-CATCH-UP. Zonder wachtend inhaaladvies verandert er niets aan die vraag.
- Niet onder inhalen gerekend: REST-SWAP en REST-PULL (rustdag schuiven) en TEST-RETRY (nieuwe poging voor een gedane test). Motivering in het besluit.

## Keuze die ik maakte

- Het weglaten geldt voor elke oorzaak van REENTRY, ook twee stille weken zonder gemelde pauze. Vier bestaande tests met fixtures zonder logs kregen daardoor de instap in beeld; ze testen het inhalen zelf en kregen `reentry: { choice: 'off' }` met een regel uitleg: `conceptLooptNog.test.ts`, `vakantieZiekGemist.test.ts` (rustdagruil voor een race), `weekSamenhang.test.ts` (I-41), `weekTelling.test.ts` (rustdag morgen). Wil de eigenaar dit alleen na een gemelde pauze, dan is het een toets op `found.cause !== 'quiet'`.
- Na Akkoord op de instap komt inhalen ook terug (de opdracht noemde alleen Liever niet); het venster van drie dagen is dan meestal al bijna voorbij en de duur volgt de instap.

## Bestanden

- src/engine/adviceCompute.ts, src/engine/adviceShared.ts, src/components/useMissedTraining.ts
- src/engine/terugkeerVoorInhalen.test.ts (nieuw, 6 tests)
- src/engine/conceptLooptNog.test.ts, src/engine/vakantieZiekGemist.test.ts, src/engine/weekSamenhang.test.ts, src/engine/weekTelling.test.ts
- docs/beslissingen/2026-11-23-terugkeer-voor-inhalen.md (nieuw), docs/kennisindex/ (bronnen.json met vultAan, opnieuw gemaakt), docs/werkbriefjes/planning.md (valkuil, samengevoegd met de regel over de afdaalklok wegens de grens van 45 regels)

## Niet gecontroleerd

- Geen screenshot of Lookout: de kaart op Vandaag en de vraag Niet gedaan? zijn niet in de browser bekeken.
- Niet nagespeeld met een echte back-up; alleen nagemaakte data.
- Golden scenario's: `src/storage/planGolden.test.ts` is groen; deze wijziging raakt alleen adviezen, niet de planning.
