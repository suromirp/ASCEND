# Sherpa I-158: MacroFactor loskoppelen

Oorzaak bevestigd: readMacroFactorLinked keek alleen naar readAt. Nu readAt en leads (oude stand zonder leads-veld telt als leidend). Dat dekt de chip in missionFacts, sessionBrief en de zin in ExerciseLogger, want die lezen allemaal useMacroFactorLinked.

Knop "MacroFactor loskoppelen" in Koppelingen (KoppelingenGroup, sectie MacroFactor), alleen zichtbaar met een ingelezen export. Eerst bevestigen (Annuleren links, actie rechts), dan clearMacroFactorWorkouts met tijdsgrens van 8 seconden en een zichtbare uitkomstregel. Krachtlogs blijven ongemoeid.

Test: storage/macrofactor.test.ts (zonder export, readAt met leads, zonder leads, na loskoppelen, oude stand zonder leads). Geen bestaande test aangepast.

Controles: tsc groen, lint (alleen oude waarschuwing LegFatigueCard), vitest 12420 groen, build groen, kaart:vergelijk geen verschil en geen schendingen.
Niet gecontroleerd: de knop in een echte browser (geen screenshot).
