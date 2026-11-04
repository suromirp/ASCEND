# Gewicht uit Health Connect

Datum: 2026-11-04
Status: aangenomen

## Besluit

In de Android-app leest ASCEND je gewicht en vetpercentage uit Health Connect, bij dezelfde ronde als je trainingen en ochtenden, alleen lezen. Het komt in de gewone lijst van wegingen (`AppSettings.weightEntries`) met `source: 'health-connect'`, gaat mee in de back-up zoals elk gewicht, en heeft een eigen schakelaar "Uit Health Connect" in het blad Lichaamsgewicht (aan als advies). Op dezelfde dag gaat wat je zelf invulde of uit MacroFactor inlas voor.

## Hoe het werkt

Lezen. `integrations/healthConnect.ts` vraagt de soorten `weight` (kilogram) en `bodyFat` (procent) van de plugin en maakt er per dag één `BodyMetric` van, via `fetchBodyMetrics` van de gewone `DataSourceAdapter`: de eerste weging van de dag, want 's ochtends en nuchter is de vaste meting, en een tweede app die dezelfde weging later nog eens doorgeeft telt dan niet. Het vetpercentage komt ook van de eerste meting van die dag. Grenzen: 30 tot en met 250 kg en 3 tot en met 60 %; een getal daarbuiten laat ASCEND weg. Een vetpercentage zonder weging die dag geeft geen gewicht. Een ronde kijkt 28 dagen terug, net als bij de ochtenden. Zonder toestemming voor gewicht of met de schakelaar uit wordt er niets gevraagd.

