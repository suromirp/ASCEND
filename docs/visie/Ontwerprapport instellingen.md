# Ontwerprapport instellingen

Cartographer Instellingen, 1 november 2026. Een voorstel, nog geen besluit en nog niets gebouwd.

Bronnen: `CLAUDE.md` (Design, Zee en berg, Stem, de werkafspraak over instellingen), `docs/beslissingen/2026-10-22-alles-instelbaar.md`, `2026-10-22-instellingen-in-groepen.md`, `2026-10-26-instellingen-opruimen.md`, `2026-10-26-advies-anders.md`, `docs/architectuur/bediening-en-beweging.md`, `docs/onderzoek/ASCEND voor iedereen.md` (deel 7), `docs/onderzoek/Android-app.md`, `docs/visie/Sporten die meetellen.md`, `docs/visie/Ontwerp en gebruik.md`, `docs/backlog.md`, de app-kaart `docs/app-kaart/instellingen.md` en de code in `src/data/settingsLayout.ts`, `settingsIndex.ts`, `settingsHelp.ts`, `src/engine/settingsSummary.ts`, `settingsStatus.ts`, `src/components/settings/` en `src/pages/settings/`.

## Waar dit over gaat

De acht groepen onder het tandwiel en de bladen eronder. Wat goed staat, wat je zoekt en niet vindt, wat samen kan of weg, waar uitleg ontbreekt en waar de naam of de waarde in de rij niet zegt wat er staat. En of de indeling de komende maanden kan dragen: de Android-app met toestemmingen, Health Connect als bron, het citaat onderaan Vandaag, trainingen die niet doorgingen en de rustdag die terugkomt.

Alles hieronder blijft binnen de vaste regels. Elke instelling is één `SettingsRow` met de uitleg achter de `InfoButton` en de waarde uit `engine/settingsSummary.ts`. Elke keuze blijft instelbaar, met het advies als standaard. Er komt geen nieuwe kleur, geen nieuw onderdeel en geen nieuwe groep. Alle id's uit `settingsIndex.ts` blijven gelijk, zodat ankers, zoeken en `settingsDiff` blijven werken; een verhuizing is een andere regel in `PAGE_ROWS`, `MOVED` of `SHOW_WHEN`.

## Wat goed is en blijft

- De opzet zelf: een overzicht met drie vakken, een zoekveld en acht groepen, verdeeld over "Je training" en "De app". Het past op één scherm van 360 px en de eigenaar heeft het goedgekeurd.
- De regel voor een rij: titel links, waarde rechts, hoogstens één regel eronder met een feit, uitleg achter de InfoButton. Dat houdt de pagina's rustig en voorspelbaar.
- Zoeken met synoniemen, met bij een verborgen instelling de reden ("Zichtbaar zodra Garmin is gekoppeld") en een tik naar de rij die het oplost. Dit is het sterkste deel van de instellingen.
- Verbergen in plaats van uitgrijzen, op één plek geregeld in `SHOW_WHEN`.
- Bundels met een blad voor keuzes die bij elkaar horen (Rusttimer, Je sportschool, Weer en kleding, Wat speelde er).
- Het label "aangepast" op de plek zelf en de ene rij Aangepaste instellingen onder Gegevens en back-up.
- Wat de planning raakt (rustdag, ambitie, de lange zondag, rust na een bergtocht, na je hoofddoel, richting, golven) gaat altijd via een voorstel met Akkoord. Dat blijft precies zo.
- Mint gedempt voor een schakelaar die aan staat, zodat de ene gevulde mint knop het accent blijft.

## Wat niet goed is

1. **De ochtend staat in drie groepen.** Ochtendcheck in het blad Kaarten, Ochtendkaart, Ochtend begint om en Vragen bij een korte nacht onder Geavanceerd van Vandaag en meldingen, Twee van drie in Signalen uit je gegevens bij Lichaam, en slaap, rusthartslag en HRV bij Koppelingen. Wie de ochtendkaart wil aanpassen, vindt maar een deel.
2. **Het weer staat in drie groepen.** Plaats en Weer en kleding bij Vandaag en meldingen, Hitte bij je tempo en Luchtkwaliteit bij Lichaam, en de gids bij Gidsen en kennis. Hitte en luchtkwaliteit zijn regels in de weerregel bij je training; daar zoek je ze.
3. **Gewicht staat op twee plekken.** Lichaamsgewicht bij Lichaam, Gewicht gebruiken bij MacroFactor in Koppelingen. Met Health Connect komt er een derde bron bij, en dan moet er één plek zijn waar je kiest waar je gewicht vandaan komt.
4. **De reeksen van je horloge staan op twee plekken.** Details van loopjes in Koppelingen, Volledige reeks bewaren, Reeksen in back-up en Ruimte van reeksen in Gegevens en back-up. Ruimte op dit toestel en Ruimte van reeksen zijn twee rijen over dezelfde vraag.
5. **Getallen zonder uitleg in de groepsrijen.** "9 aan" bij Vandaag en meldingen zegt niet waarvan. "Rust ma, 6 dagen" laat raden of het zes trainingsdagen zijn. "12 dagen" bij de back-up zegt niet dat het geleden is. Lichaam toont "Leeg" en Koppelingen "Geen", wat klinkt als een fout.
6. **Zonder doel klopt het overzicht niet.** Het vak Fase toont "Basisfase, week 1 van 16" terwijl het vak ernaast zegt dat er geen doel is. Zonder doel werk je in golven met een richting; dat hoort in het vak.
7. **De drie rijen van Klaar voor je doel staan er ook zonder doel.** Weging bij een doeltijd, Groei bij het rekenen en Marge bij een tijdslimiet hebben geen regel in `SHOW_WHEN` en staan op de pagina Doel en tochten, ook als er niets is om voor te rekenen.
8. **De testloop is verspreid.** Drie rijen over de testloop staan los in Planning, de vierde (Doeltijd aanpassen voorstellen) bij Doel en tochten.
9. **Zonder doel zit het belangrijkste in een blad.** Richting, Weekbudget, Golven en Beginnersstart staan achter de rij Zonder doel, terwijl de rijen voor een doel dan verborgen zijn. Zonder doel is de pagina daardoor bijna leeg en zit wat je wél kunt kiezen twee tikken diep.
10. **Rustdag zit drie tikken diep.** Planning, Dagen en tijd, Rustdag, dan het voorstel. Het blad Dagen en tijd is de enige rij in de sectie Je week. De rustdag is een van de weinige keuzes die je echt eens verandert.
11. **Rijen die niet bij hun groep horen.** Lichter bij vermoeide benen staat bij Vandaag en meldingen maar gaat over herstel. Volgorde van Je stand staat onder Geavanceerd van Planning, Intensiteit tellen in een eigen sectie Je stand bij Lichaam. Geluid (de tonen bij het openen) staat tussen de kaarten van Vandaag, maar is geen kaart. Patronen per weekdag gaat over trainingen die wegvallen en staat bij Lichaam.
12. **Geavanceerd is een uitklapblok.** De eigenaar vindt uitklapblokjes niet mooi (`docs/visie/Ontwerp en gebruik.md`). Op vier pagina's en in het blad Groei van de lange loop klapt Geavanceerd open op de pagina zelf.
13. **Uitleg ontbreekt op ongeveer veertig rijen**, ook op rijen die je planning raken (De lange zondag, Na je hoofddoel) of grote gevolgen hebben (Sets en gewichten: houd je je sets bij in ASCEND of in MacroFactor). Voor een paar rijen bestaat de uitleg al in `settingsHelp.ts` maar hangt hij niet aan de rij (`meerdere`, `gewicht`, `drempel`).
14. **Namen die verschillen.** Hetzelfde heet in de rij, de index en het blad anders: "Sets en gewichten" in de rij, "Krachttraining bijhouden" in de index; "Blessures" in de rij, "Lichaam: rekken en klachten" in de index; "Laatste back-up" en "Back-up"; "Nooit" in het vak, "Nog nooit" in de groepsrij. De uitleg bij Kracht meerekenen zegt "uit MacroFactor" terwijl je je sets ook in ASCEND kunt bijhouden.
15. **Wat er bijkomt past nu niet.** Koppelingen heeft met Garmin gekoppeld al elf rijen; Health Connect erbij gaat over het plafond van twaalf. Gegevens en back-up zit op twaalf; een overzicht van toestemmingen past er niet meer bij. Er is geen plek voor een melding naast de ochtendmelding.
16. **Een mislukte lezing ziet eruit als "niet gekoppeld".** Lukt het ophalen van de koppelstatus niet (`useSettingsFacts` vangt de fout en geeft `null`), dan toont Garmin "Koppelen", alsof je nooit gekoppeld was.

