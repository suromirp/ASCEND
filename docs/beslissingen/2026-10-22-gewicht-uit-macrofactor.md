# Gewicht uit MacroFactor, niet uit Garmin

Datum: 2026-10-22
Status: aangenomen

## Besluit

Het lichaamsgewicht komt nooit uit Garmin. Het komt uit een MacroFactor-export (CSV), via dezelfde twee ingangen als de krachttrainingen: Delen met ASCEND en Kies bestand. ASCEND ziet aan de kolommen zelf of het bestand trainingen of gewicht bevat. Is er een trendgewicht, dan rekent ASCEND daarmee; anders met het weegschaalgewicht. Wat je zelf op dezelfde dag invulde wordt niet overschreven, tenzij je dat kiest. Een schakelaar op de MacroFactor-pagina ("Gewicht uit MacroFactor gebruiken", standaard aan) laat de app het gewicht negeren zonder het te wissen.

## Reden

De eigenaar gebruikt gewicht niet in Garmin en volgt zijn trend in MacroFactor. Twee keer per maand een getal intikken is precies het handwerk dat de koppelingen moeten wegnemen.

Waarom het trendgewicht: het is MacroFactors eigen afgevlakte gewicht, het getal waar de gebruiker zelf naar kijkt. Eén weging schommelt met water, zout en het tijdstip. ASCEND gebruikt gewicht alleen om een rugzak in verhouding tot een lichaam te zetten (rugzakaandeel, beenindex), en daar is een rustig getal juist wat je wilt. Heeft een export alleen een weegschaalgewicht, dan wordt dat gebruikt, en de app zegt erbij dat het de weging zelf is.

Wat er bekend is over het bestand, en wat niet. De helpcentrumpagina "Export Your Data" zegt dat de Quick Export één spreadsheet geeft met onder meer gewichtstrend en weegschaalgewicht, en dat de Granular Export ook gewicht kan bevatten. Welke bestandsvorm en welke kolomnamen dat precies zijn, staat nergens gepubliceerd. Een derde partij beschrijft de Quick Export als xlsx met een blad "Scale Weight". Daarom leest ASCEND op kolomnaam, zonder hoofdletters, in het Engels of Nederlands, met een eenheid in de kop ("(kg)", "(lbs)") als eenheid. Herkend worden onder meer: datum (Date, Datum), trendgewicht (Trend Weight, Weight Trend, Trendgewicht) en weegschaalgewicht (Scale Weight, Weight, Gewicht). Ontbreekt de datum, of staat er geen gewichtskolom in, dan staat er een Nederlandse melding met de kolommen die ASCEND wel vond. Dit is niet getest tegen een echt bestand van MacroFactor: de testbestanden zijn nagemaakt. Zodra de eigenaar een echte export heeft, moet dat de herkenning bevestigen.

Een xlsx-bestand (de Quick Export) leest ASCEND niet. Een xlsx is een zipbestand en lezen vraagt een extra bibliotheek, en de bestandsvorm van de Granular Export is niet bevestigd. De app herkent zo'n bestand en legt in het Nederlands uit wat te doen: de Granular Export met gewicht kiezen, of het bestand in Excel of Google Sheets als CSV bewaren.

Waar het wordt opgeslagen. In `AppSettings.weightEntries`, de bestaande lijst, die al een `source` heeft. Daar is dus geen nieuw veld voor de bron nodig. Twee optionele velden zijn erbij gekomen op `WeightEntry`: `basis` ('trend' of 'scale', welk getal in `kg` staat) en `scaleKg` (de weging van die dag, als het trendgewicht is gebruikt). Beide zijn optioneel en alleen toegevoegd, dus oudere instellingen en back-ups lezen als voorheen en er is geen nieuwe schemastap nodig, in lijn met de andere optionele instellingen. De back-upcontrole (`storage/backup.ts`) laat een ongeldige `basis` of `scaleKg` vallen in plaats van half op te slaan. Het gewicht gaat dus mee in de export, in tegenstelling tot de koppeling met Garmin, omdat het een meting van de gebruiker is en geen kopie van andermans gegevens.

Niets overschrijven. Een dag waarop de gebruiker zelf een ander gewicht invulde (verschil van minstens 0,05 kg) blijft staan. De import laat zien om hoeveel dagen het gaat en biedt "MacroFactor gebruiken" aan; "Begrepen" laat het zoals het is. Dagen die al uit MacroFactor kwamen worden wel ververst. Een eigen gewicht dat nieuwer is dan het bestand blijft het gewicht dat telt (de nieuwste datum wint).

Hoeveel er wordt bewaard. Een import houdt de laatste 120 dagen van het bestand. Eerdere MacroFactor-dagen die meer dan een jaar ouder zijn dan de nieuwste dag van het bestand verdwijnen bij de volgende import. Eigen invoer wordt nooit weggehaald.

Op Vandaag verdwijnt de gewichtsregel zodra er een MacroFactor-gewicht van de laatste 14 dagen is (de regel kwam al alleen als er iets te vragen viel). Bij Instellingen staat dan "Gewicht komt uit MacroFactor (bijgewerkt op ...)" met het trendgewicht en de weging, een knop "Nieuwe export inlezen" en de keuze "Zelf invullen". Is het MacroFactor-gewicht ouder dan 14 dagen, dan vraagt de app weer om een gewicht en wijst naar de import.

Eén gewicht voor alles. De planner (`state/AppDataContext.tsx`), de Benen-kaart (`LegFatigueCard`) en het rugzakaandeel (`GoalTripNotes`, `GoalRouteEditor`) lezen het gewicht nu allemaal via `engine/bodyWeight.ts` (`currentBodyKg`, `weightsInUse`), zodat de schakelaar overal telt en planner en kaart hetzelfde getal houden.

## Alternatieven

Alleen het weegschaalgewicht gebruiken: onrustiger, en niet wat de gebruiker in MacroFactor volgt. Een xlsx-lezer inbouwen: een extra bibliotheek voor een bestandsvorm die niet bevestigd is, en de gebruiker krijgt nu een duidelijke uitleg. Het gewicht uit Garmin of Health Connect halen: de gebruiker weegt niet via Garmin, en een webapp kan niet bij Health Connect. Een eigen bronveld per getal: de bestaande `source` volstaat. Een nieuwe back-upschemastap: niet nodig voor twee optionele velden.

## Bron

Gesprek met de eigenaar (22 oktober 2026). MacroFactor-helpcentrum, "Export Your Data" (https://help.macrofactorapp.com/en/articles/68-export-your-data) en "Export Your Data (Workouts)" (https://help.macrofactorapp.com/en/articles/356-export-your-data-workouts). `docs/visie/Data zonder handwerk.md`, deel over gewicht. Testbestanden: `src/engine/fixtures/macrofactor-weight*.csv`, nagemaakt.

## Vervangt

Niets. De regel in `docs/visie/Data zonder handwerk.md` dat gewicht liever met de hand blijft, vervalt voor wie een MacroFactor-export met gewicht heeft; handmatig invullen blijft kunnen.

## Terugdraaien

Zet "Gewicht uit MacroFactor gebruiken" uit: de app rekent dan niet meer met het MacroFactor-gewicht en vraagt weer om je eigen gewicht. De opgeslagen dagen kunnen blijven staan. Wil je ze echt kwijt, dan blijft dat voorlopig een kwestie van de back-up terugzetten; een aparte wisknop is er niet.
