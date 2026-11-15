# Kleding en wind getoetst

Datum: 15 november 2026
Status: onderzoek en advies bij backlogpunt I-36, geen besluit
Gelezen vooraf: `docs/onderzoek/Kleding bij het weer.md`, `docs/beslissingen/2026-10-22-kledingadvies-bij-het-weer.md`, `docs/beslissingen/2026-11-13-kleding-en-wind.md`, `src/engine/clothing.ts`, `src/engine/weather.ts`, `src/engine/clothingFeedback.ts`. In `docs/visie/` staat over kleding en wind niets dat hier verder helpt.

Geen medisch advies. Bij klachten door kou (rillen dat niet stopt, verwardheid, gevoelloze vingers die niet terugkomen): stoppen en een arts raadplegen.

## Kort

Geen enkele bron geeft een windgrens in km/u voor kleding. Wat de bronnen wel dragen is de richting: wind haalt bij een loper in dunne kleding meer warmte weg dan de gevoelstemperatuur laat zien. Daaruit volgt mijn advies.

- Wind noemen vanaf 15 km/u: houden.
- Gevoelstemperatuur tonen vanaf 2 graden kouder als er wind in de zin staat: houden.
- Windjack vanaf 25 km/u: verlagen naar 20 km/u. Dit is het enige getal dat ik zou veranderen, en het rust op zwak bewijs plus één ervaring van de eigenaar.
- Vlagen 40 km/u, windjack alleen onder T 16, intervallen en wedstrijd overslaan boven T 8: houden.
- Warmtebonus lange duurloop 5 tegen 6 voor de rustige loop: houden.
- Eerste tik een graad, daarna een halve: houden, met één kanttekening over tikken op een winderige dag.

## Wat er nieuw is ten opzichte van het eerste onderzoek

