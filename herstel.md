# Herstelopdracht Week-telling (Warden, 15 november)

Beoordeeld: `origin/claude/week-telling` (dd92b19) gemerged op `origin/claude/nacht` (c62f1dd), zonder conflicten. Niet akkoord, om één blokkerend punt. De inhoud van de wijziging klopt; er is niets naar nacht gepusht.

## Blokkerend

1. `docs/kennisindex/bronnen.json`: het nieuwe besluit `docs/beslissingen/2026-11-15-week-telling-zonder-sportschool.md` heeft geen regel. `npx vitest run` is daardoor rood (2 toetsen in `scripts/kennisindex/kennisindex.test.mjs`) en `npm run kennisindex:vergelijk` zegt "Geen regel in bronnen.json". Voeg de regel toe (onderwerpen planning en week, kern in één zin, stand geldt), zet bij `2026-11-14-vakantie-en-ziek-niet-gemist.md` (regel 2713) in de kern of stand dat zonder sportschool voor gemist is vervangen, draai `npm run kennisindex` en commit de nieuwe index. Daarna moet de vergelijking "Geen verschil met docs/kennisindex/." zeggen.

## Moet (klein, in dezelfde ronde)

2. `src/engine/fullWeek.ts` regel 122: `!away(from)` krijgt geen sjabloon mee. Een sportschooltraining die je zelf van een dag zonder sportschool naar later zette, telt nu als verlies (`how: 'moved'`), terwijl dezelfde training op die dag in Week Vervallen is. Geef `ctx.tpl(s)` mee, zoals op regel 121, met een toets (sportschool telt niet, een loop wel).
3. Tekstkaart: `npm run kaart:vergelijk` geeft geen verschil, dus geen enkele stand toont een overgeslagen rij of een periode zonder sportschool in Week. De gevonden inconsistentie (kaart zegt n gemist, de rijen zeggen iets anders) hoort volgens CLAUDE.md een invariant te worden: het getal op "Je hebt n training gemist" is gelijk aan het aantal dagrijen met de stand Gemist, in een stand met een periode zonder sportschool, een gemiste loop, een vervallen sportschooltraining en een overgeslagen rij.
4. Bewaking van de ene afleiding: het type dwingt de sjablonen af bij `PauseContext` en `leftOutOfCount`, maar niets houdt een nieuwe regel tegen die `isAwayDay` weer voor gemist gebruikt. Voeg een scan toe (bij `src/engine/weekTelling.test.ts`) die de bestanden telt die `isAwayDay` importeren: alleen `reentry.ts`, `repeatWeek.ts` en `adviceWeek.ts` (REST-SWAP).

## Mag

5. `src/engine/adviceWeek.ts` regel 150 (REST-SWAP) leest nog `isAwayDay(asOf)`: op een dag zonder sportschool komt het inhalen op een rustdag nu wel, de rustdagruil niet. Kies `isPauseDay`, of noem REST-SWAP in het besluit bij wat bewust een week weg blijft lezen.
6. Zondag met Heuvelintervallen nog open geeft nu het voorstel "Lange duurloop vervalt. De rest van je week blijft zoals gepland." Dat is het gewone advies als er geen vrije dag is, en het is een voorstel met Akkoord en Liever niet. Overweeg of het moet wachten tot de dag om is; nu kan het lezen als opgeven om 10:40.

## Wat ik naspeelde (nagemaakt, vorm van de melding)

Periode zonder sportschool 14 tot en met 18 november; vr 13 Bovenlichaam B en Rustige duurloop overgeslagen; za 14 Lange duurloop (type hiking, geruild) plus een sportschooltraining Benen B; zo 15 Heuvelintervallen (geruild); ma 16 rustdag.

Voor (nacht), zondag 10:40: vr twee keer overgeslagen, za Lange duurloop Vervallen met amber "1 dag voor Heuvelintervallen", zo Heuvelintervallen met amber "1 dag na Lange duurloop", kaart 0 gemist, terugblik "2 van 4" met Bovenlichaam B en Rustige duurloop als gemist, geen vraag Niet gedaan?, geen inhaaladvies. Zonder de periode: "Lange duurloop doe je morgen in plaats van je rustdag, want vandaag deed je geen training", en Week keurt dat daarna af (LEG-SPACING, Heuvelintervallen zo en Lange duurloop ma achter elkaar).

Na (gemerged), per dag:
- vr 13: beide overgeslagen (woord overgeslagen, gedempt teken); kaart 0; terugblik 2 van 6, gemist niets.
- za 14: Lange duurloop en Benen B vandaag; kaart 0; geen advies.
- zo 15, Heuvelintervallen open: Lange duurloop gemist, Benen B Vervallen, geen amber; kaart 1; terugblik gemist Lange duurloop; Niet gedaan? over Lange duurloop; advies "Lange duurloop vervalt", niets op maandag, geen "vandaag deed je geen training".
- zo 15, Heuvelintervallen gedaan: hetzelfde, terugblik 3 van 6.
- zo 15, Heuvelintervallen overgeslagen: "Lange duurloop haal je in op zo 15 november"; Week geeft daarna geen punt.
- ma 16, Heuvelintervallen gedaan: kaart 1; "Lange duurloop vervalt" (niet op de rustdag direct na de heuvels).
- ma 16, Heuvelintervallen niet gedaan: kaart 2; Lange duurloop vandaag in plaats van de rustdag, 45 minuten, "want gisteren deed je geen training" (klopt), Heuvelintervallen vervalt; Week geeft daarna geen punt.
- ma 16, Heuvelintervallen overgeslagen: kaart 1; hetzelfde inhaaladvies zonder de heuvels.

## Controles op de proefbranch

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen.
- `npx vitest run`: rood, 2 van 10765 toetsen, beide de kennisindex (punt 1). De rest groen, ook `src/storage/planGolden.test.ts` (niet aangeraakt).
- `npm run build`: groen.
- `npm run kaart:vergelijk`: 100 schermen gelijk, geen verschil, geen schendingen (zie punt 3).
- `npm run kennisindex:vergelijk`: rood (punt 1).

Niet gecontroleerd: de schermen zelf in Chromium (Lookout), en de echte back-up (alleen de nagemaakte vorm).
