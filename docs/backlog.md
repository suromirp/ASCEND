# Backlog

Wat nog op de lijst staat, zodat een nieuwe sessie het niet uit het gesprek hoeft te halen. De
coördinator houdt dit bij: iets wat live staat gaat eruit, iets nieuws komt erbij met een regel uitleg.
Bijgewerkt op 1 november 2026.

## Inbox

Wat de eigenaar tussendoor meldt, voor het volgende bouwmoment (maandag, woensdag, vrijdag; skill `bouwmoment`).
Vast punt, elk bouwmoment: na de punten hieronder de eerstvolgende open ronde uit het rooster hieronder. Een opmerking over hetzelfde komt bij het bestaande punt. Meteen, tussendoor: iets dat nu stuk is (de app werkt niet, verkeerde getallen in je training, data die verloren kan gaan) en kleine fixes die de coördinator zelf in een paar minuten doet, zonder helper (een tekst, een regel, een getal). De rest gaat in de Inbox.

- 8 november, uit het onderhoud, wat na het bouwmoment van 8 november bleef: hulpfuncties samenbrengen, ronde 2 en 3 (hoofdletter eerst in `MacroFactorLinkCard`, `WeatherTodayCard`, `clothing`, `settingsSummary`, `goalList`; afronden `round1` en `round2`; `joinNL` en `median` in `weather.ts`, `clothing.ts`, `forgeTimeCap.ts`; `mean` in `sweat.ts`); de losse re-exportregels (`ambition.ts`, `autoTick.ts`, `bodyCheck.ts`, `bodyMap.ts`, `scheduler.ts`, `backup.ts`) en de dode code `SkyPanel` en `adviceForLog` opruimen; `ForgeWorkout.tsx` verder opsplitsen (ronde 1 is af: nog 1413 regels, ronde 2 is de volgende, nooit naast een ander Forge-spoor). AdventureCard.tsx en LessonCard.tsx blijven (besluit 2 november).
- 8 november, uit de review van het bouwmoment: `ForgeWorkout.tsx` rond regel 999 rekent `capRemovedFor` twee keer uit (naar een const); de Forge-melding Spieren voor de berg heeft geen eigen schakelaar (Forge zit op het maximum van 6 rijen); de afstandszin op Vandaag blijft afhankelijk van een testloop (vraag aan de eigenaar: moeten eigen lopen de zin ook zonder testloop geven?); regen in het komende uur: `inFlight` in `storage/rainSoon.ts` hoort per plaats te zijn, en de echte Open-Meteo-aanroep (`minutely_15`) is nog niet live gezien.

- 8 november, antwoord op de vraag van het bouwmoment (coördinator, met het advies): ja, de afstandszin op Vandaag ook zonder testloop tonen, dan uit het echte tempo van de laatste lange of rustige lopen (zelfde bron als Tempo bij zone 2); met testloop blijft het tempo van de test.

## Rooster voor de bouwmomenten

Per bouwmoment eerst de Inbox, daarna de volgende ronde hieronder. Een ronde heeft tot drie sporen die elkaars bestanden niet raken; ze lopen tegelijk, elk met een eigen helper in een eigen worktree, en gaan samen in één keer naar main. Nooit twee Forge-sporen tegelijk (zelfde bestanden). Afgerond: naar "Live op" en uit dit rooster.

1. Nog open uit ronde 1: Scout: RIR en RPE in de beste apps, met vermoeidheid tussen oefeningen (onderzoek, geen bestandsconflict; liep mee zodra er ruimte is). Planner, tijdsgrens, Spieren voor de berg en Buiten klein (regen in het komende uur, maanstand; UV en zon bestonden al) zijn af (8 november).
2. Forge: afvinken is de RIR van het doel (ook oude workouts) en vermoeidheid tussen oefeningen ‖ Heuvels en trappen in de buurt (OpenStreetMap) ‖ Scout: calisthenics en uitleg bij oefeningen (apps, wetenschap, open databases).
3. Forge: gewicht op een toestel ‖ Periode "Zonder sportschool" en feestdagen als voorstel (opus) ‖ Tempo bij zone 2 (Scout kort, dan bouwen).
4. Forge: ruilen met een echte vervanger ‖ Gewicht uit Health Connect als trend ‖ Uitleg bij oefeningen: proef met vijf teksten (Scribe).
5. Uitleg bij oefeningen, de rest ‖ Calisthenics ontwerp ‖ Voor de GR5: waarschuwingen, hutten, lawines.
6. tot 8. Calisthenics bouwen ‖ Alle teksten herschrijven en Engels, per tab ‖ Oudere punten uit de ronden (RPE bij een testloop, Vandaag-volgorde, herinrichting uit de ontwerprapporten).

## Loopt nu

Live op 8 november (tweede bouwmoment): regen in het komende uur en maanstand (twee instellingen in Weer en kleding), de telling "weg door je tijdsgrens" klopt bij Lichter, ForgeWorkout een eerste keer opgesplitst, gedeelde mean, stdev, median en joinNL in utils, 27 exports privé, de afstandszin op Vandaag in het enkelvoud bij één loop.

