# De afdaalklok

Datum: 2026-11-11
Status: aangenomen

## Besluit

ASCEND houdt bij hoeveel dagen geleden je laatste afdaling was, op je echte logs. Na 21 dagen of meer komt er één regel op Vandaag met een voorstel voor een korte trapsessie (het nieuwe sjabloon Trap af) op een vrije dag. Begint een bergtocht over 8 tot 14 dagen en was er sinds dag -14 geen afdaling, dan vraagt ASCEND om nog één bekende afdaling tussen dag -14 en dag -7. Begint de tocht binnen 7 dagen, dan komt er alleen een zin, geen voorstel. Er verandert niets zonder Akkoord. De eigenaar koos dit op 11 november.

De logica staat in `src/engine/descentClock.ts` (puur), de regels heten DESCENT-CLOCK, DESCENT-TAPER en DESCENT-LATE en komen als laatste uit `engine/adviceCompute.ts#computeAdvice`. De instelling is Afdaalklok in het blad Tochten (Doel en tochten).

## Reden

Na een afdaling zijn je bovenbenen een paar weken beschermd tegen de spierschade van de volgende. Het programma heeft om de week een afdaaltraining, maar een overgeslagen heuvelsessie liet de bescherming stil verlopen: niets keek naar wat je echt deed.

## Eigen keuzes, elk met de reden

Wanneer een afdaling telt (`countsAsDescent`):

- Een wandeling of loop met 100 m dalen of meer. Maeo e.a. 2017 gaven de bescherming met ongeveer 110 m dalen in vijf minuten; regel A1 en de meter Afdalen vers (`data/goalKinds.ts`) rekenen al met 100 m. Eén drempel op drie plekken. Het getal is afgeleid, niet getoetst.
- De hoogtemeters komen uit `engine/standing.ts#descentOf`, dezelfde functie als de kaart met meters bergaf: het dalen van het horloge, en zonder dat getal het stijgen (een rondje daalt evenveel als het stijgt).
- Een training die zelf een afdaaltraining is, telt ook zonder hoogtemeters: Trap af en Heuvelsprints en afdalen. Dat is een nieuwe rol `descent` op het sjabloon, geen lijst met id's in de regel.
- Fietsen telt niet (bergaf rollen is geen excentrisch werk voor je bovenbenen). De loopband en de trapmachine tellen niet (je klimt, je daalt niet). Een loop zonder hoogtemeters telt als vlak: de meeste loopjes zonder getal zijn vlak, en anders zou de klok bij elke handgelogde loop "onbekend" zeggen.
- Een wandeling zonder hoogtemeters is onbekend. ASCEND zegt dat erbij ("heeft geen hoogtemeters, dus of je daar afdaalde weet ASCEND niet") en stelt de trapsessie toch voor: een overbodige korte prikkel kost weinig, een verlopen bescherming meer. Met Liever niet is het weg.
- Een eigen tocht met terrein berg of sneeuw die begonnen is, telt als afdaling op zijn laatste dag. Een meerdaagse tocht in de bergen zonder dalen bestaat niet, en na thuiskomst uit de bergen een trapsessie voorstellen zou onzin zijn. Een vlakke tocht telt niet.
- De Bergtocht uit het programma telt niet vanzelf: in vlak land is dat een lange wandeling. Hij telt als het log 100 m dalen heeft.

De klok:

- De grens is 21 dagen. Byrnes e.a. 1985: na 3 en 6 weken was de bescherming er nog, na 9 weken niet meer. Drie weken is de veilige eigen vertaling, en het is regel A1 uit het eerdere onderzoek.
- De klok telt in hele dagen op de dag van het log (`completedDate`), niet op het moment in UTC. Een afdaling om 00:30 in Amsterdam hoort bij die dag. Vandaag telt nog: een afdaling van vandaag is 0 dagen geleden.
- Zonder enige afdaling telt de klok vanaf je eerste log. Zonder logs zegt ASCEND niets: wie niets logde krijgt geen verwijt.
- De klok loopt door tijdens vakantie en ziekte (je spieren wachten niet), maar zegt dan niets: ziek of net beter eerst herstellen, op vakantie zonder training stil tot je terug bent.
- De regel in de weekterugblik uit het onderzoek ("al 19 dagen") is niet gebouwd. Eén plek, één regel: de kaart op Vandaag bij 21 dagen. Een herinnering op dag 14 (regel A1) ook niet, om dezelfde reden.

