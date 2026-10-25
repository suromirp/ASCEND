# Vetpercentage uit MacroFactor

Datum: 2026-10-25
Status: aangenomen

## Besluit

ASCEND leest in de MacroFactor-export de kolom "Fat Percent" mee, per datum naast het gewicht, en toont onder het lichaamsgewicht (Instellingen, Lichaam, Lichaamsgewicht) het vetpercentage als trend, met de vetvrije massa. Een schakelaar "Vetpercentage tonen" in de groep Lichaam zet het uit; hij staat aan zodra er metingen met een vetpercentage zijn.

## Reden

De weegschaal van de eigenaar geeft gewicht en vetpercentage door aan Health Connect, MacroFactor neemt dat over en zet het in het blad "Scale Weight" met de kolommen "Date", "Weight (kg)" en "Fat Percent". ASCEND las alleen het gewicht. De eigenaar vindt vooral het vetpercentage interessant, en het komt zonder handwerk binnen via de export die er al wordt ingelezen.

Hoe de import het leest. Dezelfde kolomherkenning op naam als bij het gewicht (`engine/macrofactorWeight.ts`): Fat Percent, Body Fat en "Vetpercentage", ook met een procentteken of een decimale komma. Alleen een waarde van 3 tot en met 60 telt; een lege cel, tekst, nul of een onzinnig getal geeft die dag geen vetpercentage, en de rij blijft gewoon een gewichtsrij. Een export zonder de kolom of met een lege kolom werkt zoals voorheen. Het percentage staat op `WeightEntry.fatPct`, naast `kg`, `basis` en `scaleKg`; het hoort bij de weging van die dag.

Vult aan, verandert niets. Een dag die al uit MacroFactor kwam krijgt het percentage erbij; een eigen meting zonder percentage krijgt het ook, met het gewicht van jezelf ongemoeid (ook als dat gewicht afwijkt, dan blijft het wel een keuze zoals al beschreven in het besluit over gewicht). Een nieuwe export zonder de kolom wist een bewaard percentage niet. Hetzelfde bestand twee keer inlezen verandert niets.

De trend. Het gemiddelde van de laatste 7 metingen (binnen 4 weken) tegenover het gemiddelde van de 7 metingen tot en met 4 weken voor de nieuwste meting, met minstens 2 metingen daar; anders zegt het scherm eerlijk dat er nog geen vergelijking is ("Vet 18,4%, 0,6 lager dan 4 weken terug"). De vetvrije massa is het gewicht van die weging maal (1 min het vetpercentage), met dezelfde vergelijking, omdat die voor kracht en de GR5 meer zegt dan het percentage: je kunt lichter worden en je spieren houden. Het rekenwerk staat in `engine/bodyFat.ts`, met tests. Er is geen grafiek: op deze plek staat geen gewichtsgrafiek waar hij bij past.

Eerlijk over de meting. Een weegschaal schat vet met een zwak stroompje (bio-impedantie). Het schommelt met vocht, eten en het tijdstip, en het getal zelf kan een paar procentpunten naast de werkelijkheid zitten; de richting over weken is bruikbaar als je onder dezelfde omstandigheden weegt, bijvoorbeeld in de ochtend en nuchter. Dat staat achter een InfoButton (`vetpercentage` in `data/settingsHelp.ts`), niet als lange tekst op de pagina. In `docs/onderzoek/` staat hier niets over behalve dat sommige weegschalen alleen vet meten met een handgreep of blote voeten; de uitleg is daarom algemeen en voorzichtig gehouden.

Opslag en back-up. `AppSettings.weightEntries` bleef de plek; `fatPct` is optioneel en alleen toegevoegd, de schakelaar is `AppSettings.showBodyFat` (afwezig is aan). Het backupschema blijft op 2: een oudere back-up leest als voorheen. `storage/migrations.ts#migrateWeightEntries` laat een onmogelijk percentage vallen en telt dat, maar houdt de weging; een kapotte schakelaar valt weg. Bij een herstel van instellingen wint de meting op het apparaat, maar een percentage dat alleen de back-up heeft wordt eraan toegevoegd.

## Alternatieven

Een eigen lijst voor lichaamssamenstelling naast `weightEntries`: dubbel werk voor dezelfde dag en dezelfde bron. `BodyMetric.bodyFatPct` uit `models/metrics.ts` gebruiken: dat model wordt nergens bewaard of gelezen, en het gewicht staat al in `WeightEntry`. Een nieuwe schemastap voor de back-up: niet nodig voor een optioneel veld, de bestaande controle bij het importeren is de migratie. Één meting tonen in plaats van een gemiddelde: schommelt te veel om iets te zeggen. Het percentage in Vandaag zetten: past niet bij de vraag "wat is mijn missie vandaag".

## Bron

Gesprek met de eigenaar (25 oktober 2026). `docs/beslissingen/2026-10-22-gewicht-uit-macrofactor.md` en `docs/onderzoek/Horloge, server en weegschaal.md`. De bladnaam en de kolommen zijn gezien in een echte export van de eigenaar, die niet in de repo staat; de tests gebruiken nagemaakte bestanden.

## Vervangt

Niets. Het besluit over het gewicht uit MacroFactor blijft gelden; dit voegt een kolom toe.

## Terugdraaien

Zet "Vetpercentage tonen" uit: het blijft bewaard maar wordt niet getoond. Het veld uit de code halen kan zonder schadelijke gevolgen: oudere versies negeren `fatPct`.