Live op 8 november: één weektelling (week binnen de fase) op Vandaag en Stand, de weekcontrole die niet meer heen en weer schuift (en een testverplaatsing als laatste keuze van het voorstel), de tijdsgrens zegt het bij de oefening met Terugzetten, Spieren voor de berg ook in Forge, Tempo bij zone 2 op vlak tempo en de afstand op Vandaag uit je echte lopen. De 48 uur na de lange duurloop stond al op main sinds 2 november.


Ronde 2 van `docs/onderhoud/2026-11-01-aanpak-backlog.md` (ronde 1 is af, terugblik in `docs/onderhoud/reflectie-2026-11-01.md`).

Live op 2 november: de eerste ondertekende Android-app (release apk-23, sleutel in de environment android-release1), het opsplitsen van AppDataContext en ForgeWorkout, trainingen ruilen in een week, het opsplitsen van opslag en adviezen, Health Connect als bron in de Android-app (alleen lezen, nog niet op een toestel gezien), een plugin blijft niet meer hangen in de Android-app (automatisch bijwerken, meldingen, trillen, terugknop, locatie), Sporten die meetellen (zwemmen, padel, voetbal, vaste dagen, rust na een zware sport, hoeveel per soort, eigen sporten), Waarom staat dit hier, Minder tijd vandaag, zones na een test, details ophalen voor oudere runs, snelkoppelingen en een widget in de Android-app, je locatie (weer op je plek, plek per tocht voor het bergweer) (native niveau 3, nog niet op een toestel gezien), de 48 uur tussen beenzware dagen ook na de lange duurloop, de automatische back-up naar een bestand (Android: Documenten/ASCEND).

Live op 1 november: Stand schuift niet meer zijwaarts, het cijferblok van Forge blijft open, de ochtendkaart na je antwoord, de rustdag die terugkomt, de rustiger fysioregel, de kortere voorschriftregel, het citaat in het Engels, een vakantie bijwerken, trainingen die niet doorgingen, ochtenden in de back-up veilig uitzetten, opmaak samengebracht, de tekstkaart met 21 schermen, drie ontwerprapporten in `docs/visie/`.

Live op 31 oktober: data op lange termijn, run in detail, ochtendkaart vernieuwd met twee van drie, kansen stap 0, zonder doel stap 4 tot 10, onderhoud punt 2 en 3.

## Kan nu, na wat loopt

- Kansen met gegevens, het middelgrote werk (kans A en F, de etappeschatting als band) en het kleine werk dat over was (kans C, D en I): gebouwd op `claude/kansen-middelgroot`, wacht op de poorten (`docs/beslissingen/2026-11-01-kansen-middelgroot.md`). De bestandsroute voor FIT-bestanden als vangnet (stap 0c van het onderzoek) is later.
- Vier tekstpunten uit eerdere Lookout-rondes die zonder screenshot niet terug te vinden waren. Wachten op een screenshot van de eigenaar.

- Zonder doel: de kaart Je week op Je stand (ontwerp 2.8) en de vorm van de week later veranderen bij een andere richting.

## Forge, wens van de eigenaar (3 november)

- Herhalingen schatten bij een ander gewicht: vul je in een werkset zelf een ander gewicht in, dan rekent Forge het aantal herhalingen uit dat je bij dat gewicht waarschijnlijk haalt (uit je geschatte kracht en de gevraagde RIR, dezelfde rekenregel als het voorschrift), zoals MacroFactor dat doet. Alleen een voorstel in het vak, nooit over iets wat je zelf invulde. Nu bestaat alleen `forgeInput.ts#carryChange`, dat een gelijke waarde doorschuift, geen schatting.
- Na afvinken de volgende set bijstellen: vink je een set af met meer of minder herhalingen (of een andere RIR) dan gevraagd, dan stelt Forge de herhalingen (en zo nodig het gewicht) van de volgende, nog open werkset bij naar wat hij nu verwacht. Niet bij een set die je zelf al aanpaste of afvinkte; een bestaand log blijft onaangeroerd. Instelbaar (standaard aan), met besluit en tests; past bij de herinrichting van Forge in ronde 3.

## Forge naast MacroFactor, training van 3 november (Benen A)

Live op 3 november: lichtere terugsets na een zware topset, opwarmen naar de sprong toe, "Hoeveel over?" na een set, een stap zwaarder ruim boven het bereik, de regel onder de lege stang en het voorstel voor een toestel in ponden (besluit `2026-11-03-forge-na-de-eerste-vergelijking.md`). Nog open: de regel "per kant ..." onder elke set en het percentage van je maximum horen bij het ontwerprapport Forge.

## Met voorrang: de planner en de 48 uur (gevonden 2 november)

- De planner zelf zet een lange duurloop en een zware beendag (Benen A) op twee dagen achter elkaar: `scheduler.ts#legSpacingDays` telt een loop met `intensity: 'low'` als rustig volume, terwijl `tpl_long_run` `lowerBodyLoad: 'heavy'` heeft. Dat botst met CLAUDE.md ("twee beenzware sessies niet binnen 48 uur"). Onderzoek klaar (`docs/onderzoek/Lange duurloop en een zware beendag.md`): 48 uur tussen zware beenkracht en de lange duurloop in beide volgordes; het weekendblok (heuvels zaterdag, lange duurloop zondag) blijft vrijgesteld; een instelling, standaard uit, die beenkracht de dag na de lange duurloop toestaat. Bouwen bij de eerstvolgende vrije plek (Sherpa en Warden op opus), met een nieuw besluit dat het 24-uursdeel van `2026-10-27-groei-tot-de-wedstrijdpiek.md` vervangt en de golden die beweegt met de reden in de commit.

