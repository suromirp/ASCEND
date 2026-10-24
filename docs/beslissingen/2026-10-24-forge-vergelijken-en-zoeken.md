# Forge: vergelijken met eerder, zoeken en een compacte lijst

Datum: 2026-10-24
Status: aangenomen

## Besluit

Forge zet per oefening het getal van nu naast dat van 4 weken geleden, 8 weken
geleden en het beste ooit, met het verschil als kleine regel ("+2,5 kg"). Het
getal volgt de bestaande keuze 1RM of Werkgewicht. Naast het getal staat wat er
verder veranderde: herhalingen bij hetzelfde gewicht, het zwaarste gewicht en het
volume per training. Een oefening die je op herhalingen doet (geen gewicht in de
werksets, zoals Hanging Leg Raise) krijgt de herhalingen van je beste set als
hoofdgetal, met het totaal erbij, en geen 1RM of werkgewicht. De pagina is een
compacte lijst met een zoekveld, een chip per training uit de echte templates en
per oefening een rij die openklapt. Vanuit de rij opent de volledige geschiedenis
in een onderblad.

## Reden

De eigenaar vond de 1RM goed, maar wilde de vorige cijfers ernaast zien, en
zei dat het doel niet altijd een hogere 1RM is. Vooruitgang kan ook meer
herhalingen bij hetzelfde gewicht of meer volume zijn. Met 67 oefeningen was de
pagina een lange stapel kaarten; zoeken en filteren maken hem snel te doorlopen.
Bij oefeningen op herhalingen was een 1RM-schakelaar en de zin dat er geen 1RM te
schatten is alleen ruis.

Er is geen nieuwe formule: het getal is dat van het krachtmodel, alleen gelezen
op een datum (`engine/forgeHistory.ts`). De momenten tellen terug vanaf vandaag,
en de stand op een moment is de laatste training op of voor die dag. Een punt
ontbreekt als er toen nog geen training was ("Nog niet"). Sets tellen via
`isWorkSet`, dus een opwarmset telt nergens mee.

De toon is rustig: mint voor vooruit, gedempt voor gelijk of lager, nooit rood
(`engine/forgeText.ts`). Er komt geen tweede voortgangspercentage bij.

Een oefening telt als op herhalingen als er in geen enkele werkset gewicht staat,
of als het een oefening met eigen gewicht is waar hooguit iets bij komt. Komt er
gewicht bij, dan staat het gewicht naast de herhalingen (`isRepsBased`). Oefeningen
met hulp horen er niet bij: daar telt de hulp.

Drie instellingen in de groep Forge, met het advies als standaard:
"Vergelijken met" (4 en 8 weken; of 2 en 4, 8 en 12, 12 en 26),
"Wat er verder veranderde" (aan) en "Volgorde van de oefeningen" (meest getraind;
of laatst getraind, of op naam). De velden staan in `StrengthSettings` als
optionele waarden (`compareWeeks`, `showExtras`, `listSort`). Dat is een veld dat
erbij komt, dus het schemanummer van de back-up blijft staan en er is geen
migratiestap nodig: `normalizeStrengthSettings` houdt alleen geldige waarden, en
een back-up zonder de velden leest als het advies.

Zoeken werkt op de naam en op de andere namen uit de oefeningenlijst ("bankdruk"
vindt de Barbell Bench Press), zonder letterhoogte of accenten, met een of twee
typfouten bij langere woorden en met verwisselde letters. De zoekterm, het filter
en de open rij blijven staan na een bezoek aan een andere pagina (`usePageState`).

## Alternatieven

- Een eigen route voor de geschiedenis. Een onderblad met `useSheetClose` doet
  hetzelfde en de terugknop sluit het, zonder nieuwe route.
- Vier kaarten per oefening zoals eerder. Afgewezen: de pagina werd te lang.
- Het verschil rood tonen bij achteruit. Afgewezen: een rustigere trainingsweek
  is geen mislukking.
- Filters hardcoden. Afgewezen: ze komen uit de namen van de templates waar een
  oefening in gelogd is.
- Het grote Forge-model opnieuw laten rekenen bij elke wijziging van de weergave.
  De weergavekeuzes staan buiten de sleutel van het model, dus een tik op de
  schakelaar rekent niets opnieuw.

## Bron

De opmerking van de eigenaar over de 1RM, de vorige cijfers en de zoekfunctie, en
`docs/beslissingen/2026-10-24-geschatte-1rm-op-forge.md` en
`docs/beslissingen/2026-10-24-1rm-uit-macrofactor.md`.

## Vervangt

Niets. De twee genoemde besluiten blijven gelden; de kaart per oefening is nu een
rij met dezelfde inhoud en de lijn staat in de geschiedenis.

## Terugdraaien

De drie instellingen kunnen niet alles uitzetten, maar "Wat er verder veranderde"
uit haalt de extra regels weg. In de code: `ExerciseRow` en `ForgeFilters` in
`src/components/forge/` vervangen door de oude `ExerciseCard` uit de geschiedenis
van git. Opgeslagen waarden van de nieuwe velden doen dan niets.
