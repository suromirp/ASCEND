# Backlog

Wat nog op de lijst staat, zodat een nieuwe sessie het niet uit het gesprek hoeft te halen. De
coördinator houdt dit bij: iets wat live staat gaat eruit, iets nieuws komt erbij met een regel uitleg.
Bijgewerkt op 31 oktober 2026.

## Loopt nu

- Niets. Alles uit "Kan nu" is af of staat hieronder als vervolg.

Live op 31 oktober: data op lange termijn, run in detail, ochtendkaart vernieuwd met twee van drie, kansen stap 0, zonder doel stap 4 tot 10, onderhoud punt 2 en 3.

## Kan nu, na wat loopt

- Kansen met gegevens, het middelgrote werk uit de top 10 (`docs/onderzoek/Kansen met gegevens.md`; stap 0 en het kleine werk staan in `docs/beslissingen/2026-10-31-kansen-stap-0.md`):
  - je eigen klimtempo met rugzak en een eerlijke schatting van een GR5-etappe (kans A), naast `engine/goalRoute.ts#estimatedHikingMinutes`;
  - de GR5-etappeschatting op je eigen tempo als band ("6,5 tot 7,5 uur"), pas na genoeg klimmen;
  - een persoonlijke tempocurve tussen twee testen in (kans F), als controle naast de test.
- Kansen, klein werk dat nog over is: de regel over wennen aan warmte in de laatste weken voor een zomertocht (tweede helft van kans D), bergweer op de hoogte van je tocht (kans I), en een voorstel met Akkoord bij een zware sessie op een ochtend waar twee van de drie afwijken (de rest van kans C, na de ochtendkaart). De bestandsroute voor FIT-bestanden als vangnet (stap 0c van het onderzoek) is later.
- Onderhoud, latere ronde: kg-opmaak, minuten- en uurlabels, korte datum en `pad` samenbrengen (`docs/onderhoud/2026-10-31.md`).
- Vier tekstpunten uit eerdere Lookout-rondes die zonder screenshot niet terug te vinden waren. Wachten op een screenshot van de eigenaar.

- Ochtenden in de back-up, klein (review 31 oktober): bij het uitzetten van "Ochtendgetallen in back-up" zonder koppeling de bewaarde ochtenden opruimen; `retire` slaat records over die al alleen de back-upvelden hebben; een kort besluit dat de cache een archief is dat ontkoppelen overleeft.
- Sporten die meetellen stap 1 (pictogrammen, Cartographer) en stap 4 tot 9 (import, vraag op Vandaag, scherm Sporten, weekcheck, vaste dag, hoeveel per soort). Stap 2 en 3 zijn gebouwd.
- Week: na het wissen van een vakantie houdt een training die je zelf verplaatste een `leave`-merk naar een periode die niet meer bestaat (vraagt dan blijvend om Akkoord). Merk wissen in `putBack` als `byYou`.
- Zonder doel: de kaart Je week op Je stand (ontwerp 2.8) en de vorm van de week later veranderen bij een andere richting.

## Bewust niet

- Voeding naast gewicht en kracht (kans E): de eigenaar laat dit liggen (1 november).

## Ochtendkaart, later

- De kaart leert van jou: hoe ging de training na "moe" of "slecht geslapen", en het advies past zich daarop aan. Hoort bij Kansen (slaap tegenover prestatie).
- Een melding op de telefoon met de vier keuzes, zodat je de app niet hoeft te openen. Na de Android-app.

## Na het herstel van het abonnement (zondag 1 november)

- Trainingen die niet doorgingen automatisch afhandelen. In de back-up van 31 oktober telden 22 van de 34 trainingen van de laatste 8 weken als gemist, veel nog op "gepland" zonder log. Idee: na een paar dagen zonder log vraagt de app één keer kort "Niet gedaan?" (of zet hem zelf op overgeslagen als je dat instelt), en een log van het horloge of MacroFactor op een andere dag koppelt hij als voorstel aan de geplande training. Nooit een log verzinnen; overslaan is een status, geen historie. Instelbaar, met besluit.
- Spierindex stap 1 en 2: controle op je training en slimmer vervangen.
- Grote bestanden opsplitsen: AppDataContext, ForgeWorkout, adviceEngine, database, backup, migrations.
- Android-app (Capacitor), als een van de grote nieuwe features van deze ronde. Lokale meldingen komen daarmee (een PWA zonder server kan geen melding sturen als de app dicht is).
- Een vakantie of vrije periode bijwerken in Week (data, soort, notitie), als voorstel met Akkoord (ronde 1).
- Health Connect als bron in de Android-app, via de adapter in `src/integrations/` (ronde 2b).
- Gegevens en instellingen overzichtelijker: een ontwerprapport per gebied (Stand, Logboek, Ascend, Run in detail, Lichaam, terugblikken; en de acht groepen instellingen), daarna bouwen; een complete herinrichting van een tab mag.
- Het citaat onderaan Vandaag standaard in het Engels, instelbaar (Engels, Nederlands, uit).
- Korte weekmelding op zondagavond: wat er gebeurde, wat er komt, één tip. Als melding via de Android-app; in de PWA als kaart op Vandaag bij het openen.
- "Waarom staat dit hier?" bij elke training in Week: één tik geeft de reden van de planning (welke regel, welk voorstel).
- Snel aanpassen voor vandaag: één knop "Minder tijd vandaag" die de training inkort, via een voorstel met Akkoord.
- Je tempo- en hartslagzones automatisch bijwerken na een test, als voorstel met Akkoord.
- Run in detail voor oudere runs: de details van eerdere loopjes alsnog ophalen (nu hebben er maar twee runDetail).
- De ochtendkaart met horloge en de vraag "Ben je moe?" duwt de missiekaart onder de vouw op een klein scherm: compacter of de vraag in plaats van de keuzes.
- Startvragen: standaardkeuze is nu "Een tocht of wedstrijd"; nagaan of "Fit blijven" logischer is voor iemand zonder plan.

## Na de Android-app

- Trainingen in je agenda inplannen en afstemmen, met kaders voor ochtend, middag en avond.

## Geparkeerd

- Spierindex stap 3.

## Werkwijze, voor de coördinator

- Veiligheidsnet: nagaan of `.github/workflows/deploy.yml` de tests draait voor de deploy naar GitHub Pages; zo niet, `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint` en `npx vitest run` ervoor zetten, zodat er nooit iets rood live gaat.
- Meer invarianten in `scripts/app-kaart/invarianten.mjs` uit de fouten van 31 oktober: de kop en de totaaltijd in Run in detail gelijk, geen testloopzin bij een training die geen test is, hoogstens één gevulde mint knop per scherm.
- De tekstkaart uitbreiden: nagemaakte standen met horlogegegevens, een vakantie, zonder doel en ziek, en de schermen Gegevens, Lichaam, Run in detail en de ochtendkaart met horloge.
- Een controle op echte data: een script dat een back-up van de eigenaar (alleen in de scratchpad, nooit in de repo) door de engine haalt en dezelfde invarianten toetst. Draaien zodra de eigenaar een back-up stuurt.
- CLAUDE.md bijwerken met Zonder doel, Kansen, Run in detail, de ochtendkaart en de tekstkaart (de eigenaar gaf op 31 oktober akkoord).
- Afspraken die nu alleen in het gesprek staan: de eigenaar stuurt elke zondag een verse back-up, en start na 1 november elke paar dagen een nieuwe chat ("lees docs/backlog.md en ga verder").

## Werkwijze, overig

- Het wekelijkse onderhoud en de appscan op Sonnet laten draaien en na een paar weken kijken wat ze vinden en kosten.