De dag van het voorstel (`findDescentDay`):

- De eerste dag vanaf morgen, tot zeven dagen vooruit, waar niets gepland of gedaan is. Morgen en niet vandaag: zo heb je een dag om een trap te kiezen.
- Niet je vaste rustdag, geen vakantiedag zonder training, geen dag van een tocht, geen lichte dag rond een tocht en geen ziektedag.
- 48 uur van een zware beendag: geen zware benen de dag ervoor of erna, gepland of gedaan.
- Nooit naast een harde loop, de dag ervoor of erna (dezelfde gedachte als `engine/hardRunApart.ts`).
- Niet in de drie dagen voor een test (regel A2: minstens drie dagen voor kwaliteit) en niet in de week voor een wedstrijd of het begin van een tocht.
- De week houdt minstens één dag zonder training.
- Nooit twee voorstellen die samen botsen: de afdaalklok rekent als laatste en zet niets op of naast een dag waar een ander voorstel van vandaag iets neerzet (inhalen, extra training, testloop, rustdag terug).
- Past er geen dag, dan komt de regel zonder voorstel, met Begrepen: "Neem in je volgende wandeling of loop een trap of helling mee naar beneden."
- Staat er al een afdaaltraining klaar in de komende zeven dagen, dan zwijgt de klok.

Trap af (`tpl_stairs_down` in `data/defaultProgram.ts`):

- 20 minuten: vijf minuten inlopen, tien minuten dalen. Regel A2: de eerste prikkel is 5 tot 10 minuten of 100 tot 200 m dalen. Dertig verdiepingen is ongeveer 100 m (regel A4, verdiepingen maal 3).
- Matig voor de benen, niet zwaar: het onderzoek noemt korte trap- en step-downsessies "leg-moderate". De 48-uursregel van de planning ziet hem dus niet als zware beendag; de klok houdt zelf afstand.
- Geen vaste dag: alleen een voorstel met Akkoord zet hem neer. Hij krijgt het slot van het voorstel, dus de planningsronde laat hem staan (getoetst met twee rondes achter elkaar).

Liever niet:

- Bij de 21 dagen geldt het voor dit blok van drie weken: op dag 42 vraagt de klok het opnieuw. Voor altijd zwijgen na één keer nee zou de klok uitzetten zonder dat je dat koos; daarvoor is de instelling.
- Bij de afbouw geldt het voor deze tocht.

Voor een tocht:

- Wat een tocht is: een actief doel van de soort tocht met hutten, tocht met tent, dagtocht, hoogtocht of trailrun (het hoofddoel zonder soort is de oude tocht), en een eigen tocht met terrein berg of sneeuw. De wekelijkse Bergtocht uit het programma is een training, geen tocht.
- Het venster is dag -14 tot en met dag -7 (regel A9). Het voorstel is dezelfde Trap af, met de tekst dat je een trap of helling kiest die je kent en daarna niets nieuws meer doet.
- De afbouw gaat voor de 21 dagen: hoogstens één afdaaladvies tegelijk.
- Binnen 7 dagen: geen voorstel, wel één zin met Begrepen. Regel A9 zegt: geen nieuwe excentrische prikkel in de laatste 7 tot 10 dagen. Een voorstel zou spierpijn op de tocht zelf geven. Zwijgen zou oneerlijk zijn, want je begint zonder verse bescherming; de zin zegt dat en geeft wat je nog wel kunt doen (rustig beginnen, kleine passen, stokken).

Wanneer de klok aan staat:

