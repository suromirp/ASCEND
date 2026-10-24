# Kracht stil toetsen: raak voor beide voorstellen, toestelgewichten leren

Datum: 2026-10-24
Status: aangenomen

## Besluit

De eigenaar maakt eerst zijn MacroFactor-programma af (week 4 van 8 op 24 oktober 2026). ASCEND rekent in die tijd stil mee in Forge en laat er op de pagina niets van zien, tenzij hij de schakelaar "ASCEND naast MacroFactor" aanzet. De toets is niet of ASCEND hetzelfde gewicht kiest als MacroFactor, want niemand weet of MacroFactor goed kiest. De toets is voor beide dezelfde: was het voorstel raak voor die dag?

Daarna volgen drie stappen:

1. Het MacroFactor-programma wordt afgemaakt, ASCEND meet stil mee (nu).
2. Vier weken alle krachttrainingen in Forge, met de voorstellen van ASCEND. MacroFactor Workouts blijft als vangnet.
3. Dan beslist de eigenaar met twee toetsen. Raak met ASCEND (nu gemeten, niet achteraf geschat) is minstens ongeveer 70% van de werksets. En de geschatte kracht op de hoofdoefeningen (squat, deadlift, bench press, overhead press, row) is niet gedaald, behalve rond een zware bergweek.

## Wat raak is

Per oefening per training, met het doel uit de template (herhalingenbereik en RIR-doel, zoals het voorstel ze gebruikt; zonder doel in de template het bereik dat uit de geschiedenis volgt). De maat is de zwaarste werkset van de training (`topSetOf`, opwarmsets tellen niet via `isWorkSet`). Het telt alleen waar ASCEND vooraf een voorstel kon doen (alleen uit de trainingen ervoor) en waar RIR gelogd is.

- Raak met wat je deed (het voorstel van MacroFactor dat je volgde): de herhalingen liggen in het bereik en de gelogde RIR ligt binnen 1 van het doel.
- Raak met het voorstel van ASCEND, achteraf: de kracht van die dag zelf, uit de werksets van die training (dezelfde schatting als altijd, herhalingen plus RIR), zegt hoeveel herhalingen tot falen het gewicht van ASCEND die dag had gegeven. Raak als dat aantal min het RIR-doel binnen het bereik valt, met 1 herhaling speling. Dit is een schatting, en dat staat zo op de pagina.
- Een training die in Forge zelf is gelogd, met een voorstel van ASCEND: dan is wat er gebeurde de meting, met dezelfde toets als bij wat je deed. Geen schatting meer. De bron van elke training (MacroFactor of Forge) blijft apart, zodat de periodes naast elkaar staan.

Per kant staan het aantal raak, het totaal en de gemiddelde afwijking in herhalingen, vanaf het midden van het bereik (negatief is te zwaar, positief te licht), zodat zichtbaar is of een kant structureel te zwaar of te licht kiest. Er is een startdatum van het stille meten (24 oktober 2026, `DEFAULT_CHECK_FROM` in `engine/strengthSettings.ts`, optioneel veld `checkFrom`), zodat de weken sinds die dag apart te zien zijn naast alles. Code: `engine/prescriptionCheck.ts`, doorgegeven door `comparisonRows` in `engine/strengthHistory.ts`.

## Toestelgewichten leren

Bij een kabel of toestel met een gewichtstapel koos ASCEND gewichten die op dat toestel niet bestaan (voorbeelden uit echte data: 85 kg voorgesteld terwijl je 93 pakte op de leg press, 47,5 en 39 op de chest press). Het rondde af op de stap uit de instellingen (5 kg) in plaats van op wat er op het toestel zit. MacroFactor doet het met een sportschoolprofiel en stapelbereiken per toestel; ASCEND leert het zelf.

Per oefening onthoudt ASCEND de gewichten die je er echt op gebruikte (werk- en opwarmsets uit de trainingen vóór de dag van het voorstel). Binnen dat bereik rondt een voorstel af op het dichtstbijzijnde gewicht dat voorkwam. Erboven en eronder geldt de kleinste stap tussen twee gebruikte gewichten (de stap van het profiel bij één gewicht, of als die kloof meer dan twee keer de profielstap is). Vrije gewichten (stang, dumbbells, schijven) blijven zoals ze waren, en toestellen met hulp ook. Code: `learnedStack` in `engine/strengthWeights.ts`. Instelbaar: "Gewichten van toestellen leren", standaard aan, label "auto".

## Stil tonen

Het blok "Voorstel en wat je deed" onderaan Forge staat standaard verborgen. De schakelaar "ASCEND naast MacroFactor" (standaard uit) zet het aan. De rij in de instellingen toont de stand, bijvoorbeeld "Raak: MacroFactor 72%, ASCEND 68%". Staat het blok aan, dan staan er de twee getallen, de zin dat raak achteraf voor ASCEND een schatting is, geen oordeel over wie beter is, en "Per training bekijken", met per oefening een vinkje als het voorstel raak was.

## Reden

Of ASCEND dezelfde gewichten kiest als MacroFactor zegt niets over goed of fout. Een gelijke toets voor beide, tegen dezelfde dag, kan dat wel. De eigenaar wil pas overstappen als de cijfers dat dragen, en eerst zonder dat er op de pagina iets opvalt.

