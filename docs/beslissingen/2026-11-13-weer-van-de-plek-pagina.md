# De pagina Weer toont de plek uit de Briefing

Datum: 2026-11-13
Status: aangenomen

## Besluit

Tik je in de Briefing op de rij Weer terwijl die het weer van een gekozen plek volgt, dan krijgt de pagina Weer die plek, de training en de dag mee. De kaart bovenaan toont dan die training met het weer van die plek en noemt de plek bij naam: "Weer in <plek>, de plek uit je Briefing." Zonder gekozen plek, of als wat meekomt niet klopt, toont de pagina het weer van thuis, zoals altijd.

## Reden

Pathfinder vond op 12 november een naad: je tikt op het weer van de plek en ziet het weer van huis, zonder dat de pagina zegt welke van de twee je ziet. De plek meegeven kon netjes, dus de terugvaloptie (één regel die naar de Briefing verwijst) was niet nodig.

## Keuzes van de bouwer

- De plek reist in de stap van de router (`navigate('/weer', { state })`), niet in het adres en niet in de opslag. De keuze van een plek geldt voor deze training en wordt niet bewaard (besluit `2026-11-11-route-start.md`); een adres met coördinaten zou in de laatst bezochte route en in een gedeelde link kunnen blijven hangen. HashRouter blijft.
- Wat meegaat is het doel van het weer-vak zelf (`placeWeatherTarget`): dezelfde regels als de rij. Dus alleen een bewaarde of gezochte plek verder dan 10 km van huis, met de instelling Weer van de gekozen plek aan en een route op de kaart. Er komt geen nieuwe instelling bij: de bestaande instelling regelt beide.
- De training en de dag gaan mee, omdat de rij het weer bij deze training toont. De pagina toont dus dezelfde training als de Briefing, ook als dat niet je eerstvolgende buitentraining is.
- Alles wat niet klopt is thuis, zonder fout: niets meegegeven, een kapotte vorm, coördinaten die geen plek zijn, een training die niet meer bestaat, of een dag die voorbij is. De stap van de browser kan dagen blijven staan; daarom vervalt hij na de dag van de training.
- De pagina haalt de voorspelling op met dezelfde functie en dezelfde cache als de Briefing (`loadPlaceWeather`, hoogstens eens per uur, grens 15 seconden). Kom je uit de Briefing, dan is hij er bijna altijd al en gaat er geen aanroep uit. Er komt geen nieuwe dienst bij en de plek gaat nog steeds op twee decimalen.
- Tijdens het laden staat er "Weer in <plek> wordt opgehaald." en geen getallen. De Briefing toont dan het weer van thuis; op deze pagina zouden die getallen even later verspringen onder een kop die de plek belooft.
- Mislukt het, dan staat er "Weer in <plek> laadde niet. Dit is het weer van thuis." boven het weer van thuis. Zonder weer van thuis alleen het eerste deel.
- Een plek zonder naam heet "je plek": "Weer op je plek uit de Briefing."
- De kaart Je plaats eronder blijft thuis en blijft zo heten. Daar kies je de plaats voor het weer van huis; de plek uit de Briefing verandert die niet.
- De regel over de plek staat in de gewone tekstkleur als het weer van de plek er staat en gedimd bij laden of mislukken. Geen nieuw token, geen tweede accent.
- Het vak "nog geen plaats" in de Briefing (ook naar de pagina Weer) geeft niets mee: daar is nog geen weer.

## Alternatieven

- Eén regel op de pagina die zegt dat de Briefing het weer van de plek toont. Niet nodig: meegeven kon netjes.
- De plek in het adres (`/weer?plek=...`). Niet gedaan: coördinaten in een adres dat bewaard en gedeeld kan worden.
- De gekozen plek bewaren, zodat de pagina hem altijd kent. Niet gedaan: dat is het mag-punt van De avond ervoor en vraagt een eigen besluit.
- Een knop Toon thuis op de pagina. Niet gedaan: wie de pagina via Instellingen opent ziet thuis, en de kaart Je plaats staat eronder.

## Bron

`docs/backlog.md` (Weer van de plek, vervolg; Pathfinder 12 november), `docs/beslissingen/2026-11-12-weer-op-de-plek.md`.

## Vervangt

Niets. Het vult `2026-11-12-weer-op-de-plek.md` aan: de zin dat de pagina Weer thuis blijft tonen geldt niet meer als je via de rij Weer komt.

## Terugdraaien

Haal het tweede argument weg bij `toPage('/weer', ...)` in `TrainingBriefing.tsx`: dan gaat er niets mee en toont de pagina altijd thuis. `engine/weatherPageLink.ts` en de prop `link` van `WeatherTodayCard` mogen dan weg.

## Aanvulling na Warden (coördinator, 13 november)

De plek reist alleen in router-state. Een herlaad van de pagina houdt hem vast tot de dag van de training voorbij is, daarna is het thuis. Terug of opnieuw openen via een andere weg geeft een nieuwe stap zonder plek.