## Uit de review van rustdag na rust (voor de terugblik van ronde 2)

- Een training die je zelf oversloeg of waarvan je het inhaalvoorstel afwees, houdt de rustdag tot zeven dagen tegen, ook als er nooit een inhaalvoorstel komt. Dan blijft de dag leeg. `catchUpFits` laat afgewezen inhaalvoorstellen negeren. En `trainedOn` telt een log op `completedDate`, `dayLoads` op de geplande dag (`logDay`); gelijktrekken.

## RPE bij een testloop (onderzoek 2 november, `docs/onderzoek/RPE bij een testloop.md`), ronde 2

Op vraag van de eigenaar. Bouwen bij de eerstvolgende vrije plek (Sherpa, opus; Warden op opus):
- `rpeFactor` in `engine/legFatigue.ts`: de geplande RPE van een test of wedstrijd is 10 (via de rol), zodat een 10 niet als 25 procent zwaarder dan gepland telt.
- `effortFactor` geldt alleen voor kracht; vastleggen met een test.
- Nagaan of een gekoppelde test met inlopen en uitlopen als één blok op RPE 10 binnenkomt; zo ja de belasting splitsen (de 5 km maal de RPE, de rest maal 3).
- Bij een test met RPE 7 of lager in `testJudgment` melden dat hij waarschijnlijk niet maximaal was.
- De ochtend na een test of wedstrijd de vraag "Hoe voelen je benen?" actief aanbieden.
- "gem. zwaarte" in de weekterugblik wordt minuten rustig en hard: gaat mee met de herinrichting van de gegevens in ronde 3.

## Uit de terugblik op ronde 1 (vijf nieuwe punten)

- Vandaag: een vaste volgorde en een maximum voor kaarten boven de missie (ochtendkaart, Niet gedaan?, koppelvoorstel, rustdag terug, back-up). Op een slechte ochtend staan er nu vier boven de missie. Ronde 2.
- Vragen als Niet gedaan? wachten tijdens een ziekmelding, en komen pas terug als je beter bent. Ronde 2.
- Eerst koppelen, dan inhalen: MISSED-CATCH-UP kijkt eerst of er een losse log te koppelen is. Ronde 2.
- Ontwerprapport instellingen, de kleine delen: betere waarden en uitleg in de rijen, de bundel De ochtend, Weer en kleding. Ronde 2.
- Ontwerprapporten gegevens en Forge, de grote herinrichting (Stand met Ritme, weekterugblik, Logboek, Forge zonder snelknoppen en met Alles in het blad Oefening). Ronde 3, na het opsplitsen.
- Geavanceerd in Instellingen wordt een eigen pagina (eigenaar akkoord, 2 november): Planning en Geavanceerd zitten op hun plafond van rijen. Ronde 3, bij de herinrichting.

## Android en web, wens van de eigenaar (1 november)

Eis bij alles: de webapp zonder Android blijft volledig werken. Elke functie werkt los en samen; in de browser een webweg of een nette stilte. De Android-app werkt zichzelf bij (live update) en gebruikt een vaste sleutel, zodat je gegevens bij een update blijven.
- In de Android-opdracht zelf: de terugknop, scherm aan tijdens Forge (in de browser met Wake Lock), trillen, statusbalk en startscherm.
- Gebruikerstest met vier nagemaakte personen (ronde 4) en de herstelronde erna: niet in de sessie van 2 november (eigenaar); later, in een eigen sessie.
- Back-up naar een map die de eigenaar zelf koos (Interne opslag/Ascend_backup) in de Android-app: eenmalig Map kiezen via de mappenkiezer van Android (Storage Access Framework, blijvende toestemming), daarna schrijven Back-up maken en de automatische back-up daarheen, met terugval op Documents/ASCEND en een melding. Vraagt een nieuwe plugin en APK. Op verzoek van de eigenaar later (2 november).
- Forge: Ruilen op een toegevoegde bergspieroefening die na Uit deze training halen met afgevinkte sets in de sessie blijft, doet stil niets (ForgeWorkout swap). Verbergen of de prescriptie van de sessie gebruiken. Klein.
- Eén notatie voor tijden in de hele app (nu "13.05" bij het weer en "06:11" in Instellingen). Ronde 3.
- Nagekomen uit de terugblik op ronde 2: de nieuwe regels op Vandaag (Hoe telt dit?, Minder tijd vandaag, de etappe-regel) in de vaste volgorde en het maximum van kaarten; een doorloop op de telefoon van de eigenaar zodra de Android-sleutel er is (snelkoppelingen, widget, locatie, back-upmap); een opzet voor de spierindex door Scout voordat er iets gebouwd wordt (opdracht loopt; de eigenaar laat de keuze daarna aan de coördinator).
- Nagekomen uit ronde 2b: de factor 0,98 voor de drempelhartslag na een 5 km toetsen (Scout); Sporten lezen echte intervals.icu-types (Swim, Padel, Soccer, Yoga) alleen met nagemaakte data getest; een eigen sport telt niet in de weekcheck; "Laten staan" bij een vakantie en "laten rusten?" rond een Top-race voor vaste sporten; de waarde "Alles normaal" valt af in de rij Hoeveel per soort op 360 px; een test die alle Android-XML vooraf leest (een dubbel streepje in commentaar brak de APK-bouw).
- Coördinaten voor de 36 GR5-etappes uit een GPX die de eigenaar aanlevert (ja, 2 november), zodat de regel op je etappe iets toont. Een fijne plek op Android: nu niet, grof met een eerlijke tekst (keuze aan de coördinator gelaten, 2 november).
- De back-up van Android (naar Google) staat aan, keuze van de eigenaar (2 november), naast de eigen back-up; alleen de opslag van de webview, zonder caches.
- Niet: hartslagband via Bluetooth (eigenaar). Niet gebouwd tenzij de eigenaar het vraagt: camera en een gps-route of spoor van tochten (afgeraden om batterij en privacy; de eigenaar wil alleen weten waar hij is).

