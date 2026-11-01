# Ontwerprapport Forge

Cartographer Forge, 1 november 2026. Status: voorstel, er is niets gebouwd.

Aanleiding: de eigenaar schreef op 1 november: "heel veel opties, ik zoek een logischere UI en UX, met behoud van de essentie". Bronnen: `docs/architectuur/forge.md`, de besluiten over Forge en de snelknoppen in `docs/beslissingen/` (vooral `2026-10-29-snelknoppen-in-forge.md` en de aanvulling, `2026-10-29-oefeningen-opzij-vegen.md`, `2026-10-28-zonder-spotter.md`, `2026-10-25-bijsturen-in-forge.md`), `docs/visie/Forge logboek en spotter.md`, `docs/visie/Ontwerp en gebruik.md`, de code in `src/components/forge/` (vooral `ForgeWorkout.tsx`, `parts.tsx`, `ForgeStrip.tsx`, `InputDock.tsx`) en `src/engine/forgeQuickActions.ts`, `forgeRows.ts`, `forgeLayout.ts`, `forgeWorkout.ts`, en de screenshots van Bovenlichaam A op 360 en 390 px (nagemaakte stand).

Twee dingen worden al apart gebouwd en dit rapport sluit erop aan: het eigen cijferblok blijft open tussen velden, en de voorschriftregel wordt één korte zin ("4 sets van 9+ herhalingen tot falen").

## 1. Wat goed is en wat blijft

Forge is in de kern een goed gereedschap. Dit is de essentie, en die blijft:

- Een oefening per scherm, opzij vegen, met de strook kaartjes bovenaan die laat zien waar je bent en wat af is.
- Per set gewicht en herhalingen in grote vakken, met het eigen cijferblok onderaan in plaats van het toetsenbord van de telefoon.
- Afvinken start vanzelf de rust, met een rustbalk die je met de duim bedient (min 15, plus 30, Overslaan, omlaag vegen).
- Forge denkt mee zonder te duwen: Lichter of Liever niet, "past niet" met Invullen, zonder spotter minstens 1 over, en het verloop achter één rustige knop bij de klok.
- Een training is een sessie die blijft staan tot Afronden of Verwijderen, met een klok die een som is en geen timer.
- Een eigen set is herkenbaar (omlijnd nummer), een weggehaalde set van het programma krijgt één regel met Terugzetten, vegen verwijdert met Ongedaan maken.
- Eén mint accent: Afronden. Voortgang (vinkjes, balk, huidige kaart in de strook) is mint, de rest is marine.

## 2. Wat niet goed is

Uit de screenshots en de code:

- Dubbel. Ruilen, Opwarmset en Notitie staan als knoppen onder de naam en nog een keer in het menu van de oefening. Set toevoegen staat onder de sets en in het menu. Afronden staat in de kop en in het menu van de training. Kleiner maken is de terugknop en ook een regel in dat menu. De tips (cues) onderaan het menu staan ook in het blad met de tekening (Doen, Let op, Vaak fout).
- Het menu van een oefening heeft negen regels plus tips, in een volgorde die niet groepeert: Ruilen, Notitie, Gewichten van dit toestel, Tussengewicht, Set toevoegen, Opwarmset toevoegen, Laatste set verwijderen, Rust starten, Rusttijd, en soms Terug naar.
- De kolom Voorschrift herhaalt wat in de vakken staat ("6-8 herh. 2 RIR" naast een 7 in Herh.), en vier keer onder elkaar hetzelfde. Hij is ook een knop (overnemen) en zijn kop is een tweede knop (wisselen naar Vorige), allebei onzichtbaar als knop.
- RIR en Alles zijn smalle losse kolommen. Het RIR-bolletje is 24 px, het vinkvak 32 px; Alles is een woord in de kop dat alle sets afvinkt, een grote handeling achter een klein woord.
- Te veel tekst boven de sets: "0 van 4 sets · rust 3:00", de reden met Meer en Minder (een uitklapper, die de eigenaar niet mooi vindt), de notitie, en per set nog een regel voor schijven, tussengewicht of spotter.
- Op 360 px breekt "Bovenlichaam A" over twee regels, omdat de kop terug, titel, menu en Afronden naast elkaar zet.
- De naam van de oefening staat in Inter vet; volgens de ontwerptaal hoort een naam van een oefening in Marcellus.
- Lang drukken op een set opent een setmenu, maar niets laat zien dat het kan.
- Tikdoelen: de vaste doorloop telde 66 doelen kleiner dan 44 px. Het grootste deel komt uit drie soorten die op elke pagina van de pager staan: het RIR-bolletje (24 px), het vinkvak (32 px) en de kolomkoppen Voorschrift en Alles, plus de regels voor schijven en spotter (20 px hoog) en Meer. Ze hebben een onzichtbare uitbreiding met `before:`, maar die telt in de meting niet en is op een volle rij ook niet altijd vrij.

