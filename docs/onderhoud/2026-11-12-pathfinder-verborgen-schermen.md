# Pathfinder verborgen schermen, 12 november

Vraag van de eigenaar: zijn er verborgen pagina's of andere dingen die beter of anders kunnen. Gelezen in de code (App.tsx, pages, components, settingsLayout, settingsIndex) en op 412 px gezien met de kit van Lookout: de nagemaakte stand zonder doel en een verse installatie zonder data. Niet gezien: het trainingsscherm van Forge, de Android-onderdelen (welkom met toestemmingen, meldingen), echte offline-stand met een warme service worker (zie punt 5), en alles met je echte data. De nagemaakte stand is niet jouw gebruik.

## 1. De kaart van wat je kunt openen

De vijf tabs (Vandaag, Week, Stand, Ascend, Logboek) staan in de onderbalk en zijn 1 tik. Het tandwiel rechtsboven op elke tab opent /more.

Pagina's buiten de tabs, met de ingang en het aantal tikken vanaf Vandaag:
- Lichaam (/lichaam): 1 tik, het lichaamsicoon naast het tandwiel op Vandaag. Een plek (/lichaam/:plek): 2 tikken. Ook via Instellingen, Lichaam, rij Blessures.
- Stand (/stand) is een tab. Forge (/forge): 2 tikken, kaart onderaan Stand. Ook uit het Logboek ("In Forge") en uit een oefening in het trainingsblad.
- Weer en kleding (/weer): 1 tik via de weerregel op de missiekaart of de tegel in de Briefing. Ook 3 tikken via Instellingen, Gidsen en kennis.
- Trainingsplekken (/plekken): alleen via het blad "Hoe je het doet" van een training (2 tot 3 tikken) en via Instellingen, Gidsen (3 tikken). Wijst naar het blad en de reisplanner.
- Kennisbank (/kennis, /kennis/:topic): alleen 3 tikken via Instellingen, Gidsen en kennis, plus links uit taken van de Reisplanner. Een onderwerp is 4 tikken.
- Bronnen (/bronnen): alleen via Instellingen, Gidsen (3 tikken), en de naamsvermelding bij een tekening.
- Garmin koppelen (/koppelen/garmin): 3 tikken via Instellingen, Koppelingen; 1 tot 2 via de status- en stilterij op Vandaag.
- Datavelden voor je horloge (/horloge/datavelden): 5 tikken via Instellingen, Koppelingen, Geavanceerd, Datavelden bekijken; korter via het horlogeblad of de horlogegids.
- MacroFactor inlezen (/koppelen/macrofactor): 3 tikken via Instellingen; ook uit Forge, het gewichtsblad en de lichaamsinstellingen.
- Reisplanner (/reis), Paklijst (/reis/paklijst), Etappes (/etappes), Alleen onderweg (/onderweg): 2 tikken vanaf Ascend, maar alleen bij een doel van de soort trektocht. Reisplanner en Paklijst staan ook in het zoeken van Instellingen.
- Instellingen: /more, acht groepen, elk met een eigen pagina Geavanceerd (/more/<groep>/geavanceerd), plus Sporten en Hoeveel per soort. Dat zijn 8 plus 8 plus 2 pagina's. De "33" uit de vraag is het aantal bestanden in components/settings/groups; de index kent 273 instellingen.
- Oude adressen die doorsturen: /ascend/doelen, /stretches, /stretches/:id, /gids, /garmin, /kracht, /blessures. Een onbekend adres opent Vandaag. Geen daarvan wordt nog zelf in de app gebruikt; ze zijn alleen voor oude links (veilig, en goedkoop).

Bladen en volle schermen, met ingang: ongeveer 55 bestanden gebruiken useSheetClose. De groepen:
- Bij een training: Briefing (SessionActionSheet vanuit Week, missiekaart), Hoe je het doet, Horloge, Route groot, Eten, Zone 2 uitleg, Opwarmen, Uitvoeren (Forge als vol scherm via de pil of "Naar de training", ForgeFinish, ForgeLog, InputDock, ExerciseArt, ExerciseHistory).
- Na een training: DebriefSheet, CompletionMoment, RunInsightSheet, RunDetailScreen (vol scherm), SweatSheet, TrimSheet, MacroFactorDurationSheet, WatchActivity, WatchAlign, LogDetailSheet, DaySheet (Logboek).
- Plan en voorstellen: ProposalSheet, RescheduleDialog, ImpactSheet, TrainingSplitSheet, WeekReview, LeavePeriods, StrengthProgramWizard.
- Doelen en reis: GoalSheet, GoalForm, GoalMenu, GoalLabel, SkillGoal, CalisthenicsChoice, EarlierGoals, MilestoneDetail, Gr5Readiness, StageSheet, JourneyTaskSheet, PackItemSheet.
- Lichaam en herstel: BodyCheckSheet, ReportSheet, Complaints, StretchInfo, LegFatigueInfo, MorningCheckInSheet, IllnessCard.
- Stand: RhythmCard, OrderSheet, WeightOverviewSheet, Influence en InfluenceEffect.
- Koppelingen en gegevens: ImportWizard, de bladen van Instellingen (circa 40 bestanden), AutoBackup, Permission, Bundle.
- Vol-scherm-lagen zonder bladvorm: ChangeNotice, UpdatePrompt, UpdatedNotice, DeviceShellHost, LiveUpdateHost, AutoBackupHost, PermissionWelcome (Android), CompletionMoment, StartWizard.

