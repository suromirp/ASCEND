# Andere manieren om belasting te plannen en in kaart te brengen

ASCEND plant nu met een vast weekpatroon in golven van vier weken, een 10%-regel per loop, een beenvermoeidheid-index met drie herstellagen, sessie-RPE, "voelde slechter of beter", pijnmeldingen volgens het pijnmonitoringsmodel, een korte ochtendcheck-in (benen, energie, slaap) en voorstellen die je met "Akkoord" accepteert. Dit rapport bekijkt welke andere methoden er zijn om belasting te plannen rond vermoeidheid en herstel, en om belasting zichtbaar te maken. Per methode: wat het is, hoe sterk het bewijs is voor recreanten, welke data het nodig heeft, of ASCEND het zelf kan uitrekenen, en wat het toevoegt aan jouw beslissingen. Het eindigt met een aanbeveling in volgorde en een lijst van wat beter niet kan.

De situatie waar het om gaat: één recreatieve loper en wandelaar, een 10 km-wedstrijd in maart 2027 en de GR5 door de Alpen in augustus 2027, elke week zware beenkracht (in MacroFactor), heuvels en een lange duurloop, en een Garmin-horloge.

Bij elke bewering staat de sterkte van het bewijs: **sterk** (meta-analyse of meerdere consistente gecontroleerde studies), **matig** (een enkele gecontroleerde studie, een grote cohort of een goede review van kleinere studies), **zwak** (kleine, observationele of kwalitatieve studies, of iets wat ik alleen via een samenvatting kon lezen), **expertopinie** (coaches, fabrikanten, consensus zonder toetsing) en **afgeleid** (mijn eigen redenering of vertaling naar de app). De werknotities met alle bronnen staan in `research_notes/Andere manieren om belasting te plannen/notities.md`. Eerder onderzoek in deze repo over sessie-RPE, HRV en Garmin-metrics (`docs/onderzoek/notities/Trainingsopbouw voor GR5 en hardlopen/signalen_autoregulatie.md`) en over de beenvermoeidheid-index (`docs/onderzoek/Spierbelasting en beenvermoeidheid.md`) heb ik gebruikt en waar nodig opnieuw nagekeken.

## Kort antwoord

