# Run in detail: de gegevens en de rekenkern

Datum: 2026-10-27
Status: aangenomen

## Besluit

ASCEND bewaart per loop of tocht de volledige reeksen van het horloge op het toestel, in een eigen opslag (`activityStreams`, sleutel `logId`, databaseversie 9). Ze gaan standaard WEL mee in de back-up, als base64, met een schakelaar om dat uit te zetten. Uit de reeksen rekent ASCEND de kilometers en de ronden uit en zet die als afgeleid, append-only veld `SessionLog.runDetail` op de log. De route (de positie) wordt nooit bewaard. Dit is stap 1 van "Run in detail": de gegevens en de rekenkern. Het scherm komt in een volgende stap.

## Reden

De eigenaar wil dat alle informatie wordt opgehaald en gebruikt, en opslag is geen bezwaar. Een uur lopen is ongeveer 120 KB, een jaar loopjes en tochten enkele tientallen MB (`docs/onderzoek/Run in detail.md`, hoofdstuk 8).

De reeksen gaan mee in de back-up omdat intervals.icu mogelijk binnenkort Garmin-gegevens in de API blokkeert (uit ander onderzoek, "Kansen met gegevens", dat nog niet in deze tak staat). Dan zijn de bewaarde reeksen het enige exemplaar en kunnen ze na een herstel niet opnieuw worden opgehaald. Wie een kleine back-up wil, zet "Reeksen in back-up" uit; de rij laat zien hoeveel groter de back-up dan wordt. De kopieën van voor een import (`backupSnapshots`) bevatten de reeksen nooit: ze dienen alleen om een import ongedaan te maken, en elke kopie zou anders tientallen MB zijn.

Wat er wordt gedaan:

1. **Opslag.** De store `activityStreams` staat los van `sessionLogs`, zodat het laden van alle logs bij elke start even snel blijft en een reeks kan verdwijnen zonder dat een log iets verliest. Elke reeks staat als typed array met type, schaal en gatmarkering (tijd `u32`, afstand en hoogte `f32`, hartslag en cadans `u8`, snelheid, vermogen, contacttijd, balans, oscillatie, verticale ratio, staplengte en ademhaling `u16`, temperatuur en verticale snelheid `i16`) op de tijdstippen waarop het horloge ze schreef (`engine/streamPack.ts`). De upgrade van versie 8 maakt alleen de nieuwe store aan; alle bestaande stores en rijen blijven zoals ze waren (getest in `storage/databaseUpgrade.test.ts`). Een log die verdwijnt neemt zijn reeks mee, "Alles verwijderen" leegt de store.
2. **Welke reeksen.** Gevraagd worden, voor zover de activiteit ze in `stream_types` noemt: `time`, `distance`, `heartrate`, `velocity_smooth`, `altitude`, `cadence`, `latlng`, `watts`, `stance_time`, `stance_time_balance`, `vertical_oscillation`, `vertical_ratio`, `step_length`, `respiration`, `temp` en `vertical_speed`. De OpenAPI-beschrijving van intervals.icu noemt de namen van de reeksen niet; de bestaande namen komen uit de forumberichten die de adapter al gebruikte, `respiration` uit de scripts van intervals.icu zelf (`streams.get("respiration")`). `temp` en `vertical_speed` zijn de gangbare namen en niet bevestigd door de specificatie. Omdat alleen wordt gevraagd wat de activiteit zelf noemt, kost een verkeerde naam niets: de reeks ontbreekt dan. De namen (niet de waarden) van reeksen die ASCEND niet kent komen in `unknownKinds`, zodat later te zien is wat er nog meer is.
3. **Intervallen.** Per run komt er één verzoek bij: `GET /api/v1/activity/{id}/intervals` (`icu_intervals`). Bewaard worden per interval de grenzen in seconden (`start_time`, `end_time`, of de indexen via de klok), `type` (WORK of RECOVERY), `label`, `group_id` en, alleen om te vergelijken, wat de bron zelf uitrekende: afstand, bewegingstijd, snelheid, GAP, hartslag, cadans, vermogen, staplengte, stijging, ontkoppeling, ademhaling, temperatuur, zone, intensiteit, en `headwind_percent`, `tailwind_percent` en `average_wind_speed` (die laatste alleen voor supporters bij de bron). ASCEND toont zijn eigen getallen uit de reeks, zodat er één waarheid is.
4. **De route.** De positie wordt alleen tijdens het verwerken gelezen, voor de richting per kilometer. Met het uurlijkse weer van Open-Meteo (`wind_speed_10m`, nu ook `wind_direction_10m`, in hetzelfde verzoek als het weer van de dag) volgt daaruit de tegenwind op borsthoogte per kilometer (0,65 maal de wind op 10 meter). Alleen dat getal per kilometer blijft staan; de positie zit in geen enkel opgeslagen veld.
5. **Ophalen.** Bij het koppelen, op de plek waar de reeks nu al wordt opgehaald (`storage/activityDetail.ts`). Een oudere run vult zich aan als het logblad opent, één keer per log (`runDetailTried` is de vingerafdruk van de totalen, zoals `bestEffortTried`), met een grens van 25 seconden en een uitkomst die het scherm kan tonen (`ensureRunDetail`: klaar, toegevoegd, uit, geen koppeling, geen reeks, mislukt of te lang). Zijn de reeksen al bewaard maar ontbreekt `runDetail`, dan worden de kilometers lokaal opnieuw uitgerekend zonder verzoek. Een correctie bij de bron (andere totalen) maakt zowel de reeks als `runDetail` verouderd, en ze worden opnieuw gelezen.
6. **`runDetail`.** Afgeleid en append-only, zoals `detail` en `bestEffort`: toegevoegd na het maken van de log, gebonden aan de totalen waarvoor het is berekend (`wholeKm`, `wholeMinutes`), en nooit een verandering van een gemeten getal. Het bevat de kilometers (tijd, tempo, GAP vanaf 10 meter stijging of daling, hartslag gemiddeld en hoogste, cadans, staplengte, oscillatie, verticale ratio, contacttijd, balans, vermogen, ademhaling, stijging en daling, tegenwind), de ronden uit de reeks met het label van het horloge, een lijn van ongeveer 150 punten voor de grafieken, en de plek van de beste 5 km met zijn eigen vijf kilometers. Het is een paar KB per run en reist mee in de back-up. De migratie (`migrateLogRunDetail`) laat een kapot `runDetail` vallen zonder dat de log verloren gaat.
7. **De rekenkern** (`engine/runDetail.ts`, `engine/runDetailRules.ts`): kilometers uit de afstandsreeks met interpolatie op de grens, een pauze van meer dan 20 seconden telt niet mee (de grens van `bestEffort`), het woord voor de verdeling (gelijkmatig, te snel begonnen, ingezakt, sterker geëindigd) met de grenzen van het onderzoek (4, 2, 5 en 2 procent, met zwijgen onder de ruis), het advies voor de volgende test pas vanaf 10 seconden verschil en zonder belofte van een tijd, wat meespeelde (wind, benen, spierpijn, ziekte, warmte, inlopen, route, pauze), ontkoppeling alleen bij een lange of rustige run binnen de drempels van `runMetrics`, en vormfeiten zonder oordeel. De regel dat het loopinzicht na een run hoogstens twee regels geeft blijft; een test, tempoloop of interval krijgt voortaan één regel over de verdeling (`RunInsight.pacing`).
8. **Instellingen**, onder Gegevens en back-up: "Volledige reeks bewaren" (standaard aan; uit houdt alleen de samenvatting en de kilometers), "Reeksen in back-up" (standaard aan, met de grootte erbij) en "Ruimte van reeksen" (met de keuze om ze te verwijderen).

