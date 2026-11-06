# Werkbriefjes

Per onderwerp één kort briefje voor wie er bouwt, reviewt of test: een helper of een nieuwe chat leest eerst het
briefje van zijn onderwerp en begint daar, in plaats van zelf door de code te zoeken. Het lange verhaal met de
redenen staat in `docs/architectuur/`; het briefje is het werkblad.

Vorm van elk briefje (hoogstens 45 regels, geen tabellen):

- `# <onderwerp>` en één zin waar het over gaat.
- `## Bestanden`: de vijf tot twaalf bestanden die ertoe doen, als `src/pad/bestand.ts#functie` met een paar
  woorden erachter. Alleen wat bestaat: `src/werkbriefjes.scan.test.ts` controleert elk pad en elke functie.
- `## Nooit`: de regels uit CLAUDE.md die hier gelden, kort.
- `## Valkuilen`: wat eerder misging of bijna misging, met de les.
- `## Testen`: welke tests je tijdens het werk draait (een map of een paar bestanden), en welke nooit mogen bewegen.
- `## Lees verder`: het bestand in `docs/architectuur/` en de besluiten die ertoe doen.

Bijhouden: wie een functie hernoemt of een bestand verplaatst dat in een briefje staat, past het briefje aan (de
test faalt anders). Een nieuwe valkuil uit een review komt erbij. De wekelijkse onderhoudsronde kijkt of een
briefje te lang wordt.

De briefjes: `planning.md`, `week.md`, `forge.md`, `doelen.md`, `lichaam-en-herstel.md`, `lopen-en-tests.md`,
`koppelingen-en-data.md`, `historie-en-logs.md`, `bediening-en-beweging.md`.
