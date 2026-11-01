# Pictogrammen zwemmen, padel en voetbal

Ontwerp voor bouwstap 1 van "Sporten die meetellen" (`docs/visie/Sporten die meetellen.md`). Cartographer Pictogrammen, 1 november 2026. Een voorstel dat een bouwer letterlijk kan overnemen. Er is niets in `src` gewijzigd.

Bronnen: `docs/beslissingen/2026-10-24-pictogrammen-in-stijl-c.md`, `src/components/pictograms.tsx` (de bestaande acht: rust, lichaam, lopen, kracht, wandelen, rekken, fietsen, bergtocht) en `src/data/sports.ts` (`COUNTED_SPORTS`).

## 1. Gemeenschappelijk

- Hetzelfde `viewBox="0 0 24 24"`, dezelfde `Layer` met drie lagen (`mx-pic-1` tot en met `mx-pic-3`), dezelfde `round`-uiteinden, geen eigen kleurwaarden: alles is `currentColor` met de dekking van de laag.
- Laag 1 is de lichte vorm (`light`), laag 2 de middentint (`mid`), laag 3 de volle vorm (`full`) die het silhouet draagt. Waar een uitgespaarde lijn nodig is gebruik ik `cut` met `var(--color-card)`, zoals `kracht` en `bergtocht`.
- Elk pictogram heeft een grondlijn of een waterlijn onderin als lichte laag, net als wandelen, rekken en fietsen, zodat de zes sporten in een rij als één familie lezen.
- Lijndiktes blijven in de bandbreedte van de bestaande: 1,3 tot 1,5 voor lichte details, 2 tot 2,4 voor ledematen en randen, 3 voor een romp. Niets onder 1 (alleen de uitsparing van de racket).
- Geen mensen met spieren, geen bal in een vlam, geen medaille, geen RPG-attribuut, geen bodybuilding-houding. De figuren zijn kalme, geabstraheerde vormen zoals de wandelaar en de rekker.

## 2. Kleur

Bestaand token, geen nieuw: `colorToken: 'var(--color-sage)'` zoals de drie rijen in `COUNTED_SPORTS` nu al hebben. Reden: een sport die meetelt maar die ASCEND niet plant krijgt bewust geen eigen sportkleur (dat staat in het commentaar van `sports.ts`); het palet voor sporten is vol (oranje, lila, groen, roze, geel, en mint, ijsblauw en amber hebben een andere betekenis). Salie is "een rustige tint naast mint en ijs, voor een soort", dus past bij "dit hoort bij je week maar is niet jouw geplande training".

De aanroeper zet de kleur, het pictogram erft hem via `currentColor`. De drie tinten zijn dezelfde dekking als bij de bestaande: `--pic-light` (0,4) en `--pic-mid` (0,6), op de lichte lucht 0,5 en 0,72. Geen drie aparte kleurwaarden.

Op de lichte lucht is `--color-sage` gelijk aan `--color-action-on-light` (index.css, onder `.on-light`). Het pictogram leest daar dus donker groen op licht, met voldoende contrast. Zie vraag 1 voor het nadeel.

## 3. Zwemmen

Silhouet: een zwemmer die de borstcrawl doet, van opzij gezien, en naar rechts zwemt (de richting van lopen, wandelen en het pijltje vooruit). Een bol hoofd rechts, een lange horizontale romp met benen die naar links wegloopt, en één arm die in een boog over het hoofd naar voren reikt. Onder de romp twee golflijnen, de bovenste in de middentint en de onderste licht, en twee spatjes bij de voeten. Het herkenbare is de boog van de arm plus het water; de arm is het ding dat een zwemmer van een liggende man onderscheidt.

Bewust niet: geen badmuts, geen bril, geen baanlijnen of startblok (dat is wedstrijd), geen golf die het hoofd bedekt, geen twee armen, geen vlinderslag.

Paden, plakklaar in `SHAPES` (`zwemmen`):

```tsx
  // Een zwemmer in borstcrawl met één arm over het water, op een golf.
  zwemmen: (
    <>
      <Layer n={1} tone="light">
        <path d="M2 21.8c1.7-1.4 3.3-1.4 5 0s3.3 1.4 5 0 3.3-1.4 5 0 3.3 1.4 5 0" fill="none" stroke="currentColor" strokeWidth="1.5" {...round} />
      </Layer>
      <Layer n={2} tone="mid">
        <path d="M2 18.8c1.7-1.4 3.3-1.4 5 0s3.3 1.4 5 0 3.3-1.4 5 0 3.3 1.4 5 0" fill="none" stroke="currentColor" strokeWidth="1.8" {...round} />
        <circle cx="3.4" cy="11.8" r="0.9" fill="currentColor" />
        <circle cx="5.6" cy="10.2" r="0.7" fill="currentColor" />
      </Layer>
      <Layer n={3} tone="full">
        <circle cx="18.6" cy="11.8" r="2.1" fill="currentColor" />
        <path d="M4.2 15.8c3.4-1.9 8-2.3 12.8-1.1" fill="none" stroke="currentColor" strokeWidth="3" {...round} />
        <path d="M11.5 13.6C11 8.6 15.4 5.8 20.5 7.6" fill="none" stroke="currentColor" strokeWidth="2.4" {...round} />
      </Layer>
    </>
  ),
```