Bewaren. `engine/healthConnectWeight.ts` maakt er een `WeightEntry` van (`basis: 'scale'`, kilo's en procenten op een decimaal) en voegt die samen met wat er staat. Een weging uit Health Connect heeft een eigen plek naast je eigen of MacroFactor-gewicht van die dag (`engine/bodyWeight.ts#sameWeightPlace`): per dag hoogstens één uit Health Connect en één van jezelf of MacroFactor. Een nieuwe ronde ververst de dag uit Health Connect als Health Connect iets anders zegt. Een dag die Health Connect niet meer teruggeeft blijft staan, want het is je meting; alleen wegingen uit Health Connect ouder dan een jaar gaan eruit, zoals bij MacroFactor. `storage/healthConnect.ts` schrijft de lijst in dezelfde transactie als de ochtenden en de stand, en leest de instellingen binnen die transactie, zodat een ronde nooit een gewicht overschrijft dat je intussen zelf invulde en niets schrijft als Health Connect intussen uit ging. Daarna leest de app de instellingen opnieuw (`onHealthWeightChange` in `state/AppDataProvider.tsx`), zonder een eigen planningsronde.

Welk gewicht telt. Alles wat een lichaamsgewicht nodig heeft, gaat door `weightsInUse` (de schakelaars van MacroFactor en Health Connect zijn allebei verplichte argumenten, zodat een plek die er een vergeet niet compileert). Per dag één gewicht, met een vaste voorrang: zelf ingevuld of MacroFactor gaat voor Health Connect. Dat was een bewuste keuze van jou op die dag, en het trendgewicht van MacroFactor is rustiger dan één weging. Heeft de winnaar geen vetpercentage en de weging uit Health Connect van die dag wel, dan krijgt hij dat erbij. Daarna telt de nieuwste dag, uit welke bron ook. Een eigen invoer vervangt alleen je eigen of MacroFactor-gewicht van die dag, nooit de weging uit Health Connect. Een export van MacroFactor raakt de wegingen uit Health Connect niet en ziet ze nooit als conflict.

Laten zien. In het blad Lichaamsgewicht staat onder het getal "Uit Health Connect, 3 nov" met het label Automatisch, en de rij zegt hetzelfde. De schakelaar "Uit Health Connect" staat in het blad naast "Uit MacroFactor", alleen als Health Connect aan staat of er al wegingen uit kwamen. Wie Health Connect al aan had voordat ASCEND gewicht las, ziet daar "Health Connect staat aan, maar ASCEND mag je gewicht nog niet lezen." met "Gewicht toestaan"; vraagt Android het niet meer, dan is er "Health Connect openen". De herinnering op Vandaag blijft weg zolang er een weging uit Health Connect van de laatste twee weken is (`freshLinkedWeight`, zoals bij MacroFactor); is de laatste ouder, dan vraagt hij je opnieuw te wegen of het zelf in te vullen.

De vijf plekken. `data/settingsIndex.ts` (`health-connect-gewicht`, groep Lichaam), `data/settingsLayout.ts` (in het blad van Lichaamsgewicht, zichtbaar zodra Health Connect aan staat), `engine/settingsSummary.ts` (aan of uit, en "Nog geen toestemming voor gewicht"), het blad zelf (`components/settings/groups/LichaamSheets.tsx`) en de uitleg `healthConnectGewicht` in `data/settingsHelp.ts`. Het verschil met het advies staat in `engine/settingsDiff.ts`.

Android. Het manifest heeft nu ook `READ_WEIGHT` en `READ_BODY_FAT`; die stonden eerst bij de rechten die er bij het samenvoegen uit gingen. De lijst die de plugin om autorisatie vraagt (`HEALTH_KINDS`) heeft `weight` en `bodyFat`, de welkomstreeks en `public/privacypolicy.html` noemen het gewicht. Een nieuwe toestemming vraagt een nieuwe APK, dus het native niveau gaat van 7 naar 8 (`android/native-level.txt`, `android/native-plugins.json`). Tot die APK er staat laadt de app geen nieuwere webversie en zegt hij dat er een nieuwe versie klaarstaat.

De back-up en oude bestanden. De vorm van een weging verandert niet; nieuw is alleen dat er op een dag naast je eigen gewicht een weging uit Health Connect kan staan, en de optionele schakelaar `weightFromHealthConnect`. Het schemanummer blijft. `storage/migrationsBody.ts#migrateWeightEntries` maakt van twee wegingen op dezelfde dag en plek er een (de laatste) en laat een weging uit Health Connect buiten 30 tot 250 kg vallen, allebei geteld; een oude export heeft één weging per dag en leest zoals hij was. Terugzetten voegt per dag en plek samen (`storage/backupMerge.ts`), het toestel gaat voor. Een kapotte schakelaar valt weg (`storage/backupClean.ts`).

Uitzetten. Health Connect uit laat het gewicht staan: het is je meting, net als je logs. De schakelaar "Uit Health Connect" uit betekent: niet meer lezen en niet meer meetellen; wat er staat blijft bewaard.

## Reden

De eigenaar weegt zich met een weegschaal die naar Health Connect schrijft, of via een andere app. Het besluit over Health Connect van 2 november liet gewicht bewust buiten de eerste stap, omdat het de rugzakverhouding en de beenindex stil verandert; het moest via dezelfde weg als het gewicht uit MacroFactor, met een eigen keuze. Dat is deze schakelaar, met dezelfde vorm, dezelfde lijst en dezelfde termijn van twee weken.

## Alternatieven

Een keuze "Gewicht uit: Health Connect, MacroFactor, zelf invullen". Die zou de schakelaar van MacroFactor dubbel maken, en de eigenaar gebruikt beide. Een vaste voorrang per dag met twee schakelaars is eenvoudiger en houdt elke bron uit te zetten. Health Connect laten voorgaan: dan wint één weging van een bewuste eigen invoer en van het rustigere trendgewicht. De laatste weging van de dag nemen: die schommelt meer met eten en drinken. Een eigen opslag voor Health Connect (de lege tabel `bodyMetrics`): dan zou elke plek die gewicht leest twee bronnen moeten kennen, en het ging niet mee in de back-up.

## Bron

Opdracht van de eigenaar via de coördinator (4 november 2026). `docs/beslissingen/2026-11-02-health-connect.md` (wat niet in die stap zat), `docs/beslissingen/2026-10-22-gewicht-uit-macrofactor.md`, `docs/beslissingen/2026-10-25-vetpercentage-uit-macrofactor.md`, `docs/beslissingen/2026-11-01-android-app.md` (native niveau). De broncode van `@capgo/capacitor-health` 8.11.13: `weight` in kilogram (`WeightRecord`), `bodyFat` in procent (`BodyFatRecord`, 0 tot 100). Testdata nagemaakt.

## Vervangt

Niets. Het stuk "Wat niet in deze stap zit" van `2026-11-02-health-connect.md` blijft gelden voor stappen; voor gewicht is dit de vervolgstap.

## Terugdraaien

Voor de gebruiker: "Uit Health Connect" uit in het blad Lichaamsgewicht. In de code: `weight` en `bodyFat` uit `HEALTH_KINDS`, de twee rechten weer op `tools:node="remove"` in het manifest en het native niveau omhoog (nooit omlaag). De wegingen met `source: 'health-connect'` mogen blijven staan; met de schakelaar uit leest niets ze.
