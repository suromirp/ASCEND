# Route voorstellen legt uit wat er gebeurde

Datum: 2026-11-10
Status: aangenomen

## Besluit

Na het zoeken zegt het paneel Route voorstellen in één regel wat er op de kaart lag: hoeveel hellingen in de buurt en de hoogste. Haalt geen lus de hoogte, dan staat erbij waar je die anders haalt: een trap, een brug of de loopband op helling. Een lus die korter is dan de training zegt hoeveel korter, en dat tot 12 procent verschil goed genoeg is. Onder de knoppen van een lus staat nog maar één regel: eerst wat je doet, na een tik de uitkomst op dezelfde plek.

## Reden

De eigenaar opende Route voorstellen bij een training van 10,5 km met 300 hoogtemeters. Het voorstel was 9,6 km en vrijwel vlak, en Simpel zei alleen "Geen helling gevonden die bij je training past". Zijn vraag was waarom. Het paneel was een black box: het zei niet wat er in de buurt lag, niet waarom een kortere lus goed genoeg was, en niet wat je dan wel doet.

Hoe het werkt:

- De engine telt de hellingen waar de planner mee werkt (`terrainFound`, dezelfde grens van 10 m als `usableHill`) en geeft dat mee op `RoutePlans.found`. Het is geen opgeslagen vorm: het bestaat alleen in het geheugen zolang het paneel open is. Er gaat geen extra aanroep de deur uit; de telling komt uit wat de kaart al gaf.
- De tekst staat in `engine/routePlanner.ts#searchLines`; het paneel zet hem in de regel die na het zoeken leeg was. Zo komt er geen nieuw element bij.
- De vervanger bij te weinig hoogte gebruikt de woorden die de app al kent ("loopband op helling", trap, en de bruggen bij Trainingsplekken). Het is alleen tekst: het paneel plant niets.
- De korter-zin leest het getal uit `CLOSE_ENOUGH`, de grens waarop de planner stopt met zoeken. Korter telt op de getallen die je ziet (op 100 m), dus 10,5 km tegen 10,5 km krijgt geen zin.
- Onder de knoppen: gemeten op 390 px stond de uitleg op twee regels (33 px) en daaronder een lege statusregel van 34 px, samen 67 px met twee losse regels. Nu is het één regel met plaats voor drie (50 px). Na Gedeeld of Gedownload blijven de knoppen eronder op dezelfde plek (gemeten op 360 en 390 px). Na opslaan of downloaden staat de stap naar Garmin Connect erachter, omdat de uitleg dan van zijn plek gaat.

## Eigen keuzes buiten de opdracht

- De uitleg staat alleen bij een training met hoogtemeters (vanaf 20 m). Bij een vlakke training zeggen hellingen niets.
- Antwoordde de routeplanner niet (geen netwerk, te laat of een fout) en is er geen lus, dan staat er geen telling en geen vervanger; de bestaande rustige regel blijft alleen. Antwoordde de kaart niet, dan staat er geen telling, ook geen nul, maar wel de vervanger als de lus de hoogte niet haalt.
- De regel zegt "op de kaart": Simpel kan zijn helling ook uit de avontuurlijke lus halen, en dan zou "geen helling in de buurt" naast een helling staan.
- De grens voor "Korter dan de 10,5 km van je training" ging van 15 procent naar de 12 procent van `CLOSE_ENOUGH`, zodat de twee zinnen op elkaar aansluiten. Bij langer bleef 15 procent staan.
- De drempel voor "Minder dan de hoogtemeters" (75 procent) heet nu `SHORT_ASCENT` en bepaalt ook wanneer de vervanger verschijnt; de waarde is niet veranderd.
- De teksten na opslaan en downloaden verhuisden van het paneel naar `engine/routeSend.ts#routeActionLine`; de woorden zijn gelijk gebleven.
- Geen instelling: de uitleg is vaste tekst en maakt geen keuze voor de gebruiker.

## Alternatieven

- De uitleg achter de i zetten. Niet gekozen: de vraag was waarom het voorstel zo is, en dat hoort bij de uitkomst op het scherm.
- De vervanger als knop of als voorstel om de training te veranderen. Niet gekozen: het paneel plant niets.
- Uitleg en uitkomst onder de knoppen als één doorlopende zin. Niet gekozen: na Gedeeld herhaalde de zin zichzelf ("sla de lus op als koers" twee keer).

## Bron

De vraag van de eigenaar in de Inbox van `docs/backlog.md` (10 november), `docs/beslissingen/2026-11-09-routeplanner.md`, `docs/beslissingen/2026-11-10-route-naar-garmin-connect.md`, de stemgids `docs/beslissingen/2026-11-09-stem-van-ascend.md`.

## Vervangt

Niets. Uit het besluit over Garmin Connect vervalt alleen dat de uitleg en de uitkomst als twee regels onder elkaar staan.

## Terugdraaien

`searchLines` niet meer aanroepen in `RoutePanel.tsx` (de regel is dan weer leeg) en in `proposalNotes` de korter-zin weghalen en 0.85 terugzetten. Voor de regel onder de knoppen: de commit van deze wijziging terugdraaien in `RoutePanel.tsx` en `routeSend.ts`. Er is geen opgeslagen vorm om op te ruimen.

## Na de review (10 november)

- De vervangzin zegt nu "Hoogtemeters bergop": een loopband traint alleen bergop (`FLAT_COUNTRY_TIPS`), dus bij een training met afdalen beloofde de oude zin te veel. De woorden komen uit `modalities.ts` ("loopband op helling") en de tips bij plekken in `trainingSpots.ts` (bruggen); niet uit "Geen heuvel in de buurt".
- De hoogte in de telling is hoeveel hoger dan je plek (`heightM`), dus de zin zegt "boven je plek". Een helling zonder bekende hoogte telt mee in het aantal maar niet voor de hoogste.
- "Tot 12 procent verschil is goed genoeg" gaat alleen over afstand; Simpel weegt bij het stoppen ook de hoogte mee (`missScore`).
