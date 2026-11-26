# Sherpa Bediening, 26 november (tweede vervolg)

Branch `claude/bediening-mag-26nov`.

## Gebouwd
- I-164 blad Belangrijk advies (`src/components/FirstAdviceHost.tsx`): het blad toont nu de wijzigingen zoals `AdviceItem` (feitregel, `ProposalChangeList`, tip) en voor een advies met een eigen voorstel (rustiger instap, golven, ladder) de regels van dat voorstel (`useAdviceAccept#changeLines`, dezelfde regels als het voorstel achter Bekijk). Een mislukte of te trage Akkoord, en een mislukte Bekijk, zet de onthouden stand van voor het tonen terug (`engine/adviceFirst.ts#forgetFirstSheetShown`, met test), zodat het blad bij de volgende opening terugkomt; een eerdere Niet nu blijft geteld. De uitkomst stond al in het blad. Elke wachtende knop heeft `withTimeout` (15 s).
- I-164 kaart: stand `belangrijk-advies` (zonder doel, golven nog niet getoond; de instelling staat tijdens de settle uit en daarna aan via `NA` in `maak-standen.mjs`) en scherm `vandaag-belangrijk-advies` in `kaart.mjs`; `state-belangrijk-advies.json` in de kit. `docs/app-kaart/` bijgewerkt.
- I-164 Week 360: geen losse "·" meer aan het begin van een afgebroken tweede regel (`src/utils/looseSeparator.ts`, `Sep` in `WeekPlanner.tsx`). Meet bij elke breedte opnieuw, begint altijd met alle tekens aan, dus geen heen en weer.
- I-141: de chip bij slepen hangt half over de bovenrand van de doeldag in plaats van over de rij (de pil Herstel was half bedekt, nu vrij: pil y 255 tot 279, de chip hangt boven y 245 tot de rand). De zwevende rij mag zijn tweede regel breken als de dag erachter niet past ("verplaatst van vr 30" in plaats van "verplaatst… vr 30"). In de stille lijst blijft de rij 52 px en kapt af zoals het ontwerp zegt.
- I-87: `.st-info` is nu zelf 44 bij 44 px (rondje van 20 px middenin, negatieve marge houdt de rij gelijk), gemeten 8 van 8 op 360 en 412. De Straks-regels in `TestVerdictCard` en `ZoneUpdateCard` staan in `--color-ink`, niet meer mint.
- I-103: niet gebouwd. Mijn werk voegt geen derde plek toe met de 18 procent vulling (alleen `StepProposalNotice` en `CalibrationNotice`); het blad gebruikt `PrimaryButton`.

## Niet gecontroleerd
- Slepen met echte vinger op een toestel (alleen muis in Playwright op 360, 390 en 412).
- Een echte mislukte Akkoord in de browser (de terugval staat in een engine-test).
- Rustig en Uit bij Beweging: er is geen animatie bijgekomen.