## 3. Elke knop nu en waar hij heen gaat

Kop van de training:

- Terug (Kleiner maken): blijft, links in de kop.
- Titel: blijft, Marcellus, nu op één regel omdat het menu naar de tweede regel gaat.
- Menu van de training (drie puntjes): gaat naar de tweede regel, naast Verloop.
- Afronden: blijft, de enige gevulde mint knop.
- Klok, balk, "0 van 23 sets": blijven.
- Verloop: blijft, met de stip voor nieuws.
- Gepauzeerd met Verder: blijft.
- Strook met kaartjes: blijft.

Menu van de training (nu zeven regels):

- Pauzeren of Verder: blijft.
- Kleiner maken: weg uit het menu, het is de terugknop.
- Afronden: weg uit het menu, het staat in de kop.
- Snelknoppen tonen: weg, de snelknoppen verdwijnen (zie hieronder).
- Een oefening per scherm: blijft.
- Uitleg bij deze training: blijft.
- Training verwijderen: blijft, onderaan, rood, met de bevestiging zoals nu.

Kop van een oefening:

- Kaartje met de tekening (44 px): blijft, opent het blad met tekening, spierkaart en tips.
- Naam: blijft, nu in Marcellus. Een tik op de naam opent het blad Oefening.
- Menu van de oefening (drie puntjes): blijft als zichtbare ingang, opent het nieuwe blad Oefening.
- "0 van 4 sets · rust 3:00": wordt de voorschriftregel plus een regel "Rust 3:00 tussen sets". Hoeveel sets af zijn zie je aan de vinkjes en in de kop.
- Snelknop Ruilen: naar het blad Oefening, groep Oefening.
- Snelknop Opwarmset: naar het blad Oefening, groep Sets.
- Snelknop Notitie: naar het blad Oefening, groep Oefening. Een notitie die er is staat zoals nu onder de kop, en een tik erop opent hem.
- Reden met Meer en Minder: weg uit de kaart, de hele reden staat bovenaan het blad Oefening onder "Waarom zo".
- Lichter met Liever niet, Past niet met Invullen of Aanpassen: blijven in de kaart, het zijn voorstellen voor nu.
- Stille regel "nog steeds te zwaar": blijft.

Menu van de oefening (nu negen regels plus tips), wordt het blad Oefening in vier groepen:

- Ruilen: groep Oefening.
- Terug naar de oude oefening: groep Oefening, op de plek van Ruilen zolang je geruild hebt.
- Notitie: groep Oefening.
- Uitleg en tekening: nieuw als regel in groep Oefening, opent hetzelfde blad als het kaartje.
- Tips (cues) onderaan: weg, ze staan al in het blad met de tekening.
- Set toevoegen: groep Sets.
- Opwarmset toevoegen: groep Sets.
- Laatste set verwijderen: groep Sets.
- Alles (kolomkop): groep Sets, als "Alle sets afvinken".
- Rust starten: groep Rust, als "Rust nu starten".
- Rusttijd met min en plus: groep Rust.
- Gewichten van dit toestel: groep Toestel, alleen bij een kabel of gewichtsblok.
- Tussengewicht van dit toestel: groep Toestel, alleen daar.

