# Bergschoenen inlopen

Datum: 2026-10-25
Status: aangenomen

## Besluit

Bij de taak "Kies je schoenen en begin met inlopen" in de Reisplanner leg je vast sinds welke datum je je nieuwe bergschoenen draagt, met eventueel een naam (standaard "Bergschoenen"). ASCEND telt vanaf die datum de kilometers en de stijging van wandelingen en tochten in het logboek, en zet ze af tegen een doel van standaard 100 km en minstens 6 weken voor vertrek. Zolang het doel niet gehaald is, staat op een lange wandeling of bergtocht met rugzak één regel: "Loop je nieuwe bergschoenen in". De regel verandert niets aan de planning en is geen voorstel.

De kilometers van hardloopschoenen blijven bij Garmin. ASCEND telt ze niet en houdt geen slijtage van hardloopschoenen bij.

## Reden

Nieuwe schoenen op de eerste dag van de tocht zijn een klassieke fout (kennispagina Voeten, schoenen en blaren). Garmin houdt de kilometers van hardloopschoenen goed bij, maar weet niet welke bergschoenen nieuw zijn en wanneer ze ingelopen moeten zijn. Dat laatste hangt aan de vertrekdatum, en die kent ASCEND.

De datum en de naam staan als optioneel veld `boots` in `AppSettings.journey`, naast wat al is afgevinkt. Het is een eigen notitie van de gebruiker en geen vlag. Wat ingelopen is wordt elke keer uit het logboek berekend (`engine/bootBreakIn.ts`), dus het logboek wordt niet aangepast. De taak telt als af zodra het doel gehaald is en de datum minstens 6 weken voor vertrek lag; dat wordt afgeleid en niet opgeslagen. Een handmatig vinkje blijft mogelijk. Is er minder dan 6 weken over, dan zegt de taak eerlijk: "Te laat voor 6 weken: loop ze zo veel mogelijk in".

Meetellen: logs van wandelen en van het soort tocht, buiten. Hardlopen, kracht en fietsen niet, en een loopband ook niet. De vertrekdatum is die van het hoofddoel, zoals de Reisplanner die al gebruikt.

Twee instellingen in de groep Doel en tochten: "Bergschoenen inlopen" (het doel in km: 50, 75, 100 of 150, advies 100) en "Herinnering bij lange tochten" (aan of uit, advies aan). De regel staat op de missiekaart van Vandaag bij een tocht of een wandeling met rugzakdoel, en pas nadat een datum is vastgelegd.

## Alternatieven

- Elke wandeling automatisch als schoenenkilometer tellen: ASCEND weet niet welke schoenen je aanhad, dus een datum van de gebruiker is eerlijker.
- Schoenen als aparte lijst met meerdere paren en slijtage: te groot voor de vraag, en dat is wat Garmin al doet.
- De planning aanpassen met een voorstel (bijvoorbeeld extra wandelingen): niet gevraagd, en het zou stilletjes de planning raken. Nu alleen een regel.
- De schoenen apart in AppSettings naast `journey`: dan moest de back-up er een veld bij krijgen. In `journey` reizen ze mee met de bestaande lees- en samenvoegregels.

## Bron

Gesprek met de eigenaar. `docs/onderzoek/Aanvullend onderzoek GR5 voorbereiding.md` en de kennispagina `/kennis/voeten-blaren` voor de 6 weken en 100 km.

## Vervangt

Niets.

## Terugdraaien

Zet "Herinnering bij lange tochten" uit en wis de datum bij de taak. Er is nooit iets in het logboek of de planning veranderd, dus er hoeft niets terug.
