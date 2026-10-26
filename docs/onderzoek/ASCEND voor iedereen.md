# ASCEND voor iedereen

Hoe ASCEND een app wordt voor iedereen: met of zonder doel, met de sporten die je zelf kiest, met een frequentie en een hoeveelheid per soort training die je zelf bijstelt, en met sporten die je gewoon doet en die toch eerlijk meetellen. Dit rapport zegt hoe dat in de engine zou moeten werken, wat je in de app ziet, wat je kunt kiezen, en hoe de instellingen daarbij overzichtelijk blijven.

Dit is onderzoek en een voorstel, nog geen besluit. Het is gemaakt op 26 oktober 2026 uit vier deelonderzoeken: de huidige code (Scout Engine), twintig andere apps (Scout Apps), de sportwetenschap (Scout Wetenschap) en een doorlichting van alle instellingen (Cartographer Instellingen). De ruwe notities staan buiten de repo. De bronnen staan per onderwerp in de tekst en onderaan.

## In het kort

1. Een doel wordt een keuze, geen voorwaarde. Je kiest een richting: fit blijven, fitter worden, of naar een doel met een datum (een tocht of een wedstrijd). De GR5 is daarna één doel naast andere, en voor wie hem nu volgt verandert er niets.
2. Een sport wordt een gegeven in plaats van code. Elke sport heeft vijf kenmerken (impact, remmen, stop en start, bovenlichaam, techniek) en een gebruikelijke zwaarte. Daarmee kan de planning ook een sport meetellen die hij niet zelf plant, zoals padel, voetbal of zwemmen.
3. Per sport kies je een rol: ASCEND plant hem, hij is een vaste afspraak (bijvoorbeeld voetbal op dinsdag) waar de rest omheen gepland wordt, hij telt alleen mee als je hem doet, of hij staat uit.
4. Per soort training stel je twee dingen bij: hoe vaak per week en hoeveel (minder, normaal, meer). De planning bewaakt de grenzen in drie lagen: veiligheid schuift nooit, wat je doel minstens vraagt komt als voorstel met Akkoord, en daarboven ben je vrij.
5. Eén munt voor alle belasting: minuten maal hoe zwaar het voelde (sessie-RPE). De kenmerken zeggen waar die belasting valt, zodat een uur zwemmen je benen niet zwaar maakt en een voetbalwedstrijd wel.
6. Zonder doel krijg je een doorlopend ritme van drie weken opbouwen en een lichte week, met een eerlijke telling van je week tegen de beweegrichtlijn: 150 minuten en 2 keer kracht.
7. Wat niet past, zegt de app hardop. Hij laat nooit stil iets vallen.
8. De instellingen worden niet langer maar korter: per sport één rij, de rest gebundeld of onder Geavanceerd (zie deel 7).
9. Bouwen kan in zeven rondes. De eerste ronde verandert niets wat je ziet en maakt het fundament: een vaste toets dat jouw huidige GR5-plan na elke ronde precies hetzelfde blijft.

## Deel 1. Waar we nu staan

De planning van ASCEND is gebouwd rond één persoon met één hoofddoel. Dat is goed gegaan, maar het zit op vier plekken vast.

**Het hoofddoel is impliciet.** Er is geen veld "hoofddoel". Het is "het actieve doel met mijlpalen", en die zoekregel staat op ruim tien plekken los gekopieerd (onder meer `engine/programLayout.ts`, `engine/gr5Profile.ts`, `pages/Today.tsx`, `pages/Ascend.tsx`, `pages/Standing.tsx`). Een marathondoel wordt zelfs op zijn naam herkend.

**Zonder doel krijg je toch de GR5.** Kies je bij de start "fit en sterk blijven", dan loopt de planning wel door, maar met de GR5-opbouw: Basis, Opbouw, Bergcapaciteit en Expeditieklaar. De wissels in `PATTERN_SWAPS` kijken niet naar een doel, dus waarschijnlijk krijg je in week 9 tot 16 een bergtocht met rugzak. Dat is uit de code gelezen en nog niet met een test bevestigd. De slimme laag die per week bijstuurt op wat je kunt (de weekprescriptie) staat zonder doel stil uit.

**Sporten zijn code, geen gegevens.** `Sport = 'running' | 'hiking' | 'cycling'` staat letterlijk op minstens twaalf plekken, en 43 bestanden noemen sjablonen bij hun id (`tpl_long_run` en dergelijke). Een nieuw duursjabloon zonder sport telt overal als hardlopen. Een activiteit die geen loop, wandeling, rit of krachttraining is, slaat de import over (`activityImport.ts#isImportable`). Zwemmen, padel en voetbal bestaan dus niet voor de planning.