## Vaste afspraken in dit voorstel

- **Geavanceerd wordt een eigen pagina.** De laatste rij van een groep heet "Geavanceerd", met als regel eronder de titels die erachter staan (zoals nu), en opent `/more/<groep>/geavanceerd` met dezelfde kop als een groepspagina (terugpijl met de groepsnaam, titel "Geavanceerd"). Een sprong uit het zoekveld naar een rij daar opent die pagina en laat de rij oplichten. Zo verdwijnt het uitklapblok, en een bundel onder Geavanceerd opent gewoon zijn blad. In het blad Groei van de lange loop staat Snel als vierde keuze met de waarschuwing eronder, zonder uitklappen.
- **Toestemmingen hebben één overzicht** (zie Gegevens en back-up) en elke plek die een toestemming nodig heeft, zegt het in zijn eigen regel: "Toestemming voor meldingen staat uit". Een ontbrekende toestemming die een gekozen functie nodig heeft, krijgt een amber stip (`--color-warning`, let op), nooit mint.
- **Eén bron per onderwerp.** Waar iets vandaan komt, kies je op de plek van het onderwerp (gewicht bij Lichaam), niet bij de koppeling.
- **Nieuwe instellingen landen eerst in een bestaand blad**, zoals deel 7 van `ASCEND voor iedereen.md` vraagt. Het plafond van twaalf rijen per groep blijft.

## Voorstel per groep

De volgorde is die van de winst: eerst de groep waar het meeste schuift en de meeste nieuwe dingen landen.

### 1. Vandaag en meldingen

Hier landen de ochtend, het citaat en straks de Android-meldingen. Uiterlijk en bediening blijven hier, omdat het de groep is over wat de app je laat zien.

**Opbouw van boven naar beneden**

Kop: terugpijl "Instellingen", titel "Vandaag en meldingen" op de lage lucht (`SkyBand variant="low"`).

Sectie Op Vandaag (`Eyebrow`):
1. **Kaarten.** Waarde: "Alles", "Het belangrijkste", "Alleen je training" of gedimd "Eigen keuze". Het blad is zoals nu: de drie profielen, daaronder "Of kies zelf" met Ochtendcheck, Weekterugblik, Dag van de terugblik (verhuist hierheen uit Geavanceerd, alleen als de weekterugblik aan staat), Hoe voelt je lijf?, Vraag van de week, Citaat na een training en nieuw **Citaat onderaan Vandaag**. Geluid gaat hier weg (zie Beeld en gevoel).
2. **De ochtend** (nieuwe bundel, alleen als de ochtendcheck aan staat). Waarde: "Vanaf 05:00" of de gekozen tijd, regel eronder "Bovenaan Vandaag tot je invult". Het blad bevat Ochtendkaart (als titel "Bovenaan Vandaag"), Ochtend begint om, Twee van drie (uit Lichaam) en Vragen bij een korte nacht.

Sectie Meldingen:
3. **Meldingen** (bundel, vervangt de twee rijen Ochtendmelding en Tijd van de melding). Waarde in de PWA: "Ochtend aan" of gedimd "Uit"; in de Android-app "2 van 3 aan". Met een ontbrekende toestemming: amber stip en de regel "Toestemming voor meldingen staat uit". In het blad, van boven naar beneden: Ochtendvraag (schakelaar), Tijd van de ochtendvraag, en straks Einde van de rust (de Forge-melding met het scherm uit), Weekmelding op zondag en Tijd van de weekmelding. Onderaan, alleen als er iets ontbreekt, een `SecondaryButton` "Toestemming geven" die het scherm van Android opent.

Sectie Weer:
4. **Plaats.** Zoals nu.
5. **Weer en kleding.** De waarde is nu "3 van 4 aan"; met zes schakelaars wordt het "Alles aan" of "4 van 6 aan", met de regel "Weer, kleding, hitte en lucht". Het blad krijgt Hitte bij je tempo en Luchtkwaliteit erbij (uit Lichaam), want het zijn regels in het weer bij je training.

