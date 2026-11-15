# Ontwerp: routes voor wandelen en rugzak

Status: voorstel van Cartographer, 15 november. Er is geen code gewijzigd.

## Aanleiding

De eigenaar koos op 14 november de volgorde: eerst routes voor wandelen en rugzaktraining met klimtempo, daarna een vaste ijktocht. Het doel is de GR5 met tent.

Nu krijgt alleen een looptraining een lus (`src/engine/routeTarget.ts:26`, `wantsRoute` vraagt `templateSport === 'running'`). Een wandeling buiten krijgt in de Briefing alleen plekken in de buurt (`src/engine/briefing.ts:474`, soort `nearby`). De routeplanner zelf kan al wandelen: BRouter draait op het profiel `hiking-mountain` (`src/integrations/brouter.ts:12`) en Valhalla op `pedestrian` (`src/integrations/valhalla.ts:36`). Wat ontbreekt is de vertaling van een wandeltraining naar wat een lus moet halen.

## Het kernpunt: een wandeling is een duur, geen afstand

Een looptraining wordt een afstand via je looptempo (`routeTarget.ts:55` tot `57`). Bij wandelen werkt dat niet: de tijd hangt af van de afstand en van de hoogtemeters samen. Het onderzoek geeft daar één regel voor, de wandelnorm DIN 33466 (`docs/onderzoek/Meerdaagse tochten plannen.md`, `docs/onderzoek/Doelsoorten berg en buiten.md`): 4 km per uur vlak, 300 m per uur omhoog, 500 m per uur omlaag; de grootste van de vlakke tijd en de klimtijd, plus de helft van de kleinste. Die staat al in de code (`src/engine/goalRoute.ts:148`, `estimatedHikingMinutes`) en met je eigen meters per uur in `src/engine/climbPace.ts:148` (`dinHours`).

Eén vondst die de eigenaar moet kennen. De wandelladder (`src/data/hikeLadder.ts:19` en `:39`) past op de wandelnorm niet in zijn eigen tijd. Een lus daalt evenveel als hij stijgt, dus 500 m op en af kost op de norm al 2 uur 40. De bergtocht van 180 minuten met 500 m houdt dan 2,7 km vlak over. De zwaarste dag, 300 minuten met 1.000 m, kost op de norm 5 uur 20 aan klimmen en dalen alleen. Met een eigen klimtempo van 450 m per uur omhoog en 700 omlaag klopt dezelfde bergtocht wel: 500 m en ruim 8 km in 3 uur. De ladder gaat dus stil uit van iemand die vlotter klimt dan de norm. Dit ontwerp verandert de ladder niet; het zegt eerlijk wat een lus kost.

## 1. Welke trainingen een route krijgen

- Bergtocht (`tpl_mountain_hike`, `src/data/defaultProgram.ts:265`) en Wandeldag 1 van 2 (`tpl_hike_day_one`, `:290`): ja. Duur, hoogtemeters en rugzak uit de stap van de week (`src/engine/programLayout.ts:479`, `progressionTarget`). Avontuurlijk bovenaan.
- Rugzakwandeling (`tpl_ruck_walk`, `:531`), de rugzakladder van de winter: ja. Duur en rugzak, geen gevraagde hoogtemeters. Een vlakke lus over onverhard waar het kan.
- Klimtraining, Bergop wandelen (`tpl_bergconditie`, `:177`): ja, als Simpel: dezelfde helling op en af. De 400 m in 50 minuten van het sjabloon is een getal voor de loopband; buiten past op de norm ongeveer 150 m in die tijd. De lus zegt wat hij haalt.
- Herstelwandeling (`tpl_herstel`, `:307`): ja, maar alleen na een tik op Zoek een lus, nooit vanzelf. Vlak, kort, één lus.
- Trap af (`tpl_stairs_down`, `:520`): nee. Dat is een plek, geen lus; de regel met een trap in de buurt blijft (`src/engine/nearbyTerrain.ts:30`).
- Heuvelintervallen en elke loop: zoals nu, niets verandert.
- Op de loopband of binnen: geen route, zoals nu (`routeTarget.ts:31`, `wantsRouteAt`).

Zonder doel bestaan bergtocht, wandeldag en rugzakladder niet; dan blijft alleen de herstelwandeling over. Dat volgt vanzelf uit het plan en vraagt geen eigen regel.

## 2. Wat de route moet halen

Drie getallen uit de training: de minuten, de hoogtemeters en de rugzak in kilo's.

