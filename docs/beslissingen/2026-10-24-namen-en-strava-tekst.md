# Duidelijkere namen van trainingen en een tekst om in Strava te plakken

Datum: 2026-10-24
Status: aangenomen

## Besluit

Vier trainingen krijgen een naam die zegt wat je gaat doen, en ASCEND zet bij een
gedane training een korte beschrijving klaar die je zelf in Strava plakt.

De oude en de nieuwe namen:

- Heuvels op en af wordt Heuvelsprints en afdalen (hard bergop, daarna rustig op en
  beheerst af; het afdalen is voor de GR5 het belangrijkste deel).
- Rustige loop met versnellingen wordt Duurloop met versnellingen.
- Bergconditie wordt Bergop wandelen (een helling of trap op de loopband of buiten).
- Herstel wordt Herstelwandeling (naast Herstelloop is het nu duidelijk wat je doet).

Blijven zoals ze zijn, omdat ze al zeggen wat je doet: Bovenlichaam A en B, Benen A
(zwaar) en Benen B, Rustige duurloop, Heuvelintervallen, Lange duurloop, Bergtocht,
Wandeldag 1 van 2, Tempoloop, Intervallen, Fartlek (een bekend woord voor
hardlopers, met de focusregel eronder), Progressieve duurloop, Herstelloop,
Rugzakwandeling, Testloop 5 km, Wedstrijd en Fietstocht.

Het voorvoegsel "ASC " voor de naam op het horloge blijft zoals het is. De nieuwe
namen zijn 24 tot 26 tekens, dus met voorvoegsel ongeveer 30. In de code en het
onderzoek staat niets over een grens voor de naam van een Garmin-workout; het
horloge laat een lange naam zelf inkorten.

De tekst voor Strava (`engine/activityText.ts`) is één of twee regels: de naam met wat
je deed ("Heuvelsprints en afdalen: 4× hard bergop, 4× rustig op en beheerst af."),
daaronder de gemeten afstand, tijd en stijging van de log, zonder wat er niet is en
zonder wat de eerste regel al zegt. De aantallen herhalingen zijn die van de log als
je ze invulde, anders die van de progressie van die week, uit dezelfde
`buildWorkoutPlan` als de workout naar het horloge. Een geschatte stijging (loopband)
telt niet als gemeten getal. Een knop "Tekst voor Strava kopiëren" staat in het
logblad en in de vraag na een training op Vandaag, aan of uit met de schakelaar
"Tekst voor Strava" bij Koppelingen (aan als standaard).

## Reden

"Heuvels op en af" zegt niet wat je doet, "Lange duurloop" en "Testloop 5 km" wel.
Strava geeft een activiteit altijd een eigen naam ("Middagloop"), dus wat de
training echt was staat alleen in een stukje tekst. De eigenaar schrijft dat nu zelf;
ASCEND weet het al.

Waarom ASCEND niet zelf naar Strava schrijft: de Strava-API vraagt een app met een
geheim en een omleidingsadres op een server, en een token dat daar wordt gewisseld en
ververst. ASCEND heeft bewust geen server en geen account. Een knop die de tekst
kopieert houdt alles op de telefoon, en de tekst verlaat het toestel alleen als de
eigenaar hem zelf plakt.

Opgeslagen sjablonen: `ensureDefaultTemplates` (een opstartstap) zet elk ingebouwd
sjabloon op zijn huidige definitie en loopt opnieuw na een nieuwe versie van de app en
na het terugzetten van een back-up. De nieuwe namen komen daar vanzelf mee. Er is geen
scherm waar je de naam van een sjabloon zelf wijzigt, dus er is geen eigen naam die
verloren kan gaan; een bestand dat je met de hand aanpaste krijgt wel de standaardnaam
terug, zoals bij elke eerdere wijziging van een sjabloon. Een SessionLog bevat geen
naam (alleen het id van het sjabloon), dus de historie leest vanzelf met de nieuwe
naam en wordt niet herschreven. Het nieuwe veld `AppSettings.stravaText` is
optioneel en zonder waarde aan, dus het schemanummer van de back-up verandert niet.

## Alternatieven

Een eigen stap in `storage/migrations.ts` die alleen hernoemt als de opgeslagen naam
precies de oude standaardnaam is: niet nodig, omdat de sjablonen al bij elke nieuwe
versie en bij elke import op de standaard worden gezet; zo'n stap zou hetzelfde twee
keer doen.

Naar Strava schrijven met de API of via het deelmenu van de telefoon: de API vraagt
een server; het deelmenu geeft Strava alleen een bestand, geen beschrijving.

De tekst uitgebreider maken met alle stappen: te lang voor Strava en niet wat de
eigenaar zelf schrijft.

## Bron

Een gesprek met de eigenaar (de namen en de korte Strava-tekst). Voor de herhalingen:
`data/workoutStructure.ts` en `engine/workoutPlan.ts`.

## Vervangt

Niets.

## Terugdraaien

De namen staan in `data/defaultProgram.ts`; zet ze terug en de volgende opstart zet
ook de opgeslagen sjablonen terug. De knop gaat uit met de schakelaar "Tekst voor
Strava", of verdwijnt door `StravaTextButton` uit `LogDetailSheet` en `WatchAskCard` te
halen.
