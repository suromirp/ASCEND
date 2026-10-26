# Lichaamsgewicht in de last bij beenoefeningen

Onderzoeksrapport, 26 oktober 2026 (Scout Kracht). Vraag: moet het krachtmodel bij beenoefeningen een deel van het lichaamsgewicht meetellen in de last, zodat de omrekening tussen herhalingenbereiken (bijvoorbeeld van 7 tot 9 naar 2 tot 4) nauwkeuriger wordt? Er is geen code veranderd.

Dit bouwt voort op wat er al ligt en herhaalt dat niet:

- *Kracht loggen en progressie* (KR-1: Epley op herhalingen plus RIR; de fout van 1RM-formules; Nuzzo 2024; de preprint van Marzagao 2026);
- het besluit `docs/beslissingen/2026-10-25-kracht-eigen-regels.md` (KR-5 remt de kracht en niet het gewicht, zodat een golf in het bereik vrij omrekent);
- het besluit `docs/beslissingen/2026-10-23-opwarmen-per-spiergroep.md` (de opwarming rekent in last, oefeningen met vooral lichaamsgewicht krijgen geen opwarmset).

Hoe sterk iets is, staat er steeds bij, met dezelfde woorden als in de andere stukken: **sterk** (meerdere meta-analyses of consistente gecontroleerde studies, of vaste natuurkunde), **matig** (één goede studie of enkele consistente kleine), **zwak** (klein, één studie, of alleen via een samenvatting of bespreking gelezen), **expert** (praktijk zonder uitkomstdata) en **afgeleid** (eigen redenering of berekening).

## 1. In het kort

1. Bij een squat beweegt ongeveer driekwart tot negen tiende van het lichaam mee, bij een deadlift ongeveer de helft, bij een Roemeense deadlift en een hip thrust ongeveer twee vijfde tot een derde, bij een split squat of lunge ongeveer 85 tot 90 procent en bij een step-up bijna alles. Die getallen zijn eigen berekeningen op standaard segmentmassa's; een studie die ze per oefening meet heb ik niet gevonden (afgeleid, op sterke basisgegevens).
2. In onderzoek naar vermogen en kracht-snelheid bij de squat is het meetellen van het lichaam de regel, en het weglaten verandert de uitkomst duidelijk (matig). Voor het voorspellen van een maximum of van herhalingen bij een percentage heb ik geen studie gevonden die rekenen met systeemmassa vergelijkt met rekenen op de externe last.
3. De metingen die er zijn, wijzen voor de squat de andere kant op dan de natuurkunde doet vermoeden. Gemeten op de externe last halen mensen bij beenoefeningen evenveel of meer herhalingen per percentage dan Epley voorspelt, en duursporters nog veel meer. Epley op systeemmassa voorspelt juist minder herhalingen en een veel steilere omrekening. Wie het lichaam meetelt, corrigeert dus twee keer (afgeleid uit matig en zwak bewijs).
4. Het effect is groot precies waar het telt. In het nagemaakte voorbeeld (80 kg lichaamsgewicht, squat 80 kg maal 8 met 2 over, naar 3 herhalingen met 3 over) geeft het huidige model 87,5 kg en het model met 80 procent van het lichaam 95 kg. Volgens het huidige model zit je met 95 kg na 3 herhalingen bijna aan falen, volgens het andere heb je er nog ruim 3 over.
5. Voorstel: bij de squat, de deadlift, de Roemeense deadlift en de hip thrust **geen** deel van het lichaamsgewicht meetellen. Bij de lunge, split squat en step-up blijft het lichaamsgewicht wel meetellen (dat doet ASCEND al), want daar is de externe last te klein om zonder lichaam iets zinnigs te zeggen. Belangrijker dan het getal zelf: bij die oefeningen telt het model nu maar één dumbbell mee als je per dumbbell logt, en dat maakt de stappen ongeveer twee keer te groot.

## 2. Hoe het model nu rekent

