# Plek: route per training (I-160)

Pathfinder, vooraf, 25 november 2026. Alleen gelezen, niets gebouwd. Bij besluit `docs/beslissingen/2026-11-24-route-per-training.md`.

## 1. Waar kiest hij vooraf een route

Wat er nu is: de Briefing (`src/components/TrainingBriefing.tsx`) heeft het blok Waar train je? met Route voorstellen (`RoutePanel.tsx`, `useRouteSearch.ts`: Simpel en Avontuurlijk, kaart, GPX, Naar Garmin Connect via `routeSend.ts`). Elke Briefing opent met een datum, ook die van een training later in de week, maar de lus wordt nergens bewaard: sluiten en heropenen zoekt opnieuw. De Briefing bereik je vanaf Week via het training-blad (`SessionActionSheet.tsx`, rij Briefing) en vanaf Vandaag via de hoofdknop van `TodayMissionCard.tsx`. Van Week zijn dat drie tikken (training, Briefing, Route voorstellen), van Vandaag twee. Dat is genoeg: er hoort geen nieuw scherm bij.

Advies: de ingang blijft de Briefing van die training, dus één plek en één taal. Er komt geen tweede routeknop op Week of in het training-blad. Wel moet Week laten zien dat er al een route is: op de rij van de training in Week en in het training-blad één stille regel, bijvoorbeeld "Route: Avontuurlijk, 10,2 km, 310 m" (alleen als er een gekozen route is). Zonder die regel weet hij niet dat hij iets klaargezet heeft, en dan is vooraf kiezen zinloos.

Wat er al hetzelfde zegt, en wat ermee gebeurt:
- Routeplanner Simpel en Avontuurlijk blijft de motor; de keuze wordt een tik "Bewaar voor deze training" onder de gekozen lus (vergelijk de oude Bewaar-tik uit `docs/visie/Ontwerp Plekken en routes.md`). Geen automatisch bewaren: de eigenaar kiest.
- Het Route-blok in de Briefing krijgt een tweede stand: staat er een bewaarde route, dan toont het blok die meteen (kaart, kerncijfers, Naar Garmin Connect) zonder zoektocht, met twee knoppen: Andere route zoeken (wijzigen, opent het bestaande zoeken) en Weggooien. Staat er niets, dan is het blok zoals nu.
- De regel `RouteProposalLine` op Vandaag (alleen als er geen Briefing-knop is) leest dezelfde bewaarde route.
- Bewaarde plekken uit `2026-11-11-plekken-en-routes.md` (route per plek) zijn een ander spoor: dat is een bibliotheek, dit besluit zegt bewust geen bibliotheek. Bouw hier alleen route per PlannedSession; laat route per plek liggen en zeg dat in het besluit, anders heeft de app twee soorten bewaarde route.
- Verschuift de training, dan schuift de route mee: hang hem aan `PlannedSession.id` (optioneel veld, bijvoorbeeld `route`, met migratiestap in `src/storage/migrations.ts`, mee in de export). Alles wat een PlannedSession kopieert of vervangt (verplaatsen, ruilen, `catchUp`, `raceBlock`-ruil, `afterGoal`) moet het veld meenemen of bewust laten vallen; dat is de grootste valkuil, toets elk pad. Wordt de training overgeslagen of verwijderd, dan vervalt de route met haar, zonder zin erover.
- Een route is geen log: de geschiedenis blijft append-only. Een afgevinkte training houdt haar route als gelopen route niet nodig; die hoeft na afloop niet bewaard te blijven.

Op de dag zelf: Vandaag toont de hoofdknop Briefing al; daarin staat de route bovenaan het blok, met kaart en Naar Garmin Connect. Voeg op de Vandaag-kaart één stille regel toe als de route klaarstaat ("Route klaar, 10,2 km, 310 m"), zodat hij hem niet hoeft te zoeken. Verandert de afstand of hm van de training sinds het kiezen (nieuwe voortgang, andere minuten), dan zegt het blok één droge regel "De training is veranderd, de route past nog 9,1 van 10 km" en laat de keuze aan hem; nooit stil vervangen.

Wijzigen en weggooien: alleen in het Route-blok van de Briefing (op elke dag, ook vooraf). Geen derde plek.

## 2. Zit Trainingsplekken (/plekken) te diep

Ja. Nu alleen via Instellingen, Gidsen (`GidsenGroup.tsx`, id plekken) en de rij Plekken in de Briefing. Die rij zit onderaan kaart 2 van de Briefing, tussen Voor en na en de stopregels, en heet "Waar kun je dit doen?".

Advies voor één betere ingang, zonder nieuw scherm: laat het Route-blok zelf naar /plekken wijzen op het moment dat het nodig is. Als buiten niet genoeg hoogtemeters geeft, zegt de planner één regel met een tik ("Voor 300 m heb je buiten maar 170 m. Trappen in de buurt: Trainingsplekken") die `spotsPageFor(template.id)` opent, de bestaande functie die de rij in de Briefing al gebruikt. Daarmee staat de ingang op de plek waar de vraag ontstaat. Verplaats de rij Plekken daarnaast niet. De Instellingen-ingang laat je staan.

