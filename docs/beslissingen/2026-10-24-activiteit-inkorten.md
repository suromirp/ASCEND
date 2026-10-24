# Een activiteit van het horloge inkorten aan het begin en het eind

Datum: 2026-10-24
Status: aangenomen

## Besluit

Een training die van je horloge kwam (de log heeft het id van een activiteit van intervals.icu en getallen in `cardioData` of `outdoorData`) kan in het logblad worden ingekort, zoals in Garmin en Strava: een stuk aan het begin en/of aan het eind gaat eruit. De log neemt dan de getallen van wat overblijft over: de duur, de afstand, de stijging en de daling, de gemiddelde en de hoogste hartslag, en het profiel `detail` (opnieuw gemaakt uit het stuk dat blijft). De oude getallen blijven bewaard in de log zelf, in het optionele veld `SessionLog.trim`, en "Inkorten ongedaan maken" geeft ze exact terug.

Dit is de derde bewuste uitzondering op "een SessionLog is append-only", op uitdrukkelijk verzoek van de eigenaar, naast `2026-10-22-garmin-is-leidend.md` en `2026-10-22-macrofactor-leidend-voor-kracht.md`.

## Reden

De eigenaar liet zijn horloge aanstaan terwijl hij na de training een stuk met de auto reed. Die activiteit vinkt de training af met de getallen van het horloge, dus de autorit telde mee: te veel minuten, te veel kilometers, en een gemiddelde hartslag van iemand die zit. Dat stuurt de weekbelasting, de beenindex en de GR5-meters de verkeerde kant op. Wie het in Garmin of Strava inkort, wil het ook hier kunnen, zonder de training te verwijderen en opnieuw te beginnen.

## Hoe het werkt

Een knop "Inkorten" in het logblad opent een blad. Dat haalt de reeksen van de activiteit op (tijd, afstand, snelheid, hoogte, hartslag; met een grens van 20 seconden en een zichtbare melding bij een fout of zonder koppeling), tekent de snelheid over de tijd met de hoogte gedempt erachter, en heeft twee schuiven voor het begin en het eind in minuten sinds de start (echte `input type=range`, met label en tikdoel van 44 px). Onder de schuiven staan de nieuwe getallen naast de oude ("Tijd 62 naar 48 min"). Met "Inkorten" (de ene gevulde knop) wordt het opgeslagen, met "Annuleren" gebeurt er niets. Daarna staat in het logblad "Ingekort: van 0:05 tot 0:53", de regel met de oude getallen ("Eerst 62 min, 9,8 km, 410 m D+") en "Inkorten ongedaan maken". Ongedaan maken heeft geen koppeling nodig.

De reeksen worden alleen in het geheugen gehouden, nooit bewaard. Het opslaan leest de log vers en schrijft in één transactie, in dezelfde wachtrij als het gelijktrekken met het horloge (`storage/watchAlign.ts#inTurn`), zodat een gevoel dat je intussen invulde nooit door een oudere kopie wordt overschreven. Daarna ververst de app zoals bij Terugzetten (`planRevision`, `refresh`, de weekcontrole), dus weekbelasting, beenindex en GR5-meters volgen vanzelf.

## Hoe de getallen worden gerekend

De getallen van een log komen van het horloge, en de reeksen komen daar nooit precies op uit (de stijging uit de reeks is bijvoorbeeld 120 m waar het horloge 140 m zegt). Daarom wordt de log niet opnieuw uitgerekend uit de reeksen. Het stuk dat wegvalt wordt in de reeksen gemeten en van de getallen afgehaald die de log al heeft (`engine/activityTrim.ts#trimmedNumbers`). Niets inkorten verandert dus niets, en een vlakke autorit haalt vrijwel niets van de stijging af. Voor het meten gelden dezelfde regels als voor het profiel van een loop (`engine/activityDetail.ts`): een sprong in de tijd van meer dan 10 seconden of stilstaan telt niet als beweging, en de hoogte gaat door dezelfde dode band van 5 meter. De gemiddelde en de hoogste hartslag zijn die van wat blijft, over de bewegingstijd.

Een intervalgrens hoort bij het stuk waarin zijn midden valt, zodat wat wegvalt en wat blijft samen precies het geheel zijn.

Alleen velden die de log al had worden vervangen; een inkorting voegt nooit een getal toe. Waar de reeksen niets over kunnen zeggen (geen hoogte, geen hartslag) blijft het veld zoals het was. De stijging van een loopband is een schatting en geen hoogte: die blijft onaangeroerd.

## Wat nooit verandert

Gevoel, inspanning (RPE), pijn, notities, het gewicht van de rugzak, stokken, de cadans en de details van een zware training worden niet gelezen en niet veranderd. Het eindtijdstip `completedAt` blijft staan: niets rekent fijner met het uur dan met de dag, en zo hoeft ongedaan maken er niets mee. Mijlpalen worden door inkorten nooit stil teruggenomen: een mijlpaal die al gehaald was, ook met de autorit erbij, blijft gehaald. Inkorten kan door het afhalen van een stuk ook nooit een nieuwe mijlpaal halen.

Een log die al is ingekort wordt niet nog eens ingekort: eerst ongedaan maken, dan opnieuw knippen. Een log met de hand, een krachtlog en een log zonder getallen krijgen de knop niet.