- Bij een bergdoel (advies): het hoofddoel is een tocht, of er is een actief doel van een bergsoort of een trailrun, of er staat een eigen bergtocht.
- Altijd: bij elk doel. Uit: nooit.
- Zonder doel en zonder tocht gebeurt er niets, ook met Altijd. De golden scenario's bewegen niet: `computeAdvice` zonder het veld `descentClock` geeft geen afdaaladvies.
- De instelling is een optioneel veld (`AppSettings.descentClock`). Een oude back-up zonder het veld leest als het advies, een beschadigde waarde valt bij import weg. Er is geen migratiestap nodig.
- De instelling staat in het blad Tochten: Planning en Doel en tochten zitten beide op het plafond van 12 rijen.

## Voorbeeldperiode van zes weken (nagemaakt)

Een eigen tocht in de Vogezen begint zaterdag 12 december. Elke week: dinsdag kracht boven, woensdag zware benen, zaterdag een rustige loop, zondag de lange duurloop, maandag rust. De laatste afdaling was zondag 18 oktober, 220 m. Deze weken staan als test in `src/engine/descentClock.test.ts`.

- Week 1 (2 november): de afdaling is 15 tot 20 dagen oud, de klok zwijgt. Op zondag 8 november is het 21 dagen: "Al 21 dagen geen afdaling", met een voorstel voor Trap af op vrijdag 13 november. Maandag is rust, dinsdag kracht, woensdag benen en donderdag is de dag na de benen.
- Week 2 (9 november): na Akkoord staat Trap af op vrijdag. De klok zwijgt, want er staat een afdaaltraining klaar. Vrijdag gedaan: de klok staat op nul.
- Week 3 (16 november): 3 tot 9 dagen. Niets.
- Week 4 (23 november): 10 tot 16 dagen. Niets, tot zaterdag 28 november: de tocht is over 14 dagen en de laatste afdaling is van voor dag -14. "Nog één bekende afdaling voor Vogezen", met een voorstel voor vrijdag 4 december.
- Week 5 (30 november): na Akkoord en gedaan op vrijdag 4 december is het stil.
- Week 6 (7 december): de week van de tocht, niets nieuws meer. Wie week 5 liet liggen krijgt op dinsdag alleen de zin: "Vogezen begint over 4 dagen. Een nieuwe afdaalprikkel geeft nu spierpijn op de tocht zelf."

## Alternatieven

- De afdaaltraining van het programma naar voren halen in plaats van een nieuw sjabloon: Heuvelsprints en afdalen is 45 minuten, zwaar voor de benen en hard. Dat is geen korte prikkel en past zelden op een vrije dag.
- De trapsessie in de plaats van een andere training zetten: dat kost een training. De opdracht was een vrije dag.
- De klok ook zonder doel laten lopen: de regel "zonder doel geen bergtocht, wandeldag of rugzakladder" en de golden scenario's zeggen nee.
- Een wandeling zonder hoogtemeters als afdaling tellen, of juist als vlak: beide zijn een bewering die ASCEND niet kan staven.

## Bron

`docs/onderzoek/Kansen 11 november training.md`, punt 1. `docs/onderzoek/Aanvullend onderzoek GR5 voorbereiding.md`, regels A1, A2, A4 en A9. Maeo e.a. 2017 (vijf minuten bergaf halveerde het krachtverlies een week later), Byrnes e.a. 1985 (bescherming na 3 en 6 weken, niet na 9), Faulhaber e.a. 2020 (drie kwart van de valpartijen van bergwandelaars gebeurt bergaf). Alle getallen in de regels zijn daarvan afgeleid, niet zelf getoetst.

## Vervangt

Niets.

## Terugdraaien

Zet Afdaalklok op Uit, of haal `descentClock` uit de invoer van `computeAdvice` in `src/state/adviceAndWeek.ts`: dan komt er geen afdaaladvies meer. Het sjabloon Trap af en de rol `descent` kunnen blijven staan; een trapsessie die al gepland of gelogd is blijft geldig.