**Het weekpatroon is vast.** De week bestaat uit zeven sjablonen met een vaste dag. De startvragen (`weekShape`) kennen alleen drie loop- en drie krachtsjablonen. Zonder kracht kun je hoogstens drie keer per week trainen, en fietsen of wandelen kan geen vaste plek krijgen. Een frequentie per sport bestaat al (`sportFrequency`), maar alleen als eenmalig voorstel. Nieuwe weken lezen hem niet.

**Wat al wel algemeen is, en dat is veel.** Het belastingprofiel op een sjabloon (`baseStressProfile`) stuurt de beenindex, de 48-uursregel, de weekbelasting en de intensiteit, voor elke sport. Een padelsjabloon met een profiel zou daar meteen goed in meelopen. Ook de planningsronde (`planPass`), de weekcontrole, vrije dagen en tochten, voorstellen met Akkoord, ongedaan maken, het rustweekritme en "Volgehouden" werken zonder doel. Het grootste deel van de engine hoeft dus niet over, alleen de randen.

## Deel 2. Wat andere apps laten zien

Twintig apps bekeken, van Runna en Garmin tot Whoop, Fitbod en Peloton. Vijf lessen wegen het zwaarst.

**Een doel is bijna nergens verplicht.** Runna heeft plannen zonder wedstrijd (Run Faster, Run Further, Run to Maintain), TrainerRoad heeft "geen evenement" en "Maintaining Fitness", Strava kent Maintain, Build, Explore en Recover, Suunto Maintain, Improve en Boost. De valkuil is een "geen doel"-stand die eigenlijk een verborgen doel is: Joggo stuurt naar afvallen, ook als je dat niet koos.

**Bijstellen werkt het best bij Runna.** Twee losse schuiven in gewone woorden: hoeveel (Gradual, Steady, Progressive) en hoe zwaar (Comfortable, Balanced, Challenging). Daarnaast een focus voor plannen zonder wedstrijd (Speed, Endurance, Balanced), en kracht als eigen as met 1 tot 4 keer per week. Het gedetailleerde deel ("Advanced Customisation") staat standaard dicht en verschijnt alleen als het de opbouw echt verandert. Klachten: er is geen terugzetten met één tik en voorkeuren gaan niet mee naar een volgend plan.

**Vaste afspraken lost niemand goed op.** Een teamtraining op dinsdag als vast gegeven waar de rest omheen wordt gepland: Athletica-gebruikers vragen erom en krijgen "Too many constraints", Garmin staat maar één plan tegelijk toe, bij Peloton telt een externe training alleen "als gedaan". ASCEND heeft de bouwsteen al: een sessie die van jou is (`PlannedSession.lock`) raakt de planning nooit aan. Dit is de grootste kans.

**Andere sporten: vier aanpakken, één goede.** Negeren (Runna houdt kracht buiten zijn aanpassingen, TrainerRoad negeert losse ritten), indirect meetellen (Garmin), per spiergroep meetellen (Fitbod laat fietsen de vermoeidheid van je benen veranderen), of alles in één getal (Whoop Strain, dat krachttraining onderwaardeert). De Fitbod-aanpak past het best bij ASCEND, omdat de beenindex dat al doet.

**Uitleg bij elke keuze.** Strava legt bij elke suggestie uit waarom, en dat wordt gewaardeerd. De Peloton-vragenlijst kreeg kritiek omdat die uitleg ontbrak.

Drie valkuilen om te vermijden: één belastinggetal voor alle sporten, een plan dat alles wil inpassen en stil dingen laat vallen, en een doel verstoppen achter "geen doel".

## Deel 3. Wat de wetenschap vraagt

De bestaande rapporten gingen over iemand met een doel. Voor een schema zonder doel en met meerdere sporten is het bewijs dunner. Hieronder staat steeds hoe sterk het is.

**De ondergrens van fit.** Gezondheidsraad 2017, WHO 2020 en ACSM zijn het eens: minstens 150 minuten matig per week (een minuut intensief telt als twee), verspreid over de week, plus minstens twee keer per week spier- en botversterkend. Sterk als richtlijn. Minder doen heeft nog steeds nut (matig, observationeel). Een "weekendsporter" die het in twee sessies haalt, scoort voor sterfte even goed (matig).

**Een standaardschema** bestaat uit vier bouwstenen: kracht, rustige duur, één harde prikkel en minstens één rustdag, met een lange duur vanaf vier dagen. Per aantal dagen staat er een uitwerking in de notities. Dit is afgeleid en niet getoetst: er is geen studie die "het" schema voor 2 tot 6 dagen vergelijkt. Beginners starten met hoogstens vier dagen en de eerste twee weken zonder harde dag (expert).

**Sporten combineren.** Kracht naast duur kost gemiddeld geen kracht of spiermassa (sterk, Schumann 2022). Hoe lang je benen er last van houden, hangt vooral af van remmen (excentrisch werk), impact en stop en start, meer dan van hoe zwaar het voelde. Na een voetbalwedstrijd is de spierschade na 72 uur nog niet hersteld (matig, Silva 2018, bij profs, dus een bovengrens voor recreanten). Padel zit op 70 tot 80% van je maximale hartslag met veel stop en start (matig). Over blessures bij padel is niets betrouwbaars gevonden.

