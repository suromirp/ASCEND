# Hoogtemeters van een loop en vroeg ziek zien, scherper

Datum: 2026-11-23
Status: aangenomen

## Besluit

Hoogtemeters (I-77 en I-33): een loop heeft één getal voor zijn stijging, overal hetzelfde: het getal op het log (van het horloge), tenzij dat niet te geloven is, en dan de eigen telling uit de reeks. Run in detail schaalt de km, rondes en beste 5 km naar dat totaal, alleen om te tonen; de oordelen op dat scherm lezen de opgeslagen km. De regel van een log in het Logboek noemt hetzelfde getal. Totalen over meer logs (de maand en per sport in het Logboek, de week) tellen het getal op het log op en vallen niet onder deze regel. De bodem van 20 m blijft zoals hij is.

Vroeg ziek zien (I-78): een ochtend zonder nacht telt niet en breekt de reeks niet, en zijn rusthartslag blijft uit het gemiddelde van dit signaal. Na een gewone nacht is één duidelijke ochtend genoeg, instelbaar en standaard aan.

## Reden

Naspelen met een back-up (alleen gelezen, niets daaruit in de repo):

- Twee getallen voor één loop. De samenvatting van het horloge op het log en de eigen telling uit de reeks lagen bij een lange loop ruim een derde uit elkaar. De oorzaak is niet de reeks zelf: de km waren opgeslagen voor 12 november, met de oude dode band die elke klim te laag telde. Dezelfde reeks met de teller van nu komt binnen 10 procent van het horloge. Het logblad en afronden noemden het getal van het horloge, Run in detail telde de km op (de kop Stijging, de km, de rondes). Afronden zelf las al het horloge; het lagere getal kwam alleen uit Run in detail.
- De regel. `engine/runClimb.ts#runClimb` geeft het getal van het log als `watchClimbTrusted` ja zegt. Dat is dezelfde toets die de vergelijking met eerdere lopen al gebruikte: een 0 telt niet, een eigen telling ver boven het horloge (met het merk van nu, buiten 60 tot 140 procent en minstens 20 m verschil) ook niet, en bij een oude telling zegt alleen een te hoge overeenkomst iets. Anders de eigen telling: eerst de km van Run in detail, dan het profiel. Het logblad, afronden, Run in detail en de regel van een log in het Logboek (`climbOfLine`) lezen `runClimb`. Totaal en de som van de km liggen daarna nooit meer dan 10 procent uit elkaar (toets in `runClimb.test.ts`).
- Waarom schalen en niet een zin. De km van een oud log tellen tot een factor 8 te laag; een zin "de km komen uit de reeks" laat dan nog steeds twee getallen naast elkaar staan. Schalen houdt de verhouding tussen de km en laat de opgeslagen km ongemoeid (historie). Regels met een grens op eigen stijging (vlak bij zone 2, te heuvelachtig voor een oordeel) lezen het opgeslagen veld met zijn merk, nooit de geschaalde kopie. Op Run in detail krijgen het oordeel, de patronen, het advies, de vergelijking en de vorm daarom de opgeslagen km (`runDetailViews`: `shown` voor het scherm, `rules` voor de oordelen); met de geschaalde km viel bij een oud log het oordeel weg.
- Totalen. De maand en de sporten in het Logboek en de weekterugblik tellen het getal op het log op. Dat is het eenvoudigste dat klopt: bij een log van het horloge is dat getal vrijwel altijd het getal dat `runClimb` ook kiest; alleen een log met een 0 of een ongeloofwaardig getal telt in een totaal anders dan in zijn eigen regel.
- De bodem van 20 m. Vijf vlakke lopen en een heuvelloop met de teller van nu tegen het horloge: de grootste afwijking op een vlakke loop was 15 m bij 160 procent, dus binnen de bodem. Geen enkele loop verloor zijn horlogegetal en daarmee zijn vergelijkbare lopen; zonder bodem had er één zijn getal verloren. Een bodem in meters per km is daarom niet nodig. Erbij: `aerobicTrend#climbPerKm` gaf 0 door als het horloge geen getal had, zodat zo'n loop als vlak telde; nu telt dan de eigen optelling. De bodem heeft daar nu een test die faalt als hij weg is.
- Vroeg ziek zien. Rond een verkoudheid sloeg de regel niet aan, en in de weken ervoor en erna ook nooit vals. Drie oorzaken. Ten eerste: ongeveer een op de drie ochtenden had geen slaap en geen HRV, alleen een rusthartslag. Het horloge lag die nacht af, dus komt die rusthartslag van overdag; hij lag steeds 4 tot 7 slagen boven de andere. Zulke ochtenden braken elke reeks en trokken het gemiddelde ongeveer een slag omhoog. Ten tweede was de verkoudheid in de getallen mild: de rusthartslag lag maar een paar slagen hoger. De enige ochtend met een lage HRV kwam na een korte nacht die als Niet goed gemeten was aangemerkt. Ten derde vroeg de regel twee ochtenden op rij met beide signalen.
- Wat scherper werd. Een ochtend zonder nacht wordt overgeslagen en zijn rusthartslag telt niet in het gemiddelde. Eén ochtend is genoeg als beide signalen afwijken na een nacht van minstens 6 uur die meetelt. Een korte nacht verklaart een hoge rusthartslag en een lage HRV vaak al. In dezelfde weken lag een lage HRV na een gewone nacht alleen in en vlak na de verkoudheid. Valse meldingen in de rustige periode (alle dagen buiten de verkoudheid): voor 0, na 0. Treffers in de verkoudheid: voor 0, na 1 (een ochtend met een gewone nacht en beide signalen duidelijk). Ook zonder de oordelen Niet goed gemeten bleef het bij 0 vals en 1 treffer. Eerder dan dat zegt deze data niets wat van een gewone dag te onderscheiden is.
- De dubbele ochtenden (twee bronnen op één dag, één zonder HRV) raken de gemiddelden niet: per dag telt één waarde.
- Het signaal blijft een vraag op Vandaag, plant niets en is met Vroeg ziek zien helemaal uit te zetten. Eén duidelijke ochtend heeft een eigen schakelaar (`illnessSignsOneMorning`). Uit betekent: weer twee ochtenden op rij.

