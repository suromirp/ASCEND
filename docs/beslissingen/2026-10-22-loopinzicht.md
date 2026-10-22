# Loopinzicht

Datum: 2026-10-22
Status: aangenomen

## Besluit

ASCEND haalt van elke opgeslagen loop en tocht uit het horloge (via intervals.icu) de reeksen op, maakt er in `engine/` een compact profiel van 48 stukjes en de klim- en dalstukken van, en bewaart alleen dat profiel als optioneel, merkloos veld `detail` op de log. Op dat profiel rekent de app vergelijkingen met je eigen eerdere trainingen van dezelfde soort. Na een loop of tocht staan er hooguit twee regels ("Beter" en "Let op") met een blad "Waarom" erachter. Op Je stand komt de sectie "Lopen" met vier rijen. Het ontwerp en de bewijsgraad staan in `docs/onderzoek/Loopgegevens en vooruitgang.md`; dit besluit legt vast wat is gebouwd en waar het afwijkt.

De antwoorden van de eigenaar op de open vragen:

1. De woorden zijn Beter, Normaal, Slechter, dezelfde als bij het gevoel.
2. ASCEND haalt per loop of tocht de reeks op, standaard aan, instelbaar (schakelaar "Details van loopjes en tochten" bij Garmin koppelen). De eigenaar zei: haal zoveel mogelijk data op als je wilt, het moet bruikbare data zijn. Daarom vraagt ASCEND alle reeksen die het onderzoek nuttig noemt: tijd, afstand, hartslag, tempo, hoogte, cadans, de eerste plaats van het spoor (alleen voor het weer) en de loopdynamica (grondcontacttijd, balans, verticale oscillatie, verticale ratio, pasafstand). Het vermogen en de temperatuur van het horloge worden niet gevraagd: een Forerunner geeft geen loopvermogen, en de temperatuur op de pols of borst is warmer dan de lucht en dus geen weer.
3. Hij draagt de borstband altijd bij duursport, heuvels en hardlopen: de instelling "Mijn hartslag komt van de borstband" staat standaard aan.
4. Bij dalen eerst alleen feiten, geen oordeel.
5. De kaart "Tempo bij zone 2" verhuist van Ascend naar Je stand, in de sectie Lopen.
6. Een tempotest komt later, niet nu.

Hij wil het kort en makkelijk zichtbaar; wie meer wil weten tikt door naar het waarom, met achtergrond.

## Wat is gebouwd

Alles wat rekent staat in `engine/` als pure functie. Alles wat de namen van intervals.icu kent staat in `integrations/intervalsIcu.ts`; nergens in een veldnaam staat een merk of leverancier, alleen `source` zoals altijd.

- Stap 1: de negen gemiddelden van de loopdynamica en `stream_types` worden meegelezen op de generieke `ExternalActivity` (`dynamics`, `streamsAvailable`). De horlogekaart toont één feit over de loopvorm. Geen extra verzoek.
- Stap 3: `models/activityDetail.ts`, `engine/activityDetail.ts` (pauzes eruit, hartslaggaten tot 5 seconden opgevuld, hoogte gladgestreken met een marge van 5 meter, klim- en dalstukken vanaf 50 meter en 4 minuten, onderbroken door hoogstens 10 meter tegenbeweging, eigen hoogtewinst naast die van de bron), het ene extra verzoek naar de streams (`fetchIntervalsStreams`), `storage/activityDetail.ts` (na het opslaan op de achtergrond, een log tegelijk, nooit in de weg van het opslaan), de schakelaar `details`, `SessionLog.detail`, de migratie `migrateActivityDetail` en `migrateLogDetail`, en de test dat een log met profiel in een back-up reist.
- Stap 4: `engine/runMetrics.ts` en `engine/runComparison.ts` met de poort van hoofdstuk 2 van het onderzoek.
- Stap 5: `engine/runInsight.ts`, de tweede kaart in `CompletionMoment` en het blad "Waarom".
- Stap 6: de sectie "Lopen" op Je stand. De efficiëntierij leest dezelfde `aerobicTrend` als de verhuisde kaart "Tempo bij zone 2"; er komt geen tweede voortgangsgetal naast het GR5-percentage (`2026-10-22-gr5-voortgang-een-percentage.md`).