Sectie Na een training:
6. **Inzicht na een training.** Zoals nu.
7. **Run in detail.** Zoals nu.

Sectie Beeld en gevoel (was Uiterlijk):
8. **Lucht bovenaan.**
9. **Beweging.**
10. **Trillen.**
11. **Geluid** (uit het blad Kaarten; titel "Geluid bij openen en afronden").

12. **Geavanceerd**, met de regel "Terugknop op een tab, Na een herstart". Opent de pagina met die twee rijen.

Dat zijn elf rijen en Geavanceerd. Zweetverlies vragen verhuist naar Lichaam.

**Wat verhuist, samengaat of weggaat**
- Weg als rij op de pagina: Ochtendkaart, Ochtend begint om, Vragen bij een korte nacht (naar De ochtend), Dag van de terugblik (naar Kaarten), Ochtendmelding en Tijd van de melding (naar Meldingen). Ze blijven bestaan en vindbaar.
- Erbij: Twee van drie, Hitte bij je tempo, Luchtkwaliteit.
- Weg naar Lichaam: Lichter bij vermoeide benen, Zweetverlies vragen.

**Het citaat onderaan Vandaag (nieuw)**
Rij in het blad Kaarten, titel "Citaat onderaan Vandaag", keuzes "Engels", "Nederlands" en "Uit". Waarde in de rij is de gekozen taal. Bij Engels toont het citaat het origineel en geeft een tik de vertaling, bij Nederlands andersom (zoals `QuoteCard` nu werkt); bij Uit staat er niets, ook geen lijntje erboven. De bestaande rij heet dan "Citaat na een training", zodat de twee niet te verwarren zijn. Opslag: één nieuw optioneel veld, afwezig betekent het advies, zodat er geen migratie nodig is; de controle in `storage/backup.ts` gooit een onbekende waarde weg. Welke taal het advies is, is een vraag aan de eigenaar (zie onderaan).

**Uitleg die beter moet (nieuwe zinnen)**
- Citaat onderaan Vandaag: "Een korte zin van een Stoïcijn of een bergbeklimmer onderaan Vandaag, elke dag een andere." Punten: "**Engels:** het origineel, een tik toont de vertaling." "**Nederlands:** de vertaling, een tik toont het origineel." "**Uit:** Vandaag eindigt bij je training."
- Citaat na een training: "Een citaat op het rustige scherm als je een training afrondt. Uit haalt alleen het citaat weg, de rest van het scherm blijft."
- De ochtend: "Hoe en wanneer Vandaag 's ochtends vraagt hoe je je voelt."
- Twee van drie: "ASCEND legt je rusthartslag, HRV en slaap naast je gewone waarden. Wijken er twee af, dan vraagt de ochtendkaart of je moe bent." Punt: "**Altijd:** het blijft een vraag, je planning verandert alleen met jouw Akkoord."
- Meldingen: "Welke meldingen ASCEND op je telefoon mag geven, en wanneer." Punten: "**In de browser:** alleen de ochtendvraag, en Chrome kiest het precieze moment." "**In de Android-app:** ook het einde van je rust en de weekmelding, op tijd."
- Weekmelding op zondag: "Op zondagavond een korte melding: wat je deed, wat er komt en één tip."
- Einde van de rust: "Een melding als je rust in Forge om is, ook met je scherm uit of met muziek aan."
- Weer en kleding: "Wat het weer bij je training laat zien: het weer zelf, het beste moment, kleding, en een regel bij hitte of slechte lucht."
- Geluid: "Een paar lage tonen bij het openen en een klank als je een training afrondt. Het rustsignaal van Forge stel je in bij Forge."
- Vraag van de week: "Elke week één korte vraag om je plan scherp te houden. Je antwoord blijft op je telefoon."
- Terugknop op een tab: "Wat de terugknop van je telefoon doet op een andere tab dan Vandaag."
- Na een herstart: "Open je ASCEND binnen deze tijd opnieuw, dan kom je terug waar je was. Daarna begin je op Vandaag."

**Leeg, laden en fout**
- Leeg: met alles uit staan de rijen er gewoon, met gedimde waarden. De ochtend is er niet zolang de ochtendcheck uit staat; zoeken zegt "Zichtbaar zodra de ochtendcheck aan staat".
- Laden: de waarden komen uit de opgeslagen instellingen en staan er meteen. Of de telefoon meldingen kan geven, komt een tel later binnen; tot dan staat er bij Meldingen de opgeslagen keuze, zonder stip.
- Fout: weigert de telefoon de toestemming, dan blijft de schakelaar uit en zegt het blad waarom (zoals `NoticeInfoSheet` nu), met "Begrepen" en, waar het kan, "Toestemming geven".

**Bewust niet**
- Geen eigen groep Meldingen: vijf meldingen zijn één blad, geen pagina.
- Geen tweede plek voor de toestemmingen; dit blad verwijst naar Android, het overzicht staat bij Gegevens en back-up.
- Geen keuze voor de tekst van een melding.

### 2. Planning

**Opbouw van boven naar beneden**

Kop zoals elke groep. Daaronder, alleen na een wijziging, de bestaande statusregel ("Gelukt, het staat in je planning.").

Sectie Je week:
1. **Trainingstijd per dag.** Waarde "6 dagen", regel "Gemiddeld 50 minuten" (uit de tijden per dag).
2. **Rustdag.** Waarde "Maandag", regel "Rust" of "Lichte hersteldag". Het blad: de vijf dagen met "Advies" bij maandag, daaronder Op je rustdag (uit het oude blad Dagen en tijd) en Na een voorstel (zie De rustdag die terugkomt). Een andere dag blijft een voorstel met Akkoord.
3. **Twee trainingen per dag.** Zoals nu, met Benen en een zware loop in het blad.

Sectie Sporten:
4. **Sporten.** Eén rij in plaats van één per sport. Waarde "3 aan", regel "Hardlopen 3× per week, wandelen en fietsen auto". Tot het scherm Sporten uit `docs/visie/Sporten die meetellen.md` er is, opent de rij een blad met de bestaande sportrijen (Hardlopen, Wandelen, Fietsen), elk met het bestaande `SportSheet` als onderblad. Daarna opent hij dat scherm. Zo groeit de pagina niet mee met elke sport.

