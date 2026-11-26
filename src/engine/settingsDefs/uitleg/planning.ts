// ASCEND: de uitleg achter de i bij de instellingen van de groep Planning, op id van de verklaring
// (docs/visie/Ontwerp instellingen op een plek.md, stap 3). Alleen geladen in Instellingen of als je op de i tikt
// (data/settingsHelpKeys.ts), zodat deze tekst niet bij de start van de app laadt. De verklaring zegt `help: true`.

import type { SettingsHelp } from '../../../data/settingsHelp';

export const PLANNING_UITLEG: Record<string, SettingsHelp> = {
  trainingstijd: {
    title: 'Trainingstijd per dag',
    lead: 'Hoeveel tijd je normaal per dag hebt. Trainingen komen op dagen waar ze in passen, zonder tweede training als het niet past. Een beetje ruimte erboven mag.',
    points: [
      { head: 'Veranderen', text: 'je planning verandert zoals je bij Wijzigingen koos: eerst een voorstel, of meteen met een melding en ongedaan maken.' },
    ],
  },
  rustdag: {
    title: 'Rustdag',
    lead: 'De dag waarop je niet traint. Een andere dag is eerst een voorstel, pas na Akkoord verandert er iets.',
    points: [
      { head: 'Altijd', text: 'het weekend blijft voor je lange trainingen.' },
      { head: 'Bezet', text: 'staat er deze week een training op je rustdag, dan heet een vrije dag in Week "Rustdag deze week", liefst niet vlak voor een zware dag. Er verschuift niets.' },
    ],
  },
  meerdere: {
    title: 'Twee trainingen per dag',
    lead: 'Twee trainingen op één dag, als je tijd het toelaat?',
    points: [
      { head: 'Automatisch', text: 'Je tijdbudget per dag beslist.' },
      { head: 'Nee', text: 'nooit meer dan één training per dag.' },
      { head: 'Zwaar', text: 'benen en een zware loop op één dag staat apart onder Geavanceerd.' },
    ],
  },
  krachttraining: {
    title: 'Krachttraining',
    lead: 'Kracht helpt bij bergtochten: sterke benen en romp vangen de klappen van het dalen op en sparen je knieën.',
    points: [
      { head: 'Aan', text: 'het advies. Je krachttrainingen staan in je week, op de dagen die bij je benen passen.' },
      { head: 'Uit', text: 'er komt geen krachttraining meer in je planning, ook geen eigen gewicht. Je week houdt lopen en rust. Wat je al deed blijft staan.' },
      { head: 'Je planning', text: 'een andere keuze is altijd eerst een voorstel met Akkoord of Liever niet.' },
    ],
  },
  sporten: {
    title: 'Sporten',
    lead: 'Per sport kies je wat ermee gebeurt. Verandert een keuze je planning, dan gaat dat zoals je bij Wijzigingen koos. Kracht is altijd eerst een voorstel.',
    points: [
      { head: 'Plan dit voor mij', text: 'Het komt in je week, op dagen die bij je benen passen. Alleen voor hardlopen, wandelen en fietsen.' },
      { head: 'Telt mee als ik het doe', text: 'je plant het zelf. Wat je doet telt mee voor je benen en je week.' },
      { head: 'Negeren', text: 'Er gebeurt niets mee. Je kunt het wel loggen.' },
    ],
  },
  'hoeveel-per-soort': {
    title: 'Hoeveel per soort',
    lead: 'Per soort training kies je Minder, Normaal of Meer. Normaal is het advies. Eerst een voorstel, pas na Akkoord verandert er iets.',
    points: [
      { head: 'De soorten', text: 'Kracht, Lange duur (je lange loop van de week), Harde training (de loop waarbij je hijgt, zoals intervallen of tempo) en Rustige duur.' },
      { head: 'Eerst de duur', text: '15 procent korter of langer, afgerond op 5 minuten. Nooit meer dan 110 procent van je langste training van die soort in de laatste 30 dagen.' },
      { head: 'Dan het aantal', text: 'Meer zet er een training bij op een vrije dag, als de regels het toelaten. Minder laat er een weg als er meer dan één staat. De 48 uur tussen zware beendagen, de rust na een tocht of wedstrijd, je rustdag en het aantal harde dagen schuiven nooit.' },
    ],
  },
  'bundel-sporten-tellen': {
    title: 'Hoe sporten meetellen',
    lead: 'Zwemmen, padel en voetbal komen niet in je planning, maar ze kunnen meetellen voor je benen en je week. Wat een sport met je benen doet is afgeleid uit onderzoek en niet getoetst.',
    points: [
      { head: 'Vragen bij een nieuwe sport', text: 'komt er van je horloge een sport die je nog niet koos, dan vraagt Vandaag hoe hij telt. Tot je antwoordt telt hij niet mee. Uit: hij telt meteen mee.' },
      { head: 'Vragen hoe zwaar het was', text: 'Rustig, Pittig, Zwaar of Heel zwaar. Hoe zwaarder, hoe meer het telt voor je benen. Uit: de gebruikelijke zwaarte telt, een tikje voorzichtiger.' },
      { head: 'Rust na een zware sport', text: 'Ruim houdt na een voetbalwedstrijd 72 uur en na padel of een voetbaltraining 48 uur vrij van zware beenkracht. Korter maakt dat 48 en 24 uur. Het bewijs voor recreanten is matig. De 72 uur komt van onderzoek bij profs. Staat een beendag te dicht na je sport, dan zie je in Week een voorstel.' },
    ],
  },
  wijzigingen: {
    title: 'Wijzigingen',
    lead: 'Wanneer een wijziging in je planning eerst een vraag is: altijd, of alleen bij grote dingen.',
    points: [
      { head: 'Vraag eerst', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Alleen wat vanzelf gepland was, zet de weekcontrole meteen recht, met de melding Planning bijgewerkt en ongedaan maken.' },
      { head: 'Deels zelf', text: 'weken verder weg passen zich vanzelf aan, met een melding. Deze en volgende week, of iets schrappen, vraagt altijd eerst.' },
      { head: 'Alles zelf', text: 'alles meteen, met een melding en ongedaan maken.' },
    ],
  },
  ambitie: {
    title: 'Ambitie',
    lead: 'Hoe snel de minuten van je lopen en tochten groeien.',
    points: [
      { head: 'Altijd', text: 'een training wordt nooit meer dan 10% langer dan je langste van de afgelopen maand.' },
      { head: 'Waarom', text: 'pezen en botten wennen langzamer dan je conditie.' },
      { head: 'Stevig', text: 'valt vanzelf terug op Standaard bij pijn of trainingen die te zwaar voelen.' },
    ],
  },
  'lange-loop': {
    title: 'Groei van de lange loop',
    lead: 'Hoe snel je lange loop groeit naar je hardloopwedstrijd. Het advies blijft binnen 110% van je langste loop. Daarboven vond het onderzoek geen veilige marge.',
    points: [
      { head: 'Volgens het onderzoek', text: 'hoogstens 10% per week, met de lichtere week van de golf en de piek om de week. Tot 30% per twee weken gaf geen hoger risico, boven 30% wel (Nielsen 2014, matig). Bij Stevig mag de piek elke week staan.' },
      { head: 'Rustiger en Heel rustig', text: 'een stap om de twee weken, of per blok van vier weken.' },
      { head: 'Sneller dan het onderzoek', text: 'onder Geavanceerd, wekelijks tot 120% van je langste loop van 30 dagen. Boven 10% gaf in het grootste onderzoek ongeveer 64% meer kans op een overbelastingsblessure (Frandsen 2025, matig).' },
    ],
  },
  twijfeltest: {
    title: 'Twijfeltest eerst vragen',
    lead: 'Is een testloop duidelijk trager dan je vorige, dan komt eerst de vraag of hij meetelt voor je tempo\'s.',
    points: [
      { head: 'Waarom', text: 'fietsen vooraf, wind of vermoeide benen maken een test trager. Zonder antwoord blijven je tempo\'s die van je vorige test.' },
      { head: 'Telt mee of niet', text: 'bij Telt mee eerst een voorstel, pas na Akkoord verandert er iets. Telt niet mee laat de test in je logboek, maar hij telt niet voor je tempo\'s en je voorspelling.' },
      { head: 'Uit', text: 'de laatste test telt altijd.' },
    ],
  },
  'test-stilstaan': {
    title: 'Stilstaan bij een testloop',
    lead: 'Staat je horloge niet stil als jij voor een stoplicht wacht, dan loopt de klok door in je snelste 5 km.',
    points: [
      { head: 'Niet meetellen', text: 'de tijd dat je stilstond telt niet in je snelste 5 km. Je ziet hoe vaak en hoelang. Na meer dan een minuut of meer dan 3 stops staat erbij dat de test iets te gunstig is.' },
      { head: 'Meetellen', text: 'de klok loopt door. Pauzeert je horloge vanzelf, dan telt een stuk met zo\'n gat niet mee.' },
      { head: 'Je tempo\'s', text: 'veranderen niet vanzelf. Verandert er door het stilstaan een tempo, dan komt eerst de vraag om Akkoord in het logblad.' },
    ],
  },
  'drempel-uit-test': {
    title: 'Drempel uit je test',
    lead: 'Je hartslag loopt in een halfuur voluit hoger op dan in een stappentest; ASCEND trekt er 2 procent af.',
    points: [
      { head: 'Voorzichtig', text: '98 procent van je gemiddelde hartslag over de laatste 20 minuten van je test. Liever iets te rustig dan te hard.' },
      { head: 'Zoals Friel', text: '100 procent, zoals in de test van 30 minuten van Friel en in TrainingPeaks.' },
      { head: 'Een keuze, geen meting', text: 'het verschil is 3 tot 4 slagen, zo groot als de ruis van één test. Een andere keuze verandert niets stil; hoogstens krijg je een nieuw voorstel.' },
    ],
  },
  'test-zonder-band': {
    title: 'Test zonder borstband',
    lead: 'Aan de pols zit een horloge er bij hard lopen 5 tot 15 slagen naast, een borstband 1 tot 2.',
    points: [
      { head: 'Telt niet voor je drempel', text: 'zag ASCEND je band niet tijdens het teststuk, dan tellen je tempo\'s wel en blijft je drempel staan. Was je band er bij je laatste lopen meestal wel, dan vraagt ASCEND of je hem om had.' },
      { head: 'Telt met ruime marge', text: 'een test aan de pols telt met een marge van 10 slagen, en pas als twee tests binnen 5 slagen van elkaar liggen.' },
      { head: 'Hoe ASCEND je band ziet', text: 'aan de balans van je grondcontact, die alleen een band op je romp meet. Een band van een ander merk ziet ASCEND niet; zeg dan bij de test dat je hem om had.' },
    ],
  },
  'test-klaar-melden': {
    title: 'Melden op een testdag',
    lead: 'ASCEND leest uit je laatste loop of je klaar bent voor een test: je borstband, elke seconde opslaan en de RR-reeks van je band.',
    points: [
      { head: 'Wat je ziet', text: 'onder Klaar voor je test in Instellingen bij Koppelingen staan de drie feiten van je laatste loop, zonder iets af te vinken.' },
      { head: 'Op een testdag', text: 'mist je band of slaat je horloge niet elke seconde op, dan één regel in de Briefing. Anders niets.' },
      { head: 'Waarom', text: 'zonder borstband telt een test niet voor je drempel; aan de pols zit een horloge er bij hard lopen 5 tot 15 slagen naast.' },
    ],
  },
  'korte-test': {
    title: 'Korte test',
    lead: 'Elke week 4 minuten op je drempeltempo aan het begin van een rustige loop. Een losse test zegt weinig, een reeks wel.',
    points: [
      { head: 'Eerst een voorstel', text: 'in de Briefing van een rustige loop. Pas na Akkoord staat de test elke week aan het begin van je eerste rustige loop, met een vast testtempo.' },
      { head: 'Wat je doet', text: '10 minuten inlopen, 4 minuten op je testtempo, 1 minuut rechtop stilstaan, daarna je gewone loop. Met je borstband om, op een vlak stuk.' },
      { head: 'Wat je ziet', text: 'bij die loop je hartslag in de laatste minuut, je tempo en hoeveel je hartslag zakte. Na vier tests één woord: Normaal, Beter of Let op.' },
      { head: 'Alleen tekst', text: 'je zones en je drempel veranderen er nooit door. Dat doet alleen je testloop.' },
      { head: 'Uit', text: 'geen voorstel en geen test in je loop. Zet je hem weer aan na Liever niet, dan komt het voorstel terug.' },
    ],
  },
  'nieuwe-test': {
    title: 'Nieuwe test voorstellen bij stilstand',
    lead: 'Stond je veel stil tijdens je testloop, dan krijg je een nieuwe poging als voorstel.',
    points: [
      { head: 'Wanneer', text: 'meer dan een minuut stilstand of meer dan 3 keer stilstaan in je snelste 5 km, of een test die nog op je antwoord wacht.' },
      { head: 'Wat er gebeurt', text: 'je eerstvolgende harde loop, minstens 3 dagen later, wordt een testloop van 5 km. Er komt geen training bij. Wat in de weg staat schuift mee in hetzelfde voorstel. Een zware beendag of lange duurloop kan daarbij vervallen.' },
      { head: 'Alleen met Akkoord', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Na Liever niet krijg je er voor deze test geen vraag meer over. Is er binnen 10 dagen geen goede dag, dan komt er niets.' },
    ],
  },
  'test-rust': {
    title: 'Rust voor een test',
    lead: 'Een testloop laat zien wat je kunt als je benen fris zijn. Daarom zit er rust tussen een zware dag en je test.',
    points: [
      { head: '72 uur', text: 'het advies. Zoveel tijd na de laatste zware loop- of beendag: een zware beendag, de lange duurloop, zware heuvels of intervallen, een bergtocht.' },
      { head: '48 uur', text: 'voor als je benen snel herstellen of je week vol is.' },
      { head: 'Wat er gebeurt', text: 'een nieuwe of gemiste test komt alleen op een dag met genoeg rust. Staat een test te dicht op een zware dag, dan meldt Week het met een voorstel. Wat jij vastzette verschuift niet zonder jouw Akkoord.' },
    ],
  },
  'rustdag-terug': {
    title: 'Rustdag terugzetten voorstellen',
    lead: 'Liet een voorstel je rustdag vervallen en is die dag later weer leeg, dan krijg je een voorstel om hem terug te zetten.',
    points: [
      { head: 'Wanneer', text: 'op je vaste rustdag, als er die dag niets gepland of gedaan is en de week zijn rust niet al op een andere dag heeft.' },
      { head: 'Niet', text: 'als je de twee dagen ervoor niet trainde, als je de rustdag zelf oversloeg, of als een gemiste test of sleuteltraining van je doel op die dag past.' },
      { head: 'Alleen met Akkoord', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Na Liever niet blijft de dag leeg en krijg je er geen vraag meer over.' },
    ],
  },
  weekvoorstel: {
    title: 'Voorstel bij een probleem in de week',
    lead: 'Klopt er iets niet in je week en is het niet vanzelf te herstellen, omdat jij of een eerder voorstel de training vastzette, dan krijg je een voorstel.',
    points: [
      { head: 'Wat telt als probleem', text: 'geen rustdag, zware beendagen te dicht op elkaar, twee harde lopen op een dag, een zware training na een test, twee volle lange trainingen, benen niet fris voor een test.' },
      { head: 'Nooit stil', text: 'eerst een voorstel, pas na Akkoord verandert er iets. In een volle week kan de lichtste training vervallen, nooit een lange duurloop, harde loop, test, wedstrijd of tocht.' },
      { head: 'Liever niet of uit', text: 'je week blijft zoals hij is en de melding blijft staan. Uit haalt alleen de knop met het voorstel weg.' },
    ],
  },
  'week-na-keuze': {
    title: 'Melding na jouw keuze',
    lead: 'Koos je op Vandaag Benen fris en blijft een zware beendag staan, dan zegt Week dat jij dat koos.',
    points: [
      { head: 'Met jouw keuze', text: 'de melding blijft, met jouw keuze erbij. Het voorstel staat nog achter een gewone tekstknop.' },
      { head: 'Gewone melding', text: 'Week meldt het zoals altijd, met Bekijk voorstel als hoofdknop.' },
      { head: 'Alleen vandaag', text: 'je antwoord geldt voor vandaag en voor die ene training. Er verandert niets in je planning.' },
    ],
  },
  'sport-duur': {
    title: 'Duur aanpassen na een sport',
    lead: 'Met een zware vaste sport of een gelogde sportdag kan een training van ASCEND in die week te veel zijn. Dan wordt hij rustiger of korter.',
    points: [
      { head: 'Eerst een voorstel', text: 'het advies. Week zegt wat er zou veranderen, met de minuten ervoor en erna. Pas na Akkoord verandert er iets; na Liever niet blijft je week zoals hij is.' },
      { head: 'Vanzelf, met melding', text: 'de training wordt meteen aangepast en je ziet Planning bijgewerkt. Het Logboek van voorstellen bewaart wat er veranderde.' },
      { head: 'Zonder sport', text: 'verandert er niets: deze keuze geldt alleen als een sport de oorzaak is.' },
    ],
  },
  'week-vol': {
    title: 'Vragen als je week te vol wordt',
    lead: 'Viel er in je week een dag weg en is de rest te vol, dan komt de vraag welke training mag vervallen.',
    points: [
      { head: 'Wanneer', text: 'na een gemiste of naar later gezette training, bij twee dagen met twee trainingen, twee trainingen meer dan dagen, vier loopdagen op rij of drie zware dagen achter elkaar.' },
      { head: 'Het advies', text: 'eerst de extra training die je via een voorstel kreeg, dan wat het minst telt voor je doel. Nooit een test, een wedstrijd, je sleuteltraining of wat je zelf neerzette.' },
      { head: 'Alleen met Akkoord', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Na Liever niet blijft je week staan en zegt Week dat hij vol is, na Akkoord niet meer. Uit: geen vraag, alleen die regel in Week.' },
    ],
  },
  'zonder-sportschool': {
    title: 'Kracht zonder sportschool',
    lead: 'De eerste keuze voor kracht als je in Week een periode zonder sportschool toevoegt. Per periode kun je het anders kiezen.',
    points: [
      { head: 'Eigen gewicht', text: 'een krachttraining wordt op dezelfde dag een korte sessie met je eigen gewicht, 15 tot 20 minuten: squats, lunges, push-ups en kuitheffingen.' },
      { head: 'Laten vervallen', text: 'kracht vervalt in die periode. Lopen blijft.' },
      { head: 'Altijd', text: 'je ziet eerst een voorstel. Een periode die al staat, houdt zijn eigen keuze.' },
    ],
  },
  'vakantie-achteraf': {
    title: 'Periode achteraf vastleggen',
    lead: 'Vergeten een vakantie of periode weg te zetten, of duurde hij langer? Dan leg je hem achteraf vast of verleng je hem.',
    points: [
      { head: 'Wat er gebeurt', text: 'dagen die voorbij zijn tellen als weg, niet als gemist. Er verschuift niets en je logs blijven zoals ze zijn: een dag met een training blijft gedaan.' },
      { head: 'Terugkomen', text: 'zo\'n periode telt ook mee voor de rustiger instap na een pauze, als hij net voorbij is.' },
      { head: 'Hoe ver terug', text: 'het advies is 4 weken. Verder terug verandert weken die je al lang afsloot.' },
      { head: 'Niet achteraf', text: 'dan moet een periode nog lopen of nog komen, zoals vroeger.' },
    ],
  },
  'vakantie-schuiven': {
    title: 'Rond een vakantie schuiven',
    lead: 'Hoe je weken rond een vakantie eruitzien.',
    points: [
      { head: 'Flink', text: 'Alle werkbare dagen van de weken rond je vakantie tellen mee, ook over de weekgrens. De indeling met genoeg rust tussen zware beendagen en zo min mogelijk dubbele dagen wint. Wat niet past, vervalt met één zin erbij.' },
      { head: 'Weinig', text: 'een training schuift alleen naar de dichtstbijzijnde dag van zijn eigen week die past, of vervalt.' },
      { head: 'Altijd', text: 'twee zware beendagen staan nooit binnen 48 uur en wat je zelf vastzette blijft staan. Het geldt voor een vakantie zonder training die je hierna toevoegt of wijzigt. Je ziet het eerst in het voorstel.' },
    ],
  },
  'bundel-niet-doorgegaan': {
    title: 'Training die niet doorging',
    lead: 'Wat er gebeurt met een training die een paar dagen voorbij is zonder log. Er komt nooit een verzonnen log.',
    points: [
      { head: 'Vragen', text: 'één vraag op Vandaag, de oudste eerst. Niet gedaan zet hem op overgeslagen, Toch gedaan opent het gewone invullen, Niet nu laat hem rusten. Ouder dan een week komt er geen vraag meer, en op een racedag niet. Wat op een vakantie of tocht stond is nooit gemist; wat ervoor nog open stond vervalt bij een ziekmelding of vakantie, met één regel op Vandaag.' },
      { head: 'Zelf overslaan', text: 'Hij gaat op overgeslagen, met een melding en Ongedaan maken. Een test, een wedstrijd en wat je zelf vastzette krijgen toch de vraag.' },
      { head: 'Niets doen', text: 'hij blijft als gemist in je week staan.' },
    ],
  },
  'lange-loop-benen': {
    title: 'Beenkracht de dag na de lange duurloop',
    lead: 'Kracht is een dag na een rustige lange loop meestal weer op niveau. Zet dit aan als je liever een vrije dag houdt dan 48 uur tussen die twee.',
    points: [
      { head: 'Uit', text: 'het advies. 48 uur tussen de lange duurloop en een zware beendag, in beide volgordes.' },
      { head: 'Aan', text: 'beenkracht mag de dag na de lange duurloop, niet als de dag ervoor al zwaar was voor je benen. Drie zware beendagen op rij komen er nooit.' },
      { head: 'Altijd', text: 'kracht de dag vóór de lange duurloop blijft 48 uur. Je planning verandert zoals je bij Wijzigingen koos: eerst een voorstel, of meteen met een melding en ongedaan maken.' },
    ],
  },
  'bundel-slepen': {
    title: 'Trainingen slepen in Week',
    lead: 'Sleep een training met het greepje naar een andere dag. Het gaat zoals Verplaatsen in het actieblad. Uit haalt de grepen weg.',
    points: [
      { head: 'Een botsing', text: 'twee zware beendagen binnen 48 uur, of je rustdag, zie je al tijdens het slepen. Bij het loslaten krijg je een voorstel met Akkoord. Liever niet laat alles staan.' },
      { head: 'Loslaten op een training', text: 'staat er op die dag precies één training die mag bewegen, dan ruilen de twee van dag. Liever samen op één dag? Kies dat bij Loslaten op een training.' },
      { head: 'Test en wedstrijd', text: 'een testloop verplaats of ruil je altijd met Akkoord. Een wedstrijd verplaats je via je doel op de Ascend-tab. Een gewone verplaatsing gaat meteen, met Ongedaan maken.' },
    ],
  },
  'loslaten-training': {
    title: 'Loslaten op een training',
    lead: 'Wat er gebeurt als je in Week een training loslaat op een dag waar al één training staat die mag bewegen.',
    points: [
      { head: 'Ruilen', text: 'het advies. De twee ruilen van dag, zodat elke dag één training houdt.' },
      { head: 'Samen', text: 'de training komt erbij op die dag.' },
      { head: 'Altijd', text: 'een botsing zie je tijdens het slepen, met eerst een vraag. Een gewone ruil gaat meteen, met Ongedaan maken in de melding.' },
    ],
  },
  'volgorde-stand': {
    title: 'Volgorde van Je stand',
    lead: 'Kies de volgorde van de regels en de rijen op Je stand. Je planning en je cijfers veranderen er niet door.',
    points: [
      { head: 'Regels en rijen', text: 'Benen, Belasting en Ritme zijn de drie regels bovenaan; Kracht, Lopen en Wat speelde er de rijen in de lijst. Hun volgorde onderling bepaalt wat eerst staat.' },
      { head: 'Zonder slepen', text: 'kies per blok Hoger of Lager.' },
      { head: 'Terug naar standaard', text: 'zet alles terug. Een blok dat in de instellingen uit staat, houdt zijn plek.' },
    ],
  },
  'vakantie-opzij': {
    title: 'Opzij voor een vakantie',
    lead: 'Wat er gebeurt met een training die moet wijken voor een vakantie of de lichte dagen rond een tocht.',
    points: [
      { head: 'Liever laten vervallen', text: 'de training schuift naar een andere dag van die week, maar niet vlak voor of na zijn volgende keer. Een wekelijkse training houdt minstens vier dagen afstand. Lukt dat niet, dan vervalt hij.' },
      { head: 'Toch verschuiven', text: 'de training gaat naar elke dag van die week die past, ook kort voor zijn volgende keer.' },
      { head: 'Altijd', text: 'twee zware beendagen staan nooit binnen 48 uur en wat je zelf vastzette blijft staan. Het geldt voor nieuwe en gewijzigde periodes. Je ziet het eerst in het voorstel.' },
    ],
  },
  'zones-na-test': {
    title: 'Zones bijwerken na een test',
    lead: 'Na een testloop die meetelt krijg je een nieuwe drempelhartslag als voorstel, als die duidelijk anders is.',
    points: [
      { head: 'Wat je ziet', text: 'per zone het oude en het nieuwe getal, voor je hartslag en je tempo\'s. Je tempo\'s volgen je test al.' },
      { head: 'Een schatting', text: '98 procent van je hartslag over de laatste 20 minuten van je test, met een marge van 5 slagen. Alleen bij een test van 24 tot 40 minuten met je borstband om. Geen labtest.' },
      { head: 'Drie tests samen', text: 'je drempel volgt het midden van je laatste drie tests van het afgelopen jaar. Eén test schommelt 3 tot 4 slagen; drie samen zijn rustiger.' },
      { head: 'Alleen met Akkoord', text: 'eerst een voorstel, pas na Akkoord verandert er iets. Na Liever niet krijg je voor dit getal geen vraag meer; een volgende test kan een nieuw voorstel geven.' },
    ],
  },
  'instap-rustdag': {
    title: 'Gemiste training op je rustdag',
    lead: 'Na een vakantie of een stille periode zonder ziekte zet de rustiger instap een lichte training die je miste op je eerste rustdag in die zeven dagen.',
    points: [
      { head: 'Welke training', text: 'de laatste die je miste in de pauze of de dagen terug: kracht of een rustige loop, nooit een test, een harde loop of de lange duurloop. Vandaag telt nog niet als gemist.' },
      { head: 'Grenzen', text: 'geen zware benen binnen 48 uur van een andere zware beensessie, en een training die je zelf vastzette blijft staan. Hij duurt net zo kort als de rest van de instap.' },
      { head: 'Na ziekte', text: 'blijft de rustdag een rustdag.' },
      { head: 'Alleen met Akkoord', text: 'het hoort bij het voorstel van de rustiger instap; Liever niet laat alles staan. Uit: de instap zet niets op je rustdag.' },
    ],
  },
};