Het weer van die dag wordt bij het ophalen van het profiel opgezocht bij Open-Meteo (`past_days`, `forecast`-eindpunt), op de eerste plaats van het spoor of anders je thuisplaats, afgerond op twee decimalen (ongeveer een kilometer). Het spoor zelf wordt nooit bewaard. Zonder plaats of zonder weer vergelijkt de app gewoon zonder; hij verzint niets.

## Afwijking van back-upschema 5

Het back-upschema blijft 5. Een log reist hele mee, net als bij `manualMeasured` (`2026-10-22-garmin-is-leidend.md`), en `detail` is afgeleid en op te halen uit het horloge. Een oudere app die het veld niet kent verliest dus niets wat niet terug te halen is. Dat is een bewuste afwijking van de gedachte achter back-upschema 5 ("een oudere app moet zeggen werk de app bij"), die voor de vrije dagen, vakanties en tochten wel nodig was, omdat die niet terug te halen zijn. De migratie laat een geldig profiel staan en laat een beschadigd profiel als geheel vallen, zonder de rest van de log aan te raken: een vergelijking op half gerepareerde getallen is slechter dan geen vergelijking. Een log zonder het veld blijft zoals hij was. De instellingen van het loopinzicht (`AppSettings.runInsight`) reizen mee met de instellingen; alleen geldige sleutels blijven staan. De schakelaar `details` is een voorkeur van dit toestel en gaat net als de andere horlogeschakelaars niet mee.

De uitzondering op "historie nooit herschrijven": `detail` wordt na het maken van de log toegevoegd aan een log die er nog geen heeft, en alleen dat veld. Er verandert niets aan wat je invulde of wat het horloge mat. Het hoort bij de trainingstijd en het horloge, en blijft bij "Garmin is leidend" en bij terugzetten staan.

## Reden

Alles wat je na een training wilt zien is te berekenen uit de streams, niet uit de gemiddelden op de activiteit, want `decoupling` en `icu_efficiency_factor` leunen waarschijnlijk op vermogen dat een Forerunner 255 niet levert. De waarheid blijft bij het eigen rekenen met de zones van ASCEND, zodat er geen twee waarheden naast elkaar staan. Een enkele loop schommelt zelf zo'n 3 procent en een echte verbetering is ongeveer 1 tot 2 procent per maand, dus de app oordeelt na een enkele loop alleen bij een groot verschil en zegt anders "Gelijk aan je laatste loopjes" of "Niet te vergelijken" met de reden.

## Alternatieven

Back-upschema 6: afgewezen, zie hierboven. De ruwe reeksen bewaren: honderden KB per loop en een gps-spoor, dat ASCEND niet wil bewaren. Rekenen met `decoupling` en `icu_efficiency_factor` van intervals.icu: onzeker waar ze op leunen. Een vierde en vijfde regel in de bestaande kaart van `CompletionMoment`: dat haalt de rust weg die de kaart nu heeft, dus een tweede kaart. Aanvullen van bestaande logs met een profiel: een aparte stap, alleen na een tik (`2026-10-22-lege-velden-aanvullen.md`), nu niet gebouwd. De drempel en de omrekening in `aerobicTrend` (7 seconden per km, hartslagreserve) blijven ook een aparte beslissing.

## Bron

`docs/onderzoek/Loopgegevens en vooruitgang.md`, het gesprek met de eigenaar van 22 oktober 2026 (de zes antwoorden hierboven en de opmerking over de hoeveelheid data), en `docs/beslissingen/2026-10-22-wat-ascend-van-je-horloge-gebruikt.md`.

## Vervangt

Niets. De kaart "Tempo bij zone 2" verhuist van Ascend naar Je stand; haar rekenwerk (`engine/aerobicTrend.ts`) blijft zoals het was.

## Terugdraaien

Zet "Details van loopjes en tochten" uit: er wordt niets meer opgehaald, getoond of meegeteld, en de profielen die al op een log staan tellen niet meer mee. De profielen zijn weg te halen zonder dat een log iets verliest, omdat ze uit het horloge terug te halen zijn.
