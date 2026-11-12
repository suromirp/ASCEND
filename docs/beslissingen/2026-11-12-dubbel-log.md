# Een log dat er staat is ja, ook als een stap erna faalt

Datum: 2026-11-12
Status: aangenomen

## Besluit

`logSession` zegt ja zodra het log in de opslag staat. Faalt daarna nog iets (de mijlpalen, het opnieuw lezen, het moment na Gedaan), dan blijft het ja en gaat de fout apart naar de melding bovenin, met de tekst "Je training is opgeslagen. Het bijwerken daarna lukte niet; open ASCEND opnieuw als je hem niet ziet staan." Nee betekent voortaan alleen: er is niets geschreven. Een tweede tik op dezelfde losse training terwijl de eerste nog loopt schrijft geen tweede log.

Eigen keuzes van de bouwer:

1. De vorm blijft ja of nee, met de fout apart. Geen uitkomst met meer waarden: elke aanroeper (het blad Hoe ging het?, het actieblad, Vandaag, Week, Forge, MacroFactor, de horlogekaart, de sportvraag) las ja al als "het staat er, blad dicht", en dat is nu ook waar. Geen aanroeper hoefde te veranderen.
2. De fout na het schrijven is een eigen fout (`storage/storageError.ts#LogStoredFollowUpFailed`) met een eigen tekst. De gewone tekst "Opslaan is niet gelukt. Probeer het opnieuw" zou juist tot een tweede log uitnodigen.
3. Het schrijven staat nu zonder React in `src/state/logSession.ts#runLogSession`, zodat het te testen is (`logSession.test.ts`); de hook in `logActions.ts` geeft alleen door. Het log zelf wordt veld voor veld gemaakt zoals voorheen.
4. Falen de mijlpalen, dan leest de app toch opnieuw en komt het moment na Gedaan, zonder mijlpaal. Faalt het opnieuw lezen, dan komt er geen moment: het scherm toont het log nog niet. Er komt hooguit een melding per log.
5. De dubbele tik: een losse training of horlogelog die nog onderweg is staat in een lijst van lopende pogingen, op de hele invulling (losse training) of de `externalId` (horloge). Een tweede aanroep met precies dezelfde losse invulling wacht op de eerste en krijgt haar uitkomst. Een tweede aanroep voor dezelfde horloge-activiteit krijgt nee, zoals wanneer haar log er al staat, zodat de horlogekaart niets dubbel doet. Daarna is de lijst weer leeg: dezelfde losse training later nog eens opslaan (twee keer hetzelfde rondje) blijft kunnen. Een geplande training houdt haar bestaande vangst: de tweede krijgt nee.
6. Geen nieuw veld in de opslag, geen migratie. Een bestaand log wordt niet aangeraakt.

## Reden

Pathfinder zag in de code dat `logSession` nee kon geven nadat het log al geschreven was. Een test bevestigde het: met een falend opnieuw lezen of falende mijlpalen gaf de oude code nee met het log in de opslag, en twee tikken tegelijk op een losse training gaven twee logs. Een scherm dat na nee opnieuw laat opslaan maakt dan een tweede log, en logs zijn append-only: dat ruim je niet stil op.

## Alternatieven

Een uitkomst met drie waarden (opgeslagen, opgeslagen met fout, niet opgeslagen): eerlijker in het type, maar elke aanroeper en de tests van MacroFactor moeten dan om, terwijl geen van hen iets anders doet met het verschil. Een losse training herkennen aan eerdere logs met dezelfde inhoud: dat weert ook een echte tweede training op dezelfde dag. Het log terugdraaien als een stap erna faalt: dan verdwijnt wat je invulde door een fout die er niets mee te maken heeft.

## Bron

De opdracht van de coördinator na de doorloop van Pathfinder (12 november), besluit `2026-11-12-hoe-ging-het.md` punt 6, `docs/werkbriefjes/historie-en-logs.md`.

## Vervangt

Niets. Het vult punt 6 van `2026-11-12-hoe-ging-het.md` aan: de waarschuwing dat `logSession` kan mislukken na het schrijven geldt niet meer.

## Terugdraaien

In `src/state/logSession.ts` de stappen na `SessionLogsRepo.put` weer in de ene try zetten en `pending` weghalen. Er is geen opslag veranderd, dus terugdraaien raakt geen gegevens.