**Vijf kenmerken per sport.** Impact, remmen, stop en start, bovenlichaam en techniek, elk van 0 tot 3, plus een gebruikelijke zwaarte. Voorbeelden: hardlopen impact 3, remmen 2; fietsen alles 0; zwemmen bovenlichaam 3, techniek 3; voetbal impact 3, remmen 3, stop en start 3; padel 2, 2, 3; yoga bijna niets. Deze waarden zijn afgeleid en worden later geijkt op je eigen logs. Een onbekende sport krijgt de eerste keer één vraag: "Merk je dit vooral in je benen, in je armen en schouders, of in je hele lijf?"

**Eén munt voor belasting.** Minuten maal hoe zwaar het voelde (sessie-RPE, 0 tot 10) is breed gevalideerd, ook in teamsport, en werkt zonder hartslag (matig tot sterk). Het zegt niets over waar de belasting valt; daarvoor zijn de kenmerken. Hartslag alleen voor gelijkmatige duursporten. De acute:chronische verhouding blijft afgeraden, en met meerdere sporten nog sterker. De enige grens met redelijk bewijs is de sessiepiek: niet meer dan 110% van je langste sessie van dezelfde soort in 30 dagen (matig, bij lopers; voor andere sporten een voorzichtige gok).

**Harde dagen.** Hoogstens 2 per week bij vier dagen of minder, 3 bij vijf of zes, en 1 voor beginners in de eerste weken (expert). Een voetbalwedstrijd of fel padel telt mee.

**Onderhouden is goedkoop.** Kracht houd je vast met één sessie per week, uithouding met twee per week als de intensiteit blijft (matig, Spiering 2021). Vooruitgang vraagt in de praktijk twee krachtdagen en drie loopjes. Dat geeft per soort een eerlijke ondergrens.

**Opbouw zonder doel.** Een doorlopende golf van drie weken opbouwen en een week met 30 tot 40% minder volume bij dezelfde intensiteit (expert voor de golf, matig dat minder volume met gelijke intensiteit je vorm vasthoudt). Eén ding tegelijk verhogen, en alleen na twee goede weken. Na drie weken of langer pauze van een sport een herstart van twee weken. Elke zes tot acht weken een kleine eigen meting als doel zonder wedstrijd.

**Wat een doel minstens vraagt per soort.** Algemeen fit: 150 minuten en 2 keer kracht, harde prikkel mag nul zijn. Een 10 km: drie loopjes om vooruit te gaan (twee om vast te houden), een lange loop die groeit tot 60 tot 90 minuten, één kwaliteitssessie, kracht minstens één keer. Een meerdaagse bergtocht: kracht één tot twee keer, wandelvolume, een rugzaksessie 2 tot 4 keer per maand (hoogstens vier), een afdaalprikkel elke één tot twee weken, harde intervallen niet nodig. Deels expert, en zo ook te tonen: als ruwe ondergrens, niet als wet.

## Deel 4. Het model: vijf keuzes

Dit is het hart van het voorstel. Alles wat je kunt instellen valt in vijf keuzes, van grof naar fijn.

### 1. Richting

Bovenaan staat één keuze met drie standen.

- **Fit blijven**: onderhoud. Een vast weekritme zonder opbouw, met af en toe een lichte week als voorstel.
- **Fitter worden**: opbouw in golven van vier weken, zonder einddatum. Elke golf eindigt met een korte terugblik en de vraag: doorgaan, naar onderhoud, of een doel kiezen.
- **Naar een doel**: een tocht of wedstrijd met een datum. De weken worden teruggeteld vanaf de datum, zoals nu bij de GR5. De weken die je daarvoor algemeen trainde, tellen als basisfase.

Een doel heeft een soort (tocht met rugzak, hardloopwedstrijd, fietstocht, later meer) en daaruit volgen de ondergrenzen per soort training (deel 3). Je kunt meerdere doelen hebben; één is het hoofddoel, de andere zijn tussendoelen, zoals nu de 10 km naast de GR5. Na het hoofddoel valt de richting vanzelf terug op "Fit blijven" of "Fitter worden", als voorstel.

### 2. Sporten en hun rol

Per sport één rol.

- **ASCEND plant het**: de sport staat in je schema, met opbouw.
- **Vaste afspraak**: je geeft de dag op (en eventueel de tijd en hoe zwaar het meestal is). De afspraak staat elke week in je planning, telt mee voor je benen, je harde dagen en je belasting, en de rest wordt eromheen gepland. Hij wordt nooit verschoven. Komt een vakantie of tocht, dan vraagt de app of hij die week vervalt.
- **Alleen meetellen**: je doet het wanneer je wilt. Komt het van je horloge of log je het, dan telt het mee, en de planning van de dagen erna past zich aan (als voorstel als dat iets verschuift).
- **Uit**: de app negeert de sport. Een activiteit van je horloge komt dan nog wel in het logboek, maar telt niet in de planning.

