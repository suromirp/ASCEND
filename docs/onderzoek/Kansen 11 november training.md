# Kansen 11 november: wat een goede coach nog zou doen

De vraag van de eigenaar op 11 november: wat missen we nog, waar kunnen we profijt van hebben, klein of groot. Ik keek vanuit trainingswetenschap en data naar een sporter die traint voor een meerdaagse bergtocht met rugzak (GR5, hutten en bivak), lopen tot 10 km en kracht (Forge, ook calisthenics), met een Forerunner 255, MacroFactor en intervals.icu.

Kort: ASCEND doet al bijna alles wat de eerdere rapporten aanraadden. Wat overblijft zit vooral in vijf gaten. Er is geen klok die op je echte logs let of je afdaalbescherming nog vers is. Je enkels en je evenwicht krijgen geen aandacht, terwijl de enkel de meest getroffen plek is als bergwandelaars vallen, en dan vooral bergaf. Er is geen vast ijkmoment voor tochtconditie zoals de testloop dat voor lopen is. De beenindex leert niet van je eigen ochtendantwoorden. En eten onderweg wordt nergens geoefend. Alle vijf werken met gegevens die er al zijn, en geen van vijf verandert de planning zonder Akkoord.

Datum: 11 november 2026
Door: Scout Kansen
Status: voorstel. In `src/` is niets veranderd. Er staat geen persoonsgegeven in dit bestand.

## Hoe ik gewerkt heb

Gelezen: `CLAUDE.md`, `docs/visie/Trainingswetenschap.md`, in `docs/onderzoek/` vooral *Kansen met gegevens*, *Aanvullend onderzoek GR5 voorbereiding*, *Trainingsopbouw voor GR5 en hardlopen* en *Spierbelasting en beenvermoeidheid*, `docs/backlog.md`, de kaarten `docs/app-kaart/ascend.md` en `stand.md`, en de koppen van de engine. Ik zocht in de code gericht naar wat de eerdere rapporten aanraadden, om te zien wat al gebouwd is.

Al gebouwd, dus niet opnieuw voorgesteld: tempo's en een eerlijke doeltijd uit de testloop (`racePaces.ts`), "Deze week nog een keer" (`repeatWeek.ts`), de rugzakladder (`packLadder.ts`), stokken in de beenindex (`legFatigue.ts`, `POLES_DESCENT_FACTOR`), je eigen klimtempo met rugzak (`climbPace.ts`), vroeg zien dat je ziek wordt (`illnessSigns.ts`), de ochtendregel "twee van drie" (`morningRule.ts`), hitte in je tempo en wennen aan warmte (`heatPace.ts`, `heatAcclimation.ts`), water per etappe (`stageWater.ts`), bergschoenen inlopen (`bootBreakIn.ts`), spieren voor de berg (kuiten, tibialis, bilspieren; `mountainMuscles.ts`), het pijnmodel met botplekken (`pain.ts`), lichte dagen voor een tocht (`trekTaper.ts`), de paklijst met papiertape, de raad om de eerste drie dagen van de GR5 licht te houden en elke vijf tot zeven dagen rust te nemen (`data/journeyTasks.ts`), en een praktijksimulatie met twee dagen achter elkaar (`data/gr5Details.ts`).

Bewust niet, volgens de backlog: voeding naast gewicht en kracht met de Food Log (kans E). Mijn voorstellen over eten raken de Food Log niet.

Over zekerheid gebruik ik drie woorden, zoals gevraagd:

- zeker: meerdere goede studies of een richtlijn die hetzelfde zeggen;
- waarschijnlijk: een enkele goede studie, een meta-analyse met beperkingen, of een grote registratie;
- onzeker: kleine studies, expertpraktijk of mijn eigen afleiding.

Waar een getal een eigen keuze is, staat dat erbij.

## De vijf kansen met het meeste profijt

### 1. Een afdaalklok op je echte logs

**Wat je merkt.** Alleen als het speelt, één regel in de weekterugblik of bij je volgende wandeling: "Al 19 dagen geen afdaling. Een korte prikkel houdt je benen beschermd: 10 minuten een trap af of een duin af." Na 21 dagen een voorstel met Akkoord om een korte trapsessie in te plannen. En 7 tot 14 dagen voor een bergtocht: "Doe deze week nog één bekende afdaling, daarna niets nieuws meer."