De tabel met sets:

- Kolomkop Voorschrift met wisselpijltje: weg. De kolom wordt vast "Vorige keer".
- Tik op het voorschrift (overnemen): naar het blad Set, als "Voorschrift overnemen".
- Kolom en bolletje RIR: weg uit de rij. Invullen in het cijferblok en in het blad Set; tonen in de rij alleen als jij het gaf.
- Kolomkop Alles: weg, naar het blad Oefening.
- Setnummer: wordt een knop van 44 px die het blad Set opent. Vegen naar links op het nummer blijft verwijderen.
- Vakken kg en Herh.: blijven, iets breder.
- Vinkvak: blijft, nu echt 44 bij 44.
- Lang drukken op een rij (setmenu): blijft als tweede weg, opent hetzelfde blad Set.
- Vegen naar links: blijft zoals het is.
- Regel schijven onder een set: blijft als tekst, geen knop meer; de stang staat al in het cijferblok.
- Regel tussengewicht ("70 + 2,3 kg"): blijft als tekst.
- Teken zonder spotter: één keer per oefening onder de voorschriftregel, als regel van 44 px hoog die de uitleg opent.

Onder de sets:

- Set toevoegen: blijft, de ene plek waar je dat direct doet.
- "Set 3 verwijderd" met Ongedaan maken: blijft.
- "1 set van je programma verwijderd" met Terugzetten: blijft.

Setmenu (nu drie regels, lang drukken), wordt het blad Set:

- Voorschrift overnemen: blijft.
- Set kopiëren: blijft.
- Set verwijderen: blijft, rood, onderaan.
- Nieuw: de keuze "Hoeveel had je nog over?" (nu een los blad achter het RIR-bolletje).

Rustbalk en cijferblok:

- Rustbalk: blijft zoals hij is.
- Cijferblok: blijft, met bij Herhalingen van een werkset één rij "Over" erboven (zie 4.1).

## 4. Het voorstel

Het principe: in de kaart staat alleen wat je per set nodig hebt (gewicht, herhalingen, afvinken; de rust volgt vanzelf). Alles wat je soms doet staat op één plek per niveau: het blad Oefening voor de oefening, het blad Set voor een set, het menu van de training voor de training. Geen knop staat twee keer op hetzelfde scherm.

### 4.1 Eén set

De rij heeft vijf kolommen, op 360 px binnen de kaart ongeveer 320 px breed: setnummer 44, Vorige keer de rest (ongeveer 84), kg 72, Herh. 56, vinkvak 48, met 4 px ertussen.

Van links naar rechts:

1. Setnummer, een rondje van 28 px in een knop van 44 bij 44: "W" voor een opwarmset, het nummer voor een werkset, omlijnd voor een eigen set, mint gevuld als hij af is (zoals nu). Een tik opent het blad Set (`data-sheet-from` op de knop). Hier begint ook de veeg naar links.
2. Vorige keer, gedempt, Inter tabular 14 px: "60 × 8". Een opwarmset toont de opwarmset van toen. Geen tik. Is er voor deze set geen vorige keer, dan blijft het vak leeg; heeft de hele oefening er geen, dan zegt de kop "Eerste keer" (zie 4.2). Een eigen set laat het vak leeg; het omlijnde nummer zegt al dat hij van jou is, dus de tekst "eigen set" vervalt.
3. kg, het vak zoals nu (`ValueCell`), een tik opent het cijferblok. Bij een toestel met hulp heet de kop "hulp kg".
4. Herh., het vak zoals nu. Bij een oefening op tijd heet de kop "sec" en is er geen vak kg.
5. Vinkvak: zichtbaar 36 px, tikvlak 44 bij 44 zonder `before:`-truc. Afvinken werkt zoals nu: start de rust, en zonder eigen RIR wordt het doel bewaard met `rirAssumed`.