## Voor de eigenaar

- Beantwoord (1 november): de snelknoppen in Forge gaan weg; de kolom Alles gebruikt de eigenaar nooit en verhuist naar het blad Oefening. Bouwen met het Forge-ontwerprapport.
- Helemaal aan het eind, als alles klaar is (toestemming van de eigenaar, 1 november): de vakantiedata van de eigenaar uit de geschiedenis van git halen (oude commits van `docs/onderhoud/2026-11-01-aanpak-backlog.md` en de commit c305cb1 die nooit op main kwam). Dat herschrijft geschiedenis op main en de werkbranch; eerst alle helpers stoppen, daarna de deploy controleren.
- De overige vragen uit de drie ontwerprapporten (`docs/visie/Ontwerprapport gegevens.md`, `instellingen.md`, `Forge.md`) kiest de coördinator met het advies; elke keuze staat in de terugblik van de ronde waarin hij gebouwd wordt. Het citaat onderaan Vandaag wordt Engels, zoals de eigenaar al vroeg.

## Uit de ontwerprapporten

- Jaaroverzicht: "Testloop 5 km: 14 jan en 15 jan", twee dagen voor één test. Nakijken of dat een fout in de gegevens of de telling is.
- De vaste doorloop van Lookout gaf Stand helemaal leeg (zonder lucht of titel); een eigen afdruk was wel vol. Nagaan of de kit te vroeg afdrukt.


## Bewust niet

- Voeding naast gewicht en kracht (kans E): de eigenaar laat dit liggen (1 november).

## Ochtendkaart, later

- De kaart leert van jou: hoe ging de training na "moe" of "slecht geslapen", en het advies past zich daarop aan. Hoort bij Kansen (slaap tegenover prestatie).
- Een melding op de telefoon met de vier keuzes, zodat je de app niet hoeft te openen. Na de Android-app.

## Na het herstel van het abonnement (zondag 1 november)

- Spierindex in de kleinste vorm (besluit `2026-11-02-spierindex-klein.md`): melding als een bergspier ontbreekt bij een bergdoel, met voorstel, en de volgorde in `swapOptions`. Ronde 3, met de herinrichting van Forge.
- Grote bestanden opsplitsen: AppDataContext, ForgeWorkout, adviceEngine, database, backup, migrations.
- Android-app (Capacitor), als een van de grote nieuwe features van deze ronde. Lokale meldingen komen daarmee (een PWA zonder server kan geen melding sturen als de app dicht is).
- Android-meldingen met het scherm uit en trillen: het einde van de rust in Forge, de ochtendvraag en de weekmelding (ronde 2b, bij de Android-app). Toestemmingen direct na de installatie, in een korte welkomstreeks met per toestemming één scherm en "Niet nu".
- Korte weekmelding op zondagavond: wat er gebeurde, wat er komt, één tip. Als melding via de Android-app; in de PWA als kaart op Vandaag bij het openen.
- Startvragen: standaardkeuze is nu "Een tocht of wedstrijd"; nagaan of "Fit blijven" logischer is voor iemand zonder plan.

## Na de Android-app

- Trainingen in je agenda inplannen en afstemmen, met kaders voor ochtend, middag en avond. Nog niet (eigenaar, 1 november): niet in deze ronde bouwen.
- Ook nog niet (eigenaar, 1 november): gesproken signalen, vergrendelen met vingerafdruk, 's nachts horlogegegevens ophalen, delen met één tik. Spraakloggen en een getal op het icoon afgeraden.

## Gewicht uit Health Connect, verder (live 4 november)

- Een trend over de wegingen uit Health Connect in plaats van de nieuwste weging: dagelijks wegen schommelt en Forge rekent ermee.
- Zoeken: "Uit Health Connect" vindbaar maken met de reden waarom de rij soms niet zichtbaar is.
- Na "Gewicht toestaan" de uitkomst van de ronde tonen (gelukt, geen wegingen gevonden).
- Vraag aan de eigenaar: je gewicht met trend op Stand? Meenemen in het ontwerprapport voor Stand.