Niet elke sport kan elke rol hebben. ASCEND plant alleen sporten waarvoor het trainingen en opbouw kent: hardlopen, wandelen, kracht, fietsen, en later zwemmen. Padel, voetbal, yoga en een eigen sport kunnen een vaste afspraak zijn of alleen meetellen.

### 3. Hoe vaak

Per sport die ASCEND plant: een aantal per week, met een voorgesteld getal uit je richting, je doel en je dagen. Per vaste afspraak: de dagen. Daarnaast, voor de hele week: welke dagen kunnen, welke dag is rust, en hoeveel tijd je per dag hebt (dat bestaat al).

### 4. Hoeveel

Per soort training een wens in drie standen: minder, normaal, meer. De soorten zijn de bouwstenen uit deel 3, niet de sjablonen: kracht, rustige duur, lange duur, harde training, wandeling met rugzak, en per sport die ASCEND plant. "Meer" maakt eerst een bestaande sessie langer of zwaarder (binnen de sessiepiek), dan maakt het van een lichte dag een sessie van die soort, en pas dan neemt het een plek van een andere soort over. De wens blijft bewaard, ook na een lichte week of een nieuw blok (Runna vergeet dat, en dat wordt gemist).

Eén algemene schuif blijft: de bestaande Ambitie (Rustig, Standaard, Stevig) voor hoe zwaar alles is. Zo zijn er twee assen zoals bij Runna: hoeveel per soort, en hoe zwaar in het algemeen.

### 5. Grenzen in drie lagen

Elke wens schuift binnen een bereik.

- **Veiligheid schuift nooit**: 48 uur tussen zware beendagen, 72 uur na een bergtocht, voetbalwedstrijd of zware beenkracht, de sessiepiek van 110%, het maximum aan harde dagen, hoogstens vier rugzaksessies per maand, minstens één rustdag. Raakt een wens zo'n grens, dan zegt de app welke ("Een extra intervaltraining past niet: dat wordt je derde harde dag").
- **Wat je doel minstens vraagt**: een wens daaronder kan, maar alleen met een voorstel dat zegt wat het kost ("Zonder lange loop haal je de 10 km in 50 minuten waarschijnlijk niet, wel in 55") en Akkoord.
- **Vrij**: alles daarboven doe je gewoon.

Zonder doel vervalt de middelste laag. Dan geldt alleen de richtlijn van 150 minuten en 2 keer kracht, en die als waarschuwing, niet als blokkade.

## Deel 5. Hoe de engine het doet

### De planningsronde

De bestaande planningsronde (`planPass`) blijft de enige plek die de planning bouwt. Hij krijgt aan het begin twee stappen erbij, en de rest blijft zoals hij is.

1. **Bouwstenen kiezen.** Uit de richting, het doel en je keuzes per sport volgt per week een lijst rollen: hoeveel kracht, rustige duur, lange duur, harde training, rugzak en per sport. Pure functie, met tests.
2. **De week vullen.** Eerst de vaste afspraken (als vaste sessies). Dan, in volgorde: de ondergrens van kracht, de ondergrens van duur, de frequentie van de doelsport, de harde prikkel als er onder de limiet ruimte is, en tot slot de rest, die per week kan wisselen ("zwemmen en fietsen om en om"). Plaatsen gebeurt met de bestaande zoeker (`candidatePlacement.searchWeeklyPlacement`), die al rekening houdt met tijd per dag, twee trainingen op een dag en de 48-uursregel.
3. **Duur per sessie.** Wat de opbouw vraagt (`progressionTarget`) maal Ambitie maal de wens per soort, begrensd door de sessiepiek en ziekte (`substitutions.ts#resolveEffectiveFullDuration`, waar Ambitie nu al ingrijpt).
4. **Racebloks en tochten**, zoals nu.
5. **De weekcontrole**, zoals nu, met de regels algemener gemaakt. `TWO-HARD-RUNS` wordt een limiet op harde dagen over alle sporten heen. `ONE-LONG`, de sleutelsessies en de testankers lezen een rol op het sjabloon in plaats van een lijst id's.
6. **Het verschil met wat er staat** wordt een voorstel met Akkoord, zoals elke planningswijziging nu.

### De gegevens