Een set die af is: de rij krijgt de lichte mint achtergrond zoals nu. Gaf je zelf een RIR, dan staat onder het getal in het vak Herh. klein "2 over" (12 px, gedempt). Een aangenomen RIR toon ik niet in de rij: het is geen meting.

Onder de rij, alleen als het nodig is, één regel tekst van 12 px zonder knop: de schijven per kant ("per kant 20 + 5") of het tussengewicht ("70 + 2,3 kg").

RIR invullen. Het cijferblok krijgt bij het veld Herhalingen van een werkset één rij boven de cijfers: "Over" met 0, 1, 2, 3, 4 en 5+ (zes knoppen van 44 px). Het doel van het voorschrift heeft een rand, je keuze is mint (`--color-action-muted`, een gekozen keuze). Kiezen is geen extra stap: Volgende gaat zoals nu van kg naar Herh. naar de volgende set. Dit sluit aan op de reparatie van het cijferblok en moet daarna gebouwd worden. Na het afvinken kan het ook in het blad Set, en een tik op het vak Herh. van een set die af is opent het cijferblok met dezelfde rij.

### 4.2 Eén oefening

Van boven naar beneden in de kaart (`Card`-chrome zoals nu, `--color-raised`):

1. Kop: links het kaartje met de tekening (44 px, `ExerciseArtButton`), dan de naam in Marcellus 20 px over hoogstens twee regels, rechts de drie puntjes (44 px). De naam en de puntjes openen allebei het blad Oefening. Een afgeronde oefening krijgt het mint vinkje voor de naam, zoals nu.
2. Voorschriftregel, 14 px gedempt, uit de lopende bouw: "4 sets van 6 tot 8 herhalingen, 2 over" of "4 sets van 9+ herhalingen tot falen". Deze regel draagt nu ook het bereik en de reserve die eerst in de kolom Voorschrift stonden. Wijkt een set af (bijvoorbeeld alleen de laatste tot falen), dan zegt de zin dat ("3 sets van 6 tot 8, 2 over, de laatste tot falen"); dat hoort bij de engine-functie van de lopende bouw, niet bij de rij. Na een ruil komt erachter "· voor Barbell Bench Press".
3. Regel "Rust 3:00 tussen sets", 12 px gedempt. Is er geen vorige keer: "Rust 3:00 tussen sets · eerste keer".
4. Alleen bij een stang zonder spotter: een regel van 44 px hoog met het schild en "1 over, zonder spotter". Een tik opent de uitleg met Begrepen, zoals nu. Eén keer per oefening, verdwijnt zodra je zelf 0 invult.
5. Notitie, als die er is: het notitie-icoon in mint en de tekst, de hele regel minstens 44 px hoog; een tik opent het notitieblad.
6. Voorstellen, als die er zijn, zoals nu: Lichter met Liever niet, of Past niet met Invullen. Daarna de stille regel "nog steeds te zwaar".
7. De kop van de tabel als gewone tekst van 12 px (geen knoppen): Set, Vorige keer, kg, Herh., en een leeg vak boven de vinkjes (alleen voor schermlezers "Gedaan").
8. De sets (4.1).
9. Regel "Set 3 verwijderd" met Ongedaan maken, of "1 set van je programma verwijderd" met Terugzetten, zoals nu.
10. "Set toevoegen" als `TextButton` met plus, 44 px hoog.

Wat er niet meer in de kaart staat: de rij snelknoppen, de reden met Meer, "0 van 4 sets", de kolommen Voorschrift en RIR, Alles.

Op de screenshot van 390 px schuift de eerste set daardoor ongeveer 90 px omhoog (de rij snelknoppen en een deel van de kop vallen weg), en de vier werksets zijn lager omdat de voorschrifttekst per rij niet meer over twee regels gaat.