## Alternatieven

- **Reeksen buiten de back-up houden**, zoals het onderzoek voorstelde: kleiner, maar als de bron de gegevens blokkeert zijn ze na een herstel weg. Daarom omgedraaid: standaard mee, met een schakelaar.
- **Reeksen in de snapshots**: elke kopie van voor een import zou tientallen MB worden, voor niets, want een kopie hoeft alleen die ene import ongedaan te maken.
- **Reeksen als gewone lijsten getallen op de log**: elke start zou alle logs met hun reeksen laden, en een lijst getallen kost twee tot vier keer meer ruimte dan een typed array.
- **De route bewaren voor een kaart**: een spoor laat zien waar iemand woont. Niet gekozen; de tegenwind per kilometer kan zonder.
- **De kilometers van de ronden van het horloge overnemen**: intervals.icu rekent die zelf opnieuw uit de meetpunten en kan een paar seconden van Garmin Connect afwijken. ASCEND gebruikt de ronden alleen als grens en label.

## Bron

`docs/onderzoek/Run in detail.md` (hoofdstuk 8 en de regels RD-1 tot RD-11), `docs/visie/Run in detail.md` (hoofdstuk 8), `docs/onderzoek/Loopgegevens en vooruitgang.md`, het onderzoek "Kansen met gegevens" voor het risico dat de bron de gegevens blokkeert, en de OpenAPI-beschrijving van intervals.icu (`IntervalsDTO`, `Interval`). Het besluit van de eigenaar dat alle informatie wordt opgehaald en gebruikt en dat opslag geen bezwaar is.

## Vervangt

Niets. `docs/beslissingen/2026-10-22-loopinzicht.md` zei dat de reeksen niet worden bewaard; dat blijft zo voor de route en geldt niet meer voor de overige reeksen. Het profiel van 48 stukjes (`detail`) blijft zoals het is.

## Terugdraaien

"Volledige reeks bewaren" uit houdt het ophalen van nieuwe reeksen tegen, en "Reeksen verwijderen" in het blad "Ruimte van reeksen" leegt de store; de samenvatting en de kilometers op de logs blijven staan. De store zelf kan blijven bestaan zonder rijen. Een nieuwere versie van de app opent een database van versie 9 zonder verlies.