## Forge: ruilen met een echte vervanger (wens 4 november)

- Bij Ruilen eerst de oefeningen die echt hetzelfde doen: dezelfde beweging, dezelfde hoofdspieren en dezelfde hoek (Barbell Bench Press naar Dumbbell Bench Press, Smith Machine Bench Press, Machine Chest Press). Bovenaan, met een korte reden, en de beste als aanbevolen.
- Daaronder, apart, de rest die dezelfde spier raakt maar anders (dips, incline, close grip, push-up).
- Nu (`engine/forgeWorkout.ts#swapScore`) telt alleen gedeelde spieren en het bewegingspatroon, waardoor dips boven de dumbbell bench press staat. Nodig: per oefening een fijnere beschrijving (hoek vlak, schuin of dalend, grip, bereik, stabiliteit) of een lijst met echte vervangers per oefening.
- Eerst Scout: hoe MacroFactor Workouts vervangers kiest en toont, en wat de literatuur zegt over welke oefeningen elkaar echt vervangen. Daarna Cartographer voor het blad, Sherpa (sonnet, geen planning) voor de engine.

## Forge: uitleg bij oefeningen (wens 4 november)

- Eén overzicht per oefening: wat het is, hoe de beweging gaat, welke spieren, waar je op let. Bovenaan "In het kort" met de twee of drie belangrijkste punten, daaronder "Lees verder" voor wie meer wil.
- Nu heeft elke oefening (120 in `src/data/exercises.ts`) drie korte regels (Doen, Let op, Vaak fout). Te kaal, en soms klopt het niet: bij de 45° Incline Barbell Press staat "een lichte helling".
- Taal: fijn om te lezen, concreet, duidelijk, niet te lang. Geen letterlijke vertaling uit het Engels; Engelse vaktermen alleen waar een sporter ze zo gebruikt.
- Nieuwe rol: een copywriter (vaste naam Scribe) in `.claude/agents/`, op sonnet. Scribe schrijft of herschrijft, Scout controleert de techniek, Warden toetst aan de stem van ASCEND (`docs/beslissingen/2026-10-27-stem-van-ascend.md`).
- Eerst Scout: hoe MacroFactor Workouts de uitleg opbouwt, wat goed werkt en wat niet. Daarna een proef met vijf oefeningen ter keuring door de eigenaar, pas dan de rest.
- Scout zoekt per oefening ook op hoe je hem echt goed doet, liefst geverifieerd: onderzoek, erkende bonden of opleidingen (NSCA, ACSM) en ervaren coaches, met de bron in `docs/onderzoek/`.
- Planning (eigenaar, 4 november): niet deze week. Deze week geen grote aanpassingen meer, het abonnement staat al op 60 tot 70 procent. Ruilen met een echte vervanger ook pas daarna.

## Forge: gewicht op een toestel makkelijk invullen (wens 5 november)

- Nu: een toestel heeft een vaste stap (1,25, 2,5, 5 of Anders), of een eigen lijst die je per toestel via een lange lijst toevoegt. Een blok dat niet in gelijke stappen oploopt (bijvoorbeeld 7, 14, 23, 32) krijg je zo niet goed ingesteld, en het is te veel tikken.
- Gewenst: een andere manier. Richting om uit te zoeken: in Forge gewoon het getal intikken dat op het blok staat, en Forge onthoudt per toestel welke standen er zijn en biedt die daarna aan (vorige en volgende stand). Geen instelling vooraf nodig.
- Eerst Cartographer voor het invullen in Forge en het blad in Je sportschool, dan Sherpa. Raakt Forge en opslag van het sportschoolprofiel (opus).

## Spieren voor de berg: ook buiten de weekterugblik (vraag 5 november)

- Het voorstel (bijvoorbeeld Tibialis Raise erbij in Benen B) staat nu alleen in de weekterugblik, met opzet rustig. De eigenaar vond het daar pas laat te vinden.
- Richting: ook laten zien in Forge bij het openen van de training waar de oefening bij zou komen, of één keer op Vandaag. Nog kiezen.

## Weekcontrole die heen en weer schuift (gevonden 5 november)

- In een week met een test botsen twee regels: "frisse benen voor de test" zet de zware beendag eerder, "genoeg ruimte tussen zware dagen" zet hem terug. Binnen één ronde eindigt alles weer waar het stond. De melding is opgelost (alleen een echte verandering telt), de botsing zelf nog niet.
- Nodig: de planner kiest in zo'n week één oplossing die beide regels haalt, of laat het als zorg in Week staan met een voorstel. Planning, dus Sherpa en Warden op opus; `planGolden.test.ts` beweegt niet.

## Alle teksten van ASCEND herschrijven, en Engels erbij (wens 5 november)

