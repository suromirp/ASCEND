# Zee en berg: marine, mint voor de actie en een lichte lucht met groene bergen

Datum: 2026-10-24
Status: aangenomen

## Besluit

ASCEND krijgt het palet "C3 definitief, licht bovenin, kop a". De basis is
donker marineblauw in plaats van charcoal. Mint is de ene actie van een scherm:
de gevulde hoofdknop, de omlijnde gewone knoppen, een gekozen keuze en de
voortgang (ringen, vinkjes, meters). IJsblauw is status: waar je bent, zoals
vandaag in de week en de dag van vandaag in de kalender. Gedempt amber is "let
op" en staat bij beendagen. Brons en goud verdwijnen als accent.

Bovenaan elke tab staat een lichte lucht (`SkyBand`), van zacht blauw naar een
vleugje mint, met twee rijen bergen onderin: achter saliegroen, voor donker
groenblauw dat overloopt in het marine. Op die lucht staan de kop (het
merkteken met het woord ASCEND links, het tandwiel rechts, allebei in donker
marine), het kopje en de titel van de pagina, en straks de eerste kaart. De
lucht is één vlak; de app blijft donker en heeft geen licht thema.

Elke tab heeft een eigen kleur voor de actieve tab, het streepje erboven en
het kopje op de pagina: Vandaag mint, Week ijs, Stand lila, Ascend alpengloed,
Logboek lichtgroen. Op de lucht staat dezelfde kleur in een donkere variant.
De tabbalk is volledig dekkend marine, met labels in zinsletters.

De kleuren:

- Achtergrond `#0b1733`, vlak `#112245`, kaart `#172b54`, verhoogde kaart
  `#1d3664`, rand `#27416f`, rand van een knop of veld `#6a86b8`.
- Tekst `#f1f6ff`, gedimde tekst `#abbbdb`.
- Mint `#5eead4` met tekst `#04161a` erop, mint gedempt `#1f5f63`.
- IJs `#93ccff`, let op `#dba660`, rood `#c23b4e` als vulling en `#ff9696`
  als tekst.
- Inspanning Z1 tot Z5: `#cfe1ff`, `#5fd6a6`, `#f2d86a`, `#e0753a`,
  `#ee5577`, en de lege baan `#1d3260`.
- Lucht `#dcebf8` naar `#d9efe6`, lichte kaart `#f5fbf8`, donkere tekst op
  licht `#13294f`, donkere mint op licht `#0a6e5c`.
- Bergen: achter `#a7d1bd`, voor `#1d5a5c`.
- Tabs: `#5eead4`, `#93ccff`, `#c4b5fd`, `#f9b4c8`, `#bdf08f`.

In code heten ze `--color-action`, `--color-status`, `--color-progress`,
`--color-sky-top`, `--color-light-card`, `--color-on-light`,
`--color-effort-1` tot `-5`, `--color-tab-*` en verder (`src/index.css`). De
oude namen (`--color-gold`, `--color-bronze` en de rest) blijven werken en
wijzen naar het nieuwe palet, zodat de hele app in één keer meeverandert.
Nieuw werk gebruikt de nieuwe namen.

## Reden

De eigenaar en zijn vriendin vonden de app op een bankapp lijken: te veel bruin
en goud, en alle kaarten even zwaar, zodat je oog snel kijkend niet op het
juiste valt. Ze wilden frisse, lichte, sportieve tinten op donkerblauw, de
dagelijkse actie in de opvallende lichte kleur en per onderdeel een eigen
kleur, zodat je sneller vindt waar je bent. Mint voor doen en ijs voor zien
scheidt die twee rollen, en de tabkleuren maken elke tab herkenbaar zonder
met de actie te concurreren. De lichte lucht met bergen geeft elk scherm een
herkenbaar begin en past bij het doel van de app.

Contrast is nagerekend (WCAG AA): tekst op de kaarten haalt minstens 4,8:1,
tekst op de lucht en de lichte kaart minstens 5,1:1 (de donkere mint), de
donkere tekst op de lucht 11,9:1, knoptekst op mint 12,5:1, lichte tekst op de
rode knop 4,8:1 en inspanningsvlakken minstens 3,5:1. De zones blijven ook bij kleurenblindheid uit elkaar te houden,
en er staat altijd Z1 tot Z5 bij.

## Alternatieven

Zes andere richtingen zijn als mockup bekeken: marine met alleen ijs, marine
met alleen mint, een lichter middenblauw met koraal, petrol met limoen, een
diep inktblauw met elektrisch blauw, en drie varianten van marine met mint en
ijs (lichtere kaarten, ijsvlakken in de kaarten, een middenweg). De eigenaar
koos de lichte band bovenin. Een vervaagde overgang van lucht naar marine gaf
een grijze veeg; een scherpe bergkam past beter. Een tweede kop, met het teken
als top in de bergrij, is niet gekozen.

## Bron

De ontwerpronde "Sportgevoel" van 23 oktober 2026 (kleurrichtingen, ruimte en
typeschaal, inklappen, C3 definitief en mint voor voortgang), het advies van de
vriendin van de eigenaar en de keuze van de eigenaar voor C3 definitief met
kop a.

De code: de tokens in `src/index.css` (`@theme`, `.on-light`, `.sky-band`,
`[data-tab]`), `src/components/SkyBand.tsx`, `AppMark.tsx` en
`SettingsGear.tsx`, de onderdelen in `src/components/ui.tsx` (`LightCard`,
`Ring`, `Meter`, `ZoneBar`, `StatusPill`, `Stat`) en `BottomNav` in
`src/App.tsx`.

## Vervangt

Het kleurdeel van `2026-10-22-steen-en-contour.md`: goud als het ene accent,
brons voor kopjes en een schakelaar in donker brons. De rest van dat besluit
blijft staan: de tabbalk met vijf tabs en het tandwiel, Marcellus alleen voor
woorden, getallen in Inter en niets kleiner dan 12 px.

## Terugdraaien

Zet in `src/index.css` het blok `@theme` terug naar de kleuren van voor dit
besluit; de oude tokennamen bestaan nog, dus de app krijgt dan vanzelf weer
brons en goud. Haal `SkyBand` van de vijf tabs en zet `AppMark` en
`SettingsGear` terug in `AppShell` in `src/App.tsx`.