### 4.3 Het blad Oefening

Een blad van onderen (`ForgeSheet` met `useSheetClose`, `ref={sheetRef}`, de greep die de vinger volgt), titel de naam in Marcellus. Vier groepen onder een `Eyebrow`, elk met `MenuRow`-regels van minstens 52 px. Geen tabbladen en geen uitklappers: één blad dat scrolt.

Bovenaan, als er een reden is: "Waarom zo" als Eyebrow en de hele reden als gewone tekst van 14 px, met "Jij doet er 4." als het aantal verschilt. Dit vervangt Meer en Minder in de kaart.

OEFENING
- Ruilen, met "Zelfde spieren, met wat je sportschool heeft. Alleen voor deze training." Na een ruil staat hier "Terug naar Barbell Bench Press".
- Notitie, met de notitie zelf als tweede regel, of "Bijvoorbeeld de stand van de stoel."
- Uitleg en tekening, opent het blad met tekening, spierkaart en tips. Niet als de instelling Plaatjes bij oefeningen uit staat of de oefening onbekend is.

SETS
- Set toevoegen.
- Opwarmset toevoegen. Niet bij een oefening op tijd.
- Alle sets afvinken, met "Ook de rust start." Staan ze allemaal al aan, dan "Alle vinkjes weghalen".
- Laatste set verwijderen, met "Een set die je al afvinkte blijft staan." Niet als er maar één set is.

RUST
- Rusttijd met min 15 en plus 15 zoals nu (`RestStepper`), met "Je eigen tijd voor deze oefening" of "Geschat: zwaarder en samengesteld langer".
- Rust nu starten, met "Ook als hij niet vanzelf start."

TOESTEL, alleen bij een kabel of gewichtsblok
- Gewichten van dit toestel, met "Je eigen lijst in [sportschool]."
- Tussengewicht, met "[gewichten] erbij, in [sportschool]."

De tips onderaan het huidige menu verdwijnen hier; ze staan in Uitleg en tekening. In een training om mee te kijken (MacroFactor, alleen lezen) blijven alleen Notitie lezen en Uitleg; in een voorbeeld van een dag die nog komt alleen Uitleg en de notitie als tekst.

### 4.4 Het blad Set

Opent met een tik op het setnummer, of met lang drukken op de rij. Titel "Set 3" (Inter, want het is een getal met een woord; geen Marcellus), daaronder in 12 px de naam van de oefening.

1. Eén regel met het voorschrift van deze set ("6 tot 8 herhalingen, 2 over") en wat je vorige keer deed ("Vorige keer 60 kg × 8").
2. "Hoeveel had je nog over?" met 0 tot 5+ als knoppen van 48 px, zoals het huidige RIR-blad. Niet bij een opwarmset of een set op tijd.
3. Voorschrift overnemen, met "Kilo's en herhalingen zoals het voorschrift ze vraagt." Niet als de set af is.
4. Set kopiëren, met "Een kopie van deze set eronder."
5. Set verwijderen, rood. Niet als het de laatste set is; dan staat er in de plaats één regel "De laatste set van een oefening blijft staan."

### 4.5 Het hele scherm

Van boven naar beneden:

1. Kop, regel één: terug (44 px), de naam van de training in Marcellus 20 px op één regel, Afronden (mint gevuld, 44 px hoog). Op 360 px past "Bovenlichaam A" nu, omdat de drie puntjes naar regel twee gaan. Een naam die toch te lang is kapt af met een beletselteken; de volle naam staat in het menu van de training.
2. Kop, regel twee: de klok (Inter tabular), de balk, "0 van 23 sets", Verloop (44 px, met de stip), het menu van de training (44 px).
3. Gepauzeerd met Verder, alleen tijdens een pauze.
4. De strook met kaartjes, zoals nu.
5. Alleen op de eerste pagina: de regel of het paneel over je benen, zoals nu.
6. De pager met per pagina één oefening (4.2).
7. Onderaan, als ze er zijn: de rustbalk, het cijferblok erboven of eronder zoals nu.