Sectie Hoe ASCEND plant:
5. **Wijzigingen in je planning** (was Wijzigingen). Waarde zoals nu. In het blad onder de keuzes: Voorstel bij een probleem in de week (uit de pagina), want beide gaan over wie beslist.
6. **Ambitie.** Zoals nu, met Groei van de lange loop in het blad.
7. **Training die niet doorging** (nieuw). Waarde "Vragen na 2 dagen". Het blad, van boven naar beneden: de keuze Wat ASCEND doet ("Na een paar dagen vragen", "Zelf overslaan", "Niets doen"), Na hoeveel dagen (1, 2 of 3), Log op een andere dag koppelen (schakelaar: een training van je horloge of MacroFactor op een andere dag wordt een voorstel om hem aan de geplande training te koppelen) en Patronen per weekdag (uit Lichaam).
8. **Testloop** (nieuwe bundel). Waarde "Stilstaan telt niet", regel "Vraagt bij twijfel". In het blad: Stilstaan bij een testloop, Twijfeltest eerst vragen, Nieuwe test voorstellen bij stilstand.

9. **Geavanceerd**, regel "Trainingen slepen in Week, Volgorde van Je stand".

Acht rijen en Geavanceerd, waar het nu er dertien zijn.

**De rustdag die terugkomt**
De bouw die nu loopt zorgt dat een rustdag die door een voorstel werd weggehaald weer rustdag wordt zodra de dag weer leeg is. Dat is een keuze die de app maakt, dus hij hoort instelbaar te zijn, maar niet als eigen rij: in het blad Rustdag staat de rij **Na een voorstel**, met "Weer rustdag" (advies) en "Vrij laten". Waarde in de rij: de keuze. Onder de keuzes één regel: "Wordt de dag weer leeg, dan is het vanzelf weer je rustdag. Er komt niets bij."

**Trainingen die niet doorgingen**
Uit de back-up van 31 oktober bleek dat 22 van 34 trainingen in acht weken op gepland bleven staan zonder log. Het voorstel: na het gekozen aantal dagen vraagt Vandaag één keer, in één kaart voor alle trainingen samen, "Niet gedaan?" met "Overslaan" en "Niet nu". Overslaan is een status, nooit een log, en de historie blijft zoals hij was. Inhalen blijft de weg uit `2026-10-29-gemiste-training-inhalen.md`. "Zelf overslaan" doet hetzelfde zonder te vragen en zegt het achteraf in de meldingsbalk met Ongedaan maken. Of die keuze er mag zijn, is een vraag aan de eigenaar, want het is iets wat de app zonder Akkoord doet. De regel komt in `engine/`, met een besluit, voordat de rij er komt.

**Uitleg die beter moet**
- Trainingstijd per dag: "Hoeveel tijd je normaal per dag hebt. ASCEND plant nooit langer."
- Rustdag: "De dag waarop je niet traint. Een andere dag laat eerst zien wat er verschuift." Punt: "**Altijd:** het weekend blijft voor je lange trainingen."
- Na een voorstel: "Haalde een voorstel je rustdag weg en is de dag weer leeg, dan wordt hij weer je rustdag. Vrij laten houdt hem leeg zonder het woord rust."
- Twee trainingen per dag: de bestaande uitleg `meerdere` aan de rij hangen.
- Sporten: "Welke sporten ASCEND inplant en hoe vaak. Wat je zelf doet, telt ook mee voor je benen."
- Wijzigingen in je planning: de bestaande uitleg blijft, met als eerste zin "Wie beslist als je planning verandert: jij, of bij kleine dingen ASCEND zelf."
- Training die niet doorging: "Wat ASCEND doet met een training die voorbij is zonder log." Punten: "**Vragen:** één kaart op Vandaag, jij kiest." "**Zelf overslaan:** ASCEND zet hem op overgeslagen en zegt het, met Ongedaan maken." "**Nooit:** een log verzinnen; overslaan is geen training."
- Patronen per weekdag: "Valt je training op een vaste weekdag duidelijk vaker weg, dan zegt Week dat in één zin. Er verschuift niets."
- Testloop: "Hoe ASCEND een testloop leest, zodat je tempo's eerlijk blijven."

**Leeg, laden en fout**
- Leeg: zonder tijden per dag staat er gedimd "Niet ingesteld" met de regel "Rust op maandag". Zonder sporten staat er "Geen sport aan".
- Laden: alles komt uit de instellingen en staat er meteen. Een voorstel voor een andere rustdag toont de wachtstand van `ProposalSheet`, met een grens in tijd.
- Fout: lukt het voorstel niet, dan blijft de rustdag zoals hij was en zegt de statusregel "Je rustdag en je planning blijven zoals ze waren."

**Bewust niet**
- Ambitie en Wijzigingen worden niet samengevoegd; het zijn twee vragen (zoals deel 7 van het onderzoek al zei).
- Geen keuze die een gemiste training stil verplaatst. Inhalen blijft jouw tik.
- `planGolden.test.ts` beweegt niet: dit is alleen indeling, op de nieuwe instelling na, die als afwezig het huidige gedrag geeft.

### 3. Koppelingen

**Opbouw van boven naar beneden**

Sectie Garmin:
1. **Via intervals.icu.** Waarde "Verbonden" met groene stip, regel "Bijgewerkt om 07:12". Lukt het lezen niet: gedimd "Niet te lezen", regel "Probeer het zo opnieuw", in plaats van "Koppelen".
2. **Gebruik van je horloge.** Het blad krijgt Volledige reeks bewaren erbij, direct onder Details van loopjes en alleen als die aan staat.
3. **Trainingen die binnenkomen** (nieuwe bundel). Waarde "3 van 3 aan". In het blad: Vanzelf afvinken, Garmin is leidend, Correcties uit intervals.icu overnemen.
4. **Trainingen naar je horloge.** Zoals nu.
5. **Melden als je horloge stilvalt.**

Sectie MacroFactor:
6. **Laatste export.** Waarde "22 okt", regel "Kracht en gewicht".
7. **Leidend voor kracht.**

Sectie Health Connect (alleen in de Android-app; in de browser verborgen, zoeken zegt "Alleen in de Android-app"):
8. **Health Connect.** Waarde "Verbonden" of "Koppelen", regel "Gewicht, stappen en trappen". Opent een eigen pagina zoals Garmin en MacroFactor, met per soort gegeven of Android het toestaat en de knop "Toestemming geven".
9. **Gebruik van Health Connect** (bundel). Per soort gegeven een schakelaar: Gewicht, Stappen, Trappen, Trainingen. Uit betekent: ASCEND leest het niet en bewaart het niet.