- Doel: natuurlijker en korter, zoals goede apps het doen (MacroFactor en andere als voorbeeld). Makkelijk te lezen, nooit te veel uitleg in één keer. Engelse vaktermen mogen Engels blijven waar sporters ze zo gebruiken (1RM, RIR, tempo, fartlek), de rest gewoon Nederlands.
- De app komt in twee talen: Nederlands en Engels, te kiezen in Instellingen.
- Stap 1: alle teksten van de app plat in één document (schermen, knoppen, meldingen, uitleg achter de i, voorstellen), per scherm gegroepeerd, met waar ze in de code staan. Kan grotendeels uit de tekstkaart (`docs/app-kaart/`) en `src/data/settingsHelp.ts`.
- Stap 2: Scout kijkt hoe MacroFactor en twee of drie andere apps hun teksten schrijven (lengte, toon, wat achter een tik zit). Daarna een nieuwe stemgids die `docs/beslissingen/2026-10-27-stem-van-ascend.md` vervangt, eerst ter keuring door de eigenaar.
- Stap 3: Scribe (de copywriter, zie de uitleg bij oefeningen) herschrijft per scherm, Warden toetst. Eerst één tab als proef.
- Stap 4: de teksten uit de code halen naar een vertaalbestand per taal, zodat Engels erbij kan. Groot werk in alle componenten; de engine geeft nu ook zinnen terug, die moeten mee. Sherpa op sonnet, per tab.
- Samen met de uitleg bij oefeningen oppakken. Niet deze week.

## Onderzoek: hoe de beste apps RIR en RPE bijhouden (wens 5 november)

- Snel leren van de beste krachtapps (MacroFactor Workouts, RP Hypertrophy, Hevy, Strong, JuggernautAI, Boostcamp): hoe vragen ze RIR of RPE (wanneer, hoe vaak, met hoeveel tikken), wat doen ze ermee (gewicht en herhalingen voor de volgende set of training), en hoe leggen ze het uit.
- Plus wat onderzoek zegt over hoe goed mensen hun RIR schatten en hoe je dat beter maakt.
- Ook (eigenaar, 7 november): vermoeidheid tussen oefeningen. Forge rekent nu alleen binnen een oefening met vermoeidheid (`fatigueFactor`); wat je eerder in de training voor dezelfde spieren deed telt niet, alleen indirect via je historie als de volgorde gelijk blijft. Voorstel: de harde sets voor dezelfde hoofdspieren eerder in de training tellen, afgezet tegen wat je daar normaal voor deed, en de eerste set daarop bijstellen; hoeveel per set leren uit je eigen trainingen. Uitzoeken hoe MacroFactor en anderen dit doen en wat onderzoek zegt over voorvermoeidheid.
- Uitkomst: een kort verslag in `docs/onderzoek/` met wat Forge kan overnemen, als punten naast wat Forge nu al doet (Hoeveel over?, aangenomen RIR, rekent mee).
- Scout op opus. Kan vóór de grote Forge-onderdelen (vervanger, uitleg, toestel) omdat het die richting geeft.

## Forge: afvinken is de RIR van het doel (wens 5 november)

- Nu: vink je een set af zonder RIR te kiezen, dan bewaart Forge het doel als aangenomen RIR (`rirAssumed`). Die telt niet mee voor je geschatte kracht en voor de stap zwaarder, met opzet: anders bevestigt de voorspelling zichzelf.
- Gewenst: afvinken betekent "gedaan zoals gepland". Haal je de herhalingen van het doel, dan telt de RIR van het doel als echt. Alleen bij twijfel komt de vraag met bolletjes (Hoeveel over?): minder herhalingen dan het doel, ruim meer dan het bereik, of een eerste keer op een nieuw gewicht.
- Ook voor eerdere workouts (eigenaar): als regel bij het lezen, niet door logs te herschrijven. Een oude set met `rirAssumed` en de herhalingen van het doel telt dan ook mee; het log zelf blijft zoals het is (append-only).
- Uitzoeken: of dat de schatting en de stap zwaarder te snel laat lopen (een set met precies de voorspelde herhalingen is geen nieuw bewijs). Koppelen aan het onderzoek naar RIR en RPE in de beste apps. Forge-engine, dus Sherpa en Warden op opus.

## Periode "Zonder sportschool" (wens 6 november)

- Een vierde soort periode naast Vakantie zonder training, Tocht met rugzak en Vrije dagen: je bent weg, kunt wel lopen, maar hebt geen sportschool.
- Lopen blijft staan, korter en rustiger dan thuis (vakantie: geen opbouw, geen test). Kracht in de sportschool wordt een korte sessie met je eigen gewicht (squats, lunges, push-ups, kuitheffingen; 15 tot 20 minuten), of vervalt als je dat kiest.
- Twee keuzes bij de periode: "Heuvels in de buurt" (een loop wordt rustig heuvels op en beheerst af, goed voor een bergdoel) en "Hoeveel": Licht (2 keer lopen, het advies) of Gewoon (wat er stond, zonder sportschool).
- Zoals de andere periodes: een voorstel met Akkoord, de periode pas bij Akkoord opgeslagen (`engine/leave.ts`, `engine/leaveBlock.ts`, `engine/leaveProposal.ts`). Een bestaande vakantie kun je omzetten in dit soort.
- Planning, dus Sherpa en Warden op opus; `planGolden.test.ts` beweegt niet. Instelling en uitleg in de gewone plekken.

## Buiten: UV, zon en hoogte uit Open-Meteo (akkoord eigenaar 7 november, bouwen)

