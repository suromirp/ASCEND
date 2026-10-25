# Correcties uit intervals.icu volgen in de log

Datum: 2026-10-25
Status: aangenomen

## Besluit

Corrigeert de eigenaar een activiteit in intervals.icu (een stuk eraf, de hoogtemeters of de afstand aangepast), dan neemt de log in ASCEND die gemeten getallen over, als de log aan die activiteit gekoppeld is. Het gaat om de getallen die ASCEND al uit een activiteit overneemt: duur, afstand, stijging, daling, gemiddelde en hoogste hartslag en cadans. Het vermogen hoort er niet bij, want ASCEND neemt het niet uit een activiteit over. De oude getallen blijven bewaard in de log zelf, in het optionele veld `SessionLog.sourceSync`, en het logblad zet ze met "Vorige getallen terugzetten" terug.

Dit is de vierde bewuste uitzondering op "een SessionLog is append-only", van dezelfde soort als de andere drie (`2026-10-22-garmin-is-leidend.md`, `2026-10-22-macrofactor-leidend-voor-kracht.md`, `2026-10-24-activiteit-inkorten.md`): alleen gemeten getallen van de bron, de oude bewaard en terug te zetten.

## Reden

Nu wordt een log die aan een activiteit gekoppeld is nooit meer aangeraakt na het koppelen. Wie in intervals.icu een autorit van het eind knipt, ziet in ASCEND nog de oude, te lange training, met een weekbelasting en beenindex die er niet bij horen. De eigenaar wil dat het bijwerkt, mits dat betrouwbaar kan.

## Hoe een correctie wordt herkend

ASCEND leest uit de lijst met activiteiten van intervals.icu geen tijdstip van laatste wijziging, en in deze omgeving is geen echte koppeling om te zien of de lijst er een geeft. Een extra verzoek per activiteit willen we ook niet. Dus worden de getallen zelf vergeleken, met een vingerafdruk. Bij het koppelen (een activiteit die als log wordt opgeslagen, of een met de hand gemaakte log die de getallen van het horloge overneemt) bewaart de log in `sourceSync.seen` de getallen die de bron toen gaf, op dezelfde manier afgerond als de log zelf. Bij elke gewone ophaalronde (de laatste 7 dagen, hooguit elke 15 minuten, zonder extra verzoeken) wordt per gekoppelde log de activiteit uit dezelfde lijst naast die vingerafdruk gelegd.

Een getal is een correctie als het van de bron verschilt van de vingerafdruk, op de precisie die de gebruiker ziet (afstand op 0,1 km, de rest op hele getallen). Een verschil tussen de log en de bron zonder verschil met de vingerafdruk is iets wat ASCEND zelf deed (een inkorting, een eigen getal teruggezet) en blijft staan. Daardoor wordt een inkorting in ASCEND nooit teruggedraaid door een ophaalronde.

Verder:

- Een getal dat de bron niet meer heeft wordt nooit weggehaald. Een veld dat erbij komt (hartslag die later wordt toegevoegd) komt wel in de log.
- De stijging en daling van een loopband of een schatting is geen hoogte en wordt niet gevolgd.
- Een tweede ronde zonder wijziging schrijft niets (de vingerafdruk is dan al bijgewerkt).
- Een log van voor dit besluit heeft geen vingerafdruk. Bij de eerste ronde krijgt hij er een met de getallen van dat moment en verandert er niets. Wat daarvoor in intervals.icu is aangepast wordt dus niet gevonden; ASCEND raadt niet.
- Een activiteit die in intervals.icu is verwijderd staat niet meer in de lijst: de log blijft ongemoeid, er wordt niets verwijderd. Hetzelfde geldt voor een activiteit ouder dan de 7 dagen van de ophaalronde: een correctie die later komt wordt niet gezien.
- Alleen logs met het id van een activiteit van intervals.icu en getallen in `cardioData` of `outdoorData`. Krachtlogs, logs met de hand gemaakt zonder horloge en logs van MacroFactor worden niet aangeraakt.

## Wat nooit verandert

Wat de eigenaar in ASCEND zelf invulde: zwaarte, gevoel, notities, pijn, herhalingen en hartslag van de workout, rugzakgewicht, stokken, krachtsets, de koppeling aan de geplande training. Die velden worden niet gelezen. Ook de mijlpalen blijven zoals ze waren: een gecorrigeerd getal wist of haalt er niets. Het profiel (`detail`) van een loop wordt niet opnieuw gemaakt, want dat vraagt de reeksen op en dus extra verzoeken; het volgt de correctie dus niet.

## Met de hand gemaakt en daarna overgenomen (`manualMeasured`)

De horlogegetallen worden bijgewerkt zoals bij elke andere gekoppelde log, en `manualMeasured` blijft precies zoals het was, zodat "Mijn getallen terugzetten" de eigen getallen van de eigenaar blijft teruggeven. Terugzetten haalt ook `sourceSync` weg, want de log is dan weer een log met de hand en volgt geen bron meer.