Sectie Strava:
10. **Tekst voor Strava.**

Tien rijen met alles gekoppeld; zonder koppelingen vier.

**Wat verhuist, samengaat of weggaat**
- Gewicht gebruiken verhuist naar Lichaamsgewicht bij Lichaam, als keuze van de bron.
- Volledige reeks bewaren komt hierheen uit Gegevens en back-up.
- De verwijzing Health Connect in het zoekveld ("Komt later") wordt een echte sectie zodra de Android-app er is.

**Bron per gegeven**
Met Health Connect kunnen trainingen en gewicht uit twee bronnen komen. Het advies: trainingen uit intervals.icu (die hebben de reeksen en de hoogte), gewicht uit MacroFactor zolang er een export is en anders uit Health Connect. Je kiest het op de plek van het onderwerp: gewicht bij Lichaam, trainingen in het blad Gebruik van Health Connect ("Trainingen: alleen als Garmin niets heeft"). Zo heeft elk gegeven één bron en hoeft geen scherm of engine te weten welke dienst het was (`source` blijft het veld, zoals CLAUDE.md vraagt).

**Uitleg die beter moet**
- Via intervals.icu: "Je trainingen, slaap en hartslag komen van je Garmin via intervals.icu binnen, zonder overtypen."
- Gebruik van je horloge: "Per soort gegeven of ASCEND het ophaalt. Uit betekent: niet ophalen en niet bewaren."
- Trainingen die binnenkomen: "Wat ASCEND doet met een training van je horloge: afvinken, cijfers overnemen, correcties volgen."
- Trainingen naar je horloge: "De trainingen van de komende week staan in je intervals.icu-agenda en zo op je horloge."
- Voorvoegsel voor de naam: "ASC voor de naam, zodat je de trainingen van ASCEND herkent op je horloge."
- Rustige loop, ruime grens: "Je horloge piept alleen als je boven zone 2 komt, niet als je even zakt."
- Gedane trainingen weghalen: "Een training die je deed of oversloeg, verdwijnt weer uit je agenda."
- Laten zien of het gelukt is: "Eén regel bij de training en een klein horloge in Week, alleen als het verstuurd is of niet lukte."
- Laatste export: "Krachttrainingen en gewicht uit je MacroFactor-export, met de echte duur en herhalingen in reserve."
- Health Connect: "Android geeft ASCEND je gewicht, stappen en trappen, als je dat toestaat. Er gaat niets van je telefoon af."
- Gebruik van Health Connect: "Per soort gegeven of ASCEND het uit Health Connect leest."

**Leeg, laden en fout**
- Leeg: zonder koppeling staan alleen de statusrijen er, met "Koppelen" en de regel wat het oplevert.
- Laden: de koppelstatus komt een tel na het openen; tot dan staat de laatst bekende waarde er, zonder stip.
- Fout: "Niet te lezen" (gedimd) bij een mislukte lezing, nooit "Koppelen". Een geweigerde toestemming voor Health Connect zegt op de eigen pagina welke soort ontbreekt, met "Toestemming geven"; na twee keer weigeren opent die knop de instellingen van Health Connect zelf, omdat Android het venster dan niet meer toont.

**Bewust niet**
- Geen sleutel of wachtwoord op deze pagina; koppelen blijft de eigen pagina.
- Geen keuze die naar Strava schrijft.
- Geen samenvoeging van Garmin en Health Connect tot één rij "Horloge": het zijn twee wegen met andere gegevens.

### 4. Gegevens en back-up

**Opbouw van boven naar beneden**

Sectie Back-up:
1. **Laatste back-up.** Waarde "Vandaag", "Gisteren", "12 dagen geleden" of gedimd "Nog nooit".
2. **Vaste map.** Zoals nu, alleen waar de browser het kan.
3. **Wat gaat mee** (nieuwe bundel). Waarde "Alles, reeksen 2 jaar". In het blad: Reeksen in back-up en Ochtendgetallen in back-up.
4. **Kopieën van voor een import.**

Sectie Deze telefoon:
5. **Toestemmingen** (nieuw). Waarde "Alles aan" of, met een amber stip, "1 staat uit". Het blad toont per toestemming één rij met de waarde "Aan" of "Uit" en een regel waarvoor hij nodig is: Meldingen ("De ochtendvraag en het einde van je rust"), Exacte wekker ("Het einde van je rust op de seconde"), Health Connect ("Gewicht, stappen en trappen"), Locatie ("Weer dat je volgt"), Opslag beschermd ("Je telefoon ruimt je gegevens niet zomaar op", alleen in de browser). Een tik op een rij die uit staat opent een klein blad met één zin en de `SecondaryButton` "Toestemming geven", die het scherm van Android of de browser opent. Dit is hetzelfde rijtje als de welkomstreeks na de installatie; wie daar "Niet nu" koos, vindt het hier terug.
6. **Ruimte op dit toestel.** Wordt een rij met een blad (nu een vaste rij). Waarde "84 MB", regel "Ruim genoeg" of "Krap". Het blad toont wat de ruimte inneemt, met de reeksen als eigen regel en daaronder "Reeksen verwijderen" (de actie uit het oude blad Ruimte van reeksen).

Sectie App:
7. **Aangepaste instellingen.** Zoals nu, alleen als er iets anders staat dan het advies.

8. **Geavanceerd**, regel "Adviezen opnieuw berekenen, Oude voorstellen opruimen, Startniveau zelf invullen".

Sectie zonder kopje:
9. **Alles verwijderen.**

Voettekst: Versie, tikken zoekt naar een update.

**Wat verhuist, samengaat of weggaat**
- Opslag beschermd gaat op in Toestemmingen; het is een vraag aan de browser zoals de andere. In de Android-app bestaat hij niet, want daar ruimt de telefoon niets zomaar op.
- Ruimte van reeksen gaat op in Ruimte op dit toestel. Het id `reeksen-ruimte` blijft en wijst naar dat blad.
- Volledige reeks bewaren gaat naar Koppelingen.
- Adviezen opnieuw berekenen gaat naar Geavanceerd: ASCEND doet het zelf na een update of import, de knop is een noodknop.