Het menu van de training heeft nog vier regels: Pauzeren of Verder, Een oefening per scherm, Uitleg bij deze training, Training verwijderen.

Met "Onder elkaar" (de lijst) is elke oefening dezelfde kaart; een afgeronde oefening klapt zoals nu in tot één regel met de samenvatting. Dat laat ik staan: het is geen uitleg die je opent, het is een af stuk dat kleiner wordt.

Tikdoelen: na dit voorstel is er in de training niets meer kleiner dan 44 bij 44 px. Het RIR-bolletje en Alles verdwijnen uit de rij, de kolomkoppen zijn geen knoppen meer, het vinkvak en het setnummer krijgen een echt vlak van 44, de regels voor schijven en tussengewicht zijn tekst, en de spotterregel en de notitie zijn 44 hoog. Lookout telt na de bouw opnieuw; het doel is 0.

### 4.6 Lege, laad- en foutstand

Leeg:
- Een training zonder oefeningen: de zin "Deze training heeft nog geen oefeningen." zoals nu, met daaronder een `SecondaryButton` "Sluiten". Geen klok, geen Afronden.
- Een oefening zonder vorige keer: de kolom Vorige keer blijft leeg en de rustregel zegt "eerste keer". Geen streepjes of nullen.
- Een oefening zonder voorschrift voor gewicht (nieuw, geen schatting): het vak kg is leeg, zoals nu op de screenshot; de voorschriftregel noemt dan alleen sets en herhalingen.
- Ruilen zonder keuzes: de zin zoals nu ("ASCEND kent deze oefening niet goed genoeg...").
- Een toestel zonder eigen gewichten: in de groep Toestel "Vul in wat er hangt in [sportschool]."

Laden:
- Forge opent nooit op een leeg scherm: de kop met de naam, de strook en de eerste kaart komen uit de template en het concept, die er meteen zijn.
- De tekening laadt nog: het kaartje toont de spierkaart en wisselt met een fade van 200 ms, zoals nu. Het blad Uitleg toont de spierkaart als hoofdbeeld tot de tekening er is.
- Opslaan bij Afronden: zoals nu met een grens van 15 seconden en een zichtbare uitkomst.

Fout:
- De tekening laadt niet: het blijft de spierkaart, zonder melding.
- Een concept dat niet bewaard kan worden (opslag van het toestel vol of geweigerd): één regel in amber onder de kop, "Je sets worden nu niet bewaard op dit toestel. Rond af voordat je de app sluit." Of dat nu al zo gemeld wordt heb ik niet nagekeken; als het er nog niet is, is het een kleine toevoeging.
- Afronden mislukt: het blad Afronden blijft open met de reden en Opnieuw, het concept blijft staan.

### 4.7 Beweging

Alles zoals de ontwerptaal het vraagt: de bladen komen van onderen met `forge-up`, volgen de vinger en sluiten via `useSheetClose`; een rij die een blad opent krijgt `data-sheet-from`. De rij "Over" in het cijferblok verschijnt zonder animatie, want hij hoort bij het veld. Het wegvallen van de snelknoppen haalt ook `mx-quick` weg. Geen nieuwe lus.

## 5. Wat ik bewust niet doe

- Geen tweede mint knop. Afronden blijft het ene accent; Set toevoegen en de regels in de bladen zijn rustig.
- Geen nieuwe uitklappers. Meer en Minder verdwijnen; de reden staat in het blad.
- Geen tabbladen of segmentknop in het blad Oefening, maar vier groepen onder elkaar.
- Lang drukken is niet langer de enige weg naar het setmenu, maar het blijft werken voor wie het kent.
- Ik verander niets aan hoe Forge rekent: voorschrift, Lichter, past niet, spotter, doorvoeren en verloop blijven gelijk. Sets tellen via `isWorkSet`; er blijft hoogstens één sessie; een bestaand log wordt nooit beschreven.
- Geen beloningen, geen records met vlaggetjes, geen kleur per spiergroep in de rij. Forge blijft een rustig gereedschap, geen bodybuilding-app.
- Ik haal het vegen om te verwijderen niet weg en voeg geen tweede veeg toe.
- Ik verplaats Verloop niet; het hoort bij de hele training en staat goed bij de klok.

