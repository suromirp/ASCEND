# Geplande trainingen naar het horloge via intervals.icu

Datum: 2026-10-22
Status: aangenomen

## Besluit

ASCEND zet de geplande trainingen van de komende 7 dagen in de intervals.icu-agenda van de eigenaar, als gestructureerde workout, zodat intervals.icu ze naar Garmin Connect en het horloge stuurt. De schakelaar "Trainingen naar je horloge sturen" staat standaard uit; "Eén training testen" stuurt alleen de eerstvolgende.

## Reden

De eigenaar wil de training van vanavond op zijn pols zien, met de tempo's uit zijn testloop, zonder de app te openen. Het schrijven gaat rechtstreeks vanuit de browser met zijn eigen sleutel: geen server, geen account. De CORS-controle (OPTIONS met Origin en Access-Control-Request-Method voor POST, PUT en DELETE, 22 oktober 2026) liet alle drie toe, met de headers Authorization en Content-Type.

Gekozen werkwijze:
- Aanmaken en bijwerken met `POST /api/v1/athlete/{id}/events/bulk?upsert=true` op een eigen `external_id` (`ascend:<id van de geplande sessie>`), bijwerken met `PUT /events/{id}`, verwijderen met `PUT /events/bulk-delete`. ASCEND onthoudt per sessie wat het stuurde en welk id terugkwam (alleen op dit toestel, niet in een back-up) en raakt nooit iets aan dat daar niet in staat.
- De workout staat als tekst in `description` (de eigen workout-builder-syntaxis van intervals.icu). Alleen die route is bevestigd voor het doorsturen naar het horloge; het gestructureerde `workout_doc` gaf op het forum een leeg bestand.
- Per training hartslag of tempo, nooit door elkaar. Tempoloop en intervallen lopen op tempo als er een test is, de rest op hartslagzones (Z1 tot Z4-Z5). Stappen korter dan twee minuten en herstelstappen krijgen geen hartslagdoel.
- Niet gestuurd: kracht (staat in MacroFactor), rustdagen en de wedstrijd. De 5 km test gaat als inlopen, "5km" zonder doel en uitlopen.
- Een afgeronde of verstreken training blijft in de agenda staan naast zijn activiteit; ASCEND vergeet hem alleen.
- Draait na het ophalen bij het openen van de app en hooguit eens per 15 minuten; "Nu bijwerken" slaat die pauze over.

## Alternatieven

- Een FIT- of ZWO-bestand uploaden (`file_contents_base64`): meer code, en minder leesbaar in de agenda.
- Ook kracht als notitie sturen: een leeg krachtschema op het horloge helpt niet en de inhoud staat in MacroFactor.
- Tempo en hartslag in één workout: intervals.icu zet per workout één soort doel om, dus dat gaf onvoorspelbare resultaten.

## Bron

Forum van intervals.icu: "Uploading planned workouts to Intervals.icu", "Workout Builder Syntax Quick Guide", de draad over tempodoelen die ontbreken zonder ingesteld drempeltempo, en de OpenAPI-beschrijving op https://intervals.icu/api/v1/docs. Visierapport "Visuele upgrade en nieuwe ideeën", idee 1.

## Vervangt

Niets.

## Terugdraaien

Zet de schakelaar uit: ASCEND haalt de komende trainingen weer uit de agenda. Wil je alles weg, dan kan "Weghalen uit intervals.icu" dat ook zonder de schakelaar.
