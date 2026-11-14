# Een fout bij het opstarten is geen hangen, en de grens van intervals.icu geldt tot het antwoord gelezen is

Datum: 2026-11-14
Status: aangenomen

## Besluit

Twee fouten uit de audit van 13 november zijn hersteld.

De tijdgrens van 15 seconden op een aanroep naar intervals.icu loopt nu door tot en met het lezen van het antwoord, bij lezen en bij schrijven. Gaat hij af, dan wordt het verzoek afgebroken en krijg je dezelfde melding als bij elke andere time-out: "Geen verbinding met intervals.icu. Controleer je internet en probeer het later opnieuw."

Een herstelstap bij het opstarten die een fout gooit wordt gelogd en alleen zelf overgeslagen. Hij telt niet als gelopen, dus de volgende start probeert hem opnieuw. De herstelstappen erna lopen gewoon. Alleen een stap die over zijn tijd gaat houdt de rest tegen tot de volgende start, zoals het al was.

Eigen keuzes van de bouwer:

1. Eén grens voor de hele aanroep, geen tweede klok voor het lezen. De 15 seconden tellen vanaf het versturen. Een antwoord dat na 14 seconden begint en daarna nog 2 seconden nodig heeft, haalt het dus niet. Dat is wat de naam belooft: geen aanroep duurt langer dan 15 seconden.
2. De grens wacht niet op het afbreken. Naast het signaal naar `fetch` loopt een eigen klok die de aanroep zelf laat mislukken. Een leesactie die niet op het afbreken reageert hangt dan ook niet.
3. Een time-out tijdens het lezen is `network`, niet `response`. Zo vraagt `fetchIntervalsActivities` niet opnieuw zonder de lijst van velden: die tweede poging is bedoeld voor een antwoord dat de app niet begrijpt, niet voor een trage lijn.
4. Een mislukte herstelstap staat wel in `skipped` van de uitkomst, naast de stappen die niet aan de beurt kwamen. Niemand leest die lijst nu behalve de tests; hij zegt wat deze start niet gedaan is.
5. Een mislukte stap zet `pending` niet. Hij is klaar en schrijft niets meer, dus het slot en de planningsronde hoeven nergens op te wachten.
6. Een stap die meteen gooit, zonder belofte, telt als dezelfde fout. Eerder liep die fout door tot in het openen.
7. Er is geen teller of grens op het aantal pogingen. Een stap die elke start faalt kost elke start één poging en één regel in de console; de rest van de app merkt er niets van.

## Reden

Een antwoord dat stokt na de kop liet de aanroep eeuwig wachten, en de achtergrondstappen in `state/boot.ts` die erop wachtten ook. Een knop die wacht heeft een grens in tijd (`2026-10-22-kwaliteitspoort.md`), en die grens had een gat.

De regel dat na een hangende herstelstap de andere wachten bestaat omdat de hangende nog kan schrijven in dezelfde gegevens. Bij een fout is dat niet zo: de stap is klaar. Toch zette een fout dezelfde rem, zodat één stap die elke start faalde alle herstelstappen erna voorgoed tegenhield.

## Alternatieven

Een eigen, langere grens voor het lezen van een groot antwoord. Niet gekozen: de opdracht was dezelfde grens door te trekken, en geen meting zegt dat 15 seconden te kort is.

Een mislukte stap toch als gelopen opslaan, zodat hij niet elke start terugkomt. Niet gekozen: dan wordt een herstel dat één keer misging nooit meer gedaan in deze versie.

Na een fout ook de rest overslaan als de fout van de opslag zelf lijkt te komen. Niet gekozen: dat is raden naar de oorzaak, en elke volgende stap heeft zijn eigen grens.

## Bron

De audit van 13 november en de opdracht van de coördinator. `docs/beslissingen/2026-10-22-kwaliteitspoort.md` voor de grens in tijd.

## Vervangt

Niets.

## Terugdraaien

Zet de commit terug. In `src/integrations/intervalsIcu.ts` verdwijnt dan `withinLimit` en in `src/storage/bootMigrations.ts` de uitkomst `FAILED`; er is geen opgeslagen vorm veranderd, dus er hoeft niets gemigreerd te worden.

## Aanvulling na Warden (coördinator, 14 november)

Een herstelstap die op een eerdere bouwt, wacht een start als die eerdere mislukte (`WAITS_FOR` in `storage/bootMigrations.ts`). Nu alleen opruimen na samenvoegen: opruimen vat oude regels samen, en een samengevatte dubbele regel voegt het samenvoegen daarna nooit meer samen. Een nieuwe herstelstap die op een andere rekent, komt in die lijst. De grens van 15 seconden voor kop en inhoud samen is niet gemeten op een trage lijn met een groot antwoord; dat staat in de backlog.