- De duur is leidend. De 48 uur tussen beenzware sessies, de beenindex en het weekbudget rekenen in minuten. Een lus die stil een uur langer duurt, verandert de belasting zonder voorstel, en dat mag nooit.
- De hoogtemeters gaan mee tot waar ze in de duur passen: klimmen en dalen samen hoogstens twee derde van de tijd. Dat is een eigen aanname, bedoeld om lussen zonder vlak stuk te voorkomen. Voor 3 uur op de norm is dat 375 m; de rest van de 500 zegt de lus eerlijk.
- De afstand volgt daaruit, door de wandelnorm om te keren: de duur min de helft van de klimtijd, maal 4 km per uur. Rugzakwandeling van 75 minuten: 5 km. Herstelwandeling van 45 minuten: 3 km. Bergtocht van 3 uur met 375 m: 8 km.
- Het tempo is de klimtempo-regel. Met genoeg eigen klimmen (zes klimmen uit drie tochten, `climbPace.ts:92`) rekent de lus met jouw meters per uur omhoog en omlaag; anders met 300 en 500. Vlak blijft 4 km per uur.
- De rugzak verandert de lus niet, alleen de tijd, en alleen als je eigen klimtempo en het gewicht op je klimmen bekend zijn (`climbPace.ts:141`, `packFactor`: trager naar verhouding van lichaam plus rugzak, nooit sneller dan gemeten). Op de norm komt er geen opslag bij: het onderzoek noemt 10 tot 20 procent bij 14 kg uitdrukkelijk een aanname. De regel zegt dan dat de norm zonder rugzak rekent.
- Elke gevonden lus krijgt zijn eigen tijd, gerekend op zijn echte afstand, stijging en daling. Die tijd is wat je ziet en waarop de lus beoordeeld wordt, altijd zonder pauzes.

## 3. Hoe het in de planner past

Geen nieuwe dienst en geen nieuwe bron. Vier kleine ingrepen.

- Eén nieuw puur bestand `src/engine/hikeTarget.ts`. Drie functies: `walkRates` (jouw meters per uur of de norm, met de rugzak), `hikeMinutes` (de tijd van een lus, dezelfde som als `dinHours`) en `walkTarget` (minuten en hoogtemeters naar een afstand en de hoogtemeters die passen). Het hergebruikt `NORM_UP_MPH` en `NORM_DOWN_MPH` (`climbPace.ts:46`) en schrijft de norm niet opnieuw.
- `RouteTarget` (`src/models/route.ts:50`) krijgt drie optionele velden: `minutes`, `packKg` en `askedAscentM`. Zonder die velden is het een looptraining en gedraagt alles zich als nu. Een bewaarde route bewaart geen doel, dus geen migratie.
- `routeTarget` (`routeTarget.ts:49`) kiest bij een wandelsjabloon `walkTarget` in plaats van het looptempo. `wantsRoute` (`:26`) laat ook wandelen en de herstelwandeling door. De soort komt uit het sjabloon en de keuze Waar train je, nooit uit een tempo (`src/engine/activityFit.ts:78`, de valkuil van 14 november).
- De planner zelf (`src/engine/routePlanner.ts`) zoekt eerst ongewijzigd op afstand en hoogtemeters. Daarna, als eigen stap: `missScore` (`:92`) weegt bij een doel met minuten de tijd van de lus in plaats van de afstand. Een lus die minder klimt dan gevraagd is dan te kort in tijd en de volgende poging mikt langer, binnen dezelfde drie aanroepen (`MAX_ROUTE_CALLS`, `:18`).

Wat blijft zoals het is: het profiel `hiking-mountain` met `consider_noise` (`brouter.ts:15`), Valhalla als reserve met `walkway_factor` (`valhalla.ts:39`), de poort van een seconde tussen aanroepen (`src/integrations/routing.ts:50`), de grens van 12 seconden (`:8`), de vorm van een lus en de regel over grote wegen. Plekken werken vanzelf mee: `placeNeed` (`src/engine/places.ts:86`) leest hetzelfde doel, dus een wandeling van 90 minuten of met 100 hoogtemeters krijgt al een voorgestelde plek (`suggestPlace`, `:217`) en een bewaarde route krijgt dezelfde tijd via `hikeMinutes` (`rankSavedRoutes`, `:152`).

## 4. Wat je ziet