- **Sporten als data**: een lijst `SportDefinition` in `data/sports.ts` met id, naam, pictogram, kleur, de vijf kenmerken, de gebruikelijke zwaarte, welke rollen mogen en welke activiteitsoorten van intervals.icu erbij horen. `Sport` wordt een string die in die lijst staat. Een eigen sport is een rij die de gebruiker zelf maakt.
- **Rollen op sjablonen**: een veld `role` (lang, sleutel, test, wedstrijd, hard, licht) vervangt de losse lijsten met id's in 43 bestanden. Dit is het grootste verspreide werk, maar elke stap is klein.
- **Je keuzes per sport**: `AppSettings.sportPlan` met per sport de rol, het aantal per week, de dagen van een vaste afspraak en de wens. Dit vervangt `enabledSports`, `sportFrequency` en het sportdeel van `weekShape`. Een migratiestap zet de oude instellingen om, zodat je huidige plan gelijk blijft.
- **Richting en hoofddoel**: één functie `mainGoal()` in plaats van tien kopieën, en `AppSettings.direction`.
- **Fasen zonder doel**: neutrale golven ("Week 2 van 4") zonder bergtochtwissels. De wissels naar bergtocht en wandeldag en de rugzakladder gelden alleen bij een doel van de soort tocht.

### Belasting

Elke log krijgt een belasting van minuten maal sessie-RPE. Ontbreekt de RPE, dan vult de app een waarde in voor die sport en zwaarte, gemarkeerd als aangenomen (zoals `SetLog.rirAssumed`), aan de voorzichtige kant. De kenmerken van de sport worden omgezet naar het bestaande stressprofiel, zodat de beenindex, de 48- en 72-uursregels en de intensiteit vanzelf meedoen. Op Je stand blijft de weekbelasting per soort zichtbaar, nooit als één getal over alle sporten.

### Import

Een activiteit die nu "other" heet, gaat naar de sport waar die activiteitsoort bij hoort (Swim naar zwemmen, Soccer naar voetbal, Padel of Tennis naar padel). Een soort die de app nog niet kent, geeft één keer de vraag "Je deed iets nieuws. Hoe telt dit?" met de rol en de vraag over benen, armen of hele lijf. Daarna nooit meer.

## Deel 6. Situaties

Hoe het in de praktijk loopt, van eenvoudig naar ingewikkeld.

**Een leuk schema, geen doel.** Iemand kiest "Fitter worden", drie dagen, hardlopen en kracht. Hij krijgt kracht, rustige loop, kracht, met een dag ertussen, in golven van vier weken. Op Je stand ziet hij "Je week: 135 van 150 minuten, 2 van 2 keer kracht". Na vier weken: "Goede golf. Doorgaan, rustiger aan, of een doel kiezen?"

**Een beginner.** Wie in de laatste acht weken minder dan twee keer per week sportte, of het zelf zegt, start met hoogstens vier dagen, twee weken alleen rustig, en de eerste harde training pas na vier weken. Het voorstel zegt waarom.

**Meer sporten dan dagen.** Vier dagen, en hij wil hardlopen, kracht, fietsen en zwemmen. Kracht krijgt twee dagen, lopen een, en de vierde dag wisselt tussen fietsen en zwemmen. De app zegt eerlijk: "Fietsen en zwemmen om de week is minder dan onderhoud. Leuk voor de afwisseling, maar je houdt er geen conditie in die sport mee vast."

**Een vaste afspraak.** Voetbaltraining op dinsdag en een wedstrijd op zaterdag. Beide staan elke week vast en tellen als harde dagen. Zware beenkracht komt niet binnen 72 uur na de wedstrijd, dus op woensdag of donderdag; maandag een rustige loop of fietsen. Bij vijf dagen is er dan nog ruimte voor één harde training van ASCEND zelf, niet voor twee.

**Een sport die alleen meetelt.** Iemand speelt padel als het uitkomt. Op donderdag komt er van het horloge een padelpot van 90 minuten binnen, zwaar. De zware beentraining van vrijdag staat nu te dicht erop: "Je speelde gisteren padel. Benen B naar zaterdag?" met Akkoord.

**Een doel met een sport ernaast.** Een 10 km over twaalf weken, en padel op woensdag als vaste afspraak. Lopen krijgt drie keer per week, kracht gaat naar onderhoud (één keer), padel blijft staan en telt als harde dag, dus er komt maar één kwaliteitsloop. In de laatste twee weken vraagt de app: "Padel tot na de wedstrijd laten rusten?" Je kiest zelf.

**Meer van iets richting een doel.** Iemand met de GR5 als doel wil meer kracht. Eerst wordt de bestaande krachtsessie langer. Wil hij een derde krachtdag, dan zoekt de planning een lichte dag; een rugzaksessie levert geen plek in, want die zit op het minimum dat de tocht vraagt. Wil hij juist minder rugzak, onder het minimum, dan komt er een voorstel: "Met één rugzaktocht per maand is de stap naar je volle rugzak in juli groot. Toch doen?"

