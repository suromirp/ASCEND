# Feestdagen als voorstel

Datum: 2026-11-26
Status: aangenomen

## Besluit

Een officiële feestdag binnen de horizon van je planning, op een dag zonder periode, wordt één voorstel: zet hem als vrije dag (`free_days`). Akkoord loopt door de bestaande weg van zelf een vrije dag toevoegen (`planLeave` en `applyLeave`), met het voorbeeld en Ongedaan maken van die weg. Liever niet onthoudt het alleen voor die ene feestdag. De feestdagen komen van Nager.Date, eens per jaar per land, en vanaf december ook het volgende jaar.

## Reden

De eigenaar gaf op 7 november akkoord (backlog Middelgroot, "Feestdagen als voorstel"). Een feestdag is vaak een vrije dag, maar niet altijd: daarom een voorstel en nooit stil. Door de bestaande weg te gebruiken krijgt een feestdag precies hetzelfde voorbeeld, dezelfde regels en hetzelfde Ongedaan maken als een vrije dag die je zelf zet.

Keuzes bij de bouw:

- Plek. Het voorstel staat in Week, als eigen rij boven "Vrije dagen en vakanties" in de lijst onder de dagen, en niet op Vandaag. Zo blijven de kaarten van Vandaag en de advieslijst (`computeAdvice`) onaangeraakt. Steeds één feestdag tegelijk: de eerstvolgende, vandaag meegeteld.
- Horizon. De laatste dag waarop iets gepland staat (`planHorizonEnd`), zonder extra maximum. Zonder planning geen voorstel.
- Geen voorstel op een dag met een periode: vrije dagen, vakantie, tocht of zonder sportschool.
- Land. Alleen het land uit de instelling "Land van je feestdagen" (standaard Nederland). Een vakantie of tocht heeft geen landveld (een tocht kent alleen naam en coördinaten), dus het land van een vakantie kan nog niet meedoen. Komt er een landveld, dan kan dat land erbij zonder dit besluit te veranderen.
- Alleen feestdagen met `global: true` en type Public: geen regionale dagen en geen bankdagen.
- Stil in Week. Een feestdag die geen vrije dag werd, staat met alleen de naam op een lege dag: "Ma 6 · Tweede Paasdag" in plaats van "niets gepland", gedempt en zonder nieuwe kleur. Op een dag met een training staat hij niet, want daar past hij niet zonder de rij van 52 px te veranderen; dat zou een redesign zijn.
- Adapter. `src/integrations/publicHolidays.ts` levert `PublicHoliday` met een `source`-veld (`nager-date`), nooit een leveranciersveld. Elke aanvraag heeft een tijdsgrens van 10 s, het geheel 15 s. Zonder verbinding wordt er niets gevraagd en gaat de app gewoon verder. Een mislukte poging staat in Instellingen (Rond een vakantie) met Opnieuw proberen en in het blad Vrije dagen en vakanties; hij wordt nooit opgeslagen als "geen feestdagen", dus de volgende keer openen probeert het opnieuw.
- Testen zonder netwerk. Vitest geeft de adapter een nagemaakte `fetch`; de app-kaart (`scripts/app-kaart/kaart.mjs`) beantwoordt `date.nager.at` met een vaste lijst (Eerste en Tweede Kerstdag 2026), zodat de kaart met en zonder verbinding gelijk is. Op de kaart staat daardoor in elke stand van Week de rij "Eerste Kerstdag · vr 25 dec".
- CSP en Android. Er is geen Content-Security-Policy (`connect-src`) in `index.html` of de Vite-config en geen hostlijst voor Android (alleen `androidScheme: https`). Er hoefde niets bij; komt er later een CSP, dan moet `date.nager.at` erin.
- Opslag. De opgehaalde feestdagen staan in IndexedDB (MetaRepo-sleutel `publicHolidays`) en gaan bewust niet in de back-up: het is een kopie van openbare gegevens die opnieuw op te halen is. De afwijzingen staan in localStorage (`ascend.feestdag.nee`), net als die bij stappen, en dus ook niet in de back-up en zonder migratie.
- Instellingen. "Feestdagen voorstellen" (standaard aan) en "Land van je feestdagen" (standaard Nederland), in de bundel Rond een vakantie. Staat het uit, dan wordt er niets opgehaald en staat er niets in Week. Beide gaan mee in de back-up; `migrateHolidaySettings` houdt alleen een geldige waarde en telt de rest als overgeslagen. Een oude back-up zonder deze velden blijft importeerbaar en raakt het toestel niet; een schemaversie was niet nodig.

## Alternatieven

- Het voorstel op Vandaag tussen de adviezen: raakt de advieslijst en de golden scenario's, en een feestdag is zelden vandaag dringend.
- Een feestdag stil als vrije dag zetten: verandert de planning zonder Akkoord, mag niet.
- Alle feestdagen van de horizon in één voorstel: te groot om te overzien en niet per dag af te wijzen.
- De cache in de back-up: maakt het bestand groter met gegevens die altijd opnieuw te halen zijn.

## Bron

Backlog Middelgroot "Feestdagen als voorstel", akkoord van de eigenaar op 7 november. De Nager.Date API (`/api/v3/PublicHolidays/{jaar}/{land}`). Geen persoonsgegevens.

## Vervangt

Niets.

## Terugdraaien

Zet "Feestdagen voorstellen" uit: er wordt niets meer opgehaald of voorgesteld. Een feestdag die al vrije dag werd, haal je weg zoals elke periode in Vrije dagen en vakanties. In de code: de rij in `LeavePeriodsRow` en de prop `holidayNames` in `WeekPlanner` weghalen; de opgeslagen instellingen mogen blijven staan.