## Alternatieven

- Overeenstemming meten (hoe vaak het gewicht binnen één stap gelijk is): afgewezen, het zegt niets over wie goed kiest.
- Een eigen opgeslagen vlag per training voor de bron: niet nodig. De bron volgt uit `SessionLog.source` en `manualMeasured`, en er is dus geen nieuwe opgeslagen vorm en geen migratie. De instellingsvelden zijn optioneel en additief.
- Een vast gewichtenlijstje per toestel in de instellingen: afgewezen, de eigenaar zou het moeten bijhouden.

## Bron

Gesprek met de eigenaar op 24 oktober 2026, `docs/onderzoek/Kracht loggen en progressie.md` (RIR, autoregulatie, sportschoolprofielen en gewichtstapels), en de besluiten `2026-10-22-forge-kracht-meerekenen.md`, `2026-10-22-macrofactor-leidend-voor-kracht.md` en `2026-10-24-forge-vergelijken-en-zoeken.md`.

## Vervangt

Niets. De vergelijking "Voorstel en wat je deed" uit het besluit over Forge blijft bestaan, maar toont nu raak in plaats van "hooguit één stap verschil", en staat standaard verborgen.

## Terugdraaien

Zet "Gewichten van toestellen leren" uit voor de oude afronding. "ASCEND naast MacroFactor" uit (de standaard) verbergt het blok. Er is niets in planning of logs veranderd.

## Aanvulling na review (24 oktober 2026)

Dit vult het besluit hierboven aan waar de review iets scherper wilde. Wat hierboven staat blijft staan als het niet strijdig is; waar het strijdig is, geldt deze aanvulling.

### Eén toets, dezelfde set

Wat je deed en het voorstel van ASCEND krijgen dezelfde functie en dezelfde schatter: `checkProposal(kracht van die dag, last, doel)`. Voor wat je deed is de last die van de gemeten set, voor ASCEND die van het voorstel voor diezelfde set. Hetzelfde gewicht krijgt dus aan beide kanten hetzelfde oordeel (getest). De speling is voor alles 1 herhaling aan beide kanten van het bereik; de oude toets "RIR binnen 1" voor wat je deed is vervallen.

De set is de eerste werkset die bij het doel hoort: bij een programma met doelen per set de eerste set die niet tot falen is (`targetOfSlot`), zonder doelen per set de eerste werkset. Sets tot falen en back-offs met een ander doel worden niet gemeten, opwarmsets nooit. ASCEND wordt gemeten tegen het voorstel voor dezelfde plek (`rx.sets[index]`). Bij een piramide is dat dus de lichtste set, niet de zwaarste.

De kracht van die dag is de hoogste schatting van een enkele werkset (herhalingen plus RIR, Epley). Gekozen boven het gemiddelde van de twee beste sets omdat een piramide of topset met back-offs zo zijn zwaarste echte inspanning als maat krijgt, en een vermoeide of toevallige set er niet doorheen telt. Het is een schatting en blijft zo genoemd.

### Gemeten of geschat

Een training die in Forge is gelogd telt alleen als gemeten waar het gewicht van de gemeten set binnen één stap van het voorstel lag (`withinOneStep`). Dan is wat er gebeurde de meting (`checkDone`, herhalingen plus RIR van de set zelf, dezelfde speling). Een handgemaakte krachtlog met een heel ander gewicht volgde geen voorstel en telt als schatting, apart onder "Forge met een ander gewicht dan voorgesteld". Daarvoor is geen nieuw opgeslagen veld nodig.

### De bron volgt wie de sets maakte

Neemt MacroFactor een Forge-log over, dan blijft de bron Forge zolang de sets niet zijn vervangen (geen `strengthData` in `manualMeasured.strength`) en de log met de hand was. Zijn de sets vervangen, dan is de bron MacroFactor. Na `restoreManual` is het weer de eerste bron.

### Toestelgewichten leren, scherper

Een kloof groter dan twee keer de profielstap binnen het gebruikte bereik wordt opgevuld met de stap, zodat 70 tussen 40 en 80 bestaat. Een kloof telt pas als stap als hij minstens twee keer voorkomt en niet onder de helft van de profielstap ligt. Gewichten die op omgerekende ponden lijken (zoals 40,82) en gewichten met meer dan één decimaal worden niet geleerd. Erboven loopt het bereik tot 400 kg, net als bij de gewone stappen. Een voorstel heeft nooit meer dan één decimaal.

### Alles wordt achteraf herberekend

De vergelijking rekent elke training uit het verleden opnieuw uit met de template en de instellingen van nu, niet met wat er op die dag gold. De getallen vóór het inlezen van het MacroFactor-programma zijn daarom ruw en zeggen weinig; ze zeggen pas iets vanaf die dag. Daarom staat "alles" naast "sinds", en is de startdatum instelbaar: "Stil meten sinds" in de Forge-groep, standaard 24 oktober 2026. Er wordt niet automatisch afgekapt op de importdatum, omdat die niet voor elke training bekend is.