## 6. Opgeslagen vormen en instellingen

Er hoeft niets aan een opgeslagen vorm te veranderen.

- `AppSettings.forgeQuickButtons` wordt niet meer gelezen. Het veld mag in oude back-ups blijven staan en wordt genegeerd; geen migratie. De rij "Snelknoppen tonen" gaat uit `settingsIndex.ts`, `settingsLayout.ts` (bundel Bij het invullen), `settingsSummary.ts` en de groepspagina van Forge.
- Het veld `column` in het concept (Voorschrift of Vorige) wordt niet meer gebruikt; een oud concept opent gewoon met Vorige keer.
- RIR blijft `SetLog.rir` met `rirAssumed`, precies zoals nu; alleen de plek van het invullen verandert.
- Dit vraagt een nieuw besluit dat delen vervangt van `2026-10-29-snelknoppen-in-forge.md` en de aanvulling (de rij knoppen en de instelling), en van `2026-10-28-zonder-spotter.md` (het teken bij de oefening in plaats van bij de set). De oude besluiten blijven staan zoals ze zijn.

## 7. Volgorde om te bouwen

Elke stap is los te zien en los terug te draaien.

1. Het blad Oefening in vier groepen, ter vervanging van het menu, met Waarom zo bovenaan en zonder de tips. Klein tot middel, alleen `ForgeWorkout.tsx`. De snelknoppen blijven nog even staan.
2. Het blad Set: het setnummer als knop van 44 px, met de RIR-keuze, Voorschrift overnemen, kopiëren en verwijderen. Lang drukken opent hetzelfde blad. Het losse RIR-blad gaat erin op.
3. De kop van de oefening: naam in Marcellus, de voorschriftregel uit de lopende bouw, de rustregel, de spotterregel per oefening, de notitie als regel van 44 px, Meer en Minder weg.
4. De rij: de kolom wordt Vorige keer, RIR en Alles uit de rij, vinkvak 44, schijven en tussengewicht als tekst. Pas na de reparatie van het cijferblok: de rij "Over" erin. In dezelfde stap de snelknoppen en hun instelling weg, en het besluit vastleggen.
5. De kop van de training: menu naar regel twee, het menu terug naar vier regels.
6. Doorloop door Lookout op 360 en 390 px met vertraagde processor, met de telling van tikdoelen op 0 en een screenshot van elk veranderd blad.

## 8. Besluiten voor de eigenaar

1. Mogen de snelknoppen Ruilen, Opwarmset en Notitie weg, met hun instelling? Ze komen dan in het blad Oefening, één tik dieper dan nu, maar zonder dubbel. Wil je liever één knop houden, welke?
2. Mag de kolom Voorschrift weg, zodat de tweede kolom altijd laat zien wat je vorige keer deed? Het bereik en de reserve staan dan in de regel onder de naam.
3. Mag RIR uit de rij? Je vult het in het cijferblok in (een rij "Over" boven de cijfers) of in het blad Set, en de rij toont het alleen als jij het gaf.
4. Gebruik je Alles (alle sets in één keer afvinken) vaak? In het voorstel staat het in het blad Oefening.
5. Mag het teken "1 over, zonder spotter" één keer onder de voorschriftregel staan in plaats van bij de eerste open set?
6. Mogen Kleiner maken en Afronden uit het menu van de training, omdat ze al in de kop staan?
7. Mag de naam van de oefening in Marcellus, zoals de naam van de training?