- UV-index: bij een lange loop of tocht op een dag met UV 6 of hoger één korte regel ("UV 7 rond het middaguur: zonnebrand en een pet kunnen helpen"). Bij de weerregel, niet als eigen kaart. Instelbaar, standaard aan.
- Zonsopkomst en zonsondergang: bij een training buiten "Licht tot 17.12" als de training na zonsondergang zou eindigen, en in de weerregel van de dag. Eén notatie voor tijden (zie de backlog: "13.05" en "06:11").
- Hoogte van een plek: de hoogte van je locatie of vakantieadres, voor de heuvelplekken hieronder en bij een tocht.
- Alles uit de bestaande koppeling (`src/integrations/openMeteo.ts`, daily `uv_index_max`, `sunrise`, `sunset`; de elevation-API), zonder sleutel, met een tijdgrens en een nette stilte zonder netwerk. Verandert de planning nooit. Sherpa op sonnet.

## Heuvels en trappen in de buurt via OpenStreetMap (akkoord eigenaar 7 november, bouwen)

- Overpass-API (OpenStreetMap, gratis, zonder sleutel): zoek binnen een straal (standaard 3 km) heuvels en hellingen, trappen (`highway=steps`), onverharde paden en sportvelden of een atletiekbaan, en met de hoogtes uit Open-Meteo het hoogteverschil.
- Waar je het ziet: bij een heuveltraining, een trap- of bergconditietraining en in een periode "Zonder sportschool" een regel als "Op 1,2 km een helling van 60 m" met een link naar de kaart (openstreetmap.org, buiten de app). Op je eigen locatie of het adres van een vakantie.
- Privacy: alleen een afgeronde positie naar Overpass (zoals het weer), niets bewaard behalve het resultaat per plek op dit toestel, geen adres in de repo of de back-up tenzij je dat kiest. Instelbaar, standaard aan na een eerste vraag.
- Koppelen aan het onderzoek naar trainingsplekken en aan de periode "Zonder sportschool". Adapter in `src/integrations/`, engine kiest wat geschikt is, component toont. Sherpa op sonnet voor de adapter en het scherm, opus alleen als het de planning raakt (dat doet het niet: alleen een regel).

## Voor de GR5 en de bergen (akkoord eigenaar 7 november)

- Weerwaarschuwingen (Meteoalarm, open feeds per land): onweer, hitte, storm op de dag van een tocht of lange training, als regel met het droge feit eerst. Nooit stil iets aan de planning; hoogstens een voorstel.
- Hutten langs de GR5 via refuges.info (gratis, zonder sleutel): plaatsen, water, open of dicht, bij de etappes op de Ascend-tab. Hangt samen met de coördinaten van de 36 etappes (GPX van de eigenaar, zie Android en web).
- Lawinebulletins (EAWS, open formaat): alleen als een tocht in het sneeuwseizoen valt; anders niet tonen.
- Volgorde: na de twee punten hierboven.

## Regen in het komende uur, feestdagen, oefeningendatabase, maanstand (akkoord eigenaar 7 november)

- Regen in het komende uur: Open-Meteo `minutely_15` (zelfde koppeling als het weer). Vlak voor een training buiten één regel: "Over 20 minuten regen; nu gaan of om 18.30." Alleen op de dag zelf en alleen als de training binnen twee uur begint. Instelbaar, standaard aan. Klein, Sherpa op sonnet, samen met UV en zon.
- Feestdagen: Nager.Date (gratis, zonder sleutel), voor Nederland en voor het land van een vakantie. Een feestdag is een voorstel, nooit stil: "Donderdag is Hemelvaart: zet je de lange training daar neer?" Liever niet laat alles staan. Eén keer per jaar ophalen, op dit toestel bewaren, zonder netwerk niets. Raakt de planning via een voorstel: de engine-regel op opus, tekst en instelling op sonnet.
- Oefeningendatabase: wger (open source, CC-BY-SA) als bron bij de uitleg bij oefeningen, de echte vervangers en de Engelse versie. Nooit letterlijk overnemen: herschrijven door Scribe, techniek getoetst door Scout, licentie en bron vermeld zoals bij de tekeningen (`ATTRIBUTION.md`). Geen koppeling in de app, alleen bij het schrijven.
- Maanstand: zonder API uit te rekenen. Bij een avondtocht of bivak één regel ("Volle maan, je ziet het pad zonder lamp"). Klein, bij de bergpunten.

## Tempo bij zone 2 beter maken (eigenaar 7 november: "wat matig")

- Nu (`src/engine/aerobicTrend.ts`): alleen geplande rustige en lange duurlopen, met de gemiddelde hartslag van de hele loop, per week één punt. Met twee of drie loopjes per week en twee die buiten zone 2 vallen geeft dat drie punten en een uitspraak ("17 seconden sneller") die sterker klinkt dan de data draagt.
- Meer en betere data: uit de reeksen van het horloge (run in detail, `storage/activityDetail.ts`) de stukken van minstens 5 minuten stabiel in zone 2 op vlak terrein, uit elke loop (ook in- en uitlopen van intervallen en de lange duurloop), in plaats van één gemiddelde per loop. Gecorrigeerd voor helling (tempo naar vlak omgerekend) en warmte (`engine/heatPace.ts`), en hartslagdrift (alleen het stuk na de eerste 10 minuten).
- Eerlijker zeggen: "eerste schatting" tot er minstens 8 metingen over 4 weken zijn, daarna de verandering met een marge ("ongeveer 10 tot 20 seconden sneller"). De cijfers in de tekst komen uit dezelfde functie als de grafiek.
- Een leesbare grafiek: elke meting als stip, het weekgemiddelde als lijn, een as met tempo's en "sneller" omhoog erbij, de hoogste en laagste week benoemd. Korte tekst: één zin wat het betekent, het hoe achter de i.
- Scout eerst kort (welke drempels voor stabiel en hoe lang, warmtecorrectie), dan Sherpa: engine op opus (afgeleid, append-only, raakt de planning niet), grafiek en tekst op sonnet.

