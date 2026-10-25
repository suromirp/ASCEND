# Hartslag op het horloge: de slagen van ASCEND

Datum: 2026-10-25
Status: aangenomen

## Besluit

Bij een hartslagdoel stuurt ASCEND standaard de slagen van zijn eigen zones naar het horloge, als percentage van de drempel (of maximale hartslag) die intervals.icu zelf voor hardlopen heeft. Dat staat in de instelling "Hartslag op je horloge": "Zones van ASCEND" (het advies) of "Zones van intervals.icu" (de zonenaam, zoals het was). Een rustige of lange duurloop krijgt een ruime grens: van het begin van zone 1 tot het einde van zijn eigen zone van ASCEND (een herstelloop op intensiteit 1 blijft dus in zone 1, intensiteit 2 loopt van zone 1 tot en met zone 2). Hardlopend kom je praktisch nooit onder zone 1, dus het horloge piept alleen als je te hoog gaat. Dat is de schakelaar "Rustige loop: ruime grens", standaard aan. Een stap op intensiteit 4 loopt van het begin van zone 4 tot de maximale hartslag van ASCEND, of tot 110 procent van de drempel als die niet bekend is.

Dit vult het besluit "Geplande trainingen naar het horloge via intervals.icu" aan en laat dat zoals het is.

Daarbij zijn de zones van ASCEND gelijkgetrokken met het horloge: Garmin Standaard op basis van %LDHS, zoals het horloge van de eigenaar het toont (oktober 2026): zone 1 66 tot 81, zone 2 81 tot 89, zone 3 89 tot 96, zone 4 96 tot 101 procent van de drempel. Met drempel 178 is zone 2 dan 144 tot 158 slagen, precies wat Garmin toont. De oude indeling (65-80, 80-89, 89-95, 95-102) week een slag of twee af.

## Reden

De waarneming: zone 2 stond op het horloge als 158 tot 167 slagen, tegen 143 tot 159 in ASCEND (drempel 179, de oude indeling; met de nieuwe indeling en drempel 178 is het 144 tot 158, gelijk aan Garmin). intervals.icu rekende de zonenaam om met zijn eigen drempel en indeling. Rustige en lange lopen werden zo op zone 3 van ASCEND gestuurd, terwijl ASCEND ze achteraf met zijn eigen zones beoordeelt (Tempo bij zone 2, loopinzicht, hartslagteken). De eigenaar koos: ASCEND bepaalt de slagen.

Hoe: de workout-tekst van intervals.icu kent geen losse slagen, wel een percentage van de drempel ("75-85% LTHR") of van de maximale hartslag ("70-80% HR"). ASCEND leest de drempel en de maximale hartslag voor hardlopen uit de sport settings van de atleet (GET /api/v1/athlete/{id}/sport-settings, velden `lthr`, `max_hr` en `types`), met één verzoek met een grens van 15 seconden. Per stap is het percentage de slagen van ASCEND gedeeld door die drempel, afgerond op hele procenten, zo dat de uitkomst hoogstens 1 slag afwijkt. Die grens gaat ervan uit dat intervals.icu de slagen zelf op hele slagen afrondt. Lukt het percentage niet binnen die grens, dan krijgt alleen die stap de zonenaam; dat kan dus per stap verschillen. Dat geldt alleen voor hardlopen, want de zones van ASCEND zijn hardloopzones.

Verandert de drempel in ASCEND of in intervals.icu, of de instelling, dan verandert de tekst en dus de vingerafdruk; de volgende synchronisatie werkt het horloge bij. Een mislukte lezing houdt de laatst bekende drempel aan. Is er nooit een drempel gelezen, of heeft ASCEND er zelf geen, dan blijft het de zonenaam en zegt de rij in Instellingen waarom. Wijkt de drempel van intervals.icu meer dan 3 slagen af van die in ASCEND, dan toont de rij dat als regel, zonder melding of voorstel.

## Alternatieven

- Losse slagen in de tekst: niet bevestigd in de syntaxis.
- Decimalen in het percentage: nergens bevestigd, dus alleen hele procenten met een controle op 1 slag.
- De drempel van intervals.icu in ASCEND overnemen: dat verandert wat ASCEND van je zones vindt, en hoort bij een eigen keuze van de eigenaar.

## Bron

Forum van intervals.icu, draad "Workout Builder Syntax Quick Guide" (hartslagdoelen: "70% HR", "90-95% LTHR", "Z2 HR") en de OpenAPI-beschrijving op https://intervals.icu/api/v1/docs (SportSettings). Waarneming van de eigenaar op het horloge. Het echte gedrag van intervals.icu en Garmin is niet in een test te zien.

## Vervangt

Niets. Vult "2026-10-22-trainingen-naar-horloge" aan.

## Terugdraaien

Kies "Zones van intervals.icu": de tekst gaat terug naar de zonenaam en het horloge wordt bij de volgende synchronisatie bijgewerkt.