## Ingekort in ASCEND (`trim`)

Gekozen: niet automatisch overschrijven. De inkorting is berekend uit de reeksen van de oude activiteit en past niet meer als de bron veranderde, en ASCEND kan hem zonder extra verzoeken niet opnieuw berekenen. De nieuwe getallen komen in `sourceSync.offered` en de vingerafdruk schuift mee. Het logblad toont dan een korte regel ("In intervals.icu staat nu anders: ...") met de tekstknop "Cijfers overnemen". Die haalt eerst de inkorting weg (met `undoTrim`, dus de getallen van voor de inkorting) en schrijft dan de aangeboden getallen, met de getallen van daarvoor bewaard in `sourceSync.updated`. De inkorting vervalt daarmee; de eigenaar kan opnieuw inkorten. Doet de eigenaar zelf "Inkorten ongedaan maken", dan wordt wat was aangeboden bij de volgende ronde vanzelf overgenomen.

Het alternatief, de nieuwe brongetallen in `trim.original` zetten zodat ongedaan maken de gecorrigeerde getallen teruggeeft, is eenvoudiger maar laat het scherm de oude, ingekorte getallen houden terwijl de eigenaar juist iets corrigeerde. Dat is niet wat hij verwacht en het is stil. Daarom de aanbieding.

## Hoe het wordt weggeschreven

- Per vervangen getal bewaart `sourceSync.updated.previous` de vorige waarde (`null` als het veld er niet was). "Vorige getallen terugzetten" zet precies die velden terug en laat de vingerafdruk staan, zodat dezelfde correctie niet bij de volgende ronde terugkomt. Is de log intussen ingekort, dan staat de knop er niet; eerst "Inkorten ongedaan maken".
- Alles loopt door dezelfde wachtrij als gelijktrekken en inkorten (`inTurn`, nu in `storage/turn.ts`) en schrijft in één transactie met een verse lezing van de logs, zoals `storage/trim.ts`, zodat een gevoel dat je intussen invulde nooit door een oudere kopie wordt overschreven.
- De knoppen in het logblad hebben een grens van 15 seconden (`withTimeout`) en melden de uitkomst.
- Een fout bij het bijwerken breekt de ophaalronde niet af en laat de logs zoals ze waren; de volgende ronde kijkt opnieuw.

## Instelling

"Correcties uit intervals.icu overnemen" in de groep Koppelingen, standaard aan, met één zin uitleg. Uit: er wordt niets bijgewerkt en de vingerafdruk blijft staan waar hij stond, zodat bij weer aanzetten alles wat intussen veranderde wordt overgenomen. De schakelaar is een apparaatvoorkeur bij de koppeling (`WatchActivityState.takeCorrections`) en gaat niet mee in een back-up.

## Opslag en back-up

Nieuw optioneel veld `SessionLog.sourceSync`. Het is additief en elke log reist heel mee, dus het back-upschema blijft 5 (zoals bij `trim`, `migrateSessionTrim`); er is geen nieuw schemanummer. `migrateSourceSync` en `migrateLogSourceSync` in `storage/migrations.ts` lezen het veld bij het importeren: een back-up van voor dit besluit heeft het niet en wordt zoals hij was gelezen, een veld dat beschadigd is verliest alleen het beschadigde deel (een vingerafdruk die niet te lezen is wordt bij de volgende ronde opnieuw gemaakt, een bewaarde oude waarde die niet klopt wordt weggelaten omdat terugzetten daaruit onzin zou schrijven) en de log houdt al het andere.

## Alternatieven

- Elke ophaalronde de logs vergelijken met de bron zonder vingerafdruk: dan kan ASCEND een eigen wijziging (inkorten, handgetal) niet van een correctie onderscheiden en zou die steeds terugdraaien.
- Per activiteit een extra verzoek om een tijdstip van wijziging te lezen: extra verzoeken, en het veld is niet beloofd.
- Een vingerafdruk als één tekenreeks: dat zegt wel dát iets veranderde, maar niet welke velden. Met de getallen zelf is per veld te zien wat een correctie is.

## Bron

Verzoek van de eigenaar, 25 oktober 2026. `2026-10-22-garmin-is-leidend.md`, `2026-10-24-activiteit-inkorten.md`, `2026-10-22-intervals-icu.md`.

## Vervangt

Niets. Het vult `2026-10-22-garmin-is-leidend.md` aan, waar een log na het koppelen niet meer werd aangeraakt.

## Terugdraaien

Zet de schakelaar uit. Het veld `sourceSync` blijft dan als stille vingerafdruk staan en doet niets. Per log zet "Vorige getallen terugzetten" de getallen van voor de laatste update terug.