## Samen met Garmin is leidend

Heeft een log eerst de getallen van het horloge overgenomen (`manualMeasured`) en is hij daarna ingekort, dan neemt "Mijn getallen terugzetten" eerst het inkorten terug en zet daarna je eigen getallen terug (`storage/watchAlign.ts#restoreAlignments`). Je krijgt zo precies de log van voor het gelijktrekken, zonder restant van het inkorten.

## Het voorstel

Bij het openen kijkt `suggestTrim` of aan het begin of het eind een stuk te snel is voor de sport, en zet de schuiven daar vooraf. Er staat dan, in amber: "Vanaf 0:48 ging je ineens 45 km/u: waarschijnlijk de auto." Het is een voorstel: de schuiven staan vrij, en "Alles houden" zet het terug.

- Hardlopen: boven 20 km/u (3:00 per kilometer), minstens 60 seconden.
- Wandelen: boven 15 km/u, minstens 60 seconden.
- Fietsen: boven 60 km/u, minstens 120 seconden.

Verder gelden `FAST_MERGE_GAP_SEC` 120 (twee snelle stukken met minder dan twee minuten ertussen, bij een stoplicht, zijn één autorit), `FAST_EDGE_SEC` 300 (het snelle stuk moet binnen vijf minuten van de rand van de training liggen; een snel stuk in het midden valt niet af te knippen en krijgt geen voorstel), `SLOW_KMH` 5 en `SLOW_LOOK_SEC` 120 (het knippunt ligt waar je voor het laatst stond of liep voor het snelle stuk begon, hooguit twee minuten ervoor) en `KEEP_MIN_SEC` 300 (blijft er minder dan vijf minuten beweging over, dan is er geen voorstel). Een training die helemaal te snel is, krijgt geen voorstel. De drempels staan als constanten bovenaan `engine/activityTrim.ts`. Voor de schuiven wordt het eind naar beneden en het begin naar boven op een hele minuut gezet, zodat de twijfelachtige seconden aan de kant van de auto vallen.

## Instelling

Er is geen instelling bij. Inkorten is een actie die je zelf start en bevestigt, geen keuze die de app voor je maakt; het voorstel is alleen een beginstand van de schuiven en verandert niets zonder jouw tik op "Inkorten". Er is dus niets om te zetten in `settingsIndex`, `settingsLayout` of `settingsSummary`.

## Alternatieven

De training verwijderen en met de hand opnieuw invullen (de getallen van het horloge gaan verloren, en de koppeling met de geplande training). Alleen de duur aanpassen met de hand (afstand, stijging en hartslag blijven die van de autorit). De log opnieuw uitrekenen uit de reeksen (de stijging zou dan 120 m worden waar het horloge 140 m zegt, ook als je niets inkort). Een tweede log naast de eerste (dubbel geteld). Het knippunt kiezen door te slepen in de grafiek (geen toetsenbordbediening; echte schuiven zijn toegankelijk en bruikbaar met één duim).

## Bron

Eigenaar, 24 oktober 2026. Code: `src/engine/activityTrim.ts` (rekenen en voorstel), `src/engine/trimLog.ts` (de log en terugzetten), `src/storage/trim.ts` (reeksen ophalen en opslaan), `src/components/TrimSheet.tsx` en `TrimChart.tsx` (het blad), `src/components/LogDetailSheet.tsx` (de knop en de regel), `src/storage/migrations.ts` (`migrateSessionTrim`, `migrateLogTrim`).

## Opgeslagen vorm

`SessionLog.trim` is optioneel en additief: `{ at, startSec, endSec, totalSec, block, original }`. `original` bevat precies de velden die de inkorting overschreef, zoals ze waren: `durationMinutes`, eventueel `blockDurationMinutes` (alleen als het blok een ander getal had dan de log), `distanceKm`, `elevationGainM`, `elevationLossM`, `avgHeartRate`, `maxHeartRate` (alleen die de log had) en `detail` (het profiel dat vervangen of weggelaten werd; een log zonder profiel krijgt er geen). De log reist heel mee in de back-up, dus het back-upschema (5) blijft hetzelfde. `migrateLogTrim` is een doorgeefstap voor een log zonder het veld en laat bij een beschadigd veld alleen dat veld vallen: de getallen moeten eindig zijn, de minuten en de lengte van de activiteit groter dan nul, de rest niet negatief (een stijging van 0 m is een getal), en wat blijft moet binnen de activiteit liggen. Is alleen het bewaarde profiel beschadigd, dan vervalt ook het profiel van het ingekorte stuk, zodat ongedaan maken nooit het verkeerde profiel terugzet. Een oudere app die zo'n back-up leest, behoudt het veld in de log, maar kan niet terugzetten.

## Vervangt

Niets. Vult `2026-10-22-garmin-is-leidend.md` en `2026-10-22-macrofactor-leidend-voor-kracht.md` aan als derde uitzondering.

## Terugdraaien

Per training: "Inkorten ongedaan maken" in het logblad. Voor de functie zelf: haal de knop uit `LogDetailSheet`; logs die al zijn ingekort houden dan hun regel niet meer, maar `engine/trimLog.ts#undoTrim` en het veld blijven bestaan voor een back-up die ze bevat.