## 2. Verborgen, wees en dood

Moet:
- De Kennisbank belooft op zijn eigen scherm: "Elke week kiest ASCEND er een voor je uit, op Vandaag." Op Vandaag staat die les niet meer. LessonCard.tsx wordt nergens geïmporteerd; het hele pad (Vandaag, weekles, lees) is losgekoppeld. De kaart "Deze week" op de Kennisbank zelf blijft wel staan. Dit is een valse belofte en een kennisbank zonder ingang buiten het tandwiel. Zonder doel opent de Kennisbank bovendien met "Je rugzak pakken" als les van de week en "De GR5 in etappes" als eerste onderwerp, voor iemand die geen tocht heeft.
- Reisplanner, Paklijst, Etappes en Alleen onderweg zijn alleen verborgen in de zin dat de ingang bij een trektocht hoort; de route zelf is niet afgeschermd. Met de stand zonder doel opende ik ze allemaal: Etappes toont "De 36 etappes van de GR5", Paklijst 7,8 kg basisgewicht en 0 van 24, Alleen onderweg het alarmnummer van Frankrijk. De Reisplanner vraagt dan wel om een doel, de rest niet. Dat botst met "zonder doel geen bergtocht, wandeldag of rugzakladder". Het instellingenzoeken (reisplanner, paklijst, bergschoenen) leidt er ook heen, zonder doel.
- Dode code die iets kan renderen: AdventureCard.tsx (51 regels) en LessonCard.tsx (26 regels) worden nergens geïmporteerd. De groep Soon.tsx ("Deze groep komt in een volgende stap") is nog de terugval van SettingsGroupPage voor elke groep zonder inhoud; alle acht bestaande groepen hebben inhoud, dus alleen bereikbaar met een foute groepsnaam in de link, en dan een tekst die niet waar is. Een onbekende groep zou naar het overzicht moeten gaan, zoals de opmerking in settingsLayout zelf zegt.

Mag:
- Bronnen (met 194 onderzoeken en 75 bronnen) heeft geen enkele ingang op het moment dat je het nodig hebt: de "Waarom"-uitleg (Why) en de bladen "Waar om deze training" verwijzen er niet naartoe. Alleen via het tandwiel.
- Trainingsplekken, Weer en Kennisbank hangen alleen aan de groep Gidsen, vier rijen zonder waarde of keuze.
- Datavelden staat op vier plekken (instellingengroep Koppelingen, Geavanceerd, horlogegids, horlogeblad).
- /plekken?training=... en /bronnen?soort=... zijn ondoorzichtige diepe links, bruikbaar maar niet te ontdekken.

## 3. Dubbele schermen voor hetzelfde moment

- Een training uitvoeren of bekijken: Briefing, trainingsscherm (Forge), blad uit Week (SessionActionSheet) en de missiekaart. Al bekend; hier niet opnieuw uitgewerkt.
- Een loop na afloop: DebriefSheet, CompletionMoment, RunInsightCard en -Sheet, RunDetailScreen, WatchActivity, WatchAsk, LogDetailSheet en DaySheet in het Logboek. Zes tot acht lagen voor het moment "het is klaar, wat zie ik", waarvan drie volledig verschillende ingangen naar dezelfde loop (Vandaag, Logboek, Stand).
- Je week: YourWeekCard op Ascend, YourWeekStandCard op Stand, het weekoverzicht in Week en JourneyWeekCard op Vandaag. Eén vraag ("hoe staat mijn week ervoor") op vier schermen, drie vormen. Valt samen met de geplande Week en Stand-ontwerpen.
- Het weer: de pagina /weer (plaats zoeken, regels, privacy), WeatherTodayCard, MountainWeatherCard, WeatherWarningCard, WeatherLine, de weertegel in de Briefing en in Instellingen de rijen Weerplaats, Weer volgt je locatie, Je locatie (Gegevens), Heuvels in de buurt. De rij Weerplaats opent een blad dat zelf weer naar de pagina Weer navigeert: een instelling die naar een pagina leidt die ook een instelling is.
- Noodgevallen: de pagina Alleen onderweg en het Kennisbankonderwerp "Als het misgaat" (noodgevallen) zeggen grotendeels hetzelfde; de eerste linkt naar de tweede.
- Reis in het groot: Reisplanner (taken), Etappes, Kennis "De GR5 in etappes", StageSheet, Gr5ReadinessSheet en doelkaarten op Ascend: de GR5 heeft vijf tot zes ingangen.
- Gewicht: kaart op Vandaag, kaart en overzichtsblad op Stand, blad in Instellingen, importstroom MacroFactor. Staat al in het vorige verslag.
- Lichaam: de pagina Lichaam, BodyCheckCard en -Sheet op Vandaag, ReportSheet, LegFatigueInfoSheet, Complaints, IllnessCard en de rij Blessures in Instellingen (een link, geen instelling).
- Back-up: Back-up, Automatische back-up, Back-up vaste map, Ochtendgetallen in back-up, Reeksen in back-up, Back-ups bewaren, Opslag beschermd, Toestemmingen, Kopieën van voor een import. Dat zijn negen rijen of meer voor één onderwerp, plus ExportReminderBanner, de kaart op Vandaag en de importstroom in het welkom.
- Citaat: QuoteCard (Vandaag), Citaat na een training en Citaat op Vandaag als twee instellingen.

