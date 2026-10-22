# Wat ASCEND van je horloge gebruikt

Datum: 2026-10-22
Status: aangenomen

## Besluit

Op het koppelscherm staat één kaart, "Wat ASCEND van je horloge gebruikt", met per soort een schakelaar: trainingen, vanzelf afvinken, slaap, rusthartslag, HRV en (alleen met een koppeling) trainingen naar je horloge sturen. De twee bestaande schakelaars (vanzelf afvinken en trainingen naar je horloge) staan nu alleen daar, niet meer dubbel. Standaard staat alles aan, behalve trainingen naar je horloge, die blijft standaard uit. Onder de schakelaars staat dat gewicht nooit uit Garmin komt.

Wat uit staat wordt niet opgehaald of niet getoond, en niet gebruikt in de ochtendcheck en de berekeningen. Het is een voorkeur van dit toestel: ze staat bij de koppeling (`storage/externalActivities.ts`, het veld `use` naast `autoTick`) en gaat niet mee in een back-up, net als de bestaande schakelaars.

## Reden

De gebruiker wil per soort bepalen wat ASCEND van zijn horloge mag gebruiken. Een schakelaar die iets uitzet moet ook echt iets uitzetten: niet alleen verbergen, maar niet ophalen en niet laten meetellen.

Wat er dan precies gebeurt:

Trainingen uit: de activiteiten worden niet meer opgehaald, de al opgehaalde verdwijnen van de telefoon, de kaart Van je horloge op Vandaag en de vraag "Hoe ging het?" van een eerder afgevinkte training blijven weg, en vanzelf afvinken doet niets. De schakelaar Vanzelf afvinken blijft zichtbaar maar zegt dat hij alleen werkt met Trainingen aan.

Slaap, rusthartslag of HRV uit: die velden worden bij het ophalen weggelaten, uit wat al is opgeslagen gehaald (`storage/wellness.ts#pruneWellness`, alleen de records van intervals.icu) en in de ochtendcheck genegeerd (`engine/watchUse.ts#filterRecovery`). Zijn alle drie uit, dan wordt wellness niet eens meer gevraagd. Zet je een soort weer aan, dan haalt ASCEND het meteen opnieuw op. Eigen invoer van de gebruiker blijft altijd staan.

Alles uit: op de achtergrond vraagt ASCEND niets aan intervals.icu. Alleen "Verbinding testen" stelt nog één kleine vraag, om te kijken of de sleutel werkt; het antwoord wordt weggegooid.

Rusthartslag en HRV zijn een hint en geen oordeel (zie `docs/beslissingen/2026-10-22-ochtendcheck-uit-horloge.md`); met de schakelaars bepaalt de gebruiker zelf of hij die hint wil.

## Alternatieven

Eén schakelaar voor alle gezondheidsgegevens: te grof, want de gebruiker wil bijvoorbeeld HRV wel negeren en slaap houden. Alleen verbergen en wel ophalen: dan zou het "niet gebruikt" niet waar zijn en blijft er data staan die de gebruiker niet wil. De voorkeur in de instellingen zetten en dus in de back-up: de koppeling zelf gaat ook niet mee, en een voorkeur voor één telefoon hoort niet op een andere terecht te komen.

## Bron

Gesprek met de eigenaar (22 oktober 2026). `docs/beslissingen/2026-10-22-vanzelf-afvinken.md`, `docs/beslissingen/2026-10-22-trainingen-naar-horloge.md` en `docs/beslissingen/2026-10-22-ochtendcheck-uit-horloge.md`.

## Vervangt

Niets. De schakelaars Vanzelf afvinken en Trainingen naar je horloge sturen verhuizen naar de nieuwe kaart; hun werking en standaardwaarden blijven zoals in die besluiten staan.

## Terugdraaien

Zet de schakelaars weer aan: de volgende keer ophalen (of meteen, bij het aanzetten) komt alles terug. Een oudere telefoon zonder de voorkeur leest alles als aan.