In de Briefing, op de plek van de kaart, waar nu de kilometers staan (`briefing.ts:469`, `kmText` op `:654`): "3 uur, ongeveer 8 km". De hoogtemeters en de rugzak staan al in de hartkaart en komen hier niet nog eens.

In het blad Route:

- De regel bovenaan (`src/components/RoutePanel.tsx:293`): "Je training: 3 uur met 500 hoogtemeters en 8 kg rugzak."
- Per lus (`routePlanner.ts:620`, `proposalFacts`): "8,4 km · 360 hoogtemeters · ongeveer 3 uur 5".
- Eén gedempte regel waar het getal op rust. Op de norm: "Gerekend op de wandelnorm: 4 km per uur, 300 m per uur omhoog en 500 omlaag. Zonder pauzes en zonder rugzak." Op je eigen tempo: "Op je eigen klimtempo: 450 m per uur omhoog, met 8 kg rugzak. Zonder pauzes."
- In amber, alleen als het speelt, hoogstens twee regels zoals nu: "Deze lus stijgt 360 m; de training vraagt 500 m." (de bestaande `ascentNotice`, `:675`) en "Deze lus duurt ongeveer 3 uur 40, langer dan de 3 uur van je training."
- Past de gevraagde stijging niet in de duur, dan één gedempte regel: "500 m op en af kost op de wandelnorm 2 uur 40. In 3 uur past 375 m."

Eén mint accent: de bestaande knop Route naar Garmin Connect of GPX downloaden (`RoutePanel.tsx:79`). Niets nieuws in mint; de tijd staat in inkt, het let op in amber.

Instellingen, drie rijen bij de andere route-instellingen (blad Weer en kleding, `src/data/settingsLayout.ts:164` en de regel op `:335`), elk ook in `settingsIndex.ts`, `settingsSummary.ts` en de hulptekst:

- Route bij wandelen: Tochten en rugzak (advies), Ook herstelwandeling vanzelf, Uit. "Bij een wandeling buiten stelt de Briefing een lus voor die past bij de duur."
- Wandeltempo voor routes: Je eigen klimtempo als het er is (advies), Altijd de wandelnorm. "Waarmee de tijd van een lus wordt gerekend."
- Als duur en hoogtemeters botsen: Duur eerst (advies), Hoogtemeters eerst. "Passen de hoogtemeters niet in de tijd, dan houdt de lus zich aan de duur."

## 5. Randen

- Geen heuvel dichtbij. De lus wordt vlak en houdt de duur. De bestaande regels zeggen het droge feit ("Geen heuvels binnen 3 km.") en waar je de meters wel haalt (`SUBSTITUTE_LINE`, `:692`); een plek met hoogte binnen bereik verschijnt als chip. Het plan verandert niet.
- Langer dan drie uur. De heuvels komen uit een cache van 3 km rond je plek (`src/integrations/overpass.ts:21`); voor een lus boven ongeveer 12 km is dat krap. Daarom: boven drie uur zoekt de Briefing nooit vanzelf, een bewaarde route of een plek gaat voor, en zonder beide zoekt de planner een ruime lus zonder heuvels (`ring`, `:484`) met de regel "Boven 3 uur kent ASCEND alleen de heuvels dichtbij. Een plek of een bewaarde route geeft meer hoogte." De straal vergroten is een eigen besluit en hoort hier niet bij.
- Een tocht op reis. Een dag van een tocht in je planning (`src/models/leave.ts:16`, soort `trek`) krijgt geen lus: je loopt je etappe. Een training op vakantie start waar je nu bent (`src/engine/routeStart.ts:14`) en werkt als thuis. In de bergen komt er één vaste regel in amber bij zodra de lus boven 1.500 m komt: "ASCEND kent de moeilijkheid en de staat van dit pad niet. Bekijk de lus op een wandelkaart." Of BRouter op dit profiel paden boven een bepaalde moeilijkheid mijdt, weet ik niet; dat zoekt Scout uit voordat stap 6 gebouwd wordt.
- Geen netwerk. De bestaande regel (`src/engine/routeSheet.ts:25`). Het doel staat er wel ("3 uur, ongeveer 8 km") en bewaarde routes werken met hun tijd, want `hikeMinutes` rekent op het toestel.
- Nog geen eigen klimtempo. De norm, met de regel die dat zegt. Nooit een leeg getal.
- Rugzak onbekend. De regel noemt hem niet en de tijd wordt niet omgerekend.
- Een lus is altijd een lus. Van A naar B met de trein terug valt buiten dit ontwerp.