## 4. Instellingen

Geen keuze maar een ingang of actie (horen niet onder instellingen):
- Gidsen en kennis: vier rijen, alles een link (Weer en kleding, Kennisbank, Trainingsplekken, Bronnen). Geen instelling.
- Blessures (naar /lichaam), Datavelden bekijken, Laatste export (MacroFactor), Reisplanner, Paklijst, Versie en bijwerken, Alles verwijderen, Adviezen opnieuw berekenen, Startniveau zelf invullen. Acties horen als actie, niet als rij met waarde.

Dubbel of bijna dubbel:
- Forge rekent mee (forge), Krachttraining bijhouden (kracht), Forge rekent mee (forge-rekent-mee), ASCEND naast MacroFactor (forge-naast), Programma uit MacroFactor: vijf rijen over de verhouding tot MacroFactor.
- Sportschool (gym-profiel) en Je sportschool (sportschool); Trainingsduur, Hoogstens per krachttraining, Gewone krachttraining, Beendag (vier rijen voor één grens).
- Ochtend: Ochtendcheck, Ochtendkaart, Ochtendvraag, Tijd van de ochtendvraag, Ochtend begint om, Voorstel bij een slechte ochtend, Twee van drie, Hoe voelt je lijf, Benen vragen na een test, Vragen bij een korte nacht. Tien instellingen voor één moment, op drie groepen verdeeld (Vandaag, Vandaag Geavanceerd, Lichaam).
- Week: Weekterugblik, Dag van de weekterugblik, Weekvraag, Weekmelding op zondag, Voorstel bij een probleem in de week, Melding na jouw keuze.
- Weer: Weer bij je training, Beste moment, Weerwaarschuwingen, Lawinegevaar, Regen in het komende uur, Weerplaats, Weer volgt je locatie, Ruilen bij slecht weer, Bergweer op hoogte, Luchtkwaliteit, Wennen aan warmte, Hitte bij je tempo. Twaalf, verdeeld over Vandaag en Lichaam.
- Loop: Run in detail (3 schakelaars), Loopvorm (5), Loopinzicht (5), Weer bij loopinzicht, Hartslag van de borstband. Zeventien schakelaars om te bepalen wat je na één loop ziet.

Staan op de verkeerde plek (horen bij het scherm waar ze werken):
- Forge (circa 60 instellingen op één groepspagina met 74 rijen): rusttimer, geluid, volume, 1RM tonen, schijven tonen, bijsturen in de training, uitleg uitgeklapt, plaatjes bij oefeningen. Het Forge-scherm heeft alleen een link "Instellingen van Forge" onderaan. Zet de zes tot acht die je tijdens een training wilt, in een blad "Hoe Forge werkt" op de training zelf; de rest mag achter het tandwiel.
- Weerplaats en kledingvoorkeur horen bij de pagina Weer, niet in Vandaag.
- Hartslag, Intensiteit tellen, Tempo uit stabiele stukken, Eten onderweg, Klimtempo, Tempocurve, Etappetijd op je eigen tempo staan onder Lichaam maar gaan over lopen en tempo; hoort bij Planning of bij Stand.
- Route-instellingen (Startpunt van je lus, Ondergrond van de kaart, Welke lus eerst) staan op Vandaag; ze werken in de Briefing.
- Terugknop op een tab en Na een herstart zijn bediening; Beweging, Trillen, Geluid, Lucht bovenaan zijn weergave. Samen een groep "Weergave en bediening".
- Geen instelling in Week, Stand of Ascend wijst vanaf het scherm zelf naar zijn bladen; de enige in-context link is Forge. Wie bij Week iets wil veranderen, moet via het tandwiel of het zoekveld.