**Overstappen naar een doel.** Na drie maanden "Fitter worden" kiest iemand een tocht over twintig weken. De app telt de weken, toetst of het haalbaar is, telt de weken ervoor als basis, en stelt het nieuwe schema voor met Akkoord. Wat al gedaan is blijft staan; alleen de toekomst verandert.

**Een sport na een pauze.** Iemand zwemt weer na twee maanden. De eerste twee weken van zwemmen zijn korter dan voor de pauze, en de sessiepiek rekent vanaf de laatste 30 dagen, dus vanzelf voorzichtig.

**De eigenaar van nu.** De GR5 is "Naar een doel: tocht" met de 10 km als tussendoel. Hardlopen, wandelen en kracht worden "ASCEND plant het", fietsen staat uit. De wens staat overal op normaal. De migratie moet precies de huidige planning opleveren, en dat wordt een vaste test (deel 8, ronde 0).

## Deel 7. Instellingen die overzichtelijk blijven

Dit deel volgt uit de doorlichting van alle instellingen door Cartographer Instellingen.

**Het probleem is niet dat er te veel instelbaar is, maar dat elke keuze een eigen rij is.** Er staan nu 133 rijen in de instellingen: 124 gewoon en 9 onder Geavanceerd. Forge alleen heeft er 36. Een nieuwe gebruiker ziet er ongeveer 108, omdat de Garmin- en MacroFactor-rijen dan nog verborgen zijn. Het besluit "alles is instelbaar" blijft staan: geen enkele keuze over gedrag verdwijnt. Wat verandert, is waar ze staan.

**Wat echt weg kan** is alleen wat geen instelling is: navigatie die als rij verkleed is (Forge openen, Reisplanner, Paklijst, Health Connect "Komt later"), de groep Gidsen en kennis (vier verwijzingen, die worden "Naslag"), Versie (wordt een voettekst) en de dubbele schakelaar Markering op Week naast Status van het versturen.

**Wat beter vanzelf kan:** Opslag beschermd (alleen tonen als het mislukt), Adviezen opnieuw berekenen (draait na een update of import, de knop blijft als noodknop onder Geavanceerd), Ochtend begint om (afgeleid van het horloge, de keuze blijft in het blad), Kleding terugzetten (alleen zichtbaar als er iets geleerd is).

**Bundelen tot één rij met een blad.** De opslag verandert niet, en zoeken en de oude links blijven werken. Mijn sportschool (7 rijen naar 1), Weergave op Forge (7 naar 1), Rekenmodel (6 naar 1), Rusttimer (3 naar 1), Weer en kleding (5 naar 1), Wat speelde er (5 naar 1), Wat ik van mijn horloge gebruik (5 naar 1), Trainingen naar je horloge (6 naar 1), Tochten (5 naar 1), Dagen en tijd (3 naar 1), Inzicht na een training (7 naar 1).

**Profielen** waar de keuzes één idee delen: een naam voor een set bestaande waarden, nooit een nieuw veld, met "Aangepast" als je daarna iets los wijzigt.
- Kaarten op Vandaag: Alles, Weinig, Alleen de missie.
- Als horloge en logboek verschillen: Automatisch, Eerst vragen.
- Wat speelde er: Aan, Alleen noteren, Uit.
- Rusttimer: Geluid en trillen, Alleen geluid, Alleen trillen, Uit.

Ambitie en Wijzigingen worden bewust niet samengevoegd tot "rustig, normaal, streng": het zijn twee verschillende vragen (hoe snel bouw je op, en wie beslist).

**Verbergen in plaats van uitgrijzen.** Wat bij een uitgeschakelde instelling hoort, bestaat dan niet. Dat geldt voor de Garmin-rijen zonder koppeling, de doelrijen zonder doel, de tochtrijen zonder tocht en de groep Kracht als je geen kracht doet. Zoeken zegt waarom iets verborgen is ("Zichtbaar zodra Garmin is gekoppeld").

**Zeven groepen in plaats van acht.** Onder "Je training": Sporten en schema, Doel en tochten, Kracht (Forge), Lichaam en herstel. Onder "De app": Vandaag en meldingen, Koppelingen, App en gegevens.

Sporten en schema staat bovenaan en is de plek voor het model uit deel 4:
- **Mijn sporten**: één rij per sport die aan staat, met rechts "2× per week", "Auto" of "Vast: dinsdag", en "Sport toevoegen". Het blad van een sport bevat de rol, hoe vaak, de vaste dag en onderaan Geavanceerd met hoeveel per soort.
- **Mijn week**: Dagen en tijd, Weekindeling, Vrije dagen en vakanties.
- **Hoe ASCEND plant**: Wijzigingen, Opbouw (de huidige Ambitie), Twee trainingen per dag.

Een sport die uit staat kost geen rij. Een nieuwe sport is een regel in de sportenlijst, geen nieuw bestand.

Doel en tochten begint met de richting (deel 4). Zonder doel staan er twee rijen: Ritme en Doel kiezen. Met een doel komen Hoofddoel, Programma, Na je hoofddoel en Tochten erbij.

