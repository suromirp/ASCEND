# Weer volgt je locatie

Datum: 2026-10-22
Status: aangenomen

## Besluit

De Weer-pagina begint met "Gebruik mijn locatie"; zoeken op plaatsnaam is de tweede weg. Een plaats die "Mijn locatie" heet, wordt bij het openen van de app bijgewerkt, hoogstens eens per uur en alleen als de toestemming al gegeven is. De instelling heet "Weer volgt je locatie" en staat standaard aan.

## Reden

De eigenaar vond de pagina te omslachtig en zag knoppen op "Bezig" blijven staan. Op vakantie of tijdens een tocht moet het weer kloppen zonder dat je iets doet. Standaard aan is veilig, omdat er drie vangrails zijn: alleen een plaats die "Mijn locatie" heet (een zelf gezochte plaats blijft zoals je haar koos), alleen met een al gegeven toestemming (`navigator.permissions.query`, dus nooit een ongevraagd venster) en hoogstens eens per uur.

Elke actie op de pagina heeft een eigen bezig-toestand en een eigen tijdslimiet (`utils/withTimeout.ts`, `utils/geolocation.ts`), met een korte melding als uitkomst. De drempels onder "Zo oordeelt ASCEND" komen uit `engine/weather.ts` (`weatherRuleRows`), zodat de pagina nooit iets anders zegt dan de regels.

## Alternatieven

Het uur van de laatste poging in de instellingen bewaren: gaat dan mee in een back-up, terwijl het bij dit toestel hoort. Het staat daarom onder een eigen sleutel in de meta-opslag. Een aparte sleutel in `AppSettings`: de schakelaar zit bij "Overzichten en vragen" (`overviews.weatherFollowsLocation`), die ontbrekende sleutels al als standaard leest, dus oude back-ups importeren zonder migratiestap (zie `2026-10-22-alles-instelbaar.md`).

## Bron

Gesprek met de eigenaar over de Weer-pagina. Bouwt voort op `2026-10-22-weer-open-meteo.md`.

## Vervangt

Niets.

## Terugdraaien

Zet "Weer volgt je locatie" uit bij Meer. De plaats blijft dan staan zoals ze is.
