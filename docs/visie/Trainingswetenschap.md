# Trainingswetenschap: van nette planner naar slimme coach

Visierapport, 21 oktober 2026. Geschreven vanuit de rol van sportwetenschapper en coach (duurloop, kracht, bergsport). Bekeken: de engine (legFatigue, readiness, standing, weeklyPrescriptionEngine, de progression-bestanden, racePrediction, aerobicTrend, raceBlock, programLayout, substitutions, de regelkoppen van adviceEngine, illness, learning, restWeek), `data/defaultProgram.ts`, de bestaande onderzoeksrapporten in `docs/onderzoek/` en een recente backup van je eigen gegevens. Wat al in die rapporten staat (Banister, ACWR, TRIMP, HRV, sessie-RPE, herhaalde-inspanningseffect, hoogte, blaren) herhaal ik niet uitgebreid; ik verwijs ernaar en bouw erop voort.

Bij elke bewering staat de sterkte van het bewijs: **sterk** (meta-analyses of meerdere consistente gecontroleerde studies), **matig** (een enkele goede studie, een grote cohort of een review van kleine studies), **zwak** (klein, observationeel, of alleen via een samenvatting gelezen), **expert** (coaches, militaire praktijk, consensus zonder uitkomstdata) en **afgeleid** (mijn eigen redenering of berekening).

Aanvulling verwerkt: je loopt de GR5 grotendeels met bivak, vaak alleen, met tent, slaapzak en kookspullen. Dat maakt de rugzak zwaarder en het herstel slechter dan in een hut, en dat verandert de prioriteiten in dit rapport behoorlijk.

## 1. In het kort

1. De basis van ASCEND klopt goed met het onderzoek (de 10%-grens per loop, de beenindex met drie herstellagen, 48 uur tussen zware benen en kwaliteit, taper, terugkomst na ziekte), maar het plan groeit op de kalender en niet op wat je laat zien: een test, een slechte week of ziekte verandert de opbouw nauwelijks.
2. Je huidige loopjes wijzen op een 10 km rond 60 minuten; 45 minuten op 20 maart vraagt een sprong die bij vrijwel niemand in 21 weken lukt. De testloop van 29 oktober moet dat beslissen, en daarna moet de app eerlijk een realistische band voorstellen en je trainingstempo's eruit afleiden, wat hij nu belooft maar niet doet.
3. Voor een GR5 met bivak is de rugzak (realistisch 13 tot 16 kg) en het aantal dagen achter elkaar de grootste beperking, niet je conditie. Het plan begint te laat met de rugzak, komt maar één keer op 12 kg, en oefent nooit meer dan twee dagen achter elkaar.
4. De beenindex rekent toekomstige bergtochten en rugzakweekends te licht (hij gebruikt 500 m en 6 kg waar het plan 1.000 m en 12 kg vraagt) en behandelt een zware rugzak bergaf lineair, terwijl je knie juist onevenredig veel meer moet opvangen.
5. Een deel van de engine is ingewikkelder dan wat het oplevert (een tweede progressiesysteem waarvan de uitkomst nergens getoond wordt, een samengestelde readiness-score die bijna altijd 100% herstel meldt); liever opruimen dan uitbreiden, en geen fitnessmodel met schijnprecisie bouwen.

## 2. Wat er nu is en waar het knelt

### Wat al goed staat

Eerst wat sterk is, zodat het bij het verbeteren niet sneuvelt.