**Bovenaan het overzicht** komt een kaart "Anders dan het advies" met wat je zelf hebt veranderd, en per regel "Terug naar advies". Elke groep krijgt onderaan "Alles terug naar het advies". Dat helpt het meest tegen het gevoel dat je niet meer weet hoe het staat, en het lost de klacht op die gebruikers bij Runna en Fitbod hebben: dat er geen terugzetten met één tik is.

**Ontwerpregels**, zodat het niet opnieuw dichtgroeit:
1. Een rij is een beslissing die een gewoon mens neemt. Wat je na de eerste week niet meer verandert, gaat in een blad of onder Geavanceerd.
2. Per groep streefgetal negen rijen, hoogstens twaalf, en onder Geavanceerd hoogstens zes. Een test bewaakt dat, zodat een nieuwe rij een andere kost.
3. Geavanceerd alleen bij minstens twee verborgen rijen, met eronder één regel met hun titels.
4. Eén bron per onderwerp. Weer staat nu in drie groepen en gewicht in twee; dat wordt er één.
5. Het gevolg in één zin in het blad ("Dan ..."), nooit op de rij.
6. Een nieuwe instelling krijgt eerst een plek in een bestaand blad. Dit komt naast de werkafspraak "een nieuwe functie zonder instelling is niet af": niet af, maar ook geen extra rij.
7. Hoogstens drie tikken tot een instelling (overzicht, groep, blad), via zoeken twee.

**De telling.** Nu staan er 124 rijen zichtbaar en 9 onder Geavanceerd. Na het voorstel staan er 51 in de gewone weergave (met alles gekoppeld en een doel) en 9 onder Geavanceerd. Alle 137 instellingen blijven bestaan en zijn te vinden.

Nog na te gaan: of de rijen van het Forge-werkscherm iets doen als je je sets in MacroFactor bijhoudt, en of negen rijen op 360 bij 640 px echt zonder scrollen passen. Dat laatste meet Lookout. De exacte waarden van de profielen stemmen we met jou af. Een besluitbestand vervangt de indeling in acht groepen uit `2026-10-22-instellingen-in-groepen.md`, en raakt `2026-10-22-alles-instelbaar.md` niet.

## Deel 8. Bouwen in zeven rondes

Elke ronde is op zichzelf af, gaat door de vaste poorten (Warden, Lookout, screenshots) en laat het plan van wie het nu gebruikt ongemoeid.

**Ronde 0: fundament, niets zichtbaar.** Eén `mainGoal()`. Sporten als data (`data/sports.ts`), met de huidige drie. Rollen op sjablonen in plaats van id-lijsten. En vooral een vaste toets: een nagemaakte gebruiker met de GR5, de 10 km en het huidige weekpatroon krijgt na elke ronde exact dezelfde planning voor een jaar vooruit.

**Ronde 1: instellingen opruimen.** Het voorstel uit deel 7 eerst, zodat de nieuwe keuzes in een opgeruimde structuur landen en niet op een stapel.

**Ronde 2: zonder doel goed.** Richting kiezen (fit blijven, fitter worden, naar een doel). Neutrale golven zonder bergtochtwissels. De kaart "Je week" met 150 minuten en 2 keer kracht. Terugblik en keuze aan het eind van een golf.

**Ronde 3: sporten die meetellen.** Rollen "Alleen meetellen" en "Uit". Import van zwemmen, padel, voetbal, yoga en een eigen sport, met de vraag bij een onbekende soort. De vijf kenmerken en de omzetting naar het stressprofiel. Sessie-RPE als munt, met aangenomen waarden gemarkeerd. Zwemmen van de backlog komt hier als sport die meetelt; zwemmen plannen pas in ronde 5.

**Ronde 4: vaste afspraken.** De rol "Vaste afspraak": terugkerend, nooit verschoven, meegeteld voor benen en harde dagen, de rest eromheen, en de vraag bij een vakantie of tocht.

**Ronde 5: hoe vaak per sport.** De frequentie per sport in de planningsronde in plaats van eenmalig. Meer sporten dan dagen, met wisselen en eerlijk zeggen wat niet past. De algemene limiet op harde dagen. De startvragen uitgebreid met sporten en hoe vaak, en de vorm van de week later te wijzigen (staat nu op de backlog).

**Ronde 6: hoeveel per soort.** Minder, normaal, meer per soort, met de grenzen in drie lagen, voorstellen met wat het kost, en Geavanceerd voor wie de knoppen per soort wil (langste sessie, aantal harde trainingen).

## Deel 9. Wat jij beslist

