# Opwarmen per spiergroep

Datum: 2026-10-23
Status: aangenomen

## Besluit

Forge houdt per training bij welke spieren al warm zijn (`src/engine/warmup.ts`) en kiest daarmee hoeveel opwarming een oefening nodig heeft.

- De volle opbouw (twee of drie sets) is er alleen voor de eerste zware samengestelde oefening van een lichaamsdeel: de benen, of het bovenlichaam (duwen en trekken samen).
- Een volgende samengestelde oefening op warme spieren krijgt één set. Dezelfde beweging als een oefening ervoor (leg press na squat, incline press na bankdrukken) krijgt een aanloopset van 70% voor 4. Een nieuwe beweging (RDL na squat, roeien of schouderpers na bankdrukken) krijgt een voelset van 65% voor 5.
- Een isolatieoefening op warme spieren krijgt niets. Een oefening voor borst of rug met één gewricht (flyes, pec deck, pullover, straight-arm pulldown, Kelso shrug) op koude spieren krijgt één lichte set van 50% voor 8. Arm, schouder (ook face pull), kuit, scheen, romp, heup en beenisolatie (beencurls, leg extension) krijgen nooit een opwarmset, ook niet als eerste. Daarvoor is `isolation_leg` aan de uitzonderingen toegevoegd en een nieuw patroon `isolation_upper` ("Isolatie borst of rug") gemaakt.
- Spieren tellen als warm door wat ervoor is gedaan: hoofdspieren 1, hulpspieren van een samengestelde oefening een half. Warm genoeg is een half of meer.
- Ook zonder historie is er een opwarming, uit het werkgewicht dat bekend is (het sjabloon of het vorige gewicht zonder RIR): 50% voor 8 en 80% voor 3. Is er geen gewicht, dan staan er lege opwarmrijen die zich vullen zodra set 1 een gewicht krijgt. Bij een te licht gewicht verdwijnen ze weer.
- Opwarmsets die je niet hebt aangeraakt volgen het eerste werkgewicht, ook als je dat verandert (elke rij bewaart zijn aandeel).
- Na de laatste opwarmset start de timer met 90 seconden (60 na één enkele set), niet met de volle rust van een werkset. Het onderzoek noemt 60 tot 90 seconden.
- De opwarming rekent in last en rondt af op het gewicht op de stang. Een stangoefening met een klein deel lichaamsgewicht (roeien met 8%) kreeg 52,5 kg bij 60 kg werkgewicht, nu 45 kg.

De instelling Opwarmen (Slim, Schema, Uit) blijft. Slim en Schema gelden voor de volle opbouw; Uit zet alles uit. De tekst van de instelling en de uitleg erachter zijn aangepast.

## Wat er nog meer met dit besluit is rechtgezet

De controle Krachtregels van 23 oktober vond meer dan de opwarmregel. Deze punten zijn in dezelfde ronde opgelost.

- De zin "één herhaling meer" staat er alleen als de rij ook meer vraagt dan vorige keer. Bij hetzelfde gewicht komt het doel nooit onder wat je vorige keer deed.
- Latere sets springen niet meer een hele stap omlaag. Is de stap groter dan een tiende van het gewicht, dan blijft het gewicht gelijk en zakt de onderkant van het bereik tot hooguit twee herhalingen. Het bereik van een latere set wordt nooit opgerekt.
- Een werkset die je zonder gewicht afvinkt neemt het gewicht van de set ervoor. Een gewicht bij set 1 gaat ook naar latere sets die nog leeg zijn.
- Past het vorige gewicht niet bij je sportschool (24 kg terwijl je rek 22,5 en 25 heeft), dan weigert het workoutscherm het voorschrift niet meer. Het neemt het dichtstbijzijnde gewicht en zegt dat in een zin. De pagina Kracht blijft de oude melding tonen.
- Bij een programma staat de voorgevulde herhaling niet boven wat het model bij dat gewicht verwacht.
- Bij hulp staat "hulp 30 kg" en "zelfde hulp", niet "-30 kg" en "zelfde gewicht".
- Na één training zegt de zin niet meer dat je geschatte kracht gestegen is, en bij twee keer onder verwachting staat "een stap lichter" als de stap meer dan 7% is.
- Ruilen van een oefening begint met de spieren die de oefeningen ervoor al warm maakten.

## Reden