Het eerste rapport wist niet hoe Open-Meteo de gevoelstemperatuur rekent. Dat staat nu vast, uit de broncode van Open-Meteo zelf (`Sources/App/Helper/Meteorology.swift`, functie `apparentTemperature`, https://github.com/open-meteo/open-meteo, gelezen op 15 november 2026):

gevoel = temperatuur + 0,348 maal de dampdruk in hPa, min 0,70 maal de wind op 2 meter in m/s, plus een zonterm, min 4,25. De wind op 2 meter is 0,75 maal de wind op 10 meter. De zonterm telt pas boven 550 W per vierkante meter straling.

Dit is de formule van Steadman zoals het Australische weerbureau hem gebruikt, voor een volwassene die buiten wandelt (Wikipedia, "Apparent temperature", https://en.wikipedia.org/wiki/Apparent_temperature; de oorspronkelijke artikelen van Steadman uit 1984 en 1994 heb ik niet gelezen). Drie dingen volgen eruit, alle drie zelf nagerekend:

1. Wind kost in dit getal ongeveer 0,15 graad per km/u. Bij 10 graden en 80 procent vochtigheid: windstil voelt als 9, 15 km/u als 7, 20 km/u als 6, 25 km/u als 5 en een half. Het voorbeeld uit het besluit van 13 november ("11 graden, voelt als 8, wind 20 km/u") klopt precies met de formule.
2. Zon doet in een Nederlandse herfst en winter niets in dit getal. Zoveel straling is er dan niet. De zorg uit het eerste rapport dat zon de waarde optilt geldt dus alleen op een heldere dag in het warme halfjaar.
3. Het verschil met de gevoelstemperatuur van het KNMI (de Canadese JAG/TI-methode) is klein in het gebied waar de app adviseert. Bij 5 graden en 20 km/u geeft het KNMI ongeveer 1, Open-Meteo ongeveer 0. Bij 10 graden en 20 km/u ongeveer 7 tegen 6. Open-Meteo zit dus rond een graad lager. De open vraag uit het eerste rapport is daarmee beantwoord: geen reden om grenzen te verschuiven.

Zekerheid: sterk voor de formule (broncode), eigen rekenwerk voor de voorbeelden.

## Waarom de gevoelstemperatuur voor een loper te mild is over wind

Dit is de kern van het hele punt, dus eerst de redenering, dan de getallen.

Beide maten voor gevoelstemperatuur zijn gemaakt voor iemand die wandelt. De Canadese maat rekent met een wandelaar van 4,8 km/u die tegen de wind in loopt, en gaat over de blote huid van het gezicht (JAG/TI, rapport van het Amerikaanse OFCM, hoofdstuk 3; Osczevski en Bluestein 2005, alleen via samenvattingen gelezen). Steadman rekent met een wandelaar in gewone kleding.

Een loper is op twee manieren anders.

Hij maakt zelf wind. De Amerikaanse bond van sportverzorgers zegt het letterlijk: de wind in de gevoelstemperatuur telt de wind van je eigen beweging niet mee, en fietsen of hardlopen geeft wind over het lichaam ter grootte van je eigen snelheid (Cappaert e.a. 2008, National Athletic Trainers' Association position statement: environmental cold injuries, Journal of Athletic Training 43(6): 640 tot 658, https://pmc.ncbi.nlm.nih.gov/articles/PMC2582557). Bij windstil weer zit een loper van 10 km/u op 2,8 m/s lucht langs het lijf. Dat zit al in de warmtebonus, want de vuistregels van lopers zijn buiten ontstaan.

Hij draagt dun en luchtdoorlatend. De consensus van de ACSM uit 2021 zegt dat wind de warmteafgifte door stroming sterk verhoogt, de isolatie van kleding verlaagt en de verdamping verhoogt (Castellani e.a. 2021, Current Sports Medicine Reports 20(11): 594 tot 607; ditmaal de volledige tekst gelezen in het open manuscript, https://discovery.ucl.ac.uk/10138556/). Havenith en Nilsson vonden in een meta-analyse dat het verlies aan isolatie door wind groter is naarmate de buitenste laag meer lucht doorlaat (Correction of clothing insulation for movement and wind effects, a meta-analysis, European Journal of Applied Physiology 92: 636 tot 640, 2004; alleen de samenvatting gelezen, en hun metingen gaan over werkkleding en winterkleding, niet over een loopshirt). Een dun loopshirt is ongeveer het meest doorlatende wat je kunt dragen.

Twee kleine labstudies wijzen dezelfde kant op, met een knik rond 4 m/s lucht langs het lijf (14 km/u):

- Toyooka en Takahashi lieten vijf afstandslopers 80 minuten lopen bij 10 graden, met de wind in stappen van 2,5 naar 7,67 m/s. Huidtemperatuur en warmtegevoel daalden met elke stap, en het warmteverlies steeg scherp rond 4 m/s (Descente Sports Science deel 12, Engelse samenvatting op https://www.shinshu-u.ac.jp/faculty/textiles/db/seeds/pages/75824/en.php; jaartal en loopsnelheid staan er niet bij).
- Yamashita, Ly, Smallcombe, Hodder en Havenith (2024, Journal of Applied Physiology 137(3): 554 tot 568, doi 10.1152/japplphysiol.00159.2024) lieten 14 mensen wandelen en lopen in een windtunnel bij 0, 2, 4 en 6 m/s. Onder 4 m/s viel het effect van wind binnen de gewone spreiding, vanaf 4 m/s was het meetbaar. Die studie ging vooral over zuurstofverbruik, niet over kou, en is dus zijdelings bewijs.

Wat dit betekent in km/u van het weerbericht, eigen rekenwerk: de wind op lichaamshoogte is ongeveer 0,65 tot 0,75 maal de wind op 10 meter (de app rekent in Run in detail met 0,65, Open-Meteo met 0,75). Bij 15 km/u in het weerbericht staat er ruwweg 10 km/u op je borst. Loop je daar met 10 km/u tegenin, dan gaat er 20 km/u langs je lijf, bijna 6 m/s, ruim boven de knik. Met de wind in de rug is het bijna windstil om je heen. Een rondje heeft altijd een stuk tegenwind, en daar krijg je het koud, meestal bezweet.

Conclusie: de gevoelstemperatuur van Open-Meteo trekt voor wind ongeveer 0,15 graad per km/u af, en voor een loper in een dun shirt is dat te weinig. Hoeveel te weinig zegt geen bron in graden. Zekerheid: matig voor de richting, zwak voor elke maat.

## Per getal

### Wind noemen vanaf 15 km/u (`LINE_WIND_KMH` in `weather.ts`)

Wat de bronnen zeggen: geen bron noemt een grens voor het noemen van wind. 15 km/u is het midden van windkracht 3 (12 tot 19 km/u), die het KNMI "matig" noemt (https://www.knmi.nl/kennis-en-datacentrum/uitleg/windschaal-van-beaufort). De knik van 4 m/s langs het lijf uit de twee labstudies haalt een loper met tegenwind al bij ongeveer 7 tot 9 km/u in het weerbericht.

Hoe zeker: eigen vertaling. De knik zelf is matig onderbouwd (twee kleine studies die hetzelfde zeggen).

Advies: houden. De bronnen zouden ook 12 dragen, maar dan staat de wind er in Nederland bijna elke dag en zegt de zin niets meer. Naar boven is er geen reden: bij 15 voel je hem als loper aantoonbaar.

### Gevoelstemperatuur tonen vanaf 2 graden kouder met wind, 4 zonder (`temperatureHead`)

Wat de bronnen zeggen: niets over wanneer je een verschil toont. Wel volgt uit de formule dat in koel en vochtig weer het verschil bij 15 km/u al rond 3 graden ligt (10 graden, 80 procent: voelt als 7). De voorwaarde van 2 graden is dan dus bijna altijd waar zodra de wind genoemd wordt. Hij houdt alleen de milde, klamme dagen tegen: bij 18 graden en 70 procent voelt 15 km/u wind als 17, en dan zwijgt de zin terecht. Zonder wind geeft de formule in koel weer een verschil van 1 tot 2 en een halve graad, dus de grens van 4 blijft dan stil, ook terecht.

Hoe zeker: eigen keuze, nagerekend met de formule. Geen bewijs voor of tegen.

Advies: houden, beide getallen. Ze doen wat het besluit van 13 november wilde.

### Windjack vanaf 25 km/u (`CLOTHING_RULES.windKmh`)

Wat de bronnen zeggen: het eerste rapport noemde 25 al eigen afleiding. Een bron voor 25 is er niet. De ACSM zegt dat je de buitenlaag bij inspanning meestal niet draagt, behalve bij regen of als het erg waait, en wel aantrekt zodra je stilstaat. Dat pleit tegen een jack bij elk zuchtje, vooral bij hard werk. Daartegenover staat alles uit het hoofdstuk hierboven: bij 20 km/u in het weerbericht gaat er met tegenwind bijna 7 m/s langs een loper, de gevoelstemperatuur telt dat maar voor een deel, en een winddichte laag is precies wat het verlies aan isolatie tegengaat.

En er is de melding van de eigenaar: 11 graden, wind 20 km/u, heel koud. Nagerekend gaf de app daar voor een rustige loop T 14, dus een dun shirt met lange mouwen en een korte broek, zonder jack, omdat 20 onder de 25 blijft. Dat is één waarneming, maar hij past bij de mechaniek en hij is van de persoon voor wie de app adviseert.

Hoe zeker: zwak. De richting (eerder een winddichte laag dan de gevoelstemperatuur suggereert) is matig onderbouwd. Het getal 20 tegenover 25 is eigen vertaling; geen studie maakt dat onderscheid.

Advies: nieuw getal, 20 km/u. Dat is het begin van windkracht 4 (20 tot 28 km/u, het punt waarop volgens het KNMI haar en kleding gaan bewegen), en het is het laagste getal waarbij de regel het geval van de eigenaar had gevangen. Eén getal voor alle sporten. Voor wandelen klopt de gevoelstemperatuur beter, want die is voor een wandelaar gemaakt, maar daar is het gevolg alleen "windjack in de rugzak" of een dun jack onder T 16, en dat kost niets. Fietsen heeft de lagere grens het hardst nodig: daar is de rijwind groter dan bij lopen en de bonus maar 2.

Wat het verandert, als voorstel voor de bouwer: een rustige loop bij gevoel 8 en wind 20 tot 24 krijgt er "Dun windjack aan" bij. De andere voorwaarden blijven gelden, dus niet bij T van 16 of hoger en niet bij intervallen of een wedstrijd boven T 8.

Het risico: vaker een jack op een dag dat het de helft van de route te warm is. Daarom niet lager dan 20, en daarom blijven de andere voorwaarden staan.

Een alternatief dat ik niet adviseer: de wind als extra aftrek in T verwerken (bijvoorbeeld een graad per 5 km/u boven de 15). Dat is zuiverder, maar het voegt een nieuw verzonnen getal toe aan elke kledingband, terwijl het antwoord op wind een winddichte laag is en geen dikker shirt.

### Vlagen vanaf 40 km/u (`gustKmh`)

Wat de bronnen zeggen: Open-Meteo geeft de hoogste vlaag van het afgelopen uur op 10 meter (documentatie, https://open-meteo.com/en/docs). Een vlaag duurt seconden; afkoelen doe je op het gemiddelde. Boven land is een vlaag ruwweg anderhalf tot twee keer het gemiddelde (gangbare kennis, hier niet bij een bron gecontroleerd), dus 40 hoort bij een gemiddelde van 20 tot 27.

Hoe zeker: eigen vertaling.

Advies: houden op 40. Het past zelfs beter bij een gemiddelde grens van 20 dan bij 25.

### Windjack alleen onder T 16, en bij intervallen en wedstrijd niet boven T 8 (`windJacketBelow`, `windSkipIntervalsAbove`)

Wat de bronnen zeggen: voor de getallen niets. Voor de gedachte wel: de ACSM zegt dat je de buitenlaag bij inspanning meestal weglaat, en de sportverzorgers schrijven dat je bij zware inspanning (boven 60 procent van je maximale zuurstofopname) je temperatuur ook in koud, nat en winderig weer houdt, terwijl bij lichte inspanning met wind de kerntemperatuur wel zakt (Cappaert e.a. 2008). Hard werk heeft het jack dus minder nodig dan een rustige loop, en dat is wat de uitzondering doet.

Hoe zeker: matig voor de richting, eigen vertaling voor 16 en 8.

Advies: houden.

### Warmtebonus lange duurloop 5, rustige loop 6 (`WARMTH_BONUS_C`)

Wat de bronnen zeggen: hoeveel warmte je maakt hangt af van je tempo, niet van de duur. Het eerste uur van een lange duurloop is dus gelijk aan een rustige loop, en daar is 6 net zo goed als 5. Het verschil zit in het einde, en daar wijzen de bronnen één kant op:

- Je wordt trager en maakt minder warmte, terwijl je kleding nat is van het zweet. Natte kleding isoleert slechter; een overzicht noemt 20 procent minder isolatie bij doorweekt ondergoed (via een zoekresultaat, niet zelf in de bron gelezen).
- Vermoeidheid en een lage bloedsuiker verzwakken de afweer tegen kou. De ACSM (2021) zegt dat rillen sterk afneemt bij een lage bloedsuiker en dat onderkoeling in koude lucht het meest voorkomt als iemand uitgeput raakt en niet meer kan doorwerken. Castellani e.a. (2001, Journal of Applied Physiology, via samenvatting) vonden na dagen zware inspanning een zwakkere vaatvernauwing in de kou, bij militairen en na veel zwaarder werk dan een duurloop.
- De sportverzorgers noemen een marathon bij ongeveer 10 graden waar een vijfde van de lopers in de tent bij de finish onderkoeld was (Cappaert e.a. 2008). Dat gaat over een marathon en over stilstaan na afloop, niet over een duurloop van anderhalf uur.

Hoe zeker: matig voor de richting (lang is aan het eind kouder dan kort), eigen vertaling voor de ene graad. De bronnen gaan over veel zwaarder en langer werk dan de lange duurloop in ASCEND.

Advies: houden op 5. Eén graad is klein tegenover kledingbanden van 5 graden breed, hij doet alleen iets op een dag die net op een grens zit, en hij wijst de goede kant op. Meer verschil dragen de bronnen niet, want het eerste uur is gelijk. De melding van de eigenaar over kou ging over wind, en die wordt met de windgrens opgelost, niet met deze bonus.

Kanttekening voor later, geen advies nu: de bonus hangt aan het sjabloon en niet aan de minuten. Het echte risico zit bij lang (ruim boven de 90 minuten), koel en nat of winderig tegelijk. Daar heeft de app al de zin "Neem iets droogs mee voor na afloop" bij regen. Bij wind zonder regen is er zoiets niet.

### Eerste tik een graad, daarna een halve, hoogstens vier (`FIRST_STEP_C`, `FEEDBACK_STEP_C`, `MAX_ADJUST_C`)

Wat de bronnen zeggen: niets; dit is een keuze over bediening. Wel een feit uit de regels zelf: de banden zijn 5 graden breed, dus één graad verandert op ongeveer één dag op de vijf een kledingstuk. De zin na de tik zegt dat eerlijk.

Hoe zeker: eigen keuze.

Advies: houden. Eén kanttekening die bij de windgrens hoort: een tik "Te koud" op een winderige dag schuift de bonus voor elk weer, ook voor windstille dagen. Wie het alleen in de wind koud heeft, kleedt zich daarna op stille dagen te warm. Met de windgrens op 20 wordt die tik minder vaak nodig. Blijft het spelen, dan is een eigen bijstelling voor wind een vraag voor een later punt.

## Niet onderzocht

De twee andere delen van I-36 zijn geen getallen en vallen buiten dit onderzoek: dat de kledingzin de wind niet noemt als Weer uit staat en Kledingadvies aan, en dat de zin na een tik tegen de bestaande richting in vreemd leest (`feedbackSentence`). Het eerste wordt wel belangrijker met dit advies: als het jack vanaf 20 km/u komt, wil je bij dat jack ook de wind lezen.

## Wat het onderzoek zegt

De gevoelstemperatuur van Open-Meteo is de formule van Steadman voor een wandelaar en trekt voor wind ongeveer 0,15 graad per km/u af. Een loper of fietser maakt zelf wind en draagt dunne, doorlatende kleding, en verliest in tegenwind meer warmte dan dat getal laat zien. Twee kleine studies leggen de knik rond 4 m/s lucht langs het lijf. Een grens in km/u voor een windjack geeft geen enkele bron.

## Wat het betekent voor de app

Eén voorstel voor een engine-regel: `CLOTHING_RULES.windKmh` van 25 naar 20. Alle andere getallen uit I-36 kunnen blijven. De bouwer past dan ook de opmerking bij `LINE_WIND_KMH` aan ("under the 25 of the clothing advice") en de tests die op 25 leunen. Het is advies en geen planning, dus er is geen voorstel met Akkoord nodig; het hoort wel als aanvulling bij het besluit van 13 november, dat de bronnencheck aankondigde.

## Wat nog onzeker is

- Het getal 20 rust op één ervaring van de eigenaar en op mechaniek, niet op een studie. Krijgt hij het daarna te warm in het jack, dan is terug naar 25 even verdedigbaar.
- Hoeveel isolatie een loopshirt in wind verliest is niet gemeten in de bronnen die ik las; Havenith en Nilsson maten dikkere kleding, en hun artikel las ik alleen als samenvatting.
- De studie van Toyooka en Takahashi ken ik alleen van de Engelse samenvatting, zonder jaartal en loopsnelheid.
- De artikelen van Steadman zelf en van Osczevski en Bluestein heb ik niet gelezen; de aannames (een wandelaar) komen uit samenvattingen en uit de code van Open-Meteo.
- De verhouding tussen wind op 10 meter en op lichaamshoogte hangt sterk af van de plek: tussen huizen en bomen veel minder, op een dijk of open polder meer. De grens in het weerbericht is daardoor altijd grof.
- `feelsC` is het gemiddelde over de uren van de training en `windKmh` het hoogste uur. Bij draaiend weer kan de zin dus een wind noemen die bij een ander uur hoort dan het gevoel. Niet uitgezocht hoe vaak dat speelt.
