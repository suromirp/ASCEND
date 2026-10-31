---
name: lookout
description: Vaste doorloop van Lookout voor ASCEND in Chromium op 360 en 390 px met vertraagde processor en echte touch. Gebruik bij elke UI-controle voor een push naar main, in plaats van zelf scripts te schrijven.
---

# Lookout: de vaste doorloop

Schrijf geen nieuwe hulpscripts. De kit in `.claude/skills/lookout/kit/` doet het zware werk.

1. Bouw in een eigen map: `npx vite build --outDir <scratchpad>/lookout-<onderwerp>/dist`.
2. Start de preview op een vrije poort en onthoud de pid:
   `npx vite preview --outDir <map>/dist --port <poort> --strictPort & echo $! > <map>/pv.pid`.
   Stop alleen die pid, nooit `pkill -f vite` (dat stopt ook de shell van de coördinator).
3. Draai de vaste doorloop: `LOOKOUT_PORT=<poort> LOOKOUT_SHOTS=<map>/shots node .claude/skills/lookout/kit/doorloop.mjs [tabs]`.
   Tabs: vandaag, week, stand, ascend, logboek, forge. Zonder tabs alle zes.
4. Voor wat er veranderd is: een klein script van een paar regels dat `open`, `startForge`, `swipe`,
   `audit` en `rowIds` uit `kit/lib.mjs` importeert. Bewaar het in de scratchpad, niet in de repo.
5. Rapporteer per stap groen of rood, met het volledige pad van elke afdruk.

De stand `kit/state-kracht.json` is nagemaakt (het kracht-demoprogramma). Een back-up van de eigenaar
gebruik je alleen als de opdracht van de coördinator het pad noemt (toestemming van de eigenaar,
31 oktober 2026): dan alleen lezen, schermafdrukken alleen in de scratchpad, nooit iets ervan in de
repo, tests of commits, en in je verslag geen notities of persoonsgegevens citeren.
