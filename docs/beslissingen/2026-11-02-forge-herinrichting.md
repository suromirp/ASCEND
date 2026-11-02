# Forge herinrichting: snelknoppen weg, Alles naar het blad Oefening, spierindex klein

Datum: 2026-11-02
Status: aangenomen

## Besluit

De rij snelknoppen onder de naam van een oefening (Ruilen, Opwarmset, Notitie) is weg, met de instelling Snelknoppen tonen. De kolomkop Alles is weg uit de tabel met sets. Wat ze deden staat in het menu van de oefening, dat nu het blad Oefening is: bovenaan Waarom zo, dan vier groepen onder elkaar (Oefening, Sets, Rust, Toestel). De spierindex komt in zijn kleinste vorm: één melding in de weekterugblik bij een bergdoel, met een voorstel voor één oefening, en voorrang bij Ruilen als de keuze verder gelijk is.

Keuzes bij open punten, steeds de aanbevolen optie uit `docs/visie/Ontwerprapport Forge.md`:

- Het blad Oefening volgt paragraaf 4.3. Oefening: Ruilen (of Terug naar de oude oefening na een ruil, op dezelfde plek), Notitie, Uitleg en tekening (alleen als de instelling Plaatjes bij oefeningen dat toont en ASCEND de oefening kent). Sets: Set toevoegen, Opwarmset toevoegen (niet bij een oefening op tijd), Alle sets afvinken met "Ook de rust start." of Alle vinkjes weghalen als alles al af is, Laatste set verwijderen. Rust: Rusttijd met min en plus, Rust nu starten. Toestel: Gewichten en Tussengewicht, alleen bij een kabel of gewichtsblok. De tips staan in Uitleg en tekening; alleen als dat blad er niet is, staan ze onderaan als groep Tips.
- Meer en Minder bij een lange reden zijn weg: de reden staat op één regel met "Waarom zo", dat het blad Oefening opent, en daar staat de hele reden bovenaan. Een korte reden blijft heel in de kaart staan.
- Set toevoegen onder de sets blijft, en staat ook in de groep Sets van het blad. Het rapport noemt die knop onder de sets "de ene plek waar je dat direct doet"; het blad is de volledige lijst. Dat is de enige dubbele.
- Het menu van de training verliest alleen de schakelaar Snelknoppen tonen. Kleiner maken en Afronden in dat menu, de kolom Voorschrift, RIR uit de rij, het blad Set en de naam in Marcellus (stappen 2, 3 en 5 van het rapport) zijn niet in deze ronde gebouwd.
- `AppSettings.forgeQuickButtons` wordt niet meer gelezen. Een oude back-up met het veld importeert zonder melding: het veld wordt bij het inlezen weggelaten en telt niet als fout. Geen migratie, geen nieuwe schemaversie.
- De spierindex kijkt naar kuiten, tibialis en bilspieren, alleen bij een bergdoel: het hoofddoel is een tocht, bergtocht of mountaineering (een hoofddoel zonder soort is de oude tocht), of er is een actief doel van die soort. Te weinig is gemiddeld onder 4 harde sets per week over de vier weken die eindigen met de week van de terugblik (`engine/muscleVolume.ts`, sets via `isWorkSet`). Een rustweek en weken voor het programma tellen niet mee in het gemiddelde; blijven er minder dan twee weken over of was er geen krachtwerk, dan zegt ASCEND niets.
- Eén melding, voor de laagste spier. Geen melding als een krachttraining die spier al als hoofdspier heeft (dan ontbreekt hij niet in het plan), als er geen krachttraining is, of na Liever niet voor die spier in de laatste acht weken. Liever niet onthoudt alleen dit toestel (localStorage), niet de back-up: het is een herinnering om niet te zeuren, geen gegeven over je training.
- Het voorstel zet één oefening in de krachttraining met het meeste beenwerk: de oefening met die spier als enige hoofdspier, liefst met lichaamsgewicht of dumbbells, drie sets (kuiten 10 tot 15, scheen 15 tot 20, bilspieren 10 tot 12). Pas na Akkoord. De ingebouwde sjablonen worden bij elke start gelijkgezet met hun definitie, dus de toevoeging staat als voorkeur in `strengthModel.addedExercises` (per training een lijst, hoogstens drie, defensief gelezen, in de back-up, geen migratie). Forge zet ze achter de oefeningen van de training; in het blad Oefening staat dan "Uit deze training halen". Een log wordt nooit beschreven.
- "Uit deze training halen" haalt de oefening uit de lijst voor volgende keren. In een lopende training gaat hij er alleen meteen uit als er nog geen set van is afgevinkt; anders blijft hij in deze sessie staan, want afgevinkte sets gaan nooit stil weg. Bij Akkoord gaan toevoegingen bij sjablonen die niet meer bestaan weg; zijn alle plekken vol (drie per training, twintig trainingen), dan toont de weekterugblik geen voorstel. Een toegevoegde oefening die al in de training staat komt er niet nog eens bij. Forge en de melding lezen dezelfde lijst (`engine/forgeSlots.ts#forgeSlotsFor`).
- Liever niet telt acht weken vanaf de week waarin je het zei, ook als je een oude terugblik bekijkt. Alles verwijderen wist die herinnering mee.
- De naam van de training bovenaan Forge staat op één regel. Op een scherm smaller dan 380 px is hij 16 in plaats van 20 px (Marcellus), zodat "Bovenlichaam A" en "Benen A (zwaar)" heel passen en de A of B nooit wegvalt. Pas als een eigen naam dan nog niet past, kapt hij aan het eind af met een beletselteken (rapport 4.5); de volle naam staat in het menu van de training.
- De tekst noemt eerst het getal, dan "kan helpen", nooit "voorkomt", en noemt eerlijk hoeveel sets niet aan een oefening gekoppeld konden worden.
- Ruilen: `swapOptions` krijgt de spieren onder de ondergrens (de vier hele weken voor deze week) en zet alleen bij gelijke score een oefening voorop die zo'n spier als hoofd- of hulpspier heeft, met de reden "Ook voor je kuiten, die kregen weinig de laatste vier weken." Forge ruilt nooit zelf.
- Eén instelling voor beide, Spieren voor de berg (`strengthModel.mountainMuscles`, standaard aan), in de groep Forge onder Geavanceerd (de groep heeft al twaalf rijen), met uitleg, in zoeken, de samenvatting en de lijst van gewijzigde instellingen.