1. **De richtingen.** Zijn "Fit blijven", "Fitter worden" en "Naar een doel" de goede drie, of wil je er "Herstellen" bij (een paar rustige weken na ziekte of een doel)?
2. **De rollen per sport.** Vier rollen (ASCEND plant het, Vaste afspraak, Alleen meetellen, Uit), of zijn "Vaste afspraak" en "Alleen meetellen" voor jou één ding?
3. **Hoeveel per soort.** Drie standen (minder, normaal, meer), of liever een getal (minuten per week, aantal sessies)? Het advies is drie standen, met getallen onder Geavanceerd.
4. **De richtlijn tonen.** Mag "Je week: 135 van 150 minuten, 2 van 2 keer kracht" zichtbaar zijn zonder doel? Met een doel blijft het één voortgangstaal (de GR5-meters) en komt dit er niet naast.
5. **Waar het woont.** Het advies is de tab Ascend: met een doel zoals nu, zonder doel "Je schema" met je richting en je sporten. De instellingen houden alleen de details.
6. **De volgorde.** Akkoord met ronde 0 en 1 eerst, ook al zie je daar weinig van?

## Wat onzeker is

- De standaardschema's per aantal dagen, de definitie van beginner en de kenmerken per sport zijn afgeleid, niet getoetst. Ze moeten worden geijkt op echte logs.
- Herstel na recreatief voetbal en padel is nauwelijks onderzocht; de 72 uur komt van profs.
- De sessiepiek van 110% buiten hardlopen is een voorzichtige uitbreiding, geen bewijs.
- De ondergrenzen per doel zijn deels expert, vooral rugzak en dagen achter elkaar.
- Dat een plan zonder doel nu een bergtocht krijgt, is uit de code gelezen en niet met een test bevestigd.
- Enkele bronnen zijn alleen via een samenvatting gezien (WHO-detail over twee krachtdagen, ACSM-details, MET-waarden, Impellizzeri 2004 en Kelly). Die moeten worden nagelopen voordat ze in de app komen.
- Van een deel van de apps (Nike Training Club, Future, Ladder, Joggo) zijn de startvragen niet bevestigd; Reddit was niet bereikbaar.

## Bronnen

Richtlijnen en wetenschap: Gezondheidsraad, Beweegrichtlijnen 2017 (https://www.sportenbewegenincijfers.nl/sites/default/files/2018-09/Gezondheidsraad_samenvatting_beweegrichtlijnen_2017.pdf); Bull e.a. 2020, WHO-richtlijnen (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7719906/); Garber e.a. 2011, ACSM; Momma e.a. 2022, spierversterkende activiteit (https://bjsm.bmj.com/content/56/13/755); O'Donovan e.a. 2017, weekendsporters; Spiering e.a. 2021, minimale dosis (https://pubmed.ncbi.nlm.nih.gov/33629972/); Schoenfeld e.a. 2017, volume en spiermassa; Silva e.a. 2018, herstel na voetbal (https://pubmed.ncbi.nlm.nih.gov/29098658/); systematische review padel 2024 (https://lida.sport-iat.de/ta/Record/4089812?lng=en); mini review padel 2023 (https://frontiersin.org/articles/10.3389/fspor.2023.1284063/full); Fanchini e.a. 2015, timing van sessie-RPE. Uit de bestaande rapporten: Foster 2001 en Haddad 2017 (sessie-RPE), Frandsen 2025 (sessiepiek), Schumann 2022 (kracht naast duur), Bontemps 2020 (bergaf), Lolli 2019 en Impellizzeri 2020 (ACWR), Bosquet 2007 (taper), Knapik 2012 en Orr 2021 (rugzak).

Apps: Runna-hulppagina's over trainingsvoorkeuren (https://support.runna.com/en/articles/10393191-how-to-use-training-preferences), focus (https://support.runna.com/en/articles/11598487-how-to-choose-your-training-focus), kracht (https://support.runna.com/en/articles/8216254-choosing-your-strength-goal-and-training-frequency) en crosstraining (https://support.runna.com/en/articles/15899152-how-can-i-incorporate-cross-training-in-runna); TrainerRoad Plan Builder (https://support.trainerroad.com/hc/en-us/articles/360037923191-Plan-Builder-Overview); Garmin adaptieve plannen (https://www.garmin.com/en-MY/blog/running/which-adaptive-training-plan-is-right-for-you/); Athletica-forum over vaste krachtdagen (https://forum.athletica.ai/t/integrating-fixed-strength-days-into-athletica-while-training-for-races/3494); Fitbod over cardio (https://www.fitbod.me/blog/cardio); Peloton Personalized Plans (https://onepeloton.com/blog/personalized-workout-plan); Whoop Strain Target (https://www.whoop.com/thelocker/work-out-frequency-strain-target); Strava Instant Workouts (https://endurance.biz/2026/industry-news/strava-rolls-out-instant-workouts-feature-for-subscribers-worldwide/); Friel over belasting per sport (https://www.goodreads.com/author_blog_posts/9939045-the-weightlifting-pmc-part-1).