- **De 10%-grens per loop.** `engine/substitutions.ts` (regels 60 tot 77 en 122 tot 129) begrenst elke sessie in de komende twee weken op 110% van je langste van de laatste 30 dagen. Dat is precies de maat die in de grootste studie met 5.205 hardlopers wel met blessures samenhing ([Frandsen e.a. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12421110/)) (bewijs: matig). Kleine kanttekening: de app vergelijkt minuten per sjabloon, de studie afstand over al je loopjes samen. Voor jou maakt dat nu weinig uit.
- **De beenindex met drie lagen** (`engine/legFatigue.ts`): intensiteit, kracht en impact, en spierschade, elk met een eigen halfwaardetijd, plus het herhaalde-inspanningseffect (regels 199 tot 213). Dat onderscheid is beter dan wat TrainingPeaks-achtige vorm-curves doen, en het rapport *Betrouwbaarheid beenvermoeidheid-index* heeft al eerlijk vastgesteld dat hij goed is in grote verschillen en zwak tussen ongeveer 7 en 11.
- **Kwaliteit niet binnen 48 uur na zware benen, een test niet binnen 72 uur** (`engine/raceBlock.ts`, regels 25 tot 27 en 281 tot 304). Klopt met het onderzoek naar loopeconomie na spierschade (zie *Spierbelasting en beenvermoeidheid*).
- **Taper** van ongeveer 70% en dan 50% van het volume met gelijke intensiteit (`engine/programLayout.ts`, regels 165 tot 172), en voor de 10 km een korte taper in de wedstrijdweek. Dat past bij de meta-analyses: 41 tot 60% minder volume, intensiteit houden, ongeveer 8 tot 14 dagen ([Wang e.a. 2023](https://www.sponet.de/sponet/Record/4081751?lng=en); Bosquet e.a. 2007, besproken in *Andere manieren om belasting te plannen*) (bewijs: matig).
- **Terugkomen na ziekte** op ongeveer 75% volume met eerst geen zware sessies (`engine/illness.ts`). Verstandig en uitlegbaar.
- **Afdaalprikkels in de basis** om de week (`engine/raceBlock.ts`, regels 111 tot 121), zodat de bescherming tegen spierschade niet verloopt.
- **"Je rustige loopjes waren te hard"** (`engine/standing.ts`, regels 244 tot 248). Belangrijk voor jou: in je logs staat een "rustige" loopband-loop die gemiddeld in zone 3 van je eigen zones viel.

### Knelpunt 1: de doeltijd van 45 minuten en wat je logs zeggen

Je logs van de afgelopen weken bevatten rustige loopjes buiten, lange duurlopen en een loopbandloop. De rustige loopjes en de duurlopen zaten op een hartslag die echt bij rustig hoort, dus hun tempo zegt iets over je huidige niveau.

Met de formules van Daniels en Gilbert (de basis van de VDOT-tabellen; [uitleg](https://www.coachray.nz/2023/05/03/jack-daniels-running-intensity/)) passen de tempo's van die rustige loopjes bij een VDOT van ongeveer 32, en dat hoort bij een 10 km van ongeveer 60 minuten. Een 10 km in 45 minuten is een VDOT van ongeveer 45, met een rustig tempo rond 5:35 tot 6:05 per km (afgeleid, eigen berekening). Dat is een sprong van 12 tot 14 punten in 21 weken.

Hoe snel gaat dat in de praktijk? Recreatieve lopers die al trainen verbeterden hun 10 km in 10 tot 15 weken met 3 tot 6% ([Muñoz e.a. 2014](https://pubmed.ncbi.nlm.nih.gov/23752040/); [Nuuttila e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/)) (bewijs: matig). Iemand die net begint gaat sneller vooruit, maar 25% in 21 weken is uitzonderlijk. Een realistische band voor 20 maart, als je je plan volgt, is grofweg 50 tot 56 minuten (afgeleid: 0,3 tot 0,8% per week, iets ruimer dan de studies omdat je nog vroeg in je loopcarrière zit).

Een eerlijke kanttekening: dit is een schatting uit rustige loopjes op een polshorloge, op een trailpad en een warme loopband. Een rustig tempo zegt minder dan een test. Maar de richting is duidelijk genoeg om er nu al iets mee te doen: de test van 29 oktober is het moment waarop de app dit hardop moet zeggen. Op dit moment doet hij dat niet. `engine/feasibility.ts` kijkt naar capaciteitsgaten, niet naar je doeltijd, en `engine/racePrediction.ts` wordt alleen op het Ascend-scherm gebruikt (`pages/Ascend.tsx`, regel 690).

### Knelpunt 2: de testloop belooft tempo's die nergens vandaan komen

Bij de testloop staat "Daarop stemt ASCEND je doeltijd en je tempolopen af" (`data/workoutStructure.ts`, regel 251). In de code gebeurt dat niet: `testResults` en `predictRace` hebben geen andere lezer dan het Ascend-scherm. De tempoloop zegt "comfortabel zwaar, korte zinnen" en de intervallen "ongeveer je 5 km-tempo" (regels 113 en 230), zonder getal. Voor drempelwerk is hartslag een prima stuur (je zone 3), maar bij intervallen van 60 seconden tot 4 minuten loopt de hartslag achter en is een tempo uit je test het betere doel. Daniels werkt precies zo: tempo's afgeleid van je laatste test of wedstrijd ([Daniels' intensiteiten](https://www.coachray.nz/2023/05/03/jack-daniels-running-intensity/)) (bewijs: expert, maar breed gebruikt en in lijn met kritieke-snelheidsonderzoek, [Smyth en Muniz-Pumares 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7664951), matig).

### Knelpunt 3: het plan groeit op de kalender, niet op wat je laat zien

De duur van elke loop volgt de programmaweek: `cycleMultiplier` en `runBuildMultiplier` in `engine/programLayout.ts` (regels 182 tot 185 en 220 tot 231) rekenen alleen met `weekInProgram`. Mis je een week, ben je twee weken ziek of loop je ineens veel sneller, dan wijzigt de opbouw zelf niet. Twee vangnetten dempen dat:

- de 110%-grens, maar alleen voor de komende 13 dagen (`substitutions.ts`, regel 77);
- het terugkomschema na ziekte, 75% voor hooguit 14 dagen (`illness.ts`).

Dat is een bewuste en verdedigbare keuze: een vast plan met een rem werkt bij recreanten gemiddeld net zo goed als constant bijsturen ([Nuuttila e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/) vond wel een voordeel voor bijsturen, maar dat ging om de zware sessies, niet om het volume). Het knelt op één plek: na een slechte week (weinig gedaan, niet ziek gemeld) stapt het plan gewoon naar de volgende, zwaardere week. Een coach zou zeggen: deze week nog een keer.

### Knelpunt 4: twee progressiesystemen, en het tweede levert niets zichtbaars

Naast de kalenderopbouw bestaat een tweede systeem: capability, demand, gap, feasibility, specificity ramp en `progressionOrchestrator.ts`, samen goed voor duizenden regels. Wat ik zag:

- `weeklyPrescriptionEngine.ts` schrijft `TrainingPrescription`-rijen weg (`state/AppDataContext.tsx`, regels 810 tot 813), maar geen enkel scherm of engine-bestand leest ze terug. Alleen `byPlannedSession` wordt gebruikt, en dan om de oude rij te vervangen.
- De beslisregel krijgt `consecutiveProgressCount: 0`, altijd (`progressionDecisions.ts`, regel 89), dus het "controlemoment na drie stappen" gaat nooit af.
- De herstelpoort leunt op `readiness.recovery` (`progressionOrchestrator.ts`, regel 145). Die score is rustdagen gedeeld door één per week (`readiness.ts`, regels 67 tot 74) en staat voor jou, met een vaste rustdag, vrijwel altijd op 100%.
- Op het Ascend-scherm staat die readiness als één percentage met drie balken (`pages/Ascend.tsx`, regels 211 tot 215). Het eerdere rapport *Andere manieren om belasting te plannen* raadde zo'n samengestelde score juist af ([Doherty e.a. 2025](https://www.degruyterbrill.com/document/doi/10.1515/teb-2025-0001/html)) (bewijs: matig voor de vaststelling dat zulke scores niet gevalideerd zijn).

Het tweede systeem bepaalt wel welke sessies er in verre weken bij of af gaan, maar de getallen die je ziet (minuten, hoogtemeters, rugzak) komen uit het eerste. Dat is veel machinerie voor weinig effect, en twee bronnen van waarheid voor "hoe zwaar wordt mijn week" is een bron van rare uitkomsten.

### Knelpunt 5: de beenindex kijkt vooruit met de verkeerde tochten

In `fatigueEvents` (`legFatigue.ts`, regels 167 tot 172) krijgt een geplande sessie als daling en rugzak: je eigen gemiddelde van de laatste vier keer, anders het vaste doel van het sjabloon. Het weekdoel uit de fase gebruikt hij niet. De bergtocht heeft als sjabloondoel 500 m en 6 kg (`defaultProgram.ts`, regel 257), terwijl de fases oplopen tot 1.000 m en 12 kg (regels 269 tot 282). En zodra je een paar kortere bergtochten gelogd hebt, wordt je gemiddelde de maat, ook voor de zwaarste week. Gevolg: de frisheidscurve, de beenkalender en elke planningsbeslissing die op de index leunt, onderschatten juist de weekends waar het om gaat. Met bivak (15 kg) wordt het verschil nog groter.

### Knelpunt 6: de rugzakfactor is lineair, je knie niet

De rugzak telt als `1 + rugzak / lichaamsgewicht` op alle drie de lagen (`legFatigue.ts`, regels 238 tot 242): 15 kg bij 80 kg geeft 1,19. Voor de energiekost klopt dat ongeveer, want die schaalt met de totale massa ([Looney e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8919998)) (bewijs: matig). Voor de knie bergaf niet: in een loopbandstudie met 0 tot 30 kg op hellingen nam de activiteit van de kniestrekkers sterker toe dan die van heup en enkel, met 104 tot 172% extra voor de rectus femoris bij de zwaarste last ([Applied Sciences 2020](https://www.mdpi.com/2076-3417/10/14/4890)) (bewijs: zwak, tien mannen, spieractiviteit en geen spierschade). Een review vond dat onder 15 kg vooral het knie-strekmoment toeneemt: de knie is het eerste gewricht dat de rugzak voelt (bewijs: zwak, via samenvatting). Tegelijk verlagen wandelstokken bergaf de krachten op de knie met 12 tot 25% ([Schwameder e.a. 1999](https://pubmed.ncbi.nlm.nih.gov/10622357/)) (bewijs: matig, klein lab), en daar weet de index niets van.

### Knelpunt 7: kracht telt mee als aanname

Alle krachtlogs in je backup hebben geen RPE en geen RIR. De index rekent dan met RPE 8 (`legFatigue.ts`, regel 230). Een beendag die langer duurt dan 75 minuten telt als 75 (regel 72, terecht). Dat betekent dat je zwaarste beenprikkel van de week in de index een gemiddelde gok is. `strengthRir` bestaat al in het model; het wordt alleen niet gevraagd.

### Knelpunt 8: de GR5-opbouw is gemaakt voor hutten, niet voor bivak

Je doel staat op 620 km in 30 dagen, 30.000 m stijgen en dalen: gemiddeld 20 km en 1.000 m omhoog en omlaag per dag, een maand lang. Het plan:

- de rugzak begint pas in Bergcapaciteit (vanaf 26 april 2027, 4 kg) en komt één keer op 12 kg, in de generale repetitie (`defaultProgram.ts`, regel 279);
- meer dan twee dagen achter elkaar komt nergens voor; Expeditieklaar is vier weken met een zaterdag en zondag;
- het doel in de app zegt 12 kg.

Met tent, slaapzak, mat, kookspullen, water en twee tot drie dagen eten is 12 kg aan de lichte kant. Een redelijke schatting: basisuitrusting 7 tot 10 kg, eten 0,7 tot 0,9 kg per dag maal 2 tot 3 dagen, water 1,5 tot 2 kg, brandstof. Dat is 12 tot 16 kg, met de zwaarste dag (net bevoorraad, volle flessen, een col zonder water) rond 16 kg (afgeleid, uit gangbare backpackingpraktijk; bewijs: expert). Bij 80 kg is 16 kg 20% van het lichaamsgewicht. De vuistregel "niet meer dan 20%" is praktijk, geen onderzoek (bewijs: expert). In een enquête onder langeafstandswandelaars op de Appalachian en Pacific Crest Trail gingen zwaardere rugzakken samen met meer klachten zoals tintelingen ([Anderson e.a. 2009](https://complete.bioone.org/journals/wilderness-and-environmental-medicine/volume-20/issue-3/08-WEME-OR-196R2.1/The-Impact-of-Footwear-and-Packweight-on-Injury-and-Illness/10.1580/08-WEME-OR-196R2.1.full)) (bewijs: zwak, enquête).

Bij militairen, waar het meeste onderzoek naar rugzakdragen vandaan komt, zitten de blessures vooral in knie, enkel en voet, met de rug op de tweede plaats, en herstelt de spierfunctie na een zware mars pas na 48 tot 72 uur ([Orr e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8069713/)) (bewijs: matig, review van militaire studies met lasten van 25 kg en meer). Wat het best werkt om beter te worden in rugzakdragen is een combinatie van krachttraining, duurtraining en specifiek rugzaktraining, niet een van de drie alleen ([Knapik e.a. 2012](https://pubmed.ncbi.nlm.nih.gov/22130400/)) (bewijs: matig, tien studies). Specifieke rugzaksessies 2 tot 4 keer per maand; vaker gaf in militaire studies geen winst en wel meer blessures ([Orr e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8069713/)) (bewijs: matig, bij zwaardere lasten dan de jouwe).

Slapen in een tent, vaak alleen, is het tweede verschil. Er is geen gecontroleerde studie naar herstel in een tent tijdens een meerdaagse tocht. Bij avonturenracers bleef een slaaptekort na de race nog een week bestaan, terwijl ze zich al eerder hersteld voelden ([avonturenracers 2024](https://busqueda.bvsalud.org/portal/resource/es/mdl-38874812)) (bewijs: zwak). De les voor de voorbereiding: je slaapsysteem en je eten moeten getest zijn voordat de tocht begint, want daar wint of verlies je herstel, niet in de training.

### Knelpunt 9: het wedstrijdblok is zwaar voor drie loopjes

In de acht weken voor 20 maart wordt de rustige loop midden in de week een tempoloop en de zaterdag 4 x 4 minuten (`raceBlock.ts`, regels 6 tot 10 en 22 tot 24), naast de lange duurloop en de zware beendag. Met drie loopjes per week zijn dat twee kwaliteitssessies van drie. Gemeten in tijd blijft de verdeling misschien rond 80% rustig, gemeten per sessie niet ([Sylta e.a. 2014](https://uia.brage.unit.no/uia-xmlui/handle/11250/226883)) (bewijs: matig voor het meetverschil). De meta-analyses zeggen dat bij recreanten de verdeling weinig uitmaakt zolang het grootste deel rustig is ([Oliveira e.a. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428/)) (bewijs: matig). Voor iemand op zijn eerste 10 km-blok met zware beenkracht ernaast levert extra rustig volume vermoedelijk meer op dan een tweede harde sessie (afgeleid). Met een vierde rustige loop is twee kwaliteitssessies prima; zonder die vierde loop liever één.

### Knelpunt 10: de ochtendregel is half af

Het eerdere rapport adviseerde een regel met drie ochtendsignalen (gevoel, rusthartslag of HRV, hartslag bij vast tempo) naar Nuuttila. Gebouwd is het gevoel (`MORNING-CHECK` in `adviceEngine.ts`) en, apart, de hartslag-tempotrend (`aerobicTrend.ts`). `restingHeartRate` bestaat in `models/metrics.ts` maar geen engine-bestand leest het. Daarnaast hint `standing.ts` (regels 121 tot 127) op een weeksprong van 1,3 maal met Gabbett als bron, terwijl het eigen onderzoek van de app juist laat zien dat die ratio weinig voorspelt. Klein punt, maar het hoort uit hetzelfde verhaal te komen.

## 3. Ideeën, gerangschikt op waarde voor jou

### 1. De testloop wordt het kompas: tempo's en een eerlijke doeltijd

**Wat.** Een pure functie, bijvoorbeeld `engine/runPaces.ts`, die uit je laatste test (5 km, of later een wedstrijd) drie dingen afleidt:

- je tempo's voor rustig, drempel, 10 km-tempo en intervallen (Daniels' VDOT, of kritieke snelheid als er twee testen van verschillende lengte zijn), getoond bij de tempoloop en de intervallen naast de hartslagzone;
- een voorspelde 10 km als band (Riegel bestaat al), plus een verwachte band voor 20 maart als je het plan volgt (je huidige tijd min 0,3 tot 0,8% per week, smaller zodra er twee of drie testen zijn en je eigen tempo van vooruitgang bekend is);
- direct na de test een voorstel met Akkoord als je doeltijd buiten die band valt: "Je test zegt nu ongeveer 59 minuten. Met 21 weken is 51 tot 55 realistisch. Wil je je doel op 53 zetten, of 45 houden als droom?" Jij kiest; de app verandert je doel niet stil.

Tussen de testen door kan de hartslag-tempotrend uit `aerobicTrend.ts` een schatting geven van waar je staat, geijkt op je eigen testen. Dat is de "heart rate running speed index" die bij 45 recreatieve lopers over 28 weken meebewoog met hun maximale loopsnelheid en VO2max ([Vesterinen e.a. 2014](https://lida.sport-iat.de/ta/Record/4031002)) (bewijs: matig). Tempo's pas aanpassen na een nieuwe test of na een duidelijke trend, en hooguit één VDOT-punt per vier tot zes weken, zoals Daniels adviseert (bewijs: expert).

**Waarom.** Het lost knelpunt 1 en 2 op, het is de vraag die je elke tempoloop stelt ("hoe snel?"), en de test wordt iets waar je naar uitkijkt in plaats van een meetpunt waar niets mee gebeurt.

**Werk.** Klein tot middel. Alles lokaal, geen nieuwe data nodig. Een migratie is niet nodig als het doel zelf alleen via een voorstel verandert.

**Risico.** Een slechte testdag (warm, moe, wind) geeft te trage tempo's. Daarom: de beenindex van die ochtend en je gevoel bij het inlopen (bestaat al in `learning.ts`) meewegen, en een test die meer dan 3,5% afwijkt van de trend als "twijfelachtig" markeren, met het aanbod om hem over vier weken te herhalen. Tweede risico: een eerlijke band voelt ontmoedigend. Formuleer het als een keuze tussen twee doelen, niet als een oordeel.

### 2. Een rugzak- en bivakladder richting 16 kg en meerdaagse blokken

**Wat.** De GR5-opbouw aanpassen aan bivak:

- **Eerder beginnen, lichter.** Vanaf nu (Opbouw, winter) om de week een stevige wandeling of de bestaande `tpl_ruck_walk` met 5 tot 8 kg. Voeten, huid, schouders en rug passen zich trager aan dan je conditie, en dat gaat het makkelijkst in de rustige maanden (afgeleid, bewijs voor de algemene regel: expert).
- **Eén variabele tegelijk.** Rugzak, duur of hoogtemeters omhoog, nooit twee tegelijk in dezelfde sessie, zoals Orr voor militairen adviseert ([Orr e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8069713/)) (bewijs: expert binnen een review). De bestaande `progressionSpikes.ts` controleert dit al achteraf; de ladder moet het vooraf goed doen.
- **Stappen van 1 tot 2 kg per één tot twee weken**, alleen als de vorige stap rustig voelde (RPE 5 of lager, geen pijn, geen schuurplekken), tot 15 à 16 kg in Expeditieklaar. Een zware rugzaksessie (12 kg of meer, 3 uur of langer) niet vaker dan eens per week, en in het begin eens per twee weken (afgeleid uit Orr en Knapik; militaire lasten zijn zwaarder dan de jouwe, dus dit is voorzichtig).
- **Meerdaagse blokken.** Niet alleen zaterdag en zondag, maar een paar keer drie dagen. De feestdagen van 2027 lenen zich daar goed voor: Hemelvaart (6 tot 9 mei) en Pinksteren (zaterdag 15 tot maandag 17 mei), beide in Bergcapaciteit. Een eerste bivak van twee nachten met 10 tot 12 kg in de Ardennen, de Eifel of het Sauerland, en een generale repetitie van drie dagen met volle rugzak, eigen eten en tent eind juni of begin juli.
- **Het bivakweekend als eigen training** met een korte checklist ervoor (uitrusting gewogen, voeten afgeplakt, eten per dag) en een debrief erna (slaap, voeten, schouders, hoe voelden de benen de tweede ochtend). Die debrief vult de GR5-mijlpalen.
- **Het doel in de app** op 15 of 16 kg in plaats van 12, na jouw bevestiging.

**Waarom.** Specifiek rugzaktraining is een van de drie onderdelen die rugzakprestaties aantoonbaar verbeteren ([Knapik e.a. 2012](https://pubmed.ncbi.nlm.nih.gov/22130400/)) (bewijs: matig). Er bestaat geen studie naar back-to-back dagen voor trektochten; dat is coachpraktijk uit ultralopen en bergsport (bewijs: expert). Het sterkste argument is het herhaalde-inspanningseffect: de eerste zware afdaling met last doet het meeste pijn, daarna ben je wekenlang deels beschermd ([Maeo e.a. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5348007/)) (bewijs: matig). Die eerste keer wil je in mei hebben, niet op dag 1 van de GR5.

**Werk.** Middel. Nieuwe weekdoelen in `defaultProgram.ts` (`weeklyProgression` van de bergtocht en de eerste wandeldag) en een sjabloon voor een meerdaags blok. Let op: sjablonen staan opgeslagen in IndexedDB, dus een wijziging in de standaarddata heeft een stap nodig die opgeslagen sjablonen bijwerkt, volgens de migratieregel in CLAUDE.md. Volledig lokaal.

**Risico.** Te snel zwaarder bij een licht lichaam of zwakke voeten; daarom de RPE-voorwaarde per stap. Feestdagen kunnen slecht weer hebben; het blok moet verschuifbaar zijn zonder dat de ladder breekt.

### 3. Een rustige start van de GR5 zelf

**Wat.** De app helpt de eerste week van de tocht plannen: de eerste drie tot vier dagen ongeveer 60 tot 70% van een gemiddelde etappe (korter, of de zware afdalingen in tweeën), daarna gewone etappes, en elke zes tot acht dagen een rustige of halve dag, bijvoorbeeld bij een bevoorrading in een dal. Later kan een "tochtmodus" offline elke ochtend dezelfde check-in vragen (benen, energie, slaap, voeten) en bij twee slechte signalen een kortere dag voorstellen.

**Waarom.** Op een tocht van 30 dagen is de tocht zelf je laatste trainingsblok. De eerste dagen zijn het riskantst voor spierschade en blaren; daarna beschermt het herhaalde-inspanningseffect ([Maeo e.a. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5348007/)) (bewijs: matig). Slapen in een tent geeft minder herstel, wat het belang van een rustige opbouw en geplande rustdagen vergroot (bewijs: zwak tot expert). Van de Camino-wandelaars kreeg 62% blaren (zie *Aanvullend onderzoek GR5 voorbereiding*); de eerste dagen tellen het zwaarst.

**Werk.** Klein voor het advies bij de GR5-details, middel tot groot voor een tochtmodus. Werkt lokaal en offline in de PWA; batterij is een echte beperking.

**Risico.** Etappes en bivakplekken liggen vast door terrein en regels voor wildkamperen; het advies moet flexibel zijn ("splits deze afdaling") en geen rigide schema.

### 4. De beenindex klopt vooruit voor tochten en rugzak, en leert van jouw benen

**Wat.** Drie aanpassingen in `legFatigue.ts`:

- **Weekdoel gebruiken voor geplande sessies.** Voor een geplande sessie eerst de hoogtemeters en de rugzak van de fase-stap (`progressionTarget(...).step.elevationGainM` en `backpackKg`), dan je eigen gemiddelde, dan het sjabloon. Dat lost knelpunt 5 op.
- **Rugzak bergaf zwaarder in de schadelaag.** Voor de schadelaag een steilere factor, bijvoorbeeld `1 + 1,5 x rugzak / lichaamsgewicht` (16 kg bij 80 kg: 1,30 in plaats van 1,20), en voor wandelen met stokken 15% minder. Dat getal is niet getoetst; het is een richting uit de spieractiviteit- en stokkenstudies (afgeleid). Daarom niet zomaar invoeren, maar ijken (volgende punt). Stokken als één tik bij het loggen van een tocht, of als vaste instelling.
- **Persoonlijke ijking.** `learning.ts#indexChecks` vergelijkt al je gevoel bij het inlopen met de index, maar doet er niets mee. Gebruik daarnaast de ochtendcheck-in (benen fris, stijf, spierpijn, flink), die bijna dagelijks binnenkomt, als ijkpunt: hoe vaak zei de index "fris" terwijl jij "spierpijn" meldde, en andersom. Na ongeveer 20 ijkpunten één persoonlijke factor op de index (begrensd tussen 0,7 en 1,4) of op de schadelaag alleen, met een zin die het uitlegt: "Jouw benen herstellen na Benen A sneller dan het model aannam; de index rekent nu met 85%."

**Waarom.** De index is goed in grote verschillen en zwak bij de grens (rapport *Betrouwbaarheid beenvermoeidheid-index*). Een eigen ijking maakt hem precies op de plek waar hij nu ruis is beter, met gegevens die je al geeft. Subjectieve signalen volgen belasting gevoeliger dan objectieve ([Saw e.a. 2016](https://www.semanticscholar.org/paper/Monitoring-the-athlete-training-response:-measures-Saw-Main/aef31ab9684e48e3bf0ef40e8ff6a53e8be94ea7)) (bewijs: matig tot sterk).

**Werk.** Klein voor het weekdoel, middel voor de ijking. Een opgeslagen ijkfactor is een nieuw veld en dus een migratiestap. Lokaal.

**Risico.** Overfitten op een paar dagen; daarom een minimum aantal punten, een begrenzing en een factor die maar langzaam beweegt. De ijking mag de veiligheidsregels (48 uur, pijn) nooit versoepelen, alleen de woorden "fris" en "twijfel" verschuiven.

### 5. Een slechte week leidt tot een voorstel: deze week nog een keer

**Wat.** Aan het eind van een week (of op maandag in de weekreview): heb je minder dan ongeveer 60% van de geplande belasting gedaan, of twee of meer kernsessies gemist, en was je niet ziek gemeld, dan een voorstel met Akkoord: "Volgende week herhaalt deze week in plaats van zwaarder te worden." Technisch: een lijst herhaalde weken op het programma, net als `skippedRestWeeks`, waardoor de opbouw één week opschuift. De taper en de doeldatum schuiven niet; de opbouw wordt dan aan het eind van een fase iets ingekort. Omgekeerd: een goede week versnelt niets. Vooruitgang laat je zien in de test, niet in extra minuten.

**Waarom.** Asymmetrisch bijsturen (wel remmen, niet versnellen) is wat de beslisregels in de studies vooral opleveren: minder slechte uitkomsten, niet meer fitheid gemiddeld (zie *Trainingsopbouw voor GR5 en hardlopen*; [Nuuttila e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/)) (bewijs: matig). Het lost knelpunt 3 op zonder het plan onvoorspelbaar te maken.

**Werk.** Middel. Nieuw veld op `Program` en dus een migratiestap; de voorstelvorm bestaat al.

**Risico.** Te vaak herhalen schuift de opbouw tegen de doeldatum. Begrens het op één herhaling per golf van vier weken en laat in het voorstel zien wat het kost ("de lange duurloop komt dan op 110 in plaats van 120 minuten uit").

### 6. Een prognose in plaats van een fitnessmodel

**Wat.** Een kaart "Waar sta je op 20 maart en op 1 augustus", zonder Banister:

- **20 maart:** de band uit idee 1, met de testen als punten en de verwachte band als grijze strook. Eén zin: "Bij dit plan: 51 tot 55 minuten. Je laatste test lag op schema."
- **1 augustus:** geen getal, maar de vijf dingen die de GR5 vraagt (langste dag in uren, grootste afdaling met rugzak, zwaarste rugzak, dagen achter elkaar, een bivaknacht), elk met wat je al deed en of het plan je er op tijd brengt. Dat bestaat grotendeels al als `routeDayRows` in `standing.ts` en als de mijlpalenladder; de stap is de datum erbij: "dit haal je volgens plan in week 27".
- **Scenario's**, alleen als ze spelen: als je ziek meldt, één zin over wat het betekent. Twee weken stilstand kost een getrainde sporter meetbaar VO2max, en recent opgebouwde winst gaat het snelst verloren ([Mujika en Padilla 2000](https://lida.sport-iat.de/ta/Record/3047130)) (bewijs: matig). Voor jou betekent dat ruwweg enkele weken terug op de band, niet het verlies van je doel. Zo'n zin kan uit dezelfde bandberekening komen.

**Waarom niet Banister.** De parameters zijn per persoon onbetrouwbaar en de vaste constanten zijn een keuze, geen meting ([Hellard e.a. 2006](https://pmc.ncbi.nlm.nih.gov/articles/pmid/16608765)) (bewijs: matig); het eerdere rapport heeft dat uitgebreid laten zien. Een model dat je 10 km op de seconde voorspelt uit sessie-RPE is schijnprecisie. Een band uit je eigen testen is eerlijker en net zo bruikbaar.

**Werk.** Middel. Lokaal.

**Risico.** Een band wordt gelezen als belofte. Altijd de aanname erbij ("als je het plan grotendeels volgt") en de band breed houden tot er drie testen zijn.

### 7. De ochtendregel afmaken, HRV optioneel

**Wat.** De regel uit het eerdere rapport voltooien: (a) de check-in, (b) een optionele rusthartslag in dezelfde check-in (één getal dat je horloge toont; drie-daags gemiddelde tegen je eigen vier weken), (c) de hartslag-tempotrend. Twee van de drie slecht op de ochtend van een zware sessie: een voorstel om hem rustiger te doen of te schuiven. Eén slecht: een woord. HRV-status van Garmin als categorie mag als optie, niet als verplichting.

**Waarom.** HRV-sturing geeft bij duursporters een klein voordeel, vooral minder mensen die niet vooruitgaan ([Düking e.a. 2021](https://pubmed.ncbi.nlm.nih.gov/34489178/); [Manresa-Rocamora e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8507742/)) (bewijs: matig). De studies zelf waren klein: Kiviniemi bij 26 mannen ([2007](https://lida.sport-iat.de/ta/Record/4021912)), Vesterinen bij 40 recreatieve lopers ([2016](https://pubmed.ncbi.nlm.nih.gov/26909534/)), Javaloyes bij 17 getrainde fietsers, waar de HRV-groep wel verbeterde maar niet significant meer dan de vaste groep ([2019](https://dspace.umh.es/handle/11000/30650)) (bewijs: zwak tot matig). Plews liet zien dat een rollend gemiddelde over zeven dagen bruikbaarder is dan losse dagwaarden ([Plews e.a. 2012](https://pubmed.ncbi.nlm.nih.gov/22367011/)) (bewijs: zwak, casus). Garmin geeft de ruwe HRV niet via Health Connect, dus voor jou is dit handwerk, en het voordeel is te klein om het te verplichten.

**Werk.** Klein. Het veld bestaat al; alleen de check-in en de regel.

**Risico.** Extra tikjes in de ochtend, terwijl je weinig handwerk wilt. Daarom optioneel, en de regel werkt zonder.

### 8. Kracht voor de GR5 en de 10 km, zonder MacroFactor over te doen

**Wat.**

- **Na een beendag één vraag:** "Hoeveel herhalingen had je nog over in je zwaarste sets? 0 tot 1, 2 tot 3, 4 of meer." Dat vult `strengthRir`, en de index rekent dan met jouw inspanning in plaats van RPE 8.
- **Een korte GR5-krachtlijst** bij de Benen-sjablonen, als controle eens per maand ("zit dit in je MacroFactor-schema?"): een zware kniedominante oefening, step-downs met gewicht (langzaam naar beneden: excentrisch, precies wat bergaf vraagt), step-ups met rugzak, een heupscharnier (Roemeense deadlift), kuitheffen met gestrekte én gebogen knie (de soleus), tibialis- en enkelwerk, en voor rug en romp: farmer's of suitcase carries en rugstrekken. Voor de 10 km verbetert zware krachttraining de loopeconomie met 2 tot 8% ([Blagrove e.a. 2018](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5889786/)) (bewijs: matig). Bij soldaten hing relatieve kracht, ook van het bovenlichaam, samen met hoe goed ze met een rugzak marcheerden ([Orr e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8069713/)) (bewijs: zwak tot matig). Krachttraining halveert ruwweg sportblessures in gecontroleerde studies, en meer volume beschermt meer ([Lauersen e.a. 2018](https://bjsm.bmj.com/content/52/24/1557.info)) (bewijs: matig tot sterk); rekken doet dat niet ([Lauersen e.a. 2014](https://bjsm.bmj.com/content/48/11/871)) (bewijs: sterk).
- **Interferentie:** kracht naast duurtraining kost nauwelijks maximale kracht of spiermassa, wel iets explosiviteit, vooral als beide in dezelfde sessie zitten ([Schumann e.a. 2022](https://sportrxiv.org/index.php/server/preprint/view/37)) (bewijs: matig tot sterk). Voor jouw doelen is dat geen probleem; de regel van minstens 6 uur ertussen (rapport *Volgorde van twee trainingen*) blijft de juiste.
- **Later, optioneel: MacroFactor-export importeren.** MacroFactor heeft een "Granular Export" van je workouts naar een spreadsheet ([MacroFactor help](https://help.macrofactorapp.com/en/articles/356-export-your-data-workouts)). Een lokale import (bestand kiezen, geen server) zou je beenvolume en een geschat 1RM voor squat en deadlift kunnen geven: "je kracht blijft staan tijdens het wedstrijdblok", en echte sets in plaats van een schatting in de index. MacroFactor noemt Health Connect als koppeling ([integraties](https://help.macrofactorapp.com/en/articles/354-integrations-workouts)), maar of workouts daar met sets en gewichten in komen, kon ik niet bevestigen.

**Werk.** Klein voor de vraag en de lijst. Middel voor de import (het exportformaat is niet gedocumenteerd en kan veranderen). Alles lokaal, via de `DataSourceAdapter` met `source: 'macrofactor'`.

**Risico.** Dubbel bijhouden wil je niet; de import moet dus zeldzaam en optioneel zijn, en de vraag na een beendag één tik.

### 9. Een excentrische microdosis in een trappenhuis

**Wat.** Een hoog trappenhuis is in veel gebouwen te vinden. Vijf keer een trap van ongeveer 20 m hoogte naar beneden lopen is ongeveer 100 m daling. Een optionele training "Trap af", eerst zonder rugzak, later met 8 tot 12 kg, eens per week in weken zonder heuvels-op-en-af, telt als gelopen daling met rugzak in de index en in de afdaalklok.

**Waarom.** Vijf minuten bergaf (ongeveer 110 m daling met 10% van het lichaamsgewicht) halveerde een week later het krachtverlies na een lange afdaling ([Maeo e.a. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5348007/)) (bewijs: matig). In de polder is daling schaars (het rapport over trainingsplekken in `docs/onderzoek/`); een trappenhuis is de goedkoopste afdaling die je hebt. Dat een trap hetzelfde doet als een bergpad is niet getoetst (afgeleid).

**Werk.** Klein: een sjabloon met een vaste daling.

**Risico.** Spierpijn de eerste keren; daarom zonder rugzak beginnen en niet in de 72 uur voor een test.

### 10. Voeding en herstel: alleen wat de app zinnig kan doen

**Wat.**

- Bij sessies van twee uur of langer (lange duurloop, bergtocht) één regel in de voorbereiding: neem 30 tot 60 gram koolhydraten per uur mee ([ACSM, Thomas e.a. 2016](https://pubmed.ncbi.nlm.nih.gov/26891166/)) (bewijs: sterk). Op een bivaktocht is dat ook oefenen met wat je onderweg eet.
- Eiwit: rond 1,6 gram per kilo per dag is genoeg voor krachtwinst, meer levert gemiddeld weinig op ([Morton e.a. 2018](https://bjsm.bmj.com/content/52/6/376)) (bewijs: sterk). Dat regelt MacroFactor al; ASCEND hoeft het niet over te doen.
- Een klein tekort is prima, maar in de wedstrijdweken en in Expeditieklaar geen stevig tekort: dat kost herstel. Eén zin in die fases is genoeg.
- In de uitrusting-kennis (`knowledge`, onderwerp "uitrusting-pakken" bestaat al): een rekenhulp voor het rugzakgewicht per dag (basis plus eten plus water) en de energie per etappe in een ruime band. Een gram uitrusting minder is goedkoper dan een maand training voor dezelfde kilo.

**Waarom.** Dit zijn de paar voedingsadviezen met sterk bewijs en een direct verband met je doelen. Calorieën per tocht precies uitrekenen is schijnprecisie: formules voor lastdragen wijken 3 tot 33% af (zie *Trainingsopbouw voor GR5 en hardlopen*).

**Werk.** Klein. Lokaal.

**Risico.** Voedingsadvies wordt snel betuttelend; houd het bij één zin op het juiste moment.

### 11. Het wedstrijdblok afstemmen op het aantal loopjes

**Wat.** In het blok van acht weken: twee kwaliteitssessies alleen als er een vierde, rustige loop in de week staat (de extra training uit `extraRun.ts` kan dat zijn). Zonder vierde loop afwisselen: de ene week tempoloop, de andere week 4 x 4 minuten, en de andere dag rustig met versnellingen.

**Waarom.** Zie knelpunt 9 ([Oliveira e.a. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428/); [Muñoz e.a. 2014](https://pubmed.ncbi.nlm.nih.gov/23752040/)) (bewijs: matig voor de verdeling, afgeleid voor de vertaling naar jouw week).

**Werk.** Klein tot middel in `raceBlock.ts`.

**Risico.** Minder prikkel op wedstrijdtempo. Met een vierde loop verdwijnt dat risico.

### 12. Opruimen voordat er iets bij komt

**Wat.**

- Eén bron voor "hoe zwaar wordt een sessie": de kalenderopbouw met de remmen. Het tweede systeem (weekprescriptie, orchestrator) terugbrengen tot wat het echt doet (sessies toevoegen of weghalen in verre weken), of de `TrainingPrescription` die het schrijft eindelijk tonen. Nu kost het rekenwerk en onderhoud zonder dat je er iets van ziet.
- De samengestelde readiness-score op het Ascend-scherm vervangen door de losse signalen die iets zeggen (consistentie, de ochtendcheck-in, de beenindex), en de herstelpoort in de orchestrator laten lezen uit de beenindex en de check-in in plaats van uit het aantal rustdagen.
- De hint over weeksprong in `standing.ts` dezelfde toon geven als het eigen onderzoek: beschrijvend, zonder Gabbett als onderbouwing.

**Waarom.** Elk nieuw slim onderdeel hierboven leunt op een paar heldere getallen. Hoe minder concurrerende getallen, hoe beter uit te leggen wat de coach doet, en dat is wat je eerder vroeg ("getallen met uitleg").

**Werk.** Middel. Er draaien veel tests op deze bestanden; opruimen moet in kleine stappen.

**Risico.** Iets weghalen waar een ander onderdeel stil op leunt. Eerst laten zien wat elk onderdeel feitelijk verandert aan je planning (een paar weken loggen), dan pas schrappen.

### Wat de app beter niet moet doen

- **Een fitness-vermoeidheidsmodel (CTL, ATL, TSB) met getallen als stuur.** Al afgeraden in *Andere manieren om belasting te plannen*; de band uit je testen is eerlijker.
- **Een kans in procenten** ("72% kans dat je 45 minuten haalt"). Daar bestaat geen gevalideerd model voor; een band met een aanname is het maximum.
- **VO2max van het horloge als waarheid** voor je tempo's. Een test op de weg is beter en goedkoper.
- **Een blessurerisico in procenten** of een "veilige" weekbelasting. Het enige getal met redelijk bewijs is de 10% per loop; de rest is vuistregel en hoort zo te heten.
- **Calorieën per tocht precies, of een ideaal wedstrijdgewicht.** Te grote fout, en het tweede is ook gewoon niet nodig.
- **Dagelijks HRV verplichten.** Klein voordeel, veel handwerk.
- **Stil versnellen bij goede weken.** Alleen remmen gebeurt vanzelf als voorstel; sneller opbouwen alleen na een test en op jouw Akkoord.

## 4. Voorstel voor de eerste drie stappen

1. **Vóór 29 oktober: tempo's en doeltijd uit de testloop** (idee 1). Een pure functie in `engine/` voor VDOT-tempo's en de band, getoond in de debrief van de test en bij de tempoloop en intervallen, plus een voorstel met Akkoord als je doeltijd buiten de band valt. Klein tot middel werk, groot effect, precies op tijd voor je eerste test.
2. **De beenindex en de GR5-ladder kloppend maken voor bivak** (idee 4, eerste punt, en idee 2). Eerst het kleine stuk: geplande sessies krijgen de hoogtemeters en rugzak van hun weekdoel. Daarna de rugzakladder richting 15 à 16 kg met een lichte start deze winter, een bivakweekend rond Hemelvaart en een generale repetitie van drie dagen begin juli, en het doelgewicht op jouw aangeven aangepast. Middel werk, met een migratiestap voor opgeslagen sjablonen.
3. **"Deze week nog een keer"** als voorstel na een slechte week (idee 5), samen met de ene vraag na een beendag (idee 8, eerste punt). Twee kleine bouwstenen die het plan laten reageren op wat er echt gebeurt, zonder nieuw handwerk behalve één tik.

## 5. Wat jij moet beslissen

1. **Je doeltijd.** Als de test van 29 oktober rond een uur uitkomt: wil je dat de app een realistische tijd voorstelt (bijvoorbeeld 52 tot 55 minuten), of houd je 45 minuten als droom en wil je alleen de voorspelling zien?
2. **Wat telt zwaarder in maart:** de snelste 10 km, of fris en blessurevrij de bergfases in? Dat bepaalt of het wedstrijdblok twee of één kwaliteitssessie krijgt.
3. **Kun je in het wedstrijdblok vier keer per week lopen?** Zo ja, dan blijven tempoloop en intervallen allebei staan.
4. **Je rugzak.** Wat weegt je uitrusting nu zonder eten en water, hoeveel dagen eten wil je maximaal dragen, en loop je met stokken? Mag het doel in de app van 12 naar 15 à 16 kg?
5. **Bivakweekenden.** Kun je met Hemelvaart (6 tot 9 mei 2027) of Pinksteren (15 tot 17 mei) twee of drie dagen weg, en eind juni of begin juli nog eens drie dagen met volle rugzak?
6. **De eerste dagen van de GR5.** Wil je dat de app helpt de eerste week korter te plannen, met elke zes tot acht dagen een rustige dag?
7. **Eén tik na een beendag** voor je reserve in de zwaarste sets: goed, of liever niet?
8. **Rusthartslag in de ochtendcheck-in:** wil je dat als optioneel getal, of houd je de check-in zoals hij is?
9. **MacroFactor:** zou je eens per maand een export willen importeren, of blijft kracht helemaal daar?
10. **Opruimen:** vind je het goed als het readiness-percentage op het Ascend-scherm verdwijnt ten gunste van de losse signalen die je al kent uit Je stand?

## Bronnen

Onderzoek en richtlijnen:

- Frandsen e.a. 2025, BJSM, 5.205 hardlopers: https://pmc.ncbi.nlm.nih.gov/articles/PMC12421110/
- Nuuttila e.a. 2022, bijsturen op welzijn, HRV en hartslag-tempo: https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/
- Muñoz e.a. 2014, intensiteitsverdeling bij recreatieve 10 km-lopers: https://pubmed.ncbi.nlm.nih.gov/23752040/
- Oliveira e.a. 2024, meta-analyse intensiteitsverdeling: https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428/
- Sylta e.a. 2014, meten naar sessiedoel of tijd-in-zone: https://uia.brage.unit.no/uia-xmlui/handle/11250/226883
- Smyth en Muniz-Pumares 2020, kritieke snelheid: https://pmc.ncbi.nlm.nih.gov/articles/PMC7664951
- Daniels' intensiteiten en VDOT, uitleg: https://www.coachray.nz/2023/05/03/jack-daniels-running-intensity/
- Vesterinen e.a. 2014, hartslag-loopsnelheidsindex: https://lida.sport-iat.de/ta/Record/4031002
- Vesterinen e.a. 2016, HRV-sturing bij recreatieve lopers: https://pubmed.ncbi.nlm.nih.gov/26909534/
- Kiviniemi e.a. 2007, HRV-sturing: https://lida.sport-iat.de/ta/Record/4021912
- Javaloyes e.a. 2019, HRV-sturing bij fietsers: https://dspace.umh.es/handle/11000/30650
- Plews e.a. 2012, rollend HRV-gemiddelde: https://pubmed.ncbi.nlm.nih.gov/22367011/
- Düking e.a. 2021, meta-analyse HRV-sturing: https://pubmed.ncbi.nlm.nih.gov/34489178/
- Manresa-Rocamora e.a. 2021, meta-analyse HRV-sturing: https://pmc.ncbi.nlm.nih.gov/articles/PMC8507742/
- Saw e.a. 2016, subjectieve en objectieve maten: https://www.semanticscholar.org/paper/Monitoring-the-athlete-training-response:-measures-Saw-Main/aef31ab9684e48e3bf0ef40e8ff6a53e8be94ea7
- Doherty e.a. 2025, samengestelde scores van wearables: https://www.degruyterbrill.com/document/doi/10.1515/teb-2025-0001/html
- Hellard e.a. 2006, betrouwbaarheid Banister-parameters: https://pmc.ncbi.nlm.nih.gov/articles/pmid/16608765
- Mujika en Padilla 2000, detraining: https://lida.sport-iat.de/ta/Record/3047130
- Wang e.a. 2023, taper: https://www.sponet.de/sponet/Record/4081751?lng=en
- Maeo e.a. 2017, korte afdaling beschermt: https://pmc.ncbi.nlm.nih.gov/articles/PMC5348007/
- Schumann e.a. 2022, interferentie kracht en duur: https://sportrxiv.org/index.php/server/preprint/view/37
- Blagrove e.a. 2018, kracht en loopeconomie: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5889786/
- Lauersen e.a. 2018, krachttraining en blessures: https://bjsm.bmj.com/content/52/24/1557.info
- Lauersen e.a. 2014, blessurepreventie, rekken: https://bjsm.bmj.com/content/48/11/871
- Orr e.a. 2021, rugzakdragen, blessures en conditionering bij militairen: https://pmc.ncbi.nlm.nih.gov/articles/PMC8069713/
- Knapik e.a. 2012, training en rugzakprestatie: https://pubmed.ncbi.nlm.nih.gov/22130400/
- Rugzaklast en spieractiviteit op hellingen, Applied Sciences 2020: https://www.mdpi.com/2076-3417/10/14/4890
- Schwameder e.a. 1999, wandelstokken en kniekrachten bergaf: https://pubmed.ncbi.nlm.nih.gov/10622357/
- Anderson e.a. 2009, rugzakgewicht en klachten bij langeafstandswandelaars: https://complete.bioone.org/journals/wilderness-and-environmental-medicine/volume-20/issue-3/08-WEME-OR-196R2.1/The-Impact-of-Footwear-and-Packweight-on-Injury-and-Illness/10.1580/08-WEME-OR-196R2.1.full
- Looney e.a. 2021, energiekost van lastdragen: https://pmc.ncbi.nlm.nih.gov/articles/PMC8919998
- Slaaptekort bij avonturenracers, 2024: https://busqueda.bvsalud.org/portal/resource/es/mdl-38874812
- ACSM, Thomas e.a. 2016, voeding en sportprestatie: https://pubmed.ncbi.nlm.nih.gov/26891166/
- Morton e.a. 2018, eiwit en krachttraining: https://bjsm.bmj.com/content/52/6/376

Apps en fabrikanten:

- MacroFactor, data-export workouts: https://help.macrofactorapp.com/en/articles/356-export-your-data-workouts
- MacroFactor, integraties: https://help.macrofactorapp.com/en/articles/354-integrations-workouts

Eigen rapporten in deze repo waarop dit voortbouwt: *Andere manieren om belasting te plannen*, *Betrouwbaarheid beenvermoeidheid-index*, *Spierbelasting en beenvermoeidheid*, *Trainingsopbouw voor GR5 en hardlopen*, *Aanvullend onderzoek GR5 voorbereiding*, *Trainingsvormen en varianten*, *Tussendoel hardloopwedstrijd*, *Volgorde van twee trainingen*, het rapport over trainingsplekken.

Wat onzeker blijft: de schatting van je huidige 10 km komt uit rustige loopjes en niet uit een test; de rugzakladder en de steilere rugzakfactor zijn afgeleid en niet getoetst; er is geen studie naar back-to-back dagen of slapen in een tent tijdens een trektocht; het meeste rugzakonderzoek gaat over militairen met zwaardere lasten; of MacroFactor workouts met sets via Health Connect deelt, kon ik niet bevestigen; enkele bronnen (de review over knie-strekmomenten, Bosquet 2007, de slaapstudie) heb ik alleen via een samenvatting gelezen.