Het onderzoek (KR-7 in `docs/onderzoek/Kracht loggen en progressie.md` en het rapport over warming-up voor krachttraining) zegt dat de opwarming de eerste werkset beschermt en dat spieren die al hard gewerkt hebben niet opnieuw opgebouwd hoeven te worden. De oude regel keek naar het bewegingspatroon en gaf een nieuw patroon juist de volle opbouw. In het standaardprogramma gaf dat 9 opwarmsets op Bovenlichaam A en 8 op Benen A, tot en met drie sets voor een RDL na vier zware squatsets en twee voor een hamstringcurl. Wie rustig traint wil het zware werk beginnen, niet een half uur opwarmen.

## Gevolgen in het standaardprogramma

Met nagemaakte historie van een week eerder en 80 kg lichaamsgewicht:

- Bovenlichaam A: van 9 naar 6 opwarmsets (bankdrukken 3, roeien 1, schouderpers 1, pulldown 1).
- Bovenlichaam B: van 2 naar 4 (de machine chest press 2, incline dumbbell press 1, chest-supported row 1); die twee krijgen nu ook een voorschrift omdat 24 en 26 kg niet meer stil alles uitschakelen.
- Benen A: van 8 naar 4 (squat 3, RDL 1, hamstringcurl niets, Bulgarian split squat niets).
- Benen B: van 2 naar 2 (goblet squat 2, de beenisolatie niets).

## Alternatieven

Een eigen instelling voor de rust na de opwarming: niet gemaakt, 90 en 60 seconden volgen het onderzoek en het is een kleine keuze; de bestaande rusttijd per oefening blijft wel de bovengrens.

Een eenbeensset met eigen gewicht (split squat, step-up) voor de eerste eenbeensoefening: niet gedaan. Het onderzoek noemt het, maar oefeningen met vooral lichaamsgewicht blijven zonder opwarmset zoals ze waren.

Voor beenisolatie op koude spieren één lichte set: afgewezen op verzoek van de eigenaar. Een beencurl als eerste oefening krijgt dus niets.

## Bron

`docs/onderzoek/Kracht loggen en progressie.md` (KR-7), het rapport Warming up voor krachttraining, het rapport van Warden Krachtregels (bevindingen B1 tot en met B13) en de wens van de eigenaar: een leg press na squats krijgt hooguit één set.

## Vervangt

Niets. Het besluit `2026-10-22-forge-opwarmen.md` (aflopende herhalingen en de lichte derde set) blijft gelden voor de volle opbouw. Het besluit `2026-10-22-forge-kracht-meerekenen.md` noemt de opwarming als een vaste opbouw per oefening; dit besluit maakt dat afhankelijk van wat er al warm is.

## Terugdraaien

In de instellingen onder Forge opwarmen op Uit zetten. Of in `warmupKind` (`src/engine/warmup.ts`) altijd `full` teruggeven om weer elke eerste oefening van een beweging de volle opbouw te geven.

## Aanvulling (ronde 2, na de review van Warden)

Instelling: Opwarmen per spiergroep (standaard) of per oefening. Bij Per oefening krijgt elke samengestelde oefening de volle opbouw, zoals vóór dit besluit; het staat in Forge onder Opwarmen (`warmupScope` in de krachtinstellingen). Zo is ook deze keuze instelbaar.

De rust na de opwarming (90 seconden na een opbouw, 60 na een aanloopset) blijft bewust vast. De rust per oefening is al instelbaar en geldt als bovengrens: de rust na een opwarmset is nooit langer dan de eigen rust van die oefening. Je kunt hem dus korter maken, niet langer dan 90 of 60 seconden.

Een samengestelde oefening die zelf geen opwarmsets kon krijgen (vooral eigen gewicht, of een heel licht gewicht) maakt het lichaamsdeel niet warm. Een zware squat na een bilbrug krijgt dus nog de volle opbouw.

Punt 4 van de review: de nieuwe bewegingspatronen geven cable fly, pec deck, pullover, straight-arm pulldown, Kelso shrug en face pull een standaardrust van 90 seconden in plaats van 120 of 150, en veranderen daardoor ook de ruilscores van die oefeningen. Dat is bedoeld: het zijn oefeningen met één gewricht.

Punt 7 van de review: het aandeel van een opwarmrij wordt bewaard als aandeel van het stanggewicht, niet van de last. Bij oefeningen met een deel lichaamsgewicht (een roeibeweging met 8%) klopt dat niet exact, maar het verschil is klein en de rij wordt toch op het rek afgerond.
