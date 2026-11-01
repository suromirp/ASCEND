# Kansen met gegevens, het middelgrote werk en het kleine werk dat over was

Datum: 2026-11-01
Status: aangenomen

## Besluit

ASCEND rekent je eigen klimtempo met rugzak uit je tochten, laat een GR5-etappe en een gewone dag van je hoofddoel zien als band van uren op dat tempo, en legt je snelste stuk in gewone loopjes naast je test. Daarnaast drie kleine dingen: een regel over wennen aan warmte voor een zomertocht, bergweer op de hoogte van je tocht, en een voorstel met Akkoord bij een zware training op een ochtend waar twee van de drie getallen afwijken. Elk is een schakelaar in het blad Signalen uit je gegevens (Lichaam), standaard aan. Alleen het laatste raakt de planning, en alleen via een voorstel met Akkoord.

## Reden

Klimtempo (`engine/climbPace.ts`, kaart Klimtempo op Je stand onder Belasting, instelling "Je klimtempo"). Wat telt: de klimstukken en dalingen uit het profiel van een wandeling of tocht buiten (`runMetrics.ts#climbsOf` en `#descentsOf`, minstens 50 meter, 4 minuten en 4 procent, en alleen als de hoogte klopt met die van de bron), het laatste jaar tot en met vandaag. Geen hardlopen en geen loopband. De drempel is zes klimmen uit minstens drie verschillende tochten: zes is wat de trend Bergop en bergaf al vraagt, drie tochten zodat één goede of slechte dag het getal niet maakt. Tot dan staat er hoeveel er al zijn; zonder een enkele klim staat er niets. Het getal is de mediaan in meters per uur, op tien meter, met het middelste deel (een kwart tot driekwart) als band. Omlaag pas met drie dalingen, anders de norm. Het rugzakgewicht noemt de kaart als het bij minstens de helft van de klimmen bekend is.

Etappetijd op je eigen tempo (`climbPace.ts#stageTimeEstimate`, in het blad van een etappe en op de kaart Klimtempo, instelling "Etappetijd op je eigen tempo"). De wandelnorm (`goalRoute.ts#estimatedHikingMinutes`, DIN 33466) blijft de rekenregel, met 4 km per uur vlak, maar met jouw meters per uur omhoog en omlaag in plaats van 300 en 500. De band loopt van het snelle tot het trage eind van het middelste deel, in halve uren, en is minstens een uur breed. Is de rugzak van je hoofddoel zwaarder dan op je klimmen en weet ASCEND je gewicht, dan gaat het trager in verhouding tot de totale massa; met een lichtere rugzak nooit sneller dan gemeten. Zonder genoeg klimmen blijft de looptijd van de site en de wandelnorm de schatting. Het is een tijd en geen percentage: Klaar voor je doel blijft het ene voortgangsgetal.

Tempocurve tussen testen (`engine/paceCurve.ts`, kaart Tempo naast je test op Je stand onder Lopen, instelling "Tempocurve tussen testen"). Per gewone loop buiten de snelste 5 km uit de details (`runDetail.bestFive`), of zonder die de snelste drie hele kilometers achter elkaar, sinds de test waar je tempo's uit komen (`pacesFromLogs().paces.test`, nooit zelf de laatste testlog). Met dezelfde VDOT naast de test: meer dan de spreiding van een test sneller (3,5 procent) wijst op iets sneller en zegt dat een nieuwe test meer zegt; tot 10 procent trager past; nog trager is rustiger, wat normaal is in training. Pas drie weken na de test en na drie zulke loopjes. De test blijft de bron voor de tempo's, de voorspelling en het horloge.

Wennen aan warmte (`engine/heatAcclimation.ts`, in Je voorbereiding in de reisplanner, instelling "Wennen aan warmte"). In de laatste drie weken voor een vertrek van juni tot en met september één regel dat een paar trainingen in de warmte je lichaam kunnen helpen wennen.

Bergweer op hoogte (`engine/mountainWeather.ts`, `storage/mountainWeather.ts`, kaart op Vandaag onder de volgende tocht, instelling "Bergweer op hoogte"). Een tocht in de bergen of de sneeuw krijgt een optioneel hoogste punt (`TrekDetails.highestM`, 200 tot 4.800 m). Op de dag ervoor en tijdens de tocht vraagt ASCEND Open-Meteo, dezelfde bron en dezelfde afgeronde plek als het gewone weer, met `elevation` erbij, hoogstens eens per uur zoals het gewone weer, en alleen op die dagen. Het is een aparte vraag, omdat `elevation` op de gewone voorspelling ook het weer van thuis zou omrekenen. De kaart noemt temperatuur, windstoten, onweer in de middag en het vriespunt, met de tijd van ophalen ("gisteren" als het van de avond ervoor is) en een vaste verwijzing naar het bergweer van Météo-France. Alleen informatie, geen oordeel. Het antwoord is een cache en gaat nooit mee in de back-up.

