# Health Connect als bron in de Android-app

Datum: 2026-11-02
Status: aangenomen

## Besluit

In de Android-app leest ASCEND trainingen (met hun afstand), slaap, rusthartslag en HRV uit Health Connect, achter de bestaande `DataSourceAdapter` en met `source: 'health-connect'`. Het staat standaard uit, heeft één schakelaar bij Instellingen, Koppelingen, en vraagt pas bij aanzetten om toestemming, alleen om te lezen. intervals.icu gaat voor als dezelfde training of ochtend uit beide bronnen komt.

## Hoe het werkt

De plugin. `@capgo/capacitor-health` versie 8.11.13 (MPL-2.0), gemaakt voor Capacitor 8, laatst bijgewerkt op 26 oktober 2026. Hij gebruikt de officiële bibliotheek `androidx.health.connect:connect-client` 1.1.0, heeft de verplichte activity met de uitleg over privacy (voor `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`) en de alias voor Android 14 en nieuwer (`android.intent.action.VIEW_PERMISSION_USAGE` met de categorie `HEALTH_PERMISSIONS`, beveiligd met `START_VIEW_PERMISSION_USAGE`), en ook de `<queries>` voor het pakket van Health Connect. Die uitleg toont `public/privacypolicy.html` uit de app zelf, zonder internet. De plugin noemt in zijn eigen manifest alle lees- en schrijfrechten; het manifest van de app haalt er bij het samenvoegen alles uit wat ASCEND niet gebruikt (`tools:node="remove"`). Wat overblijft zijn vijf leesrechten: `READ_EXERCISE`, `READ_DISTANCE`, `READ_SLEEP`, `READ_RESTING_HEART_RATE` en `READ_HEART_RATE_VARIABILITY`. De plugin vraagt minstens Android 8 (API 26), dus `minSdkVersion` gaat van 24 naar 26. Het native niveau gaat van 3 naar 4 (`android/native-level.txt`, `android/native-plugins.json`); de test daarvan kijkt nu ook naar pakketten onder `@capgo/`.

De code. `src/integrations/healthConnect.ts` is de enige plek die de plugin kent. Een training wordt een `ExternalActivity` (soort, start in lokale tijd, duur, afstand), een dag een `RecoveryMetric` met het id `health-connect:<datum>`: de slaap hoort bij de dag waarop je wakker werd en telt alleen echte slaap, van de nachten op een dag de langste; van rusthartslag en HRV de laatste meting van de dag, met dezelfde grenzen als bij intervals.icu. De afstand komt uit de afstanden van dezelfde bron binnen de training, zodat de telefoon in je zak niet dubbel telt. `src/storage/healthConnect.ts` bewaart de stand onder één meta-sleutel (`storage/migrations.ts#migrateHealthConnectState` maakt van elke oudere of beschadigde vorm de vorm van nu) en doet de rondes. In de browser bestaat Health Connect niet: de rij staat er gedimd, met "Alleen in de app" en één regel uitleg, zonder schakelaar en zonder fout.

Ophalen. Bij het openen van de app (na intervals.icu, in de stappen op de achtergrond van `state/AppDataContext.tsx`), bij terugkomen in de app op Vandaag, en hoogstens eens per drie uur; na een fout een half uur rust. Een ronde kijkt zeven dagen terug voor trainingen en 28 voor ochtenden en duurt nooit langer dan 30 seconden. Elke uitkomst is zichtbaar: onder de rij staat wanneer het lukte of wat er misging ("Geen toestemming meer", "Health Connect staat niet op je telefoon", "Geen antwoord, straks opnieuw"), en na aanzetten een zin met wat er binnenkwam of waarom het uit bleef. Bij een weigering staat er een knop die Health Connect zelf opent, omdat Android de vraag na twee keer nee niet meer toont.

Welke bron voorgaat. intervals.icu. Het heeft de hartslag, de hoogtemeters, de reeksen en de correcties, en Health Connect krijgt dezelfde training meestal van Garmin Connect. Een training uit Health Connect wordt geen voorstel en niet vanzelf afgevinkt als intervals.icu dezelfde heeft (in de recente of de oudere lijst) of als er al een log uit een andere bron is: zelfde start binnen vijf minuten en een duur die hoogstens vijf minuten of vijftien procent verschilt (`engine/sourcePrecedence.ts#offeredActivities`). Andersom ook: is een training eerst via Health Connect opgeslagen, dan wordt dezelfde van intervals.icu geen tweede voorstel. Van de ochtenden komt die van Health Connect achteraan (`orderBySource`, gebruikt door `storage/wellness.ts#getRecoveryMetrics`), zodat hij alleen aanvult wat intervals.icu op die dag niet heeft.