De meeste bekende belastingmodellen voegen voor jou weinig toe aan wat ASCEND al doet, en een paar zouden het slechter maken. De methoden met het beste bewijs voor een recreant zijn eenvoudig: sessie-RPE maal minuten als maat voor belasting ([Foster e.a. 2001](https://sponet.de/sponet/Record/4006210); [Haddad e.a. 2017](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2017.00612/full)) (bewijs: matig tot sterk voor sessie-RPE als maat), een losse loop niet veel langer dan je langste van de afgelopen 30 dagen ([Frandsen e.a. 2025](https://researchportal.lih.lu/en/publications/how-much-running-is-too-much-identifying-high-risk-running-sessio/)) (bewijs: matig), en het bijsturen van zware sessies op een paar ochtendsignalen samen ([Nuuttila e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/)) (bewijs: matig). De 10%-regel per loop die ASCEND al heeft, is precies de maat die in de grootste studie met hardlopers wel samenhing met blessures.

Wat ik zou toevoegen, in volgorde:

1. **Weekbelasting in sessie-RPE**, per soort training (lopen, kracht, wandelen), gepland naast gedaan, als staafjes per week waarin je de golf van vier weken ziet. Kost geen extra invoer.
2. **Een regel met drie ochtendsignalen** voor zware sessies, naar het voorbeeld van Nuuttila 2022: check-in, rusthartslag (en later HRV) tegen je eigen normaal, en de HR-tempo-index die ASCEND al rekent. Twee van de drie slecht: een voorstel om de zware sessie lichter te maken of te schuiven.
3. **Een frisheidscurve naar test en wedstrijd en een kalender van beenbelasting**, gebouwd op de bestaande beenvermoeidheid-index, met de bekende taperregel (volume flink omlaag, intensiteit houden) voor de wedstrijdweek.
4. **Een controle op intensiteitsverdeling per week**: hoeveel van je minuten rustig, middel en hard waren, zodat rustige loopjes niet ongemerkt middelzwaar worden.
5. **Daling (D−) per week en per tocht als eigen lijn** voor de GR5-opbouw, omdat bergaf de meeste spierschade geeft en hartslag- of tempomaten dat missen.

Wat ik niet zou toevoegen: de acute-tot-chronische belastingratio (ACWR) als stuurmaat, een gepast Banister-model of een CTL/ATL/TSB-grafiek als beslisinstrument, rTSS of TSS, TRIMP zolang er geen hartslagreeksen zijn, kritische snelheid als belastingmaat, en Garmin-scores zoals Body Battery en Training Readiness als invoer. Ook geen nieuwe samengestelde "readiness"-score die alles in één getal stopt. De redenen staan in het laatste hoofdstuk.

Een belangrijk praktisch punt: de officiële Garmin Health API werkt alleen server-naar-server en alleen voor bedrijven ([Garmin Developer Program](https://developer.garmin.com/gc-developer-program/overview)), dus zonder backend kan ASCEND daar niet bij. Via Health Connect deelt Garmin wel workouts, hartslag en rusthartslag, maar volgens techpers geen HRV-status, trainingsbelasting of Body Battery ([Tom's Guide](https://www.tomsguide.com/wellness/fitness-trackers/garmin-clarifies-what-data-its-sharing-with-google-health-connect-heres-the-full-list)) (bewijs: expertopinie, niet officieel bevestigd). Alles hieronder is daarom zo gekozen dat het werkt met wat je nu al invult, en beter wordt met een paar getallen die je handmatig of later via een adapter toevoegt.

Over visualisatie is weinig sportspecifiek onderzoek. Er is geen studie gevonden die test welke grafiekvorm (fitness-vermoeidheidscurve, heatmap, staafdiagram) sporters begrijpen of waar ze naar handelen. Uit onderzoek naar gezondheidscommunicatie blijkt wel dat goed ontworpen visuele hulpmiddelen beslissingen verbeteren ([Garcia-Retamero en Cokely 2017](https://produccioncientifica.ugr.es/documentos/618f9e6a4fa218568b4dbcef?lang=en)) (bewijs: matig, buiten de sport) en dat ongeveer een derde van de volwassenen moeite heeft met grafieken en getallen ([Galesic en Garcia-Retamero 2011](https://ideas.repec.org/a/sae/medema/v31y2011i3p444-457.html)) (bewijs: matig). Daarom: weinig grafieken, elk met één vraag, je eigen normaal als referentie, en altijd een zin erbij die zegt wat het betekent.

## Overzicht van de methoden

### 1. Banister fitness-vermoeidheidsmodel (CTL, ATL en TSB zoals in TrainingPeaks)

**Wat het is.** Het model van Banister ziet prestatie als fitness min vermoeidheid. Elke training verhoogt beide; vermoeidheid zakt snel weg, fitness langzaam. TrainingPeaks maakt daar een vereenvoudigde versie van: CTL ("fitness") is een exponentieel gewogen gemiddelde van de dagelijkse belasting met een tijdconstante van 42 dagen, ATL ("vermoeidheid") hetzelfde met 7 dagen, en TSB ("vorm") is CTL min ATL. De versterkingsfactoren uit het oorspronkelijke model zijn weggelaten, waardoor TrainingPeaks zelf schrijft dat CTL en ATL "a relative indicator" zijn en geen voorspelling van prestatie. Als vuistregel noemt TrainingPeaks dat een TSB onder min 10 zelden samengaat met frisse benen en boven plus 10 meestal wel, met de waarschuwing dat dit "should not be applied too literally" ([TrainingPeaks](https://www.trainingpeaks.com/learn/articles/the-science-of-the-performance-manager/)) (bewijs: expertopinie, fabrikant).

**Bewijs.** Het oorspronkelijke model past achteraf redelijk op prestaties, maar de parameters zijn onbetrouwbaar. In een studie bij negen elitezwemmers was de fit goed (R² 0,79), maar lag de tijdconstante voor fitness ergens tussen 17 en 59 dagen en die voor vermoeidheid tussen 25 en 61 dagen, en waren sommige parameters zo sterk met elkaar verweven dat de auteurs hun interpretatie "meaningless" noemden ([Hellard e.a. 2006](https://pmc.ncbi.nlm.nih.gov/articles/pmid/16608765)) (bewijs: matig). Een commentaar uit 2022 waarschuwt dat de uitkomst afhangt van startwaarden, techniek en de gekozen belastingmaat, en raadt af om algemene constanten (zoals 42 en 7 dagen) te gebruiken alsof ze voor iedereen gelden ([Vermeire e.a. 2022](https://lida.sport-iat.de/ta/Record/4075491?lng=en)) (bewijs: expertopinie). Een recente Bayesiaanse analyse vond volgens de samenvatting dat de vermoeidheidscomponent de voorspelling nauwelijks verbetert ([Scientific Reports 2025, HAL](https://hal.inrae.fr/hal-04999009v1)) (bewijs: zwak, de volledige tekst was niet bereikbaar). Voor de getallen die coaches gebruiken, zoals "TSB tussen plus 5 en plus 25 op wedstrijddag", heb ik geen validatie gevonden. Bewijs voor recreatieve lopers die met CTL/ATL/TSB beter presteren dan zonder ontbreekt.

**Data.** Alleen een belastingscore per dag. Dat kan sessie-RPE zijn.

**Kan ASCEND het?** Ja, volledig lokaal: twee exponentiële gemiddelden over sessie-RPE (afgeleid).

**Wat het toevoegt.** Weinig boven een weekgrafiek. De "fitness"-lijn stijgt met elke extra minuut, ook als die minuten niet bij je doel horen, en verleidt tot het najagen van een getal. De "vorm"-lijn richting wedstrijd zegt ongeveer hetzelfde als de beenvermoeidheid-index, maar zonder het onderscheid tussen intensiteit, kracht en spierschade dat voor jou juist belangrijk is (afgeleid).

### 2. Sessie-RPE-belasting met wekelijkse monotonie en strain (Foster)

**Wat het is.** Belasting van een sessie is RPE (0 tot 10) maal de duur in minuten, in "arbitraire eenheden". Een week tel je op. Foster voegde twee afgeleide getallen toe: **monotonie** (het gemiddelde van de dagbelasting in een week gedeeld door de standaarddeviatie, dus hoe weinig variatie er is) en **strain** (weekbelasting maal monotonie).

**Bewijs.** Sessie-RPE hangt consistent samen met hartslagmaten, bij duurtraining, intervallen en teamsport, en werkt ongeacht soort en intensiteit ([Foster e.a. 2001](https://sponet.de/sponet/Record/4006210)) (bewijs: matig). Een review van veel studies bevestigt validiteit en goede betrouwbaarheid bij mannen en vrouwen, verschillende leeftijden en niveaus ([Haddad e.a. 2017](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2017.00612/full)) (bewijs: matig tot sterk). Ook voor krachttraining is het bruikbaar ([Sweet e.a. 2004](https://scinapse.io/papers/1979416376); [McGuigan e.a. 2004, ICC 0,95](https://jssm.org/jssm-03-8.xml-Fulltext)) (bewijs: matig). Bij zeven getrainde lopers voorspelde een model op sessie-RPE de prestatie op de 1500 m bijna even goed als hartslag (TRIMP) of tempo (rTSS): r 0,60 tegen 0,65 en 0,70, en de auteurs vonden alle drie geschikt ([Wallace e.a. 2014](https://opus.lib.uts.edu.au/handle/10453/122356)) (bewijs: matig, klein). Bij hoge intensiteit wijken sessie-RPE en hartslag meer van elkaar af ([langlaufers, 2024](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11155691/)) (bewijs: zwak tot matig).

Monotonie en strain rusten op veel dunner bewijs. In Fosters studie bij 25 sporters vielen de meeste ziektes na het overschrijden van een persoonlijke drempel, vooral van strain ([Foster 1998](https://pubmed.ncbi.nlm.nih.gov/9662690/)) (bewijs: zwak, alleen abstract gelezen). De vaak genoemde grens "monotonie boven 2" komt uit praktijkbronnen ([TeamBuildr](https://blog.teambuildr.com/how-to-monitor-practice-workload-without-gps-technology)) (bewijs: expertopinie), niet uit een getoetste studie.

**Data.** Duur en RPE per sessie. ASCEND heeft beide al in `SessionLog`.

**Kan ASCEND het?** Ja, nu al, en ook voor geplande sessies via de geplande RPE.

**Wat het toevoegt.** Eén maat waarin lopen, kracht en wandelen samen passen, zodat je ziet of de week die je deed past bij de week die gepland was, en of de golf van vier weken echt een golf is. Monotonie voegt voor jou weinig toe: met rustdagen en afwisseling tussen rustig en zwaar blijft het getal vanzelf laag. Een voorbeeldweek met kracht 480, rustig loopje 120, heuvels 350, lange duurloop 300 en drie rustdagen geeft een monotonie van ongeveer 1,0, ver onder 2 (afgeleid). Het wordt pas informatief als je bijna elke dag hetzelfde doet. Een kanttekening: bij lange rustige sessies telt de duur zwaar mee. Een wandeling van drie uur op RPE 4 (720) weegt meer dan een zware krachtsessie (480), terwijl de krachtsessie je benen meer vermoeit. Daarom moet sessie-RPE naast de beenvermoeidheid-index staan, niet in plaats ervan (afgeleid).

### 3. ACWR en waarom het bekritiseerd wordt

**Wat het is.** De acute-tot-chronische belastingratio deelt de belasting van de laatste week door het gemiddelde van de laatste vier weken. Een "sweet spot" van ongeveer 0,8 tot 1,3 zou het blessurerisico laag houden. Garmin toont een vergelijkbare "Load Ratio" met banden van onder 0,8 (laag) tot 2,0 of meer (zeer hoog) ([Garmin handleiding](https://www8.garmin.com/manuals-apac/webhelp/forerunner965/EN-SG/GUID-4535C8CD-357C-4673-8EBB-F1BCBE878158-2712.html)) (bewijs: expertopinie, fabrikant).

**Bewijs en kritiek.** Impellizzeri en collega's lieten zien dat het sturen op ACWR om blessures te voorkomen een causaal effect veronderstelt dat nooit is aangetoond, en dat de ratio last heeft van bekende problemen met deelgetallen ([Impellizzeri e.a. 2020](https://opus.lib.uts.edu.au/handle/10453/141898)) (bewijs: matig, methodologische analyse). In de gangbare berekening zit de laatste week zowel in de teller als in de noemer, wat op zichzelf al een schijnverband van ongeveer 0,5 geeft ([Lolli e.a. 2019](https://bjsm.bmj.com/content/53/15/921)) (bewijs: matig). Een vervolganalyse concludeert dat de voorspellende waarde grotendeels een statistisch artefact is ([Impellizzeri e.a. 2021](https://iris.univr.it/retrieve/e34cfb98-e922-4c2f-aab5-18583ab7e31b/Impellizzeri_What%20Role%20Do%20Chronic%20Workloads%20Play_SportMed_2021.pdf)) (bewijs: matig). Er is tegengeluid: een editorial wijst erop dat de IOC-consensus van 2016 ACWR noemde ([Frontiers 2021](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8138569/)) (bewijs: expertopinie).

Voor hardlopers is het beeld het duidelijkst. In een cohort van 5205 lopers met Garmin-data over 18 maanden hing een hogere ACWR samen met **minder** blessures, week-op-week-stijging hing nergens mee samen, maar een losse loop die meer dan 10% langer was dan de langste loop van de afgelopen 30 dagen hing samen met meer overbelastingsblessures (hazard-ratio 1,64 bij 10 tot 30% langer, 2,28 bij meer dan het dubbele) ([Frandsen e.a. 2025](https://researchportal.lih.lu/en/publications/how-much-running-is-too-much-identifying-high-risk-running-sessio/)) (bewijs: matig, observationeel, gemiddelde leeftijd 46). Bij 366 Nederlandse lopers hing juist een lage ACWR samen met meer blessures ([Nakaoka e.a. 2021](https://research.rug.nl/en/publications/the-association-between-the-acute-chronic-workload-ratio-and-runn/)) (bewijs: zwak tot matig).

**Data.** Dagbelasting over vier weken.

**Kan ASCEND het?** Technisch wel.

**Wat het toevoegt.** Niets wat de bestaande 10%-regel per loop niet beter doet. ACWR naast die regel zetten zou een zwakkere maat naast een sterkere plaatsen, met een kans op tegenstrijdige adviezen (afgeleid).

### 4. TRIMP-varianten

**Wat het is.** TRIMP (training impulse) rekent belasting uit hartslag. Edwards telt minuten in vijf zones van 50 tot 100% van je maximale hartslag maal een gewicht van 1 tot 5. Banister gebruikt duur maal je fractie van de hartslagreserve maal een exponentiële weging. Lucia werkt met drie zones rond de twee drempels. Het geïndividualiseerde iTRIMP haalt de weging uit je eigen hartslag-lactaatcurve, waarvoor een labtest nodig is ([definities, Sports Medicine Open](https://sportsmedicine-open.springeropen.com/articles/10.1186/s40798-022-00498-9/tables/2)).

**Bewijs.** iTRIMP volgde bij acht recreatieve lopers de verbetering op 5 en 10 km ([Manzi e.a. 2009](https://lida.sport-iat.de/dlv/Record/4017762)) (bewijs: zwak, heel klein). Vergelijkingen tonen dat de varianten met elkaar correleren maar niet uitwisselbaar zijn ([Hull repository](https://hull-repository.worktribe.com/OutputFile/443111); [Motriz](https://ojs-teste.biblioteca.unesp.br/index.php/motriz/en/article/view/1980-6574.2010v16n2p311)) (bewijs: zwak tot matig). Tegenover sessie-RPE doet TRIMP het bij lopers ongeveer even goed ([Wallace e.a. 2014](https://opus.lib.uts.edu.au/handle/10453/122356)) (bewijs: matig, klein).

**Data.** Minuten per hartslagzone of een hartslagreeks, plus maximale hartslag en rusthartslag.

**Kan ASCEND het?** Edwards-TRIMP wel, zodra `hrZones` (minuten per zone) per sessie gevuld is; uit alleen een gemiddelde hartslag is het grof. Banister-TRIMP en iTRIMP vragen een reeks (FIT-bestand) of een labtest (afgeleid).

**Wat het toevoegt.** Een objectieve tweede lijn naast sessie-RPE voor lopen en wandelen. Voor zware krachttraining zegt hartslag weinig, dus TRIMP mist juist jouw zwaarste beenbelasting (afgeleid).

### 5. Running stress score (rTSS)

**Wat het is.** TrainingPeaks rekent rTSS uit je "genormaliseerd gradiënttempo" (tempo gecorrigeerd voor helling) gedeeld door je drempeltempo (het tempo dat je een uur volhoudt), gecombineerd met de duur. Het vraagt een tijdreeks met tempo en hoogte en houdt volgens TrainingPeaks alleen rekening met de belasting van hardlopen ([TrainingPeaks rTSS](https://www.trainingpeaks.com/learn/articles/running-training-stress-score-rtss-explained/)) (bewijs: expertopinie, fabrikant).

**Bewijs.** Bij zeven lopers voorspelde rTSS prestatie iets beter dan sessie-RPE (r 0,70 tegen 0,60) ([Wallace e.a. 2014](https://opus.lib.uts.edu.au/handle/10453/122356)) (bewijs: matig, klein). Een hellingcorrectie leunt op de energiekost van hellingen, en die is bergaf laag: lopen kost het minst rond min 20% en wandelen rond min 10% ([Minetti e.a. 2002](https://iris.unibs.it/retrieve/ddc633e4-3c03-4e2e-e053-3705fe0a4c80/Minetti%20JAP%202002.pdf)) (bewijs: matig).

**Data.** Tempo- en hoogtereeks per seconde, drempeltempo.

**Kan ASCEND het?** Niet met de huidige gemiddelden; wel na import van FIT-bestanden en een drempeltempo (afgeleid).

**Wat het toevoegt.** Voor jou eerder iets misleidends: bergaf kost weinig energie maar geeft de meeste spierschade ([Bontemps e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7674385/)) (bewijs: matig). Een rTSS die een afdaling "licht" noemt, staat haaks op wat je benen voelen, en wandelen met een rugzak valt er buiten (afgeleid).

### 6. Kritische snelheid en D'

**Wat het is.** Kritische snelheid (CS) is het hoogste tempo dat je lang kunt volhouden zonder dat je steeds verder verzuurt; D' is de beperkte hoeveelheid "werk boven CS" die je daarbovenop kunt doen. Je schat ze uit twee of drie beste inspanningen van verschillende lengte.

**Bewijs.** Uit ruwe trainingsdata van meer dan 25.000 recreanten voorspelde CS de marathontijd, en wie de eerste helft boven 94% van CS liep, viel vaker sterk terug ([Smyth en Muniz-Pumares 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7664951)) (bewijs: matig, groot en observationeel). CS uit een 400 en 2000 m op de baan schatte de 10 km-snelheid goed bij 34 recreanten ([RBCDH 2020](https://periodicos.ufsc.br/index.php/rbcdh/article/view/1980-0037.2020v22e59852)) (bewijs: zwak). Tijdritten en een test van drie minuten all-out zijn betrouwbaar als je de omstandigheden vast houdt ([review 2025](https://lida.sport-iat.de/ta/Record/4092494)) (bewijs: matig).

**Data.** Twee of drie maximale inspanningen (bijvoorbeeld je 5 km-test en een 1 of 2 km), of een tijdreeks waaruit beste stukken te halen zijn.

**Kan ASCEND het?** Ja, met twee testuitslagen; de beste stukken uit trainingen pas met FIT-import (afgeleid).

**Wat het toevoegt.** Een tempo-advies voor de wedstrijd en voor drempelsessies. Het is geen maat voor belasting of vermoeidheid. Een D'-balans tijdens een training vraagt seconde-data en past niet bij een app zonder live koppeling (afgeleid).

### 7. HRV-gestuurd trainen

**Wat het is.** Je meet elke ochtend (of 's nachts) de hartslagvariabiliteit, meestal als lnRMSSD. Ligt het gemiddelde van de laatste dagen binnen je eigen normaalband, dan doe je de geplande zware sessie; ligt het erbuiten, dan wordt het rustig of rust.

**Bewijs.** De eerste studie (Kiviniemi 2007, 26 mannen) koos zwaar bij stabiele of hogere HRV en rustig bij een duidelijke daling; maximale loopsnelheid verbeterde meer, VO2peak niet ([Kiviniemi e.a. 2007](https://lida.sport-iat.de/ta/Record/4021912)) (bewijs: zwak tot matig). Bij 40 recreatieve lopers werden matige en zware sessies alleen gepland als HRV binnen het gemiddelde plus of min 0,5 standaarddeviatie lag; die groep verbeterde meer met minder zware sessies ([Vesterinen e.a. 2016](https://pubmed.ncbi.nlm.nih.gov/26909534/)) (bewijs: matig). Bij 17 getrainde fietsers verbeterde de HRV-groep, maar het verschil met de vaste groep was niet significant ([Javaloyes e.a. 2019](https://dspace.umh.es/handle/11000/30650?locale=en)) (bewijs: zwak tot matig). Plews en collega's lieten zien dat een rollend gemiddelde over 7 dagen beter werkt dan losse dagwaarden ([Plews e.a.](https://pubmed.ncbi.nlm.nih.gov/22367011/)) (bewijs: zwak, casus).

De meta-analyses zijn eensgezind: HRV-sturing geeft een middelgroot voordeel op submaximale maten (zoals drempels), maar slechts een klein en niet significant voordeel op prestatie en VO2max, en minder mensen die niet vooruitgaan ([Düking e.a. 2021](https://pubmed.ncbi.nlm.nih.gov/34489178/); [Manresa-Rocamora e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8507742/)) (bewijs: matig). Een iets positievere meta-analyse voor VO2max ([Granero-Gallegos e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7663087)) is methodologisch zwakker (bewijs: zwak tot matig). Ik vond geen nieuwere meta-analyse die dit beeld verandert. In een review naar signalen van functionele overreaching bleken HRV-parameters niet consequent, terwijl submaximale hartslag, RPE en vragenlijsten wel meebewogen ([Roete e.a. 2022](https://research.hanze.nl/en/publications/a-systematic-review-on-markers-of-functional-overreaching-in-endu/)) (bewijs: matig).

**Data.** Dagelijkse HRV, liefst nachtelijk of op een vast ochtendmoment, minstens drie tot vier metingen per week ([Buchheit 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/)) (bewijs: matig).

**Kan ASCEND het?** Het veld `hrv` bestaat al in `RecoveryMetric`. De ruwe HRV van Garmin komt volgens techpers niet via Health Connect ([Tom's Guide](https://www.tomsguide.com/wellness/fitness-trackers/garmin-clarifies-what-data-its-sharing-with-google-health-connect-heres-the-full-list)) (bewijs: expertopinie), dus realistisch is: de Garmin-categorie van HRV-status ("in balans", "uit balans", "laag") handmatig invullen, wat Garmin als zevendaags gemiddelde tegen je eigen basisband berekent ([Garmin-handleiding](https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-9282196F-D969-404D-B678-F48A13D8D0CB.html)) (bewijs: expertopinie; de breedte van die band publiceert Garmin niet).

**Wat het toevoegt.** Een objectief signaal naast hoe je je voelt, vooral nuttig bij twijfel over een zware sessie. Het voordeel boven een goed plan is klein, dus het mag nooit de enige poort zijn en de app moet zonder kunnen (afgeleid).

### 8. Trend in rusthartslag

**Wat het is.** Een stijgende ochtend- of nachtrusthartslag ten opzichte van je eigen normaal als teken van vermoeidheid, ziekte of stress.

**Bewijs.** Een meta-analyse vond dat korte overbelasting (minder dan twee weken) de rusthartslag matig verhoogt en lange overbelasting niet, en dat de veranderingen vaak binnen de normale dag-tot-dagschommeling vallen ([Bosquet e.a. 2008](https://pubmed.ncbi.nlm.nih.gov/18308872/)) (bewijs: matig). De dag-tot-dagvariatie van rusthartslag is ongeveer 10%, die van hartslag bij een vast tempo ongeveer 3% ([Buchheit 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/)) (bewijs: matig). Een getoetste drempel ("zoveel slagen boven normaal betekent rustiger") heb ik niet gevonden.

**Data.** Rusthartslag per dag.

**Kan ASCEND het?** Ja: het veld `restingHeartRate` bestaat, handmatig in te vullen, en Garmin deelt rusthartslag met Health Connect.

**Wat het toevoegt.** Een zwak maar goedkoop signaal, alleen bruikbaar als gemiddelde over een paar dagen en samen met andere signalen. Handig om een beginnende verkoudheid te zien, wat ASCEND al met de ziekte-functie kan koppelen (afgeleid).

### 9. Readiness-scores van Garmin (Training Readiness, Body Battery, HRV-status)

**Wat het is.** Training Readiness combineert zes invoeren: slaapscore van vannacht, hersteltijd, HRV-status, acute belasting, slaap over drie nachten en stress over drie dagen, tot een score van 1 tot 100 ([Garmin handleiding](https://www8.garmin.com/manuals/webhelp/GUID-31D23DBB-57C2-4DF7-A0C9-8D1A00AB4BE7/EN-US/GUID-C21BE0C8-A08E-4DA1-B6C6-2E0E2DDDB372.html)). Hoe die invoeren gewogen worden, publiceert Garmin niet. Body Battery is een energiescore die door de dag op- en afloopt. HRV-status vergelijkt je zevendaagse HRV met je eigen basisband.

**Bewijs.** Een evaluatie van 14 samengestelde scores van 10 fabrikanten, waaronder Body Battery en Training Readiness, concludeert dat hun validiteit, transparantie en fysiologische betekenis "remain unclear"; volgens samenvattingen geeft geen fabrikant een exacte formule ([Doherty e.a. 2025](https://www.degruyterbrill.com/document/doi/10.1515/teb-2025-0001/html); [bespreking door co-auteur Altini](https://marcoaltini.substack.com/p/paper-readiness-recovery-and-strain)) (bewijs: matig voor de vaststelling dat bewijs ontbreekt; de volledige tekst kon ik niet openen). Een peer-reviewed validatie van Body Battery of Training Readiness heb ik niet gevonden. De nachtelijke HRV van Garmin kwam in een vergelijking met ECG als minst nauwkeurige van vijf wearables uit ([Dial e.a. 2025](https://physoc.onlinelibrary.wiley.com/doi/10.14814/phy2.70527)) (bewijs: zwak, via samenvatting). HRV-status is het best te verdedigen, omdat de logica (zevendaags gemiddelde tegen eigen band) lijkt op wat in de studies werkt. Volgens gebruikers heeft niet elk Garmin-model Training Readiness, de FR255 bijvoorbeeld niet ([Garmin forum](https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/424837/why-doesn-t-fr-255-have-training-readiness)) (bewijs: zwak maar consistent).

**Data en haalbaarheid.** Body Battery en Training Readiness worden niet gedeeld met Health Connect ([Tom's Guide](https://www.tomsguide.com/wellness/fitness-trackers/garmin-clarifies-what-data-its-sharing-with-google-health-connect-heres-the-full-list)) (bewijs: expertopinie). Alleen handmatig overtikken zou kunnen.

**Wat het toevoegt.** Een black box die je in ASCEND niet kunt uitleggen. Als het getal en jouw gevoel botsen, weet je niet waarom. HRV-status als categorie is de uitzondering die wel waarde heeft (zie methode 7).

### 10. Welzijn-gestuurde autoregulatie (Nuuttila 2022)

**Wat het is.** Twee keer per week besluiten of de belasting omlaag, gelijk of omhoog gaat, op basis van drie signalen samen: nachtelijke HRV tegen een rollend gemiddelde van vier weken plus of min 0,5 standaarddeviatie, gevoeld herstel (vermoeidheid en spierpijn op een schaal van 1 tot 7, boven 5 telt als slecht), en een hartslag-loopsnelheid-index uit minuut 5 tot 10 van gewone loopjes (een daling van meer dan 0,50 tegen de vorige twee weken, ongeveer 3 tot 4 slagen hoger bij hetzelfde tempo, telt als slecht).

**Bewijs.** Bij 30 recreatieve lopers over 15 weken verbeterde de 10 km in de bijgestuurde groep met 6,2% tegen 2,9% in de vaste groep (p = 0,002), met meer sterke en minder zwakke responders. Dit is de enige gecontroleerde studie die ik vond met recreatieve lopers, een 10 km als uitkomst en een beslisregel die op ASCEND lijkt. De precieze combinatieregel staat in een figuur; de tekst noemt alleen dat de training na een herstelblok werd hervat als "two-thirds of the markers within normal range" waren. De vragen werden elke ochtend via een app gesteld; HRV kwam van een polshorloge (Polar) ([Nuuttila e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/)) (bewijs: matig, één studie). Subjectieve maten volgen belasting gevoeliger dan objectieve maten en hangen er vaak niet mee samen, dus ze dragen eigen informatie ([Saw e.a. 2016](https://www.semanticscholar.org/paper/Monitoring-the-athlete-training-response:-measures-Saw-Main/aef31ab9684e48e3bf0ef40e8ff6a53e8be94ea7)) (bewijs: matig tot sterk).

**Data.** Een ochtendvraag (heeft ASCEND), de HR-tempo-index (heeft ASCEND in `engine/aerobicTrend.ts`), en HRV (nu niet beschikbaar; rusthartslag of HRV-statuscategorie als vervanger).

**Kan ASCEND het?** Grotendeels nu al. Twee van de drie signalen bestaan; het derde kan voorlopig de rusthartslag of de HRV-statuscategorie zijn (afgeleid; die vervanging is niet zo getoetst).

**Wat het toevoegt.** Een uitlegbare reden om een zware sessie te houden of lichter te maken, gebaseerd op meerdere signalen in plaats van één. Het past in de bestaande "Akkoord"-voorstellen.

### 11. RPE en RIR voor kracht

**Wat het is.** Gewicht of aantal sets per dag aanpassen op hoe zwaar het voelt (RPE) of hoeveel herhalingen je nog in de tank had (RIR, repetitions in reserve).

**Bewijs.** Een meta-analyse van 15 studies vond dat RIR-gebaseerde en snelheidsgebaseerde sturing ongeveer dezelfde krachtwinst geven als vaste percentages ([Sports Medicine Open 2021](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8762534/)) (bewijs: matig). Mensen schatten hun RIR gemiddeld ongeveer één herhaling te laag, nauwkeuriger dichter bij falen en bij sets onder de 12 herhalingen ([Halperin e.a. 2022](https://cris.iucc.ac.il/en/publications/accuracy-in-predicting-repetitions-to-task-failure-in-resistance-/)) (bewijs: matig).

**Data.** RPE of RIR per set.

**Kan ASCEND het?** Ja, maar je krachtprogramma loopt in MacroFactor.

**Wat het toevoegt.** Voor jou weinig extra in ASCEND. Wat wel telt: de sessie-RPE van de krachtsessie in de weekbelasting meenemen, en de inspanning (hoe dicht bij falen) in de beenvermoeidheid-index, wat `effortFactor` in `engine/legFatigue.ts` al doet (afgeleid).

### 12. Gepolariseerde en piramidale intensiteitsverdeling

**Wat het is.** Kijken hoe je trainingstijd verdeeld is over rustig (onder de eerste drempel), middel (tussen de drempels) en hard (boven de tweede drempel). Gepolariseerd is veel rustig, weinig middel, wat hard; piramidaal is veel rustig, minder middel, nog minder hard.

**Bewijs.** De nieuwste meta-analyse (17 studies, 437 deelnemers) vond een klein voordeel van gepolariseerd voor VO2peak (SMD 0,24) en geen duidelijk verschil voor prestatie ([Oliveira e.a. 2024](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11329428/)) (bewijs: matig). Een eerdere meta-analyse vond dat gepolariseerd mogelijk beter is dan veel drempeltraining ([Rosenblat e.a. 2019](https://pubmed.ncbi.nlm.nih.gov/29863593/)) (bewijs: matig). Bij 30 recreatieve lopers verbeterde de 10 km met 5,0% (77% rustig, 3% middel, 20% hard) tegen 3,6% (46/35/19), niet significant ([Muñoz e.a. 2014](https://pubmed.ncbi.nlm.nih.gov/23752040/)) (bewijs: zwak tot matig). Een review stelt dat bij lager niveau alle verdelingen ongeveer even goed werken ([samenvatting JSCR 2024](https://mtntactical.com/research/research-review-effects-of-polarized-vs-other-training-intensity-distribution-models-on-endurance-performance/)) (bewijs: zwak, alleen samenvatting). Belangrijk voor hoe je het meet: dezelfde training was bij tijd-in-zone ongeveer 96% rustig, maar bij indeling naar sessiedoel 86,6% rustig, 11,1% middel en 2,4% hard ([Sylta e.a. 2014](https://uia.brage.unit.no/uia-xmlui/handle/11250/226883)) (bewijs: matig).

**Data.** Het doel van elke sessie (ASCEND weet dat uit het sjabloon), of minuten per hartslagzone (`hrZones`).

**Kan ASCEND het?** Ja: naar sessiedoel nu al, naar tijd-in-zone als je zones invult of importeert.

**Wat het toevoegt.** Geen nieuw plan (het weekpatroon ligt al vast), maar een controle: als je rustige loopjes stelselmatig in zone 3 eindigen, schuift je verdeling ongemerkt naar "middel" en word je moe zonder dat het in het plan staat. ASCEND telt nu al rustige loopjes boven zone 2 apart in de HR-tempo-index (`outsideZone`), dus de basis bestaat (afgeleid).

### 13. Mechanische belasting en daling (D−) voor wandelaars

**Wat het is.** Naast hoe zwaar het voelt, bijhouden hoeveel je benen moeten opvangen: meters daling, impact van lopen, rugzakgewicht.

**Bewijs.** Bergaf overheerst energie-absorptie door de spieren ([Vernillo e.a. 2017](https://www.iat.uni-leipzig.de/datenbanken/iks/mint/Record/4043194)) (bewijs: matig, review). Bergaf lopen geeft spierschade die enkele dagen doorwerkt; eerdere blootstelling beschermt ([narratieve review](https://lida.sport-iat.de/ta/Record/4065692?lng=en); [Nottle en Nosaka 2007](https://digital.library.adelaide.edu.au/items/7c551fb3-3cfa-468d-9441-14768284ebbf)) (bewijs: zwak tot matig). Herstel na excentrisch werk duurt 3 tot 5 dagen ([Bontemps e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7674385/)) (bewijs: matig). De energiekost van wandelen met een rugzak is goed te voorspellen ([Looney e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8919998)) (bewijs: matig), maar energiekost is niet hetzelfde als spierschade. Een studie die een wekelijks "D−-budget" voor trekkers toetst, heb ik niet gevonden: dat bewijs ontbreekt.

**Data.** Daling per sessie (`elevationLossM` bestaat), rugzakgewicht, afstand.

**Kan ASCEND het?** Ja. De beenvermoeidheid-index rekent daling al mee (24 punten per 1000 m daling).

**Wat het toevoegt.** Een eigen lijn voor wat de GR5 het meest vraagt. Hartslag, TRIMP, rTSS en ook sessie-RPE onderschatten een lange afdaling; een aparte lijn voor D− maakt zichtbaar of je benen gewend raken aan dalen voordat je in de Alpen zes dagen achter elkaar 1000 m of meer naar beneden loopt (afgeleid).

## Manieren om het in kaart te brengen

### Wat bekend is over grafieken die sporters begrijpen

Er is geen onderzoek gevonden dat test welke grafiek een individuele sporter begrijpt of waar die naar handelt. Wat er wel is:

- In teamsport worden stoplichtsystemen (rood, oranje, groen) veel gebruikt, maar er is geen standaard voor wanneer iets rood is; de auteurs pleiten voor beslisondersteuning met duidelijke regels en goede communicatie in plaats van alleen kleuren ([Robertson, Bartlett, Gastin 2017](https://vuir.vu.edu.au/33497/)) (bewijs: expertopinie). Ook een overzicht over monitoringsystemen benadrukt het vooraf vastleggen van wat een betekenisvolle verandering is, en communicatie ([Thornton e.a. 2019](https://acuresearchbank.acu.edu.au/item/8vz1v/developing-athlete-monitoring-systems-in-team-sports-data-analysis-and-visualization)) (bewijs: expertopinie).
- Goed ontworpen visuele hulpmiddelen verbeteren beslissingen over gezondheid bij heel verschillende mensen ([Garcia-Retamero en Cokely 2017](https://produccioncientifica.ugr.es/documentos/618f9e6a4fa218568b4dbcef?lang=en)) (bewijs: matig, buiten de sport), maar ongeveer een derde van de volwassenen heeft lage grafiek- en rekenvaardigheid ([Galesic en Garcia-Retamero 2011](https://ideas.repec.org/a/sae/medema/v31y2011i3p444-457.html)) (bewijs: matig).
- Lopers lezen hun metrics als "past bij hoe ik me voel" of "botst ermee", en de getallen kleuren hoe ze hun lichaam ervaren ([HCII 2026, negen lopers](https://pure.bit.edu.cn/en/publications/a-phenomenological-study-of-situated-sensemaking-negotiating-self/)) (bewijs: zwak). Ondoorzichtige scores maken dat lastiger ([Doherty e.a. 2025](https://marcoaltini.substack.com/p/paper-readiness-recovery-and-strain)) (bewijs: expertopinie).
- Zelfmonitoring werkt het best in combinatie met een doel en feedback ([Michie e.a. 2009](https://pubmed.ncbi.nlm.nih.gov/19916637/)) (bewijs: matig tot sterk, algemene beweging).

Daaruit volgen een paar ontwerpregels (afgeleid): elke grafiek beantwoordt één vraag; je eigen normaal (je gemiddelde van de laatste weken, of je plan) is de referentie, niet een algemene norm; een kleur betekent alleen iets met een regel die in gewone taal te lezen is; er staat altijd een zin bij die zegt wat het betekent en wat je kunt doen; en eenheidsloze getallen ("1.650 AU") staan op de achtergrond, de vergelijking ("10% meer dan gepland") op de voorgrond.

### Mogelijke weergaven

**Weekbelasting als staafjes, gepland naast gedaan.** Per week een staaf van sessie-RPE, opgedeeld in lopen, kracht en wandelen, met de geplande week als omtrek erachter, voor de laatste 12 tot 16 weken. Je ziet direct de golf van vier weken, of een rustweek echt rustig was, en of je meer deed dan gepland. Beantwoordt: "deed ik wat het plan vroeg?" (bewijs voor de maat: matig tot sterk; voor de grafiekvorm: expertopinie).

**Fitness-vermoeidheid-vormcurve (CTL, ATL, TSB).** Drie lijnen over maanden. Bekend uit TrainingPeaks, maar de getallen zijn relatief, de constanten willekeurig, en de vormlijn is als beslisinstrument niet gevalideerd (zie methode 1). Werkt hooguit als achteruitkijkspiegel (expertopinie).

**Intensiteitsverdeling per week.** Een liggende balk per week met drie delen: rustig, middel, hard, naar sessiedoel of hartslagzone. Beantwoordt: "waren mijn rustige loopjes rustig?" (bewijs: matig voor het belang van veel rustig; expertopinie voor de weergave).

**Kalender-heatmap van beenbelasting.** In de bestaande maandkalender (`MonthCalendar`) per dag een kleurintensiteit voor de beenbelasting volgens de beenvermoeidheid-index, met een klein teken bij dagen met veel daling. Je ziet patronen: twee zware beendagen te dicht op elkaar, of een week waarin alles op het weekend viel. Beantwoordt: "waar zat de belasting voor mijn benen?" (afgeleid; de index zelf is niet in een studie getoetst).

**Monotonie per week.** Een getal of stip per week. Voor jou zal het bijna altijd laag zijn (zie methode 2), dus als vaste grafiek weinig waard; hooguit een waarschuwing als het ooit boven ongeveer 1,5 komt (expertopinie).

**Frisheidscurve naar test of wedstrijd.** Een lijn van vandaag tot de testdag of wedstrijddag met de verwachte beenvermoeidheid volgens het plan, en de drempelband "fris" en "twijfel" erachter. Als de lijn op de dag zelf boven de band ligt, staat er een voorstel bij. `LegFatigueCard` toont nu al de stand op de dag van de volgende test of wedstrijd; de curve maakt zichtbaar welke sessie ervoor zorgt dat je niet fris bent (afgeleid).

**Ochtendsignalen met eigen band.** Een kleine lijn met rusthartslag (gemiddelde over drie dagen) en, als die er is, HRV, met je eigen band van de laatste vier weken als grijze strook, en daaronder de check-in als stippen. Lijkt op wat Garmin bij HRV-status doet, en op de regel uit de HRV-studies (bewijs: matig voor de regel; expertopinie voor de weergave).

## Wat ASCEND kan berekenen met wat er is en wat later met Garmin kan

### Nu al, met de data die er is

- **Sessie-RPE-belasting** per sessie (minuten maal RPE), per week en per soort; voor geplande sessies met de geplande RPE. Dus ook gepland naast gedaan.
- **Monotonie en strain** per week, uit dezelfde getallen.
- **Intensiteitsverdeling naar sessiedoel**, uit de intensiteit van het sjabloon en de duur.
- **Beenvermoeidheid vooruit**: de bestaande index kan voor elke dag tot de wedstrijd worden uitgerekend met de geplande sessies.
- **D+ en D− per week** en de langste afdaling van de afgelopen 30 dagen, uit `elevationGainM` en `elevationLossM`.
- **HR-tempo-index** (bestaat al) en het aantal rustige loopjes boven zone 2 (bestaat al).
- **Ochtendcheck-in als trend**: aantal dagen met "stijf", "spierpijn" of "moe" per week.
- **Kritische snelheid** uit twee testuitslagen (bijvoorbeeld de 5 km-test en een kortere tijdrit), als tempo-advies.
- Technisch ook ACWR en CTL/ATL/TSB, maar zie het laatste hoofdstuk.

### Met een paar getallen die je zelf invult

- **Rusthartslag** per ochtend (het horloge toont hem; het veld `restingHeartRate` bestaat).
- **HRV-statuscategorie** van Garmin ("in balans", "uit balans", "laag"). Het veld `hrv` is nu een getal; voor een categorie is een generiek veld nodig, met een migratiestap volgens de regel in `storage/migrations.ts` (afgeleid).
- **Minuten per hartslagzone** voor een loop of wandeling (het veld `hrZones` bestaat), waarmee intensiteitsverdeling naar tijd-in-zone en Edwards-TRIMP mogelijk worden.

### Later via een bestand of adapter

- **FIT- of GPX-import** (export uit Garmin Connect): hartslag- en tempo-reeksen, waarmee tijd-in-zone, Banister-TRIMP, hartslagdrift binnen een sessie, de beste stukken voor kritische snelheid, en precieze daling mogelijk worden. Dit werkt zonder backend (afgeleid).
- **Health Connect**: kent `RestingHeartRateRecord` en `HeartRateVariabilityRmssdRecord` ([Android developers](https://developer.android.com/reference/kotlin/androidx/health/connect/client/records/HeartRateVariabilityRmssdRecord)), en Garmin schrijft workouts, hartslag en rusthartslag, maar volgens techpers geen HRV-status, belasting of Body Battery ([Tom's Guide](https://www.tomsguide.com/wellness/fitness-trackers/garmin-clarifies-what-data-its-sharing-with-google-health-connect-heres-the-full-list); [the5krunner](https://the5krunner.com/2025/05/22/garmin-connect-and-strava-runna-new-link-to-goolge-health-connect/)) (bewijs: expertopinie). Health Connect is een Android-API; een PWA in de browser kan er niet zelf bij, daarvoor is een kleine native schil nodig (afgeleid).
- **Garmin Health API**: alleen voor bedrijven en alleen server-naar-server met HTTPS-endpoints ([Garmin Developer Program](https://developer.garmin.com/gc-developer-program/overview); [integratiegids](https://openwearables.io/docs/providers/garmin-api-integration.md)). Zonder backend niet bruikbaar, en een backend past niet bij ASCEND.

Alles hoort volgens de adapterregel in generieke vormen met een `source`-veld te komen. Kleine kanttekening: `RecoveryMetric` heeft nu een veld `bodyBattery`, een merknaam van Garmin; als dat veld ooit gevuld wordt, past een generieke naam beter bij die regel (afgeleid).

## Aanbeveling in volgorde

### 1. Weekbelasting in sessie-RPE, per soort, gepland naast gedaan

**Wat bouwen.** Een pure functie in `engine/` die per sessie minuten maal RPE uitrekent (gelogde RPE, anders de geplande), per week optelt en opsplitst in lopen, kracht, wandelen en fietsen, voor plan en uitvoering. Een kaart met staafjes voor de laatste 12 tot 16 weken, de golf zichtbaar, en één zin: "Deze week 1.650, gepland 1.700. Week 3 van 4, volgende week rustweek." Wijkt een week meer dan ongeveer 20% af van het plan, dan een opmerking in de weekreview, geen automatische ingreep (die grens is afgeleid, niet getoetst). Monotonie alleen als kleine melding als die ooit hoog wordt.

**Waarom eerst.** Het kost geen extra invoer, het maakt zichtbaar of de golf van vier weken echt zo uitpakt, en het is de basis voor de andere vier. Het bewijs dat sessie-RPE een geldige maat is voor lopen en kracht is het sterkste van alle methoden in dit rapport ([Foster e.a. 2001](https://sponet.de/sponet/Record/4006210); [Haddad e.a. 2017](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2017.00612/full); [Sweet e.a. 2004](https://scinapse.io/papers/1979416376); [Wallace e.a. 2014](https://opus.lib.uts.edu.au/handle/10453/122356)) (bewijs: matig tot sterk). Een getoetste grens voor hoeveel een week mag stijgen bestaat niet; bij lopers hing week-op-week-stijging zelfs nergens mee samen ([Frandsen e.a. 2025](https://researchportal.lih.lu/en/publications/how-much-running-is-too-much-identifying-high-risk-running-sessio/)) (bewijs: matig). Daarom beschrijvend, niet sturend.

### 2. Een regel met drie ochtendsignalen voor zware sessies

**Wat bouwen.** Op de ochtend van een zware sessie (heuvels, tempo, test, zware beenkracht) drie signalen bekijken: (a) de check-in (benen "flink" of energie "op", of twee ochtenden op rij "stijf"/"moe"), (b) rusthartslag, gemiddelde over drie dagen, duidelijk boven je eigen gemiddelde van vier weken, of HRV-status "laag", en (c) de HR-tempo-index van de laatste twee weken duidelijk slechter dan de twee weken ervoor (meer dan ongeveer 4 slagen bij hetzelfde tempo). Twee van de drie slecht: een voorstel ("Akkoord") om de sessie rustiger te doen of een dag te schuiven, binnen de regels van de scheduler. Eén slecht: alleen een opmerking. Ontbreekt een signaal, dan beslissen de andere twee, en zonder rusthartslag blijft de app werken zoals nu.

**Waarom tweede.** Dit is de enige aanpak met een gecontroleerde studie bij recreatieve lopers met een 10 km als uitkomst, en het verschil was groot (6,2% tegen 2,9%) ([Nuuttila e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/)) (bewijs: matig, één studie). HRV-sturing in het algemeen geeft een klein voordeel en minder mensen die niet vooruitgaan ([Düking e.a. 2021](https://pubmed.ncbi.nlm.nih.gov/34489178/); [Vesterinen e.a. 2016](https://pubmed.ncbi.nlm.nih.gov/26909534/)) (bewijs: matig), en subjectieve signalen dragen eigen informatie ([Saw e.a. 2016](https://www.semanticscholar.org/paper/Monitoring-the-athlete-training-response:-measures-Saw-Main/aef31ab9684e48e3bf0ef40e8ff6a53e8be94ea7)) (bewijs: matig tot sterk). Rusthartslag als vervanger voor HRV is zwakker ([Bosquet e.a. 2008](https://pubmed.ncbi.nlm.nih.gov/18308872/)) (bewijs: matig voor die zwakte), en de precieze "twee van drie"-regel en de grenzen zijn afgeleid. ASCEND heeft twee van de drie signalen al, dus het is vooral het samenvoegen.

### 3. Frisheidscurve naar test en wedstrijd en een kalender van beenbelasting

**Wat bouwen.** Uit de bestaande beenvermoeidheid-index: (a) een lijn van vandaag tot de volgende test of wedstrijd met de verwachte stand per dag, de drempelband erachter, en per piek de sessie die hem veroorzaakt; (b) in de maandkalender per dag een kleurintensiteit voor beenbelasting en een teken bij veel daling. Voor de wedstrijdweek van maart 2027 de taperregel uit de literatuur als voorstel: volume ongeveer 40 tot 60% omlaag, intensiteit en frequentie houden; in de studies werkten tapers van 7 tot 21 dagen.

**Waarom derde.** Het beantwoordt direct de vraag die je voor elke test en wedstrijd hebt, met een model dat ASCEND al heeft en dat lagen onderscheidt die CTL/ATL/TSB niet onderscheidt. Het bewijs voor de herstelduur per laag is matig ([Bontemps e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7674385/); `docs/onderzoek/Spierbelasting en beenvermoeidheid.md`), de index als geheel is niet getoetst (afgeleid). Het bewijs voor de taper is matig tot sterk: 41 tot 60% minder volume met behoud van intensiteit verbetert de prestatie ([Wang e.a. 2023](https://www.sponet.de/sponet/Record/4081751?lng=en); Bosquet e.a. 2007 via [secundaire samenvatting](https://ctyeh.com/articles/11867?lang=fr)) (bewijs: matig). Voor de weergave zelf is er geen sportspecifiek bewijs (expertopinie).

### 4. Controle op intensiteitsverdeling per week

**Wat bouwen.** Per week de minuten rustig, middel en hard, naar sessiedoel; als hartslagzones bekend zijn ook naar tijd-in-zone, apart getoond (de twee methodes geven heel verschillende getallen). Een melding als in twee weken op rij meer dan de helft van de rustige loopjes boven zone 2 eindigde: "je rustige loopjes waren middelzwaar".

**Waarom vierde.** Veel rustig en weinig middel is de best onderbouwde verdeling, al zijn de verschillen bij recreanten klein ([Oliveira e.a. 2024](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11329428/); [Rosenblat e.a. 2019](https://pubmed.ncbi.nlm.nih.gov/29863593/); [Muñoz e.a. 2014](https://pubmed.ncbi.nlm.nih.gov/23752040/)) (bewijs: matig voor de verdeling, zwak tot matig voor recreanten). Het plan van ASCEND is al zo opgezet; dit is een controle of de uitvoering het plan volgt. Hoe je meet maakt veel uit ([Sylta e.a. 2014](https://uia.brage.unit.no/uia-xmlui/handle/11250/226883)) (bewijs: matig).

### 5. Daling (D−) per week en per tocht als eigen lijn

**Wat bouwen.** Een lijn met D− per week en de grootste afdaling per tocht, naast het doel van de GR5-ladder (de dagelijkse daling op de zwaarste etappes), met rugzakgewicht als label. Een melding als een afdaling veel groter is dan de grootste van de afgelopen 30 dagen, naar analogie van de 10%-regel voor lopen; die analogie is niet getoetst.

**Waarom vijfde.** Voor de GR5 is dalen wat je benen het meest beschadigt, en alle hartslag- en tempomaten missen het ([Vernillo e.a. 2017](https://www.iat.uni-leipzig.de/datenbanken/iks/mint/Record/4043194); [Bontemps e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7674385/)) (bewijs: matig). Eerdere blootstelling beschermt ([Nottle en Nosaka 2007](https://digital.library.adelaide.edu.au/items/7c551fb3-3cfa-468d-9441-14768284ebbf)) (bewijs: zwak tot matig), dus geleidelijk opbouwen en zien dat je het doet is zinvol. Een getoetst weekbudget voor daling bestaat niet, daarom staat dit onderaan en blijft het beschrijvend. Voor de 10 km in maart is het minder belangrijk; het wordt belangrijk vanaf het voorjaar van 2027.

## Wat niet en waarom

**ACWR als stuurmaat of "sweet spot".** De ratio heeft statistische problemen en geen aangetoond causaal verband met blessures ([Impellizzeri e.a. 2020](https://opus.lib.uts.edu.au/handle/10453/141898); [Lolli e.a. 2019](https://bjsm.bmj.com/content/53/15/921)) (bewijs: matig). Bij hardlopers hing een hogere ACWR zelfs samen met minder blessures, terwijl de maat die ASCEND al gebruikt (een losse loop ten opzichte van de langste van 30 dagen) wel samenhing ([Frandsen e.a. 2025](https://researchportal.lih.lu/en/publications/how-much-running-is-too-much-identifying-high-risk-running-sessio/); [Nakaoka e.a. 2021](https://research.rug.nl/en/publications/the-association-between-the-acute-chronic-workload-ratio-and-runn/)) (bewijs: matig). Toevoegen zou verwarren.

**Een gepast Banister-model of CTL/ATL/TSB als beslisinstrument.** De parameters zijn onbetrouwbaar en persoonlijk ([Hellard e.a. 2006](https://pmc.ncbi.nlm.nih.gov/articles/pmid/16608765); [Vermeire e.a. 2022](https://lida.sport-iat.de/ta/Record/4075491?lng=en)) (bewijs: matig), de vaste constanten van 42 en 7 dagen zijn een keuze en geen meting, en de vormwaarden voor een wedstrijd zijn niet gevalideerd ([TrainingPeaks](https://www.trainingpeaks.com/learn/articles/the-science-of-the-performance-manager/)) (bewijs: expertopinie). De weekstaafjes en de frisheidscurve uit de beenvermoeidheid-index zeggen hetzelfde, maar duidelijker en met onderscheid tussen soorten vermoeidheid (afgeleid).

**rTSS of TSS.** Vraagt een drempeltempo en tempo-reeksen, is gemaakt voor hardlopen alleen, en rekent een afdaling als licht terwijl die je benen het meest beschadigt ([TrainingPeaks rTSS](https://www.trainingpeaks.com/learn/articles/running-training-stress-score-rtss-explained/); [Minetti e.a. 2002](https://iris.unibs.it/retrieve/ddc633e4-3c03-4e2e-e053-3705fe0a4c80/Minetti%20JAP%202002.pdf)) (bewijs: matig voor de energiekost, afgeleid voor de gevolgtrekking). Sessie-RPE doet het bijna even goed en dekt ook kracht en wandelen ([Wallace e.a. 2014](https://opus.lib.uts.edu.au/handle/10453/122356)) (bewijs: matig).

**TRIMP, voorlopig.** Zonder hartslagreeksen alleen grof te benaderen, de varianten zijn niet uitwisselbaar, en zware krachttraining valt erbuiten (bewijs: zwak tot matig). Na een FIT-import kan Edwards-TRIMP een tweede lijn worden naast sessie-RPE, maar het voegt dan vooral een controle toe, geen nieuwe beslissing (afgeleid).

**Kritische snelheid als belastingmaat.** Goed als tempo-advies voor de wedstrijd ([Smyth en Muniz-Pumares 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7664951)) (bewijs: matig), maar het meet vermogen, geen belasting of vermoeidheid. D'-balans vraagt seconde-data.

**Garmin Body Battery en Training Readiness als invoer.** De formules zijn niet gepubliceerd, er is geen onafhankelijke validatie gevonden ([Doherty e.a. 2025](https://www.degruyterbrill.com/document/doi/10.1515/teb-2025-0001/html)) (bewijs: matig voor het ontbreken van bewijs), Training Readiness zit volgens gebruikers niet op elk Garmin-model, en geen van beide komt via Health Connect. HRV-status als categorie is de uitzondering die wel past (methode 7).

**Een nieuwe samengestelde readiness-score.** Signalen in één getal stoppen verbergt waarom het getal daalt, en dat is precies de kritiek op de fabrikantscores ([Doherty e.a. 2025](https://marcoaltini.substack.com/p/paper-readiness-recovery-and-strain); [Robertson e.a. 2017](https://vuir.vu.edu.au/33497/)) (bewijs: expertopinie). De aanbevolen regel met drie signalen houdt ze apart en zegt welk signaal afwijkt (afgeleid).

**Dagelijks HRV meten als verplichting.** Het voordeel boven een goed plan is klein ([Manresa-Rocamora e.a. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8507742/)) (bewijs: matig), en Garmin levert de ruwe waarde niet aan Health Connect. Optioneel invullen ja, verplichten nee.

**RIR-sturing van kracht in ASCEND.** Werkt even goed als vaste percentages ([Sports Medicine Open 2021](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8762534/)) (bewijs: matig), maar je krachtprogramma loopt in MacroFactor; dubbel bijhouden kost moeite zonder winst (afgeleid).

### Wat in het bewijs ontbreekt

- Geen studie die test welke grafiekvorm een individuele sporter begrijpt of tot betere beslissingen brengt.
- Geen getoetste grens voor weekstijging in sessie-RPE, voor monotonie, voor rusthartslag als signaal, of voor wekelijkse daling bij trekkers.
- De combinatieregel uit Nuuttila 2022 staat alleen in een figuur; "twee van drie" is mijn vertaling.
- Geen autoregulatie-studie bij wandelaars of met rugzak; overdracht van lopers is een aanname.
- De grootste blessurestudie had een gemiddelde leeftijd van 46; of de 10%-regel voor jongere lopers anders ligt, is onbekend.
- Garmin publiceert de algoritmes van Training Readiness, Body Battery en de breedte van de HRV-statusband niet.
- Een aantal bronnen (Bosquet 2007, de Bayesiaanse kritiek op Banister, Doherty 2025, Dial 2025) kon ik alleen via abstract of samenvatting lezen.
