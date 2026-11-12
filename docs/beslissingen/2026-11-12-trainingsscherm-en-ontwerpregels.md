# Eén scherm vooraf, Hoe ging het? als blad, en acht ontwerpregels voor de hele app

Datum: 2026-11-12
Status: aangenomen

## Besluit

Het ontwerp `docs/visie/Ontwerp trainingsscherm minimaal.md` wordt gebouwd in de sporen van hoofdstuk 7, en de acht regels van hoofdstuk 6 gelden voor alle nieuwe en herziene schermen. De zes vragen, op advies van Cartographer:
1. De Briefing is het enige scherm vooraf voor een training te voet; Zelf invullen wordt het blad Hoe ging het?.
2. Na een loop van je horloge alleen gevoel en pijn, met de instelling "Vragen na je loop" (Kort als advies, of Alles). Voorwaarde: de bouwer toont eerst wat de belasting doet met een log zonder zwaarte. Valt de belasting dan weg of wordt hij een gok, dan blijft de zwaarte in Kort staan, met de waarde van het horloge vooraf ingevuld als die er is.
3. De hartkaart boven de kaart met je lus, het hoogteprofiel onder de lus.
4. De Eyebrow in hoofdletters blijft, als drager van de tabkleur, maar streng: hoogstens één per kaart, nooit als kop van een lijst zonder kaart. Dit wijkt bewust af van het voorstel van Pathfinder.
5. De beendag gaat van amber naar `--color-sage`; dat krijgt bij spoor 10 een eigen besluit en een regel in `docs/architectuur/ontwerp-en-tokens.md`.
6. Hoe ging het? na een horloge-loop wordt een rij bovenaan Je dag; de kaart verhuist bewust van `engine/todayCards.ts` naar `engine/yourDay.ts`. Pas bouwen nadat Je dag (besluit `2026-11-12-je-dag.md`) op main staat.

## Reden

De eigenaar vond het trainingsscherm onoverzichtelijk, te ingewikkeld en niet mooi, en vroeg om een mooiere UI en makkelijkere UX voor alles wat we verbeteren. Hij liet de keuzes aan de coördinator ("het moet passen bij de rest van ASCEND"). Zone en praattest stonden vier keer, het horloge drie keer, en twee schermen vertelden hetzelfde.

## Alternatieven

Het oude scherm opruimen en de Briefing ernaast houden: blijft twee schermen voor één training. Koppen in zinsletters overal (Pathfinder): verliest de tabkleur, die nu de enige kleur per tab is.

## Bron

Gesprek met de eigenaar op 12 november, `docs/visie/Ontwerp trainingsscherm minimaal.md`, `docs/onderhoud/2026-11-12-pathfinder-totaalplaatje-ui.md`.

## Vervangt

Het oude trainingsscherm voor lopen en wandelen; `docs/beslissingen/2026-11-11-briefing.md` blijft en wordt aangevuld.

## Terugdraaien

Per spoor. Logs, afvinken door het horloge en de planning veranderen niet, dus terugdraaien raakt geen gegevens.