Opslag en historie. Een ronde haalt eerst alles op en schrijft dan de ochtenden en de stand in één transactie; een fout halverwege laat alles zoals het was en zet alleen de foutregel. Een koppeling die verlopen is (alle toestemmingen ingetrokken) of tijdelijk kapot is geeft een foutregel; wat er al stond blijft, en de schakelaar blijft aan tot jij hem uitzet. Vandaag telt nog niet als voorbij: een ronde kijkt tot nu, een training die nog niet afgelopen is komt niet mee, en de ochtend van vandaag wordt bij een latere ronde bijgewerkt. Een training in een vakantie of tocht loopt via de gewone voorstellen: op een tochtdag hoort hij bij de geplande bergtocht van de tocht, in een vakantie zonder training wordt het een losse training. Er wordt nooit een log gemaakt of veranderd door een ronde; een log komt pas als je op Vandaag Opslaan kiest of als Vanzelf afvinken het doet, zoals bij intervals.icu. De planning verandert er nooit door. Uitzetten haalt de opgehaalde trainingen weg; de ochtenden blijven alleen als "Ochtendgetallen in back-up" aan staat, net als bij het ontkoppelen van intervals.icu; logs blijven altijd.

De back-up. Verandert niet. De stand van Health Connect is een apparaatvoorkeur en een cache en gaat niet mee. Een log uit Health Connect is een gewone `SessionLog` met `source: 'health-connect'` en een ochtend een gewone ochtend (die bron stond al in `MORNING_SOURCES`), dus een oude back-up importeert zoals hij was en het schemanummer blijft.

Wat niet in deze stap zit. Gewicht en stappen. Gewicht zou de rugzakverhouding en dus de planning stil veranderen; dat hoort via dezelfde weg als het gewicht uit MacroFactor te gaan, met een eigen keuze. Voor stappen is er nog geen vorm en leest niets ze. Hartslag en hoogtemeters per training leest ASCEND niet uit Health Connect (de plugin heeft geen hoogtewinst, en hartslag per seconde over een week is veel voor weinig); die komen van intervals.icu. Omdat ASCEND alleen vraagt wat het gebruikt, staan deze rechten ook niet in het manifest.

## Reden

De eigenaar wilde gegevens zonder handwerk, ook zonder intervals.icu als tussenstap (`docs/visie/Data zonder handwerk.md`, `docs/onderzoek/Android-app.md`, deel 4). Health Connect is op Android de vaste plek daarvoor, en Garmin Connect schrijft er trainingen, slaap en hartslag in. Met intervals.icu als eerste bron verandert er niets voor wie dat al gebruikt; Health Connect vult aan of vervangt het als het wegvalt.

## Alternatieven

Een eigen plugin in Java: de bibliotheek van Health Connect werkt alleen met coroutines van Kotlin, dus Java vraagt een omweg, en de plugin van Capgo wordt onderhouden en heeft de verplichte onderdelen al. De plugin van Capawesome: vraagt een betaald abonnement. `capacitor-health-connect` van Ubie en de plugin van Kiwi: voor Capacitor 5 en 7, niet voor 8. Health Connect laten voorgaan: het heeft minder per training (geen hartslag, geen hoogte, geen reeksen) en zou de correcties uit intervals.icu overschrijven. Elke training van beide bronnen tonen: dat geeft dubbele voorstellen.

## Bron

`docs/onderzoek/Android-app.md` (deel 1.2 en 4), `docs/visie/Data zonder handwerk.md`, de gebruiksaanwijzing en de broncode van `@capgo/capacitor-health` 8.11.13, de opdracht van de coördinator van 2 november 2026.

## Vervangt

Niets. De rij "Health Connect, komt later" (`data/settingsLayout.ts`, een verwijzing sinds `2026-10-26-instellingen-opruimen.md`) is nu weer een echte rij. Bij Toestemmingen staat Health Connect niet meer: de vraag hoort bij de schakelaar op Koppelingen.

## Terugdraaien

De schakelaar uit laat alles zoals vóór deze stap, behalve je logs. In de code: de plugin uit `package.json`, `android/native-plugins.json`, `android/capacitor.settings.gradle` en `android/app/capacitor.build.gradle`, de rechten en `<queries>` uit het manifest, het native niveau omhoog (nooit omlaag) en de stap `health connect` uit de achtergrondstappen. De meta-sleutel `healthConnect` mag blijven staan; niets leest hem dan nog.