**Uitleg die beter moet**
- Laatste back-up: "Al je gegevens in één bestand, om te bewaren of terug te zetten. Alles staat alleen op deze telefoon, dus dit is je enige kopie."
- Vaste map: "Een map die de browser onthoudt, zodat een back-up daar vanzelf landt."
- Wat gaat mee: "Wat er naast je trainingen en instellingen in de back-up gaat. Je logs gaan altijd mee."
- Kopieën van voor een import: "Voor elke import bewaart ASCEND een kopie, zodat je terug kunt."
- Toestemmingen: "Wat je telefoon ASCEND toestaat. Zonder een toestemming werkt alleen dat ene ding niet."
- Exacte wekker: "Android laat een melding anders tot een paar minuten te laat komen. Voor het einde van je rust is dat te laat."
- Adviezen opnieuw berekenen: "ASCEND kijkt opnieuw naar je planning en je adviezen. Er wordt niets verwijderd."
- Startniveau zelf invullen: "Meestal niet nodig, want ASCEND vraagt zelf wat ontbreekt. Hier vul je het in als je dat liever doet."
- Alles verwijderen: "Wist alles op deze telefoon. Maak eerst een back-up, want dit kan niet terug."

**Leeg, laden en fout**
- Leeg: zonder back-up staat "Nog nooit" gedimd, en het vak Back-up op het overzicht vraagt om er een te maken.
- Laden: de ruimte en de toestemmingen komen een tel na het openen; tot dan staat er "Even kijken", gedimd, hoogstens twee seconden, en daarna "Onbekend" als het niet lukt.
- Fout: een back-up die mislukt zegt in het blad wat er misging, met "Opnieuw" en "Annuleren". Een toestemming die Android niet kan openen, zegt waar je hem zelf vindt.

**Bewust niet**
- Geen automatische back-up naar een dienst buiten de telefoon; ASCEND blijft lokaal.
- Geen tweede stip voor de back-up in de groep Gegevens als het vak op het overzicht hem al toont.

### 5. Doel en tochten

De pagina ziet er met en zonder doel anders uit, en dat is goed: wat niet past, bestaat niet.

**Opbouw met een doel**
1. **Hoofddoel.** Waarde "GR5, 14 jul".
2. **Programma.** Waarde "Week 9 van 16", regel "Opbouw, teruggerekend vanaf je doel".
3. **De lange zondag.** Alleen als je hoofddoel geen bergtocht is.
4. **Na je hoofddoel.**
5. **Klaar voor je doel** (nieuwe bundel, alleen met een doel). Waarde "Advies" of "2 aangepast". In het blad: Weging bij een doeltijd (alleen bij een doeltijd), Groei bij het rekenen, Marge bij een tijdslimiet (alleen bij een tijdslimiet), Doeltijd aanpassen voorstellen (uit de pagina).
6. **Seizoensstrook tonen.**
Sectie Tochten:
7. **Tochten.** Zoals nu.
8. **Vrije dagen en vakanties.** Opent Week, zoals nu.

**Opbouw zonder doel**
1. **Hoofddoel.** Waarde gedimd "Geen doel", regel "Een doel geeft ASCEND een einddatum". Opent de doelen op Ascend.
2. **Richting.** Uit het blad Zonder doel op de pagina zelf.
3. **Weekbudget.**
4. **Golven.**
5. **Beginnersstart.**
6. **Seizoensstrook tonen.**
Sectie Tochten: Tochten (alleen met een tocht), Vrije dagen en vakanties.

De bundel Zonder doel verdwijnt als rij; de vier keuzes staan op de pagina omdat ze dan de pagina zijn. Hun id's blijven gelijk.

**Uitleg die beter moet**
- Hoofddoel: "Waar je naartoe werkt. ASCEND rekent je weken terug vanaf die datum."
- Programma: "In welke week en fase je zit. Opnieuw beginnen bij week 1 kan in het blad."
- De lange zondag: "Op zondag staat je langste training: een bergtocht of een lange duurloop. Een andere keuze laat eerst zien wat er verschuift."
- Na je hoofddoel: "Wat ASCEND plant als je doel voorbij is: niets (advies) of onderhoudsweken. Tijdens de tocht verandert er nooit iets."
- Klaar voor je doel: "Hoe ASCEND je percentage op Ascend uitrekent. Het advies is voor de meeste doelen goed."
- Tochten: "Wat ASCEND doet rond een tocht: op Vandaag tonen, water per etappe, rust erna en je schoenen."
- Vrije dagen en vakanties: "Dagen zonder training, een vakantie of een tocht. Je zet ze in Week."

**Leeg, laden en fout**
- Leeg: zonder doel en zonder richting staat Richting gedimd op "Nog niet gekozen", regel "Advies: Fit blijven".
- Laden: alles staat er meteen.
- Fout: een voorstel dat niet lukt, laat de keuze en de planning zoals ze waren en zegt dat in de statusregel.

**Bewust niet**
- Geen tweede percentage en geen "x van y" in deze groep; het ene percentage staat op Ascend.
- Reisplanner en Paklijst komen niet terug als rij; ze staan op Ascend en zijn te vinden via zoeken.

### 6. Lichaam

**Opbouw van boven naar beneden**

Sectie Meten:
1. **Lichaamsgewicht.** Waarde "72,4 kg" met "auto" als het uit een bron komt, regel "MacroFactor, 22 okt". Het blad krijgt bovenaan de keuze **Bron** ("MacroFactor", "Health Connect", "Zelf invullen"), die Gewicht gebruiken uit Koppelingen vervangt. De herinnering voor je gewicht blijft in het blad.
2. **Vetpercentage tonen.** Alleen met weegmetingen met een vetpercentage, zoals nu.
3. **Zweetverlies vragen** (uit Vandaag en meldingen).

Sectie Hartslag:
4. **Hartslag.** Waarde "Drempel 168".
5. **Intensiteit tellen.**

Sectie Klachten en herstel:
6. **Klachten en rekken** (was Blessures). Opent het scherm Lichaam, waarde "Geen" of "1 actief".
7. **Lichter bij vermoeide benen** (uit Vandaag en meldingen), met Hoe licht in het blad.
8. **Vroeg ziek zien** (uit het blad Signalen, nu een rij met een schakelaar).
9. **Wat speelde er.**

Sectie zonder kopje:
10. **Figuur.**

