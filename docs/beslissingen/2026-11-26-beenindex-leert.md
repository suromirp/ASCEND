# De beenindex leert van je ochtenden

Datum: 2026-11-26
Status: aangenomen

## Besluit

De beenindex krijgt een eigen factor k op de som van je trainingen, geleerd uit je ochtendantwoorden over je benen. De app stelt k alleen voor, met Akkoord of Liever niet; zonder Akkoord blijft k = 1. Alles wat beslist rekent met max(1, k): de planning wordt nooit soepeler dan het model.

- De formule (`engine/legIndexLearning.ts`). Ijkpunten uit de laatste 90 dagen: per ochtend m = de som van de bijdragen met k = 1, zonder geplande sessies, zonder pijnpunten en zonder spierpijnvloer, alleen logs van voor die dag. Fris geeft een interval 0 tot 8/m, Wat stijf 8/m tot 12/m, Spierpijn en Flink 12/m tot oneindig. Gaat goed telt als Fris. Een punt telt niet bij m kleiner dan 4, beenpijn in de 72 uur ervoor, een ziekte tot 3 dagen na het einde, een tocht tot 2 dagen erna, spierpijn alleen in je bovenlichaam, of als het interval de hele band 0,7 tot 1,4 bevat. Gewicht 0,5 voor Gaat goed en voor een bevestigd voorstel (de herkomst `legsFrom`, of bij een oude ochtend: gelijk aan het voorstel met k = 1), anders 1.
- Pas vanaf 20 gewogen ijkpunten een uitkomst. k_fit is de k van 0,50 tot 2,00 (stap 0,01) met het kleinste gewogen afstandsverlies in ln k; bij gelijkspel het dichtst bij 1. Past slecht als meer dan 40 procent van het gewicht buiten het interval valt (met 10 procent speling): dan geen voorstel. Krimp naar 1 met n/(n+20), begrensd op 0,7 tot 1,4, afgerond op 0,05.
- Een voorstel bij een verschil van minstens 0,10 met de geldende factor, een stap van hoogstens 0,15, en hoogstens één per 28 dagen: een Akkoord of Liever niet in die tijd houdt het stil.
- Waar k telt. Alleen de woorden volgen k ook onder 1: het woord en de balk op de kaart Benen, Je stand (de grafiek en de beendagen) en de voorinvulling van de ochtendvraag. Onder 1 zegt de kaart erbij dat de planning voorzichtig met de standaardindex rekent. Al het andere rekent met max(1, k): de planner (het register in `scheduler.ts`, dat zelf nooit onder 1 gaat), de weekcontrole, het advies voor een test, Lichter, de regel en Je benen zijn nog moe in Forge, de lijfcheck, het voorstelblad en de regel over je volgende test op de kaart Benen. De engine dwingt dat af (`legDayEase`, `forgeWorkout`, `strengthHistory` klemmen zelf op minstens 1).
- Wat nooit soepeler mag, elk getest in `engine/legIndexSafety.test.ts` met 0,7 tegen 1: test- en wedstrijdvrijheid, de testweek, de drempel van 12 en de 48 uur, de lijfcheck en Je benen zijn nog moe, pijn telt +3 en is nooit fris, de spierpijnvloer (8,5, 12 en 8,5 de dag na flink) wordt nooit geschaald, de drempels in `FATIGUE_THRESHOLDS` blijven, de voorinvulling zegt nooit Flinke spierpijn en nooit Fris bij beenpijn, de ochtend na een test blijft een open vraag, de ijkpunten gebruiken nooit de vloer, de pijnpunten of de geldende factor. Plus een eigenschapstest over 300 willekeurige reeksen en een langdurig eenzijdige reeks.
- Opslag, geen vormwijziging (back-up blijft schema 6). Drie optionele velden in de instellingen: `legAnswers` (het archief van wat vooraan uit de 60 ochtendchecks valt, 180 dagen, nooit herschreven), `legFactorLog` (elk besluit met tijdstip: akkoord, liever-niet, standaard, uit; alleen toevoegen; de laatste rij die de factor zet geldt) en `legIndexLearning` ('uit' of afwezig). Op de ochtendcheck `legsFrom`: 'voorstel' als je antwoord gelijk was aan de voorinvulling, anders 'zelf'. Migratiestappen `migrateLegAnswers` en `migrateLegFactorLog` zuiveren een import; terugzetten voegt samen per datum en per besluit, het toestel wint.
- Zien en terugzetten. In Je stand, Benen, de rij Index en je benen: daar staat het voorstel met Akkoord en Liever niet, en wat je ochtenden zeggen. Een Akkoord dat de factor van de planning verandert, gaat eerst als voorstel langs de planning (`usePlanSettingChange`). In Instellingen, Lichaam, Signalen uit je gegevens: Beenindex leert van je ochtenden (aan, het advies, of uit) en Beenindex terug naar de standaard (alleen met een eigen factor). Uit en de standaard zetten een rij met factor 1 en werken meteen; raakt dat de planning (een factor boven 1), dan eerst het voorstel.

## Reden

Het model is een gemiddelde. Wie sneller of trager herstelt, ziet de index vaak naast zijn gevoel liggen. Je ochtendantwoord is een grove, maar eerlijke maat (docs/onderzoek/Beenindex leert van je ochtenden.md). Een factor op de trainingen is de kleinste stap die dat dicht, met genoeg ochtenden te schatten en makkelijk uit te leggen. Omdat je antwoord ruis heeft en een voorstel jezelf kan bevestigen, krimpt de schatting naar 1, telt een bevestiging half en is elke stap klein. Omdat een te lage index een test of zware dag op vermoeide benen kan zetten, mag de planning er nooit soepeler door worden; alleen de woorden mogen zeggen dat je frisser bent.

## Alternatieven

- Een eigen halfwaardetijd of eigen drempels: meer vrijheid, maar met 20 tot 60 grove antwoorden niet betrouwbaar te schatten en de veiligheidsregels zouden meebewegen.
- Vanzelf bijstellen zonder Akkoord: in strijd met de regel dat een planningswijziging een voorstel is.
- Een apart record voor een getoond voorstel, zodat de 28 dagen ook na alleen tonen tellen: niet gekozen. Het voorstel blijft staan tot je kiest en is hetzelfde voorstel; de rust telt vanaf Akkoord of Liever niet. Zo blijft de opslag twee lijsten.
- Een nieuwe schemaVersion: niet nodig, de velden zijn optioneel en additief; een oude back-up importeert en geeft de standaardindex.

## Bron

docs/onderzoek/Beenindex leert van je ochtenden.md (sportwetenschapper, 26 november 2026, met de regels F1 tot F13). Opdracht van de eigenaar, 26 november: geen proefversie, het moet kloppen.

## Vervangt

Niets. Het model in `engine/legFatigue.ts` blijft het model; k = 1 is precies de index van voor dit besluit.

## Terugdraaien

Per gebruiker: Instellingen, Lichaam, Signalen, Beenindex leert van je ochtenden uit, of Beenindex terug naar de standaard; beide zetten k direct op 1 en bewaren je antwoorden. In de code: `legFactorsOf` laten teruggeven `{ safe: 1, shown: 1 }` zet de hele app terug op het model; de opgeslagen lijsten mogen blijven staan.

## Bekend randgeval

Ongedaan maken van een instellingenwijziging zet de oude instellingen terug, ook `legAnswers`. Bevatte die wijziging ook een archiefstap (een ochtendcheck die vooraan uit de 60 viel), dan kan een rij uit het archief verdwijnen terwijl de ochtendcheck al weg is. Het gevolg is één ochtend minder om van te leren, nooit een soepeler planning.