Kleur: `--color-sage`, tinten zoals in 2.

Maten: op 44 px (weekkaart, Sportenscherm, logblad) leest de boog van de arm, de ronde kop en beide golven. Op 32 px (Logboekregel) idem. Op 24 px (weekstrook) verdwijnen de spatjes en de lichte golf bijna; de vol getekende romp, het hoofd en de boog blijven. Dat is de bedoeling: de volle laag draagt het silhouet. Op de lichte lucht lezen de golven donkerder en de lichte golf blijft zichtbaar door de sterkere `--pic-light`.

## 4. Padel

Silhouet: een padelracket, schuin als in de hand, met de kop rechtsboven en het handvat linksonder, en een bal rechtsonder. Het onderscheid met tennis zit in de vorm: een padelracket is een afgeronde, bijna druppelvormige kop zonder snaren, met gaten in de volle vlakte en een korte steel. Die gaten zijn uitgespaard en vormen het herkenbare kenmerk; de kop is dus een vlak, geen ovaal raster. De bal is een eenvoudige ronde schijf in de middentint.

Bewust niet: geen snaren (dat leest als tennis of badminton), geen speler, geen glazen wand of net, geen bewegingsstrepen. De racket staat schuin met `rotate(35 10 12)` zodat de steel het vlak niet doorsnijdt.

Paden, plakklaar (`padel`). De racket is rechtop getekend in een binnenste `g` die als geheel wordt gedraaid; de gaten zitten in dezelfde draaiing.

```tsx
  // Een padelracket met gaten in de kop, en een bal.
  padel: (
    <>
      <Layer n={1} tone="light">
        <path d="M3 22.2h18" fill="none" stroke="currentColor" strokeWidth="1.4" {...round} />
      </Layer>
      <Layer n={2} tone="mid">
        <circle cx="18.6" cy="17.4" r="2.4" fill="currentColor" />
        <g transform="rotate(35 10 12)">
          <path d="M8.3 13.6h3.4l.5 2.6H7.8z" fill="currentColor" />
          <rect x="8.8" y="16" width="2.4" height="5" rx="1.2" fill="currentColor" />
        </g>
      </Layer>
      <Layer n={3} tone="full">
        <g transform="rotate(35 10 12)">
          <path d="M10 2.3c3.4 0 5.6 2.4 5.6 5.6 0 2.4-1.4 4.4-3 5.8H7.4c-1.6-1.4-3-3.4-3-5.8 0-3.2 2.2-5.6 5.6-5.6z" fill="currentColor" />
        </g>
      </Layer>
      <Layer n={3} tone="cut">
        <g transform="rotate(35 10 12)" fill="var(--color-card)">
          <circle cx="8.2" cy="5.4" r="0.8" />
          <circle cx="11.8" cy="5.4" r="0.8" />
          <circle cx="6.6" cy="8.2" r="0.8" />
          <circle cx="10" cy="8.2" r="0.8" />
          <circle cx="13.4" cy="8.2" r="0.8" />
          <circle cx="8.2" cy="11" r="0.8" />
          <circle cx="11.8" cy="11" r="0.8" />
        </g>
      </Layer>
    </>
  ),
```

Let op voor de bouwer: de bestaande `kracht` heeft ook een tweede `Layer n={3}` met `cut`; de `mx-pic-3` komt dan twee keer voor. Dat is daar al zo, en de animatie blijft goed omdat beide tegelijk verschijnen.

Kleur: `--color-sage`.

Maten: op 44 en 32 px lezen de zeven gaten duidelijk. Op 24 px zijn de gaten ongeveer 1,6 px breed en lopen ze bijna dicht; de racketvorm met steel en de bal dragen het dan, en het pictogram blijft een bal met een schuine, volle racket. Dat is acceptabel, zolang het niet met `lopen` verward wordt (andere vorm, andere kleur). Op de lichte lucht komt de uitsparing in de kleur van de lichte kaart, want `--color-card` wordt daar de lichte kaart (zoals bij `kracht`).

## 5. Voetbal

Silhouet: een voetbal, recht van voren, met een volle vijfhoek in het midden, vijf naden naar de rand en een volle ring. De schijf tussen de naden is de middentint, zodat de bal een eigen gewicht heeft. Links twee of drie korte snelheidsstreepjes (hetzelfde taalgebruik als bij `lopen`) en een grondlijn onderin. Het herkenbare is de vijfhoek met naden; zonder dat is het een cirkel.

Bewust niet: geen doel, geen voeten, geen scheidsrechterkaart, geen schaduw die als ruit leest, geen sterren of kampioenschapsvormen (dat leest als RPG of prijzen). Het is een bal, geen wedstrijd.

Paden, plakklaar (`voetbal`). Middelpunt (13.5, 11.5), straal 8; de vijfhoek heeft straal 3, de naden lopen tot de ring op straal 7,1.

