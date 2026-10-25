# Intensiteit op Je stand telt wat je echt liep

Datum: 2026-10-25
Status: aangenomen

## Besluit

De kaart Intensiteit op Je stand telt minuten in plaats van trainingen, en telt ze naar de hartslag uit het profiel op de log: rustig is zone 1 en 2, middel zone 3, hard zone 4 en hoger. Een training zonder genoeg hartslag (minder dan 80% van de tijd) of zonder drempel en maximum telt naar zijn bedoeling. Kracht en herstel blijven erbuiten.

## Reden

Garmin telde een rustige duurloop op 162 slagen als stevig, en ASCEND telde dezelfde loop als rustig, omdat hij zo gepland was. Het onderzoek naar ongeveer 80% rustig gaat over echte minuten. De kaart zegt nu in één regel hoeveel uit de hartslag komt en hoeveel naar plan ("Uit je hartslag, 3 trainingen naar plan"). Een rustig bedoelde loop met duidelijk meer dan de helft van de tijd boven zone 2 blijft gemeld worden.

## Alternatieven

Naar het plan blijven tellen: simpel, maar het zegt niet wat er gebeurde. Dat blijft kiesbaar als instelling "Intensiteit tellen" ("Naar je hartslag" is de standaard, "Naar het plan" geeft precies het oude gedrag: tellen per training, met het aandeel trainingen en de oude kaarttekst met aantallen). Per sample tellen: het profiel bewaart maar 48 stukjes, en gemiddelden per stuk zijn voor deze kaart genoeg.

## Bron

`docs/onderzoek/Trainingsopbouw voor GR5 en hardlopen.md` en de notities daarbij (ongeveer 80% rustig, Seiler). De zones volgen `docs/beslissingen/2026-10-25-hartslag-op-het-horloge.md`.

## Vervangt

Niets. "Naar je hartslag" telt in minuten, "Naar het plan" per training. De opslag verandert niet: `AppSettings.intensityCounting` is optioneel en wordt defensief gelezen.

## Terugdraaien

Zet "Intensiteit tellen" op "Naar het plan".
