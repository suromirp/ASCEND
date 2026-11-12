# Avontuurlijke plekken uit OpenStreetMap

Scout Avontuurlijke plekken, 12 november 2026. Een korte bronnencheck, geen sportwetenschap. De vraag: de app stelt ook plekken voor die de eigenaar niet zelf heeft bewaard (een heuvelrug, een bos, een natuurgebied, een berg), uit OpenStreetMap via Overpass, binnen de afstand van `engine/places.ts#placeReachKm` (korter dan 90 minuten hoogstens 25 km, anders tot 75 km).

Bouwt voort op `docs/beslissingen/2026-11-08-heuvels-osm.md` (heuvels binnen 3 km, hoogte via Open-Meteo), `docs/onderzoek/Routeplanner voor een training.md` (hoe goed de hoogte is, dode band bij optellen) en `docs/onderzoek/Kaartbron voor Route voorstellen.md` (hoogtetegels). Die punten herhaal ik niet.

Zekerheid per bewering: zeker (de bron zelf gelezen), waarschijnlijk (afgeleid of meerdere aanwijzingen), onzeker (eigen aanname of niet geprobeerd). Ik kon geen proefaanroepen doen; elke bewering over hoe groot of snel een antwoord is, is dus niet gemeten. Pagina's gelezen op 12 november 2026.

## 1. Welke kenmerken

