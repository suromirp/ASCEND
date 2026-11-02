# Gegevens herinrichten: Stand, weekterugblik en Logboek

Datum: 2026-11-02
Status: aangenomen

## Besluit

Stand, de weekterugblik en het Logboek zijn opnieuw ingericht volgens `docs/visie/Ontwerprapport gegevens.md`, met voor elke open vraag uit hoofdstuk 8 de aanbevolen keuze. Er is niets nieuws opgeslagen en niets in de planning veranderd: alles is afgeleid.

## De keuzes uit het rapport

1. Het lichte vlak "Je stand in vier regels" is weg. Stand heeft geen `SkyPanel` meer. De lucht bovenaan draagt één zin en drie kolommen (Benen, Belasting, Ritme), elk een sprong naar zijn kaart.
2. Het percentage "Klaar voor je doel" staat alleen op Ascend. Stand toont het niet meer.
3. "Op rij" komt alleen in beeld vanaf drie trainingsdagen ("Nu 5 trainingsdagen op rij alles gedaan."), nooit als 0, 1 of 2.
4. De avontuurkaart (het kamp) en de les van de week verlaten Stand. Het kamp is de ladder op Ascend, de les staat in Kennis. Er komt niets nieuws op Ascend of Vandaag bij; de bouwstenen `AdventureCard` en `LessonCard` blijven in de code.
5. De weekterugblik op zondag: de kaart op Vandaag wacht tot wat vandaag gepland staat gedaan is. Staat er nog iets, dan verschijnt hij pas maandag. Het blad heet op zondag "Je week tot nu" en noemt niets "blijven liggen" wat vandaag nog kan. Geen nieuwe instelling: dit valt onder `weekterugblik-dag`.
6. Het Logboek is wat je deed: geen "van 17" en geen "Gemist". De telling van wat gepland stond staat bij Ritme op Stand.
7. De weekterugblik is de kop van elke week in de lijst van het Logboek. De losse lijst "Weekterugblikken" is weg.
8. Gemiddelde cadans en vermogen per maand zijn weg; ze staan per training in het logblad.
9. Lichaam blijft puur voor klachten: geen stille rij naar Benen. Lichaam, Ascend en het jaaroverzicht zijn in deze ronde niet aangepast.

## Gem. zwaarte wordt minuten rustig en hard

`engine/weekEffort.ts`. Rustig is zone 2 of lager, hard is alles erboven, dezelfde grens als Intensiteit op Stand. Per training in deze volgorde: gemeten hartslagzones (als er een profiel en genoeg hartslag is), anders je eigen zwaarte (6 of hoger is hard), anders wat het plan van de training zegt. Kracht telt alleen mee met een eigen zwaarte; zonder die staat de tijd apart en telt hij niet mee. De regel staat onder de dagen van de afgesloten week ("1:20 uur rustig, 36 min hard"). Er is geen nieuw percentage en geen "x van y" bij Klaar voor je doel.

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