**Wat verhuist, samengaat of weggaat**
- De bundel Signalen uit je gegevens verdwijnt: Twee van drie gaat naar De ochtend, Hitte bij je tempo en Luchtkwaliteit naar Weer en kleding, Patronen per weekdag naar Training die niet doorging, Vroeg ziek zien wordt een eigen rij. Het id `bundel-signalen` blijft als verwijzing in het zoekveld en wijst naar Vroeg ziek zien.
- Erbij: Zweetverlies vragen, Lichter bij vermoeide benen, de bron van je gewicht.

**Uitleg die beter moet**
- Lichaamsgewicht: de bestaande uitleg `gewicht` aan de rij hangen, met als eerste zin "Je trendgewicht, voor je rugzak en je zweetverlies."
- Bron (van je gewicht): "Waar je gewicht vandaan komt. Eén bron, zodat er geen twee getallen door elkaar lopen."
- Hartslag: de bestaande uitleg `drempel` aan de rij hangen.
- Klachten en rekken: "Waar je last van hebt, zodat ASCEND er rekening mee houdt, en wat je kunt rekken of versterken."
- Vroeg ziek zien: de bestaande uitleg, met het punt "**Altijd:** het is een vraag, geen diagnose. Je planning verandert alleen met jouw Akkoord."
- Wat speelde er: "Je eigen aantekeningen bij een training of een dag, en wat ASCEND ermee doet."

**Leeg, laden en fout**
- Leeg: zonder gewicht staat "Niet ingevuld" gedimd. De groepsrij op het overzicht zegt niet langer "Leeg" maar "Niet ingevuld" met de regel "Hartslag niet ingevuld, geen klachten".
- Laden: alles staat er meteen; het gewicht uit een bron komt mee met de facts.
- Fout: lukt het lezen van een bron niet, dan blijft het laatste gewicht staan met de regel "MacroFactor, 22 okt" en geen "auto".

**Bewust niet**
- Geen eigen groep Herstel; het past hier.
- De zorgteksten zeggen "kan helpen", nooit "voorkomt".

### 7. Forge

Cartographer Forge maakt tegelijk een rapport over Forge zelf. Dit voorstel raakt alleen de instellingen en houdt de rijen bij elkaar, zodat dat rapport er vrij in kan schuiven.

**Opbouw van boven naar beneden**
1. **Kracht meerekenen.** Schakelaar, zoals nu.
Sectie Bijhouden:
2. **Waar je sets bijhoudt** (was Sets en gewichten). Waarde "In ASCEND" of "In MacroFactor".
3. **Programma uit MacroFactor.** Alleen met een export, zoals nu.
Sectie Voorstellen:
4. **Wat eerst omhoog** (was Eerst ophogen). Waarde "Gewicht" of "Herhalingen".
5. **Opwarmen.** Opwarmen en Opwarmen per gaan samen in één blad: eerst Slim, Vast schema of Uit, daaronder (niet bij Uit) Per spiergroep of Per oefening. Waarde "Slim, per spiergroep".
6. **Weergave op Forge.**
Sectie In de sportschool:
7. **Rusttimer.** In de Android-app krijgt het blad onderaan de regel "Met je scherm uit" met de waarde "Werkt" of, met amber stip, "Toestemming staat uit"; tik opent het blad uit Toestemmingen.
8. **Scherm aan tijdens je training.**
9. **Bijsturen in de training.**
10. **Zonder spotter.**
11. **Je sportschool.**
12. **Geavanceerd**, regel "Trainingsduur, Rekenmodel, Bij het invullen, Toets tegen MacroFactor".

Elf rijen en Geavanceerd, nu twaalf.

**Uitleg die beter moet**
- Kracht meerekenen: "Forge rekent met je krachttrainingen en stelt per oefening voor wat je de volgende keer doet. Uit: je ziet alleen wat je deed." (De zin "uit MacroFactor" klopt niet als je je sets in ASCEND bijhoudt.)
- Waar je sets bijhoudt: "Houd je je sets bij in ASCEND of in MacroFactor?" Punten: "**In ASCEND:** je vult ze in tijdens je training, met de rusttimer en voorstellen per set." "**In MacroFactor:** ASCEND leest ze uit je export en het workoutscherm is om mee te kijken."
- Wat eerst omhoog: "Gaat een oefening goed, dan verhoogt Forge eerst dit. Het andere volgt als het bovenaan je bereik zit."
- Rusttimer: "Na elke werkset en je laatste opwarmset start de rust, met een tijd per oefening."
- Scherm aan tijdens je training: "Je scherm blijft aan zolang je training open is, ook als je alleen meekijkt."
- Je sportschool: "Welke stangen, schijven en toestellen er zijn, zodat Forge alleen gewichten voorstelt die kunnen."

**Leeg, laden en fout**
- Leeg: met Kracht meerekenen uit toont Voorstellen de regel "Uit. Zet Kracht meerekenen aan voor een voorstel per oefening." (zoals nu, met `SettingsEmpty`).
- Laden: alles staat er meteen.
- Fout: een geluid dat niet kan spelen, laat in het blad Rusttimer weten "Je telefoon speelt nu geen geluid af", zonder de keuze te veranderen.

**Bewust niet**
- Geen Forge-pagina als rij; Forge vind je op Je stand.
- Geen verdere splitsing van de bladen Rekenmodel en Bij het invullen in dit rapport; dat volgt uit het Forge-rapport.

### 8. Gidsen en kennis

Vier verwijzingen, geen instellingen. De groep blijft: ze is goedkoop, staat onderaan en wordt gevonden.

**Opbouw**: Weer en kleding, Kennisbank, Trainingsplekken, Bronnen, zoals nu. De groepsrij op het overzicht zegt "Weer, kennisbank, trainingsplekken en bronnen" in plaats van alleen drie van de vier.

**Bewust niet**: geen samenvoeging met Gegevens en back-up of een opheffing van de groep. Het onderzoek opperde "Naslag"; dat levert een tik op maar maakt het overzicht langer, en het overzicht moet op één scherm passen.

## Het overzicht

**Opbouw van boven naar beneden**, zoals nu: lage lucht met "Meer" en "Instellingen", de drie vakken, het zoekveld, Je training (vier groepen), De app (vier groepen), de versie en de merkregel.

