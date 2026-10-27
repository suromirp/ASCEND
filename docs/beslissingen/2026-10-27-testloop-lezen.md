# De testloop beter lezen en een twijfeltest niet stil laten tellen

Datum: 2026-10-27
Status: aangenomen

## Besluit

Een testloop telt met het snelste aaneengesloten stuk van 5 km uit de serie van het horloge, en met de hele log als die serie er niet is. Een test die duidelijk trager is dan de vorige verandert je tempo's pas als je zegt dat hij meetelt, en bij elke test kun je achteraf kiezen dat hij niet meetelt.

## Reden

Na een testloop van 6,03 km in 36 minuten, met een kwartier fietsen vooraf, harde wind en spierpijn, rekende ASCEND met de totalen van de hele activiteit en zette de uitkomst meteen in alle trainingstempo's, ook die naar het horloge. Een warming-up of uitloop maakte het tempo trager, en één slechte dag veranderde stil je tempo's. De vlag `doubtful` bestond al, maar niemand las hem.

Wat er nu gebeurt:

- **Beste 5 km.** `engine/bestEffort.ts` vindt in de serie (afstand per seconde, of de snelheid opgeteld als er geen afstand is) het snelste stuk van de testafstand. Een stuk met een gat langer dan 20 seconden telt niet, korte gaten worden overbrugd. Komt de afstand van de serie meer dan 10 procent af van die van de log, of is de serie korter dan 5 km, dan is er geen beste 5 km en telt de hele log, zoals vroeger. De app zegt welke van de twee is gebruikt: "Beste 5 km uit je run: 27:40" of "Hele run: 6,03 km in 36:00".
- **Opgehaald, afgeleid getal bewaard.** De serie zelf blijft niet bewaard (zoals bij het loopinzicht). Het getal wordt berekend op het moment dat de serie toch al wordt opgehaald (bij het koppelen van de activiteit aan een log, `storage/activityDetail.ts`), en als `SessionLog.bestEffort` (`{ km, minutes }`) op de log gezet. Een test die al eerder gekoppeld was, haalt het één keer op bij het openen van het logblad. Dit is append-only: het veld wordt alleen toegevoegd aan een log die het nog niet heeft, geen gemeten waarde verandert, en een gesneden log (`trim`) krijgt het niet. Zonder verbinding of zonder opgeslagen activiteit blijft het de hele log.
- **Twijfeltest.** Is de test voorbij de gewone spreiding (`TEST_NOISE`, 3,5 procent) trager dan de laatste test die meetelt, dan blijven de tempo's van die vorige test gelden totdat je antwoordt. De vraag staat in de terugblik na de test en in het logblad: "Deze test was trager dan je vorige. Telt hij mee voor je tempo's?" met "Telt mee" en "Telt niet mee". Vergeleken wordt op de beste 5 km als die er is, dus een lange run met een goed stuk erin wordt niet ten onrechte een twijfeltest.
- **Jouw oordeel.** Het antwoord staat per log in `AppSettings.testJudgments` (`{ logId, verdict: 'counts' | 'ignore', date }`), naast de logs, op dezelfde manier als de oordelen over een korte nacht. De log verandert nooit en "voltooid" is nergens een vlag. "Telt niet mee" laat de test in het Logboek staan, maar haalt hem uit de tempo's, de voorspelling en de doeltijdcontrole. Achteraf kan dat bij elke test, en "Laten meetellen" haalt het terug.
- **Eerst de getallen.** Verandert een antwoord de tempo's, dan laat de kaart eerst per tempo zien wat het nu is en wat het straks wordt, en pas na "Akkoord" wordt het bewaard. Een voorstel in de vorm van de planning (`PlanChangeProposal`) past hier niet: dat gaat over geplande sessies, en hier verandert er geen enkele sessie, alleen het tempo dat de training en het horloge lezen. Een bevestiging met de getallen is genoeg en vraagt hetzelfde: eerst zien, dan akkoord.
- **Instelling** "Twijfeltest eerst vragen" (`AppSettings.askDoubtTest`, standaard aan, in Planning). Uit betekent zoals vroeger: de laatste test telt altijd. Een test die je zelf hebt aangemerkt als "Telt niet mee" blijft eruit, want dat is een bewuste keuze en geen vraag van de app.

Opslag en back-up: `bestEffort` en `testJudgments` zijn optioneel en additief, dus het schemanummer van de back-up verandert niet. `migrateLogBestEffort` en `migrateTestJudgments` in `storage/migrations.ts` lezen ze defensief: een kapot getal of oordeel verliest alleen zichzelf, een oud bestand zonder de velden importeert als voorheen (hele log, elke test telt). Bij het terugzetten worden oordelen per log samengevoegd en wint het toestel.

## Alternatieven

- De serie bewaren op de log. Te groot voor een back-up en het loopinzicht bewaart de serie bewust ook niet.
- Bij elke weergave opnieuw ophalen. Werkt niet zonder verbinding en laat de tempo's afhangen van een verzoek.
- Een twijfeltest stil laten tellen, of stil negeren. Het eerste was het probleem; het tweede neemt een keuze over die van jou is.
- Een vlag "telt niet mee" op de log. Dat herschrijft historie; een lijst ernaast niet.
- De vraag als planningsvoorstel. Zie hierboven: er verandert geen geplande sessie.

## Bron

Een testloop van de eigenaar op 2026-10-27 en de vraag of de app alleen het gemiddelde leest. Testspreiding en Riegel: `docs/onderzoek/` (Tussendoel hardloopwedstrijd). Opzet van het oordeel: `docs/beslissingen/2026-10-25-korte-nacht-vragen.md`.

## Vervangt

Niets. Het laat de regel dat de laatste test de tempo's bepaalt los, behalve wanneer hij een twijfeltest is.

## Terugdraaien

Zet "Twijfeltest eerst vragen" uit: dan telt de laatste test weer altijd. Het veld `bestEffort` kan blijven staan; zonder dat veld te lezen telt de hele log. Een oordeel haal je weg met "Laten meetellen" in het logblad.
