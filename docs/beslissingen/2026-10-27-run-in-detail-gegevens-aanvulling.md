# Run in detail, de gegevens: aanvulling na de review

Datum: 2026-10-27
Status: aangenomen

## Besluit

Dit vult `2026-10-27-run-in-detail-gegevens.md` aan en laat het zoals het is. Drie dingen zijn erbij gekomen of scherper gesteld.

1. **De regel over de verdeling van het tempo staat in beeld.** De ene zin die een test, een tempoloop en een intervaltraining krijgen (`RunInsight.pacing`) staat op de kaart na de run, onder het kopje "Verdeling", op de plek van "Let op" en na "Beter". Er blijven hoogstens twee rijen. De zin heeft geen blad "Waarom", want hij rekent met de kilometers van de run zelf en vergelijkt niets. Een run met alleen deze zin laat de kaart ook zien, ook als hij geen profiel van 48 stukjes heeft.
2. **De uitkomst van het ophalen is te zien.** Vindt het logblad bij het openen van een loop of tocht geen reeks, lukt het ophalen niet of duurt het te lang, dan staat er bovenaan de gegevens één stille regel met de reden. Bij alle andere uitkomsten zegt het blad niets. Voor krachttraining, fietsen en al het andere dan lopen en wandelen wordt niets opgehaald: alleen hardlopen telt als run, wandelen, tochten en bergtochten als tocht. Een bron die geen reeks geeft, of een reeks die niet te bewaren is, wordt voor dezelfde totalen niet opnieuw gevraagd (`runDetailTried`, ook voor het profiel en de reeksen); een correctie bij de bron probeert het opnieuw.
3. **Een import schrijft geen reeksen als je ze niet bewaart.** Staat "Volledige reeks bewaren" uit zoals het na de import is, dan blijven de reeksen uit het bestand weg. De kilometers op de logs komen wel mee.

## Reden

Zonder het eerste bestond een stuk van de rekenkern wel maar zag niemand het. Zonder het tweede bleef een mislukte poging onzichtbaar en haalde de app bij elke opening opnieuw iets op wat er niet was. Zonder het derde deed de schakelaar bij een herstel het tegenovergestelde van wat hij belooft.

## Alternatieven

- De zin over de verdeling in een eigen kaart: een tweede kaart na elke run is te veel, en de regel dat het inzicht hoogstens twee rijen geeft blijft zo staan.
- De uitkomst in een melding: een melding is voor wat je moet weten of doen, en dit is alleen een reden.

## Bron

Review van Warden op "Run in detail, stap 1" en `docs/beslissingen/2026-10-27-run-in-detail-gegevens.md`.

## Vervangt

Niets.

## Terugdraaien

De rij en de regel in het logblad zijn alleen weergave en kunnen zonder verlies weg. Het overslaan van reeksen bij een import is terug te draaien door de schakelaar aan te zetten en de back-up opnieuw te importeren.
