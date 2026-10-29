# Snelknoppen in Forge, en sets vegen, toevoegen en terugzetten

Datum: 2026-10-29
Status: aangenomen

## Besluit

Onder de naam van elke oefening in een Forge-training staat een rij van vier kleine knoppen: Ruilen, Opwarmset, Set erbij en Notitie. De rij aan of uit zetten kan in het menu van de training ("Snelknoppen tonen") en in de instellingen onder Forge, "Bij het invullen"; standaard aan. Het menu met de drie puntjes blijft alles houden.

Een set verwijder je door hem naar links te vegen. Wat jij toevoegt of weghaalt blijft zichtbaar: een eigen set heeft een omlijnd nummer en de tekst "eigen set", en een set die je van het programma weghaalde staat in één stille regel met "Terugzetten".

## Reden

De eigenaar wil de handelingen die hij vaak gebruikt zichtbaar hebben en niet achter het menu. Er is op een telefoon genoeg ruimte voor een rij onder de kop. De lange uitlegtekst onder de kop klapt daarom in tot één regel met "Meer", zodat de knoppen en de sets hoger staan.

Waarom deze vier: Ruilen (je sportschool heeft het toestel niet), Opwarmset (de oefening begint zwaarder dan gedacht) en Set erbij (je hebt meer in je) zijn de handelingen die je midden in een training doet en die nu twee tikken kosten. Notitie hoort bij de stand van een toestel, die je bij elke keer opnieuw wilt weten. Uitleg heeft al een plek (het kaartje links van de naam), Vorige keer ook (de kolomkop Voorschrift/Vorige), Verloop gaat over de hele training en staat bij de klok. Rust starten volgt vanzelf na een set. Een oefening op tijd krijgt alleen Ruilen en Notitie.

De knoppen zijn omlijnd en gedempt: er is geen tweede mint accent, Afronden blijft het ene accent. Elke knop is 44 px hoog, de rij scrolt zijwaarts als hij niet past (360 px). De rij klapt met een korte fade in of uit (Rustig en Uit: meteen de eindstand), er draait geen lus.

Vegen: de rij volgt je vinger 1 op 1. Voorbij ongeveer 25% van de breedte blijft de rij openstaan met een rode knop van 72 px (rondje met een min, "Set 3 verwijderen"); voorbij 60%, of bij een snelle veeg die ver genoeg ging, verwijdert hij meteen. De richting wordt na 8 px bepaald, verticaal blijft scrollen. Het vegen start niet op kg, herhalingen, RIR of het vinkje. Hoogstens één rij staat open; een tik ergens anders of scrollen sluit hem. Een melding onder de sets zegt "Set 3 verwijderd" met "Ongedaan maken" en verdwijnt na tien seconden. Ook een afgevinkte set kan weg, de laatste rij van een oefening niet. Zonder vegen kan het ook: lang drukken op een set opent het setmenu met "Set weghalen".

Het verloop van de training toont het toevoegen en weghalen als eigen handelingen (soorten toegevoegd en weggehaald), zonder stip op de knop.

## Alternatieven

Zes of acht knoppen (zoals de rij bij MacroFactor): te druk op 360 px. Een knop voor Verloop per oefening: het verloop is er voor de hele training. Een melding in de gewone meldingsbalk (`ChangeNotice`): die is voor wijzigingen aan de planning, deze melding hoort bij de oefening zelf. Een spookrij voor een weggehaalde set: rommelig en je telt hem per ongeluk mee.

## Bron

Een wens van de eigenaar. Het vegen is een gewoon patroon op telefoons; er is niets overgenomen van een andere app.

## Vervangt

Niets. Het kaartje van de oefening is aangevuld in `2026-10-28-plaatjes-bij-oefeningen-kaartje.md`.

## Terugdraaien

Zet "Snelknoppen tonen" uit. Het vegen is niet uit te zetten; "Set weghalen" in het setmenu blijft. De opgeslagen vorm is optioneel (`AppSettings.forgeQuickButtons`, `WorkoutExercise.dropped`), er is geen migratie.

## Open punt

De eigenaar zag in een screenshot bij een bankdrukoefening een set "7+ met 0 RIR, tot falen" terwijl "Zonder spotter" dat naar 1 over hoort te brengen. De regel zelf klopt in de engine, ook voor namen als "Barbell Bench Press" (test `spotterBarbellName.test.ts`, bestaande tests voor setdoelen met falen). Een oorzaak die kan: een training die je opende voor deze regel er was blijft als concept staan zoals hij was (`resumeDraft`, bewust, getest in `forgeInput.test.ts`). Anders staan er veiligheidsarmen aan bij Je sportschool of is Zonder spotter uit. Niet aangepast, wel nagevraagd.
