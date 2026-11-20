# Eén ochtend per dag, ook na een oude back-up

Datum: 2026-11-20
Status: aangenomen

## Besluit

Een ochtend uit een back-up zonder id en zonder bron (`import:<datum>`) is een ochtend zonder bron. Staat er op dezelfde dag een ochtend met een bron, dan gaat die voor: bij het lezen altijd, en in de opslag gaat de ochtend zonder bron weg zodra elk getal dat hij heeft ook op de ochtend met een bron staat. Bij ontkoppelen hoort een ochtend zonder bron bij de koppeling.

## Wat er gemeten is

Nagespeeld met een nagemaakte oude back-up (`src/storage/ochtendDubbel.test.ts`), geen gegevens van de eigenaar. Het toestel had voor 10 november een opgehaalde ochtend (rusthartslag 50, HRV 60, slaap 440 minuten, score 82). Het bestand had voor die dag een ochtend zonder id (rusthartslag 58, slaap 300 minuten). Na de import stonden er twee ochtenden op die dag, en de app toonde een mengsel: rusthartslag 58 en slaap 300 uit het bestand, HRV 60 en score 82 van het horloge. De oorzaak: de opslag geeft de ochtenden in volgorde van id, `import:` komt in het alfabet voor `intervals.icu:`, en wie een dag leest neemt per getal het eerste dat hij tegenkomt (`engine/wellnessCheck.ts#dayRecord`, `#baselineValues`). Het oude getal uit het bestand won dus van het getal van het horloge, ook in het gemiddelde van vier weken.

## De regel

- Een ochtend zonder bron is alleen het id dat de import zelf maakt (`engine/sourcePrecedence.ts#isSourcelessMorning`). Een ochtend met een eigen id of een eigen bron valt er nooit onder.
- Lezen: eerst de bron die voorgaat, dan de aanvullende bron (Health Connect), de ochtend zonder bron als laatste (`orderBySource`). Het scherm toont dus per dag één ochtend met de getallen van de bron.
- Opslag: een ochtend zonder bron gaat weg als een ochtend met een bron op dezelfde dag elk getal heeft dat hij heeft (`engine/morningDouble.ts#doubleMornings`). Heeft hij een getal dat de andere mist (het horloge gaf die nacht geen HRV), dan blijft hij als aanvulling tot de bron dat getal ook heeft. Zo gaat er nooit een getal verloren.
- Import: een ochtend zonder bron die niets toevoegt aan wat het toestel of het bestand zelf met een bron heeft, wordt niet geschreven (`morningsToImport`). De import haalt zelf niets weg, dus alles of niets en Ongedaan maken blijven zoals ze waren.
- Ophalen: na een geslaagde ronde bij intervals.icu of Health Connect ruimt `storage/wellness.ts#tidyDoubleMornings` op. Die leest alleen de opslag. Een ronde die mislukt (verlopen sleutel, storing, geen netwerk, een antwoord dat niet klopt) komt er niet, en een ronde zonder ochtenden dekt niets, dus een leesfout haalt nooit iets weg.
- Bestaande opslag: de opstartstap `tidyDoubleMornings` (`engine/bootWatch.ts`) ruimt één keer per versie van de app op, en opnieuw na een teruggezette back-up. Het is een herstelstap met een grens in tijd; mislukt hij, dan opent de app gewoon en probeert de volgende start het weer.
- Ontkoppelen: een ochtend zonder bron hoort bij de koppeling (`belongsToLink`). Met "Ochtendgetallen in back-up" aan blijft hij, tenzij een opgehaalde ochtend van die dag zijn getallen al heeft. Met die instelling uit gaat hij weg, net als de opgehaalde. Hetzelfde geldt voor de grens van 400 dagen, voor het uitzetten van "Ochtendgetallen in back-up" (met Ongedaan maken) en voor een soort die je uitzet onder "Wat ASCEND van je horloge gebruikt". Een ochtend die je met de hand invulde (`manual:`) en een ochtend van Health Connect blijven staan.

## Reden

ASCEND heeft geen scherm om een ochtend in te vullen. Een ochtend zonder bron in een oud bestand kwam dus ooit van een koppeling, alleen weet niemand meer welke en hoe vers hij was. De ochtend die het toestel nu van de bron heeft is de nieuwste lezing; die hoort te winnen. Alleen weggooien wat gedekt is, omdat het horloge niet elke nacht elk getal geeft en de ochtenden juist in de back-up zitten voor het geval de bron ze niet meer levert.

## Eigen keuzes

- Niet "de opgehaalde wint en de andere gaat altijd weg", maar "gaat weg zodra hij niets toevoegt". Dat is de betere regel uit de opdracht: het scherm toont steeds één ochtend, en er verdwijnt geen getal.
- Geen migratiestap en geen nieuw schemanummer: er verandert geen opgeslagen vorm. `migrateMornings` blijft zoals hij is, een oud bestand importeert zoals voorheen.
- Geen uitzondering op "logs nooit herschrijven": een ochtend is een `RecoveryMetric`, geen `SessionLog` of `MilestoneProgress`. Een opgehaalde ochtend wordt bij elke ronde al door de bron overschreven. Daarom staat er niets nieuws in CLAUDE.md, alleen één zin ter verduidelijking in `docs/architectuur/historie-en-logs.md`.
- Geen instelling: dit is geen keuze die de app voor je maakt maar een fout in de opslag. "Twee ochtenden op één dag tonen" is geen stand die iemand zou willen.
- Geen melding bij het opruimen: wat weggaat staat getal voor getal ook op de ochtend die blijft. De uitleg staat hier en in de code.
- Geen Ongedaan maken voor het opruimen zelf. Verschilt het getal uit het bestand van dat van de bron, dan is dat van het bestand weg; het staat nog in het bestand.
- Een ochtend zonder bron telt bij het ontkoppelen van intervals.icu mee, ook als Health Connect nog aan staat. Kwam hij ooit van Health Connect, dan haalt die bron de laatste vier weken opnieuw op.

## Alternatieven

- De import een ochtend zonder bron het id van de bron geven (`intervals.icu:<datum>`). Niet gekozen: dan gaat een ochtend van onbekende herkomst door voor een opgehaalde, wat `migrateMornings` juist voorkomt.
- De twee ochtenden samenvoegen tot één rij. Niet gekozen: de volgende ronde overschrijft de opgehaalde rij met wat de bron geeft, en dan is het aangevulde getal alsnog weg.
- Alleen de leesvolgorde herstellen en niets opruimen. Niet gekozen: de back-up, het archief en het ontkoppelen blijven dan dubbele rijen meeslepen.

## Bron

Backlog I-84 (onderhoudsronde van 16 november, `docs/onderhoud/2026-11-16-onderhoudsronde.md`). Tests: `src/storage/ochtendDubbel.test.ts`, `src/engine/morningDouble.test.ts`.

## Vervangt

Niets. Vult `2026-10-31-kansen-stap-0.md`, `2026-11-01-ochtenden-archief.md` en `2026-11-02-health-connect.md` aan.

## Terugdraaien

Haal de stap `tidyDoubleMornings` uit `engine/bootWatch.ts` en `storage/bootMigrations.ts`, de aanroepen in `storage/wellness.ts` en `storage/healthConnect.ts`, en zet `morningsToImport` en `belongsToLink` terug naar de vergelijking op id. Wat al opgeruimd is komt terug door het oude bestand opnieuw te importeren.