**Wat verandert**
- Het eerste vak heet zonder doel **Richting**, met als waarde "Fit blijven" en eronder "golf, week 2 van 4". Met een doel blijft het Fase.
- Het vak Back-up zegt "Nog nooit" in plaats van "Nooit", zodat het vak en de groepsrij hetzelfde zeggen, en bij een getal "12 dagen" met eronder "geleden, nu maken".
- De groepsrijen zeggen wat ze bedoelen:
  - Planning: waarde "Rust maandag", regel "6 dagen training, hardlopen 3× per week".
  - Doel en tochten: met een doel "1 tocht" en de regel zoals nu; zonder doel gedimd "Geen doel" met de regel "Fit blijven, golven van 4 weken".
  - Forge: "Aan", regel "Gewicht eerst omhoog, slim opwarmen".
  - Lichaam: het gewicht, of gedimd "Niet ingevuld".
  - Vandaag en meldingen: de naam van het profiel ("Alles", "Het belangrijkste", "Alleen je training", "Eigen keuze") in plaats van "9 aan"; regel "Weer voor je plaats, ochtendvraag aan".
  - Koppelingen: gedimd "Niet gekoppeld" in plaats van "Geen".
  - Gegevens en back-up: amber stip en de regel "Toestemming voor meldingen staat uit" als een toestemming ontbreekt die je nodig hebt.
- Zoeken krijgt synoniemen voor wat erbij komt: "toestemming", "wekker", "alarm", "Android", "citaat", "quote", "Engels", "gemist", "niet gedaan", "overgeslagen", "Health Connect", "stappen", "trappen".

**Leeg, laden en fout**: het overzicht staat er meteen uit de opgeslagen instellingen; de koppelstatus en de back-upkopieën vullen een tel later in. Een mislukte lezing toont nooit een verkeerde waarde, maar laat de regel weg.

**Bewust niet**: geen vierde vak, geen teller op het tandwiel, geen tweede mint accent. Het vak Back-up is het ene mint accent als de back-up te oud is, zoals nu.

## Wat er weggaat, en waarom

Er gaat geen instelling weg. Wat als rij verdwijnt, gaat op in een andere rij omdat het dubbel was:
- **Ruimte van reeksen** gaat op in Ruimte op dit toestel: twee rijen over dezelfde vraag, hoeveel ruimte ASCEND gebruikt.
- **Opslag beschermd** gaat op in Toestemmingen: het is een toestemming van de browser, net als meldingen en locatie.
- **Gewicht gebruiken** gaat op in de bron van Lichaamsgewicht: dezelfde keuze, op twee plekken.
- **Opwarmen per** gaat op in Opwarmen: hoort er alleen bij als Opwarmen niet uit staat.
- De bundels **Dagen en tijd**, **Zonder doel** en **Signalen uit je gegevens** verdwijnen als bundel; hun keuzes staan op een betere plek.

## Volgorde om te bouwen

1. **Teksten en waarden** (klein, niets verschuift). De groepsrijen en de vakken op het overzicht, de nieuwe namen, de ontbrekende uitleg in `settingsHelp.ts`, de bestaande uitleg aan de rijen hangen, de index gelijktrekken met de rij, "Niet te lezen" bij een mislukte lezing, en `SHOW_WHEN` voor de drie rijen van Klaar voor je doel. Raakt alleen `settingsSummary.ts`, `settingsStatus.ts`, `settingsHelp.ts`, `settingsIndex.ts` en `settingsLayout.ts`, met hun tests.
2. **Indeling binnen een groep.** Rustdag en Trainingstijd op de pagina, Sporten als één rij, Testloop, Klaar voor je doel, De ochtend, Trainingen die binnenkomen, Wat gaat mee, Ruimte samen, Opwarmen samen, Zonder doel op de pagina. Alleen `PAGE_ROWS`, `MOVED` en de groepsbestanden; geen opgeslagen veld.
3. **Verhuizen tussen groepen.** Twee van drie, Hitte bij je tempo, Luchtkwaliteit, Patronen per weekdag, Lichter bij vermoeide benen, Zweetverlies vragen, Geluid, Volledige reeks bewaren, de bron van je gewicht. Het veld `group` in de index verhuist mee, en de test die bewaakt dat elk id een plek heeft, vangt een gemiste stap.
4. **Geavanceerd als pagina**, als de eigenaar dat wil. Een route `/more/:groep/geavanceerd`, de sprong uit het zoekveld, en het blad Groei van de lange loop zonder uitklappen.
5. **Nieuwe instellingen in de PWA.** Citaat onderaan Vandaag (één optioneel veld), Na een voorstel bij de rustdag (na de bouw die nu loopt), en Training die niet doorging (eerst de regel in `engine/` en een besluit). Elk met index, indeling, samenvatting, uitleg, `settingsDiff` en de controle in `storage/backup.ts`.
6. **Android-app.** Toestemmingen, de bundel Meldingen met de nieuwe meldingen, de regel Met je scherm uit bij de rusttimer, de sectie Health Connect en de keuze van de bron voor gewicht en trainingen.

Na elke stap blijft `planGolden.test.ts` gelijk, behalve waar een nieuwe instelling bewust iets anders doet, en dan met de reden in de commit.

## Besluiten voor de eigenaar

1. **De taal van het citaat onderaan Vandaag.** De backlog zegt Engels als standaard; de app toont nu eerst Nederlands, en de afspraak is dat een nieuwe instelling het gedrag houdt dat er al was. Engels of Nederlands als advies?
2. **Een training die niet doorging.** Is "Na een paar dagen vragen" het goede advies, en na hoeveel dagen (1, 2 of 3)? En mag de keuze "Zelf overslaan" er zijn, terwijl de app dan iets doet zonder je Akkoord (wel met Ongedaan maken)?
3. **De rustdag die terugkomt.** Moet dit instelbaar zijn ("Weer rustdag" of "Vrij laten"), of is het een reparatie zonder keuze?
4. **Geavanceerd als eigen pagina** in plaats van een uitklapblok, op alle vier de groepen. Akkoord?
5. **De bron per gegeven met Health Connect.** Trainingen uit intervals.icu en gewicht uit MacroFactor, met Health Connect als terugval: is dat het goede advies?
6. **De toestemmingen bij Gegevens en back-up**, in een sectie Deze telefoon. Of liever bij Vandaag en meldingen, waar je naar meldingen zoekt?
7. **Sporten als één rij nu**, met de bestaande bladen erachter, of wachten tot het scherm Sporten er is?