Groepen die kunnen samen:
- Gidsen en kennis weg als groep (zie de vijf hieronder).
- Koppelingen en Gegevens: Garmin, Horloge, MacroFactor, Strava, Health Connect en Back-up zijn allemaal de verbinding met de buitenwereld.
- Back-up als één blad met de andere vijf rijen opgeklapt.
- Lichaam en Planning delen de tempo- en intensiteitsrijen.
- Vandaag en meldingen splitsen in Meldingen (tijden) en Weergave (loopinzicht, weer, beweging).
- Er zijn acht groepspagina's met elk een Geavanceerd-pagina; zes van de acht hebben Geavanceerd met 4 tot 6 rijen. Een tweede laag voor zes rijen is meer navigeren dan lezen.

## 5. Eerste start en lege standen

Gezien op 412 px met een lege installatie:
- Vandaag: het welkom, twee knoppen (Nieuw beginnen, Back-up terugzetten) en een zin dat alles op de telefoon blijft. Goed, geen leeg scherm.
- Het welkom is alleen Vandaag. De andere tabs blijven bereikbaar zonder planning: Week toont "0/0 gedaan, Niets gepland" met zeven dagen "Vrij"; Stand "Na je eerste training zie je hier hoe je ervoor staat" met drie lege cijfers; Logboek een lege maand; Ascend "Nog niets gepland. Kies een richting of een doel", daar leidt "Nieuw beginnen" je terug naar Vandaag (navigate('/')). Geen van die is leeg of stuk. Wel zijn het vijf tabs waar er één (Vandaag) iets te doen heeft; een nieuwe gebruiker mag de rest niet nodig hebben. Overweeg de andere tabs te dimmen of één zin te geven tot de eerste week er is. Mag.
- Zonder doel (stand zonder-doel): Vandaag toont de neutrale golven met Akkoord, Ascend "Geen doel, wel een richting: fit blijven". Klopt met de regels.
- Offline: de app is een PWA met precache. In mijn proef (verse context, vliegtuigstand direct na laden, nog zonder actieve service worker) liep de Weer-pagina vast op "Er ging iets mis ... Failed to fetch dynamically imported module", met de Engelse technische melding en "Stuur dit door". Dat is waarschijnlijk niet wat jij ziet (service worker is er dan al), maar de melding is dan wel wat een nieuwe gebruiker ziet die offline start. Ik kon dit niet met een warme service worker nagaan. Het hoort bij de regel dat de app nooit leeg start: de melding is niet leeg maar wel technisch. Ik leg het neer als te controleren.
- De offlinemelding onderaan zegt "Deze link opent zodra je weer verbinding hebt"; goed, maar alleen voor externe links.

## 6. De vijf met de meeste winst

1. Haal de groep Gidsen en kennis uit het tandwiel en geef elk ding een ingang op zijn moment: Weer op de weerregel (staat er al), Trainingsplekken in het blad "Hoe je het doet", de Kennisbank als onderdeel van Ascend bij een tocht, Bronnen als link onderaan "Waarom". Vier rijen zonder keuze zijn geen instelling, en de Kennisbank is nu 3 tikken diep met een valse belofte over Vandaag.
2. Schakel de tochtmodule (Reisplanner, Paklijst, Etappes, Alleen onderweg) af zonder trekdoel in de route en in het zoeken, en voeg Alleen onderweg samen met Kennis "Als het misgaat" (of andersom): vier schermen voor een zeldzaam geval, die zonder doel een GR5 tonen die de eigenaar niet heeft.
3. Zet de Forge-instellingen die je tijdens het trainen nodig hebt in een blad op het trainingsscherm zelf, en laat de pagina achter het tandwiel de rest zijn: 74 rijen is de grootste groep en het enige scherm met een link ernaar is onderaan Forge.
4. Voeg samen wat één onderwerp is: negen back-uprijen tot één blad Back-up, tien ochtendrijen tot één blad Ochtend, twaalf weerrijen tot één blad bij Weer, zeventien loopschakelaars tot drie. Het aantal rijen (273 instellingen, acht groepen met Geavanceerd) is nu zelf het zoeken dat het tandwiel moest oplossen.
5. Ruim de losse eindjes op: AdventureCard, LessonCard, Soon en de Engelse foutmelding bij een mislukte pagina; herstel of schrap de weekles op Vandaag (nu staat er een beloofde les die niet komt); en laat Je week één thuis hebben (Week of Stand), niet vier.

## Voor de backlog onder "Samenhang"

Alle vijf, plus: Moet (1: weekles-belofte op de Kennisbank, tochtmodule zonder doel). Mag: de rest. Niets blokkerend.