**Onderbouwing.** Vijf minuten bergaf met wat last (ongeveer 110 m daling) halveerde een week later het krachtverlies na een lange afdaling: 10 tegen 19 procent ([Maeo e.a. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5348007/)) (waarschijnlijk; één goede studie bij jonge mannen). De bescherming was er na 3 en 6 weken nog, na 9 weken niet meer ([Byrnes e.a. 1985](https://pubmed.ncbi.nlm.nih.gov/4055561/)) (waarschijnlijk; één oudere studie). Bij bergwandelaars die vielen gebeurde 75 procent van de valpartijen bergaf ([Faulhaber e.a. 2020](https://econpapers.repec.org/RePEc:gam:jijerp:v:17:y:2020:i:3:p:1115-:d:318600)) (waarschijnlijk; politiegegevens, alleen gemelde ongevallen). Afdalen is dus waar zowel de spierpijn als het risico zit. De grens van drie weken is een eigen veilige vertaling van "6 weken wel, 9 niet" (onzeker), en stond al als regel A1 en A9 in *Aanvullend onderzoek GR5 voorbereiding*.

**Wat er al is.** De afdaling per log (`outdoorData.elevationLossM`), de kaart met meters bergaf per week (`components/stand/DescentCard.tsx`), en de afdaaltraining in het programma om de week. Wat ontbreekt is de klok zelf: die kijkt naar wat je echt deed, niet naar wat gepland stond. Een overgeslagen heuvelsessie laat nu stil de bescherming verlopen.

**Groot of klein.** Klein. Een pure functie die de laatste log met minstens 100 m daling vindt (of een trapsessie, verdiepingen maal 3 m), een regel, een instelling ("Afdaalklok", advies aan, grens 21 dagen).

**Planning.** De regel raakt niets. Het inplannen van een trapsessie is een voorstel met Akkoord.

### 2. Enkels en evenwicht

**Wat je merkt.** Bij een bergdoel een vierde rij in Spieren voor de berg: "Enkel en evenwicht: de laatste vier weken niets." Met een voorstel om 5 tot 10 minuten evenwichtswerk aan een training toe te voegen, twee keer per week: op één been staan, later met ogen dicht of op een kussen, en kleine sprongetjes met een stille landing.

**Onderbouwing.** Evenwichts- en proprioceptietraining verlaagde het aantal enkelverzwikkingen in zeven gerandomiseerde studies met 3.726 sporters met ongeveer een derde (relatief risico 0,65) ([Schiftan e.a. 2015](https://pubmed.ncbi.nlm.nih.gov/24831756/)) (waarschijnlijk). In gewone woorden: van ongeveer 17 mensen die het doen, voorkomt één een verzwikking. Het effect is het duidelijkst bij wie al eens verzwikte; bij wie dat nooit had is het bewijs zwakker. Een latere review vond hetzelfde (relatief risico 0,59) ([Clin Rehabil 2023](https://pubmed.ncbi.nlm.nih.gov/36630892/)) (waarschijnlijk). Bij bergwandelaars die vielen was de enkel met ongeveer 40 procent de vaakst getroffen plek ([Faulhaber e.a. 2020](https://econpapers.repec.org/RePEc:gam:jijerp:v:17:y:2020:i:3:p:1115-:d:318600)) (waarschijnlijk). Dat het bij trektochten met een rugzak net zo werkt als bij teamsporters is niet getoetst (onzeker).

**Wat er al is.** `mountainMuscles.ts` telt harde sets per spier over vier weken en doet al een voorstel met één oefening. Er staan evenwichtsoefeningen in de catalogus. Er is geen rij voor de enkel.

**Groot of klein.** Klein. Let op: Forge zit op het maximum van zes rijen (backlog, Forge deel 2), dus dit moet een rij binnen Spieren voor de berg worden, niet een zevende rij.

**Planning.** Een oefening toevoegen gaat als voorstel met Akkoord, zoals nu bij de bergspieren.

### 3. Een vaste ijktocht

**Wat je merkt.** Elke zes tot acht weken dezelfde tocht: dezelfde route of hetzelfde trappenhuis, hetzelfde rugzakgewicht, rustig tempo. Daarna drie regels: "Je klom 520 m per uur, vorige keer 470. Je hartslag in het laatste uur lag 6 slagen boven het eerste, vorige keer 11. Je benen voelden de dag erna: fris." Zoals de testloop het kompas is voor lopen, is dit het kompas voor de berg.

**Onderbouwing.** Een vaste test onder gelijke omstandigheden laat vooruitgang eerlijker zien dan losse tochten: hartslag tegen snelheid bewoog bij recreatieve lopers over 28 weken mee met hun echte conditie ([Vesterinen e.a. 2014](https://lida.sport-iat.de/ta/Record/4031002)) (waarschijnlijk). Voor lange dagen telt vooral hoe goed je conditie overeind blijft na uren werk, wat onderzoekers "durability" noemen: hoe weinig hartslag en tempo verlopen naarmate de dag vordert ([Maunder e.a. 2021](https://link.springer.com/article/10.1007/s40279-021-01459-0)) (onzeker; een sterk pleidooi en een goed concept, maar nog weinig toetsing). Een gevalideerde wandeltest met rugzak voor recreanten bestaat niet; dit is een vertaling (onzeker).

**Wat er al is.** Het compacte profiel van elke tocht (48 stukjes met hartslag, klim- en dalstukken met tempo per derde), het klimtempo (`climbPace.ts`), de hartslagdrift die al voor loopjes bestaat (`runDetailView.ts`, `driftFromKms`), de ochtendcheck van de dag erna en het weer van dat uur. Nieuw is alleen: een sjabloon "IJktocht" en een vergelijking met de vorige keer.

**Groot of klein.** Middel. Een sjabloon, een vergelijkfunctie, een kaart of regel op Je stand. Barometrische hoogte op een vlakke route ruist; een trappenhuis met een vast aantal verdiepingen is in Nederland vaak de betere ijkroute (afgeleid).

**Planning.** Een ijktocht in de planning zetten is een voorstel met Akkoord, met de regels die nu voor een test gelden (frisse benen ervoor).

### 4. De beenindex leert van je eigen ochtenden

**Wat je merkt.** Na een paar maanden één zin: "Jouw benen herstellen na Benen A sneller dan het model aannam; de index rekent nu met 85 procent." De woorden "fris" en "twijfel" op Je stand kloppen daarna beter bij hoe je je voelt.

**Onderbouwing.** Hoe je je voelt volgt trainingsbelasting gevoeliger dan de meeste objectieve maten ([Saw e.a. 2016](https://www.semanticscholar.org/paper/Monitoring-the-athlete-training-response:-measures-Saw-Main/aef31ab9684e48e3bf0ef40e8ff6a53e8be94ea7)) (waarschijnlijk tot zeker). De index is goed bij grote verschillen en zwak in het middengebied (*Betrouwbaarheid beenvermoeidheid-index*). Dit stond als idee 4 in *Trainingswetenschap*, maar het derde deel (de ijking) vond ik niet in de code: `learning.ts#indexChecks` vergelijkt wel, maar doet er niets mee.

**Wat er al is.** De ochtendcheck met de benen (fris, stijf, spierpijn, flink), bijna dagelijks; meldingen per beenplek; de index per dag.

**Groot of klein.** Middel. Een opgeslagen factor is een nieuw veld, dus een migratiestap. Regels uit het visierapport: pas na ongeveer 20 ijkpunten, begrensd tussen 0,7 en 1,4, langzaam bewegend (eigen keuzes, onzeker).

**Planning.** De ijking mag de veiligheidsregels (48 uur, pijn, test) nooit versoepelen, alleen de woorden verschuiven. Alles wat daardoor in de planning zou veranderen blijft een voorstel met Akkoord.

### 5. Eten onderweg oefenen

**Wat je merkt.** De avond voor een training van anderhalf uur of langer (lange duurloop, bergtocht, ijktocht): "Morgen een lange dag. Neem eten mee: 30 tot 60 gram koolhydraten per uur, bij wandelen is 30 tot 40 genoeg. Dat is ongeveer een banaan of een reep per uur." Na afloop optioneel één tik: "Wat at je onderweg? Niets, wat, genoeg." Na een paar keer "niets" een rustige zin dat oefenen nu het goedkoopst is.

**Onderbouwing.** 30 tot 60 gram koolhydraten per uur bij inspanning van meer dan een uur is de consensus ([Thomas e.a. 2016, ACSM](https://pubmed.ncbi.nlm.nih.gov/26891166/)) (zeker). Je darmen wennen aan eten tijdens inspanning: wie het oefent verdraagt het beter en neemt het beter op ([Jeukendrup 2017](https://link.springer.com/article/10.1007/s40279-017-0690-6)) (waarschijnlijk; vooral bij hogere hoeveelheden onderzocht). Op een tocht van 30 dagen met 3.500 tot 4.500 kcal per dag (zie *Aanvullend onderzoek GR5 voorbereiding*) is eten de beperking die je in de training kunt oefenen.

**Wat er al is.** De geplande duur van elke training, de lange sessies, kennis in `data/knowledge/voeding-water.ts`. Er is geen regel die het op het juiste moment zegt; `engine/` noemt koolhydraten nergens.

**Groot of klein.** Klein. Geen Food Log, geen MacroFactor-voeding: alleen een regel bij een training en een optionele tik. Daarmee blijft het buiten het besluit dat kans E liet liggen, maar de eigenaar beslist of ook dit al te veel voeding is.

**Planning.** Raakt niets.

## De langere lijst per thema

Per punt: wat, bron en zekerheid, wat er al is, groot of klein, en of het de planning raakt.

### Belasting en herstel

- **Meer lichte dagen na een meerdaagse tocht.** Nu volgt na elke tocht één lichte dag (`trekTaper.ts`). Na een zware mars herstelt de spierfunctie pas na 48 tot 72 uur ([Orr e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8069713/)) (waarschijnlijk, militair, zwaardere lasten), en na de eerste grote afdaling hoort 72 tot 96 uur geen kwaliteitsloop (regel A8, *Aanvullend onderzoek*). Voorstel: na een tocht van twee dagen of langer met rugzak, of met meer dan 600 m daling per dag, twee tot drie lichte dagen, en geen tempoloop of intervallen binnen 72 uur. Klein. Raakt de planning: alleen in het voorstel waarmee je de tocht maakt, dus met Akkoord.
- **HRV-spreiding naast het gemiddelde.** Hoe sterk je HRV van dag tot dag schommelt over een week zegt soms meer dan het gemiddelde ([Plews e.a. 2012](https://pubmed.ncbi.nlm.nih.gov/22367011/)) (onzeker; casus en kleine groepen). Niet nu; pas bekijken als de ochtendregel een paar maanden draait. Klein. Raakt niets.
- **De ochtendregel op een tocht.** Op een meerdaagse tocht heb je vaak geen bereik en geen sync. Nakijken of de ochtendcheck in een tochtperiode blijft komen zonder horlogegetallen, met alleen benen, energie, slaap en voeten. Klein. Raakt niets.

### Afdalen en excentrische kracht

- **De afdaalklok** (top vijf, punt 1).
- **Excentrisch quadricepswerk telt mee voor de klok.** Step-downs met langzaam zakken en de Eccentric Squat uit Forge kunnen tellen als prikkel; excentrische voorconditionering in de gym gaf 22 procent minder krachtverlies na bergaf lopen ([Bontemps e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7674385/)) (waarschijnlijk). Of een gymprikkel net zo lang beschermt als echt afdalen is niet bekend (onzeker). Voorstel: wel tellen voor de klok, maar de laatste verse prikkel voor een bergtocht moet een echte afdaling of trap zijn. Klein. Raakt niets.
- **Afdaalmeters met rugzak apart zien.** De kaart Bergaf telt meters; de rugzak weegt bergaf zwaarder voor de knie dan lineair (knelpunt 6 in *Trainingswetenschap*). Een tweede lijn "waarvan met rugzak" maakt zichtbaar of de zware weken er echt in zitten. Klein. Raakt niets.

### Rugzakopbouw

- **Draagspieren in Spieren voor de berg.** Relatieve kracht van het bovenlichaam hing bij soldaten sterker samen met marsprestatie dan die van de benen ([Knapik e.a. 2012](https://pubmed.ncbi.nlm.nih.gov/22130400/)) (waarschijnlijk, militair). Romp en bovenrug (suitcase of farmer's carry, rugstrekken, roeien) kunnen dezelfde vorm krijgen als kuiten en tibialis: een melding bij minder dan een paar harde sets per week. Calisthenics telt mee (optrekken, australian rows). Klein. Raakt de planning alleen via een voorstel met Akkoord. Let op de zes rijen in Forge.
- **Eén ding tegelijk zwaarder, vooraf.** Rugzak en hoogtemeters niet in dezelfde week tegelijk omhoog (Orr 2021, expertadvies in een review; regel A3). `progressionSpikes.ts` kijkt achteraf. Nakijken of `packLadder.ts` en de D+-opbouw elkaar vooraf ontwijken; zo niet, dan de ladder één week laten wachten als de hoogtemeters die week stijgen. Klein. Raakt de planning: als nieuwe regel in de ladder, die de eigenaar eerst ziet als voorstel.

### Hoogte en warmte

- **Een warm bad als hitteprikkel in een koele zomer.** Zes dagen 40 minuten in een bad van 40 graden direct na een rustige loop gaf meetbare hitte-acclimatisatie en een 5 km die in 33 graden bijna 5 procent sneller ging ([Zurawlew e.a. 2016](https://doi.org/10.1111/sms.12638)) (waarschijnlijk; één kleine studie bij 17 gezonde mannen, waarvan 10 in de badgroep). In Nederland is het in juni vaak niet warm genoeg om buiten te wennen. Voorstel: in de regel van `heatAcclimation.ts` als optie noemen, met de zin dat wie hart- of bloeddrukklachten heeft dit eerst met een arts bespreekt. Klein. Raakt niets.
- **Tempo op hoogte in de etappetijd.** Boven ongeveer 1.000 m daalt de aerobe capaciteit met zo'n 6 procent per 1.000 m ([Wehrlin en Hallén 2006](https://www.researchgate.net/publication/7456729_Linear_decrease_in_VO2max_and_performance_with_increasing_altitude_in_endurance_athletes)) (waarschijnlijk). Nakijken of de etappeschatting uit je klimtempo daar rekening mee houdt; zo niet, het klimtempo boven 2.000 m 10 tot 15 procent lager schatten, als band (regel B1, eigen vertaling, onzeker). Klein. Raakt niets.
- **Geen acclimatisatieblok voor de GR5.** Het hoogste punt ligt onder 2.800 m, de laagste risicoklasse volgens de richtlijn ([Luks e.a. 2024, WMS](https://journals.sagepub.com/doi/10.1016/j.wem.2023.05.013)) (zeker). Niets bouwen.

### Lopen

- **Het wedstrijdblok en kracht.** In de acht weken voor een 10 km kan kracht terug naar één sessie per week met dezelfde zwaarte en minder sets, zonder krachtverlies (zie Kracht, minimale dosis). Dat geeft ruimte voor een vierde rustige loop, wat bij drie loopjes met twee harde vaak meer oplevert (knelpunt 9 in *Trainingswetenschap*). Middel. Raakt de planning: alleen als voorstel met Akkoord bij de start van het blok.
- **Na de GR5 weer lopen.** Na een maand wandelen is je motor goed, maar je pezen en botten zijn het stoten van lopen ontwend. Nakijken of `afterGoal.ts` na een lange tocht de lange loop laag laat beginnen (de 110-procentregel op de langste loop van de laatste 30 dagen doet dat vanzelf als er geen loop in die 30 dagen staat; nagaan wat hij dan als basis neemt). Klein. Raakt de planning via de bestaande remmen.

### Kracht

- **Minimale dosis in drukke periodes.** Kracht en spiermassa bleven bij jongere volwassenen tot 32 weken staan met één sessie per week en één set per oefening, zolang de zwaarte gelijk bleef; bij ouderen was twee keer per week met twee tot drie sets nodig, en de intensiteit is de sleutel ([Spiering e.a. 2021](https://pubmed.ncbi.nlm.nih.gov/33629972)) (waarschijnlijk; een verhalende review, de auteurs zeggen zelf dat gegevens voor sporters ontbreken). Voor ASCEND: in de taper, het wedstrijdblok en een vakantie de zin "één zware beendag per week houdt je kracht vast", en tijdens de GR5 zelf geen krachtschema (de tocht is het werk). Klein. Raakt de planning alleen als voorstel.
- **Zwaar plus sprongen voor de loopeconomie.** De combinatie van zware kracht en plyometrie gaf het grootste effect op loopprestatie ([Llanos-Lagos e.a. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11258194/)) (waarschijnlijk). Nakijken of Benen A in loopgerichte weken een korte sprongreeks heeft (pogo hops, lage box jumps, 3 x 5 tot 8). Klein. Raakt de training, niet de planning.
- **Weer opbouwen na de GR5.** Na een maand zonder zware kracht begint Forge beter op 60 tot 70 procent van je oude gewichten en klimt in twee tot drie weken terug (expert, onzeker voor de getallen). Nakijken wat Forge nu doet na een lange pauze. Klein. Raakt de training.

### Voeding rond tochten

- **Eten onderweg oefenen** (top vijf, punt 5).
- **20 tot 40 gram eiwit na aankomst.** Op een meerdaagse tocht helpt een eiwitrijke maaltijd binnen een paar uur na aankomst het herstel voor de volgende dag ([Jäger e.a. 2017, ISSN](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5477153/)) (waarschijnlijk). Eén regel bij een tochtdag en in de paklijst (eten per dag). Klein. Raakt niets.
- **Niet afvallen in de laatste weken voor vertrek.** Een tekort van ongeveer 500 kcal per dag remt spieropbouw ([Murphy en Koehler 2022](https://onlinelibrary.wiley.com/doi/10.1111/sms.14075)) (zeker), en snel afvallen kost meer kracht dan langzaam ([Garthe e.a. 2011](https://www.sponet.de/sponet/Record/4020931)) (waarschijnlijk). ASCEND leest het trendgewicht al. Voorstel: als de trend in de zes weken voor een bergtocht meer dan 0,5 procent per week daalt, één zin: "Je valt af in je laatste weken voor vertrek. Voor herstel onderweg is een gelijk gewicht beter." Geen calorieën, geen Food Log. Klein. Raakt niets, maar het is voeding: eerst de eigenaar vragen.

### Blessurepreventie

- **Enkels en evenwicht** (top vijf, punt 2).
- **Pijn die op een tocht dag na dag erger wordt.** Spierpijn die op dag 2 tot 3 piekt en zakt is normaal; pijn op één plek die twee dagen op rij erger wordt is een signaal van overbelasting (regel B7, expert, onzeker). `pain.ts` leest pijn per dag; nakijken of hij een trend over dagen ziet. Voorstel in een tochtperiode: één zin "Kortere etappe of een rustdag" en de vaste verwijzing naar een arts of fysiotherapeut. Klein. Raakt niets in de planning (de etappes zijn van de gebruiker).
- **Voetspieren.** Voetspiertraining halveerde in één goede studie bij recreatieve lopers ruwweg het aantal loopblessures over een jaar ([Taddei e.a. 2020](https://clinicaltrials.gov/study/NCT02306148)) (waarschijnlijk; één studie). Nakijken of dit in `data/bodyCare.ts` staat en of het ergens wordt voorgesteld. Klein.

### Testen en ijkmomenten

- **De ijktocht** (top vijf, punt 3).
- **Kuitheffen op één been als zelftest.** Eens per acht weken zoveel mogelijk eenbenige kuitheffingen, als maat voor de kuit die bergop en met rugzak veel werk doet. Coaches gebruiken 25 tot 30 als richtwaarde (zie *Aanvullend onderzoek*, Sportsmith) (onzeker; geen gevalideerde blessuregrens). Alleen als trend tegen jezelf, nooit als oordeel. Klein. Raakt niets.
- **De generale repetitie op tijd.** Gaat bij de praktijksimulatie iets mis met schoenen, moet er tijd zijn om nieuwe in te lopen, en dat kost volgens ASCEND zelf zes weken (`bootBreakIn.ts`). Voorstel: de eerste volledige simulatie zes tot acht weken voor vertrek, een korte tweede twee tot drie weken ervoor (afgeleid, onzeker). Klein. Raakt de planning: een verschuiving is een voorstel met Akkoord.

### De weken voor een tocht

- **Verse afdaling 7 tot 14 dagen voor vertrek, daarna niets nieuws** (onderdeel van de afdaalklok; regel A9).
- **Meer lichte dagen na een tocht** (zie Belasting en herstel).
- **Generale repetitie op tijd** (zie Testen).
- **Taper.** De taper van ongeveer 70 en daarna 50 procent volume met gelijke intensiteit staat er al en past bij de meta-analyses ([Wang e.a. 2023](https://www.sponet.de/sponet/Record/4081751?lng=en)) (waarschijnlijk). Voor een tocht van 30 dagen zijn de eerste dagen van de tocht je laatste opbouw; de raad om ze licht te houden staat er al. Niets bouwen.
- **Inpakken.** Paklijst met gewichten, basisgewicht en rugzak als percentage van je lichaamsgewicht staan er al. Niets bouwen.

## Wat ik afraad omdat het bewijs dun is

- **Een koud bad na krachttraining als vaste gewoonte.** Koud water na krachttraining remde over twaalf weken de groei van kracht en spiermassa ([Roberts e.a. 2015](https://physoc.onlinelibrary.wiley.com/doi/10.1113/JP270570)) (waarschijnlijk). Hooguit op een meerdaagse tocht in een beek, niet als herstelregel thuis.
- **Foam rollen of een massagepistool als blessurepreventie.** Kleine effecten op spierpijn, geen bewijs voor minder blessures ([Wiewelhove e.a. 2019](https://www.frontiersin.org/articles/10.3389/fphys.2019.00376/full)) (waarschijnlijk). Mag, maar niet als advies.
- **Collageen of gelatine voor pezen.** Eén kleine labstudie, geen blessure-uitkomsten ([Shaw e.a. 2017](https://academic.oup.com/ajcn/article/105/1/136/4569860)) (onzeker).
- **Een hoogtetent of hypoxietraining.** De GR5 blijft in de laagste risicoklasse; geen nut voor dit doel (Luks 2024, zeker).
- **Cadans verhogen als standaardadvies.** Een paar procent meer passen verlaagt de belasting per pas ([Heiderscheit e.a. 2011](https://pubmed.ncbi.nlm.nih.gov/20581720/)) (waarschijnlijk voor de mechanica), maar dat het blessures voorkomt bij iemand zonder klachten is niet aangetoond (onzeker). Niet als regel.
- **Slaap "sparen" in de week voor vertrek.** Extra slapen vooraf hielp in kleine studies tegen een latere korte nacht, maar de groepen waren klein (onzeker). Een gewone goede week slaap is genoeg; geen eigen regel.
- **Supplementen zoals bèta-alanine of nitraat.** Onderzocht bij korte harde inspanning, niet bij lange wandeldagen op lage intensiteit (onzeker voor dit doel).
- **IJzer, vitamine D of bloedwaarden.** Bij vermoeidheid die niet verklaard wordt: naar een arts. Geen regel in ASCEND.
- **Herhaald van eerder:** CTL, ATL en TSB als stuur, de VO2max van het horloge, samengestelde herstelscores, een blessurerisico of een kans in procenten (zie *Kansen met gegevens* en *Trainingswetenschap*).

## Afsluiting

### Wat het onderzoek zegt

Een korte afdaling beschermt je benen weken tegen de spierschade van een lange afdaling, maar niet langer dan ongeveer zes weken (waarschijnlijk). Bij bergwandelaars gebeuren valpartijen vooral bergaf en is de enkel de vaakst getroffen plek (waarschijnlijk), en evenwichtstraining verlaagt verzwikkingen met ongeveer een derde, vooral bij wie al eens verzwikte (waarschijnlijk). Hoe je je zelf voelt volgt belasting beter dan de meeste meetwaarden (waarschijnlijk tot zeker). 30 tot 60 gram koolhydraten per uur bij lange inspanning is consensus (zeker) en is te oefenen (waarschijnlijk). Kracht blijft staan met één zware sessie per week (waarschijnlijk). Na een zware mars met rugzak duurt herstel twee tot drie dagen (waarschijnlijk).

### Wat het betekent voor de app

Als voorstellen voor engine-regels, niet als besluit: een afdaalklok op je echte logs met een trapsessie als voorstel; een rij voor enkel en evenwicht binnen Spieren voor de berg; een vaste ijktocht als kompas voor de berg; een persoonlijke ijking van de beenindex op je ochtendantwoorden; en een regel om eten onderweg te oefenen voor lange trainingen. Daarna, klein: meer lichte dagen na een meerdaagse tocht, draagspieren bij de bergspieren, de minimale dosis kracht in drukke periodes, en de generale repetitie zo vroeg dat er nog tijd is om schoenen te vervangen. Elke regel krijgt een instelling met het advies als standaard, en alles wat de planning verandert gaat via een voorstel met Akkoord. Bij pijn of klachten verwijst de app naar een arts of fysiotherapeut.

### Wat nog onzeker is

- De grens van 21 dagen voor de afdaalklok is een eigen vertaling van twee studies; of een trap of step-down even lang beschermt als een bergpad is niet onderzocht.
- Het effect van evenwichtstraining komt vooral uit teamsporten; voor trektochten met rugzak is het niet getoetst.
- Een gevalideerde wandeltest met rugzak bestaat niet; de ijktocht is een vertaling, en barometrische hoogte op een vlakke route ruist.
- De drempels voor de ijking van de beenindex (20 punten, 0,7 tot 1,4) zijn eigen keuzes.
- Of de eigenaar een regel over eten onderweg of over afvallen voor vertrek wil, na het besluit om voeding te laten liggen.
- Niet in de code teruggevonden en dus nakijken: de ochtendcheck in een tochtperiode zonder sync, een pijntrend over dagen op een tocht, of `packLadder.ts` hoogtemeters en rugzak vooraf uit elkaar houdt, sprongen in Benen A, voetspieroefeningen als voorstel, en wat Forge en de lange loop doen na een maand pauze.
- Enkele bronnen las ik via een samenvatting: Faulhaber 2020 (de 40 procent enkel komt uit een secundaire samenvatting), Zurawlew 2016, Spiering 2021. Maunder 2021, Jeukendrup 2017, Roberts 2015, Wiewelhove 2019, Shaw 2017 en Heiderscheit 2011 noem ik uit bekende literatuur; hun links heb ik niet geopend.

## Bronnen

Onderzoek en richtlijnen:

- Maeo e.a. 2017, korte afdaling beschermt: https://pmc.ncbi.nlm.nih.gov/articles/PMC5348007/
- Byrnes e.a. 1985, hoe lang de bescherming duurt: https://pubmed.ncbi.nlm.nih.gov/4055561/
- Bontemps e.a. 2020, bergaf lopen en spierschade: https://pmc.ncbi.nlm.nih.gov/articles/PMC7674385/
- Faulhaber e.a. 2020, valongevallen bij bergwandelaars in de Oostenrijkse Alpen: https://econpapers.repec.org/RePEc:gam:jijerp:v:17:y:2020:i:3:p:1115-:d:318600
- Schiftan, Ross en Hahne 2015, proprioceptietraining en enkelverzwikkingen: https://pubmed.ncbi.nlm.nih.gov/24831756/
- Preventie van enkelverzwikkingen, Clin Rehabil 2023: https://pubmed.ncbi.nlm.nih.gov/36630892/
- Vesterinen e.a. 2014, hartslag-loopsnelheidsindex: https://lida.sport-iat.de/ta/Record/4031002
- Maunder e.a. 2021, durability bij duursporters: https://link.springer.com/article/10.1007/s40279-021-01459-0
- Saw e.a. 2016, subjectieve en objectieve maten: https://www.semanticscholar.org/paper/Monitoring-the-athlete-training-response:-measures-Saw-Main/aef31ab9684e48e3bf0ef40e8ff6a53e8be94ea7
- Thomas e.a. 2016, ACSM voeding en sportprestatie: https://pubmed.ncbi.nlm.nih.gov/26891166/
- Jeukendrup 2017, de darm trainen: https://link.springer.com/article/10.1007/s40279-017-0690-6
- Orr e.a. 2021, rugzakdragen bij militairen: https://pmc.ncbi.nlm.nih.gov/articles/PMC8069713/
- Knapik e.a. 2012, training en rugzakprestatie: https://pubmed.ncbi.nlm.nih.gov/22130400/
- Plews e.a. 2012, HRV-gemiddelde en spreiding: https://pubmed.ncbi.nlm.nih.gov/22367011/
- Zurawlew e.a. 2016, warm bad na training en hitte-acclimatisatie: https://doi.org/10.1111/sms.12638
- Wehrlin en Hallén 2006, VO2max en hoogte: https://www.researchgate.net/publication/7456729_Linear_decrease_in_VO2max_and_performance_with_increasing_altitude_in_endurance_athletes
- Luks e.a. 2024, WMS-richtlijn hoogteziekte: https://journals.sagepub.com/doi/10.1016/j.wem.2023.05.013
- Spiering e.a. 2021, minimale dosis om conditie en kracht te behouden: https://pubmed.ncbi.nlm.nih.gov/33629972
- Llanos-Lagos e.a. 2024, kracht, plyometrie en loopprestatie: https://pmc.ncbi.nlm.nih.gov/articles/PMC11258194/
- Jäger e.a. 2017, ISSN over eiwit: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5477153/
- Murphy en Koehler 2022, energietekort en krachttraining: https://onlinelibrary.wiley.com/doi/10.1111/sms.14075
- Garthe e.a. 2011, tempo van afvallen en kracht: https://www.sponet.de/sponet/Record/4020931
- Taddei e.a. 2020, voetspiertraining bij lopers (trialregistratie): https://clinicaltrials.gov/study/NCT02306148
- Wang e.a. 2023, taper: https://www.sponet.de/sponet/Record/4081751?lng=en
- Roberts e.a. 2015, koud water na krachttraining: https://physoc.onlinelibrary.wiley.com/doi/10.1113/JP270570
- Wiewelhove e.a. 2019, foam rollen: https://www.frontiersin.org/articles/10.3389/fphys.2019.00376/full
- Shaw e.a. 2017, gelatine en collageensynthese: https://academic.oup.com/ajcn/article/105/1/136/4569860
- Heiderscheit e.a. 2011, paslengte en belasting bij lopen: https://pubmed.ncbi.nlm.nih.gov/20581720/

Eigen rapporten waarop dit voortbouwt: *Trainingswetenschap* (visie), *Kansen met gegevens*, *Aanvullend onderzoek GR5 voorbereiding*, *Trainingsopbouw voor GR5 en hardlopen*, *Betrouwbaarheid beenvermoeidheid-index*, *Spierbelasting en beenvermoeidheid*, *Pijn spierpijn en vermoeidheid melden*.
