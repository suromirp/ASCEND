# Weer en daglicht bij je training via Open-Meteo

Datum: 2026-10-22
Status: aangenomen

## Besluit

ASCEND haalt het weer op bij Open-Meteo, met alleen een plaats als locatie, en toont bij een buitentraining één rustige regel ("14 graden, droog, licht tot 18.12"). Is het weer voor een buitentraining slecht en is er die week een dag met beter weer waarop de training past, dan komt er een voorstel met Akkoord via de gewone adviezen. Er verschuift nooit iets stil.

## Reden

Je traint buiten, in de winter vaak in het donker, en de tochten zijn lang. Een regel met temperatuur, neerslag, wind en zonsondergang kost geen handwerk, en het ruilvoorstel past bij hoe de planner al werkt. De eigenaar gaf akkoord op 22 oktober 2026.

Gekozen regels, allemaal in `src/engine/weather.ts`:

- Het tijdstip: de mediane starttijd van je eerdere buitentrainingen van dezelfde soort (einde van het log min de duur), met minstens drie logs in de laatste tien weken en werkdagen en weekend apart; anders 18.00 uur op werkdagen en 10.00 uur in het weekend. Een log bewaart het eindtijdstip, dus een log dat veel later is ingevuld trekt de start naar achteren; de mediaan vangt dat op.
- Let op: warm (voelt als 27 graden of meer), koud (voelt als 5 onder nul of kouder), harde wind (gemiddeld 38 km/u of vlagen van 65), regen (minstens 1 mm in de uren van de training), sneeuw of mist.
- Slecht: onweer, ijzel, zware sneeuw, storm (gemiddeld 62 km/u of vlagen van 90), zware regen (4 mm in een uur of 10 mm in totaal), extreme hitte (voelt als 32 of meer) en strenge kou (voelt als 15 onder nul of kouder).
- Daglicht: eindig je na zonsondergang of begin je voor zonsopkomst, dan staat er "neem een lampje mee".
- Het ruilvoorstel komt alleen voor trainingen die binnen drie dagen vallen, want een verwachting verder vooruit wisselt te vaak. Het zoekt een dag in dezelfde week met beter weer waarop de training past volgens de bestaande regels (tijd op de dag, rust tussen zware trainingen, geen vakantiedag). Is er geen vrije dag, dan wisselt de training met een training die niet van het weer afhangt, zoals kracht. Liever niet onthoudt het voor die training.

De plaats is `settings.homeLocation`, dezelfde als de woonplaats bij Trainingsplekken. Die gaat, net als daarvoor, met de instellingen mee in een back-up. Alleen de plaatsnaam die je zoekt en coördinaten afgerond op twee decimalen (ongeveer een kilometer) gaan naar Open-Meteo. Het opgehaalde weer zelf is een cache onder een eigen sleutel in de meta-opslag en gaat niet mee in een export. Het wordt hooguit eens per uur opgehaald; zonder verbinding blijft de laatste stand staan met "bijgewerkt om ...".

## Alternatieven

Gps voor de locatie: niet nodig en preciezer dan het weer vraagt. Een eigen locatieveld los van de woonplaats: twee instellingen voor hetzelfde ding. Het weer pas tonen na tikken op een widget: botst met "binnen twee seconden weten wat je missie is". Verplaatsen zonder voorstel: botst met de afspraak dat planning nooit stil verandert.

## Bron

Eigenaar, 22 oktober 2026. docs/visie/Visuele upgrade en nieuwe ideeën.md, idee 4. Open-Meteo.com, licentie CC BY 4.0, gratis voor niet-commercieel gebruik; de bronvermelding staat op de pagina Weer onder Meer. Code: `src/integrations/openMeteo.ts`, `src/engine/weather.ts`, `src/engine/weatherSwap.ts`.

## Vervangt

Niets.

## Terugdraaien

Plaats wissen op de pagina Weer haalt het weer overal weg en wist de opgehaalde gegevens. Wil je het weer helemaal uit de app, verwijder dan de regel `<WeatherLine />` in `TodayMissionCard.tsx` en `TrainingGuideSheet.tsx` en de regel `weatherAdvice` in `computeAdvice`.