## 6. Stappenplan

Elke stap is los te bouwen en te pushen. Bouwen doet Sherpa op Opus; elke stap die `engine/` raakt gaat langs Warden op Fable. Na elke stap de vier controles en `npm run kaart:vergelijk`.

1. De rekenkern. Sherpa Routes, Opus; Warden Fable.
   - Bestand: `src/engine/hikeTarget.ts` (nieuw) met test.
   - Tests: de norm geeft dezelfde minuten als `estimatedHikingMinutes`; heen en terug rekenen komt binnen 5 minuten op de duur uit; 500 m in 3 uur geeft 375 m en 8 km; eigen tempo met zwaardere rugzak is trager, met lichtere nooit sneller; nul, negatief en geen getal geven nooit NaN.
   - Niet bewegen: `climbPace.ts`, `goalRoute.ts`.
2. Het doel van een wandeltraining. Sherpa Routes, Opus; Warden Fable.
   - Bestanden: `src/models/route.ts`, `src/engine/routeTarget.ts`, `src/components/useRouteSearch.ts:182`, `src/engine/briefing.ts:466`.
   - Tests: elk loopsjabloon geeft precies hetzelfde doel als nu; de vijf wandelsjablonen per fase; loopband en binnen geen route; Trap af geen route; de golden scenario's A en C bewegen niet.
3. De woorden. Sherpa Routes, Opus; Lookout en Pathfinder.
   - Bestanden: `routePlanner.ts` (`proposalFacts`, de notities), `routeTarget.ts` (`targetText`), `briefing.ts` (`kmText`), `RoutePanel.tsx`.
   - Tests: de zinnen uit hoofdstuk 4 letterlijk; hoogstens twee amber regels; geen gedachtestreepje; screenshots op 360, 390 en 412 px.
4. Zoeken op tijd. Sherpa Routes, Opus; Warden Fable.
   - Bestand: `routePlanner.ts` (`missScore`, `fitsDistance`, `tooShort`).
   - Tests: zonder minuten in het doel is elke uitkomst gelijk aan nu; een vlakke lus bij een doel met hoogtemeters wordt langer gezocht; nooit meer dan drie aanroepen; zelfde invoer, zelfde lus.
5. De drie instellingen. Sherpa Instellingen, Opus; Lookout.
   - Bestanden: `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts`, de groepspagina, het model van de instellingen (optionele velden, geen migratie; een onbekende waarde in een back-up valt terug op het advies).
6. De randen. Sherpa Routes, Opus; Warden Fable. Eerst het antwoord van Scout over moeilijke paden.
   - Boven drie uur alleen na een tik, de regel in de bergen, een dag van een tocht zonder lus.
   - Tests: een training van 181 minuten zoekt niet bij het openen; een lus met een punt boven 1.500 m krijgt de regel; een geplaatste tochtdag geeft soort `none`.

Stap 1 tot en met 3 samen zijn al bruikbaar: een wandeling krijgt een lus met een eerlijke tijd. Stap 4 maakt de lus beter, stap 5 en 6 maken hem af.

## Wat dit klaarzet voor de ijktocht

De ijktocht is dezelfde route, dezelfde rugzak en een rustig tempo, elke zes tot acht weken (`docs/onderzoek/Kansen 11 november training.md`, punt 3). Na dit ontwerp is er een bewaarde route met een tijd op je klimtempo. De ijktocht hoeft dan alleen nog een sjabloon en de vergelijking met de vorige keer.

## Wat er niet in zit

Geen nieuwe dienst, geen nieuwe kleur of token, geen wijziging van de ladder of het plan, geen pauzes in de tijd, geen route van A naar B, geen grotere zoekstraal, geen hoogteprofiel als nieuwe grafiek.

## Vragen aan de eigenaar

1. Duur eerst of hoogtemeters eerst als ze botsen? Advies: duur eerst, instelbaar. Zonder antwoord bouwt stap 1 met duur eerst.
2. De wandelladder past op de wandelnorm niet in zijn eigen tijd. Mag de sportwetenschapper de minuten en hoogtemeters van de ladder naast elkaar leggen en een voorstel doen? Advies: ja, als eigen onderzoek; een verandering van de ladder komt daarna als voorstel met Akkoord. Zonder antwoord blijft de ladder zoals hij is en zegt de lus wat past.
3. Herstelwandeling: een lus alleen na een tik? Advies: ja. Zonder antwoord wordt het zo.
