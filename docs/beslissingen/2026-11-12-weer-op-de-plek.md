# Het weer-vak van de Briefing volgt de gekozen plek

Datum: 2026-11-12
Status: aangenomen

## Besluit

Kies je in de Briefing bij Start bij een bewaarde of gezochte plek die verder dan 10 km van huis ligt, dan toont de rij Weer de voorspelling van die plek, met de naam ervoor ("In <plek>: 2 graden, ..."). De regel over drinken in dezelfde Briefing leest dezelfde voorspelling. Vandaag, de pagina Weer en De avond ervoor blijven het weer van huis tonen. De instelling heet Weer van de gekozen plek en staat aan.

## Reden

De eigenaar besloot op 11 november dat de Briefing het weer bij de plek toont als die verder dan 10 km van huis ligt (`2026-11-11-plekken-antwoorden.md`, punt 5). De grens stond al in `engine/places.ts#weatherAtPlace`, maar niets gebruikte hem: wie een plek op een uur rijden koos, las het weer van zijn eigen straat.

## Keuzes van de bouwer

- De gekozen plek is de chip van Start bij. Die keuze geldt voor deze training en wordt niet bewaard (besluit `2026-11-11-route-start.md`). De avond ervoor op Vandaag kent die keuze dus niet en blijft het weer van huis tonen. De Briefing van een training van morgen volgt de plek wel, met de dag van morgen uit de voorspelling van de plek.
- Huis is twee dingen: de plek Thuis en de plaats waarvoor het weer geldt (je plaats in Weer en kleding, of je locatie als het weer die volgt). Ligt de plek verder dan 10 km van een van beide, dan volgt het vak de plek. Zo klopt het ook als je op reis bent en een plek bij Thuis kiest. Zonder Thuis telt alleen de plaats van het weer. Zonder beide is er geen weer van huis en telt elke plek met coördinaten.
- Alleen een bewaarde of gezochte plek telt. Een getikt punt op de kaart (Start hier) heeft geen naam en volgt het weer niet. Waar je nu bent ook niet: daar volgt het weer van huis je locatie al.
- De plek gaat afgerond op twee decimalen naar Open-Meteo, net als de plaats van het weer van huis. Dat is dezelfde dienst die je plaats al krijgt; er komt geen nieuwe dienst bij.
- De tweede voorspelling heeft een eigen meta-sleutel (`placeWeatherForecast`) met de regels van het weer van huis: hoogstens eens per uur voor dezelfde plek, de grens van 15 seconden, twee vragers delen één aanroep. Hij staat niet in de back-up. Het weer van huis wordt niet aangeraakt.
- Zolang de voorspelling van de plek laadt staat het weer van huis er, zonder plaatsnaam. Mislukt hij (netwerk, time-out, storing), dan blijft het weer van huis staan met erachter "Weer in <plek> laadde niet. Dit is thuis." Is er ook geen weer van huis, dan staat er alleen "Weer in <plek> laadde niet." Nooit een leeg vak.
- De naam staat in de regel en niet in het vaste woord links: dat is 88 px breed en een plaatsnaam past daar niet op 360 px.
- De rij opent nog steeds de pagina Weer, en die toont thuis. Dat is zo gevraagd, maar het is een naad: je tikt op het weer van de plek en ziet het weer van huis.
- Een verouderde voorspelling van de plek (ouder dan een uur, en verversen mislukt) wordt niet getoond: dan liever thuis met de eerlijke regel dan een oud getal dat als nieuw oogt.

## Alternatieven

- De keuze van de plek bewaren zodat De avond ervoor hem ook leest. Niet gedaan: dat verandert het besluit dat een tik op een chip alleen voor deze training geldt, en vraagt een opgeslagen vorm.
- Het weer van huis vervangen door dat van de plek in de gedeelde opslag. Niet gedaan: dan zouden Vandaag en de pagina Weer meeschuiven.
- Alleen de afstand tot Thuis tellen. Niet gedaan: op reis ligt de plaats van het weer ver van Thuis, en dan zou een plek bij Thuis het weer van je vakantieadres krijgen.

## Bron

`docs/beslissingen/2026-11-11-plekken-antwoorden.md` (punt 5), `docs/visie/Ontwerp Plekken en routes.md` (Weer bij je plek), de opdracht van de coördinator van 12 november.

## Vervangt

Niets.

## Terugdraaien

Zet de instelling Weer van de gekozen plek uit: dan leest de rij Weer altijd het weer van huis. In code: haal `placeWeatherTarget` uit `TrainingBriefing.tsx`; de sleutel `placeWeatherForecast` is een cache en mag blijven staan of weg.
