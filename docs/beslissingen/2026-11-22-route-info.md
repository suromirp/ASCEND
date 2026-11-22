# Route-info: terug voor het donker, hoogteprofiel, ondergrond en afhaken

Datum: 2026-11-22
Status: aangenomen

## Besluit

Bij de gekozen lus staan vier dingen die ASCEND uit de lus zelf haalt, zonder extra aanroep (`src/engine/routeInfo.ts`, `src/components/RouteInfo.tsx`):

- **Terug voor het donker (I-115).** "Je bent rond 17:20 terug; de zon gaat om 16:45 onder." De terugkomst is nu plus de duur van de lus (een wandeltraining: `loopMinutes`; een looptraining: afstand maal het tempo waarop de afstand is bepaald, `routeTarget.ts#runPaceSecKm`). ASCEND kent geen geplande starttijd, dus de start is nu, en alleen voor een training van vandaag. De zon komt uit `engine/sun.ts` op het afgeronde startpunt (twee decimalen, zoals het startpunt dat de deur uit gaat). De regel staat er als je binnen een uur voor zonsondergang of later terug bent; was de zon al onder, dan staat er "ging". Instelling Terug voor het donker (`routeBackBeforeDark`, afwezig is aan, optioneel veld zonder migratie), in Weer en kleding naast Grote wegen mijden. Het seintje over onverlicht onverhard pad komt er niet: BRouter geeft geen `lit` mee (gecontroleerd op een verzonnen proeflus) en OpenStreetMap vragen is een extra aanroep. Liever niets dan raden.
- **Hoogteprofiel (I-116).** Een SVG die ASCEND tekent uit de hoogtes van de lus: afstand horizontaal, hoogte verticaal, over drie stappen gemiddeld. Stukken steiler dan 8 procent zijn amber (`--color-warning`), de rest inkt-dim; niet mint, dat is de lus op de kaart. Een vlakke lus (`isNearlyFlat`) krijgt "Vrijwel vlak, dus geen profiel." Geen beweging.
- **Ondergrond (I-117).** "Ongeveer 65 % onverhard, 35 % verhard." Bron: BRouter. Het antwoord heeft per stuk de WayTags (`surface`, `tracktype`, `highway`); die lezen we nu al voor grote wegen (`brouter.ts#markWays`) en ze zetten `surface` op de punten van de lus. Zonder `surface` zegt het soort weg het (een pad of een grindweg is onverhard, een weg of een fietspad verhard). Valhalla geeft de ondergrond alleen met een aparte aanroep (`trace_attributes`): daar geen regel. Onder 80 procent bekende stukken ook geen regel. Op 5 procent afgerond.
- **Afhaken (I-118).** Op de kaart een kleine ring in inkt (geen mint, op Donker, Licht en Geen zichtbaar, niet tikbaar) op het punt tussen 35 en 65 procent van de lus dat hemelsbreed het dichtst bij de start ligt, met de regel "Onderweg kun je hier afhaken: 1,2 km hemelsbreed terug." Hemelsbreed, want de weg terug kan langer zijn. Niet bij een lus die voor meer dan de helft over hetzelfde pad terugkomt (heen en terug: je loopt al terug), en niet als het punt binnen 150 m van de start ligt.

Waar: het blad Route toont alles onder de kaart; de Briefing toont, boven de vouw, alleen de regels voor terug voor het donker en afhaken, plus de ring op de kaart. Profiel en ondergrond staan in het blad achter Groter.

## Reden

De eigenaar vroeg (22 november) om deze vier punten, "Ja doe al die punten klinkt goed". Het zijn feiten over de lus die je voor je vertrek wilt weten, en ze kosten geen nieuwe aanroep.

## Alternatieven

- De ondergrond van OpenStreetMap vragen (Overpass): een extra aanroep met je plek, tegen de afspraak.
- Een geplande starttijd verzinnen of vragen: ASCEND plant geen uur van de dag; "nu" is eerlijk.
- Het profiel in mint: dat is het ene accent van het scherm.
- Een tikbaar afhaakpunt: een tikdoel van 44 px op een kaart die al tikken kent (lus kiezen, startpunt) botst; alleen rekenwerk en een regel.

## Bron

Inbox I-115 tot en met I-118 in `docs/backlog.md`. Proef met een openbaar verzonnen punt (52.1, 5.9) bij BRouter: WayTags bevatten `surface`, `tracktype` en `highway`, geen `lit`.

## Vervangt

Niets.

## Terugdraaien

De instelling Terug voor het donker uit; `RouteInfo` uit `RoutePanel.tsx` en `TrainingBriefing.tsx` halen en `bail` uit `RouteMap.tsx` haalt de rest weg. `surface` op de punten is alleen in het geheugen.
