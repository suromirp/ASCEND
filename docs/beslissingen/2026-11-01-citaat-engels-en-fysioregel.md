# Citaat standaard Engels en de fysioregel ingeklapt

Datum: 2026-11-01
Status: aangenomen

## Besluit

Het citaat onderaan Vandaag staat standaard in het Engels, instelbaar met Engels, Nederlands en Uit (`quoteLanguage`). Op de plekpagina van Lichaam is de lijst "Naar een fysio of je huisarts bij" ingeklapt achter "Wanneer laat je het nakijken?", en alleen open en in amber als je zelf een signaal meldde. De spoedtekst (`care.direct`, bijvoorbeeld "bel direct je huisarts of 112") blijft altijd zichtbaar.

## Reden

De eigenaar wil het citaat in het Engels, de taal van de gangbare vertalingen van de stoïcijnen. Dit keert het eerdere Nederlands eerst om, op zijn wens. Op een Engelse dag komen alleen citaten in het Engels aan de beurt, want Latijnse en Griekse spreuken hebben geen Engelse tekst. Is er geen enkel Engels citaat in de pool, dan valt de keuze terug op de hele pool. Een oude back-up zonder het veld leest als Engels, dus er is geen migratiestap. De vaste fysiotekst vond de eigenaar irritant omdat hij steeds terugkomt. Een spoedwaarschuwing hoort nooit achter een klik te zitten, dus die blijft staan.

## Alternatieven

Nederlands als standaard houden: afgewezen op wens van de eigenaar. Ook Latijn tonen op een Engelse dag: afgewezen, want dan klopt de instelling niet. De hele fysiolijst weghalen: afgewezen, de inhoud blijft gelijk. De spoedtekst mee laten inklappen: afgewezen om de veiligheid.

## Bron

Gesprek met de eigenaar. De zorgteksten blijven "kan helpen", met de bewijssterkte uit `docs/onderzoek/`.

## Vervangt

Niets. Het kleurdeel en de stem blijven zoals vastgelegd.

## Terugdraaien

Zet Citaat op Vandaag op Nederlands in de instellingen. Voor de fysioregel: haal `FysioFold` in `src/pages/BodySpot.tsx` weg en toon de lijst weer open.