Het model (`src/engine/strengthModel.ts`) schat per set een maximum met Epley: `last x (1 + (herhalingen + RIR) / 30)`, en rekent het gewicht voor een ander bereik terug met dezelfde formule. De last is de externe last, behalve bij oefeningen die een `bodyweightFraction` hebben in `src/data/exercises.ts`. Dan is de last `fractie x lichaamsgewicht + extern gewicht` (`engine/strengthWeights.ts#loadFromExternal`).

Wat er nu staat, gelezen in de code op 26 oktober 2026:

- Geen fractie: de squat met stang, de front squat, de goblet squat, de deadlift, de Roemeense deadlift, de trapbar-deadlift, de Roemeense deadlift met dumbbells en de hip thrust.
- Fractie 1: de Bulgarian split squat, de split squat, de walking lunge, de reverse lunge, de step-up en step-down (ook met rugzak), de excentrische squat en het kuitheffen met eigen gewicht.
- Andere fracties: bilbrug 0,6, rugstrekken 0,4, nordic curl 0,7, Copenhagen plank 0,6, en bij twee roeioefeningen 0,08.

Twee bijwerkingen van een fractie staan los van de omrekening en zijn belangrijk voor het voorstel (afgeleid uit de code):

- Zonder bekend lichaamsgewicht kan het model de last niet kennen en geeft het geen schatting en geen voorstel.
- Vanaf een fractie van 0,5 krijgt een oefening geen gewone opwarmsets meer (`canWarmUp`). Een squat met fractie 0,8 zou zijn opwarming verliezen.

## 3. Welk deel van het lichaam beweegt mee

### De basisgegevens

