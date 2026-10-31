# Sporten die meetellen, stap 3: de rol per sport en de belasting

Datum: 2026-10-31
Status: aangenomen

## Besluit

Elke sport krijgt één bron voor hoe ASCEND ermee omgaat: `AppSettings.sportHandling`, met per sport een rol ("Plan dit voor mij", "Vaste dag", "Telt mee als ik het doe", "Negeren") en bij een vaste dag de afspraken (dag, minuten, zwaarte). `engine/sportRole.ts#sportRole` leest die keuze en valt zonder keuze terug op de oude instelling. Belasting heeft één munt: minuten maal hoe zwaar het voelde (`engine/sessionLoad.ts`). Nog zonder scherm; de planning en de golden test zijn niet veranderd.

## Hoe het werkt

- Zonder keuze: een sport die aan staat (`enabledSports`) wordt gepland, een sport die uit staat doet niet mee, en zwemmen, padel en voetbal hebben nog geen rol en tellen dus niet mee. Pas als je kiest, verandert er iets.
- `parseSportHandling` houdt alleen bekende sporten met een rol die die sport kent (padel kun je niet laten plannen) en vaste afspraken met een echte dag, lengte en zwaarte, hoogstens een per dag. `storage/migrations.ts#migrateSportHandling` doet dat bij een import; een oud bestand importeert zoals het was.
- De vier woorden van "Hoe zwaar voelde het?" zetten RPE 3, 5, 7 en 9. Zonder RPE neemt ASCEND de bedoelde of gebruikelijke zwaarte aan (laag 4, middel 6, hoog 8). Een aangenomen waarde telt een punt hoger, aan de veilige kant. `SessionLog.rpeAssumed` markeert een voorgekozen waarde die je niet aanraakte, zoals `SetLog.rirAssumed`; het is een aanvulling op het log, `migrateLogRpeAssumed` houdt alleen `true` over en het log zelf verandert nooit.

## Reden

`docs/visie/Sporten die meetellen.md` (3.2, 5 en stap 3).

## Alternatieven

- De rol afleiden uit `enabledSports` en `sportFrequency` zonder nieuw veld: die kennen geen vaste dag en geen "telt mee".

## Bron

`docs/visie/Sporten die meetellen.md`.

## Vervangt

Niets.

## Terugdraaien

Het veld wordt nog nergens gelezen dan in `sportRole`; weghalen laat alles zoals het was.
