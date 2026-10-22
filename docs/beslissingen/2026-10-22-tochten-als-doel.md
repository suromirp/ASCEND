# Tochten als eigen doel naast de GR5

Datum: 2026-10-22
Status: aangenomen

## Besluit

De GR5 blijft het hoofddoel. Daarnaast maak je zelf tochten aan (een sneeuwhike, een weekend met tent) op de Doelen-pagina. Een tocht is een tochtperiode (`AppSettings.leavePeriods`, soort `trek`) met de gegevens van de tocht erop (`LeavePeriod.trek`: naam, terrein, rugzakgewicht, tent, belang). Tocht en periode zijn zo één record: wijzigen of verwijderen van de tocht neemt de periode mee.

## Reden

De planning rond een tocht bestaat al: een wandeling op elke tochtdag, lichte dagen eromheen en een voorstel met Akkoord. Een tweede opslag of een tweede planner zou twee waarheden geven. De GR5-voortgang telt een gelopen tocht al mee zodra die als wandeling, bergtocht of avontuur gelogd is, dus er komt geen tweede percentage.

Belang is een keuze per tocht. "Training onderweg" is geen afbouw: alleen de dag ervoor en erna blijft licht, zoals bij elke tocht. "Doel, ik wil fris zijn" houdt extra dagen ervoor licht: 2 bij een tocht van 1 dag, 3 bij 2 of 3 dagen, 4 bij 4 dagen of meer. De getallen staan op één plek (`engine/trekTaper.ts`), met de redenering in commentaar: de benen herstellen van zware training in ongeveer twee tot vier dagen, en een langere inspanning vraagt meer frisheid aan de start. Het is een redenering, geen studie.

De lichte dagen lopen via regel LEAVE-LIGHT van de weekcontrole. Historie, wat je zelf vastzette en een test of wedstrijd verschuiven nooit; die komen als notitie in het voorstel.

Of de eerstvolgende tocht op Vandaag staat, is een instelling (`showNextTrek`, standaard aan). Op Ascend staat hij altijd, als hij eerder is dan de GR5.

## Alternatieven

Een tocht als `TrainingGoal`. Verworpen: doelen voeden de focusranglijst, de capaciteitsstappen en de wedstrijdblokken, en daar hoort een tocht niet in zonder meer. Ook zou elke tocht een koppeling met een periode nodig hebben die kan uitlopen.

Eén vaste afbouw van één dag. Verworpen: een weekend met tent vraagt meer frisheid dan een dagtocht.

## Bron

Gesprek met de eigenaar op 22 oktober 2026 (tochten als eigen doelen naast de GR5). `docs/beslissingen/2026-10-22-gr5-voortgang-een-percentage.md` voor de voortgang.

## Vervangt

Niets.

## Terugdraaien

De opgeslagen vorm is optioneel en additief: `trek` op een periode en `showNextTrek` in de instellingen. Een oudere app leest de periode als gewone tochtperiode. Verwijderen van een tocht in de app (met Akkoord) zet de planning terug.