**natural=peak.** Een punt op de top van een heuvel of berg, zonder ondergrens in hoogte (zeker, https://wiki.openstreetmap.org/wiki/Tag:natural%3Dpeak). Wereldwijd ruim 1,1 miljoen stuks; ongeveer 70 procent heeft een `ele` en ongeveer 63 procent een naam; `prominence` (hoe ver de top boven zijn omgeving uitsteekt) staat bij ruim 1 procent (zeker, taginfo, https://taginfo.openstreetmap.org/tags/natural=peak#combinations). Reken dus nooit op `prominence` en gebruik `ele` hoogstens als controle. Het eerdere besluit zei het al: de hoogte uit de tags is te vaak leeg of fout.

**natural=hill.** Bestaat, maar wordt weinig gebruikt: ongeveer 64.000 wereldwijd tegen 1,1 miljoen toppen (zeker, taginfo). Meenemen kost niets, maar het levert weinig op.

**natural=ridge.** Een lijn over de kam, goedgekeurd kenmerk, bedoeld voor een doorlopende, duidelijke kamlijn; niet voor vlakkere stukken zonder duidelijke kam en niet als vlak (zeker, https://wiki.openstreetmap.org/wiki/Tag:natural%3Dridge). Gevolg: een brede, lage stuwwal zoals in Nederland staat vaak niet als ridge op de kaart, een bergkam in de Alpen of de Vogezen wel (waarschijnlijk, afgeleid uit de definitie). De naam van een kam is bruikbaar voor de zin ("Kam op 18 km").

**leisure=nature_reserve, boundary=protected_area en boundary=national_park.** Dit zijn de vlakken met een naam, en daarmee de beste vondst voor "een natuurgebied". Bij protected_area zegt `protect_class` wat voor bescherming het is: 1 tot en met 6 volgen de natuurklassen van de IUCN, 7 en 97 tot en met 99 zijn ook natuur, 11 tot en met 19 gaan over één hulpbron zoals water, 21 tot en met 29 zijn sociaal of cultureel (zeker, https://wiki.openstreetmap.org/wiki/Tag:boundary%3Dprotected_area). Toegang volgt niet uit de bescherming: de pagina zegt nergens dat een beschermd gebied open is, alleen dat `opening_hours` kan bestaan (zeker, zelfde pagina). Een waterwingebied of een gesloten reservaat kan er dus tussen zitten.

**natural=wood en landuse=forest.** Overal aanwezig, maar veel te veel en meestal zonder naam. Een uittreksel van Nederland telt ongeveer een half miljoen bosvlakken (waarschijnlijk, taginfo van Geofabrik voor Nederland, https://taginfo.geofabrik.de/europe:netherlands/tags/landuse=forest; ik weet niet zeker dat het filter op Nederland goed stond, want een tweede aanroep gaf een leeg antwoord). Vraag bos daarom niet los op over 75 km. Alleen bos met een naam is een bruikbare kandidaat; bos zonder naam is hoogstens een kenmerk van een plek die je al hebt.

**tourism=viewpoint.** Ongeveer 266.000 wereldwijd, bijna allemaal punten (zeker, taginfo). Een uitkijkpunt ligt meestal hoog en is bereikbaar te voet: goed als bijvangst en als bestemming in de zin, zwak als enige reden.

**route=hiking en route=foot.** Relaties, ruim 270.000 wereldwijd (zeker, taginfo). Ze zeggen dat er gemarkeerde paden lopen, wat een plek betrouwbaarder maakt, maar een relatie over 75 km ophalen is zwaar. Gebruik ze niet in de eerste zoektocht.

**highway=path en highway=track.** Te veel voor een straal van 25 tot 75 km. Ze horen bij de bestaande zoektocht van 3 km rond één punt, dus pas nadat een plek gekozen is. De ondergrond (`surface`) is dan ook pas bekend.

**Per streek.**
- Nederland: toppen bestaan (enkele honderden in het uittreksel, waarschijnlijk, zelfde bron en zelfde voorbehoud), maar een top van 30 of 80 m zegt weinig en `ele` is geen houvast. De bruikbare plekken zijn hier de vlakken met een naam: natuurgebied, nationaal park, bos met een naam. Of er hoogte in zit, moet uit een hoogtemodel komen, niet uit de kaart (waarschijnlijk).
- Alpen en Vogezen: toppen, kammen, zadels en gemarkeerde routes zijn dicht en goed ingevuld (waarschijnlijk, algemene ervaring, niet gemeten). Hier is juist het probleem dat er te veel toppen zijn en dat een top geen plek is waar je begint. In het hooggebergte is een top bovendien niet vanzelf te belopen; `sac_scale` op de paden zegt hoe zwaar, en dat komt pas uit de routeplanner (zie het eerdere onderzoek).

## 2. Een startpunt

**highway=trailhead.** Een punt waar een pad begint, feitelijk in gebruik maar niet formeel goedgekeurd; meestal met een naam en vaak met parkeerruimte (zeker, https://wiki.openstreetmap.org/wiki/Tag:highway%3Dtrailhead). Wereldwijd bijna 19.000 stuks, dus dun gezaaid buiten streken waar een beheerder ze heeft ingevoerd (zeker voor het aantal, taginfo; waarschijnlijk voor de spreiding). Is er een, dan is dat het beste startpunt.

**amenity=parking.** Bijna overal aanwezig. Neem de dichtstbijzijnde bij het gebied en sla `access=private`, `access=customers` en `access=no` over (waarschijnlijk, gangbare tags; niet nagelezen op de wiki-pagina van parking). Een parkeerplaats binnen of op de rand van het natuurgebied gaat voor een parkeerplaats in een woonwijk (aanname).

**Andere houvasten.** Een informatiebord (`tourism=information` met `information=board` of `map`) of een ingang ligt vaak op het startpunt (onzeker, niet nagelezen). Voor wie zonder auto gaat is een station of halte een startpunt; dat is een latere wens.

**Voorstel voor de volgorde:** trailhead binnen ongeveer 1 km van de kandidaat, anders een openbare parkeerplaats binnen ongeveer 1 km, anders het middelpunt van de kandidaat met de zin dat de app geen startpunt kent. De afstanden zijn een aanname en moeten in de bouw geprobeerd worden. Het startpunt zoek je pas als de gebruiker de plek aantikt; dat scheelt een zware aanvraag bij elke zoektocht.

## 3. De openbare Overpass-servers

**Hoofdserver** (`overpass-api.de`, die de app al gebruikt). De handleiding vraagt hoogstens ongeveer 10.000 aanvragen per dag en minder dan ongeveer 1 GB per dag. Zonder eigen opgave geldt een tijdgrens van 180 seconden en 512 MiB geheugen; wie daar overheen gaat wordt afgebroken. Elke gebruiker heeft een paar plekken tegelijk; een aanvraag wacht hoogstens 15 seconden op een vrije plek. Geweigerd om het tempo geeft code 429, geweigerd omdat de server te vol is geeft 504 (zeker, https://dev.overpass-api.de/overpass-doc/en/preface/commons.html). De wiki voegt toe: cache en beperk je aanroepen, laat niet meerdere scripts tegelijk lopen, wacht bij 429 of 406 een halve minuut, geef een `User-Agent` of `Referer` mee waaraan je app te herkennen is, en reken niet op hoge betrouwbaarheid omdat de server overbelast is (zeker, https://wiki.openstreetmap.org/wiki/Overpass_API). Een browser stuurt de herkomst zelf mee; in de Android-app is dat `https://localhost`, wat niets over ASCEND zegt (waarschijnlijk).

**Tweede server.** `https://overpass.private.coffee/api/interpreter` (voorheen kumi.systems): geen grens op het tempo, wel de vraag om je te melden bij een groot project. `https://maps.mail.ru/osm/tools/overpass/api/interpreter`: geen grens genoemd (zeker, zelfde wiki-pagina). Ik raad de eerste aan als terugval. Of beide CORS toestaan vanuit de PWA en de Android-app is niet geprobeerd (onzeker).

**Wat de app moet doen (voorstel).**
- Eén aanvraag per zoektocht, alleen als de gebruiker een training opent die iets vraagt (`placeNeed` is niet `none`) en hier niet genoeg kan. Nooit op de achtergrond, nooit bij het starten van de app.
- Cache per afgeronde plek en straal, dertig dagen, zoals de bestaande cache van heuvels. Een landschap verandert niet per week. Daarmee blijft één gebruiker op een handvol aanvragen per maand.
- Zet de tijdgrens en de grootte zelf in de aanvraag (`[timeout:25][maxsize:...]`), vraag `out center tags` met een bovengrens op het aantal, en vraag alleen punten en vlakken met een naam. Geen bos zonder naam, geen paden, geen routerelaties over 75 km.
- Bij 429, 504, een tijdgrens of geen netwerk: één poging bij de tweede server, daarna stoppen en de laatste bewaarde uitkomst tonen of niets. Geen herhaling in een lus; een nieuwe poging pas als de gebruiker er zelf om vraagt.
- De kop van de app moet een grens in tijd hebben (de bestaande 12 seconden is krap voor 75 km; 20 tot 25 seconden is redelijker, onzeker).
- Naamsvermelding "© OpenStreetMap contributors" bij het voorstel, zoals bij de lussen.

Hoe zwaar een aanvraag over een cirkel van 75 km in de Alpen is, weet ik niet. Een straal van 75 km is ruim 17.000 vierkante kilometer; met alleen toppen kan dat al duizenden punten zijn. Een proef in de bouw moet de bovengrens en de tijd bepalen.

## 4. Hoogtemeters zonder route

**Wat er nu in de app zit.** De opdracht noemt hoogtetegels die de app al gebruikt voor de kaart. Die vond ik niet in `src/`: geen `raster-dem`, geen hillshade, geen Terrarium. De enige hoogtebron buiten de routeservers is de puntaanroep van Open-Meteo in `src/integrations/overpass.ts` (zeker, de code gelezen). Het eerdere onderzoek noemde hoogtetegels als tweede stap, niet als iets dat er staat.

**Open-Meteo, de weg die al werkt.** Copernicus GLO-90, cellen van 90 m, hoogstens 100 punten per aanroep (zeker, https://open-meteo.com/en/docs/elevation-api). Gratis gebruik: minder dan 10.000 aanroepen per dag, 5.000 per uur en 600 per minuut (zeker, https://open-meteo.com/en/terms). Eén aanroep per zoektocht past daar ruim in.

**Hoogtetegels.** De Terrain Tiles op AWS (`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`, zoom 0 tot en met 15, tegels van 256 pixels) bestaan zonder sleutel, maar de documentatie zegt dat de S3-tegels bedoeld zijn voor gebruik vanaf EC2 en dat er geen cache voor staat (zeker, https://github.com/tilezen/joerd/blob/master/docs/use-service.md). Dat is geen verbod, maar ook geen uitnodiging voor een app. Eén tegel geeft wel 65.536 hoogtes in één keer, wat voor een heel gebied veel beter is dan 100 losse punten. Niet geprobeerd; CORS en de codering moet de bouwer nalezen.

**Een grove maat (voorstel, eigen afleiding, onzeker).**
- Stap 1, reliëf: neem per kandidaat vijf punten (het middelpunt en vier punten op ongeveer 1,5 km eromheen, bij een top de top zelf en vier punten eromheen). Reliëf is hoogste min laagste. Twintig kandidaten keer vijf punten is precies één aanroep van 100 punten.
- Stap 2, wat de training eruit haalt: een training van D km kan een helling met een voet-topafstand van L km hoogstens ongeveer D gedeeld door twee keer L keer op. Hoogtemeters die de plek kan geven is dan het reliëf keer dat aantal, met een bovengrens. Voorbeeld: reliëf 60 m, helling van 1 km, training van 8 km geeft hoogstens vier keer op, dus ongeveer 240 hoogtemeters.
- In de bergen is het eenvoudiger: is het reliëf groter dan wat de training vraagt, dan haalt de plek het doel in één klim.
- Wat de maat mist: in bos meet het model deels de kruinen (3 tot 7 m fout, zie het eerdere onderzoek), een cel van 90 m vlakt een korte steile helling af, en vijf punten kunnen een smalle kam missen. Toon het getal daarom afgerond op 10 m en met "ongeveer", en laat de echte hoogtemeters van de routeplanner komen zodra de gebruiker de plek kiest.
- IJken kan met wat er al is: vergelijk de grove maat op de bewaarde plekken van de gebruiker met de echte hoogtemeters van zijn bewaarde routes daar.

## 5. Advies voor het ontwerp

Vraag in één Overpass-aanvraag alleen punten en vlakken met een naam op: `natural=peak`, `natural=hill`, `natural=ridge`, `tourism=viewpoint`, `leisure=nature_reserve`, `boundary=national_park`, `boundary=protected_area` met een natuurklasse, en bos met een naam; laat bos zonder naam, paden en routerelaties buiten de eerste zoektocht. Bepaal de hoogte nooit uit `ele`, maar met één aanroep van 100 punten bij Open-Meteo: vijf punten per kandidaat voor de twintig dichtstbijzijnde. Rangschik eerst op of de plek minstens 80 procent haalt van de hoogtemeters die de training vraagt (dezelfde `SUGGEST_SHARE` als bij bewaarde routes), dan op afstand, en gebruik de ondergrond alleen als lichte voorkeur bij gelijke stand, omdat die pas na de keuze echt bekend is; een eigen bewaarde plek gaat altijd voor een plek uit OpenStreetMap. Toon hoogstens drie plekken, elk met één zin die soort, naam, afstand en opbrengst noemt, bijvoorbeeld "Heuvelrug op 18 km, haalt ongeveer 240 van je 300 hoogtemeters", en zeg erbij dat het een schatting is en dat de app niet weet of het gebied open is. Zoek het startpunt (trailhead, anders openbare parkeerplaats) pas als de gebruiker een plek aantikt, bewaar alles dertig dagen per afgeronde plek, val bij een fout één keer terug op een tweede server en verander de planning nooit: het is een chip onder Start bij, geen keuze van de app.

De zin heeft een soortwoord nodig als de naam ontbreekt of niets zegt: Top, Kam, Uitkijkpunt, Natuurgebied, Nationaal park, Bos. "Heuvelrug" is geen kenmerk in OpenStreetMap; dat woord kan de app alleen kiezen als hij het zelf afleidt, bijvoorbeeld een natuurgebied met een reliëf van minstens 30 m buiten de bergen (aanname).

## Wat het onderzoek zegt

OpenStreetMap heeft de bouwstenen, maar ze zijn ongelijk. Toppen en kammen zijn in de bergen dicht en goed, in laagland dun en weinig zeggend; daar zijn de vlakken met een naam (natuurgebied, nationaal park) de bruikbare vondst. Hoogte uit de tags is onbetrouwbaar: 70 procent van de toppen heeft een `ele`, bijna geen enkele een `prominence`. Bescherming zegt niets over toegang. De hoofdserver van Overpass staat ongeveer 10.000 aanvragen per dag toe, is overbelast en vraagt om cache en geduld; er is een tweede server zonder grens op het tempo. Hoogtemeters zonder route kan alleen als schatting uit een hoogtemodel.

## Wat het betekent voor de app

Het kan binnen de bestaande adapter en zonder sleutel: één Overpass-aanvraag en één hoogte-aanroep per zoektocht, dertig dagen bewaard. De opbrengst van een plek is een schatting en moet zo heten; het echte getal komt van de routeplanner na de keuze. De app heeft nu geen hoogtetegels; wie die wil, bouwt eerst dat stuk. Er hoort een instelling bij (plekken uit OpenStreetMap voorstellen, standaard aan, met de eerste vraag zoals bij de heuvels) en de plek van de gebruiker gaat afgerond de deur uit, zoals nu.

## Wat nog onzeker is

- Hoe groot en hoe traag een aanvraag over 25 en 75 km is, in laagland en in de Alpen. Niet geprobeerd; dit bepaalt of het in één aanvraag kan of dat de straal in de bergen kleiner moet.
- CORS van de tweede server, en of de hoofdserver de herkomst `https://localhost` van de Android-app als herkenbaar genoeg ziet.
- Of de grove maat klopt. De formule is een eigen afleiding; ijken tegen bewaarde routes is nodig voordat er een getal in een zin komt.
- De aantallen voor Nederland uit taginfo van Geofabrik; het filter op het land heb ik niet kunnen bevestigen.
- Hoe vaak een beschermd gebied in de praktijk dicht is of deels afgesloten (broedtijd, waterwinning). De kaart zegt het zelden.
- De tags voor parkeren en informatieborden heb ik niet op hun eigen wiki-pagina nagelezen, en de afstand van 1 km tot een startpunt is een aanname.
- Of de Terrain Tiles op AWS vanuit een app gebruikt mogen en kunnen worden.