Voorstel bij een slechte ochtend (`engine/morningProposal.ts`, kaart op Vandaag onder de missiekaart, instelling "Voorstel bij een slechte ochtend", werkt alleen met Twee van drie aan). Wijken twee van de drie getallen af (`morningRule.ts`) en staat er vandaag een tempoloop, intervallen, een test of een zware beendag, dan één voorstel met Akkoord om die training naar een goede latere dag in de week te doen, met welke getallen afwijken. Niet als je op Ben je moe Nee zei of je ochtendcheck Alles normaal was, niet bij een wedstrijd, niet als je ziek bent gemeld en niet naast een ander voorstel voor dezelfde training (de ochtendcheck of de kaart Benen). Het verschuiven gebruikt dezelfde regels als LEG-EASE (`adviceEngine.ts#laterMoveAdvice`, nu gedeeld), een test dezelfde zoektocht als het testvoorstel na Wat speelde er. Lichter doen is een zin in het blad, geen wijziging.

Opslag en historie. Er wordt geen log beschreven en er is geen nieuwe uitzondering op "logs nooit herschrijven". Nieuw opgeslagen: zes schakelaars in `AppSettings` (optioneel, afwezig is aan, een verkeerde waarde valt bij het importeren weg) en `TrekDetails.highestM`. Het schemanummer van de back-up blijft gelijk: alles is optioneel en aanvullend. `storage/migrations.ts#migrateLeavePeriods` neemt het hoogste punt alleen over bij bergen of sneeuw en binnen het bereik; een verkeerd hoogste punt valt weg zonder de tocht of de periode te verliezen, en een oude back-up importeert zoals hij was. Het hoogste punt komt alleen in een tocht via het blad van de tocht, dat zelf een voorstel met Akkoord is. Het bergweer en de luchtkwaliteit blijven een cache op het toestel. Vandaag telt mee: een klim of loop van vandaag telt, een van morgen niet, en het bergweer van een tochtdag geldt vanaf de dag ervoor. Een fout bij het ophalen laat de vorige voorspelling van dezelfde plek en hoogte staan; een andere plek krijgt hem niet. `src/storage/planGolden.test.ts` is niet bewogen.

## Alternatieven

- De klimmen van hardlopen meetellen. Niet gekozen: hardlopend klim je anders dan met een rugzak op een pad.
- Het klimtempo uit de totale hoogtemeters en duur van een tocht. Niet gekozen: daar zitten vlakke stukken, dalen en stops in, dus het getal zegt weinig over klimmen.
- Lichaamsgewicht zonder MacroFactor schatten voor de rugzakcorrectie. Niet gekozen: zonder gewicht rekent ASCEND niet om en zegt de kaart het rugzakgewicht erbij.
- De tempocurve laten meetellen voor je tempo's. Niet gekozen: in training loop je zelden voluit, en de test is het kompas (`2026-10-27-testloop-lezen.md`).
- Bergweer via de gewone voorspelling met `elevation`. Niet gekozen: dat rekent ook het weer van thuis om.
- Bij twee van drie zelf de training lichter maken. Niet gekozen: elke wijziging in de planning is een voorstel met Akkoord, en lichter doen is een keuze bij het inlopen.

## Bron

`docs/onderzoek/Kansen met gegevens.md` (kansen A, C, D, F en I en hoofdstuk 4), `docs/beslissingen/2026-10-31-kansen-stap-0.md`, `docs/architectuur/doelen.md`, `docs/architectuur/lopen-en-tests.md`, de opdracht van de coördinator. Geen persoonsgegevens; alle testdata is nagemaakt.

## Vervangt

Niets. Het deel "Bij twee van drie meteen een voorstel" uit de alternatieven van `2026-10-31-kansen-stap-0.md` is hiermee gebouwd, als eigen kaart en niet in de ochtendkaart.

## Terugdraaien

Elke schakelaar in Signalen uit je gegevens zet zijn deel stil. Het hoogste punt van een tocht mag leeg blijven; een oudere app kent het veld niet en slaat het over. Wie `laterMoveAdvice` terug wil, zet de code terug in `legEaseMoveAdvice`; die gedraagt zich hetzelfde.