## Reden

De eigenaar gaf op 1 november zijn antwoord: de snelknoppen mogen weg en de kolom Alles gebruikt hij nooit. Zonder de rij en de kolomkop staat er in de kaart minder dubbel en minder kleins, en alles wat je soms doet staat op één plek. De spierindex volgt het besluit `2026-11-02-spierindex-klein.md`.

## Alternatieven

Eén snelknop houden (Ruilen): de eigenaar koos voor weg. De toevoeging in het sjabloon zelf zetten: gaat verloren bij de volgende start, omdat de ingebouwde sjablonen dan worden gelijkgezet. Liever niet in de back-up bewaren: zou een nieuw opgeslagen veld vragen voor iets wat geen trainingsgegeven is.

## Bron

`docs/visie/Ontwerprapport Forge.md`, `docs/onderzoek/Spierindex opzet.md`, het antwoord van de eigenaar in `docs/backlog.md` (1 november).

## Vervangt

Van `2026-10-29-snelknoppen-in-forge.md` en de aanvulling: de rij snelknoppen en de instelling Snelknoppen tonen. Vegen om te verwijderen, eigen sets en Terugzetten blijven zoals daar beschreven. De oude besluiten blijven staan zoals ze zijn.

## Terugdraaien

De snelknoppen: de rij en de instelling terugzetten uit de commit van deze ronde; het veld in oude back-ups wordt dan weer gelezen. De spierindex: de standaard van Spieren voor de berg op uit, of `prefer` in `swapOptions` leeg laten. Toegevoegde oefeningen haal je per training weg in het blad Oefening; er wordt verder niets opgeslagen dat weg moet.
