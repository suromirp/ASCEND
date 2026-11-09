# De tekst voor Strava zegt wat voor training het was

Datum: 2026-11-09
Status: aangenomen

## Besluit

De tekst voor Strava is een titel die zegt wat voor training het was, met hooguit één regel waarom en daaronder een lege regel voor je eigen tekst. Afstand, totale tijd en tempo staan er nooit in, want die toont Strava al.

Voorbeelden van de titel: "Zone 2 · rustige duurloop", "Heuvelintervallen · 6 × 90 s", "Lange duurloop · 300 hoogtemeters", "Rugzakwandeling · 210 hoogtemeters · rugzak 9 kg", "Kracht · bovenlichaam A". De regel waarom zegt waar de training in je planning staat en waar je heen werkt: "Week 3 van de basis, richting GR5", "Rustweek van de opbouw, richting GR5", "Week 2 van de golf".

Bij een gedane training (in het logblad en in de vraag erna op Vandaag) staat de tekst leesbaar onder "Voor Strava", met twee knoppen: Titel kopiëren (precies de titel, voor het titelveld van Strava) en Titel en regel kopiëren (titel, regel en een lege regel, voor de beschrijving).

Instelbaar: de schakelaar Tekst voor Strava (aan als standaard) en de keuze Wat erin staat: Titel en regel (het advies en de standaard) of Alleen de titel. Beide staan in het blad Tekst voor Strava bij Koppelingen. Het veld `AppSettings.stravaTextParts` is optioneel en zonder waarde titel en regel, dus het schemanummer van de back-up verandert niet; een onbekende waarde in een back-up valt weg (`storage/backupClean.ts`).

De logica staat in `engine/activityText.ts` (`stravaText`, `stravaCopyText`, `stravaGoalName`, `resolveStravaTextParts`); `components/StravaTextButton.tsx` rendert alleen.

## Reden

De eigenaar noemde de oude tekst vrijwel nutteloos: hij herhaalde afstand, tijd en stijging, die Strava zelf al laat zien. Wat hij zelf in Strava schrijft is het soort training en daarna een eigen stukje. De nieuwe tekst zet precies dat eerste deel klaar en laat de rest aan hem.

## Keuzes van de bouwer

- Hoogtemeters staan alleen in de titel als ze gemeten zijn (geen schatting van de loopband) en minstens 50 m zijn, afgerond op tientallen. Strava toont de stijging ook, maar bij een lange duurloop of tocht zegt ze wat voor training het was; zo stond het ook in het voorbeeld van de wens.
- De lengte van één herhaling ("6 × 90 s") staat erin: dat is de opbouw van de training, niet de totale tijd.
- Herhalingen uit het plan en de regel waarom staan er alleen bij een training uit je planning. Een losse activiteit heet naar zijn sport en heeft geen regel; dan is er ook maar één knop.
- De regel telt de week binnen de fase, zoals Vandaag en Stand. In een golf zonder doel telt de week binnen de golf. De rustweek heet rustweek, tenzij je hem doortraint.
- "richting" noemt je actieve hoofddoel met het deel van de naam voor een schuine streep ("GR5 / ALPENKLAAR" wordt "GR5"). Zonder actief hoofddoel valt dat deel weg.
- De twee rijen staan samen in een blad achter één rij op de pagina Koppelingen, omdat die pagina op haar plafond van twaalf rijen zit.
- De knoppen zijn gedempt en niet mint: de kaart en het blad waar ze in staan hebben hun mint accent al.
- `spanText` schrijft nu "s" in plaats van "sec", zoals de trainingsuitleg ("6 × 20 s").

## Alternatieven

De oude tekst houden en de getallen instelbaar maken: dan blijft de standaard iets wat de eigenaar niet gebruikt. De gemeten getallen als derde keuze aanbieden: Strava toont ze al, en een keuze die niemand kiest is ruis. Eén knop die de keuze uit de instelling kopieert: de titel en de beschrijving zijn in Strava twee velden, dus twee knoppen sparen een keer wissen.

## Bron

De wens van de eigenaar van 9 november in de Inbox van `docs/backlog.md`, met het advies van de coördinator. De stem: `docs/beslissingen/2026-11-09-stem-van-ascend.md`.

## Vervangt

Het deel over de tekst voor Strava in `docs/beslissingen/2026-10-24-namen-en-strava-tekst.md`. De namen van de trainingen uit dat besluit blijven gelden. Dat besluit wordt niet herschreven.

## Terugdraaien

Zet `engine/activityText.ts`, `components/StravaTextButton.tsx` en de test terug naar de commit voor dit besluit en haal `stravaTextParts`, de keuze `stravaInhoud` en de rij `strava-tekst-inhoud` weg uit de instellingen. Een opgeslagen `stravaTextParts` doet dan niets meer.