De standaardtabel in de biomechanica is die van Zatsiorsky en Seluyanov, bijgewerkt door de Leva. Voor mannen: hoofd en nek 6,9 procent van het lichaamsgewicht, romp 43,5, bovenarm 2,7, onderarm 1,6, hand 0,6, bovenbeen 14,2, onderbeen 4,3 en voet 1,4 procent, elk per kant waar het om armen en benen gaat. Voor vrouwen zijn de benen iets zwaarder (bovenbeen 14,8 procent) ([de Leva 1996](https://doi.org/10.1016/0021-9290(95)00178-6); waarden nagelezen via [Visual3D wiki](https://wiki.has-motion.com/Adjusted_Zatsiorsky-Seluyanov%27s_segment_inertia_parameters) en [ExRx](https://exrx.net/Kinesiology/Segments.html)) (sterk als referentie; gemeten bij jonge volwassenen, voor anderen een benadering).

In gewone woorden: romp, hoofd en armen samen zijn ongeveer 60 procent van je gewicht, de twee bovenbenen 28 procent, onderbenen en voeten samen 11 procent.

### Hoe je daar een fractie van maakt

Wat telt, is hoeveel elk lichaamsdeel omhoog gaat vergeleken met de stang. Gaat de romp even ver omhoog als de stang, dan telt hij helemaal mee; gaat hij half zo ver, dan voor de helft; staat hij stil, dan niet. Dat is het principe van virtuele arbeid uit de mechanica (sterk als natuurkunde). Het geeft de gemiddelde last over de hele beweging, niet de last op het zwaarste punt; daarvoor zijn ook de hefbomen nodig. De bewegingen hieronder zijn ruwe, gemiddelde schattingen van mij, dus de uitkomsten zijn bereiken (afgeleid).

- **Squat met stang (achter of voor), goblet squat.** Romp, hoofd en armen gaan ongeveer even ver omhoog als de stang (60 procent). De bovenbenen draaien om de knie en hun zwaartepunt gaat ruwweg 60 tot 65 procent zo ver omhoog (ongeveer 18 procent erbij). Onderbenen en voeten bewegen nauwelijks. Samen ongeveer **0,75 tot 0,8**. In vermogensonderzoek gebruikt men het hele lichaam (1,0) of het lichaam zonder onderbenen en voeten (ongeveer 0,88) ([Cormie e.a. 2007](https://ro.ecu.edu.au/ecuworks/1754)); dat zijn bovengrenzen.
- **Deadlift vanaf de vloer.** De stang gaat ongeveer een halve meter omhoog, de heupen en schouders ongeveer twee derde daarvan, de bovenbenen veel minder. Samen ongeveer **0,45 tot 0,6**. Dit is de ruwste schatting, omdat lichaamsbouw en stand veel uitmaken.
- **Roemeense deadlift.** De romp draait om de heup; de stang gaat mee met de schouders, het zwaartepunt van de romp ongeveer half zo ver. De benen staan bijna stil. Samen ongeveer **0,35 tot 0,45**.
- **Hip thrust.** De schouders liggen op de bank en bewegen niet; de stang ligt op de heupen. De romp draait om de schouders en zijn zwaartepunt gaat ongeveer half zo ver omhoog als de heup; de bovenbenen draaien om de knie en gaan ongeveer 60 procent zo ver. Samen ongeveer **0,3 tot 0,4**. Dezelfde rekensom geldt voor de bilbrug op de vloer; daar staat nu 0,6 in de lijst, wat volgens deze berekening te hoog is.
- **Split squat, Bulgarian split squat, reverse lunge.** Romp, hoofd en armen gaan mee (60 procent), het voorste bovenbeen ongeveer 60 procent zo ver, het achterste bovenbeen bijna even ver als de heup, het achterste onderbeen half. Samen ongeveer **0,85 tot 0,9**. Bij de walking lunge komt de afzet en het verplaatsen erbij; ongeveer **0,85 tot 0,95**.
- **Step-up.** Van de grond tot rechtop op de verhoging gaat het zwaartepunt van het hele lichaam precies de hoogte van de trede omhoog, net als de dumbbells of de rugzak. De fractie is dus **bijna 1**, minder voor zover het achterste been afzet.

Een nuttig detail bij de eenbeensoefeningen: welk deel het achterste been draagt (bij de Bulgarian split squat volgens oudere metingen ongeveer 15 procent van de totale last, bij de lunge 25 tot 45 procent ([Hefzy e.a. 1997, geciteerd in Arakawa e.a. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12408075/)) (zwak, via een citaat gelezen)), maakt voor de omrekening tussen bereiken niets uit. Dat deel geldt voor het lichaam en de dumbbells samen, dus het valt in een verhouding tegen zichzelf weg (afgeleid). Alleen de verhouding tussen meebewegend lichaam en extern gewicht telt.

## 4. Wat het onderzoek zegt over rekenen met systeemmassa

### Vermogen en kracht-snelheid: het lichaam hoort erbij

Bij twaalf atleten die squats, jump squats en power cleans deden, gaf het weglaten van het lichaamsgewicht een veel lager vermogen en een andere vorm van de last-vermogencurve. Bij de squat schoof de last met het hoogste vermogen van 56 naar 71 procent van het maximum. Het lichaam meetellen met of zonder onderbenen en voeten maakte weinig verschil. De auteurs noemen het meetellen van het lichaam bij beenoefeningen noodzakelijk ([Cormie e.a. 2007](https://ro.ecu.edu.au/ecuworks/1754)) (matig, kleine groep, maar het is vooral natuurkunde). De gangbare methode om een kracht-snelheidsprofiel te maken met de squat jump rekent ook met lichaam plus extra last ([Samozino e.a. 2008](https://pubmed.ncbi.nlm.nih.gov/18789803/)) (matig tot sterk als methode).

Dat zegt: voor de kracht die de spieren werkelijk leveren telt het lichaam mee. Het zegt nog niets over het aantal herhalingen bij een percentage.

### Herhalingen bij een percentage: gemeten op de externe last

Alle tabellen en formules voor herhalingen bij een percentage van het maximum zijn gemeten met de externe last, ook bij de squat. Wat die metingen laten zien:

- De grootste analyse (269 studies) vond bij de beenpers bij elk percentage meer herhalingen dan bij bankdrukken: op 70 procent ongeveer 19 tegen 14, op 80 procent ongeveer 13 tegen 9 ([Nuzzo e.a. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC10933212/)) (sterk voor het patroon). De squat zat in die analyse, maar zonder eigen getallen.
- Bij getrainde en ongetrainde mannen haalde men met de squat op 60 procent duidelijk meer herhalingen dan met bankdrukken of de bicepscurl; op 80 en 90 procent was het verschil kleiner. De auteurs koppelen dat aan de hoeveelheid spiermassa die meedoet ([Shimano e.a. 2006](https://ro.ecu.edu.au/ecuworks/2069)) (zwak tot matig, 16 mannen; de precieze aantallen niet zelf gelezen).
- Getrainde lifters haalden met de squat op 70 procent gemiddeld 14 herhalingen (6 tot 26); in een andere studie met de squat in een Smith-machine ongeveer 10 ([Cooke e.a. 2019](https://dc.etsu.edu/etsu-works/5563); Rodríguez-Rosell, via [Zourdos bij Stronger By Science](https://www.strongerbyscience.com/reps-percentage/)) (zwak tot matig). Epley voorspelt op 70 procent ongeveer 13.
- Duurlopers haalden op de beenpers op 70 procent bijna 40 herhalingen en op 80 procent bijna 20, gewichtheffers 18 en 12 ([Richens en Cleather 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC4042664/)) (zwak, 16 mensen). Dat is relevant: de eigenaar loopt.

In gewone woorden: gemeten op de stang alleen, gedragen beenoefeningen zich ongeveer zoals Epley of iets vlakker (meer herhalingen per stap in gewicht), en bij duursporters nog vlakker.

### Wat systeemmassa met die omrekening doet

Rekent het model met het lichaam erbij, dan gaat de omrekening op de stang juist steiler lopen. Het voorbeeld van de lifter uit hoofdstuk 5 (maximum op de stang ongeveer 107 kg, 80 procent van 80 kg lichaam telt mee): 70 procent op de stang is 75 kg, met het lichaam erbij is dat 139 van 171 kg, ruim 81 procent. Epley voorspelt daar ongeveer 7 herhalingen, waar de metingen bij de squat 10 tot 14 laten zien. Op de externe last voorspelt Epley 13 (afgeleid, eigen berekening op de bovenstaande metingen).

Per herhaling betekent het dit. In de metingen bij bankdrukken en de beenpers scheelt één herhaling tussen 70 en 90 procent ongeveer 2 procent van het maximum (1,7 tot 2,4); Epley op de externe last zegt ongeveer 2,5 procent. Met 80 procent van het lichaam erbij wordt het bij deze lifter ongeveer 4,5 procent van wat er op de stang ligt (afgeleid, uit de getallen van Nuzzo 2024).

Er is één aanwijzing in de richting van de natuurkunde: bij 58 getrainde lifters deden zwaardere mensen op 70 procent iets minder herhalingen met de squat (samenhang -0,35; in het gecombineerde model net niet significant) ([Cooke e.a. 2019](https://dc.etsu.edu/etsu-works/5563)) (zwak tot matig). Dat past bij "het lichaam weegt mee", maar het effect is klein en hangt ook samen met vetpercentage en beenlengte. En één aanwijzing dat het per oefening verschilt: bij de deadlift onderschatten alle formules het maximum bij ongetrainde studenten, wat betekent dat de omrekening daar steiler is dan de formules zeggen ([LeSuer e.a. 1997](https://pubmed.ncbi.nlm.nih.gov/12426614/)) (zwak, alleen via besprekingen gelezen). Bij de deadlift wijst systeemmassa dus misschien de goede kant op.

### Wat ik niet vond

Geen enkele studie die voor de squat, de deadlift of de hip thrust vergelijkt of een maximum of een aantal herhalingen beter voorspeld wordt met systeemmassa dan met de externe last. Ook de grote preprint op ruim 300.000 sets rekent met het gelogde gewicht; die vond dat de omrekening bij zwaardere gewichten vlakker is per herhaling ([Marzagao 2026](https://arxiv.org/abs/2603.17495)) (zwak, niet beoordeeld). Dat is dezelfde kant op als de metingen hierboven en de andere kant op dan systeemmassa.

### Waarom natuurkunde en metingen botsen

De natuurkunde klopt: de spieren tillen het lichaam mee. Maar Epley is geen natuurwet; het is een vuistregel van één trainingshandboek die toevallig bij bankdrukken goed past, waar bijna niets van het lichaam meebeweegt ([Kracht loggen en progressie](Kracht%20loggen%20en%20progressie.md)). Grote beenspieren houden het bij een gegeven deel van hun maximum langer vol dan de borst en armen (Nuzzo 2024, Shimano 2006). Die twee effecten werken tegen elkaar in. Op de externe last gemeten heffen ze elkaar bij de squat ongeveer op, en daarom past Epley op de stang er redelijk. Wie het lichaam meetelt en Epley houdt, haalt het ene effect binnen zonder het andere, en rekent te steil (afgeleid; het mechanisme is een redelijke verklaring, niet getoetst).

## 5. Het voorbeeld, met nagemaakte getallen

Lichaamsgewicht 80 kg. Squat met stang: 80 kg maal 8 met 2 over, dus 10 herhalingen tot falen. Het nieuwe doel is 3 herhalingen met 3 over, dus 6 tot falen. De stang rondt af op 2,5 kg.

**Zoals het model nu rekent (geen fractie).** Geschatte kracht 80 x (1 + 10/30) = 106,7 kg. Voor 6 tot falen: 106,7 / 1,2 = 88,9 kg, afgerond naar beneden 87,5 kg. Verwacht bij 87,5 kg: 6,6 herhalingen tot falen, dus 3 met ruim 3 over. Dat is 9 procent zwaarder dan de 80 kg van de vorige keer.

**Met 80 procent van het lichaam (64 kg).** Last 144 kg, geschatte kracht 192 kg. Voor 6 tot falen: 160 kg last, dus 96 kg op de stang, afgerond 95 kg. Dat is 19 procent zwaarder dan de vorige keer.

**Met andere fracties.** Met de helft van het lichaam (zoals bij een deadlift) komt het op 93,3 kg, afgerond 92,5. Met het hele lichaam op 97,8 kg, afgerond 97,5.

**Wat het verschil betekent.** Tussen 87,5 en 95 kg zitten drie schijfstappen, ongeveer 8 procent. Erger is wat de twee modellen over dezelfde set zeggen. Volgens het huidige model haal je met 95 kg ongeveer 3,7 herhalingen tot falen: na 3 herhalingen zit je bijna aan het eind, niet op 3 over. Volgens het model met het lichaam erbij haal je met 87,5 kg 8 herhalingen tot falen: 3 herhalingen laten er 5 over. Het ene model vindt het andere dus te zwaar of te licht met een verschil van ongeveer 4 herhalingen in reserve. Bij een kleine stap tussen bereiken (van 7 tot 9 naar 6 tot 8) is het verschil kleiner dan één schijfstap; bij de golf van 7 tot 9 naar 2 tot 4 is het groot.

**De andere kant op.** Van 90 kg maal 3 met 3 over (6 tot falen) terug naar 8 met 2 over: zonder fractie 81 kg, afgerond 80; met 80 procent van het lichaam 74,6 kg, afgerond 72,5. Ook naar boven in herhalingen is het verschil drie stappen.

**Met de metingen ernaast.** Bij bankdrukken liggen 10 en 6 herhalingen tot falen volgens Nuzzo 2024 op ongeveer 78 en 86 procent van het maximum, een verhouding van ongeveer 1,10 tussen de twee lasten; Epley geeft 1,11. Het model met het lichaam erbij geeft voor deze lifter 1,20 op de stang (afgeleid). Hoe lichter iemand tilt vergeleken met zijn lichaamsgewicht, hoe groter dat verschil: bij een squat van twee keer het lichaamsgewicht is het extra effect ongeveer twee derde van dat in dit voorbeeld.

### Bij de split squat met dumbbells

Hier ligt het anders, omdat het lichaam het grootste deel van de last is. Nagemaakt: 80 kg lichaam, twee dumbbells van 12 kg, 8 herhalingen met 2 over, naar 3 met 3 over.

- Zonder lichaam: 12 kg per dumbbell wordt 13,3 kg. Dat is onzin: bij een split squat zonder gewicht zou de last nul zijn en het model niets kunnen zeggen.
- Met het hele lichaam en beide dumbbells (104 kg last): 115,6 kg last, dus 35,6 kg aan dumbbells, ongeveer 17,5 per dumbbell.
- Met 85 procent van het lichaam en beide dumbbells (92 kg last): 34,2 kg aan dumbbells, ongeveer 17 per dumbbell. Het verschil tussen fractie 1 en 0,85 is dus minder dan één dumbbellstap.
- Zoals het model nu rekent als je per dumbbell logt (lichaam plus één dumbbell, 92 kg): 102,2 kg last, dus 22,2 kg per dumbbell. Dat is 4,5 kg per hand zwaarder dan wat de natuurkunde zegt. Het model telt de stap per dumbbell als de hele toename, terwijl je hem twee keer draagt (afgeleid uit `loadFromExternal`, dat het gelogde gewicht neemt, en het besluit over dumbbells als totaal, dat de last bewust gelijk houdt aan wat er gelogd is).

Dat laatste is het grootste effect in dit hele stuk, en het geldt voor elke oefening met een fractie die je met twee dumbbells doet.

## 6. Wat dit betekent voor ASCEND: een voorstel

Alles hieronder is een voorstel voor engine-regels, geen besluit. De regels heten LG (lichaamsgewicht).

### LG-1. Squat, deadlift en hip thrust zonder lichaamsgewicht

De squat met stang, de front squat, de goblet squat, de deadlift, de trapbar-deadlift, de Roemeense deadlift (met stang en met dumbbells) en de hip thrust krijgen **geen** `bodyweightFraction`. Zo blijft het.

Voordelen van zo laten:

- De omrekening op de externe last ligt dicht bij de metingen voor beenoefeningen; met het lichaam erbij wordt hij ongeveer twee keer zo steil (hoofdstuk 4 en 5).
- De opwarming blijft werken, en het model werkt ook zonder bekend lichaamsgewicht.
- Het getal "geschatte kracht" en de geschatte 1RM op Forge blijven een gewicht op de stang, dat de eigenaar herkent.
- Schommelingen in het lichaamsgewicht (een kilo per dag, of een tekort) veranderen het voorstel niet.

Nadelen:

- Wie veel afvalt of aankomt, krijgt het kleine echte effect daarvan niet terug: 3 kg lichter maakt bij 80 procent ongeveer 2,4 kg minder last, dus bij dezelfde kracht 2,4 kg meer op de stang. In een tekort daalt de kracht vaak ook, dus in de praktijk valt dat weg (afgeleid).
- Bij de deadlift wijst het enige bewijs (zwak) erop dat de omrekening steiler is dan Epley; daar zou een fractie misschien helpen. Dat is te dun om op te bouwen.

### LG-2. Lunge, split squat en step-up met lichaamsgewicht, en dan met beide dumbbells

Bij deze oefeningen blijft het lichaamsgewicht meetellen; zonder kan het model ze niet rekenen. Voorgestelde fracties, met de redenering uit hoofdstuk 3:

- step-up en step-down, met of zonder rugzak: 1 (zoals nu);
- split squat, Bulgarian split squat en reverse lunge: 0,85 (nu 1);
- walking lunge: 0,9 (nu 1).

Het verschil tussen 1 en 0,85 is in het voorbeeld minder dan één dumbbellstap, dus dit is een kleine verbetering, geen noodzaak. Omdat de schattingen elke keer opnieuw uit de logs komen, verandert de hele lijn tegelijk en blijft hij binnen de oefening vergelijkbaar (afgeleid uit hoe `sessionStrength` werkt).

Belangrijker: bij een oefening met een fractie en twee dumbbells telt de last altijd **beide** dumbbells mee, ook als je per dumbbell logt. In formule: `fractie x lichaamsgewicht + 2 x gelogd gewicht per dumbbell`, en terug naar het voorstel per dumbbell gedeeld door twee. Het logboek en wat er op het scherm staat veranderen niet; alleen de last waarmee gerekend wordt. Zonder deze regel stelt het model bij een wissel van bereik per hand ongeveer twee keer te grote stappen voor. Dit vraagt een toets met een nagemaakte historie voordat het erin gaat, en past bij het besluit over dumbbells als totaal (dat besluit gaat over hoe een gelogd gewicht gelezen wordt; deze regel gaat over welke last het model daaruit afleidt).

### LG-3. De bilbrug en de hip thrust gelijk trekken

De bilbrug staat op 0,6; dezelfde rekensom als bij de hip thrust geeft ongeveer 0,35. Voorstel: 0,35. Het telt alleen als er extra gewicht op ligt, want zonder extra gewicht valt de fractie in de omrekening tegen zichzelf weg; de opwarming verandert niet, want een oefening met eigen gewicht krijgt die nooit. Laag belang.

### LG-4. Stil toetsen voordat iets verandert

ASCEND heeft al een eerlijke maat: raak (`engine/prescriptionCheck.ts`). Voorstel: reken bij de squat stil mee met een fractie van 0,8 naast het huidige model, en vergelijk na elke wissel van bereik welk van de twee de RIR van de eerste werkset beter voorspelde. Pas als het model met lichaam over minstens zes wissels duidelijk beter raak is, is er reden om LG-1 te herzien. Hetzelfde kan voor de deadlift met 0,5. Dit kost geen instelling, omdat er voor de gebruiker niets verandert.

### Een instelling?

Volgens de werkafspraken is elke keuze die de app voor de gebruiker maakt instelbaar. LG-1 verandert niets en heeft dus geen nieuwe instelling nodig. Komt LG-2 er (beide dumbbells), dan valt die onder de bestaande keuze "Dumbbells in je log"; een eigen schakelaar lijkt me overbodig, omdat het geen smaak is maar een rekenfout die verdwijnt. Dat is een voorstel aan de coördinator, geen besluit.

### Wat dit niet oplost

De omrekening over grote sprongen in bereik blijft onzeker, met of zonder lichaam. Mensen verschillen sterk (Nuzzo 2024), en een duurloper haalt bij de benen waarschijnlijk meer herhalingen bij een percentage dan de formule zegt. Het bijsturen in de training (`engine/forgeAdjust.ts`) blijft daarom het vangnet: de eerste set van een nieuw bereik zegt meer dan elke formule. Een volgende stap zou zijn om per beenoefening uit je eigen sets te leren hoe steil de omrekening is, zoals het model de vermoeidheid per set al leert; daar is nu geen onderzoek voor gedaan.

## 7. Afsluiting

### Wat het onderzoek zegt

Bij beenoefeningen beweegt een groot deel van het lichaam mee: ongeveer driekwart bij de squat, de helft bij de deadlift, een derde tot twee vijfde bij de hip thrust en de Roemeense deadlift, 85 tot 90 procent bij de split squat en lunge, bijna alles bij de step-up (afgeleid op sterke basisgegevens). Voor vermogen en kracht-snelheid hoort dat lichaam in de berekening (matig). Voor het aantal herhalingen bij een percentage is er geen studie die systeemmassa en externe last vergelijkt, maar de metingen op de externe last laten bij beenoefeningen een omrekening zien die even vlak of vlakker is dan Epley, bij duursporters nog vlakker (matig en zwak). Systeemmassa met Epley maakt die omrekening juist steiler.

### Wat het betekent voor de app

Bij de squat, de deadlift, de Roemeense deadlift en de hip thrust geen lichaamsgewicht meetellen; het huidige model blijft dichter bij de metingen, houdt zijn opwarming en werkt zonder weegschaal. Bij de lunge, split squat en step-up het lichaamsgewicht houden, eventueel met 0,85 of 0,9 in plaats van 1, en vooral beide dumbbells in de last meetellen als je per dumbbell logt: dat scheelt in het voorbeeld 4,5 kg per hand. Eerst stil toetsen met raak voordat er iets aan de squat verandert.

### Wat nog onzeker is

De fracties per oefening zijn eigen schattingen, met een marge van ongeveer 0,1 en bij de deadlift meer; ze hangen af van lichaamsbouw en techniek. Er is geen studie gevonden die systeemmassa en externe last vergelijkt voor het voorspellen van herhalingen. Van Shimano 2006, LeSuer 1997 en de Smith-machinestudie heb ik alleen samenvattingen of besprekingen gelezen, niet de tabellen. De squatmetingen zijn bij andere mensen gedaan dan de eigenaar; hoe zijn eigen benen omrekenen, kan alleen zijn eigen logboek laten zien (LG-4). Of het tellen van één dumbbell in de huidige code op elke plek zo werkt als ik uit `loadFromExternal` afleid, moet een bouwer met een test bevestigen.

Geen medisch advies. Bij pijn of klachten tijdens of na krachttraining: een arts of fysiotherapeut.

## Bronnen

Biomechanica en systeemmassa:

- de Leva 1996, aangepaste segmentparameters van Zatsiorsky en Seluyanov, Journal of Biomechanics 29(9): https://doi.org/10.1016/0021-9290(95)00178-6
- Visual3D wiki, tabel met de waarden van de Leva: https://wiki.has-motion.com/Adjusted_Zatsiorsky-Seluyanov%27s_segment_inertia_parameters
- ExRx, segmentgewichten: https://exrx.net/Kinesiology/Segments.html
- Cormie, McBride en McCaulley 2007, lichaamsgewicht in vermogensberekening bij beenoefeningen: https://ro.ecu.edu.au/ecuworks/1754
- Samozino e.a. 2008, kracht, snelheid en vermogen bij de squat jump: https://pubmed.ncbi.nlm.nih.gov/18789803/
- Arakawa e.a. 2025, het achterste been bij de Bulgarian split squat (met het citaat van Hefzy e.a. 1997): https://pmc.ncbi.nlm.nih.gov/articles/PMC12408075/

Herhalingen bij een percentage en 1RM-formules:

- Nuzzo e.a. 2024, herhalingen bij percentages van het maximum, meta-regressie: https://pmc.ncbi.nlm.nih.gov/articles/PMC10933212/
- Shimano e.a. 2006, squat, bankdrukken en curl op 60, 80 en 90 procent: https://ro.ecu.edu.au/ecuworks/2069
- Cooke e.a. 2019, lichaamsgewicht en beenlengte tegen herhalingen bij de squat: https://dc.etsu.edu/etsu-works/5563
- Zourdos, bespreking van Nuzzo en squatstudies (Stronger By Science): https://www.strongerbyscience.com/reps-percentage/
- Richens en Cleather 2014, duurlopers en gewichtheffers op de beenpers: https://pmc.ncbi.nlm.nih.gov/articles/PMC4042664/
- LeSuer e.a. 1997, 1RM-formules bij bankdrukken, squat en deadlift: https://pubmed.ncbi.nlm.nih.gov/12426614/
- Marzagao 2026, preprint over een omrekening die van het gewicht afhangt: https://arxiv.org/abs/2603.17495

Eigen stukken: *Kracht loggen en progressie* (KR-1 tot KR-12), en de besluiten `2026-10-25-kracht-eigen-regels.md` en `2026-10-23-opwarmen-per-spiergroep.md`.
