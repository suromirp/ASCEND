# Backlog

Wat nog op de lijst staat, zodat een nieuwe sessie het niet uit het gesprek hoeft te halen. De
coördinator houdt dit bij: iets wat live staat gaat eruit, iets nieuws komt erbij met een regel uitleg.
Bijgewerkt op 1 november 2026.

## Loopt nu

Ronde 2 van `docs/onderhoud/2026-11-01-aanpak-backlog.md` (ronde 1 is af, terugblik in `docs/onderhoud/reflectie-2026-11-01.md`).

Live op 1 november: Stand schuift niet meer zijwaarts, het cijferblok van Forge blijft open, de ochtendkaart na je antwoord, de rustdag die terugkomt, de rustiger fysioregel, de kortere voorschriftregel, het citaat in het Engels, een vakantie bijwerken, trainingen die niet doorgingen, ochtenden in de back-up veilig uitzetten, opmaak samengebracht, de tekstkaart met 21 schermen, drie ontwerprapporten in `docs/visie/`.

Live op 31 oktober: data op lange termijn, run in detail, ochtendkaart vernieuwd met twee van drie, kansen stap 0, zonder doel stap 4 tot 10, onderhoud punt 2 en 3.

## Kan nu, na wat loopt

- Kansen met gegevens, het middelgrote werk (kans A en F, de etappeschatting als band) en het kleine werk dat over was (kans C, D en I): gebouwd op `claude/kansen-middelgroot`, wacht op de poorten (`docs/beslissingen/2026-11-01-kansen-middelgroot.md`). De bestandsroute voor FIT-bestanden als vangnet (stap 0c van het onderzoek) is later.
- Vier tekstpunten uit eerdere Lookout-rondes die zonder screenshot niet terug te vinden waren. Wachten op een screenshot van de eigenaar.

- Sporten die meetellen stap 1 (pictogrammen, Cartographer) en stap 4 tot 9 (import, vraag op Vandaag, scherm Sporten, weekcheck, vaste dag, hoeveel per soort). Stap 2 en 3 zijn gebouwd.
- Zonder doel: de kaart Je week op Je stand (ontwerp 2.8) en de vorm van de week later veranderen bij een andere richting.

## Uit de terugblik op ronde 1 (vijf nieuwe punten)

- Vandaag: een vaste volgorde en een maximum voor kaarten boven de missie (ochtendkaart, Niet gedaan?, koppelvoorstel, rustdag terug, back-up). Op een slechte ochtend staan er nu vier boven de missie. Ronde 2.
- Vragen als Niet gedaan? wachten tijdens een ziekmelding, en komen pas terug als je beter bent. Ronde 2.
- Eerst koppelen, dan inhalen: MISSED-CATCH-UP kijkt eerst of er een losse log te koppelen is. Ronde 2.
- Ontwerprapport instellingen, de kleine delen: betere waarden en uitleg in de rijen, de bundel De ochtend, Weer en kleding. Ronde 2.
- Ontwerprapporten gegevens en Forge, de grote herinrichting (Stand met Ritme, weekterugblik, Logboek, Forge zonder snelknoppen en met Alles in het blad Oefening). Ronde 3, na het opsplitsen.

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

- Spierindex stap 1 en 2: controle op je training en slimmer vervangen.
- Grote bestanden opsplitsen: AppDataContext, ForgeWorkout, adviceEngine, database, backup, migrations.
- Android-app (Capacitor), als een van de grote nieuwe features van deze ronde. Lokale meldingen komen daarmee (een PWA zonder server kan geen melding sturen als de app dicht is).
- Android-meldingen met het scherm uit en trillen: het einde van de rust in Forge, de ochtendvraag en de weekmelding (ronde 2b, bij de Android-app). Toestemmingen direct na de installatie, in een korte welkomstreeks met per toestemming één scherm en "Niet nu".
- Health Connect als bron in de Android-app, via de adapter in `src/integrations/` (ronde 2b).
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

- Een controle op echte data: een script dat een back-up van de eigenaar (alleen in de scratchpad, nooit in de repo) door de engine haalt en dezelfde invarianten toetst. Draaien zodra de eigenaar een back-up stuurt.
- Afspraken die nu alleen in het gesprek staan: de eigenaar stuurt elke zondag een verse back-up, en start na 1 november elke paar dagen een nieuwe chat ("lees docs/backlog.md en ga verder").

## Werkwijze, overig

- Het wekelijkse onderhoud en de appscan op Sonnet laten draaien en na een paar weken kijken wat ze vinden en kosten.