## 3. Waar komen de nieuwe delen in de flow

Alles in het Route-blok van de Briefing (`RoutePanel.tsx#RoutePanelView`, volgorde van de delen in `src/engine/routeSheet.ts#routeSheetParts`). Planner en voorstellen in `src/engine/routePlanner.ts`; het paneel rekent niets zelf.

- Hoogtemeters halen tegen afstand houden, met de som: komt direct onder de lus als de lus de hoogtemeters mist (nu wint de afstand stil in `composeSimple`). Twee keuzerijen met elk één droge regel, bijvoorbeeld "Langer: 14,4 km, 300 m" en "Bij 10 km: 170 m". Het advies is de optie die de training meest volgt; de som staat erbij ("10 km en 300 m gevraagd, dit geeft 14,4 km en 300 m"). Een tik kiest, daarna zoekt de planner met die keuze. Het doel van de training verandert niet; kiest hij langer, dan is dat zijn keuze voor deze ene training. Verandert dat de geplande minuten of afstand van de PlannedSession, dan is dat een voorstel met Akkoord (zie Warden-punt hieronder).
- De creatieve optie: dezelfde plek, onder de twee keuzes, als derde rij: "Buiten plus trap of loopband" met de verdeling ("6 km buiten, 120 m; daarna 10 keer de trap bij ... voor 180 m"). Gegevens uit `src/engine/trainingSpots.ts` en `src/data/trainingSpots.ts`; de loopband op helling heeft `docs/app-kaart/briefing-loopband-helling.md` al. Dit is een voorstel met uitleg, geen route met GPX voor het deel binnen; alleen het buitenstuk krijgt kaart en Garmin-knop.
- Geen actuele kaart: opnieuw proberen. Er is al een kaartmelding in `routeSheet.ts` (OFFLINE_LINE, TIMEOUT_LINE) en `RouteFailure` in `RoutePanel.tsx` met een opnieuw-knop. Zet "Geen actuele kaart van de omgeving" daar bij, met dezelfde knop Opnieuw proberen, en toon niet meer een heuvel die blind gekozen is zonder dat te zeggen. Houd de tijdsgrens en de zichtbare uitkomst zoals nu (elke knop die wacht).

## 4. Instelling rijtijd naar heuvels

Advies 30 minuten. Het hoort bij de groep Vandaag en meldingen: `src/components/settings/groups/VandaagGroup.tsx`, in het blad Weer en kleding (id bundel-weer, `VandaagSheets.tsx`), naast Heuvels en trappen in de buurt en Je plekken. Verklaring in `src/engine/settingsDefs/vandaag.ts` (nieuw id, bijvoorbeeld `rijtijd-heuvels`, `place: { in: 'bundel-weer' }`, `showWhen: [B.route]`), waarde in `src/engine/settingsSummary.ts`. Keuzes bijvoorbeeld 15, 30 (advies), 45 minuten, Geen grens; één zin: "Hoe ver je voor een echte heuvel wilt rijden vanaf Thuis; hemelsbreed geschat." Let op: `order.ts` is gegenereerd en een pagina mag hoogstens twaalf rijen hebben; het bundelblad is de plek, niet de hoofdpagina. In `places.ts` bestaat `suggestPlace(..., maxKm)` met een afstand in kilometers; de rijtijd moet daarvoor omgezet worden met de bestaande schatting in `trainingSpots.ts` (CAR_KMH 65, route-factor 1,3), niet met een tweede formule.

## Wat ik niet kon zien, en risico's

- Niets uitgevoerd; geen echte kaartdiensten aangeroepen en niet met de back-up van de eigenaar nagespeeld (dat is eerst naspelen, skill `naspelen`, zijn eigen stap). Het getal van 3 tikken is uit de code gelezen, niet uitgeklikt.
- Warden, planner: "Het doel blijft het doel". Langer dan de training vraagt mag alleen op zijn tik, per training, en wat de geplande minuten van de PlannedSession verandert is een voorstel met Akkoord. `planGolden.test.ts` (scenario A en C) beweegt niet. De vingerafdruk van het horloge verandert als de afstand van de training verandert; toets dat met de getallen in het besluit.
- De opgeslagen route is een spoor van punten: het besluit van 9 november bewaarde bewust geen spoor. Bewaar alleen de punten van de gekozen lus (en bij voorkeur sterk uitgedund), houd het klein in de back-up, en laat de oude regel "het spoor van een run bewaren" (werkbriefje lopen-en-tests, Nooit) ongemoeid: dat gaat over de gelopen run, dit over de geplande lus. Zeg dat in het besluit.
- De kaart (OpenFreeMap) en de heuvels (OpenStreetMap) kan hij op de dag zelf niet bij gebrek aan netwerk: een bewaarde route moet daarom zonder zoektocht tonen (alleen de kaarttegels kunnen ontbreken).
- Werkbriefje `lopen-en-tests` Nooit-punt over `planGolden.test.ts` en `routeTarget.test.ts` (toStrictEqual) blijft gelden.
