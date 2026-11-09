# Forge telt vermoeidheid tussen oefeningen

Datum: 2026-11-09
Status: aangenomen

## Besluit

Forge telt de harde werksets die eerder in de training voor dezelfde spieren staan, zet dat af tegen wat er normaal voor stond in je historie van dezelfde oefening, en maakt bij meer dan normaal de eerste set van de latere oefening iets lichter: eerst in herhalingen, anders een stap lichter. Alleen het voorschrift verandert, nooit iets wat je invulde of afvinkte, en geen log. Instelling "Vermoeidheid tussen oefeningen" in Rekenmodel, standaard aan. Code: `src/engine/forgeCrossFatigue.ts`, aangeroepen vanuit `forgeWorkout.ts#planExercise`.

## Reden

Bouwstap 6 tot 8 van het verslag over RIR en RPE. Tot nu toe rekende `fatigueFactor` alleen binnen een oefening. Je gewone volgorde zit al in je geschatte kracht, dus alleen het verschil met normaal mag tellen; anders telt een vaste volgorde dubbel.

Eigen keuzes, elk een gok die "raak" kan toetsen:

- Een harde set: een werkset met een RIR die je zelf koos van hoogstens 3, of een afgevinkte set die bevestigd is (alleen met "Afvinken telt als het doel") met hoogstens 3. Een opwarmset telt nooit.
- Is het van een werkset op dezelfde spieren niet te weten (geen RIR, of afgevinkt en niet bevestigd), dan is het aantal ervoor in die training onbekend en telt die training niet mee voor normaal. Zo trekt een oude back-up zonder RIR of zonder `repsAsked` het gewone aantal niet stil naar nul. Bevestigd lezen we hier zonder bereik van die dag: een oud log zonder gevraagd aantal is bij een afgevinkte set dus onbekend.
- Spieren: een gedeelde hoofdspier telt een hele set, een hoofdspier van de eerdere oefening die alleen een hulpspier van de latere is een halve. Dezelfde regels als `doneBefore` voor het opwarmen. Een oefening zonder spiergegevens krijgt niets.
- Vandaag en normaal tellen harde sets op dezelfde manier (na de review van Warden). Per oefening ervoor telt vandaag wat je daar de laatste keren als harde sets logde (de mediaan van de laatste zes bekende, met dezelfde regel als de historie), hoogstens het aantal harde rijen van het voorschrift (tot falen of hoogstens 3 over). Zonder bekende historie van die oefening telt het voorschrift. Zo geeft een eerdere oefening waar je steeds RIR 4 logt, of vaak een set weghaalt, bij dezelfde volgorde geen verschil. Lichter en de tijdsgrens (minder sets of een oefening eruit) tellen wel mee, want ze verlagen het voorschrift. Meer sets dan normaal bij dezelfde eerdere oefening telt daardoor niet; een extra oefening ervoor wel. Bij Ruilen telt wat ervoor in de training staat.
- Een dode zone: pas vanaf een hele harde set meer dan normaal stelt Forge bij.
- Normaal: de mediaan van de laatste zes trainingen met een bekend aantal, en minstens drie. Minder: niets zeggen.
- De kost: 2% kracht per harde set meer dan normaal, nooit meer dan 10%, alleen omlaag. Met "Vermoeidheid per set" op Geleerd leert Forge het per oefening: de eerste werkset met een eigen RIR (nooit afgevinkt, niet op vermoeide benen) tegen de gladgestreken kracht van ervoor, als helling tegen het aantal ervoor, vanaf zes trainingen met minstens twee verschillende aantallen, naar 2% getrokken met acht trainingen gewicht (zoals `learnAfterHard`), tussen 0 en 5%. Geen eigen keuze Geleerd of Vast, maar die van de bestaande rij, zoals het verslag voorstelt.
- De eerste set: haal je de onderkant van het bereik nog, dan alleen minder herhalingen; anders het zwaarste lichtere gewicht waarmee je de onderkant haalt, met de speling van raak; past er geen, dan de onderkant op dit gewicht. Tot falen, een open doel of een houding: niets. Een latere werkset wordt nooit zwaarder dan de nieuwe eerste, een opwarmset die te dicht bij het nieuwe werkgewicht komt valt weg. Terugzetten na een stap omhoog houdt dezelfde bijstelling: de eerste set van het teruggezette voorschrift wordt op dezelfde manier bijgesteld, latere sets worden daarop begrensd, en de zin staat ook in de reden die terugkomt. Het volgende opwarmen (`noteDone`, `noteWorked`) kijkt naar het bijgestelde werkgewicht en de opwarmsets die overbleven.
- In de training rekent "Forge rekent mee" met de bijgestelde kracht (`WorkoutExercise.strengthKg`), tot een set anders ging dan gevraagd. Alleen als de eerste set echt werd bijgesteld en de zin er staat; tot falen, een houding of herhalingen die al laag genoeg stonden laten de kracht gelijk, zodat Forge nooit stil met minder rekent. Wat er tijdens de training echt gedaan wordt, verandert het voorschrift van een volgende oefening niet: dat blijft een vraag, niet stil schuiven.
- De reden staat voor de gewone reden op de rij, het droge feit eerst: "3 harde sets meer voor dezelfde spieren ervoor dan normaal, dus je eerste set iets lichter."
- "Raak" (`comparisonRows`) rekent zonder deze bijstelling, zoals het voorschrift van vroeger was; daarom staat de instelling niet in `checkModelKey`.

## Alternatieven

- Elke harde set ervoor tellen, zonder normaal: telt een vaste volgorde dubbel, want de historie bevat die vermoeidheid al. Niet gekozen.
- Een training met een onbekende set als nul tellen: een back-up van MacroFactor of van voor "Afvinken telt als het doel" zou dan altijd "meer dan normaal" geven. Niet gekozen.
- De echte sets van vandaag gebruiken in plaats van het voorschrift: zou een volgende oefening tijdens de training stil verschuiven. Niet gekozen; het voorschrift wordt bij het begin gemaakt.
- Alle sets lichter maken: het verslag noemt de eerste set; "Forge rekent mee" neemt het daarna over.

## Bron

`docs/onderzoek/RIR en RPE in krachtapps.md`, hoofdstuk 3 en bouwstap 6 tot 8. Backlog "Onderzoek: hoe de beste apps RIR en RPE bijhouden", eigenaar 7 november. Bouwt op `2026-11-03-forge-rekent-mee.md`, `2026-11-08-forge-afvinken-doel.md` en `2026-11-09-forge-review-afvinken.md`.

## Vervangt

Niets.

## Terugdraaien

De instelling uit zetten geeft precies het voorschrift van voorheen. In de code: de aanroep `crossFor` in `forgeWorkout.ts#planExercise` weghalen; er is geen opgeslagen vorm veranderd en geen migratie nodig (het nieuwe veld `crossFatigue` in de instellingen wordt defensief gelezen).