```tsx
  // Een voetbal met snelheidsstreepjes.
  voetbal: (
    <>
      <Layer n={1} tone="light">
        <path d="M1.4 8.5h3M1.4 11.5h2.2M1.4 14.5h3M8 22h11" fill="none" stroke="currentColor" strokeWidth="1.3" {...round} />
      </Layer>
      <Layer n={2} tone="mid">
        <circle cx="13.5" cy="11.5" r="8" fill="currentColor" />
      </Layer>
      <Layer n={3} tone="full">
        <circle cx="13.5" cy="11.5" r="7.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M13.5 8.5l2.85 2.07-1.09 3.36h-3.52l-1.09-3.36z" fill="currentColor" />
        <path d="M13.5 8.5V4.4M16.35 10.57l3.9-1.26M15.26 13.93l2.41 3.31M11.74 13.93l-2.41 3.31M10.65 10.57L6.75 9.31" fill="none" stroke="currentColor" strokeWidth="1.5" {...round} />
      </Layer>
    </>
  ),
```

Kleur: `--color-sage`.

Maten: op 44 px zijn de vijfhoek, de naden en de streepjes scherp. Op 32 px idem. Op 24 px valt de middentint tussen de naden bijna weg tegen de volle ring, en blijven vijfhoek en ring over: dat leest nog steeds als bal. De streepjes zijn net als bij `lopen` 1,3 en vallen op 24 px weg; dat is goed, het zijn bijzaken. Op de lichte lucht wordt de schijf sterker (0,72) en leest de bal als één donkere bol met een lichtere vijfhoek-stip; daarom staat de vijfhoek op `full`, de ring en de naden ook.

## 6. Wat een bouwer moet doen

1. In `pictograms.tsx`: `PictogramName` uitbreiden met `'zwemmen' | 'padel' | 'voetbal'`, en de drie blokken uit 3, 4 en 5 in `SHAPES` zetten. Bij `padel` hoort het commentaar bij de dubbele `Layer n={3}`.
2. In `data/sports.ts`: bij de drie rijen van `COUNTED_SPORTS` `pictogram: 'zwemmen'`, `'padel'`, `'voetbal'` zetten (nu `undefined`) en het commentaar "Nog geen pictogram in stijl C" aanpassen. De kleur blijft `var(--color-sage)`.
3. Alle plekken die `pictogram` lezen zonder een afgeleide naam te kennen laten werken zonder aanpassing (`SportDisc`, `WeekStrip`, `sportLook` en het Logboek). Zoek ook of er ergens een tabel `Record<PictogramName, ...>` is die nu een sleutel mist; `tsc` vindt dat.
4. Zet de drie in een tijdelijke ontwerppagina of test naast de andere acht: op 24, 32 en 44 px, op marine (kaart), op de lichte lucht (`.on-light`), en in alle drie de bewegingstanden (Normaal, Rustig, Uit) om te zien dat de lagen netjes op de eindstand staan.
5. Controleer dat `padel` met `transform` in een `g` de animatie van `mx-pic-2` niet stoort: de laag animeert met `transform: translateY`, maar de draaiing zit in een binnenste `g`, dus ze botsen niet. Als een `Layer` zelf de animatie op `transform` zet blijft dat onafhankelijk van de binnenste `g`.
6. Contrast op de lichte lucht controleren (Lookout): `--color-sage` wordt daar `--color-action-on-light`; de lichte laag op 0,5 moet nog zichtbaar blijven.
7. De drie noemen in een test die alle `PictogramName`'s langsloopt, indien die er is (zoek `pictogram` in de tests).
8. Niets in `index.css` nodig. Geen emoji of afbeeldingsbestand.

## 7. Samenvatting

Drie pictogrammen in dezelfde opbouw als de bestaande: zwemmer in crawl met een boog van de arm en twee golven; padelracket met gaten, schuin, met een bal; voetbal met vijfhoek, naden en streepjes. Alle drie in `--color-sage` (bestaand), zonder nieuw token. Op 24 px dragen de volle vormen het silhouet; de details (spatjes, gaten, streepjes) mogen daar wegvallen.

## 8. Vragen voor de eigenaar

1. Salie voor alle drie? Op de lichte lucht is salie gelijk aan het mint van de actieknoppen, dus drie sporten in dezelfde kleur als de actie en niet van elkaar te onderscheiden op kleur. Het voordeel is dat er geen kleur wordt uitgegeven aan sporten die ASCEND niet plant. Alternatief: elk een eigen sportkleur (nieuwe tokens `--color-sport-swim`, `--color-sport-padel`, `--color-sport-football` met een `-on-light`variant), maar dan wordt het palet vol. Advies: salie houden; de vorm onderscheidt ze, niet de kleur.
2. Is een zwemmer in crawl goed, of liever alleen golven met een badmuts? Advies: crawl, want golven alleen lezen als "water" of "zee" en zeggen niets over een sport.
3. Mag de padelracket zonder snaren en met gaten, zodat het bewust niet tennis lijkt? Advies: ja.