## Calisthenics, los of naast krachttraining (wens 7 november, grondig)

Doel: calisthenics als volwaardige manier van trainen in ASCEND, los of samen met krachttraining. Het moet echt goed in elkaar zitten; eerst onderzoek, dan ontwerp, dan bouwen.

- Stap 1, onderzoek (Scout op opus, twee delen):
  - Apps: hoe Thenx, Calimove, Madbarz, Caliverse, Freeletics en de Recommended Routine van r/bodyweightfitness het doen. Progressies (ladders als knie-push-up, push-up, archer, one-arm), vaardigheden (pull-up, dip, muscle-up, handstand, L-sit, front lever), hoe ze vooruitgang meten zonder kilo's, hoe ze het combineren met gewichten.
  - Wetenschap: progressie via hefboom, tempo en herhalingen in plaats van gewicht; RIR bij oefeningen met je eigen gewicht; houdingen in seconden; vaardigheid tegenover kracht; combineren met kracht en hardlopen voor de berg (benen, rug, grip).
  - Lees eerst `docs/onderzoek/` en `docs/visie/` (geen dubbel werk).
- Stap 2, ontwerp (Cartographer en coördinator): hoe het in ASCEND past. Voorstel om te toetsen: een eigen doelsoort "Vaardigheid" met mijlpalen als ladder (zoals de GR5 en de rugzakladder), een vaardigheid als tussendoel naast een hoofddoel, en per training de keuze kracht, calisthenics of samen. Forge kent dan ook stappen in een progressie in plaats van alleen kilo's, houdingen in seconden, extra gewicht en hulp met een band.
- Stap 3, bouwen in stukken van hoogstens een uur: data (progressies en vaardigheden), engine (vooruitgang zonder kilo's, planner-rollen), Forge (rij voor een progressiestap en een houding), Ascend-tab (de ladder), instellingen.
- Vaardigheidsdoelen (eigenaar, 7 november): doelen voor houdingen en vaardigheden met je eigen gewicht, zoals een handstand, een push-up in handstand, een L-sit, een front lever, een muscle-up. Elk doel is een ladder van progressies met een duidelijke toets per stap (bijvoorbeeld 3 x 10 seconden vasthouden), en een vaardigheid kan een eigen doel of een tussendoel zijn.
- Een database van vaardigheden en progressies, liefst open en zonder sleutel. Uitzoeken: free-exercise-db (yuhonas, publiek domein, JSON met foto's), wger (open source, CC-BY-SA, ook lichaamsgewicht), de tekeningen die ASCEND al gebruikt (Workout Guide en Everkinetic, CC BY-SA, `public/exercise-art/ATTRIBUTION.md`) en de progressies van r/bodyweightfitness. Betaalde of sleutel-API's (zoals ExerciseDB via RapidAPI) niet: geen sleutels in de app. Een bron wordt eenmalig ingelezen en herschreven (geen koppeling in de app), met licentie en naamsvermelding zoals bij de tekeningen.
- Plaatjes: elke oefening en elke progressiestap heeft een tekening in dezelfde stijl als nu (lijntekening, kleur uit de tokens). Ontbreekt een houding in de open bronnen, dan uitzoeken of we hem in dezelfde stijl kunnen tekenen.
- Moment: na de Forge-punten die hetzelfde oefeningenmodel raken (RIR bij afvinken, toestel, echte vervanger, uitleg bij oefeningen), want calisthenics bouwt daarop. Het onderzoek (stap 1) kan eerder, het staat los.
- Schatting: onderzoek 300k tot 500k tokens, ontwerp 150k tot 250k, bouwen vijf tot acht rondes met review, samen ongeveer 2,5 tot 3,5 miljoen tokens, verdeeld over drie tot vijf bouwmomenten (twee tot drie weken).

## Geparkeerd

- Spierindex stap 3.

## Werkwijze, voor de coördinator

- Een controle op echte data: een script dat een back-up van de eigenaar (alleen in de scratchpad, nooit in de repo) door de engine haalt en dezelfde invarianten toetst. Draaien zodra de eigenaar een back-up stuurt.
- Afspraken die nu alleen in het gesprek staan: de eigenaar stuurt elke zondag een verse back-up, en start na 1 november elke paar dagen een nieuwe chat ("lees docs/backlog.md en ga verder").

## Werkwijze, overig

- Het wekelijkse onderhoud en de appscan op Sonnet laten draaien en na een paar weken kijken wat ze vinden en kosten.
