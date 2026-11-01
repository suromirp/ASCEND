# De ochtenden zijn een archief

Datum: 2026-11-01
Status: aangenomen

## Besluit

De opgehaalde ochtenden (datum, rusthartslag, HRV, slaapduur en slaapscore) zijn een archief en geen gewone cache. Wie de koppeling met het horloge weghaalt terwijl Ochtendgetallen in back-up aan staat, houdt zijn ochtenden. Alleen het uitzetten van "Ochtendgetallen in back-up" ruimt ze op: zonder koppeling meteen allemaal, met een koppeling (ook met een verlopen sleutel) bij de volgende keer ophalen het deel van langer dan 400 dagen geleden. Beide na een korte vraag ("De bewaarde ochtenden verdwijnen van deze telefoon. Uitzetten?" met Uitzetten en Annuleren) en met Ongedaan maken in de melding zolang je op de pagina blijft. Het opruimen is alles of niets, in één transactie (`RecoveryMetricsRepo.deleteMany`); de pagina leest de lijst vooraf, zodat Ongedaan maken ook na een fout of te lang wachten precies die ochtenden terugzet.

## Reden

Valt de bron weg, dan is de telefoon het enige exemplaar (`docs/beslissingen/2026-10-31-kansen-stap-0.md`). Ontkoppelen is geen keuze om je gegevens kwijt te raken, dus het archief blijft. Zonder koppeling kan niets de ochtenden opnieuw leveren, en de enige reden om ze te bewaren is dan de back-up. Zet je die uit, dan is er geen reden meer om ze te bewaren; omdat dat niet terug kan zodra je de pagina verlaat, vraagt de app het eerst. Met een koppeling levert de bron het recente deel opnieuw, maar wat ouder is dan 400 dagen ruimt de volgende keer ophalen stil op (`storage/wellness.ts#syncWellness`); daarom vraagt de app het ook dan, met een eigen zin. Het blad zegt er ook bij dat Wat speelde er, vroeg ziek zien en de ochtendregel je ochtenden dan niet meer kunnen vergelijken.

Bij het opruimen (ontkoppelen, de grens van 400 dagen) slaat `engine/morningBackup.ts#planRetire` een ochtend over die al alleen de back-upvelden heeft, zodat niets dubbel geschreven of half opgeruimd wordt. Wat je zelf invulde wordt nooit opgeruimd. De opgeslagen vorm verandert niet, dus er is geen migratiestap; export en import blijven gelijk.

## Alternatieven

- Bij ontkoppelen alles weg, zoals voor 31 oktober. Niet gekozen: dan verlies je je ochtenden precies wanneer de bron wegvalt.
- Uitzetten zonder vraag. Niet gekozen: het gevolg is groot en is na het verlaten van de pagina niet terug te draaien.
- Met een koppeling uitzetten zonder vraag. Niet gekozen: de volgende keer ophalen ruimt dan het deel van langer dan 400 dagen geleden stil op, en de bron levert dat niet opnieuw.
- Opruimen per ochtend. Niet gekozen: een fout halverwege laat dan een half opgeruimd archief achter.

## Bron

Review van 31 oktober, de opdracht van de coördinator, `docs/beslissingen/2026-10-31-kansen-stap-0.md`. Geen persoonsgegevens; alle testdata is nagemaakt.

## Vervangt

Niets. Het vult het stuk "Ochtendgetallen in de back-up" van `2026-10-31-kansen-stap-0.md` aan.

## Terugdraaien

Laat de schakelaar in `components/settings/groups/GegevensGroup.tsx` weer rechtstreeks `updateSettings({ morningInBackup: on })` aanroepen; dan blijft het archief ook na uitzetten op de telefoon staan, maar gaat het niet meer mee in de back-up. `storage/morningArchive.ts` kan dan weg.
