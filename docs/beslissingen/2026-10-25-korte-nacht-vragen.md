# Vragen bij een korte nacht

Datum: 2026-10-25
Status: aangenomen

## Besluit

Zag het horloge minder dan 4 uur slaap, of minder dan de helft van je eigen gemiddelde (vanaf 7 dagen), dan geeft de ochtendcheck geen let op en vult hij geen slaapantwoord vooraf in, maar vraagt hij: "Je horloge zag maar 3 u 10 slaap. Klopt dat?" met "Klopt" en "Niet goed gemeten". Het oordeel wordt per datum bewaard in `AppSettings.nightJudgments`; de getallen van Garmin en intervals.icu blijven zoals ze zijn. Het is instelbaar: "Vragen bij een korte nacht" (standaard aan).

## Reden

Gaat het horloge 's nachts van de pols, dan meet Garmin een deel van de nacht en zegt dat er niet bij. ASCEND dacht dan dat je slecht sliep: een let op, "slecht" vooraf ingevuld, en die korte nacht drukte vier weken je eigen gemiddelde. Alleen jij weet of het horloge klopte.

## Alternatieven

Een vlag op `MorningCheckIn`: de vraag komt voordat de check-in bestaat, dus het oordeel zou nergens kunnen staan. Daarom een eigen lijst in de instellingen, zoals `morningCheckIns`, zodat hij mee gaat in de back-up. Geen schema-nummer erbij: het veld is optioneel en wordt bij het importeren per record gelezen (`migrateNightJudgments`). Een back-up zonder het veld importeert als voorheen en laat de oordelen op het toestel staan. Een herstel voegt samen per datum, het oordeel van het toestel wint.

## Bron

Gesprek met de eigenaar (horloge ging 's nachts van de pols). Regels in `engine/shortNight.ts`.

## Vervangt

Niets.

## Terugdraaien

Zet "Vragen bij een korte nacht" uit: alles werkt dan als voorheen. Per ochtend haalt "Ongedaan maken" het oordeel weg. Het veld `nightJudgments` mag blijven staan, het wordt dan niet gebruikt.

Wat "Niet goed gemeten" doet: geen slaapregel als let op en geen voorstel voor die nacht; slaapduur, slaapscore en HRV van die nacht tellen niet mee in de eigen gemiddelden van de dagen erna (rusthartslag wel). Een eigen schatting (5 tot 9 uur) geldt als je slaap voor het voorstel, met als bron "zelf ingevuld"; bij "Weet ik niet" is er geen voorstel.

## Aanvulling (review van Warden)

Een oordeel bewaart de gemeten minuten (`NightJudgment.minutes`) en geldt alleen zolang de gemeten slaap van die datum gelijk is. Komt de rest van de nacht later binnen, dan vervalt het oordeel en volgt de vraag opnieuw als de nacht nog twijfelachtig is; een nacht die niet meer twijfelachtig is telt gewoon mee. Een oud oordeel zonder minuten geldt als voorheen. Dit geldt voor "Klopt" en voor "Niet goed gemeten".

Een oordeel kan alleen op de ochtend zelf. Een nacht die je niet beoordeelde, telt gewoon mee in je gemiddelden.

Een herstel uit een back-up brengt een oordeel terug dat je op dit toestel ongedaan maakte (dezelfde werkwijze als `weightEntries`: de vereniging per datum, het oordeel van het toestel wint), en de lijst wordt afgekapt op de nieuwste 120.

Is de ochtendcheck al opgeslagen met een slaapantwoord dat alleen uit het voorstel kwam (`MorningCheckIn.sleepSuggested`), dan gaat dat antwoord mee met je oordeel: een eigen schatting geeft het antwoord van die schatting, "Weet ik niet" of "Ongedaan maken" haalt het weg. Wat je zelf koos blijft staan. Een nacht die niet goed gemeten is, laat de gemeten slaap ook op de kaart weg; staan er getallen van het horloge naast een eigen schatting, dan zegt het kopje "horloge en zelf".
