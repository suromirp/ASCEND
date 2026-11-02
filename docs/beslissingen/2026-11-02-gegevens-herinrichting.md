# Gegevens herinrichten: Stand, weekterugblik en Logboek

Datum: 2026-11-02
Status: aangenomen

## Besluit

Stand, de weekterugblik en het Logboek zijn opnieuw ingericht volgens `docs/visie/Ontwerprapport gegevens.md`, met voor elke open vraag uit hoofdstuk 8 de aanbevolen keuze. Er is niets nieuws opgeslagen en niets in de planning veranderd: alles is afgeleid.

## De keuzes uit het rapport

1. Het lichte vlak "Je stand in vier regels" is weg. Stand heeft geen `SkyPanel` meer. De lucht bovenaan draagt één zin en drie kolommen (Benen, Belasting, Ritme), elk een sprong naar zijn kaart.
2. Het percentage "Klaar voor je doel" staat alleen op Ascend. Stand toont het niet meer.
3. "Op rij" komt alleen in beeld vanaf drie trainingsdagen ("Nu 5 trainingsdagen op rij alles gedaan."), nooit als 0, 1 of 2.
4. De avontuurkaart (het kamp) en de les van de week verlaten Stand. Het kamp is de ladder op Ascend, de les staat in Kennis. Er komt niets nieuws op Ascend of Vandaag bij; de bouwstenen `AdventureCard` en `LessonCard` blijven in de code. `Gr5ReadinessCard` is weggehaald (niets gebruikte hem nog); `Gr5ReadinessSheet` staat er nog maar wordt door geen scherm meer geopend.
5. De weekterugblik op zondag: de kaart op Vandaag wacht tot wat vandaag gepland staat gedaan is. Staat er nog iets, dan verschijnt hij pas maandag. Het blad heet op zondag "Je week tot nu" en noemt niets "blijven liggen" wat vandaag nog kan. Geen nieuwe instelling: dit valt onder `weekterugblik-dag`. De regel staat in de engine (`overviewSettings.ts#weekReviewCardShown`, met test). Staat de instelling op alleen "Zondag", dan is er geen andere dag en toont de kaart toch, als "Je week tot nu": er is nooit een week zonder terugblik.
6. Het Logboek is wat je deed: geen "van 17" en geen "Gemist". De telling van wat gepland stond staat bij Ritme op Stand.
7. De weekterugblik is de kop van elke week in de lijst van het Logboek. De losse lijst "Weekterugblikken" is weg.
8. Gemiddelde cadans en vermogen per maand zijn weg; ze staan per training in het logblad.
9. Lichaam blijft puur voor klachten: geen stille rij naar Benen. Lichaam, Ascend en het jaaroverzicht zijn in deze ronde niet aangepast.

## Gem. zwaarte wordt minuten rustig en hard

`engine/weekEffort.ts`. Het is dezelfde indeling als Intensiteit op Stand: rustig is zone 2 of lager, hard is alles erboven (stevig en hard samen). Per training in deze volgorde:

1. Gemeten hartslagzones van het horloge, alleen als de instelling "Intensiteit tellen" op hartslag staat (`resolveIntensityCounting`), er een profiel is en de hartslag genoeg van de training dekt. Kracht heeft geen zones.
2. Je eigen zwaarte. De grens is die van de coach: `EASY_RPE_TOP` (4) in `engine/coach.ts`. Tot en met 4 is rustig, hoger is hard. Eén grens voor de hele app; eerder stond hier 6, dat sloot niet aan.
3. Wat het plan van de training zegt, met de ene gedeelde functie `plannedEffortKind` in `engine/standing.ts` die Intensiteit ook gebruikt: een rol `hard_effort` telt als hard, een training zonder template als rustig.

Kracht telt alleen mee met een eigen zwaarte; zonder die staat de tijd apart (`uncounted`) en telt hij niet mee. De regel staat onder de dagen van de week ("1:20 uur rustig, 36 min hard"). Er is geen nieuw percentage en geen "x van y" bij Klaar voor je doel. Een test houdt `weekEffort` en `intensityMix` gelijk. Het verschil met Intensiteit dat blijft: de weekterugblik gebruikt ook je zwaarte (stap 2), Intensiteit niet. De hartslag en de instelling worden doorgegeven waar `buildWeekReview` wordt aangeroepen op de schermen en in de weekmelding (`DeviceNoticesHost`); de coach (`recentAdherence`) kan ze meekrijgen maar leest alleen de tellingen.

## Ritme

`engine/standRhythm.ts`. De telling is die van de coach (`recentAdherence`); de grens voor Op koers, Bijna en Achter staat nu op één plek (`adherenceStatus` in `engine/onCourse.ts`) en wordt door beide gebruikt. Per week een kolom stipjes (mint gedaan, baankleur niet gedaan, open rondje voor wat deze week nog komt). Het ene getal is "Laatste 4 weken: 18 van 23 gedaan"; deze week telt niet mee in dat getal.

## Wat er bewust niet in deze ronde zit

Uit het rapport zijn deze delen niet gebouwd: Benen als één kaart met Belasting en Intensiteit met de boodschap als kop (hoofdstuk 5.1, punt 4 en 5), de laad- en foutstand van Stand, het blad van de weekterugblik met "Wat ASCEND aanpaste" als zinnen over de huidige stand (nu de bestaande regels, binnen 7 dagen en achter een rij), Ascend (5.4), het jaaroverzicht (5.5), Lichaam (5.6) en Run in detail (5.7). Wel gebouwd in Benen: "Hoe werkt dit?" is een `InfoButton` met het bestaande blad, en de dubbele regel "Vandaag: 0,1, fris" onder de frisheidslijn is weg. Dalen toont alleen een kaart als er dalingen gemeten zijn of je doel dalen vraagt. De kaart "Index en je benen" staat er pas met metingen.

## Reden

Dezelfde vraag ("doe ik wat gepland staat?") had zes getallen. Nu staat de telling van een periode op één plek: Week voor deze week, Ritme voor de laatste weken, het Logboek voor wat je deed, Ascend voor je doel.

## Alternatieven

De zin bovenaan Stand laten staan en Ritme alleen als kaart toevoegen: afgewezen, het rapport wil dat de lucht het beeld in twee seconden geeft. "Op rij" helemaal weghalen: afgewezen, bij een goede reeks is het een mooi moment.

## Bron

`docs/visie/Ontwerprapport gegevens.md`, de backlog van ronde 3.

## Vervangt

Niets. De bewaarde volgorde van Stand met `vier-regels` wordt bij het lezen omgezet naar `ritme` (`resolveCardOrder`); `doel` valt weg. Geen schemawijziging van de export.

## Terugdraaien

Terugzetten van de commit. Er is niets opgeslagen dat daarbij verloren gaat.