## Alternatieven

- De km laten zoals ze zijn en zeggen dat ze uit de reeks komen. Niet gekozen: twee getallen blijven zichtbaar, en het verschil is bij oude logs groot.
- De km opnieuw tellen en opslaan met de teller van nu. Niet gekozen: `runDetail` is afgeleid en append-only.
- Altijd de eigen telling als totaal. Niet gekozen: tussen logs vergelijken we al op het getal van het horloge, en de oude telling was te laag.
- Een lagere stijging van de rusthartslag (3 slagen). Niet gekozen: dan vraagt de app ook op gewone dagen na een late training of een glas. De slaapduur als ruisfilter doet hetzelfde werk zonder die valse meldingen.
- `avgSleepingHR` en ademhaling van intervals.icu als extra signaal. Nog niet: ze staan niet in de opgeslagen ochtenden en zijn op dit horloge niet nagegaan. Eerst een Scout (backlog I-78, tweede deel).

## Bron

Backlog I-77, I-33 en I-78. `docs/onderzoek/Kansen met gegevens.md` (kans B). `docs/onderzoek/Hoogtemeters met precisie.md`. Naspelen met de skill `naspelen` op een back-up van de eigenaar, met zijn toestemming, alleen gelezen.

## Vervangt

Niets. Vult `2026-11-14-hoogtemeters-na-stap-1.md` (de bodem) en `2026-11-20-niet-goed-gemeten-rest.md` (de regel van Vroeg ziek zien) aan.

## Terugdraaien

Hoogtemeters: laat het logblad en afronden weer `elevationGainM` lezen en laat `RunDetailScreen.tsx` en het Logboek de ongeschaalde km en het getal op het log lezen; niets in de opslag veranderde. Vroeg ziek zien: zet Eén duidelijke ochtend uit (per gebruiker), of verwijder in `illnessSigns.ts` de tak voor één ochtend en de regel voor een ochtend zonder nacht.
